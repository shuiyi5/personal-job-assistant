"""Ollama 本地模型 LLM 适配器"""

import json
from typing import AsyncGenerator

import httpx

from app.config.settings import settings
from app.models.base import LLMProvider


class OllamaProvider(LLMProvider):
    def __init__(self):
        self._base_url = settings.ollama_base_url
        self._model = settings.llm_model if settings.llm_provider == "ollama" else "qwen2.5:7b"
        self._client = httpx.AsyncClient(base_url=self._base_url, timeout=120)

    def _build_messages(self, messages: list[dict], system: str) -> list[dict]:
        result = []
        if system:
            result.append({"role": "system", "content": system})
        result.extend(messages)
        return result

    async def chat(self, messages: list[dict], system: str = "", **kwargs) -> str:
        async def _call():
            response = await self._client.post(
                "/api/chat",
                json={
                    "model": self._model,
                    "messages": self._build_messages(messages, system),
                    "stream": False,
                },
            )
            response.raise_for_status()
            return response.json()["message"]["content"]

        return await self._retry(_call)

    async def chat_stream(self, messages: list[dict], system: str = "", **kwargs) -> AsyncGenerator[str, None]:
        async with self._client.stream(
            "POST",
            "/api/chat",
            json={
                "model": self._model,
                "messages": self._build_messages(messages, system),
                "stream": True,
            },
        ) as response:
            async for line in response.aiter_lines():
                if line:
                    data = json.loads(line)
                    if content := data.get("message", {}).get("content", ""):
                        yield content

    async def chat_with_tools(
        self,
        messages: list[dict],
        tools: list[dict],
        system: str = "",
        **kwargs,
    ) -> dict:
        """Ollama 工具调用 (通过 prompt 模拟，部分模型原生支持)"""
        # 将工具定义转为 Ollama 格式
        ollama_tools = []
        for t in tools:
            ollama_tools.append({
                "type": "function",
                "function": {
                    "name": t["name"],
                    "description": t.get("description", ""),
                    "parameters": t.get("input_schema", {}),
                },
            })

        async def _call():
            response = await self._client.post(
                "/api/chat",
                json={
                    "model": self._model,
                    "messages": self._build_messages(messages, system),
                    "tools": ollama_tools,
                    "stream": False,
                },
            )
            response.raise_for_status()
            data = response.json()
            msg = data["message"]
            text = msg.get("content", "")
            tool_calls = []

            if msg.get("tool_calls"):
                for tc in msg["tool_calls"]:
                    func = tc["function"]
                    tool_calls.append({
                        "name": func["name"],
                        "input": func.get("arguments", {}),
                        "id": f"ollama_{func['name']}",
                    })

            stop_reason = "tool_use" if tool_calls else "end_turn"
            return {"text": text, "tool_calls": tool_calls, "stop_reason": stop_reason}

        return await self._retry(_call)
