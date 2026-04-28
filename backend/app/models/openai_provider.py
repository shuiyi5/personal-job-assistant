"""OpenAI GPT LLM 适配器"""

import json
from typing import AsyncGenerator, AsyncIterator, Union

import openai

from app.config.settings import settings
from app.models.base import LLMProvider


class OpenAIProvider(LLMProvider):
    def __init__(self):
        self._client = openai.AsyncOpenAI(api_key=settings.openai_api_key)
        self._model = settings.llm_model if "gpt" in settings.llm_model else "gpt-4o"

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
        if stream:
            return self._chat_with_tools_streaming(messages, tools, system, **kwargs)
        return await self._chat_with_tools_blocking(messages, tools, system, **kwargs)

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
            stop_reason = "tool_use" if tool_calls else "end_turn"
            return {"text": text, "tool_calls": tool_calls, "stop_reason": stop_reason}

        return await self._retry(_call)

    async def _chat_with_tools_streaming(
        self, messages: list[dict], tools: list[dict], system: str, **kwargs
    ) -> AsyncIterator[dict]:
        stream = await self._client.chat.completions.create(
            model=self._model,
            messages=self._build_messages(messages, system),
            tools=self._convert_tools(tools),
            max_tokens=kwargs.get("max_tokens", 4096),
            stream=True,
        )

        text_parts: list[str] = []
        tool_call_deltas: dict[int, dict] = {}

        async for chunk in stream:
            delta = chunk.choices[0].delta

            if delta.content:
                text_parts.append(delta.content)
                yield {"type": "text", "content": delta.content}

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

        yield {"type": "done", "text": "".join(text_parts), "tool_calls": tool_calls, "reasoning_content": None}
