using System.Globalization;
using System.Text;
using System.Text.Json;
using ExpenseWeb.Models.Dtos.Category;
using ExpenseWeb.Models.Dtos.Reports;
using ExpenseWeb.Models.Dtos.Transaction;
using ExpenseWeb.Models.Dtos.Wallet;
using ExpenseWeb.Models.ViewModels.Dashboard;
using ExpenseWeb.Services.Api;
using Microsoft.AspNetCore.Mvc;
using ExpenseWeb.Filters;

namespace ExpenseWeb.Controllers
{
    [RequireRole("user")]
    public class DashboardController : Controller
    {
        private readonly WalletApiService _walletApiService;
        private readonly ReportApiService _reportApiService;
        private readonly TransactionApiService _transactionApiService;
        private readonly CategoryApiService _categoryApiService;

        public DashboardController(
            WalletApiService walletApiService,
            ReportApiService reportApiService,
            TransactionApiService transactionApiService,
            CategoryApiService categoryApiService)
        {
            _walletApiService = walletApiService;
            _reportApiService = reportApiService;
            _transactionApiService = transactionApiService;
            _categoryApiService = categoryApiService;
        }

        public async Task<IActionResult> Index(string? period = null)
        {
            var token = HttpContext.Session.GetString("AccessToken");
            if (string.IsNullOrEmpty(token))
            {
                return RedirectToAction("Login", "Auth");
            }

            var now = DateTime.Now;
            var periodPreset = NormalizePeriod(period);
            var (resolvedStartDate, resolvedEndDate, selectedGroupBy, periodLabel) = ResolvePeriod(periodPreset, now);
            var budgetMonth = now.Month;
            var budgetYear = now.Year;

            ViewBag.UserFullName = HttpContext.Session.GetString("UserFullName");
            ViewBag.FilterPeriodText = periodLabel;

            var model = new DashboardIndexViewModel
            {
                SelectedMonth = budgetMonth,
                SelectedYear = budgetYear,
                StartDate = resolvedStartDate,
                EndDate = resolvedEndDate,
                Granularity = selectedGroupBy,
                PeriodPreset = periodPreset,
                PeriodLabel = periodLabel
            };

            List<WalletResponseDto> wallets = new();
            List<CategoryResponseDto> categories = new();
            List<TransactionResponseDto> transactions = new();

            try
            {
                var walletTask = _walletApiService.GetWalletsAsync(token);
                var categoryTask = _categoryApiService.GetCategoriesAsync(token);
                var transactionTask = _transactionApiService.GetTransactionsAsync(token);

                await Task.WhenAll(walletTask, categoryTask, transactionTask);

                wallets = walletTask.Result;
                categories = categoryTask.Result;
                transactions = transactionTask.Result;

                model.Wallets = wallets.Select(MapWallet).ToList();
                model.ActiveWalletCount = model.Wallets.Count;
                model.TotalBalance = model.Wallets.Sum(x => x.CurrentBalance);

                var today = now.Date;
                var todayTransactions = transactions
                    .Where(x => x.transaction_date.Date == today)
                    .OrderByDescending(x => x.transaction_date)
                    .ThenByDescending(x => x.transaction_id)
                    .ToList();

                model.TodayIncome = todayTransactions.Where(x => x.transaction_type == "income").Sum(x => x.amount);
                model.TodayExpense = todayTransactions.Where(x => x.transaction_type == "expense").Sum(x => x.amount);
                model.TodayIncomeCount = todayTransactions.Count(x => x.transaction_type == "income");
                model.TodayExpenseCount = todayTransactions.Count(x => x.transaction_type == "expense");

                var walletLookup = wallets.ToDictionary(x => x.wallet_id, x => x.wallet_name);
                var categoryLookup = categories.ToDictionary(x => x.category_id, x => x);

                model.RecentTransactions = todayTransactions
                    .Take(5)
                    .Select(x => MapRecentTransaction(x, walletLookup, categoryLookup))
                    .ToList();
            }
            catch (Exception ex)
            {
                model.ErrorMessage = ExtractApiMessage(ex.Message, "Không thể tải danh sách ví và giao dịch gần đây.");
            }

            try
            {
                await PopulateReportDataAsync(model, token, periodPreset, now);
            }
            catch (Exception ex)
            {
                model.ReportErrorMessage = ExtractApiMessage(ex.Message, "Không thể tải dữ liệu báo cáo dashboard.");
            }

            return View(model);
        }

