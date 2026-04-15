using System.Text.Json;
using ExpenseWeb.Models.Dtos.Auth;
using ExpenseWeb.Models.ViewModels.Auth;
using ExpenseWeb.Services.Api;
using Microsoft.AspNetCore.Mvc;

namespace ExpenseWeb.Controllers
{
    public class AuthController : Controller
    {
        private readonly AuthApiService _authApiService;

        public AuthController(AuthApiService authApiService)
        {
            _authApiService = authApiService;
        }

        private string GetLang()
        {
            var lang = HttpContext.Request.Query["lang"].ToString().ToLower();
            if (string.IsNullOrWhiteSpace(lang))
            {
                lang = Request.Form["lang"].ToString().ToLower();
            }
            return lang == "en" ? "en" : "vi";
        }

        private List<string> GetModelErrors()
        {
            return ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct()
                .ToList();
        }

        private void SetToastErrors(string key, IEnumerable<string> errors)
        {
            var cleanErrors = errors
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .Distinct()
                .ToList();

            ViewData[key] = cleanErrors.Count > 0 ? JsonSerializer.Serialize(cleanErrors) : "[]";
        }


        private string GetAuthText(string key, string lang)
        {
            lang = (lang ?? "vi").ToLower() == "en" ? "en" : "vi";

            return key switch
            {
                "LoginFailed" => lang == "en" ? "Invalid email or password." : "Email hoặc mật khẩu không đúng.",
                "RegisterFailed" => lang == "en" ? "Registration failed." : "Đăng ký thất bại.",
                "OtpInvalid" => lang == "en" ? "Invalid OTP." : "Mã OTP không hợp lệ.",
                "ForgotFailed" => lang == "en" ? "Failed to send password reset request." : "Không thể gửi yêu cầu đặt lại mật khẩu.",
                "ResetFailed" => lang == "en" ? "Password reset failed." : "Đặt lại mật khẩu thất bại.",
                _ => string.Empty
            };
        }

        private IActionResult RedirectAfterLogin(string? lang = null)
        {
            lang = (lang ?? GetLang()).ToLower() == "en" ? "en" : "vi";
            var role = HttpContext.Session.GetString("UserRole")?.Trim().ToLower();

            if (role == "admin")
            {
                return RedirectToAction("Index", "Admin", new { lang });
            }

            return RedirectToAction("Index", "Dashboard", new { lang });
        }

