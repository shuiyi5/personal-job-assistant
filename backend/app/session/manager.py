"""Session Manager - 冷热记忆分层 + 智能上下文窗口管理

参照 Claude Code 的 memory 架构:
  冷数据（磁盘/DB）← 按需读取 → 热数据（内存/上下文）

职责:
  1. 上下文窗口水位监测（token 估算）
  2. 智能压缩: 保留核心对话轨迹 + 关键工具结果，裁剪低价值消息
  3. 热/冷记忆分层:
     - 热: 最近 N 条消息 + 当前任务上下文 (驻留内存)
     - 冷: 历史会话摘要 + 重要工具执行结果 (持久化到磁盘)
  4. 动态 max_iterations: 根据任务复杂度自适应调整
"""

import asyncio
import json
import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

# 默认配置
DEFAULT_MAX_TOKENS = 100_000  # 上下文上限（留 20% 给输出）
DEFAULT_HOT_MESSAGES = 20     # 热区保留最近 20 条消息
DEFAULT_COMPRESS_RATIO = 0.7  # 压缩后保留 70% token


@dataclass
class SessionConfig:
    """会话配置"""
    max_tokens: int = DEFAULT_MAX_TOKENS
    hot_messages: int = DEFAULT_HOT_MESSAGES
    compress_ratio: float = DEFAULT_COMPRESS_RATIO
    session_dir: str = "./data/sessions"


@dataclass
class Message:
    """统一消息格式"""
    role: str
    content: Any
    tokens: int = 0
    timestamp: float = field(default_factory=time.time)
    is_compact: bool = False  # 是否来自压缩

    def to_dict(self) -> dict:
        return {
            "role": self.role,
            "content": self.content,
            "tokens": self.tokens,
            "timestamp": self.timestamp,
            "is_compact": self.is_compact,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "Message":
        return cls(
            role=d["role"],
            content=d["content"],
            tokens=d.get("tokens", 0),
            timestamp=d.get("timestamp", time.time()),
            is_compact=d.get("is_compact", False),
        )


@dataclass
class ToolResult:
    """工具执行结果摘要（用于冷记忆）"""
    tool_name: str
    input_summary: str
    output_summary: str
    timestamp: float = field(default_factory=time.time)
    important: bool = False  # 标记为重要的结果（如最终答案）

    def to_dict(self) -> dict:
        return {
            "tool_name": self.tool_name,
            "input_summary": self.input_summary,
            "output_summary": self.output_summary,
            "timestamp": self.timestamp,
            "important": self.important,
        }


@dataclass
class ColdMemory:
    """冷记忆区 - 持久化存储"""
    session_id: str
    summary: str = ""  # 会话摘要
    tool_results: list[ToolResult] = field(default_factory=list)  # 重要工具结果
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "summary": self.summary,
            "tool_results": [r.to_dict() for r in self.tool_results],
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, d: dict) -> "ColdMemory":
        return cls(
            session_id=d["session_id"],
            summary=d.get("summary", ""),
            tool_results=[ToolResult(**r) for r in d.get("tool_results", [])],
            created_at=d.get("created_at", time.time()),
            updated_at=d.get("updated_at", time.time()),
        )


