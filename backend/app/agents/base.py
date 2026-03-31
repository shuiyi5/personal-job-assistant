"""BaseAgent - ReAct 循环核心 (兼容 Claude/OpenAI 消息格式 + thinking 模式)"""

import json
from typing import AsyncGenerator

from app.models.base import LLMProvider
from app.tools.base import BaseTool


def _is_openai_provider(provider: LLMProvider) -> bool:
    """判断是否为 OpenAI 兼容的 provider"""
    from app.models.openai_compatible_provider import OpenAICompatibleProvider
    from app.models.openai_provider import OpenAIProvider
    from app.models.ollama_provider import OllamaProvider
    return isinstance(provider, (OpenAICompatibleProvider, OpenAIProvider, OllamaProvider))


class BaseAgent:
    """ReAct Agent 基类: Think → Act → Observe 循环
    自动适配 Claude API 和 OpenAI API 两种消息格式。
    兼容 thinking/reasoning 模式 (Kimi K2.5, DeepSeek-R1)。
    """

    MAX_ITERATIONS = 10

    def __init__(
        self,
        provider: LLMProvider,
        tools: list[BaseTool],
        system_prompt: str,
    ):
        self._provider = provider
        self._tools = {t.name: t for t in tools}
        self._system_prompt = system_prompt
        self._is_openai = _is_openai_provider(provider)

    def _get_tool_definitions(self) -> list[dict]:
        return [t.to_dict() for t in self._tools.values()]

    def _build_assistant_msg(self, text: str, tool_calls: list[dict], reasoning_content: str | None = None) -> dict:
        """构建 assistant 消息 (兼容两种格式 + thinking 模式)"""
        if self._is_openai:
            msg: dict = {"role": "assistant", "content": text or None}
            # Kimi K2.5 / DeepSeek-R1 thinking 模式: 必须回传 reasoning_content
            if reasoning_content is not None:
                msg["reasoning_content"] = reasoning_content
            if tool_calls:
                msg["tool_calls"] = [
                    {
                        "id": tc["id"],
                        "type": "function",
                        "function": {
                            "name": tc["name"],
                            "arguments": json.dumps(tc["input"], ensure_ascii=False),
                        },
                    }
                    for tc in tool_calls
                ]
            return msg
        else:
            content = []
            if text:
                content.append({"type": "text", "text": text})
            for tc in tool_calls:
                content.append({
                    "type": "tool_use",
                    "id": tc["id"],
                    "name": tc["name"],
                    "input": tc["input"],
                })
            return {"role": "assistant", "content": content}

    def _build_tool_result_msg(self, tool_results: list[dict]) -> list[dict]:
        """构建工具结果消息 (兼容两种格式)"""
        if self._is_openai:
            return [
                {
                    "role": "tool",
                    "tool_call_id": tr["tool_use_id"],
                    "content": tr["content"],
                }
                for tr in tool_results
            ]
        else:
            return [{"role": "user", "content": tool_results}]

    async def invoke(self, user_message: str, history: list[dict] | None = None) -> str:
        """完整 ReAct 循环, 返回最终文本回复"""
        messages = list(history or [])
        messages.append({"role": "user", "content": user_message})

        for _ in range(self.MAX_ITERATIONS):
            response = await self._provider.chat_with_tools(
                messages=messages,
                tools=self._get_tool_definitions(),
                system=self._system_prompt,
            )

            text = response.get("text", "")
            tool_calls = response.get("tool_calls", [])
            reasoning = response.get("reasoning_content")

            if not tool_calls:
                return text

            messages.append(self._build_assistant_msg(text, tool_calls, reasoning))

            tool_results = []
            for tc in tool_calls:
                tool = self._tools.get(tc["name"])
                if tool:
                    try:
                        result = await tool.execute(**tc["input"])
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": tc["id"],
                            "content": json.dumps(result, ensure_ascii=False) if not isinstance(result, str) else result,
                        })
                    except Exception as e:
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": tc["id"],
                            "content": f"工具执行错误: {e}",
                            "is_error": True,
                        })
                else:
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tc["id"],
                        "content": f"未知工具: {tc['name']}",
                        "is_error": True,
                    })

            messages.extend(self._build_tool_result_msg(tool_results))

        return "已达到最大迭代次数，请简化您的请求。"

    async def stream(self, user_message: str, history: list[dict] | None = None) -> AsyncGenerator[dict, None]:
        """流式版本: 产出事件流 (用于 SSE)"""
        messages = list(history or [])
        messages.append({"role": "user", "content": user_message})

        for iteration in range(self.MAX_ITERATIONS):
            response = await self._provider.chat_with_tools(
                messages=messages,
                tools=self._get_tool_definitions(),
                system=self._system_prompt,
            )

            text = response.get("text", "")
            tool_calls = response.get("tool_calls", [])
            reasoning = response.get("reasoning_content")

            if text:
                yield {"type": "text", "content": text}

            if not tool_calls:
                return

            for tc in tool_calls:
                yield {"type": "tool_start", "tool": tc["name"], "input": tc["input"]}

            messages.append(self._build_assistant_msg(text, tool_calls, reasoning))

            tool_results = []
            for tc in tool_calls:
                tool = self._tools.get(tc["name"])
                if tool:
                    try:
                        result = await tool.execute(**tc["input"])
                        result_str = json.dumps(result, ensure_ascii=False) if not isinstance(result, str) else result
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": tc["id"],
                            "content": result_str,
                        })
                        yield {"type": "tool_result", "tool": tc["name"], "result": result_str}
                    except Exception as e:
                        tool_results.append({
                            "type": "tool_result",
                            "tool_use_id": tc["id"],
                            "content": f"错误: {e}",
                            "is_error": True,
                        })
                        yield {"type": "tool_error", "tool": tc["name"], "error": str(e)}
                else:
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tc["id"],
                        "content": f"未知工具: {tc['name']}",
                        "is_error": True,
                    })

            messages.extend(self._build_tool_result_msg(tool_results))

        yield {"type": "text", "content": "已达到最大迭代次数。"}
