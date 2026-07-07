window.DMC_PAGES = window.DMC_PAGES || {};


const DMC_COMMISSARY_REPORT_MASTER_LIST_KEY = "dmc_master_list_items";
const DMC_COMMISSARY_REPORT_LEDGER_KEY = "dmc_inventory_ledger_entries";

function getCommissaryReportMasterListItems() {
  const storedItems = localStorage.getItem(DMC_COMMISSARY_REPORT_MASTER_LIST_KEY);
  if (!storedItems) return [];
  try {
    const parsedItems = JSON.parse(storedItems);
    return Array.isArray(parsedItems) ? parsedItems : [];
  } catch {
    return [];
  }
}

function getCommissaryReportLedgerEntries() {
  const storedEntries = localStorage.getItem(DMC_COMMISSARY_REPORT_LEDGER_KEY);
  if (!storedEntries) return window.DMC_DATA?.ledger || [];
  try {
    const parsedEntries = JSON.parse(storedEntries);
    return Array.isArray(parsedEntries) ? parsedEntries : [];
  } catch {
    return window.DMC_DATA?.ledger || [];
  }
}

function getCommissaryReportItemOperatingAreas(item) {
  if (Array.isArray(item?.operatingAreas)) return item.operatingAreas.filter(Boolean);
  if (item?.operatingArea) {
    return String(item.operatingArea).split(",").map((area) => area.trim()).filter(Boolean);
  }
  return [];
}

function itemBelongsToCommissaryReport(item) {
  if (item.active === false) return false;
  return getCommissaryReportItemOperatingAreas(item)
    .map((area) => String(area || "").toLowerCase())
    .some((area) => area.includes("commissary"));
}

function entryBelongsToCommissaryReport(entry) {
  const location = String(entry.location || "").toLowerCase();
  const department = String(entry.department || "").toLowerCase();
  const source = String(entry.source || "").toLowerCase();
  const destination = String(entry.destination || "").toLowerCase();
  const movementField = String(entry.movementField || "");
  const stockEffect = String(entry.stockEffect || "").toLowerCase();

  const isBranchSendingToCommissary =
    movementField === "transOutCommissary" ||
    (source.includes("branch daily input") &&
      destination.includes("commissary") &&
      stockEffect === "deduct");

  if (isBranchSendingToCommissary) return false;

  return (
    location.includes("commissary") ||
    department.includes("commissary") ||
    source.includes("commissary") ||
    destination.includes("commissary") ||
    movementField === "receivedFromBranch"
  );
}

function getCommissaryReportLedgerEntriesOnly() {
  return getCommissaryReportLedgerEntries().filter(entryBelongsToCommissaryReport);
}

function getCommissaryReportLedgerEntriesForItem(itemId) {
  return getCommissaryReportLedgerEntriesOnly().filter(
    (entry) => String(entry.itemId || "") === String(itemId || "")
  );
}

function getCommissaryReportEntryTime(entry) {
  return String(entry.submittedAt || entry.date || "");
}

function getCommissaryReportEntryStockEffect(entry) {
  if (entry.stockEffect) return entry.stockEffect;
  if (entry.movementType === "Transfer In" || entry.movementType === "Received") return "add";
  if (entry.movementType === "Transfer Out") return "deduct";
  if (entry.movementType === "Remaining Count") return "set";
  return "report";
}

function getLatestCommissaryReportRemainingCount(itemId) {
  const remainingEntries = getCommissaryReportLedgerEntriesForItem(itemId).filter(
    (entry) => entry.movementType === "Remaining Count" || entry.stockEffect === "set"
  );
  if (remainingEntries.length === 0) return null;
  return [...remainingEntries].sort((a, b) =>
    getCommissaryReportEntryTime(b).localeCompare(getCommissaryReportEntryTime(a))
  )[0];
}

function getCommissaryReportOpeningStock(item) {
  const openingStock = item.currentStock ?? item.startingStock ?? item.openingStock ?? item.quantity ?? 0;
  const parsedStock = Number(openingStock);
  return Number.isNaN(parsedStock) ? 0 : parsedStock;
}

