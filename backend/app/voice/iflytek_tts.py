"""讯飞语音合成 (TTS) - WebSocket API"""

import base64
import hashlib
import hmac
import json
from datetime import datetime
from urllib.parse import urlencode, urlparse

import websockets

from app.config.settings import settings
from app.voice.base import TTSProvider


class IflytekTTS(TTSProvider):
    """讯飞在线语音合成 WebSocket API"""

    WS_URL = "wss://tts-api.xfyun.cn/v2/tts"

    def __init__(self):
        self._app_id = settings.iflytek_app_id
        self._api_key = settings.iflytek_api_key
        self._api_secret = settings.iflytek_api_secret

    def _create_auth_url(self) -> str:
        url_parts = urlparse(self.WS_URL)
        now = datetime.utcnow()
        date = now.strftime("%a, %d %b %Y %H:%M:%S GMT")

        signature_origin = (
            f"host: {url_parts.hostname}\n"
            f"date: {date}\n"
            f"GET {url_parts.path} HTTP/1.1"
        )
        signature_sha = hmac.new(
            self._api_secret.encode("utf-8"),
            signature_origin.encode("utf-8"),
            hashlib.sha256,
        ).digest()
        signature = base64.b64encode(signature_sha).decode("utf-8")

        authorization_origin = (
            f'api_key="{self._api_key}", '
            f'algorithm="hmac-sha256", '
            f'headers="host date request-line", '
            f'signature="{signature}"'
        )
        authorization = base64.b64encode(authorization_origin.encode("utf-8")).decode("utf-8")

        params = {
            "authorization": authorization,
            "date": date,
            "host": url_parts.hostname,
        }
        return f"{self.WS_URL}?{urlencode(params)}"

    async def synthesize(self, text: str, voice: str = "xiaoyan") -> bytes:
        """合成完整音频"""
        url = self._create_auth_url()
        audio_data = b""

        async with websockets.connect(url) as ws:
            request = {
                "common": {"app_id": self._app_id},
                "business": {
                    "aue": "raw",
                    "auf": "audio/L16;rate=16000",
                    "vcn": voice,
                    "tte": "utf8",
                    "speed": 50,
                    "volume": 50,
                    "pitch": 50,
                },
                "data": {
                    "status": 2,
                    "text": base64.b64encode(text.encode("utf-8")).decode("utf-8"),
                },
            }
            await ws.send(json.dumps(request))

            while True:
                result = await ws.recv()
                result = json.loads(result)

                if result.get("code") != 0:
                    raise RuntimeError(f"讯飞 TTS 错误: {result.get('message', '未知错误')}")

                data = result.get("data", {})
                audio = data.get("audio", "")
                if audio:
                    audio_data += base64.b64decode(audio)

                if data.get("status") == 2:
                    break

        return audio_data

    async def synthesize_stream(self, text: str, voice: str = "xiaoyan"):
        """流式合成"""
        url = self._create_auth_url()

        async with websockets.connect(url) as ws:
            request = {
                "common": {"app_id": self._app_id},
                "business": {
                    "aue": "raw",
                    "auf": "audio/L16;rate=16000",
                    "vcn": voice,
                    "tte": "utf8",
                    "speed": 50,
                    "volume": 50,
                    "pitch": 50,
                },
                "data": {
                    "status": 2,
                    "text": base64.b64encode(text.encode("utf-8")).decode("utf-8"),
                },
            }
            await ws.send(json.dumps(request))

            while True:
                result = await ws.recv()
                result = json.loads(result)

                if result.get("code") != 0:
                    raise RuntimeError(f"讯飞 TTS 错误: {result.get('message')}")

                data = result.get("data", {})
                audio = data.get("audio", "")
                if audio:
                    yield base64.b64decode(audio)

                if data.get("status") == 2:
                    break
