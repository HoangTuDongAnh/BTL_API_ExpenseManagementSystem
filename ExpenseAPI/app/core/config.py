import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DB_SERVER: str = os.getenv("DB_SERVER", r"(localdb)\MSSQLLocalDB")
    DB_NAME: str = os.getenv("DB_NAME", "ExpenseDB")

    SECRET_KEY: str = os.getenv("SECRET_KEY", "change_this_secret")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))


settings = Settings()