window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_ORDER_HISTORY_STORAGE_KEY = "dmc_branch_orders";

window.DMC_ORDER_HISTORY_SELECTED_STATUS =
  window.DMC_ORDER_HISTORY_SELECTED_STATUS || "open";

window.DMC_ORDER_HISTORY_SELECTED_LINE_DEPARTMENT =
  window.DMC_ORDER_HISTORY_SELECTED_LINE_DEPARTMENT || "all";

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
    const parsedOrders = JSON.parse(storedOrders);

    if (!Array.isArray(parsedOrders)) {
      return [];
    }

    return parsedOrders;
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

  if (order.receiving?.receivedAt) {
    return new Date(order.receiving.receivedAt).getTime();
  }

  if (order.fulfillment?.sentAt) {
    return new Date(order.fulfillment.sentAt).getTime();
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

function isOpenOrderHistoryStatus(status) {
  return [
    "Submitted",
    "Accepted",
    "Being Fulfilled",
    "On the Way",
    "Variance"
  ].includes(status || "Submitted");
}

function getFilteredOrderHistoryOrders() {
  const status = window.DMC_ORDER_HISTORY_SELECTED_STATUS;

  return getSortedOrderHistoryOrders().filter((order) => {
    const orderDate = String(order.orderDate || "");
    const orderStatus = order.status || "Submitted";

    const matchesStatus =
      status === "all" ||
      (status === "open" && isOpenOrderHistoryStatus(orderStatus)) ||
      orderStatus === status;

    const matchesStartDate =
      !window.DMC_ORDER_HISTORY_START_DATE ||
      orderDate >= window.DMC_ORDER_HISTORY_START_DATE;

    const matchesEndDate =
      !window.DMC_ORDER_HISTORY_END_DATE ||
      orderDate <= window.DMC_ORDER_HISTORY_END_DATE;

    return matchesStatus && matchesStartDate && matchesEndDate;
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
    open: orders.filter((order) => isOpenOrderHistoryStatus(order.status)).length,
    submitted: orders.filter((order) => order.status === "Submitted").length,
    accepted: orders.filter((order) => order.status === "Accepted").length,
    fulfilling: orders.filter((order) => order.status === "Being Fulfilled")
      .length,
    onTheWay: orders.filter((order) => order.status === "On the Way").length,
    completed: orders.filter((order) => order.status === "Completed").length,
    variance: orders.filter((order) => order.status === "Variance").length
  };
}

function getOrderHistoryStatusBadgeClass(status) {
  if (status === "Submitted") return "warning-badge";
  if (status === "Accepted") return "info-badge";
  if (status === "Being Fulfilled") return "";
  if (status === "Rejected") return "danger-badge";
  if (status === "On the Way") return "info-badge";
  if (status === "Completed") return "success";
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
    <option value="open" ${selectedStatus === "open" ? "selected" : ""}>
      Open Orders
    </option>
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
        <span>Open branch orders will appear here. Use filters to view completed history.</span>
      </div>
    `;
  }

  return `
    <div class="branch-order-list order-history-scroll-list">
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

function getOrderHistoryLineDepartment(line, order) {
  return line.department || order.department || "Unassigned";
}

function getOrderHistoryLineDepartments(order) {
  return [
    ...new Set(
      (order.lines || [])
        .map((line) => getOrderHistoryLineDepartment(line, order))
        .filter(Boolean)
    )
  ].sort();
}

function renderOrderHistoryLineDepartmentOptions(order) {
  const selectedDepartment =
    window.DMC_ORDER_HISTORY_SELECTED_LINE_DEPARTMENT || "all";

  return `
    <option value="all" ${selectedDepartment === "all" ? "selected" : ""}>
      All Departments
    </option>
    ${getOrderHistoryLineDepartments(order)
      .map(
        (department) => `
          <option value="${department}" ${
          selectedDepartment === department ? "selected" : ""
        }>
            ${department}
          </option>
        `
      )
      .join("")}
  `;
}

function getFilteredOrderHistoryLines(order) {
  const selectedDepartment =
    window.DMC_ORDER_HISTORY_SELECTED_LINE_DEPARTMENT || "all";

  return (order.lines || []).filter((line) => {
    const lineDepartment = getOrderHistoryLineDepartment(line, order);

    return selectedDepartment === "all" || lineDepartment === selectedDepartment;
  });
}

function getOrderHistorySentQty(order, line) {
  const sentQty = Number(
    order.fulfillment?.lines?.[line.itemId]?.sentQty ??
      line.sentQty ??
      line.requestedQty ??
      0
  );

  return Number.isNaN(sentQty) ? 0 : sentQty;
}

function getOrderHistoryReceivedQty(order, line) {
  const receivingLine = order.receiving?.lines?.[line.itemId];

  if (!receivingLine) {
    return "";
  }

  const receivedQty = Number(receivingLine.receivedQty ?? "");

  return Number.isNaN(receivedQty) ? "" : receivedQty;
}

function getOrderHistoryLineCondition(order, line) {
  return order.receiving?.lines?.[line.itemId]?.condition || "-";
}

function getOrderHistoryLineStatus(order, line) {
  const requestedQty = Number(line.requestedQty || 0);
  const sentQty = getOrderHistorySentQty(order, line);
  const receivedQty = getOrderHistoryReceivedQty(order, line);
  const condition = getOrderHistoryLineCondition(order, line);

  if (order.status === "Rejected") {
    return "Rejected";
  }

  if (receivedQty !== "") {
    if (receivedQty !== sentQty || condition !== "Good") {
      return "Variance";
    }

    return "Received";
  }

  if (order.status === "On the Way") {
    return "On the Way";
  }

  if (order.status === "Being Fulfilled") {
    return "Preparing";
  }

  if (sentQty > 0 && sentQty < requestedQty) {
    return "Partial";
  }

  return order.status || "Submitted";
}

function getOrderHistoryLineBadgeClass(status) {
  if (status === "Received") return "success";
  if (status === "On the Way") return "info-badge";
  if (status === "Preparing") return "";
  if (status === "Partial") return "warning-badge";
  if (status === "Variance") return "danger-badge";
  if (status === "Rejected") return "danger-badge";
  if (status === "Submitted") return "warning-badge";
  return "";
}

function renderOrderHistoryLines(order) {
  if (!order || !order.lines || order.lines.length === 0) {
    return `
      <p class="submit-preview-empty">
        No requested items found.
      </p>
    `;
  }

  const filteredLines = getFilteredOrderHistoryLines(order);

  if (filteredLines.length === 0) {
    return `
      <p class="submit-preview-empty">
        No order lines match the selected department.
      </p>
    `;
  }

  return `
    <div class="table-wrap order-history-lines-scroll">
      <table>
        <thead>
          <tr>
            <th>Department</th>
            <th>Section</th>
            <th>Item ID</th>
            <th>Item Name</th>
            <th>Requested</th>
            <th>Sent</th>
            <th>Received</th>
            <th>Variance</th>
            <th>Unit</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          ${filteredLines
            .map((line) => {
              const requestedQty = Number(line.requestedQty || 0);
              const sentQty = getOrderHistorySentQty(order, line);
              const receivedQty = getOrderHistoryReceivedQty(order, line);
              const hasReceivedQty = receivedQty !== "";
              const variance = hasReceivedQty ? receivedQty - sentQty : "-";
              const lineStatus = getOrderHistoryLineStatus(order, line);

              return `
                <tr>
                  <td>${getOrderHistoryLineDepartment(line, order)}</td>
                  <td>${line.section || "-"}</td>
                  <td>${line.itemId || "-"}</td>
                  <td>${line.itemName || "-"}</td>
                  <td>${requestedQty}</td>
                  <td>${sentQty || "-"}</td>
                  <td>${hasReceivedQty ? receivedQty : "-"}</td>
                  <td>
                    <span class="${
                      variance !== "-" && variance !== 0 ? "danger-text" : ""
                    }">
                      ${variance}
                    </span>
                  </td>
                  <td>${line.unit || "-"}</td>
                  <td>
                    <span class="badge ${getOrderHistoryLineBadgeClass(lineStatus)}">
                      ${lineStatus}
                    </span>
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
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
    <div class="status-history-list order-history-status-scroll">
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

function renderOrderHistoryNotes(order) {
  const branchNotes = order.notes || "-";
  const warehouseNotes = order.fulfillment?.deliveryNotes || "-";
  const receivingNotes = order.receiving?.receivingNotes || "-";

  return `
    <div class="branch-order-section">
      <h4>Notes</h4>

      <div class="instruction-box">
        <strong>Branch Request Notes:</strong>
        <span>${branchNotes}</span>
      </div>

      <div class="instruction-box">
        <strong>Warehouse Fulfillment Notes:</strong>
        <span>${warehouseNotes}</span>
      </div>

      <div class="instruction-box">
        <strong>Branch Receiving Notes:</strong>
        <span>${receivingNotes}</span>
      </div>
    </div>
  `;
}

function renderSelectedOrderHistoryDetail() {
  const order = getSelectedOrderHistoryOrder();

  if (!order) {
    return `
      <section class="panel branch-order-detail order-history-detail-scroll">
        <div class="order-list-empty">
          <p>No order selected.</p>
          <span>Select an order from the left panel.</span>
        </div>
      </section>
    `;
  }

  const latestStatus = order.statusHistory?.[order.statusHistory.length - 1];

  return `
    <section class="panel branch-order-detail order-history-detail-scroll">
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
          <p class="eyebrow">Requested By</p>
          <strong>${order.requestedBy || "-"}</strong>
        </div>

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
          <p class="eyebrow">Prepared By</p>
          <strong>${order.fulfillment?.preparedBy || "-"}</strong>
        </div>

        <div>
          <p class="eyebrow">Received By</p>
          <strong>${order.receiving?.receivedBy || "-"}</strong>
        </div>
      </div>

      <div class="branch-order-section">
        <h4>Status Tracker</h4>
        ${renderOrderStatusTracker(order)}
      </div>

      <div class="branch-order-section">
        <div class="order-lines-filter-header">
          <div>
            <h4>Order Lines</h4>
            <p>Filter long orders by department.</p>
          </div>

          <label>
            Department
            <select id="order-history-line-department-filter">
              ${renderOrderHistoryLineDepartmentOptions(order)}
            </select>
          </label>
        </div>

        ${renderOrderHistoryLines(order)}
      </div>

      ${renderOrderHistoryNotes(order)}

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
        <p>Open Orders</p>
        <strong>${summary.open}</strong>
        <span>default view</span>
      </div>

      <div class="card">
        <p>On the Way</p>
        <strong>${summary.onTheWay}</strong>
        <span>waiting for receipt</span>
      </div>

      <div class="card">
        <p>Variance</p>
        <strong>${summary.variance}</strong>
        <span>needs review</span>
      </div>

      <div class="card">
        <p>Completed</p>
        <strong>${summary.completed}</strong>
        <span>hidden by default</span>
      </div>
    </section>

    <section class="branch-orders-layout order-history-layout">
      <section class="panel branch-order-list-panel order-history-list-panel">
        <div class="panel-header">
          <div>
            <h3>Order History</h3>
            <p>
              Default view shows open orders only. Use filters to view completed history.
            </p>
          </div>

          <span class="badge">Order Filters</span>
        </div>

        <div class="filter-bar branch-order-search-bar order-history-filter-bar order-history-left-filter-clean">
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

          <label>
            Status
            <select id="order-history-status-filter">
              ${renderOrderHistoryStatusOptions()}
            </select>
          </label>

          <div class="ledger-quick-actions order-history-shortcuts">
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
  const lineDepartmentFilter = document.getElementById(
    "order-history-line-department-filter"
  );
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

  if (lineDepartmentFilter) {
    lineDepartmentFilter.addEventListener("change", () => {
      window.DMC_ORDER_HISTORY_SELECTED_LINE_DEPARTMENT =
        lineDepartmentFilter.value;

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
      window.DMC_ORDER_HISTORY_SELECTED_STATUS = "open";
      window.DMC_ORDER_HISTORY_SELECTED_LINE_DEPARTMENT = "all";
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
      window.DMC_ORDER_HISTORY_SELECTED_LINE_DEPARTMENT = "all";

      refreshOrderHistoryPage();
    });
  });
}

window.DMC_PAGES["order-history"] = {
  eyebrow: "DMC-Iriga Branch",
  title: "Order History",
  description:
    "Track submitted branch orders and warehouse fulfillment status updates.",
  getContent: getOrderHistoryContent,
  content: getOrderHistoryContent(),
  afterRender: setupOrderHistoryEvents
};
