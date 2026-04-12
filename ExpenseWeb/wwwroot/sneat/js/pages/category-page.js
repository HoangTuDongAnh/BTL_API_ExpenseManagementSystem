document.addEventListener("DOMContentLoaded", function () {
    const addModalEl = document.getElementById("addCategoryModal");
    const detailModalEl = document.getElementById("categoryDetailModal");
    const setBudgetModalEl = document.getElementById("setBudgetModal");

    const addModal = addModalEl ? new bootstrap.Modal(addModalEl) : null;
    const detailModal = detailModalEl ? new bootstrap.Modal(detailModalEl) : null;
    const setBudgetModal = setBudgetModalEl ? new bootstrap.Modal(setBudgetModalEl) : null;

    const toastSaved = document.getElementById("categorySavedToast") ? new bootstrap.Toast(document.getElementById("categorySavedToast")) : null;
    const toastUpdated = document.getElementById("categoryUpdatedToast") ? new bootstrap.Toast(document.getElementById("categoryUpdatedToast")) : null;
    const toastDeleted = document.getElementById("categoryDeletedToast") ? new bootstrap.Toast(document.getElementById("categoryDeletedToast")) : null;

    const createUrl = document.getElementById("categoryCreateUrl")?.value || "";
    const updateBaseUrl = document.getElementById("categoryUpdateBaseUrl")?.value || "";
    const deleteBaseUrl = document.getElementById("categoryDeleteBaseUrl")?.value || "";
    const saveBudgetUrl = document.getElementById("categorySaveBudgetUrl")?.value || "";

    function hexToRgba(hex, alpha) {
        if (!hex || !hex.startsWith("#") || hex.length !== 7) {
            return "rgba(255,171,0,0.14)";
        }
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function currency(value) {
        return Number(value || 0).toLocaleString("vi-VN") + " đ";
    }

    function setActiveColor(selector, color) {
        document.querySelectorAll(selector).forEach(function (btn) {
            btn.classList.toggle("active", (btn.dataset.color || "").toUpperCase() === (color || "").toUpperCase());
        });
    }

    function updateAddPreview() {
        const color = document.getElementById("addCategoryColor")?.value || "#FFAB00";
        setActiveColor(".category-color-preset", color);
    }

    function updateDetailPreview() {
        const name = document.getElementById("detailCategoryName")?.value || "Danh mục";
        const color = document.getElementById("detailCategoryColor")?.value || "#FFAB00";
        const icon = document.getElementById("detailCategoryIcon")?.value || "";

        const headIcon = document.getElementById("detailHeadIcon");
        const headWrap = document.getElementById("detailHeadIconWrap");
        const title = document.getElementById("detailCategoryTitle");

        if (title) title.textContent = name;
        if (headIcon && icon) headIcon.src = icon;
        if (headWrap) headWrap.style.background = hexToRgba(color, 0.14);

        setActiveColor(".category-color-preset-detail", color);
    }

    async function sendJson(url, method, payload) {
        const response = await fetch(url, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            },
            body: payload ? JSON.stringify(payload) : null
        });

        const raw = await response.text();
        let data = null;

        if (raw) {
            try {
                data = JSON.parse(raw);
            } catch {
                data = { message: raw };
            }
        }

        if (!response.ok) {
            throw new Error(data?.message || raw || "Request failed.");
        }

        return data || {};
    }

    function buildUpdateUrl(id) {
        return updateBaseUrl.replace("__id__", encodeURIComponent(id));
    }

    function buildDeleteUrl(id) {
        return deleteBaseUrl.replace("__id__", encodeURIComponent(id));
    }

    ["addCategoryColor"].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", updateAddPreview);
    });

    ["detailCategoryName", "detailCategoryColor"].forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.addEventListener("input", updateDetailPreview);
    });

    document.querySelectorAll(".category-color-preset").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const color = btn.dataset.color || "#FFAB00";
            const input = document.getElementById("addCategoryColor");
            if (input) input.value = color;
            updateAddPreview();
        });
    });

    document.querySelectorAll(".category-color-preset-detail").forEach(function (btn) {
        btn.addEventListener("click", function () {
            const color = btn.dataset.color || "#FFAB00";
            const input = document.getElementById("detailCategoryColor");
            if (input) input.value = color;
            updateDetailPreview();
        });
    });

    document.querySelectorAll(".category-icon-option-add").forEach(function (btn) {
        btn.addEventListener("click", function () {
            document.querySelectorAll(".category-icon-option-add").forEach(function (item) {
                item.classList.remove("active");
            });
            btn.classList.add("active");

            const iconInput = document.getElementById("addCategoryIcon");
            if (iconInput) iconInput.value = btn.dataset.icon || "";
        });
    });

    document.querySelectorAll(".category-icon-option-detail").forEach(function (btn) {
        btn.addEventListener("click", function () {
            document.querySelectorAll(".category-icon-option-detail").forEach(function (item) {
                item.classList.remove("active");
            });
            btn.classList.add("active");

            const iconInput = document.getElementById("detailCategoryIcon");
            if (iconInput) iconInput.value = btn.dataset.icon || "";
            updateDetailPreview();
        });
    });

    if (detailModalEl) {
        detailModalEl.addEventListener("show.bs.modal", function (event) {
            const trigger = event.relatedTarget;
            if (!trigger) return;

            const categoryId = trigger.getAttribute("data-category-id") || "";
            const categoryName = trigger.getAttribute("data-category-name") || "Danh mục";
            const categoryColor = trigger.getAttribute("data-category-color") || "#FFAB00";
            const categoryIcon = trigger.getAttribute("data-category-icon") || "";
            const hasBudget = trigger.getAttribute("data-has-budget") === "true";
            const canEdit = trigger.getAttribute("data-category-can-edit") === "true";
            const canDelete = trigger.getAttribute("data-category-can-delete") === "true";
            const isDefault = trigger.getAttribute("data-category-is-default") === "true";

            const budgetId = trigger.getAttribute("data-budget-id") || "";
            const budgetAmount = parseFloat(trigger.getAttribute("data-budget-amount") || "0");
            const budgetSpent = parseFloat(trigger.getAttribute("data-budget-spent") || "0");
            const budgetStatus = trigger.getAttribute("data-budget-status") || "none";
            const budgetType = trigger.getAttribute("data-budget-type") || "Tháng";
            const budgetPeriodType = trigger.getAttribute("data-budget-period-type") || "month";

            document.getElementById("detailCategoryId").textContent = categoryId;
            document.getElementById("detailCategoryName").value = categoryName;
            document.getElementById("detailCategoryColor").value = categoryColor;
            document.getElementById("detailCategoryIcon").value = categoryIcon;
            document.getElementById("detailCategoryCanEdit").value = canEdit ? "true" : "false";
            document.getElementById("detailCategoryCanDelete").value = canDelete ? "true" : "false";
            document.getElementById("detailBudgetId").value = budgetId;
            document.getElementById("detailBudgetPeriodType").value = budgetPeriodType;
            document.getElementById("budgetModalCategoryName").value = categoryName;

            const typeBadge = document.getElementById("detailCategoryTypeBadge");
            if (typeBadge) {
                typeBadge.textContent = isDefault ? "Mặc định" : "Tùy chỉnh";
                typeBadge.className = isDefault ? "badge bg-label-secondary" : "badge bg-label-primary";
            }

            document.querySelectorAll(".category-icon-option-detail").forEach(function (btn) {
                btn.classList.toggle("active", btn.dataset.icon === categoryIcon);
            });

            const deleteButton = document.getElementById("btnDeleteCategoryStatic");
            const updateButton = document.getElementById("btnUpdateCategoryStatic");
            const detailNameInput = document.getElementById("detailCategoryName");
            const detailColorInput = document.getElementById("detailCategoryColor");

            if (deleteButton) deleteButton.disabled = !canDelete;
            if (updateButton) updateButton.disabled = !canEdit;
            if (detailNameInput) detailNameInput.readOnly = !canEdit;
            if (detailColorInput) detailColorInput.disabled = !canEdit;

            document.querySelectorAll(".category-color-preset-detail, .category-icon-option-detail").forEach(function (el) {
                if (!canEdit) {
                    el.classList.add("disabled");
                    el.setAttribute("tabindex", "-1");
                    el.style.pointerEvents = "none";
                    el.style.opacity = "0.65";
                } else {
                    el.classList.remove("disabled");
                    el.removeAttribute("tabindex");
                    el.style.pointerEvents = "";
                    el.style.opacity = "";
                }
            });

            const noBudgetState = document.getElementById("noBudgetState");
            const hasBudgetState = document.getElementById("hasBudgetState");

            if (hasBudget) {
                noBudgetState.classList.add("d-none");
                hasBudgetState.classList.remove("d-none");

                const percentage = budgetAmount > 0 ? (budgetSpent / budgetAmount) * 100 : 0;
                const remainRaw = budgetAmount - budgetSpent;
                const overSpentRaw = budgetSpent - budgetAmount;
                const progressWidth = percentage > 100 ? 100 : percentage;

                document.getElementById("detailBudgetTitle").textContent = categoryName;
                document.getElementById("detailBudgetType").textContent = budgetType;
                document.getElementById("detailSpentAmount").textContent = currency(budgetSpent);
                document.getElementById("detailTotalAmount").textContent = currency(budgetAmount);
                document.getElementById("detailProgressText").textContent = percentage.toFixed(1) + "%";

                const progressBar = document.getElementById("detailProgressBar");
                const progressText = document.getElementById("detailProgressText");
                const statusText = document.getElementById("detailStatusText");

                progressBar.style.width = progressWidth + "%";

                if (budgetStatus === "over") {
                    progressBar.className = "progress-bar bg-danger progress-bar-striped progress-bar-animated";
                    progressText.className = "fw-bold small text-danger";
                    statusText.className = "small fw-bold text-danger";
                    statusText.innerHTML = '<i class="bx bx-error me-1"></i>Vượt mức ' + currency(overSpentRaw);
                } else if (budgetStatus === "reached") {
                    progressBar.className = "progress-bar bg-warning";
                    progressText.className = "fw-bold small text-warning";
                    statusText.className = "small fw-bold text-warning";
                    statusText.textContent = "Đã hết ngân sách";
                } else {
                    progressBar.className = "progress-bar bg-primary";
                    progressText.className = "fw-bold small text-primary";
                    statusText.className = "small fw-bold text-success";
                    statusText.textContent = "Còn " + currency(remainRaw);
                }

                document.getElementById("budgetModalAmount").value = budgetAmount;
                document.getElementById("budgetModalSpent").value = budgetSpent;
                document.getElementById("budgetModalTimeType").value = budgetPeriodType || "month";
            } else {
                noBudgetState.classList.remove("d-none");
                hasBudgetState.classList.add("d-none");
                document.getElementById("budgetModalAmount").value = "";
                document.getElementById("budgetModalSpent").value = "0";

                const currentDashboardPeriod = document.getElementById("categoryPagePeriodType")?.value || "month";
                document.getElementById("budgetModalTimeType").value = currentDashboardPeriod;
            }

            updateDetailPreview();
        });
    }

    const btnSave = document.getElementById("btnSaveCategoryStatic");
    if (btnSave) {
        btnSave.addEventListener("click", async function () {
            const categoryName = (document.getElementById("addCategoryName")?.value || "").trim();
            const color = document.getElementById("addCategoryColor")?.value || "#FFAB00";
            const icon = document.getElementById("addCategoryIcon")?.value || "";

            if (!categoryName) {
                alert("Vui lòng nhập tên danh mục.");
                return;
            }

            btnSave.disabled = true;
            try {
                await sendJson(createUrl, "POST", {
                    category_name: categoryName,
                    color: color,
                    icon: icon
                });

                if (addModal) addModal.hide();
                if (toastSaved) toastSaved.show();
                setTimeout(function () {
                    window.location.reload();
                }, 700);
            } catch (error) {
                alert(error.message || "Tạo danh mục thất bại.");
            } finally {
                btnSave.disabled = false;
            }
        });
    }

    const btnUpdate = document.getElementById("btnUpdateCategoryStatic");
    if (btnUpdate) {
        btnUpdate.addEventListener("click", async function () {
            if (document.getElementById("detailCategoryCanEdit")?.value !== "true") {
                alert("Danh mục mặc định chỉ có thể xem, không thể chỉnh sửa.");
                return;
            }

            const categoryId = document.getElementById("detailCategoryId")?.textContent || "";
            const categoryName = (document.getElementById("detailCategoryName")?.value || "").trim();
            const color = document.getElementById("detailCategoryColor")?.value || "#FFAB00";
            const icon = document.getElementById("detailCategoryIcon")?.value || "";

            if (!categoryId || !categoryName) {
                alert("Dữ liệu danh mục chưa hợp lệ.");
                return;
            }

            btnUpdate.disabled = true;
            try {
                await sendJson(buildUpdateUrl(categoryId), "PUT", {
                    category_name: categoryName,
                    color: color,
                    icon: icon
                });

                if (toastUpdated) toastUpdated.show();
                setTimeout(function () {
                    window.location.reload();
                }, 700);
            } catch (error) {
                alert(error.message || "Cập nhật danh mục thất bại.");
            } finally {
                btnUpdate.disabled = false;
            }
        });
    }

    const btnDelete = document.getElementById("btnDeleteCategoryStatic");
    if (btnDelete) {
        btnDelete.addEventListener("click", async function () {
            if (document.getElementById("detailCategoryCanDelete")?.value !== "true") {
                alert("Danh mục mặc định không thể xóa.");
                return;
            }

            const categoryId = document.getElementById("detailCategoryId")?.textContent || "";
            const categoryName = document.getElementById("detailCategoryName")?.value || "";

            if (!categoryId) {
                return;
            }

            const confirmed = window.confirm(`Bạn có chắc muốn xóa danh mục "${categoryName}" không? Hệ thống sẽ tự chuyển dữ liệu sang danh mục thay thế phù hợp.`);
            if (!confirmed) {
                return;
            }

            btnDelete.disabled = true;
            try {
                await sendJson(buildDeleteUrl(categoryId), "DELETE");
                if (detailModal) detailModal.hide();
                if (toastDeleted) toastDeleted.show();
                setTimeout(function () {
                    window.location.reload();
                }, 700);
            } catch (error) {
                alert(error.message || "Xóa danh mục thất bại.");
            } finally {
                btnDelete.disabled = false;
            }
        });
    }

    const btnSaveBudget = document.getElementById("btnSaveBudget");
    if (btnSaveBudget) {
        btnSaveBudget.addEventListener("click", async function () {
            const categoryId = (document.getElementById("detailCategoryId")?.textContent || "").trim();
            const budgetId = document.getElementById("detailBudgetId")?.value || "";
            const periodType = document.getElementById("budgetModalTimeType")?.value || "month";
            const amountInputValue = document.getElementById("budgetModalAmount")?.value || "";
            const amount = parseBudgetAmount(amountInputValue);

            if (!categoryId || !Number.isFinite(amount) || amount <= 0) {
                alert("Vui lòng nhập hạn mức hợp lệ.");
                return;
            }

            btnSaveBudget.disabled = true;
            try {
                await sendJson(saveBudgetUrl, "POST", {
                    category_id: categoryId,
                    budget_id: budgetId,
                    period_type: periodType,
                    limit_amount: amount
                });

                if (setBudgetModal) setBudgetModal.hide();
                if (detailModal) detailModal.hide();
                if (toastSaved) toastSaved.show();

                setTimeout(function () {
                    window.location.reload();
                }, 700);
            } catch (error) {
                alert(error.message || "Lưu hạn mức thất bại.");
            } finally {
                btnSaveBudget.disabled = false;
            }
        });
    }

    function parseBudgetAmount(rawValue) {
        const normalized = String(rawValue || "")
            .trim()
            .replace(/\s/g, "")
            .replace(/,/g, "");

        if (!normalized) {
            return NaN;
        }

        return Number(normalized);
    }

    updateAddPreview();
    updateDetailPreview();
});