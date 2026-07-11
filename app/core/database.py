from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
import os

# Configuración de argumentos extra para la conexión
connect_args = {}

# Si la base es MySQL (mysql+pymysql://...), activamos SSL y timeout
if settings.DATABASE_URL.startswith("mysql"):
    connect_args["connect_timeout"] = 10
    # Aiven expone TLS con una cadena de certificados que falla en Railway si se valida
    # contra el bundle del contenedor. Permitimos TLS sin verificación estricta para
    # que el despliegue funcione en Railway; si quieres endurecerlo, usa un CA bundle
    # específico de tu proveedor y cambia esta variable de entorno.
    verify_db_ssl = settings.DB_SSL_VERIFY.lower() in ("1", "true", "yes")
    if verify_db_ssl:
        azure_ca_bundle = "/etc/ssl/certs/ca-certificates.crt"
        if os.path.exists(azure_ca_bundle):
            connect_args["ssl"] = {
                "ca": azure_ca_bundle
            }
    else:
        connect_args["ssl"] = {"fake_flag_to_enable_tls": True}

# Crear el motor de la base de datos
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=False,           # Cambiar a True para ver las consultas SQL en desarrollo
    connect_args=connect_args
)

# Crear el SessionLocal para las sesiones de base de datos
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base para los modelos
Base = declarative_base()

# Dependencia para obtener la sesión de base de datos
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
