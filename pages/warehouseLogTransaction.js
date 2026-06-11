window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_WAREHOUSE_LOG_STORAGE_KEY_FOR_LOG_PAGE =
  "dmc_inventory_ledger_entries";

window.DMC_WAREHOUSE_LOG_FILTERS = window.DMC_WAREHOUSE_LOG_FILTERS || {
  startDate: "",
  endDate: "",
  department: "all",
  movementType: "all",
  search: "",
  selectedBatchId: ""
};

window.DMC_WAREHOUSE_LOG_NOTE_LOOKUP =
  window.DMC_WAREHOUSE_LOG_NOTE_LOOKUP || {};

function getStoredWarehouseLogEntriesForLogPage() {
  const storedEntries = localStorage.getItem(
    DMC_WAREHOUSE_LOG_STORAGE_KEY_FOR_LOG_PAGE
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

function formatWarehouseLogDateTime(value) {
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

function entryBelongsToWarehouseLog(entry) {
  const location = String(entry.location || "").toLowerCase();
  const department = String(entry.department || "").toLowerCase();
  const source = String(entry.source || "").toLowerCase();
  const destination = String(entry.destination || "").toLowerCase();
  const movementField = String(entry.movementField || "").toLowerCase();

  if (
    source.includes("branch daily input") ||
    source.includes("commissary daily input") ||
    source.includes("commissary daily input closing count") ||
    movementField === "transferoutwarehouse"
  ) {
    return false;
  }

  if (source.includes("incoming from commissary")) {
    return true;
  }

  if (
    location.includes("warehouse") ||
    location.includes("stockroom") ||
    department.includes("warehouse") ||
    department.includes("stockroom")
  ) {
    return true;
  }

  if (
    source.includes("warehouse") ||
    source.includes("stockroom") ||
    source.includes("supplier")
  ) {
    return true;
  }

  if (
    destination.includes("warehouse") ||
    destination.includes("stockroom")
  ) {
    return !location.includes("commissary");
  }

  return false;
}

function getWarehouseLogEntriesOnly() {
  return getStoredWarehouseLogEntriesForLogPage().filter(
    entryBelongsToWarehouseLog
  );
}

function getWarehouseLogDepartments() {
  return [
    ...new Set(
      getWarehouseLogEntriesOnly()
        .map((entry) => entry.department || "")
        .filter(Boolean)
    )
  ].sort();
}

function getWarehouseLogMovementTypes() {
  const preferredOrder = [
    "Transfer In",
    "Received",
    "Supplier Receiving",
    "Transfer Out",
    "Waste",
    "Adjustment",
    "Stock Count",
    "Remaining Count"
  ];

  const movementTypes = [
    ...new Set(
      getWarehouseLogEntriesOnly()
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

function getFilteredWarehouseLogEntries() {
  const filters = window.DMC_WAREHOUSE_LOG_FILTERS;
  const searchValue = String(filters.search || "").toLowerCase().trim();
  const selectedDepartment = String(filters.department || "all");
  const selectedMovementType = String(filters.movementType || "all");
  const startDate = String(filters.startDate || "");
  const endDate = String(filters.endDate || "");

  return getWarehouseLogEntriesOnly().filter((entry) => {
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
      String(entry.sourceBatchId || "").toLowerCase().includes(searchValue) ||
      String(entry.itemId || "").toLowerCase().includes(searchValue) ||
      String(entry.itemName || "").toLowerCase().includes(searchValue) ||
      String(entry.department || "").toLowerCase().includes(searchValue) ||
      String(entry.section || "").toLowerCase().includes(searchValue) ||
      String(entry.source || "").toLowerCase().includes(searchValue) ||
      String(entry.destination || "").toLowerCase().includes(searchValue) ||
      String(entry.receivedBy || "").toLowerCase().includes(searchValue) ||
      String(entry.managerReviewedBy || "").toLowerCase().includes(searchValue) ||
      String(entry.condition || "").toLowerCase().includes(searchValue) ||
      String(entry.notes || "").toLowerCase().includes(searchValue);

    return (
      matchesStartDate &&
      matchesEndDate &&
      matchesDepartment &&
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

function getWarehouseLogEntryTime(entry) {
  return String(entry.submittedAt || entry.receivedAt || entry.date || "");
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
      return getWarehouseLogEntryTime(b.entries[0] || {}).localeCompare(
        getWarehouseLogEntryTime(a.entries[0] || {})
      );
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

  return selectedBatch || batches[0] || null;
}

function renderWarehouseLogDepartmentOptions() {
  const currentDepartment = window.DMC_WAREHOUSE_LOG_FILTERS.department;

  return `
    <option value="all" ${currentDepartment === "all" ? "selected" : ""}>
      All Departments
    </option>
    ${getWarehouseLogDepartments()
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

function getWarehouseEntryStockEffect(entry) {
  if (entry.stockEffect) {
    return entry.stockEffect;
  }

  if (
    entry.movementType === "Transfer In" ||
    entry.movementType === "Received" ||
    entry.movementType === "Supplier Receiving"
  ) {
    return "add";
  }

  if (
    entry.movementType === "Transfer Out" ||
    entry.movementType === "Waste" ||
    entry.movementType === "Usage"
  ) {
    return "deduct";
  }

  if (
    entry.movementType === "Stock Count" ||
    entry.movementType === "Remaining Count"
  ) {
    return "set";
  }

  return "report";
}

function getWarehouseMovementBadgeClass(movementType) {
  if (
    movementType === "Transfer In" ||
    movementType === "Received" ||
    movementType === "Supplier Receiving"
  ) {
    return "success";
  }

  if (movementType === "Waste") {
    return "danger";
  }

  if (movementType === "Transfer Out" || movementType === "Usage") {
    return "warning";
  }

  return "info-badge";
}

function getWarehouseEffectBadgeClass(stockEffect) {
  if (stockEffect === "add") {
    return "success";
  }

  if (stockEffect === "deduct") {
    return "danger";
  }

  if (stockEffect === "set") {
    return "info-badge";
  }

  return "warning-badge";
}

function getWarehouseSignedQuantity(entry) {
  const stockEffect = getWarehouseEntryStockEffect(entry);
  const quantity = Number(entry.quantity || 0);

  if (stockEffect === "add") {
    return `+${quantity} ${entry.unit || ""}`;
  }

  if (stockEffect === "deduct") {
    return `-${quantity} ${entry.unit || ""}`;
  }

  if (stockEffect === "set") {
    return `Set ${quantity} ${entry.unit || ""}`;
  }

  return `${quantity} ${entry.unit || ""}`;
}

function getWarehouseBatchSourceLabel(batch) {
  const entries = batch.entries || [];
  const firstEntry = entries[0] || {};
  const source = String(firstEntry.source || "").toLowerCase();

  if (entries.some((entry) => String(entry.source || "").toLowerCase().includes("incoming from commissary"))) {
    return "Received from Commissary";
  }

  if (source.includes("supplier")) {
    return "Supplier Receiving Batch";
  }

  if (source.includes("warehouse daily input")) {
    return "Warehouse Daily Input Batch";
  }

  if (entries.some((entry) => getWarehouseEntryStockEffect(entry) === "deduct")) {
    return "Warehouse Transfer Out Batch";
  }

  return "Warehouse Movement Batch";
}

function getWarehouseBatchEffectCounts(batch) {
  return batch.entries.reduce(
    (counts, entry) => {
      const effect = getWarehouseEntryStockEffect(entry);

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

function cleanWarehouseLogNotes(entry) {
  let notes = String(entry.notes || "").trim();

  if (!notes) {
    return "";
  }

  const defaultFragments = [
    "Warehouse received from Commissary.",
    `Original Commissary Batch: ${entry.sourceBatchId || ""}.`,
    `Sent Qty: ${entry.sentQuantity ?? ""}.`,
    `Received Qty: ${entry.quantity ?? ""}.`,
    `Variance: ${entry.variance ?? ""}.`,
    `Condition: ${entry.condition || ""}.`
  ];

  defaultFragments.forEach((fragment) => {
    if (fragment && fragment !== "Original Commissary Batch: ." && fragment !== "Sent Qty: ." && fragment !== "Received Qty: ." && fragment !== "Variance: ." && fragment !== "Condition: .") {
      notes = notes.replace(fragment, "");
    }
  });

  notes = notes
    .replace(/\s+/g, " ")
    .replace(/^Receiving Notes:\s*/i, "")
    .replace(/^Commissary Notes:\s*/i, "")
    .trim();

  if (
    notes === "Warehouse received from Commissary." ||
    notes === "No notes" ||
    notes === "N/A"
  ) {
    return "";
  }

  return notes;
}

function createWarehouseLogNoteKey(entry, index) {
  return [
    entry.batchId || "batch",
    entry.itemId || "item",
    entry.sourceLineKey || "line",
    index
  ].join("__");
}

function renderWarehouseLogNotes(entry, index) {
  const cleanedNotes = cleanWarehouseLogNotes(entry);

  if (!cleanedNotes) {
    return "-";
  }

  const noteKey = createWarehouseLogNoteKey(entry, index);
  window.DMC_WAREHOUSE_LOG_NOTE_LOOKUP[noteKey] = cleanedNotes;

  if (cleanedNotes.length <= 55) {
    return cleanedNotes;
  }

  return `
    <button class="tiny-button" data-warehouse-note-key="${noteKey}">
      View Notes
    </button>
  `;
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
      const counts = getWarehouseBatchEffectCounts(batch);
      const isActive =
        window.DMC_WAREHOUSE_LOG_FILTERS.selectedBatchId === batch.batchId ||
        (!window.DMC_WAREHOUSE_LOG_FILTERS.selectedBatchId &&
          getSelectedWarehouseLogBatch()?.batchId === batch.batchId);

      return `
        <button
          class="warehouse-log-batch-card ${isActive ? "active" : ""}"
          data-warehouse-batch-id="${batch.batchId}"
        >
          <div class="warehouse-log-batch-card-top">
            <div>
              <strong>${getWarehouseBatchSourceLabel(batch)}</strong>
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

function renderWarehouseBatchLineTable(batch) {
  if (!batch || batch.entries.length === 0) {
    return `
      <p class="submit-preview-empty">No warehouse movement lines found.</p>
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
            <th>Movement</th>
            <th>Received / In</th>
            <th>Out</th>
            <th>Sent Qty</th>
            <th>Variance</th>
            <th>Unit</th>
            <th>Condition</th>
            <th>Notes</th>
          </tr>
        </thead>

        <tbody>
          ${batch.entries
            .map((entry, index) => {
              const stockEffect = getWarehouseEntryStockEffect(entry);
              const quantity = Number(entry.quantity || 0);
              const sentQty =
                entry.sentQuantity === undefined || entry.sentQuantity === null
                  ? "-"
                  : entry.sentQuantity;
              const variance =
                entry.variance === undefined || entry.variance === null
                  ? "-"
                  : entry.variance;

              return `
                <tr>
                  <td>${entry.department || "-"}</td>
                  <td>${entry.section || "-"}</td>
                  <td>${entry.itemId || "-"}</td>
                  <td>${entry.itemName || "-"}</td>
                  <td>
                    <span class="badge ${getWarehouseMovementBadgeClass(
                      entry.movementType
                    )}">
                      ${entry.movementType || "-"}
                    </span>
                    <small class="table-subtext">
                      ${entry.source || "-"} → ${entry.destination || "-"}
                    </small>
                  </td>
                  <td class="${stockEffect === "add" ? "positive-text" : ""}">
                    ${
                      stockEffect === "add"
                        ? `<strong>${quantity}</strong>`
                        : "-"
                    }
                  </td>
                  <td class="${stockEffect === "deduct" ? "negative-text" : ""}">
                    ${
                      stockEffect === "deduct"
                        ? `<strong>${quantity}</strong>`
                        : "-"
                    }
                  </td>
                  <td>${sentQty}</td>
                  <td class="${variance !== "-" && Number(variance) !== 0 ? "danger-text" : ""}">
                    ${variance}
                  </td>
                  <td>${entry.unit || "-"}</td>
                  <td>${entry.condition || "-"}</td>
                  <td>${renderWarehouseLogNotes(entry, index)}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSelectedWarehouseBatchDetails() {
  const selectedBatch = getSelectedWarehouseLogBatch();

  if (!selectedBatch) {
    return `
      <section class="panel delivery-log-detail">
        <div class="order-list-empty">
          <p>No batch selected.</p>
          <span>Select a submitted Warehouse batch from the left panel.</span>
        </div>
      </section>
    `;
  }

  const firstEntry = selectedBatch.entries[0] || {};
  const reviewedBy =
    firstEntry.receivedBy ||
    firstEntry.managerReviewedBy ||
    firstEntry.preparedBy ||
    "-";

  return `
    <section class="panel delivery-log-detail branch-log-detail">
      <div class="panel-header">
        <div>
          <h3>${selectedBatch.batchId}</h3>
          <p>
            Warehouse • ${firstEntry.department || "-"} • ${
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
          <p class="eyebrow">Submitted / Received At</p>
          <strong>${formatWarehouseLogDateTime(
            firstEntry.submittedAt || firstEntry.receivedAt || firstEntry.date
          )}</strong>
        </div>

        <div>
          <p class="eyebrow">Received / Reviewed By</p>
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

        <div>
          <p class="eyebrow">Destination</p>
          <strong>${firstEntry.destination || "-"}</strong>
        </div>

        <div>
          <p class="eyebrow">Original Batch</p>
          <strong>${firstEntry.sourceBatchId || "-"}</strong>
        </div>
      </div>

      <div class="branch-order-section">
        <h4>Warehouse Movement Lines</h4>
        ${renderWarehouseBatchLineTable(selectedBatch)}
      </div>

      <div class="instruction-box">
        <strong>Stock Rule:</strong>
        <span>
          Warehouse Stock is calculated from these posted movement rows. For Incoming from Commissary,
          Warehouse Stock uses actual Received Qty, not Sent Qty. Variance is kept for review.
        </span>
      </div>
    </section>
  `;
}

function getWarehouseLogTransactionContent() {
  const filters = window.DMC_WAREHOUSE_LOG_FILTERS;
  const batches = getWarehouseLogBatches();

  return `
    <section class="grid">
      <div class="card">
        <p>Total Batches</p>
        <strong>${batches.length}</strong>
      </div>

      <div class="card">
        <p>Departments</p>
        <strong>${getWarehouseLogDepartments().length}</strong>
      </div>

      <div class="card">
        <p>Movement Types</p>
        <strong>${getWarehouseLogMovementTypes().length}</strong>
      </div>
    </section>

    <section class="delivery-log-layout branch-log-layout">
      <section class="panel delivery-log-list-panel">
        <div class="panel-header">
          <div>
            <h3>Warehouse Log Transaction</h3>
            <p>
              Read-only history of Warehouse receiving, supplier activity,
              commissary receipts, transfer movement, waste, and adjustments.
            </p>
          </div>

          <span class="badge">Movement History</span>
        </div>

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
            Department
            <select id="warehouse-log-department-filter">
              ${renderWarehouseLogDepartmentOptions()}
            </select>
          </label>

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
              placeholder="Search item, batch, source, receiver, notes..."
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
      </section>

      ${renderSelectedWarehouseBatchDetails()}
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
  const departmentFilter = document.getElementById(
    "warehouse-log-department-filter"
  );
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

  if (departmentFilter) {
    departmentFilter.addEventListener("change", () => {
      window.DMC_WAREHOUSE_LOG_FILTERS.department = departmentFilter.value;
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
        department: "all",
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

  document.querySelectorAll("[data-warehouse-note-key]").forEach((button) => {
    button.addEventListener("click", () => {
      const noteKey = button.dataset.warehouseNoteKey;
      const note = window.DMC_WAREHOUSE_LOG_NOTE_LOOKUP[noteKey] || "";

      if (typeof window.DMC_SHOW_MODAL === "function") {
        window.DMC_SHOW_MODAL({
          type: "info",
          title: "Movement Notes",
          message: note || "No notes.",
          confirmLabel: "Close"
        });
      } else {
        alert(note || "No notes.");
      }
    });
  });
}

window.DMC_PAGES["warehouse-log-transaction"] = {
  eyebrow: "Warehouse",
  title: "Warehouse Log Transaction",
  description:
    "Read-only batch history of posted Warehouse receiving, commissary receipts, transfer movement, and stock effects.",
  getContent: getWarehouseLogTransactionContent,
  content: getWarehouseLogTransactionContent(),
  afterRender: setupWarehouseLogTransactionEvents
};
