"""统一 Agent - 拥有所有工具，自行判断使用哪些（支持 Skill 系统）"""

from typing import Optional

from app.agents.base import BaseAgent
from app.models.base import LLMProvider
from app.skills.base import SkillManager, get_skill_manager
from app.session.manager import SessionConfig
from app.tools.kb_tools import SearchKnowledgeBaseTool, ListDocumentsTool
from app.tools.resume_tools import GenerateSectionTool, FormatResumeTool, ExportResumeTool, UpdateModuleOrderTool
from app.tools.interview_tools import GenerateQuestionsTool, EvaluateAnswerTool, ProvideFeedbackTool
from app.tools.jd_tools import SearchJDTool, SaveResumeToJDTool, ListAllJDTool
from app.tools.utility_tools import (
    GetCurrentTimeTool,
    WebSearchTool,
    FetchWebPageTool,
    ReadFileTool,
    WriteFileTool,
    RunCommandTool,
)

UNIFIED_SYSTEM_PROMPT = """你是一个全能的个人求职辅助助手，具备联网搜索、知识库检索、简历编写、面试准备等全部能力。

## 你的工具

### 通用工具
- web_search: 联网搜索最新信息（公司、岗位、薪资、技术趋势等）
- fetch_webpage: 获取网页详细内容
- get_current_time: 获取当前日期和时间
- search_knowledge_base: 搜索用户的个人知识库（工作经历、项目描述、技能等）
- list_documents: 查看知识库中有哪些文档
- read_file: 读取本地文件内容
- write_file: 将内容写入本地文件（可追加或覆盖）
- run_command: 在 shell 中执行命令，获取输出

### JD 管理工具（重要！）
- search_jd: 根据公司名称、职位名称或技能关键词搜索 JD 库中的职位。当用户提到"根据 XX 公司 JD 生成简历"、"帮我看看字节的 JD"等时必须使用。
- list_all_jd: 列出所有已添加的 JD，当用户要求查看全部 JD 时使用。
- save_resume_to_jd: 将生成好的简历保存到指定的 JD 下。**生成简历后必须调用此工具保存，否则简历不会持久化。**

### 简历工具
- generate_section: 基于知识库信息准备简历段落的结构化数据
- format_resume: 将简历数据组装为结构化 JSON（调用后简历会直接呈现给用户）
- export_resume: 将简历导出为 PDF/DOCX
- update_module_order: 调整简历模块的显示顺序（如将教育经历移到工作经历前面）

### 面试工具
- generate_questions: 根据项目和技能生成面试题
- evaluate_answer: 评估面试回答质量
- provide_feedback: 提供面试反馈和改进建议

## JD 相关规则（重要！）
- 当用户说"根据字节的 JD 生成简历"、"看看美团的 JD"等时，**必须**：
  1. 先调用 search_jd 搜索匹配的 JD
  2. 从搜索结果中获取 jd_id
  3. 根据 JD 内容生成简历
  4. 调用 save_resume_to_jd 保存简历到该 JD
- 如果没有找到匹配的 JD，告知用户并建议先在 JD 管理中添加
- 调用 save_resume_to_jd 后，告知用户简历已保存

## 简历相关规则（重要）
- 当用户要求创建、填充、修改简历时，你**必须**调用 format_resume 工具输出结构化 JSON
- 不要只在聊天中描述简历内容——必须通过工具让简历真正更新
- format_resume 接受结构化 JSON: personal, summary, work_experience, education, skills, projects, certifications
- 如果用户提供了当前简历数据，在其基础上修改后重新调用 format_resume
- highlights 使用 STAR 法则，量化成果
- 调用 format_resume 后，用简短文字告诉用户做了哪些修改

## 面试相关规则
- 围绕用户的真实项目经历出题
- 技术题深入实现细节、架构决策
- 行为题用 STAR 法考察
- 评估客观公正，给出具体分数和改进建议

## 通用规则
- 主动使用工具获取信息，不要凭记忆回答需要时效性的问题
- 请用中文回复
"""


