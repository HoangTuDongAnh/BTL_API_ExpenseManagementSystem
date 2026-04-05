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

        public async Task<(bool Success, string ErrorMessage, LoginResponseDto? Data)> LoginAsync(LoginRequestDto request)
        {
            var url = $"{_baseUrl}/auth/login";

            var json = JsonSerializer.Serialize(request);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(url, content);

            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return (false, responseBody, null);
            }

            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            };

            var data = JsonSerializer.Deserialize<LoginResponseDto>(responseBody, options);

            return (true, "", data);
        }

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
    }
}