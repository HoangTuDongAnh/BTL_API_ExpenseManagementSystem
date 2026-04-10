document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-password-toggle]").forEach(function (button) {
        button.addEventListener("click", function () {
            var targetId = button.getAttribute("data-password-toggle");
            var input = document.getElementById(targetId);
            if (!input) return;

            var icon = button.querySelector("i");

            if (input.type === "password") {
                input.type = "text";
                if (icon) {
                    icon.classList.remove("bx-hide");
                    icon.classList.add("bx-show");
                }
            } else {
                input.type = "password";
                if (icon) {
                    icon.classList.remove("bx-show");
                    icon.classList.add("bx-hide");
                }
            }
        });
    });

    document.querySelectorAll("form[data-loading-button]").forEach(function (form) {
        form.addEventListener("submit", function () {
            if (!form.checkValidity()) return;

            var button = form.querySelector("[data-submit-text]");
            if (!button) return;

            var loadingText = button.getAttribute("data-loading-text") || "Processing...";
            button.disabled = true;
            button.dataset.originalText = button.innerHTML;
            button.innerHTML = loadingText;
        });
    });

    var container = document.getElementById("authSlider");

    document.querySelectorAll("[data-auth-toggle='signup']").forEach(function (btn) {
        btn.addEventListener("click", function () {
            if (container) {
                container.classList.add("right-panel-active");
            }
        });
    });

    document.querySelectorAll("[data-auth-toggle='signin']").forEach(function (btn) {
        btn.addEventListener("click", function () {
            if (container) {
                container.classList.remove("right-panel-active");
            }
        });
    });
});