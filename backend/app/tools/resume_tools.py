"""简历工具 - 段落生成、格式化、导出 (结构化 JSON 输出)"""

from typing import Any

from app.schemas.resume import ResumeData
from app.tools.base import BaseTool


class GenerateSectionTool(BaseTool):
    """基于知识库上下文生成简历段落"""

    @property
    def name(self) -> str:
        return "generate_section"

    @property
    def description(self) -> str:
        return "基于从知识库检索到的上下文，准备简历指定段落的结构化数据（如工作经历、技能、项目经验等）。"

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "section_type": {
                    "type": "string",
                    "enum": ["summary", "work_experience", "education", "skills", "projects", "certifications"],
                    "description": "简历段落类型",
                },
                "context": {"type": "string", "description": "从知识库检索到的相关上下文"},
                "job_title": {"type": "string", "description": "目标职位名称，用于内容定制"},
                "style": {
                    "type": "string",
                    "enum": ["professional", "technical", "academic"],
                    "description": "简历风格",
                    "default": "professional",
                },
            },
            "required": ["section_type", "context"],
        }

    async def execute(
        self,
        section_type: str,
        context: str,
        job_title: str = "",
        style: str = "professional",
    ) -> dict:
        return {
            "section_type": section_type,
            "context": context,
            "job_title": job_title,
            "style": style,
            "instruction": (
                f"请根据以上 context 信息，准备简历 {section_type} 段落的结构化数据。"
                f"注意：不要输出 Markdown 文本，请准备好结构化的字段值（如 company、title、highlights 数组等），"
                f"之后统一通过 format_resume 工具组装完整简历。"
                + (f"目标职位: {job_title}。" if job_title else "")
                + f"风格: {style}。"
            ),
        }


class FormatResumeTool(BaseTool):
    """将收集到的简历信息组装为结构化 JSON"""

    @property
    def name(self) -> str:
        return "format_resume"

    @property
    def description(self) -> str:
        return (
            "将收集到的简历信息组装为结构化 JSON 格式。"
            "你必须将所有简历数据填入对应字段（personal、summary、work_experience、education、skills、projects、certifications）。"
            "这是最终输出步骤，调用此工具后简历将呈现给用户。"
        )

    @property
    def input_schema(self) -> dict:
        return ResumeData.model_json_schema()

    async def execute(self, **kwargs) -> str:
        data = ResumeData(**kwargs)
        return data.model_dump_json(ensure_ascii=False)


class ExportResumeTool(BaseTool):
    """导出简历为 PDF 或 DOCX"""

    @property
    def name(self) -> str:
        return "export_resume"

    @property
    def description(self) -> str:
        return "将 Markdown 格式的简历导出为 PDF 或 DOCX 文件，返回下载链接。"

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "format": {"type": "string", "enum": ["pdf", "docx", "markdown"], "description": "导出格式"},
                "content": {"type": "string", "description": "完整的 Markdown 简历内容"},
            },
            "required": ["format", "content"],
        }

    async def execute(self, format: str, content: str) -> dict:
        from app.services.resume_service import export_resume
        file_path = await export_resume(content, format)
        return {"format": format, "file_path": file_path, "message": f"简历已导出为 {format.upper()} 格式"}
