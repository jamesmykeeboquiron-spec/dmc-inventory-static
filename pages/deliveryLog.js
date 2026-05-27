window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_DELIVERY_LOG_ORDERS_STORAGE_KEY = "dmc_branch_orders";
const DMC_DELIVERY_LOG_ISSUES_STORAGE_KEY = "dmc_delivery_issues";

window.DMC_DELIVERY_LOG_STATUS_FILTER =
  window.DMC_DELIVERY_LOG_STATUS_FILTER || "all";

window.DMC_DELIVERY_LOG_SEARCH = window.DMC_DELIVERY_LOG_SEARCH || "";

window.DMC_DELIVERY_LOG_SELECTED_ID =
  window.DMC_DELIVERY_LOG_SELECTED_ID || "";

function getStoredDeliveryLogOrders() {
  const storedOrders = localStorage.getItem(DMC_DELIVERY_LOG_ORDERS_STORAGE_KEY);

  if (!storedOrders) {
    return [];
  }

  try {
    return JSON.parse(storedOrders);
  } catch {
    return [];
  }
}

function getStoredDeliveryLogIssues() {
  const storedIssues = localStorage.getItem(DMC_DELIVERY_LOG_ISSUES_STORAGE_KEY);

  if (!storedIssues) {
    return [];
  }

  try {
    return JSON.parse(storedIssues);
  } catch {
    return [];
  }
}

