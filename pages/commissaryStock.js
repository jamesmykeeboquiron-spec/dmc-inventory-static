window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_COMMISSARY_STOCK_STORAGE_KEY = "dmc_commissary_stock_items";
const DMC_COMMISSARY_MASTER_LIST_KEY = "dmc_master_list_items";
const DMC_COMMISSARY_LEDGER_STORAGE_KEY = "dmc_inventory_ledger_entries";

window.DMC_COMMISSARY_STOCK_FILTERS = window.DMC_COMMISSARY_STOCK_FILTERS || {
  section: "all",
  status: "all",
  search: ""
};

function getDefaultCommissaryStockItems() {
  return window.DMC_DATA?.commissaryStock || [];
}

function getStoredCommissaryStockItems() {
  const storedItems = localStorage.getItem(DMC_COMMISSARY_STOCK_STORAGE_KEY);

  if (!storedItems) {
    return getDefaultCommissaryStockItems();
  }

  try {
    const parsedItems = JSON.parse(storedItems);

    if (!Array.isArray(parsedItems)) {
      return getDefaultCommissaryStockItems();
    }

    return parsedItems;
  } catch {
    return getDefaultCommissaryStockItems();
  }
}

function getStoredCommissaryMasterListItems() {
  const storedItems = localStorage.getItem(DMC_COMMISSARY_MASTER_LIST_KEY);

  if (!storedItems) {
    return [];
  }

  try {
    const parsedItems = JSON.parse(storedItems);

    if (!Array.isArray(parsedItems)) {
      return [];
    }

    return parsedItems;
  } catch {
    return [];
  }
}

function getStoredCommissaryLedgerEntries() {
  const storedEntries = localStorage.getItem(DMC_COMMISSARY_LEDGER_STORAGE_KEY);

  if (!storedEntries) {
    return window.DMC_DATA?.ledger || [];
  }

  try {
    const parsedEntries = JSON.parse(storedEntries);

    if (!Array.isArray(parsedEntries)) {
      return [];
    }

    return parsedEntries;
  } catch {
    return window.DMC_DATA?.ledger || [];
  }
}

function itemBelongsToCommissaryStock(item) {
  const operatingArea = String(item.operatingArea || "").toLowerCase();
  const department = String(item.department || "").toLowerCase();
  const section = String(item.section || "").toLowerCase();

  if (item.active === false) {
    return false;
  }

  return (
    operatingArea.includes("commissary") ||
    department.includes("commissary") ||
    section.includes("commissary")
  );
}

function entryBelongsToCommissaryStock(entry) {
  const location = String(entry.location || "").toLowerCase();
  const department = String(entry.department || "").toLowerCase();
  const source = String(entry.source || "").toLowerCase();
  const destination = String(entry.destination || "").toLowerCase();

  return (
    location.includes("commissary") ||
    department.includes("commissary") ||
    source.includes("commissary") ||
    destination.includes("commissary")
  );
}

function getCommissaryLedgerEntriesOnly() {
  return getStoredCommissaryLedgerEntries().filter(entryBelongsToCommissaryStock);
}

function getCommissaryLedgerEntriesForItem(itemId) {
  return getCommissaryLedgerEntriesOnly().filter(
    (entry) => String(entry.itemId || "") === String(itemId || "")
  );
}

function getCommissaryEntryTime(entry) {
  return String(entry.submittedAt || entry.date || "");
}

function getCommissaryEntryStockEffect(entry) {
  if (entry.stockEffect) {
    return entry.stockEffect;
  }

  if (entry.movementType === "Transfer In" || entry.movementType === "Received") {
    return "add";
  }

  if (entry.movementType === "Transfer Out") {
    return "deduct";
  }

  if (entry.movementType === "Remaining Count") {
    return "set";
  }

  return "report";
}

function getLatestCommissaryRemainingCount(itemId) {
  const remainingEntries = getCommissaryLedgerEntriesForItem(itemId).filter(
    (entry) =>
      entry.movementType === "Remaining Count" || entry.stockEffect === "set"
  );

  if (remainingEntries.length === 0) {
    return null;
  }

  return [...remainingEntries].sort((a, b) => {
    return getCommissaryEntryTime(b).localeCompare(getCommissaryEntryTime(a));
  })[0];
}

