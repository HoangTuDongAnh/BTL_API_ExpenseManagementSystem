using System.Globalization;
using System.Text;
using System.Text.Json;
using ExpenseWeb.Models.Dtos.Reports;
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

        public DashboardController(
            WalletApiService walletApiService,
            ReportApiService reportApiService)
        {
            _walletApiService = walletApiService;
            _reportApiService = reportApiService;
        }

        public async Task<IActionResult> Index(int? month, int? year, DateTime? startDate, DateTime? endDate, string? groupBy)
        {
            var token = HttpContext.Session.GetString("AccessToken");
            if (string.IsNullOrEmpty(token))
            {
                return RedirectToAction("Login", "Auth");
            }

            var now = DateTime.Now;
            var selectedMonth = month.GetValueOrDefault(now.Month);
            var selectedYear = year.GetValueOrDefault(now.Year);

            var resolvedStartDate = startDate?.Date ?? new DateTime(selectedYear, selectedMonth, 1);
            var resolvedEndDate = endDate?.Date ?? new DateTime(selectedYear, selectedMonth, DateTime.DaysInMonth(selectedYear, selectedMonth));
            if (resolvedEndDate < resolvedStartDate)
            {
                (resolvedStartDate, resolvedEndDate) = (resolvedEndDate, resolvedStartDate);
            }

            var selectedGroupBy = NormalizeGroupBy(groupBy);

            ViewBag.UserFullName = HttpContext.Session.GetString("UserFullName");
            ViewBag.FilterStartDate = resolvedStartDate.ToString("yyyy-MM-dd");
            ViewBag.FilterEndDate = resolvedEndDate.ToString("yyyy-MM-dd");
            ViewBag.FilterPeriodText = $"{resolvedStartDate:dd-MM-yyyy}-{resolvedEndDate:dd-MM-yyyy}";
            ViewBag.GroupBy = selectedGroupBy;

            var model = new DashboardIndexViewModel
            {
                SelectedMonth = selectedMonth,
                SelectedYear = selectedYear
            };

            try
            {
                var wallets = await _walletApiService.GetWalletsAsync(token);
                model.Wallets = wallets.Select(MapWallet).ToList();
            }
            catch (Exception ex)
            {
                model.ErrorMessage = ExtractApiMessage(ex.Message, "Không thể tải danh sách ví.");
            }

            try
            {
                var overview = await _reportApiService.GetDashboardOverviewAsync(token);
                model.TotalBalance = overview.total_balance;
                model.MonthlyIncome = overview.monthly_income;
                model.MonthlyExpense = overview.monthly_expense;
                model.TransactionCount = overview.transaction_count;

                var monthlySummary = await _reportApiService.GetMonthlySummaryAsync(token, selectedYear);
                model.MonthlyTrend = BuildMonthlyTrend(monthlySummary);

                var categorySummary = await _reportApiService.GetCategorySummaryAsync(token, selectedMonth, selectedYear);
                model.CategoryBreakdown = categorySummary.Select(MapCategoryBreakdown).ToList();

                var topExpenses = await _reportApiService.GetTopExpensesAsync(token, selectedMonth, selectedYear, 5);
                model.TopExpenses = topExpenses.Select(MapTopExpense).ToList();

                var budgetProgress = await _reportApiService.GetBudgetProgressAsync(token, selectedMonth, selectedYear);
                model.BudgetProgress = budgetProgress.Select(MapBudgetProgress).ToList();
            }
            catch (Exception ex)
            {
                model.ReportErrorMessage = ExtractApiMessage(ex.Message, "Không thể tải dữ liệu báo cáo dashboard.");
            }

            return View(model);
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

        private static string NormalizeGroupBy(string? groupBy)
        {
            var value = (groupBy ?? "day").Trim().ToLowerInvariant();
            return value is "day" or "week" or "month" or "year" ? value : "day";
        }

        private static string Csv(string? input)
        {
            if (string.IsNullOrEmpty(input))
                return "\"\"";

            var escaped = input.Replace("\"", "\"\"");
            return "\"" + escaped + "\"";
        }

        private static List<DashboardReportPointViewModel> BuildMonthlyTrend(List<MonthlySummaryItemDto> items)
        {
            var map = items.ToDictionary(x => x.month);
            var result = new List<DashboardReportPointViewModel>();

            for (var month = 1; month <= 12; month++)
            {
                map.TryGetValue(month, out var item);
                result.Add(new DashboardReportPointViewModel
                {
                    Label = $"T{month}",
                    Income = item?.total_income ?? 0,
                    Expense = item?.total_expense ?? 0
                });
            }

            return result;
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