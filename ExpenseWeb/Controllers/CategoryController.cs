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
            
            int? resolvedMonth = resolvedPeriodType == "month" ? (month ?? now.Month) : null;
            int? resolvedWeek = resolvedPeriodType == "week" ? (week ?? System.Globalization.ISOWeek.GetWeekOfYear(now)) : null;

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
        public async Task<IActionResult> Delete(string id, [FromBody] CategoryDeleteRequestDto request)
        {
            var token = HttpContext.Session.GetString("AccessToken");
            if (string.IsNullOrEmpty(token))
            {
                return Unauthorized(new { success = false, message = "Phiên đăng nhập đã hết hạn." });
            }

            try
            {
               
                await _categoryApiService.DeleteCategoryAsync(token, id, request);

                return Json(new
                {
                    success = true,
                    message = "Xóa danh mục thành công."
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ExtractApiMessage(ex.Message, "Xóa danh mục thất bại.") });
            }
        }

        public class SaveBudgetWebRequest
        {
            [System.Text.Json.Serialization.JsonPropertyName("category_id")]
            public string category_id { get; set; }

            [System.Text.Json.Serialization.JsonPropertyName("period_type")]
            public string period_type { get; set; }

            [System.Text.Json.Serialization.JsonPropertyName("period_year")]
            public int period_year { get; set; }

            [System.Text.Json.Serialization.JsonPropertyName("period_month")]
            public int? period_month { get; set; }

            [System.Text.Json.Serialization.JsonPropertyName("period_week")]
            public int? period_week { get; set; }

            [System.Text.Json.Serialization.JsonPropertyName("limit_amount")]
            public decimal limit_amount { get; set; }

            [System.Text.Json.Serialization.JsonPropertyName("budget_id")]
            public string? budget_id { get; set; }
        }

        [HttpPost]
        public async Task<IActionResult> SaveBudget([FromBody] SaveBudgetWebRequest request)
        {
            var token = HttpContext.Session.GetString("AccessToken");
            if (string.IsNullOrEmpty(token))
            {
                return Unauthorized(new { success = false, message = "Phiên đăng nhập đã hết hạn." });
            }

            if (string.IsNullOrWhiteSpace(request.category_id))
            {
                return BadRequest(new { success = false, message = "Thiếu category_id." });
            }

            if (request.limit_amount <= 0)
            {
                return BadRequest(new { success = false, message = "Hạn mức phải lớn hơn 0." });
            }

            try
            {
                var periodType = string.IsNullOrWhiteSpace(request.period_type)
                    ? "month"
                    : request.period_type.Trim().ToLowerInvariant();

                if (periodType != "week" && periodType != "month" && periodType != "year")
                {
                    return BadRequest(new { success = false, message = "period_type không hợp lệ. Chỉ chấp nhận week, month, year." });
                }


                var now = DateTime.Now;

                
                var year = request.period_year > 0 ? request.period_year : now.Year;

             
                int? month = periodType == "month" ? (request.period_month ?? now.Month) : null;

               
                int? week = periodType == "week" ? (request.period_week ?? System.Globalization.ISOWeek.GetWeekOfYear(now)) : null;

                BudgetResponseDto? existingBudget = null;

                if (!string.IsNullOrWhiteSpace(request.budget_id))
                {
                    existingBudget = new BudgetResponseDto { budget_id = request.budget_id! };
                }
                else
                {
                    var budgets = await _categoryApiService.GetBudgetsAsync(token, periodType, year, month, week, request.category_id);
                    existingBudget = budgets.FirstOrDefault();
                }

                if (existingBudget != null && !string.IsNullOrWhiteSpace(existingBudget.budget_id))
                {
                    await _categoryApiService.UpdateBudgetAsync(token, existingBudget.budget_id, new BudgetUpdateRequestDto
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
                        limit_amount = request.limit_amount,
                        period_type = periodType,
                        period_year = year,
                        period_month = month,
                        period_week = week
                    });
                }

                return Json(new
                {
                    success = true,
                    message = "Lưu hạn mức thành công."
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ExtractApiMessage(ex.Message, "Lưu hạn mức thất bại.")
                });
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