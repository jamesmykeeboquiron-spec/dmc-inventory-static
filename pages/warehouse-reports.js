window.DMC_PAGES = window.DMC_PAGES || {};


const DMC_WAREHOUSE_REPORT_MASTER_LIST_KEY = "dmc_master_list_items";
const DMC_WAREHOUSE_REPORT_LEDGER_KEY = "dmc_inventory_ledger_entries";

function getWarehouseReportMasterListItems() {
  const storedItems = localStorage.getItem(DMC_WAREHOUSE_REPORT_MASTER_LIST_KEY);
  if (!storedItems) return [];
  try {
    const parsedItems = JSON.parse(storedItems);
    return Array.isArray(parsedItems) ? parsedItems : [];
  } catch {
    return [];
  }
}

function getWarehouseReportLedgerEntries() {
  const storedEntries = localStorage.getItem(DMC_WAREHOUSE_REPORT_LEDGER_KEY);
  if (!storedEntries) return window.DMC_DATA?.ledger || [];
  try {
    const parsedEntries = JSON.parse(storedEntries);
    return Array.isArray(parsedEntries) ? parsedEntries : [];
  } catch {
    return window.DMC_DATA?.ledger || [];
  }
}

function getWarehouseReportItemOperatingAreas(item) {
  if (Array.isArray(item?.operatingAreas)) return item.operatingAreas.filter(Boolean);
  if (item?.operatingArea) {
    return String(item.operatingArea).split(",").map((area) => area.trim()).filter(Boolean);
  }
  return [];
}

function itemBelongsToWarehouseReport(item) {
  if (item.active === false) return false;
  return getWarehouseReportItemOperatingAreas(item)
    .map((area) => String(area || "").toLowerCase())
    .some((area) => area.includes("warehouse") || area.includes("stockroom"));
}

function entryBelongsToWarehouseReport(entry) {
  const location = String(entry.location || "").toLowerCase();
  const department = String(entry.department || "").toLowerCase();
  const source = String(entry.source || "").toLowerCase();
  const destination = String(entry.destination || "").toLowerCase();

  if (
    source.includes("branch daily input") ||
    source.includes("commissary daily input closing count") ||
    source.includes("commissary daily input") ||
    location.includes("branch") ||
    location.includes("dmc-iriga") ||
    location.includes("commissary")
  ) {
    return false;
  }

  return (
    location.includes("warehouse") ||
    location.includes("stockroom") ||
    department.includes("warehouse") ||
    department.includes("stockroom") ||
    source.includes("warehouse") ||
    source.includes("supplier") ||
    source.includes("incoming from commissary") ||
    source.includes("commissary receipt") ||
    destination.includes("warehouse") ||
    destination.includes("stockroom")
  );
}

function getWarehouseReportLedgerEntriesOnly() {
  return getWarehouseReportLedgerEntries().filter(entryBelongsToWarehouseReport);
}

function getWarehouseReportLedgerEntriesForItem(itemId) {
  return getWarehouseReportLedgerEntriesOnly().filter(
    (entry) => String(entry.itemId || "") === String(itemId || "")
  );
}

function getWarehouseReportEntryTime(entry) {
  return String(entry.submittedAt || entry.receivedAt || entry.date || "");
}

function getLatestWarehouseReportStockCountForItem(itemId) {
  const countEntries = getWarehouseReportLedgerEntriesForItem(itemId).filter(
    (entry) =>
      entry.movementType === "Remaining Count" ||
      entry.movementType === "Stock Count" ||
      entry.stockEffect === "set"
  );
  if (countEntries.length === 0) return null;
  return [...countEntries].sort((a, b) =>
    getWarehouseReportEntryTime(b).localeCompare(getWarehouseReportEntryTime(a))
  )[0];
}

function getWarehouseReportEntryStockEffect(entry) {
  if (entry.stockEffect) return entry.stockEffect;
  if (
    entry.movementType === "Transfer In" ||
    entry.movementType === "Received" ||
    entry.movementType === "Supplier Receiving"
  ) return "add";
  if (
    entry.movementType === "Transfer Out" ||
    entry.movementType === "Usage" ||
    entry.movementType === "Waste"
  ) return "deduct";
  if (
    entry.movementType === "Remaining Count" ||
    entry.movementType === "Stock Count"
  ) return "set";
  return "report";
}

