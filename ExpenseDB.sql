-- ============================================================
--  ExpenseDB - Hệ thống Quản lý Chi tiêu Cá nhân
--  Database: SQL Server
--  Ghi chú:
--  - Dùng NVARCHAR cho dữ liệu tiếng Việt
--  - Dùng mã khóa chính dạng chuỗi có prefix
--  - Không sử dụng CategoryType và WalletType
-- ============================================================

USE master;
GO

-- ============================================================
--  1. TẠO DATABASE NẾU CHƯA TỒN TẠI
-- ============================================================
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'ExpenseDB')
BEGIN
    CREATE DATABASE ExpenseDB
    COLLATE Vietnamese_CI_AS;
END
GO

USE ExpenseDB;
GO

-- ============================================================
--  2. XÓA CÁC ĐỐI TƯỢNG CŨ NẾU TỒN TẠI
--  Xóa theo thứ tự phụ thuộc khóa ngoại
-- ============================================================
IF OBJECT_ID('dbo.Budgets', 'U') IS NOT NULL DROP TABLE dbo.Budgets;
IF OBJECT_ID('dbo.Transactions', 'U') IS NOT NULL DROP TABLE dbo.Transactions;
IF OBJECT_ID('dbo.Categories', 'U') IS NOT NULL DROP TABLE dbo.Categories;
IF OBJECT_ID('dbo.Wallets', 'U') IS NOT NULL DROP TABLE dbo.Wallets;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
GO

-- ============================================================
--  3. BẢNG USERS
--  PK format: U + YYMMDD + 4 số
--  Ví dụ: U2503290001
-- ============================================================
CREATE TABLE dbo.Users (
    UserID          VARCHAR(15)     NOT NULL,
    FullName        NVARCHAR(100)   NOT NULL,
    Email           VARCHAR(150)    NOT NULL,
    PasswordHash    VARCHAR(255)    NOT NULL,
    PhoneNumber     VARCHAR(15)     NULL,
    Avatar          VARCHAR(255)    NULL,
    Role            VARCHAR(20)     NOT NULL DEFAULT 'user',       -- user | admin
    Status          VARCHAR(10)     NOT NULL DEFAULT 'active',     -- active | inactive | locked
    CreatedAt       DATETIME        NOT NULL DEFAULT GETDATE(),
    UpdatedAt       DATETIME        NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_Users PRIMARY KEY (UserID),
    CONSTRAINT UQ_Users_Email UNIQUE (Email),
    CONSTRAINT CK_Users_Role CHECK (Role IN ('user', 'admin')),
    CONSTRAINT CK_Users_Status CHECK (Status IN ('active', 'inactive', 'locked'))
);
GO

-- ============================================================
--  4. BẢNG WALLETS
--  PK format: W + 4 số cuối UserID + 4 số
--  Ví dụ: W00010001
-- ============================================================
CREATE TABLE dbo.Wallets (
    WalletID        VARCHAR(12)     NOT NULL,
    UserID          VARCHAR(15)     NOT NULL,
    WalletName      NVARCHAR(100)   NOT NULL,
    InitialBalance  DECIMAL(15,2)   NOT NULL DEFAULT 0,
    CurrentBalance  DECIMAL(15,2)   NOT NULL DEFAULT 0,
    Currency        VARCHAR(10)     NOT NULL DEFAULT 'VND',
    IsDefault       BIT             NOT NULL DEFAULT 0,
    CreatedAt       DATETIME        NOT NULL DEFAULT GETDATE(),
    UpdatedAt       DATETIME        NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_Wallets PRIMARY KEY (WalletID),
    CONSTRAINT FK_Wallets_Users FOREIGN KEY (UserID)
        REFERENCES dbo.Users(UserID)
        ON DELETE CASCADE,

    CONSTRAINT UQ_Wallets_User_WalletName UNIQUE (UserID, WalletName),
    CONSTRAINT CK_Wallets_InitialBalance CHECK (InitialBalance >= 0),
    CONSTRAINT CK_Wallets_CurrentBalance CHECK (CurrentBalance >= 0)
);
GO

