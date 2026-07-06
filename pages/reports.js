window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_REPORT_LEDGER_STORAGE_KEY = "dmc_inventory_ledger_entries";
const DMC_REPORT_MASTER_LIST_STORAGE_KEY = "dmc_master_list_items";
const DMC_REPORT_SETTINGS_STORAGE_KEY = "dmc_inventory_settings";
const DMC_AUDIT_PHYSICAL_COUNTS_KEY = "dmc_audit_physical_counts";
const DMC_BRANCH_MONTHLY_AUDITS_KEY = "dmc_branch_monthly_audits";
const DMC_BRANCH_STARTING_STOCK_KEY = "dmc_branch_opening_stock";

window.DMC_REPORT_FILTERS = window.DMC_REPORT_FILTERS || {
  department: "Bar",
  startDate: "",
  endDate: "",
  selectedAuditId: ""
};

window.DMC_BRANCH_AUDIT_ADJUSTMENT_NOTES =
  window.DMC_BRANCH_AUDIT_ADJUSTMENT_NOTES || {};

function getTodayReportDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultReportStartDate() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  return firstDay.toISOString().slice(0, 10);
}

function ensureReportDates() {
  if (!window.DMC_REPORT_FILTERS.startDate) {
    window.DMC_REPORT_FILTERS.startDate = getDefaultReportStartDate();
  }

  if (!window.DMC_REPORT_FILTERS.endDate) {
    window.DMC_REPORT_FILTERS.endDate = getTodayReportDate();
  }
}

function getReportSettings() {
  const storedSettings = localStorage.getItem(DMC_REPORT_SETTINGS_STORAGE_KEY);

  if (storedSettings) {
    try {
      const parsed = JSON.parse(storedSettings);

      return {
        departments: parsed.departments || []
      };
    } catch {
      return {
        departments: window.DMC_DATA?.settings?.departments || []
      };
    }
  }

  return {
    departments: window.DMC_DATA?.settings?.departments || []
  };
}

function getReportMasterListItems() {
  const storedItems = localStorage.getItem(DMC_REPORT_MASTER_LIST_STORAGE_KEY);

  if (storedItems) {
    try {
      return JSON.parse(storedItems);
    } catch {
      return window.DMC_DATA?.masterList?.items || [];
    }
  }

  return window.DMC_DATA?.masterList?.items || [];
}

function getReportLedgerEntries() {
  const storedEntries = localStorage.getItem(DMC_REPORT_LEDGER_STORAGE_KEY);

  if (storedEntries) {
    try {
      return JSON.parse(storedEntries);
    } catch {
      return window.DMC_DATA?.ledger || [];
    }
  }

  return window.DMC_DATA?.ledger || [];
}

function getStoredPhysicalCounts() {
  const storedCounts = localStorage.getItem(DMC_AUDIT_PHYSICAL_COUNTS_KEY);

  if (!storedCounts) {
    return {};
  }

  try {
    return JSON.parse(storedCounts);
  } catch {
    return {};
  }
}

function savePhysicalCounts(counts) {
  localStorage.setItem(DMC_AUDIT_PHYSICAL_COUNTS_KEY, JSON.stringify(counts));
}

function getStoredBranchMonthlyAudits() {
  const storedAudits = localStorage.getItem(DMC_BRANCH_MONTHLY_AUDITS_KEY);

  if (!storedAudits) {
    return [];
  }

  try {
    const parsedAudits = JSON.parse(storedAudits);
    return Array.isArray(parsedAudits) ? parsedAudits : [];
  } catch {
    return [];
  }
}

function saveBranchMonthlyAudits(audits) {
  localStorage.setItem(DMC_BRANCH_MONTHLY_AUDITS_KEY, JSON.stringify(audits));
}

