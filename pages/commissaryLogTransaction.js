window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_COMMISSARY_LOG_MASTER_LIST_KEY = "dmc_master_list_items";
const DMC_COMMISSARY_LOG_LEDGER_KEY = "dmc_inventory_ledger_entries";

window.DMC_COMMISSARY_LOG_SEARCH = window.DMC_COMMISSARY_LOG_SEARCH || "";
window.DMC_COMMISSARY_LOG_DRAFT = window.DMC_COMMISSARY_LOG_DRAFT || {};

function getCommissaryLogMasterListItems() {
  const storedItems = localStorage.getItem(DMC_COMMISSARY_LOG_MASTER_LIST_KEY);

  if (storedItems) {
    try {
      return JSON.parse(storedItems);
    } catch {
      return window.DMC_DATA?.masterList?.items || [];
    }
  }

  return window.DMC_DATA?.masterList?.items || [];
}

function getCommissaryLogLedgerEntries() {
  const storedEntries = localStorage.getItem(DMC_COMMISSARY_LOG_LEDGER_KEY);

  if (!storedEntries) {
    return window.DMC_DATA?.ledger || [];
  }

  try {
    return JSON.parse(storedEntries);
  } catch {
    return window.DMC_DATA?.ledger || [];
  }
}

function saveCommissaryLogLedgerEntries(entries) {
  localStorage.setItem(DMC_COMMISSARY_LOG_LEDGER_KEY, JSON.stringify(entries));
}

function getCommissaryLogTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getCommissaryLogReadableTimestamp() {
  const now = new Date();

  return now.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function createCommissaryLogBatchId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replaceAll("-", "");
  const timePart = now.toTimeString().slice(0, 8).replaceAll(":", "");

  return `COM-${datePart}-${timePart}`;
}

function getCommissaryLogItems() {
  const searchValue = String(window.DMC_COMMISSARY_LOG_SEARCH || "")
    .toLowerCase()
    .trim();

  return getCommissaryLogMasterListItems().filter((item) => {
    const isActive = item.active !== false;

    const matchesSearch =
      !searchValue ||
      String(item.itemId || "").toLowerCase().includes(searchValue) ||
      String(item.officialItemName || "").toLowerCase().includes(searchValue) ||
      String(item.section || "").toLowerCase().includes(searchValue) ||
      String(item.unit || "").toLowerCase().includes(searchValue);

    return isActive && matchesSearch;
  });
}

function getCommissaryLogDraftLine(itemId) {
  window.DMC_COMMISSARY_LOG_DRAFT[itemId] =
    window.DMC_COMMISSARY_LOG_DRAFT[itemId] || {
      received: "",
      waste: "",
      adjustment: "",
      notes: ""
    };

  return window.DMC_COMMISSARY_LOG_DRAFT[itemId];
}

function getCommissaryLogPreparedEntries() {
  const items = getCommissaryLogItems();
  const entries = [];

  items.forEach((item) => {
    const draft = getCommissaryLogDraftLine(item.itemId);

    const movements = [
      {
        key: "received",
        movementType: "Received",
        quantity: Number(draft.received || 0)
      },
      {
        key: "waste",
        movementType: "Waste",
        quantity: Number(draft.waste || 0)
      },
      {
        key: "adjustment",
        movementType: "Adjustment",
        quantity: Number(draft.adjustment || 0)
      }
    ];

    movements.forEach((movement) => {
      if (Number.isNaN(movement.quantity) || movement.quantity === 0) {
        return;
      }

      entries.push({
        item,
        movementType: movement.movementType,
        quantity: movement.quantity,
        notes: draft.notes || ""
      });
    });
  });

  return entries;
}

function getCommissaryLogSummary() {
  const items = getCommissaryLogItems();
  const preparedEntries = getCommissaryLogPreparedEntries();

  return {
    showingItems: items.length,
    preparedEntries: preparedEntries.length,
    receivedTotal: preparedEntries
      .filter((entry) => entry.movementType === "Received")
      .reduce((total, entry) => total + Number(entry.quantity || 0), 0),
    wasteTotal: preparedEntries
      .filter((entry) => entry.movementType === "Waste")
      .reduce((total, entry) => total + Number(entry.quantity || 0), 0)
  };
}

