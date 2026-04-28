"""简历工具 - 段落生成、格式化、导出 (结构化 JSON 输出)"""

import asyncio
from typing import Any

from app.schemas.resume import ResumeData
from app.tools.base import BaseTool


def _flatten_schema(schema: dict) -> dict:
    """将包含 $defs/$ref/anyOf 的 JSON Schema 展开为 Claude API 兼容格式"""
    import copy
    schema = copy.deepcopy(schema)

    defs = schema.pop("$defs", {})

    def resolve(obj):
        if isinstance(obj, dict):
            # 解析 $ref
            if "$ref" in obj:
                ref_name = obj["$ref"].split("/")[-1]
                return resolve(copy.deepcopy(defs.get(ref_name, obj)))
            # 将 anyOf: [type, null] 简化为单一类型 (可选字段)
            if "anyOf" in obj:
                non_null = [t for t in obj["anyOf"] if t != {"type": "null"}]
                if len(non_null) == 1:
                    result = resolve(non_null[0])
                    # 保留其他字段 (title, default, description)
                    for k, v in obj.items():
                        if k != "anyOf" and k not in result:
                            result[k] = v
                    return result
            return {k: resolve(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [resolve(item) for item in obj]
        return obj

    return resolve(schema)


class GenerateSectionTool(BaseTool):
    """基于知识库上下文生成简历段落"""

    @property
    def name(self) -> str:
        return "generate_section"

    @property
    def description(self) -> str:
        return "基于从知识库检索到的上下文，准备简历指定段落的结构化数据（如工作经历、技能、项目经验等）。"

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "section_type": {
                    "type": "string",
                    "enum": ["summary", "work_experience", "education", "skills", "projects", "certifications"],
                    "description": "简历段落类型",
                },
                "context": {"type": "string", "description": "从知识库检索到的相关上下文"},
                "job_title": {"type": "string", "description": "目标职位名称，用于内容定制"},
                "style": {
                    "type": "string",
                    "enum": ["professional", "technical", "academic"],
                    "description": "简历风格",
                    "default": "professional",
                },
            },
            "required": ["section_type", "context"],
        }

    async def execute(
        self,
        section_type: str,
        context: str,
        job_title: str = "",
        style: str = "professional",
    ) -> dict:
        return {
            "section_type": section_type,
            "context": context,
            "job_title": job_title,
            "style": style,
            "instruction": (
                f"请根据以上 context 信息，准备简历 {section_type} 段落的结构化数据。"
                f"注意：不要输出 Markdown 文本，请准备好结构化的字段值（如 company、title、highlights 数组等），"
                f"之后统一通过 format_resume 工具组装完整简历。"
                + (f"目标职位: {job_title}。" if job_title else "")
                + f"风格: {style}。"
            ),
        }


class FormatResumeTool(BaseTool):
    """将收集到的简历信息组装为结构化 JSON"""

    @property
    def name(self) -> str:
        return "format_resume"

    @property
    def description(self) -> str:
        return (
            "将收集到的简历信息组装为结构化 JSON 格式。"
            "你必须将所有简历数据填入对应字段（personal、summary、work_experience、education、skills、projects、certifications）。"
            "这是最终输出步骤，调用此工具后简历将呈现给用户。"
        )

    @property
    def input_schema(self) -> dict:
        return _flatten_schema(ResumeData.model_json_schema())

    async def execute(self, **kwargs) -> str:
        # 若调用方未指定 module_order，自动从 JSON 配置文件读取已保存的顺序
        if not kwargs.get('module_order'):
            import json as _json
            from pathlib import Path

            config_path = Path("./data/settings.json")
            if config_path.exists():
                try:
                    def _read_config():
                        return config_path.read_text(encoding="utf-8")
                    text = await asyncio.to_thread(_read_config)
                    cfg = _json.loads(text)
                    order_str = cfg.get("module_order", "")
                    if order_str:
                        kwargs["module_order"] = _json.loads(order_str)
                except Exception:
                    pass

            # 如果 JSON 里也没有，尝试从 settings 的 module_order 配置读
            if not kwargs.get("module_order"):
                try:
                    from app.config.settings import settings
                    mo = getattr(settings, "module_order", None)
                    if mo:
                        kwargs["module_order"] = mo
                except Exception:
                    pass

        data = ResumeData(**kwargs)
        return data.model_dump_json(ensure_ascii=False)


class ExportResumeTool(BaseTool):
    """导出简历为 PDF 或 DOCX"""

    @property
    def name(self) -> str:
        return "export_resume"

    @property
    def description(self) -> str:
        return "将 Markdown 格式的简历导出为 PDF 或 DOCX 文件，返回下载链接。"

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "format": {"type": "string", "enum": ["pdf", "docx", "markdown"], "description": "导出格式"},
                "content": {"type": "string", "description": "完整的 Markdown 简历内容"},
            },
            "required": ["format", "content"],
        }

    async def execute(self, format: str, content: str) -> dict:
        from app.services.resume_service import export_resume
        file_path = await export_resume(content, format)
        return {"format": format, "file_path": file_path, "message": f"简历已导出为 {format.upper()} 格式"}


class UpdateModuleOrderTool(BaseTool):
    """调整简历模块顺序"""

    @property
    def name(self) -> str:
        return "update_module_order"

    @property
    def description(self) -> str:
        return (
            "调整简历模块的显示顺序。可以将某个模块移到最前面或最后面，或者完全自定义顺序。"
            "调整后的顺序会保存为用户偏好，影响所有简历的导出格式。"
        )

    @property
    def input_schema(self) -> dict:
        return {
            "type": "object",
            "properties": {
                "module_order": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "enum": ["personal", "summary", "work_experience", "education", "projects", "skills", "certifications"]
                    },
                    "description": "新的模块顺序数组，包含所有需要显示的模块 ID"
                }
            },
            "required": ["module_order"]
        }

    async def execute(self, module_order: list) -> dict:
        import asyncio, json
        from app.api.settings_api import _save_config, _reload_settings

        # 验证模块顺序列表
        VALID_MODULES = {"personal", "summary", "work_experience", "education", "projects", "skills", "certifications"}
        invalid = [m for m in module_order if m not in VALID_MODULES]
        if invalid:
            return {"status": "error", "message": f"无效的模块: {invalid}，有效模块: {list(VALID_MODULES)}"}

        # 在线程池中执行阻塞 I/O，避免阻塞事件循环
        def _do_save():
            _save_config({"module_order": json.dumps(module_order, ensure_ascii=False)})
            _reload_settings()

        await asyncio.to_thread(_do_save)
        return {"status": "ok", "module_order": module_order, "message": f"模块顺序已更新: {' → '.join(module_order)}"}
