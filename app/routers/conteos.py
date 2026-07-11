from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.core.security import (
    require_any_user,
    require_contestar,
    require_asignar,
    require_editar,
    require_eliminar,
    get_allowed_centros,
)
from app.schemas.schemas import (
    ConteoCreate, ConteoAsignar, ConteoEdit, ConteoContestar, ConteoValidar,
    ConteoResponse, ConteoListResponse, SuccessResponse
)
from app.services.conteo_service import ConteoService
from app.models.models import Usuarios, Sucursales, UsuarioSucursal

router = APIRouter()

@router.get("/sucursales", response_model=List[dict])
async def obtener_sucursales(
    db: Session = Depends(get_db),
    current_user: Usuarios = Depends(require_any_user)
):
    """Obtener lista de sucursales disponibles.
    Para NivelUsuario=4, retorna solo las sucursales de la zona asignada al usuario.
    """
    query = db.query(Sucursales).options(joinedload(Sucursales.zona))

    sucursales = query.order_by(Sucursales.Sucursales).all()
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

@router.post("/crear", response_model=ConteoResponse, status_code=status.HTTP_201_CREATED)
async def crear_conteo(
    conteo_data: ConteoCreate,
    db: Session = Depends(get_db),
    current_user: Usuarios = Depends(require_any_user)
):
    """
    Crear un nuevo conteo.

    **Roles permitidos**: todos los autenticados.
    """
    return ConteoService.crear_conteo(db, conteo_data, current_user.IdUsuarios, current_user.NivelUsuario)

@router.post("/asignar", response_model=ConteoResponse, status_code=status.HTTP_201_CREATED)
async def asignar_conteo(
    conteo_data: ConteoAsignar,
    db: Session = Depends(get_db),
    current_user: Usuarios = Depends(require_asignar)
):
    """
    Asignar un conteo a otro usuario.

    **Roles permitidos**: Admin (1), Coordinador de zona (2), Monitorista CCTV (3),
    Admin CCTV (7), Supervisión CCTV (8). APP no puede asignar.
    """
    return ConteoService.asignar_conteo(db, conteo_data, current_user.IdUsuarios)

@router.put("/{conteo_id}/editar", response_model=ConteoResponse)
async def editar_conteo(
    conteo_id: int,
    conteo_data: ConteoEdit,
    db: Session = Depends(get_db),
    current_user: Usuarios = Depends(require_editar)
):
    """
    Editar un conteo existente (solo conteos pendientes Envio=0).

    **Roles permitidos**: Admin (1), Coordinador de zona (2), Monitorista CCTV (3),
    Admin CCTV (7), Supervisión CCTV (8). APP no puede editar.
    """
    return ConteoService.editar_conteo(db, conteo_id, conteo_data, current_user.IdUsuarios)


@router.put("/{conteo_id}/reasignar", response_model=ConteoResponse)
async def reasignar_conteo(
    conteo_id: int,
    db: Session = Depends(get_db),
    current_user: Usuarios = Depends(require_asignar)
):
    """
    Reasignar (reabrir) un conteo finalizado y poner existencias a cero.

    **Roles permitidos**: mismos que para asignar.
    """
    return ConteoService.reasignar_conteo(db, conteo_id, current_user.IdUsuarios)

@router.put("/{conteo_id}/contestar", response_model=ConteoResponse)
async def contestar_conteo(
    conteo_id: int,
    conteo_data: ConteoContestar,
    db: Session = Depends(get_db),
    current_user: Usuarios = Depends(require_contestar)
):
    """
    Contestar un conteo (actualizar existencias físicas).

    **Roles permitidos**: Admin (1), APP (4), Supervisión CCTV (8).
    Monitorista CCTV y Admin CCTV no pueden contestar.
    """
    return ConteoService.contestar_conteo(db, conteo_id, conteo_data, current_user.IdUsuarios)

@router.put("/{conteo_id}/validar", response_model=ConteoResponse)
async def validar_conteo(
    conteo_id: int,
    conteo_data: ConteoValidar,
    db: Session = Depends(get_db),
    current_user: Usuarios = Depends(require_any_user)
):
    """
    Validar un conteo: llenar existencias sistema y marcar como validado.

    **Roles permitidos**: Admin (1), Monitorista CCTV (3), Admin CCTV (7), Supervisión CCTV (8).
    APP (4) no puede validar.
    """
    NIVELES_VALIDAR = {1, 3, 7, 8}
    if current_user.NivelUsuario not in NIVELES_VALIDAR:
        from fastapi import HTTPException
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No tienes permiso para validar conteos")
    return ConteoService.validar_conteo(db, conteo_id, conteo_data, current_user.IdUsuarios)

