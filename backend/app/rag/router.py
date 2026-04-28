"""查询意图路由器 - 分析用户 query 并路由到不同的检索策略"""

from dataclasses import dataclass
from enum import Enum
from typing import Optional


class QueryType(Enum):
    RESUME = "resume"
    PROJECT = "project"
    GENERAL = "general"
    COMPARISON = "comparison"
    SUMMARIZATION = "summarization"


@dataclass
class RoutedQuery:
    query_type: QueryType
    doc_type_filter: Optional[str]
    intent: str
    complexity: int  # 1-3


class QueryRouter:
    """根据用户查询意图路由到不同检索策略"""

    RESUME_KEYWORDS = {"简历", "经历", "工作", "履历", "职位", "岗位"}
    PROJECT_KEYWORDS = {"项目", "项目经历", "项目描述", "项目经验"}
    COMPARISON_KEYWORDS = {"对比", "比较", "差异", "区别", "哪个好", "差异点"}
    SUMMARIZATION_KEYWORDS = {"总结", "概括", "要点", "汇总", "归纳"}

    def route(self, query: str) -> RoutedQuery:
        query_lower = query.lower()
        query_type = QueryType.GENERAL
        doc_type_filter: Optional[str] = None
        intent = "搜索相关信息"

        # 判断查询类型
        if any(kw in query_lower for kw in self.COMPARISON_KEYWORDS):
            query_type = QueryType.COMPARISON
            intent = "对比项目差异"
        elif any(kw in query_lower for kw in self.SUMMARIZATION_KEYWORDS):
            query_type = QueryType.SUMMARIZATION
            intent = "总结文档要点"
        elif any(kw in query_lower for kw in self.RESUME_KEYWORDS):
            query_type = QueryType.RESUME
            doc_type_filter = "resume"
            intent = "查找简历相关信息"
        elif any(kw in query_lower for kw in self.PROJECT_KEYWORDS):
            query_type = QueryType.PROJECT
            doc_type_filter = "project"
            intent = "查找项目相关信息"

        # 复杂度评估（根据 query 长度和结构）
        complexity = 1
        if len(query) > 50:
            complexity = 2
        if len(query) > 100 or any(kw in query_lower for kw in self.COMPARISON_KEYWORDS | self.SUMMARIZATION_KEYWORDS):
            complexity = 3

        return RoutedQuery(
            query_type=query_type,
            doc_type_filter=doc_type_filter,
            intent=intent,
            complexity=complexity,
        )
