from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    # Configuración de base de datos
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://user:password@localhost:3306/siniestros_scisp"
    )

    # Configuración de autenticación
    SECRET_KEY: str = os.getenv(
        "SECRET_KEY",
        "tu_clave_secreta_muy_segura_aqui_cambiala"
    )
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

    # CORS: lista de orígenes separados por coma. Usar "*" para permitir todo (solo dev).
    ALLOWED_ORIGINS: str = os.getenv("ALLOWED_ORIGINS", "*")

    # SSL para MySQL (Aiven). false = TLS sin verificación estricta del CA (serverless).
    DB_SSL_VERIFY: str = os.getenv("DB_SSL_VERIFY", "false")

    # Configuración de la aplicación
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "API Conteos SCISP")
    PROJECT_VERSION: str = os.getenv("PROJECT_VERSION", "1.0.0")

    # Servidor
    HOST: str = os.getenv("HOST", "0.0.0.0")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info")

    class Config:
        env_file = ".env"

settings = Settings()
