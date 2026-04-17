document.addEventListener('DOMContentLoaded', () => {
  const lang = (window.transactionPageLang || 'vi').toLowerCase();
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const t = (vi, en) => (lang === 'en' ? en : vi);
  const qs = (id) => document.getElementById(id);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const parseJson = (id) => {
    try {
      return JSON.parse(qs(id)?.textContent || '[]');
    } catch {
      return [];
    }
  };

  const transactions = parseJson('tx-transactions-json');
  const categories = parseJson('tx-categories-json');
  const wallets = parseJson('tx-wallets-json');

  const state = {
    type: 'all',
    walletId: 'all',
    keyword: '',
    period: 'today',
    from: null,
    to: null,
    anchorDate: startOfDay(findLatestDate(transactions) || new Date()),
    calendarMonth: monthStart(findLatestDate(transactions) || new Date()),
    filtered: [],
    page: 1,
    pageSize: 5,
    charts: { income: null, expense: null },
    detailId: null,
    selectedCalendarDate: null,
    reopenDayDrawerOnDetailClose: false
  };

  const addModalEl = qs('addTransactionModal');
  const detailModalEl = qs('transactionDetailModal');
  const dayOffcanvasEl = qs('transactionDayOffcanvas');
  const addModal = addModalEl ? bootstrap.Modal.getOrCreateInstance(addModalEl) : null;
  const detailModal = detailModalEl ? bootstrap.Modal.getOrCreateInstance(detailModalEl) : null;
  const dayOffcanvas = dayOffcanvasEl ? bootstrap.Offcanvas.getOrCreateInstance(dayOffcanvasEl) : null;

  const fpLocale = lang === 'en' ? 'default' : flatpickr.l10ns.vn;
  const fpBaseConfig = {
    altInput: true,
    altFormat: 'd/m/Y',
    dateFormat: 'Y-m-d',
    locale: fpLocale
  };

  const fromPicker = qs('fromDateFilter') ? flatpickr(qs('fromDateFilter'), {
    ...fpBaseConfig,
    onChange: (selectedDates, dateStr) => {
      state.from = dateStr || null;
      if (state.period === 'custom') refresh();
    }
  }) : null;

  const toPicker = qs('toDateFilter') ? flatpickr(qs('toDateFilter'), {
    ...fpBaseConfig,
    onChange: (selectedDates, dateStr) => {
      state.to = dateStr || null;
      if (state.period === 'custom') refresh();
    }
  }) : null;

  const addDatePicker = qs('addTransactionDate') ? flatpickr(qs('addTransactionDate'), {
    ...fpBaseConfig,
    defaultDate: state.anchorDate
  }) : null;

  const detailDatePicker = qs('detailEditDate') ? flatpickr(qs('detailEditDate'), fpBaseConfig) : null;

  function startOfDay(date) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    return value;
  }

  function monthStart(date) {
    const value = startOfDay(date);
    value.setDate(1);
    return value;
  }

  function addDays(date, amount) {
    const value = startOfDay(date);
    value.setDate(value.getDate() + amount);
    return value;
  }

  function addMonths(date, amount) {
    const value = startOfDay(date);
    value.setDate(1);
    value.setMonth(value.getMonth() + amount);
    return value;
  }

  function formatIso(date) {
    const value = startOfDay(date);
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parseIso(value) {
    if (!value) return null;
    return startOfDay(new Date(`${value}T00:00:00`));
  }

  function formatDate(date) {
    return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatLongDate(date) {
    return date.toLocaleDateString(locale, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function formatMonth(date) {
    return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }

  function formatMoney(value) {
    return `${Number(value || 0).toLocaleString(locale)} VND`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function isImageIcon(icon) {
    return !!icon && (icon.includes('/') || /\.(svg|png|webp|jpe?g)$/i.test(icon));
  }

  function iconMarkup(icon, alt, cls = '') {
    const safeClass = cls ? ` ${cls}` : '';
    if (isImageIcon(icon)) {
      return `<img src="${escapeHtml(icon)}" alt="${escapeHtml(alt || 'icon')}" class="tx-inline-icon${safeClass}" />`;
    }
    return `<i class="${escapeHtml(icon || 'bx bx-category')}${safeClass}"></i>`;
  }

  function alphaColor(hex, alpha) {
    if (!hex || !hex.startsWith('#')) return `rgba(105,108,255,${alpha})`;
    const normalized = hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
    const raw = Number.parseInt(normalized.slice(1), 16);
    const red = (raw >> 16) & 255;
    const green = (raw >> 8) & 255;
    const blue = raw & 255;
    return `rgba(${red},${green},${blue},${alpha})`;
  }

  function recurringText(value) {
    const map = {
      daily: t('Hàng ngày', 'Daily'),
      weekly: t('Hàng tuần', 'Weekly'),
      monthly: t('Hàng tháng', 'Monthly'),
      yearly: t('Hàng năm', 'Yearly')
    };
    return map[value] || t('Một lần', 'One-time');
  }

  function findLatestDate(items) {
    if (!items.length) return null;
    return items
      .map((item) => parseIso(item.transactionDate))
      .filter(Boolean)
      .sort((a, b) => b - a)[0];
  }

  function getCategory(categoryId) {
    return categories.find((item) => item.category_id === categoryId) || null;
  }

  function getWallet(walletId) {
    return wallets.find((item) => item.wallet_id === walletId) || null;
  }

  function getTransaction(transactionId) {
    return transactions.find((item) => item.id === transactionId) || null;
  }

  function buildUiTransaction(raw) {
    const category = getCategory(raw.category_id);
    const wallet = getWallet(raw.wallet_id);
    const currency = wallet?.currency || 'VND';
    const amount = Number(raw.amount || 0);
    const signedPrefix = raw.transaction_type === 'income' ? '+' : '-';

    return {
      id: raw.transaction_id,
      walletId: raw.wallet_id,
      walletName: wallet?.wallet_name || raw.wallet_name || 'N/A',
      categoryId: raw.category_id,
      categoryName: category?.category_name || raw.category_name || t('Khác', 'Other'),
      categoryIcon: category?.icon || raw.category_icon || 'bx bx-category',
      categoryColor: category?.color || raw.category_color || '#8592A3',
      transactionType: raw.transaction_type,
      amountValue: amount,
      amountText: `${signedPrefix}${amount.toLocaleString(locale)} ${currency}`,
      transactionDate: String(raw.transaction_date || '').slice(0, 10),
      transactionDateText: raw.transaction_date ? formatDate(parseIso(String(raw.transaction_date).slice(0, 10))) : '--/--/----',
      note: raw.note && raw.note.trim() ? raw.note.trim() : t('Không có ghi chú', 'No note'),
      recurringBadgeText: raw.is_recurring ? recurringText(raw.recur_interval) : t('Một lần', 'One-time'),
      currency
    };
  }

  function replaceTransaction(raw) {
    const next = buildUiTransaction(raw);
    const index = transactions.findIndex((item) => item.id === next.id);
    if (index >= 0) {
      transactions[index] = next;
    } else {
      transactions.unshift(next);
    }
  }

  function removeTransaction(transactionId) {
    const index = transactions.findIndex((item) => item.id === transactionId);
    if (index >= 0) transactions.splice(index, 1);
  }

  function filterByBaseConditions(items) {
    return items.filter((item) => {
      if (state.type !== 'all' && item.transactionType !== state.type) return false;
      if (state.walletId !== 'all' && item.walletId !== state.walletId) return false;
      if (state.keyword) {
        const haystack = `${item.note} ${item.categoryName} ${item.walletName}`.toLowerCase();
        if (!haystack.includes(state.keyword)) return false;
      }
      return true;
    });
  }

  function getPeriodRange() {
    const anchor = startOfDay(state.anchorDate);

    if (state.period === 'today') {
      return { from: anchor, to: anchor };
    }

    if (state.period === 'week') {
      return { from: addDays(anchor, -6), to: anchor };
    }

    if (state.period === 'month') {
      const from = monthStart(anchor);
      const to = addDays(addMonths(from, 1), -1);
      return { from, to };
    }

    if (state.period === 'custom') {
      const from = state.from ? parseIso(state.from) : null;
      const to = state.to ? parseIso(state.to) : null;
      return { from, to };
    }

    return { from: null, to: null };
  }

  function applyPeriodFilter(items) {
    const range = getPeriodRange();
    return items
      .filter((item) => {
        const date = parseIso(item.transactionDate);
        if (!date) return false;
        if (range.from && date < range.from) return false;
        if (range.to && date > range.to) return false;
        return true;
      })
      .sort((left, right) => `${right.transactionDate}${right.id}`.localeCompare(`${left.transactionDate}${left.id}`));
  }

  function refreshFilteredState() {
    state.filtered = applyPeriodFilter(filterByBaseConditions(transactions));
    const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;
  }

  function renderLegend(container, groups) {
    if (!container) return;
    if (!groups.length) {
      container.innerHTML = `<div class="tx-summary-empty">${t('Chưa có dữ liệu phù hợp.', 'No matching data.')}</div>`;
      return;
    }

    const total = groups.reduce((sum, item) => sum + item.value, 0);
    const itemsHtml = groups.map((item) => `
      <div class="tx-summary-item">
        <div class="tx-summary-item-left">
          <span class="tx-summary-dot" style="background:${item.color}"></span>
          <span class="tx-summary-name">${escapeHtml(item.name)}</span>
        </div>
        <div class="tx-summary-item-right">
          <strong>${formatMoney(item.value)}</strong>
          <span>${total > 0 ? `${((item.value / total) * 100).toFixed(1).replace('.0', '')}%` : '0%'}</span>
        </div>
      </div>
    `).join('');

    container.innerHTML = `${itemsHtml}
      <div class="tx-summary-total-row">
        <span>${t('Tổng cộng', 'Total')}</span>
        <strong>${formatMoney(total)}</strong>
      </div>`;
  }

  function buildCategoryGroups(type) {
    const bucket = new Map();
    state.filtered.filter((item) => item.transactionType === type).forEach((item) => {
      const key = item.categoryId || item.categoryName;
      if (!bucket.has(key)) {
        bucket.set(key, {
          name: item.categoryName,
          value: 0,
          color: item.categoryColor || '#8592A3',
          icon: item.categoryIcon || ''
        });
      }
      bucket.get(key).value += Number(item.amountValue || 0);
    });
    return [...bucket.values()].sort((left, right) => right.value - left.value).slice(0, 5);
  }

  async function renderChart(kind, canvasId, totalId, legendId) {
    const canvas = qs(canvasId);
    if (!canvas) return;

    const groups = buildCategoryGroups(kind);
    const total = groups.reduce((sum, item) => sum + item.value, 0);
    if (qs(totalId)) qs(totalId).textContent = formatMoney(total);
    renderLegend(qs(legendId), groups);

    if (window.TransactionDonutCharts?.render) {
      state.charts[kind] = await window.TransactionDonutCharts.render({
        canvas,
        chart: state.charts[kind],
        items: groups,
        locale
      });
      return;
    }

    if (state.charts[kind]) {
      state.charts[kind].destroy();
      state.charts[kind] = null;
    }

    state.charts[kind] = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: groups.map((item) => item.name),
        datasets: [{
          data: groups.map((item) => item.value),
          backgroundColor: groups.map((item) => item.color),
          borderColor: '#ffffff',
          borderWidth: 4,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '66%',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${formatMoney(ctx.raw)}`
            }
          }
        }
      }
    });
  }

  function renderPagination() {
    const container = qs('transactionPagination');
    if (!container) return;

    const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
    if (state.filtered.length <= state.pageSize) {
      container.innerHTML = '';
      return;
    }

    let html = '';
    for (let page = 1; page <= totalPages; page += 1) {
      html += `<button type="button" class="${page === state.page ? 'active' : ''}" data-page="${page}">${page}</button>`;
    }
    container.innerHTML = html;

    qsa('button[data-page]', container).forEach((button) => {
      button.addEventListener('click', () => {
        state.page = Number(button.dataset.page || '1');
        renderList();
      });
    });
  }

  function renderList() {
    const shell = qs('transactionListShell');
    const empty = qs('transactionEmptyState');
    if (!shell || !empty) return;

    if (!state.filtered.length) {
      shell.innerHTML = '';
      empty.classList.remove('d-none');
      qs('transactionPagination').innerHTML = '';
      return;
    }

    empty.classList.add('d-none');
    const start = (state.page - 1) * state.pageSize;
    const pageItems = state.filtered.slice(start, start + state.pageSize);

    shell.innerHTML = pageItems.map((item) => `
      <div class="tx-row-card">
        <div class="tx-main">
          <div class="tx-main-icon" style="background:${alphaColor(item.categoryColor, 0.15)}; color:${item.categoryColor}">
            ${iconMarkup(item.categoryIcon, item.categoryName)}
          </div>
          <div class="tx-main-copy">
            <h6>${escapeHtml(item.note)}</h6>
          </div>
        </div>
        <div>
          <span class="tx-pill" style="background:${alphaColor(item.categoryColor, 0.12)}; color:${item.categoryColor}">
            ${iconMarkup(item.categoryIcon, item.categoryName, 'tx-inline-icon-sm')}
            ${escapeHtml(item.categoryName)}
          </span>
        </div>
        <div class="tx-meta-col">
          <span>${escapeHtml(item.transactionDateText)}</span>
        </div>
        <div class="tx-meta-col">
          <span>${escapeHtml(item.recurringBadgeText)}</span>
        </div>
        <div class="tx-amount ${item.transactionType === 'income' ? 'income' : 'expense'}">${escapeHtml(item.amountText)}</div>
        <div class="tx-actions">
          <button type="button" class="tx-action-btn view" data-action="view" data-id="${item.id}" title="${t('Xem chi tiết', 'View')}">
            <i class="bx bx-show"></i>
          </button>
          <button type="button" class="tx-action-btn delete" data-action="delete" data-id="${item.id}" title="${t('Xóa', 'Delete')}">
            <i class="bx bx-trash"></i>
          </button>
        </div>
      </div>
    `).join('');

    qsa('[data-action="view"]', shell).forEach((button) => button.addEventListener('click', () => openDetail(button.dataset.id)));
    qsa('[data-action="delete"]', shell).forEach((button) => button.addEventListener('click', () => deleteTransaction(button.dataset.id)));
    renderPagination();
  }

  function renderPeriodAssist() {
    const dayCard = qs('dayNavigatorCard');
    const customCard = qs('customDateRangeWrap');
    const pill = qs('currentDayPill');
    const hint = qs('periodAssistText');
    const prevButton = qs('dayPrevBtn');
    const nextButton = qs('dayNextBtn');

    if (!dayCard || !customCard || !pill || !hint || !prevButton || !nextButton) return;

    dayCard.classList.toggle('is-active', state.period !== 'custom');
    dayCard.classList.toggle('is-inactive', state.period === 'custom');
    customCard.classList.toggle('is-active', state.period === 'custom');
    customCard.classList.toggle('is-inactive', state.period !== 'custom');

    const customDisabled = state.period !== 'custom';
    [qs('fromDateFilter'), qs('toDateFilter')].forEach((input) => {
      if (input) input.disabled = customDisabled;
    });
    prevButton.disabled = state.period === 'custom';
    nextButton.disabled = state.period === 'custom';

    if (state.period === 'today') {
      pill.textContent = formatLongDate(state.anchorDate);
      hint.textContent = t('Điều hướng theo ngày đang xem', 'Navigate by the current day');
      return;
    }

    if (state.period === 'week') {
      const range = getPeriodRange();
      pill.textContent = `${formatDate(range.from)} - ${formatDate(range.to)}`;
      hint.textContent = t('Mỗi lần di chuyển là 7 ngày', 'Each step moves by 7 days');
      return;
    }

    if (state.period === 'month') {
      pill.textContent = formatMonth(state.anchorDate);
      hint.textContent = t('Mỗi lần di chuyển là 1 tháng', 'Each step moves by 1 month');
      return;
    }

    const fromText = state.from ? formatDate(parseIso(state.from)) : '--/--/----';
    const toText = state.to ? formatDate(parseIso(state.to)) : '--/--/----';
    pill.textContent = `${fromText} - ${toText}`;
    hint.textContent = t('Hãy chọn khoảng ngày tùy chọn', 'Choose your custom range');
  }

  function compactMoney(value) {
    const number = Math.abs(Number(value || 0));
    if (number >= 1000000) {
      return `${(number / 1000000).toLocaleString(locale, { maximumFractionDigits: 1 })}M`;
    }
    if (number >= 1000) {
      return `${Math.round(number / 1000)}k`;
    }
    return Number(number).toLocaleString(locale);
  }

  function buildCalendarDayMap() {
    const map = new Map();
    filterByBaseConditions(transactions).forEach((item) => {
      if (!map.has(item.transactionDate)) {
        map.set(item.transactionDate, {
          count: 0,
          incomeCount: 0,
          expenseCount: 0,
          incomeAmount: 0,
          expenseAmount: 0
        });
      }
      const bucket = map.get(item.transactionDate);
      bucket.count += 1;
      if (item.transactionType === 'income') {
        bucket.incomeCount += 1;
        bucket.incomeAmount += Number(item.amountValue || 0);
      } else {
        bucket.expenseCount += 1;
        bucket.expenseAmount += Number(item.amountValue || 0);
      }
    });
    return map;
  }

  function calendarBucketStatus(bucket) {
    if (!bucket) return 'empty';
    if (bucket.incomeCount && bucket.expenseCount) return 'mix';
    if (bucket.incomeCount) return 'income';
    if (bucket.expenseCount) return 'expense';
    return 'empty';
  }

  function calendarStatusLabel(status) {
    if (status === 'income') return t('Có thu', 'Income');
    if (status === 'expense') return t('Có chi', 'Expense');
    if (status === 'mix') return t('Cả hai', 'Both');
    return t('Trống', 'Empty');
  }

  function renderCalendar() {
    const grid = qs('transactionMiniCalendarGrid');
    const title = qs('calendarTitle');
    if (!grid || !title) return;

    const currentMonth = monthStart(state.calendarMonth);
    const firstDay = monthStart(currentMonth);
    const startWeekDay = firstDay.getDay();
    const gridStart = addDays(firstDay, -startWeekDay);
    const dayMap = buildCalendarDayMap();
    const selectedIso = state.selectedCalendarDate || formatIso(state.anchorDate);
    const todayIso = formatIso(new Date());

    title.textContent = formatMonth(currentMonth);

    let html = '';
    for (let offset = 0; offset < 42; offset += 1) {
      const date = addDays(gridStart, offset);
      const isoDate = formatIso(date);
      const bucket = dayMap.get(isoDate);
      const status = calendarBucketStatus(bucket);
      const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
      const isSelected = isoDate === selectedIso;
      const isToday = isoDate === todayIso;
      const totalCount = Number(bucket?.count || 0);
      const totalClass = status === 'mix'
        ? 'mix'
        : status === 'income'
          ? 'income'
          : status === 'expense'
            ? 'expense'
            : '';
      const chips = bucket
        ? `
            ${bucket.incomeCount ? `<span class="tx-day-chip is-income"><i class="mini-dot" style="background:#28c76f"></i><b>${t('Thu', 'In')} ${bucket.incomeCount}</b></span>` : ''}
            ${bucket.expenseCount ? `<span class="tx-day-chip is-expense"><i class="mini-dot" style="background:#ff5c39"></i><b>${t('Chi', 'Out')} ${bucket.expenseCount}</b></span>` : ''}
          `
        : `<span class="tx-day-chip empty">${t('Không có giao dịch', 'No transactions')}</span>`;
      html += `
        <button type="button" class="tx-calendar-day ${!isCurrentMonth ? 'is-muted' : ''} ${isSelected ? 'is-selected' : ''} ${isToday ? 'is-today' : ''} ${bucket ? 'has-data' : ''}" data-date="${isoDate}">
          <span class="tx-calendar-day-top">
            <span class="tx-calendar-day-number">${date.getDate()}</span>
            <span class="tx-calendar-day-meta">
              <span class="tx-day-count">${bucket ? `${bucket.count} ${t('gd', 'tx')}` : `0 ${t('gd', 'tx')}`}</span>
              <span class="tx-day-status ${status !== 'empty' ? status : ''}">${status !== 'empty' ? '<i></i>' : ''}${calendarStatusLabel(status)}</span>
            </span>
          </span>
          <span class="tx-calendar-day-body">
            <span class="tx-day-chips">${chips}</span>
          </span>
          <span class="tx-calendar-day-footer">
            <span class="tx-day-total ${totalClass}">${t('Tổng giao dịch', 'Transactions')}<span class="value">${bucket ? `${totalCount} ${t('giao dịch', 'transactions')}` : `0 ${t('giao dịch', 'transactions')}`}</span></span>
          </span>
        </button>
      `;
    }

    grid.innerHTML = html;
    qsa('[data-date]', grid).forEach((button) => {
      button.addEventListener('click', () => openDay(button.dataset.date));
    });
  }

  function renderDayDrawer(dateText) {
    const date = parseIso(dateText);
    const items = filterByBaseConditions(transactions)
      .filter((item) => item.transactionDate === dateText)
      .sort((left, right) => right.id.localeCompare(left.id));

    const incomeTotal = items
      .filter((item) => item.transactionType === 'income')
      .reduce((sum, item) => sum + Number(item.amountValue || 0), 0);
    const expenseTotal = items
      .filter((item) => item.transactionType === 'expense')
      .reduce((sum, item) => sum + Number(item.amountValue || 0), 0);

    if (qs('transactionDayTitle')) qs('transactionDayTitle').textContent = t('Giao dịch trong ngày', 'Transactions of day');
    if (qs('transactionDaySubTitle')) qs('transactionDaySubTitle').textContent = formatLongDate(date);
    if (qs('dayStatCount')) qs('dayStatCount').textContent = String(items.length);
    if (qs('dayStatIncome')) qs('dayStatIncome').textContent = formatMoney(incomeTotal);
    if (qs('dayStatExpense')) qs('dayStatExpense').textContent = formatMoney(expenseTotal);

    const summaryCard = qs('transactionDaySummaryCard');
    const summaryValue = qs('transactionDaySummaryValue');
    const hintCard = qs('transactionDayHintCard');
    if (summaryCard && summaryValue) {
      summaryCard.classList.toggle('is-empty', !items.length);
      summaryValue.textContent = items.length
        ? `${items.length} ${t('giao dịch', 'transactions')} · ${t('Thu', 'In')} ${formatMoney(incomeTotal)} · ${t('Chi', 'Out')} ${formatMoney(expenseTotal)}`
        : t('Không có giao dịch trong ngày này.', 'No transactions for this day.');
    }
    if (hintCard) {
      hintCard.classList.toggle('is-empty', !items.length);
      hintCard.textContent = items.length
        ? t('Chạm vào từng giao dịch để mở popup chi tiết.', 'Tap any transaction to open detail popup.')
        : t('Bấm ra ngoài để đóng bảng này.', 'Tap outside to close this panel.');
    }

    const list = qs('transactionDayList');
    if (!list) return;

    if (!items.length) {
      list.innerHTML = '';
      return;
    }

    list.innerHTML = items.map((item) => {
      const badgeText = item.transactionType === 'income' ? t('Thu nhập', 'Income') : t('Chi tiêu', 'Expense');
      return `
        <button type="button" class="tx-day-item" data-id="${item.id}">
          <div class="tx-day-item-icon" style="background:${alphaColor(item.categoryColor, 0.15)}; color:${item.categoryColor}">
            ${iconMarkup(item.categoryIcon, item.categoryName)}
          </div>
          <div class="tx-day-item-body">
            <div class="tx-day-item-title">
              <strong>${escapeHtml(item.note)}</strong>
              <span class="tx-day-item-badge">${badgeText}</span>
            </div>
            <div class="tx-day-item-meta">
              <span>${escapeHtml(item.categoryName)}</span>
              <span>${escapeHtml(item.walletName)}</span>
              <span>${escapeHtml(item.recurringBadgeText)}</span>
            </div>
          </div>
          <div class="tx-day-item-amount ${item.transactionType === 'income' ? 'income' : 'expense'}">
            ${escapeHtml(item.amountText)}
            <small>${escapeHtml(item.transactionDateText)}</small>
          </div>
        </button>
      `;
    }).join('');

    qsa('[data-id]', list).forEach((button) => {
      button.addEventListener('click', () => {
        state.reopenDayDrawerOnDetailClose = true;
        if (dayOffcanvas) dayOffcanvas.hide();
        openDetail(button.dataset.id);
      });
    });
  }

  function syncAddPreview() {
    const wallet = getWallet(qs('addTransactionWallet')?.value);
    const categoryId = qs('addTransactionCategoryId')?.value;
    const category = getCategory(categoryId);
    const amount = Number(qs('addTransactionAmount')?.value || 0);
    const type = qs('addTransactionType')?.value || 'expense';
    const note = (qs('addTransactionNote')?.value || '').trim();
    const repeat = qs('addTransactionRecurrence')?.value || '';
    const date = parseIso(qs('addTransactionDate')?.value) || state.anchorDate;
    const sign = type === 'income' ? '+' : '-';

    if (qs('addPreviewIconWrap')) {
      const color = category?.color || '#8592A3';
      qs('addPreviewIconWrap').style.background = alphaColor(color, 0.18);
      qs('addPreviewIconWrap').style.color = color;
    }
    if (qs('addPreviewIcon')) qs('addPreviewIcon').innerHTML = iconMarkup(category?.icon, category?.category_name || 'icon');
    if (qs('addPreviewNote')) qs('addPreviewNote').textContent = note || t('Chưa có ghi chú cho giao dịch này.', 'No note yet.');
    if (qs('addPreviewAmount')) qs('addPreviewAmount').textContent = `${sign}${amount.toLocaleString(locale)} ${wallet?.currency || 'VND'}`;
    if (qs('addPreviewCategory')) qs('addPreviewCategory').textContent = category?.category_name || '---';
    if (qs('addPreviewWallet')) qs('addPreviewWallet').textContent = wallet?.wallet_name || '---';
    if (qs('addPreviewDate')) qs('addPreviewDate').textContent = formatDate(date);
    if (qs('addPreviewRepeat')) qs('addPreviewRepeat').textContent = repeat ? recurringText(repeat) : t('Không lặp', 'No repeat');
  }

  function syncDetailPreview() {
    const transaction = getTransaction(state.detailId);
    if (!transaction) return;

    const wallet = getWallet(qs('detailEditWallet')?.value || transaction.walletId);
    const categoryId = qs('detailEditCategoryId')?.value || transaction.categoryId;
    const category = getCategory(categoryId);
    const amount = Number(qs('detailEditAmount')?.value || transaction.amountValue || 0);
    const type = qs('detailEditType')?.value || transaction.transactionType;
    const note = (qs('detailEditNote')?.value || '').trim();
    const repeat = qs('detailEditRecurrence')?.value || '';
    const date = parseIso(qs('detailEditDate')?.value || transaction.transactionDate) || state.anchorDate;
    const sign = type === 'income' ? '+' : '-';

    if (qs('detailBadgeText')) qs('detailBadgeText').textContent = repeat ? recurringText(repeat) : t('Một lần', 'One-time');
    if (qs('detailHeroIconWrap')) {
      const color = category?.color || transaction.categoryColor || '#8592A3';
      qs('detailHeroIconWrap').style.background = alphaColor(color, 0.18);
      qs('detailHeroIconWrap').style.color = color;
    }
    if (qs('detailHeroIcon')) qs('detailHeroIcon').innerHTML = iconMarkup(category?.icon || transaction.categoryIcon, category?.category_name || transaction.categoryName);
    if (qs('detailNoteText')) qs('detailNoteText').textContent = note || t('Không có ghi chú', 'No note');
    if (qs('detailAmountText')) qs('detailAmountText').textContent = `${sign}${amount.toLocaleString(locale)} ${wallet?.currency || transaction.currency || 'VND'}`;
    if (qs('detailCategoryText')) qs('detailCategoryText').textContent = category?.category_name || transaction.categoryName;
    if (qs('detailWalletText')) qs('detailWalletText').textContent = wallet?.wallet_name || transaction.walletName;
    if (qs('detailDateText')) qs('detailDateText').textContent = formatDate(date);
    if (qs('detailTypeText')) qs('detailTypeText').textContent = type === 'income' ? t('Thu nhập', 'Income') : t('Chi tiêu', 'Expense');
  }

  function applyTypeToggle(containerId, hiddenInputId, initialValue, onChange) {
    const container = qs(containerId);
    const hidden = qs(hiddenInputId);
    if (!container || !hidden) return;

    const update = (value) => {
      hidden.value = value;
      qsa('button[data-value]', container).forEach((button) => {
        button.classList.toggle('active', button.dataset.value === value);
      });
      if (typeof onChange === 'function') onChange();
    };

    qsa('button[data-value]', container).forEach((button) => {
      button.addEventListener('click', () => update(button.dataset.value || 'expense'));
    });

    update(initialValue);
  }

  function selectCategory(mode, button) {
    const grid = qs(mode === 'add' ? 'addCategoryGrid' : 'detailCategoryGrid');
    const idInput = qs(mode === 'add' ? 'addTransactionCategoryId' : 'detailEditCategoryId');
    const iconInput = qs(mode === 'add' ? 'addTransactionCategoryIcon' : 'detailEditCategoryIcon');
    const colorInput = qs(mode === 'add' ? 'addTransactionCategoryColor' : 'detailEditCategoryColor');
    if (!grid || !idInput || !iconInput || !colorInput || !button) return;

    qsa('.tx-category-chip', grid).forEach((chip) => chip.classList.remove('active'));
    button.classList.add('active');
    idInput.value = button.dataset.id || '';
    iconInput.value = button.dataset.icon || '';
    colorInput.value = button.dataset.color || '';
    if (mode === 'add') {
      syncAddPreview();
    } else {
      syncDetailPreview();
    }
  }

  function resetAddForm() {
    if (qs('addTransactionWallet')) qs('addTransactionWallet').selectedIndex = 0;
    if (qs('addTransactionAmount')) qs('addTransactionAmount').value = '';
    if (qs('addTransactionNote')) qs('addTransactionNote').value = '';
    if (qs('addTransactionRecurrence')) qs('addTransactionRecurrence').value = '';
    if (addDatePicker) addDatePicker.setDate(state.anchorDate, true);
    applyTypeToggle('addTypeSwitch', 'addTransactionType', 'expense', syncAddPreview);

    const firstCategory = qs('#addCategoryGrid .tx-category-chip');
    if (firstCategory) selectCategory('add', firstCategory);
    syncAddPreview();
  }

  function populateDetailForm(transactionId) {
    const transaction = getTransaction(transactionId);
    if (!transaction) return;

    state.detailId = transactionId;
    if (qs('detailEditWallet')) qs('detailEditWallet').value = transaction.walletId;
    if (qs('detailEditAmount')) qs('detailEditAmount').value = transaction.amountValue;
    if (detailDatePicker) detailDatePicker.setDate(transaction.transactionDate, true);
    if (qs('detailEditRecurrence')) {
      const recurringValue = transaction.recurringBadgeText === t('Một lần', 'One-time') ? '' : reverseRecurringText(transaction.recurringBadgeText);
      qs('detailEditRecurrence').value = recurringValue;
    }
    if (qs('detailEditNote')) qs('detailEditNote').value = transaction.note === t('Không có ghi chú', 'No note') ? '' : transaction.note;
    applyTypeToggle('detailTypeSwitch', 'detailEditType', transaction.transactionType, syncDetailPreview);

    const categoryButton = qsa('#detailCategoryGrid .tx-category-chip').find((button) => button.dataset.id === transaction.categoryId);
    if (categoryButton) selectCategory('detail', categoryButton);
    syncDetailPreview();
  }

  function reverseRecurringText(value) {
    const map = {
      [t('Hàng ngày', 'Daily')]: 'daily',
      [t('Hàng tuần', 'Weekly')]: 'weekly',
      [t('Hàng tháng', 'Monthly')]: 'monthly',
      [t('Hàng năm', 'Yearly')]: 'yearly'
    };
    return map[value] || '';
  }

  function buildCreatePayload() {
    return {
      wallet_id: qs('addTransactionWallet')?.value || '',
      category_id: qs('addTransactionCategoryId')?.value || qs('#addCategoryGrid .tx-category-chip.active')?.dataset.id || '',
      transaction_type: qs('addTransactionType')?.value || 'expense',
      amount: Number(qs('addTransactionAmount')?.value || 0),
      transaction_date: qs('addTransactionDate')?.value || '',
      note: (qs('addTransactionNote')?.value || '').trim() || null,
      is_recurring: !!qs('addTransactionRecurrence')?.value,
      recur_interval: qs('addTransactionRecurrence')?.value || null
    };
  }

  function buildUpdatePayload() {
    return {
      wallet_id: qs('detailEditWallet')?.value || null,
      category_id: qs('detailEditCategoryId')?.value || qs('#detailCategoryGrid .tx-category-chip.active')?.dataset.id || null,
      transaction_type: qs('detailEditType')?.value || null,
      amount: Number(qs('detailEditAmount')?.value || 0),
      transaction_date: qs('detailEditDate')?.value || null,
      note: (qs('detailEditNote')?.value || '').trim(),
      is_recurring: !!qs('detailEditRecurrence')?.value,
      recur_interval: qs('detailEditRecurrence')?.value || null
    };
  }

  function validatePayload(payload) {
    if (!payload.wallet_id) return t('Vui lòng chọn ví.', 'Please choose a wallet.');
    if (!payload.category_id) return t('Vui lòng chọn danh mục.', 'Please choose a category.');
    if (!payload.transaction_type) return t('Vui lòng chọn loại giao dịch.', 'Please choose a transaction type.');
    if (!payload.amount || payload.amount <= 0) return t('Số tiền phải lớn hơn 0.', 'Amount must be greater than 0.');
    if (!payload.transaction_date) return t('Vui lòng chọn ngày giao dịch.', 'Please choose the transaction date.');
    if (payload.is_recurring && !payload.recur_interval) return t('Vui lòng chọn chu kỳ lặp.', 'Please choose recurrence interval.');
    return null;
  }

  async function jsonFetch(url, options = {}) {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      ...options
    });

    const data = await response.json().catch(() => ({ success: false, message: t('Có lỗi xảy ra.', 'Something went wrong.') }));
    if (!response.ok || data.success === false) {
      throw new Error(data.message || t('Có lỗi xảy ra.', 'Something went wrong.'));
    }
    return data;
  }

  function showToast(id) {
    const element = qs(id);
    if (!element) return;
    bootstrap.Toast.getOrCreateInstance(element).show();
  }

  async function createTransaction() {
    const payload = buildCreatePayload();
    const validationError = validatePayload(payload);
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      const result = await jsonFetch('/Transaction/CreateAjax', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      replaceTransaction(result.data);
      if (addModal) addModal.hide();
      resetAddForm();
      showToast('transactionToastSaved');
      refresh();
    } catch (error) {
      alert(error.message || t('Không thể thêm giao dịch.', 'Cannot create transaction.'));
    }
  }

  async function updateTransaction() {
    if (!state.detailId) return;
    const payload = buildUpdatePayload();
    const validationError = validatePayload(payload);
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      const result = await jsonFetch(`/Transaction/UpdateAjax?id=${encodeURIComponent(state.detailId)}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      replaceTransaction(result.data);
      if (detailModal) detailModal.hide();
      showToast('transactionToastUpdated');
      refresh();
    } catch (error) {
      alert(error.message || t('Không thể cập nhật giao dịch.', 'Cannot update transaction.'));
    }
  }

  async function deleteTransaction(transactionId) {
    const id = transactionId || state.detailId;
    if (!id) return;
    const confirmed = window.confirm(t('Bạn có chắc muốn xóa giao dịch này?', 'Are you sure you want to delete this transaction?'));
    if (!confirmed) return;

    try {
      await jsonFetch(`/Transaction/DeleteAjax?id=${encodeURIComponent(id)}`, {
        method: 'DELETE'
      });
      removeTransaction(id);
      if (detailModal && state.detailId === id) detailModal.hide();
      state.detailId = null;
      showToast('transactionToastDeleted');
      refresh();
    } catch (error) {
      alert(error.message || t('Không thể xóa giao dịch.', 'Cannot delete transaction.'));
    }
  }

  function exportVisibleTransactions() {
    if (!state.filtered.length) {
      alert(t('Không có dữ liệu để xuất.', 'No data to export.'));
      return;
    }

    const rows = [
      ['Date', 'Type', 'Category', 'Wallet', 'Amount', 'Currency', 'Note']
    ];

    state.filtered.forEach((item) => {
      rows.push([
        item.transactionDate,
        item.transactionType,
        item.categoryName,
        item.walletName,
        String(item.amountValue),
        item.currency,
        item.note === t('Không có ghi chú', 'No note') ? '' : item.note
      ]);
    });

    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function openDay(dateText) {
    state.selectedCalendarDate = dateText;
    state.anchorDate = parseIso(dateText) || state.anchorDate;
    state.calendarMonth = monthStart(state.anchorDate);
    renderPeriodAssist();
    renderCalendar();
    renderDayDrawer(dateText);
    if (dayOffcanvas) dayOffcanvas.show();
  }

  function openDetail(transactionId) {
    populateDetailForm(transactionId);
    if (detailModal) detailModal.show();
  }

  function moveAnchor(direction) {
    if (state.period === 'today') {
      state.anchorDate = addDays(state.anchorDate, direction);
    } else if (state.period === 'week') {
      state.anchorDate = addDays(state.anchorDate, direction * 7);
    } else if (state.period === 'month') {
      state.anchorDate = addMonths(state.anchorDate, direction);
    }
    refresh();
  }

  function refresh() {
    refreshFilteredState();
    renderPeriodAssist();
    renderChart('income', 'incomeDonutChart', 'incomeDonutTotal', 'incomeLegend');
    renderChart('expense', 'expenseDonutChart', 'expenseDonutTotal', 'expenseLegend');
    renderList();
    renderCalendar();
    syncAddPreview();
    if (state.detailId) syncDetailPreview();
  }

  function bindEvents() {
    qsa('#transactionTypeTabs button[data-type]').forEach((button) => {
      button.addEventListener('click', () => {
        qsa('#transactionTypeTabs button[data-type]').forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        state.type = button.dataset.type || 'all';
        refresh();
      });
    });

    if (qs('walletFilter')) {
      qs('walletFilter').addEventListener('change', () => {
        state.walletId = qs('walletFilter').value || 'all';
        refresh();
      });
    }

    if (qs('transactionSearchInput')) {
      qs('transactionSearchInput').addEventListener('input', () => {
        state.keyword = (qs('transactionSearchInput').value || '').trim().toLowerCase();
        refresh();
      });
    }

    if (qs('periodFilter')) {
      qs('periodFilter').addEventListener('change', () => {
        state.period = qs('periodFilter').value || 'today';
        if (state.period === 'custom' && !state.from && !state.to) {
          state.from = formatIso(addDays(state.anchorDate, -6));
          state.to = formatIso(state.anchorDate);
          if (fromPicker) fromPicker.setDate(state.from, true);
          if (toPicker) toPicker.setDate(state.to, true);
        }
        refresh();
      });
    }

    if (qs('dayPrevBtn')) qs('dayPrevBtn').addEventListener('click', () => moveAnchor(-1));
    if (qs('dayNextBtn')) qs('dayNextBtn').addEventListener('click', () => moveAnchor(1));
    if (qs('calendarPrevBtn')) qs('calendarPrevBtn').addEventListener('click', () => {
      state.calendarMonth = addMonths(state.calendarMonth, -1);
      renderCalendar();
    });
    if (qs('calendarNextBtn')) qs('calendarNextBtn').addEventListener('click', () => {
      state.calendarMonth = addMonths(state.calendarMonth, 1);
      renderCalendar();
    });

    applyTypeToggle('addTypeSwitch', 'addTransactionType', 'expense', syncAddPreview);
    applyTypeToggle('detailTypeSwitch', 'detailEditType', 'expense', syncDetailPreview);

    ['addTransactionWallet', 'addTransactionAmount', 'addTransactionDate', 'addTransactionRecurrence', 'addTransactionNote']
      .forEach((id) => qs(id)?.addEventListener('input', syncAddPreview));
    ['detailEditWallet', 'detailEditAmount', 'detailEditDate', 'detailEditRecurrence', 'detailEditNote']
      .forEach((id) => qs(id)?.addEventListener('input', syncDetailPreview));
    ['addTransactionWallet', 'addTransactionRecurrence'].forEach((id) => qs(id)?.addEventListener('change', syncAddPreview));
    ['detailEditWallet', 'detailEditRecurrence'].forEach((id) => qs(id)?.addEventListener('change', syncDetailPreview));

    qsa('#addCategoryGrid .tx-category-chip').forEach((button) => {
      button.addEventListener('click', () => selectCategory('add', button));
    });
    qsa('#detailCategoryGrid .tx-category-chip').forEach((button) => {
      button.addEventListener('click', () => selectCategory('detail', button));
    });

    if (qs('btnSaveTransactionStatic')) qs('btnSaveTransactionStatic').addEventListener('click', createTransaction);
    if (qs('btnUpdateTransactionStatic')) qs('btnUpdateTransactionStatic').addEventListener('click', updateTransaction);
    if (qs('btnDeleteTransactionStatic')) qs('btnDeleteTransactionStatic').addEventListener('click', () => deleteTransaction());
    qsa('.tx-export-btn').forEach((button) => button.addEventListener('click', exportVisibleTransactions));

    detailModalEl?.addEventListener('hidden.bs.modal', () => {
      if (state.reopenDayDrawerOnDetailClose && state.selectedCalendarDate) {
        renderDayDrawer(state.selectedCalendarDate);
        if (dayOffcanvas) dayOffcanvas.show();
      }
      state.reopenDayDrawerOnDetailClose = false;
    });

    addModalEl?.addEventListener('shown.bs.modal', syncAddPreview);
    detailModalEl?.addEventListener('shown.bs.modal', syncDetailPreview);
  }

  resetAddForm();
  bindEvents();
  state.selectedCalendarDate = formatIso(state.anchorDate);
  state.calendarMonth = monthStart(state.anchorDate);
  refresh();
});
