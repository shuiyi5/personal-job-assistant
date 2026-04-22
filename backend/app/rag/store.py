"""ChromaDB 存储层封装"""

from functools import lru_cache

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
    """将文档块写入 ChromaDB"""
    collection = get_chroma_collection()
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
    where: dict | None = None,
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


def list_all_documents() -> list[dict]:
    """列出所有已索引文档的元数据"""
    collection = get_chroma_collection()
    result = collection.get(include=["metadatas"])
    seen = {}
    for meta in (result["metadatas"] or []):
        did = meta.get("doc_id", "")
        if did and did not in seen:
            seen[did] = {
                "doc_id": did,
                "filename": meta.get("filename", ""),
                "doc_type": meta.get("doc_type", ""),
                "upload_date": meta.get("upload_date", ""),
            }
    return list(seen.values())


def get_collection_count() -> int:
    """获取 Collection 中的文档数量"""
    return get_chroma_collection().count()
