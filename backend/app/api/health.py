"""健康检查端点"""

from fastapi import APIRouter

from app.rag.store import get_collection_count

router = APIRouter()


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "kb_documents": get_collection_count(),
    }