-- ============================================================
--  5. BẢNG CATEGORIES
--  PK format: CAT + YYMMDD + 3 số
--  Ví dụ: CAT250329001
--  Ghi chú:
--  - UserID = NULL nghĩa là danh mục mặc định của hệ thống
-- ============================================================
CREATE TABLE dbo.Categories (
    CategoryID      VARCHAR(15)     NOT NULL,
    UserID          VARCHAR(15)     NULL,
    CategoryName    NVARCHAR(100)   NOT NULL,
    Icon            VARCHAR(50)     NULL,   -- tên icon hoặc mã icon
    Color           VARCHAR(10)     NULL,   -- mã màu hex, ví dụ: #534AB7
    IsDefault       BIT             NOT NULL DEFAULT 0,
    CreatedAt       DATETIME        NOT NULL DEFAULT GETDATE(),
    UpdatedAt       DATETIME        NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_Categories PRIMARY KEY (CategoryID),
    CONSTRAINT FK_Categories_Users FOREIGN KEY (UserID)
        REFERENCES dbo.Users(UserID)
        ON DELETE SET NULL,

    -- Mỗi user không được có 2 danh mục trùng tên
    CONSTRAINT UQ_Categories_UserName UNIQUE (UserID, CategoryName)
);
GO

-- ============================================================
--  6. BẢNG TRANSACTIONS
--  PK format: TXN + YYMMDD + 4 số
--  Ví dụ: TXN2503290001
-- ============================================================
CREATE TABLE dbo.Transactions (
    TransactionID       VARCHAR(17)     NOT NULL,
    UserID              VARCHAR(15)     NOT NULL,
    WalletID            VARCHAR(12)     NOT NULL,
    CategoryID          VARCHAR(15)     NOT NULL,
    TransactionType     VARCHAR(10)     NOT NULL,      -- expense | income
    Amount              DECIMAL(15,2)   NOT NULL,
    TransactionDate     DATE            NOT NULL,
    Note                NVARCHAR(500)   NULL,
    IsRecurring         BIT             NOT NULL DEFAULT 0,
    RecurInterval       VARCHAR(20)     NULL,          -- daily | weekly | monthly | yearly | NULL
    CreatedAt           DATETIME        NOT NULL DEFAULT GETDATE(),
    UpdatedAt           DATETIME        NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_Transactions PRIMARY KEY (TransactionID),

    CONSTRAINT FK_Transactions_Users FOREIGN KEY (UserID)
        REFERENCES dbo.Users(UserID)
        ON DELETE CASCADE,

    CONSTRAINT FK_Transactions_Wallets FOREIGN KEY (WalletID)
        REFERENCES dbo.Wallets(WalletID),

    CONSTRAINT FK_Transactions_Categories FOREIGN KEY (CategoryID)
        REFERENCES dbo.Categories(CategoryID),

    CONSTRAINT CK_Transactions_Type CHECK (TransactionType IN ('expense', 'income')),
    CONSTRAINT CK_Transactions_Amount CHECK (Amount > 0),
    CONSTRAINT CK_Transactions_Recur CHECK (
        RecurInterval IS NULL OR RecurInterval IN ('daily', 'weekly', 'monthly', 'yearly')
    )
);
GO

-- ============================================================
--  7. BẢNG BUDGETS
--  PK format: BUD + YYMM + 4 số
--  Ví dụ: BUD25030001
--  Ghi chú:
--  - Mỗi user chỉ có 1 budget cho 1 category trong 1 tháng/năm
-- ============================================================
CREATE TABLE dbo.Budgets (
    BudgetID        VARCHAR(13)     NOT NULL,
    UserID          VARCHAR(15)     NOT NULL,
    CategoryID      VARCHAR(15)     NOT NULL,
    LimitAmount     DECIMAL(15,2)   NOT NULL,
    SpentAmount     DECIMAL(15,2)   NOT NULL DEFAULT 0,
    PeriodMonth     TINYINT         NOT NULL,   -- 1..12
    PeriodYear      SMALLINT        NOT NULL,   -- ví dụ 2026
    CreatedAt       DATETIME        NOT NULL DEFAULT GETDATE(),
    UpdatedAt       DATETIME        NOT NULL DEFAULT GETDATE(),

    CONSTRAINT PK_Budgets PRIMARY KEY (BudgetID),

    CONSTRAINT FK_Budgets_Users FOREIGN KEY (UserID)
        REFERENCES dbo.Users(UserID)
        ON DELETE CASCADE,

    CONSTRAINT FK_Budgets_Categories FOREIGN KEY (CategoryID)
        REFERENCES dbo.Categories(CategoryID),

    CONSTRAINT CK_Budgets_Limit CHECK (LimitAmount > 0),
    CONSTRAINT CK_Budgets_Spent CHECK (SpentAmount >= 0),
    CONSTRAINT CK_Budgets_Month CHECK (PeriodMonth BETWEEN 1 AND 12),

    CONSTRAINT UQ_Budgets_UserCatMonth UNIQUE (UserID, CategoryID, PeriodMonth, PeriodYear)
);
GO

