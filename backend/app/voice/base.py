"""语音服务抽象基类"""

from abc import ABC, abstractmethod


class STTProvider(ABC):
    """语音识别 (Speech-to-Text) 抽象接口"""

    @abstractmethod
    async def recognize(self, audio_data: bytes, format: str = "pcm", sample_rate: int = 16000) -> str:
        """识别音频数据, 返回文本"""

    @abstractmethod
    async def recognize_stream(self, audio_stream, format: str = "pcm", sample_rate: int = 16000):
        """流式识别: 逐步接收音频, 产出部分结果
        Yields: {"text": str, "is_final": bool}
        """


class TTSProvider(ABC):
    """语音合成 (Text-to-Speech) 抽象接口"""

    @abstractmethod
    async def synthesize(self, text: str, voice: str = "default") -> bytes:
        """将文本合成为音频, 返回音频字节"""

    @abstractmethod
    async def synthesize_stream(self, text: str, voice: str = "default"):
        """流式合成: 逐步产出音频片段
        Yields: bytes (audio chunks)
        """
