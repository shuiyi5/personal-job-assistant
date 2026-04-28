"""设置端点 - 读取/更新配置 (支持 .env 和 JSON 持久化)"""

import json
import os
import re
from pathlib import Path
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.config.settings import get_settings

router = APIRouter()

# .env 文件路径 (本地开发)
ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"
# JSON 配置文件路径 (Docker/Railway 部署)
CONFIG_PATH = Path("./data/settings.json")

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


def _read_config() -> dict[str, str]:
    """读取配置: 优先 JSON 文件, 回退到 .env 文件, 最后回退到环境变量"""
    result: dict[str, str] = {}

    # 1. 尝试读取 JSON 配置文件 (Docker/Railway)
    if CONFIG_PATH.exists():
        try:
            with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass

    # 2. 尝试读取 .env 文件 (本地开发)
    if ENV_PATH.exists():
        result = _read_env()

    # 3. 回退到环境变量
    if not result:
        for key in ["LLM_PROVIDER", "LLM_MODEL"] + [
            f for conf in PROVIDER_CONFIGS.values() for f in conf["fields"]
        ]:
            val = os.getenv(key)
            if val:
                result[key] = val

    return result


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
            if "#" in val and not val.startswith(("'", '"')):
                val = val[:val.index("#")].strip()
            result[m.group(1)] = val
    return result


def _save_config(updates: dict[str, str]) -> None:
    """保存配置: 写入 JSON 文件, 同时更新环境变量"""
    existing = _read_config()
    existing.update(updates)

    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(existing, f, ensure_ascii=False, indent=2)

    for k, v in updates.items():
        os.environ[k] = v

    if ENV_PATH.exists():
        _write_env(updates)


def _write_env(updates: dict[str, str]) -> None:
    """更新 .env 文件中指定的键值对, 保留注释和格式"""
    if not ENV_PATH.exists():
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

    for k, v in remaining.items():
        new_lines.append(f"{k}={v}")

    ENV_PATH.write_text("\n".join(new_lines) + "\n", encoding="utf-8")


def _reload_settings() -> None:
    """清除缓存, 让下一次 get_settings() 重新读取"""
    get_settings.cache_clear()
    import app.config.settings as mod
    mod.settings = get_settings()


# ── Schemas ──────────────────────────────────────────

class SettingsResponse(BaseModel):
    llm_provider: str
    llm_model: str
    providers: dict
    module_order: list[str]
    resume_edit_mode: str = "panel"


class SettingsUpdate(BaseModel):
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    env_vars: Optional[dict[str, str]] = None
    module_order: Optional[list[str]] = None
    resume_edit_mode: Optional[str] = None


# ── Endpoints ────────────────────────────────────────

@router.get("/settings")
async def get_current_settings() -> SettingsResponse:
    """获取当前设置 (API Key 脱敏)"""
    env = _read_config()
    provider = env.get("LLM_PROVIDER", "claude")
    model = env.get("LLM_MODEL", "")

    providers: dict[str, dict[str, str]] = {}
    for pname, conf in PROVIDER_CONFIGS.items():
        fields: dict[str, str] = {}
        for f in conf["fields"]:
            raw = env.get(f, "")
            if "API_KEY" in f or "SECRET" in f:
                fields[f] = _mask_key(raw)
            else:
                fields[f] = raw
        providers[pname] = fields

    # 读取 module_order，如果不存在则使用默认顺序
    module_order_str = env.get("module_order", "")
    if module_order_str:
        try:
            import json
            module_order = json.loads(module_order_str)
        except:
            module_order = ["personal", "summary", "work_experience", "education", "projects", "skills", "certifications"]
    else:
        module_order = ["personal", "summary", "work_experience", "education", "projects", "skills", "certifications"]

    return SettingsResponse(llm_provider=provider, llm_model=model, providers=providers, module_order=module_order, resume_edit_mode=env.get("resume_edit_mode", "panel"))


@router.put("/settings")
async def update_settings(req: SettingsUpdate) -> dict:
    """更新设置并持久化"""
    updates: dict[str, str] = {}

    if req.llm_provider is not None:
        updates["LLM_PROVIDER"] = req.llm_provider
    if req.llm_model is not None:
        updates["LLM_MODEL"] = req.llm_model
    if req.env_vars:
        for k, v in req.env_vars.items():
            if "***" in v:
                continue
            updates[k] = v
    if req.module_order is not None:
        import json
        updates["module_order"] = json.dumps(req.module_order, ensure_ascii=False)
    if req.resume_edit_mode is not None:
        updates["resume_edit_mode"] = req.resume_edit_mode

    if updates:
        _save_config(updates)
        _reload_settings()

    return {"status": "ok", "updated_keys": list(updates.keys())}
