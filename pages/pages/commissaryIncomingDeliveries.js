(() => {
window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_COMMISSARY_INCOMING_DELIVERIES_STORAGE_KEY = "dmc_commissary_orders";
const DMC_COMMISSARY_INCOMING_DELIVERIES_LEDGER_STORAGE_KEY =
  "dmc_inventory_ledger_entries";
const DMC_COMMISSARY_INCOMING_DELIVERY_ISSUES_STORAGE_KEY = "dmc_commissary_delivery_issues";

window.DMC_COMMISSARY_INCOMING_DELIVERIES_SELECTED_ID =
  window.DMC_COMMISSARY_INCOMING_DELIVERIES_SELECTED_ID || "";

window.DMC_COMMISSARY_INCOMING_DELIVERIES_SEARCH =
  window.DMC_COMMISSARY_INCOMING_DELIVERIES_SEARCH || "";

window.DMC_COMMISSARY_INCOMING_DELIVERIES_DRAFT =
  window.DMC_COMMISSARY_INCOMING_DELIVERIES_DRAFT || {};

function getStoredCommissaryIncomingDeliveryOrders() {
  const storedOrders = localStorage.getItem(DMC_COMMISSARY_INCOMING_DELIVERIES_STORAGE_KEY);

  if (!storedOrders) {
    return [];
  }

  try {
    return JSON.parse(storedOrders);
  } catch {
    return [];
  }
}

function saveCommissaryIncomingDeliveryOrders(orders) {
  localStorage.setItem(
    DMC_COMMISSARY_INCOMING_DELIVERIES_STORAGE_KEY,
    JSON.stringify(orders)
  );
}

function getStoredLedgerEntriesForCommissaryIncomingDeliveries() {
  const storedEntries = localStorage.getItem(
    DMC_COMMISSARY_INCOMING_DELIVERIES_LEDGER_STORAGE_KEY
  );

  if (!storedEntries) {
    return window.DMC_DATA?.ledger || [];
  }

  try {
    return JSON.parse(storedEntries);
  } catch {
    return window.DMC_DATA?.ledger || [];
  }
}

function saveLedgerEntriesFromCommissaryIncomingDeliveries(entries) {
  localStorage.setItem(
    DMC_COMMISSARY_INCOMING_DELIVERIES_LEDGER_STORAGE_KEY,
    JSON.stringify(entries)
  );
}

function getStoredCommissaryIncomingDeliveryIssues() {
  const storedIssues = localStorage.getItem(
    DMC_COMMISSARY_INCOMING_DELIVERY_ISSUES_STORAGE_KEY
  );

  if (!storedIssues) {
    return [];
  }

  try {
    return JSON.parse(storedIssues);
  } catch {
    return [];
  }
}

function saveCommissaryIncomingDeliveryIssues(issues) {
  localStorage.setItem(
    DMC_COMMISSARY_INCOMING_DELIVERY_ISSUES_STORAGE_KEY,
    JSON.stringify(issues)
  );
}

function getCommissaryIncomingDeliverySettings() {
  const storedSettings = localStorage.getItem("dmc_inventory_settings");

  if (!storedSettings) {
    return {
      managerNames: [],
      managers: [],
      commissaryManagers: [],
      staffMembers: [],
      staff: []
    };
  }

  try {
    return JSON.parse(storedSettings);
  } catch {
    return {
      managerNames: [],
      managers: [],
      commissaryManagers: [],
      staffMembers: [],
      staff: []
    };
  }
}

function getCommissaryIncomingDeliverySettingName(option) {
  if (typeof option === "string") {
    return option;
  }

  return option?.name || option?.fullName || option?.label || "";
}

function getCommissaryIncomingDeliveryManagers() {
  const settings = getCommissaryIncomingDeliverySettings();

  const managerSources = [
    ...(settings.managerNames || []),
    ...(settings.managers || []),
    ...(settings.commissaryManagers || [])
  ];

  const staffManagers = (settings.staffMembers || settings.staff || []).filter(
    (staff) => {
      const role = String(staff.role || staff.position || staff.access || "")
        .toLowerCase();

      return role.includes("manager") || role.includes("admin");
    }
  );

  return [...managerSources, ...staffManagers]
    .map(getCommissaryIncomingDeliverySettingName)
    .filter(Boolean);
}

function renderCommissaryIncomingReceivedByOptions(currentValue) {
  const managers = getCommissaryIncomingDeliveryManagers();

  if (managers.length === 0) {
    return `
      <option value="" ${!currentValue ? "selected" : ""}>
        Select receiving manager
      </option>
      <option value="Commissary Manager" ${
        currentValue === "Commissary Manager" ? "selected" : ""
      }>
        Commissary Manager
      </option>
      <option value="Manager Ana" ${
        currentValue === "Manager Ana" ? "selected" : ""
      }>
        Manager Ana
      </option>
    `;
  }

  return `
    <option value="" ${!currentValue ? "selected" : ""}>
      Select receiving manager
    </option>
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

function showCommissaryIncomingDeliveryModal({ type, title, message, confirmLabel }) {
  if (typeof window.DMC_SHOW_MODAL === "function") {
    window.DMC_SHOW_MODAL({
      type,
      title,
      message,
      confirmLabel
    });
    return;
  }

  alert(message);
}

function showCommissaryIncomingDeliveryConfirm({
  type,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm
}) {
  if (typeof window.DMC_CONFIRM_MODAL === "function") {
    window.DMC_CONFIRM_MODAL({
      type,
      title,
      message,
      confirmLabel,
      cancelLabel,
      onConfirm
    });
    return;
  }

  if (confirm(message)) {
    onConfirm();
  }
}

function getCommissaryIncomingDeliveryTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getCommissaryIncomingDeliveryReadableTimestamp() {
  const now = new Date();

  return now.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatCommissaryIncomingDeliveryDateTime(value) {
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

function getCommissaryIncomingDeliveryTimestamp(order) {
  const sentAt = order.fulfillment?.sentAt;

  if (sentAt) {
    return new Date(sentAt).getTime();
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

function getCommissaryIncomingDeliveryOrders() {
  const searchValue = String(window.DMC_COMMISSARY_INCOMING_DELIVERIES_SEARCH || "")
    .toLowerCase()
    .trim();

  return getStoredCommissaryIncomingDeliveryOrders()
    .filter((order) => {
      const source = String(order.source || order.requestSource || order.department || "")
        .toLowerCase();

      return order.status === "On the Way" && source.includes("commissary");
    })
    .filter((order) => {
      if (!searchValue) {
        return true;
      }

      return (
        String(order.orderId || "").toLowerCase().includes(searchValue) ||
        String(order.branch || "").toLowerCase().includes(searchValue) ||
        String(order.source || "").toLowerCase().includes(searchValue) ||
        String(order.requestSource || "").toLowerCase().includes(searchValue) ||
        String(order.department || "").toLowerCase().includes(searchValue) ||
        String(order.fulfillment?.preparedBy || "")
          .toLowerCase()
          .includes(searchValue) ||
        String(order.requestedBy || "").toLowerCase().includes(searchValue) ||
        (order.lines || []).some(
          (line) =>
            String(line.itemId || "").toLowerCase().includes(searchValue) ||
            String(line.itemName || "").toLowerCase().includes(searchValue) ||
            String(line.section || "").toLowerCase().includes(searchValue)
        )
      );
    })
    .sort(
      (a, b) => getCommissaryIncomingDeliveryTimestamp(b) - getCommissaryIncomingDeliveryTimestamp(a)
    );
}

function getSelectedCommissaryIncomingDelivery() {
  const deliveries = getCommissaryIncomingDeliveryOrders();

  if (window.DMC_COMMISSARY_INCOMING_DELIVERIES_SELECTED_ID) {
    const selectedDelivery = deliveries.find(
      (order) => order.orderId === window.DMC_COMMISSARY_INCOMING_DELIVERIES_SELECTED_ID
    );

    if (selectedDelivery) {
      return selectedDelivery;
    }
  }

  return deliveries[0] || null;
}

function getCommissaryIncomingDeliverySummary() {
  const allOrders = getStoredCommissaryIncomingDeliveryOrders();

  return {
    onTheWay: allOrders.filter((order) => order.status === "On the Way").length,
    completed: allOrders.filter((order) => order.status === "Completed").length,
    variance: allOrders.filter((order) => order.status === "Variance").length,
    urgent: allOrders.filter(
      (order) => order.status === "On the Way" && order.urgent
    ).length
  };
}

function getCommissaryIncomingDraft(order) {
  if (!order) {
    return {
      lines: {},
      receivedBy: "",
      receivingNotes: ""
    };
  }

  if (!window.DMC_COMMISSARY_INCOMING_DELIVERIES_DRAFT[order.orderId]) {
    const lineDrafts = {};

    (order.lines || []).forEach((line) => {
      const sentQty = Number(
        order.fulfillment?.lines?.[line.itemId]?.sentQty ??
          line.requestedQty ??
          0
      );

      lineDrafts[line.itemId] = {
        commissaryReceivedQty: sentQty,
        condition: "Good",
        notes: ""
      };
    });

    window.DMC_COMMISSARY_INCOMING_DELIVERIES_DRAFT[order.orderId] = {
      lines: lineDrafts,
      receivedBy: "",
      receivingNotes: ""
    };
  }

  return window.DMC_COMMISSARY_INCOMING_DELIVERIES_DRAFT[order.orderId];
}

function getCommissarySentQtyForLine(order, line) {
  return Number(
    order.fulfillment?.lines?.[line.itemId]?.sentQty ?? line.requestedQty ?? 0
  );
}

function getCommissaryReceivingVariance(order, line) {
  const draft = getCommissaryIncomingDraft(order);
  const sentQty = getCommissarySentQtyForLine(order, line);
  const commissaryReceivedQty = Number(draft.lines[line.itemId]?.commissaryReceivedQty || 0);

  return commissaryReceivedQty - sentQty;
}

function hasCommissaryIncomingDeliveryVariance(order) {
  const draft = getCommissaryIncomingDraft(order);

  return (order.lines || []).some((line) => {
    const sentQty = getCommissarySentQtyForLine(order, line);
    const commissaryReceivedQty = Number(draft.lines[line.itemId]?.commissaryReceivedQty || 0);
    const condition = draft.lines[line.itemId]?.condition || "Good";

    return commissaryReceivedQty !== sentQty || condition !== "Good";
  });
}

function hasCommissaryTransferInAlreadyLogged(orderId) {
  return getStoredLedgerEntriesForCommissaryIncomingDeliveries().some(
    (entry) =>
      entry.batchId === orderId &&
      entry.movementType === "Transfer In" &&
      entry.source === "Incoming Delivery Receipt"
  );
}

function buildCommissaryTransferInLedgerEntries(order, receivingDraft) {
  const submittedAt = new Date().toISOString();
  const submittedAtDisplay = getCommissaryIncomingDeliveryReadableTimestamp();

  return (order.lines || [])
    .map((line) => {
      const condition = receivingDraft.lines?.[line.itemId]?.condition || "Good";
      const commissaryReceivedQty = Number(
        receivingDraft.lines?.[line.itemId]?.commissaryReceivedQty || 0
      );

      const usableQty =
        condition === "Good" && !Number.isNaN(commissaryReceivedQty) && commissaryReceivedQty > 0
          ? commissaryReceivedQty
          : 0;

      if (usableQty <= 0) {
        return null;
      }

      return {
        date: getCommissaryIncomingDeliveryTodayDate(),
        submittedAt,
        submittedAtDisplay,
        batchId: order.orderId,
        location: order.source || "Commissary",
        department: order.department || "Commissary",
        section: line.section || "",
        itemId: line.itemId || "",
        itemName: line.itemName || "",
        movementType: "Transfer In",
        movementField: "receivedFromWarehouse",
        stockEffect: "add",
        quantity: usableQty,
        unit: line.unit || "",
        source: "Commissary Incoming Delivery Receipt",
        destination: order.source || "Commissary",
        notes: `Received from Warehouse by ${
          receivingDraft.receivedBy || "commissary receiver"
        }. Order ${order.orderId}. Condition: ${condition}.`
      };
    })
    .filter(Boolean);
}

function writeCommissaryTransferInToLedger(order, receivingDraft) {
  if (hasCommissaryTransferInAlreadyLogged(order.orderId)) {
    return;
  }

  const currentLedgerEntries = getStoredLedgerEntriesForCommissaryIncomingDeliveries();
  const branchTransferInEntries = buildCommissaryTransferInLedgerEntries(
    order,
    receivingDraft
  );

  saveLedgerEntriesFromCommissaryIncomingDeliveries([
    ...currentLedgerEntries,
    ...branchTransferInEntries
  ]);
}

function hasCommissaryDeliveryIssueAlreadyCreated(orderId) {
  return getStoredCommissaryIncomingDeliveryIssues().some(
    (issue) => issue.orderId === orderId
  );
}

function getCommissaryDeliveryIssueReason(sentQty, commissaryReceivedQty, condition) {
  if (condition === "Missing") {
    return "Missing";
  }

  if (condition === "Damaged") {
    return "Damaged";
  }

  if (condition === "Spoiled") {
    return "Spoiled";
  }

  if (commissaryReceivedQty < sentQty) {
    return "Short Received";
  }

  if (commissaryReceivedQty > sentQty) {
    return "Over Received";
  }

  return "Needs Review";
}

function buildCommissaryDeliveryIssueRecords(order, receivingDraft) {
  const createdAt = new Date().toISOString();
  const createdAtDisplay = getCommissaryIncomingDeliveryReadableTimestamp();

  return (order.lines || [])
    .map((line) => {
      const sentQty = getCommissarySentQtyForLine(order, line);
      const commissaryReceivedQty = Number(
        receivingDraft.lines?.[line.itemId]?.commissaryReceivedQty || 0
      );
      const condition = receivingDraft.lines?.[line.itemId]?.condition || "Good";
      const lineNotes = receivingDraft.lines?.[line.itemId]?.notes || "";
      const varianceQty = commissaryReceivedQty - sentQty;

      const hasIssue =
        commissaryReceivedQty !== sentQty ||
        condition === "Damaged" ||
        condition === "Spoiled" ||
        condition === "Missing";

      if (!hasIssue) {
        return null;
      }

      return {
        issueId: `DI-${order.orderId}-${line.itemId}`,
        orderId: order.orderId,
        commissary: order.source || "Commissary",
        department: order.department || "-",
        itemId: line.itemId || "",
        itemName: line.itemName || "",
        section: line.section || "",
        unit: line.unit || "",
        sentQty,
        commissaryReceivedQty,
        varianceQty,
        condition,
        issueReason: getCommissaryDeliveryIssueReason(sentQty, commissaryReceivedQty, condition),
        preparedBy: order.fulfillment?.preparedBy || "",
        receivedBy: receivingDraft.receivedBy || "",
        deliveryNotes: order.fulfillment?.deliveryNotes || "",
        commissaryLineNotes: lineNotes,
        commissaryReceivingNotes: receivingDraft.receivingNotes || "",
        status: "Open",
        resolution: "",
        resolutionCategory: "",
        stockAction: "",
        stockActionApplied: false,
        ledgerEntryCreated: false,
        resolutionNotes: "",
        createdAt,
        createdAtDisplay,
        resolvedAt: ""
      };
    })
    .filter(Boolean);
}

function writeCommissaryDeliveryIssuesForVariance(order, receivingDraft) {
  if (hasCommissaryDeliveryIssueAlreadyCreated(order.orderId)) {
    return;
  }

  const newIssues = buildCommissaryDeliveryIssueRecords(order, receivingDraft);

  if (newIssues.length === 0) {
    return;
  }

  const currentIssues = getStoredCommissaryIncomingDeliveryIssues();

  saveCommissaryIncomingDeliveryIssues([...currentIssues, ...newIssues]);
}

function renderCommissaryIncomingDeliveryList() {
  const deliveries = getCommissaryIncomingDeliveryOrders();
  const selectedDelivery = getSelectedCommissaryIncomingDelivery();

  if (deliveries.length === 0) {
    return `
      <div class="order-list-empty">
        <p>No incoming deliveries.</p>
        <span>Commissary orders marked On the Way by Warehouse will appear here.</span>
      </div>
    `;
  }

  return `
    <div class="branch-order-list">
      ${deliveries
        .map(
          (order) => `
            <button
              class="branch-order-list-item ${
                selectedDelivery?.orderId === order.orderId ? "active" : ""
              }"
              data-select-commissary-incoming-delivery="${order.orderId}"
            >
              <div>
                <strong>${order.orderId}</strong>
                <p>${order.department || "-"} • ${(order.lines || []).length} item(s)</p>
                <span>
                  Prepared By: ${order.fulfillment?.preparedBy || "-"} •
                  Sent: ${formatCommissaryIncomingDeliveryDateTime(order.fulfillment?.sentAt)}
                </span>
              </div>

              <div class="branch-order-list-meta">
                ${
                  order.urgent
                    ? `<span class="badge danger-badge">Urgent</span>`
                    : ""
                }
                <span class="badge info-badge">On the Way</span>
              </div>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderCommissaryIncomingDeliveryLines(order) {
  if (!order || !order.lines || order.lines.length === 0) {
    return `
      <p class="submit-preview-empty">
        No delivery lines found.
      </p>
    `;
  }

  const draft = getCommissaryIncomingDraft(order);

  return `
    <div class="incoming-delivery-lines">
      ${order.lines
        .map((line) => {
          const sentQty = getCommissarySentQtyForLine(order, line);
          const commissaryReceivedQty = draft.lines[line.itemId]?.commissaryReceivedQty ?? sentQty;
          const condition = draft.lines[line.itemId]?.condition || "Good";
          const lineNotes = draft.lines[line.itemId]?.notes || "";
          const variance = getCommissaryReceivingVariance(order, line);

          return `
            <div class="incoming-delivery-line">
              <div>
                <p class="eyebrow">${line.section || "Item"}</p>
                <strong>${line.itemName}</strong>
                <span>${line.itemId} • ${line.unit}</span>
              </div>

              <div class="incoming-qty-box">
                <span>Sent</span>
                <strong>${sentQty}</strong>
              </div>

              <label>
                Received Qty
                <input
                  class="incoming-received-input"
                  data-commissary-received-qty="${line.itemId}"
                  type="number"
                  min="0"
                  step="any"
                  value="${commissaryReceivedQty}"
                />
              </label>

              <label>
                Condition
                <select
                  class="incoming-condition-input"
                  data-commissary-received-condition="${line.itemId}"
                >
                  <option value="Good" ${condition === "Good" ? "selected" : ""}>
                    Good
                  </option>
                  <option value="Damaged" ${condition === "Damaged" ? "selected" : ""}>
                    Damaged
                  </option>
                  <option value="Spoiled" ${condition === "Spoiled" ? "selected" : ""}>
                    Spoiled
                  </option>
                  <option value="Missing" ${condition === "Missing" ? "selected" : ""}>
                    Missing
                  </option>
                </select>
              </label>

              <label>
                Notes
                <input
                  class="incoming-notes-input"
                  data-commissary-received-notes="${line.itemId}"
                  type="text"
                  placeholder="Optional"
                  value="${lineNotes}"
                />
              </label>

              <div class="incoming-variance-box">
                <span>Variance</span>
                <strong class="${variance === 0 ? "" : "danger-text"}">
                  ${variance}
                </strong>
              </div>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderCommissaryIncomingDeliveryDetail() {
  const order = getSelectedCommissaryIncomingDelivery();

  if (!order) {
    return `
      <section class="panel branch-order-detail">
        <div class="order-list-empty">
          <p>No delivery selected.</p>
          <span>Select an incoming delivery from the left panel.</span>
        </div>
      </section>
    `;
  }

  const draft = getCommissaryIncomingDraft(order);
  const hasVariance = hasCommissaryIncomingDeliveryVariance(order);

  return `
    <section class="panel branch-order-detail">
      <div class="panel-header">
        <div>
          <h3>${order.orderId}</h3>
          <p>
            ${order.source || "Commissary"} • ${order.department || "-"} •
            Sent from Warehouse
          </p>
        </div>

        <div class="branch-order-list-meta">
          ${
            order.urgent
              ? `<span class="badge danger-badge">Urgent</span>`
              : ""
          }
          <span class="badge info-badge">On the Way</span>
        </div>
      </div>

      <div class="branch-order-info-grid">
        <div>
          <p class="eyebrow">Requested By</p>
          <strong>${order.requestedBy || "-"}</strong>
        </div>

        <div>
          <p class="eyebrow">Prepared By</p>
          <strong>${order.fulfillment?.preparedBy || "-"}</strong>
        </div>

        <div>
          <p class="eyebrow">Sent At</p>
          <strong>${formatCommissaryIncomingDeliveryDateTime(order.fulfillment?.sentAt)}</strong>
        </div>

        <div>
          <p class="eyebrow">Status</p>
          <strong>${hasVariance ? "Needs Review" : "Ready to Receive"}</strong>
        </div>
      </div>

      <div class="instruction-box">
        <strong>Receiving Rule:</strong>
        <span>
          Good received quantity will be added to Commissary Stock through the Ledger.
          Missing, damaged, spoiled, or quantity differences will mark the order as Variance
          and create Commissary Commissary Delivery Issue records.
        </span>
      </div>

      <div class="branch-order-section">
        <h4>Receiving Confirmation</h4>
        ${renderCommissaryIncomingDeliveryLines(order)}
      </div>

      <div class="incoming-receiving-meta">
        <label>
          Received By
          <select id="commissary-incoming-received-by">
            ${renderCommissaryIncomingReceivedByOptions(draft.receivedBy || "")}
          </select>
        </label>

        <label>
          Receiving Notes
          <textarea
            id="commissary-incoming-receiving-notes"
            rows="3"
            placeholder="Notes about delivery condition, shortage, or confirmation..."
          >${draft.receivingNotes || ""}</textarea>
        </label>
      </div>

      <div class="form-actions incoming-delivery-actions">
        <button class="ghost-button" id="accept-full-commissary-delivery">
          Accept Full Delivery
        </button>

        <button class="primary-button" id="confirm-commissary-incoming-delivery">
          Confirm Receipt
        </button>
      </div>
    </section>
  `;
}

function getCommissaryIncomingDeliveriesContent() {
  const summary = getCommissaryIncomingDeliverySummary();

  return `
    <section class="grid">
      <div class="card">
        <p>Incoming</p>
        <strong>${summary.onTheWay}</strong>
      </div>

      <div class="card">
        <p>Urgent</p>
        <strong>${summary.urgent}</strong>
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

    <section class="branch-orders-layout">
      <section class="panel branch-order-list-panel">
        <div class="panel-header">
          <div>
            <h3>Incoming Deliveries</h3>
            <p>Confirm Commissary deliveries sent by Warehouse.</p>
          </div>

          <span class="badge info-badge">On the Way</span>
        </div>

        <div class="filter-bar branch-order-search-bar">
          <label class="filter-search">
            Search
            <input
              id="commissary-incoming-delivery-search"
              type="text"
              placeholder="Search order, prepared by, item..."
              value="${window.DMC_COMMISSARY_INCOMING_DELIVERIES_SEARCH}"
            />
          </label>
        </div>

        ${renderCommissaryIncomingDeliveryList()}
      </section>

      ${renderCommissaryIncomingDeliveryDetail()}
    </section>
  `;
}

function refreshCommissaryIncomingDeliveriesPage() {
  window.DMC_PAGES["commissary-incoming-deliveries"].content =
    getCommissaryIncomingDeliveriesContent();

  renderPage("commissary-incoming-deliveries");
}

function saveCommissaryIncomingDeliveryDraftFromInputs(order) {
  if (!order) {
    return;
  }

  const draft = getCommissaryIncomingDraft(order);

  document.querySelectorAll("[data-commissary-received-qty]").forEach((input) => {
    const itemId = input.dataset.commissaryReceivedQty;

    draft.lines[itemId] = draft.lines[itemId] || {};
    draft.lines[itemId].commissaryReceivedQty = input.value;
  });

  document.querySelectorAll("[data-commissary-received-condition]").forEach((select) => {
    const itemId = select.dataset.commissaryReceivedCondition;

    draft.lines[itemId] = draft.lines[itemId] || {};
    draft.lines[itemId].condition = select.value;
  });

  document.querySelectorAll("[data-commissary-received-notes]").forEach((input) => {
    const itemId = input.dataset.commissaryReceivedNotes;

    draft.lines[itemId] = draft.lines[itemId] || {};
    draft.lines[itemId].notes = input.value;
  });

  const receivedByInput = document.getElementById("commissary-incoming-received-by");
  const receivingNotesInput = document.getElementById("commissary-incoming-receiving-notes");

  draft.receivedBy = receivedByInput?.value || "";
  draft.receivingNotes = receivingNotesInput?.value || "";

  window.DMC_COMMISSARY_INCOMING_DELIVERIES_DRAFT[order.orderId] = draft;
}

function acceptFullCommissaryDelivery(order) {
  if (!order) {
    return;
  }

  const draft = getCommissaryIncomingDraft(order);

  (order.lines || []).forEach((line) => {
    const sentQty = getCommissarySentQtyForLine(order, line);

    draft.lines[line.itemId] = {
      commissaryReceivedQty: sentQty,
      condition: "Good",
      notes: ""
    };
  });

  window.DMC_COMMISSARY_INCOMING_DELIVERIES_DRAFT[order.orderId] = draft;
  refreshCommissaryIncomingDeliveriesPage();
}

function confirmCommissaryIncomingDelivery(order) {
  if (!order) {
    return;
  }

  saveCommissaryIncomingDeliveryDraftFromInputs(order);

  const draft = getCommissaryIncomingDraft(order);

  if (!String(draft.receivedBy || "").trim()) {
    showCommissaryIncomingDeliveryModal({
      type: "warning",
      title: "Received By Required",
      message: "Please select who received this delivery.",
      confirmLabel: "Got it"
    });
    return;
  }

  const hasInvalidReceivedQty = (order.lines || []).some((line) => {
    const commissaryReceivedQty = Number(draft.lines[line.itemId]?.commissaryReceivedQty || 0);
    return Number.isNaN(commissaryReceivedQty) || commissaryReceivedQty < 0;
  });

  if (hasInvalidReceivedQty) {
    showCommissaryIncomingDeliveryModal({
      type: "warning",
      title: "Invalid Quantity",
      message: "Please enter valid received quantities.",
      confirmLabel: "Got it"
    });
    return;
  }

  const hasVariance = hasCommissaryIncomingDeliveryVariance(order);
  const nextStatus = hasVariance ? "Variance" : "Completed";
  const statusNote = hasVariance
    ? "Commissary confirmed delivery with variance or condition issue. Commissary Transfer In was logged for usable received quantities only. Commissary Delivery Issue record was created."
    : "Commissary confirmed delivery received complete. Commissary Transfer In was logged.";

  showCommissaryIncomingDeliveryConfirm({
    type: hasVariance ? "warning" : "success",
    title: hasVariance
      ? "Confirm Receipt with Variance?"
      : "Confirm Receipt Complete?",
    message: hasVariance
      ? `Confirm receipt for ${order.orderId} with variance and create Commissary Delivery Issue record?`
      : `Confirm receipt for ${order.orderId} as complete?`,
    confirmLabel: hasVariance ? "Confirm Variance" : "Confirm Receipt",
    cancelLabel: "Cancel",
    onConfirm: () => {
      writeCommissaryTransferInToLedger(order, draft);

      if (hasVariance) {
        writeCommissaryDeliveryIssuesForVariance(order, draft);
      }

      const orders = getStoredCommissaryIncomingDeliveryOrders();

      const updatedOrders = orders.map((storedOrder) => {
        if (storedOrder.orderId !== order.orderId) {
          return storedOrder;
        }

        return {
          ...storedOrder,
          status: nextStatus,
          receiving: {
            ...draft,
            receivedAt: new Date().toISOString()
          },
          statusHistory: [
            ...(storedOrder.statusHistory || []),
            {
              status: nextStatus,
              timestamp: new Date().toISOString(),
              note: statusNote
            }
          ]
        };
      });

      saveCommissaryIncomingDeliveryOrders(updatedOrders);

      window.DMC_COMMISSARY_INCOMING_DELIVERIES_SELECTED_ID = "";
      delete window.DMC_COMMISSARY_INCOMING_DELIVERIES_DRAFT[order.orderId];

      showCommissaryIncomingDeliveryModal({
        type: hasVariance ? "warning" : "success",
        title: hasVariance ? "Commissary Delivery Variance Recorded" : "Delivery Received",
        message: hasVariance
          ? "Delivery confirmed with variance. Commissary Delivery Issue record was created."
          : "Delivery confirmed complete. Commissary Transfer In was logged.",
        confirmLabel: "Continue"
      });

      refreshCommissaryIncomingDeliveriesPage();
    }
  });
}

function setupCommissaryIncomingDeliveriesEvents() {
  const searchInput = document.getElementById("commissary-incoming-delivery-search");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      window.DMC_COMMISSARY_INCOMING_DELIVERIES_SEARCH = searchInput.value;
      window.DMC_COMMISSARY_INCOMING_DELIVERIES_SELECTED_ID = "";
      refreshCommissaryIncomingDeliveriesPage();
    });
  }

  document.querySelectorAll("[data-select-commissary-incoming-delivery]").forEach(
    (button) => {
      button.addEventListener("click", () => {
        window.DMC_COMMISSARY_INCOMING_DELIVERIES_SELECTED_ID =
          button.dataset.selectCommissaryIncomingDelivery;

        refreshCommissaryIncomingDeliveriesPage();
      });
    }
  );

  const selectedOrder = getSelectedCommissaryIncomingDelivery();

  document.querySelectorAll("[data-commissary-received-qty]").forEach((input) => {
    input.addEventListener("change", () => {
      saveCommissaryIncomingDeliveryDraftFromInputs(selectedOrder);
      refreshCommissaryIncomingDeliveriesPage();
    });
  });

  document.querySelectorAll("[data-commissary-received-condition]").forEach((select) => {
    select.addEventListener("change", () => {
      saveCommissaryIncomingDeliveryDraftFromInputs(selectedOrder);
      refreshCommissaryIncomingDeliveriesPage();
    });
  });

  document.querySelectorAll("[data-commissary-received-notes]").forEach((input) => {
    input.addEventListener("input", () => {
      saveCommissaryIncomingDeliveryDraftFromInputs(selectedOrder);
    });
  });

  const receivedByInput = document.getElementById("commissary-incoming-received-by");
  const receivingNotesInput = document.getElementById("commissary-incoming-receiving-notes");

  [receivedByInput, receivingNotesInput].forEach((input) => {
    if (input) {
      input.addEventListener("input", () => {
        saveCommissaryIncomingDeliveryDraftFromInputs(selectedOrder);
      });

      input.addEventListener("change", () => {
        saveCommissaryIncomingDeliveryDraftFromInputs(selectedOrder);
      });
    }
  });

  const acceptFullButton = document.getElementById("accept-full-commissary-delivery");
  const confirmButton = document.getElementById("confirm-commissary-incoming-delivery");

  if (acceptFullButton) {
    acceptFullButton.addEventListener("click", () => {
      acceptFullCommissaryDelivery(selectedOrder);
    });
  }

  if (confirmButton) {
    confirmButton.addEventListener("click", () => {
      confirmCommissaryIncomingDelivery(selectedOrder);
    });
  }
}

window.DMC_PAGES["commissary-incoming-deliveries"] = {
  eyebrow: "Commissary",
  title: "Incoming Deliveries",
  description:
    "Confirm Warehouse deliveries to Commissary and flag missing, damaged, or spoiled items.",
  getContent: getCommissaryIncomingDeliveriesContent,
  content: getCommissaryIncomingDeliveriesContent(),
  afterRender: setupCommissaryIncomingDeliveriesEvents
};
})();
