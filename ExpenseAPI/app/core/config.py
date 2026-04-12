import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # ================= DATABASE =================
    DB_SERVER: str = os.getenv("DB_SERVER", ".\\SQLEXPRESS")
    DB_NAME: str = os.getenv("DB_NAME", "ExpenseDB")

    # ================= JWT =================
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change_this_secret")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

    # ================= EMAIL =================
    EMAIL_HOST: str = os.getenv("EMAIL_HOST", "smtp.gmail.com")
    EMAIL_PORT: int = int(os.getenv("EMAIL_PORT", 587))
    EMAIL_USER: str = os.getenv("EMAIL_USER", "")
    EMAIL_PASSWORD: str = os.getenv("EMAIL_PASSWORD", "")

settings = Settings()