function calculateCommissaryReportCurrentStock(item) {
  const entries = getCommissaryReportLedgerEntriesForItem(item.itemId);
  const latestRemainingCount = getLatestCommissaryReportRemainingCount(item.itemId);

  if (latestRemainingCount) {
    const latestRemainingTime = getCommissaryReportEntryTime(latestRemainingCount);
    const startingFromRemaining = Number(latestRemainingCount.quantity || 0);

    return entries
      .filter((entry) => entry !== latestRemainingCount && getCommissaryReportEntryTime(entry) > latestRemainingTime)
      .reduce((total, entry) => {
        const quantity = Number(entry.quantity || 0);
        const stockEffect = getCommissaryReportEntryStockEffect(entry);
        if (stockEffect === "add") return total + quantity;
        if (stockEffect === "deduct") return total - quantity;
        if (stockEffect === "set") return quantity;
        return total;
      }, Number.isNaN(startingFromRemaining) ? 0 : startingFromRemaining);
  }

  return entries.reduce((total, entry) => {
    const quantity = Number(entry.quantity || 0);
    const stockEffect = getCommissaryReportEntryStockEffect(entry);
    if (stockEffect === "add") return total + quantity;
    if (stockEffect === "deduct") return total - quantity;
    if (stockEffect === "set") return quantity;
    return total;
  }, getCommissaryReportOpeningStock(item));
}

function getCommissaryReportBaseItems() {
  return getCommissaryReportMasterListItems()
    .filter(itemBelongsToCommissaryReport)
    .map((item) => ({
      ...item,
      itemName: item.officialItemName || item.itemName || item.name || "-",
      department: item.department || "Commissary",
      section: item.section || "Unassigned",
      unit: item.unit || "-"
    }));
}


const DMC_COMMISSARY_REPORT_AUDITS_KEY = "dmc_commissary_monthly_audits";
const DMC_COMMISSARY_REPORT_PHYSICAL_COUNTS_KEY = "dmc_commissary_audit_physical_counts";

window.DMC_COMMISSARY_REPORT_FILTERS = window.DMC_COMMISSARY_REPORT_FILTERS || {
  section: "all",
  startDate: "",
  endDate: "",
  selectedAuditId: ""
};

function getCommissaryReportTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getCommissaryReportDefaultStartDate() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  return firstDay.toISOString().slice(0, 10);
}

function ensureCommissaryReportDates() {
  if (!window.DMC_COMMISSARY_REPORT_FILTERS.startDate) {
    window.DMC_COMMISSARY_REPORT_FILTERS.startDate = getCommissaryReportDefaultStartDate();
  }

  if (!window.DMC_COMMISSARY_REPORT_FILTERS.endDate) {
    window.DMC_COMMISSARY_REPORT_FILTERS.endDate = getCommissaryReportTodayDate();
  }
}

function getStoredCommissaryPhysicalCounts() {
  const storedCounts = localStorage.getItem(DMC_COMMISSARY_REPORT_PHYSICAL_COUNTS_KEY);
  if (!storedCounts) return {};
  try { return JSON.parse(storedCounts); } catch { return {}; }
}

function saveCommissaryPhysicalCounts(counts) {
  localStorage.setItem(DMC_COMMISSARY_REPORT_PHYSICAL_COUNTS_KEY, JSON.stringify(counts));
}

function getStoredCommissaryMonthlyAudits() {
  const storedAudits = localStorage.getItem(DMC_COMMISSARY_REPORT_AUDITS_KEY);
  if (!storedAudits) return [];
  try {
    const parsedAudits = JSON.parse(storedAudits);
    return Array.isArray(parsedAudits) ? parsedAudits : [];
  } catch {
    return [];
  }
}

function saveCommissaryMonthlyAudits(audits) {
  localStorage.setItem(DMC_COMMISSARY_REPORT_AUDITS_KEY, JSON.stringify(audits));
}

function createCommissaryAuditId() {
  const filters = window.DMC_COMMISSARY_REPORT_FILTERS;
  const now = new Date();
  const timePart = now.toTimeString().slice(0, 8).replaceAll(":", "");
  const filterPart = filters.section || "all";

  return `COMMAUD-${filterPart}-${filters.startDate}-${filters.endDate}-${timePart}`
    .replaceAll(" ", "-")
    .toUpperCase();
}

function getCommissarySubmittedAuditForCurrentFilter() {
  const filters = window.DMC_COMMISSARY_REPORT_FILTERS;

  return getStoredCommissaryMonthlyAudits().find(
    (audit) =>
      audit.section === filters.section &&
      audit.startDate === filters.startDate &&
      audit.endDate === filters.endDate
  );
}

