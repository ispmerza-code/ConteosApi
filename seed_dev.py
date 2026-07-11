"""Script de seed para desarrollo.
Inserta datos mínimos (nivel de usuario y usuario admin) en la base de datos.
Usar: python seed_dev.py
"""
from app.core.database import engine, SessionLocal
from app.models import models


def seed():
    print("Creando tablas si no existen...")
    models.Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Nivel de usuario admin (1)
        exists = db.query(models.NivelUsuarios).filter(models.NivelUsuarios.IdNivelUsuario == 1).first()
        if not exists:
            admin_level = models.NivelUsuarios(IdNivelUsuario=1, NivelUsuario="admin")
            db.add(admin_level)
            db.commit()
            print("Nivel admin creado.")
        else:
            print("Nivel admin ya existe.")

        # Usuario admin con IdUsuarios = 1
        user = db.query(models.Usuarios).filter(models.Usuarios.IdUsuarios == 1).first()
        if not user:
            admin_user = models.Usuarios(
                IdUsuarios=1,
                NombreUsuario="admin",
                Contraseña="admin",
                NivelUsuario=1,
                Estatus=1
            )
            db.add(admin_user)
            db.commit()
            print("Usuario admin creado: id=1, contraseña=admin")
        else:
            print("Usuario admin ya existe.")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
