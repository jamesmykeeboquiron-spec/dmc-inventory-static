window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_ORDER_HISTORY_STORAGE_KEY = "dmc_branch_orders";

window.DMC_ORDER_HISTORY_SELECTED_STATUS =
  window.DMC_ORDER_HISTORY_SELECTED_STATUS || "all";

window.DMC_ORDER_HISTORY_SEARCH = window.DMC_ORDER_HISTORY_SEARCH || "";

window.DMC_ORDER_HISTORY_START_DATE =
  window.DMC_ORDER_HISTORY_START_DATE || "";

window.DMC_ORDER_HISTORY_END_DATE =
  window.DMC_ORDER_HISTORY_END_DATE || "";

window.DMC_ORDER_HISTORY_SELECTED_ID =
  window.DMC_ORDER_HISTORY_SELECTED_ID || "";

function getTodayOrderHistoryDate() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthStartOrderHistoryDate() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  return firstDay.toISOString().slice(0, 10);
}

function getStoredOrderHistoryOrders() {
  const storedOrders = localStorage.getItem(DMC_ORDER_HISTORY_STORAGE_KEY);

  if (!storedOrders) {
    return [];
  }

  try {
    return JSON.parse(storedOrders);
  } catch {
    return [];
  }
}

function formatOrderHistoryDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getOrderHistoryTimestamp(order) {
  const latestStatus = order.statusHistory?.[order.statusHistory.length - 1];

  if (latestStatus?.timestamp) {
    return new Date(latestStatus.timestamp).getTime();
  }

  if (order.orderDate) {
    return new Date(order.orderDate).getTime();
  }

  return 0;
}

function getSortedOrderHistoryOrders() {
  return [...getStoredOrderHistoryOrders()].sort(
    (a, b) => getOrderHistoryTimestamp(b) - getOrderHistoryTimestamp(a)
  );
}

function getFilteredOrderHistoryOrders() {
  const status = window.DMC_ORDER_HISTORY_SELECTED_STATUS;
  const searchValue = String(window.DMC_ORDER_HISTORY_SEARCH || "")
    .toLowerCase()
    .trim();

  return getSortedOrderHistoryOrders().filter((order) => {
    const orderDate = String(order.orderDate || "");

    const matchesStatus = status === "all" || order.status === status;

    const matchesStartDate =
      !window.DMC_ORDER_HISTORY_START_DATE ||
      orderDate >= window.DMC_ORDER_HISTORY_START_DATE;

    const matchesEndDate =
      !window.DMC_ORDER_HISTORY_END_DATE ||
      orderDate <= window.DMC_ORDER_HISTORY_END_DATE;

    const matchesSearch =
      !searchValue ||
      String(order.orderId || "").toLowerCase().includes(searchValue) ||
      String(order.branch || "").toLowerCase().includes(searchValue) ||
      String(order.department || "").toLowerCase().includes(searchValue) ||
      String(order.status || "").toLowerCase().includes(searchValue) ||
      String(order.notes || "").toLowerCase().includes(searchValue) ||
      (order.lines || []).some(
        (line) =>
          String(line.itemId || "").toLowerCase().includes(searchValue) ||
          String(line.itemName || "").toLowerCase().includes(searchValue) ||
          String(line.section || "").toLowerCase().includes(searchValue)
      );

    return matchesStatus && matchesStartDate && matchesEndDate && matchesSearch;
  });
}

function getSelectedOrderHistoryOrder() {
  const orders = getFilteredOrderHistoryOrders();

  if (window.DMC_ORDER_HISTORY_SELECTED_ID) {
    const selectedOrder = orders.find(
      (order) => order.orderId === window.DMC_ORDER_HISTORY_SELECTED_ID
    );

    if (selectedOrder) {
      return selectedOrder;
    }
  }

  return orders[0] || null;
}

