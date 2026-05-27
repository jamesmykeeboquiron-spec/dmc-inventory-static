window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_BRANCH_DASHBOARD_ORDERS_KEY = "dmc_branch_orders";
const DMC_BRANCH_DASHBOARD_ISSUES_KEY = "dmc_delivery_issues";
const DMC_BRANCH_DASHBOARD_LEDGER_KEY = "dmc_inventory_ledger_entries";

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

function getRecentBranchDashboardOrders() {
  return [...getBranchDashboardOrders()]
    .sort(
      (a, b) =>
        getBranchDashboardOrderTimestamp(b) -
        getBranchDashboardOrderTimestamp(a)
    )
    .slice(0, 6);
}

function getRecentBranchDashboardLedgerEntries() {
  return [...getBranchDashboardLedgerEntries()]
    .filter((entry) => entry.department && entry.department !== "Commissary")
    .sort(
      (a, b) =>
        getBranchDashboardLedgerTimestamp(b) -
        getBranchDashboardLedgerTimestamp(a)
    )
    .slice(0, 6);
}

function getRecentBranchDashboardIssues() {
  return [...getBranchDashboardIssues()]
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;

      return bTime - aTime;
    })
    .slice(0, 5);
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

function renderBranchDashboardOrderList() {
  const orders = getRecentBranchDashboardOrders();

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

function renderBranchDashboardIncomingDeliveries() {
  const incomingOrders = getBranchDashboardOrders()
    .filter((order) => order.status === "On the Way")
    .sort(
      (a, b) =>
        getBranchDashboardOrderTimestamp(b) -
        getBranchDashboardOrderTimestamp(a)
    )
    .slice(0, 5);

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

function renderBranchDashboardIssues() {
  const issues = getRecentBranchDashboardIssues();

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

function renderBranchDashboardLedgerActivity() {
  const entries = getRecentBranchDashboardLedgerEntries();

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
      <section class="branch-dashboard-glass-panel">
        <div class="branch-dashboard-panel-header">
          <div>
            <h3>Incoming Deliveries</h3>
            <p>Deliveries currently on the way to the branch.</p>
          </div>
          <span class="branch-dashboard-tag live-tag">
            <span class="live-dot"></span>
            Live
          </span>
        </div>

        ${renderBranchDashboardIncomingDeliveries()}
      </section>

      <section class="branch-dashboard-glass-panel">
        <div class="branch-dashboard-panel-header">
          <div>
            <h3>Recent Branch Orders</h3>
            <p>Latest order activity and fulfillment status.</p>
          </div>
          <span class="branch-dashboard-tag">Orders</span>
        </div>

        ${renderBranchDashboardOrderList()}
      </section>

      <section class="branch-dashboard-glass-panel">
        <div class="branch-dashboard-panel-header">
          <div>
            <h3>Delivery Issues</h3>
            <p>Recent variance, missing, damaged, or resolved issues.</p>
          </div>
          <span class="branch-dashboard-tag review-tag">Review</span>
        </div>

        ${renderBranchDashboardIssues()}
      </section>

      <section class="branch-dashboard-glass-panel">
        <div class="branch-dashboard-panel-header">
          <div>
            <h3>Recent Stock Activity</h3>
            <p>Latest branch-side Ledger movements.</p>
          </div>
          <span class="branch-dashboard-tag">Ledger</span>
        </div>

        ${renderBranchDashboardLedgerActivity()}
      </section>
    </section>
  `;
}

function refreshBranchDashboardPage() {
  window.DMC_PAGES["branch-dashboard"].content = getBranchDashboardContent();
  renderPage("branch-dashboard");
}

window.DMC_PAGES["branch-dashboard"] = {
  eyebrow: "DMC-Iriga Branch",
  title: "Branch Dashboard",
  description:
    "Live branch command overview for orders, incoming deliveries, issues, and recent stock movement.",
  getContent: getBranchDashboardContent,
  content: getBranchDashboardContent()
};
