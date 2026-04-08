using Microsoft.AspNetCore.Mvc;

namespace ExpenseWeb.Controllers
{
    public class ProfileController : Controller
    {
        private bool HasAccessToken()
        {
            var token = HttpContext.Session.GetString("AccessToken");
            return !string.IsNullOrEmpty(token);
        }

        private void SetProfileViewData()
        {
            ViewBag.UserFullName = HttpContext.Session.GetString("UserFullName") ?? "Người dùng";
        }

        public IActionResult Index()
        {
            if (!HasAccessToken())
            {
                return RedirectToAction("Login", "Auth");
            }

            SetProfileViewData();
            return View();
        }

        public IActionResult Support()
        {
            if (!HasAccessToken())
            {
                return RedirectToAction("Login", "Auth");
            }

            SetProfileViewData();
            return View();
        }
    }
}