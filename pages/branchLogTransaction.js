window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_BRANCH_LOG_STORAGE_KEY_FOR_LOG_PAGE =
  "dmc_inventory_ledger_entries";

window.DMC_BRANCH_LOG_FILTERS = window.DMC_BRANCH_LOG_FILTERS || {
  startDate: "",
  endDate: "",
  department: "all",
  movementType: "all",
  search: "",
  selectedBatchId: ""
};

function getStoredBranchLogEntriesForLogPage() {
  const storedEntries = localStorage.getItem(
    DMC_BRANCH_LOG_STORAGE_KEY_FOR_LOG_PAGE
  );

  if (!storedEntries) {
    return [];
  }

  try {
    const parsedEntries = JSON.parse(storedEntries);

    if (!Array.isArray(parsedEntries)) {
      return [];
    }

    return parsedEntries;
  } catch {
    return [];
  }
}

function formatBranchLogDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function entryBelongsToBranchLog(entry) {
  const location = String(entry.location || entry.branch || "").toLowerCase();
  const source = String(entry.source || "").toLowerCase();
  const destination = String(entry.destination || "").toLowerCase();

  if (
    location.includes("warehouse") ||
    source.includes("warehouse daily input")
  ) {
    return false;
  }

  return (
    location.includes("dmc-iriga") ||
    location.includes("branch") ||
    destination.includes("dmc-iriga") ||
    destination.includes("branch") ||
    source.includes("incoming delivery receipt") ||
    source.includes("branch daily input") ||
    source.includes("branch daily input closing count") ||
    !entry.location
  );
}

function getBranchLogEntriesOnly() {
  return getStoredBranchLogEntriesForLogPage().filter(entryBelongsToBranchLog);
}

function getBranchLogDepartments() {
  return [
    ...new Set(
      getBranchLogEntriesOnly()
        .map((entry) => entry.department || "")
        .filter(Boolean)
    )
  ].sort();
}

function getBranchLogMovementTypes() {
  const preferredOrder = [
    "Transfer In",
    "Remaining Count",
    "Usage",
    "Waste",
    "Daily Note",
    "Received",
    "Adjustment"
  ];

  const movementTypes = [
    ...new Set(
      getBranchLogEntriesOnly()
        .map((entry) => entry.movementType || "")
        .filter(Boolean)
    )
  ];

  return movementTypes.sort((a, b) => {
    const aIndex = preferredOrder.indexOf(a);
    const bIndex = preferredOrder.indexOf(b);

    if (aIndex === -1 && bIndex === -1) {
      return a.localeCompare(b);
    }

    if (aIndex === -1) {
      return 1;
    }

    if (bIndex === -1) {
      return -1;
    }

    return aIndex - bIndex;
  });
}

function getFilteredBranchLogEntries() {
  const filters = window.DMC_BRANCH_LOG_FILTERS;
  const searchValue = String(filters.search || "").toLowerCase().trim();
  const selectedDepartment = String(filters.department || "all");
  const selectedMovementType = String(filters.movementType || "all");
  const startDate = String(filters.startDate || "");
  const endDate = String(filters.endDate || "");

  return getBranchLogEntriesOnly().filter((entry) => {
    const entryDate = String(entry.date || "");

    const matchesStartDate = !startDate || entryDate >= startDate;
    const matchesEndDate = !endDate || entryDate <= endDate;

    const matchesDepartment =
      selectedDepartment === "all" ||
      String(entry.department || "") === selectedDepartment;

    const matchesMovementType =
      selectedMovementType === "all" ||
      String(entry.movementType || "") === selectedMovementType;

    const matchesSearch =
      !searchValue ||
      String(entry.batchId || "").toLowerCase().includes(searchValue) ||
      String(entry.itemId || "").toLowerCase().includes(searchValue) ||
      String(entry.itemName || "").toLowerCase().includes(searchValue) ||
      String(entry.department || "").toLowerCase().includes(searchValue) ||
      String(entry.section || "").toLowerCase().includes(searchValue) ||
      String(entry.source || "").toLowerCase().includes(searchValue) ||
      String(entry.destination || "").toLowerCase().includes(searchValue) ||
      String(entry.notes || "").toLowerCase().includes(searchValue) ||
      String(entry.managerReviewedBy || "").toLowerCase().includes(searchValue);

    return (
      matchesStartDate &&
      matchesEndDate &&
      matchesDepartment &&
      matchesMovementType &&
      matchesSearch
    );
  });
}

