using ExpenseWeb.Filters;
using ExpenseWeb.Models.Dtos.Support;
using ExpenseWeb.Models.ViewModels.Admin;
using ExpenseWeb.Models.ViewModels.Profile;
using ExpenseWeb.Services.Api;
using Microsoft.AspNetCore.Mvc;

namespace ExpenseWeb.Controllers
{
    [RequireRole("admin")]
    public class AdminController : Controller
    {
        private readonly SupportApiService _supportApiService;

        public AdminController(SupportApiService supportApiService)
        {
            _supportApiService = supportApiService;
        }

        private string? GetAccessToken() => HttpContext.Session.GetString("AccessToken");

        public IActionResult Index()
        {
            ViewBag.Title = "Admin Dashboard";
            return View();
        }

        [HttpGet]
        public async Task<IActionResult> ErrorReports(string? status, string? supportType, string? priority, string? keyword, string? selectedId)
        {
            var token = GetAccessToken();
            if (string.IsNullOrWhiteSpace(token))
                return RedirectToAction("Login", "Auth");

            var query = new SupportRequestAdminQueryDto
            {
                status = status,
                support_type = supportType,
                priority = priority,
                keyword = keyword,
                page = 1,
                page_size = 30
            };

            var listResult = await _supportApiService.GetAdminRequestsAsync(token, query);
            var model = new AdminErrorReportsPageViewModel
            {
                Lang = "vi",
                CurrentStatus = status,
                CurrentSupportType = supportType,
                CurrentPriority = priority,
                Keyword = keyword
            };

            if (!listResult.Success)
            {
                TempData["AdminSupportError"] = listResult.ErrorMessage;
                return View(model);
            }

            model.Items = listResult.Data.Select(MapAdminListItem).ToList();

            if (!string.IsNullOrWhiteSpace(selectedId))
            {
                var detailResult = await _supportApiService.GetAdminRequestDetailAsync(token, selectedId);
                if (detailResult.Success && detailResult.Data != null)
                {
                    model.SelectedItem = MapAdminDetail(detailResult.Data);
                }
                else
                {
                    TempData["AdminSupportError"] = detailResult.ErrorMessage;
                }
            }
            else if (model.Items.Count > 0)
            {
                var firstId = model.Items[0].SupportRequestId;
                var detailResult = await _supportApiService.GetAdminRequestDetailAsync(token, firstId);
                if (detailResult.Success && detailResult.Data != null)
                {
                    model.SelectedItem = MapAdminDetail(detailResult.Data);
                }
            }

            return View(model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ReplySupport(string supportRequestId, string status, string? adminReply)
        {
            var token = GetAccessToken();
            if (string.IsNullOrWhiteSpace(token))
                return RedirectToAction("Login", "Auth");

            if (string.IsNullOrWhiteSpace(supportRequestId))
            {
                TempData["AdminSupportError"] = "Thiếu mã yêu cầu hỗ trợ.";
                return RedirectToAction(nameof(ErrorReports));
            }

            var request = new SupportRequestAdminReplyRequestDto
            {
                status = string.IsNullOrWhiteSpace(status) ? "replied" : status,
                admin_reply = string.IsNullOrWhiteSpace(adminReply) ? null : adminReply.Trim()
            };

            var result = await _supportApiService.ReplyAsync(token, supportRequestId, request);
            if (!result.Success)
            {
                TempData["AdminSupportError"] = result.ErrorMessage;
            }
            else
            {
                TempData["AdminSupportSuccess"] = request.status switch
                {
                    "viewed" => "Đã cập nhật trạng thái đang xử lý.",
                    "closed" => "Đã đóng yêu cầu hỗ trợ.",
                    _ => "Cập nhật phản hồi hỗ trợ thành công."
                };
            }

            return RedirectToAction(nameof(ErrorReports), new { selectedId = supportRequestId });
        }

        private static AdminSupportRequestListItemViewModel MapAdminListItem(SupportRequestListItemDto dto)
        {
            return new AdminSupportRequestListItemViewModel
            {
                SupportRequestId = dto.support_request_id,
                Subject = dto.subject,
                UserFullName = string.IsNullOrWhiteSpace(dto.user_full_name) ? dto.user_id : dto.user_full_name,
                UserEmail = dto.user_email,
                SupportType = dto.support_type,
                SupportTypeLabel = ToSupportTypeLabel(dto.support_type),
                SupportTypeBadgeClass = ToSupportTypeBadgeClass(dto.support_type),
                Priority = dto.priority,
                PriorityLabel = ToPriorityLabel(dto.priority),
                PriorityBadgeClass = ToPriorityBadgeClass(dto.priority),
                Status = dto.status,
                StatusLabel = ToStatusLabel(dto.status),
                StatusBadgeClass = ToStatusBadgeClass(dto.status),
                CreatedAt = dto.created_at,
                HasAttachments = dto.has_attachments
            };
        }

        private static AdminSupportRequestDetailViewModel MapAdminDetail(SupportRequestDetailDto dto)
        {
            return new AdminSupportRequestDetailViewModel
            {
                SupportRequestId = dto.support_request_id,
                UserId = dto.user_id,
                UserFullName = string.IsNullOrWhiteSpace(dto.user_full_name) ? dto.user_id : dto.user_full_name,
                UserEmail = dto.user_email,
                UserAvatar = dto.user_avatar,
                Subject = dto.subject,
                Message = dto.message,
                SupportType = dto.support_type,
                SupportTypeLabel = ToSupportTypeLabel(dto.support_type),
                Priority = dto.priority,
                PriorityLabel = ToPriorityLabel(dto.priority),
                Status = dto.status,
                StatusLabel = ToStatusLabel(dto.status),
                AdminReply = dto.admin_reply,
                CreatedAt = dto.created_at,
                ViewedAt = dto.viewed_at,
                RepliedAt = dto.replied_at,
                ClosedAt = dto.closed_at,
                Attachments = dto.attachments.Select(a => new SupportAttachmentViewModel
                {
                    AttachmentId = a.attachment_id,
                    FileName = a.file_name,
                    FileUrl = a.file_url,
                    FileType = a.file_type,
                    FileSize = a.file_size,
                    DisplaySize = FormatFileSize(a.file_size),
                    IsImage = IsImage(a.file_type),
                    IsVideo = IsVideo(a.file_type)
                }).ToList()
            };
        }

        private static bool IsImage(string? fileType) => !string.IsNullOrWhiteSpace(fileType) && fileType.StartsWith("image/", StringComparison.OrdinalIgnoreCase);
        private static bool IsVideo(string? fileType) => !string.IsNullOrWhiteSpace(fileType) && fileType.StartsWith("video/", StringComparison.OrdinalIgnoreCase);

        private static string FormatFileSize(long? bytes)
        {
            if (!bytes.HasValue || bytes.Value <= 0) return string.Empty;
            var size = bytes.Value;
            string[] units = { "B", "KB", "MB", "GB" };
            var order = 0;
            double len = size;
            while (len >= 1024 && order < units.Length - 1)
            {
                order++;
                len = len / 1024;
            }
            return $"{len:0.#} {units[order]}";
        }

        private static string ToSupportTypeLabel(string value) => value switch
        {
            "bug" => "Báo lỗi hệ thống",
            "transaction" => "Hỗ trợ giao dịch",
            "account" => "Hỗ trợ tài khoản",
            "feature" => "Góp ý tính năng",
            _ => "Khác"
        };

        private static string ToPriorityLabel(string value) => value switch
        {
            "low" => "Thấp",
            "medium" => "Trung bình",
            "high" => "Cao",
            "urgent" => "Khẩn cấp",
            _ => value
        };

        private static string ToStatusLabel(string value) => value switch
        {
            "pending" => "Chờ tiếp nhận",
            "viewed" => "Đang xử lý",
            "replied" => "Đã phản hồi",
            "closed" => "Đã đóng",
            _ => value
        };

        private static string ToSupportTypeBadgeClass(string value) => value switch
        {
            "bug" => "bg-label-danger",
            "transaction" => "bg-label-primary",
            "account" => "bg-label-info",
            "feature" => "bg-label-success",
            _ => "bg-label-secondary"
        };

        private static string ToPriorityBadgeClass(string value) => value switch
        {
            "low" => "bg-label-secondary",
            "medium" => "bg-label-info",
            "high" => "bg-label-warning",
            "urgent" => "bg-label-danger",
            _ => "bg-label-secondary"
        };

        private static string ToStatusBadgeClass(string value) => value switch
        {
            "pending" => "bg-label-primary",
            "viewed" => "bg-label-warning",
            "replied" => "bg-label-success",
            "closed" => "bg-label-secondary",
            _ => "bg-label-secondary"
        };
    }
}
