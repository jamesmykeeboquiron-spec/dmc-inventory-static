window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_COMMISSARY_STOCK_STORAGE_KEY = "dmc_commissary_stock_items";

window.DMC_COMMISSARY_STOCK_FILTERS = window.DMC_COMMISSARY_STOCK_FILTERS || {
  status: "all",
  priority: "all",
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
    return JSON.parse(storedItems);
  } catch {
    return getDefaultCommissaryStockItems();
  }
}

function getStockStatus(item) {
  const currentStock = Number(item.currentStock || 0);
  const minimumStock = Number(item.minimumStock || 0);

  if (currentStock <= 0) {
    return "Critical";
  }

  if (minimumStock > 0 && currentStock <= minimumStock * 0.5) {
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

function getStockPriority(item) {
  const status = getStockStatus(item);
  const isExpiringSoon = getExpiryPriority(item.expiryDate) === "Expiring Soon";

  if (status === "Critical") {
    return "High Priority";
  }

  if (isExpiringSoon) {
    return "Use First";
  }

  if (status === "Low Stock") {
    return "Reorder Soon";
  }

  if (status === "Overstock") {
    return "Monitor";
  }

  return "Normal";
}

function getExpiryPriority(expiryDate) {
  if (!expiryDate) {
    return "No Date";
  }

  const today = new Date();
  const expiry = new Date(expiryDate);
  const differenceInDays = Math.ceil(
    (expiry - today) / (1000 * 60 * 60 * 24)
  );

  if (differenceInDays < 0) {
    return "Expired";
  }

  if (differenceInDays <= 14) {
    return "Expiring Soon";
  }

  return "OK";
}

function getStatusBadgeClass(status) {
  if (status === "Critical") return "danger-badge";
  if (status === "Low Stock") return "warning-badge";
  if (status === "Overstock") return "info-badge";
  return "";
}

function getPriorityBadgeClass(priority) {
  if (priority === "High Priority") return "danger-badge";
  if (priority === "Use First") return "warning-badge";
  if (priority === "Reorder Soon") return "warning-badge";
  if (priority === "Monitor") return "info-badge";
  return "";
}

function getFilteredCommissaryStockItems() {
  const filters = window.DMC_COMMISSARY_STOCK_FILTERS;
  const searchValue = String(filters.search || "").toLowerCase().trim();

  return getStoredCommissaryStockItems().filter((item) => {
    const status = getStockStatus(item);
    const priority = getStockPriority(item);

    const matchesStatus =
      filters.status === "all" || status === filters.status;

    const matchesPriority =
      filters.priority === "all" || priority === filters.priority;

    const matchesSearch =
      !searchValue ||
      String(item.itemId || "").toLowerCase().includes(searchValue) ||
      String(item.itemName || "").toLowerCase().includes(searchValue) ||
      String(item.section || "").toLowerCase().includes(searchValue) ||
      String(item.unit || "").toLowerCase().includes(searchValue) ||
      String(item.notes || "").toLowerCase().includes(searchValue);

    return matchesStatus && matchesPriority && matchesSearch;
  });
}

function renderStatusFilterOptions() {
  const statuses = ["Good", "Low Stock", "Critical", "Overstock"];
  const current = window.DMC_COMMISSARY_STOCK_FILTERS.status;

  return `
    <option value="all" ${current === "all" ? "selected" : ""}>All Statuses</option>
    ${statuses
      .map(
        (status) =>
          `<option value="${status}" ${current === status ? "selected" : ""}>${status}</option>`
      )
      .join("")}
  `;
}

function renderPriorityFilterOptions() {
  const priorities = ["Normal", "Reorder Soon", "High Priority", "Use First", "Monitor"];
  const current = window.DMC_COMMISSARY_STOCK_FILTERS.priority;

  return `
    <option value="all" ${current === "all" ? "selected" : ""}>All Priorities</option>
    ${priorities
      .map(
        (priority) =>
          `<option value="${priority}" ${current === priority ? "selected" : ""}>${priority}</option>`
      )
      .join("")}
  `;
}

function renderCommissaryStockRows() {
  const items = getFilteredCommissaryStockItems();

  if (items.length === 0) {
    return `
      <tr>
        <td colspan="10">No commissary stock items match the current filters.</td>
      </tr>
    `;
  }

  return items
    .map((item) => {
      const status = getStockStatus(item);
      const priority = getStockPriority(item);
      const expiryPriority = getExpiryPriority(item.expiryDate);

      return `
        <tr>
          <td>${item.itemId}</td>
          <td>${item.itemName}</td>
          <td>${item.section}</td>
          <td>${item.currentStock}</td>
          <td>${item.minimumStock}</td>
          <td>${item.unit}</td>
          <td><span class="badge ${getStatusBadgeClass(status)}">${status}</span></td>
          <td><span class="badge ${getPriorityBadgeClass(priority)}">${priority}</span></td>
          <td>${item.expiryDate || "-"} <span class="badge">${expiryPriority}</span></td>
          <td>${item.notes || "-"}</td>
        </tr>
      `;
    })
    .join("");
}

function getCommissaryStockContent() {
  const allItems = getStoredCommissaryStockItems();
  const filteredItems = getFilteredCommissaryStockItems();

  const lowStockCount = allItems.filter(
    (item) => getStockStatus(item) === "Low Stock"
  ).length;

  const criticalCount = allItems.filter(
    (item) => getStockStatus(item) === "Critical"
  ).length;

  const expiringSoonCount = allItems.filter(
    (item) => getExpiryPriority(item.expiryDate) === "Expiring Soon"
  ).length;

  return `
    <section class="grid">
      <div class="card">
        <p>Showing Items</p>
        <strong>${filteredItems.length}</strong>
      </div>

      <div class="card">
        <p>Low Stock</p>
        <strong>${lowStockCount}</strong>
      </div>

      <div class="card">
        <p>Critical</p>
        <strong>${criticalCount}</strong>
      </div>

      <div class="card">
        <p>Expiring Soon</p>
        <strong>${expiringSoonCount}</strong>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Commissary Stock Overview</h3>
          <p>
            Review current stock levels, low stock alerts, critical items,
            priority items, and expiry concerns.
          </p>
        </div>

        <button class="ghost-button">Stock Overview</button>
      </div>

      <div class="filter-bar">
        <label>
          Status
          <select id="commissary-status-filter">
            ${renderStatusFilterOptions()}
          </select>
        </label>

        <label>
          Priority
          <select id="commissary-priority-filter">
            ${renderPriorityFilterOptions()}
          </select>
        </label>

        <label class="filter-search">
          Search
          <input
            id="commissary-search"
            type="text"
            placeholder="Search item name, ID, section, unit..."
            value="${window.DMC_COMMISSARY_STOCK_FILTERS.search}"
          />
        </label>

        <button class="ghost-button" id="clear-commissary-filters">
          Clear Filters
        </button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item ID</th>
              <th>Item Name</th>
              <th>Section</th>
              <th>Current Stock</th>
              <th>Minimum Stock</th>
              <th>Unit</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Expiry / Best Before</th>
              <th>Notes</th>
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
  const statusFilter = document.getElementById("commissary-status-filter");
  const priorityFilter = document.getElementById("commissary-priority-filter");
  const searchInput = document.getElementById("commissary-search");
  const clearButton = document.getElementById("clear-commissary-filters");

  if (statusFilter) {
    statusFilter.addEventListener("change", () => {
      window.DMC_COMMISSARY_STOCK_FILTERS.status = statusFilter.value;
      refreshCommissaryStockPage();
    });
  }

  if (priorityFilter) {
    priorityFilter.addEventListener("change", () => {
      window.DMC_COMMISSARY_STOCK_FILTERS.priority = priorityFilter.value;
      refreshCommissaryStockPage();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      window.DMC_COMMISSARY_STOCK_FILTERS.search = searchInput.value;
      refreshCommissaryStockPage();
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      window.DMC_COMMISSARY_STOCK_FILTERS = {
        status: "all",
        priority: "all",
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
    "Tracks available stock inside the commissary storage area.",
  getContent: getCommissaryStockContent,
  content: getCommissaryStockContent(),
  afterRender: setupCommissaryStockEvents
};
