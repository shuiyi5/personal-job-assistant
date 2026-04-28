"""Skills module - 行为扩展系统"""
from app.skills.base import (
    Skill,
    SkillConfig,
    SkillManager,
    get_skill_manager,
    ResumeSkill,
    InterviewSkill,
    KBSearchSkill,
    GeneralChatSkill,
)

__all__ = [
    "Skill",
    "SkillConfig",
    "SkillManager",
    "get_skill_manager",
    "ResumeSkill",
    "InterviewSkill",
    "KBSearchSkill",
    "GeneralChatSkill",
]