function getWarehouseReportOpeningStock(item) {
  const openingStock = item.openingStock ?? item.startingStock ?? item.currentStock ?? item.quantity ?? 0;
  const parsedStock = Number(openingStock);
  return Number.isNaN(parsedStock) ? 0 : parsedStock;
}

function calculateWarehouseReportCurrentStock(item) {
  const entries = getWarehouseReportLedgerEntriesForItem(item.itemId);
  const latestStockCount = getLatestWarehouseReportStockCountForItem(item.itemId);

  if (latestStockCount) {
    const latestStockCountTime = getWarehouseReportEntryTime(latestStockCount);
    const startingFromCount = Number(latestStockCount.quantity || 0);

    return entries
      .filter((entry) => entry !== latestStockCount && getWarehouseReportEntryTime(entry) > latestStockCountTime)
      .reduce((total, entry) => {
        const quantity = Number(entry.quantity || 0);
        const stockEffect = getWarehouseReportEntryStockEffect(entry);
        if (stockEffect === "add") return total + quantity;
        if (stockEffect === "deduct") return total - quantity;
        if (stockEffect === "set") return quantity;
        return total;
      }, Number.isNaN(startingFromCount) ? 0 : startingFromCount);
  }

  return entries.reduce((total, entry) => {
    const quantity = Number(entry.quantity || 0);
    const stockEffect = getWarehouseReportEntryStockEffect(entry);
    if (stockEffect === "add") return total + quantity;
    if (stockEffect === "deduct") return total - quantity;
    if (stockEffect === "set") return quantity;
    return total;
  }, getWarehouseReportOpeningStock(item));
}

function getWarehouseReportBaseItems() {
  return getWarehouseReportMasterListItems()
    .filter(itemBelongsToWarehouseReport)
    .map((item) => ({
      ...item,
      itemName: item.officialItemName || item.itemName || item.name || "-",
      department: item.department || "Unassigned",
      section: item.section || "",
      unit: item.unit || "-"
    }));
}


const DMC_WAREHOUSE_REPORT_AUDITS_KEY = "dmc_warehouse_monthly_audits";
const DMC_WAREHOUSE_REPORT_PHYSICAL_COUNTS_KEY = "dmc_warehouse_audit_physical_counts";

window.DMC_WAREHOUSE_REPORT_FILTERS = window.DMC_WAREHOUSE_REPORT_FILTERS || {
  department: "all",
  startDate: "",
  endDate: "",
  selectedAuditId: ""
};

function getWarehouseReportTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getWarehouseReportDefaultStartDate() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  return firstDay.toISOString().slice(0, 10);
}

function ensureWarehouseReportDates() {
  if (!window.DMC_WAREHOUSE_REPORT_FILTERS.startDate) {
    window.DMC_WAREHOUSE_REPORT_FILTERS.startDate = getWarehouseReportDefaultStartDate();
  }

  if (!window.DMC_WAREHOUSE_REPORT_FILTERS.endDate) {
    window.DMC_WAREHOUSE_REPORT_FILTERS.endDate = getWarehouseReportTodayDate();
  }
}

function getStoredWarehousePhysicalCounts() {
  const storedCounts = localStorage.getItem(DMC_WAREHOUSE_REPORT_PHYSICAL_COUNTS_KEY);
  if (!storedCounts) return {};
  try { return JSON.parse(storedCounts); } catch { return {}; }
}

function saveWarehousePhysicalCounts(counts) {
  localStorage.setItem(DMC_WAREHOUSE_REPORT_PHYSICAL_COUNTS_KEY, JSON.stringify(counts));
}

function getStoredWarehouseMonthlyAudits() {
  const storedAudits = localStorage.getItem(DMC_WAREHOUSE_REPORT_AUDITS_KEY);
  if (!storedAudits) return [];
  try {
    const parsedAudits = JSON.parse(storedAudits);
    return Array.isArray(parsedAudits) ? parsedAudits : [];
  } catch {
    return [];
  }
}

function saveWarehouseMonthlyAudits(audits) {
  localStorage.setItem(DMC_WAREHOUSE_REPORT_AUDITS_KEY, JSON.stringify(audits));
}

