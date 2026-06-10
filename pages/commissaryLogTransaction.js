window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_COMMISSARY_LOG_STORAGE_KEY_FOR_LOG_PAGE =
  "dmc_inventory_ledger_entries";

window.DMC_COMMISSARY_LOG_FILTERS = window.DMC_COMMISSARY_LOG_FILTERS || {
  startDate: "",
  endDate: "",
  section: "all",
  movementType: "all",
  search: "",
  selectedBatchId: ""
};

function getStoredCommissaryLogEntriesForLogPage() {
  const storedEntries = localStorage.getItem(
    DMC_COMMISSARY_LOG_STORAGE_KEY_FOR_LOG_PAGE
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

function formatCommissaryLogDateTime(value) {
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

function entryBelongsToCommissaryLog(entry) {
  const location = String(entry.location || "").toLowerCase();
  const department = String(entry.department || "").toLowerCase();
  const source = String(entry.source || "").toLowerCase();
  const destination = String(entry.destination || "").toLowerCase();

  return (
    location.includes("commissary") ||
    department.includes("commissary") ||
    source.includes("commissary daily input") ||
    source.includes("commissary daily input closing count") ||
    source.includes("commissary") ||
    destination.includes("commissary")
  );
}

function getCommissaryLogEntriesOnly() {
  return getStoredCommissaryLogEntriesForLogPage().filter(
    entryBelongsToCommissaryLog
  );
}

function getCommissaryLogSections() {
  return [
    ...new Set(
      getCommissaryLogEntriesOnly()
        .map((entry) => entry.section || "")
        .filter(Boolean)
    )
  ].sort();
}

function getCommissaryLogMovementTypes() {
  const preferredOrder = [
    "Transfer In",
    "Transfer Out",
    "Remaining Count",
    "Usage",
    "Waste",
    "Daily Note",
    "Adjustment"
  ];

  const movementTypes = [
    ...new Set(
      getCommissaryLogEntriesOnly()
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

function getFilteredCommissaryLogEntries() {
  const filters = window.DMC_COMMISSARY_LOG_FILTERS;
  const searchValue = String(filters.search || "").toLowerCase().trim();
  const selectedSection = String(filters.section || "all");
  const selectedMovementType = String(filters.movementType || "all");
  const startDate = String(filters.startDate || "");
  const endDate = String(filters.endDate || "");

  return getCommissaryLogEntriesOnly().filter((entry) => {
    const entryDate = String(entry.date || "");

    const matchesStartDate = !startDate || entryDate >= startDate;
    const matchesEndDate = !endDate || entryDate <= endDate;

    const matchesSection =
      selectedSection === "all" ||
      String(entry.section || "") === selectedSection;

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
      matchesSection &&
      matchesMovementType &&
      matchesSearch
    );
  });
}

function groupCommissaryLogEntriesByBatch(entries) {
  return entries.reduce((groups, entry) => {
    const batchId = entry.batchId || "No Batch ID";

    groups[batchId] = groups[batchId] || [];
    groups[batchId].push(entry);

    return groups;
  }, {});
}

function getCommissaryLogBatches() {
  const filteredEntries = getFilteredCommissaryLogEntries();
  const groupedEntries = groupCommissaryLogEntriesByBatch(filteredEntries);

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

function getSelectedCommissaryLogBatch() {
  const batches = getCommissaryLogBatches();

  if (batches.length === 0) {
    return null;
  }

  const selectedBatchId = window.DMC_COMMISSARY_LOG_FILTERS.selectedBatchId;

  const selectedBatch = batches.find(
    (batch) => batch.batchId === selectedBatchId
  );

  return selectedBatch || batches[0] || null;
}

function renderCommissaryLogSectionOptions() {
  const currentSection = window.DMC_COMMISSARY_LOG_FILTERS.section;

  return `
    <option value="all" ${currentSection === "all" ? "selected" : ""}>
      All Sections
    </option>
    ${getCommissaryLogSections()
      .map(
        (section) => `
          <option value="${section}" ${
          currentSection === section ? "selected" : ""
        }>
            ${section}
          </option>
        `
      )
      .join("")}
  `;
}

function renderCommissaryLogMovementOptions() {
  const currentMovementType = window.DMC_COMMISSARY_LOG_FILTERS.movementType;

  return `
    <option value="all" ${currentMovementType === "all" ? "selected" : ""}>
      All Movements
    </option>
    ${getCommissaryLogMovementTypes()
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

function getCommissaryBatchSourceLabel(batch) {
  const entries = batch.entries || [];
  const hasProduction = entries.some(
    (entry) => entry.movementField === "transferInProduction"
  );
  const hasOutWarehouse = entries.some(
    (entry) => entry.movementField === "transferOutWarehouse"
  );
  const hasOutBranch = entries.some(
    (entry) => entry.movementField === "transferOutBranch"
  );
  const hasRemaining = entries.some(
    (entry) =>
      entry.movementType === "Remaining Count" || entry.stockEffect === "set"
  );

  if (hasProduction && hasOutWarehouse) {
    return "Commissary Production to Warehouse";
  }

  if (hasProduction) {
    return "Commissary Production Batch";
  }

  if (hasOutWarehouse) {
    return "Commissary Transfer to Warehouse";
  }

  if (hasOutBranch) {
    return "Commissary Transfer to Branch";
  }

  if (hasRemaining) {
    return "Commissary Daily Closing Batch";
  }

  return "Commissary Daily Input Batch";
}

function getCommissaryBatchEffectCounts(batch) {
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

function getCommissaryLogNumber(value) {
  const numberValue = Number(value || 0);

  return Number.isNaN(numberValue) ? 0 : numberValue;
}

function getCommissaryLogGroupedItemRows(batch) {
  const groupedRows = {};

  batch.entries.forEach((entry) => {
    const itemId = entry.itemId || "NO-ID";

    groupedRows[itemId] = groupedRows[itemId] || {
      department: entry.department || "-",
      section: entry.section || "-",
      itemId: entry.itemId || "-",
      itemName: entry.itemName || "-",
      unit: entry.unit || "-",
      inWarehouse: 0,
      inBranch: 0,
      inProduction: 0,
      outWarehouse: 0,
      outBranch: 0,
      remaining: "",
      usage: 0,
      waste: 0,
      notes: []
    };

    const row = groupedRows[itemId];
    const quantity = getCommissaryLogNumber(entry.quantity);
    const movementField = String(entry.movementField || "");
    const source = String(entry.source || "").toLowerCase();
    const destination = String(entry.destination || "").toLowerCase();

    if (
      movementField === "transferInWarehouse" ||
      (entry.movementType === "Transfer In" && source.includes("warehouse"))
    ) {
      row.inWarehouse += quantity;
    }

    if (
      movementField === "transferInBranch" ||
      (entry.movementType === "Transfer In" && source.includes("branch"))
    ) {
      row.inBranch += quantity;
    }

    if (
      movementField === "transferInProduction" ||
      (entry.movementType === "Transfer In" && source.includes("production"))
    ) {
      row.inProduction += quantity;
    }

    if (
      movementField === "transferOutWarehouse" ||
      (entry.movementType === "Transfer Out" &&
        destination.includes("warehouse"))
    ) {
      row.outWarehouse += quantity;
    }

    if (
      movementField === "transferOutBranch" ||
      (entry.movementType === "Transfer Out" && destination.includes("branch"))
    ) {
      row.outBranch += quantity;
    }

    if (
      entry.movementType === "Remaining Count" ||
      entry.stockEffect === "set"
    ) {
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

function renderCommissaryBatchList() {
  const batches = getCommissaryLogBatches();

  if (batches.length === 0) {
    return `
      <div class="warehouse-log-empty-card">
        No submitted Commissary batches match the current filters.
      </div>
    `;
  }

  return batches
    .map((batch) => {
      const firstEntry = batch.entries[0] || {};
      const counts = getCommissaryBatchEffectCounts(batch);
      const isActive =
        window.DMC_COMMISSARY_LOG_FILTERS.selectedBatchId === batch.batchId ||
        (!window.DMC_COMMISSARY_LOG_FILTERS.selectedBatchId &&
          getSelectedCommissaryLogBatch()?.batchId === batch.batchId);

      return `
        <button
          class="warehouse-log-batch-card ${isActive ? "active" : ""}"
          data-commissary-batch-id="${batch.batchId}"
        >
          <div class="warehouse-log-batch-card-top">
            <div>
              <strong>${getCommissaryBatchSourceLabel(batch)}</strong>
              <span>${batch.batchId}</span>
            </div>

            <em>${batch.entries.length} rows</em>
          </div>

          <div class="warehouse-log-batch-card-meta">
            <span>Date</span>
            <strong>${firstEntry.date || "-"}</strong>
          </div>

          <div class="warehouse-log-batch-card-meta">
            <span>Section</span>
            <strong>${firstEntry.section || "-"}</strong>
          </div>

          <div class="warehouse-log-batch-card-meta">
            <span>Effect</span>
            <strong>
              <span class="positive-text">+${counts.add}</span>
              /
              <span>${counts.deduct} out</span>
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

function renderCommissaryBatchLineTable(batch) {
  const rows = getCommissaryLogGroupedItemRows(batch);

  if (rows.length === 0) {
    return `
      <p class="submit-preview-empty">No commissary movement lines found.</p>
    `;
  }

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Department</th>
            <th>Section</th>
            <th>Item ID</th>
            <th>Item Name</th>
            <th>In Warehouse</th>
            <th>In Branch</th>
            <th>In Production</th>
            <th>Out Warehouse</th>
            <th>Out Branch</th>
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
                  <td>${row.department || "-"}</td>
                  <td>${row.section || "-"}</td>
                  <td>${row.itemId || "-"}</td>
                  <td>${row.itemName || "-"}</td>
                  <td>${row.inWarehouse || "-"}</td>
                  <td>${row.inBranch || "-"}</td>
                  <td>${row.inProduction || "-"}</td>
                  <td>${row.outWarehouse || "-"}</td>
                  <td>${row.outBranch || "-"}</td>
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

function renderSelectedCommissaryBatchDetails() {
  const selectedBatch = getSelectedCommissaryLogBatch();

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
            Commissary • ${firstEntry.department || "-"} • ${
    firstEntry.section || "-"
  }
          </p>
        </div>

        <div class="branch-order-list-meta">
          <span class="badge success">Posted</span>
        </div>
      </div>

      <div class="delivery-log-info-grid">
        <div>
          <p class="eyebrow">Submitted At</p>
          <strong>${formatCommissaryLogDateTime(
            firstEntry.submittedAt || firstEntry.date
          )}</strong>
        </div>

        <div>
          <p class="eyebrow">Reviewed By</p>
          <strong>${reviewedBy}</strong>
        </div>

        <div>
          <p class="eyebrow">Department</p>
          <strong>${firstEntry.department || "-"}</strong>
        </div>

        <div>
          <p class="eyebrow">Section</p>
          <strong>${firstEntry.section || "-"}</strong>
        </div>

        <div>
          <p class="eyebrow">Source</p>
          <strong>${firstEntry.source || "-"}</strong>
        </div>

        <div>
          <p class="eyebrow">Destination</p>
          <strong>${firstEntry.destination || "-"}</strong>
        </div>
      </div>

      <div class="branch-order-section">
        <h4>Commissary Movement Lines</h4>
        ${renderCommissaryBatchLineTable(selectedBatch)}
      </div>

      <div class="instruction-box">
        <strong>Stock Rule:</strong>
        <span>
          In Warehouse, In Branch, and In Production add to Commissary stock.
          Out Warehouse and Out Branch deduct from Commissary stock.
          Remaining Count becomes the latest stock truth, while Usage and Waste are kept for reporting.
        </span>
      </div>
    </section>
  `;
}

function getCommissaryLogTransactionContent() {
  const filters = window.DMC_COMMISSARY_LOG_FILTERS;
  const batches = getCommissaryLogBatches();

  return `
    <section class="grid">
      <div class="card">
        <p>Total Batches</p>
        <strong>${batches.length}</strong>
      </div>

      <div class="card">
        <p>Sections</p>
        <strong>${getCommissaryLogSections().length}</strong>
      </div>

      <div class="card">
        <p>Movement Types</p>
        <strong>${getCommissaryLogMovementTypes().length}</strong>
      </div>
    </section>

    <section class="delivery-log-layout branch-log-layout">
      <section class="panel delivery-log-list-panel">
        <div class="panel-header">
          <div>
            <h3>Commissary Log Transaction</h3>
            <p>
              Read-only history of Commissary Daily Input, production, transfer movement,
              remaining counts, usage, waste, and notes.
            </p>
          </div>

          <span class="badge">Movement History</span>
        </div>

        <div class="warehouse-log-filters">
          <div class="warehouse-log-date-grid">
            <label>
              Start Date
              <input
                id="commissary-log-start-date"
                type="date"
                value="${filters.startDate}"
              />
            </label>

            <label>
              End Date
              <input
                id="commissary-log-end-date"
                type="date"
                value="${filters.endDate}"
              />
            </label>
          </div>

          <label>
            Section
            <select id="commissary-log-section-filter">
              ${renderCommissaryLogSectionOptions()}
            </select>
          </label>

          <label>
            Movement Type
            <select id="commissary-log-movement-filter">
              ${renderCommissaryLogMovementOptions()}
            </select>
          </label>

          <label class="filter-search">
            Search
            <input
              id="commissary-log-search"
              type="text"
              placeholder="Search item, batch, source, destination, notes..."
              value="${filters.search}"
            />
          </label>

          <div class="warehouse-log-filter-actions">
            <button class="ghost-button" id="clear-commissary-log-filters">
              Clear
            </button>

            <button class="primary-button" id="export-commissary-log">
              Export
            </button>
          </div>
        </div>

        <div class="warehouse-log-list-header">
          <p>Submitted Batches</p>
          <span>${batches.length} found</span>
        </div>

        <div class="warehouse-log-batch-list">
          ${renderCommissaryBatchList()}
        </div>
      </section>

      ${renderSelectedCommissaryBatchDetails()}
    </section>
  `;
}

function refreshCommissaryLogTransactionPage() {
  window.DMC_PAGES["commissary-log-transaction"].content =
    getCommissaryLogTransactionContent();

  renderPage("commissary-log-transaction");
}

function setupCommissaryLogTransactionEvents() {
  const startDateInput = document.getElementById("commissary-log-start-date");
  const endDateInput = document.getElementById("commissary-log-end-date");
  const sectionFilter = document.getElementById("commissary-log-section-filter");
  const movementFilter = document.getElementById("commissary-log-movement-filter");
  const searchInput = document.getElementById("commissary-log-search");
  const clearButton = document.getElementById("clear-commissary-log-filters");
  const exportButton = document.getElementById("export-commissary-log");

  if (startDateInput) {
    startDateInput.addEventListener("change", () => {
      window.DMC_COMMISSARY_LOG_FILTERS.startDate = startDateInput.value;
      window.DMC_COMMISSARY_LOG_FILTERS.selectedBatchId = "";
      refreshCommissaryLogTransactionPage();
    });
  }

  if (endDateInput) {
    endDateInput.addEventListener("change", () => {
      window.DMC_COMMISSARY_LOG_FILTERS.endDate = endDateInput.value;
      window.DMC_COMMISSARY_LOG_FILTERS.selectedBatchId = "";
      refreshCommissaryLogTransactionPage();
    });
  }

  if (sectionFilter) {
    sectionFilter.addEventListener("change", () => {
      window.DMC_COMMISSARY_LOG_FILTERS.section = sectionFilter.value;
      window.DMC_COMMISSARY_LOG_FILTERS.selectedBatchId = "";
      refreshCommissaryLogTransactionPage();
    });
  }

  if (movementFilter) {
    movementFilter.addEventListener("change", () => {
      window.DMC_COMMISSARY_LOG_FILTERS.movementType = movementFilter.value;
      window.DMC_COMMISSARY_LOG_FILTERS.selectedBatchId = "";
      refreshCommissaryLogTransactionPage();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      window.DMC_COMMISSARY_LOG_FILTERS.search = searchInput.value;
      window.DMC_COMMISSARY_LOG_FILTERS.selectedBatchId = "";
      refreshCommissaryLogTransactionPage();
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      window.DMC_COMMISSARY_LOG_FILTERS = {
        startDate: "",
        endDate: "",
        section: "all",
        movementType: "all",
        search: "",
        selectedBatchId: ""
      };

      refreshCommissaryLogTransactionPage();
    });
  }

  if (exportButton) {
    exportButton.addEventListener("click", () => {
      if (typeof window.DMC_SHOW_MODAL === "function") {
        window.DMC_SHOW_MODAL({
          type: "info",
          title: "Export Coming Soon",
          message:
            "Export/print for Commissary Log Transaction will be connected after the reporting workflow is finalized.",
          confirmLabel: "Got it"
        });
      }
    });
  }

  document.querySelectorAll("[data-commissary-batch-id]").forEach((button) => {
    button.addEventListener("click", () => {
      window.DMC_COMMISSARY_LOG_FILTERS.selectedBatchId =
        button.dataset.commissaryBatchId;

      refreshCommissaryLogTransactionPage();
    });
  });
}

window.DMC_PAGES["commissary-log-transaction"] = {
  eyebrow: "Commissary",
  title: "Commissary Log Transaction",
  description:
    "Read-only batch history of Commissary Daily Input, production, transfer movement, usage, waste, and closing counts.",
  getContent: getCommissaryLogTransactionContent,
  content: getCommissaryLogTransactionContent(),
  afterRender: setupCommissaryLogTransactionEvents
};