function getCommissaryOpeningStock(item) {
  const openingStock =
    item.currentStock ??
    item.startingStock ??
    item.openingStock ??
    item.quantity ??
    0;

  const parsedStock = Number(openingStock);

  return Number.isNaN(parsedStock) ? 0 : parsedStock;
}

function calculateCommissaryCurrentStock(item) {
  const entries = getCommissaryLedgerEntriesForItem(item.itemId);
  const latestRemainingCount = getLatestCommissaryRemainingCount(item.itemId);

  if (latestRemainingCount) {
    const latestRemainingTime = getCommissaryEntryTime(latestRemainingCount);
    const startingFromRemaining = Number(latestRemainingCount.quantity || 0);

    return entries
      .filter((entry) => {
        if (entry === latestRemainingCount) {
          return false;
        }

        return getCommissaryEntryTime(entry) > latestRemainingTime;
      })
      .reduce((total, entry) => {
        const quantity = Number(entry.quantity || 0);
        const stockEffect = getCommissaryEntryStockEffect(entry);

        if (stockEffect === "add") {
          return total + quantity;
        }

        if (stockEffect === "deduct") {
          return total - quantity;
        }

        if (stockEffect === "set") {
          return quantity;
        }

        return total;
      }, startingFromRemaining);
  }

  return entries.reduce((total, entry) => {
    const quantity = Number(entry.quantity || 0);
    const stockEffect = getCommissaryEntryStockEffect(entry);

    if (stockEffect === "add") {
      return total + quantity;
    }

    if (stockEffect === "deduct") {
      return total - quantity;
    }

    if (stockEffect === "set") {
      return quantity;
    }

    return total;
  }, getCommissaryOpeningStock(item));
}

function calculateCommissaryMovementTotals(itemId) {
  return getCommissaryLedgerEntriesForItem(itemId).reduce(
    (totals, entry) => {
      const quantity = Number(entry.quantity || 0);

      if (entry.movementType === "Transfer In" || entry.stockEffect === "add") {
        totals.transferIn += quantity;
      }

      if (entry.movementType === "Transfer Out" || entry.stockEffect === "deduct") {
        totals.transferOut += quantity;
      }

      if (entry.movementType === "Usage") {
        totals.usage += quantity;
      }

      if (entry.movementType === "Waste") {
        totals.waste += quantity;
      }

      if (entry.movementType === "Remaining Count" || entry.stockEffect === "set") {
        totals.remainingCount = quantity;
        totals.remainingCounts += 1;
      }

      return totals;
    },
    {
      transferIn: 0,
      transferOut: 0,
      usage: 0,
      waste: 0,
      remainingCount: 0,
      remainingCounts: 0
    }
  );
}

function getLatestCommissaryMovement(itemId) {
  const entries = getCommissaryLedgerEntriesForItem(itemId);

  if (entries.length === 0) {
    return null;
  }

  return [...entries].sort((a, b) => {
    return getCommissaryEntryTime(b).localeCompare(getCommissaryEntryTime(a));
  })[0];
}

function getCommissaryStockItemFromLedger(itemId) {
  const entries = getCommissaryLedgerEntriesForItem(itemId);

  if (entries.length === 0) {
    return null;
  }

  const latestEntry = [...entries].sort((a, b) => {
    return getCommissaryEntryTime(b).localeCompare(getCommissaryEntryTime(a));
  })[0];

  return {
    itemId: latestEntry.itemId || itemId,
    itemName: latestEntry.itemName || "-",
    officialItemName: latestEntry.itemName || "-",
    section: latestEntry.section || "Unassigned",
    unit: latestEntry.unit || "-",
    minimumStock: 0,
    active: true,
    operatingArea: "Commissary"
  };
}

