document.addEventListener("DOMContentLoaded", function () {
    const bootstrapModal = bootstrap.Modal;
    const bootstrapOffcanvas = bootstrap.Offcanvas;
    const bootstrapToast = bootstrap.Toast;

    const addModalEl = document.getElementById("addTransactionModal");
    const detailModalEl = document.getElementById("transactionDetailModal");
    const dayOffcanvasEl = document.getElementById("transactionDayOffcanvas");

    const addModal = addModalEl ? bootstrapModal.getOrCreateInstance(addModalEl) : null;
    const detailModal = detailModalEl ? bootstrapModal.getOrCreateInstance(detailModalEl) : null;
    const dayOffcanvas = dayOffcanvasEl ? bootstrapOffcanvas.getOrCreateInstance(dayOffcanvasEl) : null;

    const toastSaved = document.getElementById("transactionToastSaved") ? bootstrapToast.getOrCreateInstance(document.getElementById("transactionToastSaved")) : null;
    const toastUpdated = document.getElementById("transactionToastUpdated") ? bootstrapToast.getOrCreateInstance(document.getElementById("transactionToastUpdated")) : null;
    const toastDeleted = document.getElementById("transactionToastDeleted") ? bootstrapToast.getOrCreateInstance(document.getElementById("transactionToastDeleted")) : null;

    const tableBody = document.getElementById("transactionTableBody");
    const searchInput = document.getElementById("transactionSearchInput");
    const walletFilter = document.getElementById("walletFilter");
    const periodFilter = document.getElementById("periodFilter");
    const fromDateFilter = document.getElementById("fromDateFilter");
    const toDateFilter = document.getElementById("toDateFilter");
    const fromDateWrap = document.getElementById("fromDateWrap");
    const toDateWrap = document.getElementById("toDateWrap");
    const incomeDonut = document.getElementById("incomeDonut");
    const expenseDonut = document.getElementById("expenseDonut");
    const incomeLegend = document.getElementById("incomeLegend");
    const expenseLegend = document.getElementById("expenseLegend");
    const incomeDonutTotal = document.getElementById("incomeDonutTotal");
    const expenseDonutTotal = document.getElementById("expenseDonutTotal");
    const transactionCountBadge = document.getElementById("transactionCountBadge");
    const transactionEmptyState = document.getElementById("transactionEmptyState");
    const transactionPagination = document.getElementById("transactionPagination");
    const calendarGrid = document.getElementById("transactionMiniCalendarGrid");
    const calendarTitle = document.getElementById("calendarTitle");
    const calendarPrevBtn = document.getElementById("calendarPrevBtn");
    const calendarNextBtn = document.getElementById("calendarNextBtn");
    const dayStatCount = document.getElementById("dayStatCount");
    const dayStatIncome = document.getElementById("dayStatIncome");
    const dayStatExpense = document.getElementById("dayStatExpense");
    const transactionDayList = document.getElementById("transactionDayList");
    const transactionDayTitle = document.getElementById("transactionDayTitle");
    const transactionDaySubTitle = document.getElementById("transactionDaySubTitle");

    const state = {
        activeType: "all",
        filteredTransactions: [],
        currentPage: 1,
        pageSize: 5,
        currentMonth: new Date(),
        isSubmitting: false
    };

    const transactions = Array.from(document.querySelectorAll(".transaction-row")).map(mapRowToTransaction);
    const maxDateInData = getMaxDateInData();
    state.currentMonth = new Date(maxDateInData.getFullYear(), maxDateInData.getMonth(), 1);

    function mapRowToTransaction(row) {
        const isoDate = row.dataset.isoDate || toISODate(row.dataset.date || "");
        return {
            id: row.dataset.id || "",
            note: row.dataset.note || "Không có ghi chú",
            category: row.dataset.category || "Khác",
            categoryId: row.dataset.categoryId || "",
            categoryIcon: row.dataset.categoryIcon || "bx bx-category",
            categoryColor: row.dataset.categoryColor || "#8592A3",
            wallet: row.dataset.wallet || "",
            walletId: row.dataset.walletId || "",
            type: row.dataset.type || "expense",
            amountText: row.dataset.amount || "0 VND",
            amountValue: Number(row.dataset.amountValue || 0),
            date: row.dataset.date || "",
            isoDate: isoDate,
            noteLabel: row.dataset.note || "Không có ghi chú",
            badge: row.dataset.badge || "Một lần",
            currency: row.dataset.currency || "VND",
            dateObj: isoDate ? new Date(isoDate + "T00:00:00") : null
        };
    }

    function toISODate(vnDate) {
        const parts = (vnDate || "").split("/");
        if (parts.length !== 3) return "";
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }

    function fromISOToVNDate(isoDate) {
        const parts = (isoDate || "").split("-");
        if (parts.length !== 3) return "";
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    function formatCurrency(num) {
        return `${Number(num || 0).toLocaleString("vi-VN")} VND`;
    }

    function formatDateLabel(dateObj) {
        return dateObj.toLocaleDateString("vi-VN", {
            weekday: "long",
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    }

    function getMaxDateInData() {
        const values = transactions.filter(x => x.dateObj).map(x => x.dateObj.getTime());
        return values.length ? new Date(Math.max(...values)) : new Date();
    }

    function matchesPeriod(tx) {
        if (!tx.dateObj) return true;
        const selected = periodFilter ? periodFilter.value : "month";
        if (selected === "month") {
            return tx.dateObj.getMonth() === maxDateInData.getMonth() && tx.dateObj.getFullYear() === maxDateInData.getFullYear();
        }
        if (selected === "today") {
            return tx.isoDate === formatISO(maxDateInData);
        }
        if (selected === "week") {
            const start = new Date(maxDateInData);
            start.setDate(maxDateInData.getDate() - 6);
            start.setHours(0, 0, 0, 0);
            const end = new Date(maxDateInData);
            end.setHours(23, 59, 59, 999);
            return tx.dateObj >= start && tx.dateObj <= end;
        }
        if (selected === "custom") {
            const fromVal = fromDateFilter && fromDateFilter.value ? new Date(fromDateFilter.value + "T00:00:00") : null;
            const toVal = toDateFilter && toDateFilter.value ? new Date(toDateFilter.value + "T23:59:59") : null;
            if (fromVal && tx.dateObj < fromVal) return false;
            if (toVal && tx.dateObj > toVal) return false;
        }
        return true;
    }

    function getFilteredTransactions() {
        const keyword = (searchInput?.value || "").trim().toLowerCase();
        const wallet = walletFilter?.value || "all";
        return transactions.filter(tx => {
            const matchKeyword = !keyword || `${tx.note} ${tx.category} ${tx.wallet} ${tx.id}`.toLowerCase().includes(keyword);
            const matchWallet = wallet === "all" || tx.wallet === wallet;
            const matchType = state.activeType === "all" || tx.type === state.activeType;
            return matchKeyword && matchWallet && matchType && matchesPeriod(tx);
        });
    }

    function renderLegend(container, list, total) {
        if (!container) return;
        if (!list.length || total <= 0) {
            container.innerHTML = '<div class="transaction-summary-empty">Chưa có dữ liệu phù hợp.</div>';
            return;
        }
        container.innerHTML = list.map(item => {
            const percent = ((item.value / total) * 100).toFixed(1);
            return `<div class="transaction-summary-item"><div class="transaction-summary-item-left"><span class="transaction-summary-dot" style="background:${item.color}"></span><span class="transaction-summary-item-name">${item.name}</span></div><div class="transaction-summary-item-right"><strong>${formatCurrency(item.value)}</strong><span>${percent}%</span></div></div>`;
        }).join("");
    }

    function buildDonutGradient(list, total) {
        if (!list.length || total <= 0) return "conic-gradient(#edf1f7 0 360deg)";
        let currentDeg = 0;
        const segments = list.map(item => {
            const deg = (item.value / total) * 360;
            const start = currentDeg;
            const end = currentDeg + deg;
            currentDeg = end;
            return `${item.color} ${start}deg ${end}deg`;
        });
        return `conic-gradient(${segments.join(", ")})`;
    }

    function renderSummary() {
        const incomeMap = {};
        const expenseMap = {};
        state.filteredTransactions.forEach(tx => {
            const target = tx.type === "income" ? incomeMap : expenseMap;
            if (!target[tx.category]) target[tx.category] = { name: tx.category, color: tx.categoryColor, value: 0 };
            target[tx.category].value += tx.amountValue;
        });
        const incomeList = Object.values(incomeMap).sort((a, b) => b.value - a.value);
        const expenseList = Object.values(expenseMap).sort((a, b) => b.value - a.value);
        const totalIncome = incomeList.reduce((s, x) => s + x.value, 0);
        const totalExpense = expenseList.reduce((s, x) => s + x.value, 0);
        if (incomeDonut) incomeDonut.style.background = buildDonutGradient(incomeList, totalIncome);
        if (expenseDonut) expenseDonut.style.background = buildDonutGradient(expenseList, totalExpense);
        if (incomeDonutTotal) incomeDonutTotal.textContent = formatCurrency(totalIncome);
        if (expenseDonutTotal) expenseDonutTotal.textContent = formatCurrency(totalExpense);
        renderLegend(incomeLegend, incomeList, totalIncome);
        renderLegend(expenseLegend, expenseList, totalExpense);
    }

    function hexToRgba(hex, alpha) {
        const sanitized = (hex || "").replace("#", "");
        if (sanitized.length !== 6) return `rgba(133,146,163,${alpha})`;
        const r = parseInt(sanitized.substring(0, 2), 16);
        const g = parseInt(sanitized.substring(2, 4), 16);
        const b = parseInt(sanitized.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function buildTableRow(tx) {
        const amountClass = tx.type === "income" ? "text-success" : "text-danger";
        return `<tr class="transaction-row"><td><div class="transaction-main-info"><div class="transaction-icon-box" style="background:${hexToRgba(tx.categoryColor, 0.14)}; color:${tx.categoryColor};"><i class="${tx.categoryIcon}"></i></div><div class="transaction-main-text"><h6 class="mb-0">${escapeHtml(tx.noteLabel)}</h6><small class="text-body-secondary">Mã: ${escapeHtml(tx.id)}</small></div></div></td><td><span class="transaction-category-pill" style="background:${hexToRgba(tx.categoryColor, 0.12)}; color:${tx.categoryColor};"><i class="${tx.categoryIcon}"></i>${escapeHtml(tx.category)}</span></td><td>${escapeHtml(tx.wallet)}</td><td><div class="transaction-date-cell"><span>${escapeHtml(tx.date)}</span><small class="text-body-secondary">${escapeHtml(tx.badge)}</small></div></td><td class="${amountClass} fw-semibold">${escapeHtml(tx.amountText)}</td><td class="text-end"><button type="button" class="btn btn-sm btn-icon btn-outline-primary transaction-detail-trigger" data-id="${escapeAttr(tx.id)}"><i class="bx bx-show"></i></button></td></tr>`;
    }

    function renderPagination(totalItems) {
        if (!transactionPagination) return;
        const totalPages = Math.ceil(totalItems / state.pageSize);
        if (totalPages <= 1) {
            transactionPagination.innerHTML = "";
            return;
        }
        let html = `<button type="button" class="transaction-page-btn" data-page="${Math.max(1, state.currentPage - 1)}"><i class="bx bx-chevron-left"></i></button>`;
        for (let i = 1; i <= totalPages; i++) {
            html += `<button type="button" class="transaction-page-btn ${i === state.currentPage ? "active" : ""}" data-page="${i}">${i}</button>`;
        }
        html += `<button type="button" class="transaction-page-btn" data-page="${Math.min(totalPages, state.currentPage + 1)}"><i class="bx bx-chevron-right"></i></button>`;
        transactionPagination.innerHTML = html;
        transactionPagination.querySelectorAll("[data-page]").forEach(btn => btn.addEventListener("click", function () {
            state.currentPage = Number(this.dataset.page || 1);
            renderTable();
        }));
    }

    function renderTable() {
        if (!tableBody) return;
        const totalItems = state.filteredTransactions.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / state.pageSize));
        if (state.currentPage > totalPages) state.currentPage = 1;
        const start = (state.currentPage - 1) * state.pageSize;
        const pageItems = state.filteredTransactions.slice(start, start + state.pageSize);
        tableBody.innerHTML = pageItems.map(buildTableRow).join("");
        if (transactionCountBadge) transactionCountBadge.textContent = `${totalItems} giao dịch`;
        if (transactionEmptyState) transactionEmptyState.classList.toggle("show", totalItems === 0);
        renderPagination(totalItems);
        bindDetailButtons();
    }

    function getTransactionsByISODate(isoDate) {
        return state.filteredTransactions.filter(tx => tx.isoDate === isoDate);
    }

    function getCellState(dayTransactions) {
        const hasIncome = dayTransactions.some(tx => tx.type === "income");
        const hasExpense = dayTransactions.some(tx => tx.type === "expense");
        if (hasIncome && hasExpense) return "mix";
        if (hasIncome) return "income";
        if (hasExpense) return "expense";
        return "";
    }

    function formatISO(dateObj) {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, "0");
        const d = String(dateObj.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    function buildCalendarCell(dateObj, isoDate, isOtherMonth, isCurrentDataDay) {
        const dayTransactions = getTransactionsByISODate(isoDate);
        const income = dayTransactions.filter(tx => tx.type === "income").reduce((s, tx) => s + tx.amountValue, 0);
        const expense = dayTransactions.filter(tx => tx.type === "expense").reduce((s, tx) => s + tx.amountValue, 0);
        const stateType = getCellState(dayTransactions);
        return `<button type="button" class="transaction-calendar-day ${isOtherMonth ? "is-other-month" : ""} ${isCurrentDataDay ? "is-today" : ""}" data-date="${isoDate}"><div class="transaction-calendar-day-head"><span class="transaction-calendar-day-number">${dateObj.getDate()}</span>${dayTransactions.length ? `<span class="transaction-calendar-badge">${dayTransactions.length}</span>` : ""}</div>${stateType ? `<div class="transaction-calendar-state"><span class="state-dot ${stateType}"></span></div>` : ""}<div class="transaction-calendar-day-body">${dayTransactions.length ? `<div class="transaction-calendar-mini-summary"><span>${dayTransactions.length} giao dịch</span>${income ? `<strong class="text-success">+${formatCurrency(income)}</strong>` : ""}${expense ? `<strong class="text-danger">-${formatCurrency(expense)}</strong>` : ""}</div>` : '<div class="transaction-calendar-day-empty">Không có giao dịch</div>'}</div></button>`;
    }

    function renderMiniCalendar() {
        if (!calendarGrid || !calendarTitle) return;
        const year = state.currentMonth.getFullYear();
        const month = state.currentMonth.getMonth();
        calendarTitle.textContent = `Tháng ${month + 1}/${year}`;
        const firstDay = new Date(year, month, 1);
        const startWeekday = firstDay.getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevMonthDays = new Date(year, month, 0).getDate();
        const cells = [];
        for (let i = startWeekday - 1; i >= 0; i--) {
            const dayNum = prevMonthDays - i;
            const dateObj = new Date(year, month - 1, dayNum);
            cells.push(buildCalendarCell(dateObj, formatISO(dateObj), true, formatISO(dateObj) === formatISO(maxDateInData)));
        }
        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(year, month, day);
            cells.push(buildCalendarCell(dateObj, formatISO(dateObj), false, formatISO(dateObj) === formatISO(maxDateInData)));
        }
        while (cells.length % 7 !== 0) {
            const nextDay = cells.length - (startWeekday + daysInMonth) + 1;
            const dateObj = new Date(year, month + 1, nextDay);
            cells.push(buildCalendarCell(dateObj, formatISO(dateObj), true, formatISO(dateObj) === formatISO(maxDateInData)));
        }
        calendarGrid.innerHTML = cells.join("");
        calendarGrid.querySelectorAll(".transaction-calendar-day").forEach(cell => cell.addEventListener("click", function () {
            openDayDetails(this.dataset.date);
        }));
    }

    function openDayDetails(isoDate) {
        const items = getTransactionsByISODate(isoDate);
        const dateObj = new Date(isoDate + "T00:00:00");
        if (transactionDayTitle) transactionDayTitle.textContent = `Giao dịch ngày ${fromISOToVNDate(isoDate)}`;
        if (transactionDaySubTitle) transactionDaySubTitle.textContent = formatDateLabel(dateObj);
        const income = items.filter(tx => tx.type === "income").reduce((s, tx) => s + tx.amountValue, 0);
        const expense = items.filter(tx => tx.type === "expense").reduce((s, tx) => s + tx.amountValue, 0);
        if (dayStatCount) dayStatCount.textContent = `${items.length}`;
        if (dayStatIncome) dayStatIncome.textContent = formatCurrency(income);
        if (dayStatExpense) dayStatExpense.textContent = formatCurrency(expense);
        if (transactionDayList) {
            if (!items.length) {
                transactionDayList.innerHTML = '<div class="transaction-summary-empty">Không có giao dịch trong ngày này.</div>';
            } else {
                transactionDayList.innerHTML = items.map(tx => `<div class="transaction-day-item" data-id="${escapeAttr(tx.id)}"><div class="transaction-day-item-icon" style="background:${hexToRgba(tx.categoryColor, 0.14)}; color:${tx.categoryColor};"><i class="${tx.categoryIcon}"></i></div><div class="transaction-day-item-content"><div class="transaction-day-item-head"><div><h6>${escapeHtml(tx.noteLabel)}</h6><div class="transaction-day-item-meta"><span>${escapeHtml(tx.category)}</span><span>•</span><span>${escapeHtml(tx.wallet)}</span><span>•</span><span>${escapeHtml(tx.badge)}</span></div></div><div class="transaction-day-item-amount ${tx.type}">${escapeHtml(tx.amountText)}</div></div><div class="text-body-secondary small">Mã giao dịch: ${escapeHtml(tx.id)}</div></div></div>`).join("");
                transactionDayList.querySelectorAll(".transaction-day-item").forEach(item => item.addEventListener("click", function () {
                    const tx = transactions.find(x => x.id === this.dataset.id);
                    if (!tx) return;
                    if (dayOffcanvas) dayOffcanvas.hide();
                    openDetailModal(tx);
                }));
            }
        }
        if (dayOffcanvas) dayOffcanvas.show();
    }

    function bindDetailButtons() {
        document.querySelectorAll(".transaction-detail-trigger").forEach(btn => btn.addEventListener("click", function () {
            const tx = transactions.find(x => x.id === this.dataset.id);
            if (tx) openDetailModal(tx);
        }));
    }

    function openDetailModal(tx) {
        fillDetailModal(tx);
        if (detailModal) detailModal.show();
    }

    function fillDetailModal(tx) {
        setText("detailId", tx.id);
        setText("detailNoteText", tx.noteLabel);
        setText("detailCategoryText", tx.category);
        setText("detailWalletText", tx.wallet);
        setText("detailDateText", tx.date);
        setText("detailBadgeText", tx.badge);
        setText("detailAmountText", tx.amountText);
        setText("detailTypeText", tx.type === "income" ? "Thu nhập" : "Chi tiêu");
        const heroIconWrap = document.getElementById("detailHeroIconWrap");
        const heroIcon = document.getElementById("detailHeroIcon");
        if (heroIconWrap && heroIcon) {
            heroIconWrap.style.background = hexToRgba(tx.categoryColor, 0.14);
            heroIconWrap.style.color = tx.categoryColor;
            heroIcon.className = tx.categoryIcon;
        }
        setValue("detailEditAmount", tx.amountValue);
        setValue("detailEditType", tx.type);
        setValue("detailEditWallet", tx.walletId);
        setValue("detailEditDate", tx.isoDate);
        setValue("detailEditNote", tx.noteLabel === "Không có ghi chú" ? "" : tx.noteLabel);
        setValue("detailEditCategory", tx.category);
        setValue("detailEditCategoryId", tx.categoryId);
        setValue("detailEditCategoryIcon", tx.categoryIcon);
        setValue("detailEditCategoryColor", tx.categoryColor);
        setValue("detailEditRecurrence", mapBadgeToRecurrence(tx.badge));
        updateToggleGroup("detailTypeSwitch", tx.type);
        updateCategorySelection("detailCategoryGrid", tx.category);
    }

    function mapBadgeToRecurrence(badge) {
        switch ((badge || "").trim()) {
            case "Hàng ngày": return "daily";
            case "Hàng tuần": return "weekly";
            case "Hàng tháng": return "monthly";
            case "Hàng năm": return "yearly";
            default: return "";
        }
    }

    function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value || "";
    }

    function setValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value || "";
    }

    function updateToggleGroup(groupId, value) {
        const group = document.getElementById(groupId);
        if (!group) return;
        group.querySelectorAll("button").forEach(btn => btn.classList.toggle("active", btn.dataset.value === value));
    }

    function updateCategorySelection(gridId, categoryName) {
        const grid = document.getElementById(gridId);
        if (!grid) return;
        grid.querySelectorAll(".transaction-category-chip").forEach(chip => chip.classList.toggle("active", chip.dataset.name === categoryName));
    }

    function wireToggleGroup(groupId, hiddenInputId, callback) {
        const group = document.getElementById(groupId);
        const input = document.getElementById(hiddenInputId);
        if (!group || !input) return;
        group.querySelectorAll("button").forEach(btn => btn.addEventListener("click", function () {
            group.querySelectorAll("button").forEach(x => x.classList.remove("active"));
            this.classList.add("active");
            input.value = this.dataset.value;
            if (callback) callback(this.dataset.value);
        }));
    }

    function wireCategoryGrid(gridId, hiddenNameId, hiddenIdId, hiddenIconId, hiddenColorId, callback) {
        const grid = document.getElementById(gridId);
        const hiddenName = document.getElementById(hiddenNameId);
        const hiddenId = document.getElementById(hiddenIdId);
        const hiddenIcon = document.getElementById(hiddenIconId);
        const hiddenColor = document.getElementById(hiddenColorId);
        if (!grid) return;
        grid.querySelectorAll(".transaction-category-chip").forEach(chip => chip.addEventListener("click", function () {
            grid.querySelectorAll(".transaction-category-chip").forEach(x => x.classList.remove("active"));
            this.classList.add("active");
            if (hiddenName) hiddenName.value = this.dataset.name || "";
            if (hiddenId) hiddenId.value = this.dataset.id || "";
            if (hiddenIcon) hiddenIcon.value = this.dataset.icon || "";
            if (hiddenColor) hiddenColor.value = this.dataset.color || "";
            if (callback) callback({ name: this.dataset.name || "", icon: this.dataset.icon || "", color: this.dataset.color || "" });
        }));
    }

    function getSelectedWalletName(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return "---";
        const option = select.options[select.selectedIndex];
        return option?.dataset.name || option?.text || "---";
    }

    function mapRecurrenceLabel(value) {
        switch ((value || "").trim()) {
            case "daily": return "Hàng ngày";
            case "weekly": return "Hàng tuần";
            case "monthly": return "Hàng tháng";
            case "yearly": return "Hàng năm";
            default: return "Không lặp";
        }
    }

    function syncAddPreview() {
        const amount = Number(document.getElementById("addTransactionAmount")?.value || 0);
        const type = document.getElementById("addTransactionType")?.value || "expense";
        const wallet = getSelectedWalletName("addTransactionWallet");
        const category = document.getElementById("addTransactionCategory")?.value || "Chưa chọn";
        const icon = document.getElementById("addTransactionCategoryIcon")?.value || "bx bx-category";
        const color = document.getElementById("addTransactionCategoryColor")?.value || "#8592A3";
        const date = document.getElementById("addTransactionDate")?.value || "";
        const recurrence = document.getElementById("addTransactionRecurrence")?.value || "";
        const note = document.getElementById("addTransactionNote")?.value?.trim() || "Chưa có ghi chú cho giao dịch này.";
        setText("addPreviewNote", note);
        setText("addPreviewAmount", formatCurrency(amount));
        setText("addPreviewWallet", wallet);
        setText("addPreviewCategory", category);
        setText("addPreviewRepeat", mapRecurrenceLabel(recurrence));
        setText("addPreviewTypeText", type === "income" ? "Thu nhập" : "Chi tiêu");
        setText("addPreviewDate", date ? fromISOToVNDate(date) : "--/--/----");
        const previewIconWrap = document.getElementById("addPreviewIconWrap");
        const previewIcon = document.getElementById("addPreviewIcon");
        if (previewIconWrap && previewIcon) {
            previewIconWrap.style.background = hexToRgba(color, 0.14);
            previewIconWrap.style.color = color;
            previewIcon.className = icon;
        }
    }

    function bindAddPreviewInputs() {
        ["addTransactionAmount", "addTransactionWallet", "addTransactionDate", "addTransactionRecurrence", "addTransactionNote"].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener(el.tagName === "SELECT" ? "change" : "input", syncAddPreview);
        });
    }

    function escapeHtml(value) {
        return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
    }

    function escapeAttr(value) {
        return escapeHtml(value);
    }

    function refreshAll() {
        state.filteredTransactions = getFilteredTransactions();
        renderSummary();
        renderTable();
        renderMiniCalendar();
    }

    function setSubmitting(isSubmitting) {
        state.isSubmitting = isSubmitting;
        ["btnSaveTransactionStatic", "btnUpdateTransactionStatic", "btnDeleteTransactionStatic"].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = isSubmitting;
        });
    }

    function getAddRequestPayload() {
        const transactionType = document.getElementById("addTransactionType")?.value || "expense";
        const recurInterval = document.getElementById("addTransactionRecurrence")?.value || null;
        return {
            wallet_id: document.getElementById("addTransactionWallet")?.value || "",
            category_id: document.getElementById("addTransactionCategoryId")?.value || "",
            transaction_type: transactionType,
            amount: Number(document.getElementById("addTransactionAmount")?.value || 0),
            transaction_date: document.getElementById("addTransactionDate")?.value || "",
            note: normalizeNote(document.getElementById("addTransactionNote")?.value),
            is_recurring: !!recurInterval,
            recur_interval: recurInterval
        };
    }

    function getUpdateRequestPayload() {
        const transactionType = document.getElementById("detailEditType")?.value || "expense";
        const recurInterval = document.getElementById("detailEditRecurrence")?.value || null;
        return {
            wallet_id: document.getElementById("detailEditWallet")?.value || "",
            category_id: document.getElementById("detailEditCategoryId")?.value || "",
            transaction_type: transactionType,
            amount: Number(document.getElementById("detailEditAmount")?.value || 0),
            transaction_date: document.getElementById("detailEditDate")?.value || "",
            note: normalizeNote(document.getElementById("detailEditNote")?.value),
            is_recurring: !!recurInterval,
            recur_interval: recurInterval
        };
    }

    function normalizeNote(value) {
        const text = (value || "").trim();
        return text.length ? text : null;
    }

    function validatePayload(payload) {
        if (!payload.wallet_id) return "Vui lòng chọn ví.";
        if (!payload.category_id) return "Vui lòng chọn danh mục.";
        if (!["income", "expense"].includes(payload.transaction_type)) return "Loại giao dịch không hợp lệ.";
        if (!payload.amount || Number(payload.amount) <= 0) return "Số tiền phải lớn hơn 0.";
        if (!payload.transaction_date) return "Vui lòng chọn ngày giao dịch.";
        if (payload.is_recurring && !payload.recur_interval) return "Vui lòng chọn chu kỳ lặp.";
        return null;
    }

    async function sendJson(url, method, payload) {
        const response = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
            body: payload ? JSON.stringify(payload) : null
        });

        let result = null;
        try {
            result = await response.json();
        } catch {
            result = null;
        }

        if (!response.ok || !result?.success) {
            throw new Error(result?.message || "Yêu cầu không thành công.");
        }

        return result;
    }

    async function createTransaction() {
        if (state.isSubmitting) return;
        const payload = getAddRequestPayload();
        const error = validatePayload(payload);
        if (error) {
            window.alert(error);
            return;
        }

        setSubmitting(true);
        try {
            await sendJson("/Transaction/CreateAjax", "POST", payload);
            if (addModal) addModal.hide();
            if (toastSaved) toastSaved.show();
            window.location.reload();
        } catch (err) {
            window.alert(err.message || "Không thể thêm giao dịch.");
        } finally {
            setSubmitting(false);
        }
    }

    async function updateTransaction() {
        if (state.isSubmitting) return;
        const transactionId = document.getElementById("detailId")?.textContent?.trim();
        if (!transactionId) {
            window.alert("Không tìm thấy mã giao dịch.");
            return;
        }

        const payload = getUpdateRequestPayload();
        const error = validatePayload(payload);
        if (error) {
            window.alert(error);
            return;
        }

        setSubmitting(true);
        try {
            await sendJson(`/Transaction/UpdateAjax/${encodeURIComponent(transactionId)}`, "PUT", payload);
            if (detailModal) detailModal.hide();
            if (toastUpdated) toastUpdated.show();
            window.location.reload();
        } catch (err) {
            window.alert(err.message || "Không thể cập nhật giao dịch.");
        } finally {
            setSubmitting(false);
        }
    }

    async function deleteTransaction() {
        if (state.isSubmitting) return;
        const transactionId = document.getElementById("detailId")?.textContent?.trim();
        if (!transactionId) {
            window.alert("Không tìm thấy mã giao dịch.");
            return;
        }

        if (!window.confirm(`Bạn có chắc muốn xóa giao dịch ${transactionId}?`)) {
            return;
        }

        setSubmitting(true);
        try {
            await sendJson(`/Transaction/DeleteAjax/${encodeURIComponent(transactionId)}`, "DELETE");
            if (detailModal) detailModal.hide();
            if (toastDeleted) toastDeleted.show();
            window.location.reload();
        } catch (err) {
            window.alert(err.message || "Không thể xóa giao dịch.");
        } finally {
            setSubmitting(false);
        }
    }

    document.querySelectorAll("#transactionTypeTabs button").forEach(btn => btn.addEventListener("click", function () {
        document.querySelectorAll("#transactionTypeTabs button").forEach(x => x.classList.remove("active"));
        this.classList.add("active");
        state.activeType = this.dataset.type || "all";
        state.currentPage = 1;
        refreshAll();
    }));

    if (searchInput) searchInput.addEventListener("input", () => { state.currentPage = 1; refreshAll(); });
    if (walletFilter) walletFilter.addEventListener("change", () => { state.currentPage = 1; refreshAll(); });
    if (periodFilter) periodFilter.addEventListener("change", function () {
        const isCustom = periodFilter.value === "custom";
        if (fromDateWrap) fromDateWrap.classList.toggle("d-none", !isCustom);
        if (toDateWrap) toDateWrap.classList.toggle("d-none", !isCustom);
        state.currentPage = 1;
        refreshAll();
    });
    if (fromDateFilter) fromDateFilter.addEventListener("change", () => { state.currentPage = 1; refreshAll(); });
    if (toDateFilter) toDateFilter.addEventListener("change", () => { state.currentPage = 1; refreshAll(); });
    if (calendarPrevBtn) calendarPrevBtn.addEventListener("click", () => { state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1); renderMiniCalendar(); });
    if (calendarNextBtn) calendarNextBtn.addEventListener("click", () => { state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1); renderMiniCalendar(); });

    wireToggleGroup("addTypeSwitch", "addTransactionType", syncAddPreview);
    wireToggleGroup("detailTypeSwitch", "detailEditType");
    wireCategoryGrid("addCategoryGrid", "addTransactionCategory", "addTransactionCategoryId", "addTransactionCategoryIcon", "addTransactionCategoryColor", syncAddPreview);
    wireCategoryGrid("detailCategoryGrid", "detailEditCategory", "detailEditCategoryId", "detailEditCategoryIcon", "detailEditCategoryColor");
    bindAddPreviewInputs();

    const defaultAddCategoryChip = document.querySelector("#addCategoryGrid .transaction-category-chip");
    if (defaultAddCategoryChip) defaultAddCategoryChip.click();
    syncAddPreview();

    const btnSave = document.getElementById("btnSaveTransactionStatic");
    if (btnSave) btnSave.addEventListener("click", createTransaction);

    const btnUpdate = document.getElementById("btnUpdateTransactionStatic");
    if (btnUpdate) btnUpdate.addEventListener("click", updateTransaction);

    const btnDelete = document.getElementById("btnDeleteTransactionStatic");
    if (btnDelete) btnDelete.addEventListener("click", deleteTransaction);

    refreshAll();
});
