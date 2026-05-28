window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_BRANCH_DASHBOARD_ORDERS_KEY = "dmc_branch_orders";
const DMC_BRANCH_DASHBOARD_ISSUES_KEY = "dmc_delivery_issues";
const DMC_BRANCH_DASHBOARD_LEDGER_KEY = "dmc_inventory_ledger_entries";
const DMC_BRANCH_DASHBOARD_STOCK_KEY = "dmc_branch_stock_items";

const DMC_BRANCH_DASHBOARD_BRANCH_NAME = "DMC-Iriga Branch";

window.DMC_BRANCH_DASHBOARD_ACTIVE_PANEL =
  window.DMC_BRANCH_DASHBOARD_ACTIVE_PANEL || "";

function getBranchDashboardOrders() {
  const storedOrders = localStorage.getItem(DMC_BRANCH_DASHBOARD_ORDERS_KEY);

  if (!storedOrders) {
    return [];
  }

  try {
    return JSON.parse(storedOrders);
  } catch {
    return [];
  }
}

function getBranchDashboardIssues() {
  const storedIssues = localStorage.getItem(DMC_BRANCH_DASHBOARD_ISSUES_KEY);

  if (!storedIssues) {
    return [];
  }

  try {
    return JSON.parse(storedIssues);
  } catch {
    return [];
  }
}

function getBranchDashboardLedgerEntries() {
  const storedEntries = localStorage.getItem(DMC_BRANCH_DASHBOARD_LEDGER_KEY);

  if (!storedEntries) {
    return window.DMC_DATA?.ledger || [];
  }

  try {
    return JSON.parse(storedEntries);
  } catch {
    return window.DMC_DATA?.ledger || [];
  }
}

function getBranchDashboardBaseStockItems() {
  const storedItems = localStorage.getItem(DMC_BRANCH_DASHBOARD_STOCK_KEY);

  if (storedItems) {
    try {
      return JSON.parse(storedItems);
    } catch {
      return window.DMC_DATA?.branchStock || [];
    }
  }

  return window.DMC_DATA?.branchStock || [];
}

function formatBranchDashboardDateTime(value) {
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

function getBranchDashboardOrderTimestamp(order) {
  if (order.receiving?.receivedAt) {
    return new Date(order.receiving.receivedAt).getTime();
  }

  if (order.fulfillment?.sentAt) {
    return new Date(order.fulfillment.sentAt).getTime();
  }

  const latestStatus = order.statusHistory?.[order.statusHistory.length - 1];

  if (latestStatus?.timestamp) {
    return new Date(latestStatus.timestamp).getTime();
  }

  if (order.orderDate) {
    return new Date(order.orderDate).getTime();
  }

  return 0;
}

function getBranchDashboardLedgerTimestamp(entry) {
  if (entry.submittedAt) {
    return new Date(entry.submittedAt).getTime();
  }

  if (entry.date) {
    return new Date(entry.date).getTime();
  }

  return 0;
}

function isBranchDashboardBranchEntry(entry) {
  return entry.department && entry.department !== "Commissary";
}

function getBranchDashboardBranchLedgerEntries() {
  return getBranchDashboardLedgerEntries().filter(isBranchDashboardBranchEntry);
}

function getBranchDashboardSummary() {
  const orders = getBranchDashboardOrders();
  const issues = getBranchDashboardIssues();
  const stockAlerts = getBranchDashboardStockAlerts();

  return {
    pendingOrders: orders.filter((order) =>
      ["Submitted", "Accepted", "Fulfillment Started"].includes(order.status)
    ).length,
    incomingDeliveries: orders.filter((order) => order.status === "On the Way")
      .length,
    completedDeliveries: orders.filter((order) => order.status === "Completed")
      .length,
    openIssues: issues.filter((issue) => issue.status !== "Resolved").length,
    stockAlerts: stockAlerts.length
  };
}

function getRecentBranchDashboardOrders(limit = 6) {
  return [...getBranchDashboardOrders()]
    .sort(
      (a, b) =>
        getBranchDashboardOrderTimestamp(b) -
        getBranchDashboardOrderTimestamp(a)
    )
    .slice(0, limit);
}

function getRecentBranchDashboardLedgerEntries(limit = 6) {
  return getBranchDashboardBranchLedgerEntries()
    .sort(
      (a, b) =>
        getBranchDashboardLedgerTimestamp(b) -
        getBranchDashboardLedgerTimestamp(a)
    )
    .slice(0, limit);
}

function getRecentBranchDashboardIssues(limit = 5) {
  return [...getBranchDashboardIssues()]
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      return bTime - aTime;
    })
    .slice(0, limit);
}

