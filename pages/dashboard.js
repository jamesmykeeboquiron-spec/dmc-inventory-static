window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_DASHBOARD_LEDGER_KEY = "dmc_inventory_ledger_entries";
const DMC_DASHBOARD_COMMISSARY_STOCK_KEY = "dmc_commissary_stock_items";
const DMC_DASHBOARD_BRANCH_ORDERS_KEY = "dmc_branch_orders";
const DMC_DASHBOARD_PURCHASE_ORDERS_KEY = "dmc_purchase_orders";
const DMC_DASHBOARD_DELIVERY_ISSUES_KEY = "dmc_delivery_issues";
const DMC_DASHBOARD_SHOPPING_LOGS_KEY = "dmc_shopping_list_logs";
const DMC_DASHBOARD_PANEL_SETTINGS_KEY = "dmc_commissary_dashboard_panel_settings";

const DMC_DASHBOARD_DEFAULT_PANELS = [
  "stock",
  "orders",
  "purchase-orders",
  "shopping-list",
  "issues",
  "ledger"
];

window.DMC_DASHBOARD_ACTIVE_PANEL = window.DMC_DASHBOARD_ACTIVE_PANEL || "";
window.DMC_DASHBOARD_CUSTOMIZE_OPEN =
  window.DMC_DASHBOARD_CUSTOMIZE_OPEN || false;

function getDashboardStoredArray(key, fallback = []) {
  const storedValue = localStorage.getItem(key);

  if (!storedValue) {
    return fallback;
  }

  try {
    return JSON.parse(storedValue);
  } catch {
    return fallback;
  }
}

function getDashboardLedgerEntries() {
  return getDashboardStoredArray(
    DMC_DASHBOARD_LEDGER_KEY,
    window.DMC_DATA?.ledger || []
  );
}

function getDashboardCommissaryStockItems() {
  return getDashboardStoredArray(
    DMC_DASHBOARD_COMMISSARY_STOCK_KEY,
    window.DMC_DATA?.commissaryStock || []
  );
}

function getDashboardBranchOrders() {
  return getDashboardStoredArray(DMC_DASHBOARD_BRANCH_ORDERS_KEY, []);
}

function getDashboardPurchaseOrders() {
  return getDashboardStoredArray(DMC_DASHBOARD_PURCHASE_ORDERS_KEY, []);
}

function getDashboardDeliveryIssues() {
  return getDashboardStoredArray(DMC_DASHBOARD_DELIVERY_ISSUES_KEY, []);
}

function getDashboardShoppingLogs() {
  return getDashboardStoredArray(DMC_DASHBOARD_SHOPPING_LOGS_KEY, []);
}

function getDashboardVisiblePanels() {
  const storedPanels = localStorage.getItem(DMC_DASHBOARD_PANEL_SETTINGS_KEY);

  if (!storedPanels) {
    return DMC_DASHBOARD_DEFAULT_PANELS;
  }

  try {
    const parsedPanels = JSON.parse(storedPanels);

    if (!Array.isArray(parsedPanels)) {
      return DMC_DASHBOARD_DEFAULT_PANELS;
    }

    return parsedPanels;
  } catch {
    return DMC_DASHBOARD_DEFAULT_PANELS;
  }
}

function saveDashboardVisiblePanels(panels) {
  localStorage.setItem(DMC_DASHBOARD_PANEL_SETTINGS_KEY, JSON.stringify(panels));
}

function resetDashboardVisiblePanels() {
  saveDashboardVisiblePanels(DMC_DASHBOARD_DEFAULT_PANELS);
}