@router.delete("/{conteo_id}", response_model=SuccessResponse)
async def eliminar_conteo(
    conteo_id: int,
    db: Session = Depends(get_db),
    current_user: Usuarios = Depends(require_eliminar)
):
    """
    Eliminar un conteo.

    **Roles permitidos**: Admin (1), Supervisión CCTV (8).
    """
    result = ConteoService.eliminar_conteo(db, conteo_id, current_user.IdUsuarios)
    return SuccessResponse(message=result["message"])

@router.get("/{conteo_id}", response_model=ConteoResponse)
async def obtener_conteo(
    conteo_id: int,
    db: Session = Depends(get_db),
    current_user: Usuarios = Depends(require_any_user)
):
    """
    Obtener un conteo específico por ID.

    Niveles 2 y 4 solo pueden ver conteos de sus sucursales asignadas.
    """
    allowed = get_allowed_centros(current_user, db)
    return ConteoService.obtener_conteo(db, conteo_id, allowed_centros=allowed)

@router.get("/", response_model=List[ConteoListResponse])
async def listar_conteos(
    skip: int = Query(0, ge=0, description="Número de registros a omitir"),
    limit: int = Query(100, ge=1, le=1000, description="Número máximo de registros a retornar"),
    id_centro: Optional[str] = Query(None, description="Filtrar por ID de centro/sucursal"),
    envio: Optional[int] = Query(None, ge=0, le=1, description="Filtrar por estado de envío (0=pendiente, 1=finalizado)"),
    id_usuario: Optional[int] = Query(None, description="Filtrar por ID de usuario asignado"),
    db: Session = Depends(get_db),
    current_user: Usuarios = Depends(require_any_user)
):
    """
    Listar conteos con filtros opcionales.

    Niveles 2 (Coordinador de zona) y 4 (APP) solo ven conteos de sus sucursales asignadas.
    """
    allowed = get_allowed_centros(current_user, db)
    return ConteoService.listar_conteos(
        db=db,
        skip=skip,
        limit=limit,
        id_centro=id_centro,
        envio=envio,
        id_usuario=id_usuario,
        allowed_centros=allowed,
    )

@router.get("/usuario/{user_id}", response_model=List[ConteoListResponse])
async def obtener_conteos_usuario(
    user_id: int,
    skip: int = Query(0, ge=0, description="Número de registros a omitir"),
    limit: int = Query(100, ge=1, le=1000, description="Número máximo de registros a retornar"),
    envio: Optional[int] = Query(None, ge=0, le=1, description="Filtrar por estado de envío"),
    db: Session = Depends(get_db),
    current_user: Usuarios = Depends(require_any_user)
):
    """Obtener conteos asignados a un usuario específico."""
    allowed = get_allowed_centros(current_user, db)
    return ConteoService.listar_conteos(
        db=db,
        skip=skip,
        limit=limit,
        id_usuario=user_id,
        envio=envio,
        allowed_centros=allowed,
    )

@router.get("/sucursal/{centro_id}", response_model=List[ConteoListResponse])
async def obtener_conteos_sucursal(
    centro_id: str,
    skip: int = Query(0, ge=0, description="Número de registros a omitir"),
    limit: int = Query(100, ge=1, le=1000, description="Número máximo de registros a retornar"),
    envio: Optional[int] = Query(None, ge=0, le=1, description="Filtrar por estado de envío"),
    db: Session = Depends(get_db),
    current_user: Usuarios = Depends(require_any_user)
):
    """Obtener conteos de una sucursal específica."""
    allowed = get_allowed_centros(current_user, db)
    # Si el usuario tiene restricción, verificar que la sucursal pedida esté en su lista
    if allowed is not None and centro_id not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes acceso a los conteos de esta sucursal"
        )
    return ConteoService.listar_conteos(
        db=db,
        skip=skip,
        limit=limit,
        id_centro=centro_id,
        envio=envio,
        allowed_centros=allowed,
    )