function getCommissaryStockBaseItems() {
  const storedCommissaryItems = getStoredCommissaryStockItems();
  const masterListItems = getStoredCommissaryMasterListItems();
  const commissaryMasterItems = masterListItems.filter(itemBelongsToCommissaryStock);
  const commissaryLedgerEntries = getCommissaryLedgerEntriesOnly();

  const combinedItemsById = {};

  [...storedCommissaryItems, ...commissaryMasterItems].forEach((item) => {
    const itemId = String(item.itemId || "").trim();

    if (!itemId) {
      return;
    }

    combinedItemsById[itemId] = {
      ...combinedItemsById[itemId],
      ...item
    };
  });

  commissaryLedgerEntries.forEach((entry) => {
    const itemId = String(entry.itemId || "").trim();

    if (!itemId || combinedItemsById[itemId]) {
      return;
    }

    const matchingMasterItem = masterListItems.find(
      (item) => String(item.itemId || "") === itemId
    );

    combinedItemsById[itemId] = {
      ...(matchingMasterItem || {}),
      ...getCommissaryStockItemFromLedger(itemId),
      itemId,
      itemName:
        matchingMasterItem?.officialItemName ||
        matchingMasterItem?.itemName ||
        matchingMasterItem?.name ||
        entry.itemName ||
        "-",
      officialItemName:
        matchingMasterItem?.officialItemName ||
        matchingMasterItem?.itemName ||
        matchingMasterItem?.name ||
        entry.itemName ||
        "-",
      section: entry.section || matchingMasterItem?.section || "Unassigned",
      unit: entry.unit || matchingMasterItem?.unit || "-",
      minimumStock: Number(matchingMasterItem?.minimumStock || 0),
      active: true,
      operatingArea: "Commissary"
    };
  });

  return Object.values(combinedItemsById);
}

function normalizeCommissaryStockItem(item) {
  const currentStock = calculateCommissaryCurrentStock(item);
  const movementTotals = calculateCommissaryMovementTotals(item.itemId);
  const latestMovement = getLatestCommissaryMovement(item.itemId);

  return {
    itemId: item.itemId || "-",
    itemName: item.officialItemName || item.itemName || item.name || "-",
    section: item.section || "Unassigned",
    unit: item.unit || "-",
    currentStock,
    minimumStock: Number(item.minimumStock || 0),
    expiryDate: item.expiryDate || item.bestBefore || "",
    notes: item.notes || item.note || "",
    movementTotals,
    lastMovement: latestMovement
      ? `${latestMovement.movementType} · ${latestMovement.date || "No date"}`
      : "No posted commissary movement yet"
  };
}

function getCommissaryStockRows() {
  return getCommissaryStockBaseItems().map(normalizeCommissaryStockItem);
}

function getCommissaryStockStatus(item) {
  const currentStock = Number(item.currentStock || 0);
  const minimumStock = Number(item.minimumStock || 0);

  if (currentStock <= 0) {
    return "Out of Stock";
  }

  if (minimumStock > 0 && currentStock < minimumStock) {
    return "Low Stock";
  }

  return "In Stock";
}

function getCommissaryStatusBadgeClass(status) {
  if (status === "Out of Stock") {
    return "danger";
  }

  if (status === "Low Stock") {
    return "warning";
  }

  return "success";
}

function getCommissarySections() {
  return [...new Set(getCommissaryStockRows().map((item) => item.section))]
    .filter(Boolean)
    .sort();
}