function getBranchDashboardIncomingDeliveries(limit = 5) {
  return getBranchDashboardOrders()
    .filter((order) => order.status === "On the Way")
    .sort(
      (a, b) =>
        getBranchDashboardOrderTimestamp(b) -
        getBranchDashboardOrderTimestamp(a)
    )
    .slice(0, limit);
}

function getBranchDashboardStatusBadgeClass(status) {
  if (status === "Critical") return "danger-badge";
  if (status === "Low Stock") return "warning-badge";
  if (status === "Variance") return "warning-badge";
  if (status === "On the Way") return "info-badge";
  if (status === "Resolved") return "info-badge";
  if (status === "Open") return "danger-badge";
  if (status === "Under Review") return "warning-badge";
  return "";
}

function getBranchDashboardItemId(item) {
  return item.itemId || item.id || "";
}

function getBranchDashboardItemName(item) {
  return item.itemName || item.officialItemName || item.name || "-";
}

function getBranchDashboardStartingStock(item) {
  const value = Number(item.startingStock ?? item.currentStock ?? 0);
  return Number.isNaN(value) ? 0 : value;
}

function getBranchDashboardMinimumStock(item) {
  const value = Number(
    item.minimumStock ?? item.minStock ?? item.reorderLevel ?? item.parLevel ?? 0
  );

  return Number.isNaN(value) ? 0 : value;
}

