window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_PURCHASE_ORDERS_STORAGE_KEY = "dmc_purchase_orders";
const DMC_PURCHASE_ORDERS_COMMISSARY_STOCK_KEY = "dmc_commissary_stock_items";
const DMC_PURCHASE_ORDERS_LEDGER_KEY = "dmc_inventory_ledger_entries";

window.DMC_PURCHASE_ORDERS_SELECTED_ID =
  window.DMC_PURCHASE_ORDERS_SELECTED_ID || "";

window.DMC_PURCHASE_ORDERS_STATUS_FILTER =
  window.DMC_PURCHASE_ORDERS_STATUS_FILTER || "all";

window.DMC_PURCHASE_ORDERS_SEARCH =
  window.DMC_PURCHASE_ORDERS_SEARCH || "";

window.DMC_PURCHASE_ORDER_DRAFT =
  window.DMC_PURCHASE_ORDER_DRAFT || {
    supplier: "",
    expectedDate: "",
    notes: "",
    lines: {}
  };

function getStoredPurchaseOrders() {
  const storedOrders = localStorage.getItem(DMC_PURCHASE_ORDERS_STORAGE_KEY);

  if (!storedOrders) {
    return [];
  }

  try {
    return JSON.parse(storedOrders);
  } catch {
    return [];
  }
}

function savePurchaseOrders(orders) {
  localStorage.setItem(DMC_PURCHASE_ORDERS_STORAGE_KEY, JSON.stringify(orders));
}

function getPurchaseOrderCommissaryStockItems() {
  const storedItems = localStorage.getItem(DMC_PURCHASE_ORDERS_COMMISSARY_STOCK_KEY);

  if (storedItems) {
    try {
      return JSON.parse(storedItems);
    } catch {
      return window.DMC_DATA?.commissaryStock || [];
    }
  }

  return window.DMC_DATA?.commissaryStock || [];
}

