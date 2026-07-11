import sys
from sqlalchemy import text
from app.core.config import settings
from app.core.database import engine

def main():
    print("DATABASE_URL:", settings.DATABASE_URL)
    try:
        with engine.connect() as conn:
            r = conn.execute(text("SELECT 1"))
            print("Query result:", r.scalar())
        print("Connection OK")
    except Exception:
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
