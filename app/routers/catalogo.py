from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Usuarios, ConteoDetalles
from app.schemas.schemas import ProductoCreate, ProductoResponse
from app.services.catalogo_service import CatalogoService

router = APIRouter(
    prefix="/api/v1/catalogo",
    tags=["catalogo"]
)

@router.get("/", response_model=List[ProductoResponse])
async def listar_productos(
    db: Session = Depends(get_db),
    current_user: Usuarios = Depends(get_current_user)
):
    """
    Obtener todos los productos del catálogo.
    Solo usuarios autenticados pueden ver los productos.
    """
    return CatalogoService.listar_productos(db)

@router.get("/categorias/map")
async def mapa_categorias(
    db: Session = Depends(get_db),
    current_user: Usuarios = Depends(get_current_user)
):
    """Mapa código de barras → categoría (ligero, para estadísticas)."""
    return CatalogoService.mapa_categorias(db)

@router.get("/{codigo_barras}", response_model=ProductoResponse)
async def obtener_producto(
    codigo_barras: str,
    db: Session = Depends(get_db),
    current_user: Usuarios = Depends(get_current_user)
):
    """
    Obtener un producto específico por código de barras.
    Solo usuarios autenticados pueden ver el producto.
    """
    return CatalogoService.obtener_producto_por_codigo(db, codigo_barras)


@router.get("/{codigo_barras}/ultimo-precio")
async def ultimo_precio_producto(
    codigo_barras: str,
    db: Session = Depends(get_db),
    current_user: Usuarios = Depends(get_current_user)
):
    """
    Devuelve el último precio registrado en conteos para un código de barras.
    Si no hay registros previos, devuelve null.
    """
    detalle = (
        db.query(ConteoDetalles.Precio)
        .filter(ConteoDetalles.CodigoBarras == codigo_barras)
        .order_by(desc(ConteoDetalles.idConteoDetalles))
        .first()
    )
    return {"CodigoBarras": codigo_barras, "Precio": detalle[0] if detalle else None}

@router.post("/crear", response_model=ProductoResponse)
async def crear_producto(
    producto_data: ProductoCreate,
    db: Session = Depends(get_db),
    current_user: Usuarios = Depends(get_current_user)
):
    """
    Crear un nuevo producto en el catálogo.
    Solo usuarios autenticados pueden crear productos.
    """
    return CatalogoService.crear_producto(db, producto_data)

@router.delete("/{codigo_barras}")
async def eliminar_producto(
    codigo_barras: str,
    db: Session = Depends(get_db),
    current_user: Usuarios = Depends(get_current_user)
):
    """
    Eliminar un producto del catálogo por código de barras.
    Solo usuarios autenticados pueden eliminar productos.
    """
    return CatalogoService.eliminar_producto(db, codigo_barras)