        [HttpGet]
        public async Task<IActionResult> Insights(string? period = null)
        {
            var token = HttpContext.Session.GetString("AccessToken");
            if (string.IsNullOrEmpty(token))
            {
                return Unauthorized(new { success = false, message = "Phiên đăng nhập đã hết hạn." });
            }

            try
            {
                var now = DateTime.Now;
                var model = new DashboardIndexViewModel();
                await PopulateReportDataAsync(model, token, NormalizePeriod(period), now);

                var warningBudgets = model.BudgetProgress
                    .Where(x => x.Status == "over" || x.Status == "reached" || x.PercentageUsed >= 80)
                    .OrderByDescending(x => x.PercentageUsed)
                    .Take(4)
                    .ToList();

                return Json(new
                {
                    success = true,
                    periodPreset = model.PeriodPreset,
                    periodLabel = model.PeriodLabel,
                    rangeIncome = model.RangeIncome,
                    rangeExpense = model.RangeExpense,
                    rangeTransactionCount = model.RangeTransactionCount,
                    busiestLabel = string.IsNullOrWhiteSpace(model.BusiestLabel) ? string.Empty : model.BusiestLabel,
                    trendLabels = model.CashflowSeries.Select(x => x.Label).ToList(),
                    trendIncome = model.CashflowSeries.Select(x => x.Income).ToList(),
                    trendExpense = model.CashflowSeries.Select(x => x.Expense).ToList(),
                    categoryBreakdown = model.CategoryBreakdown.Select(x => new
                    {
                        categoryId = x.CategoryId,
                        categoryName = x.CategoryName,
                        icon = x.Icon,
                        color = x.Color,
                        totalAmount = x.TotalAmount,
                        percentage = x.Percentage
                    }).ToList(),
                    budgetAlerts = warningBudgets.Select(x => new
                    {
                        categoryName = x.CategoryName,
                        categoryColor = string.IsNullOrWhiteSpace(x.CategoryColor) ? "#8592A3" : x.CategoryColor,
                        percentageUsed = x.PercentageUsed,
                        spentAmount = x.SpentAmount,
                        limitAmount = x.LimitAmount,
                        remainingAmount = x.RemainingAmount,
                        status = x.Status
                    }).ToList()
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ExtractApiMessage(ex.Message, "Không thể tải dữ liệu dashboard.") });
            }
        }

        [HttpGet]
        public async Task<IActionResult> ExportMonthlySummaryCsv(int year)
        {
            var token = HttpContext.Session.GetString("AccessToken");
            if (string.IsNullOrEmpty(token))
                return RedirectToAction("Login", "Auth");

            var rows = await _reportApiService.GetMonthlySummaryAsync(token, year);

            var sb = new StringBuilder();
            sb.AppendLine("Month,TotalIncome,TotalExpense");
            foreach (var row in rows)
            {
                sb.AppendLine($"{row.month},{row.total_income.ToString(CultureInfo.InvariantCulture)},{row.total_expense.ToString(CultureInfo.InvariantCulture)}");
            }

            var bytes = Encoding.UTF8.GetBytes(sb.ToString());
            return File(bytes, "text/csv", $"monthly_summary_{year}.csv");
        }

        [HttpGet]
        public async Task<IActionResult> ExportCategorySummaryCsv(int month, int year)
        {
            var token = HttpContext.Session.GetString("AccessToken");
            if (string.IsNullOrEmpty(token))
                return RedirectToAction("Login", "Auth");

            var rows = await _reportApiService.GetCategorySummaryAsync(token, month, year);

            var sb = new StringBuilder();
            sb.AppendLine("CategoryName,TotalAmount,Percentage");
            foreach (var row in rows)
            {
                sb.AppendLine($"{Csv(row.category_name)},{row.total_amount.ToString(CultureInfo.InvariantCulture)},{row.percentage.ToString(CultureInfo.InvariantCulture)}");
            }

            var bytes = Encoding.UTF8.GetBytes(sb.ToString());
            return File(bytes, "text/csv", $"category_summary_{year}_{month:D2}.csv");
        }

