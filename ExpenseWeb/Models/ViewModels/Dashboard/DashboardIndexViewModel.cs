using System.Collections.Generic;

namespace ExpenseWeb.Models.ViewModels.Dashboard
{
    public class DashboardIndexViewModel
    {
        public List<DashboardWalletItemViewModel> Wallets { get; set; } = new();

        public decimal TotalBalance { get; set; }
        public decimal MonthlyIncome { get; set; }
        public decimal MonthlyExpense { get; set; }
        public decimal NetCashflow => MonthlyIncome - MonthlyExpense;
        public int TransactionCount { get; set; }

        public int SelectedMonth { get; set; }
        public int SelectedYear { get; set; }

        public List<DashboardReportPointViewModel> MonthlyTrend { get; set; } = new();
        public List<DashboardCategoryBreakdownViewModel> CategoryBreakdown { get; set; } = new();
        public List<DashboardTopExpenseItemViewModel> TopExpenses { get; set; } = new();
        public List<DashboardBudgetProgressItemViewModel> BudgetProgress { get; set; } = new();

        public string? ErrorMessage { get; set; }
        public string? ReportErrorMessage { get; set; }
    }
}