function createBranchAuditId() {
  const filters = window.DMC_REPORT_FILTERS;
  const now = new Date();
  const timePart = now.toTimeString().slice(0, 8).replaceAll(":", "");

  return `BRAUD-${filters.department}-${filters.startDate}-${filters.endDate}-${timePart}`
    .replaceAll(" ", "-")
    .toUpperCase();
}

function getSubmittedAuditForCurrentFilter() {
  const filters = window.DMC_REPORT_FILTERS;

  return getStoredBranchMonthlyAudits().find(
    (audit) =>
      audit.department === filters.department &&
      audit.startDate === filters.startDate &&
      audit.endDate === filters.endDate
  );
}

function getSelectedSubmittedAudit() {
  const audits = getStoredBranchMonthlyAudits();

  if (window.DMC_REPORT_FILTERS.selectedAuditId) {
    const selectedAudit = audits.find(
      (audit) => audit.auditId === window.DMC_REPORT_FILTERS.selectedAuditId
    );

    if (selectedAudit) {
      return selectedAudit;
    }
  }

  return getSubmittedAuditForCurrentFilter() || audits[0] || null;
}

function getBranchAuditAdjustmentKey(auditId, itemId) {
  return `${auditId}|${itemId}`;
}

function getBranchAuditAdjustmentNotes(auditId, itemId) {
  return (
    window.DMC_BRANCH_AUDIT_ADJUSTMENT_NOTES[
      getBranchAuditAdjustmentKey(auditId, itemId)
    ] || ""
  );
}

function saveBranchAuditAdjustmentNote(auditId, itemId, note) {
  window.DMC_BRANCH_AUDIT_ADJUSTMENT_NOTES[
    getBranchAuditAdjustmentKey(auditId, itemId)
  ] = note;
}

function getExistingAdjustmentAuditKeys() {
  return new Set(
    getReportLedgerEntries()
      .filter((entry) => entry.source === "Branch Monthly Audit Adjustment")
      .map((entry) => `${entry.auditId || ""}|${entry.itemId || ""}`)
  );
}

function createBranchAuditAdjustmentEntry(audit, auditRow, note) {
  const variance = Number(auditRow.variance || 0);
  const quantity = Math.abs(variance);

  if (!quantity) {
    return null;
  }

  return {
    date: getTodayReportDate(),
    submittedAt: new Date().toISOString(),
    batchId: `${audit.auditId}-ADJ`,
    auditId: audit.auditId,
    location: "DMC-Iriga Branch",
    department: audit.department,
    section: auditRow.section || "",
    itemId: auditRow.itemId || "",
    itemName: auditRow.itemName || "",
    movementType: "Adjustment",
    movementField: "adjustment",
    stockEffect: variance > 0 ? "add" : "deduct",
    quantity,
    unit: auditRow.unit || "",
    source: "Branch Monthly Audit Adjustment",
    destination: "DMC-Iriga Branch",
    managerReviewedBy: audit.submittedBy || "Branch Manager",
    notes: `Monthly audit adjustment from system stock ${auditRow.systemEnding} to physical count ${auditRow.physicalCount}. Variance: ${auditRow.variance}. ${note || ""}`.trim()
  };
}

