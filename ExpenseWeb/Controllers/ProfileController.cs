using ExpenseWeb.Models.Dtos.Auth;
using ExpenseWeb.Models.Dtos.Support;
using ExpenseWeb.Models.ViewModels.Profile;
using ExpenseWeb.Services.Api;
using Microsoft.AspNetCore.Mvc;

namespace ExpenseWeb.Controllers
{
    public class ProfileController : Controller
    {
        private readonly AuthApiService _authApiService;
        private readonly SupportApiService _supportApiService;

        public ProfileController(AuthApiService authApiService, SupportApiService supportApiService)
        {
            _authApiService = authApiService;
            _supportApiService = supportApiService;
        }

        private string? GetAccessToken()
        {
            return HttpContext.Session.GetString("AccessToken");
        }

        private bool HasAccessToken() => !string.IsNullOrWhiteSpace(GetAccessToken());

        private void SetProfileViewData(string? fullName = null)
        {
            ViewBag.UserFullName = fullName ?? HttpContext.Session.GetString("UserFullName") ?? "Người dùng";
        }

        private static (string lastName, string firstName) SplitFullName(string? fullName)
        {
            if (string.IsNullOrWhiteSpace(fullName))
                return (string.Empty, string.Empty);

            var parts = fullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 1)
                return (string.Empty, parts[0]);

            var firstName = parts[^1];
            var lastName = string.Join(" ", parts.Take(parts.Length - 1));
            return (lastName, firstName);
        }

        [HttpGet]
        public async Task<IActionResult> Index()
        {
            var token = GetAccessToken();
            if (string.IsNullOrWhiteSpace(token))
                return RedirectToAction("Login", "Auth");

            var result = await _authApiService.GetMeAsync(token);
            if (!result.Success || result.Data == null)
            {
                HttpContext.Session.Clear();
                return RedirectToAction("Login", "Auth");
            }

            var (lastName, firstName) = SplitFullName(result.Data.full_name);
            HttpContext.Session.SetString("UserFullName", result.Data.full_name ?? string.Empty);
            HttpContext.Session.SetString("UserAvatar", result.Data.avatar ?? string.Empty);
            var model = new ProfilePageViewModel
            {
                LastName = lastName,
                FirstName = firstName,
                Email = result.Data.email ?? string.Empty,
                PhoneNumber = result.Data.phone_number,
                Avatar = result.Data.avatar
            };

            SetProfileViewData(result.Data.full_name);

            var defaultAvatarsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "sneat", "img", "avatars", "default");
            var defaultAvatars = new List<string>();
            if (Directory.Exists(defaultAvatarsFolder))
            {
                var files = Directory.GetFiles(defaultAvatarsFolder);
                foreach (var file in files)
                {
                    defaultAvatars.Add("/sneat/img/avatars/default/" + Path.GetFileName(file));
                }
            }
            ViewBag.DefaultAvatars = defaultAvatars;

