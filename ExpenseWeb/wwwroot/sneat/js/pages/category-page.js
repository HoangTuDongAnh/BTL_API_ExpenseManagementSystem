document.addEventListener("DOMContentLoaded", function () {
    const addModalEl = document.getElementById("addCategoryModal");
    const detailModalEl = document.getElementById("categoryDetailModal");

    const addModal = addModalEl ? new bootstrap.Modal(addModalEl) : null;
    const detailModal = detailModalEl ? new bootstrap.Modal(detailModalEl) : null;

    const toastSaved = document.getElementById("categorySavedToast") ? new bootstrap.Toast(document.getElementById("categorySavedToast")) : null;
    const toastUpdated = document.getElementById("categoryUpdatedToast") ? new bootstrap.Toast(document.getElementById("categoryUpdatedToast")) : null;
    const toastDeleted = document.getElementById("categoryDeletedToast") ? new bootstrap.Toast(document.getElementById("categoryDeletedToast")) : null;

    function hexToRgba(hex, alpha) {
        if (!hex || !hex.startsWith("#") || hex.length !== 7) {
            return "rgba(255,171,0,0.14)";
        }
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function setActiveColor(selector, color) {
        document.querySelectorAll(selector).forEach(function (btn) {
            btn.classList.toggle("active", (btn.dataset.color || "").toUpperCase() === color.toUpperCase());
        });
    }

    function updateAddPreview() {
        const name = document.getElementById("addCategoryName")?.value || "Danh mục";
        const color = document.getElementById("addCategoryColor")?.value || "#FFAB00";
        const icon = document.getElementById("addCategoryIcon")?.value || "";

        const previewName = document.getElementById("addPreviewName");
        const previewIcon = document.getElementById("addPreviewIcon");
        const previewWrap = document.getElementById("addPreviewIconWrap");
        const colorCode = document.getElementById("addCategoryColorCode");

        if (previewName) previewName.textContent = name;
        if (previewIcon && icon) {
            previewIcon.src = icon;
            previewIcon.classList.remove("d-none");
        }
        if (previewWrap) previewWrap.style.background = hexToRgba(color, 0.14);
        if (colorCode) colorCode.textContent = color.toUpperCase();

        setActiveColor(".category-color-preset", color);
    }

    function updateDetailPreview() {
        const name = document.getElementById("detailCategoryName")?.value || "Danh mục";
        const color = document.getElementById("detailCategoryColor")?.value || "#FFAB00";
        const icon = document.getElementById("detailCategoryIcon")?.value || "";

        const previewName = document.getElementById("detailPreviewName");
        const previewIcon = document.getElementById("detailPreviewIcon");
        const previewWrap = document.getElementById("detailPreviewIconWrap");
        const headIcon = document.getElementById("detailHeadIcon");
        const headWrap = document.getElementById("detailHeadIconWrap");
        const title = document.getElementById("detailCategoryTitle");
        const colorCode = document.getElementById("detailCategoryColorCode");

        if (previewName) previewName.textContent = name;
        if (title) title.textContent = name;

        if (previewIcon && icon) previewIcon.src = icon;
        if (headIcon && icon) headIcon.src = icon;

        if (previewWrap) previewWrap.style.background = hexToRgba(color, 0.14);
        if (headWrap) headWrap.style.background = hexToRgba(color, 0.14);
        if (colorCode) colorCode.textContent = color.toUpperCase();

        setActiveColor(".category-color-preset-detail", color);
    }

    ["addCategoryName", "addCategoryColor"].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", updateAddPreview);
    });

    ["detailCategoryName", "detailCategoryColor"].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", updateDetailPreview);
    });

    document.querySelectorAll(".category-color-preset").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const color = btn.dataset.color || "#FFAB00";
            const input = document.getElementById("addCategoryColor");
            if (input) input.value = color;
            updateAddPreview();
        });
    });

    document.querySelectorAll(".category-color-preset-detail").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const color = btn.dataset.color || "#FFAB00";
            const input = document.getElementById("detailCategoryColor");
            if (input) input.value = color;
            updateDetailPreview();
        });
    });

    document.querySelectorAll(".category-icon-option-add").forEach(function (btn) {
        btn.addEventListener("click", function () {
            document.querySelectorAll(".category-icon-option-add").forEach(function (item) {
                item.classList.remove("active");
            });
            btn.classList.add("active");

            const iconInput = document.getElementById("addCategoryIcon");
            if (iconInput) iconInput.value = btn.dataset.icon || "";
            updateAddPreview();
        });
    });

    document.querySelectorAll(".category-icon-option-detail").forEach(function (btn) {
        btn.addEventListener("click", function () {
            document.querySelectorAll(".category-icon-option-detail").forEach(function (item) {
                item.classList.remove("active");
            });
            btn.classList.add("active");

            const iconInput = document.getElementById("detailCategoryIcon");
            if (iconInput) iconInput.value = btn.dataset.icon || "";
            updateDetailPreview();
        });
    });

    if (detailModalEl) {
        detailModalEl.addEventListener("show.bs.modal", function (event) {
            const trigger = event.relatedTarget;
            if (!trigger) return;

            const categoryId = trigger.getAttribute("data-category-id") || "";
            const categoryName = trigger.getAttribute("data-category-name") || "Danh mục";
            const categoryColor = trigger.getAttribute("data-category-color") || "#FFAB00";
            const categoryIcon = trigger.getAttribute("data-category-icon") || "";

            const detailId = document.getElementById("detailCategoryId");
            const detailName = document.getElementById("detailCategoryName");
            const detailColor = document.getElementById("detailCategoryColor");
            const detailIconInput = document.getElementById("detailCategoryIcon");

            if (detailId) detailId.textContent = categoryId;
            if (detailName) detailName.value = categoryName;
            if (detailColor) detailColor.value = categoryColor;
            if (detailIconInput) detailIconInput.value = categoryIcon;

            document.querySelectorAll(".category-icon-option-detail").forEach(function (btn) {
                btn.classList.toggle("active", btn.dataset.icon === categoryIcon);
            });

            updateDetailPreview();
        });
    }

    const btnSave = document.getElementById("btnSaveCategoryStatic");
    if (btnSave) {
        btnSave.addEventListener("click", function () {
            if (addModal) addModal.hide();
            if (toastSaved) toastSaved.show();
        });
    }

    const btnUpdate = document.getElementById("btnUpdateCategoryStatic");
    if (btnUpdate) {
        btnUpdate.addEventListener("click", function () {
            if (toastUpdated) toastUpdated.show();
        });
    }

    const btnDelete = document.getElementById("btnDeleteCategoryStatic");
    if (btnDelete) {
        btnDelete.addEventListener("click", function () {
            if (detailModal) detailModal.hide();
            if (toastDeleted) toastDeleted.show();
        });
    }

    updateAddPreview();
    updateDetailPreview();
});