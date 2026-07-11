from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.models import Catalogo, CatFamilia, CatCategoria, CatSubcategoria
from app.schemas.schemas import ProductoCreate, ProductoResponse

class CatalogoService:
    @staticmethod
    def listar_productos(db: Session) -> List[dict]:
        """Obtener todos los productos del catálogo con nombres de familia, categoría y subcategoría"""
        productos = (
            db.query(
                Catalogo,
                CatFamilia.Familia,
                CatCategoria.Categoria,
                CatSubcategoria.Subcategoria
            )
            .join(CatFamilia, Catalogo.IdFamilia == CatFamilia.IdFamilia)
            .join(CatCategoria, Catalogo.IdCategoria == CatCategoria.IdCategoria)
            .join(CatSubcategoria, Catalogo.IdSubcategoria == CatSubcategoria.IdCatSubcategoria)
            .all()
        )
        
        return [
            {
                "CodigoBarras": p[0].CodigoBarras,
                "Producto": p[0].Producto,
                "IdMaterial": p[0].IdMaterial,
                "IdFamilia": p[0].IdFamilia,
                "IdCategoria": p[0].IdCategoria,
                "IdSubcategoria": p[0].IdSubcategoria,
                "Familia": p[1],
                "Categoria": p[2],
                "Subcategoria": p[3]
            }
            for p in productos
        ]
    
    @staticmethod
    def crear_producto(db: Session, producto_data: ProductoCreate) -> Catalogo:
        """Crear un nuevo producto en el catálogo"""
        
        # Verificar si el producto ya existe
        existing_product = db.query(Catalogo).filter(
            Catalogo.CodigoBarras == producto_data.CodigoBarras
        ).first()
        if existing_product:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Ya existe un producto con el código de barras {producto_data.CodigoBarras}"
            )
        
        # Verificar que existe la familia
        familia = db.query(CatFamilia).filter(
            CatFamilia.IdFamilia == producto_data.IdFamilia
        ).first()
        if not familia:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La familia con ID {producto_data.IdFamilia} no existe"
            )
        
        # Verificar que existe la categoría
        categoria = db.query(CatCategoria).filter(
            CatCategoria.IdCategoria == producto_data.IdCategoria
        ).first()
        if not categoria:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La categoría con ID {producto_data.IdCategoria} no existe"
            )
        
        # Verificar que existe la subcategoría
        subcategoria = db.query(CatSubcategoria).filter(
            CatSubcategoria.IdCatSubcategoria == producto_data.IdSubcategoria
        ).first()
        if not subcategoria:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"La subcategoría con ID {producto_data.IdSubcategoria} no existe"
            )
        
        # Crear el nuevo producto
        nuevo_producto = Catalogo(
            CodigoBarras=producto_data.CodigoBarras,
            Producto=producto_data.Producto,
            IdMaterial=producto_data.IdMaterial,
            IdFamilia=producto_data.IdFamilia,
            IdCategoria=producto_data.IdCategoria,
            IdSubcategoria=producto_data.IdSubcategoria
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
                detail=f"Error al crear el producto: {str(e)}"
            )
    
    @staticmethod
    def obtener_producto_por_codigo(db: Session, codigo_barras: str) -> dict:
        """Obtener un producto específico por código de barras"""
        
        producto = (
            db.query(
                Catalogo,
                CatFamilia.Familia,
                CatCategoria.Categoria,
                CatSubcategoria.Subcategoria
            )
            .join(CatFamilia, Catalogo.IdFamilia == CatFamilia.IdFamilia)
            .join(CatCategoria, Catalogo.IdCategoria == CatCategoria.IdCategoria)
            .join(CatSubcategoria, Catalogo.IdSubcategoria == CatSubcategoria.IdCatSubcategoria)
            .filter(Catalogo.CodigoBarras == codigo_barras)
            .first()
        )
        
        if not producto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No se encontró el producto con código de barras {codigo_barras}"
            )
        
        return {
            "CodigoBarras": producto[0].CodigoBarras,
            "Producto": producto[0].Producto,
            "IdMaterial": producto[0].IdMaterial,
            "IdFamilia": producto[0].IdFamilia,
            "IdCategoria": producto[0].IdCategoria,
            "IdSubcategoria": producto[0].IdSubcategoria,
            "Familia": producto[1],
            "Categoria": producto[2],
            "Subcategoria": producto[3]
        }
    
    @staticmethod
    def eliminar_producto(db: Session, codigo_barras: str) -> dict:
        """Eliminar un producto del catálogo"""
        
        # Verificar que el producto existe
        producto = db.query(Catalogo).filter(
            Catalogo.CodigoBarras == codigo_barras
        ).first()
        
        if not producto:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No se encontró el producto con código de barras {codigo_barras}"
            )
        
        try:
            db.delete(producto)
            db.commit()
            return {"message": "Producto eliminado exitosamente"}
        except Exception as e:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al eliminar el producto: {str(e)}"
            )