-- ============================================================
--  8. INDEX HỖ TRỢ TRUY VẤN THƯỜNG GẶP
-- ============================================================
CREATE INDEX IX_Transactions_User_Date
    ON dbo.Transactions(UserID, TransactionDate DESC);

CREATE INDEX IX_Transactions_Wallet
    ON dbo.Transactions(WalletID);

CREATE INDEX IX_Transactions_Category
    ON dbo.Transactions(CategoryID);

CREATE INDEX IX_Transactions_User_Type_Date
    ON dbo.Transactions(UserID, TransactionType, TransactionDate DESC);

CREATE INDEX IX_Budgets_User_Period
    ON dbo.Budgets(UserID, PeriodYear DESC, PeriodMonth DESC);

CREATE INDEX IX_Categories_User
    ON dbo.Categories(UserID);
GO

-- ============================================================
--  9. STORED PROCEDURE SINH USER ID
--  Format: U + YYMMDD + 4 số
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_GenerateUserID
    @NewID VARCHAR(15) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @DatePart VARCHAR(6) = FORMAT(GETDATE(), 'yyMMdd');
    DECLARE @Prefix   VARCHAR(7) = 'U' + @DatePart;
    DECLARE @LastSeq  INT;

    SELECT @LastSeq = MAX(CAST(RIGHT(UserID, 4) AS INT))
    FROM dbo.Users
    WHERE UserID LIKE @Prefix + '%';

    SET @LastSeq = ISNULL(@LastSeq, 0) + 1;
    SET @NewID   = @Prefix + RIGHT('0000' + CAST(@LastSeq AS VARCHAR), 4);
END;
GO

-- ============================================================
--  10. STORED PROCEDURE SINH WALLET ID
--  Format: W + 4 số cuối UserID + 4 số
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_GenerateWalletID
    @UserID  VARCHAR(15),
    @NewID   VARCHAR(12) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserSuffix VARCHAR(4) = RIGHT(@UserID, 4);
    DECLARE @Prefix     VARCHAR(5) = 'W' + @UserSuffix;
    DECLARE @LastSeq    INT;

    SELECT @LastSeq = MAX(CAST(RIGHT(WalletID, 4) AS INT))
    FROM dbo.Wallets
    WHERE WalletID LIKE @Prefix + '%';

    SET @LastSeq = ISNULL(@LastSeq, 0) + 1;
    SET @NewID   = @Prefix + RIGHT('0000' + CAST(@LastSeq AS VARCHAR), 4);
END;
GO

-- ============================================================
--  11. STORED PROCEDURE SINH CATEGORY ID
--  Format: CAT + YYMMDD + 3 số
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_GenerateCategoryID
    @NewID VARCHAR(15) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @DatePart VARCHAR(6) = FORMAT(GETDATE(), 'yyMMdd');
    DECLARE @Prefix   VARCHAR(9) = 'CAT' + @DatePart;
    DECLARE @LastSeq  INT;

    SELECT @LastSeq = MAX(CAST(RIGHT(CategoryID, 3) AS INT))
    FROM dbo.Categories
    WHERE CategoryID LIKE @Prefix + '%';

    SET @LastSeq = ISNULL(@LastSeq, 0) + 1;
    SET @NewID   = @Prefix + RIGHT('000' + CAST(@LastSeq AS VARCHAR), 3);
END;
GO

-- ============================================================
--  12. STORED PROCEDURE SINH TRANSACTION ID
--  Format: TXN + YYMMDD + 4 số
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_GenerateTransactionID
    @NewID VARCHAR(17) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @DatePart VARCHAR(6) = FORMAT(GETDATE(), 'yyMMdd');
    DECLARE @Prefix   VARCHAR(9) = 'TXN' + @DatePart;
    DECLARE @LastSeq  INT;

    SELECT @LastSeq = MAX(CAST(RIGHT(TransactionID, 4) AS INT))
    FROM dbo.Transactions
    WHERE TransactionID LIKE @Prefix + '%';

    SET @LastSeq = ISNULL(@LastSeq, 0) + 1;
    SET @NewID   = @Prefix + RIGHT('0000' + CAST(@LastSeq AS VARCHAR), 4);
