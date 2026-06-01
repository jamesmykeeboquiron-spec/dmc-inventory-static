window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_WAREHOUSE_LOG_STORAGE_KEY_FOR_LOG_PAGE =
  "dmc_warehouse_log_entries";

window.DMC_WAREHOUSE_LOG_FILTERS = window.DMC_WAREHOUSE_LOG_FILTERS || {
  startDate: "",
  endDate: "",
  movementType: "all",
  search: "",
  selectedBatchId: ""
};

function getStoredWarehouseLogEntriesForLogPage() {
  const storedEntries = localStorage.getItem(
    DMC_WAREHOUSE_LOG_STORAGE_KEY_FOR_LOG_PAGE
  );

  if (!storedEntries) {
    return getWarehouseSampleLogEntries();
  }

  try {
    const parsedEntries = JSON.parse(storedEntries);

    if (!Array.isArray(parsedEntries) || parsedEntries.length === 0) {
      return getWarehouseSampleLogEntries();
    }

    return parsedEntries;
  } catch {
    return getWarehouseSampleLogEntries();
  }
}

function getWarehouseSampleLogEntries() {
  return [
    {
      date: "2026-05-31",
      submittedAtDisplay: "05/31/2026, 09:14 AM",
      batchId: "WH-20260531-091420",
      location: "Warehouse",
      department: "Baking",
      itemId: "RAW-FLO-001",
      itemName: "All Purpose Flour",
      movementType: "Transfer In",
      movementField: "transferIn",
      stockEffect: "add",
      quantity: 50,
      unit: "kg",
      managerReviewedBy: "Manager Ana",
      source: "Warehouse Daily Input",
      destination: "Warehouse",
      notes: "Invoice #000123"
    },
    {
      date: "2026-05-31",
      submittedAtDisplay: "05/31/2026, 09:14 AM",
      batchId: "WH-20260531-091420",
      location: "Warehouse",
      department: "Baking",
      itemId: "RAW-SUG-001",
      itemName: "White Sugar",
      movementType: "Transfer Out",
      movementField: "transferOut",
      stockEffect: "deduct",
      quantity: 10,
      unit: "kg",
      managerReviewedBy: "Manager Ana",
      source: "Warehouse",
      destination: "Outgoing Transfer",
      notes: "Commissary request"
    },
    {
      date: "2026-05-31",
      submittedAtDisplay: "05/31/2026, 09:14 AM",
      batchId: "WH-20260531-091420",
      location: "Warehouse",
      department: "Dairy",
      itemId: "RAW-MIL-001",
      itemName: "Fresh Milk",
      movementType: "Waste",
      movementField: "waste",
      stockEffect: "deduct",
      quantity: 2,
      unit: "liter",
      managerReviewedBy: "Manager Ana",
      source: "Warehouse",
      destination: "Waste",
      notes: "Spoiled item"
    },
    {
      date: "2026-05-30",
      submittedAtDisplay: "05/30/2026, 04:42 PM",
      batchId: "WH-20260530-164205",
      location: "Warehouse",
      department: "Packaging",
      itemId: "PKG-CUP-016",
      itemName: "16oz Paper Cups",
      movementType: "Transfer In",
      movementField: "transferIn",
      stockEffect: "add",
      quantity: 500,
      unit: "pcs",
      managerReviewedBy: "Manager Lou",
      source: "Warehouse Daily Input",
      destination: "Warehouse",
      notes: "Supplier delivery complete"
    }
  ];
}

function getWarehouseLogMovementTypes() {
  return [
    ...new Set(
      getStoredWarehouseLogEntriesForLogPage()
        .map((entry) => entry.movementType || "")
        .filter(Boolean)
    )
  ].sort();
}

