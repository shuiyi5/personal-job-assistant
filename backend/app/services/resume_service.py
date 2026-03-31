"""简历服务 - 导出编排（支持结构化数据 + 模板）"""

import asyncio
from typing import Optional

from app.utils.export import markdown_to_pdf, markdown_to_docx, structured_to_pdf, structured_to_docx


async def export_resume(
    content: Optional[str] = None,
    format: str = "pdf",
    template: str = "professional",
    resume_data: Optional[dict] = None,
) -> str:
    """导出简历, 返回文件路径"""

    # 优先使用结构化数据 + 模板
    if resume_data:
        if format == "pdf":
            return await asyncio.to_thread(structured_to_pdf, resume_data, template)
        elif format == "docx":
            return await asyncio.to_thread(structured_to_docx, resume_data, template)
        elif format == "markdown":
            return await _save_structured_as_markdown(resume_data)
        else:
            raise ValueError(f"不支持的导出格式: {format}")

    # 兼容旧版 markdown 导出
    if content:
        if format == "pdf":
            return await asyncio.to_thread(markdown_to_pdf, content)
        elif format == "docx":
            return await asyncio.to_thread(markdown_to_docx, content)
        elif format == "markdown":
            return await _save_markdown(content)
        else:
            raise ValueError(f"不支持的导出格式: {format}")

    raise ValueError("缺少简历内容")


async def _save_markdown(content: str) -> str:
    import os
    import uuid
    from app.config.settings import settings
    filename = f"resume_{uuid.uuid4().hex[:8]}.md"
    path = os.path.join(settings.upload_dir, filename)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    return path


async def _save_structured_as_markdown(data: dict) -> str:
    """将结构化数据转为 Markdown 并保存"""
    parts = []
    personal = data.get("personal", {})
    parts.append(f"# {personal.get('name', '')}")
    contact_items = []
    if personal.get("phone"):
        contact_items.append(personal["phone"])
    if personal.get("email"):
        contact_items.append(personal["email"])
    if personal.get("location"):
        contact_items.append(personal["location"])
    if contact_items:
        parts.append(" | ".join(contact_items))
    parts.append("\n---")

    if data.get("summary"):
        parts.append(f"\n## 个人简介\n\n{data['summary']}")

    if data.get("work_experience"):
        parts.append(f"\n## 工作经历")
        for exp in data["work_experience"]:
            parts.append(f"\n### {exp['title']} @ {exp['company']}")
            parts.append(f"{exp.get('start_date', '')} - {exp.get('end_date', '')}")
            for h in exp.get("highlights", []):
                parts.append(f"- {h}")

    if data.get("education"):
        parts.append(f"\n## 教育背景")
        for edu in data["education"]:
            parts.append(f"\n### {edu['degree']} - {edu['field']} @ {edu['institution']}")
            parts.append(f"{edu.get('start_date', '')} - {edu.get('end_date', '')}")

    if data.get("skills"):
        parts.append(f"\n## 专业技能")
        for sg in data["skills"]:
            parts.append(f"\n**{sg['category']}**: {', '.join(sg.get('items', []))}")

    if data.get("projects"):
        parts.append(f"\n## 项目经验")
        for proj in data["projects"]:
            parts.append(f"\n### {proj['name']}")
            if proj.get("description"):
                parts.append(proj["description"])
            for h in proj.get("highlights", []):
                parts.append(f"- {h}")

    if data.get("certifications"):
        parts.append(f"\n## 证书与奖项")
        for cert in data["certifications"]:
            line = f"- {cert['name']}"
            if cert.get("issuer"):
                line += f" ({cert['issuer']})"
            if cert.get("date"):
                line += f" - {cert['date']}"
            parts.append(line)

    md_content = "\n".join(parts)
    return await _save_markdown(md_content)
