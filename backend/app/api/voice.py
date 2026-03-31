"""语音面试 WebSocket 端点"""

import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.agents.mock_interview_agent import create_mock_interview_agent
from app.models.base import get_llm_provider
from app.voice.pipeline import VoicePipeline

router = APIRouter()


@router.websocket("/voice/interview")
async def voice_interview(ws: WebSocket):
    """
    WebSocket 语音面试协议:
    Client → Server (JSON): {"type": "start", "config": {...}}
    Client → Server (binary): 音频数据 (PCM 16kHz)
    Server → Client (JSON): {"type": "transcript", "text": "...", "is_final": true}
    Server → Client (JSON): {"type": "agent_response", "text": "..."}
    Server → Client (binary): TTS 音频数据
    Client → Server (JSON): {"type": "stop"}
    """
    await ws.accept()

    provider = get_llm_provider()
    agent = create_mock_interview_agent(provider)
    history: list[dict] = []

    try:
        pipeline = VoicePipeline()
    except RuntimeError as e:
        await ws.send_json({"type": "error", "message": str(e)})
        await ws.close()
        return

    try:
        # 等待开始信号
        start_msg = await ws.receive_json()
        if start_msg.get("type") != "start":
            await ws.send_json({"type": "error", "message": "Expected 'start' message"})
            await ws.close()
            return

        # Agent 开场白
        opening = await agent.invoke("请开始面试，先做自我介绍并说明面试流程。", history)
        history.append({"role": "user", "content": "请开始面试，先做自我介绍并说明面试流程。"})
        history.append({"role": "assistant", "content": opening})

        await ws.send_json({"type": "agent_response", "text": opening})

        # TTS: 开场白 → 音频
        try:
            audio = await pipeline.text_to_audio(opening)
            await ws.send_bytes(audio)
        except Exception:
            pass  # TTS 失败不阻断面试

        # 面试循环
        while True:
            message = await ws.receive()

            if "text" in message:
                data = json.loads(message["text"])
                if data.get("type") == "stop":
                    # 面试结束: 让 Agent 给出总结
                    summary = await agent.invoke("面试结束，请给出总体评价和反馈。", history)
                    history.append({"role": "user", "content": "面试结束，请给出总体评价和反馈。"})
                    history.append({"role": "assistant", "content": summary})
                    await ws.send_json({"type": "agent_response", "text": summary})
                    try:
                        audio = await pipeline.text_to_audio(summary)
                        await ws.send_bytes(audio)
                    except Exception:
                        pass
                    await ws.send_json({"type": "done"})
                    break

                elif data.get("type") == "text_input":
                    # 文字输入模式 (备选)
                    user_text = data.get("text", "")
                    if user_text:
                        response = await agent.invoke(user_text, history)
                        history.append({"role": "user", "content": user_text})
                        history.append({"role": "assistant", "content": response})
                        await ws.send_json({"type": "agent_response", "text": response})
                        try:
                            audio = await pipeline.text_to_audio(response)
                            await ws.send_bytes(audio)
                        except Exception:
                            pass

            elif "bytes" in message:
                # 音频数据 → STT → Agent → TTS
                audio_data = message["bytes"]
                try:
                    user_text = await pipeline.audio_to_text(audio_data)
                    await ws.send_json({"type": "transcript", "text": user_text, "is_final": True})

                    if user_text.strip():
                        response = await agent.invoke(user_text, history)
                        history.append({"role": "user", "content": user_text})
                        history.append({"role": "assistant", "content": response})
                        await ws.send_json({"type": "agent_response", "text": response})

                        try:
                            audio = await pipeline.text_to_audio(response)
                            await ws.send_bytes(audio)
                        except Exception:
                            pass
                except Exception as e:
                    await ws.send_json({"type": "error", "message": f"语音识别失败: {e}"})

    except WebSocketDisconnect:
        pass
