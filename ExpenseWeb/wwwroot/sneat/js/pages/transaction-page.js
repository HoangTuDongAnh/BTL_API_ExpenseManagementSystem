document.addEventListener("DOMContentLoaded", function () {
    const addModalEl = document.getElementById("addTransactionModal");
    const detailModalEl = document.getElementById("transactionDetailModal");

    const addModal = addModalEl ? new bootstrap.Modal(addModalEl) : null;
    const detailModal = detailModalEl ? new bootstrap.Modal(detailModalEl) : null;

    const toastSaved = document.getElementById("transactionSavedToast") ? new bootstrap.Toast(document.getElementById("transactionSavedToast")) : null;
    const toastUpdated = document.getElementById("transactionUpdatedToast") ? new bootstrap.Toast(document.getElementById("transactionUpdatedToast")) : null;
    const toastDeleted = document.getElementById("transactionDeletedToast") ? new bootstrap.Toast(document.getElementById("transactionDeletedToast")) : null;
    const toastDuplicated = document.getElementById("transactionDuplicatedToast") ? new bootstrap.Toast(document.getElementById("transactionDuplicatedToast")) : null;

    function formatNumber(value) {
        const number = Number(value || 0);
        return number.toLocaleString("vi-VN");
    }

    function hexToRgba(hex, alpha) {
        if (!hex || !hex.startsWith("#") || hex.length !== 7) {
            return `rgba(105,108,255,${alpha})`;
        }
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function currentTypeLabel(type) {
        return type === "income" ? "Thu nhập" : "Chi tiêu";
    }

    function currentTypeAmount(amount, type) {
        const prefix = type === "income" ? "+" : "-";
        return `${prefix}${formatNumber(amount)} VND`;
    }

    function setSwitchState(rootId, type) {
        const root = document.getElementById(rootId);
        if (!root) return;

        root.querySelectorAll("button").forEach(function (btn) {
            btn.classList.toggle("active", btn.dataset.type === type);
        });
    }

    function bindTypeSwitch(rootId, selectId, onChange) {
        const root = document.getElementById(rootId);
        const select = document.getElementById(selectId);
        if (!root || !select) return;

        root.querySelectorAll("button").forEach(function (btn) {
            btn.addEventListener("click", function () {
                const type = btn.dataset.type || "expense";
                select.value = type;
                setSwitchState(rootId, type);
                if (typeof onChange === "function") onChange(type);
            });
        });

        select.addEventListener("change", function () {
            setSwitchState(rootId, select.value);
            if (typeof onChange === "function") onChange(select.value);
        });

        setSwitchState(rootId, select.value);
    }

    function updateAddPreview() {
        const title = document.getElementById("addTransactionTitle")?.value || "Giao dịch mới";
        const wallet = document.getElementById("addTransactionWallet")?.value || "Ví tiền mặt";
        const type = document.getElementById("addTransactionType")?.value || "expense";
        const date = document.getElementById("addTransactionDate")?.value || "2026-04-04";
        const amount = document.getElementById("addTransactionAmount")?.value || 0;
        const recurrence = document.getElementById("addTransactionRecurrence")?.value || "Không";
        const note = document.getElementById("addTransactionNote")?.value || "Không có ghi chú";
        const category = document.getElementById("addTransactionCategory")?.value || "Ăn uống";

        const previewTitle = document.getElementById("addPreviewTitle");
        const previewWallet = document.getElementById("addPreviewWallet");
        const previewDate = document.getElementById("addPreviewDate");
        const previewAmount = document.getElementById("addPreviewAmount");
        const previewRecurrence = document.getElementById("addPreviewRecurrence");
        const previewNote = document.getElementById("addPreviewNote");
        const previewCategoryText = document.getElementById("addPreviewCategoryText");
        const previewTypeBadge = document.getElementById("addPreviewTypeBadge");

        if (previewTitle) previewTitle.textContent = title;
        if (previewWallet) previewWallet.textContent = wallet;
        if (previewDate) previewDate.textContent = date;
        if (previewAmount) {
            previewAmount.textContent = currentTypeAmount(amount, type);
            previewAmount.classList.toggle("text-success", type === "income");
            previewAmount.classList.toggle("text-danger", type === "expense");
        }
        if (previewRecurrence) previewRecurrence.textContent = recurrence;
        if (previewNote) previewNote.textContent = note;
        if (previewCategoryText) previewCategoryText.textContent = category;
        if (previewTypeBadge) {
            previewTypeBadge.textContent = currentTypeLabel(type);
            previewTypeBadge.className = "badge " + (type === "income" ? "bg-label-success" : "bg-label-danger");
        }
    }

    function setupCategorySelect(config) {
        const root = document.getElementById(config.rootId);
        if (!root) return;

        const toggle = root.querySelector(".transaction-category-select-toggle");
        const hiddenInput = document.getElementById(config.hiddenInputId);
        const previewText = document.getElementById(config.previewTextId);
        const previewIconWrap = document.getElementById(config.previewIconWrapId);
        const extraIcon = config.extraIconId ? document.getElementById(config.extraIconId) : null;
        const extraWrap = config.extraWrapId ? document.getElementById(config.extraWrapId) : null;
        const options = root.querySelectorAll(".transaction-category-option");

        if (toggle) {
            toggle.addEventListener("click", function (e) {
                e.stopPropagation();
                document.querySelectorAll(".transaction-category-select.open").forEach(function (item) {
                    if (item !== root) item.classList.remove("open");
                });
                root.classList.toggle("open");
            });
        }

        options.forEach(function (option) {
            option.addEventListener("click", function () {
                const name = option.dataset.name || "Ăn uống";
                const icon = option.dataset.icon || "bx bx-restaurant";
                const color = option.dataset.color || "#696cff";

                if (hiddenInput) hiddenInput.value = name;
                if (previewText) previewText.textContent = name;
                if (previewIconWrap) previewIconWrap.innerHTML = `<i class="${icon}"></i>`;

                if (extraIcon) extraIcon.className = icon;
                if (extraWrap) {
                    extraWrap.style.color = color;
                    extraWrap.style.background = hexToRgba(color, 0.14);
                }

                root.classList.remove("open");

                if (typeof config.onSelect === "function") {
                    config.onSelect({ name, icon, color });
                }
            });
        });
    }

    document.addEventListener("click", function (e) {
        document.querySelectorAll(".transaction-category-select.open").forEach(function (selectEl) {
            if (!selectEl.contains(e.target)) {
                selectEl.classList.remove("open");
            }
        });
    });

    bindTypeSwitch("addTransactionTypeSwitch", "addTransactionType", updateAddPreview);
    bindTypeSwitch("detailTransactionTypeSwitch", "detailEditType");

    ["addTransactionTitle", "addTransactionAmount", "addTransactionDate", "addTransactionNote"].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", updateAddPreview);
    });

    ["addTransactionWallet", "addTransactionType", "addTransactionRecurrence"].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener("change", updateAddPreview);
    });

    setupCategorySelect({
        rootId: "addCategorySelect",
        hiddenInputId: "addTransactionCategory",
        previewTextId: "addCategoryPreviewText",
        previewIconWrapId: "addCategoryPreviewIcon",
        extraIconId: "addPreviewCategoryIcon",
        extraWrapId: "addPreviewCategoryIconWrap",
        onSelect: updateAddPreview
    });

    setupCategorySelect({
        rootId: "detailCategorySelect",
        hiddenInputId: "detailEditCategory",
        previewTextId: "detailCategoryPreviewText",
        previewIconWrapId: "detailCategoryPreviewIcon",
        extraIconId: "detailCategoryIcon",
        extraWrapId: "detailCategoryIconWrap",
        onSelect: function (category) {
            const title = document.getElementById("detailCategoryTitle");
            if (title) title.textContent = category.name;
        }
    });

    const detailFieldsMap = {
        id: document.getElementById("detailId"),
        badge: document.getElementById("detailBadge"),
        categoryTitle: document.getElementById("detailCategoryTitle"),
        wallet: document.getElementById("detailWallet"),
        amount: document.getElementById("detailAmount"),
        dateTime: document.getElementById("detailDateTime"),
        currency: document.getElementById("detailCurrency"),
        editTitle: document.getElementById("detailEditTitle"),
        editWallet: document.getElementById("detailEditWallet"),
        editType: document.getElementById("detailEditType"),
        editCategory: document.getElementById("detailEditCategory"),
        editDate: document.getElementById("detailEditDate"),
        editTime: document.getElementById("detailEditTime"),
        editNote: document.getElementById("detailEditNote"),
        iconWrap: document.getElementById("detailCategoryIconWrap"),
        icon: document.getElementById("detailCategoryIcon"),
        categoryPreviewText: document.getElementById("detailCategoryPreviewText"),
        categoryPreviewIcon: document.getElementById("detailCategoryPreviewIcon")
    };

    if (detailModalEl) {
        detailModalEl.addEventListener("show.bs.modal", function (event) {
            const trigger = event.relatedTarget;
            if (!trigger) return;

            const data = trigger.dataset;
            const type = data.type || "expense";
            const color = data.categoryColor || "#696cff";
            const icon = data.categoryIcon || "bx bx-receipt";

            if (detailFieldsMap.id) detailFieldsMap.id.textContent = data.id || "TXN0000000000";
            if (detailFieldsMap.badge) {
                detailFieldsMap.badge.textContent = data.badge || "Một lần";
                detailFieldsMap.badge.className = "badge " + (type === "income" ? "bg-label-success" : "bg-label-danger");
            }
            if (detailFieldsMap.categoryTitle) detailFieldsMap.categoryTitle.textContent = data.category || "Danh mục";
            if (detailFieldsMap.wallet) detailFieldsMap.wallet.textContent = data.wallet || "Ví";
            if (detailFieldsMap.amount) {
                detailFieldsMap.amount.textContent = `${data.amount || "0"} ${data.currency || "VND"}`;
                detailFieldsMap.amount.classList.toggle("text-success", type === "income");
                detailFieldsMap.amount.classList.toggle("text-danger", type === "expense");
            }
            if (detailFieldsMap.dateTime) detailFieldsMap.dateTime.textContent = `${data.date || ""} • ${data.time || ""}`;
            if (detailFieldsMap.currency) detailFieldsMap.currency.textContent = data.currency || "VND";
            if (detailFieldsMap.editTitle) detailFieldsMap.editTitle.value = data.title || "";
            if (detailFieldsMap.editWallet) detailFieldsMap.editWallet.value = data.wallet || "Ví tiền mặt";
            if (detailFieldsMap.editType) detailFieldsMap.editType.value = type;
            if (detailFieldsMap.editCategory) detailFieldsMap.editCategory.value = data.category || "";
            if (detailFieldsMap.editDate) detailFieldsMap.editDate.value = data.date || "";
            if (detailFieldsMap.editTime) detailFieldsMap.editTime.value = data.time || "";
            if (detailFieldsMap.editNote) detailFieldsMap.editNote.value = data.note || "";
            if (detailFieldsMap.icon) detailFieldsMap.icon.className = icon;
            if (detailFieldsMap.iconWrap) {
                detailFieldsMap.iconWrap.style.color = color;
                detailFieldsMap.iconWrap.style.background = hexToRgba(color, 0.14);
            }
            if (detailFieldsMap.categoryPreviewText) detailFieldsMap.categoryPreviewText.textContent = data.category || "Danh mục";
            if (detailFieldsMap.categoryPreviewIcon) detailFieldsMap.categoryPreviewIcon.innerHTML = `<i class="${icon}"></i>`;

            setSwitchState("detailTransactionTypeSwitch", type);
        });
    }

    function applyTableFilter() {
        const keyword = (document.getElementById("transactionSearchInput")?.value || "").trim().toLowerCase();
        const wallet = document.getElementById("walletFilter")?.value || "all";
        const activeTypeBtn = document.querySelector("#transactionTypeTabs button.active");
        const activeType = activeTypeBtn ? activeTypeBtn.dataset.type || "all" : "all";

        let visibleCount = 0;

        document.querySelectorAll(".transaction-row").forEach(function (row) {
            const rowType = row.dataset.type || "expense";
            const rowWallet = row.dataset.wallet || "";
            const rowSearch = row.dataset.search || "";

            const matchKeyword = !keyword || rowSearch.includes(keyword);
            const matchWallet = wallet === "all" || rowWallet === wallet;
            const matchType = activeType === "all" || rowType === activeType;
            const show = matchKeyword && matchWallet && matchType;

            row.style.display = show ? "" : "none";
            if (show) visibleCount += 1;
        });

        const summary = document.getElementById("transactionTableSummary");
        if (summary) {
            summary.textContent = `Hiển thị ${visibleCount} giao dịch tĩnh`;
        }

        const tableWrapper = document.getElementById("transactionTableWrapper");
        const emptyState = document.getElementById("transactionEmptyState");

        if (tableWrapper && emptyState) {
            if (visibleCount === 0) {
                tableWrapper.style.display = "none";
                emptyState.classList.add("show");
            } else {
                tableWrapper.style.display = "";
                emptyState.classList.remove("show");
            }
        }
    }

    document.querySelectorAll("#transactionTypeTabs button").forEach(function (btn) {
        btn.addEventListener("click", function () {
            document.querySelectorAll("#transactionTypeTabs button").forEach(function (item) {
                item.classList.remove("active");
            });
            btn.classList.add("active");
            applyTableFilter();
        });
    });

    ["transactionSearchInput", "walletFilter"].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener(id === "transactionSearchInput" ? "input" : "change", applyTableFilter);
    });

    const periodFilter = document.getElementById("periodFilter");
    const fromDateWrap = document.getElementById("fromDateWrap");
    const toDateWrap = document.getElementById("toDateWrap");

    if (periodFilter) {
        periodFilter.addEventListener("change", function () {
            const isCustom = periodFilter.value === "custom";

            if (fromDateWrap) fromDateWrap.classList.toggle("d-none", !isCustom);
            if (toDateWrap) toDateWrap.classList.toggle("d-none", !isCustom);
        });
    }

    document.querySelectorAll(".transaction-delete-trigger").forEach(function (btn) {
        btn.addEventListener("click", function () {
            if (toastDeleted) toastDeleted.show();
        });
    });

    document.querySelectorAll(".transaction-duplicate-trigger").forEach(function (btn) {
        btn.addEventListener("click", function () {
            if (toastDuplicated) toastDuplicated.show();
        });
    });

    const btnSave = document.getElementById("btnSaveTransactionStatic");
    if (btnSave) {
        btnSave.addEventListener("click", function () {
            if (addModal) addModal.hide();
            if (toastSaved) toastSaved.show();
        });
    }

    const btnUpdate = document.getElementById("btnUpdateTransactionStatic");
    if (btnUpdate) {
        btnUpdate.addEventListener("click", function () {
            if (toastUpdated) toastUpdated.show();
        });
    }

    const btnDelete = document.getElementById("btnDeleteTransactionStatic");
    if (btnDelete) {
        btnDelete.addEventListener("click", function () {
            if (detailModal) detailModal.hide();
            if (toastDeleted) toastDeleted.show();
        });
    }

    updateAddPreview();
    applyTableFilter();
});