function formatDeliveryLogDateTime(value) {
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

function getDeliveryLogTimestamp(order) {
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

function getDeliveryLogIssueCount(orderId) {
  return getStoredDeliveryLogIssues().filter(
    (issue) => issue.orderId === orderId
  ).length;
}

function getDeliveryLogIssuesForOrder(orderId) {
  return getStoredDeliveryLogIssues().filter(
    (issue) => issue.orderId === orderId
  );
}

function getDeliveryLogOrders() {
  const statusFilter = window.DMC_DELIVERY_LOG_STATUS_FILTER;
  const searchValue = String(window.DMC_DELIVERY_LOG_SEARCH || "")
    .toLowerCase()
    .trim();

  return getStoredDeliveryLogOrders()
    .filter((order) =>
      ["On the Way", "Completed", "Variance"].includes(order.status)
    )
    .filter((order) => {
      const matchesStatus =
        statusFilter === "all" || order.status === statusFilter;

      const issueCount = getDeliveryLogIssueCount(order.orderId);

      const matchesSearch =
        !searchValue ||
        String(order.orderId || "").toLowerCase().includes(searchValue) ||
        String(order.branch || "").toLowerCase().includes(searchValue) ||
        String(order.department || "").toLowerCase().includes(searchValue) ||
        String(order.status || "").toLowerCase().includes(searchValue) ||
        String(order.fulfillment?.driver || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(order.fulfillment?.preparedBy || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(order.receiving?.receivedBy || "")
          .toLowerCase()
          .includes(searchValue) ||
        (order.lines || []).some(
          (line) =>
            String(line.itemId || "").toLowerCase().includes(searchValue) ||
            String(line.itemName || "").toLowerCase().includes(searchValue) ||
            String(line.section || "").toLowerCase().includes(searchValue)
        ) ||
        String(issueCount).includes(searchValue);

      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => getDeliveryLogTimestamp(b) - getDeliveryLogTimestamp(a));
}

function getSelectedDeliveryLogOrder() {
  const orders = getDeliveryLogOrders();

  if (window.DMC_DELIVERY_LOG_SELECTED_ID) {
    const selectedOrder = orders.find(
      (order) => order.orderId === window.DMC_DELIVERY_LOG_SELECTED_ID
    );

    if (selectedOrder) {
      return selectedOrder;
    }
  }

  return orders[0] || null;
}

function getDeliveryLogSummary() {
  const deliveryOrders = getStoredDeliveryLogOrders().filter((order) =>
    ["On the Way", "Completed", "Variance"].includes(order.status)
  );

  return {
    total: deliveryOrders.length,
    onTheWay: deliveryOrders.filter((order) => order.status === "On the Way")
      .length,
    completed: deliveryOrders.filter((order) => order.status === "Completed")
      .length,
    variance: deliveryOrders.filter((order) => order.status === "Variance")
      .length
  };
}

function getDeliveryLogStatusBadgeClass(status) {
  if (status === "On the Way") return "info-badge";
  if (status === "Completed") return "";
  if (status === "Variance") return "warning-badge";
  return "";
}

function renderDeliveryLogStatusOptions() {
  const current = window.DMC_DELIVERY_LOG_STATUS_FILTER;
  const statuses = ["On the Way", "Completed", "Variance"];

  return `
    <option value="all" ${current === "all" ? "selected" : ""}>All Deliveries</option>
    ${statuses
      .map(
        (status) => `
          <option value="${status}" ${current === status ? "selected" : ""}>
            ${status}
          </option>
        `
      )
      .join("")}
  `;
}

function renderDeliveryLogList() {
  const orders = getDeliveryLogOrders();
  const selectedOrder = getSelectedDeliveryLogOrder();

  if (orders.length === 0) {
    return `
      <div class="order-list-empty">
        <p>No delivery records found.</p>
        <span>Orders marked On the Way, Completed, or Variance will appear here.</span>
      </div>
    `;
  }

  return `
    <div class="delivery-log-list">
      ${orders
        .map((order) => {
          const issueCount = getDeliveryLogIssueCount(order.orderId);

          return `
            <button
              class="delivery-log-list-item ${
                selectedOrder?.orderId === order.orderId ? "active" : ""
              }"
              data-select-delivery-log="${order.orderId}"
            >
              <div>
                <strong>${order.orderId}</strong>
                <p>${order.branch || "DMC-Iriga Branch"} • ${order.department || "-"}</p>
                <span>
                  Sent: ${formatDeliveryLogDateTime(order.fulfillment?.sentAt)}
                </span>
              </div>

              <div class="delivery-log-list-meta">
                ${
                  issueCount
                    ? `<span class="badge warning-badge">${issueCount} Issue(s)</span>`
                    : ""
                }
                <span class="badge ${getDeliveryLogStatusBadgeClass(order.status)}">
                  ${order.status || "-"}
                </span>
              </div>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function getDeliveryLogSentTotal(order) {
  return (order.lines || []).reduce((total, line) => {
    const sentQty = Number(
      order.fulfillment?.lines?.[line.itemId]?.sentQty ??
        line.requestedQty ??
        0
    );

    return total + (Number.isNaN(sentQty) ? 0 : sentQty);
  }, 0);
}

function getDeliveryLogReceivedTotal(order) {
  const receivingLines = order.receiving?.lines || {};

  return (order.lines || []).reduce((total, line) => {
    const receivedQty = Number(receivingLines[line.itemId]?.receivedQty || 0);

    return total + (Number.isNaN(receivedQty) ? 0 : receivedQty);
  }, 0);
}

function renderDeliveryLogLines(order) {
  if (!order || !order.lines || order.lines.length === 0) {
    return `
      <p class="submit-preview-empty">No delivery lines found.</p>
    `;
  }

  const receivingLines = order.receiving?.lines || {};

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Section</th>
            <th>Item ID</th>
            <th>Item Name</th>
            <th>Sent Qty</th>
            <th>Received Qty</th>
            <th>Variance</th>
            <th>Unit</th>
            <th>Condition</th>
          </tr>
        </thead>

        <tbody>
          ${order.lines
            .map((line) => {
              const sentQty = Number(
                order.fulfillment?.lines?.[line.itemId]?.sentQty ??
                  line.requestedQty ??
                  0
              );

              const receivedQty = Number(
                receivingLines[line.itemId]?.receivedQty ?? ""
              );

              const hasReceivedQty = !Number.isNaN(receivedQty);
              const displayedReceivedQty = hasReceivedQty ? receivedQty : "-";
              const variance = hasReceivedQty ? receivedQty - sentQty : "-";
              const condition = receivingLines[line.itemId]?.condition || "-";

              return `
                <tr>
                  <td>${line.section || "-"}</td>
                  <td>${line.itemId || "-"}</td>
                  <td>${line.itemName || "-"}</td>
                  <td>${sentQty}</td>
                  <td>${displayedReceivedQty}</td>
                  <td>
                    <span class="${variance !== 0 && variance !== "-" ? "danger-text" : ""}">
                      ${variance}
                    </span>
                  </td>
                  <td>${line.unit || "-"}</td>
                  <td>${condition}</td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderDeliveryLogIssues(order) {
  const issues = getDeliveryLogIssuesForOrder(order.orderId);

  if (issues.length === 0) {
    return `
      <div class="instruction-box">
        <strong>No Issues:</strong>
        <span>No delivery issue records were created for this delivery.</span>
      </div>
    `;
  }

  return `
    <div class="delivery-log-issue-list">
      ${issues
        .map(
          (issue) => `
            <div class="delivery-log-issue-card">
              <div>
                <p class="eyebrow">${issue.issueReason || "Issue"}</p>
                <strong>${issue.itemName || "-"}</strong>
                <span>
                  Sent ${issue.sentQty} / Received ${issue.receivedQty} ${issue.unit || ""}
                </span>
              </div>

              <div>
                <span class="badge ${issue.status === "Resolved" ? "info-badge" : "warning-badge"}">
                  ${issue.status || "Open"}
                </span>
                <p>${issue.resolution || "No resolution yet"}</p>
                <span>${issue.resolutionCategory || ""}</span>
              </div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderSelectedDeliveryLogOrder() {
  const order = getSelectedDeliveryLogOrder();

  if (!order) {
    return `
      <section class="panel delivery-log-detail">
        <div class="order-list-empty">
          <p>No delivery selected.</p>
          <span>Select a delivery from the left panel.</span>
        </div>
      </section>
    `;
  }

  const sentTotal = getDeliveryLogSentTotal(order);
  const receivedTotal = getDeliveryLogReceivedTotal(order);
  const issueCount = getDeliveryLogIssueCount(order.orderId);

  return `
    <section class="panel delivery-log-detail">
      <div class="panel-header">
        <div>
          <h3>${order.orderId}</h3>
          <p>
            ${order.branch || "DMC-Iriga Branch"} • ${order.department || "-"}
          </p>
        </div>

        <div class="branch-order-list-meta">
          ${
            issueCount
              ? `<span class="badge warning-badge">${issueCount} Issue(s)</span>`
              : ""
          }
          <span class="badge ${getDeliveryLogStatusBadgeClass(order.status)}">
            ${order.status || "-"}
          </span>
        </div>
      </div>

      <div class="delivery-log-info-grid">
        <div>
          <p class="eyebrow">Prepared By</p>
          <strong>${order.fulfillment?.preparedBy || "-"}</strong>
        </div>

        <div>
          <p class="eyebrow">Driver / Rider</p>
          <strong>${order.fulfillment?.driver || "-"}</strong>
        </div>

        <div>
          <p class="eyebrow">Sent At</p>
          <strong>${formatDeliveryLogDateTime(order.fulfillment?.sentAt)}</strong>
        </div>

        <div>
          <p class="eyebrow">Received By</p>
          <strong>${order.receiving?.receivedBy || "-"}</strong>
        </div>

        <div>
          <p class="eyebrow">Received At</p>
          <strong>${formatDeliveryLogDateTime(order.receiving?.receivedAt)}</strong>
        </div>

        <div>
          <p class="eyebrow">Sent Total</p>
          <strong>${sentTotal}</strong>
        </div>

        <div>
          <p class="eyebrow">Received Total</p>
          <strong>${receivedTotal}</strong>
        </div>

        <div>
          <p class="eyebrow">Total Variance</p>
          <strong class="${receivedTotal - sentTotal !== 0 ? "danger-text" : ""}">
            ${receivedTotal - sentTotal}
          </strong>
        </div>
      </div>

      <div class="branch-order-section">
        <h4>Delivery Lines</h4>
        ${renderDeliveryLogLines(order)}
      </div>

      <div class="branch-order-section">
        <h4>Delivery Issues</h4>
        ${renderDeliveryLogIssues(order)}
      </div>

      <div class="branch-order-section">
        <h4>Notes</h4>
        <div class="instruction-box">
          <strong>Commissary Notes:</strong>
          <span>${order.fulfillment?.deliveryNotes || "-"}</span>
        </div>

        <div class="instruction-box">
          <strong>Branch Receiving Notes:</strong>
          <span>${order.receiving?.receivingNotes || "-"}</span>
        </div>
      </div>
    </section>
  `;
}

function getDeliveryLogContent() {
  const summary = getDeliveryLogSummary();

  return `
    <section class="grid">
      <div class="card">
        <p>Total Deliveries</p>
        <strong>${summary.total}</strong>
      </div>

      <div class="card">
        <p>On the Way</p>
        <strong>${summary.onTheWay}</strong>
      </div>

      <div class="card">
        <p>Completed</p>
        <strong>${summary.completed}</strong>
      </div>

      <div class="card">
        <p>Variance</p>
        <strong>${summary.variance}</strong>
      </div>
    </section>

    <section class="delivery-log-layout">
      <section class="panel delivery-log-list-panel">
        <div class="panel-header">
          <div>
            <h3>Delivery Log</h3>
            <p>Review delivery history, receiving status, and issue outcomes.</p>
          </div>

          <select id="delivery-log-status-filter">
            ${renderDeliveryLogStatusOptions()}
          </select>
        </div>

        <div class="filter-bar branch-order-search-bar">
          <label class="filter-search">
            Search
            <input
              id="delivery-log-search"
              type="text"
              placeholder="Search order, item, driver, receiver..."
              value="${window.DMC_DELIVERY_LOG_SEARCH}"
            />
          </label>
        </div>

        ${renderDeliveryLogList()}
      </section>

      ${renderSelectedDeliveryLogOrder()}
    </section>
  `;
}

function refreshDeliveryLogPage() {
  window.DMC_PAGES["delivery-log"].content = getDeliveryLogContent();
  renderPage("delivery-log");
}

function setupDeliveryLogEvents() {
  const statusFilter = document.getElementById("delivery-log-status-filter");
  const searchInput = document.getElementById("delivery-log-search");

  if (statusFilter) {
    statusFilter.addEventListener("change", () => {
      window.DMC_DELIVERY_LOG_STATUS_FILTER = statusFilter.value;
      window.DMC_DELIVERY_LOG_SELECTED_ID = "";
      refreshDeliveryLogPage();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("change", () => {
      window.DMC_DELIVERY_LOG_SEARCH = searchInput.value;
      window.DMC_DELIVERY_LOG_SELECTED_ID = "";
      refreshDeliveryLogPage();
    });
  }

  document.querySelectorAll("[data-select-delivery-log]").forEach((button) => {
    button.addEventListener("click", () => {
      window.DMC_DELIVERY_LOG_SELECTED_ID = button.dataset.selectDeliveryLog;
      refreshDeliveryLogPage();
    });
  });
}

window.DMC_PAGES["delivery-log"] = {
  eyebrow: "Commissary",
  title: "Delivery Log",
  description:
    "History of commissary deliveries, branch receiving, and delivery issue outcomes.",
  getContent: getDeliveryLogContent,
  content: getDeliveryLogContent(),
  afterRender: setupDeliveryLogEvents
};
