"""百度语音 - STT/TTS (REST API 备选方案)"""

import base64
import json

import httpx

from app.config.settings import settings
from app.voice.base import STTProvider, TTSProvider


class BaiduSTT(STTProvider):
    """百度语音识别 REST API"""

    TOKEN_URL = "https://aip.baidubce.com/oauth/2.0/token"
    ASR_URL = "https://vop.baidu.com/server_api"

    def __init__(self):
        self._api_key = settings.baidu_api_key
        self._secret_key = settings.baidu_secret_key
        self._token: str | None = None
        self._client = httpx.AsyncClient(timeout=30)

    async def _get_token(self) -> str:
        if self._token:
            return self._token
        response = await self._client.post(
            self.TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": self._api_key,
                "client_secret": self._secret_key,
            },
        )
        response.raise_for_status()
        self._token = response.json()["access_token"]
        return self._token

    async def recognize(self, audio_data: bytes, format: str = "pcm", sample_rate: int = 16000) -> str:
        token = await self._get_token()
        payload = {
            "format": format,
            "rate": sample_rate,
            "channel": 1,
            "cuid": "job_assistant",
            "token": token,
            "speech": base64.b64encode(audio_data).decode("utf-8"),
            "len": len(audio_data),
            "dev_pid": 1537,  # 普通话 + 英文
        }
        response = await self._client.post(self.ASR_URL, json=payload)
        response.raise_for_status()
        result = response.json()

        if result.get("err_no") != 0:
            raise RuntimeError(f"百度 STT 错误: {result.get('err_msg', '未知错误')}")

        return "".join(result.get("result", []))

    async def recognize_stream(self, audio_stream, format: str = "pcm", sample_rate: int = 16000):
        """百度 REST API 不支持流式，收集全部音频后一次性识别"""
        audio_data = b""
        async for chunk in audio_stream:
            audio_data += chunk
        text = await self.recognize(audio_data, format, sample_rate)
        yield {"text": text, "is_final": True}


class BaiduTTS(TTSProvider):
    """百度语音合成 REST API"""

    TTS_URL = "https://tsn.baidu.com/text2audio"

    def __init__(self):
        self._api_key = settings.baidu_api_key
        self._secret_key = settings.baidu_secret_key
        self._token: str | None = None
        self._client = httpx.AsyncClient(timeout=30)

    async def _get_token(self) -> str:
        if self._token:
            return self._token
        response = await self._client.post(
            BaiduSTT.TOKEN_URL,
            data={
                "grant_type": "client_credentials",
                "client_id": self._api_key,
                "client_secret": self._secret_key,
            },
        )
        response.raise_for_status()
        self._token = response.json()["access_token"]
        return self._token

    async def synthesize(self, text: str, voice: str = "default") -> bytes:
        token = await self._get_token()
        per_map = {"default": 0, "male": 1, "female": 0, "duxiaoyao": 3, "duyaya": 4}
        per = per_map.get(voice, 0)

        response = await self._client.post(
            self.TTS_URL,
            data={
                "tex": text,
                "tok": token,
                "cuid": "job_assistant",
                "ctp": 1,
                "lan": "zh",
                "spd": 5,
                "pit": 5,
                "vol": 5,
                "per": per,
                "aue": 6,  # WAV 格式
            },
        )
        content_type = response.headers.get("content-type", "")
        if "audio" in content_type:
            return response.content
        else:
            result = response.json()
            raise RuntimeError(f"百度 TTS 错误: {result.get('err_msg', '未知错误')}")

    async def synthesize_stream(self, text: str, voice: str = "default"):
        """百度 REST API 不支持流式合成, 一次性返回"""
        audio = await self.synthesize(text, voice)
        yield audio
