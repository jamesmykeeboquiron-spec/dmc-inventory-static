window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_BRANCH_STOCK_MASTER_LIST_KEY = "dmc_master_list_items";
const DMC_BRANCH_STOCK_LEDGER_KEY = "dmc_inventory_ledger_entries";
const DMC_BRANCH_OPENING_STOCK_KEY = "dmc_branch_opening_stock";

window.DMC_BRANCH_STOCK_SELECTED_DEPARTMENT =
  window.DMC_BRANCH_STOCK_SELECTED_DEPARTMENT || "Bar";

window.DMC_BRANCH_STOCK_FILTERS = window.DMC_BRANCH_STOCK_FILTERS || {
  status: "all",
  search: ""
};

function getBranchStockMasterListItems() {
  const storedItems = localStorage.getItem(DMC_BRANCH_STOCK_MASTER_LIST_KEY);

  if (storedItems) {
    try {
      return JSON.parse(storedItems);
    } catch {
      return window.DMC_DATA?.masterList?.items || [];
    }
  }

  return window.DMC_DATA?.masterList?.items || [];
}

function getBranchStockLedgerEntries() {
  const storedEntries = localStorage.getItem(DMC_BRANCH_STOCK_LEDGER_KEY);

  if (storedEntries) {
    try {
      return JSON.parse(storedEntries);
    } catch {
      return window.DMC_DATA?.ledger || [];
    }
  }

  return window.DMC_DATA?.ledger || [];
}

function getStoredStartingStock() {
  const storedStartingStock = localStorage.getItem(DMC_BRANCH_OPENING_STOCK_KEY);

  if (!storedStartingStock) {
    return {};
  }

  try {
    return JSON.parse(storedStartingStock);
  } catch {
    return {};
  }
}

function saveStartingStock(startingStock) {
  localStorage.setItem(
    DMC_BRANCH_OPENING_STOCK_KEY,
    JSON.stringify(startingStock)
  );
}

function getBranchStockDepartments() {
  const storedSettings = localStorage.getItem("dmc_inventory_settings");

  if (storedSettings) {
    try {
      const settings = JSON.parse(storedSettings);

      return (settings.departments || []).filter(
        (department) => department.name !== "Commissary"
      );
    } catch {
      return [
        { id: "bar", name: "Bar" },
        { id: "kitchen", name: "Kitchen" },
        { id: "dining", name: "Dining" }
      ];
    }
  }

  return [
    { id: "bar", name: "Bar" },
    { id: "kitchen", name: "Kitchen" },
    { id: "dining", name: "Dining" }
  ];
}

function renderBranchStockDepartmentOptions() {
  const selectedDepartment = window.DMC_BRANCH_STOCK_SELECTED_DEPARTMENT;

  return getBranchStockDepartments()
    .map(
      (department) => `
        <option value="${department.name}" ${
        selectedDepartment === department.name ? "selected" : ""
      }>
          ${department.name}
        </option>
      `
    )
    .join("");
}

function getStartingStockValue(itemId) {
  const startingStock = getStoredStartingStock();
  const selectedDepartment = window.DMC_BRANCH_STOCK_SELECTED_DEPARTMENT;
  const key = `${selectedDepartment}|${itemId}`;

  return startingStock[key] || "";
}

