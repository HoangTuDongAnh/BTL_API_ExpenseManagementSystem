using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using ExpenseWeb.Models.Dtos.Reports;

namespace ExpenseWeb.Services.Api
{
    public class ReportApiService
    {
        private readonly HttpClient _httpClient;
        private readonly JsonSerializerOptions _jsonOptions = new()
        {
            PropertyNameCaseInsensitive = true,
            NumberHandling = JsonNumberHandling.AllowReadingFromString
        };

        public ReportApiService(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        private void SetBearerToken(string token)
        {
            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);
        }

        public async Task<DashboardOverviewDto> GetDashboardOverviewAsync(string token)
        {
            SetBearerToken(token);
            var response = await _httpClient.GetAsync("/reports/dashboard");
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException(body);

            return JsonSerializer.Deserialize<DashboardOverviewDto>(body, _jsonOptions)
                   ?? throw new InvalidOperationException("Dashboard overview response is empty.");
        }

        public async Task<List<MonthlySummaryItemDto>> GetMonthlySummaryAsync(string token, int year)
        {
            SetBearerToken(token);
            var response = await _httpClient.GetAsync($"/reports/monthly?year={year}");
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException(body);

            return JsonSerializer.Deserialize<List<MonthlySummaryItemDto>>(body, _jsonOptions) ?? new();
        }

        public async Task<List<CategorySummaryItemDto>> GetCategorySummaryAsync(string token, int month, int year)
        {
            SetBearerToken(token);
            var response = await _httpClient.GetAsync($"/reports/by-category?month={month}&year={year}");
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException(body);

            return JsonSerializer.Deserialize<List<CategorySummaryItemDto>>(body, _jsonOptions) ?? new();
        }

        public async Task<List<TopExpenseItemDto>> GetTopExpensesAsync(string token, int month, int year, int limit = 5)
        {
            SetBearerToken(token);
            var response = await _httpClient.GetAsync($"/reports/top-expenses?month={month}&year={year}&limit={limit}");
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException(body);

            return JsonSerializer.Deserialize<List<TopExpenseItemDto>>(body, _jsonOptions) ?? new();
        }

        public async Task<List<BudgetProgressItemDto>> GetBudgetProgressAsync(string token, int month, int year)
        {
            SetBearerToken(token);
            var response = await _httpClient.GetAsync($"/reports/budget-progress?month={month}&year={year}");
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException(body);

            return JsonSerializer.Deserialize<List<BudgetProgressItemDto>>(body, _jsonOptions) ?? new();
        }

        public async Task<ReportAnalyticsDto> GetReportAnalyticsAsync(string token, DateTime dateFrom, DateTime dateTo, string groupBy)
        {
            SetBearerToken(token);
            var response = await _httpClient.GetAsync($"/reports/analytics?date_from={dateFrom:yyyy-MM-dd}&date_to={dateTo:yyyy-MM-dd}&group_by={groupBy}");
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException(body);

            return JsonSerializer.Deserialize<ReportAnalyticsDto>(body, _jsonOptions)
                   ?? throw new InvalidOperationException("Report analytics response is empty.");
        }
    }
}