function groupBranchLogEntriesByBatch(entries) {
  return entries.reduce((groups, entry) => {
    const batchId = entry.batchId || "No Batch ID";

    groups[batchId] = groups[batchId] || [];
    groups[batchId].push(entry);

    return groups;
  }, {});
}

function getBranchLogBatches() {
  const filteredEntries = getFilteredBranchLogEntries();
  const groupedEntries = groupBranchLogEntriesByBatch(filteredEntries);

  return Object.entries(groupedEntries)
    .map(([batchId, entries]) => ({
      batchId,
      entries
    }))
    .sort((a, b) => {
      const aSubmitted = a.entries[0]?.submittedAt || a.entries[0]?.date || "";
      const bSubmitted = b.entries[0]?.submittedAt || b.entries[0]?.date || "";

      return String(bSubmitted).localeCompare(String(aSubmitted));
    });
}

function getSelectedBranchLogBatch() {
  const batches = getBranchLogBatches();

  if (batches.length === 0) {
    return null;
  }

  const selectedBatchId = window.DMC_BRANCH_LOG_FILTERS.selectedBatchId;

  const selectedBatch = batches.find(
    (batch) => batch.batchId === selectedBatchId
  );

  return selectedBatch || batches[0] || null;
}

function renderBranchLogDepartmentOptions() {
  const currentDepartment = window.DMC_BRANCH_LOG_FILTERS.department;

  return `
    <option value="all" ${currentDepartment === "all" ? "selected" : ""}>
      All Departments
    </option>
    ${getBranchLogDepartments()
      .map(
        (department) => `
          <option value="${department}" ${
          currentDepartment === department ? "selected" : ""
        }>
            ${department}
          </option>
        `
      )
      .join("")}
  `;
}

function renderBranchLogMovementOptions() {
  const currentMovementType = window.DMC_BRANCH_LOG_FILTERS.movementType;

  return `
    <option value="all" ${currentMovementType === "all" ? "selected" : ""}>
      All Movements
    </option>
    ${getBranchLogMovementTypes()
      .map(
        (movementType) => `
          <option value="${movementType}" ${
          currentMovementType === movementType ? "selected" : ""
        }>
            ${movementType}
          </option>
        `
      )
      .join("")}
  `;
}

function getBranchBatchSourceLabel(batch) {
  const firstEntry = batch.entries[0] || {};
  const source = String(firstEntry.source || "");

  if (source.includes("Incoming Delivery")) {
    return "Incoming Delivery Batch";
  }

  if (source.includes("Closing Count")) {
    return "Branch Daily Closing Batch";
  }

  if (source.includes("Branch Daily Input")) {
    return "Branch Daily Input Batch";
  }

  if (source.includes("Daily Input")) {
    return "Daily Input Batch";
  }

  return "Branch Movement Batch";
}

function getBranchBatchEffectCounts(batch) {
  return batch.entries.reduce(
    (counts, entry) => {
      const effect = entry.stockEffect || "report";

      if (effect === "add") {
        counts.add += 1;
      } else if (effect === "deduct") {
        counts.deduct += 1;
      } else if (effect === "set") {
        counts.set += 1;
      } else {
        counts.report += 1;
      }

      return counts;
    },
    {
      add: 0,
      deduct: 0,
      set: 0,
      report: 0
    }
  );
}

function getBranchLogNumber(value) {
  const numberValue = Number(value || 0);

  return Number.isNaN(numberValue) ? 0 : numberValue;
}

