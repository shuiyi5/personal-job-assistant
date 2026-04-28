"""Skill System - 行为扩展覆盖层（Behavioral Extension Overlay）

参照 Claude Code 的 Skill 架构:
  - Skill 不是替换工具，而是扩展 Agent 的行为能力
  - Skill = 特定场景的 system prompt 片段 + 可选的工具集
  - Skill 通过叠加（overlay）方式修改 Agent 行为，而不是硬编码

核心设计:
  1. Skill 描述: 做什么 + 怎么做（behavioral guidance）
  2. Skill 叠加: 多个 Skill 可以叠加（compose）
  3. Skill 激活: 根据用户意图自动匹配最合适的 Skill
  4. Skill vs Tool: Tool = "能做什么"，Skill = "什么时候用、怎么用"

使用场景:
  - resume_skill: 简历优化场景的特殊行为指导
  - interview_skill: 面试准备场景的特殊行为指导
  - kb_search_skill: 知识库检索的优化策略
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class SkillConfig:
    """Skill 配置"""
    name: str                           # 唯一名称
    description: str                   # 描述（用于自动匹配）
    system_addition: str = ""           # 追加到 system prompt 的行为指导
    priority: int = 0                   # 优先级（越高越先匹配）
    tools: list[str] = field(default_factory=list)  # 启用的工具子集（空=全部）
    max_iterations_modifier: int = 0    # 迭代次数修正（+N 或 -N）
    temperature: Optional[float] = None    # 温度修正


class Skill(ABC):
    """Skill 抽象基类"""

    @property
    @abstractmethod
    def config(self) -> SkillConfig:
        """返回 Skill 配置"""
        pass

    def before_invoke(self, context: dict) -> dict:
        """调用前钩子：可以修改 context"""
        return context

    def after_invoke(self, response: Any, context: dict) -> Any:
        """调用后钩子：可以修改 response"""
        return response


# ──────────────────────────────────────────────
# 内置 Skills
# ──────────────────────────────────────────────

class ResumeSkill(Skill):
    """简历优化 Skill"""

    @property
    def config(self) -> SkillConfig:
        return SkillConfig(
            name="resume_optimizer",
            description="简历优化、简历诊断、简历修改建议",
            system_addition="""[简历优化专家模式]
你是一位资深 HR，擅长优化简历以提高通过率。
- 关注关键词匹配（ATS 系统）
- 优化工作经历的描述方式（动词 + 结果 + 量化）
- 检查格式统一性和专业度
- 提供具体的修改建议而非泛泛而谈""",
            priority=10,
            max_iterations_modifier=2,  # 简历分析需要更多迭代
        )


class InterviewSkill(Skill):
    """面试准备 Skill"""

    @property
    def config(self) -> SkillConfig:
        return SkillConfig(
            name="interview_prep",
            description="面试准备、模拟面试、面试技巧",
            system_addition="""[面试教练模式]
你是一位面试教练，帮助用户准备面试。
- 先了解岗位和公司背景
- 提供 STAR 法则回答模板
- 模拟可能的追问
- 给出信心建立建议""",
            priority=10,
        )


class KBSearchSkill(Skill):
    """知识库检索 Skill"""

    @property
    def config(self) -> SkillConfig:
        return SkillConfig(
            name="kb_search",
            description="知识库查询、文档检索、信息搜索",
            system_addition="""[知识库检索模式]
你是信息检索专家。
- 先理解用户的真实信息需求
- 选择最相关的检索策略
- 提供带有来源引用的答案
- 如果信息不足，明确指出需要补充什么""",
            priority=5,
            max_iterations_modifier=-1,  # 检索任务不需要太多迭代
        )


class GeneralChatSkill(Skill):
    """通用对话 Skill"""

    @property
    def config(self) -> SkillConfig:
        return SkillConfig(
            name="general_chat",
            description="通用对话、闲聊、开放式问答",
            system_addition="""[友好助手模式]
你是一位知识渊博、友好耐心的助手。
- 回答要清晰、有条理
- 复杂问题要主动拆解
- 不知道的问题要诚实承认，不要编造""",
            priority=0,
        )


# ──────────────────────────────────────────────
# Skill Manager
# ──────────────────────────────────────────────

class SkillManager:
    """Skill 管理器：负责 Skill 匹配和叠加"""

    def __init__(self):
        self._skills: dict[str, Skill] = {}

    def register(self, skill: Skill) -> None:
        self._skills[skill.config.name] = skill

    def register_default(self) -> None:
        """注册内置 Skills"""
        self.register(ResumeSkill())
        self.register(InterviewSkill())
        self.register(KBSearchSkill())
        self.register(GeneralChatSkill())

    def match(self, user_message: str, context: Optional[dict] = None) -> list[Skill]:
        """根据用户消息和上下文匹配最合适的 Skills（按优先级排序）"""
        matched = []
        message_lower = user_message.lower()

        for skill in self._skills.values():
            if self._matches(skill, message_lower, context):
                matched.append(skill)

        # 按优先级排序
        matched.sort(key=lambda s: s.config.priority, reverse=True)
        return matched

    def _matches(self, skill: Skill, message: str, context: Optional[dict]) -> bool:
        """判断 Skill 是否匹配"""
        desc = skill.config.description.lower()
        # 简单关键词匹配
        keywords = [k.strip() for k in desc.split("、") if k.strip()]
        return any(kw in message for kw in keywords)

    def apply(self, base_system_prompt: str, skills: list[Skill],
              extra_context: Optional[dict] = None) -> str:
        """将多个 Skill 的行为指导叠加到 base_system_prompt"""
        if not skills:
            return base_system_prompt

        parts = [base_system_prompt]
        for skill in skills:
            if skill.config.system_addition:
                parts.append(skill.config.system_addition)

        return "\n\n".join(parts)

    def get_tools_filter(self, skills: list[Skill]) -> Optional[list[str]]:
        """获取工具过滤列表（如果所有 Skill 都指定了工具子集）"""
        filters = [s.config.tools for s in skills if s.config.tools]
        if not filters:
            return None
        # 取交集
        result = set(filters[0])
        for f in filters[1:]:
            result &= set(f)
        return list(result)

    def get_iterations_modifier(self, skills: list[Skill]) -> int:
        """获取迭代次数修正值"""
        return sum(s.config.max_iterations_modifier for s in skills)


# 全局默认实例
_default_manager: Optional[SkillManager] = None


def get_skill_manager() -> SkillManager:
    global _default_manager
    if _default_manager is None:
        _default_manager = SkillManager()
        _default_manager.register_default()
    return _default_manager
