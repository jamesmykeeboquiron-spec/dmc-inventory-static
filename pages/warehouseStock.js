window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_WAREHOUSE_STOCK_MASTER_LIST_KEY = "dmc_master_list_items";
const DMC_WAREHOUSE_STOCK_LEDGER_KEY = "dmc_inventory_ledger_entries";

window.DMC_WAREHOUSE_STOCK_FILTERS = window.DMC_WAREHOUSE_STOCK_FILTERS || {
  department: "all",
  status: "all",
  search: ""
};

function getStoredWarehouseMasterListItems() {
  const storedItems = localStorage.getItem(DMC_WAREHOUSE_STOCK_MASTER_LIST_KEY);

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

function getStoredWarehouseLedgerEntries() {
  const storedEntries = localStorage.getItem(DMC_WAREHOUSE_STOCK_LEDGER_KEY);

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

function itemBelongsToWarehouseStock(item) {
  const operatingArea = String(item.operatingArea || "").toLowerCase();
  const department = String(item.department || "").toLowerCase();
  const section = String(item.section || "").toLowerCase();

  if (item.active === false) {
    return false;
  }

  return (
    operatingArea.includes("warehouse") ||
    operatingArea.includes("stockroom") ||
    department.includes("warehouse") ||
    department.includes("stockroom") ||
    section.includes("warehouse") ||
    section.includes("stockroom")
  );
}

function entryBelongsToWarehouseStock(entry) {
  const location = String(entry.location || "").toLowerCase();
  const department = String(entry.department || "").toLowerCase();
  const source = String(entry.source || "").toLowerCase();
  const destination = String(entry.destination || "").toLowerCase();

  if (
    source.includes("branch daily input") ||
    source.includes("commissary daily input closing count") ||
    source.includes("commissary daily input") ||
    location.includes("branch") ||
    location.includes("dmc-iriga") ||
    location.includes("commissary")
  ) {
    return false;
  }

  return (
    location.includes("warehouse") ||
    location.includes("stockroom") ||
    department.includes("warehouse") ||
    department.includes("stockroom") ||
    source.includes("warehouse") ||
    source.includes("supplier") ||
    source.includes("incoming from commissary") ||
    source.includes("commissary receipt") ||
    destination.includes("warehouse") ||
    destination.includes("stockroom")
  );
}

function getWarehouseLedgerEntriesOnly() {
  return getStoredWarehouseLedgerEntries().filter(entryBelongsToWarehouseStock);
}

function getWarehouseLedgerEntriesForItem(itemId) {
  return getWarehouseLedgerEntriesOnly().filter(
    (entry) => String(entry.itemId || "") === String(itemId || "")
  );
}

function getWarehouseStockItemFromLedger(itemId) {
  const entries = getWarehouseLedgerEntriesForItem(itemId);

  if (entries.length === 0) {
    return null;
  }

  const latestEntry = [...entries].sort((a, b) => {
    return String(b.submittedAt || b.receivedAt || b.date || "").localeCompare(
      String(a.submittedAt || a.receivedAt || a.date || "")
    );
  })[0];

  return {
    itemId: latestEntry.itemId || itemId,
    officialItemName: latestEntry.itemName || latestEntry.name || "-",
    department: latestEntry.department || "Warehouse",
    section: latestEntry.section || "",
    unit: latestEntry.unit || "-",
    minimumStock: 0,
    active: true,
    operatingArea: "Warehouse"
  };
}

function getWarehouseStockBaseItems() {
  const masterListItems = getStoredWarehouseMasterListItems();
  const warehouseMasterItems = masterListItems.filter(itemBelongsToWarehouseStock);
  const warehouseLedgerEntries = getWarehouseLedgerEntriesOnly();

  const combinedItemsById = {};

  warehouseMasterItems.forEach((item) => {
    const itemId = String(item.itemId || "").trim();

    if (!itemId) {
      return;
    }

    combinedItemsById[itemId] = item;
  });

  warehouseLedgerEntries.forEach((entry) => {
    const itemId = String(entry.itemId || "").trim();

    if (!itemId || combinedItemsById[itemId]) {
      return;
    }

    const matchingMasterItem = masterListItems.find(
      (item) => String(item.itemId || "") === itemId
    );

    combinedItemsById[itemId] = {
      ...(matchingMasterItem || {}),
      ...getWarehouseStockItemFromLedger(itemId),
      itemId,
      officialItemName:
        matchingMasterItem?.officialItemName ||
        matchingMasterItem?.name ||
        entry.itemName ||
        "-",
      department:
        entry.department ||
        matchingMasterItem?.department ||
        "Warehouse",
      section: entry.section || matchingMasterItem?.section || "",
      unit: entry.unit || matchingMasterItem?.unit || "-",
      minimumStock: Number(matchingMasterItem?.minimumStock || 0),
      active: true,
      operatingArea: "Warehouse"
    };
  });

  return Object.values(combinedItemsById);
}

function getWarehouseEntryTime(entry) {
  return String(entry.submittedAt || entry.receivedAt || entry.date || "");
}

function getWarehouseLatestMovementForItem(itemId) {
  const entries = getWarehouseLedgerEntriesForItem(itemId);

  if (entries.length === 0) {
    return null;
  }

  return [...entries].sort((a, b) => {
    return getWarehouseEntryTime(b).localeCompare(getWarehouseEntryTime(a));
  })[0];
}

function getLatestWarehouseStockCountForItem(itemId) {
  const countEntries = getWarehouseLedgerEntriesForItem(itemId).filter(
    (entry) =>
      entry.movementType === "Remaining Count" ||
      entry.movementType === "Stock Count" ||
      entry.stockEffect === "set"
  );

  if (countEntries.length === 0) {
    return null;
  }

  return [...countEntries].sort((a, b) => {
    return getWarehouseEntryTime(b).localeCompare(getWarehouseEntryTime(a));
  })[0];
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

function getWarehouseOpeningStock(item) {
  const openingStock =
    item.openingStock ??
    item.startingStock ??
    item.currentStock ??
    item.quantity ??
    0;

  const parsedStock = Number(openingStock);

  return Number.isNaN(parsedStock) ? 0 : parsedStock;
}

function calculateWarehouseCurrentStock(item) {
  const entries = getWarehouseLedgerEntriesForItem(item.itemId);
  const latestStockCount = getLatestWarehouseStockCountForItem(item.itemId);

  if (latestStockCount) {
    const latestStockCountTime = getWarehouseEntryTime(latestStockCount);
    const startingFromCount = Number(latestStockCount.quantity || 0);

    return entries
      .filter((entry) => {
        if (entry === latestStockCount) {
          return false;
        }

        return getWarehouseEntryTime(entry) > latestStockCountTime;
      })
      .reduce((total, entry) => {
        const quantity = Number(entry.quantity || 0);
        const stockEffect = getWarehouseEntryStockEffect(entry);

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
      }, startingFromCount);
  }

  return entries.reduce((total, entry) => {
    const quantity = Number(entry.quantity || 0);
    const stockEffect = getWarehouseEntryStockEffect(entry);

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
  }, getWarehouseOpeningStock(item));
}

function calculateWarehouseMovementTotals(item) {
  const entries = getWarehouseLedgerEntriesForItem(item.itemId);

  return entries.reduce(
    (totals, entry) => {
      const quantity = Number(entry.quantity || 0);
      const stockEffect = getWarehouseEntryStockEffect(entry);

      if (
        entry.movementType === "Transfer In" ||
        entry.movementType === "Received" ||
        entry.movementType === "Supplier Receiving" ||
        stockEffect === "add"
      ) {
        totals.transferIn += quantity;
      }

      if (entry.movementType === "Transfer Out" || stockEffect === "deduct") {
        totals.transferOut += quantity;
      }

      if (entry.movementType === "Waste") {
        totals.waste += quantity;
      }

      if (
        entry.movementType === "Remaining Count" ||
        entry.movementType === "Stock Count" ||
        stockEffect === "set"
      ) {
        totals.stockCounts += 1;
      }

      return totals;
    },
    {
      transferIn: 0,
      transferOut: 0,
      waste: 0,
      stockCounts: 0
    }
  );
}

function getCurrentWarehouseStockMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function entryIsInCurrentWarehouseStockMonth(entry) {
  const currentMonth = getCurrentWarehouseStockMonthKey();
  const entryMonth = String(entry.date || entry.submittedAt || "").slice(0, 7);

  return entryMonth === currentMonth;
}

function calculateWarehouseMonthlyMovementTotals(itemId) {
  return getWarehouseLedgerEntriesForItem(itemId)
    .filter(entryIsInCurrentWarehouseStockMonth)
    .reduce(
      (totals, entry) => {
        const quantity = Number(entry.quantity || 0);
        const stockEffect = getWarehouseEntryStockEffect(entry);

        if (
          entry.movementType === "Transfer In" ||
          entry.movementType === "Received" ||
          entry.movementType === "Supplier Receiving" ||
          stockEffect === "add"
        ) {
          totals.transferIn += quantity;
        }

        if (entry.movementType === "Transfer Out" || stockEffect === "deduct") {
          totals.transferOut += quantity;
        }

        if (entry.movementType === "Waste") {
          totals.waste += quantity;
        }

        if (
          entry.movementType === "Remaining Count" ||
          entry.movementType === "Stock Count" ||
          stockEffect === "set"
        ) {
          totals.stockCounts += 1;
        }

        return totals;
      },
      {
        transferIn: 0,
        transferOut: 0,
        waste: 0,
        stockCounts: 0
      }
    );
}

function getWarehouseStockCurrentMonthLabel() {
  return new Date().toLocaleString("en-US", {
    month: "long",
    year: "numeric"
  });
}

function getWarehouseTransferInAfterLastCount(item) {
  const entries = getWarehouseLedgerEntriesForItem(item.itemId);
  const latestStockCount = getLatestWarehouseStockCountForItem(item.itemId);

  if (!latestStockCount) {
    return 0;
  }

  const latestStockCountTime = getWarehouseEntryTime(latestStockCount);

  return entries
    .filter((entry) => {
      const isAfterLastCount =
        getWarehouseEntryTime(entry) > latestStockCountTime;
      const isTransferIn =
        entry.movementType === "Transfer In" ||
        entry.movementType === "Received" ||
        getWarehouseEntryStockEffect(entry) === "add";

      return isAfterLastCount && isTransferIn;
    })
    .reduce((total, entry) => total + Number(entry.quantity || 0), 0);
}

function normalizeWarehouseStockItem(item) {
  const currentStock = calculateWarehouseCurrentStock(item);
  const latestMovement = getWarehouseLatestMovementForItem(item.itemId);
  const movementTotals = calculateWarehouseMovementTotals(item);

  return {
    itemId: item.itemId || "-",
    officialItemName: item.officialItemName || item.name || "-",
    department: item.department || "Unassigned",
    section: item.section || "",
    unit: item.unit || "-",
    currentStock,
    minimumStock: Number(item.minimumStock || 0),
    lastMovement: latestMovement
      ? `${latestMovement.movementType} · ${latestMovement.date || "No date"}`
      : "No posted warehouse movement yet",
    note: latestMovement?.notes || item.notes || item.note || "",
    movementTotals,
    transferInAfterLastCount: getWarehouseTransferInAfterLastCount(item)
  };
}

function getWarehouseStockRows() {
  return getWarehouseStockBaseItems().map(normalizeWarehouseStockItem);
}

function getWarehouseStockStatus(item) {
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

function getWarehouseDepartments() {
  return [...new Set(getWarehouseStockRows().map((item) => item.department))]
    .filter(Boolean)
    .sort();
}

function getFilteredWarehouseStockRows() {
  const filters = window.DMC_WAREHOUSE_STOCK_FILTERS;
  const searchValue = String(filters.search || "").toLowerCase().trim();
  const selectedDepartment = String(filters.department || "all").toLowerCase();
  const selectedStatus = String(filters.status || "all").toLowerCase();

  return getWarehouseStockRows().filter((item) => {
    const itemDepartment = String(item.department || "").toLowerCase();
    const itemStatus = getWarehouseStockStatus(item).toLowerCase();

    const matchesDepartment =
      selectedDepartment === "all" || itemDepartment === selectedDepartment;

    const matchesStatus =
      selectedStatus === "all" || itemStatus === selectedStatus;

    const matchesSearch =
      !searchValue ||
      String(item.itemId || "").toLowerCase().includes(searchValue) ||
      String(item.officialItemName || "").toLowerCase().includes(searchValue) ||
      String(item.department || "").toLowerCase().includes(searchValue) ||
      String(item.unit || "").toLowerCase().includes(searchValue);

    return matchesDepartment && matchesStatus && matchesSearch;
  });
}

function getIncomingFromCommissaryTodayCountForWarehouseStock() {
  const today = new Date().toISOString().slice(0, 10);

  return getStoredWarehouseLedgerEntries().filter((entry) => {
    const entryDate = String(entry.date || "").slice(0, 10);

    return (
      entryBelongsToWarehouseStock(entry) &&
      entryDate === today &&
      (
        String(entry.source || "").toLowerCase().includes("incoming from commissary") ||
        String(entry.source || "").toLowerCase().includes("commissary receipt") ||
        String(entry.source || "").toLowerCase().includes("commissary")
      ) &&
      getWarehouseEntryStockEffect(entry) === "add"
    );
  }).length;
}

function renderWarehouseSummaryCards() {
  const rows = getWarehouseStockRows();

  const lowStockCount = rows.filter(
    (item) => getWarehouseStockStatus(item) === "Low Stock"
  ).length;

  const outOfStockCount = rows.filter(
    (item) => getWarehouseStockStatus(item) === "Out of Stock"
  ).length;

  return `
    <section class="grid">
      <div class="card">
        <p>Total Items</p>
        <strong>${rows.length}</strong>
        <span>warehouse stock items</span>
      </div>

      <div class="card">
        <p>Low Stock</p>
        <strong>${lowStockCount}</strong>
        <span>below minimum stock</span>
      </div>

      <div class="card">
        <p>Out of Stock</p>
        <strong>${outOfStockCount}</strong>
        <span>needs urgent action</span>
      </div>

      <div class="card">
        <p>Incoming Today</p>
        <strong>${getIncomingFromCommissaryTodayCountForWarehouseStock()}</strong>
        <span>posted warehouse receipts</span>
      </div>
    </section>
  `;
}

function renderWarehouseDepartmentOptions() {
  const currentDepartment = window.DMC_WAREHOUSE_STOCK_FILTERS.department;

  return `
    <option value="all" ${currentDepartment === "all" ? "selected" : ""}>
      All Departments
    </option>
    ${getWarehouseDepartments()
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

function renderWarehouseStatusOptions() {
  const currentStatus = window.DMC_WAREHOUSE_STOCK_FILTERS.status;
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

function getWarehouseStatusBadgeClass(status) {
  if (status === "Out of Stock") {
    return "danger";
  }

  if (status === "Low Stock") {
    return "warning";
  }

  return "success";
}

function renderWarehouseStockLevel(item) {
  const currentStock = Number(item.currentStock || 0);
  const status = getWarehouseStockStatus(item);
  const statusClass = getWarehouseStatusBadgeClass(status);

  return `
    <div class="stock-current-bubble-only ${statusClass}">
      <strong>${currentStock}</strong>
      <em>${item.unit || ""}</em>
    </div>
  `;
}

function renderWarehouseStockMeter(item) {
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

function renderWarehouseMovementSummary(item) {
  const totals = item.movementTotals || {
    transferIn: 0,
    transferOut: 0,
    waste: 0,
    stockCounts: 0
  };

  return `
    <small class="table-subtext">
      In: ${totals.transferIn} · Out: ${totals.transferOut} · Waste: ${totals.waste}
    </small>
  `;
}

function renderWarehouseStockRows() {
  const rows = getFilteredWarehouseStockRows();

  if (rows.length === 0) {
    return `
      <tr>
        <td colspan="8">No warehouse stock items match the current filters.</td>
      </tr>
    `;
  }

  return rows
    .map((item) => {
      const status = getWarehouseStockStatus(item);

      return `
        <tr>
          <td>${item.itemId || "-"}</td>
          <td>
            <strong>${item.officialItemName || "-"}</strong>
            ${renderWarehouseMovementSummary(item)}
          </td>
          <td>${item.unit || "-"}</td>
          <td>${renderWarehouseStockLevel(item)}</td>
          <td>${renderWarehouseStockMeter(item)}</td>
          <td>
            <span class="badge ${getWarehouseStatusBadgeClass(status)}">
              ${status}
            </span>
          </td>
          <td>${item.lastMovement || "No posted warehouse movement yet"}</td>
          <td>
            <div class="row-actions">
              <button class="tiny-button" data-view-warehouse-stock="${item.itemId}">
                View
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderWarehouseStockPanel() {
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Warehouse Stock List</h3>
          <p>
            Current Stock is the available Warehouse stock now and the receiving reference for incoming supplier, commissary, and transfer activity.
          </p>
        </div>

        <span class="badge">Current Stock</span>
      </div>

      <div class="warehouse-stock-filter-shell">
        <div class="warehouse-stock-filter-grid">
          <label>
            Search
            <input
              id="warehouse-stock-search"
              type="text"
              placeholder="Search item name, Item ID, or department..."
              value="${window.DMC_WAREHOUSE_STOCK_FILTERS.search}"
            />
          </label>

          <label>
            Department
            <select id="warehouse-stock-department-filter">
              ${renderWarehouseDepartmentOptions()}
            </select>
          </label>

          <label>
            Status
            <select id="warehouse-stock-status-filter">
              ${renderWarehouseStatusOptions()}
            </select>
          </label>

          <button class="ghost-button" id="clear-warehouse-stock-filters">
            Clear
          </button>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item ID</th>
              <th>Item</th>
              <th>Unit</th>
              <th>Current Stock</th>
              <th>Stock Level</th>
              <th>Status</th>
              <th>Last Movement</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${renderWarehouseStockRows()}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function getWarehouseStockContent() {
  return `
    ${renderWarehouseSummaryCards()}
    ${renderWarehouseStockPanel()}
  `;
}

function refreshWarehouseStockPage() {
  window.DMC_PAGES["warehouse-stock"].content = getWarehouseStockContent();
  renderPage("warehouse-stock");
}

function setupWarehouseStockEvents() {
  const searchInput = document.getElementById("warehouse-stock-search");
  const departmentFilter = document.getElementById(
    "warehouse-stock-department-filter"
  );
  const statusFilter = document.getElementById("warehouse-stock-status-filter");
  const clearButton = document.getElementById("clear-warehouse-stock-filters");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      window.DMC_WAREHOUSE_STOCK_FILTERS.search = searchInput.value;
      refreshWarehouseStockPage();
    });
  }

  if (departmentFilter) {
    departmentFilter.addEventListener("change", () => {
      window.DMC_WAREHOUSE_STOCK_FILTERS.department = departmentFilter.value;
      refreshWarehouseStockPage();
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", () => {
      window.DMC_WAREHOUSE_STOCK_FILTERS.status = statusFilter.value;
      refreshWarehouseStockPage();
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      window.DMC_WAREHOUSE_STOCK_FILTERS = {
        department: "all",
        status: "all",
        search: ""
      };

      refreshWarehouseStockPage();
    });
  }

  document.querySelectorAll("[data-view-warehouse-stock]").forEach((button) => {
    button.addEventListener("click", () => {
      const itemId = button.dataset.viewWarehouseStock;
      const item = getWarehouseStockRows().find(
        (row) => String(row.itemId) === String(itemId)
      );

      if (!item) {
        return;
      }

      const status = getWarehouseStockStatus(item);
      const monthlyTotals = calculateWarehouseMonthlyMovementTotals(item.itemId);
      const monthLabel = getWarehouseStockCurrentMonthLabel();

      if (typeof window.DMC_SHOW_MODAL === "function") {
        window.DMC_SHOW_MODAL({
          type: "info",
          title: `${item.officialItemName}`,
          message: [
            `Current Stock: ${item.currentStock} ${item.unit}`,
            `Minimum Stock: ${item.minimumStock} ${item.unit}`,
            `Status: ${status}`,
            "",
            `Monthly Summary: ${monthLabel}`,
            `Transfer In / Received: ${monthlyTotals.transferIn} ${item.unit}`,
            `Transfer Out: ${monthlyTotals.transferOut} ${item.unit}`,
            `Waste Reported: ${monthlyTotals.waste} ${item.unit}`,
            `Stock Counts Submitted: ${monthlyTotals.stockCounts}`,
            "",
            `Last Movement: ${item.lastMovement}`
          ].join("\n"),
          confirmLabel: "Got it"
        });
      }
    });
  });
}

window.DMC_PAGES["warehouse-stock"] = {
  eyebrow: "Warehouse",
  title: "Warehouse Stock",
  description:
    "Current Warehouse stock and receiving reference for supplier, commissary, and transfer activity.",
  getContent: getWarehouseStockContent,
  content: getWarehouseStockContent(),
  afterRender: setupWarehouseStockEvents
};