END;
GO

-- ============================================================
--  13. STORED PROCEDURE SINH BUDGET ID
--  Format: BUD + YYMM + 4 số
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_GenerateBudgetID
    @NewID VARCHAR(13) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @MonthPart VARCHAR(4) = FORMAT(GETDATE(), 'yyMM');
    DECLARE @Prefix    VARCHAR(7) = 'BUD' + @MonthPart;
    DECLARE @LastSeq   INT;

    SELECT @LastSeq = MAX(CAST(RIGHT(BudgetID, 4) AS INT))
    FROM dbo.Budgets
    WHERE BudgetID LIKE @Prefix + '%';

    SET @LastSeq = ISNULL(@LastSeq, 0) + 1;
    SET @NewID   = @Prefix + RIGHT('0000' + CAST(@LastSeq AS VARCHAR), 4);
END;
GO

-- ============================================================
--  14. PROCEDURE THÊM GIAO DỊCH
--  - Sinh mã TransactionID
--  - Thêm giao dịch
--  - Cập nhật số dư ví
--  - Cập nhật SpentAmount nếu là giao dịch chi tiêu
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_CreateTransaction
    @UserID          VARCHAR(15),
    @WalletID        VARCHAR(12),
    @CategoryID      VARCHAR(15),
    @TransactionType VARCHAR(10),
    @Amount          DECIMAL(15,2),
    @TransactionDate DATE,
    @Note            NVARCHAR(500) = NULL,
    @IsRecurring     BIT = 0,
    @RecurInterval   VARCHAR(20) = NULL,
    @NewTransID      VARCHAR(17) OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Sinh mã giao dịch mới
        EXEC dbo.sp_GenerateTransactionID @NewID = @NewTransID OUTPUT;

        -- Thêm bản ghi giao dịch
        INSERT INTO dbo.Transactions (
            TransactionID, UserID, WalletID, CategoryID,
            TransactionType, Amount, TransactionDate,
            Note, IsRecurring, RecurInterval
        )
        VALUES (
            @NewTransID, @UserID, @WalletID, @CategoryID,
            @TransactionType, @Amount, @TransactionDate,
            @Note, @IsRecurring, @RecurInterval
        );

        -- Cập nhật số dư ví
        IF @TransactionType = 'income'
        BEGIN
            UPDATE dbo.Wallets
            SET CurrentBalance = CurrentBalance + @Amount,
                UpdatedAt = GETDATE()
            WHERE WalletID = @WalletID;
        END
        ELSE
        BEGIN
            UPDATE dbo.Wallets
            SET CurrentBalance = CurrentBalance - @Amount,
                UpdatedAt = GETDATE()
            WHERE WalletID = @WalletID;
        END

        -- Cập nhật SpentAmount cho budget nếu là giao dịch chi tiêu
        IF @TransactionType = 'expense'
        BEGIN
            DECLARE @TxMonth TINYINT  = MONTH(@TransactionDate);
            DECLARE @TxYear  SMALLINT = YEAR(@TransactionDate);

            UPDATE dbo.Budgets
            SET SpentAmount = SpentAmount + @Amount,
                UpdatedAt   = GETDATE()
            WHERE UserID      = @UserID
              AND CategoryID  = @CategoryID
              AND PeriodMonth = @TxMonth
              AND PeriodYear  = @TxYear;
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- ============================================================
--  15. PROCEDURE XÓA GIAO DỊCH
--  - Hoàn nguyên số dư ví
--  - Hoàn nguyên SpentAmount nếu là chi tiêu
--  - Xóa giao dịch
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_DeleteTransaction
    @TransactionID VARCHAR(17),
    @UserID        VARCHAR(15)
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @WalletID VARCHAR(12);
        DECLARE @CatID    VARCHAR(15);
        DECLARE @Type     VARCHAR(10);
        DECLARE @Amount   DECIMAL(15,2);
        DECLARE @TxDate   DATE;

        -- Lấy thông tin giao dịch cần xóa
        SELECT
            @WalletID = WalletID,
            @CatID    = CategoryID,
            @Type     = TransactionType,
            @Amount   = Amount,
            @TxDate   = TransactionDate
        FROM dbo.Transactions
        WHERE TransactionID = @TransactionID
          AND UserID        = @UserID;

        IF @@ROWCOUNT = 0
            THROW 50001, N'Giao dịch không tồn tại hoặc không có quyền xóa.', 1;

        -- Hoàn nguyên số dư ví
        IF @Type = 'income'
        BEGIN
            UPDATE dbo.Wallets
            SET CurrentBalance = CurrentBalance - @Amount,
                UpdatedAt = GETDATE()
            WHERE WalletID = @WalletID;
        END
        ELSE
        BEGIN
            UPDATE dbo.Wallets
            SET CurrentBalance = CurrentBalance + @Amount,
                UpdatedAt = GETDATE()
            WHERE WalletID = @WalletID;
        END

        -- Hoàn nguyên SpentAmount trong budget nếu là chi tiêu
        IF @Type = 'expense'
        BEGIN
            UPDATE dbo.Budgets
            SET SpentAmount = CASE
                                WHEN SpentAmount - @Amount < 0 THEN 0
                                ELSE SpentAmount - @Amount
                              END,
                UpdatedAt = GETDATE()
            WHERE UserID      = @UserID
              AND CategoryID  = @CatID
              AND PeriodMonth = MONTH(@TxDate)
              AND PeriodYear  = YEAR(@TxDate);
        END

        -- Xóa giao dịch
        DELETE FROM dbo.Transactions
        WHERE TransactionID = @TransactionID
          AND UserID        = @UserID;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- ============================================================
