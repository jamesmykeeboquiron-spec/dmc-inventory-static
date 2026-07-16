window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_BRANCH_STOCK_MASTER_LIST_KEY = "dmc_master_list_items";
const DMC_BRANCH_STOCK_LEDGER_KEY = "dmc_inventory_ledger_entries";
const DMC_BRANCH_STOCK_MINIMUMS_KEY = "dmc_branch_stock_minimums";

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

function getBranchItemOperatingAreas(item) {
  if (Array.isArray(item?.operatingAreas)) {
    return item.operatingAreas.filter(Boolean);
  }

  if (item?.operatingArea) {
    return String(item.operatingArea)
      .split(",")
      .map((area) => area.trim())
      .filter(Boolean);
  }

  return [];
}

function itemIsActiveInBranchArea(item) {
  const areas = getBranchItemOperatingAreas(item).map((area) =>
    String(area || "").toLowerCase()
  );

  return areas.some((area) => {
    return area.includes("branch") || area.includes("dmc-iriga");
  });
}

function itemBelongsToBranchStock(item) {
  if (item.active === false) {
    return false;
  }

  return itemIsActiveInBranchArea(item);
}

function entryBelongsToBranchStock(entry) {
  const location = String(entry.location || entry.branch || "").toLowerCase();
  const department = String(entry.department || "").toLowerCase();
  const source = String(entry.source || "").toLowerCase();
  const destination = String(entry.destination || "").toLowerCase();
  const movementField = String(entry.movementField || "");
  const stockEffect = String(entry.stockEffect || "").toLowerCase();

  const belongsToCommissary =
    location.includes("commissary") ||
    department.includes("commissary") ||
    destination.includes("commissary") ||
    source.includes("commissary") ||
    movementField === "receivedFromWarehouse" ||
    movementField === "receivedFromBranch";

  const belongsToWarehouse =
    location.includes("warehouse") ||
    department.includes("warehouse") ||
    source.includes("warehouse daily input");

  if (belongsToCommissary || belongsToWarehouse) {
    return false;
  }

  const isConfirmedBranchReceipt =
    source === "incoming delivery receipt" &&
    stockEffect === "add";

  return (
    location.includes("dmc-iriga") ||
    location.includes("branch") ||
    department.includes("branch") ||
    destination.includes("dmc-iriga") ||
    destination.includes("branch") ||
    source.includes("branch daily input") ||
    isConfirmedBranchReceipt
  );
}

function getBranchLedgerEntriesOnly() {
  return getStoredBranchLedgerEntries().filter(entryBelongsToBranchStock);
}

function getBranchLedgerEntriesForItem(itemId) {
  return getBranchLedgerEntriesOnly().filter(
    (entry) => String(entry.itemId || "") === String(itemId || "")
  );
}

function getBranchStockBaseItems() {
  const masterListItems = getStoredBranchMasterListItems();

  return masterListItems
    .filter(itemBelongsToBranchStock)
    .map((item) => ({
      ...item,
      operatingArea: Array.isArray(item.operatingAreas)
        ? item.operatingAreas.join(", ")
        : item.operatingArea || "Branch"
    }));
}

function getBranchEntryTime(entry) {
  return String(entry.submittedAt || entry.date || "");
}

function getBranchLatestMovementForItem(itemId) {
  const entries = getBranchLedgerEntriesForItem(itemId);

  if (entries.length === 0) {
    return null;
  }

  return [...entries].sort((a, b) => {
    return getBranchEntryTime(b).localeCompare(getBranchEntryTime(a));
  })[0];
}

function getLatestRemainingCountForItem(itemId) {
  const remainingEntries = getBranchLedgerEntriesForItem(itemId).filter(
    (entry) =>
      entry.movementType === "Remaining Count" || entry.stockEffect === "set"
  );

  if (remainingEntries.length === 0) {
    return null;
  }

  return [...remainingEntries].sort((a, b) => {
    return getBranchEntryTime(b).localeCompare(getBranchEntryTime(a));
  })[0];
}