function createWarehouseAuditId() {
  const filters = window.DMC_WAREHOUSE_REPORT_FILTERS;
  const now = new Date();
  const timePart = now.toTimeString().slice(0, 8).replaceAll(":", "");
  const filterPart = filters.department || "all";

  return `WHAUD-${filterPart}-${filters.startDate}-${filters.endDate}-${timePart}`
    .replaceAll(" ", "-")
    .toUpperCase();
}

function getWarehouseSubmittedAuditForCurrentFilter() {
  const filters = window.DMC_WAREHOUSE_REPORT_FILTERS;

  return getStoredWarehouseMonthlyAudits().find(
    (audit) =>
      audit.department === filters.department &&
      audit.startDate === filters.startDate &&
      audit.endDate === filters.endDate
  );
}

function getSelectedWarehouseSubmittedAudit() {
  const audits = getStoredWarehouseMonthlyAudits();

  if (window.DMC_WAREHOUSE_REPORT_FILTERS.selectedAuditId) {
    const selectedAudit = audits.find(
      (audit) => audit.auditId === window.DMC_WAREHOUSE_REPORT_FILTERS.selectedAuditId
    );

    if (selectedAudit) return selectedAudit;
  }

  return getWarehouseSubmittedAuditForCurrentFilter() || audits[0] || null;
}

function getWarehouseAuditCountKey(itemId) {
  const filters = window.DMC_WAREHOUSE_REPORT_FILTERS;
  return `${filters.department}|${filters.startDate}|${filters.endDate}|${itemId}`;
}

function getWarehousePhysicalCountValue(itemId) {
  const counts = getStoredWarehousePhysicalCounts();
  return counts[getWarehouseAuditCountKey(itemId)] || "";
}

function getWarehouseReportFilterOptions() {
  return [
    ...new Set(getWarehouseReportBaseItems().map((item) => item.department).filter(Boolean))
  ].sort();
}

function getWarehouseReportItemsForFilter() {
  const filters = window.DMC_WAREHOUSE_REPORT_FILTERS;

  return getWarehouseReportBaseItems().filter((item) => {
    return filters.department === "all" ||
      String(item.department || "") === String(filters.department);
  });
}

function getWarehouseLedgerEntriesForReport() {
  ensureWarehouseReportDates();

  const filters = window.DMC_WAREHOUSE_REPORT_FILTERS;
  const reportItems = getWarehouseReportItemsForFilter();

  return getWarehouseReportLedgerEntriesOnly().filter((entry) => {
    const entryDate = String(entry.date || entry.submittedAt || "").slice(0, 10);
    const matchesStart = entryDate >= filters.startDate;
    const matchesEnd = entryDate <= filters.endDate;

    const itemIsInFilter = reportItems.some(
      (item) => String(item.itemId || "") === String(entry.itemId || "")
    );

    return matchesStart && matchesEnd && itemIsInFilter;
  });
}

function buildWarehouseAuditRows() {
  const items = getWarehouseReportItemsForFilter();
  const ledgerEntries = getWarehouseLedgerEntriesForReport();
  const rowsByItemId = {};

  items.forEach((item) => {
    rowsByItemId[item.itemId] = {
      section: item.section || "-",
      department: item.department || "-",
      itemId: item.itemId || "-",
      itemName: item.itemName || item.officialItemName || "-",
      unit: item.unit || "-",
      received: 0,
      transferIn: 0,
      usage: 0,
      waste: 0,
      transferOut: 0,
      adjustment: 0
    };
  });

  ledgerEntries.forEach((entry) => {
    if (!rowsByItemId[entry.itemId]) return;

    const quantity = Number(entry.quantity || 0);

    if (entry.movementType === "Received" || entry.movementType === "Supplier Receiving") {
      rowsByItemId[entry.itemId].received += quantity;
    }

    if (entry.movementType === "Transfer In") {
      rowsByItemId[entry.itemId].transferIn += quantity;
    }

    if (entry.movementType === "Usage") {
      rowsByItemId[entry.itemId].usage += quantity;
    }

    if (entry.movementType === "Waste") {
      rowsByItemId[entry.itemId].waste += quantity;
    }

    if (entry.movementType === "Transfer Out") {
      rowsByItemId[entry.itemId].transferOut += quantity;
    }

    if (entry.movementType === "Adjustment") {
      rowsByItemId[entry.itemId].adjustment += quantity;
    }
  });

  return Object.values(rowsByItemId).map((row) => {
    const baseItem = items.find(
      (item) => String(item.itemId || "") === String(row.itemId || "")
    );

    const systemEnding = baseItem ? calculateWarehouseReportCurrentStock(baseItem) : 0;
    const physicalCount = getWarehousePhysicalCountValue(row.itemId);
    const hasPhysicalCount = String(physicalCount).trim() !== "";
    const variance = hasPhysicalCount ? Number(physicalCount) - systemEnding : "";
    const status = !hasPhysicalCount ? "Pending" : variance === 0 ? "OK" : "CHECK";

    return {
      ...row,
      systemEnding,
      physicalCount,
      variance,
      status
    };
  }).sort((a, b) => String(a.itemName).localeCompare(String(b.itemName)));
}

