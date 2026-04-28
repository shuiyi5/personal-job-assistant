"""上下文压缩器 - 压缩检索结果，控制 token 消耗"""

from dataclasses import dataclass


@dataclass
class CompressedChunk:
    content: str
    token_count: int
    source_doc_id: str
    relevance_score: float


class ContextCompressor:
    """压缩检索结果，控制 token 消耗"""

    def __init__(self, max_tokens: int = 8000):
        self.max_tokens = max_tokens

    def compress(self, chunks: list[dict], query: str) -> list[CompressedChunk]:
        """
        1. 按 relevance_score 排序
        2. 估算总 token
        3. 截断/合并超出的 chunk
        4. 返回压缩后的 chunk 列表
        """
        compressed = []
        total_tokens = 0

        for chunk in sorted(chunks, key=lambda x: x.get("score", 0), reverse=True):
            chunk_tokens = self._estimate_tokens(chunk["content"])
            if total_tokens + chunk_tokens <= self.max_tokens:
                compressed.append(CompressedChunk(
                    content=chunk["content"],
                    token_count=chunk_tokens,
                    source_doc_id=chunk.get("metadata", {}).get("doc_id", ""),
                    relevance_score=chunk.get("score", 0),
                ))
                total_tokens += chunk_tokens

        return compressed

    def _estimate_tokens(self, text: str) -> int:
        """中英文混合文本 token 估算：中文约 0.75 token/字符，英文约 0.25 token/字符"""
        chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
        other_chars = len(text) - chinese_chars
        return int(chinese_chars * 0.75 + other_chars * 0.25)
