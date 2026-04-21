"""向量存储层 - 使用 PostgreSQL + pgvector (兼容 ChromaDB 接口)"""

import os
from functools import lru_cache

import psycopg2
import psycopg2.extras
from pgvector.psycopg2 import register_vector

_EMBEDDING_DIM = 384  # all-MiniLM-L6-v2


def _get_conn():
    """获取数据库连接"""
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        raise RuntimeError("DATABASE_URL 环境变量未设置")
    # Railway 的 DATABASE_URL 使用 postgres:// 前缀，psycopg2 需要 postgresql://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    conn = psycopg2.connect(url)
    register_vector(conn)
    return conn


@lru_cache(maxsize=1)
def _init_db():
    """初始化数据库表结构（只执行一次）"""
    conn = _get_conn()
    with conn:
        with conn.cursor() as cur:
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
            cur.execute(f"""
                CREATE TABLE IF NOT EXISTS document_chunks (
                    id          TEXT PRIMARY KEY,
                    doc_id      TEXT NOT NULL,
                    content     TEXT NOT NULL,
                    embedding   vector({_EMBEDDING_DIM}),
                    filename    TEXT,
                    doc_type    TEXT,
                    chunk_index INTEGER,
                    heading_path TEXT,
                    upload_date TEXT
                )
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_chunks_doc_id
                ON document_chunks (doc_id)
            """)
            cur.execute(f"""
                CREATE INDEX IF NOT EXISTS idx_chunks_embedding
                ON document_chunks USING ivfflat (embedding vector_cosine_ops)
                WITH (lists = 100)
            """)
    conn.close()
    return True


def get_chroma_collection():
    """兼容旧接口：初始化数据库"""
    _init_db()


def upsert_documents(
    doc_id: str,
    chunks: list[str],
    embeddings: list[list[float]],
    metadatas: list[dict],
) -> None:
    """将文档块写入 PostgreSQL"""
    _init_db()
    conn = _get_conn()
    with conn:
        with conn.cursor() as cur:
            for i, (text, emb, meta) in enumerate(zip(chunks, embeddings, metadatas)):
                chunk_id = f"{doc_id}_chunk_{i}"
                cur.execute("""
                    INSERT INTO document_chunks
                        (id, doc_id, content, embedding, filename, doc_type,
                         chunk_index, heading_path, upload_date)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        content      = EXCLUDED.content,
                        embedding    = EXCLUDED.embedding,
                        filename     = EXCLUDED.filename,
                        doc_type     = EXCLUDED.doc_type,
                        chunk_index  = EXCLUDED.chunk_index,
                        heading_path = EXCLUDED.heading_path,
                        upload_date  = EXCLUDED.upload_date
                """, (
                    chunk_id,
                    doc_id,
                    text,
                    emb,
                    meta.get("filename", ""),
                    meta.get("doc_type", ""),
                    meta.get("chunk_index", i),
                    meta.get("heading_path", ""),
                    meta.get("upload_date", ""),
                ))
    conn.close()


def query_documents(
    query_embedding: list[float],
    n_results: int = 5,
    where: dict | None = None,
) -> dict:
    """向量检索，返回与 ChromaDB 兼容的格式"""
    _init_db()
    conn = _get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            if where and "doc_type" in where:
                cur.execute("""
                    SELECT content, doc_id, filename, doc_type, chunk_index,
                           heading_path, upload_date,
                           embedding <=> %s::vector AS distance
                    FROM document_chunks
                    WHERE doc_type = %s
                    ORDER BY distance
                    LIMIT %s
                """, (query_embedding, where["doc_type"], n_results))
            else:
                cur.execute("""
                    SELECT content, doc_id, filename, doc_type, chunk_index,
                           heading_path, upload_date,
                           embedding <=> %s::vector AS distance
                    FROM document_chunks
                    ORDER BY distance
                    LIMIT %s
                """, (query_embedding, n_results))

            rows = cur.fetchall()
    finally:
        conn.close()

    documents, metadatas, distances = [], [], []
    for row in rows:
        documents.append(row["content"])
        metadatas.append({
            "doc_id": row["doc_id"],
            "filename": row["filename"],
            "doc_type": row["doc_type"],
            "chunk_index": row["chunk_index"],
            "heading_path": row["heading_path"],
            "upload_date": row["upload_date"],
        })
        # pgvector cosine distance: 0=相同, 1=正交, 2=相反
        # 转换为 ChromaDB 格式 (0~2 range)
        distances.append(float(row["distance"]) * 2)

    return {
        "documents": [documents],
        "metadatas": [metadatas],
        "distances": [distances],
    }


def delete_document(doc_id: str) -> None:
    """删除指定文档的所有向量"""
    _init_db()
    conn = _get_conn()
    with conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM document_chunks WHERE doc_id = %s", (doc_id,))
    conn.close()


def list_all_documents() -> list[dict]:
    """列出所有已索引文档的元数据"""
    _init_db()
    conn = _get_conn()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cur:
            cur.execute("""
                SELECT DISTINCT ON (doc_id)
                    doc_id, filename, doc_type, upload_date
                FROM document_chunks
                ORDER BY doc_id, upload_date DESC
            """)
            rows = cur.fetchall()
    finally:
        conn.close()

    return [
        {
            "doc_id": row["doc_id"],
            "filename": row["filename"],
            "doc_type": row["doc_type"],
            "upload_date": row["upload_date"],
        }
        for row in rows
    ]


def get_collection_count() -> int:
    """获取文档块总数"""
    _init_db()
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM document_chunks")
            return cur.fetchone()[0]
    finally:
        conn.close()
