"""JD 管理 API"""

import json
from typing import Optional

from fastapi import APIRouter, HTTPException, Body, Request
from fastapi.responses import StreamingResponse
from pydantic import ValidationError

from app.schemas.jd import (
    CompanyCreate,
    PositionCreate,
    JDCreate,
    JDCreateFull,
    JDUpdate,
    JdResumeCreate,
    JdResumeUpdate,
    AnalyzeRequest,
    FitAnalysis,
)
from app.services import jd_service

router = APIRouter(prefix="/jd", tags=["jd"])


# ── 公司 ──────────────────────────────────────

@router.get("/companies")
async def list_companies():
    """获取公司列表（含计数）"""
    return jd_service.get_companies_with_counts()


@router.post("/companies")
async def create_company(req: CompanyCreate):
    """新建公司"""
    return jd_service.create_company(req.model_dump())


@router.put("/companies/{company_id}")
async def update_company(company_id: str, req: CompanyCreate):
    """更新公司"""
    result = jd_service.update_company(company_id, req.model_dump())
    if not result:
        raise HTTPException(status_code=404, detail="Company not found")
    return result


@router.delete("/companies/{company_id}")
async def delete_company(company_id: str):
    """删除公司（连同岗位和 JD）"""
    jd_service.delete_company(company_id)
    return {"ok": True}


# ── 岗位 ──────────────────────────────────────

@router.get("/positions")
async def list_positions(company_id: Optional[str] = None):
    """获取岗位列表（可按公司筛选）"""
    return jd_service.get_positions_with_counts(company_id)


@router.post("/positions")
async def create_position(req: PositionCreate):
    """新建岗位"""
    return jd_service.create_position(req.model_dump())


@router.put("/positions/{position_id}")
async def update_position(position_id: str, req: PositionCreate):
    """更新岗位"""
    result = jd_service.update_position(position_id, req.model_dump())
    if not result:
        raise HTTPException(status_code=404, detail="Position not found")
    return result


@router.delete("/positions/{position_id}")
async def delete_position(position_id: str):
    """删除岗位（连同 JD）"""
    jd_service.delete_position(position_id)
    return {"ok": True}


# ── JD ──────────────────────────────────────

@router.get("/jobs")
async def list_jobs(position_id: Optional[str] = None):
    """获取 JD 列表（可按岗位筛选）"""
    return jd_service.get_jobs(position_id)


@router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    """获取单个 JD"""
    job = jd_service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.post("/jobs")
async def create_job(req: JDCreate):
    """新建 JD"""
    return jd_service.create_job(req.model_dump())


@router.post("/jobs/full")
async def create_job_full(req: JDCreateFull):
    """新建 JD（公司 + 岗位 + JD 内容一体化）"""
    # 1. 查找或创建公司
    companies = jd_service.get_companies()
    company = None
    for c in companies:
        if c["name"] == req.company_name:
            company = c
            break
    if not company:
        company = jd_service.create_company({
            "name": req.company_name,
            "city": req.company_city,
            "industry": req.company_industry,
        })

    # 2. 查找或创建岗位（该公司下）
    positions = jd_service.get_positions(company["id"])
    position = None
    for p in positions:
        if p["name"] == req.position_name:
            position = p
            break
    if not position:
        position = jd_service.create_position({
            "company_id": company["id"],
            "name": req.position_name,
        })

    # 3. 创建 JD
    return jd_service.create_job({
        "position_id": position["id"],
        "raw_text": req.raw_text,
        "salary_range": req.salary_range,
        "location": req.location,
        "skills": req.skills or [],
        "requirements": req.requirements or [],
        "plus_points": req.plus_points or [],
    })


@router.put("/jobs/{job_id}")
async def update_job(job_id: str, req: JDUpdate):
    """更新 JD"""
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    result = jd_service.update_job(job_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Job not found")
    return result


@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    """删除 JD（连同简历）"""
    jd_service.delete_job(job_id)
    return {"ok": True}


# ── 简历 ──────────────────────────────────────

@router.get("/jobs/{job_id}/resumes")
async def list_job_resumes(job_id: str):
    """获取 JD 下的简历列表"""
    return jd_service.get_resumes(job_id)


@router.post("/jobs/{job_id}/resumes", response_model_exclude_none=True)
async def create_job_resume(job_id: str, req: JdResumeCreate, raw_req: Request):
    """为 JD 创建简历"""
    body = await raw_req.json()
    print(f"=== CREATE JOB RESUME DEBUG ===")
    print(f"job_id: {job_id}")
    print(f"raw body: {body}")
    print(f"===============================")
    try:
        resume_data = req.model_dump()
        print(f"create_job_resume called: job_id={job_id}, resume_data keys={list(resume_data.keys())}")
        resume_data["jd_id"] = job_id
        return jd_service.create_resume(resume_data)
    except ValidationError as e:
        print(f"Validation error in create_job_resume: {e}")
        raise HTTPException(status_code=422, detail=str(e))


@router.put("/resumes/{resume_id}")
async def update_resume(resume_id: str, req: JdResumeUpdate):
    """更新简历"""
    updates = {k: v for k, v in req.model_dump().items() if v is not None}
    result = jd_service.update_resume(resume_id, updates)
    if not result:
        raise HTTPException(status_code=404, detail="Resume not found")
    return result


@router.delete("/resumes/{resume_id}")
async def delete_resume(resume_id: str):
    """删除简历"""
    jd_service.delete_resume(resume_id)
    return {"ok": True}


# ── AI 分析与生成 ──────────────────────────────────────

@router.post("/jobs/{job_id}/analyze")
async def analyze_fit(job_id: str, req: AnalyzeRequest):
    """AI 分析岗位适配性（整体 + 逐条）"""
    try:
        result = await jd_service.analyze_fit(job_id, req.resume_data.model_dump())
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/jobs/{job_id}/generate")
async def generate_resume(job_id: str, resume_data: Optional[dict] = None):
    """AI 生成简历（Agent 模式，SSE 流式输出步骤和思考过程）

    使用 resume_agent 构建包含完整 JD 上下文的 prompt，支持 tools 调用。
    """
    async def event_stream():
        try:
            async for event in jd_service.generate_resume_for_jd_agent(job_id, resume_data):
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/jobs/parse")
async def parse_jd(raw_text: str):
    """AI 解析 JD 文本为结构化数据"""
    try:
        result = await jd_service.parse_jd(raw_text)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))