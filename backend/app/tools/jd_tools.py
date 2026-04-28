"""JD 相关工具 - 搜索 JD、保存简历到 JD"""

from typing import Any

from app.tools.base import BaseTool
from app.services.jd_service import get_companies, get_jobs, create_resume


class SearchJDTool(BaseTool):
    """搜索 JD 库中的职位描述。

    当用户提到公司名称（如"字节"、"美团"）或职位关键词（如"前端"、"后端"）时，
    使用此工具搜索匹配的 JD。
    """

    @property
    def name(self) -> str:
        return "search_jd"

    @property
    def description(self) -> str:
        return "搜索 JD 库中的职位描述。根据公司名称、职位名称或技能关键词搜索匹配的 JD。"

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "company_keyword": {
                    "type": "string",
                    "description": "公司名称关键词（如字节、美团），不区分大小写",
                },
                "job_keyword": {
                    "type": "string",
                    "description": "职位名称关键词（如前端、后端、产品经理），不区分大小写",
                },
                "skill_keyword": {
                    "type": "string",
                    "description": "技能关键词（如 Python、React、Go），用于匹配 JD 中的技能要求",
                },
            },
        }

    async def execute(
        self,
        company_keyword: str = "",
        job_keyword: str = "",
        skill_keyword: str = "",
    ) -> dict:
        results = []

        # 加载所有数据
        companies = get_companies()
        all_jobs = get_jobs()

        # 构建公司ID->名称的映射
        company_map = {c["id"]: c["name"] for c in companies}

        for job in all_jobs:
            matched = False
            match_reasons = []

            # 公司名称匹配
            if company_keyword:
                company_name = company_map.get(job.get("position_id", ""), "")
                # 需要通过 positions 找到 company_id
                from app.services.jd_service import get_positions
                positions = get_positions()
                for p in positions:
                    if p["id"] == job.get("position_id"):
                        company_name = company_map.get(p.get("company_id", ""), "")
                        break
                if company_keyword.lower() in company_name.lower():
                    matched = True
                    match_reasons.append(f"公司: {company_name}")

            # 职位名称匹配
            if job_keyword:
                # 职位名称从 position_id 关联的 position 获取
                from app.services.jd_service import get_positions
                positions = get_positions()
                position_name = ""
                for p in positions:
                    if p["id"] == job.get("position_id"):
                        position_name = p.get("name", "")
                        break
                if job_keyword.lower() in position_name.lower():
                    matched = True
                    match_reasons.append(f"职位: {position_name}")

            # 技能关键词匹配
            if skill_keyword:
                skills = job.get("skills", [])
                if any(skill_keyword.lower() in s.lower() for s in skills):
                    matched = True
                    match_reasons.append(f"技能匹配: {skill_keyword}")

            # raw_text 模糊匹配
            raw_text = job.get("raw_text", "")
            if not matched and (company_keyword or job_keyword or skill_keyword):
                search_term = company_keyword or job_keyword or skill_keyword
                if search_term and search_term.lower() in raw_text.lower():
                    matched = True
                    match_reasons.append("JD 内容匹配")

            if matched:
                results.append({
                    "jd_id": job["id"],
                    "position_id": job.get("position_id", ""),
                    "raw_text_preview": raw_text[:300] + "..." if len(raw_text) > 300 else raw_text,
                    "skills": job.get("skills", []),
                    "requirements": job.get("requirements", []),
                    "plus_points": job.get("plus_points", []),
                    "match_reasons": match_reasons,
                })

        if not results:
            return {
                "status": "no_match",
                "message": f"没有找到匹配的 JD（公司:{company_keyword}, 职位:{job_keyword}, 技能:{skill_keyword}）",
                "results": [],
            }

        return {
            "status": "success",
            "count": len(results),
            "results": results,
            "message": f"找到 {len(results)} 个匹配的 JD",
        }


class SaveResumeToJDTool(BaseTool):
    """将简历保存到指定的 JD 下。

    在根据 JD 生成简历后，使用此工具将简历数据保存到对应的 JD 中。
    """

    @property
    def name(self) -> str:
        return "save_resume_to_jd"

    @property
    def description(self) -> str:
        return "将简历数据保存到指定的 JD 下。生成简历后必须调用此工具保存，否则简历不会持久化。"

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "jd_id": {
                    "type": "string",
                    "description": "JD 的唯一标识（从 search_jd 结果中获取）",
                },
                "resume_data": {
                    "type": "object",
                    "description": "完整的简历数据结构（包含 personal, summary, work_experience, education, skills, projects, certifications 等字段）",
                },
            },
            "required": ["jd_id", "resume_data"],
        }

    async def execute(self, jd_id: str, resume_data: dict) -> dict:
        try:
            # 验证必要字段
            if not resume_data.get("personal"):
                return {
                    "status": "error",
                    "message": "resume_data 必须包含 personal 字段（姓名、联系方式等）",
                }

            # 构建保存数据结构
            save_data = {
                "jd_id": jd_id,
                "resume_data": resume_data,
            }

            # 保存到 JD
            saved = create_resume(save_data)

            return {
                "status": "success",
                "message": f"简历已成功保存到 JD",
                "resume_id": saved.get("id", ""),
                "jd_id": jd_id,
            }

        except Exception as e:
            return {
                "status": "error",
                "message": f"保存简历失败: {str(e)}",
                "jd_id": jd_id,
            }


class ListAllJDTool(BaseTool):
    """列出所有 JD。

    当用户要求查看所有 JD 或没有特定搜索条件时使用。
    """

    @property
    def name(self) -> str:
        return "list_all_jd"

    @property
    def description(self) -> str:
        return "列出所有已添加的 JD（公司+职位+简历）"

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {},
        }

    async def execute(self) -> dict:
        from app.services.jd_service import get_companies, get_positions, get_jobs

        companies = get_companies()
        positions = get_positions()
        jobs = get_jobs()

        # 按公司分组
        company_map = {c["id"]: c["name"] for c in companies}
        position_company_map = {p["id"]: p.get("company_id", "") for p in positions}

        result = []
        for job in jobs:
            company_id = position_company_map.get(job.get("position_id", ""), "")
            company_name = company_map.get(company_id, "未知公司")

            # 获取该 JD 下的简历数量
            from app.services.jd_service import get_resumes
            resumes = get_resumes(job["id"])
            resume_count = len(resumes)

            result.append({
                "jd_id": job["id"],
                "company": company_name,
                "position_id": job.get("position_id", ""),
                "skills": job.get("skills", []),
                "resume_count": resume_count,
                "raw_text_preview": job.get("raw_text", "")[:200],
            })

        return {
            "status": "success",
            "count": len(result),
            "jds": result,
        }