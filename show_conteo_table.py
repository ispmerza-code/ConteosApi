from sqlalchemy import text
from app.core.database import engine

def main(limit=20):
    try:
        with engine.connect() as conn:
            print("Conectando a la base de datos...")
            res = conn.execute(text("SELECT * FROM conteo LIMIT :limit"), {"limit": limit})
            cols = res.keys()
            rows = res.fetchall()
            print("Columnas:", cols)
            print(f"Mostrando hasta {limit} filas:")
            for r in rows:
                print(r)
    except Exception:
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
