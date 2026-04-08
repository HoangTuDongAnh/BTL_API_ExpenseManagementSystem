using System;
using System.ComponentModel.DataAnnotations;

namespace ExpenseWeb.Models.Dtos.Transaction
{
    public class TransactionCreateRequestDto
    {
        [Required]
        public string wallet_id { get; set; } = string.Empty;

        [Required]
        public string category_id { get; set; } = string.Empty;

        [Required]
        [RegularExpression("^(income|expense)$")]
        public string transaction_type { get; set; } = "expense";

        [Range(typeof(decimal), "0.01", "999999999999999")]
        public decimal amount { get; set; }

        [Required]
        public DateTime transaction_date { get; set; }

        [MaxLength(500)]
        public string? note { get; set; }

        public bool is_recurring { get; set; }

        public string? recur_interval { get; set; }
    }
}