        [HttpGet]
        public async Task<IActionResult> ExportTopExpensesCsv(int month, int year)
        {
            var token = HttpContext.Session.GetString("AccessToken");
            if (string.IsNullOrEmpty(token))
                return RedirectToAction("Login", "Auth");

            var rows = await _reportApiService.GetTopExpensesAsync(token, month, year, 20);

            var sb = new StringBuilder();
            sb.AppendLine("TransactionDate,Category,Wallet,Note,Amount");
            foreach (var row in rows)
            {
                sb.AppendLine($"{row.transaction_date:yyyy-MM-dd},{Csv(row.category_name)},{Csv(row.wallet_name)},{Csv(row.note ?? string.Empty)},{row.amount.ToString(CultureInfo.InvariantCulture)}");
            }

            var bytes = Encoding.UTF8.GetBytes(sb.ToString());
            return File(bytes, "text/csv", $"top_expenses_{year}_{month:D2}.csv");
        }

        [HttpPost]
        public async Task<IActionResult> CreateWalletAjax([FromBody] WalletCreateRequestDto request)
        {
            var token = HttpContext.Session.GetString("AccessToken");
            if (string.IsNullOrEmpty(token))
                return Unauthorized(new { success = false, message = "Phiên đăng nhập đã hết hạn." });

            if (request == null || string.IsNullOrWhiteSpace(request.wallet_name))
                return BadRequest(new { success = false, message = "Tên ví không được để trống." });

            try
            {
                var created = await _walletApiService.CreateWalletAsync(token, request);
                return Json(new { success = true, message = "Tạo ví thành công.", wallet = MapWallet(created) });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ExtractApiMessage(ex.Message, "Không thể tạo ví.") });
            }
        }

        [HttpPut]
        public async Task<IActionResult> UpdateWalletAjax(string id, [FromBody] WalletUpdateRequestDto request)
        {
            var token = HttpContext.Session.GetString("AccessToken");
            if (string.IsNullOrEmpty(token))
                return Unauthorized(new { success = false, message = "Phiên đăng nhập đã hết hạn." });

            if (string.IsNullOrWhiteSpace(id))
                return BadRequest(new { success = false, message = "Thiếu mã ví." });

            if (request == null || string.IsNullOrWhiteSpace(request.wallet_name))
                return BadRequest(new { success = false, message = "Tên ví không được để trống." });

            try
            {
                var updated = await _walletApiService.UpdateWalletAsync(token, id, request);
                return Json(new { success = true, message = "Cập nhật ví thành công.", wallet = MapWallet(updated) });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ExtractApiMessage(ex.Message, "Không thể cập nhật ví.") });
            }
        }

        [HttpDelete]
        public async Task<IActionResult> DeleteWalletAjax(string id, [FromBody] WalletDeleteRequestDto request)
        {
            var token = HttpContext.Session.GetString("AccessToken");
            if (string.IsNullOrEmpty(token))
                return Unauthorized(new { success = false, message = "Phiên đăng nhập đã hết hạn." });

            if (string.IsNullOrWhiteSpace(id))
                return BadRequest(new { success = false, message = "Thiếu mã ví." });

            if (request == null || string.IsNullOrWhiteSpace(request.mode))
                return BadRequest(new { success = false, message = "Thiếu chế độ xóa ví." });

            try
            {
                await _walletApiService.DeleteWalletAsync(token, id, request);
                return Json(new { success = true, message = "Xóa ví thành công." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ExtractApiMessage(ex.Message, "Không thể xóa ví.") });
            }
        }

        private async Task PopulateReportDataAsync(DashboardIndexViewModel model, string token, string periodPreset, DateTime now)
        {
            var (resolvedStartDate, resolvedEndDate, selectedGroupBy, periodLabel) = ResolvePeriod(periodPreset, now);
            var budgetMonth = now.Month;
            var budgetYear = now.Year;

            model.StartDate = resolvedStartDate;
            model.EndDate = resolvedEndDate;
            model.Granularity = selectedGroupBy;
            model.PeriodPreset = periodPreset;
            model.PeriodLabel = periodLabel;
            model.SelectedMonth = budgetMonth;
            model.SelectedYear = budgetYear;

            var overview = await _reportApiService.GetDashboardOverviewRangeAsync(token, resolvedStartDate, resolvedEndDate);
            model.MonthlyIncome = overview.monthly_income;
            model.MonthlyExpense = overview.monthly_expense;
            model.TransactionCount = overview.transaction_count;
            model.RangeIncome = overview.monthly_income;
            model.RangeExpense = overview.monthly_expense;
            model.RangeNetChange = overview.monthly_income - overview.monthly_expense;
            model.RangeTransactionCount = overview.transaction_count;

            var analytics = await _reportApiService.GetCashflowAnalyticsAsync(token, resolvedStartDate, resolvedEndDate, selectedGroupBy);
            model.CashflowSeries = analytics.series.Select(dto => MapCashflowSeries(dto, periodPreset)).ToList();
            model.RangeIncome = analytics.total_income;
            model.RangeExpense = analytics.total_expense;
            model.RangeNetChange = analytics.net_change;
            model.RangeTransactionCount = analytics.transaction_count;
            model.RangeAverageExpense = analytics.average_expense;
            model.BusiestLabel = FormatBusiestLabel(analytics.busiest_label, periodPreset);
            model.MonthlyIncome = analytics.total_income;
            model.MonthlyExpense = analytics.total_expense;
            model.TransactionCount = analytics.transaction_count;

            var categorySummary = await _reportApiService.GetCategorySummaryRangeAsync(token, resolvedStartDate, resolvedEndDate);
            model.CategoryBreakdown = categorySummary.Select(MapCategoryBreakdown).ToList();

            var budgetProgress = await _reportApiService.GetBudgetProgressAsync(token, budgetMonth, budgetYear);
            model.BudgetProgress = budgetProgress
                .Select(MapBudgetProgress)
                .OrderByDescending(x => x.PercentageUsed)
                .ToList();
        }

        private static string NormalizePeriod(string? period)
        {
            var value = (period ?? "month").Trim().ToLowerInvariant();
            return value is "week" or "month" or "year" ? value : "month";
        }

        private static (DateTime Start, DateTime End, string GroupBy, string Label) ResolvePeriod(string period, DateTime now)
        {
            if (period == "week")
            {
                var end = now.Date;
                var start = end.AddDays(-6);
                return (start, end, "day", $"7 ngày gần nhất ({start:dd/MM} - {end:dd/MM})");
            }

            if (period == "year")
            {
                var start = new DateTime(now.Year, 1, 1);
                var end = new DateTime(now.Year, 12, 31);
                return (start, end, "month", $"Năm {now.Year}");
            }

            var monthStart = new DateTime(now.Year, now.Month, 1);
            var monthEnd = new DateTime(now.Year, now.Month, DateTime.DaysInMonth(now.Year, now.Month));
            return (monthStart, monthEnd, "day", $"Tháng {now.Month:D2}/{now.Year}");
        }

        private static string Csv(string? input)
        {
            if (string.IsNullOrEmpty(input))
                return "\"\"";

            var escaped = input.Replace("\"", "\"\"");
            return "\"" + escaped + "\"";
        }

        private static DashboardCashflowSeriesItemViewModel MapCashflowSeries(CashflowSeriesItemDto dto, string periodPreset)
        {
            return new DashboardCashflowSeriesItemViewModel
            {
                Key = dto.key,
                Label = FormatSeriesLabel(dto, periodPreset),
                Income = dto.income,
                Expense = dto.expense,
                Net = dto.net,
                RunningBalance = dto.running_balance
            };
        }

        private static string FormatSeriesLabel(CashflowSeriesItemDto dto, string periodPreset)
        {
            if (DateTime.TryParse(dto.key, out var parsed) || DateTime.TryParse(dto.label, out parsed))
            {
                return periodPreset switch
                {
                    "month" => parsed.ToString("dd"),
                    "year" => $"T{parsed.Month:D2}",
                    _ => parsed.ToString("dd/MM")
                };
            }

            if (periodPreset == "month" && dto.label.Contains('/'))
            {
                return dto.label.Split('/')[0];
            }

            return dto.label;
        }

        private static string FormatBusiestLabel(string? rawLabel, string periodPreset)
        {
            if (string.IsNullOrWhiteSpace(rawLabel))
                return string.Empty;

            if (DateTime.TryParse(rawLabel, out var parsed))
            {
                return periodPreset switch
                {
                    "month" => parsed.ToString("dd/MM"),
                    "year" => $"Tháng {parsed.Month:D2}",
                    _ => parsed.ToString("dd/MM")
                };
            }

            return rawLabel;
        }

        private static DashboardWalletItemViewModel MapWallet(WalletResponseDto dto)
        {
            return new DashboardWalletItemViewModel
            {
                WalletId = dto.wallet_id,
                WalletName = dto.wallet_name,
                InitialBalance = dto.initial_balance,
                CurrentBalance = dto.current_balance,
                Currency = dto.currency,
                IsDefault = dto.is_default
            };
        }

        private static DashboardCategoryBreakdownViewModel MapCategoryBreakdown(CategorySummaryItemDto dto)
        {
            return new DashboardCategoryBreakdownViewModel
            {
                CategoryId = dto.category_id,
                CategoryName = dto.category_name,
                Icon = dto.icon,
                Color = string.IsNullOrWhiteSpace(dto.color) ? "#8592A3" : dto.color,
                TotalAmount = dto.total_amount,
                Percentage = dto.percentage
            };
        }

        private static DashboardRecentTransactionItemViewModel MapRecentTransaction(
            TransactionResponseDto dto,
            IReadOnlyDictionary<string, string> walletLookup,
            IReadOnlyDictionary<string, CategoryResponseDto> categoryLookup)
        {
            categoryLookup.TryGetValue(dto.category_id, out var category);
            walletLookup.TryGetValue(dto.wallet_id, out var walletName);

            return new DashboardRecentTransactionItemViewModel
            {
                TransactionId = dto.transaction_id,
                TransactionDate = dto.transaction_date,
                TransactionType = string.IsNullOrWhiteSpace(dto.transaction_type) ? "expense" : dto.transaction_type,
                Amount = dto.amount,
                WalletName = walletName ?? dto.wallet_id,
                CategoryName = category?.category_name ?? dto.category_id,
                CategoryIcon = category?.icon,
                CategoryColor = category?.color,
                Note = string.IsNullOrWhiteSpace(dto.note) ? "Không có ghi chú" : dto.note!
            };
        }

        private static DashboardTopExpenseItemViewModel MapTopExpense(TopExpenseItemDto dto)
        {
            return new DashboardTopExpenseItemViewModel
            {
                TransactionId = dto.transaction_id,
                TransactionDate = dto.transaction_date,
                Amount = dto.amount,
                Note = string.IsNullOrWhiteSpace(dto.note) ? "Không có ghi chú" : dto.note!,
                WalletName = dto.wallet_name,
                CategoryName = dto.category_name,
                CategoryIcon = dto.category_icon,
                CategoryColor = dto.category_color
            };
        }

        private static DashboardBudgetProgressItemViewModel MapBudgetProgress(BudgetProgressItemDto dto)
        {
            return new DashboardBudgetProgressItemViewModel
            {
                BudgetId = dto.budget_id,
                CategoryId = dto.category_id,
                CategoryName = dto.category_name,
                CategoryIcon = dto.category_icon,
                CategoryColor = dto.category_color,
                LimitAmount = dto.limit_amount,
                SpentAmount = dto.spent_amount,
                RemainingAmount = dto.remaining_amount,
                PercentageUsed = dto.percentage_used,
                Status = dto.status
            };
        }

        private static string ExtractApiMessage(string raw, string fallback)
        {
            if (string.IsNullOrWhiteSpace(raw))
                return fallback;

            try
            {
                using var doc = JsonDocument.Parse(raw);
                if (doc.RootElement.TryGetProperty("detail", out var detail) && detail.ValueKind == JsonValueKind.String)
                    return detail.GetString() ?? fallback;
                if (doc.RootElement.TryGetProperty("message", out var message) && message.ValueKind == JsonValueKind.String)
                    return message.GetString() ?? fallback;
            }
            catch
            {
            }

            return raw;
        }
    }
}
