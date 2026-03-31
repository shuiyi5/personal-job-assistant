"""聊天相关 Pydantic 模型"""

from pydantic import BaseModel


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []


class ChatEvent(BaseModel):
    type: str  # "text" | "tool_start" | "tool_result" | "tool_error" | "done"
    content: str = ""
    tool: str = ""
