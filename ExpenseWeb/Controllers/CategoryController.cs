using Microsoft.AspNetCore.Mvc;

namespace ExpenseWeb.Controllers
{
    public class CategoryController : Controller
    {
        [HttpGet]
        public IActionResult Index()
        {
            return View();
        }
    }
}