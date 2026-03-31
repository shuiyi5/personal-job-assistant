"""通用工具 - 时间、联网搜索"""

import asyncio
from datetime import datetime

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
