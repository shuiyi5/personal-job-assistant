"""讯飞语音识别 (STT) - WebSocket 流式识别"""

import base64
import hashlib
import hmac
import json
import time
from datetime import datetime
from urllib.parse import urlencode, urlparse

import websockets

from app.config.settings import settings
from app.voice.base import STTProvider


class IflytekSTT(STTProvider):
    """讯飞实时语音识别 WebSocket API"""

    WS_URL = "wss://iat-api.xfyun.cn/v2/iat"

    def __init__(self):
        self._app_id = settings.iflytek_app_id
        self._api_key = settings.iflytek_api_key
        self._api_secret = settings.iflytek_api_secret

    def _create_auth_url(self) -> str:
        """生成带鉴权的 WebSocket URL (HMAC-SHA256)"""
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

    async def recognize(self, audio_data: bytes, format: str = "pcm", sample_rate: int = 16000) -> str:
        """一次性识别完整音频"""
        url = self._create_auth_url()
        full_text = ""

        async with websockets.connect(url) as ws:
            # 发送音频数据 (分帧)
            frame_size = 8000  # 每帧 8000 字节
            status = 0  # 0=first, 1=continue, 2=last

            for i in range(0, len(audio_data), frame_size):
                chunk = audio_data[i:i + frame_size]
                is_last = (i + frame_size >= len(audio_data))
                status = 2 if is_last else (0 if i == 0 else 1)

                data = {
                    "common": {"app_id": self._app_id} if status == 0 else None,
                    "business": {
                        "language": "zh_cn",
                        "domain": "iat",
                        "accent": "mandarin",
                        "vad_eos": 3000,
                    } if status == 0 else None,
                    "data": {
                        "status": status,
                        "format": f"audio/L16;rate={sample_rate}",
                        "encoding": "raw",
                        "audio": base64.b64encode(chunk).decode("utf-8"),
                    },
                }
                # 清理 None 值
                data = {k: v for k, v in data.items() if v is not None}
                await ws.send(json.dumps(data))

            # 接收识别结果
            while True:
                result = await ws.recv()
                result = json.loads(result)
                if result.get("code") != 0:
                    raise RuntimeError(f"讯飞 STT 错误: {result.get('message', '未知错误')}")

                data = result.get("data", {})
                ws_result = data.get("result", {})
                if ws_result:
                    words = ws_result.get("ws", [])
                    for w in words:
                        for cw in w.get("cw", []):
                            full_text += cw.get("w", "")

                if data.get("status") == 2:
                    break

        return full_text

    async def recognize_stream(self, audio_stream, format: str = "pcm", sample_rate: int = 16000):
        """流式识别"""
        url = self._create_auth_url()

        async with websockets.connect(url) as ws:
            frame_index = 0

            async for chunk in audio_stream:
                status = 0 if frame_index == 0 else 1
                data = {
                    "data": {
                        "status": status,
                        "format": f"audio/L16;rate={sample_rate}",
                        "encoding": "raw",
                        "audio": base64.b64encode(chunk).decode("utf-8"),
                    },
                }
                if status == 0:
                    data["common"] = {"app_id": self._app_id}
                    data["business"] = {
                        "language": "zh_cn",
                        "domain": "iat",
                        "accent": "mandarin",
                        "vad_eos": 3000,
                    }
                await ws.send(json.dumps(data))
                frame_index += 1

                # 尝试接收结果 (非阻塞)
                try:
                    result = await asyncio.wait_for(ws.recv(), timeout=0.1)
                    result = json.loads(result)
                    if result.get("code") == 0:
                        text = self._extract_text(result)
                        is_final = result.get("data", {}).get("status") == 2
                        yield {"text": text, "is_final": is_final}
                except Exception:
                    pass

            # 发送结束帧
            await ws.send(json.dumps({"data": {"status": 2, "format": f"audio/L16;rate={sample_rate}", "encoding": "raw", "audio": ""}}))

            # 接收剩余结果
            while True:
                result = await ws.recv()
                result = json.loads(result)
                if result.get("code") == 0:
                    text = self._extract_text(result)
                    is_final = result.get("data", {}).get("status") == 2
                    yield {"text": text, "is_final": is_final}
                    if is_final:
                        break

    @staticmethod
    def _extract_text(result: dict) -> str:
        words = result.get("data", {}).get("result", {}).get("ws", [])
        text = ""
        for w in words:
            for cw in w.get("cw", []):
                text += cw.get("w", "")
        return text
