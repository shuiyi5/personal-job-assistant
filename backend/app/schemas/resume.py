"""简历相关 Pydantic 模型"""

from typing import Optional

from pydantic import BaseModel


# ── 结构化简历数据模型 ──────────────────────────────────────

class PersonalInfo(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    avatar_url: Optional[str] = None
    title: Optional[str] = None  # 目标/当前职位头衔


class WorkExperience(BaseModel):
    company: str
    title: str
    location: Optional[str] = None
    start_date: str
    end_date: str  # "至今" or actual date
    highlights: list[str] = []


class Education(BaseModel):
    institution: str
    degree: str
    field: str
    start_date: str
    end_date: str
    gpa: Optional[str] = None
    highlights: list[str] = []


class Project(BaseModel):
    name: str
    role: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: str
    highlights: list[str] = []
    tech_stack: list[str] = []


class SkillGroup(BaseModel):
    category: str  # e.g., "编程语言", "框架", "工具"
    items: list[str]


class Certification(BaseModel):
    name: str
    issuer: Optional[str] = None
    date: Optional[str] = None
    url: Optional[str] = None


class CustomSection(BaseModel):
    title: str
    content: str


class ResumeData(BaseModel):
    personal: PersonalInfo
    summary: Optional[str] = None
    work_experience: list[WorkExperience] = []
    education: list[Education] = []
    skills: list[SkillGroup] = []
    projects: list[Project] = []
    certifications: list[Certification] = []
    custom_sections: list[CustomSection] = []
    module_order: list[str] = []  # 模块显示顺序，空列表表示使用模板默认顺序


# ── 请求模型 ──────────────────────────────────────

class ResumeRequest(BaseModel):
    job_title: str = ""
    style: str = "professional"
    sections: list[str] = ["summary", "work_experience", "education", "skills", "projects"]


class ResumeEditRequest(BaseModel):
    section: str
    content: str
    instruction: str = ""


class ExportRequest(BaseModel):
    format: str = "pdf"  # pdf | docx | markdown
    template: str = "professional"  # 模板 ID
    resume_data: Optional[ResumeData] = None  # 结构化数据
    content: Optional[str] = None  # 保留 markdown 兼容
