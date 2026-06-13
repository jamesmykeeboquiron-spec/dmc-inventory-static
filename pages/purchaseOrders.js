window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_PURCHASE_ORDERS_STORAGE_KEY = "dmc_purchase_orders";
const DMC_PURCHASE_ORDERS_LEDGER_KEY = "dmc_inventory_ledger_entries";

window.DMC_PURCHASE_ORDERS_SELECTED_ID =
  window.DMC_PURCHASE_ORDERS_SELECTED_ID || "";

window.DMC_PURCHASE_ORDERS_STATUS_FILTER =
  window.DMC_PURCHASE_ORDERS_STATUS_FILTER || "all";

window.DMC_PURCHASE_ORDERS_SEARCH =
  window.DMC_PURCHASE_ORDERS_SEARCH || "";

window.DMC_PURCHASE_ORDER_RECEIVING_DRAFT =
  window.DMC_PURCHASE_ORDER_RECEIVING_DRAFT || {};

function getStoredPurchaseOrders() {
  const storedOrders = localStorage.getItem(DMC_PURCHASE_ORDERS_STORAGE_KEY);

  if (!storedOrders) {
    return [];
  }

  try {
    const parsedOrders = JSON.parse(storedOrders);
    return Array.isArray(parsedOrders) ? parsedOrders : [];
  } catch {
    return [];
  }
}

function savePurchaseOrders(orders) {
  localStorage.setItem(DMC_PURCHASE_ORDERS_STORAGE_KEY, JSON.stringify(orders));
}

function getPurchaseOrderLedgerEntries() {
  const storedEntries = localStorage.getItem(DMC_PURCHASE_ORDERS_LEDGER_KEY);

  if (!storedEntries) {
    return window.DMC_DATA?.ledger || [];
  }

  try {
    const parsedEntries = JSON.parse(storedEntries);
    return Array.isArray(parsedEntries) ? parsedEntries : [];
  } catch {
    return window.DMC_DATA?.ledger || [];
  }
}

function savePurchaseOrderLedgerEntries(entries) {
  localStorage.setItem(DMC_PURCHASE_ORDERS_LEDGER_KEY, JSON.stringify(entries));
}

function getPurchaseOrderTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getPurchaseOrderReadableTimestamp() {
  const now = new Date();

  return now.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatPurchaseOrderDateTime(value) {
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

function getPurchaseOrderTimestamp(order) {
  if (order.updatedAt) {
    return new Date(order.updatedAt).getTime();
  }

  if (order.createdAt) {
    return new Date(order.createdAt).getTime();
  }

  return 0;
}

function getPurchaseOrderLineReceivedQty(line) {
  const value = Number(line.receivedQty || 0);
  return Number.isNaN(value) ? 0 : value;
}

function getPurchaseOrderLineOrderQty(line) {
  const value = Number(line.orderQty || 0);
  return Number.isNaN(value) ? 0 : value;
}

function getPurchaseOrderLineRemainingQty(line) {
  return Math.max(
    getPurchaseOrderLineOrderQty(line) - getPurchaseOrderLineReceivedQty(line),
    0
  );
}

function canPurchaseOrderSubmit(order) {
  return order?.status === "Draft";
}

function canPurchaseOrderReceive(order) {
  return ["Submitted", "Partially Received"].includes(order?.status);
}

function getPurchaseOrdersSummary() {
  const orders = getStoredPurchaseOrders();

  return {
    totalPOs: orders.length,
    drafts: orders.filter((order) => order.status === "Draft").length,
    submitted: orders.filter((order) => order.status === "Submitted").length,
    partial: orders.filter((order) => order.status === "Partially Received")
      .length,
    completed: orders.filter((order) => order.status === "Completed").length,
    pendingItems: orders
      .filter((order) =>
        ["Draft", "Submitted", "Partially Received"].includes(order.status)
      )
      .reduce((total, order) => {
        return (
          total +
          (order.lines || []).filter(
            (line) => getPurchaseOrderLineRemainingQty(line) > 0
          ).length
        );
      }, 0)
  };
}

function getFilteredPurchaseOrders() {
  const statusFilter = window.DMC_PURCHASE_ORDERS_STATUS_FILTER;
  const searchValue = String(window.DMC_PURCHASE_ORDERS_SEARCH || "")
    .toLowerCase()
    .trim();

  return getStoredPurchaseOrders()
    .filter((order) => statusFilter === "all" || order.status === statusFilter)
    .filter((order) => {
      if (!searchValue) {
        return true;
      }

      return (
        String(order.purchaseOrderId || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(order.supplier || "").toLowerCase().includes(searchValue) ||
        String(order.preparedBy || "").toLowerCase().includes(searchValue) ||
        String(order.status || "").toLowerCase().includes(searchValue) ||
        String(order.expectedDate || "").toLowerCase().includes(searchValue) ||
        (order.lines || []).some(
          (line) =>
            String(line.itemId || "").toLowerCase().includes(searchValue) ||
            String(line.itemName || "").toLowerCase().includes(searchValue) ||
            String(line.section || "").toLowerCase().includes(searchValue)
        )
      );
    })
    .sort((a, b) => getPurchaseOrderTimestamp(b) - getPurchaseOrderTimestamp(a));
}

function getSelectedPurchaseOrder() {
  const orders = getFilteredPurchaseOrders();

  if (window.DMC_PURCHASE_ORDERS_SELECTED_ID) {
    const selectedOrder = orders.find(
      (order) =>
        order.purchaseOrderId === window.DMC_PURCHASE_ORDERS_SELECTED_ID
    );

    if (selectedOrder) {
      return selectedOrder;
    }
  }

  return orders[0] || null;
}

function getPurchaseOrderStatusBadgeClass(status) {
  if (status === "Draft") return "warning-badge";
  if (status === "Submitted") return "info-badge";
  if (status === "Partially Received") return "warning-badge";
  if (status === "Completed") return "";
  if (status === "Cancelled") return "danger-badge";
  return "";
}

function renderPurchaseOrderStatusOptions() {
  const current = window.DMC_PURCHASE_ORDERS_STATUS_FILTER;
  const statuses = [
    "Draft",
    "Submitted",
    "Partially Received",
    "Completed",
    "Cancelled"
  ];

  return `
    <option value="all" ${current === "all" ? "selected" : ""}>
      All Purchase Orders
    </option>
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

function renderPurchaseOrderList() {
  const orders = getFilteredPurchaseOrders();
  const selectedOrder = getSelectedPurchaseOrder();

  if (orders.length === 0) {
    return `
      <div class="order-list-empty">
        <p>No purchase orders yet.</p>
        <span>Create a Purchase Order from the Shopping List page.</span>
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
                selectedOrder?.purchaseOrderId === order.purchaseOrderId
                  ? "active"
                  : ""
              }"
              data-select-purchase-order="${order.purchaseOrderId}"
            >
              <div>
                <strong>${order.purchaseOrderId}</strong>
                <p>
                  ${order.supplier || "No supplier"} •
                  ${(order.lines || []).length} item(s)
                </p>
                <span>
                  Expected: ${order.expectedDate || "-"} • Updated:
                  ${formatPurchaseOrderDateTime(order.updatedAt)}
                </span>
              </div>

              <div class="branch-order-list-meta">
                <span class="badge ${getPurchaseOrderStatusBadgeClass(
                  order.status
                )}">
                  ${order.status || "Draft"}
                </span>
              </div>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function getReceivingDraftForPurchaseOrder(order) {
  if (!order) {
    return {};
  }

  window.DMC_PURCHASE_ORDER_RECEIVING_DRAFT[order.purchaseOrderId] =
    window.DMC_PURCHASE_ORDER_RECEIVING_DRAFT[order.purchaseOrderId] || {};

  const draft = window.DMC_PURCHASE_ORDER_RECEIVING_DRAFT[order.purchaseOrderId];

  (order.lines || []).forEach((line) => {
    if (!draft[line.itemId]) {
      draft[line.itemId] = {
        receivedNowQty: "",
        notes: ""
      };
    }
  });

  return draft;
}

function saveReceivingDraftFromInputs(order) {
  if (!order) {
    return;
  }

  const draft = getReceivingDraftForPurchaseOrder(order);

  document.querySelectorAll("[data-po-receive-qty]").forEach((input) => {
    const itemId = input.dataset.poReceiveQty;

    draft[itemId] = draft[itemId] || {};
    draft[itemId].receivedNowQty = input.value;
  });

  document.querySelectorAll("[data-po-receive-notes]").forEach((input) => {
    const itemId = input.dataset.poReceiveNotes;

    draft[itemId] = draft[itemId] || {};
    draft[itemId].notes = input.value;
  });

  window.DMC_PURCHASE_ORDER_RECEIVING_DRAFT[order.purchaseOrderId] = draft;
}

function receivePurchaseOrderFull(order) {
  if (!order || !canPurchaseOrderReceive(order)) {
    return;
  }

  const draft = getReceivingDraftForPurchaseOrder(order);

  (order.lines || []).forEach((line) => {
    const remainingQty = getPurchaseOrderLineRemainingQty(line);

    draft[line.itemId] = draft[line.itemId] || {};
    draft[line.itemId].receivedNowQty = remainingQty > 0 ? remainingQty : "";
  });

  window.DMC_PURCHASE_ORDER_RECEIVING_DRAFT[order.purchaseOrderId] = draft;
  refreshPurchaseOrdersPage();
}

function getPurchaseOrderReceivingLines(order) {
  if (!order) {
    return [];
  }

  const draft = getReceivingDraftForPurchaseOrder(order);

  return (order.lines || [])
    .map((line) => {
      const receivedNowQty = Number(draft[line.itemId]?.receivedNowQty || 0);
      const remainingQty = getPurchaseOrderLineRemainingQty(line);

      if (
        Number.isNaN(receivedNowQty) ||
        receivedNowQty <= 0 ||
        remainingQty <= 0
      ) {
        return null;
      }

      return {
        ...line,
        receivedNowQty: Math.min(receivedNowQty, remainingQty),
        receivingNotes: draft[line.itemId]?.notes || ""
      };
    })
    .filter(Boolean);
}

function buildPurchaseOrderReceivingLedgerEntries(order, receivingLines) {
  const submittedAt = new Date().toISOString();
  const submittedAtDisplay = getPurchaseOrderReadableTimestamp();

  return receivingLines.map((line) => ({
    date: getPurchaseOrderTodayDate(),
    submittedAt,
    submittedAtDisplay,
    batchId: order.purchaseOrderId,
    purchaseOrderId: order.purchaseOrderId,
    department: "Warehouse",
    location: "Warehouse",
    destination: "Warehouse",
    section: line.section || "",
    itemId: line.itemId || "",
    itemName: line.itemName || "",
    movementType: "Received",
    stockEffect: "add",
    quantity: line.receivedNowQty,
    unit: line.unit || "",
    source: "Purchase Order Receiving",
    notes: `Received to Warehouse from ${order.supplier || "supplier"} for PO ${
      order.purchaseOrderId
    }. ${line.receivingNotes || ""}`.trim()
  }));
}

function submitPurchaseOrder(order) {
  if (!order || !canPurchaseOrderSubmit(order)) {
    return;
  }

  const submitOrder = () => {
    const now = new Date().toISOString();
    const orders = getStoredPurchaseOrders();

    const updatedOrders = orders.map((storedOrder) => {
      if (storedOrder.purchaseOrderId !== order.purchaseOrderId) {
        return storedOrder;
      }

      return {
        ...storedOrder,
        status: "Submitted",
        updatedAt: now,
        statusHistory: [
          ...(storedOrder.statusHistory || []),
          {
            status: "Submitted",
            timestamp: now,
            note: "Purchase Order submitted and ready for buying/receiving."
          }
        ]
      };
    });

    savePurchaseOrders(updatedOrders);
    refreshPurchaseOrdersPage();
  };

  if (typeof window.DMC_CONFIRM_MODAL === "function") {
    window.DMC_CONFIRM_MODAL({
      type: "success",
      title: "Submit Purchase Order?",
      message: `${order.purchaseOrderId} will be marked as Submitted and ready for buying/receiving.`,
      confirmLabel: "Submit PO",
      cancelLabel: "Cancel",
      onConfirm: submitOrder
    });
  } else if (confirm(`Submit ${order.purchaseOrderId}?`)) {
    submitOrder();
  }
}

function confirmPurchaseOrderReceiving(order) {
  if (!order || !canPurchaseOrderReceive(order)) {
    return;
  }

  saveReceivingDraftFromInputs(order);

  const receivingLines = getPurchaseOrderReceivingLines(order);

  if (receivingLines.length === 0) {
    alert("No received quantities entered.");
    return;
  }

  const confirmReceiving = () => {
    const currentLedgerEntries = getPurchaseOrderLedgerEntries();
    const newLedgerEntries = buildPurchaseOrderReceivingLedgerEntries(
      order,
      receivingLines
    );

    savePurchaseOrderLedgerEntries([
      ...currentLedgerEntries,
      ...newLedgerEntries
    ]);

    const now = new Date().toISOString();
    const orders = getStoredPurchaseOrders();

    const updatedOrders = orders.map((storedOrder) => {
      if (storedOrder.purchaseOrderId !== order.purchaseOrderId) {
        return storedOrder;
      }

      const updatedLines = (storedOrder.lines || []).map((line) => {
        const receivedLine = receivingLines.find(
          (item) => String(item.itemId) === String(line.itemId)
        );

        if (!receivedLine) {
          return line;
        }

        return {
          ...line,
          receivedQty:
            getPurchaseOrderLineReceivedQty(line) + receivedLine.receivedNowQty
        };
      });

      const allCompleted = updatedLines.every(
        (line) => getPurchaseOrderLineRemainingQty(line) <= 0
      );

      const nextStatus = allCompleted ? "Completed" : "Partially Received";

      return {
        ...storedOrder,
        lines: updatedLines,
        status: nextStatus,
        updatedAt: now,
        receivedAt: allCompleted ? now : storedOrder.receivedAt || "",
        statusHistory: [
          ...(storedOrder.statusHistory || []),
          {
            status: nextStatus,
            timestamp: now,
            note: `Received ${receivingLines.length} purchase order line(s). Warehouse Ledger Received entries created.`
          }
        ]
      };
    });

    savePurchaseOrders(updatedOrders);

    delete window.DMC_PURCHASE_ORDER_RECEIVING_DRAFT[order.purchaseOrderId];

    if (typeof window.DMC_SHOW_MODAL === "function") {
      window.DMC_SHOW_MODAL({
        type: "success",
        title: "Receiving Confirmed",
        message:
          "Purchase Order receiving was confirmed. Warehouse stock was updated through the Ledger.",
        confirmLabel: "Got it"
      });
    } else {
      alert(
        "Purchase Order receiving confirmed. Warehouse stock was updated through the Ledger."
      );
    }

    refreshPurchaseOrdersPage();
  };

  if (typeof window.DMC_CONFIRM_MODAL === "function") {
    window.DMC_CONFIRM_MODAL({
      type: "success",
      title: "Confirm Receiving?",
      message: `Confirm receiving ${receivingLines.length} purchase order line(s) for ${order.purchaseOrderId}?`,
      confirmLabel: "Confirm Receiving",
      cancelLabel: "Cancel",
      onConfirm: confirmReceiving
    });
  } else if (
    confirm(
      `Confirm receiving ${receivingLines.length} purchase order line(s) for ${order.purchaseOrderId}?`
    )
  ) {
    confirmReceiving();
  }
}

function renderPurchaseOrderReceivingPanel(order) {
  if (!order) {
    return "";
  }

  if (order.status === "Draft") {
    return `
      <div class="branch-order-section purchase-order-receiving-panel">
        <h4>Receiving</h4>
        <div class="instruction-box">
          <strong>Draft PO:</strong>
          <span>Submit this Purchase Order before confirming actual purchased quantities.</span>
        </div>
      </div>
    `;
  }

  if (order.status === "Completed") {
    return `
      <div class="branch-order-section purchase-order-receiving-panel">
        <h4>Receiving</h4>
        <div class="instruction-box">
          <strong>Completed:</strong>
          <span>This Purchase Order is fully received and locked.</span>
        </div>
      </div>
    `;
  }

  if (order.status === "Cancelled") {
    return `
      <div class="branch-order-section purchase-order-receiving-panel">
        <h4>Receiving</h4>
        <div class="instruction-box">
          <strong>Cancelled:</strong>
          <span>This Purchase Order is cancelled and cannot be received.</span>
        </div>
      </div>
    `;
  }

  const draft = getReceivingDraftForPurchaseOrder(order);
  const receivingLines = getPurchaseOrderReceivingLines(order);

  return `
    <div class="branch-order-section purchase-order-receiving-panel">
      <div class="panel-header">
        <div>
          <h4>Receive Purchase Order</h4>
          <p>
            Enter actual quantities bought/received. Confirming receiving creates
            Warehouse / Received Ledger entries and increases Warehouse Stock.
          </p>
        </div>

        <div class="form-actions">
          <button class="ghost-button" id="receive-full-purchase-order">
            Receive Remaining
          </button>

          <button class="primary-button" id="confirm-purchase-order-receiving">
            Confirm Receiving
          </button>
        </div>
      </div>

      <div class="instruction-box">
        <strong>Receiving Preview:</strong>
        <span>
          ${receivingLines.length} line(s) ready to receive. Only entered quantities will be added to Warehouse stock.
        </span>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Ordered</th>
              <th>Received</th>
              <th>Remaining</th>
              <th>Actual Received Now</th>
              <th>Unit</th>
              <th>Notes</th>
            </tr>
          </thead>

          <tbody>
            ${(order.lines || [])
              .map((line) => {
                const receivedQty = getPurchaseOrderLineReceivedQty(line);
                const remainingQty = getPurchaseOrderLineRemainingQty(line);
                const lineDraft = draft[line.itemId] || {};

                return `
                  <tr>
                    <td>${line.itemName || "-"}</td>
                    <td>${getPurchaseOrderLineOrderQty(line)}</td>
                    <td>${receivedQty}</td>
                    <td>${remainingQty}</td>
                    <td>
                      <input
                        class="purchase-order-qty-input"
                        data-po-receive-qty="${line.itemId}"
                        type="number"
                        min="0"
                        max="${remainingQty}"
                        step="any"
                        placeholder="0"
                        value="${lineDraft.receivedNowQty || ""}"
                        ${remainingQty <= 0 ? "disabled" : ""}
                      />
                    </td>
                    <td>${line.unit || "-"}</td>
                    <td>
                      <input
                        class="purchase-order-receive-note-input"
                        data-po-receive-notes="${line.itemId}"
                        type="text"
                        placeholder="Optional"
                        value="${lineDraft.notes || ""}"
                        ${remainingQty <= 0 ? "disabled" : ""}
                      />
                    </td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderSelectedPurchaseOrder() {
  const order = getSelectedPurchaseOrder();

  if (!order) {
    return `
      <section class="panel purchase-order-detail">
        <div class="order-list-empty">
          <p>No purchase order selected.</p>
          <span>Select a purchase order from the left panel.</span>
        </div>
      </section>
    `;
  }

  return `
    <section class="panel purchase-order-detail">
      <div class="panel-header">
        <div>
          <h3>${order.purchaseOrderId}</h3>
          <p>
            ${order.supplier || "No supplier"} • Expected:
            ${order.expectedDate || "-"}
          </p>
        </div>

        <div class="form-actions">
          ${
            canPurchaseOrderSubmit(order)
              ? `<button class="primary-button" id="submit-selected-purchase-order">
                  Submit PO
                </button>`
              : ""
          }

          <span class="badge ${getPurchaseOrderStatusBadgeClass(
            order.status
          )}">
            ${order.status || "Draft"}
          </span>
        </div>
      </div>

      <div class="branch-order-info-grid">
        <div>
          <p class="eyebrow">Created At</p>
          <strong>${formatPurchaseOrderDateTime(order.createdAt)}</strong>
        </div>

        <div>
          <p class="eyebrow">Updated At</p>
          <strong>${formatPurchaseOrderDateTime(order.updatedAt)}</strong>
        </div>

        <div>
          <p class="eyebrow">Items</p>
          <strong>${(order.lines || []).length}</strong>
        </div>

        <div>
          <p class="eyebrow">Status</p>
          <strong>${order.status || "Draft"}</strong>
        </div>

        <div>
          <p class="eyebrow">Source</p>
          <strong>${order.source || "Purchase Order"}</strong>
        </div>

        <div>
          <p class="eyebrow">Prepared By</p>
          <strong>${order.preparedBy || "-"}</strong>
        </div>
      </div>

      <div class="branch-order-section">
        <h4>Order Lines</h4>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Section</th>
                <th>Item</th>
                <th>Current</th>
                <th>Minimum</th>
                <th>Ordered</th>
                <th>Received</th>
                <th>Remaining</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              ${(order.lines || [])
                .map(
                  (line) => `
                    <tr>
                      <td>${line.section || "-"}</td>
                      <td>${line.itemName || "-"}</td>
                      <td>${line.currentStock ?? line.currentStockAtCreation ?? "-"}</td>
                      <td>${line.minimumStock ?? line.minimumStockAtCreation ?? "-"}</td>
                      <td>${getPurchaseOrderLineOrderQty(line)}</td>
                      <td>${getPurchaseOrderLineReceivedQty(line)}</td>
                      <td>${getPurchaseOrderLineRemainingQty(line)}</td>
                      <td>${line.unit || "-"}</td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>

      ${renderPurchaseOrderReceivingPanel(order)}

      <div class="branch-order-section">
        <h4>Notes</h4>
        <div class="instruction-box">
          <strong>Purchase Notes:</strong>
          <span>${order.notes || "-"}</span>
        </div>
      </div>
    </section>
  `;
}

function getPurchaseOrdersContent() {
  const summary = getPurchaseOrdersSummary();

  return `
    <section class="grid">
      <div class="card">
        <p>Total POs</p>
        <strong>${summary.totalPOs}</strong>
      </div>

      <div class="card">
        <p>Drafts</p>
        <strong>${summary.drafts}</strong>
      </div>

      <div class="card">
        <p>Submitted</p>
        <strong>${summary.submitted}</strong>
      </div>

      <div class="card">
        <p>Partial</p>
        <strong>${summary.partial}</strong>
      </div>

      <div class="card">
        <p>Pending Items</p>
        <strong>${summary.pendingItems}</strong>
      </div>
    </section>

    <section class="branch-orders-layout">
      <section class="panel branch-order-list-panel">
        <div class="panel-header">
          <div>
            <h3>Purchase Orders</h3>
            <p>
              Track Shopping List purchase orders, buying progress, and Warehouse receiving.
            </p>
          </div>

          <select id="purchase-order-status-filter">
            ${renderPurchaseOrderStatusOptions()}
          </select>
        </div>

        <div class="filter-bar branch-order-search-bar">
          <label class="filter-search">
            Search
            <input
              id="purchase-order-search"
              type="text"
              placeholder="Search PO, supplier, manager, item..."
              value="${window.DMC_PURCHASE_ORDERS_SEARCH}"
            />
          </label>
        </div>

        ${renderPurchaseOrderList()}
      </section>

      ${renderSelectedPurchaseOrder()}
    </section>
  `;
}

function refreshPurchaseOrdersPage() {
  window.DMC_PAGES["purchase-orders"].content = getPurchaseOrdersContent();
  renderPage("purchase-orders");
}

function setupPurchaseOrdersEvents() {
  const statusFilter = document.getElementById("purchase-order-status-filter");
  const searchInput = document.getElementById("purchase-order-search");
  const selectedOrder = getSelectedPurchaseOrder();

  if (statusFilter) {
    statusFilter.addEventListener("change", () => {
      window.DMC_PURCHASE_ORDERS_STATUS_FILTER = statusFilter.value;
      window.DMC_PURCHASE_ORDERS_SELECTED_ID = "";
      refreshPurchaseOrdersPage();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("change", () => {
      window.DMC_PURCHASE_ORDERS_SEARCH = searchInput.value;
      window.DMC_PURCHASE_ORDERS_SELECTED_ID = "";
      refreshPurchaseOrdersPage();
    });
  }

  document.querySelectorAll("[data-select-purchase-order]").forEach((button) => {
    button.addEventListener("click", () => {
      window.DMC_PURCHASE_ORDERS_SELECTED_ID =
        button.dataset.selectPurchaseOrder;

      refreshPurchaseOrdersPage();
    });
  });

  document.querySelectorAll("[data-po-receive-qty]").forEach((input) => {
    input.addEventListener("change", () => {
      saveReceivingDraftFromInputs(selectedOrder);
      refreshPurchaseOrdersPage();
    });
  });

  document.querySelectorAll("[data-po-receive-notes]").forEach((input) => {
    input.addEventListener("change", () => {
      saveReceivingDraftFromInputs(selectedOrder);
    });
  });

  const submitSelectedButton = document.getElementById(
    "submit-selected-purchase-order"
  );

  if (submitSelectedButton) {
    submitSelectedButton.addEventListener("click", () => {
      submitPurchaseOrder(selectedOrder);
    });
  }

  const receiveFullButton = document.getElementById(
    "receive-full-purchase-order"
  );
  const confirmReceivingButton = document.getElementById(
    "confirm-purchase-order-receiving"
  );

  if (receiveFullButton) {
    receiveFullButton.addEventListener("click", () => {
      receivePurchaseOrderFull(selectedOrder);
    });
  }

  if (confirmReceivingButton) {
    confirmReceivingButton.addEventListener("click", () => {
      confirmPurchaseOrderReceiving(selectedOrder);
    });
  }
}

window.DMC_PAGES["purchase-orders"] = {
  eyebrow: "Warehouse",
  title: "Purchase Orders",
  description:
    "Review Shopping List purchase orders, confirm actual quantities bought, and receive items into Warehouse stock.",
  getContent: getPurchaseOrdersContent,
  content: getPurchaseOrdersContent(),
  afterRender: setupPurchaseOrdersEvents
};
