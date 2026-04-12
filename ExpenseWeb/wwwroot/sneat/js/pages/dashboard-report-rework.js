document.addEventListener("DOMContentLoaded", function () {
    if (typeof ApexCharts === "undefined") return;

    const parseDatasetArray = (el, key) => {
        try {
            return JSON.parse(el?.dataset?.[key] || "[]");
        } catch {
            return [];
        }
    };

    const formatNumber = value => Number(value || 0).toLocaleString("vi-VN");
    const formatCurrency = value => `${formatNumber(value)} VND`;
    const axisFormatter = value => formatNumber(value);

    const granularityInput = document.getElementById("granularityInput");
    document.querySelectorAll(".granularity-chip").forEach(button => {
        button.addEventListener("click", function () {
            document.querySelectorAll(".granularity-chip").forEach(item => item.classList.remove("active"));
            this.classList.add("active");
            if (granularityInput) granularityInput.value = this.dataset.value || "day";
        });
    });

    const balanceEl = document.getElementById("reportBalanceChart");
    if (balanceEl) {
        const labels = parseDatasetArray(balanceEl, "labels");
        const balance = parseDatasetArray(balanceEl, "balance");

        if (labels.length) {
            new ApexCharts(balanceEl, {
                series: [{ name: "Balance", data: balance }],
                chart: {
                    type: "area",
                    height: 340,
                    parentHeightOffset: 0,
                    toolbar: { show: false },
                    zoom: { enabled: false }
                },
                stroke: { curve: "smooth", width: 3 },
                colors: ["#1fc777"],
                fill: {
                    type: "gradient",
                    gradient: {
                        shadeIntensity: 0.12,
                        opacityFrom: 0.35,
                        opacityTo: 0.05,
                        stops: [0, 100]
                    }
                },
                grid: {
                    borderColor: "#edf1ea",
                    strokeDashArray: 5,
                    padding: { left: 6, right: 6, top: 0, bottom: 0 }
                },
                dataLabels: { enabled: false },
                markers: {
                    size: 4,
                    hover: { size: 6 },
                    strokeWidth: 2,
                    strokeColors: "#fff"
                },
                xaxis: {
                    categories: labels,
                    axisBorder: { show: false },
                    axisTicks: { show: false },
                    labels: { style: { colors: "#889888", fontSize: "12px" } }
                },
                yaxis: {
                    labels: {
                        formatter: axisFormatter,
                        style: { colors: "#889888", fontSize: "12px" }
                    }
                },
                tooltip: {
                    x: { show: true },
                    y: { formatter: formatCurrency }
                },
                legend: { show: false }
            }).render();
        }
    }

    const changeEl = document.getElementById("reportChangeChart");
    if (changeEl) {
        const labels = parseDatasetArray(changeEl, "labels");
        const income = parseDatasetArray(changeEl, "income");
        const expense = parseDatasetArray(changeEl, "expense");

        if (labels.length) {
            new ApexCharts(changeEl, {
                series: [
                    { name: "Thu", data: income },
                    { name: "Chi", data: expense.map(v => -Number(v || 0)) }
                ],
                chart: {
                    type: "bar",
                    height: 340,
                    parentHeightOffset: 0,
                    toolbar: { show: false },
                    stacked: false
                },
                plotOptions: {
                    bar: {
                        borderRadius: 7,
                        columnWidth: "36%"
                    }
                },
                colors: ["#59b11d", "#ff6f61"],
                dataLabels: { enabled: false },
                grid: {
                    borderColor: "#edf1ea",
                    strokeDashArray: 5,
                    padding: { left: 6, right: 6, top: 0, bottom: 0 }
                },
                xaxis: {
                    categories: labels,
                    axisBorder: { show: false },
                    axisTicks: { show: false },
                    labels: { style: { colors: "#889888", fontSize: "12px" } }
                },
                yaxis: {
                    labels: {
                        formatter: value => axisFormatter(Math.abs(value)),
                        style: { colors: "#889888", fontSize: "12px" }
                    }
                },
                tooltip: {
                    y: { formatter: value => formatCurrency(Math.abs(value)) }
                },
                legend: {
                    position: "bottom",
                    horizontalAlign: "center",
                    markers: { radius: 12 }
                }
            }).render();
        }
    }

    const warmFallbackColors = ["#f7a600", "#ffbe3d", "#f28c28", "#ff6f61", "#8b6cf7", "#3ba89e"];

    function buildSummaryItems(container, labels, series, percents, colors) {
        if (!container) return;
        container.innerHTML = "";

        labels.slice(0, 4).forEach((label, index) => {
            const amount = Number(series[index] || 0);
            const percent = Number(percents[index] || 0);
            const color = colors[index] || warmFallbackColors[index % warmFallbackColors.length];
            const item = document.createElement("div");
            item.className = "period-expense-summary-item";
            item.innerHTML = `
                <div class="left">
                    <span class="dot" style="background:${color}"></span>
                    <div>
                        <div class="name">${label}</div>
                        <div class="meta">${percent.toFixed(2).replace(/\.00$/, "")}%</div>
                    </div>
                </div>
                <div class="amount">${formatCurrency(amount)}</div>
            `;
            container.appendChild(item);
        });
    }

    function renderDonut(selector, opts = {}) {
        const el = document.getElementById(selector);
        if (!el) return;

        const labels = parseDatasetArray(el, "labels");
        const series = parseDatasetArray(el, "series");
        const colors = parseDatasetArray(el, "colors");
        const percents = parseDatasetArray(el, "percents");
        if (!labels.length) return;

        const total = series.reduce((sum, value) => sum + Number(value || 0), 0);
        const palette = (colors && colors.length ? colors : warmFallbackColors).slice(0, Math.max(labels.length, 1));
        const height = opts.modal ? 340 : 320;
        const donutSize = opts.modal ? "70%" : "74%";

        new ApexCharts(el, {
            series,
            labels,
            colors: palette,
            chart: {
                type: "donut",
                height,
                parentHeightOffset: 0,
                toolbar: { show: false }
            },
            stroke: { width: 0 },
            dataLabels: { enabled: false },
            legend: { show: false },
            plotOptions: {
                pie: {
                    donut: {
                        size: donutSize,
                        labels: {
                            show: true,
                            name: {
                                show: true,
                                offsetY: 14,
                                color: "#707f72",
                                fontSize: opts.modal ? "16px" : "14px"
                            },
                            value: {
                                show: true,
                                offsetY: -12,
                                fontSize: opts.modal ? "28px" : "18px",
                                fontWeight: 800,
                                color: "#33493d",
                                formatter: value => formatNumber(value)
                            },
                            total: {
                                show: true,
                                showAlways: true,
                                label: opts.modal ? "Chi tiêu" : "Chi tiêu",
                                color: "#707f72",
                                formatter: () => formatNumber(total)
                            }
                        }
                    }
                }
            },
            tooltip: {
                y: { formatter: formatCurrency }
            }
        }).render();

        if (!opts.modal) {
            buildSummaryItems(document.getElementById("periodExpenseSummary"), labels, series, percents, palette);
        }
    }

    renderDonut("reportExpenseDonutChart");
    renderDonut("reportExpenseDonutChartModal", { modal: true });
});
