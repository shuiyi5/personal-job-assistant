"""知识库工具 - 搜索、列表、删除"""

from typing import Any

from app.rag.compressor import ContextCompressor
from app.rag.retriever import assemble_context, retrieve
from app.rag.router import QueryRouter
from app.rag.store import list_all_documents, delete_document
from app.tools.base import BaseTool


class SearchKnowledgeBaseTool(BaseTool):
    def __init__(self):
        self.router = QueryRouter()
        self.compressor = ContextCompressor(max_tokens=6000)

    @property
    def name(self) -> str:
        return "search_knowledge_base"

    @property
    def description(self) -> str:
        return "搜索个人知识库，获取相关的工作经历、项目描述、技能、教育背景等信息。"

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "搜索查询，描述需要查找的信息"},
                "doc_type": {
                    "type": "string",
                    "enum": ["resume", "project", "certificate", "general", "all"],
                    "description": "按文档类型过滤",
                    "default": "all",
                },
                "top_k": {"type": "integer", "description": "返回结果数量", "default": 5},
            },
            "required": ["query"],
        }

    async def execute(self, query: str, doc_type: str = "all", top_k: int = 5) -> Any:
        # 1. 路由：分析 query 类型和意图
        routed = self.router.route(query)

        # 2. 用户显式指定的 doc_type 覆盖路由结果
        dt = None if doc_type == "all" else doc_type

        # 3. 检索
        results = await retrieve(query, top_k=top_k, doc_type=dt)
        if not results:
            return {
                "status": "ok",
                "query_type": routed.query_type.value,
                "intent": routed.intent,
                "chunks": [],
                "total_chunks": 0,
                "total_tokens": 0,
                "message": "未在知识库中找到相关信息。",
            }

        # 4. 上下文压缩
        raw_chunks = [
            {"content": r.text, "score": r.score, "metadata": r.metadata}
            for r in results
        ]
        compressed = self.compressor.compress(raw_chunks, query)

        return {
            "status": "ok",
            "query_type": routed.query_type.value,
            "intent": routed.intent,
            "chunks": [
                {
                    "content": c.content,
                    "doc_id": c.source_doc_id,
                    "score": c.relevance_score,
                    "tokens": c.token_count,
                }
                for c in compressed
            ],
            "total_chunks": len(compressed),
            "total_tokens": sum(c.token_count for c in compressed),
        }


class ListDocumentsTool(BaseTool):
    @property
    def name(self) -> str:
        return "list_documents"

    @property
    def description(self) -> str:
        return "列出知识库中所有已上传的文档。"

    @property
    def input_schema(self) -> dict:
        return {"type": "object", "properties": {}}

    async def execute(self) -> Any:
        docs = list_all_documents()
        if not docs:
            return "知识库为空，请先上传文档。"
        return docs


class DeleteDocumentTool(BaseTool):
    @property
    def name(self) -> str:
        return "delete_document"

    @property
    def description(self) -> str:
        return "从知识库中删除指定文档。"

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "doc_id": {"type": "string", "description": "要删除的文档 ID"},
            },
            "required": ["doc_id"],
        }

    async def execute(self, doc_id: str) -> str:
        delete_document(doc_id)
        return f"已删除文档: {doc_id}"
