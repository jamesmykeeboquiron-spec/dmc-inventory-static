window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_INCOMING_DELIVERIES_STORAGE_KEY = "dmc_branch_orders";
const DMC_INCOMING_DELIVERIES_LEDGER_STORAGE_KEY =
  "dmc_inventory_ledger_entries";
const DMC_INCOMING_DELIVERY_ISSUES_STORAGE_KEY = "dmc_delivery_issues";

window.DMC_INCOMING_DELIVERIES_SELECTED_ID =
  window.DMC_INCOMING_DELIVERIES_SELECTED_ID || "";

window.DMC_INCOMING_DELIVERIES_SEARCH =
  window.DMC_INCOMING_DELIVERIES_SEARCH || "";

window.DMC_INCOMING_DELIVERIES_DRAFT =
  window.DMC_INCOMING_DELIVERIES_DRAFT || {};

function getStoredIncomingDeliveryOrders() {
  const storedOrders = localStorage.getItem(DMC_INCOMING_DELIVERIES_STORAGE_KEY);

  if (!storedOrders) {
    return [];
  }

  try {
    return JSON.parse(storedOrders);
  } catch {
    return [];
  }
}

function saveIncomingDeliveryOrders(orders) {
  localStorage.setItem(
    DMC_INCOMING_DELIVERIES_STORAGE_KEY,
    JSON.stringify(orders)
  );
}