function getSelectedCommissarySubmittedAudit() {
  const audits = getStoredCommissaryMonthlyAudits();

  if (window.DMC_COMMISSARY_REPORT_FILTERS.selectedAuditId) {
    const selectedAudit = audits.find(
      (audit) => audit.auditId === window.DMC_COMMISSARY_REPORT_FILTERS.selectedAuditId
    );

    if (selectedAudit) return selectedAudit;
  }

  return getCommissarySubmittedAuditForCurrentFilter() || audits[0] || null;
}

function getCommissaryAuditCountKey(itemId) {
  const filters = window.DMC_COMMISSARY_REPORT_FILTERS;
  return `${filters.section}|${filters.startDate}|${filters.endDate}|${itemId}`;
}

function getCommissaryPhysicalCountValue(itemId) {
  const counts = getStoredCommissaryPhysicalCounts();
  return counts[getCommissaryAuditCountKey(itemId)] || "";
}

function getCommissaryReportFilterOptions() {
  return [
    ...new Set(getCommissaryReportBaseItems().map((item) => item.section).filter(Boolean))
  ].sort();
}

function getCommissaryReportItemsForFilter() {
  const filters = window.DMC_COMMISSARY_REPORT_FILTERS;

  return getCommissaryReportBaseItems().filter((item) => {
    return filters.section === "all" ||
      String(item.section || "") === String(filters.section);
  });
}

function getCommissaryLedgerEntriesForReport() {
  ensureCommissaryReportDates();

  const filters = window.DMC_COMMISSARY_REPORT_FILTERS;
  const reportItems = getCommissaryReportItemsForFilter();

  return getCommissaryReportLedgerEntriesOnly().filter((entry) => {
    const entryDate = String(entry.date || entry.submittedAt || "").slice(0, 10);
    const matchesStart = entryDate >= filters.startDate;
    const matchesEnd = entryDate <= filters.endDate;

    const itemIsInFilter = reportItems.some(
      (item) => String(item.itemId || "") === String(entry.itemId || "")
    );

    return matchesStart && matchesEnd && itemIsInFilter;
  });
}

function buildCommissaryAuditRows() {
  const items = getCommissaryReportItemsForFilter();
  const ledgerEntries = getCommissaryLedgerEntriesForReport();
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

    const systemEnding = baseItem ? calculateCommissaryReportCurrentStock(baseItem) : 0;
    const physicalCount = getCommissaryPhysicalCountValue(row.itemId);
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

function getCommissaryReportStatusBadgeClass(status) {
  if (status === "CHECK") return "danger-badge";
  if (status === "OK") return "";
  return "warning-badge";
}

function getCommissaryAuditSummary() {
  const rows = buildCommissaryAuditRows();

  return {
    totalItems: rows.length,
    pending: rows.filter((row) => row.status === "Pending").length,
    ok: rows.filter((row) => row.status === "OK").length,
    check: rows.filter((row) => row.status === "CHECK").length
  };
}

function renderCommissaryReportFilterOptions() {
  const currentValue = window.DMC_COMMISSARY_REPORT_FILTERS.section;

  return `
    <option value="all" ${currentValue === "all" ? "selected" : ""}>
      All Sections
    </option>
    ${getCommissaryReportFilterOptions()
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

function renderCommissaryAuditRows() {
  const rows = buildCommissaryAuditRows();
  const isSubmitted = Boolean(getCommissarySubmittedAuditForCurrentFilter());

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
              data-commissary-audit-item="${row.itemId}"
              data-ending="${row.systemEnding}"
              type="number"
              step="any"
              value="${row.physicalCount}"
              ${isSubmitted ? "disabled" : ""}
            />
          </td>
          <td>
            <span class="audit-variance" data-commissary-variance-for="${row.itemId}">
              ${row.variance === "" ? "-" : row.variance}
            </span>
          </td>
          <td>
            <span class="badge ${getCommissaryReportStatusBadgeClass(row.status)}" data-commissary-status-for="${row.itemId}">
              ${row.status}
            </span>
          </td>
        </tr>
      `
    )
    .join("");
}

