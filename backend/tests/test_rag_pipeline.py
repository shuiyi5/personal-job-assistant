"""RAG 管线测试"""

import os
import tempfile
import pytest
from app.rag.loader import load_document, load_txt
from app.rag.chunker import chunk_text, estimate_tokens, split_by_headings


class TestDocumentLoader:
    def test_load_txt(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8") as f:
            f.write("这是一份测试文档\n包含多行内容")
            f.flush()
            doc = load_txt(f.name)
            assert "测试文档" in doc.text
            assert doc.metadata["file_type"] == "txt"
        os.unlink(f.name)

    def test_load_document_auto_detect(self):
        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8") as f:
            f.write("自动检测文件类型")
            f.flush()
            doc = load_document(f.name)
            assert doc.metadata["file_type"] == "txt"
        os.unlink(f.name)

    def test_unsupported_format(self):
        with pytest.raises(ValueError, match="不支持的文件类型"):
            load_document("test.xyz")


class TestChunker:
    def test_estimate_tokens_chinese(self):
        text = "这是一段中文文本"
        tokens = estimate_tokens(text)
        assert tokens > 0

    def test_estimate_tokens_english(self):
        text = "This is an English text with some words"
        tokens = estimate_tokens(text)
        assert tokens >= 8  # 至少有 8 个英文单词

    def test_split_by_headings(self):
        text = "# 标题一\n内容一\n## 标题二\n内容二"
        sections = split_by_headings(text)
        assert len(sections) == 2
        assert sections[0][0] == "标题一"
        assert sections[1][0] == "标题二"

    def test_chunk_text_basic(self):
        text = "# 工作经历\n\n在A公司担任后端工程师。\n\n# 教育背景\n\n毕业于B大学计算机系。"
        chunks = chunk_text(text)
        assert len(chunks) >= 1
        assert all(c.text for c in chunks)

    def test_chunk_text_long_section(self):
        # 创建一个超长段落
        long_text = "# 项目经验\n\n" + "这是一段很长的项目描述。" * 200
        chunks = chunk_text(long_text, max_tokens=500)
        assert len(chunks) > 1

    def test_chunk_preserves_heading(self):
        text = "# 技能\n\nPython, Java, Go"
        chunks = chunk_text(text)
        assert chunks[0].heading_path == "技能"


class TestRouterKeywords:
    def test_resume_intent(self):
        from app.agents.router import classify_by_keywords
        assert classify_by_keywords("帮我生成简历") == "resume"
        assert classify_by_keywords("编辑简历的工作经历") == "resume"

    def test_interview_intent(self):
        from app.agents.router import classify_by_keywords
        assert classify_by_keywords("给我出几道面试题") == "interview_prep"

    def test_mock_interview_intent(self):
        from app.agents.router import classify_by_keywords
        assert classify_by_keywords("开始模拟面试") == "mock_interview"

    def test_kb_intent(self):
        from app.agents.router import classify_by_keywords
        assert classify_by_keywords("上传文档到知识库") == "knowledge_base"

    def test_no_match(self):
        from app.agents.router import classify_by_keywords
        assert classify_by_keywords("今天天气怎么样") is None
