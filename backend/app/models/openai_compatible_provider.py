"""OpenAI 兼容 API 通用适配器
适用于: DeepSeek, 智谱GLM, 月之暗面Kimi, 通义千问, 零一万物, SiliconFlow 等
这些服务商均提供 OpenAI 兼容的 API 接口。
兼容 thinking/reasoning 模式 (Kimi K2.5, DeepSeek-R1 等)。
"""

import json
from typing import AsyncGenerator

import openai

from app.models.base import LLMProvider


class OpenAICompatibleProvider(LLMProvider):
    """OpenAI 兼容 API 通用适配器"""

    def __init__(self, api_key: str, base_url: str, model: str):
        self._client = openai.AsyncOpenAI(api_key=api_key, base_url=base_url)
        self._model = model

    def _build_messages(self, messages: list[dict], system: str) -> list[dict]:
        result = []
        if system:
            result.append({"role": "system", "content": system})
        result.extend(messages)
        return result

    def _convert_tools(self, tools: list[dict]) -> list[dict]:
        return [
            {
                "type": "function",
                "function": {
                    "name": t["name"],
                    "description": t.get("description", ""),
                    "parameters": t.get("input_schema", {}),
                },
            }
            for t in tools
        ]

    async def chat(self, messages: list[dict], system: str = "", **kwargs) -> str:
        async def _call():
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=self._build_messages(messages, system),
                max_tokens=kwargs.get("max_tokens", 4096),
            )
            return response.choices[0].message.content or ""

        return await self._retry(_call)

    async def chat_stream(self, messages: list[dict], system: str = "", **kwargs) -> AsyncGenerator[str, None]:
        stream = await self._client.chat.completions.create(
            model=self._model,
            messages=self._build_messages(messages, system),
            max_tokens=kwargs.get("max_tokens", 4096),
            stream=True,
        )
        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                yield delta.content

    async def chat_with_tools(
        self,
        messages: list[dict],
        tools: list[dict],
        system: str = "",
        **kwargs,
    ) -> dict:
        async def _call():
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=self._build_messages(messages, system),
                tools=self._convert_tools(tools),
                max_tokens=kwargs.get("max_tokens", 4096),
            )
            msg = response.choices[0].message
            text = msg.content or ""
            tool_calls = []
            if msg.tool_calls:
                for tc in msg.tool_calls:
                    tool_calls.append({
                        "name": tc.function.name,
                        "input": json.loads(tc.function.arguments),
                        "id": tc.id,
                    })

            # 保留 reasoning_content (Kimi K2.5 / DeepSeek-R1 等 thinking 模式需要)
            reasoning_content = getattr(msg, "reasoning_content", None)

            stop_reason = "tool_use" if tool_calls else "end_turn"
            return {
                "text": text,
                "tool_calls": tool_calls,
                "stop_reason": stop_reason,
                "reasoning_content": reasoning_content,
            }

        return await self._retry(_call)
