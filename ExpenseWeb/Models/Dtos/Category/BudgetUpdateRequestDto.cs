using System.Text.Json.Serialization;

namespace ExpenseWeb.Models.Dtos.Category
{
    public class BudgetUpdateRequestDto
    {
        [JsonPropertyName("limit_amount")]
        public decimal limit_amount { get; set; }

        [JsonPropertyName("period_type")]
        public string period_type { get; set; }

        [JsonPropertyName("period_year")]
        public int period_year { get; set; }

        [JsonPropertyName("period_month")]
        public int? period_month { get; set; }

        [JsonPropertyName("period_week")]
        public int? period_week { get; set; }
    }
}