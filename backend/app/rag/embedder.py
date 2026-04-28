"""嵌入 + 索引管线"""

import uuid
from datetime import datetime
from typing import Optional

from app.models.base import get_embedding_provider
from app.rag.chunker import Chunk, chunk_text
from app.rag.loader import Document, load_document
from app.rag.store import upsert_documents, delete_document


async def index_document(
    file_path: str,
    doc_type: str = "general",
    doc_id: Optional[str] = None,
) -> dict:
    """
    完整索引管线: 解析 → 分块 → 嵌入 → 存储
    返回: {"doc_id": str, "chunk_count": int, "filename": str}
    """
    # 1. 解析文档
    doc: Document = load_document(file_path)

    # 2. 分块
    chunks: list[Chunk] = chunk_text(doc.text)
    if not chunks:
        raise ValueError(f"文档内容为空: {file_path}")

    # 3. 嵌入
    embedding_provider = get_embedding_provider()
    chunk_texts = [c.text for c in chunks]
    embeddings = await embedding_provider.embed_batch(chunk_texts)

    # 4. 构建元数据
    doc_id = doc_id or str(uuid.uuid4())
    now = datetime.now().isoformat()
    metadatas = [
        {
            "doc_id": doc_id,
            "filename": doc.metadata.get("filename", ""),
            "doc_type": doc_type,
            "chunk_index": c.index,
            "heading_path": c.heading_path,
            "upload_date": now,
        }
        for c in chunks
    ]

    # 5. 存入 ChromaDB
    upsert_documents(doc_id, chunk_texts, embeddings, metadatas)

    return {
        "doc_id": doc_id,
        "chunk_count": len(chunks),
        "filename": doc.metadata.get("filename", ""),
        "is_ocr": doc.metadata.get("is_ocr", False),
    }


async def remove_document(doc_id: str) -> None:
    """从索引中删除文档"""
    delete_document(doc_id)