--  16. PROCEDURE BÁO CÁO TỔNG THU/CHI THEO THÁNG
--  Dùng cho biểu đồ cột/đường
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_GetMonthlySummary
    @UserID VARCHAR(15),
    @Year   SMALLINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        MONTH(TransactionDate) AS [Month],
        SUM(CASE WHEN TransactionType = 'income'  THEN Amount ELSE 0 END) AS TotalIncome,
        SUM(CASE WHEN TransactionType = 'expense' THEN Amount ELSE 0 END) AS TotalExpense
    FROM dbo.Transactions
    WHERE UserID = @UserID
      AND YEAR(TransactionDate) = @Year
    GROUP BY MONTH(TransactionDate)
    ORDER BY [Month];
END;
GO

-- ============================================================
--  17. PROCEDURE BÁO CÁO CHI TIÊU THEO DANH MỤC
--  Dùng cho biểu đồ tròn
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_GetCategorySummary
    @UserID VARCHAR(15),
    @Month  TINYINT,
    @Year   SMALLINT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.CategoryID,
        c.CategoryName,
        c.Icon,
        c.Color,
        SUM(t.Amount) AS TotalAmount,
        CAST(
            SUM(t.Amount) * 100.0
            / NULLIF(SUM(SUM(t.Amount)) OVER (), 0)
            AS DECIMAL(5,2)
        ) AS Percentage
    FROM dbo.Transactions t
    INNER JOIN dbo.Categories c
        ON t.CategoryID = c.CategoryID
    WHERE t.UserID = @UserID
      AND t.TransactionType = 'expense'
      AND MONTH(t.TransactionDate) = @Month
      AND YEAR(t.TransactionDate)  = @Year
    GROUP BY c.CategoryID, c.CategoryName, c.Icon, c.Color
    ORDER BY TotalAmount DESC;
END;
GO

-- ============================================================
--  18. PROCEDURE LẤY DỮ LIỆU DASHBOARD TỔNG QUAN
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_GetDashboardOverview
    @UserID VARCHAR(15)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @ThisMonth TINYINT  = MONTH(GETDATE());
    DECLARE @ThisYear  SMALLINT = YEAR(GETDATE());

    SELECT
        -- Tổng số dư tất cả ví
        (SELECT ISNULL(SUM(CurrentBalance), 0)
         FROM dbo.Wallets
         WHERE UserID = @UserID) AS TotalBalance,

        -- Tổng thu tháng hiện tại
        (SELECT ISNULL(SUM(Amount), 0)
         FROM dbo.Transactions
         WHERE UserID = @UserID
           AND TransactionType = 'income'
           AND MONTH(TransactionDate) = @ThisMonth
           AND YEAR(TransactionDate)  = @ThisYear) AS MonthlyIncome,

        -- Tổng chi tháng hiện tại
        (SELECT ISNULL(SUM(Amount), 0)
         FROM dbo.Transactions
         WHERE UserID = @UserID
           AND TransactionType = 'expense'
           AND MONTH(TransactionDate) = @ThisMonth
           AND YEAR(TransactionDate)  = @ThisYear) AS MonthlyExpense,

        -- Số giao dịch tháng hiện tại
        (SELECT COUNT(*)
         FROM dbo.Transactions
         WHERE UserID = @UserID
           AND MONTH(TransactionDate) = @ThisMonth
           AND YEAR(TransactionDate)  = @ThisYear) AS TransactionCount;
