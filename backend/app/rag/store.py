"""ChromaDB 存储层封装"""

from functools import lru_cache
from typing import Optional

import chromadb

from app.config.settings import settings


@lru_cache
def get_chroma_client() -> chromadb.ClientAPI:
    """获取 ChromaDB 持久化客户端 (单例)"""
    return chromadb.PersistentClient(path=settings.chroma_db_path)


def get_chroma_collection() -> chromadb.Collection:
    """获取或创建知识库 Collection"""
    client = get_chroma_client()
    return client.get_or_create_collection(
        name=settings.chroma_collection,
        metadata={"hnsw:space": "cosine"},
    )


def upsert_documents(
    doc_id: str,
    chunks: list[str],
    embeddings: list[list[float]],
    metadatas: list[dict],
) -> None:
    """将文档块写入 ChromaDB（先删后插，实现 upsert 语义）"""
    collection = get_chroma_collection()
    # 先删除该 doc_id 的所有现有 chunks，避免重复堆积
    collection.delete(where={"doc_id": doc_id})
    ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
    collection.upsert(
        ids=ids,
        documents=chunks,
        embeddings=embeddings,
        metadatas=metadatas,
    )


def query_documents(
    query_embedding: list[float],
    n_results: int = 5,
    where: Optional[dict] = None,
) -> dict:
    """向量检索"""
    collection = get_chroma_collection()
    params = {
        "query_embeddings": [query_embedding],
        "n_results": n_results,
        "include": ["documents", "metadatas", "distances"],
    }
    if where:
        params["where"] = where
    return collection.query(**params)


def delete_document(doc_id: str) -> None:
    """删除指定文档的所有向量"""
    collection = get_chroma_collection()
    collection.delete(where={"doc_id": doc_id})


def list_all_documents(doc_type: Optional[str] = None) -> list[dict]:
    """列出所有已索引文档的元数据，可按 doc_type 过滤"""
    collection = get_chroma_collection()
    where = {"doc_type": doc_type} if doc_type else None
    result = collection.get(include=["metadatas"], where=where)
    seen = {}
    for meta in (result["metadatas"] or []):
        did = meta.get("doc_id", "")
        if did and did not in seen:
            chunk_count = len(collection.get(where={"doc_id": did}, include=[]) or [])
            seen[did] = {
                "doc_id": did,
                "filename": meta.get("filename", ""),
                "doc_type": meta.get("doc_type", ""),
                "upload_date": meta.get("upload_date", ""),
                "chunk_count": chunk_count,
                "is_ocr": meta.get("is_ocr", False),
            }
    return list(seen.values())


def get_collection_count() -> int:
    """获取 Collection 中的文档数量"""
    return get_chroma_collection().count()
