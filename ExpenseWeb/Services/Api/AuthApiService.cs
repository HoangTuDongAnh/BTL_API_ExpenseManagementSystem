using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using ExpenseWeb.Models.Dtos.Auth;

namespace ExpenseWeb.Services.Api
{
    public class AuthApiService
    {
        private readonly HttpClient _httpClient;
        private readonly string _baseUrl;
        private readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNameCaseInsensitive = true
        };

        public AuthApiService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _baseUrl = configuration["ApiSettings:BaseUrl"] ?? "";
        }

        private void SetBearerToken(string token)
        {
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        private StringContent CreateJsonContent<T>(T payload)
        {
            var json = JsonSerializer.Serialize(payload);
            return new StringContent(json, Encoding.UTF8, "application/json");
        }

        public async Task<(bool Success, string ErrorMessage, LoginResponseDto? Data)> LoginAsync(LoginRequestDto request)
        {
            var response = await _httpClient.PostAsync($"{_baseUrl}/auth/login", CreateJsonContent(request));
            var responseBody = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
                return (false, ExtractErrorMessage(responseBody), null);

            var data = JsonSerializer.Deserialize<LoginResponseDto>(responseBody, _jsonOptions);
            return (true, "", data);
        }

        public async Task<(bool Success, string ErrorMessage)> ForgotPasswordAsync(string email)
        {
            var response = await _httpClient.PostAsJsonAsync($"{_baseUrl}/auth/forgot-password", new { email });
            if (!response.IsSuccessStatusCode)
                return (false, await response.Content.ReadAsStringAsync());
            return (true, "");
        }

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

        public async Task<(bool Success, string ErrorMessage, RegisterResponseDto? Data)> RegisterAsync(RegisterRequestDto request)
        {
            var response = await _httpClient.PostAsync($"{_baseUrl}/auth/register", CreateJsonContent(request));
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                return (false, ExtractErrorMessage(responseBody), null);

            var data = JsonSerializer.Deserialize<RegisterResponseDto>(responseBody, _jsonOptions);
            return (true, "", data);
        }

        public async Task<(bool Success, string ErrorMessage)> VerifyOtpAsync(string email, string otp)
        {
            var response = await _httpClient.PostAsync($"{_baseUrl}/auth/verify-otp", CreateJsonContent(new { email, otp }));
            var responseBody = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
                return (false, ExtractErrorMessage(responseBody));
            return (true, "");
        }

        public async Task<(bool Success, string ErrorMessage)> ResendOtpAsync(string email)
        {
            var response = await _httpClient.PostAsync($"{_baseUrl}/auth/resend-otp", CreateJsonContent(new { email }));
            var responseBody = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
                return (false, ExtractErrorMessage(responseBody));

            try
            {
                var doc = JsonDocument.Parse(responseBody);
                if (doc.RootElement.TryGetProperty("message", out var message))
                {
                    return (true, message.GetString() ?? "");
                }
            }
            catch
            {
            }

            return (true, "");
        }

        public async Task<(bool Success, string ErrorMessage, UserDto? Data)> GetMeAsync(string token)
        {
            SetBearerToken(token);
            var response = await _httpClient.GetAsync($"{_baseUrl}/auth/me");
            var responseBody = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
                return (false, ExtractErrorMessage(responseBody), null);

            var data = JsonSerializer.Deserialize<UserDto>(responseBody, _jsonOptions);
            return (true, "", data);
        }

        public async Task<(bool Success, string ErrorMessage, UserDto? Data)> UpdateProfileAsync(string token, UpdateProfileRequestDto request)
        {
            SetBearerToken(token);
            var response = await _httpClient.PutAsync($"{_baseUrl}/auth/me", CreateJsonContent(request));
            var responseBody = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
                return (false, ExtractErrorMessage(responseBody), null);

            var data = JsonSerializer.Deserialize<UserDto>(responseBody, _jsonOptions);
            return (true, "", data);
        }

        public async Task<(bool Success, string ErrorMessage)> DeleteMeAsync(string token)
        {
            SetBearerToken(token);
            var response = await _httpClient.DeleteAsync($"{_baseUrl}/auth/me");
            var responseBody = await response.Content.ReadAsStringAsync();
            if (!response.IsSuccessStatusCode)
                return (false, ExtractErrorMessage(responseBody));
            return (true, "");
        }

        private string ExtractErrorMessage(string responseBody)
        {
            try
            {
                var doc = JsonDocument.Parse(responseBody);
                if (doc.RootElement.TryGetProperty("detail", out var detail))
                {
                    return detail.ValueKind == JsonValueKind.String
                        ? detail.GetString() ?? "Unknown error"
                        : detail.ToString();
                }

                if (doc.RootElement.TryGetProperty("message", out var message))
                {
                    return message.ValueKind == JsonValueKind.String
                        ? message.GetString() ?? "Unknown error"
                        : message.ToString();
                }
            }
            catch
            {
            }

            return string.IsNullOrWhiteSpace(responseBody) ? "Unknown error" : responseBody;
        }
    }
}