function getOrderHistorySummary() {
  const orders = getStoredOrderHistoryOrders();

  return {
    total: orders.length,
    submitted: orders.filter((order) => order.status === "Submitted").length,
    accepted: orders.filter((order) => order.status === "Accepted").length,
    fulfilling: orders.filter((order) => order.status === "Being Fulfilled")
      .length,
    urgent: orders.filter((order) => order.urgent).length
  };
}

function getOrderHistoryStatusBadgeClass(status) {
  if (status === "Submitted") return "warning-badge";
  if (status === "Accepted") return "info-badge";
  if (status === "Being Fulfilled") return "";
  if (status === "Rejected") return "danger-badge";
  if (status === "On the Way") return "info-badge";
  if (status === "Completed") return "";
  if (status === "Variance") return "danger-badge";
  return "";
}

function renderOrderHistoryStatusOptions() {
  const selectedStatus = window.DMC_ORDER_HISTORY_SELECTED_STATUS;

  const statuses = [
    "Submitted",
    "Accepted",
    "Being Fulfilled",
    "On the Way",
    "Completed",
    "Variance",
    "Rejected"
  ];

  return `
    <option value="all" ${selectedStatus === "all" ? "selected" : ""}>
      All Orders
    </option>
    ${statuses
      .map(
        (status) => `
          <option value="${status}" ${selectedStatus === status ? "selected" : ""}>
            ${status}
          </option>
        `
      )
      .join("")}
  `;
}

