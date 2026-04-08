using System.Text.Json;
using ExpenseWeb.Models.Dtos.Wallet;
using ExpenseWeb.Models.ViewModels.Dashboard;
using ExpenseWeb.Services.Api;
using Microsoft.AspNetCore.Mvc;

namespace ExpenseWeb.Controllers
{
    public class DashboardController : Controller
    {
        private readonly WalletApiService _walletApiService;

        public DashboardController(WalletApiService walletApiService)
        {
            _walletApiService = walletApiService;
        }

        public async Task<IActionResult> Index()
        {
            var token = HttpContext.Session.GetString("AccessToken");
            if (string.IsNullOrEmpty(token))
            {
                return RedirectToAction("Login", "Auth");
            }

            var model = new DashboardIndexViewModel();
            ViewBag.UserFullName = HttpContext.Session.GetString("UserFullName");

            try
            {
                var wallets = await _walletApiService.GetWalletsAsync(token);
                model.Wallets = wallets.Select(MapWallet).ToList();
            }
            catch (Exception ex)
            {
                model.ErrorMessage = ExtractApiMessage(ex.Message, "Không thể tải danh sách ví.");
            }

            return View(model);
        }

        [HttpPost]
        public async Task<IActionResult> CreateWalletAjax([FromBody] WalletCreateRequestDto request)
        {
            var token = HttpContext.Session.GetString("AccessToken");
            if (string.IsNullOrEmpty(token))
            {
                return Unauthorized(new { success = false, message = "Phiên đăng nhập đã hết hạn." });
            }

            if (request == null || string.IsNullOrWhiteSpace(request.wallet_name))
            {
                return BadRequest(new { success = false, message = "Tên ví không được để trống." });
            }

            try
            {
                var created = await _walletApiService.CreateWalletAsync(token, request);
                return Json(new
                {
                    success = true,
                    message = "Tạo ví thành công.",
                    wallet = MapWallet(created)
                });
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
            {
                return Unauthorized(new { success = false, message = "Phiên đăng nhập đã hết hạn." });
            }

            if (string.IsNullOrWhiteSpace(id))
            {
                return BadRequest(new { success = false, message = "Thiếu mã ví." });
            }

            if (request == null || string.IsNullOrWhiteSpace(request.wallet_name))
            {
                return BadRequest(new { success = false, message = "Tên ví không được để trống." });
            }

            try
            {
                var updated = await _walletApiService.UpdateWalletAsync(token, id, request);
                return Json(new
                {
                    success = true,
                    message = "Cập nhật ví thành công.",
                    wallet = MapWallet(updated)
                });
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
            {
                return Unauthorized(new { success = false, message = "Phiên đăng nhập đã hết hạn." });
            }

            if (string.IsNullOrWhiteSpace(id))
            {
                return BadRequest(new { success = false, message = "Thiếu mã ví." });
            }

            if (request == null || string.IsNullOrWhiteSpace(request.mode))
            {
                return BadRequest(new { success = false, message = "Thiếu chế độ xóa ví." });
            }

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

        private static string ExtractApiMessage(string raw, string fallback)
        {
            if (string.IsNullOrWhiteSpace(raw))
            {
                return fallback;
            }

            try
            {
                using var doc = JsonDocument.Parse(raw);
                if (doc.RootElement.TryGetProperty("detail", out var detail) && detail.ValueKind == JsonValueKind.String)
                {
                    return detail.GetString() ?? fallback;
                }
                if (doc.RootElement.TryGetProperty("message", out var message) && message.ValueKind == JsonValueKind.String)
                {
                    return message.GetString() ?? fallback;
                }
            }
            catch
            {
            }

            return raw;
        }
    }
}
