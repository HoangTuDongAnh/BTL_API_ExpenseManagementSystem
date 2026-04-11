using System.Text.Json.Serialization; // Đừng quên dòng này ở trên cùng

namespace ExpenseWeb.Models.Dtos.Category
{
    public class CategoryUpdateRequestDto
    {
        [JsonPropertyName("category_name")]
        public string category_name { get; set; }

        [JsonPropertyName("icon")]
        public string icon { get; set; }

        [JsonPropertyName("color")]
        public string color { get; set; }
    }
}