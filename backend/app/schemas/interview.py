"""面试相关 Pydantic 模型"""

from pydantic import BaseModel


class QuestionRequest(BaseModel):
    category: str = "mixed"  # technical | behavioral | system_design | mixed
    difficulty: str = "mid"  # junior | mid | senior
    count: int = 5
    topic: str = ""  # 指定主题/项目


class EvaluationRequest(BaseModel):
    question: str
    answer: str
