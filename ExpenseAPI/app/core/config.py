import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[1]
ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH)

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
    EMAIL_USER: str = os.getenv("EMAIL_USER", "").strip()
    EMAIL_PASSWORD: str = os.getenv("EMAIL_PASSWORD", "").strip().replace(" ", "")

settings = Settings()

print("DEBUG EMAIL_USER =", settings.EMAIL_USER)
print("DEBUG EMAIL_PASSWORD length =", len(settings.EMAIL_PASSWORD))
print("DEBUG ENV PATH =", ENV_PATH)