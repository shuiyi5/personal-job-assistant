"""通用工具 - 时间、联网搜索、文件读写、命令执行"""

import asyncio
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.tools.base import BaseTool


class GetCurrentTimeTool(BaseTool):
    @property
    def name(self) -> str:
        return "get_current_time"

    @property
    def description(self) -> str:
        return "获取当前日期和时间。用于需要了解当前时间的场景。"

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "timezone": {
                    "type": "string",
                    "description": "时区，如 Asia/Shanghai, UTC 等",
                    "default": "Asia/Shanghai",
                },
            },
        }

    async def execute(self, timezone: str = "Asia/Shanghai") -> str:
        from zoneinfo import ZoneInfo
        try:
            tz = ZoneInfo(timezone)
        except Exception:
            tz = ZoneInfo("Asia/Shanghai")
        now = datetime.now(tz)
        return now.strftime(f"%Y年%m月%d日 %H:%M:%S (%A) 时区: {timezone}")


class WebSearchTool(BaseTool):
    @property
    def name(self) -> str:
        return "web_search"

    @property
    def description(self) -> str:
        return "联网搜索，获取最新的互联网信息。可搜索公司信息、技术趋势、面试经验、薪资行情等。"

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "搜索关键词"},
                "max_results": {"type": "integer", "description": "最大结果数", "default": 5},
            },
            "required": ["query"],
        }

    async def execute(self, query: str, max_results: int = 5) -> str:
        from duckduckgo_search import DDGS

        def _search():
            with DDGS() as ddgs:
                results = list(ddgs.text(query, max_results=max_results))
            if not results:
                return "未找到相关搜索结果。"
            parts = []
            for i, r in enumerate(results, 1):
                title = r.get("title", "")
                body = r.get("body", "")
                href = r.get("href", "")
                parts.append(f"[{i}] {title}\n{body}\n链接: {href}")
            return "\n\n".join(parts)

        return await asyncio.to_thread(_search)


class FetchWebPageTool(BaseTool):
    @property
    def name(self) -> str:
        return "fetch_webpage"

    @property
    def description(self) -> str:
        return "获取指定网页的文本内容。用于深入阅读搜索结果中的链接。"

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "网页URL"},
            },
            "required": ["url"],
        }

    async def execute(self, url: str) -> str:
        import httpx

        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0"})
            resp.raise_for_status()
            html = resp.text

        # 简单提取文本：去掉 script/style 标签，再去 HTML 标签
        import re
        html = re.sub(r"<(script|style)[^>]*>.*?</\1>", "", html, flags=re.DOTALL | re.IGNORECASE)
        text = re.sub(r"<[^>]+>", " ", html)
        text = re.sub(r"\s+", " ", text).strip()

        # 截断到合理长度
        if len(text) > 3000:
            text = text[:3000] + "...(内容已截断)"
        return text if text else "页面内容为空。"


class ReadFileTool(BaseTool):
    """读取本地文件内容"""

    @property
    def name(self) -> str:
        return "read_file"

    @property
    def description(self) -> str:
        return "读取本地文件的文本内容。适用于查看配置文件、代码、日志等。"

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "文件的绝对或相对路径"},
                "encoding": {
                    "type": "string",
                    "description": "文件编码，默认 utf-8",
                    "default": "utf-8",
                },
                "max_chars": {
                    "type": "integer",
                    "description": "最大读取字符数，默认 5000",
                    "default": 5000,
                },
            },
            "required": ["path"],
        }

    async def execute(
        self, path: str, encoding: str = "utf-8", max_chars: int = 5000
    ) -> str:
        p = Path(path)
        if not p.exists():
            return f"文件不存在: {path}"
        if not p.is_file():
            return f"路径不是文件: {path}"

        def _read():
            return p.read_text(encoding=encoding, errors="replace")

        content = await asyncio.to_thread(_read)
        if len(content) > max_chars:
            content = content[:max_chars] + f"\n...(内容已截断，共 {len(content)} 字符)"
        return content


class WriteFileTool(BaseTool):
    """将内容写入本地文件"""

    @property
    def name(self) -> str:
        return "write_file"

    @property
    def description(self) -> str:
        return "将文本内容写入本地文件。若文件已存在则覆盖；若目录不存在则自动创建。"

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "path": {"type": "string", "description": "目标文件路径"},
                "content": {"type": "string", "description": "要写入的文本内容"},
                "encoding": {
                    "type": "string",
                    "description": "文件编码，默认 utf-8",
                    "default": "utf-8",
                },
                "append": {
                    "type": "boolean",
                    "description": "是否追加写入（默认覆盖）",
                    "default": False,
                },
            },
            "required": ["path", "content"],
        }

    async def execute(
        self,
        path: str,
        content: str,
        encoding: str = "utf-8",
        append: bool = False,
    ) -> str:
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        mode = "a" if append else "w"

        def _write():
            with p.open(mode, encoding=encoding) as f:
                f.write(content)

        await asyncio.to_thread(_write)
        action = "追加" if append else "写入"
        return f"已{action} {len(content)} 字符到: {path}"


class RunCommandTool(BaseTool):
    """在 shell 中执行命令"""

    _TIMEOUT = 30  # 单次命令最长执行秒数

    @property
    def name(self) -> str:
        return "run_command"

    @property
    def description(self) -> str:
        return (
            "在 shell 中执行命令并返回输出。适用于运行脚本、查看目录、"
            "执行构建命令等。命令超时限制 30 秒。"
        )

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "command": {"type": "string", "description": "要执行的 shell 命令"},
                "cwd": {
                    "type": "string",
                    "description": "工作目录路径，默认为当前目录",
                    "default": None,
                },
            },
            "required": ["command"],
        }

    async def execute(self, command: str, cwd: Optional[str] = None) -> str:
        try:
            proc = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=cwd or None,
            )
            try:
                stdout, stderr = await asyncio.wait_for(
                    proc.communicate(), timeout=self._TIMEOUT
                )
            except asyncio.TimeoutError:
                proc.kill()
                return f"命令超时 ({self._TIMEOUT}s): {command}"

            output = ""
            if stdout:
                output += stdout.decode("utf-8", errors="replace")
            if stderr:
                output += "\n[stderr]\n" + stderr.decode("utf-8", errors="replace")

            output = output.strip()
            if len(output) > 4000:
                output = output[:4000] + f"\n...(输出已截断，共 {len(output)} 字符)"

            return (
                f"[返回码: {proc.returncode}]\n{output}"
                if output
                else f"[返回码: {proc.returncode}] 无输出"
            )
        except Exception as e:
            return f"命令执行失败: {e}"