function getStartingStockNumber(itemId) {
  const value = getStartingStockValue(itemId);

  if (String(value).trim() === "") {
    return 0;
  }

  const parsedValue = Number(value);

  return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

function getBranchItemsForSelectedDepartment() {
  const selectedDepartment = window.DMC_BRANCH_STOCK_SELECTED_DEPARTMENT;

  return getBranchStockMasterListItems().filter((item) => {
    const matchesDepartment =
      String(item.department || "").toLowerCase() ===
      String(selectedDepartment || "").toLowerCase();

    const isActive = item.active !== false;

    return matchesDepartment && isActive;
  });
}

function getLedgerMovementTotalsForItem(itemId) {
  const selectedDepartment = window.DMC_BRANCH_STOCK_SELECTED_DEPARTMENT;
  const entries = getBranchStockLedgerEntries().filter(
    (entry) =>
      entry.itemId === itemId &&
      String(entry.department || "").toLowerCase() ===
        String(selectedDepartment || "").toLowerCase()
  );

  const totals = {
    received: 0,
    transferIn: 0,
    usage: 0,
    waste: 0,
    transferOut: 0,
    adjustment: 0
  };

  entries.forEach((entry) => {
    const quantity = Number(entry.quantity || 0);

    if (entry.movementType === "Received") {
      totals.received += quantity;
    }

    if (entry.movementType === "Transfer In") {
      totals.transferIn += quantity;
    }

    if (entry.movementType === "Usage") {
      totals.usage += quantity;
    }

    if (entry.movementType === "Waste") {
      totals.waste += quantity;
    }

    if (entry.movementType === "Transfer Out") {
      totals.transferOut += quantity;
    }

    if (entry.movementType === "Adjustment") {
      totals.adjustment += quantity;
    }
  });

  return totals;
}

function calculateCurrentStock(item) {
  const startingStock = getStartingStockNumber(item.itemId);
  const totals = getLedgerMovementTotalsForItem(item.itemId);

  return (
    startingStock +
    totals.received +
    totals.transferIn -
    totals.usage -
    totals.waste -
    totals.transferOut +
    totals.adjustment
  );
}

function getBranchStockStatus(item) {
  const currentStock = calculateCurrentStock(item);
  const minimumStock = Number(item.minimumStock || 0);

  if (currentStock <= 0) {
    return "Critical";
  }

  if (minimumStock > 0 && currentStock < minimumStock) {
    return "Low Stock";
  }

  if (minimumStock > 0 && currentStock >= minimumStock * 2) {
    return "Overstock";
  }

  return "Good";
}

function getBranchStockStatusBadgeClass(status) {
  if (status === "Critical") return "danger-badge";
  if (status === "Low Stock") return "warning-badge";
  if (status === "Overstock") return "info-badge";
  return "";
}

function getFilteredBranchStockItems() {
  const filters = window.DMC_BRANCH_STOCK_FILTERS;
  const searchValue = String(filters.search || "").toLowerCase().trim();

  return getBranchItemsForSelectedDepartment().filter((item) => {
    const status = getBranchStockStatus(item);

    const matchesStatus =
      filters.status === "all" || status === filters.status;

    const matchesSearch =
      !searchValue ||
      String(item.itemId || "").toLowerCase().includes(searchValue) ||
      String(item.officialItemName || "").toLowerCase().includes(searchValue) ||
      String(item.section || "").toLowerCase().includes(searchValue) ||
      String(item.unit || "").toLowerCase().includes(searchValue) ||
      String(item.notes || "").toLowerCase().includes(searchValue);

    return matchesStatus && matchesSearch;
  });
}

function renderBranchStockStatusOptions() {
  const statuses = ["Good", "Low Stock", "Critical", "Overstock"];
  const currentStatus = window.DMC_BRANCH_STOCK_FILTERS.status;

  return `
    <option value="all" ${currentStatus === "all" ? "selected" : ""}>
      All Statuses
    </option>
    ${statuses
      .map(
        (status) => `
          <option value="${status}" ${currentStatus === status ? "selected" : ""}>
            ${status}
          </option>
        `
      )
      .join("")}
  `;
}

function renderBranchStockRows() {
  const items = getFilteredBranchStockItems();

  if (items.length === 0) {
    return `
      <tr>
        <td colspan="9">
          No branch stock items match the current filters.
        </td>
      </tr>
    `;
  }

  return items
    .map((item) => {
      const currentStock = calculateCurrentStock(item);
      const status = getBranchStockStatus(item);
      const movementTotals = getLedgerMovementTotalsForItem(item.itemId);

      return `
        <tr>
          <td>${item.section || "-"}</td>
          <td>${item.itemId || "-"}</td>
          <td>${item.officialItemName || "-"}</td>
          <td>
            <input
              class="opening-stock-input"
              data-starting-stock-item="${item.itemId}"
              type="number"
              step="any"
              value="${getStartingStockValue(item.itemId)}"
              placeholder="0"
            />
          </td>
          <td>${currentStock}</td>
          <td>${item.minimumStock || "-"}</td>
          <td>${item.unit || "-"}</td>
          <td>
            <span class="badge ${getBranchStockStatusBadgeClass(status)}">
              ${status}
            </span>
          </td>
          <td>
            <span class="ledger-batch-pill">Received: ${movementTotals.received}</span>
            <span class="ledger-batch-pill">Usage: ${movementTotals.usage}</span>
            <span class="ledger-batch-pill">Waste: ${movementTotals.waste}</span>
          </td>
        </tr>
      `;
    })
    .join("");
}

function getBranchStockSummary() {
  const items = getBranchItemsForSelectedDepartment();

  return {
    totalItems: items.length,
    lowStock: items.filter((item) => getBranchStockStatus(item) === "Low Stock")
      .length,
    critical: items.filter((item) => getBranchStockStatus(item) === "Critical")
      .length,
    overstock: items.filter((item) => getBranchStockStatus(item) === "Overstock")
      .length
  };
}

function getBranchStockContent() {
  const selectedDepartment = window.DMC_BRANCH_STOCK_SELECTED_DEPARTMENT;
  const summary = getBranchStockSummary();
  const filteredItems = getFilteredBranchStockItems();

  return `
    <section class="grid">
      <div class="card">
        <p>Showing Items</p>
        <strong>${filteredItems.length}</strong>
      </div>

      <div class="card">
        <p>Low Stock</p>
        <strong>${summary.lowStock}</strong>
      </div>

      <div class="card">
        <p>Critical</p>
        <strong>${summary.critical}</strong>
      </div>

      <div class="card">
        <p>Overstock</p>
        <strong>${summary.overstock}</strong>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>${selectedDepartment} Branch Stock</h3>
          <p>
            Set starting stock once, then current stock is calculated from posted Ledger movements.
          </p>
        </div>

        <button class="ghost-button">Starting Stock Auto-Saves</button>
      </div>

      <div class="filter-bar">
        <label>
          Department
          <select id="branch-stock-department-select">
            ${renderBranchStockDepartmentOptions()}
          </select>
        </label>

        <label>
          Status
          <select id="branch-stock-status-filter">
            ${renderBranchStockStatusOptions()}
          </select>
        </label>

        <label class="filter-search">
          Search
          <input
            id="branch-stock-search"
            type="text"
            placeholder="Search item name, ID, section, unit..."
            value="${window.DMC_BRANCH_STOCK_FILTERS.search}"
          />
        </label>

        <button class="ghost-button" id="clear-branch-stock-filters">
          Clear Filters
        </button>
      </div>

      <div class="instruction-box">
        <strong>Stock Formula:</strong>
        <span>
          Current Stock = Starting Stock + Received + Transfer In - Usage - Waste - Transfer Out + Adjustment.
          Starting Stock is only used as the setup baseline. Daily changes should be entered through Log Transaction.
        </span>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Section</th>
              <th>Item ID</th>
              <th>Item Name</th>
              <th>Starting Stock</th>
              <th>Current Stock</th>
              <th>Minimum Stock</th>
              <th>Unit</th>
              <th>Status</th>
              <th>Movement Snapshot</th>
            </tr>
          </thead>

          <tbody>
            ${renderBranchStockRows()}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function refreshBranchStockPage() {
  window.DMC_PAGES["branch-stock"].content = getBranchStockContent();
  renderPage("branch-stock");
}

function setupBranchStockEvents() {
  const departmentSelect = document.getElementById(
    "branch-stock-department-select"
  );
  const statusFilter = document.getElementById("branch-stock-status-filter");
  const searchInput = document.getElementById("branch-stock-search");
  const clearButton = document.getElementById("clear-branch-stock-filters");

  if (departmentSelect) {
    departmentSelect.addEventListener("change", () => {
      window.DMC_BRANCH_STOCK_SELECTED_DEPARTMENT = departmentSelect.value;
      window.DMC_BRANCH_STOCK_FILTERS = {
        status: "all",
        search: ""
      };
      refreshBranchStockPage();
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", () => {
      window.DMC_BRANCH_STOCK_FILTERS.status = statusFilter.value;
      refreshBranchStockPage();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      window.DMC_BRANCH_STOCK_FILTERS.search = searchInput.value;
      refreshBranchStockPage();
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      window.DMC_BRANCH_STOCK_FILTERS = {
        status: "all",
        search: ""
      };
      refreshBranchStockPage();
    });
  }

  document.querySelectorAll("[data-starting-stock-item]").forEach((input) => {
    input.addEventListener("change", () => {
      const startingStock = getStoredStartingStock();
      const selectedDepartment = window.DMC_BRANCH_STOCK_SELECTED_DEPARTMENT;
      const itemId = input.dataset.startingStockItem;
      const key = `${selectedDepartment}|${itemId}`;

      startingStock[key] = input.value;
      saveStartingStock(startingStock);
      refreshBranchStockPage();
    });
  });
}

window.DMC_PAGES["branch-stock"] = {
  eyebrow: "DMC-Iriga Branch",
  title: "Branch Stock",
  description:
    "Current branch stock calculated from starting stock and Ledger movements.",
  getContent: getBranchStockContent,
  content: getBranchStockContent(),
  afterRender: setupBranchStockEvents
};
