# INSTALL_API.md

## 1. Yêu cầu môi trường

Trước khi chạy API, máy cần có:

- Python 3.10 hoặc mới hơn
- SQL Server
- ODBC Driver 17 hoặc 18 for SQL Server
- Git

## 2. Clone repository

```bash
git clone <your-repo-url>
cd <your-api-folder>
```

## 3. Tạo môi trường ảo

### Windows
```bash
python -m venv .venv
.venv\Scripts\activate
```

### macOS / Linux
```bash
python3 -m venv .venv
source .venv/bin/activate
```

## 4. Cài package

```bash
pip install -r requirements.txt
```

## 5. Tạo file `.env`

Tạo file `.env` ở thư mục gốc của project API.

### Trường hợp dùng Windows Authentication
```env
DB_SERVER=.\SQLEXPRESS
DB_NAME=ExpenseDB
DB_TRUSTED_CONNECTION=yes

SECRET_KEY=change_this_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### Trường hợp dùng SQL Server Authentication
```env
DB_SERVER=.\SQLEXPRESS
DB_NAME=ExpenseDB
DB_USERNAME=sa
DB_PASSWORD=your_password
DB_TRUSTED_CONNECTION=no

SECRET_KEY=change_this_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

## 6. Sửa `config.py`

Trong file `app/core/config.py`, nên đọc cả 2 kiểu kết nối như sau:

```python
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    DB_SERVER: str = os.getenv("DB_SERVER", ".\\SQLEXPRESS")
    DB_NAME: str = os.getenv("DB_NAME", "ExpenseDB")
    DB_USERNAME: str = os.getenv("DB_USERNAME", "")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_TRUSTED_CONNECTION: str = os.getenv("DB_TRUSTED_CONNECTION", "yes")

    SECRET_KEY: str = os.getenv("SECRET_KEY", "change_this_secret")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))


settings = Settings()
```

## 7. Sửa `database.py`

Trong file `app/core/database.py`, tạo connection string theo cấu hình:

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

if settings.DB_TRUSTED_CONNECTION.lower() == "yes":
    connection_string = (
        f"DRIVER={{SQL Server}};"
        f"SERVER={settings.DB_SERVER};"
        f"DATABASE={settings.DB_NAME};"
        f"Trusted_Connection=yes;"
    )
else:
    connection_string = (
        f"DRIVER={{SQL Server}};"
        f"SERVER={settings.DB_SERVER};"
        f"DATABASE={settings.DB_NAME};"
        f"UID={settings.DB_USERNAME};"
        f"PWD={settings.DB_PASSWORD};"
    )

DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={connection_string}"

engine = create_engine(DATABASE_URL, echo=False, future=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

## 8. Chạy API

Nếu file entry point là `app/main.py`:

```bash
python -m uvicorn app.main:app --reload
```

Nếu file entry point là `main.py` ở thư mục gốc:

```bash
python -m uvicorn main:app --reload
```

API sẽ chạy tại:

```text
http://127.0.0.1:8000
```

## 9. Kiểm tra nhanh

Mở trình duyệt hoặc Postman:

```text
http://127.0.0.1:8000/
```

Nếu thành công, sẽ thấy phản hồi kiểu:

```json
{"message":"ExpenseAPI is running"}
```

## 10. Test database nhanh

Có thể tạo file test tạm như sau:

```python
import pyodbc

conn_str = (
    "DRIVER={SQL Server};"
    "SERVER=.\\SQLEXPRESS;"
    "DATABASE=ExpenseDB;"
    "Trusted_Connection=yes;"
)

conn = pyodbc.connect(conn_str)
cursor = conn.cursor()
cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES")
for row in cursor.fetchall():
    print(row)
```

Nếu in ra danh sách bảng thì kết nối DB ổn.

## 11. Lưu ý quan trọng

- Nếu gặp lỗi `No module named pyodbc`:
```bash
pip install pyodbc
```

- Nếu gặp lỗi liên quan `bcrypt` và `passlib`, nên dùng đúng version trong `requirements.txt`.

- Nếu dùng Windows Authentication, nên chạy project bằng đúng user Windows có quyền truy cập SQL Server.

- Nếu `localhost` không chạy được, hãy kiểm tra:
  - SQL Server instance có đúng là `SQLEXPRESS` không
  - database `ExpenseDB` đã được tạo chưa
  - ODBC Driver đã cài chưa

## 12. Lệnh cài nhanh toàn bộ

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```
