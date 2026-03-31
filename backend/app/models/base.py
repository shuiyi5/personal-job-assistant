"""LLM 和 Embedding 提供商抽象基类"""

import asyncio
from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator


class LLMProvider(ABC):
    """LLM 提供商抽象接口"""

    MAX_RETRIES = 3
    RETRY_DELAYS = [1, 2, 4]  # 指数退避

    @abstractmethod
    async def chat(
        self,
        messages: list[dict],
        system: str = "",
        **kwargs,
    ) -> str:
        """同步聊天，返回完整文本"""

    @abstractmethod
    async def chat_stream(
        self,
        messages: list[dict],
        system: str = "",
        **kwargs,
    ) -> AsyncGenerator[str, None]:
        """流式聊天，逐步返回文本片段"""

    @abstractmethod
    async def chat_with_tools(
        self,
        messages: list[dict],
        tools: list[dict],
        system: str = "",
        **kwargs,
    ) -> dict:
        """带工具调用的聊天，返回结构化响应
        返回: {"text": str, "tool_calls": [{"name": str, "input": dict, "id": str}]}
        """

    async def _retry(self, fn, *args, **kwargs) -> Any:
        """指数退避重试"""
        last_error = None
        for attempt in range(self.MAX_RETRIES):
            try:
                return await fn(*args, **kwargs)
            except Exception as e:
                last_error = e
                if attempt < self.MAX_RETRIES - 1:
                    await asyncio.sleep(self.RETRY_DELAYS[attempt])
        raise last_error


class EmbeddingProvider(ABC):
    """Embedding 提供商抽象接口"""

    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        """单文本嵌入"""

    @abstractmethod
    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """批量文本嵌入"""


def get_llm_provider(provider_name: str | None = None) -> LLMProvider:
    """工厂函数: 根据名称返回 LLM 提供商实例

    支持的提供商:
      claude, openai, ollama,
      deepseek, zhipu, moonshot, dashscope, yi, siliconflow,
      custom (自定义: 支持 openai/claude 两种 API 格式)
    """
    from app.config.settings import settings
    from app.models.openai_compatible_provider import OpenAICompatibleProvider

    name = provider_name or settings.llm_provider

    if name == "claude":
        from app.models.claude_provider import ClaudeProvider
        return ClaudeProvider()
    elif name == "openai":
        from app.models.openai_provider import OpenAIProvider
        return OpenAIProvider()
    elif name == "ollama":
        from app.models.ollama_provider import OllamaProvider
        return OllamaProvider()

    # --- OpenAI 兼容的第三方提供商 ---
    elif name == "deepseek":
        return OpenAICompatibleProvider(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
            model=settings.deepseek_model,
        )
    elif name == "zhipu":
        return OpenAICompatibleProvider(
            api_key=settings.zhipu_api_key,
            base_url=settings.zhipu_base_url,
            model=settings.zhipu_model,
        )
    elif name == "moonshot":
        return OpenAICompatibleProvider(
            api_key=settings.moonshot_api_key,
            base_url=settings.moonshot_base_url,
            model=settings.moonshot_model,
        )
    elif name == "dashscope":
        return OpenAICompatibleProvider(
            api_key=settings.dashscope_api_key,
            base_url=settings.dashscope_base_url,
            model=settings.dashscope_model,
        )
    elif name == "yi":
        return OpenAICompatibleProvider(
            api_key=settings.yi_api_key,
            base_url=settings.yi_base_url,
            model=settings.yi_model,
        )
    elif name == "siliconflow":
        return OpenAICompatibleProvider(
            api_key=settings.siliconflow_api_key,
            base_url=settings.siliconflow_base_url,
            model=settings.siliconflow_model,
        )

    # --- 自定义提供商: 填 base_url + api_key + format 即可接入任意 API ---
    elif name == "custom":
        if not settings.custom_base_url or not settings.custom_api_key:
            raise ValueError("自定义提供商需要设置 CUSTOM_BASE_URL 和 CUSTOM_API_KEY")
        if settings.custom_api_format == "claude":
            from app.models.claude_compatible_provider import ClaudeCompatibleProvider
            return ClaudeCompatibleProvider(
                api_key=settings.custom_api_key,
                base_url=settings.custom_base_url,
                model=settings.custom_model or "custom-model",
            )
        else:
            return OpenAICompatibleProvider(
                api_key=settings.custom_api_key,
                base_url=settings.custom_base_url,
                model=settings.custom_model or "custom-model",
            )

    else:
        supported = "claude, openai, ollama, deepseek, zhipu, moonshot, dashscope, yi, siliconflow, custom"
        raise ValueError(f"不支持的 LLM 提供商: {name} (支持: {supported})")


def get_embedding_provider(provider_name: str | None = None) -> EmbeddingProvider:
    """工厂函数: 根据名称返回 Embedding 提供商实例"""
    from app.config.settings import settings

    name = provider_name or settings.embedding_provider

    if name == "chroma":
        from app.models.embeddings import ChromaDefaultEmbedding
        return ChromaDefaultEmbedding()
    elif name == "openai":
        from app.models.embeddings import OpenAIEmbedding
        return OpenAIEmbedding()
    elif name == "sentence-transformers":
        from app.models.embeddings import SentenceTransformerEmbedding
        return SentenceTransformerEmbedding()
    else:
        raise ValueError(f"不支持的 Embedding 提供商: {name}")