function renderCommissaryLogPreview() {
  const preparedEntries = getCommissaryLogPreparedEntries();

  if (preparedEntries.length === 0) {
    return `
      <p class="submit-preview-empty">
        No commissary movements ready yet. Enter Received, Waste, or Adjustment quantities.
      </p>
    `;
  }

  return `
    <ul class="submit-preview-list">
      ${preparedEntries
        .map(
          (entry) => `
            <li>
              <strong>${entry.item.officialItemName}</strong>
              <span>${entry.movementType}: ${entry.quantity} ${entry.item.unit}</span>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderCommissaryLogRows() {
  const items = getCommissaryLogItems();

  if (items.length === 0) {
    return `
      <tr>
        <td colspan="9">No active items found. Add active items in Master List first.</td>
      </tr>
    `;
  }

  return items
    .map((item) => {
      const draft = getCommissaryLogDraftLine(item.itemId);

      return `
        <tr>
          <td>${item.section || "-"}</td>
          <td>${item.itemId || "-"}</td>
          <td>${item.officialItemName || "-"}</td>
          <td>${item.unit || "-"}</td>

          <td>
            <input
              class="commissary-log-input"
              data-commissary-log-field="received"
              data-commissary-log-item="${item.itemId}"
              type="number"
              step="any"
              placeholder="0"
              value="${draft.received || ""}"
            />
          </td>

          <td>
            <input
              class="commissary-log-input"
              data-commissary-log-field="waste"
              data-commissary-log-item="${item.itemId}"
              type="number"
              step="any"
              placeholder="0"
              value="${draft.waste || ""}"
            />
          </td>

          <td>
            <input
              class="commissary-log-input"
              data-commissary-log-field="adjustment"
              data-commissary-log-item="${item.itemId}"
              type="number"
              step="any"
              placeholder="0"
              value="${draft.adjustment || ""}"
            />
          </td>

          <td>
            <input
              class="commissary-log-notes"
              data-commissary-log-field="notes"
              data-commissary-log-item="${item.itemId}"
              type="text"
              placeholder="Optional"
              value="${draft.notes || ""}"
            />
          </td>

          <td>
            ${
              Number(draft.received || 0) ||
              Number(draft.waste || 0) ||
              Number(draft.adjustment || 0)
                ? `<span class="badge">Ready</span>`
                : `<span class="badge muted-badge">No Input</span>`
            }
          </td>
        </tr>
      `;
    })
    .join("");
}

function getCommissaryLogTransactionContent() {
  const summary = getCommissaryLogSummary();

  return `
    <section class="grid">
      <div class="card">
        <p>Showing Items</p>
        <strong>${summary.showingItems}</strong>
      </div>

      <div class="card">
        <p>Ready Entries</p>
        <strong>${summary.preparedEntries}</strong>
      </div>

      <div class="card">
        <p>Received Total</p>
        <strong>${summary.receivedTotal}</strong>
      </div>

      <div class="card">
        <p>Waste Total</p>
        <strong>${summary.wasteTotal}</strong>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Commissary Log Transaction</h3>
          <p>
            Add received supplier stock, commissary waste, or stock adjustments.
            Submitted entries go directly to the Ledger.
          </p>
        </div>

        <div class="form-actions">
          <button class="primary-button" id="submit-commissary-log">
            Submit to Ledger
          </button>

          <button class="ghost-button" id="clear-commissary-log">
            Clear Draft
          </button>
        </div>
      </div>

      <div class="filter-bar">
        <label class="filter-search">
          Search
          <input
            id="commissary-log-search"
            type="text"
            placeholder="Search item name, ID, section, unit..."
            value="${window.DMC_COMMISSARY_LOG_SEARCH}"
          />
        </label>
      </div>

      <div class="instruction-box">
        <strong>Commissary Stock Rule:</strong>
        <span>
          Received increases Commissary Stock. Waste decreases Commissary Stock.
          Adjustment can increase or decrease depending on the number entered.
        </span>
      </div>

      <div class="submit-preview-box">
        <div>
          <h4>Submit Preview</h4>
          <p>Only filled movement quantities will be submitted to the Ledger.</p>
        </div>

        ${renderCommissaryLogPreview()}
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Section</th>
              <th>Item ID</th>
              <th>Item Name</th>
              <th>Unit</th>
              <th>Received</th>
              <th>Waste</th>
              <th>Adjustment</th>
              <th>Notes</th>
              <th>Review</th>
            </tr>
          </thead>

          <tbody>
            ${renderCommissaryLogRows()}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function refreshCommissaryLogTransactionPage() {
  window.DMC_PAGES["log-transaction"].content =
    getCommissaryLogTransactionContent();

  renderPage("log-transaction");
}

function saveCommissaryLogDraftFromInputs() {
  document.querySelectorAll("[data-commissary-log-item]").forEach((input) => {
    const itemId = input.dataset.commissaryLogItem;
    const field = input.dataset.commissaryLogField;

    window.DMC_COMMISSARY_LOG_DRAFT[itemId] =
      window.DMC_COMMISSARY_LOG_DRAFT[itemId] || {
        received: "",
        waste: "",
        adjustment: "",
        notes: ""
      };

    window.DMC_COMMISSARY_LOG_DRAFT[itemId][field] = input.value;
  });
}

function buildCommissaryLedgerEntries() {
  const preparedEntries = getCommissaryLogPreparedEntries();
  const batchId = createCommissaryLogBatchId();
  const submittedAt = new Date().toISOString();
  const submittedAtDisplay = getCommissaryLogReadableTimestamp();

  return preparedEntries.map((entry) => ({
    date: getCommissaryLogTodayDate(),
    submittedAt,
    submittedAtDisplay,
    batchId,
    department: "Commissary",
    section: entry.item.section || "",
    itemId: entry.item.itemId || "",
    itemName: entry.item.officialItemName || "",
    movementType: entry.movementType,
    quantity: entry.quantity,
    unit: entry.item.unit || "",
    source: "Commissary Log Transaction",
    notes: entry.notes || "-"
  }));
}

function setupCommissaryLogTransactionEvents() {
  const searchInput = document.getElementById("commissary-log-search");
  const submitButton = document.getElementById("submit-commissary-log");
  const clearButton = document.getElementById("clear-commissary-log");

  if (searchInput) {
    searchInput.addEventListener("change", () => {
      saveCommissaryLogDraftFromInputs();
      window.DMC_COMMISSARY_LOG_SEARCH = searchInput.value;
      refreshCommissaryLogTransactionPage();
    });
  }

  document.querySelectorAll("[data-commissary-log-item]").forEach((input) => {
    input.addEventListener("input", () => {
      const itemId = input.dataset.commissaryLogItem;
      const field = input.dataset.commissaryLogField;

      window.DMC_COMMISSARY_LOG_DRAFT[itemId] =
        window.DMC_COMMISSARY_LOG_DRAFT[itemId] || {
          received: "",
          waste: "",
          adjustment: "",
          notes: ""
        };

      window.DMC_COMMISSARY_LOG_DRAFT[itemId][field] = input.value;
    });
  });

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      const confirmed = confirm("Clear commissary transaction draft?");

      if (!confirmed) {
        return;
      }

      window.DMC_COMMISSARY_LOG_DRAFT = {};
      refreshCommissaryLogTransactionPage();
    });
  }

  if (submitButton) {
    submitButton.addEventListener("click", () => {
      saveCommissaryLogDraftFromInputs();

      const ledgerEntries = buildCommissaryLedgerEntries();

      if (ledgerEntries.length === 0) {
        alert("No commissary entries to submit.");
        return;
      }

      const confirmed = confirm(
        `Submit ${ledgerEntries.length} commissary movement(s) to Ledger?`
      );

      if (!confirmed) {
        return;
      }

      const currentLedgerEntries = getCommissaryLogLedgerEntries();

      saveCommissaryLogLedgerEntries([
        ...currentLedgerEntries,
        ...ledgerEntries
      ]);

      window.DMC_COMMISSARY_LOG_DRAFT = {};

      alert("Commissary transaction submitted to Ledger.");
      refreshCommissaryLogTransactionPage();
    });
  }
}

window.DMC_PAGES["log-transaction"] = {
  eyebrow: "Commissary",
  title: "Log Transaction",
  description:
    "Record commissary received stock, waste, and adjustments into the Ledger.",
  getContent: getCommissaryLogTransactionContent,
  content: getCommissaryLogTransactionContent(),
  afterRender: setupCommissaryLogTransactionEvents
};
