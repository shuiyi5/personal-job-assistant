"""Agent 工具基类"""

from abc import ABC, abstractmethod
from typing import Any


class BaseTool(ABC):
    """工具抽象基类"""

    @property
    @abstractmethod
    def name(self) -> str:
        """工具名称"""

    @property
    @abstractmethod
    def description(self) -> str:
        """工具描述"""

    @property
    @abstractmethod
    def input_schema(self) -> dict:
        """输入参数 JSON Schema"""

    @abstractmethod
    async def execute(self, **kwargs) -> Any:
        """执行工具, 返回结果"""

    def to_dict(self) -> dict:
        """转为 LLM tool calling 格式"""
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_schema,
        }
