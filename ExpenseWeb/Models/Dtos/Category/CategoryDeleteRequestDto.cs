using System.Text.Json.Serialization;

namespace ExpenseWeb.Models.Dtos.Category
{
    public class CategoryDeleteRequestDto
    {
        [JsonPropertyName("action")]
        public string action { get; set; } = "other";

        [JsonPropertyName("target_category_id")]
        public string? target_category_id { get; set; }
    }
}