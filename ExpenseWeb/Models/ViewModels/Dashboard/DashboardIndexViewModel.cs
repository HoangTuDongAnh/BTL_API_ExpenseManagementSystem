using System.Collections.Generic;

namespace ExpenseWeb.Models.ViewModels.Dashboard
{
    public class DashboardIndexViewModel
    {
        public List<DashboardWalletItemViewModel> Wallets { get; set; } = new();
        public string? ErrorMessage { get; set; }
    }
}
