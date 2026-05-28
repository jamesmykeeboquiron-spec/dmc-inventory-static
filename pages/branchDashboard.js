window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_BRANCH_DASHBOARD_ORDERS_KEY = "dmc_branch_orders";
const DMC_BRANCH_DASHBOARD_ISSUES_KEY = "dmc_delivery_issues";
const DMC_BRANCH_DASHBOARD_LEDGER_KEY = "dmc_inventory_ledger_entries";

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

function getBranchDashboardSummary() {
  const orders = getBranchDashboardOrders();
  const issues = getBranchDashboardIssues();

  return {
    pendingOrders: orders.filter((order) =>
      ["Submitted", "Accepted", "Fulfillment Started"].includes(order.status)
    ).length,
    incomingDeliveries: orders.filter((order) => order.status === "On the Way")
      .length,
    completedDeliveries: orders.filter((order) => order.status === "Completed")
      .length,
    openIssues: issues.filter((issue) => issue.status !== "Resolved").length
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
  return [...getBranchDashboardLedgerEntries()]
    .filter((entry) => entry.department && entry.department !== "Commissary")
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
  if (status === "Variance") return "warning-badge";
  if (status === "On the Way") return "info-badge";
  if (status === "Resolved") return "info-badge";
  if (status === "Open") return "danger-badge";
  if (status === "Under Review") return "warning-badge";
  return "";
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

function renderBranchDashboardOrderList(limit = 3) {
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

function renderBranchDashboardIncomingDeliveries(limit = 3) {
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

function renderBranchDashboardIssues(limit = 2) {
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

function renderBranchDashboardLedgerActivity(limit = 3) {
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

  return `
    <section class="branch-dashboard-hero">
      <div>
        <p class="eyebrow">Live Branch Command</p>
        <h3>DMC-Iriga Branch Dashboard</h3>
        <span>
          Monitor branch orders, incoming deliveries, delivery issues, and recent stock movement.
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
        "Completed",
        summary.completedDeliveries,
        "Deliveries received successfully",
        "green-stat"
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
        "incoming",
        "Incoming Deliveries",
        "Deliveries currently on the way to the branch.",
        "Live",
        "live-tag",
        renderBranchDashboardIncomingDeliveries(3)
      )}

      ${renderBranchDashboardPanel(
        "orders",
        "Recent Branch Orders",
        "Latest order activity and fulfillment status.",
        "Orders",
        "",
        renderBranchDashboardOrderList(3)
      )}

      ${renderBranchDashboardPanel(
        "issues",
        "Delivery Issues",
        "Recent variance, missing, damaged, or resolved issues.",
        "Review",
        "review-tag",
        renderBranchDashboardIssues(2)
      )}

      ${renderBranchDashboardPanel(
        "ledger",
        "Recent Stock Activity",
        "Latest branch-side Ledger movements.",
        "Ledger",
        "",
        renderBranchDashboardLedgerActivity(3)
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
    "Live branch command overview for orders, incoming deliveries, issues, and recent stock movement.",
  getContent: getBranchDashboardContent,
  content: getBranchDashboardContent(),
  afterRender: setupBranchDashboardEvents
};
