"""PDF OCR 提取 - 检测扫描件并通过 OCR 提取文字"""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def is_scanned_pdf(file_path: str, text: str) -> bool:
    """
    判断 PDF 是否为扫描件（无文字层或文字极少）。

    判断逻辑：提取的文字中有效字符（含汉字、字母、数字）占总字符的比例，
    如果低于 5% 或者绝对字数少于 50，则认为是扫描件。
    """
    if not text:
        return True
    # 统计有效字符（可打印的中英文、字母数字、常用标点）
    import re
    valid_chars = re.findall(r"[\u4e00-\u9fffA-Za-z0-9.,;:!?。，；：！？、''""（）【】]", text)
    # 计算有效字符占比（汉字按1个字符计，英文按半个字符计以平衡token密度差异）
    chinese = sum(1 for c in text if "\u4e00" <= c <= "\u9fff")
    ascii_valid = len(valid_chars) - chinese
    score = chinese * 1.0 + ascii_valid * 0.5
    ratio = score / max(len(text), 1)
    return ratio < 0.05 or score < 50


def extract_text_from_scanned_pdf(file_path: str) -> tuple[str, bool]:
    """
    使用 PyMuPDF + pytesseract 对扫描 PDF 进行 OCR。

    Returns:
        (extracted_text, success)
    """
    try:
        import pytesseract
    except ImportError:
        return "", False

    try:
        import pytesseract
        import fitz  # PyMuPDF
    except ImportError as e:
        logger.warning(f"OCR 依赖未安装: {e}")
        return "", False

    text_parts = []
    try:
        doc = fitz.open(file_path)
        for page_num in range(len(doc)):
            page = doc[page_num]
            # 使用 pytesseract 对页面图像进行 OCR
            pix = page.get_pixmap(dpi=200)
            img_bytes = pix.tobytes("png")
            import io
            img = io.BytesIO(img_bytes)
            page_text = pytesseract.image_to_string(img, lang="chi_sim+eng")
            if page_text:
                text_parts.append(page_text.strip())
        doc.close()
    except Exception as e:
        logger.warning(f"OCR 处理失败 {file_path}: {e}")
        return "", False

    extracted = "\n\n".join(text_parts)
    return extracted, len(extracted.strip()) > 50


def try_ocr_for_pdf(file_path: str) -> str:
    """
    入口函数：给定 PDF 路径，尝试 OCR 并返回提取的文字。
    如果 OCR 失败或返回文字过少，返回空字符串。
    """
    text, ok = extract_text_from_scanned_pdf(file_path)
    if not ok:
        return ""
    return text
