using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using ExpenseWeb.Models.Dtos.Transaction;

namespace ExpenseWeb.Services.Api
{
    public class TransactionApiService
    {
        private readonly HttpClient _httpClient;
        private readonly string _baseUrl;
        private readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            NumberHandling = JsonNumberHandling.AllowReadingFromString
        };

        public TransactionApiService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _baseUrl = (configuration["ApiSettings:BaseUrl"] ?? string.Empty).TrimEnd('/');
        }

        private void SetBearer(string token)
        {
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        public async Task<List<TransactionResponseDto>> GetTransactionsAsync(string token)
        {
            SetBearer(token);

            var response = await _httpClient.GetAsync($"{_baseUrl}/transactions");
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(body);
            }

            return JsonSerializer.Deserialize<List<TransactionResponseDto>>(body, _jsonOptions) ?? new List<TransactionResponseDto>();
        }

        public async Task<TransactionResponseDto?> CreateTransactionAsync(string token, TransactionCreateRequestDto request)
        {
            SetBearer(token);

            var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync($"{_baseUrl}/transactions", content);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(body);
            }

            return JsonSerializer.Deserialize<TransactionResponseDto>(body, _jsonOptions);
        }

        public async Task<TransactionResponseDto?> UpdateTransactionAsync(string token, string transactionId, TransactionUpdateRequestDto request)
        {
            SetBearer(token);

            var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
            var response = await _httpClient.PutAsync($"{_baseUrl}/transactions/{transactionId}", content);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(body);
            }

            return JsonSerializer.Deserialize<TransactionResponseDto>(body, _jsonOptions);
        }

        public async Task DeleteTransactionAsync(string token, string transactionId)
        {
            SetBearer(token);

            var response = await _httpClient.DeleteAsync($"{_baseUrl}/transactions/{transactionId}");
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(body);
            }
        }
    }
}
