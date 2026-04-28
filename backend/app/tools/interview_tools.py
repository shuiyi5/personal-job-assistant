"""面试工具 - 出题、评估、反馈"""

from typing import Optional

from app.tools.base import BaseTool


class GenerateQuestionsTool(BaseTool):
    @property
    def name(self) -> str:
        return "generate_questions"

    @property
    def description(self) -> str:
        return "根据项目描述和技能信息，生成有针对性的面试题目。"

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "category": {
                    "type": "string",
                    "enum": ["technical", "behavioral", "system_design", "mixed"],
                    "description": "面试题类别",
                },
                "context": {"type": "string", "description": "从知识库获取的项目/技能上下文"},
                "difficulty": {
                    "type": "string",
                    "enum": ["junior", "mid", "senior"],
                    "default": "mid",
                },
                "count": {"type": "integer", "description": "题目数量", "default": 5},
            },
            "required": ["category", "context"],
        }

    async def execute(
        self,
        category: str,
        context: str,
        difficulty: str = "mid",
        count: int = 5,
    ) -> dict:
        return {
            "category": category,
            "context": context,
            "difficulty": difficulty,
            "count": count,
            "instruction": (
                f"请根据以上 context 中的项目和技能信息，生成 {count} 道{category}类型的面试题。"
                f"难度: {difficulty}级别。"
                "每道题包含：题目、考察点、参考答案要点。使用中文。"
            ),
        }


class EvaluateAnswerTool(BaseTool):
    @property
    def name(self) -> str:
        return "evaluate_answer"

    @property
    def description(self) -> str:
        return "评估候选人对面试题的回答质量。"

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "question": {"type": "string", "description": "面试题目"},
                "answer": {"type": "string", "description": "候选人的回答"},
                "context": {"type": "string", "description": "参考上下文（用于事实核查）"},
                "criteria": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "评估维度",
                    "default": ["准确性", "完整性", "深度", "表达清晰度"],
                },
            },
            "required": ["question", "answer"],
        }

    async def execute(
        self,
        question: str,
        answer: str,
        context: str = "",
        criteria: Optional[list[str]] = None,
    ) -> dict:
        criteria = criteria or ["准确性", "完整性", "深度", "表达清晰度"]
        return {
            "question": question,
            "answer": answer,
            "context": context,
            "criteria": criteria,
            "instruction": (
                "请根据以下维度评估回答质量，每个维度打分(1-10)并给出点评：\n"
                + "\n".join(f"- {c}" for c in criteria)
                + "\n最后给出总体评价和改进建议。"
            ),
        }


class ProvideFeedbackTool(BaseTool):
    @property
    def name(self) -> str:
        return "provide_feedback"

    @property
    def description(self) -> str:
        return "基于评估结果，生成结构化的面试反馈和改进建议。"

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "evaluation": {"type": "string", "description": "评估结果文本"},
                "language": {"type": "string", "enum": ["zh", "en"], "default": "zh"},
            },
            "required": ["evaluation"],
        }

    async def execute(self, evaluation: str, language: str = "zh") -> dict:
        return {
            "evaluation": evaluation,
            "language": language,
            "instruction": (
                "请基于评估结果，生成结构化反馈：\n"
                "1. 亮点（做得好的地方）\n"
                "2. 不足（需要改进的地方）\n"
                "3. 具体建议（如何改进回答）\n"
                "4. 推荐学习资源\n"
                + ("使用中文回复。" if language == "zh" else "Reply in English.")
            ),
        }
