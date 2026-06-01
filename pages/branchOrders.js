window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_BRANCH_ORDERS_STORAGE_KEY = "dmc_branch_orders";
const DMC_WAREHOUSE_ORDER_LOG_KEY = "dmc_warehouse_log_entries";
const DMC_WAREHOUSE_ORDER_MASTER_LIST_KEY = "dmc_master_list_items";

window.DMC_BRANCH_ORDERS_SELECTED_STATUS =
  window.DMC_BRANCH_ORDERS_SELECTED_STATUS || "all";

window.DMC_BRANCH_ORDERS_SELECTED_SOURCE =
  window.DMC_BRANCH_ORDERS_SELECTED_SOURCE || "all";

window.DMC_BRANCH_ORDERS_SEARCH = window.DMC_BRANCH_ORDERS_SEARCH || "";

window.DMC_BRANCH_ORDERS_SELECTED_ID =
  window.DMC_BRANCH_ORDERS_SELECTED_ID || "";

window.DMC_BRANCH_ORDER_FULFILLMENT_DRAFT =
  window.DMC_BRANCH_ORDER_FULFILLMENT_DRAFT || {};

function getStoredWarehouseOrders() {
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

function saveWarehouseOrders(orders) {
  localStorage.setItem(DMC_BRANCH_ORDERS_STORAGE_KEY, JSON.stringify(orders));
}

function getStoredWarehouseLogEntriesForOrders() {
  const storedEntries = localStorage.getItem(DMC_WAREHOUSE_ORDER_LOG_KEY);

  if (!storedEntries) {
    return [];
  }

  try {
    const parsedEntries = JSON.parse(storedEntries);

    if (!Array.isArray(parsedEntries)) {
      return [];
    }

    return parsedEntries;
  } catch {
    return [];
  }
}

function saveWarehouseLogEntriesFromOrders(entries) {
  localStorage.setItem(DMC_WAREHOUSE_ORDER_LOG_KEY, JSON.stringify(entries));
}

function getWarehouseOrderMasterListItems() {
  const storedItems = localStorage.getItem(DMC_WAREHOUSE_ORDER_MASTER_LIST_KEY);

  if (!storedItems) {
    return [];
  }

  try {
    return JSON.parse(storedItems);
  } catch {
    return [];
  }
}

function getWarehouseOrderSettings() {
  const storedSettings = localStorage.getItem("dmc_inventory_settings");

  if (!storedSettings) {
    return {
      managerNames: [],
      managers: [],
      staffNames: [],
      staff: []
    };
  }

  try {
    return JSON.parse(storedSettings);
  } catch {
    return {
      managerNames: [],
      managers: [],
      staffNames: [],
      staff: []
    };
  }
}

function getSettingName(option) {
  if (typeof option === "string") {
    return option;
  }

  return option?.name || "";
}

function getManagerNamesForWarehouseOrders() {
  const settings = getWarehouseOrderSettings();
  const managers = settings.managerNames || settings.managers || [];

  return managers.map(getSettingName).filter(Boolean);
}

function getStaffNamesForWarehouseOrders() {
  const settings = getWarehouseOrderSettings();
  const staff = settings.staffNames || settings.staff || settings.staffMembers || [];

  return staff.map(getSettingName).filter(Boolean);
}

function renderManagerOptions(currentValue) {
  const managers = getManagerNamesForWarehouseOrders();

  if (managers.length === 0) {
    return `
      <option value="" ${!currentValue ? "selected" : ""}>Select manager</option>
      <option value="Manager Ana" ${
        currentValue === "Manager Ana" ? "selected" : ""
      }>Manager Ana</option>
      <option value="Manager Lou" ${
        currentValue === "Manager Lou" ? "selected" : ""
      }>Manager Lou</option>
    `;
  }

  return `
    <option value="" ${!currentValue ? "selected" : ""}>Select manager</option>
    ${managers
      .map(
        (manager) => `
          <option value="${manager}" ${
          currentValue === manager ? "selected" : ""
        }>
            ${manager}
          </option>
        `
      )
      .join("")}
  `;
}

function renderStaffOptions(currentValue) {
  const staffNames = getStaffNamesForWarehouseOrders();

  if (staffNames.length === 0) {
    return `
      <option value="" ${!currentValue ? "selected" : ""}>Select staff</option>
      <option value="Warehouse Staff" ${
        currentValue === "Warehouse Staff" ? "selected" : ""
      }>Warehouse Staff</option>
      <option value="Admin Staff" ${
        currentValue === "Admin Staff" ? "selected" : ""
      }>Admin Staff</option>
    `;
  }

  return `
    <option value="" ${!currentValue ? "selected" : ""}>Select staff</option>
    ${staffNames
      .map(
        (staff) => `
          <option value="${staff}" ${
          currentValue === staff ? "selected" : ""
        }>
            ${staff}
          </option>
        `
      )
      .join("")}
  `;
}

function getWarehouseOrderTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getWarehouseOrderTimestamp() {
  return new Date().toISOString();
}

function getWarehouseOrderReadableTimestamp() {
  const now = new Date();

  return now.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatWarehouseOrderDateTime(value) {
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

function getWarehouseOrderTimestampValue(order) {
  const historyTime =
    order.statusHistory?.[order.statusHistory.length - 1]?.timestamp;

  if (historyTime) {
    return new Date(historyTime).getTime();
  }

  if (order.orderDate) {
    return new Date(order.orderDate).getTime();
  }

  return 0;
}

function getOrderSource(order) {
  return order.source || order.requestSource || order.branch || "DMC-Iriga Branch";
}

function getSortedWarehouseOrders() {
  return [...getStoredWarehouseOrders()].sort(
    (a, b) => getWarehouseOrderTimestampValue(b) - getWarehouseOrderTimestampValue(a)
  );
}

function getFilteredWarehouseOrders() {
  const status = window.DMC_BRANCH_ORDERS_SELECTED_STATUS;
  const source = window.DMC_BRANCH_ORDERS_SELECTED_SOURCE;
  const searchValue = String(window.DMC_BRANCH_ORDERS_SEARCH || "")
    .toLowerCase()
    .trim();

  return getSortedWarehouseOrders().filter((order) => {
    const orderSource = getOrderSource(order);

    const matchesStatus = status === "all" || order.status === status;
    const matchesSource = source === "all" || orderSource === source;

    const matchesSearch =
      !searchValue ||
      String(order.orderId || "").toLowerCase().includes(searchValue) ||
      String(orderSource || "").toLowerCase().includes(searchValue) ||
      String(order.branch || "").toLowerCase().includes(searchValue) ||
      String(order.department || "").toLowerCase().includes(searchValue) ||
      String(order.status || "").toLowerCase().includes(searchValue) ||
      String(order.notes || "").toLowerCase().includes(searchValue) ||
      String(order.requestedBy || "").toLowerCase().includes(searchValue) ||
      String(order.fulfillment?.preparedBy || "")
        .toLowerCase()
        .includes(searchValue) ||
      (order.lines || []).some(
        (line) =>
          String(line.itemId || "").toLowerCase().includes(searchValue) ||
          String(line.itemName || "").toLowerCase().includes(searchValue) ||
          String(line.section || "").toLowerCase().includes(searchValue)
      );

    return matchesStatus && matchesSource && matchesSearch;
  });
}

function getSelectedWarehouseOrder() {
  const orders = getFilteredWarehouseOrders();

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

function getWarehouseOrderSources() {
  return [
    ...new Set(getStoredWarehouseOrders().map((order) => getOrderSource(order)))
  ]
    .filter(Boolean)
    .sort();
}

function getWarehouseOrdersSummary() {
  const orders = getStoredWarehouseOrders();

  return {
    total: orders.length,
    submitted: orders.filter((order) => order.status === "Submitted").length,
    urgent: orders.filter((order) => order.urgent).length,
    fulfilling: orders.filter((order) => order.status === "Being Fulfilled")
      .length,
    onTheWay: orders.filter((order) => order.status === "On the Way").length
  };
}

function getOrderStatusBadgeClass(status) {
  if (status === "Submitted") return "warning-badge";
  if (status === "Accepted") return "info-badge";
  if (status === "Being Fulfilled") return "success";
  if (status === "On the Way") return "info-badge";
  if (status === "Rejected") return "danger-badge";
  if (status === "Variance") return "danger-badge";
  return "";
}

function renderWarehouseOrderStatusOptions() {
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

function renderWarehouseOrderSourceOptions() {
  const selectedSource = window.DMC_BRANCH_ORDERS_SELECTED_SOURCE;

  return `
    <option value="all" ${selectedSource === "all" ? "selected" : ""}>
      All Sources
    </option>
    ${getWarehouseOrderSources()
      .map(
        (source) => `
          <option value="${source}" ${selectedSource === source ? "selected" : ""}>
            ${source}
          </option>
        `
      )
      .join("")}
  `;
}

function calculateWarehouseStockForItem(itemId) {
  const masterItem = getWarehouseOrderMasterListItems().find(
    (item) => String(item.itemId || "") === String(itemId || "")
  );

  const openingStock = Number(masterItem?.openingStock || 0);

  return getStoredWarehouseLogEntriesForOrders()
    .filter((entry) => String(entry.itemId || "") === String(itemId || ""))
    .reduce((total, entry) => {
      const quantity = Number(entry.quantity || 0);

      if (entry.stockEffect === "add") {
        return total + quantity;
      }

      if (entry.stockEffect === "deduct") {
        return total - quantity;
      }

      return total;
    }, openingStock);
}

function getFulfillmentDraft(order) {
  if (!order) {
    return {
      lines: {},
      preparedBy: "",
      deliveryNotes: "",
      requestedBy: ""
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
      deliveryNotes: existingFulfillment.deliveryNotes || "",
      requestedBy: order.requestedBy || ""
    };
  }

  return window.DMC_BRANCH_ORDER_FULFILLMENT_DRAFT[order.orderId];
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

function canMarkOnTheWay(order) {
  return order && order.status === "Being Fulfilled";
}

function renderWarehouseOrderList() {
  const orders = getFilteredWarehouseOrders();
  const selectedOrder = getSelectedWarehouseOrder();

  if (orders.length === 0) {
    return `
      <div class="order-list-empty">
        <p>No warehouse orders found.</p>
        <span>Branch and Commissary requests will appear here.</span>
      </div>
    `;
  }

  return `
    <div class="branch-order-list">
      ${orders
        .map((order) => {
          const source = getOrderSource(order);

          return `
            <button
              class="branch-order-list-item ${
                selectedOrder?.orderId === order.orderId ? "active" : ""
              }"
              data-select-branch-order="${order.orderId}"
            >
              <div>
                <strong>${order.orderId}</strong>
                <p>${source} • ${order.department || "-"}</p>
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
          `;
        })
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
                <strong>${formatWarehouseOrderDateTime(event.timestamp)}</strong>
                <p>${event.note || "-"}</p>
              </div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderFulfillmentLines(order) {
  const draft = getFulfillmentDraft(order);
  const isLocked = order.status === "On the Way" || order.status === "Completed";

  if (!order || !order.lines || order.lines.length === 0) {
    return `
      <p class="submit-preview-empty">
        No order lines found for this order.
      </p>
    `;
  }

  return `
    <div class="warehouse-order-fulfillment-table-wrap">
      <table class="warehouse-order-fulfillment-table">
        <thead>
          <tr>
            <th>Item ID</th>
            <th>Item Name</th>
            <th>Requested</th>
            <th>Warehouse Stock</th>
            <th>Fulfill Qty</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          ${(order.lines || [])
            .map((line) => {
              const availableStock = calculateWarehouseStockForItem(line.itemId);
              const requestedQty = Number(line.requestedQty || 0);
              const enough = availableStock >= requestedQty;
              const lineDraft = draft.lines[line.itemId] || {};

              return `
                <tr>
                  <td>${line.itemId || "-"}</td>
                  <td>${line.itemName || "-"}</td>
                  <td>${requestedQty} ${line.unit || ""}</td>
                  <td class="${enough ? "positive-text" : "negative-text"}">
                    <strong>${availableStock} ${line.unit || ""}</strong>
                  </td>
                  <td>
                    <input
                      class="fulfillment-input"
                      data-fulfillment-qty="${line.itemId}"
                      type="number"
                      min="0"
                      step="any"
                      value="${lineDraft.sentQty ?? ""}"
                      ${isLocked ? "disabled" : ""}
                    />
                  </td>
                  <td>
                    ${
                      enough
                        ? `<span class="badge success">Enough</span>`
                        : `<span class="badge danger-badge">Short</span>`
                    }
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

function renderSelectedWarehouseOrder() {
  const order = getSelectedWarehouseOrder();

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

  const source = getOrderSource(order);
  const draft = getFulfillmentDraft(order);
  const isLocked = order.status === "On the Way" || order.status === "Completed";

  return `
    <section class="panel branch-order-detail">
      <div class="panel-header">
        <div>
          <h3>${order.orderId}</h3>
          <p>
            ${source} • ${order.department || "-"} • ${order.orderDate || "-"}
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

      <div class="branch-order-info-grid warehouse-order-info-grid">
        <label>
          <p class="eyebrow">Requested By</p>
          <select id="warehouse-order-requested-by" ${isLocked ? "disabled" : ""}>
            ${renderManagerOptions(draft.requestedBy || order.requestedBy || "")}
          </select>
        </label>

        <div>
          <p class="eyebrow">Order Notes</p>
          <strong>${order.notes || "-"}</strong>
        </div>

        <div>
          <p class="eyebrow">Destination</p>
          <strong>${source || "-"}</strong>
        </div>
      </div>

      <div class="branch-order-section">
        <div class="fulfillment-panel-header">
          <div>
            <h4>Fulfillment Check</h4>
            <p>Requested items and Warehouse available stock.</p>
          </div>

          <span class="badge">Warehouse Stock Linked</span>
        </div>

        ${renderFulfillmentLines(order)}
      </div>

      <div class="branch-order-section fulfillment-panel">
        <div class="fulfillment-meta-grid warehouse-fulfillment-meta-grid">
          <label>
            Prepared By
            <select id="fulfillment-prepared-by" ${isLocked ? "disabled" : ""}>
              ${renderStaffOptions(draft.preparedBy || "")}
            </select>
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
          class="primary-button"
          id="mark-order-on-the-way"
          ${canMarkOnTheWay(order) ? "" : "disabled"}
        >
          Mark On the Way
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
  const summary = getWarehouseOrdersSummary();

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
            <h3>Warehouse Order Queue</h3>
            <p>Branch and Commissary requests waiting for Warehouse review.</p>
          </div>
        </div>

        <div class="warehouse-order-filter-grid">
          <label>
            Source
            <select id="branch-order-source-filter">
              ${renderWarehouseOrderSourceOptions()}
            </select>
          </label>

          <label>
            Status
            <select id="branch-order-status-filter">
              ${renderWarehouseOrderStatusOptions()}
            </select>
          </label>
        </div>

        <div class="filter-bar branch-order-search-bar">
          <label class="filter-search">
            Search
            <input
              id="branch-order-search"
              type="text"
              placeholder="Search order, source, item, status..."
              value="${window.DMC_BRANCH_ORDERS_SEARCH}"
            />
          </label>
        </div>

        ${renderWarehouseOrderList()}
      </section>

      ${renderSelectedWarehouseOrder()}
    </section>
  `;
}

function refreshBranchOrdersPage() {
  window.DMC_PAGES["branch-orders"].content = getBranchOrdersContent();
  renderPage("branch-orders");
}

function updateBranchOrderStatus(orderId, nextStatus, note, extraUpdates = {}) {
  const orders = getStoredWarehouseOrders();

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

  saveWarehouseOrders(updatedOrders);
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

  const preparedByInput = document.getElementById("fulfillment-prepared-by");
  const deliveryNotesInput = document.getElementById(
    "fulfillment-delivery-notes"
  );
  const requestedByInput = document.getElementById("warehouse-order-requested-by");

  draft.preparedBy = preparedByInput?.value || "";
  draft.deliveryNotes = deliveryNotesInput?.value || "";
  draft.requestedBy = requestedByInput?.value || "";

  window.DMC_BRANCH_ORDER_FULFILLMENT_DRAFT[order.orderId] = draft;
}

function hasWarehouseTransferOutAlreadyLogged(orderId) {
  return getStoredWarehouseLogEntriesForOrders().some(
    (entry) =>
      entry.batchId === orderId &&
      entry.location === "Warehouse" &&
      entry.movementType === "Transfer Out" &&
      entry.source === "Warehouse Order Fulfillment"
  );
}

function buildWarehouseTransferOutEntries(order, fulfillmentDraft) {
  const submittedAt = getWarehouseOrderTimestamp();
  const submittedAtDisplay = getWarehouseOrderReadableTimestamp();
  const source = getOrderSource(order);

  return (order.lines || [])
    .map((line) => {
      const sentQty = Number(
        fulfillmentDraft.lines?.[line.itemId]?.sentQty || 0
      );

      if (Number.isNaN(sentQty) || sentQty <= 0) {
        return null;
      }

      return {
        date: getWarehouseOrderTodayDate(),
        submittedAt,
        submittedAtDisplay,
        batchId: order.orderId,
        location: "Warehouse",
        department: line.department || order.department || "",
        itemId: line.itemId || "",
        itemName: line.itemName || "",
        movementType: "Transfer Out",
        movementField: "transferOut",
        stockEffect: "deduct",
        quantity: sentQty,
        unit: line.unit || "",
        managerReviewedBy:
          fulfillmentDraft.requestedBy || order.requestedBy || "",
        preparedBy: fulfillmentDraft.preparedBy || "",
        source: "Warehouse Order Fulfillment",
        destination: source,
        notes: `Order ${order.orderId} sent to ${source}. ${
          fulfillmentDraft.deliveryNotes || ""
        }`.trim()
      };
    })
    .filter(Boolean);
}

function writeWarehouseTransferOutToLog(order, fulfillmentDraft) {
  if (hasWarehouseTransferOutAlreadyLogged(order.orderId)) {
    return;
  }

  const currentLogEntries = getStoredWarehouseLogEntriesForOrders();
  const transferOutEntries = buildWarehouseTransferOutEntries(
    order,
    fulfillmentDraft
  );

  saveWarehouseLogEntriesFromOrders([...currentLogEntries, ...transferOutEntries]);
}

function setupBranchOrdersEvents() {
  const statusFilter = document.getElementById("branch-order-status-filter");
  const sourceFilter = document.getElementById("branch-order-source-filter");
  const searchInput = document.getElementById("branch-order-search");

  if (statusFilter) {
    statusFilter.addEventListener("change", () => {
      window.DMC_BRANCH_ORDERS_SELECTED_STATUS = statusFilter.value;
      window.DMC_BRANCH_ORDERS_SELECTED_ID = "";
      refreshBranchOrdersPage();
    });
  }

  if (sourceFilter) {
    sourceFilter.addEventListener("change", () => {
      window.DMC_BRANCH_ORDERS_SELECTED_SOURCE = sourceFilter.value;
      window.DMC_BRANCH_ORDERS_SELECTED_ID = "";
      refreshBranchOrdersPage();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
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

  const selectedOrder = getSelectedWarehouseOrder();

  document.querySelectorAll("[data-fulfillment-qty]").forEach((input) => {
    input.addEventListener("input", () => {
      saveFulfillmentDraftFromInputs(selectedOrder);
    });
  });

  const preparedByInput = document.getElementById("fulfillment-prepared-by");
  const deliveryNotesInput = document.getElementById(
    "fulfillment-delivery-notes"
  );
  const requestedByInput = document.getElementById("warehouse-order-requested-by");

  [preparedByInput, deliveryNotesInput, requestedByInput].forEach((input) => {
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
        "Warehouse accepted the order request."
      );
    });
  }

  if (fulfillmentButton && selectedOrder) {
    fulfillmentButton.addEventListener("click", () => {
      updateBranchOrderStatus(
        selectedOrder.orderId,
        "Being Fulfilled",
        "Warehouse started fulfilling the order."
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
        "Warehouse rejected the order request."
      );
    });
  }

  if (markOnTheWayButton && selectedOrder) {
    markOnTheWayButton.addEventListener("click", () => {
      saveFulfillmentDraftFromInputs(selectedOrder);

      const draft = getFulfillmentDraft(selectedOrder);

      const hasMissingSentQty = (selectedOrder.lines || []).some((line) => {
        const sentQty = Number(draft.lines[line.itemId]?.sentQty || 0);
        return Number.isNaN(sentQty) || sentQty <= 0;
      });

      if (hasMissingSentQty) {
        alert("Please enter fulfill quantity greater than 0 for every item.");
        return;
      }

      if (!draft.preparedBy.trim()) {
        alert("Please select Prepared By.");
        return;
      }

      if (!draft.requestedBy.trim()) {
        alert("Please select Requested By.");
        return;
      }

      const confirmed = confirm(
        `Mark order ${selectedOrder.orderId} as On the Way? This will deduct Warehouse Stock.`
      );

      if (!confirmed) {
        return;
      }

      writeWarehouseTransferOutToLog(selectedOrder, draft);

      updateBranchOrderStatus(
        selectedOrder.orderId,
        "On the Way",
        "Warehouse marked the order as On the Way. Warehouse Transfer Out was logged.",
        {
          requestedBy: draft.requestedBy,
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
  eyebrow: "Warehouse",
  title: "Branch Orders",
  description:
    "Warehouse order queue for branch and commissary requests.",
  getContent: getBranchOrdersContent,
  content: getBranchOrdersContent(),
  afterRender: setupBranchOrdersEvents
};
