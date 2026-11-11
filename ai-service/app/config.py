"""Central configuration for the BNK-10 AI service (pydantic-settings)."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Service
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    ENVIRONMENT: str = "development"

    # LLM provider: api (strictly Cloud LLM API gateway)
    LLM_PROVIDER: str = "api"
    API_KEY: str = "sk-ONhgoAlvALMotu6Br4UwrQ"
    API_BASE_URL: str = "http://10.160.0.2:4000/v1"
    LLM_MODEL: str = "glm-5.3-flash"
    LLM_TIMEOUT_SECONDS: int = 25
    LLM_MAX_RETRIES: int = 2

    # Pipeline limits (bounded loops / retries per the platform bar)
    NBA_MAX_CANDIDATES: int = 3
    NBA_MAX_FINAL: int = 5
    LLM_VALIDATE_RETRIES: int = 2

    # Evals gate: run fails when overall score is below this bar
    EVAL_GATE: float = 0.85

    # Safety
    PII_MASKING_ENABLED: bool = True
    INJECTION_GUARD_ENABLED: bool = True

    # CORS: explicit origins only (no wildcard-with-credentials)
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:4173"

    # OpenTelemetry: "console" exporter or an OTLP http endpoint (e.g. http://localhost:4318)
    OTEL_EXPORTER: str = "console"
    OTEL_ENDPOINT: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
