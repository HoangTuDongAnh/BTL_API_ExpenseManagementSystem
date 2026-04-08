using ExpenseWeb.Models.Dtos.Auth;
using ExpenseWeb.Models.ViewModels.Profile;
using ExpenseWeb.Services.Api;
using Microsoft.AspNetCore.Mvc;

namespace ExpenseWeb.Controllers
{
    public class ProfileController : Controller
    {
        private readonly AuthApiService _authApiService;

        public ProfileController(AuthApiService authApiService)
        {
            _authApiService = authApiService;
        }

        private string? GetAccessToken()
        {
            return HttpContext.Session.GetString("AccessToken");
        }

        private bool HasAccessToken() => !string.IsNullOrWhiteSpace(GetAccessToken());

        private void SetProfileViewData(string? fullName = null)
        {
            ViewBag.UserFullName = fullName ?? HttpContext.Session.GetString("UserFullName") ?? "Người dùng";
        }

        private static (string lastName, string firstName) SplitFullName(string? fullName)
        {
            if (string.IsNullOrWhiteSpace(fullName))
                return (string.Empty, string.Empty);

            var parts = fullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 1)
                return (string.Empty, parts[0]);

            var firstName = parts[^1];
            var lastName = string.Join(" ", parts.Take(parts.Length - 1));
            return (lastName, firstName);
        }

        [HttpGet]
        public async Task<IActionResult> Index()
        {
            var token = GetAccessToken();
            if (string.IsNullOrWhiteSpace(token))
                return RedirectToAction("Login", "Auth");

            var result = await _authApiService.GetMeAsync(token);
            if (!result.Success || result.Data == null)
            {
                HttpContext.Session.Clear();
                return RedirectToAction("Login", "Auth");
            }

            var (lastName, firstName) = SplitFullName(result.Data.full_name);
            HttpContext.Session.SetString("UserFullName", result.Data.full_name ?? string.Empty);

            var model = new ProfilePageViewModel
            {
                LastName = lastName,
                FirstName = firstName,
                Email = result.Data.email ?? string.Empty,
                PhoneNumber = result.Data.phone_number,
                Avatar = result.Data.avatar
            };

            SetProfileViewData(result.Data.full_name);
            return View(model);
        }

        [HttpPost]
        public async Task<IActionResult> UpdateAjax([FromBody] ProfilePageViewModel model)
        {
            var token = GetAccessToken();
            if (string.IsNullOrWhiteSpace(token))
                return Unauthorized(new { success = false, message = "Phiên đăng nhập đã hết hạn." });

            if (model == null)
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ." });

            var fullName = string.Join(" ", new[] { model.LastName?.Trim(), model.FirstName?.Trim() }
                .Where(x => !string.IsNullOrWhiteSpace(x)));

            if (string.IsNullOrWhiteSpace(fullName))
                return BadRequest(new { success = false, message = "Họ tên không được để trống." });

            var request = new UpdateProfileRequestDto
            {
                full_name = fullName,
                email = model.Email?.Trim() ?? string.Empty,
                phone_number = string.IsNullOrWhiteSpace(model.PhoneNumber) ? null : model.PhoneNumber.Trim(),
                avatar = string.IsNullOrWhiteSpace(model.Avatar) ? null : model.Avatar.Trim()
            };

            var result = await _authApiService.UpdateProfileAsync(token, request);
            if (!result.Success || result.Data == null)
                return BadRequest(new { success = false, message = result.ErrorMessage ?? "Không thể cập nhật hồ sơ." });

            HttpContext.Session.SetString("UserFullName", result.Data.full_name ?? string.Empty);
            HttpContext.Session.SetString("UserEmail", result.Data.email ?? string.Empty);

            return Json(new { success = true, message = "Cập nhật hồ sơ thành công." });
        }

        [HttpPost]
        public async Task<IActionResult> DeleteAccountAjax()
        {
            var token = GetAccessToken();
            if (string.IsNullOrWhiteSpace(token))
                return Unauthorized(new { success = false, message = "Phiên đăng nhập đã hết hạn." });

            var result = await _authApiService.DeleteMeAsync(token);
            if (!result.Success)
                return BadRequest(new { success = false, message = result.ErrorMessage ?? "Không thể xóa tài khoản." });

            HttpContext.Session.Clear();
            return Json(new { success = true, redirectUrl = Url.Action("Login", "Auth") });
        }

        [HttpGet]
        public IActionResult Support()
        {
            if (!HasAccessToken())
                return RedirectToAction("Login", "Auth");

            SetProfileViewData();
            return View();
        }
    }
}
