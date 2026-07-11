from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
import os

_engine = None
_SessionLocal = None


def _build_connect_args() -> dict:
    connect_args: dict = {"charset": "utf8mb4"}
    if settings.DATABASE_URL.startswith("mysql"):
        connect_args["connect_timeout"] = 10
        verify_db_ssl = settings.DB_SSL_VERIFY.lower() in ("1", "true", "yes")
        if verify_db_ssl:
            azure_ca_bundle = "/etc/ssl/certs/ca-certificates.crt"
            if os.path.exists(azure_ca_bundle):
                connect_args["ssl"] = {"ca": azure_ca_bundle}
        else:
            connect_args["ssl"] = {"fake_flag_to_enable_tls": True}
    return connect_args


def get_engine():
    global _engine
    if _engine is None:
        _engine = create_engine(
            settings.DATABASE_URL,
            pool_pre_ping=True,
            pool_recycle=300,
            echo=False,
            connect_args=_build_connect_args(),
        )
    return _engine


def get_session_factory():
    global _SessionLocal
    if _SessionLocal is None:
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=get_engine())
    return _SessionLocal


Base = declarative_base()


def get_db():
    db = get_session_factory()()
    try:
        yield db
    finally:
        db.close()


def __getattr__(name: str):
    if name == "engine":
        return get_engine()
    if name == "SessionLocal":
        return get_session_factory()
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
