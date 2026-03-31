"""面试端点"""

import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.agents.interview_agent import create_interview_agent
from app.models.base import get_llm_provider
from app.schemas.interview import QuestionRequest, EvaluationRequest

router = APIRouter()


@router.post("/interview/questions")
async def generate_questions(req: QuestionRequest):
    """生成面试题 (SSE 流式)"""
    provider = get_llm_provider()
    agent = create_interview_agent(provider)

    prompt = f"请根据我的知识库内容，生成 {req.count} 道{req.category}类型的面试题。"
    prompt += f"难度: {req.difficulty}。"
    if req.topic:
        prompt += f"围绕主题: {req.topic}。"
    prompt += "请先搜索知识库了解我的项目背景。"

    async def generate():
        async for event in agent.stream(prompt):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/interview/evaluate")
async def evaluate_answer(req: EvaluationRequest):
    """评估面试回答 (SSE 流式)"""
    provider = get_llm_provider()
    agent = create_interview_agent(provider)

    prompt = f"请评估以下面试回答：\n\n问题: {req.question}\n\n回答: {req.answer}\n\n请给出详细评估和改进建议。"

    async def generate():
        async for event in agent.stream(prompt):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
