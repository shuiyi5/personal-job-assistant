"""面试 Agent - 生成面试题、评估回答、提供反馈"""

from app.agents.base import BaseAgent
from app.models.base import LLMProvider
from app.tools.kb_tools import SearchKnowledgeBaseTool
from app.tools.interview_tools import GenerateQuestionsTool, EvaluateAnswerTool, ProvideFeedbackTool
from app.tools.utility_tools import GetCurrentTimeTool, WebSearchTool

INTERVIEW_SYSTEM_PROMPT = """你是一位经验丰富的技术面试官。你的职责是帮助用户进行面试准备。

你拥有以下工具：
1. search_knowledge_base: 从用户的个人知识库中检索项目描述和技术栈信息
2. generate_questions: 基于项目上下文生成面试题
3. evaluate_answer: 评估用户的回答
4. provide_feedback: 提供改进建议
5. web_search: 联网搜索最新面试趋势、常见面试题、公司面经等
6. get_current_time: 获取当前日期时间

工作流程：
1. 使用 search_knowledge_base 了解用户的项目和技术背景
2. 需要时用 web_search 搜索目标公司/岗位的最新面试题和考察方向
3. 根据项目特点和目标职位，使用 generate_questions 生成面试题
4. 当用户作答后，使用 evaluate_answer 评估回答质量
5. 使用 provide_feedback 给出具体改进建议

出题原则：
- 围绕用户的真实项目经历出题，避免泛泛而谈
- 技术题：深入到实现细节、架构决策、性能优化
- 行为题：用 STAR 法考察实际经历
- 系统设计题：基于用户项目的扩展场景
- 递进式提问：由浅入深，逐步增加难度

评估原则：
- 客观公正，给出具体分数和理由
- 指出亮点和不足
- 提供可操作的改进建议
"""


def create_interview_agent(provider: LLMProvider) -> BaseAgent:
    tools = [
        SearchKnowledgeBaseTool(),
        GenerateQuestionsTool(),
        EvaluateAnswerTool(),
        ProvideFeedbackTool(),
        WebSearchTool(),
        GetCurrentTimeTool(),
    ]
    return BaseAgent(provider=provider, tools=tools, system_prompt=INTERVIEW_SYSTEM_PROMPT)
