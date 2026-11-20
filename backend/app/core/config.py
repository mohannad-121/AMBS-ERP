from functools import lru_cache
from decimal import Decimal
from typing import Literal
from urllib.parse import urlsplit

from pydantic import Field, SecretStr, model_validator, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import URL


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    app_env: Literal["development", "test", "production"] = "development"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    image_storage_dir: str = "/data/item-images"
    durable_review_enabled: bool = False
    synthetic_customer_import_enabled: bool = False
    durable_review_storage_dir: str = "/data/synthetic-import-review"
    ors_api_key: SecretStr = SecretStr("")
    routing_provider: Literal["ors"] = "ors"
    routing_timeout_seconds: float = Field(default=8, ge=1, le=10)
    routing_requests_per_minute: int = Field(default=30, ge=1, le=1000)
    routing_requests_per_day: int = Field(default=1000, ge=1, le=100000)
    transport_rate_per_km: Decimal | None = Field(default=None, ge=0, le=100000)
    transport_fixed_rate: Decimal | None = Field(default=None, ge=0, le=100000)
    transport_currency: str = Field(default="AED", pattern=r"^[A-Z]{3}$")
    postgres_host: str = "db"
    postgres_port: int = Field(default=5432, ge=1, le=65535)
    postgres_db: str
    postgres_user: str
    postgres_password: SecretStr
    auth_allowed_origins: list[str] = ["http://127.0.0.1:3000", "http://localhost:3000"]
    auth_cookie_secure: bool = False
    auth_bff_secret: SecretStr = SecretStr("")
    session_idle_seconds: int = Field(default=1800, ge=60, le=86400)
    session_absolute_seconds: int = Field(default=28800, ge=300, le=604800)
    login_identity_limit: int = Field(default=5, ge=1, le=100)
    login_identity_window_seconds: int = Field(default=300, ge=30, le=3600)
    login_source_limit: int = Field(default=60, ge=1, le=1000)
    login_source_window_seconds: int = Field(default=60, ge=30, le=3600)

    @field_validator('transport_rate_per_km','transport_fixed_rate',mode='before')
    @classmethod
    def optional_rate(cls,value):
        return None if value=='' else value

    @model_validator(mode="after")
    def validate_authentication(self):
        if self.transport_rate_per_km is not None and self.transport_fixed_rate is not None:
            raise ValueError("Configure either the approved per-km rate or fixed trip rate")
        if self.session_idle_seconds > self.session_absolute_seconds:
            raise ValueError("Idle session duration must fit within absolute duration")
        if not self.auth_allowed_origins:
            raise ValueError("At least one browser origin is required")
        for origin in self.auth_allowed_origins:
            parsed = urlsplit(origin)
            if (
                parsed.scheme not in {"http", "https"}
                or not parsed.hostname
                or parsed.username
                or parsed.password
                or parsed.path
                or parsed.query
                or parsed.fragment
                or origin.endswith("/")
            ):
                raise ValueError(
                    "Authentication origins must be explicit HTTP(S) origins"
                )
        if self.app_env == "production":
            if not self.auth_cookie_secure or any(
                not origin.startswith("https://")
                for origin in self.auth_allowed_origins
            ):
                raise ValueError(
                    "Production authentication requires HTTPS origins and Secure cookies"
                )
            if len(
                self.auth_bff_secret.get_secret_value()
            ) < 32 or self.auth_bff_secret.get_secret_value().startswith("replace_"):
                raise ValueError(
                    "Production requires a BFF secret of at least 32 characters"
                )
        return self

    @property
    def session_cookie_name(self) -> str:
        return "__Host-ambs_session" if self.auth_cookie_secure else "ambs_session"

    @property
    def csrf_cookie_name(self) -> str:
        return "__Host-ambs_csrf" if self.auth_cookie_secure else "ambs_csrf"

    @property
    def database_url(self) -> URL:
        return URL.create(
            "postgresql+psycopg",
            username=self.postgres_user,
            password=self.postgres_password.get_secret_value(),
            host=self.postgres_host,
            port=self.postgres_port,
            database=self.postgres_db,
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