function getBranchLogGroupedItemRows(batch) {
  const groupedRows = {};

  batch.entries.forEach((entry) => {
    const itemId = entry.itemId || "NO-ID";

    groupedRows[itemId] = groupedRows[itemId] || {
      section: entry.section || "-",
      itemId: entry.itemId || "-",
      itemName: entry.itemName || "-",
      unit: entry.unit || "-",
      transferIn: 0,
      remaining: "",
      usage: 0,
      waste: 0,
      notes: []
    };

    const row = groupedRows[itemId];
    const quantity = getBranchLogNumber(entry.quantity);

    if (entry.movementType === "Transfer In" || entry.stockEffect === "add") {
      row.transferIn += quantity;
    }

    if (entry.movementType === "Remaining Count" || entry.stockEffect === "set") {
      row.remaining = quantity;
    }

    if (entry.movementType === "Usage") {
      row.usage += quantity;
    }

    if (entry.movementType === "Waste") {
      row.waste += quantity;
    }

    if (String(entry.notes || "").trim() !== "") {
      row.notes.push(entry.notes);
    }
  });

  return Object.values(groupedRows).sort((a, b) => {
    return String(a.itemName).localeCompare(String(b.itemName));
  });
}

function renderBranchBatchList() {
  const batches = getBranchLogBatches();

  if (batches.length === 0) {
    return `
      <div class="warehouse-log-empty-card">
        No submitted Branch batches match the current filters.
      </div>
    `;
  }

  return batches
    .map((batch) => {
      const firstEntry = batch.entries[0] || {};
      const counts = getBranchBatchEffectCounts(batch);
      const isActive =
        window.DMC_BRANCH_LOG_FILTERS.selectedBatchId === batch.batchId ||
        (!window.DMC_BRANCH_LOG_FILTERS.selectedBatchId &&
          getSelectedBranchLogBatch()?.batchId === batch.batchId);

      return `
        <button
          class="warehouse-log-batch-card ${isActive ? "active" : ""}"
          data-branch-batch-id="${batch.batchId}"
        >
          <div class="warehouse-log-batch-card-top">
            <div>
              <strong>${getBranchBatchSourceLabel(batch)}</strong>
              <span>${batch.batchId}</span>
            </div>

            <em>${batch.entries.length} rows</em>
          </div>

          <div class="warehouse-log-batch-card-meta">
            <span>Date</span>
            <strong>${firstEntry.date || "-"}</strong>
          </div>

          <div class="warehouse-log-batch-card-meta">
            <span>Department</span>
            <strong>${firstEntry.department || "-"}</strong>
          </div>

          <div class="warehouse-log-batch-card-meta">
            <span>Effect</span>
            <strong>
              <span class="positive-text">+${counts.add}</span>
              /
              <span>${counts.set} set</span>
              /
              <span>${counts.report} report</span>
            </strong>
          </div>
        </button>
      `;
    })
    .join("");
}