function getFilteredWarehouseLogEntries() {
  const filters = window.DMC_WAREHOUSE_LOG_FILTERS;
  const searchValue = String(filters.search || "").toLowerCase().trim();
  const selectedMovementType = String(filters.movementType || "all");
  const startDate = String(filters.startDate || "");
  const endDate = String(filters.endDate || "");

  return getStoredWarehouseLogEntriesForLogPage().filter((entry) => {
    const entryDate = String(entry.date || "");

    const matchesStartDate = !startDate || entryDate >= startDate;
    const matchesEndDate = !endDate || entryDate <= endDate;

    const matchesMovementType =
      selectedMovementType === "all" ||
      String(entry.movementType || "") === selectedMovementType;

    const matchesSearch =
      !searchValue ||
      String(entry.batchId || "").toLowerCase().includes(searchValue) ||
      String(entry.itemId || "").toLowerCase().includes(searchValue) ||
      String(entry.itemName || "").toLowerCase().includes(searchValue) ||
      String(entry.managerReviewedBy || "").toLowerCase().includes(searchValue) ||
      String(entry.notes || "").toLowerCase().includes(searchValue);

    return (
      matchesStartDate &&
      matchesEndDate &&
      matchesMovementType &&
      matchesSearch
    );
  });
}

function groupWarehouseLogEntriesByBatch(entries) {
  return entries.reduce((groups, entry) => {
    const batchId = entry.batchId || "No Batch ID";

    groups[batchId] = groups[batchId] || [];
    groups[batchId].push(entry);

    return groups;
  }, {});
}

