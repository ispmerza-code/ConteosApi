from datetime import timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.core.config import settings
from app.core.security import authenticate_user, create_access_token, get_user_role, get_current_user
from app.schemas.schemas import Token, UsuarioLogin, UsuarioResponse
from app.models.models import Usuarios, UsuarioSucursal, Sucursales

router = APIRouter()

@router.post("/login", response_model=Token)
async def login(
    usuario_data: UsuarioLogin,
    db: Session = Depends(get_db)
):
    """Iniciar sesión y obtener token de acceso"""
    
    user = authenticate_user(db, usuario_data.IdUsuarios, usuario_data.Contraseña)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ID de usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.IdUsuarios)}, expires_delta=access_token_expires
    )
    
    user_info = UsuarioResponse(
        IdUsuarios=user.IdUsuarios,
        NombreUsuario=user.NombreUsuario,
        NivelUsuario=user.NivelUsuario,
        Estatus=user.Estatus
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_info": user_info
    }

@router.get("/me", response_model=UsuarioResponse)
async def read_users_me(
    current_user = Depends(get_current_user)
):
    """Obtener información del usuario actual"""
    return UsuarioResponse(
        IdUsuarios=current_user.IdUsuarios,
        NombreUsuario=current_user.NombreUsuario,
        NivelUsuario=current_user.NivelUsuario,
        Estatus=current_user.Estatus
    )

@router.get("/role")
async def get_my_role(
    current_user = Depends(get_current_user)
):
    """Obtener el rol del usuario actual"""
    return {
        "user_id": current_user.IdUsuarios,
        "role": get_user_role(current_user),
        "level": current_user.NivelUsuario
    }

@router.get("/usuarios", response_model=List[UsuarioResponse])
async def get_usuarios(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Obtener lista de usuarios activos para asignación"""
    usuarios = db.query(Usuarios).filter(Usuarios.Estatus == 1).all()
    return [UsuarioResponse(
        IdUsuarios=usuario.IdUsuarios,
        NombreUsuario=usuario.NombreUsuario,
        NivelUsuario=usuario.NivelUsuario,
        Estatus=usuario.Estatus
    ) for usuario in usuarios]

@router.get("/usuarios/sucursal/{centro_id}", response_model=List[UsuarioResponse])
async def get_usuarios_por_sucursal(
    centro_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Obtener usuarios activos asignados a una sucursal específica"""
    asignaciones = (
        db.query(UsuarioSucursal)
        .filter(UsuarioSucursal.IdCentro == centro_id)
        .all()
    )
    ids_usuarios = [a.IdUsuario for a in asignaciones]
    if not ids_usuarios:
        return []
    usuarios = (
        db.query(Usuarios)
        .filter(Usuarios.IdUsuarios.in_(ids_usuarios), Usuarios.Estatus == 1)
        .all()
    )
    return [UsuarioResponse(
        IdUsuarios=usuario.IdUsuarios,
        NombreUsuario=usuario.NombreUsuario,
        NivelUsuario=usuario.NivelUsuario,
        Estatus=usuario.Estatus
    ) for usuario in usuarios]

# ---------------------------------------------------------------------------
# IDs de usuarios con permiso de gestionar asignaciones de APPs
# (además de NivelUsuario 1 y 2)
# ---------------------------------------------------------------------------
USERS_GESTION_APPS = {52033, 61752}
NIVELES_GESTION_APPS = {1, 2}

def _check_gestion_apps(current_user: Usuarios):
    if current_user.NivelUsuario not in NIVELES_GESTION_APPS and current_user.IdUsuarios not in USERS_GESTION_APPS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para gestionar asignaciones de APP"
        )

@router.get("/apps", response_model=List[dict])
async def get_app_usuarios(
    db: Session = Depends(get_db),
    current_user: Usuarios = Depends(get_current_user)
):
    """Listar usuarios APP (NivelUsuario=4) con conteo de sucursales asignadas."""
    _check_gestion_apps(current_user)
    usuarios = db.query(Usuarios).filter(Usuarios.NivelUsuario == 4).order_by(Usuarios.NombreUsuario).all()
    result = []
    for u in usuarios:
        count = db.query(UsuarioSucursal).filter(UsuarioSucursal.IdUsuario == u.IdUsuarios).count()
        result.append({
            "IdUsuarios": u.IdUsuarios,
            "NombreUsuario": u.NombreUsuario,
            "NivelUsuario": u.NivelUsuario,
            "Estatus": u.Estatus,
            "sucursales_count": count
        })
    return result

@router.get("/apps/{user_id}/sucursales", response_model=List[dict])
async def get_app_sucursales(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: Usuarios = Depends(get_current_user)
):
    """Obtener sucursales asignadas a un usuario APP. El propio usuario puede consultar las suyas."""
    if current_user.IdUsuarios != user_id:
        _check_gestion_apps(current_user)
    asignaciones = db.query(UsuarioSucursal).filter(UsuarioSucursal.IdUsuario == user_id).all()
    ids = [a.IdCentro for a in asignaciones if a.IdCentro]
    if not ids:
        return []
    sucursales = (
        db.query(Sucursales)
        .options(joinedload(Sucursales.zona))
        .filter(Sucursales.IdCentro.in_(ids))
        .order_by(Sucursales.Sucursales)
        .all()
    )
    return [
        {
            "IdCentro": s.IdCentro,
            "Sucursales": s.Sucursales,
            "IdZona": s.IdZona,
            "Zona": s.zona.Zona if s.zona else None,
            "IdTipoSucursal": s.IdTipoSucursal
        }
        for s in sucursales
    ]

@router.put("/apps/{user_id}/sucursales")
async def set_app_sucursales(
    user_id: int,
    centros: List[str] = Body(...),
    db: Session = Depends(get_db),
    current_user: Usuarios = Depends(get_current_user)
):
    """Reemplazar todas las sucursales asignadas a un usuario APP (operación bulk)."""
    _check_gestion_apps(current_user)
    # Si el usuario que solicita la operación es Nivel 2, permitir sólo centros
    # que estén en su propia lista de UsuarioSucursal.
    if current_user.NivelUsuario == 2:
        asignadas = db.query(UsuarioSucursal.IdCentro).filter(UsuarioSucursal.IdUsuario == current_user.IdUsuarios).all()
        asignadas_ids = {a[0] for a in asignadas}
        invalid = [c for c in centros if c not in asignadas_ids]
        if invalid:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No puedes asignar sucursales que no te pertenecen: {', '.join(invalid)}"
            )
    usuario = db.query(Usuarios).filter(Usuarios.IdUsuarios == user_id, Usuarios.NivelUsuario == 4).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario APP no encontrado")
    db.query(UsuarioSucursal).filter(UsuarioSucursal.IdUsuario == user_id).delete()
    for centro in centros:
        db.add(UsuarioSucursal(IdUsuario=user_id, IdCentro=centro))
    db.commit()
    return {"message": f"{len(centros)} sucursales asignadas correctamente", "count": len(centros)}

