"""Anthropic Claude 兼容 API 通用适配器
适用于: 任何兼容 Anthropic Messages API 格式的服务
支持自定义 base_url / api_key / model
"""

from typing import AsyncGenerator

import anthropic

from app.models.base import LLMProvider


class ClaudeCompatibleProvider(LLMProvider):
    """Claude API 格式的通用适配器"""

    def __init__(self, api_key: str, base_url: str, model: str):
        self._client = anthropic.AsyncAnthropic(api_key=api_key, base_url=base_url)
        self._model = model

    async def chat(self, messages: list[dict], system: str = "", **kwargs) -> str:
        async def _call():
            params = {"model": self._model, "max_tokens": kwargs.get("max_tokens", 4096), "messages": messages}
            if system:
                params["system"] = system
            response = await self._client.messages.create(**params)
            return "".join(block.text for block in response.content if block.type == "text")

        return await self._retry(_call)

    async def chat_stream(self, messages: list[dict], system: str = "", **kwargs) -> AsyncGenerator[str, None]:
        params = {"model": self._model, "max_tokens": kwargs.get("max_tokens", 4096), "messages": messages}
        if system:
            params["system"] = system

        async with self._client.messages.stream(**params) as stream:
            async for text in stream.text_stream:
                yield text

    async def chat_with_tools(
        self,
        messages: list[dict],
        tools: list[dict],
        system: str = "",
        **kwargs,
    ) -> dict:
        async def _call():
            params = {
                "model": self._model,
                "max_tokens": kwargs.get("max_tokens", 4096),
                "messages": messages,
                "tools": tools,
            }
            if system:
                params["system"] = system
            response = await self._client.messages.create(**params)

            text_parts = []
            tool_calls = []
            for block in response.content:
                if block.type == "text":
                    text_parts.append(block.text)
                elif block.type == "tool_use":
                    tool_calls.append({
                        "name": block.name,
                        "input": block.input,
                        "id": block.id,
                    })

            return {
                "text": "".join(text_parts),
                "tool_calls": tool_calls,
                "stop_reason": response.stop_reason,
            }

        return await self._retry(_call)
