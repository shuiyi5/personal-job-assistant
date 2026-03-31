"""语音管线编排 - STT → Agent → TTS"""

from app.config.settings import settings
from app.voice.base import STTProvider, TTSProvider


def get_stt_provider() -> STTProvider:
    """获取 STT 提供商"""
    if settings.iflytek_app_id:
        from app.voice.iflytek_stt import IflytekSTT
        return IflytekSTT()
    elif settings.baidu_api_key:
        from app.voice.baidu_voice import BaiduSTT
        return BaiduSTT()
    else:
        raise RuntimeError("未配置语音识别服务 (需要讯飞或百度 API Key)")


def get_tts_provider() -> TTSProvider:
    """获取 TTS 提供商"""
    if settings.iflytek_app_id:
        from app.voice.iflytek_tts import IflytekTTS
        return IflytekTTS()
    elif settings.baidu_api_key:
        from app.voice.baidu_voice import BaiduTTS
        return BaiduTTS()
    else:
        raise RuntimeError("未配置语音合成服务 (需要讯飞或百度 API Key)")


class VoicePipeline:
    """语音面试管线: 音频输入 → 文本 → Agent 处理 → 文本 → 音频输出"""

    def __init__(self):
        self._stt = get_stt_provider()
        self._tts = get_tts_provider()

    async def audio_to_text(self, audio_data: bytes) -> str:
        """音频 → 文本"""
        return await self._stt.recognize(audio_data)

    async def text_to_audio(self, text: str, voice: str = "xiaoyan") -> bytes:
        """文本 → 音频"""
        return await self._tts.synthesize(text, voice)

    async def text_to_audio_stream(self, text: str, voice: str = "xiaoyan"):
        """文本 → 流式音频"""
        async for chunk in self._tts.synthesize_stream(text, voice):
            yield chunk
