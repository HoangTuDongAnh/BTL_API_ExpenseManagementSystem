using Microsoft.AspNetCore.Mvc;

namespace ExpenseWeb.Controllers
{
    public class BudgetsController : Controller
    {
        public IActionResult Index()
        {
            var token = HttpContext.Session.GetString("AccessToken");
            if (string.IsNullOrEmpty(token))
            {
                return RedirectToAction("Login", "Auth");
            }

            ViewBag.UserFullName = HttpContext.Session.GetString("UserFullName");
            return View();
        }
    }
}