class SessionManager:
    """会话管理器 - 负责上下文窗口和冷热记忆"""

    def __init__(self, session_id: str, config: Optional[SessionConfig] = None):
        self.session_id = session_id
        self.config = config or SessionConfig()
        self.hot_messages: list[Message] = []  # 热区
        self.cold: ColdMemory = self._load_cold()  # 冷区
        self._dirty: bool = False  # 标记是否有未持久化的修改

        # Token 估算器（简单实现，可替换为 tiktoken）
        self._tokenizer = _SimpleTokenizer()

    # ──────────────────────────────────────────────
    # Token 估算
    # ──────────────────────────────────────────────

    def estimate_tokens(self, text: str) -> int:
        return self._tokenizer.estimate(text)

    def total_tokens(self, messages: list[Message]) -> int:
        return sum(m.tokens for m in messages)

    # ──────────────────────────────────────────────
    # 核心操作
    # ──────────────────────────────────────────────

    def add_message(self, role: str, content: Any) -> Message:
        """添加消息到热区，自动计算 token"""
        text = _content_to_text(content)
        tokens = self.estimate_tokens(text)
        msg = Message(role=role, content=content, tokens=tokens)
        self.hot_messages.append(msg)
        return msg

    def add_tool_result(self, tool_name: str, input_summary: str, output: Any,
                        important: bool = False) -> None:
        """记录工具结果到冷区（标记 dirty，批量异步写入磁盘）"""
        output_text = _content_to_text(output)
        # 截断过长的输出
        max_len = 500
        if len(output_text) > max_len:
            output_text = output_text[:max_len] + "..."
        self.cold.tool_results.append(ToolResult(
            tool_name=tool_name,
            input_summary=input_summary,
            output_summary=output_text,
            important=important,
        ))
        self.cold.updated_at = time.time()
        self._dirty = True

    def get_context(self, system_prompt: str) -> list[dict]:
        """构建完整的上下文消息列表（用于发给 LLM）"""
        messages = []

        # 1. 系统提示
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        # 2. 冷记忆摘要（如果有）
        if self.cold.summary:
            messages.append({
                "role": "system",
                "content": f"[历史会话摘要]\n{self.cold.summary}"
            })

        # 3. 重要工具结果（来自冷区）
        important_results = [r for r in self.cold.tool_results if r.important]
        if important_results:
            results_text = "\n".join(
                f"- {r.tool_name}: {r.output_summary}" for r in important_results[-5:]
            )
            messages.append({
                "role": "system",
                "content": f"[已完成的重要操作]\n{results_text}"
            })

        # 4. 热区消息
        for msg in self.hot_messages:
            if self._is_openai_format_message(msg):
                messages.append({"role": msg.role, "content": msg.content})
            else:
                messages.append({"role": msg.role, "content": msg.content})

        return messages

    def check_and_compact(self) -> bool:
        """检查是否需要压缩，返回是否已压缩"""
        total = self.total_tokens(self.hot_messages)
        threshold = int(self.config.max_tokens * self.config.compress_ratio)

        if total <= threshold:
            return False

        self._compact()
        return True

    def _compact(self) -> None:
        """压缩热区消息"""
        if not self.hot_messages:
            return

        # 策略：保留最近 N 条 + 系统消息 + 工具结果
        keep_count = self.config.hot_messages

        # 分离 user/assistant/system 和 tool 结果
        regular = [m for m in self.hot_messages if m.role != "tool"]
        tool_msgs = [m for m in self.hot_messages if m.role == "tool"]

        # 保留最近的 regular 消息
        kept_regular = regular[-keep_count:] if len(regular) > keep_count else regular

        # 工具消息：只保留最后的 10 条
        kept_tools = tool_msgs[-10:] if len(tool_msgs) > 10 else tool_msgs

        # 生成压缩摘要
        summary = self._generate_summary(self.hot_messages)
        self.cold.summary = summary
        self.cold.updated_at = time.time()
        self._dirty = True

        # 重建热区，标记为压缩后消息
        self.hot_messages = []
        for m in kept_regular + kept_tools:
            m.is_compact = True
            self.hot_messages.append(m)

    def _generate_summary(self, messages: list[Message]) -> str:
        """生成会话摘要（简单实现：取前中后各一条的要点）"""
        if len(messages) <= 3:
            return ""

        samples = []
        n = len(messages)
        for i in [0, n // 2, n - 1]:
            m = messages[i]
            text = _content_to_text(m.content)
            if len(text) > 100:
                text = text[:100] + "..."
            samples.append(f"[{m.role}]: {text}")

        return f"[压缩摘要 - {len(messages)} 条消息]\n" + "\n".join(samples)

    # ──────────────────────────────────────────────
    # 动态 max_iterations
    # ──────────────────────────────────────────────

    def estimate_iterations_needed(self) -> int:
        """根据当前上下文复杂度估算需要的迭代次数"""
        base = 5

        # 上下文越长，可能需要更多迭代
        total = self.total_tokens(self.hot_messages)
        if total > 50_000:
            return base + 3
        elif total > 30_000:
            return base + 2
        elif total > 15_000:
            return base + 1

        # 工具越多，可能需要更多迭代
        tool_count = sum(1 for m in self.hot_messages if m.role == "tool")
        if tool_count > 10:
            return base + 2
        elif tool_count > 5:
            return base + 1

        return base

    # ──────────────────────────────────────────────
    # 持久化
    # ──────────────────────────────────────────────

    def _get_cold_path(self) -> Path:
        path = Path(self.config.session_dir) / f"{self.session_id}.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        return path

    def _load_cold(self) -> ColdMemory:
        path = self._get_cold_path()
        if path.exists():
            try:
                data = json.loads(path.read_text(encoding="utf-8"))
                return ColdMemory.from_dict(data)
            except (json.JSONDecodeError, KeyError):
                pass
        return ColdMemory(session_id=self.session_id)

    def _save_cold(self) -> None:
        """同步写入（仅供紧急/析构场景使用）"""
        path = self._get_cold_path()
        path.write_text(json.dumps(self.cold.to_dict(), ensure_ascii=False, indent=2),
                       encoding="utf-8")

    async def _flush_async(self) -> None:
        """异步将冷数据写入磁盘，不阻塞事件循环"""
        if not self._dirty:
            return

        def _do_save():
            path = self._get_cold_path()
            path.write_text(
                json.dumps(self.cold.to_dict(), ensure_ascii=False, indent=2),
                encoding="utf-8",
            )

        await asyncio.to_thread(_do_save)
        self._dirty = False

    async def flush(self) -> None:
        """公开的 flush 接口，供 Agent 在每轮迭代结束后调用"""
        await self._flush_async()

    # ──────────────────────────────────────────────
    # 工具方法
    # ──────────────────────────────────────────────

    @staticmethod
    def _is_openai_format_message(msg: Message) -> bool:
        """判断是否为 OpenAI 格式（content 是字符串而非列表）"""
        return isinstance(msg.content, str)

    def clear(self) -> None:
        """清空会话"""
        self.hot_messages.clear()
        self.cold = ColdMemory(session_id=self.session_id)
        path = self._get_cold_path()
        if path.exists():
            path.unlink()


# ──────────────────────────────────────────────
# 简单 Token 估算器
# ──────────────────────────────────────────────

class _SimpleTokenizer:
    """简单 tokenizer（按字数估算，1 token ≈ 4 字符）"""

    def estimate(self, text: str) -> int:
        if not text:
            return 0
        return max(1, len(text) // 4)


def _content_to_text(content: Any) -> str:
    """将消息内容转为纯文本（用于 token 估算）"""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict):
                if item.get("type") == "text":
                    parts.append(item.get("text", ""))
                elif item.get("type") == "tool_use":
                    parts.append(f"[tool: {item.get('name')}]")
        return " ".join(parts)
    if isinstance(content, dict):
        return content.get("text", str(content))
    return str(content)