function getWarehouseReportStatusBadgeClass(status) {
  if (status === "CHECK") return "danger-badge";
  if (status === "OK") return "";
  return "warning-badge";
}

function getWarehouseAuditSummary() {
  const rows = buildWarehouseAuditRows();

  return {
    totalItems: rows.length,
    pending: rows.filter((row) => row.status === "Pending").length,
    ok: rows.filter((row) => row.status === "OK").length,
    check: rows.filter((row) => row.status === "CHECK").length
  };
}

function renderWarehouseReportFilterOptions() {
  const currentValue = window.DMC_WAREHOUSE_REPORT_FILTERS.department;

  return `
    <option value="all" ${currentValue === "all" ? "selected" : ""}>
      All Departments
    </option>
    ${getWarehouseReportFilterOptions()
      .map(
        (value) => `
          <option value="${value}" ${currentValue === value ? "selected" : ""}>
            ${value}
          </option>
        `
      )
      .join("")}
  `;
}

function renderWarehouseAuditRows() {
  const rows = buildWarehouseAuditRows();
  const isSubmitted = Boolean(getWarehouseSubmittedAuditForCurrentFilter());

  if (rows.length === 0) {
    return `<tr><td colspan="15">No items found for this filter and date range.</td></tr>`;
  }

  return rows
    .map(
      (row) => `
        <tr>
          <td>${row.section}</td>
          <td>${row.department}</td>
          <td>${row.itemId}</td>
          <td>${row.itemName}</td>
          <td>${row.unit}</td>
          <td>${row.received}</td>
          <td>${row.transferIn}</td>
          <td>${row.usage}</td>
          <td>${row.waste}</td>
          <td>${row.transferOut}</td>
          <td>${row.adjustment}</td>
          <td>${row.systemEnding}</td>
          <td>
            <input
              class="audit-count-input"
              data-warehouse-audit-item="${row.itemId}"
              data-ending="${row.systemEnding}"
              type="number"
              step="any"
              value="${row.physicalCount}"
              ${isSubmitted ? "disabled" : ""}
            />
          </td>
          <td>
            <span class="audit-variance" data-warehouse-variance-for="${row.itemId}">
              ${row.variance === "" ? "-" : row.variance}
            </span>
          </td>
          <td>
            <span class="badge ${getWarehouseReportStatusBadgeClass(row.status)}" data-warehouse-status-for="${row.itemId}">
              ${row.status}
            </span>
          </td>
        </tr>
      `
    )
    .join("");
}

