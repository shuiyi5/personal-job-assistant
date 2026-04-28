"""Failover Provider - 多提供商自动切换

当主提供商失败时，自动切换到备选提供商。
支持优先级列表配置。
"""

import logging
from typing import Any, AsyncGenerator, AsyncIterator, Optional, Union

from app.models.base import LLMProvider

logger = logging.getLogger(__name__)


class FailoverProvider(LLMProvider):
    """多提供商 failover 包装器"""

    def __init__(self, providers: Optional[list[LLMProvider]] = None,
                 provider_names: Optional[list[str]] = None):
        if providers:
            self._providers = providers
        elif provider_names:
            self._providers = [self._instantiate(p) for p in provider_names]
        else:
            self._providers = self._load_from_settings()

        if not self._providers:
            raise ValueError("至少需要配置一个 LLM 提供商")

    def _instantiate(self, name: str) -> LLMProvider:
        from app.models.base import get_llm_provider
        return get_llm_provider(name)

    def _load_from_settings(self) -> list[LLMProvider]:
        from app.config.settings import settings
        from app.models.base import get_llm_provider
        primary = get_llm_provider(settings.llm_provider)
        return [primary]

    @property
    def current(self) -> LLMProvider:
        return self._providers[0]

    @property
    def all_providers(self) -> list[LLMProvider]:
        return list(self._providers)

    async def chat(self, messages: list[dict], system: str = "", **kwargs) -> str:
        for i, provider in enumerate(self._providers):
            try:
                return await provider.chat(messages, system, **kwargs)
            except Exception as e:
                logger.warning(f"Provider {i} ({type(provider).__name__}) failed: {e}")
                if i < len(self._providers) - 1:
                    logger.info(f"Failing over to provider {i + 1}")
                else:
                    raise

    async def chat_stream(
        self, messages: list[dict], system: str = "", **kwargs
    ) -> AsyncGenerator[str, None]:
        for i, provider in enumerate(self._providers):
            try:
                async for chunk in provider.chat_stream(messages, system, **kwargs):
                    yield chunk
                return
            except Exception as e:
                logger.warning(f"Provider {i} ({type(provider).__name__}) stream failed: {e}")
                if i < len(self._providers) - 1:
                    logger.info(f"Failing over to provider {i + 1}")
                else:
                    raise

    async def chat_with_tools(
        self,
        messages: list[dict],
        tools: list[dict],
        system: str = "",
        stream: bool = False,
        **kwargs,
    ) -> Union[dict, AsyncIterator[dict]]:
        for i, provider in enumerate(self._providers):
            try:
                return await provider.chat_with_tools(messages, tools, system, stream=stream, **kwargs)
            except Exception as e:
                logger.warning(f"Provider {i} ({type(provider).__name__}) failed: {e}")
                if i < len(self._providers) - 1:
                    logger.info(f"Failing over to provider {i + 1}")
                else:
                    raise

    def switch_to(self, provider_name: str) -> None:
        new_provider = self._instantiate(provider_name)
        self._providers = [new_provider] + [p for p in self._providers
                                             if type(p).__name__ != provider_name]
        logger.info(f"Switched to provider: {provider_name}")

    def add_fallback(self, provider_name: str) -> None:
        provider = self._instantiate(provider_name)
        self._providers.append(provider)
        logger.info(f"Added fallback provider: {provider_name}")


def get_failover_provider() -> FailoverProvider:
    return FailoverProvider()
