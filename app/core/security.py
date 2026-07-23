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
# Roles con acceso al módulo de conteos
# Niveles permitidos: 1, 2, 4, 7, 8, 33
# ---------------------------------------------------------------------------
USER_ROLES = {
    1: "admin",
    2: "coordinador_zona",
    4: "app",
    7: "admin_cctv",
    8: "supervision_cctv",  # mismos permisos que admin (nivel 1)
    33: "monitorista_soporte",  # hereda lo que antes tenía el nivel 3
}

# Únicos niveles autorizados a usar el módulo de conteos
NIVELES_CONTEOS_PERMITIDOS = {1, 2, 4, 7, 8, 33}

# Solo ven sucursales asignadas (usuariossucursal)
NIVELES_SUCURSALES_RESTRINGIDAS = {2, 4}

# Permisos por acción
# 1 y 8 = acceso total; 2 puede contestar; 33 = ex-monitorista (3)
NIVELES_CONTESTAR = {1, 2, 4, 8}
NIVELES_ASIGNAR = {1, 2, 33, 7, 8}
NIVELES_ELIMINAR = {1, 8}
NIVELES_EDITAR = {1, 2, 33, 7, 8}
NIVELES_VALIDAR = {1, 33, 7, 8}

MSG_SIN_PERMISO_CONTEOS = "No tienes permiso de visualizar conteos"


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


def get_allowed_centros(user: Usuarios, db: Session) -> Optional[List[str]]:
    """None = sin restricción; lista = solo esos IdCentro."""
    if user.NivelUsuario not in NIVELES_SUCURSALES_RESTRINGIDAS:
        return None
    centros = db.query(UsuarioSucursal.IdCentro).filter(
        UsuarioSucursal.IdUsuario == user.IdUsuarios,
        UsuarioSucursal.IdCentro.isnot(None)
    ).all()
    return [c[0] for c in centros]


def require_any_user(current_user: Usuarios = Depends(get_current_user)) -> Usuarios:
    """Cualquier usuario autenticado y activo."""
    return current_user


def require_conteos_access(current_user: Usuarios = Depends(get_current_user)) -> Usuarios:
    """Solo niveles autorizados al módulo de conteos."""
    if current_user.NivelUsuario not in NIVELES_CONTEOS_PERMITIDOS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=MSG_SIN_PERMISO_CONTEOS,
        )
    return current_user


def _check_nivel(user: Usuarios, allowed: set, action: str) -> Usuarios:
    if user.NivelUsuario not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"No tienes permiso para {action}. "
                   f"Rol requerido: {', '.join(USER_ROLES.get(n, str(n)) for n in sorted(allowed))}."
        )
    return user


def require_contestar(current_user: Usuarios = Depends(require_conteos_access)) -> Usuarios:
    """Admin (1), Coordinador zona (2), APP (4), Supervisión/Admin equiv. (8)."""
    return _check_nivel(current_user, NIVELES_CONTESTAR, "contestar conteos")


def require_asignar(current_user: Usuarios = Depends(require_conteos_access)) -> Usuarios:
    """Admin, Coord. zona, Monitorista soporte (33), Admin CCTV (7), nivel 8. APP no."""
    return _check_nivel(current_user, NIVELES_ASIGNAR, "asignar conteos")


def require_eliminar(current_user: Usuarios = Depends(require_conteos_access)) -> Usuarios:
    """Admin (1) y nivel 8 (mismos permisos que admin)."""
    return _check_nivel(current_user, NIVELES_ELIMINAR, "eliminar conteos")


def require_editar(current_user: Usuarios = Depends(require_conteos_access)) -> Usuarios:
    """Admin, Coord. zona, Monitorista soporte (33), Admin CCTV (7), nivel 8. APP no."""
    return _check_nivel(current_user, NIVELES_EDITAR, "editar conteos")


def require_validar(current_user: Usuarios = Depends(require_conteos_access)) -> Usuarios:
    """Admin, Monitorista soporte (33), Admin CCTV (7), nivel 8. APP y coord. zona no."""
    return _check_nivel(current_user, NIVELES_VALIDAR, "validar conteos")


# Aliases por compatibilidad
require_admin = require_eliminar
require_admin_or_supervisor = require_editar
require_admin_cca_supervisor = require_asignar
