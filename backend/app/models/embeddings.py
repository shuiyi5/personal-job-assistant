"""Embedding 提供商适配器"""

import asyncio

from app.models.base import EmbeddingProvider


class ChromaDefaultEmbedding(EmbeddingProvider):
    """使用 sentence-transformers all-MiniLM-L6-v2 模型 (384 维)"""

    def __init__(self):
        from sentence_transformers import SentenceTransformer
        self._model = SentenceTransformer("all-MiniLM-L6-v2")

    async def embed(self, text: str) -> list[float]:
        result = await asyncio.to_thread(self._model.encode, [text])
        return result[0].tolist()

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        result = await asyncio.to_thread(self._model.encode, texts)
        return result.tolist()


class OpenAIEmbedding(EmbeddingProvider):
    """使用 OpenAI Embedding API"""

    def __init__(self):
        import openai
        from app.config.settings import settings
        self._client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
        self._model = settings.embedding_model if settings.embedding_provider == "openai" else "text-embedding-3-small"

    async def embed(self, text: str) -> list[float]:
        response = await self._client.embeddings.create(model=self._model, input=text)
        return response.data[0].embedding

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        response = await self._client.embeddings.create(model=self._model, input=texts)
        return [item.embedding for item in response.data]


class SentenceTransformerEmbedding(EmbeddingProvider):
    """使用本地 sentence-transformers 模型"""

    def __init__(self):
        from sentence_transformers import SentenceTransformer
        from app.config.settings import settings
        self._model = SentenceTransformer(settings.embedding_model)

    async def embed(self, text: str) -> list[float]:
        result = await asyncio.to_thread(self._model.encode, [text])
        return result[0].tolist()

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        result = await asyncio.to_thread(self._model.encode, texts)
        return result.tolist()
