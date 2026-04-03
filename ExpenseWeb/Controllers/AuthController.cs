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
                ModelState.AddModelError(string.Empty, "Invalid email or password.");
                return View(model);
            }

            HttpContext.Session.SetString("AccessToken", result.Data.access_token ?? "");
            HttpContext.Session.SetString("UserEmail", result.Data.user?.email ?? "");
            HttpContext.Session.SetString("UserFullName", result.Data.user?.full_name ?? "");
            HttpContext.Session.SetString("UserRole", result.Data.user?.role ?? "");

            return RedirectToAction("Index", "Dashboard");
        }

        [HttpGet]
        public IActionResult Register()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> Register(RegisterViewModel model)
        {
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
                ModelState.AddModelError(string.Empty, "Registration failed. Email may already exist.");
                return View(model);
            }

            TempData["SuccessMessage"] = "Registration successful. Please login.";
            return RedirectToAction("Login");
        }

        [HttpGet]
        public IActionResult ForgotPassword()
        {
            return View();
        }

        [HttpPost]
        public IActionResult ForgotPassword(ForgotPasswordViewModel model)
        {
            if (!ModelState.IsValid)
            {
                return View(model);
            }

            TempData["SuccessMessage"] = "Reset password feature is not connected to API yet.";
            return RedirectToAction("Login");
        }

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