window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_LEDGER_STORAGE_KEY = "dmc_inventory_ledger_entries";

window.DMC_LEDGER_FILTERS = window.DMC_LEDGER_FILTERS || {
  department: "all",
  operationalArea: "all",
  movementType: "all",
  search: "",
  startDate: "",
  endDate: ""
};

window.DMC_SELECTED_LEDGER_BATCH_KEY =
  window.DMC_SELECTED_LEDGER_BATCH_KEY || "";

window.DMC_LEDGER_NOTE_LOOKUP = window.DMC_LEDGER_NOTE_LOOKUP || {};

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
    const parsedEntries = JSON.parse(storedEntries);

    if (!Array.isArray(parsedEntries)) {
      return getDefaultLedgerEntries();
    }

    return parsedEntries;
  } catch {
    return getDefaultLedgerEntries();
  }
}

function clearStoredLedgerEntries() {
  localStorage.setItem(DMC_LEDGER_STORAGE_KEY, JSON.stringify([]));
}

function getLedgerEntrySortValue(entry) {
  if (entry.submittedAt) {
    return new Date(entry.submittedAt).getTime();
  }

  if (entry.receivedAt) {
    return new Date(entry.receivedAt).getTime();
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

function getLedgerOperationalAreas(entry) {
  const combinedText = [
    entry.location,
    entry.department,
    entry.section,
    entry.source,
    entry.destination,
    entry.movementField
  ]
    .map((value) => String(value || "").toLowerCase())
    .join(" ");

  const areas = [];

  if (
    combinedText.includes("warehouse") ||
    combinedText.includes("stockroom") ||
    combinedText.includes("supplier")
  ) {
    areas.push("Warehouse");
  }

  if (
    combinedText.includes("commissary") ||
    combinedText.includes("production")
  ) {
    areas.push("Commissary");
  }

  if (
    combinedText.includes("branch") ||
    combinedText.includes("dmc-iriga")
  ) {
    areas.push("Branch");
  }

  if (areas.length === 0) {
    areas.push("Other");
  }

  return [...new Set(areas)];
}

function getLedgerOperationalAreaLabel(entry) {
  return getLedgerOperationalAreas(entry).join(" / ");
}

function entryMatchesLedgerOperationalArea(entry, selectedArea) {
  if (!selectedArea || selectedArea === "all") {
    return true;
  }

  return getLedgerOperationalAreas(entry).includes(selectedArea);
}

function getLedgerEntryStockEffect(entry) {
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
    entry.movementType === "Usage" ||
    entry.movementType === "Waste"
  ) {
    return "deduct";
  }

  if (
    entry.movementType === "Remaining Count" ||
    entry.movementType === "Stock Count"
  ) {
    return "set";
  }

  return "report";
}

function getFilteredLedgerEntries() {
  const filters = window.DMC_LEDGER_FILTERS;
  const searchValue = String(filters.search || "").toLowerCase().trim();

  const filtered = getStoredLedgerEntries().filter((entry) => {
    const entryDate = String(entry.date || "");

    const matchesDepartment =
      filters.department === "all" || entry.department === filters.department;

    const matchesOperationalArea = entryMatchesLedgerOperationalArea(
      entry,
      filters.operationalArea || "all"
    );

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
      String(entry.sourceBatchId || "").toLowerCase().includes(searchValue) ||
      String(entry.department || "").toLowerCase().includes(searchValue) ||
      String(entry.section || "").toLowerCase().includes(searchValue) ||
      String(entry.itemId || "").toLowerCase().includes(searchValue) ||
      String(entry.itemName || "").toLowerCase().includes(searchValue) ||
      String(entry.movementType || "").toLowerCase().includes(searchValue) ||
      String(entry.source || "").toLowerCase().includes(searchValue) ||
      String(entry.destination || "").toLowerCase().includes(searchValue) ||
      String(entry.managerReviewedBy || "").toLowerCase().includes(searchValue) ||
      String(entry.receivedBy || "").toLowerCase().includes(searchValue) ||
      String(entry.notes || "").toLowerCase().includes(searchValue);

    return (
      matchesDepartment &&
      matchesOperationalArea &&
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
  ).sort();
}

function getLedgerOperationalAreaOptions() {
  const availableAreas = new Set();

  getStoredLedgerEntries().forEach((entry) => {
    getLedgerOperationalAreas(entry).forEach((area) => {
      availableAreas.add(area);
    });
  });

  const preferredOrder = ["Warehouse", "Commissary", "Branch", "Other"];

  return preferredOrder.filter((area) => availableAreas.has(area));
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

function getLedgerBatchAreaLabel(batch) {
  const areas = new Set();

  batch.entries.forEach((entry) => {
    getLedgerOperationalAreas(entry).forEach((area) => areas.add(area));
  });

  return Array.from(areas).join(" / ") || "Other";
}

function groupLedgerEntriesByBatch(entries) {
  const batches = {};

  entries.forEach((entry) => {
    const batchKey = getLedgerBatchKey(entry);

    if (!batches[batchKey]) {
      batches[batchKey] = {
        batchKey,
        batchId: entry.batchId || "No Batch",
        submittedAt: entry.submittedAt || entry.receivedAt || "",
        submittedAtDisplay: entry.submittedAtDisplay || "Legacy / Sample",
        date: entry.date || "-",
        source: entry.source || "-",
        destination: entry.destination || "-",
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

function cleanLedgerNotes(notes) {
  let cleanedNotes = String(notes || "").trim();

  if (!cleanedNotes) {
    return "";
  }

  const defaultFragments = [
    "Auto-computed from Current + Total In - Total Out - Remaining.",
    "Waste reported only. It is not double-deducted because Remaining Count sets physical stock.",
    "Daily note.",
    "No notes",
    "N/A"
  ];

  defaultFragments.forEach((fragment) => {
    cleanedNotes = cleanedNotes.replace(fragment, "");
  });

  cleanedNotes = cleanedNotes
    .replace(/Closing count submitted by[^.]*\./gi, "")
    .replace(/Current:\s*[-\d.]+/gi, "")
    .replace(/Transfer In:\s*[-\d.]+/gi, "")
    .replace(/Total Available:\s*[-\d.]+/gi, "")
    .replace(/Transfer Out:\s*[-\d.]+/gi, "")
    .replace(/In Warehouse:\s*[-\d.]+/gi, "")
    .replace(/In Branch:\s*[-\d.]+/gi, "")
    .replace(/In Production:\s*[-\d.]+/gi, "")
    .replace(/Out Warehouse:\s*[-\d.]+/gi, "")
    .replace(/Out Branch:\s*[-\d.]+/gi, "")
    .replace(/Remaining:\s*[-\d.]+/gi, "")
    .replace(/Waste:\s*[-\d.]+/gi, "")
    .replace(/Usage Auto:\s*[-\d.]+/gi, "")
    .replace(/^Notes:\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleanedNotes === "No notes" || cleanedNotes === "N/A") {
    return "";
  }

  return cleanedNotes;
}

function createLedgerNoteKey(itemId, index) {
  return `${itemId || "item"}__${index}`;
}

function renderLedgerNotes(notes, itemId, index) {
  const noteText = cleanLedgerNotes(notes);

  if (!noteText) {
    return "-";
  }

  const noteKey = createLedgerNoteKey(itemId, index);
  window.DMC_LEDGER_NOTE_LOOKUP[noteKey] = noteText;

  if (noteText.length <= 55) {
    return noteText;
  }

  return `
    <button class="tiny-button" data-ledger-note-key="${noteKey}">
      View Notes
    </button>
  `;
}

function getLedgerGroupedItemRows(batch) {
  const groupedRows = {};

  batch.entries.forEach((entry) => {
    const itemId = entry.itemId || "NO-ID";

    groupedRows[itemId] = groupedRows[itemId] || {
      area: getLedgerOperationalAreaLabel(entry),
      department: entry.department || "-",
      section: entry.section || "-",
      itemId: entry.itemId || "-",
      itemName: entry.itemName || "-",
      unit: entry.unit || "-",
      receivedIn: 0,
      out: 0,
      remaining: "",
      usage: 0,
      waste: 0,
      notes: []
    };

    const row = groupedRows[itemId];
    const quantity = Number(entry.quantity || 0);
    const movementType = String(entry.movementType || "");
    const movementField = String(entry.movementField || "");
    const stockEffect = getLedgerEntryStockEffect(entry);

    if (
      stockEffect === "add" ||
      movementType === "Transfer In" ||
      movementType === "Received" ||
      movementType === "Supplier Receiving"
    ) {
      row.receivedIn += quantity;
    }

    if (
      movementType === "Transfer Out" ||
      movementField.toLowerCase().includes("transferout")
    ) {
      row.out += quantity;
    }

    if (
      movementType === "Remaining Count" ||
      movementType === "Stock Count" ||
      stockEffect === "set"
    ) {
      row.remaining = quantity;
    }

    if (movementType === "Usage" || movementField === "usageAuto") {
      row.usage += quantity;
    }

    if (movementType === "Waste" || movementField === "waste") {
      row.waste += quantity;
    }

    const cleanedNotes = cleanLedgerNotes(entry.notes);

    if (cleanedNotes) {
      row.notes.push(cleanedNotes);
    }
  });

  return Object.values(groupedRows).sort((a, b) => {
    return String(a.itemName).localeCompare(String(b.itemName));
  });
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
                <p>${getLedgerBatchAreaLabel(batch)} • ${batch.source}</p>
                <span>${batch.submittedAtDisplay || batch.date}</span>
              </div>

              <div class="ledger-workbench-batch-meta">
                <span class="badge">${batch.entries.length} records</span>
              </div>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderLedgerSummaryRows(batch) {
  const rows = getLedgerGroupedItemRows(batch);

  if (!rows || rows.length === 0) {
    return `
      <tr>
        <td colspan="10">No ledger entries found for this batch.</td>
      </tr>
    `;
  }

  return rows
    .map((row, index) => {
      const uniqueNotes = [...new Set(row.notes)].filter(Boolean);
      const joinedNotes = uniqueNotes.join(" | ");

      return `
        <tr>
          <td>${row.area || "-"}</td>
          <td>
            <strong>${row.itemName || "-"}</strong>
            <small class="table-subtext">${row.itemId || "-"}</small>
          </td>
          <td>${row.section || "-"}</td>
          <td class="${row.receivedIn ? "positive-text" : ""}">
            ${row.receivedIn || "-"}
          </td>
          <td class="${row.out ? "negative-text" : ""}">
            ${row.out || "-"}
          </td>
          <td>${row.remaining === "" ? "-" : row.remaining}</td>
          <td>${row.usage || "-"}</td>
          <td>${row.waste || "-"}</td>
          <td>${row.unit || "-"}</td>
          <td>${renderLedgerNotes(joinedNotes, row.itemId, index)}</td>
        </tr>
      `;
    })
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
          <p>${batch.submittedAtDisplay || batch.date} • ${getLedgerBatchAreaLabel(batch)} • ${batch.source}</p>
        </div>

        <span class="badge">${batch.entries.length} records</span>
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
          <p class="eyebrow">Operational Area</p>
          <strong>${getLedgerBatchAreaLabel(batch)}</strong>
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
              <th>Area</th>
              <th>Item</th>
              <th>Section</th>
              <th>In / Received</th>
              <th>Out</th>
              <th>Remaining</th>
              <th>Usage</th>
              <th>Waste</th>
              <th>Unit</th>
              <th>Notes</th>
            </tr>
          </thead>

          <tbody>
            ${renderLedgerSummaryRows(batch)}
          </tbody>
        </table>
      </div>

      <div class="instruction-box">
        <strong>Ledger View:</strong>
        <span>
          This panel summarizes each selected batch by item so it is easier to read.
          The full raw movement history still exists in the stored ledger records.
        </span>
      </div>
    </section>
  `;
}

function getLedgerSummary() {
  const entries = getStoredLedgerEntries();
  const filteredEntries = getFilteredLedgerEntries();

  const batchCount = groupLedgerEntriesByBatch(entries).length;
  const filteredBatchCount = groupLedgerEntriesByBatch(filteredEntries).length;

  return {
    totalEntries: entries.length,
    showingEntries: filteredEntries.length,
    batchCount,
    filteredBatchCount
  };
}

function getLedgerContent() {
  const summary = getLedgerSummary();

  const departmentOptions = getUniqueLedgerValues("department");
  const operationalAreaOptions = getLedgerOperationalAreaOptions();
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
            <p>Filter by operational area, date, movement, or search term. Select a batch to review the summary.</p>
          </div>
        </div>

        <div class="ledger-workbench-filters">
          <label>
            Operational Area
            <select id="ledger-operational-area-filter">
              ${renderLedgerFilterOptions(
                operationalAreaOptions,
                filters.operationalArea || "all",
                "All Areas"
              )}
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

          <label class="form-full">
            Search
            <input
              id="ledger-search"
              type="text"
              placeholder="Search batch, item, source, destination, notes..."
              value="${filters.search}"
            />
          </label>

          <div class="ledger-quick-actions form-full">
            <button class="ghost-button" id="ledger-today-filter">Today</button>
            <button class="ghost-button" id="ledger-month-filter">This Month</button>
            <button class="ghost-button" id="clear-ledger-filters">Clear Filters</button>
            <button class="ghost-button danger" id="clear-ledger-entries">
              Clear Ledger Entries
            </button>
          </div>
        </div>

        <div class="instruction-box">
          <strong>Clear Ledger Warning:</strong>
          <span>
            Clear Ledger Entries removes local movement history only. It does not remove Master List items.
          </span>
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

function resetLedgerFilters() {
  window.DMC_LEDGER_FILTERS = {
    department: "all",
    operationalArea: "all",
    movementType: "all",
    search: "",
    startDate: "",
    endDate: ""
  };

  window.DMC_SELECTED_LEDGER_BATCH_KEY = "";
}

function setupLedgerEvents() {
  const operationalAreaFilter = document.getElementById(
    "ledger-operational-area-filter"
  );
  const departmentFilter = document.getElementById("ledger-department-filter");
  const movementFilter = document.getElementById("ledger-movement-filter");
  const startDateInput = document.getElementById("ledger-start-date");
  const endDateInput = document.getElementById("ledger-end-date");
  const searchInput = document.getElementById("ledger-search");
  const clearButton = document.getElementById("clear-ledger-filters");
  const clearLedgerEntriesButton = document.getElementById("clear-ledger-entries");
  const todayButton = document.getElementById("ledger-today-filter");
  const monthButton = document.getElementById("ledger-month-filter");

  if (operationalAreaFilter) {
    operationalAreaFilter.addEventListener("change", () => {
      window.DMC_LEDGER_FILTERS.operationalArea = operationalAreaFilter.value;
      window.DMC_SELECTED_LEDGER_BATCH_KEY = "";
      refreshLedgerPage();
    });
  }

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
    searchInput.addEventListener("input", () => {
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
      resetLedgerFilters();
      refreshLedgerPage();
    });
  }

  if (clearLedgerEntriesButton) {
    clearLedgerEntriesButton.addEventListener("click", () => {
      const totalEntries = getStoredLedgerEntries().length;

      if (typeof window.DMC_CONFIRM_MODAL === "function") {
        window.DMC_CONFIRM_MODAL({
          type: "danger",
          title: "Clear Ledger Entries?",
          message: `This will permanently clear ${totalEntries} local ledger movement entr${
            totalEntries === 1 ? "y" : "ies"
          }. Master List items will not be removed. Continue?`,
          confirmLabel: "Clear Ledger",
          cancelLabel: "Cancel",
          onConfirm: () => {
            clearStoredLedgerEntries();
            resetLedgerFilters();
            refreshLedgerPage();

            if (typeof window.DMC_SHOW_MODAL === "function") {
              window.DMC_SHOW_MODAL({
                type: "success",
                title: "Ledger Cleared",
                message:
                  "Local ledger movement entries were cleared. Master List items were not removed.",
                confirmLabel: "Continue"
              });
            }
          }
        });
      } else if (
        confirm(
          `This will permanently clear ${totalEntries} local ledger entries. Master List items will not be removed. Continue?`
        )
      ) {
        clearStoredLedgerEntries();
        resetLedgerFilters();
        refreshLedgerPage();
      }
    });
  }

  document.querySelectorAll("[data-select-ledger-batch]").forEach((button) => {
    button.addEventListener("click", () => {
      window.DMC_SELECTED_LEDGER_BATCH_KEY = button.dataset.selectLedgerBatch;

      refreshLedgerPage();
    });
  });

  document.querySelectorAll("[data-ledger-note-key]").forEach((button) => {
    button.addEventListener("click", () => {
      const noteKey = button.dataset.ledgerNoteKey;
      const note = window.DMC_LEDGER_NOTE_LOOKUP[noteKey] || "";

      if (typeof window.DMC_SHOW_MODAL === "function") {
        window.DMC_SHOW_MODAL({
          type: "info",
          title: "Ledger Notes",
          message: note || "No notes.",
          confirmLabel: "Close"
        });
      } else {
        alert(note || "No notes.");
      }
    });
  });
}

window.DMC_PAGES["ledger"] = {
  eyebrow: "System",
  title: "Ledger",
  description:
    "Complete inventory movement history across warehouse, commissary, and branches.",
  getContent: getLedgerContent,
  content: getLedgerContent(),
  afterRender: setupLedgerEvents
};