function getStoredLedgerEntriesForIncomingDeliveries() {
  const storedEntries = localStorage.getItem(
    DMC_INCOMING_DELIVERIES_LEDGER_STORAGE_KEY
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

function saveLedgerEntriesFromIncomingDeliveries(entries) {
  localStorage.setItem(
    DMC_INCOMING_DELIVERIES_LEDGER_STORAGE_KEY,
    JSON.stringify(entries)
  );
}

function getStoredIncomingDeliveryIssues() {
  const storedIssues = localStorage.getItem(
    DMC_INCOMING_DELIVERY_ISSUES_STORAGE_KEY
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

function saveIncomingDeliveryIssues(issues) {
  localStorage.setItem(
    DMC_INCOMING_DELIVERY_ISSUES_STORAGE_KEY,
    JSON.stringify(issues)
  );
}

function getIncomingDeliverySettings() {
  const storedSettings = localStorage.getItem("dmc_inventory_settings");

  if (!storedSettings) {
    return {
      managerNames: [],
      managers: [],
      branchManagers: [],
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
      branchManagers: [],
      staffMembers: [],
      staff: []
    };
  }
}

function getIncomingDeliverySettingName(option) {
  if (typeof option === "string") {
    return option;
  }

  return option?.name || option?.fullName || option?.label || "";
}

function getIncomingDeliveryManagers() {
  const settings = getIncomingDeliverySettings();

  const managerSources = [
    ...(settings.managerNames || []),
    ...(settings.managers || []),
    ...(settings.branchManagers || [])
  ];

  const staffManagers = (settings.staffMembers || settings.staff || []).filter(
    (staff) => {
      const role = String(staff.role || staff.position || staff.access || "")
        .toLowerCase();

      return role.includes("manager") || role.includes("admin");
    }
  );

  return [...managerSources, ...staffManagers]
    .map(getIncomingDeliverySettingName)
    .filter(Boolean);
}

function renderIncomingReceivedByOptions(currentValue) {
  const managers = getIncomingDeliveryManagers();

  if (managers.length === 0) {
    return `
      <option value="" ${!currentValue ? "selected" : ""}>
        Select receiving manager
      </option>
      <option value="Branch Manager" ${
        currentValue === "Branch Manager" ? "selected" : ""
      }>
        Branch Manager
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

function showIncomingDeliveryModal({ type, title, message, confirmLabel }) {
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

function showIncomingDeliveryConfirm({
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

function getIncomingDeliveryTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getIncomingDeliveryReadableTimestamp() {
  const now = new Date();

  return now.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatIncomingDeliveryDateTime(value) {
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

function getIncomingDeliveryTimestamp(order) {
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

function getIncomingDeliveryOrders() {
  const searchValue = String(window.DMC_INCOMING_DELIVERIES_SEARCH || "")
    .toLowerCase()
    .trim();

  return getStoredIncomingDeliveryOrders()
    .filter((order) => order.status === "On the Way")
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
      (a, b) => getIncomingDeliveryTimestamp(b) - getIncomingDeliveryTimestamp(a)
    );
}

function getSelectedIncomingDelivery() {
  const deliveries = getIncomingDeliveryOrders();

  if (window.DMC_INCOMING_DELIVERIES_SELECTED_ID) {
    const selectedDelivery = deliveries.find(
      (order) => order.orderId === window.DMC_INCOMING_DELIVERIES_SELECTED_ID
    );

    if (selectedDelivery) {
      return selectedDelivery;
    }
  }

  return deliveries[0] || null;
}

function getIncomingDeliverySummary() {
  const allOrders = getStoredIncomingDeliveryOrders();

  return {
    onTheWay: allOrders.filter((order) => order.status === "On the Way").length,
    completed: allOrders.filter((order) => order.status === "Completed").length,
    variance: allOrders.filter((order) => order.status === "Variance").length,
    urgent: allOrders.filter(
      (order) => order.status === "On the Way" && order.urgent
    ).length
  };
}

function getIncomingDraft(order) {
  if (!order) {
    return {
      lines: {},
      receivedBy: "",
      receivingNotes: ""
    };
  }

  if (!window.DMC_INCOMING_DELIVERIES_DRAFT[order.orderId]) {
    const lineDrafts = {};

    (order.lines || []).forEach((line) => {
      const sentQty = Number(
        order.fulfillment?.lines?.[line.itemId]?.sentQty ??
          line.requestedQty ??
          0
      );

      lineDrafts[line.itemId] = {
        receivedQty: sentQty,
        condition: "Good",
        notes: ""
      };
    });

    window.DMC_INCOMING_DELIVERIES_DRAFT[order.orderId] = {
      lines: lineDrafts,
      receivedBy: "",
      receivingNotes: ""
    };
  }

  return window.DMC_INCOMING_DELIVERIES_DRAFT[order.orderId];
}

function getSentQtyForLine(order, line) {
  return Number(
    order.fulfillment?.lines?.[line.itemId]?.sentQty ?? line.requestedQty ?? 0
  );
}

function getReceivingVariance(order, line) {
  const draft = getIncomingDraft(order);
  const sentQty = getSentQtyForLine(order, line);
  const receivedQty = Number(draft.lines[line.itemId]?.receivedQty || 0);

  return receivedQty - sentQty;
}

function hasIncomingDeliveryVariance(order) {
  const draft = getIncomingDraft(order);

  return (order.lines || []).some((line) => {
    const sentQty = getSentQtyForLine(order, line);
    const receivedQty = Number(draft.lines[line.itemId]?.receivedQty || 0);
    const condition = draft.lines[line.itemId]?.condition || "Good";

    return receivedQty !== sentQty || condition !== "Good";
  });
}

function hasBranchTransferInAlreadyLogged(orderId) {
  return getStoredLedgerEntriesForIncomingDeliveries().some(
    (entry) =>
      entry.batchId === orderId &&
      entry.movementType === "Transfer In" &&
      entry.source === "Incoming Delivery Receipt"
  );
}

function buildBranchTransferInLedgerEntries(order, receivingDraft) {
  const submittedAt = new Date().toISOString();
  const submittedAtDisplay = getIncomingDeliveryReadableTimestamp();

  return (order.lines || [])
    .map((line) => {
      const condition = receivingDraft.lines?.[line.itemId]?.condition || "Good";
      const receivedQty = Number(
        receivingDraft.lines?.[line.itemId]?.receivedQty || 0
      );

      const usableQty =
        condition === "Good" && !Number.isNaN(receivedQty) && receivedQty > 0
          ? receivedQty
          : 0;

      if (usableQty <= 0) {
        return null;
      }

      return {
        date: getIncomingDeliveryTodayDate(),
        submittedAt,
        submittedAtDisplay,
        batchId: order.orderId,
        location: order.branch || "DMC-Iriga Branch",
        department: order.department || "Branch",
        section: line.section || "",
        itemId: line.itemId || "",
        itemName: line.itemName || "",
        movementType: "Transfer In",
        movementField: "transferIn",
        stockEffect: "add",
        quantity: usableQty,
        unit: line.unit || "",
        source: "Incoming Delivery Receipt",
        destination: order.branch || "DMC-Iriga Branch",
        notes: `Received from Warehouse by ${
          receivingDraft.receivedBy || "branch receiver"
        }. Order ${order.orderId}. Condition: ${condition}.`
      };
    })
    .filter(Boolean);
}

function writeBranchTransferInToLedger(order, receivingDraft) {
  if (hasBranchTransferInAlreadyLogged(order.orderId)) {
    return;
  }

  const currentLedgerEntries = getStoredLedgerEntriesForIncomingDeliveries();
  const branchTransferInEntries = buildBranchTransferInLedgerEntries(
    order,
    receivingDraft
  );

  saveLedgerEntriesFromIncomingDeliveries([
    ...currentLedgerEntries,
    ...branchTransferInEntries
  ]);
}

function hasDeliveryIssueAlreadyCreated(orderId) {
  return getStoredIncomingDeliveryIssues().some(
    (issue) => issue.orderId === orderId
  );
}

function getDeliveryIssueReason(sentQty, receivedQty, condition) {
  if (condition === "Missing") {
    return "Missing";
  }

  if (condition === "Damaged") {
    return "Damaged";
  }

  if (condition === "Spoiled") {
    return "Spoiled";
  }

  if (receivedQty < sentQty) {
    return "Short Received";
  }

  if (receivedQty > sentQty) {
    return "Over Received";
  }

  return "Needs Review";
}

function buildDeliveryIssueRecords(order, receivingDraft) {
  const createdAt = new Date().toISOString();
  const createdAtDisplay = getIncomingDeliveryReadableTimestamp();

  return (order.lines || [])
    .map((line) => {
      const sentQty = getSentQtyForLine(order, line);
      const receivedQty = Number(
        receivingDraft.lines?.[line.itemId]?.receivedQty || 0
      );
      const condition = receivingDraft.lines?.[line.itemId]?.condition || "Good";
      const lineNotes = receivingDraft.lines?.[line.itemId]?.notes || "";
      const varianceQty = receivedQty - sentQty;

      const hasIssue =
        receivedQty !== sentQty ||
        condition === "Damaged" ||
        condition === "Spoiled" ||
        condition === "Missing";

      if (!hasIssue) {
        return null;
      }

      return {
        issueId: `DI-${order.orderId}-${line.itemId}`,
        orderId: order.orderId,
        branch: order.branch || "DMC-Iriga Branch",
        department: order.department || "-",
        itemId: line.itemId || "",
        itemName: line.itemName || "",
        section: line.section || "",
        unit: line.unit || "",
        sentQty,
        receivedQty,
        varianceQty,
        condition,
        issueReason: getDeliveryIssueReason(sentQty, receivedQty, condition),
        preparedBy: order.fulfillment?.preparedBy || "",
        receivedBy: receivingDraft.receivedBy || "",
        deliveryNotes: order.fulfillment?.deliveryNotes || "",
        branchLineNotes: lineNotes,
        branchReceivingNotes: receivingDraft.receivingNotes || "",
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

function writeDeliveryIssuesForVariance(order, receivingDraft) {
  if (hasDeliveryIssueAlreadyCreated(order.orderId)) {
    return;
  }

  const newIssues = buildDeliveryIssueRecords(order, receivingDraft);

  if (newIssues.length === 0) {
    return;
  }

  const currentIssues = getStoredIncomingDeliveryIssues();

  saveIncomingDeliveryIssues([...currentIssues, ...newIssues]);
}

function renderIncomingDeliveryList() {
  const deliveries = getIncomingDeliveryOrders();
  const selectedDelivery = getSelectedIncomingDelivery();

  if (deliveries.length === 0) {
    return `
      <div class="order-list-empty">
        <p>No incoming deliveries.</p>
        <span>Orders marked On the Way by Warehouse will appear here.</span>
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
              data-select-incoming-delivery="${order.orderId}"
            >
              <div>
                <strong>${order.orderId}</strong>
                <p>${order.department || "-"} • ${(order.lines || []).length} item(s)</p>
                <span>
                  Prepared By: ${order.fulfillment?.preparedBy || "-"} •
                  Sent: ${formatIncomingDeliveryDateTime(order.fulfillment?.sentAt)}
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

function renderIncomingDeliveryLines(order) {
  if (!order || !order.lines || order.lines.length === 0) {
    return `
      <p class="submit-preview-empty">
        No delivery lines found.
      </p>
    `;
  }

  const draft = getIncomingDraft(order);

  return `
    <div class="incoming-delivery-lines">
      ${order.lines
        .map((line) => {
          const sentQty = getSentQtyForLine(order, line);
          const receivedQty = draft.lines[line.itemId]?.receivedQty ?? sentQty;
          const condition = draft.lines[line.itemId]?.condition || "Good";
          const lineNotes = draft.lines[line.itemId]?.notes || "";
          const variance = getReceivingVariance(order, line);

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
                  data-received-qty="${line.itemId}"
                  type="number"
                  min="0"
                  step="any"
                  value="${receivedQty}"
                />
              </label>

              <label>
                Condition
                <select
                  class="incoming-condition-input"
                  data-received-condition="${line.itemId}"
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
                  data-received-notes="${line.itemId}"
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

function renderIncomingDeliveryDetail() {
  const order = getSelectedIncomingDelivery();

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

  const draft = getIncomingDraft(order);
  const hasVariance = hasIncomingDeliveryVariance(order);

  return `
    <section class="panel branch-order-detail">
      <div class="panel-header">
        <div>
          <h3>${order.orderId}</h3>
          <p>
            ${order.branch || "DMC-Iriga Branch"} • ${order.department || "-"} •
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
          <strong>${formatIncomingDeliveryDateTime(order.fulfillment?.sentAt)}</strong>
        </div>

        <div>
          <p class="eyebrow">Status</p>
          <strong>${hasVariance ? "Needs Review" : "Ready to Receive"}</strong>
        </div>
      </div>

      <div class="instruction-box">
        <strong>Receiving Rule:</strong>
        <span>
          Good received quantity will be added to Branch Stock through the Ledger.
          Missing, damaged, spoiled, or quantity differences will mark the order as Variance
          and create Delivery Issue records.
        </span>
      </div>

      <div class="branch-order-section">
        <h4>Receiving Confirmation</h4>
        ${renderIncomingDeliveryLines(order)}
      </div>

      <div class="incoming-receiving-meta">
        <label>
          Received By
          <select id="incoming-received-by">
            ${renderIncomingReceivedByOptions(draft.receivedBy || "")}
          </select>
        </label>

        <label>
          Receiving Notes
          <textarea
            id="incoming-receiving-notes"
            rows="3"
            placeholder="Notes about delivery condition, shortage, or confirmation..."
          >${draft.receivingNotes || ""}</textarea>
        </label>
      </div>

      <div class="form-actions incoming-delivery-actions">
        <button class="ghost-button" id="accept-full-delivery">
          Accept Full Delivery
        </button>

        <button class="primary-button" id="confirm-incoming-delivery">
          Confirm Receipt
        </button>
      </div>
    </section>
  `;
}

function getIncomingDeliveriesContent() {
  const summary = getIncomingDeliverySummary();

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
            <p>Confirm deliveries sent by Warehouse.</p>
          </div>

          <span class="badge info-badge">On the Way</span>
        </div>

        <div class="filter-bar branch-order-search-bar">
          <label class="filter-search">
            Search
            <input
              id="incoming-delivery-search"
              type="text"
              placeholder="Search order, prepared by, item..."
              value="${window.DMC_INCOMING_DELIVERIES_SEARCH}"
            />
          </label>
        </div>

        ${renderIncomingDeliveryList()}
      </section>

      ${renderIncomingDeliveryDetail()}
    </section>
  `;
}

function refreshIncomingDeliveriesPage() {
  window.DMC_PAGES["incoming-deliveries"].content =
    getIncomingDeliveriesContent();

  renderPage("incoming-deliveries");
}

function saveIncomingDeliveryDraftFromInputs(order) {
  if (!order) {
    return;
  }

  const draft = getIncomingDraft(order);

  document.querySelectorAll("[data-received-qty]").forEach((input) => {
    const itemId = input.dataset.receivedQty;

    draft.lines[itemId] = draft.lines[itemId] || {};
    draft.lines[itemId].receivedQty = input.value;
  });

  document.querySelectorAll("[data-received-condition]").forEach((select) => {
    const itemId = select.dataset.receivedCondition;

    draft.lines[itemId] = draft.lines[itemId] || {};
    draft.lines[itemId].condition = select.value;
  });

  document.querySelectorAll("[data-received-notes]").forEach((input) => {
    const itemId = input.dataset.receivedNotes;

    draft.lines[itemId] = draft.lines[itemId] || {};
    draft.lines[itemId].notes = input.value;
  });

  const receivedByInput = document.getElementById("incoming-received-by");
  const receivingNotesInput = document.getElementById("incoming-receiving-notes");

  draft.receivedBy = receivedByInput?.value || "";
  draft.receivingNotes = receivingNotesInput?.value || "";

  window.DMC_INCOMING_DELIVERIES_DRAFT[order.orderId] = draft;
}

function acceptFullDelivery(order) {
  if (!order) {
    return;
  }

  const draft = getIncomingDraft(order);

  (order.lines || []).forEach((line) => {
    const sentQty = getSentQtyForLine(order, line);

    draft.lines[line.itemId] = {
      receivedQty: sentQty,
      condition: "Good",
      notes: ""
    };
  });

  window.DMC_INCOMING_DELIVERIES_DRAFT[order.orderId] = draft;
  refreshIncomingDeliveriesPage();
}

function confirmIncomingDelivery(order) {
  if (!order) {
    return;
  }

  saveIncomingDeliveryDraftFromInputs(order);

  const draft = getIncomingDraft(order);

  if (!String(draft.receivedBy || "").trim()) {
    showIncomingDeliveryModal({
      type: "warning",
      title: "Received By Required",
      message: "Please select who received this delivery.",
      confirmLabel: "Got it"
    });
    return;
  }

  const hasInvalidReceivedQty = (order.lines || []).some((line) => {
    const receivedQty = Number(draft.lines[line.itemId]?.receivedQty || 0);
    return Number.isNaN(receivedQty) || receivedQty < 0;
  });

  if (hasInvalidReceivedQty) {
    showIncomingDeliveryModal({
      type: "warning",
      title: "Invalid Quantity",
      message: "Please enter valid received quantities.",
      confirmLabel: "Got it"
    });
    return;
  }

  const hasVariance = hasIncomingDeliveryVariance(order);
  const nextStatus = hasVariance ? "Variance" : "Completed";
  const statusNote = hasVariance
    ? "Branch confirmed delivery with variance or condition issue. Branch Transfer In was logged for usable received quantities only. Delivery Issue record was created."
    : "Branch confirmed delivery received complete. Branch Transfer In was logged.";

  showIncomingDeliveryConfirm({
    type: hasVariance ? "warning" : "success",
    title: hasVariance
      ? "Confirm Receipt with Variance?"
      : "Confirm Receipt Complete?",
    message: hasVariance
      ? `Confirm receipt for ${order.orderId} with variance and create Delivery Issue record?`
      : `Confirm receipt for ${order.orderId} as complete?`,
    confirmLabel: hasVariance ? "Confirm Variance" : "Confirm Receipt",
    cancelLabel: "Cancel",
    onConfirm: () => {
      writeBranchTransferInToLedger(order, draft);

      if (hasVariance) {
        writeDeliveryIssuesForVariance(order, draft);
      }

      const orders = getStoredIncomingDeliveryOrders();

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

      saveIncomingDeliveryOrders(updatedOrders);

      window.DMC_INCOMING_DELIVERIES_SELECTED_ID = "";
      delete window.DMC_INCOMING_DELIVERIES_DRAFT[order.orderId];

      showIncomingDeliveryModal({
        type: hasVariance ? "warning" : "success",
        title: hasVariance ? "Delivery Variance Recorded" : "Delivery Received",
        message: hasVariance
          ? "Delivery confirmed with variance. Delivery Issue record was created."
          : "Delivery confirmed complete. Branch Transfer In was logged.",
        confirmLabel: "Continue"
      });

      refreshIncomingDeliveriesPage();
    }
  });
}

function setupIncomingDeliveriesEvents() {
  const searchInput = document.getElementById("incoming-delivery-search");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      window.DMC_INCOMING_DELIVERIES_SEARCH = searchInput.value;
      window.DMC_INCOMING_DELIVERIES_SELECTED_ID = "";
      refreshIncomingDeliveriesPage();
    });
  }

  document.querySelectorAll("[data-select-incoming-delivery]").forEach(
    (button) => {
      button.addEventListener("click", () => {
        window.DMC_INCOMING_DELIVERIES_SELECTED_ID =
          button.dataset.selectIncomingDelivery;

        refreshIncomingDeliveriesPage();
      });
    }
  );

  const selectedOrder = getSelectedIncomingDelivery();

  document.querySelectorAll("[data-received-qty]").forEach((input) => {
    input.addEventListener("change", () => {
      saveIncomingDeliveryDraftFromInputs(selectedOrder);
      refreshIncomingDeliveriesPage();
    });
  });

  document.querySelectorAll("[data-received-condition]").forEach((select) => {
    select.addEventListener("change", () => {
      saveIncomingDeliveryDraftFromInputs(selectedOrder);
      refreshIncomingDeliveriesPage();
    });
  });

  document.querySelectorAll("[data-received-notes]").forEach((input) => {
    input.addEventListener("input", () => {
      saveIncomingDeliveryDraftFromInputs(selectedOrder);
    });
  });

  const receivedByInput = document.getElementById("incoming-received-by");
  const receivingNotesInput = document.getElementById("incoming-receiving-notes");

  [receivedByInput, receivingNotesInput].forEach((input) => {
    if (input) {
      input.addEventListener("input", () => {
        saveIncomingDeliveryDraftFromInputs(selectedOrder);
      });

      input.addEventListener("change", () => {
        saveIncomingDeliveryDraftFromInputs(selectedOrder);
      });
    }
  });

  const acceptFullButton = document.getElementById("accept-full-delivery");
  const confirmButton = document.getElementById("confirm-incoming-delivery");

  if (acceptFullButton) {
    acceptFullButton.addEventListener("click", () => {
      acceptFullDelivery(selectedOrder);
    });
  }

  if (confirmButton) {
    confirmButton.addEventListener("click", () => {
      confirmIncomingDelivery(selectedOrder);
    });
  }
}

window.DMC_PAGES["incoming-deliveries"] = {
  eyebrow: "DMC-Iriga Branch",
  title: "Incoming Deliveries",
  description:
    "Confirm deliveries sent by Warehouse and flag missing, damaged, or spoiled items.",
  getContent: getIncomingDeliveriesContent,
  content: getIncomingDeliveriesContent(),
  afterRender: setupIncomingDeliveriesEvents
};
