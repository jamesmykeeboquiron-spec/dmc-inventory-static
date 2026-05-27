window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_BRANCH_ORDERS_STORAGE_KEY = "dmc_branch_orders";

window.DMC_BRANCH_ORDERS_SELECTED_STATUS =
  window.DMC_BRANCH_ORDERS_SELECTED_STATUS || "all";

window.DMC_BRANCH_ORDERS_SEARCH = window.DMC_BRANCH_ORDERS_SEARCH || "";

window.DMC_BRANCH_ORDERS_SELECTED_ID =
  window.DMC_BRANCH_ORDERS_SELECTED_ID || "";

function getStoredBranchOrdersForCommissary() {
  const storedOrders = localStorage.getItem(DMC_BRANCH_ORDERS_STORAGE_KEY);

  if (!storedOrders) {
    return [];
  }

  try {
    return JSON.parse(storedOrders);
  } catch {
    return [];
  }
}

function saveBranchOrdersForCommissary(orders) {
  localStorage.setItem(DMC_BRANCH_ORDERS_STORAGE_KEY, JSON.stringify(orders));
}

function formatOrderDateTime(value) {
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

function getOrderTimestamp(order) {
  const historyTime = order.statusHistory?.[0]?.timestamp;

  if (historyTime) {
    return new Date(historyTime).getTime();
  }

  if (order.orderDate) {
    return new Date(order.orderDate).getTime();
  }

  return 0;
}

function getSortedBranchOrders() {
  return [...getStoredBranchOrdersForCommissary()].sort(
    (a, b) => getOrderTimestamp(b) - getOrderTimestamp(a)
  );
}

function getFilteredBranchOrders() {
  const status = window.DMC_BRANCH_ORDERS_SELECTED_STATUS;
  const searchValue = String(window.DMC_BRANCH_ORDERS_SEARCH || "")
    .toLowerCase()
    .trim();

  return getSortedBranchOrders().filter((order) => {
    const matchesStatus = status === "all" || order.status === status;

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

    return matchesStatus && matchesSearch;
  });
}

function getSelectedBranchOrder() {
  const orders = getFilteredBranchOrders();

  if (window.DMC_BRANCH_ORDERS_SELECTED_ID) {
    const selectedOrder = orders.find(
      (order) => order.orderId === window.DMC_BRANCH_ORDERS_SELECTED_ID
    );

    if (selectedOrder) {
      return selectedOrder;
    }
  }

  return orders[0] || null;
}

function getBranchOrdersSummary() {
  const orders = getStoredBranchOrdersForCommissary();

  return {
    total: orders.length,
    submitted: orders.filter((order) => order.status === "Submitted").length,
    urgent: orders.filter((order) => order.urgent).length,
    accepted: orders.filter((order) => order.status === "Accepted").length,
    fulfilling: orders.filter((order) => order.status === "Being Fulfilled")
      .length
  };
}

function getOrderStatusBadgeClass(status) {
  if (status === "Submitted") return "warning-badge";
  if (status === "Accepted") return "info-badge";
  if (status === "Being Fulfilled") return "";
  if (status === "Rejected") return "danger-badge";
  return "";
}

function renderBranchOrderStatusOptions() {
  const selectedStatus = window.DMC_BRANCH_ORDERS_SELECTED_STATUS;

  const statuses = ["Submitted", "Accepted", "Being Fulfilled", "Rejected"];

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

function renderBranchOrderList() {
  const orders = getFilteredBranchOrders();
  const selectedOrder = getSelectedBranchOrder();

  if (orders.length === 0) {
    return `
      <div class="order-list-empty">
        <p>No branch orders found.</p>
        <span>Submitted branch orders will appear here.</span>
      </div>
    `;
  }

  return `
    <div class="branch-order-list">
      ${orders
        .map(
          (order) => `
            <button
              class="branch-order-list-item ${
                selectedOrder?.orderId === order.orderId ? "active" : ""
              }"
              data-select-branch-order="${order.orderId}"
            >
              <div>
                <strong>${order.orderId}</strong>
                <p>${order.branch || "-"} • ${order.department || "-"}</p>
                <span>${order.orderDate || "-"} • ${(order.lines || []).length} item(s)</span>
              </div>

              <div class="branch-order-list-meta">
                ${
                  order.urgent
                    ? `<span class="badge danger-badge">Urgent</span>`
                    : ""
                }
                <span class="badge ${getOrderStatusBadgeClass(order.status)}">
                  ${order.status || "Submitted"}
                </span>
              </div>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderSelectedOrderLines(order) {
  if (!order || !order.lines || order.lines.length === 0) {
    return `
      <p class="submit-preview-empty">
        No order lines found for this order.
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

function renderStatusHistory(order) {
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
              <span class="badge ${getOrderStatusBadgeClass(event.status)}">
                ${event.status}
              </span>
              <div>
                <strong>${formatOrderDateTime(event.timestamp)}</strong>
                <p>${event.note || "-"}</p>
              </div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function canAcceptOrder(order) {
  return order && order.status === "Submitted";
}

function canStartFulfillment(order) {
  return order && order.status === "Accepted";
}

function canRejectOrder(order) {
  return order && ["Submitted", "Accepted"].includes(order.status);
}

function renderSelectedBranchOrder() {
  const order = getSelectedBranchOrder();

  if (!order) {
    return `
      <section class="panel branch-order-detail">
        <div class="order-list-empty">
          <p>No order selected.</p>
          <span>Select a submitted order from the list.</span>
        </div>
      </section>
    `;
  }

  return `
    <section class="panel branch-order-detail">
      <div class="panel-header">
        <div>
          <h3>${order.orderId}</h3>
          <p>
            ${order.branch || "-"} • ${order.department || "-"} • ${order.orderDate || "-"}
          </p>
        </div>

        <div class="branch-order-list-meta">
          ${
            order.urgent
              ? `<span class="badge danger-badge">Urgent</span>`
              : ""
          }
          <span class="badge ${getOrderStatusBadgeClass(order.status)}">
            ${order.status || "Submitted"}
          </span>
        </div>
      </div>

      <div class="branch-order-info-grid">
        <div>
          <p class="eyebrow">Branch</p>
          <strong>${order.branch || "-"}</strong>
        </div>

        <div>
          <p class="eyebrow">Requested</p>
          <strong>${order.orderDate || "-"}</strong>
        </div>

        <div>
          <p class="eyebrow">Department</p>
          <strong>${order.department || "-"}</strong>
        </div>

        <div>
          <p class="eyebrow">Order Notes</p>
          <strong>${order.notes || "-"}</strong>
        </div>
      </div>

      <div class="branch-order-section">
        <h4>Requested Items</h4>
        ${renderSelectedOrderLines(order)}
      </div>

      <div class="branch-order-section">
        <h4>Status History</h4>
        ${renderStatusHistory(order)}
      </div>

      <div class="form-actions branch-order-actions">
        <button
          class="primary-button"
          id="accept-branch-order"
          ${canAcceptOrder(order) ? "" : "disabled"}
        >
          Accept Order
        </button>

        <button
          class="ghost-button"
          id="start-fulfillment-order"
          ${canStartFulfillment(order) ? "" : "disabled"}
        >
          Start Fulfillment
        </button>

        <button
          class="ghost-button danger"
          id="reject-branch-order"
          ${canRejectOrder(order) ? "" : "disabled"}
        >
          Reject
        </button>
      </div>
    </section>
  `;
}

function getBranchOrdersContent() {
  const summary = getBranchOrdersSummary();

  return `
    <section class="grid">
      <div class="card">
        <p>Total Branch Orders</p>
        <strong>${summary.total}</strong>
      </div>

      <div class="card">
        <p>Submitted</p>
        <strong>${summary.submitted}</strong>
      </div>

      <div class="card">
        <p>Urgent</p>
        <strong>${summary.urgent}</strong>
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
            <h3>Branch Orders</h3>
            <p>Submitted branch requests waiting for commissary review.</p>
          </div>

          <select id="branch-order-status-filter">
            ${renderBranchOrderStatusOptions()}
          </select>
        </div>

        <div class="filter-bar branch-order-search-bar">
          <label class="filter-search">
            Search
            <input
              id="branch-order-search"
              type="text"
              placeholder="Search order, branch, item, status..."
              value="${window.DMC_BRANCH_ORDERS_SEARCH}"
            />
          </label>
        </div>

        ${renderBranchOrderList()}
      </section>

      ${renderSelectedBranchOrder()}
    </section>
  `;
}

function refreshBranchOrdersPage() {
  window.DMC_PAGES["branch-orders"].content = getBranchOrdersContent();
  renderPage("branch-orders");
}

function updateBranchOrderStatus(orderId, nextStatus, note) {
  const orders = getStoredBranchOrdersForCommissary();

  const updatedOrders = orders.map((order) => {
    if (order.orderId !== orderId) {
      return order;
    }

    return {
      ...order,
      status: nextStatus,
      statusHistory: [
        ...(order.statusHistory || []),
        {
          status: nextStatus,
          timestamp: new Date().toISOString(),
          note
        }
      ]
    };
  });

  saveBranchOrdersForCommissary(updatedOrders);
  window.DMC_BRANCH_ORDERS_SELECTED_ID = orderId;
  refreshBranchOrdersPage();
}

function setupBranchOrdersEvents() {
  const statusFilter = document.getElementById("branch-order-status-filter");
  const searchInput = document.getElementById("branch-order-search");

  if (statusFilter) {
    statusFilter.addEventListener("change", () => {
      window.DMC_BRANCH_ORDERS_SELECTED_STATUS = statusFilter.value;
      window.DMC_BRANCH_ORDERS_SELECTED_ID = "";
      refreshBranchOrdersPage();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("change", () => {
      window.DMC_BRANCH_ORDERS_SEARCH = searchInput.value;
      window.DMC_BRANCH_ORDERS_SELECTED_ID = "";
      refreshBranchOrdersPage();
    });
  }

  document.querySelectorAll("[data-select-branch-order]").forEach((button) => {
    button.addEventListener("click", () => {
      window.DMC_BRANCH_ORDERS_SELECTED_ID =
        button.dataset.selectBranchOrder;

      refreshBranchOrdersPage();
    });
  });

  const selectedOrder = getSelectedBranchOrder();

  const acceptButton = document.getElementById("accept-branch-order");
  const fulfillmentButton = document.getElementById("start-fulfillment-order");
  const rejectButton = document.getElementById("reject-branch-order");

  if (acceptButton && selectedOrder) {
    acceptButton.addEventListener("click", () => {
      updateBranchOrderStatus(
        selectedOrder.orderId,
        "Accepted",
        "Commissary accepted the branch order."
      );
    });
  }

  if (fulfillmentButton && selectedOrder) {
    fulfillmentButton.addEventListener("click", () => {
      updateBranchOrderStatus(
        selectedOrder.orderId,
        "Being Fulfilled",
        "Commissary started fulfilling the order."
      );
    });
  }

  if (rejectButton && selectedOrder) {
    rejectButton.addEventListener("click", () => {
      const confirmed = confirm(`Reject order ${selectedOrder.orderId}?`);

      if (!confirmed) {
        return;
      }

      updateBranchOrderStatus(
        selectedOrder.orderId,
        "Rejected",
        "Commissary rejected the branch order."
      );
    });
  }
}

window.DMC_PAGES["branch-orders"] = {
  eyebrow: "Commissary",
  title: "Branch Orders",
  description:
    "Review submitted branch requests and update commissary fulfillment status.",
  content: getBranchOrdersContent(),
  afterRender: setupBranchOrdersEvents
};
