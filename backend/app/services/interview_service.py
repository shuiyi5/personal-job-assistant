"""面试服务 - 会话管理"""

from dataclasses import dataclass, field


@dataclass
class InterviewSession:
    """面试会话状态"""
    session_id: str
    questions: list[dict] = field(default_factory=list)
    answers: list[dict] = field(default_factory=list)
    current_question_index: int = 0
    is_finished: bool = False

    def add_question(self, question: str, reference: str = ""):
        self.questions.append({"question": question, "reference": reference})

    def add_answer(self, answer: str, evaluation: str = ""):
        self.answers.append({
            "question_index": self.current_question_index,
            "answer": answer,
            "evaluation": evaluation,
        })
        self.current_question_index += 1

    @property
    def progress(self) -> str:
        total = len(self.questions)
        current = self.current_question_index
        return f"{current}/{total}" if total > 0 else "0/0"
