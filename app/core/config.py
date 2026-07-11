from pydantic_settings import BaseSettings
from pydantic import field_validator
import os
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse


def normalize_database_url(url: str) -> str:
    """Normaliza URLs de Aiven para SQLAlchemy + PyMySQL."""
    if url.startswith("mysql://"):
        url = "mysql+pymysql://" + url[len("mysql://"):]
    parsed = urlparse(url)
    if not parsed.query:
        return url
    params = parse_qs(parsed.query, keep_blank_values=True)
    params.pop("ssl-mode", None)
    params.pop("ssl_mode", None)
    flat = {k: v[0] for k, v in params.items()}
    return urlunparse(parsed._replace(query=urlencode(flat)))


class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://user:password@localhost:3306/siniestros_scisp",
    )

    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "tu_clave_secreta_muy_segura_aqui_cambiala",
    )
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "*")
    DB_SSL_VERIFY: str = os.getenv("DB_SSL_VERIFY", "false")

    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "API Conteos SCISP")
    PROJECT_VERSION: str = os.getenv("PROJECT_VERSION", "1.0.0")

    HOST: str = os.getenv("HOST", "0.0.0.0")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info")

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_db_url(cls, value: str) -> str:
        return normalize_database_url(value)

    class Config:
        env_file = ".env"


settings = Settings()
