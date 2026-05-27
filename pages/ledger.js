window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_LEDGER_STORAGE_KEY = "dmc_inventory_ledger_entries";

window.DMC_LEDGER_FILTERS = window.DMC_LEDGER_FILTERS || {
  department: "all",
  movementType: "all",
  search: "",
  startDate: "",
  endDate: ""
};

window.DMC_SELECTED_LEDGER_BATCH_KEY =
  window.DMC_SELECTED_LEDGER_BATCH_KEY || "";

function getTodayLedgerDate() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthStartLedgerDate() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  return firstDay.toISOString().slice(0, 10);
}

function getDefaultLedgerEntries() {
  return window.DMC_DATA?.ledger || [];
}

function getStoredLedgerEntries() {
  const storedEntries = localStorage.getItem(DMC_LEDGER_STORAGE_KEY);

  if (!storedEntries) {
    return getDefaultLedgerEntries();
  }

  try {
    return JSON.parse(storedEntries);
  } catch {
    return getDefaultLedgerEntries();
  }
}

function getLedgerEntrySortValue(entry) {
  if (entry.submittedAt) {
    return new Date(entry.submittedAt).getTime();
  }

  if (entry.date) {
    return new Date(entry.date).getTime();
  }

  return 0;
}

function getSortedLedgerEntries(entries) {
  return [...entries].sort(
    (a, b) => getLedgerEntrySortValue(b) - getLedgerEntrySortValue(a)
  );
}

function getFilteredLedgerEntries() {
  const filters = window.DMC_LEDGER_FILTERS;
  const searchValue = String(filters.search || "").toLowerCase().trim();

  const filtered = getStoredLedgerEntries().filter((entry) => {
    const entryDate = String(entry.date || "");

    const matchesDepartment =
      filters.department === "all" || entry.department === filters.department;

    const matchesMovementType =
      filters.movementType === "all" ||
      entry.movementType === filters.movementType;

    const matchesStartDate =
      !filters.startDate || entryDate >= filters.startDate;

    const matchesEndDate = !filters.endDate || entryDate <= filters.endDate;

    const matchesSearch =
      !searchValue ||
      String(entry.date || "").toLowerCase().includes(searchValue) ||
      String(entry.submittedAtDisplay || "").toLowerCase().includes(searchValue) ||
      String(entry.batchId || "").toLowerCase().includes(searchValue) ||
      String(entry.department || "").toLowerCase().includes(searchValue) ||
      String(entry.section || "").toLowerCase().includes(searchValue) ||
      String(entry.itemId || "").toLowerCase().includes(searchValue) ||
      String(entry.itemName || "").toLowerCase().includes(searchValue) ||
      String(entry.movementType || "").toLowerCase().includes(searchValue) ||
      String(entry.source || "").toLowerCase().includes(searchValue) ||
      String(entry.notes || "").toLowerCase().includes(searchValue);

    return (
      matchesDepartment &&
      matchesMovementType &&
      matchesStartDate &&
      matchesEndDate &&
      matchesSearch
    );
  });

  return getSortedLedgerEntries(filtered);
}

function getUniqueLedgerValues(fieldName) {
  return Array.from(
    new Set(
      getStoredLedgerEntries()
        .map((entry) => entry[fieldName])
        .filter(Boolean)
    )
  );
}

