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
    const allRows = Array.from(document.querySelectorAll(".transaction-row"));

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
        currentMonth: new Date(2026, 3, 1) // April 2026
    };

    const transactions = allRows.map(mapRowToTransaction);

    function mapRowToTransaction(row) {
        const numericValue = Number(row.dataset.amountValue || 0);
        const isoDate = toISODate(row.dataset.date);
        return {
            id: row.dataset.id || "",
            title: row.dataset.title || "",
            category: row.dataset.category || "Khác",
            categoryIcon: row.dataset.categoryIcon || "bx bx-category",
            categoryColor: row.dataset.categoryColor || "#8592A3",
            wallet: row.dataset.wallet || "",
            type: row.dataset.type || "expense",
            amountText: row.dataset.amount || "0",
            amountValue: numericValue,
            date: row.dataset.date || "",
            time: row.dataset.time || "",
            note: row.dataset.note || "",
            badge: row.dataset.badge || "Một lần",
            currency: row.dataset.currency || "VND",
            isoDate: isoDate,
            dateObj: isoDate ? new Date(isoDate + "T00:00:00") : null
        };
    }

    function toISODate(vnDate) {
        if (!vnDate) return "";
        const parts = vnDate.split("/");
        if (parts.length !== 3) return "";
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
    }

    function fromISOToVNDate(isoDate) {
        if (!isoDate) return "";
        const parts = isoDate.split("-");
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
        const dates = transactions
            .filter(x => x.dateObj)
            .map(x => x.dateObj.getTime());

        return dates.length ? new Date(Math.max(...dates)) : new Date();
    }

    function isSameDate(a, b) {
        return a.getFullYear() === b.getFullYear()
            && a.getMonth() === b.getMonth()
            && a.getDate() === b.getDate();
    }

    function matchesPeriod(tx) {
        if (!tx.dateObj) return true;

        const maxDate = getMaxDateInData();
        const txDate = tx.dateObj;
        const selected = periodFilter ? periodFilter.value : "month";

        if (selected === "month") {
            return txDate.getMonth() === maxDate.getMonth() && txDate.getFullYear() === maxDate.getFullYear();
        }

        if (selected === "today") {
            return isSameDate(txDate, maxDate);
        }

        if (selected === "week") {
            const start = new Date(maxDate);
            start.setDate(maxDate.getDate() - 6);
            start.setHours(0, 0, 0, 0);

            const end = new Date(maxDate);
            end.setHours(23, 59, 59, 999);

            return txDate >= start && txDate <= end;
        }

        if (selected === "custom") {
            const fromVal = fromDateFilter && fromDateFilter.value ? new Date(fromDateFilter.value + "T00:00:00") : null;
            const toVal = toDateFilter && toDateFilter.value ? new Date(toDateFilter.value + "T23:59:59") : null;

            if (fromVal && txDate < fromVal) return false;
            if (toVal && txDate > toVal) return false;
            return true;
        }

        return true;
    }

    function getFilteredTransactions() {
        const keyword = (searchInput?.value || "").trim().toLowerCase();
        const wallet = walletFilter?.value || "all";

        return transactions.filter(tx => {
            const matchKeyword =
                !keyword ||
                `${tx.title} ${tx.category} ${tx.wallet} ${tx.note}`.toLowerCase().includes(keyword);

            const matchWallet = wallet === "all" || tx.wallet === wallet;
            const matchType = state.activeType === "all" || tx.type === state.activeType;
            const matchPeriod = matchesPeriod(tx);

            return matchKeyword && matchWallet && matchType && matchPeriod;
        });
    }

    function renderLegend(container, list, total) {
        if (!container) return;

        if (!list.length || total <= 0) {
            container.innerHTML = `<div class="transaction-summary-empty">Chưa có dữ liệu phù hợp.</div>`;
            return;
        }

        container.innerHTML = list.map(item => {
            const percent = ((item.value / total) * 100).toFixed(1);
            return `
                <div class="transaction-summary-item">
                    <div class="transaction-summary-item-left">
                        <span class="transaction-summary-dot" style="background:${item.color}"></span>
                        <span class="transaction-summary-item-name">${item.name}</span>
                    </div>
                    <div class="transaction-summary-item-right">
                        <strong>${formatCurrency(item.value)}</strong>
                        <span>${percent}%</span>
                    </div>
                </div>
            `;
        }).join("");
    }

    function buildDonutGradient(list, total) {
        if (!list.length || total <= 0) {
            return "conic-gradient(#edf1f7 0 360deg)";
        }

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
        const data = state.filteredTransactions;

        const incomeMap = {};
        const expenseMap = {};

        data.forEach(tx => {
            const target = tx.type === "income" ? incomeMap : expenseMap;
            if (!target[tx.category]) {
                target[tx.category] = {
                    name: tx.category,
                    color: tx.categoryColor,
                    value: 0
                };
            }
            target[tx.category].value += tx.amountValue;
        });

        const incomeList = Object.values(incomeMap).sort((a, b) => b.value - a.value);
        const expenseList = Object.values(expenseMap).sort((a, b) => b.value - a.value);

        const totalIncome = incomeList.reduce((sum, x) => sum + x.value, 0);
        const totalExpense = expenseList.reduce((sum, x) => sum + x.value, 0);

        if (incomeDonut) incomeDonut.style.background = buildDonutGradient(incomeList, totalIncome);
        if (expenseDonut) expenseDonut.style.background = buildDonutGradient(expenseList, totalExpense);

        if (incomeDonutTotal) incomeDonutTotal.textContent = formatCurrency(totalIncome);
        if (expenseDonutTotal) expenseDonutTotal.textContent = formatCurrency(totalExpense);

        renderLegend(incomeLegend, incomeList, totalIncome);
        renderLegend(expenseLegend, expenseList, totalExpense);
    }

    function buildTableRow(tx) {
        const amountClass = tx.type === "income" ? "text-success" : "text-danger";

        return `
            <tr class="transaction-row" data-id="${tx.id}" data-title="${tx.title}" data-category="${tx.category}"
                data-category-icon="${tx.categoryIcon}" data-category-color="${tx.categoryColor}" data-wallet="${tx.wallet}"
                data-type="${tx.type}" data-amount="${tx.amountText}" data-amount-value="${tx.amountValue}" data-date="${tx.date}"
                data-time="${tx.time}" data-note="${tx.note}" data-badge="${tx.badge}" data-currency="${tx.currency}">
                <td>
                    <div class="transaction-main-info">
                        <div class="transaction-icon-box" style="background:${hexToRgba(tx.categoryColor, 0.14)}; color:${tx.categoryColor};">
                            <i class="${tx.categoryIcon}"></i>
                        </div>
                        <div class="transaction-main-text">
                            <h6 class="mb-0">${tx.title}</h6>
                            <small class="text-body-secondary">${tx.note || "Không có ghi chú."}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="transaction-category-pill" style="background:${hexToRgba(tx.categoryColor, 0.12)}; color:${tx.categoryColor};">
                        <i class="${tx.categoryIcon}"></i>
                        ${tx.category}
                    </span>
                </td>
                <td>${tx.wallet}</td>
                <td>
                    <div class="transaction-date-cell">
                        <span>${tx.date}</span>
                        <small class="text-body-secondary">${tx.time}</small>
                    </div>
                </td>
                <td class="${amountClass} fw-semibold">${tx.amountText} ${tx.currency}</td>
                <td class="text-end">
                    <button type="button"
                            class="btn btn-sm btn-icon btn-outline-primary transaction-detail-trigger"
                            data-id="${tx.id}"
                            data-title="${tx.title}"
                            data-category="${tx.category}"
                            data-category-icon="${tx.categoryIcon}"
                            data-category-color="${tx.categoryColor}"
                            data-wallet="${tx.wallet}"
                            data-type="${tx.type}"
                            data-amount="${tx.amountText}"
                            data-amount-value="${tx.amountValue}"
                            data-date="${tx.date}"
                            data-time="${tx.time}"
                            data-note="${tx.note}"
                            data-badge="${tx.badge}"
                            data-currency="${tx.currency}">
                        <i class="bx bx-show"></i>
                    </button>
                </td>
            </tr>
        `;
    }

    function renderPagination(totalItems) {
        if (!transactionPagination) return;

        const totalPages = Math.ceil(totalItems / state.pageSize);

        if (totalPages <= 1) {
            transactionPagination.innerHTML = "";
            return;
        }

        let html = "";

        html += `
            <button type="button" class="transaction-page-btn" data-page="${Math.max(1, state.currentPage - 1)}">
                <i class="bx bx-chevron-left"></i>
            </button>
        `;

        for (let i = 1; i <= totalPages; i++) {
            html += `
                <button type="button" class="transaction-page-btn ${i === state.currentPage ? "active" : ""}" data-page="${i}">
                    ${i}
                </button>
            `;
        }

        html += `
            <button type="button" class="transaction-page-btn" data-page="${Math.min(totalPages, state.currentPage + 1)}">
                <i class="bx bx-chevron-right"></i>
            </button>
        `;

        transactionPagination.innerHTML = html;

        transactionPagination.querySelectorAll("[data-page]").forEach(btn => {
            btn.addEventListener("click", function () {
                state.currentPage = Number(this.dataset.page || 1);
                renderTable();
            });
        });
    }

    function renderTable() {
        if (!tableBody) return;

        const totalItems = state.filteredTransactions.length;
        const totalPages = Math.max(1, Math.ceil(totalItems / state.pageSize));
        if (state.currentPage > totalPages) state.currentPage = 1;

        const start = (state.currentPage - 1) * state.pageSize;
        const pageItems = state.filteredTransactions.slice(start, start + state.pageSize);

        tableBody.innerHTML = pageItems.map(buildTableRow).join("");

        if (transactionCountBadge) {
            transactionCountBadge.textContent = `${totalItems} giao dịch`;
        }

        if (transactionEmptyState) {
            transactionEmptyState.classList.toggle("show", totalItems === 0);
        }

        renderPagination(totalItems);
        bindDetailButtons();
    }

    function getTransactionsOfMonth(year, monthIndex) {
        return state.filteredTransactions.filter(tx => {
            return tx.dateObj &&
                tx.dateObj.getFullYear() === year &&
                tx.dateObj.getMonth() === monthIndex;
        });
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

        const maxDate = getMaxDateInData();

        for (let i = startWeekday - 1; i >= 0; i--) {
            const dayNum = prevMonthDays - i;
            const dateObj = new Date(year, month - 1, dayNum);
            const iso = formatISO(dateObj);
            cells.push(buildCalendarCell(dateObj, iso, true, isSameDate(dateObj, maxDate)));
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(year, month, day);
            const iso = formatISO(dateObj);
            cells.push(buildCalendarCell(dateObj, iso, false, isSameDate(dateObj, maxDate)));
        }

        while (cells.length % 7 !== 0) {
            const nextDay = cells.length - (startWeekday + daysInMonth) + 1;
            const dateObj = new Date(year, month + 1, nextDay);
            const iso = formatISO(dateObj);
            cells.push(buildCalendarCell(dateObj, iso, true, isSameDate(dateObj, maxDate)));
        }

        calendarGrid.innerHTML = cells.join("");

        calendarGrid.querySelectorAll(".transaction-calendar-day").forEach(cell => {
            cell.addEventListener("click", function () {
                const isoDate = this.dataset.date;
                openDayDetails(isoDate);
            });
        });
    }

    function buildCalendarCell(dateObj, isoDate, isOtherMonth, isToday) {
        const dayTransactions = getTransactionsByISODate(isoDate);
        const income = dayTransactions
            .filter(tx => tx.type === "income")
            .reduce((sum, tx) => sum + tx.amountValue, 0);

        const expense = dayTransactions
            .filter(tx => tx.type === "expense")
            .reduce((sum, tx) => sum + tx.amountValue, 0);

        const stateType = getCellState(dayTransactions);

        return `
            <button type="button"
                    class="transaction-calendar-day ${isOtherMonth ? "is-other-month" : ""} ${isToday ? "is-today" : ""}"
                    data-date="${isoDate}">
                <div class="transaction-calendar-day-head">
                    <span class="transaction-calendar-day-number">${dateObj.getDate()}</span>
                    ${dayTransactions.length ? `<span class="transaction-calendar-badge">${dayTransactions.length}</span>` : ""}
                </div>

                ${stateType ? `
                    <div class="transaction-calendar-state">
                        <span class="state-dot ${stateType === "mix" ? "mix" : stateType}"></span>
                    </div>
                ` : ""}

                <div class="transaction-calendar-day-body">
                    ${dayTransactions.length
                ? `
                            <div class="transaction-calendar-mini-summary">
                                <span>${dayTransactions.length} giao dịch</span>
                                ${income ? `<strong class="text-success">+${formatCurrency(income)}</strong>` : ""}
                                ${expense ? `<strong class="text-danger">-${formatCurrency(expense)}</strong>` : ""}
                            </div>
                        `
                : `<div class="transaction-calendar-day-empty">Không có giao dịch</div>`
            }
                </div>
            </button>
        `;
    }

    function formatISO(dateObj) {
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, "0");
        const d = String(dateObj.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    function openDayDetails(isoDate) {
        const items = getTransactionsByISODate(isoDate);
        const dateObj = new Date(isoDate + "T00:00:00");

        if (transactionDayTitle) transactionDayTitle.textContent = `Giao dịch ngày ${fromISOToVNDate(isoDate)}`;
        if (transactionDaySubTitle) transactionDaySubTitle.textContent = formatDateLabel(dateObj);

        const income = items
            .filter(tx => tx.type === "income")
            .reduce((sum, tx) => sum + tx.amountValue, 0);

        const expense = items
            .filter(tx => tx.type === "expense")
            .reduce((sum, tx) => sum + tx.amountValue, 0);

        if (dayStatCount) dayStatCount.textContent = `${items.length}`;
        if (dayStatIncome) dayStatIncome.textContent = formatCurrency(income);
        if (dayStatExpense) dayStatExpense.textContent = formatCurrency(expense);

        if (transactionDayList) {
            if (!items.length) {
                transactionDayList.innerHTML = `
                    <div class="transaction-summary-empty">Không có giao dịch trong ngày này.</div>
                `;
            } else {
                transactionDayList.innerHTML = items.map(tx => `
                    <div class="transaction-day-item" data-id="${tx.id}">
                        <div class="transaction-day-item-icon"
                             style="background:${hexToRgba(tx.categoryColor, 0.14)}; color:${tx.categoryColor};">
                            <i class="${tx.categoryIcon}"></i>
                        </div>

                        <div class="transaction-day-item-content">
                            <div class="transaction-day-item-head">
                                <div>
                                    <h6>${tx.title}</h6>
                                    <div class="transaction-day-item-meta">
                                        <span>${tx.category}</span>
                                        <span>•</span>
                                        <span>${tx.wallet}</span>
                                        <span>•</span>
                                        <span>${tx.time}</span>
                                    </div>
                                </div>

                                <div class="transaction-day-item-amount ${tx.type}">
                                    ${tx.amountText} ${tx.currency}
                                </div>
                            </div>

                            <div class="text-body-secondary small">
                                ${tx.note || "Không có ghi chú."}
                            </div>
                        </div>
                    </div>
                `).join("");

                transactionDayList.querySelectorAll(".transaction-day-item").forEach(item => {
                    item.addEventListener("click", function () {
                        const tx = transactions.find(x => x.id === this.dataset.id);
                        if (!tx) return;
                        if (dayOffcanvas) dayOffcanvas.hide();
                        openDetailModal(tx);
                    });
                });
            }
        }

        if (dayOffcanvas) dayOffcanvas.show();
    }

    function bindDetailButtons() {
        document.querySelectorAll(".transaction-detail-trigger").forEach(btn => {
            btn.addEventListener("click", function () {
                const tx = {
                    id: this.dataset.id,
                    title: this.dataset.title,
                    category: this.dataset.category,
                    categoryIcon: this.dataset.categoryIcon,
                    categoryColor: this.dataset.categoryColor,
                    wallet: this.dataset.wallet,
                    type: this.dataset.type,
                    amountText: this.dataset.amount,
                    amountValue: Number(this.dataset.amountValue || 0),
                    date: this.dataset.date,
                    time: this.dataset.time,
                    note: this.dataset.note,
                    badge: this.dataset.badge,
                    currency: this.dataset.currency
                };
                openDetailModal(tx);
            });
        });
    }

    function openDetailModal(tx) {
        fillDetailModal(tx);
        if (detailModal) detailModal.show();
    }

    function fillDetailModal(tx) {
        setText("detailId", tx.id);
        setText("detailTitleText", tx.title);
        setText("detailCategoryText", tx.category);
        setText("detailWalletText", tx.wallet);
        setText("detailDateTimeText", `${tx.date} ${tx.time}`);
        setText("detailCurrencyText", tx.currency);
        setText("detailBadgeText", tx.badge);
        setText("detailAmountText", `${tx.amountText} ${tx.currency}`);

        const typeBadge = document.getElementById("detailTypeBadge");
        if (typeBadge) {
            typeBadge.className = "badge " + (tx.type === "income" ? "bg-label-success" : "bg-label-danger");
            typeBadge.textContent = tx.type === "income" ? "Thu nhập" : "Chi tiêu";
        }

        const heroIconWrap = document.getElementById("detailHeroIconWrap");
        const heroIcon = document.getElementById("detailHeroIcon");
        if (heroIconWrap && heroIcon) {
            heroIconWrap.style.background = hexToRgba(tx.categoryColor, 0.14);
            heroIconWrap.style.color = tx.categoryColor;
            heroIcon.className = tx.categoryIcon;
        }

        setValue("detailEditTitle", tx.title);
        setValue("detailEditType", tx.type);
        setValue("detailEditWallet", tx.wallet);
        setValue("detailEditDate", tx.isoDate || toISODate(tx.date));
        setValue("detailEditTime", tx.time);
        setValue("detailEditNote", tx.note);
        setValue("detailEditCategory", tx.category);
        setValue("detailEditCategoryIcon", tx.categoryIcon);
        setValue("detailEditCategoryColor", tx.categoryColor);

        updateToggleGroup("detailTypeSwitch", tx.type);
        updateCategorySelection("detailCategoryGrid", tx.category);
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
        group.querySelectorAll("button").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.value === value);
        });
    }

    function wireToggleGroup(groupId, hiddenInputId, callback) {
        const group = document.getElementById(groupId);
        const input = document.getElementById(hiddenInputId);
        if (!group || !input) return;

        group.querySelectorAll("button").forEach(btn => {
            btn.addEventListener("click", function () {
                group.querySelectorAll("button").forEach(x => x.classList.remove("active"));
                this.classList.add("active");
                input.value = this.dataset.value;
                if (callback) callback(this.dataset.value);
            });
        });
    }

    function updateCategorySelection(gridId, categoryName) {
        const grid = document.getElementById(gridId);
        if (!grid) return;
        grid.querySelectorAll(".transaction-category-chip").forEach(chip => {
            chip.classList.toggle("active", chip.dataset.name === categoryName);
        });
    }

    function wireCategoryGrid(gridId, hiddenNameId, hiddenIconId, hiddenColorId, callback) {
        const grid = document.getElementById(gridId);
        const hiddenName = document.getElementById(hiddenNameId);
        const hiddenIcon = document.getElementById(hiddenIconId);
        const hiddenColor = document.getElementById(hiddenColorId);

        if (!grid) return;

        grid.querySelectorAll(".transaction-category-chip").forEach(chip => {
            chip.addEventListener("click", function () {
                grid.querySelectorAll(".transaction-category-chip").forEach(x => x.classList.remove("active"));
                this.classList.add("active");

                if (hiddenName) hiddenName.value = this.dataset.name || "";
                if (hiddenIcon) hiddenIcon.value = this.dataset.icon || "";
                if (hiddenColor) hiddenColor.value = this.dataset.color || "";

                if (callback) {
                    callback({
                        name: this.dataset.name || "",
                        icon: this.dataset.icon || "",
                        color: this.dataset.color || ""
                    });
                }
            });
        });
    }

    function syncAddPreview() {
        const title = document.getElementById("addTransactionTitle")?.value?.trim() || "Tên giao dịch";
        const amount = Number(document.getElementById("addTransactionAmount")?.value || 0);
        const type = document.getElementById("addTransactionType")?.value || "expense";
        const wallet = document.getElementById("addTransactionWallet")?.value || "Ví tiền mặt";
        const category = document.getElementById("addTransactionCategory")?.value || "Chưa chọn";
        const icon = document.getElementById("addTransactionCategoryIcon")?.value || "bx bx-category";
        const color = document.getElementById("addTransactionCategoryColor")?.value || "#8592A3";
        const date = document.getElementById("addTransactionDate")?.value || "";
        const recurrence = document.getElementById("addTransactionRecurrence")?.value || "Không lặp";
        const note = document.getElementById("addTransactionNote")?.value?.trim() || "Chưa có ghi chú cho giao dịch này.";

        setText("addPreviewTitle", title);
        setText("addPreviewAmount", formatCurrency(amount));
        setText("addPreviewWallet", wallet);
        setText("addPreviewCategory", category);
        setText("addPreviewRepeat", recurrence);
        setText("addPreviewNote", note);
        setText("addPreviewTypeText", type === "income" ? "Thu nhập" : "Chi tiêu");

        const previewDate = date ? fromISOToVNDate(date) : "--/--/----";
        setText("addPreviewDate", previewDate);

        const previewIconWrap = document.getElementById("addPreviewIconWrap");
        const previewIcon = document.getElementById("addPreviewIcon");
        if (previewIconWrap && previewIcon) {
            previewIconWrap.style.background = hexToRgba(color, 0.14);
            previewIconWrap.style.color = color;
            previewIcon.className = icon;
        }
    }

    function bindAddPreviewInputs() {
        [
            "addTransactionTitle",
            "addTransactionAmount",
            "addTransactionWallet",
            "addTransactionDate",
            "addTransactionRecurrence",
            "addTransactionNote"
        ].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener(el.tagName === "SELECT" ? "change" : "input", syncAddPreview);
        });
    }

    function hexToRgba(hex, alpha) {
        const sanitized = (hex || "").replace("#", "");
        if (sanitized.length !== 6) return `rgba(133,146,163,${alpha})`;
        const r = parseInt(sanitized.substring(0, 2), 16);
        const g = parseInt(sanitized.substring(2, 4), 16);
        const b = parseInt(sanitized.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function refreshAll() {
        state.filteredTransactions = getFilteredTransactions();
        renderSummary();
        renderTable();
        renderMiniCalendar();
    }

    document.querySelectorAll("#transactionTypeTabs button").forEach(btn => {
        btn.addEventListener("click", function () {
            document.querySelectorAll("#transactionTypeTabs button").forEach(x => x.classList.remove("active"));
            this.classList.add("active");
            state.activeType = this.dataset.type || "all";
            state.currentPage = 1;
            refreshAll();
        });
    });

    if (searchInput) {
        searchInput.addEventListener("input", function () {
            state.currentPage = 1;
            refreshAll();
        });
    }

    if (walletFilter) {
        walletFilter.addEventListener("change", function () {
            state.currentPage = 1;
            refreshAll();
        });
    }

    if (periodFilter) {
        periodFilter.addEventListener("change", function () {
            const isCustom = periodFilter.value === "custom";
            if (fromDateWrap) fromDateWrap.classList.toggle("d-none", !isCustom);
            if (toDateWrap) toDateWrap.classList.toggle("d-none", !isCustom);
            state.currentPage = 1;
            refreshAll();
        });
    }

    if (fromDateFilter) {
        fromDateFilter.addEventListener("change", function () {
            state.currentPage = 1;
            refreshAll();
        });
    }

    if (toDateFilter) {
        toDateFilter.addEventListener("change", function () {
            state.currentPage = 1;
            refreshAll();
        });
    }

    if (calendarPrevBtn) {
        calendarPrevBtn.addEventListener("click", function () {
            state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
            renderMiniCalendar();
        });
    }

    if (calendarNextBtn) {
        calendarNextBtn.addEventListener("click", function () {
            state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
            renderMiniCalendar();
        });
    }

    wireToggleGroup("addTypeSwitch", "addTransactionType", syncAddPreview);
    wireToggleGroup("detailTypeSwitch", "detailEditType");

    wireCategoryGrid("addCategoryGrid", "addTransactionCategory", "addTransactionCategoryIcon", "addTransactionCategoryColor", syncAddPreview);
    wireCategoryGrid("detailCategoryGrid", "detailEditCategory", "detailEditCategoryIcon", "detailEditCategoryColor");

    bindAddPreviewInputs();

    const defaultAddCategoryChip = document.querySelector('#addCategoryGrid .transaction-category-chip[data-name="Ăn uống"]');
    if (defaultAddCategoryChip) defaultAddCategoryChip.click();

    syncAddPreview();

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
            if (detailModal) detailModal.hide();
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

    state.filteredTransactions = getFilteredTransactions();
    renderSummary();
    renderTable();
    renderMiniCalendar();
});