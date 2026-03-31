"""应用配置 - 基于 pydantic_settings 的环境变量管理"""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # LLM 提供商
    llm_provider: str = "claude"
    llm_model: str = "claude-sonnet-4-20250514"

    # --- API Keys ---
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    ollama_base_url: str = "http://localhost:11434"

    # DeepSeek
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com"
    deepseek_model: str = "deepseek-chat"

    # 智谱 GLM (Zhipu)
    zhipu_api_key: str = ""
    zhipu_base_url: str = "https://open.bigmodel.cn/api/paas/v4"
    zhipu_model: str = "glm-4-flash"

    # 月之暗面 Kimi (Moonshot)
    moonshot_api_key: str = ""
    moonshot_base_url: str = "https://api.moonshot.cn/v1"
    moonshot_model: str = "moonshot-v1-8k"

    # 通义千问 Qwen (DashScope)
    dashscope_api_key: str = ""
    dashscope_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    dashscope_model: str = "qwen-plus"

    # 零一万物 Yi
    yi_api_key: str = ""
    yi_base_url: str = "https://api.lingyiwanwu.com/v1"
    yi_model: str = "yi-large"

    # SiliconFlow (硅基流动 - 聚合多模型)
    siliconflow_api_key: str = ""
    siliconflow_base_url: str = "https://api.siliconflow.cn/v1"
    siliconflow_model: str = "deepseek-ai/DeepSeek-V3"

    # 自定义提供商 (填 base_url + api_key 接入任意第三方)
    custom_api_format: str = "openai"  # openai | claude
    custom_base_url: str = ""
    custom_api_key: str = ""
    custom_model: str = ""

    # Embedding
    embedding_provider: str = "chroma"
    embedding_model: str = "all-MiniLM-L6-v2"

    # ChromaDB
    chroma_db_path: str = "./data/chroma_db"
    chroma_collection: str = "job_seeking_kb"

    # 讯飞语音
    iflytek_app_id: str = ""
    iflytek_api_key: str = ""
    iflytek_api_secret: str = ""

    # 百度语音
    baidu_app_id: str = ""
    baidu_api_key: str = ""
    baidu_secret_key: str = ""

    # 应用
    debug: bool = True
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    upload_dir: str = "./data/uploads"
    max_upload_size_mb: int = 20

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