function postBranchAuditAdjustment(auditId, itemId) {
  const audits = getStoredBranchMonthlyAudits();
  const audit = audits.find((storedAudit) => storedAudit.auditId === auditId);

  if (!audit) return;

  const auditRow = (audit.rows || []).find((row) => row.itemId === itemId);

  if (!auditRow || Number(auditRow.variance || 0) === 0) return;

  const note = getBranchAuditAdjustmentNotes(auditId, itemId);

  if (!String(note || "").trim()) {
    alert("Please add an adjustment note/reason before posting adjustment.");
    return;
  }

  const adjustmentKey = `${auditId}|${itemId}`;

  if (getExistingAdjustmentAuditKeys().has(adjustmentKey)) {
    alert("Adjustment for this audit item was already posted.");
    return;
  }

  const adjustmentEntry = createBranchAuditAdjustmentEntry(audit, auditRow, note);

  if (!adjustmentEntry) return;

  const saveAdjustment = () => {
    localStorage.setItem(
      DMC_REPORT_LEDGER_STORAGE_KEY,
      JSON.stringify([...getReportLedgerEntries(), adjustmentEntry])
    );

    const updatedAudits = audits.map((storedAudit) => {
      if (storedAudit.auditId !== auditId) return storedAudit;

      return {
        ...storedAudit,
        rows: (storedAudit.rows || []).map((row) => {
          if (row.itemId !== itemId) return row;

          return {
            ...row,
            adjustmentPosted: true,
            adjustmentPostedAt: new Date().toISOString(),
            adjustmentNote: note
          };
        }),
        adjustedAt: new Date().toISOString()
      };
    });

    saveBranchMonthlyAudits(updatedAudits);

    if (typeof window.DMC_SHOW_MODAL === "function") {
      window.DMC_SHOW_MODAL({
        type: "success",
        title: "Adjustment Posted",
        message:
          "Adjustment was posted to the Ledger. Branch Stock will now reflect the physical audit correction.",
        confirmLabel: "Continue"
      });
    }

    refreshReportsPage();
  };

  if (typeof window.DMC_CONFIRM_MODAL === "function") {
    window.DMC_CONFIRM_MODAL({
      type: "warning",
      title: "Post Stock Adjustment?",
      message: `Post adjustment for ${auditRow.itemName}? This will change Branch Stock through the Ledger.`,
      confirmLabel: "Post Adjustment",
      cancelLabel: "Cancel",
      onConfirm: saveAdjustment
    });
  } else if (confirm(`Post adjustment for ${auditRow.itemName}?`)) {
    saveAdjustment();
  }
}

function submitCurrentBranchMonthlyAudit() {
  const rows = buildAuditRows();
  const missingCounts = rows.filter(
    (row) => String(row.physicalCount || "").trim() === ""
  );

  if (missingCounts.length > 0) {
    alert("Please enter physical count for every item before submitting audit.");
    return;
  }

  const existingAudit = getSubmittedAuditForCurrentFilter();

  if (existingAudit) {
    alert("This department/date range audit has already been submitted.");
    return;
  }

  const filters = window.DMC_REPORT_FILTERS;
  const auditId = createBranchAuditId();
  const submittedRows = rows.map((row) => ({
    ...row,
    physicalCount: Number(row.physicalCount),
    variance: Number(row.variance),
    needsChecking: Number(row.variance) !== 0,
    adjustmentPosted: false
  }));

  const submittedAudit = {
    auditId,
    branch: "DMC-Iriga Branch",
    department: filters.department,
    startDate: filters.startDate,
    endDate: filters.endDate,
    submittedAt: new Date().toISOString(),
    submittedBy: "Branch Manager",
    status: submittedRows.some((row) => row.needsChecking)
      ? "Needs Checking"
      : "OK",
    totalItems: submittedRows.length,
    okCount: submittedRows.filter((row) => row.status === "OK").length,
    checkCount: submittedRows.filter((row) => row.status === "CHECK").length,
    rows: submittedRows
  };

  const saveAudit = () => {
    saveBranchMonthlyAudits([submittedAudit, ...getStoredBranchMonthlyAudits()]);
    window.DMC_REPORT_FILTERS.selectedAuditId = auditId;

    if (typeof window.DMC_SHOW_MODAL === "function") {
      window.DMC_SHOW_MODAL({
        type: "success",
        title: "Monthly Audit Submitted",
        message:
          "Audit has been saved. Variance items are now available for review and adjustment.",
        confirmLabel: "Continue"
      });
    }

    refreshReportsPage();
  };

  if (typeof window.DMC_CONFIRM_MODAL === "function") {
    window.DMC_CONFIRM_MODAL({
      type: "success",
      title: "Submit Monthly Audit?",
      message:
        "After submission, the audit will be saved as the official monthly record. Variance adjustments can be posted after submission.",
      confirmLabel: "Submit Audit",
      cancelLabel: "Cancel",
      onConfirm: saveAudit
    });
  } else if (confirm("Submit Monthly Audit?")) {
    saveAudit();
  }
}

