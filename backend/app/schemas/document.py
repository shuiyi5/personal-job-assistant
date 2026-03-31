"""文档相关 Pydantic 模型"""

from pydantic import BaseModel


class DocumentInfo(BaseModel):
    doc_id: str
    filename: str
    doc_type: str
    chunk_count: int = 0
    upload_date: str = ""


class DocumentList(BaseModel):
    documents: list[DocumentInfo]
    total: int
