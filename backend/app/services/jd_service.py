"""JD 服务 - JD 解析、适配性分析、简历生成"""

import json
import os
from pathlib import Path
from typing import AsyncGenerator, Optional

from app.config.settings import settings
from app.models.base import get_llm_provider
from app.rag.store import query_documents
from app.schemas.jd import JDData, JdResume, FitAnalysis


# ── 数据文件路径 ──────────────────────────────────────

_DATA_DIR = Path("./data")
_JD_DATA_FILE = _DATA_DIR / "jd_data.json"


def _load_jd_data() -> dict:
    """加载 JD 数据文件"""
    if _JD_DATA_FILE.exists():
        with open(_JD_DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"companies": [], "positions": [], "jobs": [], "resumes": []}


def _save_jd_data(data: dict) -> None:
    """保存 JD 数据文件"""
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(_JD_DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ── LLM 调用 ──────────────────────────────────────

def _get_llm():
    return get_llm_provider()


# ── JD 解析 ──────────────────────────────────────

PARSE_JD_PROMPT = """你是一个专业的 HR 助手。请解析以下职位描述（JD），提取关键信息并以结构化 JSON 格式返回。

请提取以下字段：
- salary_range: 薪资范围（如 "30k-50k"、"面议"），如果没有明确提及则为空字符串
- location: 工作地点
- skills: 关键技能要求（数组，每项是技能名称，如 ["Python", "React", "SQL"]）
- requirements: 任职要求（数组，每项是一个简短句子）
- plus_points: 加分项（数组，每项是一个简短句子）

只返回 JSON，不要有其他内容。格式：
{
  "salary_range": "...",
  "location": "...",
  "skills": ["..."],
  "requirements": ["..."],
  "plus_points": ["..."]
}
"""


async def parse_jd(raw_text: str) -> JDData:
    """调用 LLM 解析 JD 文本为结构化数据"""
    from datetime import datetime

    llm = _get_llm()
    messages = [
        {"role": "system", "content": PARSE_JD_PROMPT},
        {"role": "user", "content": raw_text},
    ]

    text = await llm.chat(messages)

    # 尝试解析 JSON
    try:
        parsed = json.loads(text)
    except:
        parsed = {}

    return JDData(
        raw_text=raw_text,
        salary_range=parsed.get("salary_range", ""),
        location=parsed.get("location", ""),
        skills=parsed.get("skills", []),
        requirements=parsed.get("requirements", []),
        plus_points=parsed.get("plus_points", []),
        parsed_at=datetime.now().isoformat(),
    )


# ── 适配性分析 ──────────────────────────────────────

ANALYZE_FIT_PROMPT = """你是一个专业的简历顾问。请分析以下简历与职位描述的匹配度。

## 职位描述
{jd_text}

## 简历数据
{resume_text}

请以 JSON 格式返回分析结果：
{{
  "overall_score": 0-100 的匹配分数,
  "overall_comment": "整体评价，1-2句话",
  "matched": ["匹配的点1", "匹配的点2"],
  "missing": ["缺失的点1", "缺失的点2"],
  "suggestions": ["改进建议1", "改进建议2"]
}}

只返回 JSON，不要有其他内容。
"""


async def analyze_fit(jd_id: str, resume_data: dict) -> FitAnalysis:
    """分析 JD 与简历的匹配度"""
    import logging
    logger = logging.getLogger(__name__)

    data = _load_jd_data()
    job = next((j for j in data.get("jobs", []) if j["id"] == jd_id), None)
    if not job:
        raise ValueError(f"JD not found: {jd_id}")

    jd_text = job.get("raw_text", "")
    resume_text = json.dumps(resume_data, ensure_ascii=False, indent=2)

    llm = _get_llm()
    messages = [
        {"role": "system", "content": ANALYZE_FIT_PROMPT.format(jd_text=jd_text, resume_text=resume_text)},
        {"role": "user", "content": "请分析匹配度"},
    ]

    try:
        text = await llm.chat(messages)
    except Exception as e:
        logger.error(f"[analyze_fit] LLM API 调用失败: {type(e).__name__}: {e}")
        # 返回包含错误信息的结构，而不是静默的0分
        return FitAnalysis(
            overall_score=0,
            overall_comment=f"分析失败: {type(e).__name__}: {e}",
            matched=[],
            missing=[],
            suggestions=[f"LLM API 错误，请检查 API 配置或网络状态。错误详情: {str(e)}"],
        )

    try:
        parsed = json.loads(text)
    except Exception as e:
        logger.error(f"[analyze_fit] JSON 解析失败: {e}, 原始文本: {text[:500]}")
        return FitAnalysis(
            overall_score=0,
            overall_comment=f"分析结果解析失败: {e}",
            matched=[],
            missing=[],
            suggestions=["请检查 LLM 返回格式是否正确"],
        )

    return FitAnalysis(
        overall_score=parsed.get("overall_score", 0),
        overall_comment=parsed.get("overall_comment", ""),
        matched=parsed.get("matched", []),
        missing=parsed.get("missing", []),
        suggestions=parsed.get("suggestions", []),
    )


# ── RAG 检索 ──────────────────────────────────────

def _get_embedding_provider():
    from app.models.base import get_embedding_provider
    return get_embedding_provider()


async def _search_knowledge_base(query: str, n: int = 5) -> list[str]:
    """从知识库检索相关内容"""
    embedder = _get_embedding_provider()
    embedding = await embedder.embed(query)
    results = query_documents(query_embedding=embedding, n_results=n)
    docs = results.get("documents", [[]])[0]
    return docs


# ── 简历生成 ──────────────────────────────────────

GENERATE_RESUME_STEPS_PROMPT = """你是一个专业的简历顾问。请根据以下信息生成简历。

## 职位描述
{jd_text}

## 关键技能要求
{skills}

## 相关经历（从知识库检索）
{context}

## 用户现有简历数据（参考用）
{resume_data}

请按以下步骤规划并生成简历：

步骤1：分析 JD 要求，确定需要突出的技能和经验
步骤2：从检索到的经历中提取相关信息
步骤3：组织各模块内容（personal, summary, work_experience, education, projects, skills, certifications）
步骤4：生成完整的结构化简历 JSON

重要：
- 最终通过 format_resume 工具输出完整的结构化 JSON
- 简历内容要紧扣 JD 要求，与检索到的经历高度相关
- highlights 使用 STAR 法则，量化成果
- 如果现有简历数据中有相关信息，优先使用
"""

GENERATE_RESUME_JSON_PROMPT = """基于以下信息生成简历 JSON：

## 职位描述
{jd_text}

## 知识库上下文
{context}

## 简历数据参考
{resume_data}

请生成完整的 ResumeData JSON，包含所有必要字段。
只返回 JSON，不要有其他内容。

字段要求：
- personal: {{ name, phone, email, location, website, linkedin, github, title }}
- summary: 一段专业摘要
- work_experience: 各段工作经历，highlights 使用 STAR 法则
- education: 教育背景
- skills: 技能分组
- projects: 项目经验
- certifications: 证书
"""


async def generate_resume_for_jd(
    jd_id: str,
    resume_data: Optional[dict] = None,
) -> AsyncGenerator[dict, None]:
    """基于 JD 生成简历，SSE 流式输出步骤和思考过程"""
    data = _load_jd_data()
    job = next((j for j in data.get("jobs", []) if j["id"] == jd_id), None)
    if not job:
        raise ValueError(f"JD not found: {jd_id}")

    jd_text = job.get("raw_text", "")
    skills_text = ", ".join(job.get("skills", []))

    # 步骤 1：分析 JD
    yield {"type": "step", "step": 1, "status": "thinking", "message": "正在分析职位要求..."}
    await _sleep(0.3)

    # RAG 检索相关经历
    yield {"type": "step", "step": 1, "status": "searching", "message": "正在检索相关经历..."}
    try:
      context_chunks = await _search_knowledge_base(
          f"{jd_text} {skills_text}", n=10
      )
    except Exception as e:
      yield {"type": "thinking", "content": f"知识库检索失败，使用默认内容: {str(e)}"}
      context_chunks = []
    context = "\n\n".join(context_chunks) if context_chunks else "（知识库中未找到相关经历）"
    await _sleep(0.3)

    yield {"type": "step", "step": 1, "status": "done", "message": "职位要求分析完成"}
    yield {"type": "thinking", "content": f"已从知识库检索到 {len(context_chunks)} 条相关经历"}

    # 步骤 2：生成简历
    yield {"type": "step", "step": 2, "status": "thinking", "message": "正在生成简历内容..."}

    resume_data_str = json.dumps(resume_data or {}, ensure_ascii=False, indent=2)

    llm = _get_llm()
    messages = [
        {"role": "system", "content": GENERATE_RESUME_JSON_PROMPT.format(
            jd_text=jd_text,
            context=context,
            resume_data=resume_data_str,
        )},
        {"role": "user", "content": "请生成简历 JSON"},
    ]

    # 流式获取 LLM 回复
    full_text = ""
    try:
      async for chunk in llm.chat_stream(messages):
        full_text += chunk
        yield {"type": "thinking", "content": chunk}
    except Exception as e:
      yield {"type": "error", "message": f"LLM 调用失败: {str(e)}"}
      return

    yield {"type": "step", "step": 2, "status": "done", "message": "简历内容生成完成"}

    # 步骤 3：解析并输出
    yield {"type": "step", "step": 3, "status": "thinking", "message": "正在格式化简历数据..."}

    # 提取纯 JSON 部分
    json_text = full_text.strip()
    # 去掉可能的思考过程标签
    if '</think>' in json_text:
        json_text = json_text.split('</think>')[-1].strip()
    if '<|end|>' in json_text:
        json_text = json_text.split('<|end|>')[-1].strip()
    # 去掉可能的 markdown 代码块
    if '```' in json_text:
        lines = json_text.split('\n')
        json_text = '\n'.join([l for l in lines if not l.startswith('```')]).strip()
    # 去掉前后空白
    json_text = json_text.strip()

    # 尝试解析 JSON
    try:
        if json_text:
            resume_json = json.loads(json_text)
            if resume_json:
                yield {"type": "resume_data", "data": resume_json}
            else:
                yield {"type": "error", "message": "LLM 返回内容为空，请检查 API Key 或网络"}
        else:
            yield {"type": "error", "message": "LLM 返回内容为空，请检查 API Key 或网络"}
    except json.JSONDecodeError as e:
        # JSON 被截断，尝试补全
        import re
        # 查找可能的 JSON 截断位置
        # 如果错误在文本中间，可能需要补全
        err_msg = str(e)
        if "Expecting" in err_msg and json_text.endswith('"'):
            # JSON 可能在引号处被截断，尝试补全
            for closing in ['"]}', '"}', '"]', '}', ']']:
                test_json = json_text + closing
                try:
                    resume_json = json.loads(test_json)
                    yield {"type": "resume_data", "data": resume_json}
                    return
                except:
                    pass

        # 尝试用正则提取完整的 JSON 对象
        json_match = re.search(r'\{[\s\S]*\}', json_text)
        if json_match:
            try:
                resume_json = json.loads(json_match.group())
                yield {"type": "resume_data", "data": resume_json}
                return
            except:
                pass

        # 所有修复策略都失败，尝试让 LLM 再尝试一次直接返回纯 JSON
        yield {"type": "thinking", "content": "JSON 解析失败，尝试重新生成..."}
        retry_messages = messages + [
            {"role": "user", "content": "请直接返回纯 JSON，不要有其他内容。上一次的输出无法解析为有效 JSON，请确保返回的只有有效的 JSON 格式数据。"},
        ]
        try:
            full_text = ""
            async for chunk in llm.chat_stream(retry_messages):
                full_text += chunk
                yield {"type": "thinking", "content": chunk}

            # 重新处理重试的响应
            json_text = full_text.strip()
            if '</think>' in json_text:
                json_text = json_text.split('</think>')[-1].strip()
            if '<|end|>' in json_text:
                json_text = json_text.split('<|end|>')[-1].strip()
            if '```' in json_text:
                lines = json_text.split('\n')
                json_text = '\n'.join([l for l in lines if not l.startswith('```')]).strip()
            json_text = json_text.strip()

            if json_text:
                try:
                    resume_json = json.loads(json_text)
                    if resume_json:
                        yield {"type": "resume_data", "data": resume_json}
                        yield {"type": "step", "step": 3, "status": "done", "message": "简历生成完成"}
                        yield {"type": "done"}
                        return
                except json.JSONDecodeError:
                    pass

        except Exception as retry_err:
            yield {"type": "error", "message": f"重试失败: {str(retry_err)}"}

        yield {"type": "error", "message": f"简历 JSON 解析失败: {err_msg}, 原始内容: {json_text[:200]}"}

        yield {"type": "step", "step": 3, "status": "done", "message": "简历生成完成"}
    yield {"type": "done"}


async def generate_resume_for_jd_agent(
    jd_id: str,
    resume_data: Optional[dict] = None,
) -> AsyncGenerator[dict, None]:
    """基于 JD 生成简历（Agent 模式，SSE 流式输出）。

    与 generate_resume_for_jd 的区别：
    - 使用 resume_agent（带 format_resume 工具），而不是直接 LLM 调用
    - 在 system prompt 中注入完整 JD 上下文（raw_text, skills, requirements, plus_points）
    - 拦截 format_resume 工具调用结果，转为 resume_data 事件
    """
    import logging
    import json
    logger = logging.getLogger(__name__)

    data = _load_jd_data()
    job = next((j for j in data.get("jobs", []) if j["id"] == jd_id), None)
    if not job:
        yield {"type": "error", "message": f"JD not found: {jd_id}"}
        return

    jd_text = job.get("raw_text", "")
    skills = job.get("skills", [])
    requirements = job.get("requirements", [])
    plus_points = job.get("plus_points", [])

    # 构建 JD 上下文字符串
    jd_context = f"""## 职位描述
{jd_text}

## 关键技能要求
{', '.join(skills) if skills else '未指定'}

## 任职要求
{chr(10).join(f'- {r}' for r in requirements) if requirements else '未指定'}

## 加分项
{chr(10).join(f'- {p}' for p in plus_points) if plus_points else '未指定'}
"""

    # 构建 user prompt（包含 JD 上下文和现有简历数据）
    resume_data_str = json.dumps(resume_data or {}, ensure_ascii=False, indent=2)

    # 明确要求包含 projects 字段
    user_message = f"""请根据以下职位描述生成完整简历，**必须包含 projects（项目经验）字段**。

{jd_context}

## 用户现有简历数据（参考用，如果为空则完全新建）
{resume_data_str if resume_data_str != 'null' else '（无现有简历，需要全新生成）'}

## 生成要求
1. 先使用 search_knowledge_base 检索与该职位相关的项目经历（项目名称、角色、技术栈、成果描述等）
2. 从检索到的项目信息中提取内容，生成 projects 数组：
   - name: 项目名称
   - role: 你的角色（如"项目负责人"、"核心开发"）
   - description: 项目背景和目标
   - tech_stack: 使用的技术栈列表
   - highlights: 项目亮点和成果（使用 STAR 法则，量化成果）
3. 同时生成其他模块：personal, summary, work_experience, education, skills, certifications
4. **重要：projects 字段不能为空，必须包含至少 1 个项目**
5. 通过 format_resume 工具输出完整的结构化简历 JSON
"""

    # 创建 resume agent
    from app.agents.resume_agent import create_resume_agent
    from app.models.base import get_llm_provider
    provider = get_llm_provider()

    try:
        agent = create_resume_agent(provider)
    except Exception as e:
        logger.error(f"[generate_resume_for_jd_agent] 创建 resume agent 失败: {e}")
        yield {"type": "error", "message": f"创建 Agent 失败: {e}"}
        return

    try:
        async for event in agent.stream(user_message):
            if event.get("type") == "tool_result" and event.get("tool") == "format_resume":
                # 拦截 format_resume 工具结果，转为 resume_data 事件
                try:
                    resume_json = json.loads(event["result"])
                    yield {"type": "resume_data", "data": resume_json}
                    continue
                except (json.JSONDecodeError, KeyError) as e:
                    logger.warning(f"[generate_resume_for_jd_agent] format_resume 结果解析失败: {e}, 内容: {event.get('result', '')[:200]}")
                    # 仍然 yield 原始结果，让前端看到
                    yield {"type": "thinking", "content": f"[format_resume 原始结果]\n{event.get('result', '')}"}
                    continue

            if event.get("type") == "tool_error":
                yield {"type": "error", "message": f"工具 {event.get('tool')} 执行失败: {event.get('error')}"}
                continue

            # 原样转发其他事件
            if event.get("type") == "text" and event.get("content"):
                yield {"type": "thinking", "content": event["content"]}
            elif event.get("type") == "tool_start":
                yield {"type": "thinking", "content": f"[调用工具: {event.get('tool')}]"}
            elif event.get("type") == "max_iterations":
                yield {"type": "thinking", "content": event.get("message", "")}
            elif event.get("type") == "stream_fallback":
                yield {"type": "thinking", "content": event.get("message", "")}

    except Exception as e:
        logger.error(f"[generate_resume_for_jd_agent] stream 异常: {type(e).__name__}: {e}")
        yield {"type": "error", "message": f"Agent 执行失败: {e}"}


async def _sleep(seconds: float):
    import asyncio
    await asyncio.sleep(seconds)


# ── CRUD 操作 ──────────────────────────────────────

def get_companies() -> list[dict]:
    return _load_jd_data().get("companies", [])


def create_company(company_data: dict) -> dict:
    from app.schemas.jd import Company
    company = Company(**company_data)
    data = _load_jd_data()
    data["companies"].append(company.model_dump())
    _save_jd_data(data)
    return company.model_dump()


def update_company(company_id: str, updates: dict) -> Optional[dict]:
    data = _load_jd_data()
    for c in data["companies"]:
        if c["id"] == company_id:
            c.update(updates)
            _save_jd_data(data)
            return c
    return None


def delete_company(company_id: str) -> bool:
    data = _load_jd_data()
    data["companies"] = [c for c in data["companies"] if c["id"] != company_id]
    # 同时删除关联的岗位和 JD
    pos_ids = [p["id"] for p in data["positions"] if p["company_id"] == company_id]
    data["positions"] = [p for p in data["positions"] if p["company_id"] != company_id]
    data["jobs"] = [j for j in data["jobs"] if j["position_id"] not in pos_ids]
    data["resumes"] = [r for r in data["resumes"] if r.get("position_id") not in pos_ids]
    _save_jd_data(data)
    return True


def get_positions(company_id: Optional[str] = None) -> list[dict]:
    data = _load_jd_data()
    positions = data.get("positions", [])
    if company_id:
        positions = [p for p in positions if p["company_id"] == company_id]
    return positions


def create_position(position_data: dict) -> dict:
    from app.schemas.jd import Position
    position = Position(**position_data)
    data = _load_jd_data()
    data["positions"].append(position.model_dump())
    _save_jd_data(data)
    return position.model_dump()


def update_position(position_id: str, updates: dict) -> Optional[dict]:
    data = _load_jd_data()
    for p in data["positions"]:
        if p["id"] == position_id:
            p.update(updates)
            _save_jd_data(data)
            return p
    return None


def delete_position(position_id: str) -> bool:
    data = _load_jd_data()
    data["positions"] = [p for p in data["positions"] if p["id"] != position_id]
    # 同时删除关联的 JD
    data["jobs"] = [j for j in data["jobs"] if j["position_id"] != position_id]
    data["resumes"] = [r for r in data["resumes"] if r.get("position_id") != position_id]
    _save_jd_data(data)
    return True


def get_jobs(position_id: Optional[str] = None) -> list[dict]:
    data = _load_jd_data()
    jobs = data.get("jobs", [])
    if position_id:
        jobs = [j for j in jobs if j["position_id"] == position_id]
    return jobs


def get_job(job_id: str) -> Optional[dict]:
    data = _load_jd_data()
    return next((j for j in data.get("jobs", []) if j["id"] == job_id), None)


def create_job(job_data: dict) -> dict:
    from app.schemas.jd import JDData
    job = JDData(**job_data)
    data = _load_jd_data()
    data["jobs"].append(job.model_dump())
    _save_jd_data(data)
    return job.model_dump()


def update_job(job_id: str, updates: dict) -> Optional[dict]:
    data = _load_jd_data()
    for j in data["jobs"]:
        if j["id"] == job_id:
            j.update(updates)
            _save_jd_data(data)
            return j
    return None


def delete_job(job_id: str) -> bool:
    data = _load_jd_data()
    data["jobs"] = [j for j in data["jobs"] if j["id"] != job_id]
    data["resumes"] = [r for r in data["resumes"] if r.get("jd_id") != job_id]
    _save_jd_data(data)
    return True


def get_resumes(jd_id: Optional[str] = None) -> list[dict]:
    data = _load_jd_data()
    resumes = data.get("resumes", [])
    if jd_id:
        resumes = [r for r in resumes if r.get("jd_id") == jd_id]
    return resumes


def create_resume(resume_data: dict) -> dict:
    from app.schemas.jd import JdResume
    from app.schemas.resume import ResumeData, PersonalInfo, WorkExperience, Education, SkillGroup, Project, Certification

    print(f"create_resume called: jd_id={resume_data.get('jd_id')}, resume_data type={type(resume_data.get('resume_data'))}")

    rd = resume_data.get("resume_data", {}) or {}

    # Build personal info - only use known fields to avoid validation errors
    personal_dict = {
        "name": rd.get("personal", {}).get("name") or "未命名",
        "phone": rd.get("personal", {}).get("phone"),
        "email": rd.get("personal", {}).get("email"),
        "location": rd.get("personal", {}).get("location"),
        "website": rd.get("personal", {}).get("website"),
        "linkedin": rd.get("personal", {}).get("linkedin"),
        "github": rd.get("personal", {}).get("github"),
        "title": rd.get("personal", {}).get("title"),
    }

    # Build work experience safely
    work_exp = []
    for w in rd.get("work_experience", []) or []:
        if isinstance(w, dict):
            work_exp.append(WorkExperience(
                company=w.get("company") or "",
                title=w.get("title") or "",
                location=w.get("location"),
                start_date=w.get("start_date") or "",
                end_date=w.get("end_date") or "",
                highlights=w.get("highlights") or [],
            ))

    # Build education safely
    edu_list = []
    for e in rd.get("education", []) or []:
        if isinstance(e, dict):
            edu_list.append(Education(
                institution=e.get("institution") or "",
                degree=e.get("degree") or "",
                field=e.get("field") or "",
                start_date=e.get("start_date") or "",
                end_date=e.get("end_date") or "",
                gpa=e.get("gpa"),
                highlights=e.get("highlights") or [],
            ))

    # Build skills safely
    skills_list = []
    for s in rd.get("skills", []) or []:
        if isinstance(s, dict):
            skills_list.append(SkillGroup(
                category=s.get("category") or "",
                items=s.get("items") or [],
            ))

    validated_resume_data = ResumeData(
        personal=PersonalInfo(**personal_dict),
        summary=rd.get("summary") or "",
        work_experience=work_exp,
        education=edu_list,
        skills=skills_list,
    )

    resume = JdResume(
        jd_id=resume_data.get("jd_id", ""),
        resume_data=validated_resume_data,
    )
    data = _load_jd_data()
    data["resumes"].append(resume.model_dump())
    _save_jd_data(data)
    print(f"create_resume success: resume_id={resume.id}")
    return resume.model_dump()


def update_resume(resume_id: str, updates: dict) -> Optional[dict]:
    data = _load_jd_data()
    for r in data["resumes"]:
        if r["id"] == resume_id:
            if "resume_data" in updates:
                r["resume_data"] = updates["resume_data"]
            from datetime import datetime
            r["updated_at"] = datetime.now().isoformat()
            _save_jd_data(data)
            return r
    return None


def delete_resume(resume_id: str) -> bool:
    data = _load_jd_data()
    data["resumes"] = [r for r in data["resumes"] if r["id"] != resume_id]
    _save_jd_data(data)
    return True


def get_companies_with_counts() -> list[dict]:
    """获取公司列表（含计数）"""
    data = _load_jd_data()
    companies = data.get("companies", [])
    positions = data.get("positions", [])
    jobs = data.get("jobs", [])
    resumes = data.get("resumes", [])

    result = []
    for c in companies:
        company_positions = [p for p in positions if p["company_id"] == c["id"]]
        position_ids = [p["id"] for p in company_positions]
        company_jobs = [j for j in jobs if j["position_id"] in position_ids]
        job_ids = [j["id"] for j in company_jobs]
        company_resumes = [r for r in resumes if r.get("jd_id") in job_ids or r.get("position_id") in position_ids]

        result.append({
            **c,
            "position_count": len(company_positions),
            "job_count": len(company_jobs),
            "resume_count": len(company_resumes),
        })
    return result


def get_positions_with_counts(company_id: Optional[str] = None) -> list[dict]:
    """获取岗位列表（含计数）"""
    data = _load_jd_data()
    positions = data.get("positions", [])
    jobs = data.get("jobs", [])
    resumes = data.get("resumes", [])

    result = []
    for p in positions:
        if company_id and p["company_id"] != company_id:
            continue
        position_jobs = [j for j in jobs if j["position_id"] == p["id"]]
        job_ids = [j["id"] for j in position_jobs]
        position_resumes = [r for r in resumes if r.get("jd_id") in job_ids or r.get("position_id") == p["id"]]

        result.append({
            **p,
            "job_count": len(position_jobs),
            "resume_count": len(position_resumes),
        })
    return result