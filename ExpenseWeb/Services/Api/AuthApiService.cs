using System.Net.Http;
using System.Text;
using System.Text.Json;
using ExpenseWeb.Models.Dtos.Auth;

namespace ExpenseWeb.Services.Api
{
    public class AuthApiService
    {
        private readonly HttpClient _httpClient;
        private readonly string _baseUrl;

        public AuthApiService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _baseUrl = configuration["ApiSettings:BaseUrl"] ?? "";
        }

        // ================= LOGIN =================
        public async Task<(bool Success, string ErrorMessage, LoginResponseDto? Data)> LoginAsync(LoginRequestDto request)
        {
            var url = $"{_baseUrl}/auth/login";

            var json = JsonSerializer.Serialize(request);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(url, content);

            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return (false, ExtractErrorMessage(responseBody), null);
            }

            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            var data = JsonSerializer.Deserialize<LoginResponseDto>(responseBody, options);

            return (true, "", data);
        }

        // ================= FORGOT PASSWORD =================
        public async Task<(bool Success, string ErrorMessage)> ForgotPasswordAsync(string email)
        {
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/auth/forgot-password", new { email });

            if (!response.IsSuccessStatusCode)
                return (false, await response.Content.ReadAsStringAsync());

            return (true, "");
        }

        // ================= RESET PASSWORD =================
        public async Task<(bool Success, string ErrorMessage)> ResetPasswordAsync(string token, string newPassword)
        {
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/auth/reset-password", new
            {
                token,
                new_password = newPassword
            });

            if (!response.IsSuccessStatusCode)
                return (false, await response.Content.ReadAsStringAsync());

            return (true, "");
        }

        // ================= REGISTER =================
        public async Task<(bool Success, string ErrorMessage)> RegisterAsync(RegisterRequestDto request)
        {
            var url = $"{_baseUrl}/auth/register";

            var json = JsonSerializer.Serialize(request);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(url, content);

            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return (false, responseBody);
            }

            return (true, "");
        }

        // ================= VERIFY OTP =================
        public async Task<(bool Success, string ErrorMessage)> VerifyOtpAsync(string email, string otp)
        {
            var url = $"{_baseUrl}/auth/verify-otp";

            var payload = new
            {
                email = email,
                otp = otp
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(url, content);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return (false, ExtractErrorMessage(responseBody));
            }

            return (true, "");
        }

        // ================= RESEND OTP =================
        public async Task<(bool Success, string ErrorMessage)> ResendOtpAsync(string email)
        {
            var url = $"{_baseUrl}/auth/resend-otp";

            var payload = new
            {
                email = email
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(url, content);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return (false, ExtractErrorMessage(responseBody));
            }

            return (true, "");
        }

        // ================= ERROR MESSAGE =================
        private string ExtractErrorMessage(string responseBody)
        {
            try
            {
                var doc = JsonDocument.Parse(responseBody);

                if (doc.RootElement.TryGetProperty("detail", out var detail))
                {
                    return detail.GetString() ?? "Unknown error";
                }
            }
            catch
            {
                // ignore parse error
            }

            return responseBody;
        }
    }
}