function renderOrderHistoryList() {
  const orders = getFilteredOrderHistoryOrders();
  const selectedOrder = getSelectedOrderHistoryOrder();

  if (orders.length === 0) {
    return `
      <div class="order-list-empty">
        <p>No orders found.</p>
        <span>Submitted orders will appear here after Place Order.</span>
      </div>
    `;
  }

  return `
    <div class="branch-order-list">
      ${orders
        .map((order) => {
          const latestStatus =
            order.statusHistory?.[order.statusHistory.length - 1];

          return `
            <button
              class="branch-order-list-item ${
                selectedOrder?.orderId === order.orderId ? "active" : ""
              }"
              data-select-order-history="${order.orderId}"
            >
              <div>
                <strong>${order.orderId}</strong>
                <p>${order.department || "-"} • ${(order.lines || []).length} item(s)</p>
                <span>
                  Last update:
                  ${formatOrderHistoryDateTime(latestStatus?.timestamp || order.orderDate)}
                </span>
              </div>

              <div class="branch-order-list-meta">
                ${
                  order.urgent
                    ? `<span class="badge danger-badge">Urgent</span>`
                    : ""
                }
                <span class="badge ${getOrderHistoryStatusBadgeClass(order.status)}">
                  ${order.status || "Submitted"}
                </span>
              </div>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderOrderStatusTracker(order) {
  const currentStatus = order?.status || "Submitted";

  const steps = [
    "Submitted",
    "Accepted",
    "Being Fulfilled",
    "On the Way",
    "Completed"
  ];

  const currentIndex = steps.indexOf(currentStatus);

  return `
    <div class="order-status-tracker">
      ${steps
        .map((step, index) => {
          const isDone = currentIndex >= index && currentIndex !== -1;
          const isCurrent = currentStatus === step;

          return `
            <div class="order-status-step ${isDone ? "done" : ""} ${
            isCurrent ? "current" : ""
          }">
              <span>${index + 1}</span>
              <p>${step}</p>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderOrderHistoryLines(order) {
  if (!order || !order.lines || order.lines.length === 0) {
    return `
      <p class="submit-preview-empty">
        No requested items found.
      </p>
    `;
  }

  return `
    <div class="selected-order-lines">
      ${order.lines
        .map(
          (line) => `
            <div class="selected-order-line">
              <div>
                <p class="eyebrow">${line.section || "Item"}</p>
                <strong>${line.itemName}</strong>
                <span>${line.itemId}</span>
              </div>

              <div class="selected-order-line-qty">
                <strong>${line.requestedQty}</strong>
                <span>${line.unit}</span>
              </div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderOrderHistoryStatusHistory(order) {
  if (!order || !order.statusHistory || order.statusHistory.length === 0) {
    return `
      <p class="submit-preview-empty">
        No status history yet.
      </p>
    `;
  }

  return `
    <div class="status-history-list">
      ${order.statusHistory
        .map(
          (event) => `
            <div class="status-history-item">
              <span class="badge ${getOrderHistoryStatusBadgeClass(event.status)}">
                ${event.status}
              </span>
              <div>
                <strong>${formatOrderHistoryDateTime(event.timestamp)}</strong>
                <p>${event.note || "-"}</p>
              </div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderSelectedOrderHistoryDetail() {
  const order = getSelectedOrderHistoryOrder();

  if (!order) {
    return `
      <section class="panel branch-order-detail">
        <div class="order-list-empty">
          <p>No order selected.</p>
          <span>Select an order from the left panel.</span>
        </div>
      </section>
    `;
  }

  const latestStatus = order.statusHistory?.[order.statusHistory.length - 1];

  return `
    <section class="panel branch-order-detail">
      <div class="panel-header">
        <div>
          <h3>${order.orderId}</h3>
          <p>
            ${order.branch || "DMC-Iriga Branch"} • ${order.department || "-"}
          </p>
        </div>

        <div class="branch-order-list-meta">
          ${
            order.urgent
              ? `<span class="badge danger-badge">Urgent</span>`
              : ""
          }
          <span class="badge ${getOrderHistoryStatusBadgeClass(order.status)}">
            ${order.status || "Submitted"}
          </span>
        </div>
      </div>

      <div class="branch-order-info-grid">
        <div>
          <p class="eyebrow">Order Date</p>
          <strong>${order.orderDate || "-"}</strong>
        </div>

        <div>
          <p class="eyebrow">Last Update</p>
          <strong>${formatOrderHistoryDateTime(latestStatus?.timestamp)}</strong>
        </div>

        <div>
          <p class="eyebrow">Items</p>
          <strong>${(order.lines || []).length}</strong>
        </div>

        <div>
          <p class="eyebrow">Notes</p>
          <strong>${order.notes || "-"}</strong>
        </div>
      </div>

      <div class="branch-order-section">
        <h4>Status Tracker</h4>
        ${renderOrderStatusTracker(order)}
      </div>

      <div class="branch-order-section">
        <h4>Requested Items</h4>
        ${renderOrderHistoryLines(order)}
      </div>

      <div class="branch-order-section">
        <h4>Status History</h4>
        ${renderOrderHistoryStatusHistory(order)}
      </div>
    </section>
  `;
}

function getOrderHistoryContent() {
  const summary = getOrderHistorySummary();

  return `
    <section class="grid">
      <div class="card">
        <p>Total Orders</p>
        <strong>${summary.total}</strong>
      </div>

      <div class="card">
        <p>Submitted</p>
        <strong>${summary.submitted}</strong>
      </div>

      <div class="card">
        <p>Accepted</p>
        <strong>${summary.accepted}</strong>
      </div>

      <div class="card">
        <p>Being Fulfilled</p>
        <strong>${summary.fulfilling}</strong>
      </div>
    </section>

    <section class="branch-orders-layout">
      <section class="panel branch-order-list-panel">
        <div class="panel-header">
          <div>
            <h3>Order History</h3>
            <p>Track branch requests and commissary status updates.</p>
          </div>

          <select id="order-history-status-filter">
            ${renderOrderHistoryStatusOptions()}
          </select>
        </div>

        <div class="filter-bar branch-order-search-bar order-history-filter-bar">
          <label>
            Start Date
            <input
              id="order-history-start-date"
              type="date"
              value="${window.DMC_ORDER_HISTORY_START_DATE}"
            />
          </label>

          <label>
            End Date
            <input
              id="order-history-end-date"
              type="date"
              value="${window.DMC_ORDER_HISTORY_END_DATE}"
            />
          </label>

          <label class="filter-search">
            Search
            <input
              id="order-history-search"
              type="text"
              placeholder="Search order, item, status..."
              value="${window.DMC_ORDER_HISTORY_SEARCH}"
            />
          </label>

          <div class="ledger-quick-actions">
            <button class="ghost-button" id="order-history-today-filter">Today</button>
            <button class="ghost-button" id="order-history-month-filter">This Month</button>
            <button class="ghost-button" id="order-history-clear-filter">Clear</button>
          </div>
        </div>

        ${renderOrderHistoryList()}
      </section>

      ${renderSelectedOrderHistoryDetail()}
    </section>
  `;
}

function refreshOrderHistoryPage() {
  window.DMC_PAGES["order-history"].content = getOrderHistoryContent();
  renderPage("order-history");
}

function setupOrderHistoryEvents() {
  const statusFilter = document.getElementById("order-history-status-filter");
  const searchInput = document.getElementById("order-history-search");
  const startDateInput = document.getElementById("order-history-start-date");
  const endDateInput = document.getElementById("order-history-end-date");
  const todayButton = document.getElementById("order-history-today-filter");
  const monthButton = document.getElementById("order-history-month-filter");
  const clearButton = document.getElementById("order-history-clear-filter");

  if (statusFilter) {
    statusFilter.addEventListener("change", () => {
      window.DMC_ORDER_HISTORY_SELECTED_STATUS = statusFilter.value;
      window.DMC_ORDER_HISTORY_SELECTED_ID = "";
      refreshOrderHistoryPage();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("change", () => {
      window.DMC_ORDER_HISTORY_SEARCH = searchInput.value;
      window.DMC_ORDER_HISTORY_SELECTED_ID = "";
      refreshOrderHistoryPage();
    });
  }

  if (startDateInput) {
    startDateInput.addEventListener("change", () => {
      window.DMC_ORDER_HISTORY_START_DATE = startDateInput.value;
      window.DMC_ORDER_HISTORY_SELECTED_ID = "";
      refreshOrderHistoryPage();
    });
  }

  if (endDateInput) {
    endDateInput.addEventListener("change", () => {
      window.DMC_ORDER_HISTORY_END_DATE = endDateInput.value;
      window.DMC_ORDER_HISTORY_SELECTED_ID = "";
      refreshOrderHistoryPage();
    });
  }

  if (todayButton) {
    todayButton.addEventListener("click", () => {
      const today = getTodayOrderHistoryDate();

      window.DMC_ORDER_HISTORY_START_DATE = today;
      window.DMC_ORDER_HISTORY_END_DATE = today;
      window.DMC_ORDER_HISTORY_SELECTED_ID = "";

      refreshOrderHistoryPage();
    });
  }

  if (monthButton) {
    monthButton.addEventListener("click", () => {
      window.DMC_ORDER_HISTORY_START_DATE = getMonthStartOrderHistoryDate();
      window.DMC_ORDER_HISTORY_END_DATE = getTodayOrderHistoryDate();
      window.DMC_ORDER_HISTORY_SELECTED_ID = "";

      refreshOrderHistoryPage();
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      window.DMC_ORDER_HISTORY_SELECTED_STATUS = "all";
      window.DMC_ORDER_HISTORY_SEARCH = "";
      window.DMC_ORDER_HISTORY_START_DATE = "";
      window.DMC_ORDER_HISTORY_END_DATE = "";
      window.DMC_ORDER_HISTORY_SELECTED_ID = "";

      refreshOrderHistoryPage();
    });
  }

  document.querySelectorAll("[data-select-order-history]").forEach((button) => {
    button.addEventListener("click", () => {
      window.DMC_ORDER_HISTORY_SELECTED_ID =
        button.dataset.selectOrderHistory;

      refreshOrderHistoryPage();
    });
  });
}

window.DMC_PAGES["order-history"] = {
  eyebrow: "DMC-Iriga Branch",
  title: "Order History",
  description:
    "Track submitted branch orders and commissary fulfillment status updates.",
  content: getOrderHistoryContent(),
  afterRender: setupOrderHistoryEvents
};
