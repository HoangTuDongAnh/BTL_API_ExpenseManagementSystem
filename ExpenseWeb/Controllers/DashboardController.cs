using Microsoft.AspNetCore.Mvc;

namespace ExpenseWeb.Controllers
{
    public class DashboardController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
