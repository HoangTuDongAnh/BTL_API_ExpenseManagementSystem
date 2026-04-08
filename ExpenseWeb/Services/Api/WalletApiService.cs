using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using ExpenseWeb.Models.Dtos.Wallet;

namespace ExpenseWeb.Services.Api
{
    public class WalletApiService
    {
        private readonly HttpClient _httpClient;
        private readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            NumberHandling = JsonNumberHandling.AllowReadingFromString
        };

        public WalletApiService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        private void SetBearerToken(string token)
        {
            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);
        }

        private StringContent CreateJsonContent<T>(T data)
        {
            var json = JsonSerializer.Serialize(data, _jsonOptions);
            return new StringContent(json, Encoding.UTF8, "application/json");
        }

        public async Task<List<WalletResponseDto>> GetWalletsAsync(string token)
        {
            SetBearerToken(token);

            var response = await _httpClient.GetAsync("/wallets");
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(body);
            }

            return JsonSerializer.Deserialize<List<WalletResponseDto>>(body, _jsonOptions)
                   ?? new List<WalletResponseDto>();
        }

        public async Task<WalletResponseDto> GetWalletByIdAsync(string token, string walletId)
        {
            SetBearerToken(token);

            var response = await _httpClient.GetAsync($"/wallets/{walletId}");
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(body);
            }

            return JsonSerializer.Deserialize<WalletResponseDto>(body, _jsonOptions)
                   ?? throw new InvalidOperationException("Không đọc được dữ liệu ví.");
        }

        public async Task<WalletResponseDto> CreateWalletAsync(string token, WalletCreateRequestDto request)
        {
            SetBearerToken(token);

            var response = await _httpClient.PostAsync("/wallets", CreateJsonContent(request));
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(body);
            }

            return JsonSerializer.Deserialize<WalletResponseDto>(body, _jsonOptions)
                   ?? throw new InvalidOperationException("API tạo ví trả về rỗng.");
        }

        public async Task<WalletResponseDto> UpdateWalletAsync(string token, string walletId, WalletUpdateRequestDto request)
        {
            SetBearerToken(token);

            var response = await _httpClient.PutAsync($"/wallets/{walletId}", CreateJsonContent(request));
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(body);
            }

            return JsonSerializer.Deserialize<WalletResponseDto>(body, _jsonOptions)
                   ?? throw new InvalidOperationException("API cập nhật ví trả về rỗng.");
        }

        public async Task DeleteWalletAsync(string token, string walletId, WalletDeleteRequestDto request)
        {
            SetBearerToken(token);

            using var httpRequest = new HttpRequestMessage(HttpMethod.Delete, $"/wallets/{walletId}")
            {
                Content = CreateJsonContent(request)
            };

            var response = await _httpClient.SendAsync(httpRequest);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(body);
            }
        }
    }
}