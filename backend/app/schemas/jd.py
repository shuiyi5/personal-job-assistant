"""JD 相关 Pydantic 模型"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.resume import ResumeData


def generate_id() -> str:
    return f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}"


# ── 公司 ──────────────────────────────────────

class Company(BaseModel):
    id: str = ""
    name: str
    city: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None

    def __init__(self, **data):
        if not data.get("id"):
            data["id"] = generate_id()
        super().__init__(**data)


class CompanyCreate(BaseModel):
    name: str
    city: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None


# ── 岗位 ──────────────────────────────────────

class Position(BaseModel):
    id: str = ""
    company_id: str
    name: str

    def __init__(self, **data):
        if not data.get("id"):
            data["id"] = generate_id()
        super().__init__(**data)


class PositionCreate(BaseModel):
    company_id: str
    name: str


# ── JD ──────────────────────────────────────

class JDData(BaseModel):
    id: str = ""
    position_id: str
    raw_text: str = ""                          # 原始 JD 文本
    salary_range: Optional[str] = None         # 薪资范围
    location: Optional[str] = None            # 工作地点
    skills: list[str] = []                     # 关键技能
    requirements: list[str] = []               # 任职要求
    plus_points: list[str] = []               # 加分项
    parsed_at: Optional[str] = None            # 解析时间

    def __init__(self, **data):
        if not data.get("id"):
            data["id"] = generate_id()
        super().__init__(**data)


class JDCreate(BaseModel):
    position_id: str
    raw_text: str = ""
    salary_range: Optional[str] = None
    location: Optional[str] = None
    skills: Optional[list[str]] = []
    requirements: Optional[list[str]] = []
    plus_points: Optional[list[str]] = []


class JDCreateFull(BaseModel):
    """新建 JD 的完整表单（公司 + 岗位 + JD 内容）"""
    company_name: str
    company_city: Optional[str] = None
    company_industry: Optional[str] = None
    position_name: str
    raw_text: str = ""
    salary_range: Optional[str] = None
    location: Optional[str] = None
    skills: Optional[list[str]] = []
    requirements: Optional[list[str]] = []
    plus_points: Optional[list[str]] = []


class JDUpdate(BaseModel):
    raw_text: Optional[str] = None
    salary_range: Optional[str] = None
    location: Optional[str] = None
    skills: Optional[list[str]] = None
    requirements: Optional[list[str]] = None
    plus_points: Optional[list[str]] = None


# ── JD 专属简历 ──────────────────────────────────────

class JdResume(BaseModel):
    id: str = ""
    jd_id: str
    resume_data: ResumeData
    created_at: str = ""
    updated_at: str = ""

    def __init__(self, **data):
        if not data.get("id"):
            data["id"] = generate_id()
        if not data.get("created_at"):
            data["created_at"] = datetime.now().isoformat()
        if not data.get("updated_at"):
            data["updated_at"] = datetime.now().isoformat()
        super().__init__(**data)


class JdResumeCreate(BaseModel):
    resume_data: Optional[ResumeData] = None

    model_config = {"strict": False}


class JdResumeUpdate(BaseModel):
    resume_data: Optional[ResumeData] = None


# ── 适配性分析 ──────────────────────────────────────

class FitAnalysis(BaseModel):
    overall_score: float          # 0-100
    overall_comment: str         # 整体评价
    matched: list[str]           # 匹配的项
    missing: list[str]           # 缺失的项
    suggestions: list[str]      # 改进建议


class AnalyzeRequest(BaseModel):
    resume_data: ResumeData


# ── 列表返回 ──────────────────────────────────────

class CompanyWithCount(BaseModel):
    id: str
    name: str
    city: Optional[str] = None
    industry: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    position_count: int = 0
    job_count: int = 0
    resume_count: int = 0


class PositionWithCount(BaseModel):
    id: str
    company_id: str
    name: str
    job_count: int = 0
    resume_count: int = 0