function submitCurrentWarehouseMonthlyAudit() {
  const rows = buildWarehouseAuditRows();
  const missingCounts = rows.filter((row) => String(row.physicalCount || "").trim() === "");

  if (missingCounts.length > 0) {
    alert("Please enter physical count for every item before submitting audit.");
    return;
  }

  if (getWarehouseSubmittedAuditForCurrentFilter()) {
    alert("This filter/date range audit has already been submitted.");
    return;
  }

  const filters = window.DMC_WAREHOUSE_REPORT_FILTERS;
  const auditId = createWarehouseAuditId();

  const submittedRows = rows.map((row) => ({
    ...row,
    physicalCount: Number(row.physicalCount),
    variance: Number(row.variance),
    needsChecking: Number(row.variance) !== 0
  }));

  const submittedAudit = {
    auditId,
    auditType: "WAREHOUSE",
    operatingArea: "Warehouse",
    department: filters.department,
    startDate: filters.startDate,
    endDate: filters.endDate,
    submittedAt: new Date().toISOString(),
    submittedBy: "Warehouse Manager",
    status: submittedRows.some((row) => row.needsChecking)
      ? "Needs Checking"
      : "OK",
    totalItems: submittedRows.length,
    okCount: submittedRows.filter((row) => row.status === "OK").length,
    checkCount: submittedRows.filter((row) => row.status === "CHECK").length,
    rows: submittedRows
  };

  const saveAudit = () => {
    saveWarehouseMonthlyAudits([submittedAudit, ...getStoredWarehouseMonthlyAudits()]);
    window.DMC_WAREHOUSE_REPORT_FILTERS.selectedAuditId = auditId;

    if (typeof window.DMC_SHOW_MODAL === "function") {
      window.DMC_SHOW_MODAL({
        type: "success",
        title: "Monthly Audit Submitted",
        message:
          "Audit has been saved. Variance items will be reviewed later from the restricted Submitted Audits / Audit Review page.",
        confirmLabel: "Continue"
      });
    }

    refreshWarehouseReportsPage();
  };

  if (typeof window.DMC_CONFIRM_MODAL === "function") {
    window.DMC_CONFIRM_MODAL({
      type: "success",
      title: "Submit Monthly Audit?",
      message:
        "After submission, this audit will be saved as the official monthly record. This page does not adjust stock.",
      confirmLabel: "Submit Audit",
      cancelLabel: "Cancel",
      onConfirm: saveAudit
    });
  } else if (confirm("Submit Monthly Audit?")) {
    saveAudit();
  }
}

