(() => {
  window.DMC_PAGES = window.DMC_PAGES || {};

  const ORDER_KEY = "dmc_commissary_orders";
  const LEDGER_KEY = "dmc_inventory_ledger_entries";
  const ISSUE_KEY = "dmc_commissary_delivery_issues";

  window.DMC_COMMISSARY_INCOMING_STATE =
    window.DMC_COMMISSARY_INCOMING_STATE || {
      selectedOrderId: "",
      search: "",
      drafts: {}
    };

  function readArray(key, fallback = []) {
    const stored = localStorage.getItem(key);

    if (!stored) {
      return fallback;
    }

    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function writeArray(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getOrders() {
    return readArray(ORDER_KEY);
  }

  function saveOrders(orders) {
    writeArray(ORDER_KEY, orders);
  }

  function getLedger() {
    return readArray(LEDGER_KEY, window.DMC_DATA?.ledger || []);
  }

  function saveLedger(entries) {
    writeArray(LEDGER_KEY, entries);
  }

  function getIssues() {
    return readArray(ISSUE_KEY);
  }

  function saveIssues(issues) {
    writeArray(ISSUE_KEY, issues);
  }

  function getSettings() {
    const stored = localStorage.getItem("dmc_inventory_settings");

    if (!stored) {
      return {};
    }

    try {
      return JSON.parse(stored) || {};
    } catch {
      return {};
    }
  }

  function normalizeName(value) {
    if (typeof value === "string") {
      return value;
    }

    return value?.name || value?.fullName || value?.label || "";
  }

  function getCommissaryManagers() {
    const settings = getSettings();

    const directManagers = [
      ...(settings.managerNames || []),
      ...(settings.managers || []),
      ...(settings.commissaryManagers || [])
    ];

    const staffManagers = (settings.staffMembers || settings.staff || []).filter(
      (staff) => {
        const role = String(
          staff.role || staff.position || staff.access || ""
        ).toLowerCase();

        return role.includes("manager") || role.includes("admin");
      }
    );

    return [...directManagers, ...staffManagers]
      .map(normalizeName)
      .filter(Boolean);
  }

  function renderManagerOptions(currentValue) {
    const managers = getCommissaryManagers();

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

  function showModal({ type, title, message, confirmLabel = "OK" }) {
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

  function showConfirm({
    type,
    title,
    message,
    confirmLabel,
    cancelLabel = "Cancel",
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

  function formatDateTime(value) {
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

  function getOrderTimestamp(order) {
    const value =
      order.fulfillment?.sentAt ||
      order.statusHistory?.[order.statusHistory.length - 1]?.timestamp ||
      order.orderDate ||
      "";

    const timestamp = new Date(value).getTime();

    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  function isCommissaryOrder(order) {
    const source = String(
      order.source ||
      order.requestSource ||
      order.department ||
      ""
    ).toLowerCase();

    return source.includes("commissary");
  }

  function getIncomingOrders() {
    const searchValue = String(
      window.DMC_COMMISSARY_INCOMING_STATE.search || ""
    )
      .toLowerCase()
      .trim();

    return getOrders()
      .filter(
        (order) =>
          isCommissaryOrder(order) &&
          order.status === "On the Way"
      )
      .filter((order) => {
        if (!searchValue) {
          return true;
        }

        return (
          String(order.orderId || "").toLowerCase().includes(searchValue) ||
          String(order.requestedBy || "").toLowerCase().includes(searchValue) ||
          String(order.fulfillment?.preparedBy || "")
            .toLowerCase()
            .includes(searchValue) ||
          (order.lines || []).some(
            (line) =>
              String(line.itemId || "").toLowerCase().includes(searchValue) ||
              String(line.itemName || "").toLowerCase().includes(searchValue) ||
              String(line.section || "").toLowerCase().includes(searchValue)
          )
        );
      })
      .sort((a, b) => getOrderTimestamp(b) - getOrderTimestamp(a));
  }

  function getSelectedOrder() {
    const orders = getIncomingOrders();
    const selectedOrderId =
      window.DMC_COMMISSARY_INCOMING_STATE.selectedOrderId;

    return (
      orders.find((order) => order.orderId === selectedOrderId) ||
      orders[0] ||
      null
    );
  }

  function getSummary() {
    const commissaryOrders = getOrders().filter(isCommissaryOrder);

    return {
      incoming: commissaryOrders.filter(
        (order) => order.status === "On the Way"
      ).length,
      urgent: commissaryOrders.filter(
        (order) => order.status === "On the Way" && order.urgent
      ).length,
      completed: commissaryOrders.filter(
        (order) => order.status === "Completed"
      ).length,
      variance: commissaryOrders.filter(
        (order) => order.status === "Variance"
      ).length
    };
  }

  function getSentQty(order, line) {
    const sentQty =
      order.fulfillment?.lines?.[line.itemId]?.sentQty ??
      line.sentQty ??
      line.requestedQty ??
      0;

    const parsed = Number(sentQty);

    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function getDraft(order) {
    if (!order) {
      return {
        receivedBy: "",
        receivingNotes: "",
        lines: {}
      };
    }

    const drafts = window.DMC_COMMISSARY_INCOMING_STATE.drafts;

    if (!drafts[order.orderId]) {
      const lines = {};

      (order.lines || []).forEach((line) => {
        lines[line.itemId] = {
          receivedQty: getSentQty(order, line),
          condition: "Good",
          notes: ""
        };
      });

      drafts[order.orderId] = {
        receivedBy: "",
        receivingNotes: "",
        lines
      };
    }

    return drafts[order.orderId];
  }

  function getVariance(order, line) {
    const draft = getDraft(order);
    const sentQty = getSentQty(order, line);
    const receivedQty = Number(
      draft.lines?.[line.itemId]?.receivedQty ?? 0
    );

    return receivedQty - sentQty;
  }

  function hasVariance(order) {
    const draft = getDraft(order);

    return (order.lines || []).some((line) => {
      const sentQty = getSentQty(order, line);
      const receivedQty = Number(
        draft.lines?.[line.itemId]?.receivedQty ?? 0
      );
      const condition =
        draft.lines?.[line.itemId]?.condition || "Good";

      return receivedQty !== sentQty || condition !== "Good";
    });
  }

  function hasReceiptAlreadyPosted(orderId) {
    return getLedger().some(
      (entry) =>
        String(entry.batchId || "") === String(orderId || "") &&
        entry.movementType === "Transfer In" &&
        entry.movementField === "receivedFromWarehouse" &&
        String(entry.location || "").toLowerCase().includes("commissary")
    );
  }

  function buildCommissaryReceiptEntries(order, draft) {
    const submittedAt = new Date().toISOString();
    const today = submittedAt.slice(0, 10);

    return (order.lines || [])
      .map((line) => {
        const lineDraft = draft.lines?.[line.itemId] || {};
        const receivedQty = Number(lineDraft.receivedQty || 0);
        const condition = lineDraft.condition || "Good";

        const usableQty =
          condition === "Good" &&
          !Number.isNaN(receivedQty) &&
          receivedQty > 0
            ? receivedQty
            : 0;

        if (usableQty <= 0) {
          return null;
        }

        return {
          date: today,
          submittedAt,
          batchId: order.orderId,
          sourceOrderId: order.orderId,
          location: "Commissary",
          department: "Commissary",
          section: line.section || "",
          itemId: line.itemId || "",
          itemName: line.itemName || "",
          movementType: "Transfer In",
          movementField: "receivedFromWarehouse",
          stockEffect: "add",
          quantity: usableQty,
          sentQuantity: getSentQty(order, line),
          unit: line.unit || "",
          source: "Commissary Incoming Delivery Receipt",
          destination: "Commissary",
          receivedBy: draft.receivedBy || "",
          managerReviewedBy: draft.receivedBy || "",
          condition,
          notes: [
            `Commissary received from Warehouse.`,
            `Order: ${order.orderId}.`,
            `Sent: ${getSentQty(order, line)}.`,
            `Received: ${receivedQty}.`,
            `Condition: ${condition}.`,
            lineDraft.notes ? `Line Notes: ${lineDraft.notes}.` : "",
            draft.receivingNotes
              ? `Receiving Notes: ${draft.receivingNotes}.`
              : ""
          ]
            .filter(Boolean)
            .join(" ")
        };
      })
      .filter(Boolean);
  }

  function postReceiptToCommissaryLedger(order, draft) {
    if (hasReceiptAlreadyPosted(order.orderId)) {
      return {
        alreadyPosted: true,
        postedEntries: []
      };
    }

    const entries = buildCommissaryReceiptEntries(order, draft);
    saveLedger([...getLedger(), ...entries]);

    return {
      alreadyPosted: false,
      postedEntries: entries
    };
  }

  function getIssueReason(sentQty, receivedQty, condition) {
    if (condition === "Missing") return "Missing";
    if (condition === "Damaged") return "Damaged";
    if (condition === "Spoiled") return "Spoiled";
    if (receivedQty < sentQty) return "Short Received";
    if (receivedQty > sentQty) return "Over Received";

    return "Needs Review";
  }

  function buildIssueRecords(order, draft) {
    const createdAt = new Date().toISOString();

    return (order.lines || [])
      .map((line) => {
        const lineDraft = draft.lines?.[line.itemId] || {};
        const sentQty = getSentQty(order, line);
        const receivedQty = Number(lineDraft.receivedQty || 0);
        const condition = lineDraft.condition || "Good";
        const varianceQty = receivedQty - sentQty;

        if (varianceQty === 0 && condition === "Good") {
          return null;
        }

        return {
          issueId: `COM-DI-${order.orderId}-${line.itemId}`,
          orderId: order.orderId,
          operatingArea: "Commissary",
          department: "Commissary",
          itemId: line.itemId || "",
          itemName: line.itemName || "",
          section: line.section || "",
          unit: line.unit || "",
          sentQty,
          receivedQty,
          varianceQty,
          condition,
          issueReason: getIssueReason(sentQty, receivedQty, condition),
          preparedBy: order.fulfillment?.preparedBy || "",
          receivedBy: draft.receivedBy || "",
          deliveryNotes: order.fulfillment?.deliveryNotes || "",
          receivingNotes: draft.receivingNotes || "",
          lineNotes: lineDraft.notes || "",
          status: "Open",
          stockActionApplied: false,
          ledgerEntryCreated: false,
          resolutionNotes: "",
          createdAt,
          resolvedAt: ""
        };
      })
      .filter(Boolean);
  }

  function saveVarianceIssues(order, draft) {
    const currentIssues = getIssues();
    const existingKeys = new Set(
      currentIssues.map((issue) => issue.issueId)
    );

    const newIssues = buildIssueRecords(order, draft).filter(
      (issue) => !existingKeys.has(issue.issueId)
    );

    if (newIssues.length > 0) {
      saveIssues([...currentIssues, ...newIssues]);
    }
  }

  function renderOrderList() {
    const orders = getIncomingOrders();
    const selectedOrder = getSelectedOrder();

    if (orders.length === 0) {
      return `
        <div class="order-list-empty">
          <p>No incoming Commissary deliveries.</p>
          <span>Warehouse orders marked On the Way will appear here.</span>
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
                  selectedOrder?.orderId === order.orderId ? "active" : ""
                }"
                data-select-commissary-delivery="${order.orderId}"
              >
                <div>
                  <strong>${order.orderId}</strong>
                  <p>Commissary • ${(order.lines || []).length} item(s)</p>
                  <span>
                    Prepared By: ${order.fulfillment?.preparedBy || "-"} •
                    Sent: ${formatDateTime(order.fulfillment?.sentAt)}
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

  function renderOrderLines(order) {
    const draft = getDraft(order);

    return `
      <div class="incoming-delivery-lines">
        ${(order.lines || [])
          .map((line) => {
            const sentQty = getSentQty(order, line);
            const lineDraft = draft.lines?.[line.itemId] || {};
            const receivedQty = lineDraft.receivedQty ?? sentQty;
            const condition = lineDraft.condition || "Good";
            const notes = lineDraft.notes || "";
            const variance = getVariance(order, line);

            return `
              <div class="incoming-delivery-line">
                <div>
                  <p class="eyebrow">${line.section || "Item"}</p>
                  <strong>${line.itemName || "-"}</strong>
                  <span>${line.itemId || "-"} • ${line.unit || "-"}</span>
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
                    value="${receivedQty}"
                  />
                </label>

                <label>
                  Condition
                  <select data-commissary-condition="${line.itemId}">
                    <option value="Good" ${
                      condition === "Good" ? "selected" : ""
                    }>Good</option>
                    <option value="Damaged" ${
                      condition === "Damaged" ? "selected" : ""
                    }>Damaged</option>
                    <option value="Spoiled" ${
                      condition === "Spoiled" ? "selected" : ""
                    }>Spoiled</option>
                    <option value="Missing" ${
                      condition === "Missing" ? "selected" : ""
                    }>Missing</option>
                  </select>
                </label>

                <label>
                  Notes
                  <input
                    data-commissary-line-notes="${line.itemId}"
                    type="text"
                    placeholder="Optional"
                    value="${notes}"
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

  function renderOrderDetail() {
    const order = getSelectedOrder();

    if (!order) {
      return `
        <section class="panel branch-order-detail">
          <div class="order-list-empty">
            <p>No delivery selected.</p>
            <span>Select a Commissary delivery from the left panel.</span>
          </div>
        </section>
      `;
    }

    const draft = getDraft(order);

    return `
      <section class="panel branch-order-detail">
        <div class="panel-header">
          <div>
            <h3>${order.orderId}</h3>
            <p>Warehouse → Commissary</p>
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
            <strong>${formatDateTime(order.fulfillment?.sentAt)}</strong>
          </div>

          <div>
            <p class="eyebrow">Status</p>
            <strong>${hasVariance(order) ? "Needs Review" : "Ready to Receive"}</strong>
          </div>
        </div>

        <div class="instruction-box">
          <strong>Commissary Receiving Rule:</strong>
          <span>
            Only good received quantity is added to Commissary Stock.
            Missing, damaged, spoiled, or quantity differences are recorded as Commissary delivery issues.
          </span>
        </div>

        <div class="branch-order-section">
          <h4>Receiving Confirmation</h4>
          ${renderOrderLines(order)}
        </div>

        <div class="incoming-receiving-meta">
          <label>
            Received By
            <select id="commissary-received-by">
              ${renderManagerOptions(draft.receivedBy)}
            </select>
          </label>

          <label>
            Receiving Notes
            <textarea
              id="commissary-receiving-notes"
              rows="3"
              placeholder="Commissary receiving notes..."
            >${draft.receivingNotes || ""}</textarea>
          </label>
        </div>

        <div class="form-actions incoming-delivery-actions">
          <button class="ghost-button" id="accept-full-commissary-delivery">
            Accept Full Delivery
          </button>

          <button class="primary-button" id="confirm-commissary-delivery">
            Confirm Receipt
          </button>
        </div>
      </section>
    `;
  }

  function getContent() {
    const summary = getSummary();

    return `
      <section class="grid">
        <div class="card"><p>Incoming</p><strong>${summary.incoming}</strong></div>
        <div class="card"><p>Urgent</p><strong>${summary.urgent}</strong></div>
        <div class="card"><p>Completed</p><strong>${summary.completed}</strong></div>
        <div class="card"><p>Variance</p><strong>${summary.variance}</strong></div>
      </section>

      <section class="branch-orders-layout">
        <section class="panel branch-order-list-panel">
          <div class="panel-header">
            <div>
              <h3>Commissary Incoming Deliveries</h3>
              <p>Confirm deliveries sent from Warehouse to Commissary.</p>
            </div>
            <span class="badge info-badge">On the Way</span>
          </div>

          <div class="filter-bar branch-order-search-bar">
            <label class="filter-search">
              Search
              <input
                id="commissary-delivery-search"
                type="text"
                placeholder="Search order, item, prepared by..."
                value="${window.DMC_COMMISSARY_INCOMING_STATE.search}"
              />
            </label>
          </div>

          ${renderOrderList()}
        </section>

        ${renderOrderDetail()}
      </section>
    `;
  }

  function refresh() {
    window.DMC_PAGES["commissary-incoming-deliveries"].content = getContent();
    renderPage("commissary-incoming-deliveries");
  }

  function saveDraftFromInputs(order) {
    if (!order) {
      return;
    }

    const draft = getDraft(order);

    document
      .querySelectorAll("[data-commissary-received-qty]")
      .forEach((input) => {
        const itemId = input.dataset.commissaryReceivedQty;

        draft.lines[itemId] = draft.lines[itemId] || {};
        draft.lines[itemId].receivedQty = input.value;
      });

    document
      .querySelectorAll("[data-commissary-condition]")
      .forEach((select) => {
        const itemId = select.dataset.commissaryCondition;

        draft.lines[itemId] = draft.lines[itemId] || {};
        draft.lines[itemId].condition = select.value;
      });

    document
      .querySelectorAll("[data-commissary-line-notes]")
      .forEach((input) => {
        const itemId = input.dataset.commissaryLineNotes;

        draft.lines[itemId] = draft.lines[itemId] || {};
        draft.lines[itemId].notes = input.value;
      });

    draft.receivedBy =
      document.getElementById("commissary-received-by")?.value || "";

    draft.receivingNotes =
      document.getElementById("commissary-receiving-notes")?.value || "";
  }

  function acceptFull(order) {
    if (!order) {
      return;
    }

    const draft = getDraft(order);

    (order.lines || []).forEach((line) => {
      draft.lines[line.itemId] = {
        receivedQty: getSentQty(order, line),
        condition: "Good",
        notes: ""
      };
    });

    refresh();
  }

  function confirmReceipt(order) {
    if (!order) {
      return;
    }

    saveDraftFromInputs(order);
    const draft = getDraft(order);

    if (!String(draft.receivedBy || "").trim()) {
      showModal({
        type: "warning",
        title: "Received By Required",
        message: "Please select the Commissary receiving manager."
      });
      return;
    }

    const invalidQty = (order.lines || []).some((line) => {
      const value = Number(draft.lines?.[line.itemId]?.receivedQty);

      return Number.isNaN(value) || value < 0;
    });

    if (invalidQty) {
      showModal({
        type: "warning",
        title: "Invalid Quantity",
        message: "Enter a valid received quantity for every item."
      });
      return;
    }

    const variance = hasVariance(order);
    const nextStatus = variance ? "Variance" : "Completed";

    showConfirm({
      type: variance ? "warning" : "success",
      title: variance
        ? "Confirm Commissary Receipt with Variance?"
        : "Confirm Commissary Receipt?",
      message: variance
        ? `Confirm ${order.orderId} with variance and create Commissary delivery issues?`
        : `Confirm ${order.orderId} as fully received by Commissary?`,
      confirmLabel: variance ? "Confirm Variance" : "Confirm Receipt",
      onConfirm: () => {
        const postResult = postReceiptToCommissaryLedger(order, draft);

        if (variance) {
          saveVarianceIssues(order, draft);
        }

        const updatedOrders = getOrders().map((storedOrder) => {
          if (storedOrder.orderId !== order.orderId) {
            return storedOrder;
          }

          return {
            ...storedOrder,
            status: nextStatus,
            receiving: {
              receivedBy: draft.receivedBy,
              receivingNotes: draft.receivingNotes,
              receivedAt: new Date().toISOString(),
              lines: draft.lines
            },
            statusHistory: [
              ...(storedOrder.statusHistory || []),
              {
                status: nextStatus,
                timestamp: new Date().toISOString(),
                note: variance
                  ? "Commissary received the delivery with variance."
                  : "Commissary received the delivery complete."
              }
            ]
          };
        });

        saveOrders(updatedOrders);

        delete window.DMC_COMMISSARY_INCOMING_STATE.drafts[order.orderId];
        window.DMC_COMMISSARY_INCOMING_STATE.selectedOrderId = "";

        showModal({
          type: variance ? "warning" : "success",
          title: variance
            ? "Commissary Variance Recorded"
            : "Commissary Delivery Received",
          message: postResult.alreadyPosted
            ? "This receipt was already posted to Commissary Stock, so it was not posted twice."
            : `${postResult.postedEntries.length} Commissary Transfer In entr${
                postResult.postedEntries.length === 1 ? "y was" : "ies were"
              } posted to the Ledger.`
        });

        refresh();
      }
    });
  }

  function setupEvents() {
    const searchInput =
      document.getElementById("commissary-delivery-search");

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        window.DMC_COMMISSARY_INCOMING_STATE.search = searchInput.value;
        window.DMC_COMMISSARY_INCOMING_STATE.selectedOrderId = "";
        refresh();
      });
    }

    document
      .querySelectorAll("[data-select-commissary-delivery]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          window.DMC_COMMISSARY_INCOMING_STATE.selectedOrderId =
            button.dataset.selectCommissaryDelivery;
          refresh();
        });
      });

    const selectedOrder = getSelectedOrder();

    document
      .querySelectorAll(
        "[data-commissary-received-qty], [data-commissary-condition]"
      )
      .forEach((input) => {
        input.addEventListener("change", () => {
          saveDraftFromInputs(selectedOrder);
          refresh();
        });
      });

    document
      .querySelectorAll("[data-commissary-line-notes]")
      .forEach((input) => {
        input.addEventListener("input", () => {
          saveDraftFromInputs(selectedOrder);
        });
      });

    [
      document.getElementById("commissary-received-by"),
      document.getElementById("commissary-receiving-notes")
    ].forEach((input) => {
      if (input) {
        input.addEventListener("input", () => {
          saveDraftFromInputs(selectedOrder);
        });

        input.addEventListener("change", () => {
          saveDraftFromInputs(selectedOrder);
        });
      }
    });

    const acceptFullButton =
      document.getElementById("accept-full-commissary-delivery");

    if (acceptFullButton) {
      acceptFullButton.addEventListener("click", () => {
        acceptFull(selectedOrder);
      });
    }

    const confirmButton =
      document.getElementById("confirm-commissary-delivery");

    if (confirmButton) {
      confirmButton.addEventListener("click", () => {
        confirmReceipt(selectedOrder);
      });
    }
  }

  window.DMC_PAGES["commissary-incoming-deliveries"] = {
    eyebrow: "Commissary",
    title: "Incoming Deliveries",
    description:
      "Confirm Warehouse deliveries to Commissary and post accepted quantities to Commissary Stock.",
    getContent,
    content: getContent(),
    afterRender: setupEvents
  };
})();
