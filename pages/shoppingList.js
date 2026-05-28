window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_SHOPPING_LIST_PURCHASE_ORDERS_KEY = "dmc_purchase_orders";
const DMC_SHOPPING_LIST_LOG_KEY = "dmc_shopping_list_logs";

window.DMC_SHOPPING_LIST_SELECTED_PO_ID =
  window.DMC_SHOPPING_LIST_SELECTED_PO_ID || "";

window.DMC_SHOPPING_LIST_SEARCH = window.DMC_SHOPPING_LIST_SEARCH || "";

function getStoredShoppingListPurchaseOrders() {
  const storedOrders = localStorage.getItem(DMC_SHOPPING_LIST_PURCHASE_ORDERS_KEY);

  if (!storedOrders) {
    return [];
  }

  try {
    return JSON.parse(storedOrders);
  } catch {
    return [];
  }
}

function saveShoppingListPurchaseOrders(orders) {
  localStorage.setItem(
    DMC_SHOPPING_LIST_PURCHASE_ORDERS_KEY,
    JSON.stringify(orders)
  );
}

function getStoredShoppingListLogs() {
  const storedLogs = localStorage.getItem(DMC_SHOPPING_LIST_LOG_KEY);

  if (!storedLogs) {
    return [];
  }

  try {
    return JSON.parse(storedLogs);
  } catch {
    return [];
  }
}

function saveShoppingListLogs(logs) {
  localStorage.setItem(DMC_SHOPPING_LIST_LOG_KEY, JSON.stringify(logs));
}

