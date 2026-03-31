"""简历端点 - 支持结构化数据输出"""

import json
import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse

from app.agents.resume_agent import create_resume_agent
from app.models.base import get_llm_provider
from app.schemas.resume import ResumeRequest, ExportRequest
from app.services.resume_service import export_resume

router = APIRouter()


def _sse_line(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


@router.post("/resume/generate")
async def generate_resume(req: ResumeRequest):
    """基于知识库生成简历 (SSE 流式, 结构化输出)"""
    provider = get_llm_provider()
    agent = create_resume_agent(provider)

    prompt = f"请帮我生成一份简历"
    if req.job_title:
        prompt += f"，目标职位: {req.job_title}"
    prompt += f"。风格: {req.style}。需要包含以下段落: {', '.join(req.sections)}。"
    prompt += "请先从知识库检索我的相关经历，然后调用 format_resume 输出结构化简历。"

    async def generate():
        async for event in agent.stream(prompt):
            if event["type"] == "text":
                # Agent 的文本回复重新标记为 thinking（不污染简历内容）
                yield _sse_line({"type": "thinking", "content": event["content"]})

            elif event["type"] == "tool_result" and event.get("tool") == "format_resume":
                # format_resume 工具的结果是结构化简历 JSON
                try:
                    data = json.loads(event["result"])
                    yield _sse_line({"type": "resume_data", "data": data})
                except (json.JSONDecodeError, KeyError):
                    yield _sse_line(event)

            else:
                # tool_start, tool_result(其他工具), tool_error 保持原样
                yield _sse_line(event)

        yield _sse_line({"type": "done"})

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/resume/export")
async def export_resume_file(req: ExportRequest):
    """导出简历为 PDF/DOCX"""
    # 优先使用结构化数据 + 模板导出
    if req.resume_data:
        try:
            file_path = await export_resume(
                content=None,
                format=req.format,
                template=req.template,
                resume_data=req.resume_data.model_dump(),
            )
        except Exception as e:
            raise HTTPException(500, f"导出失败: {e}")
    elif req.content:
        # 兼容旧版 markdown 导出
        try:
            file_path = await export_resume(content=req.content, format=req.format)
        except Exception as e:
            raise HTTPException(500, f"导出失败: {e}")
    else:
        raise HTTPException(400, "缺少简历数据")

    media_types = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "markdown": "text/markdown",
    }
    filename = os.path.basename(file_path)
    return FileResponse(
        file_path,
        media_type=media_types.get(req.format, "application/octet-stream"),
        filename=filename,
    )
