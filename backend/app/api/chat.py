"""聊天端点 - 统一 Agent，SSE 流式"""

import json
from typing import Optional

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.agents.unified_agent import create_unified_agent
from app.models.base import get_llm_provider
from app.schemas.chat import ChatRequest

router = APIRouter()


class ChatRequestWithContext(ChatRequest):
    """扩展聊天请求，支持携带简历数据上下文"""
    resume_data: Optional[dict] = None


def _sse_line(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/chat")
async def chat(req: ChatRequestWithContext):
    """主聊天入口: 统一 Agent + SSE 流式返回"""
    provider = get_llm_provider()
    agent = create_unified_agent(provider)

    # 构建消息：如果有简历数据上下文，注入到 user message
    message = req.message
    if req.resume_data:
        resume_context = json.dumps(req.resume_data, ensure_ascii=False, indent=2)
        message = (
            f"[当前简历数据（JSON）]\n```json\n{resume_context}\n```\n\n"
            f"用户请求: {req.message}"
        )

    history = [{"role": m.role, "content": m.content} for m in req.history]

    async def generate():
        async for event in agent.stream(message, history):
            # 拦截 format_resume 工具结果，转为 resume_data 事件
            if event["type"] == "tool_result" and event.get("tool") == "format_resume":
                try:
                    data = json.loads(event["result"])
                    yield _sse_line({"type": "resume_data", "data": data})
                except (json.JSONDecodeError, KeyError):
                    yield _sse_line(event)
            else:
                yield _sse_line(event)

        yield _sse_line({"type": "done"})

    return StreamingResponse(generate(), media_type="text/event-stream")
