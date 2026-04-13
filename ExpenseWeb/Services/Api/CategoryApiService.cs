using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using ExpenseWeb.Models.Dtos.Category;

namespace ExpenseWeb.Services.Api
{
    public class CategoryApiService
    {
        private readonly HttpClient _httpClient;
        private readonly string _baseUrl;
        private readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            NumberHandling = JsonNumberHandling.AllowReadingFromString
        };

        public CategoryApiService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _baseUrl = (configuration["ApiSettings:BaseUrl"] ?? string.Empty).TrimEnd('/');
        }

        private void SetBearer(string token)
        {
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        public async Task<List<CategoryOverviewResponseDto>> GetOverviewAsync(string token, string periodType, int year, int? month, int? week)
        {
            SetBearer(token);

            var query = new List<string>
            {
                $"period_type={Uri.EscapeDataString(periodType)}",
                $"period_year={year}"
            };

            if (month.HasValue)
            {
                query.Add($"period_month={month.Value}");
            }

            if (week.HasValue)
            {
                query.Add($"period_week={week.Value}");
            }

            var url = $"{_baseUrl}/categories/overview?{string.Join("&", query)}";
            var response = await _httpClient.GetAsync(url);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(body);
            }

            return JsonSerializer.Deserialize<List<CategoryOverviewResponseDto>>(body, _jsonOptions) ?? new List<CategoryOverviewResponseDto>();
        }

        public async Task<List<CategoryResponseDto>> GetCategoriesAsync(string token, bool includeDeleted = false)
        {
            SetBearer(token);

            var url = includeDeleted ? $"{_baseUrl}/categories?include_deleted=true" : $"{_baseUrl}/categories";
            var response = await _httpClient.GetAsync(url);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(body);
            }

            return JsonSerializer.Deserialize<List<CategoryResponseDto>>(body, _jsonOptions) ?? new List<CategoryResponseDto>();
        }

        public async Task<CategoryResponseDto?> CreateCategoryAsync(string token, CategoryCreateRequestDto request)
        {
            SetBearer(token);

            var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync($"{_baseUrl}/categories", content);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(body);
            }

            return JsonSerializer.Deserialize<CategoryResponseDto>(body, _jsonOptions);
        }

        public async Task<CategoryResponseDto?> UpdateCategoryAsync(string token, string categoryId, CategoryUpdateRequestDto request)
        {
            SetBearer(token);

            var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
            var response = await _httpClient.PutAsync($"{_baseUrl}/categories/{categoryId}", content);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(body);
            }

            return JsonSerializer.Deserialize<CategoryResponseDto>(body, _jsonOptions);
        }

        public async Task DeleteCategoryAsync(string token, string categoryId, CategoryDeleteRequestDto request)
        {
            SetBearer(token);

            var message = new HttpRequestMessage(HttpMethod.Delete, $"{_baseUrl}/categories/{categoryId}")
            {
                Content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json")
            };

            var response = await _httpClient.SendAsync(message);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(body);
            }
        }

        public async Task<List<BudgetResponseDto>> GetBudgetsAsync(string token, string? periodType = null, int? year = null, int? month = null, int? week = null, string? categoryId = null)
        {
            SetBearer(token);

            var query = new List<string>();

            if (!string.IsNullOrWhiteSpace(periodType))
            {
                query.Add($"period_type={Uri.EscapeDataString(periodType)}");
            }

            if (year.HasValue)
            {
                query.Add($"period_year={year.Value}");
            }

            if (month.HasValue)
            {
                query.Add($"period_month={month.Value}");
            }

            if (week.HasValue)
            {
                query.Add($"period_week={week.Value}");
            }

            if (!string.IsNullOrWhiteSpace(categoryId))
            {
                query.Add($"category_id={Uri.EscapeDataString(categoryId)}");
            }

            var url = query.Count > 0
                ? $"{_baseUrl}/budgets?{string.Join("&", query)}"
                : $"{_baseUrl}/budgets";
            var response = await _httpClient.GetAsync(url);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(body);
            }

            return JsonSerializer.Deserialize<List<BudgetResponseDto>>(body, _jsonOptions) ?? new List<BudgetResponseDto>();
        }

        public async Task<BudgetResponseDto?> CreateBudgetAsync(string token, BudgetCreateRequestDto request)
        {
            SetBearer(token);

            var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync($"{_baseUrl}/budgets", content);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(body);
            }

            return JsonSerializer.Deserialize<BudgetResponseDto>(body, _jsonOptions);
        }

        public async Task<BudgetResponseDto?> UpdateBudgetAsync(string token, string budgetId, BudgetUpdateRequestDto request)
        {
            SetBearer(token);

            var content = new StringContent(JsonSerializer.Serialize(request), Encoding.UTF8, "application/json");
            var response = await _httpClient.PutAsync($"{_baseUrl}/budgets/{budgetId}", content);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                throw new InvalidOperationException(body);
            }

            return JsonSerializer.Deserialize<BudgetResponseDto>(body, _jsonOptions);
        }
    }
}