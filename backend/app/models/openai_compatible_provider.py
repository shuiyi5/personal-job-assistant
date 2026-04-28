"""OpenAI 兼容 API 通用适配器
适用于: DeepSeek, 智谱GLM, 月之暗面Kimi, 通义千问, 零一万物, SiliconFlow 等
这些服务商均提供 OpenAI 兼容的 API 接口。
兼容 thinking/reasoning 模式 (Kimi K2.5, DeepSeek-R1 等)。
"""

import json
from typing import AsyncGenerator, AsyncIterator, Union

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
        stream: bool = False,
        **kwargs,
    ) -> Union[dict, AsyncIterator[dict]]:
        """
        带工具调用的聊天。

        Args:
            stream=True 时返回 AsyncIterator[dict]，逐块yield:
              - {"type": "text", "content": str}  文本片段
              - {"type": "tool_call", "tool_call": dict}  工具调用就绪
              - {"type": "done", "text": str, "tool_calls": [...], "reasoning_content": str|None}
            stream=False 时返回完整 dict（行为同旧版）。
        """
        if not stream:
            return await self._chat_with_tools_blocking(messages, tools, system, **kwargs)

        return self._chat_with_tools_streaming(messages, tools, system, **kwargs)

    async def _chat_with_tools_blocking(
        self, messages: list[dict], tools: list[dict], system: str, **kwargs
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
            reasoning_content = getattr(msg, "reasoning_content", None)
            stop_reason = "tool_use" if tool_calls else "end_turn"
            return {
                "text": text,
                "tool_calls": tool_calls,
                "stop_reason": stop_reason,
                "reasoning_content": reasoning_content,
            }

        return await self._retry(_call)

    async def _chat_with_tools_streaming(
        self, messages: list[dict], tools: list[dict], system: str, **kwargs
    ) -> AsyncIterator[dict]:
        """流式版本：文本 token 边收边 yield，工具调用就绪后一次性 yield"""
        stream = await self._client.chat.completions.create(
            model=self._model,
            messages=self._build_messages(messages, system),
            tools=self._convert_tools(tools),
            max_tokens=kwargs.get("max_tokens", 4096),
            stream=True,
        )

        text_parts: list[str] = []
        # 暂存工具调用片段
        tool_call_deltas: dict[str, dict] = {}  # id -> {name, arguments_str}

        async for chunk in stream:
            delta = chunk.choices[0].delta

            # 1. 文本片段
            if delta.content:
                text_parts.append(delta.content)
                yield {"type": "text", "content": delta.content}

            # 2. 工具调用片段
            if delta.tool_calls:
                for tc_delta in delta.tool_calls:
                    tid = tc_delta.index
                    if tid not in tool_call_deltas:
                        tool_call_deltas[tid] = {"id": "", "name": "", "arguments": ""}
                    if tc_delta.id:
                        tool_call_deltas[tid]["id"] = tc_delta.id
                    if tc_delta.function:
                        if tc_delta.function.name:
                            tool_call_deltas[tid]["name"] = tc_delta.function.name
                        if tc_delta.function.arguments:
                            tool_call_deltas[tid]["arguments"] += tc_delta.function.arguments

        # 3. 流结束，组装完整工具调用
        tool_calls = []
        for tid in sorted(tool_call_deltas.keys()):
            entry = tool_call_deltas[tid]
            try:
                parsed_args = json.loads(entry["arguments"])
            except json.JSONDecodeError:
                parsed_args = {"raw": entry["arguments"]}
            tool_calls.append({
                "name": entry["name"],
                "input": parsed_args,
                "id": entry["id"],
            })

        yield {
            "type": "done",
            "text": "".join(text_parts),
            "tool_calls": tool_calls,
            "reasoning_content": None,
        }
