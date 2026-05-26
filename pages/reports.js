window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_REPORT_LEDGER_STORAGE_KEY = "dmc_inventory_ledger_entries";
const DMC_REPORT_MASTER_LIST_STORAGE_KEY = "dmc_master_list_items";
const DMC_REPORT_SETTINGS_STORAGE_KEY = "dmc_inventory_settings";
const DMC_AUDIT_PHYSICAL_COUNTS_KEY = "dmc_audit_physical_counts";
const DMC_BRANCH_STARTING_STOCK_KEY = "dmc_branch_opening_stock";

window.DMC_REPORT_FILTERS = window.DMC_REPORT_FILTERS || {
  department: "Bar",
  startDate: "",
  endDate: ""
};

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
    const systemEnding =
      row.startingStock +
      row.received +
      row.transferIn -
      row.usage -
      row.waste -
      row.transferOut +
      row.adjustment;

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
          <h3>Monthly Audit / Date Range Report</h3>
          <p>
            Select a department and date range. Starting Stock comes from Branch Stock.
            Movement totals come from the Ledger. Physical Count is entered during audit.
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
          Starting Stock comes from the Branch Stock page. System Ending is calculated from Starting Stock plus Ledger movement totals.
        </span>
      </div>

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
      refreshReportsPage();
    });
  }

  if (startDateInput) {
    startDateInput.addEventListener("change", () => {
      window.DMC_REPORT_FILTERS.startDate = startDateInput.value;
      refreshReportsPage();
    });
  }

  if (endDateInput) {
    endDateInput.addEventListener("change", () => {
      window.DMC_REPORT_FILTERS.endDate = endDateInput.value;
      refreshReportsPage();
    });
  }

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      window.DMC_REPORT_FILTERS.startDate = getDefaultReportStartDate();
      window.DMC_REPORT_FILTERS.endDate = getTodayReportDate();
      refreshReportsPage();
    });
  }

  setupAuditCountEvents();
}

window.DMC_PAGES.reports = {
  eyebrow: "DMC-Iriga Branch",
  title: "Branch Reports",
  description:
    "Department audit and date range reports powered by Starting Stock and Ledger history.",
  content: getReportsContent(),
  afterRender: setupReportsEvents
};
