using System.Globalization;
using System.Text.Json;
using ExpenseWeb.Models.Dtos.Category;
using ExpenseWeb.Models.ViewModels.Category;
using ExpenseWeb.Services.Api;
using Microsoft.AspNetCore.Mvc;

namespace ExpenseWeb.Controllers
{
    public class CategoryController : Controller
    {
        private readonly CategoryApiService _categoryApiService;

        public CategoryController(CategoryApiService categoryApiService)
        {
            _categoryApiService = categoryApiService;
        }

        [HttpGet]
        public async Task<IActionResult> Index(string? periodType, int? year, int? month, int? week, string? lang)
        {
            var token = HttpContext.Session.GetString("AccessToken");
            if (string.IsNullOrEmpty(token))
            {
                return RedirectToAction("Login", "Auth");
            }

            ViewBag.UserFullName = HttpContext.Session.GetString("UserFullName");

            var now = DateTime.Now;
            var resolvedPeriodType = string.IsNullOrWhiteSpace(periodType) ? "month" : periodType.Trim().ToLowerInvariant();
            var resolvedYear = year ?? now.Year;
            int? resolvedMonth = resolvedPeriodType == "month" ? (month ?? now.Month) : (int?)null;
            int? resolvedWeek = resolvedPeriodType == "week" ? (week ?? ISOWeek.GetWeekOfYear(now)) : (int?)null;
            var resolvedLang = string.IsNullOrWhiteSpace(lang) ? "vi" : lang.Trim().ToLowerInvariant();

            var viewModel = new CategoryPageViewModel
            {
                Lang = resolvedLang,
                CurrentPeriodType = resolvedPeriodType,
                CurrentYear = resolvedYear,
                CurrentMonth = resolvedMonth,
                CurrentWeek = resolvedWeek
            };

            try
            {
                viewModel.Categories = await _categoryApiService.GetOverviewAsync(
                    token,
                    resolvedPeriodType,
                    resolvedYear,
                    resolvedMonth,
                    resolvedWeek
                );
            }
            catch (Exception ex)
            {
                viewModel.Categories = new List<CategoryOverviewResponseDto>();
                TempData["CategoryPageError"] = ExtractApiMessage(ex.Message, "Không tải được dữ liệu danh mục từ API.");
            }

            return View(viewModel);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CategoryCreateRequestDto request)
        {
            var token = HttpContext.Session.GetString("AccessToken");
            if (string.IsNullOrEmpty(token))
            {
                return Unauthorized(new { success = false, message = "Phiên đăng nhập đã hết hạn." });
            }

            try
            {
                await _categoryApiService.CreateCategoryAsync(token, request);
                return Json(new { success = true, message = "Tạo danh mục thành công." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ExtractApiMessage(ex.Message, "Tạo danh mục thất bại.") });
            }
        }

        [HttpPut]
        public async Task<IActionResult> Update(string id, [FromBody] CategoryUpdateRequestDto request)
        {
            var token = HttpContext.Session.GetString("AccessToken");
            if (string.IsNullOrEmpty(token))
            {
                return Unauthorized(new { success = false, message = "Phiên đăng nhập đã hết hạn." });
            }

            try
            {
                await _categoryApiService.UpdateCategoryAsync(token, id, request);
                return Json(new { success = true, message = "Cập nhật danh mục thành công." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ExtractApiMessage(ex.Message, "Cập nhật danh mục thất bại.") });
            }
        }

        [HttpDelete]
        public async Task<IActionResult> Delete(string id)
        {
            var token = HttpContext.Session.GetString("AccessToken");
            if (string.IsNullOrEmpty(token))
            {
                return Unauthorized(new { success = false, message = "Phiên đăng nhập đã hết hạn." });
            }

            try
            {
                await _categoryApiService.DeleteCategoryAsync(token, id, new CategoryDeleteRequestDto
                {
                    replacement_category_id = id
                });

                return Json(new
                {
                    success = true,
                    message = "Xóa danh mục và toàn bộ hạn mức, giao dịch liên quan thành công."
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ExtractApiMessage(ex.Message, "Xóa danh mục thất bại.") });
            }
        }

        public class SaveBudgetWebRequest
        {
            public string category_id { get; set; } = string.Empty;
            public string period_type { get; set; } = "month";
            public decimal? limit_amount { get; set; }
            public string? budget_id { get; set; }
        }

        [HttpPost]
        public async Task<IActionResult> SaveBudget([FromBody] SaveBudgetWebRequest request)
        {
            var token = HttpContext.Session.GetString("AccessToken");
            if (string.IsNullOrEmpty(token)) return Unauthorized(new { success = false, message = "Hết hạn phiên." });

            try
            {
                var now = DateTime.Now;
                var periodType = request.period_type?.Trim().ToLower() ?? "month";
                var year = now.Year;
                int? month = periodType == "month" ? now.Month : (int?)null;
                int? week = periodType == "week" ? ISOWeek.GetWeekOfYear(now) : (int?)null;

                if (!string.IsNullOrWhiteSpace(request.budget_id))
                {
                    await _categoryApiService.UpdateBudgetAsync(token, request.budget_id, new BudgetUpdateRequestDto
                    {
                        limit_amount = request.limit_amount,
                        period_type = periodType,
                        period_year = year,
                        period_month = month,
                        period_week = week
                    });
                }
                else
                {
                    var budgets = await _categoryApiService.GetBudgetsAsync(token, periodType, year, month, week, request.category_id);
                    var existing = budgets.FirstOrDefault();

                    if (existing != null)
                    {
                        await _categoryApiService.UpdateBudgetAsync(token, existing.budget_id, new BudgetUpdateRequestDto
                        {
                            limit_amount = request.limit_amount,
                            period_type = periodType,
                            period_year = year,
                            period_month = month,
                            period_week = week
                        });
                    }
                    else
                    {
                        await _categoryApiService.CreateBudgetAsync(token, new BudgetCreateRequestDto
                        {
                            category_id = request.category_id,
                            limit_amount = request.limit_amount ?? 0,
                            period_type = periodType,
                            period_year = year,
                            period_month = month,
                            period_week = week
                        });
                    }
                }

                return Json(new { success = true, message = "Lưu hạn mức thành công.", shouldReload = true });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        private static string ExtractApiMessage(string rawMessage, string fallback)
        {
            if (string.IsNullOrWhiteSpace(rawMessage))
            {
                return fallback;
            }

            try
            {
                using var doc = JsonDocument.Parse(rawMessage);

                if (doc.RootElement.TryGetProperty("detail", out var detailElement))
                {
                    if (detailElement.ValueKind == JsonValueKind.String)
                    {
                        return detailElement.GetString() ?? fallback;
                    }

                    if (detailElement.ValueKind == JsonValueKind.Array && detailElement.GetArrayLength() > 0)
                    {
                        var first = detailElement[0];

                        if (first.ValueKind == JsonValueKind.Object && first.TryGetProperty("msg", out var msg))
                        {
                            return msg.GetString() ?? fallback;
                        }

                        return detailElement.ToString();
                    }
                }

                if (doc.RootElement.TryGetProperty("message", out var messageElement))
                {
                    return messageElement.GetString() ?? fallback;
                }
            }
            catch
            {
            }

            return rawMessage;
        }
    }
}