function renderLedgerFilterOptions(values, currentValue, allLabel) {
  return `
    <option value="all" ${currentValue === "all" ? "selected" : ""}>
      ${allLabel}
    </option>
    ${values
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

function getLedgerBatchKey(entry) {
  return entry.batchId || `legacy-${entry.date || "unknown"}-${entry.source || "sample"}`;
}

function getLedgerBatchLabel(batch) {
  if (batch.batchId && batch.batchId !== "No Batch") {
    return batch.batchId;
  }

  return "Legacy / Sample Entries";
}

function groupLedgerEntriesByBatch(entries) {
  const batches = {};

  entries.forEach((entry) => {
    const batchKey = getLedgerBatchKey(entry);

    if (!batches[batchKey]) {
      batches[batchKey] = {
        batchKey,
        batchId: entry.batchId || "No Batch",
        submittedAt: entry.submittedAt || "",
        submittedAtDisplay: entry.submittedAtDisplay || "Legacy / Sample",
        date: entry.date || "-",
        source: entry.source || "-",
        department: entry.department || "-",
        entries: []
      };
    }

    batches[batchKey].entries.push(entry);
  });

  return Object.values(batches).sort((a, b) => {
    const aTime = a.submittedAt
      ? new Date(a.submittedAt).getTime()
      : new Date(a.date).getTime();

    const bTime = b.submittedAt
      ? new Date(b.submittedAt).getTime()
      : new Date(b.date).getTime();

    return bTime - aTime;
  });
}

function getBatchTotals(entries) {
  const totals = {};

  entries.forEach((entry) => {
    const movementType = entry.movementType || "Other";
    const quantity = Number(entry.quantity || 0);

    totals[movementType] = (totals[movementType] || 0) + quantity;
  });

  return totals;
}

function renderBatchTotals(entries) {
  const totals = getBatchTotals(entries);

  return Object.entries(totals)
    .map(
      ([movementType, total]) => `
        <span class="ledger-batch-pill">
          ${movementType}: ${total}
        </span>
      `
    )
    .join("");
}

function getSelectedLedgerBatch() {
  const batches = groupLedgerEntriesByBatch(getFilteredLedgerEntries());

  if (window.DMC_SELECTED_LEDGER_BATCH_KEY) {
    const selectedBatch = batches.find(
      (batch) => batch.batchKey === window.DMC_SELECTED_LEDGER_BATCH_KEY
    );

    if (selectedBatch) {
      return selectedBatch;
    }
  }

  return batches[0] || null;
}

function renderLedgerBatchList() {
  const batches = groupLedgerEntriesByBatch(getFilteredLedgerEntries());
  const selectedBatch = getSelectedLedgerBatch();

  if (batches.length === 0) {
    return `
      <div class="order-list-empty">
        <p>No ledger batches found.</p>
        <span>Try changing the filters or search terms.</span>
      </div>
    `;
  }

  return `
    <div class="ledger-workbench-batch-list">
      ${batches
        .map(
          (batch) => `
            <button
              class="ledger-workbench-batch-item ${
                selectedBatch?.batchKey === batch.batchKey ? "active" : ""
              }"
              data-select-ledger-batch="${batch.batchKey}"
            >
              <div>
                <strong>${getLedgerBatchLabel(batch)}</strong>
                <p>${batch.department} • ${batch.source}</p>
                <span>${batch.submittedAtDisplay || batch.date}</span>
              </div>

              <div class="ledger-workbench-batch-meta">
                <span class="badge">${batch.entries.length} entries</span>
              </div>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderLedgerRows(entries) {
  if (!entries || entries.length === 0) {
    return `
      <tr>
        <td colspan="10">No ledger entries found for this batch.</td>
      </tr>
    `;
  }

  return entries
    .map(
      (entry) => `
        <tr>
          <td>${entry.date || "-"}</td>
          <td>${entry.department || "-"}</td>
          <td>${entry.section || "-"}</td>
          <td>${entry.itemId || "-"}</td>
          <td>${entry.itemName || "-"}</td>
          <td><span class="badge">${entry.movementType || "-"}</span></td>
          <td>${entry.quantity || "-"}</td>
          <td>${entry.unit || "-"}</td>
          <td>${entry.source || "-"}</td>
          <td>${entry.notes || "-"}</td>
        </tr>
      `
    )
    .join("");
}

function renderSelectedLedgerBatchDetail() {
  const batch = getSelectedLedgerBatch();

  if (!batch) {
    return `
      <section class="panel ledger-workbench-detail">
        <div class="order-list-empty">
          <p>No batch selected.</p>
          <span>Select a ledger batch from the left panel.</span>
        </div>
      </section>
    `;
  }

  return `
    <section class="panel ledger-workbench-detail">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Selected Batch</p>
          <h3>${getLedgerBatchLabel(batch)}</h3>
          <p>${batch.submittedAtDisplay || batch.date} • ${batch.department} • ${batch.source}</p>
        </div>

        <span class="badge">${batch.entries.length} entries</span>
      </div>

      <div class="ledger-workbench-info-grid">
        <div>
          <p class="eyebrow">Batch ID</p>
          <strong>${getLedgerBatchLabel(batch)}</strong>
        </div>

        <div>
          <p class="eyebrow">Date</p>
          <strong>${batch.date || "-"}</strong>
        </div>

        <div>
          <p class="eyebrow">Department</p>
          <strong>${batch.department || "-"}</strong>
        </div>

        <div>
          <p class="eyebrow">Source</p>
          <strong>${batch.source || "-"}</strong>
        </div>
      </div>

      <div class="ledger-workbench-totals">
        ${renderBatchTotals(batch.entries)}
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Department</th>
              <th>Section</th>
              <th>Item ID</th>
              <th>Item Name</th>
              <th>Movement Type</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Source</th>
              <th>Notes</th>
            </tr>
          </thead>

          <tbody>
            ${renderLedgerRows(batch.entries)}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function getLedgerSummary() {
  const entries = getStoredLedgerEntries();
  const filteredEntries = getFilteredLedgerEntries();

  const usageCount = entries.filter(
    (entry) => entry.movementType === "Usage"
  ).length;

  const batchCount = groupLedgerEntriesByBatch(entries).length;
  const filteredBatchCount = groupLedgerEntriesByBatch(filteredEntries).length;

  return {
    totalEntries: entries.length,
    showingEntries: filteredEntries.length,
    batchCount,
    filteredBatchCount,
    usageCount
  };
}

function getLedgerContent() {
  const summary = getLedgerSummary();

  const departmentOptions = getUniqueLedgerValues("department");
  const movementTypeOptions = getUniqueLedgerValues("movementType");
  const filters = window.DMC_LEDGER_FILTERS;

  return `
    <section class="grid">
      <div class="card">
        <p>Showing Entries</p>
        <strong>${summary.showingEntries}</strong>
      </div>

      <div class="card">
        <p>Filtered Batches</p>
        <strong>${summary.filteredBatchCount}</strong>
      </div>

      <div class="card">
        <p>Total Entries</p>
        <strong>${summary.totalEntries}</strong>
      </div>

      <div class="card">
        <p>Total Batches</p>
        <strong>${summary.batchCount}</strong>
      </div>
    </section>

    <section class="ledger-workbench-layout">
      <section class="panel ledger-workbench-control">
        <div class="panel-header">
          <div>
            <h3>Ledger Control</h3>
            <p>Search, filter, and select one batch to review.</p>
          </div>
        </div>

        <div class="ledger-workbench-filters">
          <label>
            Department
            <select id="ledger-department-filter">
              ${renderLedgerFilterOptions(
                departmentOptions,
                filters.department,
                "All Departments"
              )}
            </select>
          </label>

          <label>
            Movement Type
            <select id="ledger-movement-filter">
              ${renderLedgerFilterOptions(
                movementTypeOptions,
                filters.movementType,
                "All Movement Types"
              )}
            </select>
          </label>

          <label>
            Start Date
            <input id="ledger-start-date" type="date" value="${filters.startDate}" />
          </label>

          <label>
            End Date
            <input id="ledger-end-date" type="date" value="${filters.endDate}" />
          </label>

          <label class="form-full">
            Search
            <input
              id="ledger-search"
              type="text"
              placeholder="Search batch, item, source, notes..."
              value="${filters.search}"
            />
          </label>

          <div class="ledger-quick-actions form-full">
            <button class="ghost-button" id="ledger-today-filter">Today</button>
            <button class="ghost-button" id="ledger-month-filter">This Month</button>
            <button class="ghost-button" id="clear-ledger-filters">Clear</button>
          </div>
        </div>

        <div class="ledger-workbench-list-header">
          <p class="eyebrow">Batch List</p>
          <span>${summary.filteredBatchCount} batch(es)</span>
        </div>

        ${renderLedgerBatchList()}
      </section>

      ${renderSelectedLedgerBatchDetail()}
    </section>
  `;
}

function refreshLedgerPage() {
  window.DMC_PAGES.ledger.content = getLedgerContent();
  renderPage("ledger");
}

function setupLedgerEvents() {
  const departmentFilter = document.getElementById("ledger-department-filter");
  const movementFilter = document.getElementById("ledger-movement-filter");
  const startDateInput = document.getElementById("ledger-start-date");
  const endDateInput = document.getElementById("ledger-end-date");
  const searchInput = document.getElementById("ledger-search");
  const clearButton = document.getElementById("clear-ledger-filters");
  const todayButton = document.getElementById("ledger-today-filter");
  const monthButton = document.getElementById("ledger-month-filter");

  if (departmentFilter) {
    departmentFilter.addEventListener("change", () => {
      window.DMC_LEDGER_FILTERS.department = departmentFilter.value;
      window.DMC_SELECTED_LEDGER_BATCH_KEY = "";
      refreshLedgerPage();
    });
  }

  if (movementFilter) {
    movementFilter.addEventListener("change", () => {
      window.DMC_LEDGER_FILTERS.movementType = movementFilter.value;
      window.DMC_SELECTED_LEDGER_BATCH_KEY = "";
      refreshLedgerPage();
    });
  }

  if (startDateInput) {
    startDateInput.addEventListener("change", () => {
      window.DMC_LEDGER_FILTERS.startDate = startDateInput.value;
      window.DMC_SELECTED_LEDGER_BATCH_KEY = "";
      refreshLedgerPage();
    });
  }

  if (endDateInput) {
    endDateInput.addEventListener("change", () => {
      window.DMC_LEDGER_FILTERS.endDate = endDateInput.value;
      window.DMC_SELECTED_LEDGER_BATCH_KEY = "";
      refreshLedgerPage();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("change", () => {
      window.DMC_LEDGER_FILTERS.search = searchInput.value;
      window.DMC_SELECTED_LEDGER_BATCH_KEY = "";
      refreshLedgerPage();
    });
  }

  if (todayButton) {
    todayButton.addEventListener("click", () => {
      const today = getTodayLedgerDate();

      window.DMC_LEDGER_FILTERS.startDate = today;
      window.DMC_LEDGER_FILTERS.endDate = today;
      window.DMC_SELECTED_LEDGER_BATCH_KEY = "";

      refreshLedgerPage();
    });
  }

  if (monthButton) {
    monthButton.addEventListener("click", () => {
      window.DMC_LEDGER_FILTERS.startDate = getMonthStartLedgerDate();
      window.DMC_LEDGER_FILTERS.endDate = getTodayLedgerDate();
      window.DMC_SELECTED_LEDGER_BATCH_KEY = "";

      refreshLedgerPage();
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      window.DMC_LEDGER_FILTERS = {
        department: "all",
        movementType: "all",
        search: "",
        startDate: "",
        endDate: ""
      };

      window.DMC_SELECTED_LEDGER_BATCH_KEY = "";

      refreshLedgerPage();
    });
  }

  document.querySelectorAll("[data-select-ledger-batch]").forEach((button) => {
    button.addEventListener("click", () => {
      window.DMC_SELECTED_LEDGER_BATCH_KEY = button.dataset.selectLedgerBatch;

      refreshLedgerPage();
    });
  });
}

window.DMC_PAGES["ledger"] = {
  eyebrow: "System",
  title: "Ledger",
  description:
    "Complete inventory movement history across commissary and branches.",
  getContent: getLedgerContent,
  content: getLedgerContent(),
  afterRender: setupLedgerEvents
};
