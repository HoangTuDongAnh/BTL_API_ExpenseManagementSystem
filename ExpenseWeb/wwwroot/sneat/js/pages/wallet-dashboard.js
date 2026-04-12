document.addEventListener("DOMContentLoaded", function () {
    const addWalletModalEl = document.getElementById("addWalletModal");
    const walletDetailModalEl = document.getElementById("walletDetailModal");
    const addWalletModal = addWalletModalEl ? new bootstrap.Modal(addWalletModalEl) : null;
    const walletDetailModal = walletDetailModalEl ? new bootstrap.Modal(walletDetailModalEl) : null;

    const toastSaved = document.getElementById("walletSavedToast") ? new bootstrap.Toast(document.getElementById("walletSavedToast")) : null;
    const toastUpdated = document.getElementById("walletUpdatedToast") ? new bootstrap.Toast(document.getElementById("walletUpdatedToast")) : null;
    const toastDeleted = document.getElementById("walletDeletedToast") ? new bootstrap.Toast(document.getElementById("walletDeletedToast")) : null;

    const walletActionAlert = document.getElementById("walletActionAlert");
    const detailWalletActionAlert = document.getElementById("detailWalletActionAlert");
    const replacementWalletGroup = document.getElementById("replacementWalletGroup");
    const replacementWalletId = document.getElementById("replacementWalletId");

    function formatCurrency(value, currencyCode) {
        return `${Number(value || 0).toLocaleString("vi-VN")} ${currencyCode || "VND"}`;
    }

    function showAlert(el, message) {
        if (!el) return;
        el.textContent = message || "Có lỗi xảy ra.";
        el.classList.remove("d-none");
    }

    function hideAlert(el) {
        if (!el) return;
        el.textContent = "";
        el.classList.add("d-none");
    }

    function getDeleteMode() {
        const checked = document.querySelector('input[name="deleteWalletMode"]:checked');
        return checked ? checked.value : "delete_all";
    }

    function toggleReplacementWallet() {
        const mode = getDeleteMode();
        replacementWalletGroup?.classList.toggle("d-none", mode !== "move_transactions");
    }

    function fillReplacementWalletOptions(currentWalletId) {
        if (!replacementWalletId) return;
        const options = Array.from(replacementWalletId.querySelectorAll("option"));
        options.forEach(opt => {
            if (!opt.value) return;
            opt.hidden = opt.value === currentWalletId;
        });
        replacementWalletId.value = "";
    }

    function setDetailWalletData(trigger) {
        if (!trigger) return;
        const walletId = trigger.getAttribute("data-wallet-id") || "";
        const walletName = trigger.getAttribute("data-wallet-name") || "";
        const walletBalance = trigger.getAttribute("data-wallet-balance") || "0";
        const walletInitial = trigger.getAttribute("data-wallet-initial") || "0";
        const walletCurrency = trigger.getAttribute("data-wallet-currency") || "VND";
        const walletIsDefault = (trigger.getAttribute("data-wallet-is-default") || "false") === "true";

        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        };
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        };

        setValue("detailWalletIdValue", walletId);
        setText("detailWalletId", walletId || "-");
        setText("detailWalletTitle", walletName || "Ví");
        setValue("detailWalletName", walletName);
        setValue("detailWalletCurrencySelect", walletCurrency);
        setValue("detailCurrentBalanceInput", formatCurrency(walletBalance, walletCurrency));
        setValue("detailInitialBalance", formatCurrency(walletInitial, walletCurrency));

        const defaultCheckbox = document.getElementById("detailWalletDefault");
        if (defaultCheckbox) defaultCheckbox.checked = walletIsDefault;

        fillReplacementWalletOptions(walletId);
        hideAlert(detailWalletActionAlert);
        document.getElementById("deleteWalletModeDeleteAll")?.click();
        toggleReplacementWallet();
    }

    walletDetailModalEl?.addEventListener("show.bs.modal", function (event) {
        setDetailWalletData(event.relatedTarget);
    });

    document.querySelectorAll('input[name="deleteWalletMode"]').forEach(r => r.addEventListener("change", toggleReplacementWallet));

    async function sendJson(url, method, payload) {
        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            },
            body: payload ? JSON.stringify(payload) : null
        });

        let data = null;
        try { data = await response.json(); } catch {}
        if (!response.ok || !data?.success) {
            throw new Error(data?.message || "Yêu cầu không thành công.");
        }
        return data;
    }

    document.getElementById("btnSaveWalletApi")?.addEventListener("click", async function () {
        hideAlert(walletActionAlert);
        const wallet_name = (document.getElementById("addWalletName")?.value || "").trim();
        const initial_balance = Number(document.getElementById("addInitialBalance")?.value || 0);
        const currency = document.getElementById("addWalletCurrencyCode")?.value || "VND";
        const is_default = !!document.getElementById("addWalletDefault")?.checked;

        if (!wallet_name) return showAlert(walletActionAlert, "Tên ví không được để trống.");
        if (initial_balance < 0) return showAlert(walletActionAlert, "Số dư ban đầu không được âm.");

        try {
            await sendJson("/Dashboard/CreateWalletAjax", "POST", { wallet_name, initial_balance, currency, is_default });
            addWalletModal?.hide();
            toastSaved?.show();
            window.location.reload();
        } catch (error) {
            showAlert(walletActionAlert, error.message);
        }
    });

    document.getElementById("btnUpdateWalletApi")?.addEventListener("click", async function () {
        hideAlert(detailWalletActionAlert);
        const walletId = document.getElementById("detailWalletIdValue")?.value || "";
        const wallet_name = (document.getElementById("detailWalletName")?.value || "").trim();
        const currency = document.getElementById("detailWalletCurrencySelect")?.value || "VND";
        const is_default = !!document.getElementById("detailWalletDefault")?.checked;

        if (!walletId) return showAlert(detailWalletActionAlert, "Không xác định được ví cần cập nhật.");
        if (!wallet_name) return showAlert(detailWalletActionAlert, "Tên ví không được để trống.");

        try {
            await sendJson(`/Dashboard/UpdateWalletAjax/${encodeURIComponent(walletId)}`, "PUT", { wallet_name, currency, is_default });
            toastUpdated?.show();
            window.location.reload();
        } catch (error) {
            showAlert(detailWalletActionAlert, error.message);
        }
    });

    document.getElementById("btnDeleteWalletApi")?.addEventListener("click", async function () {
        hideAlert(detailWalletActionAlert);
        const walletId = document.getElementById("detailWalletIdValue")?.value || "";
        const mode = getDeleteMode();
        const replacement_wallet_id = replacementWalletId?.value || null;

        if (!walletId) return showAlert(detailWalletActionAlert, "Không xác định được ví cần xóa.");
        if (mode === "move_transactions" && !replacement_wallet_id) return showAlert(detailWalletActionAlert, "Hãy chọn ví nhận giao dịch.");
        if (!window.confirm("Bạn có chắc muốn xóa ví này không?")) return;

        try {
            await sendJson(`/Dashboard/DeleteWalletAjax/${encodeURIComponent(walletId)}`, "DELETE", { mode, replacement_wallet_id });
            walletDetailModal?.hide();
            toastDeleted?.show();
            window.location.reload();
        } catch (error) {
            showAlert(detailWalletActionAlert, error.message);
        }
    });


    function formatDateInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function syncBudgetPeriodFromEndDate() {
        const endDateInput = document.getElementById("filterEndDate");
        const monthSelect = document.getElementById("filterMonth");
        const yearSelect = document.getElementById("filterYear");
        if (!endDateInput || !monthSelect || !yearSelect || !endDateInput.value) return;
        const endDate = new Date(endDateInput.value);
        if (Number.isNaN(endDate.getTime())) return;
        monthSelect.value = String(endDate.getMonth() + 1);
        yearSelect.value = String(endDate.getFullYear());
    }

    function applyQuickRange(range) {
        const startDateInput = document.getElementById("filterStartDate");
        const endDateInput = document.getElementById("filterEndDate");
        if (!startDateInput || !endDateInput) return;

        const today = new Date();
        let start = new Date(today);
        let end = new Date(today);

        if (range === "7d") {
            start.setDate(today.getDate() - 6);
        } else if (range === "30d") {
            start.setDate(today.getDate() - 29);
        } else if (range === "thisMonth") {
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        } else if (range === "thisYear") {
            start = new Date(today.getFullYear(), 0, 1);
            end = new Date(today.getFullYear(), 11, 31);
        }

        startDateInput.value = formatDateInput(start);
        endDateInput.value = formatDateInput(end);
        syncBudgetPeriodFromEndDate();
    }

    function createLineChart() {
        const cashflowEl = document.getElementById("dashboardCashflowChart");
        if (!cashflowEl || typeof ApexCharts === "undefined") return;

        const labels = JSON.parse(cashflowEl.dataset.labels || "[]");
        const income = JSON.parse(cashflowEl.dataset.income || "[]");
        const expense = JSON.parse(cashflowEl.dataset.expense || "[]");
        if (!labels.length) return;

        new ApexCharts(cashflowEl, {
            series: [
                { name: "Thu", data: income },
                { name: "Chi", data: expense }
            ],
            chart: { type: "line", height: 340, toolbar: { show: false }, zoom: { enabled: false } },
            stroke: { curve: "smooth", width: [3, 3] },
            colors: ["#48a111", "#ff7a59"],
            dataLabels: { enabled: false },
            markers: { size: 5, hover: { size: 7 } },
            grid: { borderColor: "rgba(72,161,17,0.08)", strokeDashArray: 6 },
            legend: { position: "bottom", horizontalAlign: "center" },
            xaxis: { categories: labels, axisBorder: { show: false }, axisTicks: { show: false } },
            yaxis: { labels: { formatter: val => Number(val).toLocaleString("vi-VN") } },
            tooltip: { y: { formatter: val => `${Number(val).toLocaleString("vi-VN")} VND` } }
        }).render();
    }

    function createDonutChart() {
        const donutEl = document.getElementById("dashboardExpenseDonutChart");
        if (!donutEl || typeof ApexCharts === "undefined") return;

        const labels = JSON.parse(donutEl.dataset.labels || "[]");
        const series = JSON.parse(donutEl.dataset.series || "[]");
        const colors = JSON.parse(donutEl.dataset.colors || "[]");
        if (!labels.length) return;

        new ApexCharts(donutEl, {
            series,
            labels,
            colors,
            chart: { type: "donut", height: 330 },
            legend: { show: false },
            dataLabels: { enabled: false },
            stroke: { width: 0 },
            plotOptions: {
                pie: {
                    donut: {
                        size: "68%",
                        labels: {
                            show: true,
                            name: { show: true, offsetY: 18 },
                            value: {
                                show: true,
                                offsetY: -14,
                                formatter: function (val) {
                                    return `${Number(val).toLocaleString("vi-VN")}`;
                                }
                            },
                            total: {
                                show: true,
                                label: "Chi tiêu",
                                formatter: function (w) {
                                    const total = w.globals.seriesTotals.reduce((sum, n) => sum + n, 0);
                                    return Number(total).toLocaleString("vi-VN");
                                }
                            }
                        }
                    }
                }
            },
            tooltip: { y: { formatter: val => `${Number(val).toLocaleString("vi-VN")} VND` } }
        }).render();
    }

    document.getElementById("filterEndDate")?.addEventListener("change", syncBudgetPeriodFromEndDate);
    document.querySelectorAll(".quick-range-btn").forEach(btn => {
        btn.addEventListener("click", function () {
            applyQuickRange(btn.dataset.range || "");
        });
    });

    createLineChart();
    createDonutChart();
});
