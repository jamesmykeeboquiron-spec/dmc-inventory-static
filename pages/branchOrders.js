window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_BRANCH_ORDERS_STORAGE_KEY = "dmc_branch_orders";

window.DMC_BRANCH_ORDERS_SELECTED_STATUS =
  window.DMC_BRANCH_ORDERS_SELECTED_STATUS || "all";

window.DMC_BRANCH_ORDERS_SEARCH = window.DMC_BRANCH_ORDERS_SEARCH || "";

window.DMC_BRANCH_ORDERS_SELECTED_ID =
  window.DMC_BRANCH_ORDERS_SELECTED_ID || "";

window.DMC_BRANCH_ORDER_FULFILLMENT_DRAFT =
  window.DMC_BRANCH_ORDER_FULFILLMENT_DRAFT || {};

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
  const historyTime = order.statusHistory?.[order.statusHistory.length - 1]?.timestamp;

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
      String(order.fulfillment?.preparedBy || "").toLowerCase().includes(searchValue) ||
      String(order.fulfillment?.driver || "").toLowerCase().includes(searchValue) ||
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
      .length,
    onTheWay: orders.filter((order) => order.status === "On the Way").length
  };
}

function getOrderStatusBadgeClass(status) {
  if (status === "Submitted") return "warning-badge";
  if (status === "Accepted") return "info-badge";
  if (status === "Being Fulfilled") return "";
  if (status === "On the Way") return "info-badge";
  if (status === "Rejected") return "danger-badge";
  if (status === "Variance") return "danger-badge";
  return "";
}