function getWarehouseLogBatches() {
  const filteredEntries = getFilteredWarehouseLogEntries();
  const groupedEntries = groupWarehouseLogEntriesByBatch(filteredEntries);

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

function getSelectedWarehouseLogBatch() {
  const batches = getWarehouseLogBatches();

  if (batches.length === 0) {
    return null;
  }

  const selectedBatchId = window.DMC_WAREHOUSE_LOG_FILTERS.selectedBatchId;

  const selectedBatch = batches.find(
    (batch) => batch.batchId === selectedBatchId
  );

  return selectedBatch || null;
}

function renderWarehouseLogMovementOptions() {
  const currentMovementType = window.DMC_WAREHOUSE_LOG_FILTERS.movementType;

  return `
    <option value="all" ${currentMovementType === "all" ? "selected" : ""}>
      All Movements
    </option>
    ${getWarehouseLogMovementTypes()
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

function getWarehouseMovementBadgeClass(movementType) {
  if (movementType === "Transfer In") {
    return "success";
  }

  if (movementType === "Waste") {
    return "danger";
  }

  return "warning";
}

function getWarehouseEffectBadgeClass(stockEffect) {
  return stockEffect === "add" ? "success" : "danger";
}

function getWarehouseSignedQuantity(entry) {
  const sign = entry.stockEffect === "add" ? "+" : "-";
  return `${sign}${entry.quantity} ${entry.unit || ""}`;
}

function renderWarehouseBatchList() {
  const batches = getWarehouseLogBatches();

  if (batches.length === 0) {
    return `
      <div class="warehouse-log-empty-card">
        No submitted Warehouse batches match the current filters.
      </div>
    `;
  }

  return batches
    .map((batch) => {
      const firstEntry = batch.entries[0] || {};
      const addCount = batch.entries.filter(
        (entry) => entry.stockEffect === "add"
      ).length;
      const deductCount = batch.entries.length - addCount;
      const isActive =
        window.DMC_WAREHOUSE_LOG_FILTERS.selectedBatchId === batch.batchId;

      return `
        <button
          class="warehouse-log-batch-card ${isActive ? "active" : ""}"
          data-warehouse-batch-id="${batch.batchId}"
        >
          <div class="warehouse-log-batch-card-top">
            <div>
              <strong>Daily Input Batch</strong>
              <span>${batch.batchId}</span>
            </div>

            <em>${batch.entries.length} rows</em>
          </div>

          <div class="warehouse-log-batch-card-meta">
            <span>Date</span>
            <strong>${firstEntry.date || "-"}</strong>
          </div>

          <div class="warehouse-log-batch-card-meta">
            <span>Manager</span>
            <strong>${firstEntry.managerReviewedBy || "-"}</strong>
          </div>

          <div class="warehouse-log-batch-card-meta">
            <span>Effect</span>
            <strong>
              <span class="positive-text">+${addCount}</span>
              /
              <span class="negative-text">-${deductCount}</span>
            </strong>
          </div>
        </button>
      `;
    })
    .join("");
}

function renderSelectedBatchDetails() {
  const selectedBatch = getSelectedWarehouseLogBatch();

  if (!selectedBatch) {
    return `
      <div class="warehouse-log-empty-detail">
        <div>
          <div class="empty-detail-icon">↕</div>
          <h4>Select a submitted batch</h4>
          <p>
            Choose a batch from the left panel to view the posted movements,
            manager review, notes, and stock effect.
          </p>
        </div>
      </div>
    `;
  }

  const firstEntry = selectedBatch.entries[0] || {};

  return `
    <div class="warehouse-log-detail-card">
      <div class="warehouse-log-detail-summary">
        <div>
          <p>Batch ID</p>
          <strong>${selectedBatch.batchId}</strong>
        </div>

        <div>
          <p>Submitted</p>
          <strong>${firstEntry.submittedAtDisplay || firstEntry.date || "-"}</strong>
        </div>

        <div>
          <p>Manager</p>
          <strong>${firstEntry.managerReviewedBy || "-"}</strong>
        </div>
      </div>

      <div class="warehouse-log-detail-header">
        <div>
          <p>Posted Movements</p>
          <h4>${selectedBatch.entries.length} stock movements in this batch</h4>
        </div>

        <span class="badge success">Posted</span>
      </div>

      <div class="table-wrap warehouse-log-detail-table-wrap">
        <table class="warehouse-log-detail-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Movement</th>
              <th>Qty</th>
              <th>Effect</th>
              <th>Notes</th>
            </tr>
          </thead>

          <tbody>
            ${selectedBatch.entries
              .map(
                (entry) => `
                  <tr>
                    <td>
                      <strong>${entry.itemName || "-"}</strong>
                      <small class="table-subtext">${entry.itemId || "-"}</small>
                    </td>
                    <td>
                      <span class="badge ${getWarehouseMovementBadgeClass(
                        entry.movementType
                      )}">
                        ${entry.movementType || "-"}
                      </span>
                    </td>
                    <td class="${
                      entry.stockEffect === "add"
                        ? "positive-text"
                        : "negative-text"
                    }">
                      <strong>${getWarehouseSignedQuantity(entry)}</strong>
                    </td>
                    <td>
                      <span class="badge ${getWarehouseEffectBadgeClass(
                        entry.stockEffect
                      )}">
                        ${entry.stockEffect === "add" ? "Add" : "Deduct"}
                      </span>
                    </td>
                    <td>${entry.notes || "-"}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>

      <div class="warehouse-log-note">
        Warehouse Stock can still calculate totals from this batch because each
        batch contains individual movement rows. Batch view is only for easier
        reviewing; stock math still reads every item movement inside the batch.
      </div>
    </div>
  `;
}

function getWarehouseLogTransactionContent() {
  const filters = window.DMC_WAREHOUSE_LOG_FILTERS;
  const batches = getWarehouseLogBatches();

  return `
    <section class="panel warehouse-log-page">
      <div class="panel-header">
        <div>
          <h3>Warehouse Log Transaction</h3>
          <p>
            Posted Warehouse Daily Input movements are stored here for review,
            audit, and stock calculations.
          </p>
        </div>

        <span class="badge">Movement History</span>
      </div>

      <div class="warehouse-log-layout">
        <aside class="warehouse-log-left-panel">
          <div class="warehouse-log-filters">
            <div class="warehouse-log-date-grid">
              <label>
                Start Date
                <input
                  id="warehouse-log-start-date"
                  type="date"
                  value="${filters.startDate}"
                />
              </label>

              <label>
                End Date
                <input
                  id="warehouse-log-end-date"
                  type="date"
                  value="${filters.endDate}"
                />
              </label>
            </div>

            <label>
              Movement Type
              <select id="warehouse-log-movement-filter">
                ${renderWarehouseLogMovementOptions()}
              </select>
            </label>

            <label class="filter-search">
              Search
              <input
                id="warehouse-log-search"
                type="text"
                placeholder="Search item, batch, manager..."
                value="${filters.search}"
              />
            </label>

            <div class="warehouse-log-filter-actions">
              <button class="ghost-button" id="clear-warehouse-log-filters">
                Clear
              </button>

              <button class="primary-button" id="export-warehouse-log">
                Export
              </button>
            </div>
          </div>

          <div class="warehouse-log-list-header">
            <p>Submitted Batches</p>
            <span>${batches.length} found</span>
          </div>

          <div class="warehouse-log-batch-list">
            ${renderWarehouseBatchList()}
          </div>
        </aside>

        <section class="warehouse-log-right-panel">
          <div class="warehouse-log-right-header">
            <div>
              <p>Batch Details</p>
              <h4>${
                getSelectedWarehouseLogBatch()?.batchId ||
                "No batch selected"
              }</h4>
            </div>

            <span>Read Only</span>
          </div>

          ${renderSelectedBatchDetails()}
        </section>
      </div>
    </section>
  `;
}

function refreshWarehouseLogTransactionPage() {
  window.DMC_PAGES["warehouse-log-transaction"].content =
    getWarehouseLogTransactionContent();

  renderPage("warehouse-log-transaction");
}

function setupWarehouseLogTransactionEvents() {
  const startDateInput = document.getElementById("warehouse-log-start-date");
  const endDateInput = document.getElementById("warehouse-log-end-date");
  const movementFilter = document.getElementById("warehouse-log-movement-filter");
  const searchInput = document.getElementById("warehouse-log-search");
  const clearButton = document.getElementById("clear-warehouse-log-filters");
  const exportButton = document.getElementById("export-warehouse-log");

  if (startDateInput) {
    startDateInput.addEventListener("change", () => {
      window.DMC_WAREHOUSE_LOG_FILTERS.startDate = startDateInput.value;
      window.DMC_WAREHOUSE_LOG_FILTERS.selectedBatchId = "";
      refreshWarehouseLogTransactionPage();
    });
  }

  if (endDateInput) {
    endDateInput.addEventListener("change", () => {
      window.DMC_WAREHOUSE_LOG_FILTERS.endDate = endDateInput.value;
      window.DMC_WAREHOUSE_LOG_FILTERS.selectedBatchId = "";
      refreshWarehouseLogTransactionPage();
    });
  }

  if (movementFilter) {
    movementFilter.addEventListener("change", () => {
      window.DMC_WAREHOUSE_LOG_FILTERS.movementType = movementFilter.value;
      window.DMC_WAREHOUSE_LOG_FILTERS.selectedBatchId = "";
      refreshWarehouseLogTransactionPage();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      window.DMC_WAREHOUSE_LOG_FILTERS.search = searchInput.value;
      window.DMC_WAREHOUSE_LOG_FILTERS.selectedBatchId = "";
      refreshWarehouseLogTransactionPage();
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      window.DMC_WAREHOUSE_LOG_FILTERS = {
        startDate: "",
        endDate: "",
        movementType: "all",
        search: "",
        selectedBatchId: ""
      };

      refreshWarehouseLogTransactionPage();
    });
  }

  if (exportButton) {
    exportButton.addEventListener("click", () => {
      if (typeof window.DMC_SHOW_MODAL === "function") {
        window.DMC_SHOW_MODAL({
          type: "info",
          title: "Export Coming Soon",
          message:
            "Export/print for Warehouse Log Transaction will be connected after the reporting workflow is finalized.",
          confirmLabel: "Got it"
        });
      }
    });
  }

  document.querySelectorAll("[data-warehouse-batch-id]").forEach((button) => {
    button.addEventListener("click", () => {
      window.DMC_WAREHOUSE_LOG_FILTERS.selectedBatchId =
        button.dataset.warehouseBatchId;

      refreshWarehouseLogTransactionPage();
    });
  });
}

window.DMC_PAGES["warehouse-log-transaction"] = {
  eyebrow: "Warehouse",
  title: "Warehouse Log Transaction",
  description:
    "Read-only batch history of posted Warehouse Daily Input movements.",
  getContent: getWarehouseLogTransactionContent,
  content: getWarehouseLogTransactionContent(),
  afterRender: setupWarehouseLogTransactionEvents
};
