window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_WAREHOUSE_STOCK_MASTER_LIST_KEY = "dmc_master_list_items";

window.DMC_WAREHOUSE_STOCK_FILTERS = window.DMC_WAREHOUSE_STOCK_FILTERS || {
  department: "all",
  status: "all",
  search: ""
};

const warehouseStockSampleRows = [
  {
    itemId: "RAW-FLO-001",
    officialItemName: "All Purpose Flour",
    department: "Baking",
    unit: "kg",
    currentStock: 18,
    minimumStock: 25,
    lastMovement: "Supplier Receiving · Today",
    note: "Needs reorder"
  },
  {
    itemId: "RAW-SUG-001",
    officialItemName: "White Sugar",
    department: "Baking",
    unit: "kg",
    currentStock: 9,
    minimumStock: 20,
    lastMovement: "Transfer Out to Commissary · Today",
    note: "Critical"
  },
  {
    itemId: "RAW-COF-001",
    officialItemName: "Coffee Beans",
    department: "Coffee",
    unit: "kg",
    currentStock: 32,
    minimumStock: 15,
    lastMovement: "Supplier Receiving · Yesterday",
    note: "Healthy"
  },
  {
    itemId: "PKG-CUP-016",
    officialItemName: "16oz Paper Cups",
    department: "Packaging",
    unit: "pcs",
    currentStock: 120,
    minimumStock: 200,
    lastMovement: "Branch Fulfillment · Yesterday",
    note: "Needs reorder"
  },
  {
    itemId: "FIN-ENS-001",
    officialItemName: "Ensaymada",
    department: "Pastries",
    unit: "pcs",
    currentStock: 65,
    minimumStock: 40,
    lastMovement: "Finished Product Transfer · Today",
    note: "Ready"
  },
  {
    itemId: "FIN-UBE-001",
    officialItemName: "Ube Cheese Pandesal",
    department: "Pastries",
    unit: "pcs",
    currentStock: 22,
    minimumStock: 40,
    lastMovement: "Branch Fulfillment · Today",
    note: "Low"
  },
  {
    itemId: "RAW-MIL-001",
    officialItemName: "Fresh Milk",
    department: "Dairy",
    unit: "liter",
    currentStock: 0,
    minimumStock: 12,
    lastMovement: "Waste · Today",
    note: "Out"
  }
];

function getStoredWarehouseMasterListItems() {
  const storedItems = localStorage.getItem(DMC_WAREHOUSE_STOCK_MASTER_LIST_KEY);

  if (!storedItems) {
    return [];
  }

  try {
    return JSON.parse(storedItems);
  } catch {
    return [];
  }
}

function itemBelongsToWarehouse(item) {
  const operatingArea = String(item.operatingArea || "").toLowerCase();

  return (
    operatingArea.includes("warehouse") ||
    operatingArea.includes("stockroom") ||
    operatingArea.includes("commissary")
  );
}

function normalizeWarehouseMasterItem(item) {
  return {
    itemId: item.itemId || "-",
    officialItemName: item.officialItemName || item.name || "-",
    department: item.department || "Unassigned",
    unit: item.unit || "-",
    currentStock: Number(item.currentStock || 0),
    minimumStock: Number(item.minimumStock || 0),
    lastMovement: item.lastMovement || "Not yet received",
    note: item.notes || ""
  };
}

function getWarehouseStockRows() {
  const masterListItems = getStoredWarehouseMasterListItems();

  const warehouseItems = masterListItems
    .filter(itemBelongsToWarehouse)
    .map(normalizeWarehouseMasterItem);

  if (warehouseItems.length > 0) {
    return warehouseItems;
  }

  return warehouseStockSampleRows;
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
      String(item.officialItemName || "").toLowerCase().includes(searchValue);

    return matchesDepartment && matchesStatus && matchesSearch;
  });
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
        <p>Low Stock</p>
        <strong>${lowStockCount}</strong>
        <span>below minimum stock</span>
      </div>

      <div class="card">
        <p>Out of Stock</p>
        <strong>${outOfStockCount}</strong>
        <span>needs urgent action</span>
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
  const minimumStock = Number(item.minimumStock || 0);

  const percent = Math.min(
    100,
    Math.round((currentStock / Math.max(minimumStock, 1)) * 100)
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

function renderWarehouseStockRows() {
  const rows = getFilteredWarehouseStockRows();

  if (rows.length === 0) {
    return `
      <tr>
        <td colspan="7">No warehouse stock items match the current filters.</td>
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
            ${
              item.note
                ? `<small class="table-subtext">${item.note}</small>`
                : ""
            }
          </td>
          <td>${item.unit || "-"}</td>
          <td>${renderWarehouseStockLevel(item)}</td>
          <td>
            <span class="badge ${getWarehouseStatusBadgeClass(status)}">
              ${status}
            </span>
          </td>
          <td>${item.lastMovement || "Not yet received"}</td>
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
            Actual warehouse stock pulled from the item source of truth and
            updated by warehouse movements.
          </p>
        </div>

        <span class="badge">Actual Stock</span>
      </div>

      <div class="warehouse-stock-filter-shell">
        <div class="warehouse-stock-filter-grid">
          <label>
            Search
            <input
              id="warehouse-stock-search"
              type="text"
              placeholder="Search item name or Item ID..."
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

      if (typeof window.DMC_SHOW_MODAL === "function") {
        window.DMC_SHOW_MODAL({
          type: "info",
          title: "Warehouse Stock Detail",
          message: `Movement history for ${itemId} will be connected when Warehouse Log Transaction is built.`,
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
    "Actual stock list for raw materials, packaging, and finished products stored in Warehouse.",
  getContent: getWarehouseStockContent,
  content: getWarehouseStockContent(),
  afterRender: setupWarehouseStockEvents
};