function renderBranchBatchLineTable(batch) {
  const rows = getBranchLogGroupedItemRows(batch);

  if (rows.length === 0) {
    return `
      <p class="submit-preview-empty">No branch movement lines found.</p>
    `;
  }

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Section</th>
            <th>Item ID</th>
            <th>Item Name</th>
            <th>Trans In</th>
            <th>Remaining</th>
            <th>Usage</th>
            <th>Waste</th>
            <th>Unit</th>
            <th>Notes</th>
          </tr>
        </thead>

        <tbody>
          ${rows
            .map((row) => {
              const uniqueNotes = [...new Set(row.notes)].filter(Boolean);

              return `
                <tr>
                  <td>${row.section || "-"}</td>
                  <td>${row.itemId || "-"}</td>
                  <td>${row.itemName || "-"}</td>
                  <td>${row.transferIn || "-"}</td>
                  <td>${row.remaining === "" ? "-" : row.remaining}</td>
                  <td>${row.usage || "-"}</td>
                  <td>${row.waste || "-"}</td>
                  <td>${row.unit || "-"}</td>
                  <td>${uniqueNotes.length ? uniqueNotes.join(" | ") : "-"}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSelectedBranchBatchDetails() {
  const selectedBatch = getSelectedBranchLogBatch();

  if (!selectedBatch) {
    return `
      <section class="panel delivery-log-detail">
        <div class="order-list-empty">
          <p>No batch selected.</p>
          <span>Select a submitted batch from the left panel.</span>
        </div>
      </section>
    `;
  }

  const firstEntry = selectedBatch.entries[0] || {};
  const reviewedBy =
    firstEntry.managerReviewedBy ||
    firstEntry.receivedBy ||
    firstEntry.preparedBy ||
    "-";

  return `
    <section class="panel delivery-log-detail branch-log-detail">
      <div class="panel-header">
        <div>
          <h3>${selectedBatch.batchId}</h3>
          <p>
            DMC-Iriga Branch • ${firstEntry.department || "-"}
          </p>
        </div>

        <div class="branch-order-list-meta">
          <span class="badge success">Posted</span>
        </div>
      </div>

      <div class="delivery-log-info-grid">
        <div>
          <p class="eyebrow">Submitted At</p>
          <strong>${formatBranchLogDateTime(
            firstEntry.submittedAt || firstEntry.date
          )}</strong>
        </div>

        <div>
          <p class="eyebrow">Reviewed / Received By</p>
          <strong>${reviewedBy}</strong>
        </div>

        <div>
          <p class="eyebrow">Department</p>
          <strong>${firstEntry.department || "-"}</strong>
        </div>

        <div>
          <p class="eyebrow">Source</p>
          <strong>${firstEntry.source || "-"}</strong>
        </div>
      </div>

      <div class="branch-order-section">
        <h4>Branch Movement Lines</h4>
        ${renderBranchBatchLineTable(selectedBatch)}
      </div>

      <div class="instruction-box">
        <strong>Stock Rule:</strong>
        <span>
          Branch Stock uses Remaining Count as the latest stock truth, then adds later Transfer In.
          Usage and Waste are kept for monthly reports and are not double-deducted from stock.
        </span>
      </div>
    </section>
  `;
}

function getBranchLogTransactionContent() {
  const filters = window.DMC_BRANCH_LOG_FILTERS;
  const batches = getBranchLogBatches();

  return `
    <section class="grid">
      <div class="card">
        <p>Total Batches</p>
        <strong>${batches.length}</strong>
      </div>

      <div class="card">
        <p>Departments</p>
        <strong>${getBranchLogDepartments().length}</strong>
      </div>

      <div class="card">
        <p>Movement Types</p>
        <strong>${getBranchLogMovementTypes().length}</strong>
      </div>
    </section>

    <section class="delivery-log-layout branch-log-layout">
      <section class="panel delivery-log-list-panel">
        <div class="panel-header">
          <div>
            <h3>Branch Log Transaction</h3>
            <p>
              Read-only history of Branch Daily Input, incoming deliveries,
              remaining counts, usage, waste, and branch notes.
            </p>
          </div>

          <span class="badge">Movement History</span>
        </div>

        <div class="warehouse-log-filters">
          <div class="warehouse-log-date-grid">
            <label>
              Start Date
              <input
                id="branch-log-start-date"
                type="date"
                value="${filters.startDate}"
              />
            </label>

            <label>
              End Date
              <input
                id="branch-log-end-date"
                type="date"
                value="${filters.endDate}"
              />
            </label>
          </div>

          <label>
            Department
            <select id="branch-log-department-filter">
              ${renderBranchLogDepartmentOptions()}
            </select>
          </label>

          <label>
            Movement Type
            <select id="branch-log-movement-filter">
              ${renderBranchLogMovementOptions()}
            </select>
          </label>

          <label class="filter-search">
            Search
            <input
              id="branch-log-search"
              type="text"
              placeholder="Search item, batch, source, notes..."
              value="${filters.search}"
            />
          </label>

          <div class="warehouse-log-filter-actions">
            <button class="ghost-button" id="clear-branch-log-filters">
              Clear
            </button>

            <button class="primary-button" id="export-branch-log">
              Export
            </button>
          </div>
        </div>

        <div class="warehouse-log-list-header">
          <p>Submitted Batches</p>
          <span>${batches.length} found</span>
        </div>

        <div class="warehouse-log-batch-list">
          ${renderBranchBatchList()}
        </div>
      </section>

      ${renderSelectedBranchBatchDetails()}
    </section>
  `;
}

function refreshBranchLogTransactionPage() {
  window.DMC_PAGES["branch-log-transaction"].content =
    getBranchLogTransactionContent();

  renderPage("branch-log-transaction");
}

function setupBranchLogTransactionEvents() {
  const startDateInput = document.getElementById("branch-log-start-date");
  const endDateInput = document.getElementById("branch-log-end-date");
  const departmentFilter = document.getElementById("branch-log-department-filter");
  const movementFilter = document.getElementById("branch-log-movement-filter");
  const searchInput = document.getElementById("branch-log-search");
  const clearButton = document.getElementById("clear-branch-log-filters");
  const exportButton = document.getElementById("export-branch-log");

  if (startDateInput) {
    startDateInput.addEventListener("change", () => {
      window.DMC_BRANCH_LOG_FILTERS.startDate = startDateInput.value;
      window.DMC_BRANCH_LOG_FILTERS.selectedBatchId = "";
      refreshBranchLogTransactionPage();
    });
  }

  if (endDateInput) {
    endDateInput.addEventListener("change", () => {
      window.DMC_BRANCH_LOG_FILTERS.endDate = endDateInput.value;
      window.DMC_BRANCH_LOG_FILTERS.selectedBatchId = "";
      refreshBranchLogTransactionPage();
    });
  }

  if (departmentFilter) {
    departmentFilter.addEventListener("change", () => {
      window.DMC_BRANCH_LOG_FILTERS.department = departmentFilter.value;
      window.DMC_BRANCH_LOG_FILTERS.selectedBatchId = "";
      refreshBranchLogTransactionPage();
    });
  }

  if (movementFilter) {
    movementFilter.addEventListener("change", () => {
      window.DMC_BRANCH_LOG_FILTERS.movementType = movementFilter.value;
      window.DMC_BRANCH_LOG_FILTERS.selectedBatchId = "";
      refreshBranchLogTransactionPage();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      window.DMC_BRANCH_LOG_FILTERS.search = searchInput.value;
      window.DMC_BRANCH_LOG_FILTERS.selectedBatchId = "";
      refreshBranchLogTransactionPage();
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      window.DMC_BRANCH_LOG_FILTERS = {
        startDate: "",
        endDate: "",
        department: "all",
        movementType: "all",
        search: "",
        selectedBatchId: ""
      };

      refreshBranchLogTransactionPage();
    });
  }

  if (exportButton) {
    exportButton.addEventListener("click", () => {
      if (typeof window.DMC_SHOW_MODAL === "function") {
        window.DMC_SHOW_MODAL({
          type: "info",
          title: "Export Coming Soon",
          message:
            "Export/print for Branch Log Transaction will be connected after the reporting workflow is finalized.",
          confirmLabel: "Got it"
        });
      }
    });
  }

  document.querySelectorAll("[data-branch-batch-id]").forEach((button) => {
    button.addEventListener("click", () => {
      window.DMC_BRANCH_LOG_FILTERS.selectedBatchId =
        button.dataset.branchBatchId;

      refreshBranchLogTransactionPage();
    });
  });
}

window.DMC_PAGES["branch-log-transaction"] = {
  eyebrow: "DMC-Iriga Branch",
  title: "Branch Log Transaction",
  description:
    "Read-only batch history of Branch Daily Input, receiving, usage, waste, and closing counts.",
  getContent: getBranchLogTransactionContent,
  content: getBranchLogTransactionContent(),
  afterRender: setupBranchLogTransactionEvents
};
