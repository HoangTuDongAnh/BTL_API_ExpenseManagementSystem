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
        const number = Number(value || 0);
        return `${number.toLocaleString("vi-VN")} ${currencyCode || "VND"}`;
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

    function getWalletCards() {
        return Array.from(document.querySelectorAll(".wallet-card-static[data-wallet-id]"));
    }

    function fillReplacementWalletOptions(currentWalletId) {
        if (!replacementWalletId) return;
        const options = Array.from(replacementWalletId.querySelectorAll("option"));
        options.forEach(opt => {
            if (!opt.value) {
                opt.hidden = false;
                return;
            }
            opt.hidden = opt.value === currentWalletId;
        });
        replacementWalletId.value = "";
    }

    function setDetailWalletData(trigger) {
        if (!trigger) return;

        const walletId = trigger.getAttribute("data-wallet-id") || "";
        const walletName = trigger.getAttribute("data-wallet-name") || "Ví";
        const walletBalance = trigger.getAttribute("data-wallet-balance") || "0";
        const walletInitial = trigger.getAttribute("data-wallet-initial") || "0";
        const walletCurrency = trigger.getAttribute("data-wallet-currency") || "VND";
        const walletIsDefault = (trigger.getAttribute("data-wallet-is-default") || "false") === "true";
        const walletIcon = trigger.getAttribute("data-wallet-icon") || "";

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
        setText("detailWalletTitle", walletName);
        setValue("detailWalletName", walletName);
        setText("detailWalletCurrency", walletCurrency);
        setValue("detailWalletCurrencySelect", walletCurrency);
        setText("detailCurrentBalance", formatCurrency(walletBalance, walletCurrency));
        setValue("detailCurrentBalanceInput", formatCurrency(walletBalance, walletCurrency));
        setValue("detailInitialBalance", walletInitial);

        const defaultCheckbox = document.getElementById("detailWalletDefault");
        if (defaultCheckbox) defaultCheckbox.checked = walletIsDefault;

        const headIcon = document.getElementById("detailHeadIcon");
        if (headIcon) {
            headIcon.src = walletIcon;
            headIcon.classList.toggle("d-none", !walletIcon);
        }

        fillReplacementWalletOptions(walletId);
        hideAlert(detailWalletActionAlert);
        document.getElementById("deleteWalletModeDeleteAll")?.click();
        toggleReplacementWallet();
    }

    walletDetailModalEl?.addEventListener("show.bs.modal", function (event) {
        const trigger = event.relatedTarget;
        setDetailWalletData(trigger);
    });

    document.querySelectorAll('input[name="deleteWalletMode"]').forEach(function (radio) {
        radio.addEventListener("change", toggleReplacementWallet);
    });

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
        try {
            data = await response.json();
        } catch {
            data = null;
        }

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

        if (!wallet_name) {
            showAlert(walletActionAlert, "Tên ví không được để trống.");
            return;
        }

        if (initial_balance < 0) {
            showAlert(walletActionAlert, "Số dư ban đầu không được âm.");
            return;
        }

        try {
            await sendJson("/Dashboard/CreateWalletAjax", "POST", {
                wallet_name,
                initial_balance,
                currency,
                is_default
            });

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

        if (!walletId) {
            showAlert(detailWalletActionAlert, "Không xác định được ví cần cập nhật.");
            return;
        }

        if (!wallet_name) {
            showAlert(detailWalletActionAlert, "Tên ví không được để trống.");
            return;
        }

        try {
            await sendJson(`/Dashboard/UpdateWalletAjax/${encodeURIComponent(walletId)}`, "PUT", {
                wallet_name,
                currency,
                is_default
            });

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

        if (!walletId) {
            showAlert(detailWalletActionAlert, "Không xác định được ví cần xóa.");
            return;
        }

        if (mode === "move_transactions" && !replacement_wallet_id) {
            showAlert(detailWalletActionAlert, "Hãy chọn ví nhận giao dịch.");
            return;
        }

        const confirmed = window.confirm("Bạn có chắc muốn xóa ví này không?");
        if (!confirmed) return;

        try {
            await sendJson(`/Dashboard/DeleteWalletAjax/${encodeURIComponent(walletId)}`, "DELETE", {
                mode,
                replacement_wallet_id
            });

            walletDetailModal?.hide();
            toastDeleted?.show();
            window.location.reload();
        } catch (error) {
            showAlert(detailWalletActionAlert, error.message);
        }
    });

    // =========================
    // DASHBOARD REPORT CHARTS
    // =========================
    const cashflowChartEl = document.querySelector("#dashboardCashflowChart");
    if (cashflowChartEl && typeof ApexCharts !== "undefined") {
        const cashflowChartOptions = {
            series: [
                {
                    name: "Thu",
                    data: [12, 15, 14, 18, 17, 19, 16, 20, 22, 21, 23, 24]
                },
                {
                    name: "Chi",
                    data: [6, 7, 8, 9, 7, 10, 11, 9, 10, 12, 11, 13]
                }
            ],
            chart: {
                height: 320,
                type: "area",
                toolbar: {
                    show: false
                },
                parentHeightOffset: 0
            },
            stroke: {
                curve: "smooth",
                width: 3
            },
            dataLabels: {
                enabled: false
            },
            colors: ["#28c76f", "#ff3e1d"],
            fill: {
                type: "gradient",
                gradient: {
                    shadeIntensity: 0.4,
                    opacityFrom: 0.35,
                    opacityTo: 0.04,
                    stops: [0, 95, 100]
                }
            },
            markers: {
                size: 4,
                strokeWidth: 2,
                hover: {
                    size: 6
                }
            },
            grid: {
                strokeDashArray: 6,
                borderColor: "rgba(67,89,113,.12)",
                padding: {
                    left: 8,
                    right: 8,
                    top: -10,
                    bottom: -8
                }
            },
            xaxis: {
                categories: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"],
                axisTicks: {
                    show: false
                },
                axisBorder: {
                    show: false
                }
            },
            yaxis: {
                labels: {
                    formatter: function (val) {
                        return val + "M";
                    }
                }
            },
            legend: {
                position: "top",
                horizontalAlign: "left"
            },
            tooltip: {
                y: {
                    formatter: function (val) {
                        return val + " triệu";
                    }
                }
            }
        };

        new ApexCharts(cashflowChartEl, cashflowChartOptions).render();
    }

    const categoryDonutEl = document.querySelector("#dashboardCategoryDonutChart");
    if (categoryDonutEl && typeof ApexCharts !== "undefined") {
        const categoryDonutOptions = {
            chart: {
                type: "donut",
                height: 325
            },
            series: [32, 24, 18, 14, 12],
            labels: ["Ăn uống", "Đi lại", "Hóa đơn", "Giải trí", "Khác"],
            colors: ["#ffab00", "#696cff", "#03c3ec", "#71dd37", "#8592a3"],
            dataLabels: {
                enabled: false
            },
            stroke: {
                width: 0
            },
            legend: {
                position: "bottom"
            },
            plotOptions: {
                pie: {
                    donut: {
                        size: "70%",
                        labels: {
                            show: true,
                            name: {
                                show: true
                            },
                            value: {
                                show: true,
                                formatter: function (val) {
                                    return val + "%";
                                }
                            },
                            total: {
                                show: true,
                                label: "Chi tiêu",
                                formatter: function () {
                                    return "4.98M";
                                }
                            }
                        }
                    }
                }
            }
        };

        new ApexCharts(categoryDonutEl, categoryDonutOptions).render();
    }
});
