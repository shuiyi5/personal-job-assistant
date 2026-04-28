"""文档管理端点"""

import os
import uuid
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from app.config.settings import settings
from app.rag.embedder import index_document, remove_document
from app.rag.store import list_all_documents
from app.schemas.document import DocumentInfo, DocumentList

router = APIRouter()


@router.post("/documents/upload", response_model=DocumentInfo)
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str = Form("general"),
):
    """上传文档并索引到知识库"""
    # 验证文件类型
    allowed = {".pdf", ".docx", ".txt", ".md"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed:
        raise HTTPException(400, f"不支持的文件类型: {ext} (支持: {', '.join(allowed)})")

    # 验证文件大小
    content = await file.read()
    if len(content) > settings.max_upload_size_bytes:
        raise HTTPException(400, f"文件过大 (上限: {settings.max_upload_size_mb}MB)")

    # 保存文件
    os.makedirs(settings.upload_dir, exist_ok=True)
    doc_id = str(uuid.uuid4())
    save_path = os.path.join(settings.upload_dir, f"{doc_id}{ext}")
    with open(save_path, "wb") as f:
        f.write(content)

    # 索引
    try:
        result = await index_document(save_path, doc_type=doc_type, doc_id=doc_id)
    except Exception as e:
        os.remove(save_path)
        raise HTTPException(500, f"文档索引失败: {e}")

    return DocumentInfo(
        doc_id=result["doc_id"],
        filename=result["filename"],
        doc_type=doc_type,
        chunk_count=result["chunk_count"],
        is_ocr=result.get("is_ocr", False),
    )


@router.get("/documents", response_model=DocumentList)
async def list_documents(doc_type: Optional[str] = None):
    """列出所有已上传的文档，可按 doc_type 过滤"""
    docs = list_all_documents(doc_type=doc_type)
    items = [DocumentInfo(**d) for d in docs]
    return DocumentList(documents=items, total=len(items))


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """删除文档"""
    await remove_document(doc_id)

    # 尝试删除物理文件
    upload_dir = settings.upload_dir
    for filename in os.listdir(upload_dir):
        if filename.startswith(doc_id):
            os.remove(os.path.join(upload_dir, filename))
            break

    return {"ok": True, "doc_id": doc_id}