class SkillfulUnifiedAgent:
    """支持 Skill 系统的统一 Agent"""

    def __init__(
        self,
        provider: LLMProvider,
        session_id: Optional[str] = None,
        skill_manager: Optional[SkillManager] = None,
    ):
        self.provider = provider
        self.skill_manager = skill_manager or get_skill_manager()
        self.session_id = session_id

        # 工具列表
        self._all_tools = [
            WebSearchTool(),
            FetchWebPageTool(),
            GetCurrentTimeTool(),
            SearchKnowledgeBaseTool(),
            ListDocumentsTool(),
            ReadFileTool(),
            WriteFileTool(),
            RunCommandTool(),
            SearchJDTool(),
            SaveResumeToJDTool(),
            ListAllJDTool(),
            GenerateSectionTool(),
            FormatResumeTool(),
            ExportResumeTool(),
            UpdateModuleOrderTool(),
            GenerateQuestionsTool(),
            EvaluateAnswerTool(),
            ProvideFeedbackTool(),
        ]

        # 基础 Agent（无 session）
        self._base_agent = BaseAgent(
            provider=provider,
            tools=self._all_tools,
            system_prompt=UNIFIED_SYSTEM_PROMPT,
        )

    async def invoke(self, user_message: str, history: Optional[list[dict]] = None) -> str:
        """根据用户意图自动匹配 Skill，动态调整 Agent 行为"""
        # 1. 匹配 Skill
        skills = self.skill_manager.match(user_message, {"history": history})

        # 2. 获取 Skill 增强的 system prompt
        system = self.skill_manager.apply(UNIFIED_SYSTEM_PROMPT, skills)

        # 3. 获取工具过滤（如果 Skill 指定了工具子集）
        tool_filter = self.skill_manager.get_tools_filter(skills)
        tools = self._filter_tools(tool_filter) if tool_filter else self._all_tools

        # 4. 计算动态 max_iterations
        base_iterations = self._base_agent.MAX_ITERATIONS
        modifier = self.skill_manager.get_iterations_modifier(skills)
        max_iterations = max(1, base_iterations + modifier)

        # 5. 创建带 session 的 Agent（如果需要）
        if self.session_id:
            session_config = SessionConfig()
            agent = BaseAgent(
                provider=self.provider,
                tools=tools,
                system_prompt=system,
                session_id=self.session_id,
                session_config=session_config,
            )
        else:
            agent = BaseAgent(
                provider=self.provider,
                tools=tools,
                system_prompt=system,
            )
            # 临时覆盖 max_iterations
            agent.MAX_ITERATIONS = max_iterations

        return await agent.invoke(user_message, history)

    async def stream(self, user_message: str, history: Optional[list[dict]] = None):
        """流式版本"""
        skills = self.skill_manager.match(user_message, {"history": history})
        system = self.skill_manager.apply(UNIFIED_SYSTEM_PROMPT, skills)
        tool_filter = self.skill_manager.get_tools_filter(skills)
        tools = self._filter_tools(tool_filter) if tool_filter else self._all_tools

        base_iterations = self._base_agent.MAX_ITERATIONS
        modifier = self.skill_manager.get_iterations_modifier(skills)
        max_iterations = max(1, base_iterations + modifier)

        if self.session_id:
            agent = BaseAgent(
                provider=self.provider,
                tools=tools,
                system_prompt=system,
                session_id=self.session_id,
                session_config=SessionConfig(),
            )
        else:
            agent = BaseAgent(
                provider=self.provider,
                tools=tools,
                system_prompt=system,
            )
            agent.MAX_ITERATIONS = max_iterations

        async for event in agent.stream(user_message, history):
            yield event

    def _filter_tools(self, tool_names: list[str]):
        return [t for t in self._all_tools if t.name in tool_names]


def create_unified_agent(provider: LLMProvider) -> BaseAgent:
    """创建拥有所有工具的统一 Agent（兼容旧接口）"""
    tools = [
        WebSearchTool(),
        FetchWebPageTool(),
        GetCurrentTimeTool(),
        SearchKnowledgeBaseTool(),
        ListDocumentsTool(),
        ReadFileTool(),
        WriteFileTool(),
        RunCommandTool(),
        SearchJDTool(),
        SaveResumeToJDTool(),
        ListAllJDTool(),
        GenerateSectionTool(),
        FormatResumeTool(),
        ExportResumeTool(),
        UpdateModuleOrderTool(),
        GenerateQuestionsTool(),
        EvaluateAnswerTool(),
        ProvideFeedbackTool(),
    ]
    return BaseAgent(provider=provider, tools=tools, system_prompt=UNIFIED_SYSTEM_PROMPT)


def create_skillful_agent(
    provider: LLMProvider,
    session_id: Optional[str] = None,
) -> SkillfulUnifiedAgent:
    """创建支持 Skill 系统的统一 Agent（新接口）"""
    return SkillfulUnifiedAgent(provider=provider, session_id=session_id)


# 向后兼容别名
UnifiedAgent = SkillfulUnifiedAgent


# 兼容旧接口：UnifiedAgent = BaseAgent（原先是 BaseAgent 的别名）
UnifiedAgent = BaseAgent
