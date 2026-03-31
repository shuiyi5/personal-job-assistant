"""Router Agent - 意图分类与路由"""

import re

from app.models.base import LLMProvider, get_llm_provider


# 关键词 → 意图映射 (覆盖常见中英文表达)
INTENT_PATTERNS: dict[str, list[str]] = {
    "knowledge_base": [
        "上传", "文档", "添加文件", "管理文档", "删除文档", "文件列表",
        "知识库", "查看文档", "看看文档", "有哪些文档", "我的文档",
        "upload", "document", "add file", "manage", "delete", "list docs",
        "knowledge base", "my docs",
    ],
    "resume": [
        "简历", "CV", "resume", "生成简历", "编辑简历", "导出简历",
        "工作经历", "教育背景", "技能总结", "自我介绍", "写简历",
        "个人简介", "求职", "应聘",
    ],
    "interview_prep": [
        "面试题", "面试准备", "出题", "技术问题", "行为问题",
        "面试", "考察", "提问", "准备面试", "模拟题",
        "interview question", "prepare interview", "generate question",
    ],
    "mock_interview": [
        "模拟面试", "面试练习", "语音面试", "mock interview",
        "practice interview", "开始面试", "面试模拟",
    ],
}

ROUTER_SYSTEM_PROMPT = """你是一个意图分类器。根据用户消息，判断用户意图属于以下哪个类别：
- knowledge_base: 文档上传、管理、查询知识库、查看知识库中有什么
- resume: 简历的创建、编辑、导出、求职相关
- interview_prep: 生成面试题、评估回答、面试准备
- mock_interview: 语音模拟面试、面试练习
- general_chat: 其他通用对话

只输出类别名称，不要解释。"""


def classify_by_keywords(message: str) -> str | None:
    """基于关键词的快速意图分类"""
    message_lower = message.lower()
    scores: dict[str, int] = {}
    for intent, keywords in INTENT_PATTERNS.items():
        count = sum(1 for kw in keywords if kw in message_lower)
        if count > 0:
            scores[intent] = count

    if scores:
        return max(scores, key=scores.get)
    return None


async def classify_by_llm(message: str, provider: LLMProvider | None = None) -> str:
    """基于 LLM 的意图分类 (关键词匹配失败时的后备)"""
    provider = provider or get_llm_provider()
    result = await provider.chat(
        messages=[{"role": "user", "content": message}],
        system=ROUTER_SYSTEM_PROMPT,
        max_tokens=50,
    )
    # 从回复中提取意图 (LLM 可能返回多余文字)
    intent = result.strip().lower().split("\n")[0].strip()
    intent = re.sub(r"[^a-z_]", "", intent)
    valid = {"knowledge_base", "resume", "interview_prep", "mock_interview", "general_chat"}
    return intent if intent in valid else "general_chat"


async def route(message: str, provider: LLMProvider | None = None) -> str:
    """路由: 先关键词匹配, 后 LLM 分类"""
    intent = classify_by_keywords(message)
    if intent:
        return intent
    return await classify_by_llm(message, provider)
