document.addEventListener("DOMContentLoaded", function () {
    if (typeof Chart === "undefined") return;

    const page = document.querySelector(".dashboard-page");
    const insightsUrl = page?.dataset.dashboardInsightsUrl || "";
    const lang = document.documentElement.lang === "en" ? "en" : "vi";

    const text = lang === "en"
        ? {
            income: "Income",
            expense: "Expense",
            noData: "No data",
            trendPrefix: "Income and expense in",
            donutPrefix: "Spending categories in",
            over: "Over budget",
            reached: "Reached limit",
            near: "Near limit",
            remaining: "Remaining",
            budgetEmptyTitle: "No budgets need attention",
            budgetEmptyText: "No budget category is over or near its warning threshold this month.",
            donutEmptyTitle: "No spending data yet",
            donutEmptyText: "The doughnut chart will appear once there are expense transactions in the selected period."
        }
        : {
            income: "Thu",
            expense: "Chi",
            noData: "Chưa có",
            trendPrefix: "Thu và chi trong",
            donutPrefix: "Danh mục chi tiêu trong",
            over: "Đã vượt mức",
            reached: "Đã chạm mức",
            near: "Sắp chạm mức",
            remaining: "Còn lại",
            budgetEmptyTitle: "Chưa có ngân sách nào vượt ngưỡng",
            budgetEmptyText: "Hiện chưa có danh mục nào vượt hoặc gần chạm mức cảnh báo trong tháng này.",
            donutEmptyTitle: "Chưa có dữ liệu chi tiêu",
            donutEmptyText: "Biểu đồ tròn sẽ xuất hiện khi kỳ đang xem có giao dịch chi tiêu."
        };

    const parseJson = (value, fallback = []) => {
        try { return JSON.parse(value || JSON.stringify(fallback)); } catch { return fallback; }
    };
    const formatNumber = value => Number(value || 0).toLocaleString(lang === "en" ? "en-US" : "vi-VN");
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

    const trendCanvas = document.getElementById("dashboardCashflowChart");
    const donutCanvas = document.getElementById("dashboardExpenseDonutChart");
    const trendTitle = document.getElementById("dashboardTrendTitle");
    const donutTitle = document.getElementById("dashboardDonutTitle");
    const rangeIncomeEl = document.getElementById("dashboardRangeIncome");
    const rangeExpenseEl = document.getElementById("dashboardRangeExpense");
    const rangeTxnEl = document.getElementById("dashboardRangeTransactionCount");
    const busiestEl = document.getElementById("dashboardBusiestLabel");
    const categoryPanel = document.getElementById("dashboardCategoryPanel");
    const budgetPanel = document.getElementById("dashboardBudgetPanel");
    const chips = Array.from(document.querySelectorAll("[data-period-chip]"));

    let trendChart = null;
    let donutChart = null;

    function createTrendChart(labels, income, expense) {
        if (!trendCanvas) return;
        if (trendChart) trendChart.destroy();
        trendChart = new Chart(trendCanvas, {
            type: "line",
            data: {
                labels,
                datasets: [
                    {
                        label: text.income,
                        data: income,
                        borderColor: "rgba(39, 169, 111, 0.95)",
                        backgroundColor: "rgba(39, 169, 111, 0.14)",
                        tension: 0.32,
                        fill: false,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        borderWidth: 3
                    },
                    {
                        label: text.expense,
                        data: expense,
                        borderColor: "rgba(239, 95, 67, 0.95)",
                        backgroundColor: "rgba(239, 95, 67, 0.14)",
                        tension: 0.32,
                        fill: false,
                        pointRadius: 3,
                        pointHoverRadius: 5,
                        borderWidth: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                plugins: {
                    legend: {
                        position: "top",
                        align: "end",
                        labels: { usePointStyle: true, boxWidth: 10, boxHeight: 10, color: "#637381", font: { weight: 700 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: context => `${context.dataset.label}: ${formatNumber(context.parsed.y)}`
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: "#8291a6", font: { weight: 600 } } },
                    y: {
                        beginAtZero: true,
                        ticks: { color: "#8291a6", callback: value => formatNumber(value) },
                        grid: { color: "rgba(130, 145, 166, 0.14)" }
                    }
                }
            }
        });
    }

    function createDonutChart(labels, series, colors) {
        const canvas = document.getElementById("dashboardExpenseDonutChart");
        if (!canvas) return;
        if (donutChart) donutChart.destroy();
        donutChart = new Chart(canvas, {
            type: "doughnut",
            data: {
                labels,
                datasets: [{ data: series, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "68%",
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: context => `${context.label}: ${formatNumber(context.parsed)}` } }
                }
            }
        });
    }

    function renderLegend(items) {
        if (!categoryPanel) return;
        if (!items || !items.length) {
            categoryPanel.innerHTML = `
                <div class="dashboard-empty-state small-empty">
                    <span class="dashboard-empty-icon"><i class="bx bx-pie-chart-alt-2"></i></span>
                    <h3>${text.donutEmptyTitle}</h3>
                    <p>${text.donutEmptyText}</p>
                </div>`;
            return;
        }

        const colors = items.map((x, i) => x.color || ["#696cff", "#71dd37", "#03c3ec", "#ffab00", "#ff5c39"][i % 5]);
        const labels = items.map(x => x.categoryName);
        const series = items.map(x => Number(x.totalAmount || 0));

        categoryPanel.innerHTML = `
            <div class="dashboard-donut-shell">
                <canvas id="dashboardExpenseDonutChart"></canvas>
            </div>
            <div class="dashboard-legend-list" id="dashboardCategoryLegend"></div>`;

        const legend = categoryPanel.querySelector("#dashboardCategoryLegend");
        legend.innerHTML = items.slice(0, 5).map(item => `
            <div class="legend-row">
                <div class="legend-left">
                    <span class="legend-dot" style="background:${item.color}"></span>
                    <span>${item.categoryName}</span>
                </div>
                <div class="legend-right">
                    <strong>${Number(item.percentage || 0).toFixed(2).replace(/\.00$/, "")}%</strong>
                    <small>${formatNumber(item.totalAmount)}</small>
                </div>
            </div>`).join("");

        createDonutChart(labels, series, colors);
    }

    function renderBudgetAlerts(items) {
        if (!budgetPanel) return;
        if (!items || !items.length) {
            budgetPanel.innerHTML = `
                <div class="dashboard-empty-state small-empty alert-empty-ok">
                    <span class="dashboard-empty-icon success"><i class="bx bx-check-shield"></i></span>
                    <h3>${text.budgetEmptyTitle}</h3>
                    <p>${text.budgetEmptyText}</p>
                </div>`;
            return;
        }

        budgetPanel.innerHTML = `<div class="budget-alert-grid" id="dashboardBudgetAlerts"></div>`;
        const grid = budgetPanel.querySelector("#dashboardBudgetAlerts");
        grid.innerHTML = items.map(item => {
            const status = item.status === "over" ? text.over : item.status === "reached" ? text.reached : text.near;
            const statusClass = item.status === "over" ? "over" : item.status === "reached" ? "reached" : "warning";
            const width = clamp(Number(item.percentageUsed || 0), 0, 100);
            return `
                <article class="budget-alert-card ${statusClass}">
                    <div class="budget-alert-head">
                        <div class="budget-alert-title-wrap">
                            <span class="budget-alert-dot" style="background:${item.categoryColor}"></span>
                            <div>
                                <h3>${item.categoryName}</h3>
                                <p>${status}</p>
                            </div>
                        </div>
                        <span class="budget-alert-badge">${Math.round(Number(item.percentageUsed || 0))}%</span>
                    </div>
                    <div class="budget-alert-bar"><span style="width:${width}%"></span></div>
                    <div class="budget-alert-meta">
                        <span>${formatNumber(item.spentAmount)} / ${formatNumber(item.limitAmount)}</span>
                        <span>${text.remaining}: ${formatNumber(item.remainingAmount)}</span>
                    </div>
                </article>`;
        }).join("");
    }

    async function loadPeriod(period) {
        if (!insightsUrl) return;
        chips.forEach(btn => btn.disabled = true);
        page?.classList.add("dashboard-loading");
        try {
            const response = await fetch(`${insightsUrl}?period=${encodeURIComponent(period)}`, {
                headers: { "X-Requested-With": "XMLHttpRequest" }
            });
            const data = await response.json();
            if (!response.ok || !data?.success) throw new Error(data?.message || "Failed");

            chips.forEach(btn => btn.classList.toggle("active", btn.dataset.periodChip === data.periodPreset));
            if (trendTitle) trendTitle.textContent = `${text.trendPrefix} ${String(data.periodLabel || "").toLowerCase()}`;
            if (donutTitle) donutTitle.textContent = `${text.donutPrefix} ${String(data.periodLabel || "").toLowerCase()}`;
            if (rangeIncomeEl) rangeIncomeEl.textContent = formatNumber(data.rangeIncome);
            if (rangeExpenseEl) rangeExpenseEl.textContent = formatNumber(data.rangeExpense);
            if (rangeTxnEl) rangeTxnEl.textContent = formatNumber(data.rangeTransactionCount);
            if (busiestEl) busiestEl.textContent = data.busiestLabel || text.noData;

            createTrendChart(data.trendLabels || [], (data.trendIncome || []).map(Number), (data.trendExpense || []).map(Number));
            renderLegend(data.categoryBreakdown || []);
            renderBudgetAlerts(data.budgetAlerts || []);
        } catch (error) {
            window.AppToast?.error?.(error.message || "Không thể tải dữ liệu dashboard.");
        } finally {
            chips.forEach(btn => btn.disabled = false);
            page?.classList.remove("dashboard-loading");
        }
    }

    if (trendCanvas) {
        createTrendChart(
            parseJson(trendCanvas.dataset.labels),
            parseJson(trendCanvas.dataset.income).map(Number),
            parseJson(trendCanvas.dataset.expense).map(Number)
        );
    }
    if (donutCanvas) {
        createDonutChart(
            parseJson(donutCanvas.dataset.labels),
            parseJson(donutCanvas.dataset.series).map(Number),
            parseJson(donutCanvas.dataset.colors, ["#696cff", "#71dd37", "#03c3ec", "#ffab00", "#ff5c39"])
        );
    }

    chips.forEach(btn => btn.addEventListener("click", function () {
        const period = this.dataset.periodChip;
        if (!period || this.classList.contains("active")) return;
        loadPeriod(period);
    }));
});
