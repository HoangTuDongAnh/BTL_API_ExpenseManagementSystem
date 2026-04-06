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

        // ================= LOGIN =================
        [HttpGet]
        public IActionResult Login()
        {
            if (!string.IsNullOrEmpty(HttpContext.Session.GetString("AccessToken")))
            {
                return RedirectToAction("Index", "Dashboard");
            }

            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Login(LoginViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var request = new LoginRequestDto
            {
                email = model.Email,
                password = model.Password
            };

            var result = await _authApiService.LoginAsync(request);

            if (!result.Success || result.Data == null)
            {
                ModelState.AddModelError(string.Empty, result.ErrorMessage ?? "Invalid email or password.");
                return View(model);
            }

            // Save session
            HttpContext.Session.SetString("AccessToken", result.Data.access_token ?? "");
            HttpContext.Session.SetString("UserEmail", result.Data.user?.email ?? "");
            HttpContext.Session.SetString("UserFullName", result.Data.user?.full_name ?? "");
            HttpContext.Session.SetString("UserRole", result.Data.user?.role ?? "");

            return RedirectToAction("Index", "Dashboard");
        }

        // ================= REGISTER =================
        [HttpGet]
        public IActionResult Register()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Register(RegisterViewModel model)
        {
            if (!model.AgreeTerms)
            {
                ModelState.AddModelError(nameof(model.AgreeTerms), "You must agree to the terms.");
            }

            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var request = new RegisterRequestDto
            {
                full_name = model.FullName,
                email = model.Email,
                password = model.Password,
                phone_number = model.PhoneNumber,
                avatar = null
            };

            var result = await _authApiService.RegisterAsync(request);

            if (!result.Success)
            {
                ModelState.AddModelError(string.Empty, "Registration failed.");
                return View(model);
            }

            // 🔥 Lưu tạm để auto login
            HttpContext.Session.SetString("TempEmail", model.Email);
            HttpContext.Session.SetString("TempPassword", model.Password);

            return RedirectToAction("VerifyOtp", new { email = model.Email });
        }

        // ================= VERIFY OTP =================
        [HttpGet]
        public IActionResult VerifyOtp(string email)
        {
            if (string.IsNullOrEmpty(email))
            {
                return RedirectToAction("Login");
            }

            return View(new VerifyOtpViewModel
            {
                Email = email
            });
        }

        [HttpPost]
        public async Task<IActionResult> VerifyOtp(VerifyOtpViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return View(model);
            }

            var result = await _authApiService.VerifyOtpAsync(model.Email, model.Otp);

            if (!result.Success)
            {
                ModelState.AddModelError(string.Empty, result.ErrorMessage ?? "Invalid OTP.");
                return View(model);
            }

            // ================= AUTO LOGIN =================
            var email = HttpContext.Session.GetString("TempEmail");
            var password = HttpContext.Session.GetString("TempPassword");

            if (!string.IsNullOrEmpty(email) && !string.IsNullOrEmpty(password))
            {
                var loginResult = await _authApiService.LoginAsync(new LoginRequestDto
                {
                    email = email,
                    password = password
                });

                if (loginResult.Success && loginResult.Data != null)
                {
                    HttpContext.Session.SetString("AccessToken", loginResult.Data.access_token ?? "");
                    HttpContext.Session.SetString("UserEmail", loginResult.Data.user?.email ?? "");
                    HttpContext.Session.SetString("UserFullName", loginResult.Data.user?.full_name ?? "");
                    HttpContext.Session.SetString("UserRole", loginResult.Data.user?.role ?? "");

                    // ❌ Xóa dữ liệu tạm
                    HttpContext.Session.Remove("TempEmail");
                    HttpContext.Session.Remove("TempPassword");

                    return RedirectToAction("Index", "Dashboard");
                }
            }

            // fallback nếu auto login fail
            TempData["SuccessMessage"] = "Verify successful. Please login.";
            return RedirectToAction("Login");
        }

        // ================= RESEND OTP =================
        [HttpPost]
        public async Task<IActionResult> ResendOtp(string email)
        {
            var result = await _authApiService.ResendOtpAsync(email);

            if (result.Success)
            {
                TempData["SuccessMessage"] = "OTP resent successfully.";
            }
            else
            {
                TempData["ErrorMessage"] = result.ErrorMessage ?? "Failed to resend OTP.";
            }

            return RedirectToAction("VerifyOtp", new { email = email });
        }

        // ================= LOGOUT =================
        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            return RedirectToAction("Login");
        }

        public IActionResult Profile()
        {
            return RedirectToAction("Index", "Dashboard");
        }
    }
}