END;
GO

-- ============================================================
--  19. SEED DATA - DANH MỤC MẶC ĐỊNH HỆ THỐNG
--  UserID = NULL nghĩa là danh mục mặc định
-- ============================================================
INSERT INTO dbo.Categories (CategoryID, UserID, CategoryName, Icon, Color, IsDefault)
VALUES
    ('CAT000000001', NULL, N'Ăn uống',      'bx-restaurant',      '#D85A30', 1),
    ('CAT000000002', NULL, N'Đi lại',       'bx-car',             '#185FA5', 1),
    ('CAT000000003', NULL, N'Mua sắm',      'bx-shopping-bag',    '#993556', 1),
    ('CAT000000004', NULL, N'Giải trí',     'bx-game',            '#534AB7', 1),
    ('CAT000000005', NULL, N'Sức khỏe',     'bx-plus-medical',    '#0F6E56', 1),
    ('CAT000000006', NULL, N'Giáo dục',     'bx-book-open',       '#854F0B', 1),
    ('CAT000000007', NULL, N'Hóa đơn',      'bx-home',            '#5F5E5A', 1),
    ('CAT000000008', NULL, N'Tiết kiệm',    'bx-wallet',          '#3B6D11', 1),
    ('CAT000000009', NULL, N'Du lịch',      'bx-plane',           '#1D9E75', 1),
    ('CAT000000010', NULL, N'Khác',         'bx-dots-horizontal', '#888780', 1);
GO

-- ============================================================
--  20. SEED DATA - TÀI KHOẢN ADMIN MẪU
--  password: Admin@123
--  Ghi chú: PasswordHash là hash mẫu, thay bằng hash thực khi deploy
-- ============================================================
DECLARE @AdminID VARCHAR(15) = 'U2503290001';

INSERT INTO dbo.Users (UserID, FullName, Email, PasswordHash, Role, Status)
VALUES (
    @AdminID,
    N'Quản trị viên',
    'admin@expenseapp.vn',
    '$2b$12$LQv3c1yqBWVHxkd0LQ1XJeWbzVLILbK/7A8YBz6mO4mFRtXqM8G..',
    'admin',
    'active'
);
GO

-- Tạo ví mặc định cho admin
DECLARE @WalletID VARCHAR(12);
EXEC dbo.sp_GenerateWalletID @UserID = 'U2503290001', @NewID = @WalletID OUTPUT;

INSERT INTO dbo.Wallets (WalletID, UserID, WalletName, InitialBalance, CurrentBalance, IsDefault)
VALUES (@WalletID, 'U2503290001', N'Tiền mặt', 5000000, 5000000, 1);
GO

-- ============================================================
--  21. KIỂM TRA DỮ LIỆU KHỞI TẠO
-- ============================================================
SELECT 'Users' AS TableName, COUNT(*) AS Records FROM dbo.Users
UNION ALL
SELECT 'Wallets', COUNT(*) FROM dbo.Wallets
UNION ALL
SELECT 'Categories', COUNT(*) FROM dbo.Categories
UNION ALL
SELECT 'Transactions', COUNT(*) FROM dbo.Transactions
UNION ALL
SELECT 'Budgets', COUNT(*) FROM dbo.Budgets;
GO

-- ============================================================
--  22. THÔNG BÁO HOÀN TẤT
-- ============================================================
PRINT N'✅ ExpenseDB đã được tạo thành công!';
PRINT N'   - 5 bảng với đầy đủ PK, FK, CONSTRAINT';
PRINT N'   - 10 Stored Procedures (5 sinh ID + 2 nghiệp vụ + 3 báo cáo)';
PRINT N'   - 10 danh mục mặc định';
PRINT N'   - 1 user admin mẫu + 1 ví tiền mặc định';
GO