function getStoredStartingStockForReports() {
  const storedStartingStock = localStorage.getItem(
    DMC_BRANCH_STARTING_STOCK_KEY
  );

  if (!storedStartingStock) {
    return {};
  }

  try {
    return JSON.parse(storedStartingStock);
  } catch {
    return {};
  }
}

function getStartingStockForReportItem(itemId) {
  const startingStock = getStoredStartingStockForReports();
  const filters = window.DMC_REPORT_FILTERS;
  const key = `${filters.department}|${itemId}`;
  const value = startingStock[key];

  if (String(value || "").trim() === "") {
    return 0;
  }

  const parsedValue = Number(value);

  return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

function getCurrentBranchStockForReportItem(itemId) {
  const item = getReportMasterListItems().find(
    (masterItem) => String(masterItem.itemId || "") === String(itemId || "")
  );

  if (!item) {
    return 0;
  }

  const possibleValues = [
    item.currentStock,
    item.branchCurrentStock,
    item.branchStock,
    item.stockOnHand,
    item.stockLeft,
    item.quantityOnHand,
    item.quantity,
    item.onHand
  ];

  const foundValue = possibleValues.find(
    (value) => value !== undefined && value !== null && value !== ""
  );

  const parsedValue = Number(foundValue || 0);

  return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

function getAuditCountKey(itemId) {
  const filters = window.DMC_REPORT_FILTERS;

  return `${filters.department}|${filters.startDate}|${filters.endDate}|${itemId}`;
}

function getPhysicalCountValue(itemId) {
  const counts = getStoredPhysicalCounts();
  return counts[getAuditCountKey(itemId)] || "";
}

function getLedgerEntriesForReport() {
  ensureReportDates();

  const filters = window.DMC_REPORT_FILTERS;

  return getReportLedgerEntries().filter((entry) => {
    const entryDate = String(entry.date || "");
    const matchesDepartment = entry.department === filters.department;
    const matchesStart = entryDate >= filters.startDate;
    const matchesEnd = entryDate <= filters.endDate;

    return matchesDepartment && matchesStart && matchesEnd;
  });
}

function getMasterListItemsForDepartment() {
  const filters = window.DMC_REPORT_FILTERS;

  return getReportMasterListItems().filter(
    (item) => item.department === filters.department
  );
}

function buildAuditRows() {
  const masterItems = getMasterListItemsForDepartment();
  const ledgerEntries = getLedgerEntriesForReport();

  const rowsByItemId = {};

  masterItems.forEach((item) => {
    rowsByItemId[item.itemId] = {
      section: item.section || "-",
      itemId: item.itemId || "-",
      itemName: item.officialItemName || "-",
      unit: item.unit || "-",
      startingStock: getStartingStockForReportItem(item.itemId),
      received: 0,
      transferIn: 0,
      usage: 0,
      waste: 0,
      transferOut: 0,
      adjustment: 0
    };
  });

  ledgerEntries.forEach((entry) => {
    if (!rowsByItemId[entry.itemId]) {
      rowsByItemId[entry.itemId] = {
        section: entry.section || "-",
        itemId: entry.itemId || "-",
        itemName: entry.itemName || "-",
        unit: entry.unit || "-",
        startingStock: getStartingStockForReportItem(entry.itemId),
        received: 0,
        transferIn: 0,
        usage: 0,
        waste: 0,
        transferOut: 0,
        adjustment: 0
      };
    }

    const quantity = Number(entry.quantity || 0);

    if (entry.movementType === "Received") {
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
    const systemEnding = getCurrentBranchStockForReportItem(row.itemId);

    const physicalCount = getPhysicalCountValue(row.itemId);
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
  });
}

function renderReportDepartmentOptions() {
  const settings = getReportSettings();
  const currentDepartment = window.DMC_REPORT_FILTERS.department;

  return settings.departments
    .map(
      (department) => `
        <option value="${department.name}" ${
        currentDepartment === department.name ? "selected" : ""
      }>
          ${department.name}
        </option>
      `
    )
    .join("");
}

function getReportStatusBadgeClass(status) {
  if (status === "CHECK") return "danger-badge";
  if (status === "OK") return "";
  return "warning-badge";
}

function renderAuditRows() {
  const rows = buildAuditRows();
  const isSubmitted = Boolean(getSubmittedAuditForCurrentFilter());

  if (rows.length === 0) {
    return `
      <tr>
        <td colspan="15">No items found for this department and date range.</td>
      </tr>
    `;
  }

  return rows
    .map(
      (row) => `
        <tr>
          <td>${row.section}</td>
          <td>${row.itemId}</td>
          <td>${row.itemName}</td>
          <td>${row.unit}</td>
          <td>${row.startingStock}</td>
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
              data-item-id="${row.itemId}"
              data-ending="${row.systemEnding}"
              type="number"
              step="any"
              value="${row.physicalCount}"
              ${isSubmitted ? "disabled" : ""}
            />
          </td>
          <td>
            <span class="audit-variance" data-variance-for="${row.itemId}">
              ${row.variance === "" ? "-" : row.variance}
            </span>
          </td>
          <td>
            <span class="badge ${getReportStatusBadgeClass(row.status)}" data-status-for="${row.itemId}">
              ${row.status}
            </span>
          </td>
        </tr>
      `
    )
    .join("");
}

function getAuditSummary() {
  const rows = buildAuditRows();

  return {
    totalItems: rows.length,
    pending: rows.filter((row) => row.status === "Pending").length,
    ok: rows.filter((row) => row.status === "OK").length,
    check: rows.filter((row) => row.status === "CHECK").length
  };
}

function getReportsContent() {
  ensureReportDates();

  const summary = getAuditSummary();
  const filters = window.DMC_REPORT_FILTERS;

  return `
    <section class="grid">
      <div class="card">
        <p>Report Items</p>
        <strong>${summary.totalItems}</strong>
      </div>

      <div class="card">
        <p>Pending Counts</p>
        <strong>${summary.pending}</strong>
      </div>

      <div class="card">
        <p>OK</p>
        <strong>${summary.ok}</strong>
      </div>

      <div class="card">
        <p>Needs Check</p>
        <strong>${summary.check}</strong>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Monthly Physical Audit</h3>
          <p>
            Select a department and date range. System Ending comes from the current Branch Stock value. Movement totals come from the Ledger for reference. Physical Count is entered during audit. Submit the audit first, then review variance items for adjustment.
          </p>
        </div>

        <button class="ghost-button">Branch Audit Report</button>
      </div>

      <div class="filter-bar">
        <label>
          Department
          <select id="report-department-filter">
            ${renderReportDepartmentOptions()}
          </select>
        </label>

        <label>
          Start Date
          <input id="report-start-date" type="date" value="${filters.startDate}" />
        </label>

        <label>
          End Date
          <input id="report-end-date" type="date" value="${filters.endDate}" />
        </label>

        <button class="ghost-button" id="reset-report-filters">
          Reset Dates
        </button>
      </div>

      <div class="instruction-box">
        <strong>Audit Note:</strong>
        <span>
          System Ending now follows the current Branch Stock value. Movement totals remain visible for review, but they do not rebuild the current stock number.
        </span>
      </div>

      ${
        getSubmittedAuditForCurrentFilter()
          ? `
            <div class="instruction-box">
              <strong>Submitted:</strong>
              <span>This audit has already been submitted and locked. Review saved variances below.</span>
            </div>
          `
          : `
            <div class="form-actions review-actions">
              <button class="primary-button" id="submit-monthly-audit">
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
              <th>Item ID</th>
              <th>Item Name</th>
              <th>Unit</th>
              <th>Starting Stock</th>
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
            ${renderAuditRows()}
          </tbody>
        </table>
      </div>
    </section>
  `;
}


function formatReportDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  });
}

function renderSubmittedAuditRows(audit, rows, showAdjustmentControls) {
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
            ${showAdjustmentControls ? "<th>Adjustment</th>" : ""}
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((row) => {
              const noteValue = getBranchAuditAdjustmentNotes(audit.auditId, row.itemId);
              return `
                <tr>
                  <td>
                    <strong>${row.itemName}</strong><br />
                    <span>${row.itemId} • ${row.section || "-"} • ${row.unit}</span>
                  </td>
                  <td>${row.systemEnding}</td>
                  <td>${row.physicalCount}</td>
                  <td class="${Number(row.variance) === 0 ? "" : "danger-text"}">${row.variance}</td>
                  <td><span class="badge ${getReportStatusBadgeClass(row.status)}">${row.status}</span></td>
                  ${
                    showAdjustmentControls
                      ? `
                        <td>
                          ${
                            row.adjustmentPosted === true
                              ? `<span class="badge success">Adjusted</span>`
                              : `
                                <input
                                  class="audit-adjustment-note"
                                  data-adjustment-note-audit="${audit.auditId}"
                                  data-adjustment-note-item="${row.itemId}"
                                  type="text"
                                  placeholder="Reason / note..."
                                  value="${noteValue}"
                                  style="min-width: 180px; margin-bottom: 8px;"
                                />
                                <button
                                  class="tiny-button"
                                  data-post-audit-adjustment="${audit.auditId}"
                                  data-post-audit-item="${row.itemId}"
                                >
                                  Adjust Current Stock
                                </button>
                              `
                          }
                        </td>
                      `
                      : ""
                  }
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSubmittedAuditReviewSection() {
  const audits = getStoredBranchMonthlyAudits();
  const selectedAudit = getSelectedSubmittedAudit();

  if (audits.length === 0) {
    return `
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Submitted Audits</h3>
            <p>No submitted Branch monthly audits yet.</p>
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
            <p>Select a submitted Branch audit to review variance and adjustments.</p>
          </div>
          <span class="badge">${audits.length} Saved</span>
        </div>
        <div class="warehouse-log-batch-list">
          ${audits
            .map(
              (audit) => `
                <button
                  class="warehouse-log-batch-card ${selectedAudit?.auditId === audit.auditId ? "active" : ""}"
                  data-select-submitted-audit="${audit.auditId}"
                >
                  <div class="warehouse-log-batch-card-top">
                    <div>
                      <strong>${audit.department}</strong>
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
                  <p>${selectedAudit.branch} • ${selectedAudit.department} • ${selectedAudit.startDate} to ${selectedAudit.endDate}</p>
                </div>
                <span class="badge ${selectedAudit.status === "OK" ? "success" : "danger-badge"}">${selectedAudit.status}</span>
              </div>
              <div class="review-summary-grid">
                <div><span>Total Items</span><strong>${selectedAudit.totalItems || 0}</strong></div>
                <div><span>OK</span><strong>${selectedAudit.okCount || 0}</strong></div>
                <div><span>Needs Checking</span><strong>${selectedAudit.checkCount || 0}</strong></div>
                <div><span>Submitted</span><strong>${formatReportDateTime(selectedAudit.submittedAt)}</strong></div>
              </div>
              <div class="branch-order-section"><h4>Needs Checking</h4>${renderSubmittedAuditRows(selectedAudit, needsCheckingRows, true)}</div>
              <div class="branch-order-section"><h4>OK Items</h4>${renderSubmittedAuditRows(selectedAudit, okRows, false)}</div>
            `
            : `<div class="order-list-empty"><p>No audit selected.</p><span>Select a submitted audit from the left panel.</span></div>`
        }
      </section>
    </section>
  `;
}

function refreshReportsPage() {
  window.DMC_PAGES.reports.content = getReportsContent();
  renderPage("reports");
}

function setupAuditCountEvents() {
  document.querySelectorAll(".audit-count-input").forEach((input) => {
    input.addEventListener("change", () => {
      const counts = getStoredPhysicalCounts();
      const itemId = input.dataset.itemId;
      const ending = Number(input.dataset.ending || 0);
      const value = input.value.trim();

      counts[getAuditCountKey(itemId)] = value;
      savePhysicalCounts(counts);

      const varianceElement = document.querySelector(
        `[data-variance-for="${itemId}"]`
      );
      const statusElement = document.querySelector(
        `[data-status-for="${itemId}"]`
      );

      if (!varianceElement || !statusElement) {
        return;
      }

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
      statusElement.className = `badge ${getReportStatusBadgeClass(status)}`;
    });
  });
}

function setupReportsEvents() {
  const departmentFilter = document.getElementById("report-department-filter");
  const startDateInput = document.getElementById("report-start-date");
  const endDateInput = document.getElementById("report-end-date");
  const resetButton = document.getElementById("reset-report-filters");

  if (departmentFilter) {
    departmentFilter.addEventListener("change", () => {
      window.DMC_REPORT_FILTERS.department = departmentFilter.value;
      window.DMC_REPORT_FILTERS.selectedAuditId = "";
      refreshReportsPage();
    });
  }

  if (startDateInput) {
    startDateInput.addEventListener("change", () => {
      window.DMC_REPORT_FILTERS.startDate = startDateInput.value;
      window.DMC_REPORT_FILTERS.selectedAuditId = "";
      refreshReportsPage();
    });
  }

  if (endDateInput) {
    endDateInput.addEventListener("change", () => {
      window.DMC_REPORT_FILTERS.endDate = endDateInput.value;
      window.DMC_REPORT_FILTERS.selectedAuditId = "";
      refreshReportsPage();
    });
  }

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      window.DMC_REPORT_FILTERS.startDate = getDefaultReportStartDate();
      window.DMC_REPORT_FILTERS.endDate = getTodayReportDate();
      window.DMC_REPORT_FILTERS.selectedAuditId = "";
      refreshReportsPage();
    });
  }

  const submitAuditButton = document.getElementById("submit-monthly-audit");

  if (submitAuditButton) {
    submitAuditButton.addEventListener("click", submitCurrentBranchMonthlyAudit);
  }

  document.querySelectorAll("[data-select-submitted-audit]").forEach((button) => {
    button.addEventListener("click", () => {
      window.DMC_REPORT_FILTERS.selectedAuditId =
        button.dataset.selectSubmittedAudit;
      refreshReportsPage();
    });
  });

  document.querySelectorAll("[data-adjustment-note-audit]").forEach((input) => {
    input.addEventListener("input", () => {
      saveBranchAuditAdjustmentNote(
        input.dataset.adjustmentNoteAudit,
        input.dataset.adjustmentNoteItem,
        input.value
      );
    });
  });

  document.querySelectorAll("[data-post-audit-adjustment]").forEach((button) => {
    button.addEventListener("click", () => {
      postBranchAuditAdjustment(
        button.dataset.postAuditAdjustment,
        button.dataset.postAuditItem
      );
    });
  });

  setupAuditCountEvents();
}

window.DMC_PAGES.reports = {
  eyebrow: "DMC-Iriga Branch",
  title: "Branch Reports",
  description:
    "Monthly physical audit powered by Starting Stock and Ledger history.",
  getContent: getReportsContent,
  content: getReportsContent(),
  afterRender: setupReportsEvents
};
