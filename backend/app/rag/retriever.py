"""检索器 - 查询嵌入 → 向量搜索 → 过滤 → 上下文组装"""

from dataclasses import dataclass

from app.models.base import get_embedding_provider
from app.rag.store import query_documents


@dataclass
class RetrievalResult:
    """检索结果"""
    text: str
    score: float  # 0~1, 越高越相关 (1 - cosine_distance)
    metadata: dict


async def retrieve(
    query: str,
    top_k: int = 5,
    score_threshold: float = 0.3,
    doc_type: str | None = None,
) -> list[RetrievalResult]:
    """
    检索管线:
    1. 查询文本 → 嵌入向量
    2. ChromaDB 向量搜索
    3. 相关性分数过滤
    4. 去重 + 排序
    """
    # 1. 查询嵌入
    embedding_provider = get_embedding_provider()
    query_embedding = await embedding_provider.embed(query)

    # 2. 向量搜索
    where = {"doc_type": doc_type} if doc_type else None
    raw = query_documents(query_embedding, n_results=top_k * 2, where=where)

    # 3. 解析结果
    results = []
    documents = raw.get("documents", [[]])[0]
    metadatas = raw.get("metadatas", [[]])[0]
    distances = raw.get("distances", [[]])[0]

    for doc, meta, dist in zip(documents, metadatas, distances):
        # ChromaDB cosine distance: 0 = 完全相同, 2 = 完全不同
        score = 1.0 - (dist / 2.0)
        if score >= score_threshold:
            results.append(RetrievalResult(text=doc, score=score, metadata=meta))

    # 4. 去重 (按 doc_id + chunk_index)
    seen = set()
    deduped = []
    for r in results:
        key = f"{r.metadata.get('doc_id', '')}_{r.metadata.get('chunk_index', '')}"
        if key not in seen:
            seen.add(key)
            deduped.append(r)

    # 5. 按相关性排序, 取 top_k
    deduped.sort(key=lambda x: x.score, reverse=True)
    return deduped[:top_k]


def assemble_context(results: list[RetrievalResult], max_tokens: int = 3000) -> str:
    """将检索结果组装为上下文文本"""
    parts = []
    total_chars = 0
    char_limit = max_tokens  # 粗略估算

    for r in results:
        source = r.metadata.get("filename", "未知来源")
        heading = r.metadata.get("heading_path", "")
        header = f"[来源: {source}"
        if heading:
            header += f" > {heading}"
        header += f" | 相关度: {r.score:.2f}]"

        chunk = f"{header}\n{r.text}"
        chunk_len = len(chunk)

        if total_chars + chunk_len > char_limit:
            break

        parts.append(chunk)
        total_chars += chunk_len

    return "\n\n---\n\n".join(parts)