function getShoppingListReadableTimestamp() {
  const now = new Date();

  return now.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatShoppingListDateTime(value) {
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

function getShoppingListTimestamp(order) {
  if (order.updatedAt) {
    return new Date(order.updatedAt).getTime();
  }

  if (order.createdAt) {
    return new Date(order.createdAt).getTime();
  }

  return 0;
}

function getShoppingListActiveOrders() {
  const searchValue = String(window.DMC_SHOPPING_LIST_SEARCH || "")
    .toLowerCase()
    .trim();

  return getStoredShoppingListPurchaseOrders()
    .filter((order) =>
      ["Submitted", "Partially Received"].includes(order.status)
    )
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
    .sort((a, b) => getShoppingListTimestamp(b) - getShoppingListTimestamp(a));
}

function getSelectedShoppingListOrder() {
  const orders = getShoppingListActiveOrders();

  if (window.DMC_SHOPPING_LIST_SELECTED_PO_ID) {
    const selectedOrder = orders.find(
      (order) => order.purchaseOrderId === window.DMC_SHOPPING_LIST_SELECTED_PO_ID
    );

    if (selectedOrder) {
      return selectedOrder;
    }
  }

  return orders[0] || null;
}

function getShoppingListLineReceivedQty(line) {
  const value = Number(line.receivedQty || 0);
  return Number.isNaN(value) ? 0 : value;
}

function getShoppingListLineRemainingQty(line) {
  const orderedQty = Number(line.orderQty || 0);
  const receivedQty = getShoppingListLineReceivedQty(line);

  return Math.max(orderedQty - receivedQty, 0);
}

function getShoppingListRemainingLines(order) {
  if (!order) {
    return [];
  }

  return (order.lines || []).filter(
    (line) => getShoppingListLineRemainingQty(line) > 0
  );
}

function getShoppingListSummary() {
  const activeOrders = getShoppingListActiveOrders();
  const logs = getStoredShoppingListLogs();

  const remainingItems = activeOrders.reduce(
    (total, order) => total + getShoppingListRemainingLines(order).length,
    0
  );

  return {
    activePOs: activeOrders.length,
    submitted: activeOrders.filter((order) => order.status === "Submitted")
      .length,
    partial: activeOrders.filter((order) => order.status === "Partially Received")
      .length,
    remainingItems,
    logs: logs.length
  };
}

function getShoppingListStatusBadgeClass(status) {
  if (status === "Submitted") return "info-badge";
  if (status === "Partially Received") return "warning-badge";
  return "";
}

function renderShoppingListOrderList() {
  const orders = getShoppingListActiveOrders();
  const selectedOrder = getSelectedShoppingListOrder();

  if (orders.length === 0) {
    return `
      <div class="order-list-empty">
        <p>No active shopping lists.</p>
        <span>Submitted or partially received Purchase Orders will appear here.</span>
      </div>
    `;
  }

  return `
    <div class="branch-order-list">
      ${orders
        .map((order) => {
          const remainingLines = getShoppingListRemainingLines(order);

          return `
            <button
              class="branch-order-list-item ${
                selectedOrder?.purchaseOrderId === order.purchaseOrderId
                  ? "active"
                  : ""
              }"
              data-select-shopping-list-po="${order.purchaseOrderId}"
            >
              <div>
                <strong>${order.purchaseOrderId}</strong>
                <p>${order.supplier || "No supplier"} • ${remainingLines.length} remaining item(s)</p>
                <span>
                  Expected: ${order.expectedDate || "-"} • Updated:
                  ${formatShoppingListDateTime(order.updatedAt)}
                </span>
              </div>

              <div class="branch-order-list-meta">
                <span class="badge ${getShoppingListStatusBadgeClass(order.status)}">
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

function renderShoppingListPrintableLines(order) {
  const lines = getShoppingListRemainingLines(order);

  if (lines.length === 0) {
    return `
      <tr>
        <td colspan="8">No remaining items to buy for this Purchase Order.</td>
      </tr>
    `;
  }

  return lines
    .map(
      (line, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${line.section || "-"}</td>
          <td>${line.itemName || "-"}</td>
          <td>${line.orderQty}</td>
          <td>${getShoppingListLineReceivedQty(line)}</td>
          <td>${getShoppingListLineRemainingQty(line)}</td>
          <td>${line.unit || "-"}</td>
          <td class="shopping-list-check-cell"></td>
        </tr>
      `
    )
    .join("");
}

function getShoppingListLogsForOrder(orderId) {
  return getStoredShoppingListLogs()
    .filter((log) => log.purchaseOrderId === orderId)
    .sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
}

function renderShoppingListLogs(order) {
  if (!order) {
    return "";
  }

  const logs = getShoppingListLogsForOrder(order.purchaseOrderId);

  if (logs.length === 0) {
    return `
      <div class="instruction-box">
        <strong>No Print Log:</strong>
        <span>This shopping list has not been logged as printed/used yet.</span>
      </div>
    `;
  }

  return `
    <div class="shopping-list-log-list">
      ${logs
        .map(
          (log) => `
            <div class="shopping-list-log-card">
              <div>
                <strong>${log.action}</strong>
                <p>${log.loggedAtDisplay || formatShoppingListDateTime(log.loggedAt)}</p>
                <span>${log.notes || "No notes"}</span>
              </div>

              <span class="badge">${log.itemCount} item(s)</span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderSelectedShoppingList() {
  const order = getSelectedShoppingListOrder();

  if (!order) {
    return `
      <section class="panel shopping-list-detail">
        <div class="order-list-empty">
          <p>No shopping list selected.</p>
          <span>Select a submitted Purchase Order from the left panel.</span>
        </div>
      </section>
    `;
  }

  const remainingLines = getShoppingListRemainingLines(order);

  return `
    <section class="panel shopping-list-detail">
      <div class="shopping-list-print-area" id="shopping-list-print-area">
        <div class="shopping-list-print-header">
          <div>
            <p class="eyebrow">Printable Shopping List</p>
            <h3>${order.purchaseOrderId}</h3>
            <span>
              Supplier: ${order.supplier || "-"} • Expected: ${
                order.expectedDate || "-"
              }
            </span>
          </div>

          <div class="shopping-list-print-meta">
            <strong>DMC Commissary</strong>
            <span>Generated: ${getShoppingListReadableTimestamp()}</span>
            <span>Status: ${order.status || "-"}</span>
          </div>
        </div>

        <div class="shopping-list-print-summary">
          <div>
            <p class="eyebrow">Remaining Items</p>
            <strong>${remainingLines.length}</strong>
          </div>

          <div>
            <p class="eyebrow">Supplier</p>
            <strong>${order.supplier || "-"}</strong>
          </div>

          <div>
            <p class="eyebrow">Expected Date</p>
            <strong>${order.expectedDate || "-"}</strong>
          </div>

          <div>
            <p class="eyebrow">PO Status</p>
            <strong>${order.status || "-"}</strong>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Section</th>
                <th>Item</th>
                <th>Ordered</th>
                <th>Received</th>
                <th>To Buy</th>
                <th>Unit</th>
                <th>Check</th>
              </tr>
            </thead>

            <tbody>
              ${renderShoppingListPrintableLines(order)}
            </tbody>
          </table>
        </div>

        <div class="shopping-list-print-footer">
          <div>
            <strong>Buyer Name / Signature:</strong>
            <span></span>
          </div>

          <div>
            <strong>Checked By:</strong>
            <span></span>
          </div>

          <div>
            <strong>Notes:</strong>
            <span></span>
          </div>
        </div>
      </div>

      <div class="shopping-list-actions no-print">
        <div class="instruction-box">
          <strong>Shopping List Rule:</strong>
          <span>
            Shopping List is for printing and buying guidance only. Stock is updated
            through Purchase Orders → Receive Purchase Order.
          </span>
        </div>

        <div class="form-actions">
          <button class="primary-button" id="print-shopping-list">
            Print Shopping List
          </button>

          <button class="ghost-button" id="log-shopping-list-used">
            Log as Printed / Used
          </button>
        </div>
      </div>

      <div class="branch-order-section no-print">
        <h4>Print / Use Log</h4>
        ${renderShoppingListLogs(order)}
      </div>
    </section>
  `;
}

function getShoppingListContent() {
  const summary = getShoppingListSummary();

  return `
    <section class="grid no-print">
      <div class="card">
        <p>Active POs</p>
        <strong>${summary.activePOs}</strong>
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
        <p>Remaining Items</p>
        <strong>${summary.remainingItems}</strong>
      </div>

      <div class="card">
        <p>Print Logs</p>
        <strong>${summary.logs}</strong>
      </div>
    </section>

    <section class="branch-orders-layout shopping-list-layout">
      <section class="panel branch-order-list-panel no-print">
        <div class="panel-header">
          <div>
            <h3>Shopping Lists</h3>
            <p>Printable buying lists generated from submitted Purchase Orders.</p>
          </div>

          <span class="badge info-badge">From POs</span>
        </div>

        <div class="filter-bar branch-order-search-bar">
          <label class="filter-search">
            Search
            <input
              id="shopping-list-search"
              type="text"
              placeholder="Search PO, supplier, item..."
              value="${window.DMC_SHOPPING_LIST_SEARCH}"
            />
          </label>
        </div>

        ${renderShoppingListOrderList()}
      </section>

      ${renderSelectedShoppingList()}
    </section>
  `;
}

function refreshShoppingListPage() {
  window.DMC_PAGES["shopping-list"].content = getShoppingListContent();
  renderPage("shopping-list");
}

function logSelectedShoppingListUsed(order) {
  if (!order) {
    return;
  }

  const remainingLines = getShoppingListRemainingLines(order);

  const notes = prompt(
    "Optional notes for this shopping list print/use log:",
    "Printed for buyer."
  );

  if (notes === null) {
    return;
  }

  const now = new Date().toISOString();

  const newLog = {
    logId: `SL-${Date.now()}`,
    purchaseOrderId: order.purchaseOrderId,
    supplier: order.supplier || "",
    action: "Printed / Used",
    itemCount: remainingLines.length,
    notes: notes || "",
    loggedAt: now,
    loggedAtDisplay: getShoppingListReadableTimestamp()
  };

  saveShoppingListLogs([newLog, ...getStoredShoppingListLogs()]);

  alert("Shopping List print/use log saved.");
  refreshShoppingListPage();
}

function setupShoppingListEvents() {
  const searchInput = document.getElementById("shopping-list-search");

  if (searchInput) {
    searchInput.addEventListener("change", () => {
      window.DMC_SHOPPING_LIST_SEARCH = searchInput.value;
      window.DMC_SHOPPING_LIST_SELECTED_PO_ID = "";
      refreshShoppingListPage();
    });
  }

  document.querySelectorAll("[data-select-shopping-list-po]").forEach((button) => {
    button.addEventListener("click", () => {
      window.DMC_SHOPPING_LIST_SELECTED_PO_ID =
        button.dataset.selectShoppingListPo;

      refreshShoppingListPage();
    });
  });

  const selectedOrder = getSelectedShoppingListOrder();

  const printButton = document.getElementById("print-shopping-list");
  const logButton = document.getElementById("log-shopping-list-used");

  if (printButton) {
    printButton.addEventListener("click", () => {
      window.print();
    });
  }

  if (logButton) {
    logButton.addEventListener("click", () => {
      logSelectedShoppingListUsed(selectedOrder);
    });
  }
}

window.DMC_PAGES["shopping-list"] = {
  eyebrow: "Commissary",
  title: "Shopping List",
  description:
    "Printable buying checklists generated from submitted Purchase Orders.",
  getContent: getShoppingListContent,
  content: getShoppingListContent(),
  afterRender: setupShoppingListEvents
};
