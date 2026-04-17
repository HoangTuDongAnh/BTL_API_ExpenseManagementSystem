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
            donutEmptyText: "The doughnut chart will appear once there are expense transactions in the selected period.",
            activeCategories: "Active categories",
            shareInPeriod: "Share in period",
            totalInPeriod: "Total expense in period"
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
            donutEmptyText: "Biểu đồ tròn sẽ xuất hiện khi kỳ đang xem có giao dịch chi tiêu.",
            activeCategories: "Danh mục phát sinh",
            shareInPeriod: "Tỷ trọng trong kỳ",
            totalInPeriod: "Tổng chi trong kỳ"
        };

    const parseJson = (value, fallback = []) => {
        try { return JSON.parse(value || JSON.stringify(fallback)); } catch { return fallback; }
    };
    const formatNumber = value => Number(value || 0).toLocaleString(lang === "en" ? "en-US" : "vi-VN");
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    const defaultPalette = ["#2166ad", "#df5d2c", "#9a3d61", "#4f8f4f", "#6f63ff", "#f0a11a"];

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

    function normalizeBreakdownItems(items) {
        return (items || []).map((item, index) => ({
            categoryId: item.categoryId ?? item.CategoryId ?? index,
            categoryName: item.categoryName ?? item.CategoryName ?? text.noData,
            icon: item.icon ?? item.Icon ?? "bx bx-category",
            color: item.color ?? item.Color ?? defaultPalette[index % defaultPalette.length],
            totalAmount: Number(item.totalAmount ?? item.TotalAmount ?? 0),
            percentage: Number(item.percentage ?? item.Percentage ?? 0)
        }));
    }

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
                        callbacks: { label: context => `${context.dataset.label}: ${formatNumber(context.parsed.y)}` }
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

    function updateDonutCenter(chart, activeIndex = null) {
        const shell = chart?.canvas?.parentElement;
        if (!shell) return;
        let center = shell.querySelector(".dashboard-donut-center");
        if (!center) {
            center = document.createElement("div");
            center.className = "dashboard-donut-center";
            shell.appendChild(center);
        }

        const data = chart.$items || [];
        const defaultState = chart.$defaultCenter || { label: text.totalInPeriod, value: 0, meta: `${data.length} ${text.activeCategories.toLowerCase()}` };
        const active = Number.isInteger(activeIndex) && data[activeIndex] ? data[activeIndex] : null;
        const state = active
            ? {
                label: active.categoryName,
                value: active.totalAmount,
                meta: `${Number(active.percentage || 0).toFixed(2).replace(/\.00$/, "")}% ${text.shareInPeriod.toLowerCase()}`
            }
            : defaultState;

        center.innerHTML = `<span class="dashboard-donut-center__label">${state.label}</span><span class="dashboard-donut-center__value">${formatNumber(state.value)}</span><span class="dashboard-donut-center__meta">${state.meta}</span>`;
    }

    function setActiveLegendRow(activeIndex = null, colors = []) {
        document.querySelectorAll("#dashboardCategoryLegend .legend-row").forEach((row, index) => {
            const isActive = activeIndex === index;
            row.classList.toggle("is-active", isActive);
            row.style.setProperty("--legend-active-color", colors[index] || "#d9e5f6");
        });
    }

    function createDonutChart(labels, series, colors, items = []) {
        const canvas = document.getElementById("dashboardExpenseDonutChart");
        if (!canvas) return;
        if (donutChart) donutChart.destroy();

        donutChart = new Chart(canvas, {
            type: "doughnut",
            data: {
                labels,
                datasets: [{
                    data: series,
                    backgroundColor: colors,
                    borderColor: "#fff",
                    borderWidth: 4,
                    hoverOffset: 8,
                    spacing: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "63%",
                layout: { padding: 10 },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: context => {
                                const value = Number(context.parsed || 0);
                                const total = series.reduce((sum, current) => sum + Number(current || 0), 0);
                                const percent = total ? (value / total) * 100 : 0;
                                return `${context.label}: ${formatNumber(value)} (${percent.toFixed(1).replace(/\.0$/, "")}%)`;
                            }
                        }
                    }
                },
                onHover(event, activeElements, chart) {
                    const activeIndex = activeElements?.length ? activeElements[0].index : null;
                    updateDonutCenter(chart, activeIndex);
                    setActiveLegendRow(activeIndex, colors);
                    chart.canvas.style.cursor = activeElements?.length ? "pointer" : "default";
                }
            }
        });

        donutChart.$items = items;
        donutChart.$defaultCenter = {
            label: text.totalInPeriod,
            value: series.reduce((sum, current) => sum + Number(current || 0), 0),
            meta: `${items.length} ${text.activeCategories.toLowerCase()}`
        };

        updateDonutCenter(donutChart, null);
        setActiveLegendRow(null, colors);
    }

    function bindLegendHover(colors) {
        document.querySelectorAll("#dashboardCategoryLegend .legend-row").forEach(row => {
            row.addEventListener("mouseenter", function () {
                const index = Number(this.dataset.legendIndex);
                if (!donutChart || !Number.isInteger(index)) return;
                const meta = donutChart.getDatasetMeta(0);
                const element = meta?.data?.[index];
                if (!element) return;
                donutChart.setActiveElements([{ datasetIndex: 0, index }]);
                donutChart.tooltip?.setActiveElements([{ datasetIndex: 0, index }], { x: element.x, y: element.y });
                donutChart.update();
                updateDonutCenter(donutChart, index);
                setActiveLegendRow(index, colors);
            });
            row.addEventListener("mouseleave", function () {
                if (!donutChart) return;
                donutChart.setActiveElements([]);
                donutChart.tooltip?.setActiveElements([], { x: 0, y: 0 });
                donutChart.update();
                updateDonutCenter(donutChart, null);
                setActiveLegendRow(null, colors);
            });
        });
    }

    function renderLegend(items) {
        if (!categoryPanel) return;
        const normalized = normalizeBreakdownItems(items);
        if (!normalized.length) {
            categoryPanel.innerHTML = `
                <div class="dashboard-empty-state small-empty">
                    <span class="dashboard-empty-icon"><i class="bx bx-pie-chart-alt-2"></i></span>
                    <h3>${text.donutEmptyTitle}</h3>
                    <p>${text.donutEmptyText}</p>
                </div>`;
            return;
        }

        const colors = normalized.map((x, i) => x.color || defaultPalette[i % defaultPalette.length]);
        const labels = normalized.map(x => x.categoryName);
        const series = normalized.map(x => Number(x.totalAmount || 0));

        categoryPanel.innerHTML = `
            <div class="dashboard-breakdown-layout">
                <div class="dashboard-breakdown-chart-card">
                    <div class="dashboard-donut-shell">
                        <canvas id="dashboardExpenseDonutChart"></canvas>
                    </div>
                </div>
                <div class="dashboard-breakdown-sidecard">
                    <div class="dashboard-breakdown-summary">
                        <div class="summary-pill summary-pill--highlight">
                            <span>${text.activeCategories}</span>
                            <strong>${normalized.length}</strong>
                        </div>
                    </div>
                    <div class="dashboard-legend-shell">
                        <div class="dashboard-legend-scroll" id="dashboardCategoryLegend"></div>
                    </div>
                </div>
            </div>`;

        const legend = categoryPanel.querySelector("#dashboardCategoryLegend");
        legend.innerHTML = normalized.map((item, index) => {
            const iconClass = item.icon && String(item.icon).trim() ? String(item.icon).trim() : "bx bx-category";
            return `
                <div class="legend-row" data-legend-index="${index}">
                    <div class="legend-left">
                        <span class="legend-icon" style="--legend-color:${colors[index]}"><i class="${iconClass}"></i></span>
                        <div>
                            <strong>${item.categoryName}</strong>
                            <small>${text.shareInPeriod}</small>
                        </div>
                    </div>
                    <div class="legend-right">
                        <strong>${Number(item.percentage || 0).toFixed(2).replace(/\.00$/, "")}%</strong>
                        <small>${formatNumber(item.totalAmount)}</small>
                    </div>
                </div>`;
        }).join("");

        createDonutChart(labels, series, colors, normalized);
        bindLegendHover(colors);
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
        renderLegend(parseJson(donutCanvas.dataset.items, []));
    }

    chips.forEach(btn => btn.addEventListener("click", function () {
        const period = this.dataset.periodChip;
        if (!period || this.classList.contains("active")) return;
        loadPeriod(period);
    }));
});
