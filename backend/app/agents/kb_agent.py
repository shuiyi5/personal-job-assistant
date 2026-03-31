"""知识库管理 Agent"""

from app.agents.base import BaseAgent
from app.models.base import LLMProvider
from app.tools.kb_tools import SearchKnowledgeBaseTool, ListDocumentsTool, DeleteDocumentTool
from app.tools.utility_tools import GetCurrentTimeTool, WebSearchTool

KB_SYSTEM_PROMPT = """你是知识库管理助手。你的职责是帮助用户管理个人文档知识库。

你拥有以下工具：
1. search_knowledge_base: 搜索知识库中的信息
2. list_documents: 列出所有已上传的文档
3. delete_document: 删除指定文档
4. web_search: 联网搜索信息
5. get_current_time: 获取当前日期时间

你可以帮助用户：
- 查看知识库中有哪些文档
- 搜索特定的信息
- 删除不需要的文档
- 解释文档内容

用户在对话页上传的文件会自动进入知识库。收到用户的请求后，先用工具查看实际情况，再回复用户。
"""


def create_kb_agent(provider: LLMProvider) -> BaseAgent:
    tools = [
        SearchKnowledgeBaseTool(),
        ListDocumentsTool(),
        DeleteDocumentTool(),
        WebSearchTool(),
        GetCurrentTimeTool(),
    ]
    return BaseAgent(provider=provider, tools=tools, system_prompt=KB_SYSTEM_PROMPT)
