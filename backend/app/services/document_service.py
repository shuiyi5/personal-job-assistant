"""文档服务 - 上传编排"""

from typing import Optional

from app.rag.embedder import index_document, remove_document
from app.rag.store import list_all_documents


async def upload_and_index(file_path: str, doc_type: str = "general", doc_id: Optional[str] = None) -> dict:
    """上传文档 → 索引"""
    return await index_document(file_path, doc_type=doc_type, doc_id=doc_id)


async def delete_doc(doc_id: str) -> None:
    await remove_document(doc_id)


def list_docs() -> list[dict]:
    return list_all_documents()
