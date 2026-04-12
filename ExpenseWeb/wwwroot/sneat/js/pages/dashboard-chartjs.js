document.addEventListener("DOMContentLoaded", function () {
  if (typeof Chart === "undefined") return;

  const viNumber = (value) => Number(value || 0).toLocaleString("vi-VN");
  const money = (value) => `${viNumber(value)} VND`;
  const parseJson = (value) => {
    try { return JSON.parse(value || "[]"); } catch { return []; }
  };

  Chart.defaults.font.family = '"Public Sans", "Segoe UI", sans-serif';
  Chart.defaults.color = "#738372";
  Chart.defaults.plugins.legend.labels.boxWidth = 10;
  Chart.defaults.plugins.legend.labels.boxHeight = 10;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyle = "circle";

  const centerTextPlugin = {
    id: "centerTextPlugin",
    afterDraw(chart, args, opts) {
      if (!opts || !opts.lines || !opts.lines.length) return;
      const meta = chart.getDatasetMeta(0);
      if (!meta || !meta.data || !meta.data.length) return;
      const x = meta.data[0].x;
      const y = meta.data[0].y;
      const ctx = chart.ctx;
      ctx.save();
      opts.lines.forEach((line) => {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = line.color || "#33483b";
        ctx.font = `${line.weight || 700} ${line.size || 16}px Public Sans, sans-serif`;
        ctx.fillText(line.text, x, y + (line.offsetY || 0));
      });
      ctx.restore();
    }
  };

  Chart.register(centerTextPlugin);

  function baseGrid() {
    return {
      color: "rgba(118, 134, 117, 0.12)",
      drawBorder: false,
      tickLength: 0,
      borderDash: [5, 5]
    };
  }

  function createGradient(ctx, area, from, to) {
    const gradient = ctx.createLinearGradient(0, area.top, 0, area.bottom);
    gradient.addColorStop(0, from);
    gradient.addColorStop(1, to);
    return gradient;
  }

  function createCurrencyTicks() {
    return {
      callback: (value) => viNumber(Math.round(value)),
      maxTicksLimit: 6
    };
  }

  function withEdgePoints(labels, values) {
    const safeLabels = Array.isArray(labels) ? [...labels] : [];
    const safeValues = Array.isArray(values) ? values.map((x) => Number(x || 0)) : [];

    if (safeLabels.length >= 2) return { labels: safeLabels, values: safeValues };
    if (safeLabels.length === 1) {
      return {
        labels: ["", safeLabels[0], ""],
        values: [safeValues[0], safeValues[0], safeValues[0]]
      };
    }
    return { labels: ["", ""], values: [0, 0] };
  }

  const balanceCanvas = document.getElementById("reportBalanceChart");
  if (balanceCanvas) {
    const prepared = withEdgePoints(
      parseJson(balanceCanvas.dataset.labels),
      parseJson(balanceCanvas.dataset.balance)
    );

    const ctx = balanceCanvas.getContext("2d");
    new Chart(ctx, {
      type: "line",
      data: {
        labels: prepared.labels,
        datasets: [{
          label: "Số dư",
          data: prepared.values,
          borderColor: "#22b56d",
          borderWidth: 3,
          pointRadius: prepared.values.length <= 3 ? 4 : 3,
          pointHoverRadius: 6,
          pointBackgroundColor: "#ffffff",
          pointBorderColor: "#22b56d",
          pointBorderWidth: 2,
          fill: true,
          tension: 0.38,
          backgroundColor(context) {
            const { chart } = context;
            const { ctx, chartArea } = chart;
            if (!chartArea) return "rgba(34, 181, 109, 0.16)";
            return createGradient(ctx, chartArea, "rgba(34, 181, 109, 0.24)", "rgba(34, 181, 109, 0.03)");
          }
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#24382d",
            padding: 12,
            displayColors: false,
            callbacks: { label: (ctx) => money(ctx.raw) }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxRotation: 0 } },
          y: { grid: baseGrid(), ticks: createCurrencyTicks() }
        }
      }
    });
  }

  const changeCanvas = document.getElementById("reportChangeChart");
  if (changeCanvas) {
    const preparedLabels = parseJson(changeCanvas.dataset.labels);
    const income = parseJson(changeCanvas.dataset.income).map((x) => Number(x || 0));
    const expense = parseJson(changeCanvas.dataset.expense).map((x) => Number(x || 0));
    const labels = preparedLabels.length ? preparedLabels : [""];

    new Chart(changeCanvas.getContext("2d"), {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Thu",
            data: income.length ? income : [0],
            backgroundColor: "rgba(89, 177, 29, 0.88)",
            borderRadius: 10,
            borderSkipped: false,
            maxBarThickness: 24
          },
          {
            label: "Chi",
            data: expense.length ? expense : [0],
            backgroundColor: "rgba(255, 124, 90, 0.92)",
            borderRadius: 10,
            borderSkipped: false,
            maxBarThickness: 24
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            backgroundColor: "#24382d",
            padding: 12,
            callbacks: { label: (ctx) => `${ctx.dataset.label}: ${money(ctx.raw)}` }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: { grid: baseGrid(), ticks: createCurrencyTicks(), beginAtZero: true }
        }
      }
    });
  }

  function renderDonut(canvas, modal = false) {
    if (!canvas) return null;
    const labels = parseJson(canvas.dataset.labels);
    const series = parseJson(canvas.dataset.series).map((x) => Number(x || 0));
    const colors = parseJson(canvas.dataset.colors);
    const total = series.reduce((sum, item) => sum + item, 0);
    const palette = colors.length ? colors : ["#f7a600", "#59b11d", "#7b6ef6", "#5d89f5", "#f46a6a"];

    return new Chart(canvas.getContext("2d"), {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: series.length ? series : [1],
          backgroundColor: series.length ? palette : ["#f0f3ec"],
          borderColor: series.length ? "#ffffff" : "#f0f3ec",
          borderWidth: series.length ? 6 : 0,
          hoverOffset: modal ? 4 : 6,
          spacing: 0,
          cutout: modal ? "68%" : "72%"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        rotation: -90,
        circumference: 360,
        layout: { padding: modal ? 16 : 12 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#24382d",
            padding: 12,
            callbacks: {
              label: (ctx) => `${ctx.label}: ${money(ctx.raw)}`
            }
          },
          centerTextPlugin: {
            lines: [
              { text: viNumber(total), size: modal ? 30 : 24, weight: 900, color: "#33483b", offsetY: -8 },
              { text: modal ? "Tổng chi trong kỳ" : "Chi tiêu", size: modal ? 14 : 12, weight: 700, color: "#7a8b7e", offsetY: 18 }
            ]
          }
        }
      }
    });
  }

  renderDonut(document.getElementById("reportExpenseDonutChart"));
  renderDonut(document.getElementById("reportExpenseDonutChartModal"), true);

  const budgetGrid = document.getElementById("budgetCardsGrid");
  if (budgetGrid) {
    const cards = Array.from(budgetGrid.querySelectorAll(".budget-mini-card"));
    const pageSize = Number(budgetGrid.dataset.pageSize || 4);
    const totalPages = Math.max(1, Math.ceil(cards.length / pageSize));
    const currentNode = document.querySelector("[data-budget-page-current]");
    const prevBtn = document.querySelector("[data-budget-prev]");
    const nextBtn = document.querySelector("[data-budget-next]");
    let currentPage = 1;

    function renderBudgetPage() {
      cards.forEach((card, index) => {
        const page = Math.floor(index / pageSize) + 1;
        card.hidden = page !== currentPage;
      });
      if (currentNode) currentNode.textContent = String(currentPage);
      if (prevBtn) prevBtn.disabled = currentPage <= 1;
      if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    }

    prevBtn?.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage -= 1;
        renderBudgetPage();
      }
    });

    nextBtn?.addEventListener("click", () => {
      if (currentPage < totalPages) {
        currentPage += 1;
        renderBudgetPage();
      }
    });

    renderBudgetPage();
  }

  const filterForm = document.querySelector(".report-filter-form");
  if (filterForm) {
    const startInput = filterForm.querySelector('input[name="startDate"]');
    const endInput = filterForm.querySelector('input[name="endDate"]');
    const monthSelect = filterForm.querySelector('select[name="month"]');
    const yearSelect = filterForm.querySelector('select[name="year"]');
    const granularitySelect = filterForm.querySelector('select[name="granularity"]');

    function toYmd(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }

    function syncBudgetPeriodFromEndDate() {
      if (!endInput?.value) return;
      const end = new Date(endInput.value);
      if (Number.isNaN(end.getTime())) return;
      if (monthSelect) monthSelect.value = String(end.getMonth() + 1);
      if (yearSelect) yearSelect.value = String(end.getFullYear());
    }

    function setActiveQuickButton(range) {
      document.querySelectorAll(".quick-range-btn").forEach((button) => {
        button.classList.toggle("is-active", button.dataset.range === range);
      });
    }

    document.querySelectorAll(".quick-range-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const now = new Date();
        let start = new Date(now);
        let end = new Date(now);
        const range = button.dataset.range;

        if (range === "7d") {
          start.setDate(now.getDate() - 6);
        } else if (range === "30d") {
          start.setDate(now.getDate() - 29);
        } else if (range === "thisMonth") {
          start = new Date(now.getFullYear(), now.getMonth(), 1);
          end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (range === "thisYear") {
          start = new Date(now.getFullYear(), 0, 1);
          end = new Date(now.getFullYear(), 11, 31);
        }

        if (startInput) startInput.value = toYmd(start);
        if (endInput) endInput.value = toYmd(end);
        syncBudgetPeriodFromEndDate();
        setActiveQuickButton(range);
      });
    });

    startInput?.addEventListener("change", () => setActiveQuickButton(""));
    endInput?.addEventListener("change", () => {
      syncBudgetPeriodFromEndDate();
      setActiveQuickButton("");
    });
    granularitySelect?.addEventListener("change", () => setActiveQuickButton(""));
  }
});
