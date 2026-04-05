document.addEventListener("DOMContentLoaded", function () {
    const addWalletModalEl = document.getElementById("addWalletModal");
    const walletDetailModalEl = document.getElementById("walletDetailModal");

    const addWalletModal = addWalletModalEl ? new bootstrap.Modal(addWalletModalEl) : null;
    const walletDetailModal = walletDetailModalEl ? new bootstrap.Modal(walletDetailModalEl) : null;

    const toastSaved = document.getElementById("walletSavedToast") ? new bootstrap.Toast(document.getElementById("walletSavedToast")) : null;
    const toastUpdated = document.getElementById("walletUpdatedToast") ? new bootstrap.Toast(document.getElementById("walletUpdatedToast")) : null;
    const toastDeleted = document.getElementById("walletDeletedToast") ? new bootstrap.Toast(document.getElementById("walletDeletedToast")) : null;

    function formatCurrency(value, currencyCode) {
        const number = Number(value || 0);
        return `${number.toLocaleString("vi-VN")} ${currencyCode}`;
    }

    function hexToRgba(hex, alpha) {
        if (!hex || !hex.startsWith("#") || hex.length !== 7) {
            return "rgba(255,171,0,0.14)";
        }
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function setActiveColor(buttonsSelector, color) {
        document.querySelectorAll(buttonsSelector).forEach(function (btn) {
            btn.classList.toggle("active", (btn.dataset.color || "").toUpperCase() === color.toUpperCase());
        });
    }

    function updateAddPreview() {
        const name = document.getElementById("addWalletName")?.value || "Ví mới";
        const balance = document.getElementById("addInitialBalance")?.value || 0;
        const currency = document.getElementById("addWalletCurrencyCode")?.value || "VND";
        const color = document.getElementById("addWalletColor")?.value || "#FFAB00";
        const icon = document.getElementById("addWalletIcon")?.value || "";

        const previewName = document.getElementById("addPreviewName");
        const previewBalance = document.getElementById("addPreviewBalance");
        const previewCurrency = document.getElementById("addPreviewCurrencyBadge");
        const previewIcon = document.getElementById("addPreviewIcon");
        const previewWrap = document.getElementById("addPreviewIconWrap");
        const colorCode = document.getElementById("addWalletColorCode");

        if (previewName) previewName.textContent = name;
        if (previewBalance) previewBalance.textContent = formatCurrency(balance, currency);
        if (previewCurrency) previewCurrency.textContent = currency;
        if (previewIcon && icon) {
            previewIcon.src = icon;
            previewIcon.classList.remove("d-none");
        }
        if (previewWrap) {
            previewWrap.style.background = hexToRgba(color, 0.14);
        }
        if (colorCode) colorCode.textContent = color.toUpperCase();

        setActiveColor(".wallet-color-preset", color);
    }

    function updateDetailPreview() {
        const name = document.getElementById("detailWalletName")?.value || "Ví";
        const balance = document.getElementById("detailInitialBalance")?.value || 0;
        const currency = document.getElementById("detailWalletCurrency")?.textContent?.trim() || "VND";
        const color = document.getElementById("detailWalletColor")?.value || "#FFAB00";
        const icon = document.getElementById("detailWalletIcon")?.value || "";

        const previewName = document.getElementById("detailPreviewName");
        const previewBalance = document.getElementById("detailPreviewBalance");
        const previewCurrency = document.getElementById("detailPreviewCurrency");
        const previewIcon = document.getElementById("detailPreviewIcon");
        const previewWrap = document.getElementById("detailPreviewIconWrap");
        const headIcon = document.getElementById("detailHeadIcon");
        const headWrap = document.getElementById("detailHeadIconWrap");
        const title = document.getElementById("detailWalletTitle");
        const colorCode = document.getElementById("detailWalletColorCode");

        if (previewName) previewName.textContent = name;
        if (previewBalance) previewBalance.textContent = formatCurrency(balance, currency);
        if (previewCurrency) previewCurrency.textContent = currency;
        if (title) title.textContent = name;

        if (previewIcon && icon) previewIcon.src = icon;
        if (headIcon && icon) headIcon.src = icon;

        if (previewWrap) previewWrap.style.background = hexToRgba(color, 0.14);
        if (headWrap) headWrap.style.background = hexToRgba(color, 0.14);
        if (colorCode) colorCode.textContent = color.toUpperCase();

        setActiveColor(".wallet-color-preset-detail", color);
    }

    ["addWalletName", "addInitialBalance", "addWalletColor"].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", updateAddPreview);
    });

    ["detailWalletName", "detailInitialBalance", "detailWalletColor"].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", updateDetailPreview);
    });

    document.querySelectorAll(".wallet-color-preset").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const color = btn.dataset.color || "#FFAB00";
            const input = document.getElementById("addWalletColor");
            if (input) input.value = color;
            updateAddPreview();
        });
    });

    document.querySelectorAll(".wallet-color-preset-detail").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const color = btn.dataset.color || "#FFAB00";
            const input = document.getElementById("detailWalletColor");
            if (input) input.value = color;
            updateDetailPreview();
        });
    });

    document.querySelectorAll(".wallet-image-option-add").forEach(function (btn) {
        btn.addEventListener("click", function () {
            document.querySelectorAll(".wallet-image-option-add").forEach(function (item) {
                item.classList.remove("active");
            });
            btn.classList.add("active");

            const iconInput = document.getElementById("addWalletIcon");
            if (iconInput) iconInput.value = btn.dataset.icon || "";

            updateAddPreview();
        });
    });

    document.querySelectorAll(".wallet-image-option-detail").forEach(function (btn) {
        btn.addEventListener("click", function () {
            document.querySelectorAll(".wallet-image-option-detail").forEach(function (item) {
                item.classList.remove("active");
            });
            btn.classList.add("active");

            const iconInput = document.getElementById("detailWalletIcon");
            if (iconInput) iconInput.value = btn.dataset.icon || "";

            updateDetailPreview();
        });
    });

    document.querySelectorAll(".wallet-currency-option").forEach(function (item) {
        item.addEventListener("click", function (e) {
            e.preventDefault();

            const code = item.dataset.code || "VND";
            const name = item.dataset.name || "Việt Nam Đồng";
            const flag = item.dataset.flag || "";

            const codeInput = document.getElementById("addWalletCurrencyCode");
            const label = document.getElementById("addWalletCurrencyLabel");
            const flagImg = document.getElementById("addWalletCurrencyFlag");

            if (codeInput) codeInput.value = code;
            if (label) label.textContent = `${name} (${code})`;
            if (flagImg && flag) flagImg.src = flag;

            updateAddPreview();
        });
    });

    if (walletDetailModalEl) {
        walletDetailModalEl.addEventListener("show.bs.modal", function (event) {
            const trigger = event.relatedTarget;
            if (!trigger) return;

            const walletId = trigger.getAttribute("data-wallet-id") || "";
            const walletName = trigger.getAttribute("data-wallet-name") || "Ví";
            const walletBalance = trigger.getAttribute("data-wallet-balance") || "0";
            const walletInitial = trigger.getAttribute("data-wallet-initial") || "0";
            const walletCurrency = trigger.getAttribute("data-wallet-currency") || "VND";
            const walletColor = trigger.getAttribute("data-wallet-color") || "#FFAB00";
            const walletIcon = trigger.getAttribute("data-wallet-icon") || "";

            const detailId = document.getElementById("detailWalletId");
            const detailName = document.getElementById("detailWalletName");
            const detailInitialBalance = document.getElementById("detailInitialBalance");
            const detailCurrency = document.getElementById("detailWalletCurrency");
            const detailBalance = document.getElementById("detailCurrentBalance");
            const detailColor = document.getElementById("detailWalletColor");
            const detailIcon = document.getElementById("detailWalletIcon");

            if (detailId) detailId.textContent = walletId;
            if (detailName) detailName.value = walletName;
            if (detailInitialBalance) detailInitialBalance.value = walletInitial;
            if (detailCurrency) detailCurrency.textContent = walletCurrency;
            if (detailBalance) detailBalance.textContent = formatCurrency(walletBalance, walletCurrency);
            if (detailColor) detailColor.value = walletColor;
            if (detailIcon) detailIcon.value = walletIcon;

            document.querySelectorAll(".wallet-image-option-detail").forEach(function (btn) {
                btn.classList.toggle("active", btn.dataset.icon === walletIcon);
            });

            updateDetailPreview();
        });
    }

    const btnSave = document.getElementById("btnSaveWalletStatic");
    if (btnSave) {
        btnSave.addEventListener("click", function () {
            if (addWalletModal) addWalletModal.hide();
            if (toastSaved) toastSaved.show();
        });
    }

    const btnUpdate = document.getElementById("btnUpdateWalletStatic");
    if (btnUpdate) {
        btnUpdate.addEventListener("click", function () {
            if (toastUpdated) toastUpdated.show();
        });
    }

    const btnDelete = document.getElementById("btnDeleteWalletStatic");
    if (btnDelete) {
        btnDelete.addEventListener("click", function () {
            if (walletDetailModal) walletDetailModal.hide();
            if (toastDeleted) toastDeleted.show();
        });
    }

    updateAddPreview();
    updateDetailPreview();
});