        [HttpGet]
        public IActionResult Login()
        {
            if (!string.IsNullOrEmpty(HttpContext.Session.GetString("AccessToken")))
            {
                return RedirectAfterLogin(GetLang());
            }

            ViewBag.RegisterModel = new RegisterViewModel();
            ViewBag.OpenRegister = false;
            ViewData["LoginErrorsJson"] = "[]";
            ViewData["RegisterErrorsJson"] = "[]";

            return View(new LoginViewModel());
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Login(LoginViewModel model, string? lang = "vi")
        {
            lang = (lang ?? "vi").ToLower() == "en" ? "en" : "vi";
            ViewBag.RegisterModel = new RegisterViewModel();
            ViewBag.OpenRegister = false;
            ViewData["RegisterErrorsJson"] = "[]";

            if (!ModelState.IsValid)
            {
                SetToastErrors("LoginErrorsJson", GetModelErrors());
                return View(model);
            }

            var result = await _authApiService.LoginAsync(new LoginRequestDto
            {
                email = model.Email,
                password = model.Password
            });

            if (!result.Success || result.Data == null)
            {
                SetToastErrors("LoginErrorsJson", new[]
                {
                    GetAuthText("LoginFailed", lang)
                });
                return View(model);
            }

            HttpContext.Session.Clear();
            HttpContext.Session.SetString("AccessToken", result.Data.access_token ?? "");
            HttpContext.Session.SetString("UserEmail", result.Data.user?.email ?? "");
            HttpContext.Session.SetString("UserFullName", result.Data.user?.full_name ?? "");
            HttpContext.Session.SetString("UserRole", result.Data.user?.role ?? "");

            HttpContext.Session.SetString("UserAvatar", result.Data.user?.avatar ?? "");

            return RedirectAfterLogin(lang);
        }

        [HttpGet]
        public IActionResult Register()
        {
            return RedirectToAction("Login", new { lang = GetLang(), openRegister = true });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Register(RegisterViewModel model, string? lang = "vi")
        {
            lang = (lang ?? "vi").ToLower() == "en" ? "en" : "vi";
            ViewBag.RegisterModel = model;
            ViewBag.OpenRegister = true;
            ViewData["LoginErrorsJson"] = "[]";

            if (!model.AgreeTerms)
            {
                ModelState.AddModelError(nameof(model.AgreeTerms), lang == "en" ? "You must agree to the terms." : "Bạn phải đồng ý với điều khoản sử dụng.");
            }

            if (!ModelState.IsValid)
            {
                SetToastErrors("RegisterErrorsJson", GetModelErrors());
                return View("Login", new LoginViewModel());
            }

            var result = await _authApiService.RegisterAsync(new RegisterRequestDto
            {
                full_name = model.FullName,
                email = model.Email,
                password = model.Password,
                phone_number = null,
                avatar = null,
                agree_terms = model.AgreeTerms
            });

            if (!result.Success)
            {
                SetToastErrors("RegisterErrorsJson", new[]
                {
                    result.ErrorMessage ?? GetAuthText("RegisterFailed", lang)
                });
                return View("Login", new LoginViewModel());
            }

            HttpContext.Session.SetString("TempEmail", model.Email ?? "");
            HttpContext.Session.SetString("TempPassword", model.Password ?? "");

            return RedirectToAction("VerifyOtp", new { email = model.Email, lang });
        }

        [HttpGet]
        public IActionResult VerifyOtp(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
            {
                return RedirectToAction("Login", new { lang = GetLang() });
            }
            return View(new VerifyOtpViewModel { Email = email });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> VerifyOtp(VerifyOtpViewModel model, string? lang = "vi")
        {
            lang = (lang ?? "vi").ToLower() == "en" ? "en" : "vi";
            if (!ModelState.IsValid) return View(model);

            var result = await _authApiService.VerifyOtpAsync(model.Email, model.Otp);
            if (!result.Success)
            {
                ModelState.AddModelError(string.Empty, result.ErrorMessage ?? GetAuthText("OtpInvalid", lang));
                return View(model);
            }

            var email = HttpContext.Session.GetString("TempEmail");
            var password = HttpContext.Session.GetString("TempPassword");
            if (!string.IsNullOrEmpty(email) && !string.IsNullOrEmpty(password))
            {
                var loginResult = await _authApiService.LoginAsync(new LoginRequestDto { email = email, password = password });
                if (loginResult.Success && loginResult.Data != null)
                {
                    HttpContext.Session.Clear();
                    HttpContext.Session.SetString("AccessToken", loginResult.Data.access_token ?? "");
                    HttpContext.Session.SetString("UserEmail", loginResult.Data.user?.email ?? "");
                    HttpContext.Session.SetString("UserFullName", loginResult.Data.user?.full_name ?? "");
                    HttpContext.Session.SetString("UserRole", loginResult.Data.user?.role ?? "");

                    HttpContext.Session.SetString("UserAvatar", loginResult.Data.user?.avatar ?? "");

                    HttpContext.Session.Remove("TempEmail");
                    HttpContext.Session.Remove("TempPassword");
                    return RedirectAfterLogin(lang);
                }
            }

            TempData["SuccessMessage"] = lang == "en" ? "Verification successful. Please sign in." : "Xác thực thành công. Vui lòng đăng nhập.";
            return RedirectToAction("Login", new { lang });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ResendOtp(string email, string? lang = "vi")
        {
            lang = (lang ?? "vi").ToLower() == "en" ? "en" : "vi";
            if (string.IsNullOrWhiteSpace(email))
            {
                TempData["ErrorMessage"] = lang == "en" ? "Invalid email for resending OTP." : "Email không hợp lệ để gửi lại OTP.";
                return RedirectToAction("Login", new { lang });
            }

            var result = await _authApiService.ResendOtpAsync(email);
            TempData[result.Success ? "SuccessMessage" : "ErrorMessage"] = result.Success
                ? (lang == "en" ? "OTP resent successfully." : "Gửi lại OTP thành công.")
                : (result.ErrorMessage ?? (lang == "en" ? "Failed to resend OTP." : "Gửi lại OTP thất bại."));

            return RedirectToAction("VerifyOtp", new { email, lang });
        }

        [HttpGet]
        public IActionResult ForgotPassword(string? lang = null)
        {
            ViewBag.Lang = (lang ?? GetLang()) == "en" ? "en" : "vi";
            return View(new ForgotPasswordViewModel());
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ForgotPassword(ForgotPasswordViewModel model, string? lang = "vi")
        {
            lang = (lang ?? "vi").ToLower() == "en" ? "en" : "vi";
            if (!ModelState.IsValid) return View(model);

            var result = await _authApiService.ForgotPasswordAsync(model.Email);
            if (!result.Success)
            {
                TempData["ErrorMessage"] = result.ErrorMessage ?? GetAuthText("ForgotFailed", lang);
                return View(model);
            }

            TempData["SuccessMessage"] = lang == "en" ? "Password reset request sent successfully. Please check your email." : "Yêu cầu đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra email của bạn.";
            return RedirectToAction("ForgotPasswordConfirmation", new { lang });
        }

        [HttpGet]
        public IActionResult ForgotPasswordConfirmation(string? lang = "vi")
        {
            return View();
        }

        [HttpGet]
        public IActionResult ResetPassword(string token, string? lang = "vi")
        {
            if (string.IsNullOrWhiteSpace(token))
                return RedirectToAction("Login", new { lang });

            return View(new ResetPasswordViewModel { Token = token });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ResetPassword(ResetPasswordViewModel model, string? lang = "vi")
        {
            lang = (lang ?? "vi").ToLower() == "en" ? "en" : "vi";
            if (!ModelState.IsValid) return View(model);

            var result = await _authApiService.ResetPasswordAsync(model.Token, model.NewPassword);
            if (!result.Success)
            {
                ModelState.AddModelError(string.Empty, result.ErrorMessage ?? GetAuthText("ResetFailed", lang));
                return View(model);
            }

            TempData["SuccessMessage"] = lang == "en" ? "Password reset successfully! Please sign in again." : "Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.";
            return RedirectToAction("Login", new { lang });
        }

        [HttpGet]
        public IActionResult Logout(string? lang = null)
        {
            HttpContext.Session.Clear();
            var currentLang = (lang ?? GetLang()) == "en" ? "en" : "vi";
            return RedirectToAction("Login", new { lang = currentLang });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public IActionResult LogoutPost(string? lang = null)
        {
            HttpContext.Session.Clear();
            var currentLang = (lang ?? GetLang()) == "en" ? "en" : "vi";
            return RedirectToAction("Login", new { lang = currentLang });
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        [ActionName("Logout")]
        public IActionResult LogoutConfirmed(string? lang = null)
        {
            return LogoutPost(lang);
        }

        [HttpGet]
        public IActionResult Profile()
        {
            return RedirectToAction("Index", "Dashboard", new { lang = GetLang() });
        }
    }
}