function renderWarehouseSubmittedAuditRows(rows) {
  if (!rows || rows.length === 0) {
    return `<p class="submit-preview-empty">No items in this section.</p>`;
  }

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>System</th>
            <th>Physical</th>
            <th>Variance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) => `
                <tr>
                  <td>
                    <strong>${row.itemName}</strong><br />
                    <span>${row.itemId} • ${row.section || "-"} • ${row.unit}</span>
                  </td>
                  <td>${row.systemEnding}</td>
                  <td>${row.physicalCount}</td>
                  <td class="${Number(row.variance) === 0 ? "" : "danger-text"}">${row.variance}</td>
                  <td><span class="badge ${getWarehouseReportStatusBadgeClass(row.status)}">${row.status}</span></td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function formatWarehouseReportDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  });
}

function renderWarehouseSubmittedAuditReviewSection() {
  const audits = getStoredWarehouseMonthlyAudits();
  const selectedAudit = getSelectedWarehouseSubmittedAudit();

  if (audits.length === 0) {
    return `
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Submitted Audits</h3>
            <p>No submitted Warehouse monthly audits yet.</p>
          </div>
        </div>
      </section>
    `;
  }

  const needsCheckingRows = selectedAudit
    ? (selectedAudit.rows || []).filter((row) => Number(row.variance || 0) !== 0)
    : [];

  const okRows = selectedAudit
    ? (selectedAudit.rows || []).filter((row) => Number(row.variance || 0) === 0)
    : [];

  return `
    <section class="delivery-log-layout branch-log-layout">
      <section class="panel delivery-log-list-panel">
        <div class="panel-header">
          <div>
            <h3>Submitted Audits</h3>
            <p>Select a submitted Warehouse audit to review saved variance items.</p>
          </div>
          <span class="badge">${audits.length} Saved</span>
        </div>

        <div class="warehouse-log-batch-list">
          ${audits
            .map(
              (audit) => `
                <button
                  class="warehouse-log-batch-card ${selectedAudit?.auditId === audit.auditId ? "active" : ""}"
                  data-select-warehouse-audit="${audit.auditId}"
                >
                  <div class="warehouse-log-batch-card-top">
                    <div>
                      <strong>${audit.department === "all" ? "All Departments" : audit.department}</strong>
                      <span>${audit.auditId}</span>
                    </div>
                    <em>${audit.status}</em>
                  </div>
                  <div class="warehouse-log-batch-card-meta">
                    <span>Date Range</span>
                    <strong>${audit.startDate} → ${audit.endDate}</strong>
                  </div>
                  <div class="warehouse-log-batch-card-meta">
                    <span>Needs Check</span>
                    <strong>${audit.checkCount || 0}</strong>
                  </div>
                </button>
              `
            )
            .join("")}
        </div>
      </section>

      <section class="panel delivery-log-detail branch-log-detail">
        ${
          selectedAudit
            ? `
              <div class="panel-header">
                <div>
                  <h3>${selectedAudit.auditId}</h3>
                  <p>Warehouse • ${selectedAudit.department === "all" ? "All Departments" : selectedAudit.department} • ${selectedAudit.startDate} to ${selectedAudit.endDate}</p>
                </div>
                <span class="badge ${selectedAudit.status === "OK" ? "success" : "danger-badge"}">${selectedAudit.status}</span>
              </div>

              <div class="review-summary-grid">
                <div><span>Total Items</span><strong>${selectedAudit.totalItems || 0}</strong></div>
                <div><span>OK</span><strong>${selectedAudit.okCount || 0}</strong></div>
                <div><span>Needs Checking</span><strong>${selectedAudit.checkCount || 0}</strong></div>
                <div><span>Submitted</span><strong>${formatWarehouseReportDate(selectedAudit.submittedAt)}</strong></div>
              </div>

              <div class="branch-order-section"><h4>Needs Checking</h4>${renderWarehouseSubmittedAuditRows(needsCheckingRows)}</div>
              <div class="branch-order-section"><h4>OK Items</h4>${renderWarehouseSubmittedAuditRows(okRows)}</div>
            `
            : `<div class="order-list-empty"><p>No audit selected.</p><span>Select a submitted audit from the left panel.</span></div>`
        }
      </section>
    </section>
  `;
}

function getWarehouseReportsContent() {
  ensureWarehouseReportDates();
  const summary = getWarehouseAuditSummary();
  const filters = window.DMC_WAREHOUSE_REPORT_FILTERS;

  return `
    <section class="grid">
      <div class="card"><p>Report Items</p><strong>${summary.totalItems}</strong></div>
      <div class="card"><p>Pending Counts</p><strong>${summary.pending}</strong></div>
      <div class="card"><p>OK</p><strong>${summary.ok}</strong></div>
      <div class="card"><p>Needs Check</p><strong>${summary.check}</strong></div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Warehouse Monthly Physical Audit</h3>
          <p>
            System Ending uses the same current-stock calculation as Warehouse Stock.
            Movement totals come from the Ledger for reference. This page submits audits only and does not adjust stock.
          </p>
        </div>
        <button class="ghost-button">Warehouse Audit Report</button>
      </div>

      <div class="filter-bar">
        <label>
          Department
          <select id="warehouse-report-filter">
            ${renderWarehouseReportFilterOptions()}
          </select>
        </label>

        <label>
          Start Date
          <input id="warehouse-report-start-date" type="date" value="${filters.startDate}" />
        </label>

        <label>
          End Date
          <input id="warehouse-report-end-date" type="date" value="${filters.endDate}" />
        </label>

        <button class="ghost-button" id="reset-warehouse-report-filters">
          Reset Dates
        </button>
      </div>

      <div class="instruction-box">
        <strong>Audit Note:</strong>
        <span>
          Physical count creates a locked audit record. Stock correction will happen later from the restricted Submitted Audits / Audit Review page.
        </span>
      </div>

      ${
        getWarehouseSubmittedAuditForCurrentFilter()
          ? `
            <div class="instruction-box">
              <strong>Submitted:</strong>
              <span>This audit has already been submitted and locked. Review saved variance below.</span>
            </div>
          `
          : `
            <div class="form-actions review-actions">
              <button class="primary-button" id="submit-warehouse-monthly-audit">
                Submit Monthly Audit
              </button>
            </div>
          `
      }

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Section</th>
              <th>Department</th>
              <th>Item ID</th>
              <th>Item Name</th>
              <th>Unit</th>
              <th>Received</th>
              <th>Transfer In</th>
              <th>Usage</th>
              <th>Waste</th>
              <th>Transfer Out</th>
              <th>Adjustment</th>
              <th>System Ending</th>
              <th>Physical Count</th>
              <th>Variance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${renderWarehouseAuditRows()}
          </tbody>
        </table>
      </div>
    </section>

    ${renderWarehouseSubmittedAuditReviewSection()}
  `;
}

function refreshWarehouseReportsPage() {
  window.DMC_PAGES["warehouse-reports"].content = getWarehouseReportsContent();
  renderPage("warehouse-reports");
}

function setupWarehouseAuditCountEvents() {
  document.querySelectorAll("[data-warehouse-audit-item]").forEach((input) => {
    input.addEventListener("change", () => {
      const counts = getStoredWarehousePhysicalCounts();
      const itemId = input.dataset.warehouseAuditItem;
      const ending = Number(input.dataset.ending || 0);
      const value = input.value.trim();

      counts[getWarehouseAuditCountKey(itemId)] = value;
      saveWarehousePhysicalCounts(counts);

      const varianceElement = document.querySelector(`[data-warehouse-variance-for="${itemId}"]`);
      const statusElement = document.querySelector(`[data-warehouse-status-for="${itemId}"]`);

      if (!varianceElement || !statusElement) return;

      if (value === "") {
        varianceElement.textContent = "-";
        statusElement.textContent = "Pending";
        statusElement.className = "badge warning-badge";
        return;
      }

      const variance = Number(value) - ending;
      const status = variance === 0 ? "OK" : "CHECK";

      varianceElement.textContent = variance;
      statusElement.textContent = status;
      statusElement.className = `badge ${getWarehouseReportStatusBadgeClass(status)}`;
    });
  });
}

function setupWarehouseReportsEvents() {
  const filterInput = document.getElementById("warehouse-report-filter");
  const startDateInput = document.getElementById("warehouse-report-start-date");
  const endDateInput = document.getElementById("warehouse-report-end-date");
  const resetButton = document.getElementById("reset-warehouse-report-filters");
  const submitAuditButton = document.getElementById("submit-warehouse-monthly-audit");

  if (filterInput) {
    filterInput.addEventListener("change", () => {
      window.DMC_WAREHOUSE_REPORT_FILTERS.department = filterInput.value;
      window.DMC_WAREHOUSE_REPORT_FILTERS.selectedAuditId = "";
      refreshWarehouseReportsPage();
    });
  }

  if (startDateInput) {
    startDateInput.addEventListener("change", () => {
      window.DMC_WAREHOUSE_REPORT_FILTERS.startDate = startDateInput.value;
      window.DMC_WAREHOUSE_REPORT_FILTERS.selectedAuditId = "";
      refreshWarehouseReportsPage();
    });
  }

  if (endDateInput) {
    endDateInput.addEventListener("change", () => {
      window.DMC_WAREHOUSE_REPORT_FILTERS.endDate = endDateInput.value;
      window.DMC_WAREHOUSE_REPORT_FILTERS.selectedAuditId = "";
      refreshWarehouseReportsPage();
    });
  }

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      window.DMC_WAREHOUSE_REPORT_FILTERS.startDate = getWarehouseReportDefaultStartDate();
      window.DMC_WAREHOUSE_REPORT_FILTERS.endDate = getWarehouseReportTodayDate();
      window.DMC_WAREHOUSE_REPORT_FILTERS.selectedAuditId = "";
      refreshWarehouseReportsPage();
    });
  }

  if (submitAuditButton) {
    submitAuditButton.addEventListener("click", submitCurrentWarehouseMonthlyAudit);
  }

  document.querySelectorAll("[data-select-warehouse-audit]").forEach((button) => {
    button.addEventListener("click", () => {
      window.DMC_WAREHOUSE_REPORT_FILTERS.selectedAuditId = button.dataset.selectWarehouseAudit;
      refreshWarehouseReportsPage();
    });
  });

  setupWarehouseAuditCountEvents();
}

window.DMC_PAGES["warehouse-reports"] = {
  eyebrow: "Warehouse",
  title: "Warehouse Reports",
  description:
    "Monthly physical audit powered by current Warehouse Stock and Ledger history.",
  getContent: getWarehouseReportsContent,
  content: getWarehouseReportsContent(),
  afterRender: setupWarehouseReportsEvents
};
