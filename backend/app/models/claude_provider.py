"""Anthropic Claude LLM 适配器"""

from typing import AsyncGenerator, AsyncIterator, Union

import anthropic

from app.config.settings import settings
from app.models.base import LLMProvider


class ClaudeProvider(LLMProvider):
    def __init__(self):
        self._client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        self._model = settings.llm_model

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
        stream: bool = False,
        **kwargs,
    ) -> Union[dict, AsyncIterator[dict]]:
        if stream:
            return self._chat_with_tools_streaming(messages, tools, system, **kwargs)
        return await self._chat_with_tools_blocking(messages, tools, system, **kwargs)

    async def _chat_with_tools_blocking(
        self, messages: list[dict], tools: list[dict], system: str, **kwargs
    ) -> dict:
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

    async def _chat_with_tools_streaming(
        self, messages: list[dict], tools: list[dict], system: str, **kwargs
    ) -> AsyncIterator[dict]:
        params = {
            "model": self._model,
            "max_tokens": kwargs.get("max_tokens", 4096),
            "messages": messages,
            "tools": tools,
        }
        if system:
            params["system"] = system

        text_parts: list[str] = []

        async with self._client.messages.stream(**params) as stream:
            async for event in stream:
                if event.type == "text_delta":
                    text_parts.append(event.text)
                    yield {"type": "text", "content": event.text}

        # 流结束后用非流式获取完整结果（含工具调用）
        full = await self._chat_with_tools_blocking(messages, tools, system, **kwargs)
        yield {"type": "done", **full}