function submitCurrentCommissaryMonthlyAudit() {
  const rows = buildCommissaryAuditRows();
  const missingCounts = rows.filter((row) => String(row.physicalCount || "").trim() === "");

  if (missingCounts.length > 0) {
    alert("Please enter physical count for every item before submitting audit.");
    return;
  }

  if (getCommissarySubmittedAuditForCurrentFilter()) {
    alert("This filter/date range audit has already been submitted.");
    return;
  }

  const filters = window.DMC_COMMISSARY_REPORT_FILTERS;
  const auditId = createCommissaryAuditId();

  const submittedRows = rows.map((row) => ({
    ...row,
    physicalCount: Number(row.physicalCount),
    variance: Number(row.variance),
    needsChecking: Number(row.variance) !== 0
  }));

  const submittedAudit = {
    auditId,
    auditType: "COMMISSARY",
    operatingArea: "Commissary",
    section: filters.section,
    startDate: filters.startDate,
    endDate: filters.endDate,
    submittedAt: new Date().toISOString(),
    submittedBy: "Commissary Manager",
    status: submittedRows.some((row) => row.needsChecking)
      ? "Needs Checking"
      : "OK",
    totalItems: submittedRows.length,
    okCount: submittedRows.filter((row) => row.status === "OK").length,
    checkCount: submittedRows.filter((row) => row.status === "CHECK").length,
    rows: submittedRows
  };

  const saveAudit = () => {
    saveCommissaryMonthlyAudits([submittedAudit, ...getStoredCommissaryMonthlyAudits()]);
    window.DMC_COMMISSARY_REPORT_FILTERS.selectedAuditId = auditId;

    if (typeof window.DMC_SHOW_MODAL === "function") {
      window.DMC_SHOW_MODAL({
        type: "success",
        title: "Monthly Audit Submitted",
        message:
          "Audit has been saved. Variance items will be reviewed later from the restricted Submitted Audits / Audit Review page.",
        confirmLabel: "Continue"
      });
    }

    refreshCommissaryReportsPage();
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

function renderCommissarySubmittedAuditRows(rows) {
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
                  <td><span class="badge ${getCommissaryReportStatusBadgeClass(row.status)}">${row.status}</span></td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function formatCommissaryReportDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  });
}

