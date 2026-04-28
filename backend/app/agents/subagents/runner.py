"""Subagent 并行执行器

参照 Claude Code 的 Agent/Subagent 架构:
  - Main Agent: 负责任务分解、结果聚合
  - Subagent: 独立执行子任务，可并行运行

适用场景:
  1. 多个独立的 KB 查询可以并行执行
  2. 简历多项分析（格式检查 + 内容优化 + 关键词匹配）可以并行
  3. 并行执行多个工具再汇总结果
"""

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any, AsyncGenerator, Callable, Optional

from app.models.base import LLMProvider

logger = logging.getLogger(__name__)


@dataclass
class SubagentTask:
    """子任务定义"""
    name: str                          # 任务名称（唯一标识）
    prompt: str                        # 给子任务的 prompt
    context: dict = field(default_factory=dict)  # 额外上下文
    timeout: int = 30                 # 超时秒数

    def __post_init__(self):
        if not self.name or not self.prompt:
            raise ValueError("name 和 prompt 是必填项")


@dataclass
class SubagentResult:
    """子任务执行结果"""
    name: str
    success: bool
    result: Any = None
    error: Optional[str] = None
    duration_ms: float = 0


class SubagentRunner:
    """Subagent 并行执行器

    使用方法:
      runner = SubagentRunner(provider, tools, system_prompt)
      results = await runner.run_all([task1, task2, task3])
      # 或流式:
      async for event in runner.run_all_stream([task1, task2]):
          print(event)
    """

    def __init__(
        self,
        provider: LLMProvider,
        tools: list[Any],        # BaseTool list
        system_prompt: str = "",
        default_timeout: int = 30,
    ):
        self.provider = provider
        self.tools = {t.name: t for t in tools}
        self.system_prompt = system_prompt
        self.default_timeout = default_timeout

    async def run_all(self, tasks: list[SubagentTask]) -> list[SubagentResult]:
        """并行执行所有任务，返回结果列表"""
        import time
        start = time.perf_counter()

        async def _run_one(task: SubagentTask) -> SubagentResult:
            t_start = time.perf_counter()
            try:
                result = await asyncio.wait_for(
                    self._execute_task(task),
                    timeout=task.timeout or self.default_timeout,
                )
                duration = (time.perf_counter() - t_start) * 1000
                return SubagentResult(
                    name=task.name,
                    success=True,
                    result=result,
                    duration_ms=duration,
                )
            except asyncio.TimeoutError:
                duration = (time.perf_counter() - t_start) * 1000
                logger.error(f"Task {task.name} timed out after {task.timeout}s")
                return SubagentResult(
                    name=task.name,
                    success=False,
                    error=f"Timeout after {task.timeout}s",
                    duration_ms=duration,
                )
            except Exception as e:
                duration = (time.perf_counter() - t_start) * 1000
                logger.error(f"Task {task.name} failed: {e}")
                return SubagentResult(
                    name=task.name,
                    success=False,
                    error=str(e),
                    duration_ms=duration,
                )

        results = await asyncio.gather(*[_run_one(t) for t in tasks])
        total = (time.perf_counter() - start) * 1000
        logger.info(f"Ran {len(tasks)} subagents in {total:.0f}ms")
        return list(results)

    async def run_all_stream(
        self, tasks: list[SubagentTask]
    ) -> AsyncGenerator[dict, None]:
        """流式并行执行，实时产出各任务的事件"""
        async def _run_and_yield(task: SubagentTask) -> SubagentResult:
            import time
            t_start = time.perf_counter()
            try:
                # 先产出任务开始
                yield {"type": "task_start", "name": task.name}

                result = await asyncio.wait_for(
                    self._execute_task_stream(task),
                    timeout=task.timeout or self.default_timeout,
                )
                async for event in result:
                    yield event

                duration = (time.perf_counter() - t_start) * 1000
                yield {"type": "task_done", "name": task.name, "duration_ms": duration}
                return SubagentResult(name=task.name, success=True,
                                      duration_ms=duration)

            except asyncio.TimeoutError:
                duration = (time.perf_counter() - t_start) * 1000
                yield {"type": "task_error", "name": task.name,
                       "error": f"Timeout after {task.timeout}s"}
                return SubagentResult(name=task.name, success=False,
                                      error=f"Timeout", duration_ms=duration)
            except Exception as e:
                duration = (time.perf_counter() - t_start) * 1000
                yield {"type": "task_error", "name": task.name, "error": str(e)}
                return SubagentResult(name=task.name, success=False,
                                      error=str(e), duration_ms=duration)

        # 并行启动所有任务
        streams = [_run_and_yield(t) for t in tasks]

        # 收集所有事件（交替 yield）
        done = set()
        pending = set(range(len(streams)))

        async def drain(idx: int, gen):
            async for event in gen:
                yield idx, event
            done.add(idx)

        coros = [drain(i, g) for i, g in enumerate(streams)]

        # 使用 wait + 队列实现交错产出
        queue: asyncio.Queue[tuple[int, dict]] = asyncio.Queue()

        async def enqueue(coro):
            async for idx, event in coro:
                await queue.put((idx, event))

        await asyncio.gather(*[enqueue(c) for c in coros])

        # 清空队列
        while not queue.empty():
            yield await queue.get()

    async def _execute_task(self, task: SubagentTask) -> Any:
        """执行单个子任务（同步版本，返回完整结果）"""
        messages = [{"role": "user", "content": task.prompt}]

        response = await self.provider.chat_with_tools(
            messages=messages,
            tools=self._get_tool_definitions(),
            system=self._build_subagent_system(task),
        )

        text = response.get("text", "")
        tool_calls = response.get("tool_calls", [])

        if tool_calls:
            # 子任务也可以调用工具
            tool_results = await self._execute_tools(tool_calls)
            return {"text": text, "tool_results": tool_results}
        return {"text": text}

    async def _execute_task_stream(self, task: SubagentTask) -> AsyncGenerator[dict, None]:
        """执行单个子任务（流式版本）"""
        messages = [{"role": "user", "content": task.prompt}]

        response = await self.provider.chat_with_tools(
            messages=messages,
            tools=self._get_tool_definitions(),
            system=self._build_subagent_system(task),
        )

        text = response.get("text", "")
        if text:
            yield {"type": "text", "content": text}

        tool_calls = response.get("tool_calls", [])
        for tc in tool_calls:
            yield {"type": "tool_start", "tool": tc["name"], "input": tc["input"]}

        if tool_calls:
            tool_results = await self._execute_tools(tool_calls)
            for tr in tool_results:
                yield {"type": "tool_result", "tool": tr.get("tool_name", "unknown"),
                       "result": tr.get("content", "")}

    def _build_subagent_system(self, task: SubagentTask) -> str:
        """为子任务构建 system prompt"""
        parts = [self.system_prompt] if self.system_prompt else []
        parts.append(f"[子任务: {task.name}]")
        if task.context:
            parts.append(f"[上下文]: {task.context}")
        return "\n".join(parts)

    def _get_tool_definitions(self) -> list[dict]:
        return [t.to_dict() for t in self.tools.values()]

    async def _execute_tools(self, tool_calls: list[dict]) -> list[dict]:
        """并发执行工具"""
        async def _run_one(tc: dict) -> dict:
            tool = self.tools.get(tc["name"])
            if tool is None:
                return {"tool_name": tc["name"], "content": f"未知工具: {tc['name']}",
                        "is_error": True}
            try:
                result = await tool.execute(**tc["input"])
                import json
                content = json.dumps(result, ensure_ascii=False) if not isinstance(result, str) else result
                return {"tool_name": tc["name"], "content": content}
            except Exception as e:
                return {"tool_name": tc["name"], "content": str(e), "is_error": True}

        return list(await asyncio.gather(*[_run_one(tc) for tc in tool_calls]))


def aggregate_results(results: list[SubagentResult], format: str = "text") -> str:
    """将多个子任务结果聚合成最终输出

    Args:
        results: 子任务结果列表
        format: "text" | "json" | "markdown"
    """
    if format == "json":
        import json
        return json.dumps(
            [{"name": r.name, "success": r.success, "result": r.result,
              "error": r.error} for r in results],
            ensure_ascii=False, indent=2
        )

    lines = []
    for r in results:
        status = "✓" if r.success else "✗"
        lines.append(f"{status} [{r.name}] ({r.duration_ms:.0f}ms)")
        if r.success and r.result:
            if isinstance(r.result, dict):
                text = r.result.get("text", "")
            else:
                text = str(r.result)
            lines.append(f"  {text[:200]}")
        elif r.error:
            lines.append(f"  Error: {r.error}")

    if format == "markdown":
        return "\n".join(lines)
    return "\n".join(lines)
