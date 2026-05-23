window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_LEDGER_STORAGE_KEY = "dmc_inventory_ledger_entries";

window.DMC_LEDGER_FILTERS = window.DMC_LEDGER_FILTERS || {
  department: "all",
  movementType: "all",
  search: ""
};

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

function saveLedgerEntries(entries) {
  localStorage.setItem(DMC_LEDGER_STORAGE_KEY, JSON.stringify(entries));
}

function getFilteredLedgerEntries() {
  const filters = window.DMC_LEDGER_FILTERS;
  const searchValue = String(filters.search || "").toLowerCase().trim();

  return getStoredLedgerEntries().filter((entry) => {
    const matchesDepartment =
      filters.department === "all" || entry.department === filters.department;

    const matchesMovementType =
      filters.movementType === "all" ||
      entry.movementType === filters.movementType;

    const matchesSearch =
      !searchValue ||
      String(entry.date || "").toLowerCase().includes(searchValue) ||
      String(entry.department || "").toLowerCase().includes(searchValue) ||
      String(entry.section || "").toLowerCase().includes(searchValue) ||
      String(entry.itemId || "").toLowerCase().includes(searchValue) ||
      String(entry.itemName || "").toLowerCase().includes(searchValue) ||
      String(entry.movementType || "").toLowerCase().includes(searchValue) ||
      String(entry.source || "").toLowerCase().includes(searchValue) ||
      String(entry.notes || "").toLowerCase().includes(searchValue);

    return matchesDepartment && matchesMovementType && matchesSearch;
  });
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

function renderLedgerRows() {
  const entries = getFilteredLedgerEntries();

  if (entries.length === 0) {
    return `
      <tr>
        <td colspan="12">No ledger entries match the current filters.</td>
      </tr>
    `;
  }

  return entries
    .map(
      (entry) => `
        <tr>
          <td>${entry.date || "-"}</td>
          <td>${entry.submittedAtDisplay || "Legacy / Sample"}</td>
          <td>${entry.batchId || "No Batch"}</td>
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

function getLedgerSummary() {
  const entries = getStoredLedgerEntries();

  const receivedCount = entries.filter(
    (entry) => entry.movementType === "Received"
  ).length;

  const usageCount = entries.filter(
    (entry) => entry.movementType === "Usage"
  ).length;

  const wasteCount = entries.filter(
    (entry) => entry.movementType === "Waste"
  ).length;

  return {
    totalEntries: entries.length,
    receivedCount,
    usageCount,
    wasteCount
  };
}

function getLedgerContent() {
  const summary = getLedgerSummary();
  const filteredEntries = getFilteredLedgerEntries();

  const departmentOptions = getUniqueLedgerValues("department");
  const movementTypeOptions = getUniqueLedgerValues("movementType");

  return `
    <section class="grid">
      <div class="card">
        <p>Showing Entries</p>
        <strong>${filteredEntries.length}</strong>
      </div>

      <div class="card">
        <p>Total Entries</p>
        <strong>${summary.totalEntries}</strong>
      </div>

      <div class="card">
        <p>Received Entries</p>
        <strong>${summary.receivedCount}</strong>
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
            This is the permanent movement history. Daily Input will submit
            posted transactions here, and Reports will use this history later.
          </p>
        </div>

        <button class="ghost-button">Ledger History</button>
      </div>

      <div class="filter-bar">
        <label>
          Department
          <select id="ledger-department-filter">
            ${renderLedgerFilterOptions(
              departmentOptions,
              window.DMC_LEDGER_FILTERS.department,
              "All Departments"
            )}
          </select>
        </label>

        <label>
          Movement Type
          <select id="ledger-movement-filter">
            ${renderLedgerFilterOptions(
              movementTypeOptions,
              window.DMC_LEDGER_FILTERS.movementType,
              "All Movement Types"
            )}
          </select>
        </label>

        <label class="filter-search">
          Search
          <input
            id="ledger-search"
            type="text"
            placeholder="Search date, item, ID, source, notes..."
            value="${window.DMC_LEDGER_FILTERS.search}"
          />
        </label>

        <button class="ghost-button" id="clear-ledger-filters">
          Clear Filters
        </button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <tr>
  <th>Date</th>
  <th>Submitted At</th>
  <th>Batch ID</th>
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
            ${renderLedgerRows()}
          </tbody>
        </table>
      </div>
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
  const searchInput = document.getElementById("ledger-search");
  const clearButton = document.getElementById("clear-ledger-filters");

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

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      window.DMC_LEDGER_FILTERS.search = searchInput.value;
      refreshLedgerPage();
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      window.DMC_LEDGER_FILTERS = {
        department: "all",
        movementType: "all",
        search: ""
      };

      refreshLedgerPage();
    });
  }
}

window.DMC_PAGES.ledger = {
  eyebrow: "System",
  title: "Ledger",
  description:
    "Permanent inventory movement history for submitted transactions.",
  content: getLedgerContent(),
  afterRender: setupLedgerEvents
};
