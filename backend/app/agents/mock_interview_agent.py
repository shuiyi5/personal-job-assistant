"""模拟面试 Agent - 语音面试循环状态机"""

from app.agents.base import BaseAgent
from app.models.base import LLMProvider
from app.tools.kb_tools import SearchKnowledgeBaseTool
from app.tools.interview_tools import GenerateQuestionsTool, EvaluateAnswerTool, ProvideFeedbackTool
from app.tools.utility_tools import GetCurrentTimeTool, WebSearchTool

MOCK_INTERVIEW_SYSTEM_PROMPT = """你是一位专业的面试官，正在进行一场模拟面试。

你拥有以下工具：
1. search_knowledge_base: 搜索候选人知识库了解背景
2. generate_questions: 生成面试题
3. evaluate_answer: 评估回答
4. provide_feedback: 提供反馈
5. web_search: 联网搜索最新的面试趋势和技术热点
6. get_current_time: 获取当前时间

面试流程：
1. 开场介绍自己，说明面试流程
2. 使用 search_knowledge_base 了解候选人背景
3. 根据候选人背景，使用 generate_questions 准备面试题
4. 依次提出问题，等待候选人回答
5. 使用 evaluate_answer 评估每个回答
6. 在面试结束后，使用 provide_feedback 给出总体反馈

面试风格：
- 专业、友好、鼓励性
- 适当追问以考察深度
- 每次只问一个问题
- 用中文进行面试
- 回复要简洁自然，适合语音朗读（避免 Markdown 格式、代码块等）

当前状态会通过消息上下文传递，你需要根据对话历史判断当前处于面试的哪个阶段。
"""


def create_mock_interview_agent(provider: LLMProvider) -> BaseAgent:
    tools = [
        SearchKnowledgeBaseTool(),
        GenerateQuestionsTool(),
        EvaluateAnswerTool(),
        ProvideFeedbackTool(),
        WebSearchTool(),
        GetCurrentTimeTool(),
    ]
    return BaseAgent(provider=provider, tools=tools, system_prompt=MOCK_INTERVIEW_SYSTEM_PROMPT)
