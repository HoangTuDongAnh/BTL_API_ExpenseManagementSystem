using System;
using System.Collections.Generic;

namespace ExpenseWeb.Models.ViewModels.Admin
{
    public class AdminDashboardViewModel
    {
        // Các thẻ thống kê
        public int TotalUsers { get; set; }
        public int ActiveUsers { get; set; }
        public int ActiveToday { get; set; }
        public int InactiveUsers { get; set; }
        public int NewReports { get; set; }

        // Dữ liệu cho biểu đồ đường (7 ngày)
        public List<int> NewUsersWeek { get; set; } = new List<int>();

        // Danh sách người dùng hiển thị ở bảng
        public List<AdminUserItemViewModel> RecentUsers { get; set; } = new List<AdminUserItemViewModel>();
    }

    public class AdminUserItemViewModel
    {
        public string UserID { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? Avatar { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}