function renderCommissarySectionOptions() {
  const currentSection = window.DMC_COMMISSARY_STOCK_FILTERS.section;

  return `
    <option value="all" ${currentSection === "all" ? "selected" : ""}>
      All Sections
    </option>
    ${getCommissarySections()
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

function renderCommissaryStatusOptions() {
  const currentStatus = window.DMC_COMMISSARY_STOCK_FILTERS.status;
  const statuses = ["In Stock", "Low Stock", "Out of Stock"];

  return `
    <option value="all" ${currentStatus === "all" ? "selected" : ""}>
      All Statuses
    </option>
    ${statuses
      .map(
        (status) => `
          <option value="${status}" ${
          currentStatus === status ? "selected" : ""
        }>
            ${status}
          </option>
        `
      )
      .join("")}
  `;
}

function getFilteredCommissaryStockRows() {
  const filters = window.DMC_COMMISSARY_STOCK_FILTERS;
  const searchValue = String(filters.search || "").toLowerCase().trim();
  const selectedSection = String(filters.section || "all").toLowerCase();
  const selectedStatus = String(filters.status || "all").toLowerCase();

  return getCommissaryStockRows().filter((item) => {
    const itemSection = String(item.section || "").toLowerCase();
    const itemStatus = getCommissaryStockStatus(item).toLowerCase();

    const matchesSection =
      selectedSection === "all" || itemSection === selectedSection;

    const matchesStatus =
      selectedStatus === "all" || itemStatus === selectedStatus;

    const matchesSearch =
      !searchValue ||
      String(item.itemId || "").toLowerCase().includes(searchValue) ||
      String(item.itemName || "").toLowerCase().includes(searchValue) ||
      String(item.section || "").toLowerCase().includes(searchValue) ||
      String(item.unit || "").toLowerCase().includes(searchValue) ||
      String(item.notes || "").toLowerCase().includes(searchValue);

    return matchesSection && matchesStatus && matchesSearch;
  });
}

function getTodayCommissaryTransferInCount() {
  const today = new Date().toISOString().slice(0, 10);

  return getCommissaryLedgerEntriesOnly().filter((entry) => {
    const entryDate = String(entry.date || "").slice(0, 10);

    return entryDate === today && entry.movementType === "Transfer In";
  }).length;
}

function getTodayCommissaryTransferOutCount() {
  const today = new Date().toISOString().slice(0, 10);

  return getCommissaryLedgerEntriesOnly().filter((entry) => {
    const entryDate = String(entry.date || "").slice(0, 10);

    return entryDate === today && entry.movementType === "Transfer Out";
  }).length;
}

function renderCommissarySummaryCards() {
  const rows = getCommissaryStockRows();

  const lowStockCount = rows.filter(
    (item) => getCommissaryStockStatus(item) === "Low Stock"
  ).length;

  const outOfStockCount = rows.filter(
    (item) => getCommissaryStockStatus(item) === "Out of Stock"
  ).length;

  return `
    <section class="grid">
      <div class="card">
        <p>Total Items</p>
        <strong>${rows.length}</strong>
        <span>commissary stock items</span>
      </div>

      <div class="card">
        <p>Low Stock</p>
        <strong>${lowStockCount}</strong>
        <span>below minimum stock</span>
      </div>

      <div class="card">
        <p>Out of Stock</p>
        <strong>${outOfStockCount}</strong>
        <span>needs review</span>
      </div>

      <div class="card">
        <p>Today Movement</p>
        <strong>${getTodayCommissaryTransferInCount()} / ${getTodayCommissaryTransferOutCount()}</strong>
        <span>in / out entries</span>
      </div>
    </section>
  `;
}

function renderCommissaryStockBubble(item) {
  const currentStock = Number(item.currentStock || 0);
  const status = getCommissaryStockStatus(item);
  const statusClass = getCommissaryStatusBadgeClass(status);

  return `
    <div class="stock-current-bubble-only ${statusClass}">
      <strong>${currentStock}</strong>
      <em>${item.unit || ""}</em>
    </div>
  `;
}

function renderCommissaryStockMeter(item) {
  const currentStock = Number(item.currentStock || 0);
  const minimumStock = Number(item.minimumStock || 0);

  const percent = Math.min(
    100,
    Math.max(0, Math.round((currentStock / Math.max(minimumStock, 1)) * 100))
  );

  return `
    <div class="stock-level-only">
      <div class="stock-level-track">
        <div class="stock-level-fill" style="width: ${percent}%"></div>
      </div>

      <div class="stock-current-min">
        <span>Minimum</span>
        <strong>${minimumStock} ${item.unit || ""}</strong>
      </div>
    </div>
  `;
}

function renderCommissaryMovementSummary(item) {
  const totals = item.movementTotals || {
    transferIn: 0,
    transferOut: 0,
    usage: 0,
    waste: 0
  };

  return `
    <small class="table-subtext">
      In: ${totals.transferIn} · Out: ${totals.transferOut} · Usage: ${totals.usage} · Waste: ${totals.waste}
    </small>
  `;
}

function renderCommissaryStockRows() {
  const rows = getFilteredCommissaryStockRows();

  if (rows.length === 0) {
    return `
      <tr>
        <td colspan="8">No commissary stock items match the current filters.</td>
      </tr>
    `;
  }

  return rows
    .map((item) => {
      const status = getCommissaryStockStatus(item);

      return `
        <tr>
          <td>${item.itemId || "-"}</td>
          <td>
            <strong>${item.itemName || "-"}</strong>
            ${renderCommissaryMovementSummary(item)}
          </td>
          <td>${item.section || "-"}</td>
          <td>${item.unit || "-"}</td>
          <td>${renderCommissaryStockBubble(item)}</td>
          <td>${renderCommissaryStockMeter(item)}</td>
          <td>
            <span class="badge ${getCommissaryStatusBadgeClass(status)}">
              ${status}
            </span>
          </td>
          <td>${item.lastMovement || "No posted commissary movement yet"}</td>
        </tr>
      `;
    })
    .join("");
}

function getCommissaryStockContent() {
  return `
    ${renderCommissarySummaryCards()}

    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Commissary Stock List</h3>
          <p>
            Current Stock uses Remaining Count as truth, then applies later Transfer In and Transfer Out.
            Usage and Waste are report records and are not double-deducted.
          </p>
        </div>

        <span class="badge">Commissary Stock</span>
      </div>

      <div class="warehouse-stock-filter-shell">
        <div class="warehouse-stock-filter-grid">
          <label>
            Search
            <input
              id="commissary-search"
              type="text"
              placeholder="Search item name, Item ID, section, or unit..."
              value="${window.DMC_COMMISSARY_STOCK_FILTERS.search}"
            />
          </label>

          <label>
            Section
            <select id="commissary-section-filter">
              ${renderCommissarySectionOptions()}
            </select>
          </label>

          <label>
            Status
            <select id="commissary-status-filter">
              ${renderCommissaryStatusOptions()}
            </select>
          </label>

          <button class="ghost-button" id="clear-commissary-filters">
            Clear
          </button>
        </div>
      </div>

      <div class="instruction-box">
        <strong>Commissary Rule:</strong>
        <span>
          Warehouse Transfer In adds stock. Transfer Out to Warehouse deducts stock.
          Remaining Count becomes the latest physical stock truth. Usage and Waste are kept for reports.
        </span>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item ID</th>
              <th>Item</th>
              <th>Section</th>
              <th>Unit</th>
              <th>Current Stock</th>
              <th>Stock Level</th>
              <th>Status</th>
              <th>Last Movement</th>
            </tr>
          </thead>

          <tbody>
            ${renderCommissaryStockRows()}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function refreshCommissaryStockPage() {
  window.DMC_PAGES["commissary-stock"].content = getCommissaryStockContent();
  renderPage("commissary-stock");
}

function setupCommissaryStockEvents() {
  const searchInput = document.getElementById("commissary-search");
  const sectionFilter = document.getElementById("commissary-section-filter");
  const statusFilter = document.getElementById("commissary-status-filter");
  const clearButton = document.getElementById("clear-commissary-filters");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      window.DMC_COMMISSARY_STOCK_FILTERS.search = searchInput.value;
      refreshCommissaryStockPage();
    });
  }

  if (sectionFilter) {
    sectionFilter.addEventListener("change", () => {
      window.DMC_COMMISSARY_STOCK_FILTERS.section = sectionFilter.value;
      refreshCommissaryStockPage();
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", () => {
      window.DMC_COMMISSARY_STOCK_FILTERS.status = statusFilter.value;
      refreshCommissaryStockPage();
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      window.DMC_COMMISSARY_STOCK_FILTERS = {
        section: "all",
        status: "all",
        search: ""
      };

      refreshCommissaryStockPage();
    });
  }
}

window.DMC_PAGES["commissary-stock"] = {
  eyebrow: "Commissary",
  title: "Commissary Stock",
  description:
    "Tracks current stock inside the commissary production/storage area.",
  getContent: getCommissaryStockContent,
  content: getCommissaryStockContent(),
  afterRender: setupCommissaryStockEvents
};
