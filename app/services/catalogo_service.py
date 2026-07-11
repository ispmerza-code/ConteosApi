from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status
from app.models.models import Catalogo, CatFamilia, CatCategoria, CatSubcategoria
from app.schemas.schemas import ProductoCreate


class CatalogoService:
    @staticmethod
    def _base_query(db: Session):
        return (
            db.query(
                Catalogo,
                CatFamilia.Familia,
                CatCategoria.Categoria,
                CatSubcategoria.Subcategoria,
            )
            .join(CatFamilia, Catalogo.IdFamilia == CatFamilia.IdFamilia)
            .join(CatCategoria, Catalogo.IdCategoria == CatCategoria.IdCategoria)
            .join(CatSubcategoria, Catalogo.IdSubcategoria == CatSubcategoria.IdCatSubcategoria)
        )

    @staticmethod
    def _row_to_dict(row) -> dict:
        return {
            "CodigoBarras": row[0].CodigoBarras,
            "Producto": row[0].Producto,
            "IdMaterial": row[0].IdMaterial,
            "IdFamilia": row[0].IdFamilia,
            "IdCategoria": row[0].IdCategoria,
            "IdSubcategoria": row[0].IdSubcategoria,
            "Familia": row[1],
            "Categoria": row[2],
            "Subcategoria": row[3],
        }

    @staticmethod
    def _apply_filtros(query, q: Optional[str], familia: Optional[str], categoria: Optional[str]):
        if q:
            term = f"%{q.strip()}%"
            query = query.filter(
                or_(
                    Catalogo.CodigoBarras.like(term),
                    Catalogo.Producto.like(term),
                    Catalogo.IdMaterial.like(term),
                )
            )
        if familia:
            query = query.filter(CatFamilia.Familia == familia)
        if categoria:
            query = query.filter(CatCategoria.Categoria == categoria)
        return query

    @staticmethod
    def listar_productos(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        q: Optional[str] = None,
        familia: Optional[str] = None,
        categoria: Optional[str] = None,
    ) -> dict:
        """Listado paginado del catálogo."""
        query = CatalogoService._base_query(db)
        query = CatalogoService._apply_filtros(query, q, familia, categoria)
        total = query.count()
        rows = (
            query.order_by(Catalogo.Producto)
            .offset(skip)
            .limit(limit)
            .all()
        )
        return {
            "items": [CatalogoService._row_to_dict(row) for row in rows],
            "total": total,
            "skip": skip,
            "limit": limit,
        }

    @staticmethod
    def obtener_filtros(db: Session) -> dict:
        familias = [r[0] for r in db.query(CatFamilia.Familia).order_by(CatFamilia.Familia).all()]
        categorias = [r[0] for r in db.query(CatCategoria.Categoria).order_by(CatCategoria.Categoria).all()]
        return {"familias": familias, "categorias": categorias}

    @staticmethod
    def mapa_categorias(db: Session) -> dict[str, str]:
        rows = (
            db.query(Catalogo.CodigoBarras, CatCategoria.Categoria)
            .join(CatCategoria, Catalogo.IdCategoria == CatCategoria.IdCategoria)
            .all()
        )
        return {codigo: categoria for codigo, categoria in rows}

    @staticmethod
    def crear_producto(db: Session, producto_data: ProductoCreate) -> Catalogo:
        existing_product = db.query(Catalogo).filter(
            Catalogo.CodigoBarras == producto_data.CodigoBarras
        ).first()
        if existing_product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un producto con el código de barras {producto_data.CodigoBarras}",
            )

        familia = db.query(CatFamilia).filter(
            CatFamilia.IdFamilia == producto_data.IdFamilia
        ).first()
        if not familia:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La familia con ID {producto_data.IdFamilia} no existe",
            )

        categoria = db.query(CatCategoria).filter(
            CatCategoria.IdCategoria == producto_data.IdCategoria
        ).first()
        if not categoria:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La categoría con ID {producto_data.IdCategoria} no existe",
            )

        subcategoria = db.query(CatSubcategoria).filter(
            CatSubcategoria.IdCatSubcategoria == producto_data.IdSubcategoria
        ).first()
        if not subcategoria:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La subcategoría con ID {producto_data.IdSubcategoria} no existe",
            )

        nuevo_producto = Catalogo(
            CodigoBarras=producto_data.CodigoBarras,
            Producto=producto_data.Producto,
            IdMaterial=producto_data.IdMaterial,
            IdFamilia=producto_data.IdFamilia,
            IdCategoria=producto_data.IdCategoria,
            IdSubcategoria=producto_data.IdSubcategoria,
        )

        try:
            db.add(nuevo_producto)
            db.commit()
            db.refresh(nuevo_producto)
            return nuevo_producto
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al crear el producto: {str(e)}",
            )

    @staticmethod
    def obtener_producto_por_codigo(db: Session, codigo_barras: str) -> dict:
        producto = (
            CatalogoService._base_query(db)
            .filter(Catalogo.CodigoBarras == codigo_barras)
            .first()
        )

        if not producto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No se encontró el producto con código de barras {codigo_barras}",
            )

        return CatalogoService._row_to_dict(producto)

    @staticmethod
    def eliminar_producto(db: Session, codigo_barras: str) -> dict:
        producto = db.query(Catalogo).filter(
            Catalogo.CodigoBarras == codigo_barras
        ).first()

        if not producto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No se encontró el producto con código de barras {codigo_barras}",
            )

        try:
            db.delete(producto)
            db.commit()
            return {"message": "Producto eliminado exitosamente"}
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al eliminar el producto: {str(e)}",
            )