function renderCommissarySubmittedAuditReviewSection() {
  const audits = getStoredCommissaryMonthlyAudits();
  const selectedAudit = getSelectedCommissarySubmittedAudit();

  if (audits.length === 0) {
    return `
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Submitted Audits</h3>
            <p>No submitted Commissary monthly audits yet.</p>
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
            <p>Select a submitted Commissary audit to review saved variance items.</p>
          </div>
          <span class="badge">${audits.length} Saved</span>
        </div>

        <div class="warehouse-log-batch-list">
          ${audits
            .map(
              (audit) => `
                <button
                  class="warehouse-log-batch-card ${selectedAudit?.auditId === audit.auditId ? "active" : ""}"
                  data-select-commissary-audit="${audit.auditId}"
                >
                  <div class="warehouse-log-batch-card-top">
                    <div>
                      <strong>${audit.section === "all" ? "All Sections" : audit.section}</strong>
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
                  <p>Commissary • ${selectedAudit.section === "all" ? "All Sections" : selectedAudit.section} • ${selectedAudit.startDate} to ${selectedAudit.endDate}</p>
                </div>
                <span class="badge ${selectedAudit.status === "OK" ? "success" : "danger-badge"}">${selectedAudit.status}</span>
              </div>

              <div class="review-summary-grid">
                <div><span>Total Items</span><strong>${selectedAudit.totalItems || 0}</strong></div>
                <div><span>OK</span><strong>${selectedAudit.okCount || 0}</strong></div>
                <div><span>Needs Checking</span><strong>${selectedAudit.checkCount || 0}</strong></div>
                <div><span>Submitted</span><strong>${formatCommissaryReportDate(selectedAudit.submittedAt)}</strong></div>
              </div>

              <div class="branch-order-section"><h4>Needs Checking</h4>${renderCommissarySubmittedAuditRows(needsCheckingRows)}</div>
              <div class="branch-order-section"><h4>OK Items</h4>${renderCommissarySubmittedAuditRows(okRows)}</div>
            `
            : `<div class="order-list-empty"><p>No audit selected.</p><span>Select a submitted audit from the left panel.</span></div>`
        }
      </section>
    </section>
  `;
}

function getCommissaryReportsContent() {
  ensureCommissaryReportDates();
  const summary = getCommissaryAuditSummary();
  const filters = window.DMC_COMMISSARY_REPORT_FILTERS;

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
          <h3>Commissary Monthly Physical Audit</h3>
          <p>
            System Ending uses the same current-stock calculation as Commissary Stock.
            Movement totals come from the Ledger for reference. This page submits audits only and does not adjust stock.
          </p>
        </div>
        <button class="ghost-button">Commissary Audit Report</button>
      </div>

      <div class="filter-bar">
        <label>
          Section
          <select id="commissary-report-filter">
            ${renderCommissaryReportFilterOptions()}
          </select>
        </label>

        <label>
          Start Date
          <input id="commissary-report-start-date" type="date" value="${filters.startDate}" />
        </label>

        <label>
          End Date
          <input id="commissary-report-end-date" type="date" value="${filters.endDate}" />
        </label>

        <button class="ghost-button" id="reset-commissary-report-filters">
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
        getCommissarySubmittedAuditForCurrentFilter()
          ? `
            <div class="instruction-box">
              <strong>Submitted:</strong>
              <span>This audit has already been submitted and locked. Review saved variance below.</span>
            </div>
          `
          : `
            <div class="form-actions review-actions">
              <button class="primary-button" id="submit-commissary-monthly-audit">
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
            ${renderCommissaryAuditRows()}
          </tbody>
        </table>
      </div>
    </section>

    ${renderCommissarySubmittedAuditReviewSection()}
  `;
}

function refreshCommissaryReportsPage() {
  window.DMC_PAGES["commissary-reports"].content = getCommissaryReportsContent();
  renderPage("commissary-reports");
}

function setupCommissaryAuditCountEvents() {
  document.querySelectorAll("[data-commissary-audit-item]").forEach((input) => {
    input.addEventListener("change", () => {
      const counts = getStoredCommissaryPhysicalCounts();
      const itemId = input.dataset.commissaryAuditItem;
      const ending = Number(input.dataset.ending || 0);
      const value = input.value.trim();

      counts[getCommissaryAuditCountKey(itemId)] = value;
      saveCommissaryPhysicalCounts(counts);

      const varianceElement = document.querySelector(`[data-commissary-variance-for="${itemId}"]`);
      const statusElement = document.querySelector(`[data-commissary-status-for="${itemId}"]`);

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
      statusElement.className = `badge ${getCommissaryReportStatusBadgeClass(status)}`;
    });
  });
}

function setupCommissaryReportsEvents() {
  const filterInput = document.getElementById("commissary-report-filter");
  const startDateInput = document.getElementById("commissary-report-start-date");
  const endDateInput = document.getElementById("commissary-report-end-date");
  const resetButton = document.getElementById("reset-commissary-report-filters");
  const submitAuditButton = document.getElementById("submit-commissary-monthly-audit");

  if (filterInput) {
    filterInput.addEventListener("change", () => {
      window.DMC_COMMISSARY_REPORT_FILTERS.section = filterInput.value;
      window.DMC_COMMISSARY_REPORT_FILTERS.selectedAuditId = "";
      refreshCommissaryReportsPage();
    });
  }

  if (startDateInput) {
    startDateInput.addEventListener("change", () => {
      window.DMC_COMMISSARY_REPORT_FILTERS.startDate = startDateInput.value;
      window.DMC_COMMISSARY_REPORT_FILTERS.selectedAuditId = "";
      refreshCommissaryReportsPage();
    });
  }

  if (endDateInput) {
    endDateInput.addEventListener("change", () => {
      window.DMC_COMMISSARY_REPORT_FILTERS.endDate = endDateInput.value;
      window.DMC_COMMISSARY_REPORT_FILTERS.selectedAuditId = "";
      refreshCommissaryReportsPage();
    });
  }

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      window.DMC_COMMISSARY_REPORT_FILTERS.startDate = getCommissaryReportDefaultStartDate();
      window.DMC_COMMISSARY_REPORT_FILTERS.endDate = getCommissaryReportTodayDate();
      window.DMC_COMMISSARY_REPORT_FILTERS.selectedAuditId = "";
      refreshCommissaryReportsPage();
    });
  }

  if (submitAuditButton) {
    submitAuditButton.addEventListener("click", submitCurrentCommissaryMonthlyAudit);
  }

  document.querySelectorAll("[data-select-commissary-audit]").forEach((button) => {
    button.addEventListener("click", () => {
      window.DMC_COMMISSARY_REPORT_FILTERS.selectedAuditId = button.dataset.selectCommissaryAudit;
      refreshCommissaryReportsPage();
    });
  });

  setupCommissaryAuditCountEvents();
}

window.DMC_PAGES["commissary-reports"] = {
  eyebrow: "Commissary",
  title: "Commissary Reports",
  description:
    "Monthly physical audit powered by current Commissary Stock and Ledger history.",
  getContent: getCommissaryReportsContent,
  content: getCommissaryReportsContent(),
  afterRender: setupCommissaryReportsEvents
};
