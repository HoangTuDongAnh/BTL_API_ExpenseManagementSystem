using System.ComponentModel.DataAnnotations;

namespace ExpenseWeb.Models.ViewModels.Auth
{
    public class RegisterViewModel
    {
        [Required]
        public string FullName { get; set; }

        [Required]
        [EmailAddress]
        public string Email { get; set; }

        public string PhoneNumber { get; set; }

        [Required]
        [MinLength(6)]
        public string Password { get; set; }

        [Display(Name = "I agree to the terms and conditions")]
        [Range(typeof(bool), "true", "true", ErrorMessage = "You must agree to the terms.")]
        public bool AgreeTerms { get; set; }
    }
}