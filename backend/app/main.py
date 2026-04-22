"""个人求职辅助文档库 - FastAPI 入口"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    os.makedirs(settings.upload_dir, exist_ok=True)
    os.makedirs(settings.chroma_db_path, exist_ok=True)

    from app.rag.store import get_chroma_collection
    get_chroma_collection()
    print(f"ChromaDB 已初始化: {settings.chroma_db_path}")

    yield

    print("应用关闭")


app = FastAPI(
    title="求职辅助文档库",
    description="集成 RAG 检索的个人求职辅助系统",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Railway health check（根路径也返回 200）
@app.get("/")
async def root():
    return {"status": "ok"}


def register_routers():
    from app.api import chat, documents, resume, interview, voice, health, settings_api
    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(chat.router, prefix="/api", tags=["chat"])
    app.include_router(documents.router, prefix="/api", tags=["documents"])
    app.include_router(resume.router, prefix="/api", tags=["resume"])
    app.include_router(interview.router, prefix="/api", tags=["interview"])
    app.include_router(voice.router, prefix="/api", tags=["voice"])
    app.include_router(settings_api.router, prefix="/api", tags=["settings"])


register_routers()
