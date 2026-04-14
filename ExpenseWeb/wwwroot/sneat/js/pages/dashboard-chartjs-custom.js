document.addEventListener("DOMContentLoaded", function () {
    let cashflowChart = null;
    let donutChart = null;

    function formatMoney(value) {
        return Number(value || 0).toLocaleString("vi-VN") + " VND";
    }

    function formatCompactMoney(value) {
        const n = Number(value || 0);
        const abs = Math.abs(n);

        if (abs >= 1000000000) return (n / 1000000000).toFixed(1).replace(".0", "") + "B";
        if (abs >= 1000000) return (n / 1000000).toFixed(1).replace(".0", "") + "M";
        if (abs >= 1000) return (n / 1000).toFixed(1).replace(".0", "") + "K";
        return n.toLocaleString("vi-VN");
    }

    function parseJsonData(value, fallback = []) {
        try {
            return JSON.parse(value || JSON.stringify(fallback));
        } catch {
            return fallback;
        }
    }

    function buildDefaultColors(count) {
        const palette = [
            "#696cff", "#71dd37", "#ffab00", "#03c3ec", "#ff3e1d",
            "#8592a3", "#233446", "#826af9", "#ff6f91", "#00c9a7"
        ];
        const colors = [];
        for (let i = 0; i < count; i++) colors.push(palette[i % palette.length]);
        return colors;
    }

    function aggregateDonutData(labels, series, colors, icons, limit = 5) {
        const items = labels.map((label, index) => ({
            label,
            value: Number(series[index] || 0),
            color: colors[index],
            icon: icons[index] || ""
        }))
            .filter(x => x.value > 0)
            .sort((a, b) => b.value - a.value);

        if (items.length <= limit) return items;

        const head = items.slice(0, limit - 1);
        const rest = items.slice(limit - 1);
        const otherValue = rest.reduce((sum, item) => sum + item.value, 0);

        head.push({
            label: "Khác",
            value: otherValue,
            color: "#B8C2D1",
            icon: ""
        });

        return head;
    }

    function loadImage(src) {
        return new Promise((resolve) => {
            if (!src) {
                resolve(null);
                return;
            }

            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            img.src = src;
        });
    }

    const doughnutLeaderPlugin = {
        id: "doughnutLeaderPlugin",
        afterDatasetsDraw(chart, args, pluginOptions) {
            const { ctx } = chart;
            const meta = chart.getDatasetMeta(0);
            const dataset = chart.data.datasets[0];
            const icons = pluginOptions?.icons || [];
            const total = dataset.data.reduce((sum, item) => sum + Number(item || 0), 0);

            if (!meta || !meta.data || !meta.data.length || !total) return;

            ctx.save();

            meta.data.forEach((arc, index) => {
                const value = Number(dataset.data[index] || 0);
                if (!value) return;

                const angle = (arc.startAngle + arc.endAngle) / 2;
                const cos = Math.cos(angle);
                const sin = Math.sin(angle);

                const startX = arc.x + cos * (arc.outerRadius - 4);
                const startY = arc.y + sin * (arc.outerRadius - 4);
                const midX = arc.x + cos * (arc.outerRadius + 18);
                const midY = arc.y + sin * (arc.outerRadius + 18);
                const horizontal = cos >= 0 ? 26 : -26;
                const endX = midX + horizontal;
                const endY = midY;
                const color = dataset.backgroundColor[index];

                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.moveTo(startX, startY);
                ctx.lineTo(midX, midY);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                ctx.beginPath();
                ctx.fillStyle = color;
                ctx.arc(endX, endY, 3.5, 0, Math.PI * 2);
                ctx.fill();

                const badgeRadius = 16;
                const badgeX = endX + (cos >= 0 ? 22 : -22);
                const badgeY = endY;

                ctx.beginPath();
                ctx.fillStyle = "#fff";
                ctx.shadowColor = "rgba(67, 89, 113, 0.18)";
                ctx.shadowBlur = 12;
                ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;

                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
                ctx.stroke();

                const iconImage = chart.$iconImages?.[index];
                if (iconImage) {
                    const size = 18;
                    ctx.drawImage(iconImage, badgeX - size / 2, badgeY - size / 2, size, size);
                }

                const percent = ((value / total) * 100).toFixed(1) + "%";
                ctx.font = "600 12px Inter, system-ui, sans-serif";
                ctx.fillStyle = color;
                ctx.textAlign = cos >= 0 ? "left" : "right";
                ctx.textBaseline = "middle";
                ctx.fillText(percent, badgeX + (cos >= 0 ? 24 : -24), badgeY);
            });

            ctx.restore();
        }
    };

    async function renderDonutChart() {
        const canvas = document.getElementById("dashboardExpenseDonutChart");
        if (!canvas || typeof Chart === "undefined") return;

        let labels = parseJsonData(canvas.dataset.labels);
        let series = parseJsonData(canvas.dataset.series);
        let colors = parseJsonData(canvas.dataset.colors);
        let icons = parseJsonData(canvas.dataset.icons);

        if (!labels.length) return;
        if (!colors.length) colors = buildDefaultColors(labels.length);

        const aggregated = aggregateDonutData(labels, series, colors, icons, 5);
        labels = aggregated.map(x => x.label);
        series = aggregated.map(x => x.value);
        colors = aggregated.map(x => x.color);
        icons = aggregated.map(x => x.icon);

        const iconImages = await Promise.all(icons.map(loadImage));

        if (donutChart) donutChart.destroy();

        donutChart = new Chart(canvas, {
            type: "doughnut",
            data: {
                labels,
                datasets: [{
                    data: series,
                    backgroundColor: colors,
                    borderWidth: 0,
                    hoverOffset: 6,
                    spacing: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { top: 26, right: 72, bottom: 26, left: 72 }
                },
                cutout: "64%",
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: { usePointStyle: true, boxWidth: 10, boxHeight: 10, padding: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            label(context) {
                                const label = context.label || "";
                                const value = context.raw || 0;
                                return `${label}: ${formatMoney(value)}`;
                            }
                        }
                    },
                    doughnutLeaderPlugin: { icons }
                }
            },
            plugins: [doughnutLeaderPlugin]
        });

        donutChart.$iconImages = iconImages;
        donutChart.update();
    }

    function renderCashflowChart() {
        const canvas = document.getElementById("dashboardCashflowChart");
        if (!canvas || typeof Chart === "undefined") return;

        const labels = parseJsonData(canvas.dataset.labels);
        const net = parseJsonData(canvas.dataset.net);
        const runningBalance = parseJsonData(canvas.dataset.runningBalance);
        const income = parseJsonData(canvas.dataset.income);
        const expense = parseJsonData(canvas.dataset.expense);

        if (!labels.length) return;

        if (cashflowChart) cashflowChart.destroy();

        cashflowChart = new Chart(canvas, {
            data: {
                labels,
                datasets: [
                    {
                        type: "bar",
                        label: "Biến động kỳ",
                        data: net,
                        backgroundColor: net.map(v => Number(v) >= 0 ? "rgba(113, 221, 55, 0.72)" : "rgba(255, 62, 29, 0.72)"),
                        borderRadius: 8,
                        maxBarThickness: 18,
                        order: 2
                    },
                    {
                        type: "line",
                        label: "Số dư lũy kế",
                        data: runningBalance,
                        borderColor: "#696cff",
                        backgroundColor: "rgba(105, 108, 255, 0.10)",
                        fill: true,
                        tension: 0.35,
                        pointRadius: labels.length > 20 ? 2 : 3,
                        pointHoverRadius: 5,
                        pointBackgroundColor: "#fff",
                        pointBorderColor: "#696cff",
                        pointBorderWidth: 2,
                        borderWidth: 3,
                        order: 1,
                        yAxisID: "y"
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: "index",
                    intersect: false
                },
                layout: {
                    padding: { top: 8, right: 10, left: 6, bottom: 0 }
                },
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: { usePointStyle: true, boxWidth: 10, boxHeight: 10, padding: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            title(items) {
                                return items?.[0]?.label || "";
                            },
                            label(context) {
                                const dataIndex = context.dataIndex;
                                if (context.dataset.label === "Biến động kỳ") {
                                    const value = net[dataIndex] || 0;
                                    const incomeValue = income[dataIndex] || 0;
                                    const expenseValue = expense[dataIndex] || 0;
                                    return [
                                        `Biến động: ${formatMoney(value)}`,
                                        `Thu: ${formatMoney(incomeValue)}`,
                                        `Chi: ${formatMoney(expenseValue)}`
                                    ];
                                }
                                if (context.dataset.label === "Số dư lũy kế") {
                                    return `Số dư: ${formatMoney(context.raw)}`;
                                }
                                return `${context.dataset.label}: ${formatMoney(context.raw)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        offset: true,
                        grid: { display: false },
                        ticks: {
                            autoSkip: true,
                            maxTicksLimit: window.innerWidth < 768 ? 6 : 10,
                            minRotation: 0,
                            maxRotation: 0,
                            padding: 8
                        }
                    },
                    y: {
                        beginAtZero: false,
                        grid: { color: "rgba(67, 89, 113, 0.08)" },
                        ticks: {
                            maxTicksLimit: 6,
                            padding: 8,
                            callback(value) {
                                return formatCompactMoney(value);
                            }
                        }
                    }
                }
            }
        });
    }

    renderCashflowChart();
    renderDonutChart();

    window.addEventListener("resize", function () {
        if (cashflowChart) cashflowChart.resize();
        if (donutChart) donutChart.resize();
    });
});