            return View(model);
        }

        [HttpPost]
        public async Task<IActionResult> UpdateAjax([FromForm] ProfilePageViewModel model, IFormFile? AvatarFile)
        {
            var token = GetAccessToken();
            if (string.IsNullOrWhiteSpace(token))
                return Unauthorized(new { success = false, message = "Phiên đăng nhập đã hết hạn." });

            if (model == null)
                return BadRequest(new { success = false, message = "Dữ liệu không hợp lệ." });

            var fullName = string.Join(" ", new[] { model.LastName?.Trim(), model.FirstName?.Trim() }
                .Where(x => !string.IsNullOrWhiteSpace(x)));

            if (string.IsNullOrWhiteSpace(fullName))
                return BadRequest(new { success = false, message = "Họ tên không được để trống." });

            string finalAvatarUrl = string.IsNullOrWhiteSpace(model.Avatar) ? string.Empty : model.Avatar.Trim();

            if (AvatarFile != null && AvatarFile.Length > 0)
            {
                try
                {
                    var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "sneat", "img", "avatars", "upload");
                    if (!Directory.Exists(uploadsFolder))
                    {
                        Directory.CreateDirectory(uploadsFolder);
                    }

                    var userEmail = string.IsNullOrWhiteSpace(model.Email) ? "unknown" : model.Email.Trim();
                    var fileName = $"{userEmail}.png";
                    var filePath = Path.Combine(uploadsFolder, fileName);

                    if (System.IO.File.Exists(filePath))
                    {
                        System.IO.File.Delete(filePath);
                    }

                    using (var stream = new FileStream(filePath, FileMode.Create))
                    {
                        await AvatarFile.CopyToAsync(stream);
                    }

                    finalAvatarUrl = "/sneat/img/avatars/upload/" + fileName;
                }
                catch (Exception ex)
                {
                    return BadRequest(new { success = false, message = "Lỗi khi lưu ảnh: " + ex.Message });
                }
            }

            var request = new UpdateProfileRequestDto
            {
                full_name = fullName,
                email = model.Email?.Trim() ?? string.Empty,
                phone_number = string.IsNullOrWhiteSpace(model.PhoneNumber) ? null : model.PhoneNumber.Trim(),
                avatar = string.IsNullOrWhiteSpace(finalAvatarUrl) ? null : finalAvatarUrl
            };

            var result = await _authApiService.UpdateProfileAsync(token, request);
            if (!result.Success || result.Data == null)
                return BadRequest(new { success = false, message = result.ErrorMessage ?? "Không thể cập nhật hồ sơ." });

            HttpContext.Session.SetString("UserFullName", result.Data.full_name ?? string.Empty);
            HttpContext.Session.SetString("UserEmail", result.Data.email ?? string.Empty);
            HttpContext.Session.SetString("UserAvatar", finalAvatarUrl ?? string.Empty);

            return Json(new { success = true, message = "Cập nhật hồ sơ thành công." });
        }

        [HttpPost]
        public async Task<IActionResult> DeleteAccountAjax()
        {
            var token = GetAccessToken();
            if (string.IsNullOrWhiteSpace(token))
                return Unauthorized(new { success = false, message = "Phiên đăng nhập đã hết hạn." });

            var result = await _authApiService.DeleteMeAsync(token);
            if (!result.Success)
                return BadRequest(new { success = false, message = result.ErrorMessage ?? "Không thể xóa tài khoản." });

            HttpContext.Session.Clear();
            return Json(new { success = true, redirectUrl = Url.Action("Login", "Auth") });
        }

        [HttpGet]
        public async Task<IActionResult> Support()
        {
            var token = GetAccessToken();
            if (string.IsNullOrWhiteSpace(token))
                return RedirectToAction("Login", "Auth");

            var model = await BuildSupportPageViewModelAsync(token, new SupportCreateFormViewModel());
            SetProfileViewData();
            return View(model);
        }

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Support(SupportCreateFormViewModel form)
        {
            var token = GetAccessToken();
            if (string.IsNullOrWhiteSpace(token))
                return RedirectToAction("Login", "Auth");

            if (!ModelState.IsValid)
            {
                var invalidModel = await BuildSupportPageViewModelAsync(token, form);
                invalidModel.ErrorMessage = "Vui lòng kiểm tra lại dữ liệu đã nhập.";
                SetProfileViewData();
                return View(invalidModel);
            }

            var createRequest = new SupportRequestCreateRequestDto
            {
                subject = form.Subject.Trim(),
                message = form.Message.Trim(),
                support_type = form.SupportType,
                priority = form.Priority,
                attachments = new List<SupportAttachmentUploadDto>()
            };

            var createResult = await _supportApiService.CreateRequestAsync(token, createRequest);
            if (!createResult.Success)
            {
                var errorModel = await BuildSupportPageViewModelAsync(token, form);
                errorModel.ErrorMessage = createResult.ErrorMessage;
                SetProfileViewData();
                return View(errorModel);
            }

            TempData["SupportSuccess"] = "Gửi yêu cầu hỗ trợ thành công.";
            return RedirectToAction(nameof(Support));
        }

        private async Task<SupportPageViewModel> BuildSupportPageViewModelAsync(string token, SupportCreateFormViewModel form)
        {
            var model = new SupportPageViewModel
            {
                Form = form,
                Lang = "vi",
                UserFullName = HttpContext.Session.GetString("UserFullName") ?? "Người dùng",
                SuccessMessage = TempData["SupportSuccess"]?.ToString()
            };

            var historyResult = await _supportApiService.GetMyRequestsAsync(token);
            if (!historyResult.Success)
            {
                model.ErrorMessage = historyResult.ErrorMessage;
                return model;
            }

            foreach (var item in historyResult.Data)
            {
                model.HistoryItems.Add(MapHistoryItem(item));
            }

            return model;
        }

        private static SupportHistoryItemViewModel MapHistoryItem(SupportRequestListItemDto dto)
        {
            return new SupportHistoryItemViewModel
            {
                SupportRequestId = dto.support_request_id,
                Subject = dto.subject,
                Message = dto.message ?? string.Empty,
                SupportType = dto.support_type,
                SupportTypeLabel = ToSupportTypeLabel(dto.support_type),
                Priority = dto.priority,
                PriorityLabel = ToPriorityLabel(dto.priority),
                Status = dto.status,
                StatusLabel = ToStatusLabel(dto.status),
                StatusBadgeClass = ToStatusBadgeClass(dto.status),
                CreatedAt = dto.created_at,
                RepliedAt = dto.replied_at,
                AdminReply = dto.admin_reply,
                Attachments = new List<SupportAttachmentViewModel>()
            };
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