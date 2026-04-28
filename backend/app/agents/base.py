"""BaseAgent - 感知 → 目标检查 → 行动 循环 (兼容 Claude/OpenAI 消息格式 + thinking 模式)

循环结构 (每轮最多 MAX_ITERATIONS = 5 次):
  感知 (_perceive)    : LLM 读取上下文，理解当前状态并决策
  目标检查            : LLM 不再调用工具 → 任务完成，停止循环
                        (每步行动后都会注入显式目标检查提示，强制 LLM 自评)
  行动 (_act)         : 并发执行工具调用，将观察结果写回上下文
  → 回到感知，开始下一轮

停止条件 (满足任一即停):
  1. LLM 判断目标达成（不再调用工具，直接输出结果）
  2. 用户消息中包含停止信号（"停止"/"stop"/"结束"）
  3. 已达到 MAX_ITERATIONS 轮次上限
"""

import asyncio
import json
from typing import AsyncGenerator, AsyncIterator, Optional

from app.models.base import LLMProvider
from app.tools.base import BaseTool
from app.session.manager import SessionManager, SessionConfig

# 目标检查提示模板 —— 注入到每轮工具结果之后，让 LLM 显式自评
_GOAL_CHECK_PROMPT = (
    "[目标检查 · 第 {current}/{max} 轮]\n"
    "请评估：原始任务目标是否已达成？\n"
    "· 若已完成（如总结文件已写好、答案已给出）→ 直接输出最终结果，不再调用任何工具\n"
    "· 若未完成 → 继续调用工具完成剩余步骤"
)

# 超出轮次限制时的结尾提示
_MAX_ITER_PROMPT = (
    "[已达到最大轮次上限 {max} 轮，停止执行]\n"
    "请根据以上已完成的步骤，整理并输出目前的进展和结论，"
    "说明哪些目标已达成、哪些尚未完成。"
)

# 用户停止信号关键词
_STOP_SIGNALS = {"停止", "stop", "结束", "quit", "exit", "halt"}


def _is_openai_provider(provider: LLMProvider) -> bool:
    from app.models.openai_compatible_provider import OpenAICompatibleProvider
    from app.models.openai_provider import OpenAIProvider
    from app.models.ollama_provider import OllamaProvider
    return isinstance(provider, (OpenAICompatibleProvider, OpenAIProvider, OllamaProvider))


def _user_wants_stop(message: str) -> bool:
    """检测用户消息中是否包含停止信号。"""
    lower = message.lower().strip()
    return any(sig in lower for sig in _STOP_SIGNALS)


