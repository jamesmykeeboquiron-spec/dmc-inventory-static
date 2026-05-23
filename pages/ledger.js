window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_LEDGER_STORAGE_KEY = "dmc_inventory_ledger_entries";

window.DMC_LEDGER_FILTERS = window.DMC_LEDGER_FILTERS || {
  department: "all",
  movementType: "all",
  search: "",
  startDate: "",
  endDate: "",
  viewBy: "batch"
};

window.DMC_OPEN_LEDGER_BATCHES = window.DMC_OPEN_LEDGER_BATCHES || {};
window.DMC_OPEN_LEDGER_DATES = window.DMC_OPEN_LEDGER_DATES || {};

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

function groupLedgerEntriesByDate(entries) {
  const dates = {};

  entries.forEach((entry) => {
    const dateKey = entry.date || "No Date";

    if (!dates[dateKey]) {
      dates[dateKey] = {
        dateKey,
        entries: []
      };
    }

    dates[dateKey].entries.push(entry);
  });

  return Object.values(dates).sort((a, b) => {
    return new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime();
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

function renderLedgerBatchRows(entries) {
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

function renderLedgerBatchCard(batch, index) {
  const isOpen =
    window.DMC_OPEN_LEDGER_BATCHES[batch.batchKey] ?? index === 0;

  return `
    <section class="ledger-batch-card">
      <button class="ledger-batch-header" data-ledger-batch="${batch.batchKey}">
        <div>
          <p class="eyebrow">Batch</p>
          <h3>${getLedgerBatchLabel(batch)}</h3>
          <p>
            ${batch.submittedAtDisplay} • ${batch.department} • ${batch.source}
          </p>
        </div>

        <div class="ledger-batch-meta">
          <span class="badge">${batch.entries.length} entries</span>
          <span class="badge">${isOpen ? "Collapse" : "Open"}</span>
        </div>
      </button>

      <div class="ledger-batch-totals">
        ${renderBatchTotals(batch.entries)}
      </div>

      ${
        isOpen
          ? `
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
                  ${renderLedgerBatchRows(batch.entries)}
                </tbody>
              </table>
            </div>
          `
          : ""
      }
    </section>
  `;
}

function renderLedgerBatchView() {
  const entries = getFilteredLedgerEntries();

  if (entries.length === 0) {
    return `
      <section class="panel">
        <p>No ledger entries match the current filters.</p>
      </section>
    `;
  }

  const batches = groupLedgerEntriesByBatch(entries);

  return batches.map((batch, index) => renderLedgerBatchCard(batch, index)).join("");
}

function renderLedgerDateView() {
  const entries = getFilteredLedgerEntries();

  if (entries.length === 0) {
    return `
      <section class="panel">
        <p>No ledger entries match the current filters.</p>
      </section>
    `;
  }

  const dateGroups = groupLedgerEntriesByDate(entries);

  return dateGroups
    .map((dateGroup, index) => {
      const isOpen =
        window.DMC_OPEN_LEDGER_DATES[dateGroup.dateKey] ?? index === 0;

      const batches = groupLedgerEntriesByBatch(dateGroup.entries);

      return `
        <section class="ledger-batch-card">
          <button class="ledger-batch-header" data-ledger-date="${dateGroup.dateKey}">
            <div>
              <p class="eyebrow">Date View</p>
              <h3>${dateGroup.dateKey}</h3>
              <p>${dateGroup.entries.length} ledger entries • ${batches.length} batches</p>
            </div>

            <div class="ledger-batch-meta">
              <span class="badge">${isOpen ? "Collapse" : "Open"}</span>
            </div>
          </button>

          <div class="ledger-batch-totals">
            ${renderBatchTotals(dateGroup.entries)}
          </div>

          ${
            isOpen
              ? batches
                  .map((batch, batchIndex) => renderLedgerBatchCard(batch, batchIndex))
                  .join("")
              : ""
          }
        </section>
      `;
    })
    .join("");
}

function renderLedgerView() {
  if (window.DMC_LEDGER_FILTERS.viewBy === "date") {
    return renderLedgerDateView();
  }

  return renderLedgerBatchView();
}

function getLedgerSummary() {
  const entries = getStoredLedgerEntries();
  const filteredEntries = getFilteredLedgerEntries();

  const usageCount = entries.filter(
    (entry) => entry.movementType === "Usage"
  ).length;

  const batchCount = groupLedgerEntriesByBatch(entries).length;

  return {
    totalEntries: entries.length,
    showingEntries: filteredEntries.length,
    batchCount,
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
        <p>Total Entries</p>
        <strong>${summary.totalEntries}</strong>
      </div>

      <div class="card">
        <p>Batches</p>
        <strong>${summary.batchCount}</strong>
      </div>

      <div class="card">
        <p>Usage Entries</p>
        <strong>${summary.usageCount}</strong>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Stock Movement Ledger</h3>
          <p>
            Ledger entries can be viewed by submitted batch or by transaction date.
            Latest activity appears first.
          </p>
        </div>

        <div class="form-actions">
          <button class="ghost-button" id="expand-ledger-groups">Expand All</button>
          <button class="ghost-button" id="collapse-ledger-groups">Collapse All</button>
        </div>
      </div>

      <div class="filter-bar ledger-filter-bar">
        <label>
          View By
          <select id="ledger-view-filter">
            <option value="batch" ${filters.viewBy === "batch" ? "selected" : ""}>Batch View</option>
            <option value="date" ${filters.viewBy === "date" ? "selected" : ""}>Date View</option>
          </select>
        </label>

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

        <label class="filter-search">
          Search
          <input
            id="ledger-search"
            type="text"
            placeholder="Search date, batch, item, ID, source, notes..."
            value="${filters.search}"
          />
        </label>

        <div class="ledger-quick-actions">
          <button class="ghost-button" id="ledger-today-filter">Today</button>
          <button class="ghost-button" id="ledger-month-filter">This Month</button>
          <button class="ghost-button" id="clear-ledger-filters">Clear</button>
        </div>
      </div>
    </section>

    ${renderLedgerView()}
  `;
}

function refreshLedgerPage() {
  window.DMC_PAGES.ledger.content = getLedgerContent();
  renderPage("ledger");
}

function setAllBatchOpenState(isOpen) {
  const batches = groupLedgerEntriesByBatch(getFilteredLedgerEntries());

  batches.forEach((batch) => {
    window.DMC_OPEN_LEDGER_BATCHES[batch.batchKey] = isOpen;
  });

  const dateGroups = groupLedgerEntriesByDate(getFilteredLedgerEntries());

  dateGroups.forEach((dateGroup) => {
    window.DMC_OPEN_LEDGER_DATES[dateGroup.dateKey] = isOpen;
  });
}

function setupLedgerEvents() {
  const viewFilter = document.getElementById("ledger-view-filter");
  const departmentFilter = document.getElementById("ledger-department-filter");
  const movementFilter = document.getElementById("ledger-movement-filter");
  const startDateInput = document.getElementById("ledger-start-date");
  const endDateInput = document.getElementById("ledger-end-date");
  const searchInput = document.getElementById("ledger-search");
  const clearButton = document.getElementById("clear-ledger-filters");
  const todayButton = document.getElementById("ledger-today-filter");
  const monthButton = document.getElementById("ledger-month-filter");
  const expandButton = document.getElementById("expand-ledger-groups");
  const collapseButton = document.getElementById("collapse-ledger-groups");

  if (viewFilter) {
    viewFilter.addEventListener("change", () => {
      window.DMC_LEDGER_FILTERS.viewBy = viewFilter.value;
      refreshLedgerPage();
    });
  }

  if (departmentFilter) {
    departmentFilter.addEventListener("change", () => {
      window.DMC_LEDGER_FILTERS.department = departmentFilter.value;
      refreshLedgerPage();
    });
  }

  if (movementFilter) {
    movementFilter.addEventListener("change", () => {
      window.DMC_LEDGER_FILTERS.movementType = movementFilter.value;
      refreshLedgerPage();
    });
  }

  if (startDateInput) {
    startDateInput.addEventListener("change", () => {
      window.DMC_LEDGER_FILTERS.startDate = startDateInput.value;
      refreshLedgerPage();
    });
  }

  if (endDateInput) {
    endDateInput.addEventListener("change", () => {
      window.DMC_LEDGER_FILTERS.endDate = endDateInput.value;
      refreshLedgerPage();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      window.DMC_LEDGER_FILTERS.search = searchInput.value;
      refreshLedgerPage();
    });
  }

  if (todayButton) {
    todayButton.addEventListener("click", () => {
      const today = getTodayLedgerDate();
      window.DMC_LEDGER_FILTERS.startDate = today;
      window.DMC_LEDGER_FILTERS.endDate = today;
      refreshLedgerPage();
    });
  }

  if (monthButton) {
    monthButton.addEventListener("click", () => {
      window.DMC_LEDGER_FILTERS.startDate = getMonthStartLedgerDate();
      window.DMC_LEDGER_FILTERS.endDate = getTodayLedgerDate();
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
        endDate: "",
        viewBy: "batch"
      };

      refreshLedgerPage();
    });
  }

  if (expandButton) {
    expandButton.addEventListener("click", () => {
      setAllBatchOpenState(true);
      refreshLedgerPage();
    });
  }

  if (collapseButton) {
    collapseButton.addEventListener("click", () => {
      setAllBatchOpenState(false);
      refreshLedgerPage();
    });
  }

  document.querySelectorAll("[data-ledger-batch]").forEach((button) => {
    button.addEventListener("click", () => {
      const batchKey = button.dataset.ledgerBatch;
      const currentState = window.DMC_OPEN_LEDGER_BATCHES[batchKey];

      window.DMC_OPEN_LEDGER_BATCHES[batchKey] = !(currentState ?? true);

      refreshLedgerPage();
    });
  });

  document.querySelectorAll("[data-ledger-date]").forEach((button) => {
    button.addEventListener("click", () => {
      const dateKey = button.dataset.ledgerDate;
      const currentState = window.DMC_OPEN_LEDGER_DATES[dateKey];

      window.DMC_OPEN_LEDGER_DATES[dateKey] = !(currentState ?? true);

      refreshLedgerPage();
    });
  });
}

window.DMC_PAGES.ledger = {
  eyebrow: "System",
  title: "Ledger",
  description:
    "Permanent inventory movement history grouped by batch or date.",
  content: getLedgerContent(),
  afterRender: setupLedgerEvents
};