function getBranchEntryStockEffect(entry) {
  if (entry.stockEffect) {
    return entry.stockEffect;
  }

  if (entry.movementType === "Transfer In" || entry.movementType === "Received") {
    return "add";
  }

  if (
    entry.movementType === "Usage" ||
    entry.movementType === "Waste" ||
    entry.movementType === "Transfer Out"
  ) {
    return "deduct";
  }

  if (entry.movementType === "Remaining Count") {
    return "set";
  }

  return "report";
}

function calculateBranchCurrentStock(item) {
  const entries = getBranchLedgerEntriesForItem(item.itemId);
  const latestRemainingCount = getLatestRemainingCountForItem(item.itemId);

  if (latestRemainingCount) {
    const latestRemainingTime = getBranchEntryTime(latestRemainingCount);
    const startingFromRemaining = Number(latestRemainingCount.quantity || 0);

    return entries
      .filter((entry) => {
        if (entry === latestRemainingCount) {
          return false;
        }

        return getBranchEntryTime(entry) > latestRemainingTime;
      })
      .reduce((total, entry) => {
        const quantity = Number(entry.quantity || 0);
        const stockEffect = getBranchEntryStockEffect(entry);

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
    const stockEffect = getBranchEntryStockEffect(entry);

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
  }, 0);
}

function calculateBranchMovementTotals(item) {
  const entries = getBranchLedgerEntriesForItem(item.itemId);

  return entries.reduce(
    (totals, entry) => {
      const quantity = Number(entry.quantity || 0);
      const stockEffect = getBranchEntryStockEffect(entry);

      if (entry.movementType === "Transfer In" || stockEffect === "add") {
        totals.transferIn += quantity;
      }

      if (entry.movementType === "Transfer Out" || stockEffect === "deduct") {
        totals.transferOut += quantity;
      }

      if (entry.movementType === "Usage") {
        totals.usage += quantity;
      }

      if (entry.movementType === "Waste") {
        totals.waste += quantity;
      }

      if (entry.movementType === "Remaining Count" || stockEffect === "set") {
        totals.remainingCount = quantity;
      }

      return totals;
    },
    {
      transferIn: 0,
      transferOut: 0,
      usage: 0,
      waste: 0,
      remainingCount: 0
    }
  );
}

function getCurrentBranchStockMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function entryIsInCurrentBranchStockMonth(entry) {
  const currentMonth = getCurrentBranchStockMonthKey();
  const entryMonth = String(entry.date || entry.submittedAt || "").slice(0, 7);

  return entryMonth === currentMonth;
}

function calculateBranchMonthlyMovementTotals(itemId) {
  return getBranchLedgerEntriesForItem(itemId)
    .filter(entryIsInCurrentBranchStockMonth)
    .reduce(
      (totals, entry) => {
        const quantity = Number(entry.quantity || 0);
        const stockEffect = getBranchEntryStockEffect(entry);

        if (entry.movementType === "Transfer In" || stockEffect === "add") {
          totals.transferIn += quantity;
        }

        if (entry.movementType === "Transfer Out" || stockEffect === "deduct") {
          totals.transferOut += quantity;
        }

        if (entry.movementType === "Usage") {
          totals.usage += quantity;
        }

        if (entry.movementType === "Waste") {
          totals.waste += quantity;
        }

        if (entry.movementType === "Remaining Count" || stockEffect === "set") {
          totals.remainingCounts += 1;
        }

        return totals;
      },
      {
        transferIn: 0,
        transferOut: 0,
        usage: 0,
        waste: 0,
        remainingCounts: 0
      }
    );
}

function getBranchStockCurrentMonthLabel() {
  return new Date().toLocaleString("en-US", {
    month: "long",
    year: "numeric"
  });
}

function getBranchTransferInAfterLastCount(item) {
  const entries = getBranchLedgerEntriesForItem(item.itemId);
  const latestRemainingCount = getLatestRemainingCountForItem(item.itemId);

  if (!latestRemainingCount) {
    return 0;
  }

  const latestRemainingTime = getBranchEntryTime(latestRemainingCount);

  return entries
    .filter((entry) => {
      const isAfterLastCount = getBranchEntryTime(entry) > latestRemainingTime;
      const isTransferIn =
        entry.movementType === "Transfer In" ||
        getBranchEntryStockEffect(entry) === "add";

      return isAfterLastCount && isTransferIn;
    })
    .reduce((total, entry) => total + Number(entry.quantity || 0), 0);
}


function getStoredBranchMinimums() {
  const storedMinimums = localStorage.getItem(DMC_BRANCH_STOCK_MINIMUMS_KEY);

  if (!storedMinimums) {
    return {};
  }

  try {
    const parsedMinimums = JSON.parse(storedMinimums);

    if (!parsedMinimums || typeof parsedMinimums !== "object") {
      return {};
    }

    return parsedMinimums;
  } catch {
    return {};
  }
}

function saveStoredBranchMinimums(minimums) {
  localStorage.setItem(
    DMC_BRANCH_STOCK_MINIMUMS_KEY,
    JSON.stringify(minimums)
  );
}

function getBranchMinimumStock(item) {
  const minimums = getStoredBranchMinimums();
  const itemId = String(item.itemId || "");

  if (itemId && minimums[itemId] !== undefined) {
    const branchMinimum = Number(minimums[itemId]);

    return Number.isNaN(branchMinimum) ? 0 : branchMinimum;
  }

  const defaultMinimum = Number(item.minimumStock || 0);

  return Number.isNaN(defaultMinimum) ? 0 : defaultMinimum;
}

function updateBranchMinimumStock(itemId, value) {
  if (!itemId) {
    return;
  }

  const minimums = getStoredBranchMinimums();
  const parsedValue = Number(value || 0);

  minimums[itemId] = Number.isNaN(parsedValue) ? 0 : parsedValue;

  saveStoredBranchMinimums(minimums);
}

function renderBranchMinimumStockInput(item) {
  return `
    <div class="minimum-stock-input-cell">
      <input
        class="branch-minimum-stock-input"
        data-branch-minimum-stock="${item.itemId}"
        type="number"
        min="0"
        step="any"
        value="${item.minimumStock}"
      />
      <small>${item.unit || ""}</small>
    </div>
  `;
}

function normalizeBranchStockItem(item) {
  const currentStock = calculateBranchCurrentStock(item);
  const latestMovement = getBranchLatestMovementForItem(item.itemId);
  const movementTotals = calculateBranchMovementTotals(item);

  return {
    itemId: item.itemId || "-",
    officialItemName: item.officialItemName || item.name || "-",
    department: item.department || "Unassigned",
    section: item.section || "Unassigned",
    unit: item.unit || "-",
    currentStock,
    minimumStock: getBranchMinimumStock(item),
    lastMovement: latestMovement
      ? `${latestMovement.movementType} · ${latestMovement.date || "No date"}`
      : "No posted branch movement yet",
    note: latestMovement?.notes || item.notes || item.note || "",
    movementTotals,
    transferInAfterLastCount: getBranchTransferInAfterLastCount(item)
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
      String(item.section || "").toLowerCase().includes(searchValue) ||
      String(item.unit || "").toLowerCase().includes(searchValue);

    return matchesDepartment && matchesStatus && matchesSearch;
  });
}

