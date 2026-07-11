from datetime import datetime, timedelta, timezone
from typing import List, Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.models.models import Usuarios, UsuarioSucursal
from app.schemas.schemas import TokenData

security = HTTPBearer()

# ---------------------------------------------------------------------------
# Roles de usuario según nivelusuarios en siniestros_scisp
# ---------------------------------------------------------------------------
USER_ROLES = {
    1: "admin",
    2: "coordinador_zona",
    3: "monitorista_cctv",
    4: "app",
    7: "admin_cctv",
    8: "supervision_cctv",
}

# Niveles con acceso restringido: solo ven sucursales asignadas (usuariossucursal)
NIVELES_SUCURSALES_RESTRINGIDAS = {2, 4}

# Permisos por acción
NIVELES_CONTESTAR  = {1, 4, 8}   # Admin, APP, Supervisión CCTV (monitorista ya no contesta)
NIVELES_ASIGNAR    = {1, 2, 3, 7, 8}  # Todos excepto APP
NIVELES_ELIMINAR   = {1, 8}       # Admin, Supervisión CCTV
NIVELES_EDITAR     = {1, 2, 3, 7, 8}  # Todos excepto APP


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    token = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return token if isinstance(token, str) else token.decode("utf-8")


def authenticate_user(db: Session, user_id: int, password: str):
    user = db.query(Usuarios).filter(
        Usuarios.IdUsuarios == user_id,
        Usuarios.Estatus == 1
    ).first()
    if not user:
        return False
    # Contraseña en texto plano (como estaba originalmente)
    if user.Contraseña != password:
        return False
    return user


def get_user_role(user: Usuarios) -> str:
    return USER_ROLES.get(user.NivelUsuario, "desconocido")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            credentials.credentials, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        raw_sub = payload.get("sub")
        if raw_sub is None:
            raise credentials_exception
        user_id = int(raw_sub)
        token_data = TokenData(user_id=user_id)
    except JWTError:
        raise credentials_exception

    user = db.query(Usuarios).filter(
        Usuarios.IdUsuarios == token_data.user_id,
        Usuarios.Estatus == 1
    ).first()
    if user is None:
        raise credentials_exception
    return user


# ---------------------------------------------------------------------------
# Helper: obtiene lista de IdCentro permitidos para el usuario.
# Retorna None si puede ver todo, o una lista de strings si está restringido.
# ---------------------------------------------------------------------------
def get_allowed_centros(user: Usuarios, db: Session) -> Optional[List[str]]:
    if user.NivelUsuario not in NIVELES_SUCURSALES_RESTRINGIDAS:
        return None  # Sin restricción
    centros = db.query(UsuarioSucursal.IdCentro).filter(
        UsuarioSucursal.IdUsuario == user.IdUsuarios,
        UsuarioSucursal.IdCentro.isnot(None)
    ).all()
    return [c[0] for c in centros]


# ---------------------------------------------------------------------------
# Dependencias de permisos
# ---------------------------------------------------------------------------

def require_any_user(current_user: Usuarios = Depends(get_current_user)) -> Usuarios:
    """Cualquier usuario autenticado y activo."""
    return current_user


def _check_nivel(user: Usuarios, allowed: set, action: str) -> Usuarios:
    if user.NivelUsuario not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"No tienes permiso para {action}. "
                   f"Rol requerido: {', '.join(USER_ROLES.get(n, str(n)) for n in sorted(allowed))}."
        )
    return user


def require_contestar(current_user: Usuarios = Depends(get_current_user)) -> Usuarios:
    """Niveles permitidos: 1 (Admin), 4 (APP), 8 (Supervisión CCTV)."""
    return _check_nivel(current_user, NIVELES_CONTESTAR, "contestar conteos")


def require_asignar(current_user: Usuarios = Depends(get_current_user)) -> Usuarios:
    """Niveles permitidos: 1, 2, 3, 7, 8. APP no puede asignar."""
    return _check_nivel(current_user, NIVELES_ASIGNAR, "asignar conteos")


def require_eliminar(current_user: Usuarios = Depends(get_current_user)) -> Usuarios:
    """Niveles permitidos: 1 (Admin), 8 (Supervisión CCTV)."""
    return _check_nivel(current_user, NIVELES_ELIMINAR, "eliminar conteos")


def require_editar(current_user: Usuarios = Depends(get_current_user)) -> Usuarios:
    """Niveles permitidos: 1, 2, 3, 7, 8. APP no puede editar."""
    return _check_nivel(current_user, NIVELES_EDITAR, "editar conteos")


# ---------------------------------------------------------------------------
# Aliases conservados por compatibilidad con routers existentes
# (se irán reemplazando por los nuevos nombres)
# ---------------------------------------------------------------------------
require_admin                 = require_eliminar
require_admin_or_supervisor   = require_editar
require_admin_cca_supervisor  = require_asignar
