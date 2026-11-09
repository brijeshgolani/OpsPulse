import os
from typing import List
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "qwen/qwen3.8-27b")
    SUPABASE_POSTGRES_URL: str = os.getenv("SUPABASE_POSTGRES_URL", "")
    LANGFUSE_PUBLIC_KEY: str = os.getenv("LANGFUSE_PUBLIC_KEY", "")
    LANGFUSE_SECRET_KEY: str = os.getenv("LANGFUSE_SECRET_KEY", "")
    LANGFUSE_BASE_URL: str = Field(
        default_factory=lambda: os.getenv(
            "LANGFUSE_BASE_URL",
            os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com"),
        ),
        validation_alias=AliasChoices("LANGFUSE_BASE_URL", "LANGFUSE_HOST"),
    )
    GITHUB_PERSONAL_ACCESS_TOKEN: str = os.getenv("GITHUB_PERSONAL_ACCESS_TOKEN", "")
    TARGET_GITHUB_REPO: str = os.getenv("TARGET_GITHUB_REPO", "owner/repo")
    PORT: int = int(os.getenv("PORT", 8000))
    HOST: str = os.getenv("HOST", "0.0.0.0")
    CORS_ORIGINS: List[str] = ["*"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

settings = Settings()