function formatDashboardDateTime(value) {
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

function getDashboardLedgerTimestamp(entry) {
  if (entry.submittedAt) {
    return new Date(entry.submittedAt).getTime();
  }

  if (entry.date) {
    return new Date(entry.date).getTime();
  }

  return 0;
}

function getDashboardOrderTimestamp(order) {
  if (order.updatedAt) {
    return new Date(order.updatedAt).getTime();
  }

  if (order.createdAt) {
    return new Date(order.createdAt).getTime();
  }

  if (order.orderDate) {
    return new Date(order.orderDate).getTime();
  }

  return 0;
}

function getDashboardIssueTimestamp(issue) {
  if (issue.resolvedAt) {
    return new Date(issue.resolvedAt).getTime();
  }

  if (issue.createdAt) {
    return new Date(issue.createdAt).getTime();
  }

  return 0;
}

function getDashboardItemId(item) {
  return item.itemId || item.id || "";
}

function getDashboardItemName(item) {
  return item.itemName || item.officialItemName || item.name || "-";
}

function getDashboardStartingStock(item) {
  const value = Number(item.startingStock ?? item.currentStock ?? 0);
  return Number.isNaN(value) ? 0 : value;
}

function getDashboardMinimumStock(item) {
  const value = Number(
    item.minimumStock ?? item.minStock ?? item.reorderLevel ?? item.parLevel ?? 0
  );

  return Number.isNaN(value) ? 0 : value;
}

function getDashboardCommissaryLedgerEntries() {
  return getDashboardLedgerEntries().filter(
    (entry) => entry.department === "Commissary"
  );
}

function getDashboardMovementTotals(itemId) {
  const totals = {
    received: 0,
    transferIn: 0,
    usage: 0,
    waste: 0,
    transferOut: 0,
    adjustment: 0
  };

  getDashboardCommissaryLedgerEntries()
    .filter((entry) => entry.itemId === itemId)
    .forEach((entry) => {
      const quantity = Number(entry.quantity || 0);

      if (Number.isNaN(quantity)) {
        return;
      }

      if (entry.movementType === "Received") totals.received += quantity;
      if (entry.movementType === "Transfer In") totals.transferIn += quantity;
      if (entry.movementType === "Usage") totals.usage += quantity;
      if (entry.movementType === "Waste") totals.waste += quantity;
      if (entry.movementType === "Transfer Out") totals.transferOut += quantity;
      if (entry.movementType === "Adjustment") totals.adjustment += quantity;
    });

  return totals;
}

function getDashboardCalculatedStock(item) {
  const itemId = getDashboardItemId(item);
  const startingStock = getDashboardStartingStock(item);
  const totals = getDashboardMovementTotals(itemId);

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

function getDashboardStockRows() {
  return getDashboardCommissaryStockItems().map((item) => {
    const currentStock = getDashboardCalculatedStock(item);
    const minimumStock = getDashboardMinimumStock(item);

    let status = "Good";

    if (currentStock <= 0) {
      status = "Critical";
    } else if (minimumStock > 0 && currentStock <= minimumStock * 0.5) {
      status = "Critical";
    } else if (minimumStock > 0 && currentStock < minimumStock) {
      status = "Low Stock";
    }

    return {
      itemId: getDashboardItemId(item),
      itemName: getDashboardItemName(item),
      section: item.section || "",
      unit: item.unit || "",
      currentStock,
      minimumStock,
      status
    };
  });
}

function getDashboardStockAlerts(limit = 1000) {
  return getDashboardStockRows()
    .filter((item) => item.status === "Critical" || item.status === "Low Stock")
    .sort((a, b) => {
      const priorityA = a.status === "Critical" ? 0 : 1;
      const priorityB = b.status === "Critical" ? 0 : 1;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return Number(a.currentStock || 0) - Number(b.currentStock || 0);
    })
    .slice(0, limit);
}

function getDashboardPendingBranchOrders(limit = 1000) {
  return getDashboardBranchOrders()
    .filter((order) =>
      ["Submitted", "Accepted", "Fulfillment Started"].includes(order.status)
    )
    .sort((a, b) => getDashboardOrderTimestamp(b) - getDashboardOrderTimestamp(a))
    .slice(0, limit);
}

function getDashboardActivePurchaseOrders(limit = 1000) {
  return getDashboardPurchaseOrders()
    .filter((order) =>
      ["Submitted", "Partially Received"].includes(order.status)
    )
    .sort((a, b) => getDashboardOrderTimestamp(b) - getDashboardOrderTimestamp(a))
    .slice(0, limit);
}

function getDashboardShoppingListOrders(limit = 1000) {
  return getDashboardPurchaseOrders()
    .filter((order) =>
      ["Submitted", "Partially Received"].includes(order.status)
    )
    .sort((a, b) => getDashboardOrderTimestamp(b) - getDashboardOrderTimestamp(a))
    .slice(0, limit);
}

function getDashboardOpenIssues(limit = 1000) {
  return getDashboardDeliveryIssues()
    .filter((issue) => issue.status !== "Resolved")
    .sort((a, b) => getDashboardIssueTimestamp(b) - getDashboardIssueTimestamp(a))
    .slice(0, limit);
}

function getDashboardRecentCommissaryLedger(limit = 1000) {
  return getDashboardCommissaryLedgerEntries()
    .sort(
      (a, b) => getDashboardLedgerTimestamp(b) - getDashboardLedgerTimestamp(a)
    )
    .slice(0, limit);
}

function getDashboardSummary() {
  return {
    lowStock: getDashboardStockAlerts().length,
    pendingOrders: getDashboardPendingBranchOrders().length,
    activePurchaseOrders: getDashboardActivePurchaseOrders().length,
    deliveryIssues: getDashboardOpenIssues().length,
    shoppingLists: getDashboardShoppingListOrders().length,
    recentLedger: getDashboardRecentCommissaryLedger().length
  };
}

function getDashboardBadgeClass(status) {
  if (status === "Critical") return "danger-badge";
  if (status === "Low Stock") return "warning-badge";
  if (status === "Submitted") return "info-badge";
  if (status === "Accepted") return "warning-badge";
  if (status === "Fulfillment Started") return "warning-badge";
  if (status === "Partially Received") return "warning-badge";
  if (status === "Open") return "danger-badge";
  if (status === "Under Review") return "warning-badge";
  if (status === "Resolved") return "info-badge";
  return "";
}

function getDashboardPanelConfig() {
  const summary = getDashboardSummary();

  return [
    {
      key: "stock",
      title: "Commissary Stock Alerts",
      subtitle: "Critical and low stock items that need action.",
      value: summary.lowStock,
      helper: summary.lowStock === 1 ? "item needs attention" : "items need attention",
      tag: "Review",
      tone: "red",
      icon: "⚠",
      content: renderDashboardStockAlerts(20)
    },
    {
      key: "orders",
      title: "Branch Orders Queue",
      subtitle: "Branch requests waiting for fulfillment or delivery.",
      value: summary.pendingOrders,
      helper: summary.pendingOrders === 1 ? "order in queue" : "orders in queue",
      tag: "Orders",
      tone: "gold",
      icon: "▭",
      content: renderDashboardBranchOrders(20)
    },
    {
      key: "purchase-orders",
      title: "Purchase Orders",
      subtitle: "Supplier POs submitted, partial, or needing receiving.",
      value: summary.activePurchaseOrders,
      helper:
        summary.activePurchaseOrders === 1
          ? "active purchase order"
          : "active purchase orders",
      tag: "Supply",
      tone: "blue",
      icon: "▤",
      content: renderDashboardPurchaseOrders(20)
    },
    {
      key: "shopping-list",
      title: "Shopping Lists",
      subtitle: "Printable lists generated from submitted purchase orders.",
      value: summary.shoppingLists,
      helper:
        summary.shoppingLists === 1 ? "list ready to print" : "lists ready to print",
      tag: "Print",
      tone: "green",
      icon: "☰",
      content: renderDashboardShoppingLists(20)
    },
    {
      key: "issues",
      title: "Delivery Issues",
      subtitle: "Variance records returned to commissary for review.",
      value: summary.deliveryIssues,
      helper:
        summary.deliveryIssues === 1 ? "open issue record" : "open issue records",
      tag: "Issues",
      tone: "pink",
      icon: "↺",
      content: renderDashboardDeliveryIssues(20)
    },
    {
      key: "ledger",
      title: "Recent Commissary Movements",
      subtitle: "Latest Received, Transfer Out, Waste, and Adjustment entries.",
      value: summary.recentLedger,
      helper:
        summary.recentLedger === 1 ? "recent ledger record" : "recent ledger records",
      tag: "Ledger",
      tone: "gold",
      icon: "◷",
      content: renderDashboardLedger(20)
    }
  ];
}

function renderDashboardStatCard(label, value, helper, tone) {
  return `
    <div class="commissary-stat-card ${tone || ""}">
      <div class="commissary-stat-top">
        <span>${label}</span>
        <i></i>
      </div>
      <strong>${value}</strong>
      <p>${helper}</p>
    </div>
  `;
}

function renderDashboardEmpty(title, helper) {
  return `
    <div class="commissary-dashboard-empty">
      <p>${title}</p>
      <span>${helper}</span>
    </div>
  `;
}

function renderDashboardStockAlerts(limit = 20) {
  const alerts = getDashboardStockAlerts(limit);

  if (alerts.length === 0) {
    return renderDashboardEmpty(
      "No stock alerts",
      "Commissary has no low or critical stock items right now."
    );
  }

  return `
    <div class="commissary-dashboard-feed">
      ${alerts
        .map(
          (item) => `
            <div class="commissary-dashboard-feed-item">
              <div>
                <strong>${item.itemName}</strong>
                <p>${item.section || "Commissary"}</p>
                <span>
                  Current: ${item.currentStock} ${item.unit || ""}
                  ${
                    item.minimumStock > 0
                      ? `• Minimum: ${item.minimumStock} ${item.unit || ""}`
                      : "• No minimum set"
                  }
                </span>
              </div>

              <span class="badge ${getDashboardBadgeClass(item.status)}">
                ${item.status}
              </span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderDashboardBranchOrders(limit = 20) {
  const orders = getDashboardPendingBranchOrders(limit);

  if (orders.length === 0) {
    return renderDashboardEmpty(
      "No pending branch orders",
      "Submitted branch orders will appear here."
    );
  }

  return `
    <div class="commissary-dashboard-feed">
      ${orders
        .map(
          (order) => `
            <div class="commissary-dashboard-feed-item">
              <div>
                <strong>${order.orderId || "-"}</strong>
                <p>${order.department || "-"} • ${(order.lines || []).length} item(s)</p>
                <span>Updated: ${formatDashboardDateTime(order.updatedAt || order.orderDate)}</span>
              </div>

              <span class="badge ${getDashboardBadgeClass(order.status)}">
                ${order.status || "-"}
              </span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderDashboardPurchaseOrders(limit = 20) {
  const orders = getDashboardActivePurchaseOrders(limit);

  if (orders.length === 0) {
    return renderDashboardEmpty(
      "No active purchase orders",
      "Submitted or partially received supplier POs will appear here."
    );
  }

  return `
    <div class="commissary-dashboard-feed">
      ${orders
        .map(
          (order) => `
            <div class="commissary-dashboard-feed-item">
              <div>
                <strong>${order.purchaseOrderId || "-"}</strong>
                <p>${order.supplier || "No supplier"} • ${(order.lines || []).length} item(s)</p>
                <span>Expected: ${order.expectedDate || "-"} • Updated: ${formatDashboardDateTime(order.updatedAt)}</span>
              </div>

              <span class="badge ${getDashboardBadgeClass(order.status)}">
                ${order.status || "-"}
              </span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderDashboardShoppingLists(limit = 20) {
  const orders = getDashboardShoppingListOrders(limit);
  const logs = getDashboardShoppingLogs();

  if (orders.length === 0) {
    return renderDashboardEmpty(
      "No active shopping lists",
      "Submitted or partially received Purchase Orders generate shopping lists."
    );
  }

  return `
    <div class="commissary-dashboard-feed">
      ${orders
        .map((order) => {
          const matchingLogs = logs.filter(
            (log) => log.purchaseOrderId === order.purchaseOrderId
          );

          return `
            <div class="commissary-dashboard-feed-item">
              <div>
                <strong>${order.purchaseOrderId || "-"}</strong>
                <p>${order.supplier || "No supplier"} • ${(order.lines || []).length} item(s)</p>
                <span>
                  ${matchingLogs.length} print/use log(s)
                  • Expected: ${order.expectedDate || "-"}
                </span>
              </div>

              <span class="badge info-badge">Printable</span>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderDashboardDeliveryIssues(limit = 20) {
  const issues = getDashboardOpenIssues(limit);

  if (issues.length === 0) {
    return renderDashboardEmpty(
      "No open delivery issues",
      "Variance records needing review will appear here."
    );
  }

  return `
    <div class="commissary-dashboard-feed">
      ${issues
        .map(
          (issue) => `
            <div class="commissary-dashboard-feed-item">
              <div>
                <strong>${issue.itemName || "-"}</strong>
                <p>${issue.orderId || "-"} • ${issue.issueReason || "Issue"}</p>
                <span>
                  Sent ${issue.sentQty || 0} / Received ${issue.receivedQty || 0}
                  ${issue.unit || ""}
                </span>
              </div>

              <span class="badge ${getDashboardBadgeClass(issue.status)}">
                ${issue.status || "Open"}
              </span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderDashboardLedger(limit = 20) {
  const entries = getDashboardRecentCommissaryLedger(limit);

  if (entries.length === 0) {
    return renderDashboardEmpty(
      "No commissary ledger activity",
      "Received, Transfer Out, Waste, and Adjustment entries will appear here."
    );
  }

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Item</th>
            <th>Movement</th>
            <th>Qty</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          ${entries
            .map(
              (entry) => `
                <tr>
                  <td>${entry.date || "-"}</td>
                  <td>${entry.itemName || "-"}</td>
                  <td>${entry.movementType || "-"}</td>
                  <td>${entry.quantity || 0} ${entry.unit || ""}</td>
                  <td>${entry.source || "-"}</td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderDashboardPanelCard(panel) {
  return `
    <section class="commissary-dashboard-panel ${panel.tone || ""}">
      <button
        class="commissary-dashboard-panel-click"
        data-open-dashboard-panel="${panel.key}"
        aria-label="Open ${panel.title}"
      ></button>

      <div class="commissary-dashboard-panel-header">
        <div class="commissary-dashboard-panel-title-row">
          <span class="commissary-dashboard-panel-icon">${panel.icon}</span>
          <div>
            <h3>${panel.title}</h3>
            <p>${panel.subtitle}</p>
          </div>
        </div>

        <span class="commissary-dashboard-tag">${panel.tag}</span>
      </div>

      <div class="commissary-dashboard-panel-preview">
        <strong>${panel.value}</strong>
        <p>${panel.helper}</p>
      </div>

      <div class="commissary-dashboard-expand-hint">
        <span>Click to expand</span>
        <span>›</span>
      </div>
    </section>
  `;
}

function renderDashboardPanels() {
  const visiblePanels = getDashboardVisiblePanels();
  const panels = getDashboardPanelConfig().filter((panel) =>
    visiblePanels.includes(panel.key)
  );

  if (panels.length === 0) {
    return `
      <section class="commissary-dashboard-no-panels">
        <p>No dashboard panels selected.</p>
        <span>Use Customize Dashboard to choose visible panels.</span>
      </section>
    `;
  }

  return panels.map(renderDashboardPanelCard).join("");
}

function getDashboardExpandedPanel() {
  const activePanel = window.DMC_DASHBOARD_ACTIVE_PANEL;

  if (!activePanel) {
    return null;
  }

  return getDashboardPanelConfig().find((panel) => panel.key === activePanel) || null;
}

function renderDashboardExpandedPanel() {
  const panel = getDashboardExpandedPanel();

  if (!panel) {
    return "";
  }

  return `
    <div class="commissary-dashboard-focus-overlay" data-close-dashboard-panel="true">
      <section class="commissary-dashboard-focus-panel" role="dialog" aria-modal="true">
        <div class="commissary-dashboard-focus-header">
          <div>
            <p class="eyebrow">${panel.tag}</p>
            <h3>${panel.title}</h3>
            <span>${panel.subtitle}</span>
          </div>

          <div class="commissary-dashboard-focus-actions">
            <span class="commissary-dashboard-tag">${panel.tag}</span>
            <button class="ghost-button" data-close-dashboard-panel="true">
              Close
            </button>
          </div>
        </div>

        <div class="commissary-dashboard-focus-content">
          ${panel.content}
        </div>
      </section>
    </div>
  `;
}

function renderDashboardCustomizeDrawer() {
  if (!window.DMC_DASHBOARD_CUSTOMIZE_OPEN) {
    return "";
  }

  const visiblePanels = getDashboardVisiblePanels();
  const panels = getDashboardPanelConfig();

  return `
    <div class="commissary-dashboard-customize-overlay">
      <aside class="commissary-dashboard-customize-drawer">
        <div class="commissary-dashboard-customize-header">
          <div>
            <p class="eyebrow">Dashboard Layout</p>
            <h3>Customize Panels</h3>
            <span>
              Choose which panels appear on the Commissary Dashboard.
            </span>
          </div>

          <button class="ghost-button" id="close-dashboard-customize">
            Close
          </button>
        </div>

        <div class="commissary-dashboard-customize-summary">
          <span>${visiblePanels.length} of ${panels.length} panels visible</span>
          <button class="tiny-button" id="reset-dashboard-panels">
            Reset Defaults
          </button>
        </div>

        <div class="commissary-dashboard-toggle-list">
          ${panels
            .map((panel) => {
              const checked = visiblePanels.includes(panel.key);

              return `
                <button
                  class="commissary-dashboard-toggle-item ${checked ? "active" : ""}"
                  data-toggle-dashboard-panel="${panel.key}"
                >
                  <span class="commissary-dashboard-panel-icon">${panel.icon}</span>

                  <span>
                    <strong>${panel.title}</strong>
                    <small>${checked ? "Visible on dashboard" : "Hidden from dashboard"}</small>
                  </span>

                  <i>${checked ? "On" : "Off"}</i>
                </button>
              `;
            })
            .join("")}
        </div>

        <button class="primary-button" id="apply-dashboard-customize">
          Apply Layout
        </button>
      </aside>
    </div>
  `;
}

function getDashboardContent() {
  const summary = getDashboardSummary();

  return `
    <section class="commissary-dashboard-hero">
      <div>
        <p class="eyebrow">Commissary Command Center</p>
        <h3>Today’s stockroom priorities</h3>
        <span>
          A clean overview for what needs action: low stock, branch orders,
          purchase orders, shopping lists, delivery issues, and recent commissary ledger movements.
        </span>
      </div>

      <div class="commissary-dashboard-hero-actions">
        <span class="commissary-dashboard-live-pill">● Live Overview</span>

        <button class="ghost-button" id="open-dashboard-customize">
          Customize Dashboard
        </button>
      </div>
    </section>

    <section class="commissary-dashboard-stats">
      ${renderDashboardStatCard(
        "Low Stock Items",
        summary.lowStock,
        "Critical and low stock items",
        summary.lowStock > 0 ? "red" : "green"
      )}

      ${renderDashboardStatCard(
        "Pending Branch Orders",
        summary.pendingOrders,
        "Orders waiting for commissary action",
        "gold"
      )}

      ${renderDashboardStatCard(
        "Active Purchase Orders",
        summary.activePurchaseOrders,
        "Submitted or partially received",
        "blue"
      )}

      ${renderDashboardStatCard(
        "Delivery Issues",
        summary.deliveryIssues,
        "Issues needing review",
        summary.deliveryIssues > 0 ? "pink" : "green"
      )}
    </section>

    <section class="commissary-dashboard-grid">
      ${renderDashboardPanels()}
    </section>

    <section class="commissary-dashboard-bottom-grid">
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Recent Commissary Ledger</h3>
            <p>Latest stockroom movement records.</p>
          </div>
          <span class="badge">Ledger</span>
        </div>

        ${renderDashboardLedger(5)}
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Urgent Stock Alerts</h3>
            <p>Highest priority items.</p>
          </div>
          <span class="badge danger-badge">Review</span>
        </div>

        ${renderDashboardStockAlerts(4)}
      </section>
    </section>

    ${renderDashboardExpandedPanel()}
    ${renderDashboardCustomizeDrawer()}
  `;
}

function refreshDashboardPage() {
  window.DMC_PAGES.dashboard.content = getDashboardContent();
  renderPage("dashboard");
}

function setupDashboardEvents() {
  const customizeButton = document.getElementById("open-dashboard-customize");
  const closeCustomizeButton = document.getElementById("close-dashboard-customize");
  const applyCustomizeButton = document.getElementById("apply-dashboard-customize");
  const resetPanelsButton = document.getElementById("reset-dashboard-panels");

  if (customizeButton) {
    customizeButton.addEventListener("click", () => {
      window.DMC_DASHBOARD_CUSTOMIZE_OPEN = true;
      refreshDashboardPage();
    });
  }

  if (closeCustomizeButton) {
    closeCustomizeButton.addEventListener("click", () => {
      window.DMC_DASHBOARD_CUSTOMIZE_OPEN = false;
      refreshDashboardPage();
    });
  }

  if (applyCustomizeButton) {
    applyCustomizeButton.addEventListener("click", () => {
      window.DMC_DASHBOARD_CUSTOMIZE_OPEN = false;
      refreshDashboardPage();
    });
  }

  if (resetPanelsButton) {
    resetPanelsButton.addEventListener("click", () => {
      resetDashboardVisiblePanels();
      refreshDashboardPage();
    });
  }

  document.querySelectorAll("[data-toggle-dashboard-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      const panelKey = button.dataset.toggleDashboardPanel;
      const visiblePanels = getDashboardVisiblePanels();

      if (visiblePanels.includes(panelKey)) {
        saveDashboardVisiblePanels(
          visiblePanels.filter((key) => key !== panelKey)
        );
      } else {
        saveDashboardVisiblePanels([...visiblePanels, panelKey]);
      }

      refreshDashboardPage();
    });
  });

  document.querySelectorAll("[data-open-dashboard-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      window.DMC_DASHBOARD_ACTIVE_PANEL = button.dataset.openDashboardPanel;
      refreshDashboardPage();
    });
  });

  document.querySelectorAll("[data-close-dashboard-panel]").forEach((element) => {
    element.addEventListener("click", (event) => {
      if (
        event.target.dataset.closeDashboardPanel === "true" ||
        event.currentTarget.dataset.closeDashboardPanel === "true"
      ) {
        window.DMC_DASHBOARD_ACTIVE_PANEL = "";
        refreshDashboardPage();
      }
    });
  });

  const focusPanel = document.querySelector(".commissary-dashboard-focus-panel");

  if (focusPanel) {
    focusPanel.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }
}

window.DMC_PAGES.dashboard = {
  eyebrow: "Overview",
  title: "Commissary Dashboard",
  description:
    "Stockroom command center for commissary stock, branch orders, purchase orders, shopping lists, delivery issues, and ledger movement.",
  getContent: getDashboardContent,
  content: getDashboardContent(),
  afterRender: setupDashboardEvents
};
