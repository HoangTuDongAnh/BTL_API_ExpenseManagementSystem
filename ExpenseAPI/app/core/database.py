from urllib.parse import quote_plus
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

connection_string = (
    f"DRIVER={{ODBC Driver 17 for SQL Server}};"
    f"SERVER={settings.DB_SERVER};"
    f"DATABASE={settings.DB_NAME};"
    "Encrypt=yes;"
    "TrustServerCertificate=yes;"
    "Trusted_Connection=yes;"
)

DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={quote_plus(connection_string)}"

engine = create_engine(DATABASE_URL, echo=True, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()