function getIncomingTodayCountForBranchStock() {
  const today = new Date().toISOString().slice(0, 10);

  return getStoredBranchLedgerEntries().filter((entry) => {
    const entryDate = String(entry.date || "").slice(0, 10);

    return (
      entryBelongsToBranchStock(entry) &&
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
        <span>active branch stock items</span>
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

function renderBranchOutOfStockAlert() {
  const outOfStockItems = getBranchStockRows().filter(
    (item) => getBranchStockStatus(item) === "Out of Stock"
  );

  if (outOfStockItems.length === 0) {
    return "";
  }

  return `
    <div class="instruction-box">
      <strong>
        Stock Alert
        <span class="nav-notification-bubble pulse" style="margin-left: 8px;">
          ${outOfStockItems.length > 99 ? "99+" : outOfStockItems.length}
        </span>
      </strong>
      <span>
        ${outOfStockItems.length} branch item${outOfStockItems.length === 1 ? "" : "s"} currently at 0 stock.
        Use the Status filter and choose Out of Stock to review them.
      </span>
    </div>
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
  const status = getBranchStockStatus(item);
  const statusClass = getBranchStatusBadgeClass(status);

  return `
    <div class="stock-current-bubble-only ${statusClass}">
      <strong>${currentStock}</strong>
      <em>${item.unit || ""}</em>
    </div>
  `;
}

function renderBranchStockMeter(item) {
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
        <span>Level vs minimum</span>
      </div>
    </div>
  `;
}

function renderBranchMovementSummary(item) {
  const totals = item.movementTotals || {
    transferIn: 0,
    transferOut: 0,
    usage: 0,
    waste: 0,
    remainingCount: 0
  };

  return `
    <small class="table-subtext">
      In: ${totals.transferIn} · Out: ${totals.transferOut} · Usage: ${totals.usage} · Waste: ${totals.waste}
    </small>
  `;
}

function renderBranchStockRows() {
  const rows = getFilteredBranchStockRows();

  if (rows.length === 0) {
    return `
      <tr>
        <td colspan="9">No active Branch stock items match the current filters.</td>
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
          </td>
          <td>${item.unit || "-"}</td>
          <td>${renderBranchStockLevel(item)}</td>
          <td>${renderBranchStockMeter(item)}</td>
          <td>${renderBranchMinimumStockInput(item)}</td>
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
            This page shows only items currently checked as active in Branch from the Master List.
            Current Stock is calculated from Branch ledger movements.
          </p>
        </div>

        ${
          getBranchStockRows().some((item) => getBranchStockStatus(item) === "Out of Stock")
            ? `<span class="badge danger-badge">0 Stock Alert</span>`
            : `<span class="badge">Current Stock</span>`
        }
      </div>

      ${renderBranchOutOfStockAlert()}

      <div class="warehouse-stock-filter-shell">
        <div class="warehouse-stock-filter-grid">
          <label>
            Search
            <input
              id="branch-stock-search"
              type="text"
              placeholder="Search item name, Item ID, department, section..."
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

      <div class="instruction-box">
        <strong>Master List Rule:</strong>
        <span>
          If Branch is unticked in Master List, this item no longer appears here.
          Old ledger records remain in Ledger and Branch Log for history.
        </span>
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
              <th>Minimum Stock</th>
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


  document.querySelectorAll("[data-branch-minimum-stock]").forEach((input) => {
    input.addEventListener("change", () => {
      updateBranchMinimumStock(
        input.dataset.branchMinimumStock,
        input.value
      );

      refreshBranchStockPage();
    });
  });

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
      const monthlyTotals = calculateBranchMonthlyMovementTotals(item.itemId);
      const monthLabel = getBranchStockCurrentMonthLabel();

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
            `Transfer In: ${monthlyTotals.transferIn} ${item.unit}`,
            `Transfer Out: ${monthlyTotals.transferOut} ${item.unit}`,
            `Usage Reported: ${monthlyTotals.usage} ${item.unit}`,
            `Waste Reported: ${monthlyTotals.waste} ${item.unit}`,
            `Closing Counts Submitted: ${monthlyTotals.remainingCounts}`,
            "",
            `Last Movement: ${item.lastMovement}`
          ].join("\n"),
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
    "Current branch stock and starting reference for the next shift.",
  getContent: getBranchStockContent,
  content: getBranchStockContent(),
  afterRender: setupBranchStockEvents
};
