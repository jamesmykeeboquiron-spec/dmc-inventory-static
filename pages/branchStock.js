window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_BRANCH_STOCK_MASTER_LIST_KEY = "dmc_master_list_items";
const DMC_BRANCH_STOCK_LEDGER_KEY = "dmc_inventory_ledger_entries";

window.DMC_BRANCH_STOCK_FILTERS = window.DMC_BRANCH_STOCK_FILTERS || {
  department: "all",
  status: "all",
  search: ""
};

function getStoredBranchMasterListItems() {
  const storedItems = localStorage.getItem(DMC_BRANCH_STOCK_MASTER_LIST_KEY);

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

function getStoredBranchLedgerEntries() {
  const storedEntries = localStorage.getItem(DMC_BRANCH_STOCK_LEDGER_KEY);

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

function itemBelongsToBranchStock(item) {
  const operatingArea = String(item.operatingArea || "").toLowerCase();

  if (
    operatingArea.includes("warehouse") ||
    operatingArea.includes("stockroom") ||
    operatingArea.includes("commissary")
  ) {
    return false;
  }

  return item.active !== false;
}

function getBranchStockBaseItems() {
  return getStoredBranchMasterListItems().filter(itemBelongsToBranchStock);
}

function getBranchLedgerEntriesForItem(itemId) {
  return getStoredBranchLedgerEntries().filter((entry) => {
    const entryLocation = String(entry.location || entry.branch || "").toLowerCase();

    const belongsToBranch =
      entryLocation.includes("dmc-iriga") ||
      entryLocation.includes("branch") ||
      !entry.location;

    return (
      String(entry.itemId || "") === String(itemId || "") &&
      belongsToBranch
    );
  });
}

function getBranchLatestMovementForItem(itemId) {
  const entries = getBranchLedgerEntriesForItem(itemId);

  if (entries.length === 0) {
    return null;
  }

  return [...entries].sort((a, b) => {
    const aTime = a.submittedAt || a.date || "";
    const bTime = b.submittedAt || b.date || "";

    return String(bTime).localeCompare(String(aTime));
  })[0];
}

function calculateBranchMovementTotals(item) {
  const entries = getBranchLedgerEntriesForItem(item.itemId);

  return entries.reduce(
    (totals, entry) => {
      const quantity = Number(entry.quantity || 0);

      if (entry.movementType === "Transfer In" || entry.stockEffect === "add") {
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

      return totals;
    },
    {
      transferIn: 0,
      usage: 0,
      waste: 0,
      transferOut: 0,
      adjustment: 0
    }
  );
}

function calculateBranchCurrentStock(item) {
  const entries = getBranchLedgerEntriesForItem(item.itemId);

  return entries.reduce((total, entry) => {
    const quantity = Number(entry.quantity || 0);

    if (entry.stockEffect === "add") {
      return total + quantity;
    }

    if (entry.stockEffect === "deduct") {
      return total - quantity;
    }

    if (entry.movementType === "Transfer In" || entry.movementType === "Received") {
      return total + quantity;
    }

    if (
      entry.movementType === "Usage" ||
      entry.movementType === "Waste" ||
      entry.movementType === "Transfer Out"
    ) {
      return total - quantity;
    }

    if (entry.movementType === "Adjustment") {
      return total + quantity;
    }

    return total;
  }, 0);
}

function normalizeBranchStockItem(item) {
  const currentStock = calculateBranchCurrentStock(item);
  const latestMovement = getBranchLatestMovementForItem(item.itemId);
  const movementTotals = calculateBranchMovementTotals(item);

  return {
    itemId: item.itemId || "-",
    officialItemName: item.officialItemName || item.name || "-",
    department: item.department || "Unassigned",
    unit: item.unit || "-",
    currentStock,
    minimumStock: Number(item.minimumStock || 0),
    lastMovement: latestMovement
      ? `${latestMovement.movementType} · ${latestMovement.date || "No date"}`
      : "No posted branch movement yet",
    note: latestMovement?.notes || item.notes || item.note || "",
    movementTotals
  };
}

function getBranchStockRows() {
  return getBranchStockBaseItems().map(normalizeBranchStockItem);
}

function getBranchStockStatus(item) {
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

function getBranchDepartments() {
  return [...new Set(getBranchStockRows().map((item) => item.department))]
    .filter(Boolean)
    .sort();
}

function getFilteredBranchStockRows() {
  const filters = window.DMC_BRANCH_STOCK_FILTERS;
  const searchValue = String(filters.search || "").toLowerCase().trim();
  const selectedDepartment = String(filters.department || "all").toLowerCase();
  const selectedStatus = String(filters.status || "all").toLowerCase();

  return getBranchStockRows().filter((item) => {
    const itemDepartment = String(item.department || "").toLowerCase();
    const itemStatus = getBranchStockStatus(item).toLowerCase();

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

function getIncomingTodayCountForBranchStock() {
  const today = new Date().toISOString().slice(0, 10);

  return getStoredBranchLedgerEntries().filter((entry) => {
    const entryDate = String(entry.date || "").slice(0, 10);
    const entryLocation = String(entry.location || entry.branch || "").toLowerCase();

    const belongsToBranch =
      entryLocation.includes("dmc-iriga") ||
      entryLocation.includes("branch") ||
      !entry.location;

    return (
      belongsToBranch &&
      entryDate === today &&
      entry.movementType === "Transfer In" &&
      entry.source === "Incoming Delivery Receipt"
    );
  }).length;
}

function renderBranchSummaryCards() {
  const rows = getBranchStockRows();

  const lowStockCount = rows.filter(
    (item) => getBranchStockStatus(item) === "Low Stock"
  ).length;

  const outOfStockCount = rows.filter(
    (item) => getBranchStockStatus(item) === "Out of Stock"
  ).length;

  return `
    <section class="grid">
      <div class="card">
        <p>Total Items</p>
        <strong>${rows.length}</strong>
        <span>branch stock items</span>
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
        <strong>${getIncomingTodayCountForBranchStock()}</strong>
        <span>deliveries received</span>
      </div>
    </section>
  `;
}

function renderBranchDepartmentOptions() {
  const currentDepartment = window.DMC_BRANCH_STOCK_FILTERS.department;

  return `
    <option value="all" ${currentDepartment === "all" ? "selected" : ""}>
      All Departments
    </option>
    ${getBranchDepartments()
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

function renderBranchStatusOptions() {
  const currentStatus = window.DMC_BRANCH_STOCK_FILTERS.status;
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

function getBranchStatusBadgeClass(status) {
  if (status === "Out of Stock") {
    return "danger";
  }

  if (status === "Low Stock") {
    return "warning";
  }

  return "success";
}

function renderBranchStockLevel(item) {
  const currentStock = Number(item.currentStock || 0);
  const minimumStock = Number(item.minimumStock || 0);

  const percent = Math.min(
    100,
    Math.max(0, Math.round((currentStock / Math.max(minimumStock, 1)) * 100))
  );

  return `
    <div class="stock-level">
      <div class="stock-level-meta">
        <span>${currentStock} ${item.unit || ""}</span>
        <span>min ${minimumStock} ${item.unit || ""}</span>
      </div>
      <div class="stock-level-track">
        <div class="stock-level-fill" style="width: ${percent}%"></div>
      </div>
    </div>
  `;
}

function renderBranchMovementSummary(item) {
  const totals = item.movementTotals || {
    transferIn: 0,
    usage: 0,
    waste: 0,
    transferOut: 0,
    adjustment: 0
  };

  return `
    <small class="table-subtext">
      In: ${totals.transferIn} · Usage: ${totals.usage} · Waste: ${totals.waste}
    </small>
  `;
}

function renderBranchStockRows() {
  const rows = getFilteredBranchStockRows();

  if (rows.length === 0) {
    return `
      <tr>
        <td colspan="7">No branch stock items match the current filters.</td>
      </tr>
    `;
  }

  return rows
    .map((item) => {
      const status = getBranchStockStatus(item);

      return `
        <tr>
          <td>${item.itemId || "-"}</td>
          <td>
            <strong>${item.officialItemName || "-"}</strong>
            ${renderBranchMovementSummary(item)}
            ${
              item.note
                ? `<small class="table-subtext">${item.note}</small>`
                : ""
            }
          </td>
          <td>${item.unit || "-"}</td>
          <td>${renderBranchStockLevel(item)}</td>
          <td>
            <span class="badge ${getBranchStatusBadgeClass(status)}">
              ${status}
            </span>
          </td>
          <td>${item.lastMovement || "No posted branch movement yet"}</td>
          <td>
            <div class="row-actions">
              <button class="tiny-button" data-view-branch-stock="${item.itemId}">
                View
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderBranchStockPanel() {
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Branch Stock List</h3>
          <p>
            Current Branch stock is calculated from confirmed Incoming Deliveries and Branch movements.
          </p>
        </div>

        <span class="badge">Calculated Stock</span>
      </div>

      <div class="warehouse-stock-filter-shell">
        <div class="warehouse-stock-filter-grid">
          <label>
            Search
            <input
              id="branch-stock-search"
              type="text"
              placeholder="Search item name, Item ID, or department..."
              value="${window.DMC_BRANCH_STOCK_FILTERS.search}"
            />
          </label>

          <label>
            Department
            <select id="branch-stock-department-filter">
              ${renderBranchDepartmentOptions()}
            </select>
          </label>

          <label>
            Status
            <select id="branch-stock-status-filter">
              ${renderBranchStatusOptions()}
            </select>
          </label>

          <button class="ghost-button" id="clear-branch-stock-filters">
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
              <th>Stock Level</th>
              <th>Status</th>
              <th>Last Movement</th>
              <th>Actions</th>
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

function getBranchStockContent() {
  return `
    ${renderBranchSummaryCards()}
    ${renderBranchStockPanel()}
  `;
}

function refreshBranchStockPage() {
  window.DMC_PAGES["branch-stock"].content = getBranchStockContent();
  renderPage("branch-stock");
}

function setupBranchStockEvents() {
  const searchInput = document.getElementById("branch-stock-search");
  const departmentFilter = document.getElementById(
    "branch-stock-department-filter"
  );
  const statusFilter = document.getElementById("branch-stock-status-filter");
  const clearButton = document.getElementById("clear-branch-stock-filters");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      window.DMC_BRANCH_STOCK_FILTERS.search = searchInput.value;
      refreshBranchStockPage();
    });
  }

  if (departmentFilter) {
    departmentFilter.addEventListener("change", () => {
      window.DMC_BRANCH_STOCK_FILTERS.department = departmentFilter.value;
      refreshBranchStockPage();
    });
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", () => {
      window.DMC_BRANCH_STOCK_FILTERS.status = statusFilter.value;
      refreshBranchStockPage();
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      window.DMC_BRANCH_STOCK_FILTERS = {
        department: "all",
        status: "all",
        search: ""
      };

      refreshBranchStockPage();
    });
  }

  document.querySelectorAll("[data-view-branch-stock]").forEach((button) => {
    button.addEventListener("click", () => {
      const itemId = button.dataset.viewBranchStock;
      const item = getBranchStockRows().find(
        (row) => String(row.itemId) === String(itemId)
      );

      if (!item) {
        return;
      }

      const status = getBranchStockStatus(item);
      const totals = item.movementTotals || {
        transferIn: 0,
        usage: 0,
        waste: 0,
        transferOut: 0,
        adjustment: 0
      };

      if (typeof window.DMC_SHOW_MODAL === "function") {
        window.DMC_SHOW_MODAL({
          type: "info",
          title: `${item.officialItemName}`,
          message: `Current stock: ${item.currentStock} ${item.unit}. Minimum stock: ${item.minimumStock} ${item.unit}. Status: ${status}. Transfer In: ${totals.transferIn}, Usage: ${totals.usage}, Waste: ${totals.waste}, Transfer Out: ${totals.transferOut}, Adjustment: ${totals.adjustment}. Last movement: ${item.lastMovement}.`,
          confirmLabel: "Got it"
        });
      }
    });
  });
}

window.DMC_PAGES["branch-stock"] = {
  eyebrow: "DMC-Iriga Branch",
  title: "Branch Stock",
  description:
    "Current branch stock calculated from confirmed branch movements.",
  getContent: getBranchStockContent,
  content: getBranchStockContent(),
  afterRender: setupBranchStockEvents
};
