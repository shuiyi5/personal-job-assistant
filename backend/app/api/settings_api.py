"""设置端点 - 读取/更新 .env 配置"""

import os
import re
from pathlib import Path
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.config.settings import get_settings

router = APIRouter()

# .env 文件路径 (相对于 backend/ 目录)
ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"

# 需要暴露给前端的配置项 (不含敏感的非 LLM 配置)
PROVIDER_CONFIGS = {
    "claude": {"key_field": "ANTHROPIC_API_KEY", "fields": ["ANTHROPIC_API_KEY"]},
    "openai": {"key_field": "OPENAI_API_KEY", "fields": ["OPENAI_API_KEY"]},
    "ollama": {"key_field": None, "fields": ["OLLAMA_BASE_URL"]},
    "deepseek": {"key_field": "DEEPSEEK_API_KEY", "fields": ["DEEPSEEK_API_KEY", "DEEPSEEK_BASE_URL", "DEEPSEEK_MODEL"]},
    "zhipu": {"key_field": "ZHIPU_API_KEY", "fields": ["ZHIPU_API_KEY", "ZHIPU_BASE_URL", "ZHIPU_MODEL"]},
    "moonshot": {"key_field": "MOONSHOT_API_KEY", "fields": ["MOONSHOT_API_KEY", "MOONSHOT_BASE_URL", "MOONSHOT_MODEL"]},
    "dashscope": {"key_field": "DASHSCOPE_API_KEY", "fields": ["DASHSCOPE_API_KEY", "DASHSCOPE_BASE_URL", "DASHSCOPE_MODEL"]},
    "yi": {"key_field": "YI_API_KEY", "fields": ["YI_API_KEY", "YI_BASE_URL", "YI_MODEL"]},
    "siliconflow": {"key_field": "SILICONFLOW_API_KEY", "fields": ["SILICONFLOW_API_KEY", "SILICONFLOW_BASE_URL", "SILICONFLOW_MODEL"]},
    "custom": {"key_field": "CUSTOM_API_KEY", "fields": ["CUSTOM_API_FORMAT", "CUSTOM_BASE_URL", "CUSTOM_API_KEY", "CUSTOM_MODEL"]},
}


def _mask_key(value: str) -> str:
    """对 API Key 做脱敏处理, 只显示前4位和后4位"""
    if not value or len(value) <= 12:
        return value
    return value[:4] + "*" * (len(value) - 8) + value[-4:]


def _read_env() -> dict[str, str]:
    """读取 .env 文件, 返回 {KEY: value} 字典"""
    result: dict[str, str] = {}
    if not ENV_PATH.exists():
        return result
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        m = re.match(r"^([A-Z_][A-Z0-9_]*)=(.*)", line)
        if m:
            val = m.group(2).strip()
            # 去除行内注释 (未被引号包裹的 # 后面的内容)
            if "#" in val and not val.startswith(("'", '"')):
                val = val[:val.index("#")].strip()
            result[m.group(1)] = val
    return result


def _write_env(updates: dict[str, str]) -> None:
    """更新 .env 文件中指定的键值对, 保留注释和格式"""
    if not ENV_PATH.exists():
        # 如果 .env 不存在, 直接写入
        lines = [f"{k}={v}" for k, v in updates.items()]
        ENV_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
        return

    content = ENV_PATH.read_text(encoding="utf-8")
    remaining = dict(updates)

    new_lines = []
    for line in content.splitlines():
        stripped = line.strip()
        if stripped and not stripped.startswith("#"):
            m = re.match(r"^([A-Z_][A-Z0-9_]*)=(.*)", stripped)
            if m and m.group(1) in remaining:
                key = m.group(1)
                new_lines.append(f"{key}={remaining.pop(key)}")
                continue
        new_lines.append(line)

    # 追加 .env 中不存在的新键
    for k, v in remaining.items():
        new_lines.append(f"{k}={v}")

    ENV_PATH.write_text("\n".join(new_lines) + "\n", encoding="utf-8")


def _reload_settings() -> None:
    """清除缓存, 让下一次 get_settings() 重新读取 .env"""
    get_settings.cache_clear()
    # 同时更新模块级别的 settings 引用
    import app.config.settings as mod
    mod.settings = get_settings()


# ── Schemas ──────────────────────────────────────────

class SettingsResponse(BaseModel):
    llm_provider: str
    llm_model: str
    providers: dict  # { provider_name: { field_name: masked_value } }


class SettingsUpdate(BaseModel):
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    env_vars: Optional[dict[str, str]] = None  # { "MOONSHOT_API_KEY": "sk-xxx", ... }


# ── Endpoints ────────────────────────────────────────

@router.get("/settings")
async def get_current_settings() -> SettingsResponse:
    """获取当前设置 (API Key 脱敏)"""
    env = _read_env()
    provider = env.get("LLM_PROVIDER", "claude")
    model = env.get("LLM_MODEL", "")

    providers: dict[str, dict[str, str]] = {}
    for pname, conf in PROVIDER_CONFIGS.items():
        fields: dict[str, str] = {}
        for f in conf["fields"]:
            raw = env.get(f, "")
            # API Key 字段脱敏
            if "API_KEY" in f or "SECRET" in f:
                fields[f] = _mask_key(raw)
            else:
                fields[f] = raw
        providers[pname] = fields

    return SettingsResponse(llm_provider=provider, llm_model=model, providers=providers)


@router.put("/settings")
async def update_settings(req: SettingsUpdate) -> dict:
    """更新设置并写入 .env 文件"""
    updates: dict[str, str] = {}

    if req.llm_provider is not None:
        updates["LLM_PROVIDER"] = req.llm_provider
    if req.llm_model is not None:
        updates["LLM_MODEL"] = req.llm_model
    if req.env_vars:
        for k, v in req.env_vars.items():
            # 跳过脱敏过的值 (包含 ***), 表示用户没有修改
            if "***" in v:
                continue
            updates[k] = v

    if updates:
        _write_env(updates)
        _reload_settings()

    return {"status": "ok", "updated_keys": list(updates.keys())}