function renderBranchOrderStatusOptions() {
  const selectedStatus = window.DMC_BRANCH_ORDERS_SELECTED_STATUS;

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

function getFulfillmentDraft(order) {
  if (!order) {
    return {
      lines: {},
      preparedBy: "",
      driver: "",
      deliveryNotes: ""
    };
  }

  const existingFulfillment = order.fulfillment || {};

  if (!window.DMC_BRANCH_ORDER_FULFILLMENT_DRAFT[order.orderId]) {
    const lineDrafts = {};

    (order.lines || []).forEach((line) => {
      lineDrafts[line.itemId] = {
        sentQty:
          existingFulfillment.lines?.[line.itemId]?.sentQty ??
          line.requestedQty ??
          "",
        notes: existingFulfillment.lines?.[line.itemId]?.notes || ""
      };
    });

    window.DMC_BRANCH_ORDER_FULFILLMENT_DRAFT[order.orderId] = {
      lines: lineDrafts,
      preparedBy: existingFulfillment.preparedBy || "",
      driver: existingFulfillment.driver || "",
      deliveryNotes: existingFulfillment.deliveryNotes || ""
    };
  }

  return window.DMC_BRANCH_ORDER_FULFILLMENT_DRAFT[order.orderId];
}

function renderFulfillmentPanel(order) {
  if (!order) {
    return "";
  }

  if (order.status !== "Being Fulfilled" && order.status !== "On the Way") {
    return "";
  }

  const isLocked = order.status === "On the Way";
  const draft = getFulfillmentDraft(order);

  return `
    <div class="branch-order-section fulfillment-panel">
      <div class="panel-header fulfillment-panel-header">
        <div>
          <h4>Fulfillment Panel</h4>
          <p>
            Enter quantities that commissary will send. When marked On the Way,
            this order becomes visible for branch receiving.
          </p>
        </div>

        <span class="badge ${isLocked ? "info-badge" : ""}">
          ${isLocked ? "Locked / On the Way" : "Editable"}
        </span>
      </div>

      <div class="fulfillment-lines">
        ${(order.lines || [])
          .map((line) => {
            const lineDraft = draft.lines[line.itemId] || {};

            return `
              <div class="fulfillment-line">
                <div>
                  <p class="eyebrow">${line.section || "Item"}</p>
                  <strong>${line.itemName}</strong>
                  <span>${line.itemId} • Requested: ${line.requestedQty} ${line.unit}</span>
                </div>

                <label>
                  Sent Qty
                  <input
                    class="fulfillment-input"
                    data-fulfillment-qty="${line.itemId}"
                    type="number"
                    min="0"
                    step="any"
                    value="${lineDraft.sentQty ?? ""}"
                    ${isLocked ? "disabled" : ""}
                  />
                </label>

                <label>
                  Notes
                  <input
                    class="fulfillment-input"
                    data-fulfillment-notes="${line.itemId}"
                    type="text"
                    placeholder="Optional"
                    value="${lineDraft.notes || ""}"
                    ${isLocked ? "disabled" : ""}
                  />
                </label>
              </div>
            `;
          })
          .join("")}
      </div>

      <div class="fulfillment-meta-grid">
        <label>
          Prepared By
          <input
            id="fulfillment-prepared-by"
            type="text"
            placeholder="Commissary staff"
            value="${draft.preparedBy || ""}"
            ${isLocked ? "disabled" : ""}
          />
        </label>

        <label>
          Driver / Rider
          <input
            id="fulfillment-driver"
            type="text"
            placeholder="Driver or rider name"
            value="${draft.driver || ""}"
            ${isLocked ? "disabled" : ""}
          />
        </label>

        <label class="form-full">
          Delivery Notes
          <textarea
            id="fulfillment-delivery-notes"
            rows="3"
            placeholder="Delivery notes, packing notes, special handling..."
            ${isLocked ? "disabled" : ""}
          >${draft.deliveryNotes || ""}</textarea>
        </label>
      </div>

      ${
        isLocked
          ? `
            <div class="instruction-box">
              <strong>Delivery Status:</strong>
              <span>
                This order has been marked On the Way. Fulfillment details are locked
                until the branch confirms receipt in Incoming Deliveries.
              </span>
            </div>
          `
          : `
            <div class="form-actions fulfillment-actions">
              <button class="primary-button" id="mark-order-on-the-way">
                Mark as On the Way
              </button>
            </div>
          `
      }
    </div>
  `;
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

      ${renderFulfillmentPanel(order)}

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
        <p>On the Way</p>
        <strong>${summary.onTheWay}</strong>
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

function updateBranchOrderStatus(orderId, nextStatus, note, extraUpdates = {}) {
  const orders = getStoredBranchOrdersForCommissary();

  const updatedOrders = orders.map((order) => {
    if (order.orderId !== orderId) {
      return order;
    }

    return {
      ...order,
      ...extraUpdates,
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

function saveFulfillmentDraftFromInputs(order) {
  if (!order) {
    return;
  }

  const draft = getFulfillmentDraft(order);

  document.querySelectorAll("[data-fulfillment-qty]").forEach((input) => {
    const itemId = input.dataset.fulfillmentQty;

    draft.lines[itemId] = draft.lines[itemId] || {};
    draft.lines[itemId].sentQty = input.value;
  });

  document.querySelectorAll("[data-fulfillment-notes]").forEach((input) => {
    const itemId = input.dataset.fulfillmentNotes;

    draft.lines[itemId] = draft.lines[itemId] || {};
    draft.lines[itemId].notes = input.value;
  });

  const preparedByInput = document.getElementById("fulfillment-prepared-by");
  const driverInput = document.getElementById("fulfillment-driver");
  const deliveryNotesInput = document.getElementById(
    "fulfillment-delivery-notes"
  );

  draft.preparedBy = preparedByInput?.value || "";
  draft.driver = driverInput?.value || "";
  draft.deliveryNotes = deliveryNotesInput?.value || "";

  window.DMC_BRANCH_ORDER_FULFILLMENT_DRAFT[order.orderId] = draft;
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

  document.querySelectorAll("[data-fulfillment-qty]").forEach((input) => {
    input.addEventListener("change", () => {
      saveFulfillmentDraftFromInputs(selectedOrder);
    });
  });

  document.querySelectorAll("[data-fulfillment-notes]").forEach((input) => {
    input.addEventListener("change", () => {
      saveFulfillmentDraftFromInputs(selectedOrder);
    });
  });

  const preparedByInput = document.getElementById("fulfillment-prepared-by");
  const driverInput = document.getElementById("fulfillment-driver");
  const deliveryNotesInput = document.getElementById(
    "fulfillment-delivery-notes"
  );

  [preparedByInput, driverInput, deliveryNotesInput].forEach((input) => {
    if (input) {
      input.addEventListener("change", () => {
        saveFulfillmentDraftFromInputs(selectedOrder);
      });
    }
  });

  const acceptButton = document.getElementById("accept-branch-order");
  const fulfillmentButton = document.getElementById("start-fulfillment-order");
  const rejectButton = document.getElementById("reject-branch-order");
  const markOnTheWayButton = document.getElementById("mark-order-on-the-way");

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

  if (markOnTheWayButton && selectedOrder) {
    markOnTheWayButton.addEventListener("click", () => {
      saveFulfillmentDraftFromInputs(selectedOrder);

      const draft = getFulfillmentDraft(selectedOrder);

      const missingSentQty = (selectedOrder.lines || []).some((line) => {
        const sentQty = Number(draft.lines[line.itemId]?.sentQty || 0);
        return Number.isNaN(sentQty) || sentQty <= 0;
      });

      if (missingSentQty) {
        alert("Please enter sent quantity greater than 0 for every item.");
        return;
      }

      if (!draft.preparedBy.trim()) {
        alert("Please enter Prepared By.");
        return;
      }

      if (!draft.driver.trim()) {
        alert("Please enter Driver / Rider.");
        return;
      }

      const confirmed = confirm(
        `Mark order ${selectedOrder.orderId} as On the Way?`
      );

      if (!confirmed) {
        return;
      }

      updateBranchOrderStatus(
        selectedOrder.orderId,
        "On the Way",
        "Commissary marked the delivery as On the Way.",
        {
          fulfillment: {
            ...draft,
            sentAt: new Date().toISOString()
          }
        }
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
