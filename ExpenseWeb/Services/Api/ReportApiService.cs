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

        public async Task<DashboardOverviewDto> GetDashboardOverviewRangeAsync(string token, DateTime startDate, DateTime endDate)
        {
            SetBearerToken(token);
            var response = await _httpClient.GetAsync($"/reports/dashboard-range?start_date={startDate:yyyy-MM-dd}&end_date={endDate:yyyy-MM-dd}");
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException(body);

            return JsonSerializer.Deserialize<DashboardOverviewDto>(body, _jsonOptions)
                   ?? throw new InvalidOperationException("Dashboard range overview response is empty.");
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

        public async Task<List<CategorySummaryItemDto>> GetCategorySummaryRangeAsync(string token, DateTime startDate, DateTime endDate)
        {
            SetBearerToken(token);
            var response = await _httpClient.GetAsync($"/reports/by-category-range?start_date={startDate:yyyy-MM-dd}&end_date={endDate:yyyy-MM-dd}");
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

        public async Task<List<TopExpenseItemDto>> GetTopExpensesRangeAsync(string token, DateTime startDate, DateTime endDate, int limit = 5)
        {
            SetBearerToken(token);
            var response = await _httpClient.GetAsync($"/reports/top-expenses-range?start_date={startDate:yyyy-MM-dd}&end_date={endDate:yyyy-MM-dd}&limit={limit}");
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

        public async Task<CashflowAnalyticsDto> GetCashflowAnalyticsAsync(string token, DateTime startDate, DateTime endDate, string granularity)
        {
            SetBearerToken(token);
            var response = await _httpClient.GetAsync(
                $"/reports/cashflow-analytics?start_date={startDate:yyyy-MM-dd}&end_date={endDate:yyyy-MM-dd}&granularity={granularity}");
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                throw new InvalidOperationException(body);

            return JsonSerializer.Deserialize<CashflowAnalyticsDto>(body, _jsonOptions)
                   ?? throw new InvalidOperationException("Cashflow analytics response is empty.");
        }
    }
}