function getPurchaseOrderLedgerEntries() {
  const storedEntries = localStorage.getItem(DMC_PURCHASE_ORDERS_LEDGER_KEY);

  if (!storedEntries) {
    return window.DMC_DATA?.ledger || [];
  }

  try {
    return JSON.parse(storedEntries);
  } catch {
    return window.DMC_DATA?.ledger || [];
  }
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

function createPurchaseOrderId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replaceAll("-", "");
  const timePart = now.toTimeString().slice(0, 8).replaceAll(":", "");

  return `PO-${datePart}-${timePart}`;
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

function getPurchaseOrderItemId(item) {
  return item.itemId || item.id || "";
}

function getPurchaseOrderItemName(item) {
  return item.itemName || item.officialItemName || item.name || "-";
}

function getPurchaseOrderStartingStock(item) {
  const value = Number(item.startingStock ?? item.currentStock ?? 0);
  return Number.isNaN(value) ? 0 : value;
}

function getPurchaseOrderMinimumStock(item) {
  const value = Number(
    item.minimumStock ?? item.minStock ?? item.reorderLevel ?? item.parLevel ?? 0
  );

  return Number.isNaN(value) ? 0 : value;
}

function getPurchaseOrderCommissaryLedgerEntries() {
  return getPurchaseOrderLedgerEntries().filter(
    (entry) => entry.department === "Commissary"
  );
}

function getPurchaseOrderMovementTotals(itemId) {
  const totals = {
    received: 0,
    transferIn: 0,
    usage: 0,
    waste: 0,
    transferOut: 0,
    adjustment: 0
  };

  getPurchaseOrderCommissaryLedgerEntries()
    .filter((entry) => entry.itemId === itemId)
    .forEach((entry) => {
      const quantity = Number(entry.quantity || 0);

      if (Number.isNaN(quantity)) {
        return;
      }

      if (entry.movementType === "Received") {
        totals.received += quantity;
      }

      if (entry.movementType === "Transfer In") {
        totals.transferIn += quantity;
      }

      if (entry.movementType === "Usage") {
        totals.usage += quantity;
      }

      if (entry.movementType === "Waste") {
        totals.waste += quantity;
      }

      if (entry.movementType === "Transfer Out") {
        totals.transferOut += quantity;
      }

      if (entry.movementType === "Adjustment") {
        totals.adjustment += quantity;
      }
    });

  return totals;
}

function getPurchaseOrderCalculatedStock(item) {
  const itemId = getPurchaseOrderItemId(item);
  const startingStock = getPurchaseOrderStartingStock(item);
  const totals = getPurchaseOrderMovementTotals(itemId);

  return (
    startingStock +
    totals.received +
    totals.transferIn -
    totals.usage -
    totals.waste -
    totals.transferOut +
    totals.adjustment
  );
}

function getPurchaseOrderStockRows() {
  const stockItems = getPurchaseOrderCommissaryStockItems();

  return stockItems.map((item) => {
    const itemId = getPurchaseOrderItemId(item);
    const currentStock = getPurchaseOrderCalculatedStock(item);
    const minimumStock = getPurchaseOrderMinimumStock(item);
    const targetStock = minimumStock > 0 ? minimumStock * 2 : currentStock;
    const suggestedQty = Math.max(targetStock - currentStock, 0);

    let status = "Good";

    if (currentStock <= 0) {
      status = "Critical";
    } else if (minimumStock > 0 && currentStock <= minimumStock * 0.5) {
      status = "Critical";
    } else if (minimumStock > 0 && currentStock < minimumStock) {
      status = "Low Stock";
    }

    return {
      ...item,
      itemId,
      itemName: getPurchaseOrderItemName(item),
      section: item.section || "",
      unit: item.unit || "",
      currentStock,
      minimumStock,
      targetStock,
      suggestedQty,
      status
    };
  });
}

function getPurchaseOrderSuggestionRows() {
  return getPurchaseOrderStockRows()
    .filter((item) => item.status === "Critical" || item.status === "Low Stock")
    .sort((a, b) => {
      const priorityA = a.status === "Critical" ? 0 : 1;
      const priorityB = b.status === "Critical" ? 0 : 1;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return Number(a.currentStock || 0) - Number(b.currentStock || 0);
    });
}

function getPurchaseOrderDraftLine(itemId) {
  const draft = window.DMC_PURCHASE_ORDER_DRAFT;

  draft.lines[itemId] =
    draft.lines[itemId] || {
      include: true,
      orderQty: ""
    };

  return draft.lines[itemId];
}

function seedPurchaseOrderDraftFromSuggestions() {
  const draft = window.DMC_PURCHASE_ORDER_DRAFT;

  getPurchaseOrderSuggestionRows().forEach((item) => {
    if (!draft.lines[item.itemId]) {
      draft.lines[item.itemId] = {
        include: true,
        orderQty: item.suggestedQty || ""
      };
    }
  });
}

function getPurchaseOrderPreparedLines() {
  seedPurchaseOrderDraftFromSuggestions();

  return getPurchaseOrderSuggestionRows()
    .map((item) => {
      const draftLine = getPurchaseOrderDraftLine(item.itemId);
      const orderQty = Number(draftLine.orderQty || 0);

      if (!draftLine.include || Number.isNaN(orderQty) || orderQty <= 0) {
        return null;
      }

      return {
        itemId: item.itemId,
        itemName: item.itemName,
        section: item.section,
        unit: item.unit,
        currentStock: item.currentStock,
        minimumStock: item.minimumStock,
        targetStock: item.targetStock,
        suggestedQty: item.suggestedQty,
        orderQty,
        status: item.status
      };
    })
    .filter(Boolean);
}

function getPurchaseOrdersSummary() {
  const orders = getStoredPurchaseOrders();
  const suggestions = getPurchaseOrderSuggestionRows();

  return {
    totalPOs: orders.length,
    drafts: orders.filter((order) => order.status === "Draft").length,
    submitted: orders.filter((order) => order.status === "Submitted").length,
    completed: orders.filter((order) => order.status === "Completed").length,
    suggestedItems: suggestions.length
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
        String(order.purchaseOrderId || "").toLowerCase().includes(searchValue) ||
        String(order.supplier || "").toLowerCase().includes(searchValue) ||
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

function getPurchaseOrderStockStatusBadgeClass(status) {
  if (status === "Critical") return "danger-badge";
  if (status === "Low Stock") return "warning-badge";
  return "";
}

function renderPurchaseOrderStatusOptions() {
  const current = window.DMC_PURCHASE_ORDERS_STATUS_FILTER;
  const statuses = ["Draft", "Submitted", "Partially Received", "Completed", "Cancelled"];

  return `
    <option value="all" ${current === "all" ? "selected" : ""}>All Purchase Orders</option>
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
        <span>Create a draft from low-stock suggestions.</span>
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
                <p>${order.supplier || "No supplier"} • ${(order.lines || []).length} item(s)</p>
                <span>
                  Expected: ${order.expectedDate || "-"} • Updated:
                  ${formatPurchaseOrderDateTime(order.updatedAt)}
                </span>
              </div>

              <div class="branch-order-list-meta">
                <span class="badge ${getPurchaseOrderStatusBadgeClass(order.status)}">
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

function renderPurchaseOrderSuggestionRows() {
  seedPurchaseOrderDraftFromSuggestions();

  const suggestions = getPurchaseOrderSuggestionRows();

  if (suggestions.length === 0) {
    return `
      <tr>
        <td colspan="9">No low or critical commissary stock suggestions right now.</td>
      </tr>
    `;
  }

  return suggestions
    .map((item) => {
      const draftLine = getPurchaseOrderDraftLine(item.itemId);

      return `
        <tr>
          <td>
            <input
              data-po-line-include="${item.itemId}"
              type="checkbox"
              ${draftLine.include !== false ? "checked" : ""}
            />
          </td>
          <td>${item.section || "-"}</td>
          <td>${item.itemName}</td>
          <td>${item.currentStock}</td>
          <td>${item.minimumStock}</td>
          <td>${item.targetStock}</td>
          <td>
            <span class="badge ${getPurchaseOrderStockStatusBadgeClass(item.status)}">
              ${item.status}
            </span>
          </td>
          <td>
            <input
              class="purchase-order-qty-input"
              data-po-line-qty="${item.itemId}"
              type="number"
              min="0"
              step="any"
              value="${draftLine.orderQty || item.suggestedQty || ""}"
            />
          </td>
          <td>${item.unit || "-"}</td>
        </tr>
      `;
    })
    .join("");
}

function renderPurchaseOrderBuilder() {
  const draft = window.DMC_PURCHASE_ORDER_DRAFT;
  const preparedLines = getPurchaseOrderPreparedLines();

  return `
    <section class="panel purchase-order-builder">
      <div class="panel-header">
        <div>
          <h3>Create Purchase Order</h3>
          <p>
            Suggested quantities are based on Commissary low/critical stock.
            Formula: Target Stock = Minimum Stock × 2.
          </p>
        </div>

        <div class="form-actions">
          <button class="ghost-button" id="clear-purchase-order-draft">
            Clear Draft
          </button>

          <button class="primary-button" id="save-purchase-order-draft">
            Save Draft
          </button>

          <button class="primary-button" id="submit-purchase-order">
            Submit PO
          </button>
        </div>
      </div>

      <div class="purchase-order-meta-grid">
        <label>
          Supplier
          <input
            id="purchase-order-supplier"
            type="text"
            placeholder="Example: Local Supplier"
            value="${draft.supplier || ""}"
          />
        </label>

        <label>
          Expected Delivery Date
          <input
            id="purchase-order-expected-date"
            type="date"
            value="${draft.expectedDate || ""}"
          />
        </label>

        <label class="form-full">
          Notes
          <textarea
            id="purchase-order-notes"
            rows="3"
            placeholder="Supplier notes, price notes, delivery instructions..."
          >${draft.notes || ""}</textarea>
        </label>
      </div>

      <div class="instruction-box">
        <strong>Purchase Order Rule:</strong>
        <span>
          Creating or submitting a Purchase Order does not change stock.
          Commissary Stock only increases when the PO is received in the next step.
        </span>
      </div>

      <div class="submit-preview-box">
        <div>
          <h4>PO Preview</h4>
          <p>${preparedLines.length} item(s) ready to order.</p>
        </div>

        ${
          preparedLines.length === 0
            ? `<p class="submit-preview-empty">No suggested items selected yet.</p>`
            : `
              <ul class="submit-preview-list">
                ${preparedLines
                  .map(
                    (line) => `
                      <li>
                        <strong>${line.itemName}</strong>
                        <span>${line.orderQty} ${line.unit}</span>
                      </li>
                    `
                  )
                  .join("")}
              </ul>
            `
        }
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Include</th>
              <th>Section</th>
              <th>Item</th>
              <th>Current</th>
              <th>Minimum</th>
              <th>Target</th>
              <th>Status</th>
              <th>Order Qty</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            ${renderPurchaseOrderSuggestionRows()}
          </tbody>
        </table>
      </div>
    </section>
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
            ${order.supplier || "No supplier"} • Expected: ${order.expectedDate || "-"}
          </p>
        </div>

        <span class="badge ${getPurchaseOrderStatusBadgeClass(order.status)}">
          ${order.status || "Draft"}
        </span>
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
                <th>Target</th>
                <th>Suggested</th>
                <th>Ordered</th>
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
                      <td>${line.currentStock}</td>
                      <td>${line.minimumStock}</td>
                      <td>${line.targetStock}</td>
                      <td>${line.suggestedQty}</td>
                      <td>${line.orderQty}</td>
                      <td>${line.unit || "-"}</td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>

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
        <p>Suggested Items</p>
        <strong>${summary.suggestedItems}</strong>
      </div>
    </section>

    <section class="branch-orders-layout">
      <section class="panel branch-order-list-panel">
        <div class="panel-header">
          <div>
            <h3>Purchase Orders</h3>
            <p>Track supplier orders for commissary replenishment.</p>
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
              placeholder="Search PO, supplier, item..."
              value="${window.DMC_PURCHASE_ORDERS_SEARCH}"
            />
          </label>
        </div>

        ${renderPurchaseOrderList()}
      </section>

      ${renderSelectedPurchaseOrder()}
    </section>

    ${renderPurchaseOrderBuilder()}
  `;
}

function refreshPurchaseOrdersPage() {
  window.DMC_PAGES["purchase-orders"].content = getPurchaseOrdersContent();
  renderPage("purchase-orders");
}

function savePurchaseOrderDraftFromInputs() {
  const supplierInput = document.getElementById("purchase-order-supplier");
  const expectedDateInput = document.getElementById("purchase-order-expected-date");
  const notesInput = document.getElementById("purchase-order-notes");

  window.DMC_PURCHASE_ORDER_DRAFT.supplier = supplierInput?.value || "";
  window.DMC_PURCHASE_ORDER_DRAFT.expectedDate = expectedDateInput?.value || "";
  window.DMC_PURCHASE_ORDER_DRAFT.notes = notesInput?.value || "";

  document.querySelectorAll("[data-po-line-include]").forEach((input) => {
    const itemId = input.dataset.poLineInclude;
    const draftLine = getPurchaseOrderDraftLine(itemId);

    draftLine.include = input.checked;
  });

  document.querySelectorAll("[data-po-line-qty]").forEach((input) => {
    const itemId = input.dataset.poLineQty;
    const draftLine = getPurchaseOrderDraftLine(itemId);

    draftLine.orderQty = input.value;
  });
}

function createPurchaseOrderFromDraft(status) {
  savePurchaseOrderDraftFromInputs();

  const draft = window.DMC_PURCHASE_ORDER_DRAFT;
  const preparedLines = getPurchaseOrderPreparedLines();

  if (preparedLines.length === 0) {
    alert("No purchase order lines selected.");
    return;
  }

  if (status === "Submitted" && !String(draft.supplier || "").trim()) {
    alert("Please enter a supplier before submitting.");
    return;
  }

  const confirmed = confirm(
    status === "Submitted"
      ? `Submit purchase order with ${preparedLines.length} item(s)?`
      : `Save purchase order draft with ${preparedLines.length} item(s)?`
  );

  if (!confirmed) {
    return;
  }

  const now = new Date().toISOString();

  const newOrder = {
    purchaseOrderId: createPurchaseOrderId(),
    supplier: draft.supplier || "",
    expectedDate: draft.expectedDate || "",
    notes: draft.notes || "",
    status,
    lines: preparedLines,
    createdAt: now,
    updatedAt: now,
    statusHistory: [
      {
        status,
        timestamp: now,
        note:
          status === "Submitted"
            ? "Purchase Order submitted to supplier."
            : "Purchase Order saved as draft."
      }
    ]
  };

  const orders = getStoredPurchaseOrders();

  savePurchaseOrders([newOrder, ...orders]);

  window.DMC_PURCHASE_ORDERS_SELECTED_ID = newOrder.purchaseOrderId;
  window.DMC_PURCHASE_ORDER_DRAFT = {
    supplier: "",
    expectedDate: "",
    notes: "",
    lines: {}
  };

  alert(
    status === "Submitted"
      ? "Purchase Order submitted."
      : "Purchase Order draft saved."
  );

  refreshPurchaseOrdersPage();
}

function setupPurchaseOrdersEvents() {
  const statusFilter = document.getElementById("purchase-order-status-filter");
  const searchInput = document.getElementById("purchase-order-search");

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

  [
    "purchase-order-supplier",
    "purchase-order-expected-date",
    "purchase-order-notes"
  ].forEach((id) => {
    const input = document.getElementById(id);

    if (input) {
      input.addEventListener("change", () => {
        savePurchaseOrderDraftFromInputs();
      });
    }
  });

  document.querySelectorAll("[data-po-line-include]").forEach((input) => {
    input.addEventListener("change", () => {
      savePurchaseOrderDraftFromInputs();
      refreshPurchaseOrdersPage();
    });
  });

  document.querySelectorAll("[data-po-line-qty]").forEach((input) => {
    input.addEventListener("change", () => {
      savePurchaseOrderDraftFromInputs();
      refreshPurchaseOrdersPage();
    });
  });

  const clearButton = document.getElementById("clear-purchase-order-draft");
  const saveDraftButton = document.getElementById("save-purchase-order-draft");
  const submitButton = document.getElementById("submit-purchase-order");

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      const confirmed = confirm("Clear purchase order draft?");

      if (!confirmed) {
        return;
      }

      window.DMC_PURCHASE_ORDER_DRAFT = {
        supplier: "",
        expectedDate: "",
        notes: "",
        lines: {}
      };

      refreshPurchaseOrdersPage();
    });
  }

  if (saveDraftButton) {
    saveDraftButton.addEventListener("click", () => {
      createPurchaseOrderFromDraft("Draft");
    });
  }

  if (submitButton) {
    submitButton.addEventListener("click", () => {
      createPurchaseOrderFromDraft("Submitted");
    });
  }
}

window.DMC_PAGES["purchase-orders"] = {
  eyebrow: "Commissary",
  title: "Purchase Orders",
  description:
    "Create supplier purchase orders from low-stock commissary suggestions.",
  getContent: getPurchaseOrdersContent,
  content: getPurchaseOrdersContent(),
  afterRender: setupPurchaseOrdersEvents
};
