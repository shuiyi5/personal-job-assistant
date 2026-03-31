"""语义分块器 - 按标题 → 段落 → 句子三级分割"""

import re
from dataclasses import dataclass


@dataclass
class Chunk:
    """文本块"""
    text: str
    index: int
    heading_path: str = ""  # 所属标题路径, e.g. "工作经历 > 项目A"


# 简易 token 估算: 中文1字≈1.5token, 英文1词≈1token
def estimate_tokens(text: str) -> int:
    """估算文本 token 数"""
    chinese_chars = len(re.findall(r"[\u4e00-\u9fff]", text))
    other_words = len(re.findall(r"[a-zA-Z]+", text))
    return int(chinese_chars * 1.5 + other_words)


def split_by_headings(text: str) -> list[tuple[str, str]]:
    """按 Markdown 标题分割, 返回 [(heading, content), ...]"""
    pattern = r"^(#{1,6})\s+(.+)$"
    lines = text.split("\n")
    sections: list[tuple[str, str]] = []
    current_heading = ""
    current_lines: list[str] = []

    for line in lines:
        match = re.match(pattern, line)
        if match:
            if current_lines:
                sections.append((current_heading, "\n".join(current_lines).strip()))
            current_heading = match.group(2).strip()
            current_lines = [line]
        else:
            current_lines.append(line)

    if current_lines:
        sections.append((current_heading, "\n".join(current_lines).strip()))

    return sections


def split_by_paragraphs(text: str) -> list[str]:
    """按双换行分割段落"""
    parts = re.split(r"\n\s*\n", text)
    return [p.strip() for p in parts if p.strip()]


def split_by_sentences(text: str) -> list[str]:
    """按句子分割 (支持中英文标点)"""
    sentences = re.split(r"(?<=[。！？.!?])\s*", text)
    return [s.strip() for s in sentences if s.strip()]


def merge_small_chunks(chunks: list[str], min_tokens: int = 100) -> list[str]:
    """合并过小的块"""
    merged = []
    buffer = ""
    for chunk in chunks:
        if buffer:
            combined = buffer + "\n\n" + chunk
            if estimate_tokens(combined) <= 1000:
                buffer = combined
            else:
                merged.append(buffer)
                buffer = chunk
        else:
            buffer = chunk

    if buffer:
        merged.append(buffer)
    return merged


def chunk_text(
    text: str,
    max_tokens: int = 1000,
    min_tokens: int = 100,
    overlap_tokens: int = 100,
) -> list[Chunk]:
    """
    语义分块主函数:
    1. 按标题分割
    2. 超长段按段落再分
    3. 超长段落按句子再分
    4. 合并过短的块
    5. 添加重叠
    """
    sections = split_by_headings(text)
    raw_chunks: list[tuple[str, str]] = []  # (heading, text)

    for heading, content in sections:
        if estimate_tokens(content) <= max_tokens:
            raw_chunks.append((heading, content))
        else:
            # 按段落再分
            paragraphs = split_by_paragraphs(content)
            group = []
            group_tokens = 0

            for para in paragraphs:
                para_tokens = estimate_tokens(para)
                if para_tokens > max_tokens:
                    # 段落太长, 按句子分
                    if group:
                        raw_chunks.append((heading, "\n\n".join(group)))
                        group = []
                        group_tokens = 0

                    sentences = split_by_sentences(para)
                    sent_group = []
                    sent_tokens = 0
                    for sent in sentences:
                        st = estimate_tokens(sent)
                        if sent_tokens + st > max_tokens and sent_group:
                            raw_chunks.append((heading, "".join(sent_group)))
                            sent_group = []
                            sent_tokens = 0
                        sent_group.append(sent)
                        sent_tokens += st
                    if sent_group:
                        raw_chunks.append((heading, "".join(sent_group)))
                elif group_tokens + para_tokens > max_tokens:
                    raw_chunks.append((heading, "\n\n".join(group)))
                    group = [para]
                    group_tokens = para_tokens
                else:
                    group.append(para)
                    group_tokens += para_tokens

            if group:
                raw_chunks.append((heading, "\n\n".join(group)))

    # 合并过短的块
    texts = [t for _, t in raw_chunks]
    headings = [h for h, _ in raw_chunks]
    merged_texts = merge_small_chunks(texts, min_tokens)

    # 构建最终 Chunk 对象 (带重叠)
    chunks = []
    for i, text in enumerate(merged_texts):
        # 简单重叠: 取上一个块的最后 overlap_tokens 部分作为前缀
        if i > 0 and overlap_tokens > 0:
            prev_text = merged_texts[i - 1]
            # 取末尾约 overlap_tokens 的字符
            overlap_chars = overlap_tokens  # 粗略估算
            overlap_prefix = prev_text[-overlap_chars:] if len(prev_text) > overlap_chars else ""
            if overlap_prefix:
                text = f"...{overlap_prefix}\n\n{text}"

        heading = headings[i] if i < len(headings) else ""
        chunks.append(Chunk(text=text, index=i, heading_path=heading))

    return chunks