function getBranchDashboardMovementTotals(itemId) {
  const totals = {
    received: 0,
    transferIn: 0,
    usage: 0,
    waste: 0,
    transferOut: 0,
    adjustment: 0
  };

  getBranchDashboardBranchLedgerEntries()
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

function getBranchDashboardCalculatedStock(item) {
  const itemId = getBranchDashboardItemId(item);
  const startingStock = getBranchDashboardStartingStock(item);
  const totals = getBranchDashboardMovementTotals(itemId);

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

function getBranchDashboardStockRows() {
  const stockItems = getBranchDashboardBaseStockItems();
  const itemMap = new Map();

  stockItems.forEach((item) => {
    const itemId = getBranchDashboardItemId(item);

    if (!itemId) {
      return;
    }

    itemMap.set(itemId, {
      ...item,
      itemId,
      itemName: getBranchDashboardItemName(item),
      unit: item.unit || "",
      section: item.section || "",
      minimumStock: getBranchDashboardMinimumStock(item),
      startingStock: getBranchDashboardStartingStock(item)
    });
  });

  getBranchDashboardBranchLedgerEntries().forEach((entry) => {
    if (!entry.itemId || itemMap.has(entry.itemId)) {
      return;
    }

    itemMap.set(entry.itemId, {
      itemId: entry.itemId,
      itemName: entry.itemName || entry.itemId,
      unit: entry.unit || "",
      section: entry.section || "",
      minimumStock: 0,
      startingStock: 0
    });
  });

  return [...itemMap.values()].map((item) => {
    const currentStock = getBranchDashboardCalculatedStock(item);
    const minimumStock = getBranchDashboardMinimumStock(item);

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
      currentStock,
      minimumStock,
      status
    };
  });
}

function getBranchDashboardStockAlerts(limit = 1000) {
  return getBranchDashboardStockRows()
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

function renderBranchDashboardStatCard(label, value, helper, variant) {
  return `
    <div class="branch-dashboard-stat-card ${variant || ""}">
      <div class="branch-dashboard-stat-top">
        <span>${label}</span>
        <i></i>
      </div>

      <strong>${value}</strong>
      <p>${helper}</p>
    </div>
  `;
}

function renderBranchDashboardPanelPreview(value, label, helper) {
  return `
    <div class="branch-dashboard-panel-preview">
      <strong>${value}</strong>
      <p>${label}</p>
      <span>${helper}</span>
    </div>
  `;
}

function renderBranchDashboardOrderList(limit = 20) {
  const orders = getRecentBranchDashboardOrders(limit);

  if (orders.length === 0) {
    return `
      <div class="branch-dashboard-empty">
        <p>No branch orders yet.</p>
        <span>Submitted orders will appear here.</span>
      </div>
    `;
  }

  return `
    <div class="branch-dashboard-feed">
      ${orders
        .map(
          (order) => `
            <div class="branch-dashboard-feed-item">
              <div>
                <strong>${order.orderId || "-"}</strong>
                <p>${order.department || "-"} • ${(order.lines || []).length} item(s)</p>
                <span>
                  Updated: ${formatBranchDashboardDateTime(
                    order.statusHistory?.[order.statusHistory.length - 1]
                      ?.timestamp || order.orderDate
                  )}
                </span>
              </div>

              <span class="badge ${getBranchDashboardStatusBadgeClass(
                order.status
              )}">
                ${order.status || "-"}
              </span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderBranchDashboardIncomingDeliveries(limit = 20) {
  const incomingOrders = getBranchDashboardIncomingDeliveries(limit);

  if (incomingOrders.length === 0) {
    return `
      <div class="branch-dashboard-empty">
        <p>No incoming deliveries.</p>
        <span>Orders marked On the Way will appear here.</span>
      </div>
    `;
  }

  return `
    <div class="branch-dashboard-feed">
      ${incomingOrders
        .map(
          (order) => `
            <div class="branch-dashboard-feed-item live-row">
              <div>
                <strong>${order.orderId || "-"}</strong>
                <p>Driver: ${order.fulfillment?.driver || "-"}</p>
                <span>
                  Sent: ${formatBranchDashboardDateTime(
                    order.fulfillment?.sentAt
                  )}
                </span>
              </div>

              <span class="badge info-badge">On the Way</span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderBranchDashboardIssues(limit = 20) {
  const issues = getRecentBranchDashboardIssues(limit);

  if (issues.length === 0) {
    return `
      <div class="branch-dashboard-empty">
        <p>No delivery issues.</p>
        <span>Variance records will appear here.</span>
      </div>
    `;
  }

  return `
    <div class="branch-dashboard-feed">
      ${issues
        .map(
          (issue) => `
            <div class="branch-dashboard-feed-item">
              <div>
                <strong>${issue.itemName || "-"}</strong>
                <p>${issue.orderId || "-"} • ${issue.issueReason || "Issue"}</p>
                <span>
                  Sent ${issue.sentQty} / Received ${issue.receivedQty}
                  ${issue.unit || ""}
                </span>
              </div>

              <span class="badge ${getBranchDashboardStatusBadgeClass(
                issue.status
              )}">
                ${issue.status || "Open"}
              </span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderBranchDashboardLedgerActivity(limit = 20) {
  const entries = getRecentBranchDashboardLedgerEntries(limit);

  if (entries.length === 0) {
    return `
      <div class="branch-dashboard-empty">
        <p>No branch ledger activity.</p>
        <span>Branch stock movements will appear here.</span>
      </div>
    `;
  }

  return `
    <div class="branch-dashboard-feed">
      ${entries
        .map(
          (entry) => `
            <div class="branch-dashboard-feed-item">
              <div>
                <strong>${entry.itemName || "-"}</strong>
                <p>${entry.department || "-"} • ${entry.movementType || "-"}</p>
                <span>
                  ${entry.quantity || 0} ${entry.unit || ""} • ${
                    entry.source || "-"
                  }
                </span>
              </div>

              <span class="badge">${entry.date || "-"}</span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderBranchDashboardStockAlerts(limit = 20) {
  const alerts = getBranchDashboardStockAlerts(limit);

  if (alerts.length === 0) {
    return `
      <div class="branch-dashboard-empty">
        <p>No low stock alerts.</p>
        <span>${DMC_BRANCH_DASHBOARD_BRANCH_NAME} has no critical or low stock items right now.</span>
      </div>
    `;
  }

  return `
    <div class="branch-dashboard-feed">
      ${alerts
        .map(
          (item) => `
            <div class="branch-dashboard-feed-item">
              <div>
                <strong>${item.itemName || "-"}</strong>
                <p>${item.section || DMC_BRANCH_DASHBOARD_BRANCH_NAME}</p>
                <span>
                  Current: ${item.currentStock} ${item.unit || ""}
                  ${
                    item.minimumStock > 0
                      ? `• Minimum: ${item.minimumStock} ${item.unit || ""}`
                      : "• No minimum set"
                  }
                </span>
              </div>

              <span class="badge ${getBranchDashboardStatusBadgeClass(
                item.status
              )}">
                ${item.status}
              </span>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderBranchDashboardPanel(panelKey, title, description, tag, tagClass, content) {
  return `
    <section class="branch-dashboard-glass-panel" data-dashboard-panel="${panelKey}">
      <button class="branch-dashboard-panel-click" data-open-dashboard-panel="${panelKey}" aria-label="Open ${title}"></button>

      <div class="branch-dashboard-panel-header">
        <div>
          <h3>${title}</h3>
          <p>${description}</p>
        </div>
        <span class="branch-dashboard-tag ${tagClass || ""}">
          ${tagClass === "live-tag" ? `<span class="live-dot"></span>` : ""}
          ${tag}
        </span>
      </div>

      ${content}

      <div class="branch-dashboard-expand-hint">
        Click to expand
      </div>
    </section>
  `;
}

function getBranchDashboardExpandedPanelConfig() {
  const activePanel = window.DMC_BRANCH_DASHBOARD_ACTIVE_PANEL;

  const panels = {
    incoming: {
      title: "Incoming Deliveries",
      eyebrow: "Live Delivery Monitor",
      description: "All deliveries currently on the way to the branch.",
      tag: "Live",
      tagClass: "live-tag",
      content: renderBranchDashboardIncomingDeliveries(20)
    },
    orders: {
      title: "Recent Branch Orders",
      eyebrow: "Order Activity",
      description: "Recent branch order activity and fulfillment statuses.",
      tag: "Orders",
      tagClass: "",
      content: renderBranchDashboardOrderList(20)
    },
    issues: {
      title: "Delivery Issues",
      eyebrow: "Variance Review",
      description: "Recent missing, damaged, short received, or resolved delivery issues.",
      tag: "Review",
      tagClass: "review-tag",
      content: renderBranchDashboardIssues(20)
    },
    ledger: {
      title: "Recent Stock Activity",
      eyebrow: "Ledger Activity",
      description: "Recent branch-side stock movements from the Ledger.",
      tag: "Ledger",
      tagClass: "",
      content: renderBranchDashboardLedgerActivity(20)
    },
    stock: {
      title: "Stock Alerts",
      eyebrow: "Branch Stock Monitor",
      description: `${DMC_BRANCH_DASHBOARD_BRANCH_NAME} items that are low or critical.`,
      tag: "Alerts",
      tagClass: "review-tag",
      content: renderBranchDashboardStockAlerts(20)
    }
  };

  return panels[activePanel] || null;
}

function renderBranchDashboardExpandedPanel() {
  const panel = getBranchDashboardExpandedPanelConfig();

  if (!panel) {
    return "";
  }

  return `
    <div class="branch-dashboard-focus-overlay" data-close-dashboard-panel="true">
      <section class="branch-dashboard-focus-panel" role="dialog" aria-modal="true">
        <div class="branch-dashboard-focus-header">
          <div>
            <p class="eyebrow">${panel.eyebrow}</p>
            <h3>${panel.title}</h3>
            <span>${panel.description}</span>
          </div>

          <div class="branch-dashboard-focus-actions">
            <span class="branch-dashboard-tag ${panel.tagClass || ""}">
              ${panel.tagClass === "live-tag" ? `<span class="live-dot"></span>` : ""}
              ${panel.tag}
            </span>

            <button class="ghost-button" data-close-dashboard-panel="true">
              Close
            </button>
          </div>
        </div>

        <div class="branch-dashboard-focus-content">
          ${panel.content}
        </div>
      </section>
    </div>
  `;
}

function getBranchDashboardContent() {
  const summary = getBranchDashboardSummary();
  const incomingCount = getBranchDashboardIncomingDeliveries(1000).length;
  const recentOrderCount = getRecentBranchDashboardOrders(1000).length;
  const recentIssueCount = getRecentBranchDashboardIssues(1000).length;
  const recentLedgerCount = getRecentBranchDashboardLedgerEntries(1000).length;
  const stockAlertCount = getBranchDashboardStockAlerts(1000).length;

  return `
    <section class="branch-dashboard-hero">
      <div>
        <p class="eyebrow">Live Branch Command</p>
        <h3>${DMC_BRANCH_DASHBOARD_BRANCH_NAME} Dashboard</h3>
        <span>
          Monitor branch orders, incoming deliveries, stock alerts, delivery issues, and recent stock movement.
        </span>
      </div>

      <div class="branch-dashboard-live-pill">
        <span class="live-dot"></span>
        Live Overview
      </div>
    </section>

    <section class="branch-dashboard-stats">
      ${renderBranchDashboardStatCard(
        "Pending Orders",
        summary.pendingOrders,
        "Orders waiting for commissary action",
        "gold-stat"
      )}

      ${renderBranchDashboardStatCard(
        "Incoming",
        summary.incomingDeliveries,
        "Deliveries currently on the way",
        "blue-stat"
      )}

      ${renderBranchDashboardStatCard(
        "Stock Alerts",
        summary.stockAlerts,
        "Low or critical stock items",
        summary.stockAlerts > 0 ? "red-stat" : "green-stat"
      )}

      ${renderBranchDashboardStatCard(
        "Open Issues",
        summary.openIssues,
        "Variance items needing review",
        summary.openIssues > 0 ? "red-stat" : "gold-stat"
      )}
    </section>

    <section class="branch-dashboard-live-grid">
      ${renderBranchDashboardPanel(
        "stock",
        "Stock Alerts",
        `Low or critical items for ${DMC_BRANCH_DASHBOARD_BRANCH_NAME}.`,
        "Alerts",
        stockAlertCount > 0 ? "review-tag" : "",
        renderBranchDashboardPanelPreview(
          stockAlertCount,
          stockAlertCount === 1 ? "item needs attention" : "items need attention",
          "Open to view current stock, minimum stock, and alert status."
        )
      )}

      ${renderBranchDashboardPanel(
        "incoming",
        "Incoming Deliveries",
        "Deliveries currently on the way to the branch.",
        "Live",
        "live-tag",
        renderBranchDashboardPanelPreview(
          incomingCount,
          incomingCount === 1 ? "delivery on the way" : "deliveries on the way",
          "Open to view driver, sent time, and order details."
        )
      )}

      ${renderBranchDashboardPanel(
        "orders",
        "Recent Branch Orders",
        "Latest order activity and fulfillment status.",
        "Orders",
        "",
        renderBranchDashboardPanelPreview(
          recentOrderCount,
          recentOrderCount === 1 ? "recent order update" : "recent order updates",
          "Open to review recent submitted, completed, or variance orders."
        )
      )}

      ${renderBranchDashboardPanel(
        "issues",
        "Delivery Issues",
        "Recent variance, missing, damaged, or resolved issues.",
        "Review",
        "review-tag",
        renderBranchDashboardPanelPreview(
          recentIssueCount,
          recentIssueCount === 1 ? "delivery issue record" : "delivery issue records",
          "Open to review issue status, reason, and resolution outcome."
        )
      )}

      ${renderBranchDashboardPanel(
        "ledger",
        "Recent Stock Activity",
        "Latest branch-side Ledger movements.",
        "Ledger",
        "",
        renderBranchDashboardPanelPreview(
          recentLedgerCount,
          recentLedgerCount === 1 ? "recent stock movement" : "recent stock movements",
          "Open to view Transfer In, usage, waste, and other branch activity."
        )
      )}
    </section>

    ${renderBranchDashboardExpandedPanel()}
  `;
}

function refreshBranchDashboardPage() {
  window.DMC_PAGES["branch-dashboard"].content = getBranchDashboardContent();
  renderPage("branch-dashboard");
}

function setupBranchDashboardEvents() {
  document.querySelectorAll("[data-open-dashboard-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      window.DMC_BRANCH_DASHBOARD_ACTIVE_PANEL =
        button.dataset.openDashboardPanel;

      refreshBranchDashboardPage();
    });
  });

  document.querySelectorAll("[data-close-dashboard-panel]").forEach((element) => {
    element.addEventListener("click", (event) => {
      if (
        event.target.dataset.closeDashboardPanel === "true" ||
        event.currentTarget.dataset.closeDashboardPanel === "true"
      ) {
        window.DMC_BRANCH_DASHBOARD_ACTIVE_PANEL = "";
        refreshBranchDashboardPage();
      }
    });
  });

  const focusPanel = document.querySelector(".branch-dashboard-focus-panel");

  if (focusPanel) {
    focusPanel.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }
}

window.DMC_PAGES["branch-dashboard"] = {
  eyebrow: "DMC-Iriga Branch",
  title: "Branch Dashboard",
  description:
    "Live branch command overview for orders, incoming deliveries, stock alerts, issues, and recent stock movement.",
  getContent: getBranchDashboardContent,
  content: getBranchDashboardContent(),
  afterRender: setupBranchDashboardEvents
};