class BaseAgent:
    """ReAct Agent 基类: 感知 → 目标检查 → 行动 循环
    自动适配 Claude API 和 OpenAI API 两种消息格式。
    兼容 thinking/reasoning 模式 (Kimi K2.5, DeepSeek-R1)。
    """

    MAX_ITERATIONS = 5  # 最多执行 5 轮行动

    def __init__(
        self,
        provider: LLMProvider,
        tools: list[BaseTool],
        system_prompt: str,
        session_id: Optional[str] = None,
        session_config: Optional[SessionConfig] = None,
    ):
        self._provider = provider
        self._tools = {t.name: t for t in tools}
        self._system_prompt = system_prompt
        self._is_openai = _is_openai_provider(provider)
        self._session: Optional[SessionManager] = None
        if session_id:
            self._session = SessionManager(
                session_id,
                session_config or SessionConfig()
            )

    def _get_tool_definitions(self) -> list[dict]:
        return [t.to_dict() for t in self._tools.values()]

    # ──────────────────────────────────────────────
    # 核心三阶段
    # ──────────────────────────────────────────────

    async def _perceive_blocking(self, messages: list[dict]) -> dict:
        """感知阶段（非流式）：等待 LLM 完整返回 dict。"""
        return await self._provider.chat_with_tools(
            messages=messages,
            tools=self._get_tool_definitions(),
            system=self._system_prompt,
            stream=False,
        )

    async def _perceive_streaming(self, messages: list[dict]) -> AsyncIterator[dict]:
        """感知阶段（流式）：逐步 yield 文本片段，末尾 yield done。"""
        async for event in await self._provider.chat_with_tools(
            messages=messages,
            tools=self._get_tool_definitions(),
            system=self._system_prompt,
            stream=True,
        ):
            yield event

    def _check_goal(self, response: dict) -> bool:
        """目标检查: LLM 不再调用工具，说明它判断任务已完成，返回 True。"""
        return not response.get("tool_calls")

    async def _act(self, tool_calls: list[dict]) -> list[dict]:
        """行动阶段: 并发执行所有工具调用，返回工具结果列表（观察值）。"""
        async def _run_one(tc: dict) -> dict:
            tool = self._tools.get(tc["name"])
            if tool is None:
                return {
                    "type": "tool_result",
                    "tool_use_id": tc["id"],
                    "content": f"未知工具: {tc['name']}",
                    "is_error": True,
                }
            try:
                result = await tool.execute(**tc["input"])
                return {
                    "type": "tool_result",
                    "tool_use_id": tc["id"],
                    "content": json.dumps(result, ensure_ascii=False)
                    if not isinstance(result, str)
                    else result,
                }
            except Exception as e:
                return {
                    "type": "tool_result",
                    "tool_use_id": tc["id"],
                    "content": f"工具执行错误: {e}",
                    "is_error": True,
                }

        return list(await asyncio.gather(*[_run_one(tc) for tc in tool_calls]))

    def _build_goal_check_msg(self, current: int, max_iter: int) -> dict:
        """构建注入到每轮观察之后的目标检查提示消息。"""
        content = _GOAL_CHECK_PROMPT.format(current=current, max=max_iter)
        return {"role": "user", "content": content}

    def _build_max_iter_msg(self, max_iter: int) -> dict:
        """构建超出轮次上限时的最终提示消息。"""
        content = _MAX_ITER_PROMPT.format(max=max_iter)
        return {"role": "user", "content": content}

    # ──────────────────────────────────────────────
    # 消息格式适配 (Claude / OpenAI)
    # ──────────────────────────────────────────────

    def _build_assistant_msg(
        self, text: str, tool_calls: list[dict], reasoning_content: Optional[str] = None
    ) -> dict:
        if self._is_openai:
            msg: dict = {"role": "assistant", "content": text or None}
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

    # ──────────────────────────────────────────────
    # 公开接口
    # ──────────────────────────────────────────────

    async def invoke(self, user_message: str, history: Optional[list[dict]] = None) -> str:
        """完整循环: 感知 → 目标检查 → 行动，直到任务完成，返回最终文本。

        停止条件 (满足任一即停):
          1. LLM 判断目标达成（不再调用工具）
          2. 用户消息包含停止信号
          3. 已执行 max_iterations 轮（动态，由 session 估算）
        """
        # 停止条件 2: 用户说停
        if _user_wants_stop(user_message):
            return "已收到停止指令，任务终止。"

        messages = list(history or [])
        messages.append({"role": "user", "content": user_message})

        # 动态 max_iterations：如果有 session 管理器，使用它来估算
        max_iter = self._get_dynamic_max_iterations(history)

        for iteration in range(1, max_iter + 1):
            # 感知
            response = await self._perceive_blocking(messages)
            text = response.get("text", "")
            tool_calls = response.get("tool_calls", [])
            reasoning = response.get("reasoning_content")

            # 停止条件 1: LLM 判断目标已达成
            if self._check_goal(response):
                return text

            # 记录本轮思考与行动意图
            messages.append(self._build_assistant_msg(text, tool_calls, reasoning))

            # 行动: 并发执行工具
            tool_results = await self._act(tool_calls)

            # 观察: 工具结果写回上下文
            messages.extend(self._build_tool_result_msg(tool_results))

            # 会话管理器记录工具结果
            if self._session:
                for tr, tc in zip(tool_results, tool_calls):
                    self._session.add_tool_result(
                        tool_name=tc["name"],
                        input_summary=str(tc["input"])[:200],
                        output=tr["content"],
                    )
                await self._session.flush()
                # 检查是否需要压缩
                if self._session.check_and_compact():
                    # 重建消息列表
                    messages = self._session.get_context(self._system_prompt)
                    messages.append({"role": "user", "content": user_message})

            # 停止条件 3: 已到最后一轮 → 让 LLM 汇总进展后退出
            if iteration == max_iter:
                messages.append(self._build_max_iter_msg(max_iter))
                final = await self._provider.chat_with_tools(
                    messages=messages,
                    tools=[],  # 不再允许调用工具
                    system=self._system_prompt,
                )
                return final.get("text", "已达到最大轮次，任务未完全完成。")

            # 注入目标检查提示，让下一轮感知时 LLM 先自评是否完成
            messages.append(self._build_goal_check_msg(iteration, max_iter))

        return "已达到最大轮次，任务未完全完成。"  # 防御性兜底，正常不会到达

    def _get_dynamic_max_iterations(self, history: Optional[list[dict]]) -> int:
        """根据会话状态动态估算需要的最大迭代次数"""
        if self._session:
            return self._session.estimate_iterations_needed()
        return self.MAX_ITERATIONS

    async def stream(
        self, user_message: str, history: Optional[list[dict]] = None
    ) -> AsyncGenerator[dict, None]:
        """流式循环: 每轮产出事件流 (用于 SSE)。

        停止条件同 invoke。
        流式失败时自动降级为阻塞模式。
        """

        # 停止条件 2: 用户说停
        if _user_wants_stop(user_message):
            yield {"type": "text", "content": "已收到停止指令，任务终止。"}
            return

        messages = list(history or [])
        messages.append({"role": "user", "content": user_message})

        max_iter = self._get_dynamic_max_iterations(history)

        for iteration in range(1, max_iter + 1):
            try:
                # 感知（流式：边收文本边推送，工具调用在末尾一次性交付）
                response: dict = {}
                streaming_failed = False
                try:
                    stream_iter = await self._perceive_streaming(messages)
                    async for event in stream_iter:
                        if event["type"] == "text":
                            yield {"type": "text", "content": event["content"]}
                        elif event["type"] == "done":
                            response = event
                            break
                except Exception:
                    # 流式失败，降级为阻塞模式
                    streaming_failed = True

                if streaming_failed or not response:
                    # 降级：使用阻塞式感知
                    response = await self._perceive_blocking(messages)
                    text = response.get("text", "")
                    if text:
                        yield {"type": "text", "content": text}
                    yield {"type": "stream_fallback", "message": "流式输出失败，已切换为普通模式"}

                text = response.get("text", "")
                tool_calls = response.get("tool_calls", [])
                reasoning = response.get("reasoning_content")

                # 停止条件 1: LLM 判断目标已达成
                if self._check_goal(response):
                    return

                yield {"type": "iteration", "current": iteration, "max": max_iter}
                for tc in tool_calls:
                    yield {"type": "tool_start", "tool": tc["name"], "input": tc["input"]}

                messages.append(self._build_assistant_msg(text, tool_calls, reasoning))

                # 行动: 并发执行工具
                tool_results = await self._act(tool_calls)

                # 产出观察事件
                for tr in tool_results:
                    tool_name = next(
                        (tc["name"] for tc in tool_calls if tc["id"] == tr["tool_use_id"]),
                        "unknown",
                    )
                    if tr.get("is_error"):
                        yield {"type": "tool_error", "tool": tool_name, "error": tr["content"]}
                    else:
                        yield {"type": "tool_result", "tool": tool_name, "result": tr["content"]}

                # 观察: 工具结果写回上下文
                messages.extend(self._build_tool_result_msg(tool_results))

                # 会话管理器记录工具结果
                if self._session:
                    for tr, tc in zip(tool_results, tool_calls):
                        self._session.add_tool_result(
                            tool_name=tc["name"],
                            input_summary=str(tc["input"])[:200],
                            output=tr["content"],
                        )

                # 停止条件 3: 已到最后一轮
                if iteration == max_iter:
                    yield {"type": "max_iterations", "message": f"已达到最大轮次 {max_iter} 轮，整理结论中…"}
                    messages.append(self._build_max_iter_msg(max_iter))
                    final = await self._provider.chat_with_tools(
                        messages=messages,
                        tools=[],
                        system=self._system_prompt,
                    )
                    yield {"type": "text", "content": final.get("text", "已达到最大轮次，任务未完全完成。")}
                    return

                # 注入目标检查提示
                messages.append(self._build_goal_check_msg(iteration, max_iter))
            finally:
                if self._session:
                    await self._session.flush()
