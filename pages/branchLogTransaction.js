window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_MASTER_LIST_STORAGE_KEY_FOR_DAILY_INPUT = "dmc_master_list_items";
const DMC_BAR_DAILY_INPUT_STORAGE_KEY = "dmc_bar_daily_input_today";
const DMC_LEDGER_STORAGE_KEY_FOR_DAILY_INPUT = "dmc_inventory_ledger_entries";

function getDailyInputMasterListItems() {
  const storedItems = localStorage.getItem(DMC_MASTER_LIST_STORAGE_KEY_FOR_DAILY_INPUT);

  if (storedItems) {
    try {
      return JSON.parse(storedItems);
    } catch {
      return window.DMC_DATA?.masterList?.items || [];
    }
  }

  return window.DMC_DATA?.masterList?.items || [];
}

function getBarItemsForDailyInput() {
  return getDailyInputMasterListItems().filter(
    (item) => String(item.department || "").toLowerCase() === "bar"
  );
}

function getStoredBarDailyInput() {
  const storedInput = localStorage.getItem(DMC_BAR_DAILY_INPUT_STORAGE_KEY);

  if (!storedInput) {
    return {};
  }

  try {
    return JSON.parse(storedInput);
  } catch {
    return {};
  }
}

function saveBarDailyInput(inputData) {
  localStorage.setItem(
    DMC_BAR_DAILY_INPUT_STORAGE_KEY,
    JSON.stringify(inputData)
  );
}

function getDailyReviewStatus(rowData) {
  const inputFields = [
    "received",
    "transferIn",
    "usage",
    "waste",
    "transferOut",
    "adjustment",
    "notes"
  ];

  const hasAnyInput = inputFields.some((field) => {
    return String(rowData?.[field] || "").trim() !== "";
  });

  if (!hasAnyInput) {
    return "";
  }

  const numericFields = [
    "received",
    "transferIn",
    "usage",
    "waste",
    "transferOut",
    "adjustment"
  ];

  const hasInvalidNumber = numericFields.some((field) => {
    const value = String(rowData?.[field] || "").trim();

    if (value === "") {
      return false;
    }

    return Number.isNaN(Number(value));
  });

  if (hasInvalidNumber) {
    return "CHECK";
  }

  return "READY";
}

function getStoredLedgerEntriesForDailyInput() {
  const storedEntries = localStorage.getItem(
    DMC_LEDGER_STORAGE_KEY_FOR_DAILY_INPUT
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

function saveLedgerEntriesFromDailyInput(entries) {
  localStorage.setItem(
    DMC_LEDGER_STORAGE_KEY_FOR_DAILY_INPUT,
    JSON.stringify(entries)
  );
}

function getTodayDateString() {
  const today = new Date();
  return today.toISOString().slice(0, 10);
}

function getCurrentTimestamp() {
  return new Date().toISOString();
}

function getReadableTimestamp() {
  const now = new Date();

  return now.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function createBarDailyInputBatchId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replaceAll("-", "");
  const timePart = now.toTimeString().slice(0, 8).replaceAll(":", "");

  return `BAR-${datePart}-${timePart}`;
}

function buildLedgerEntriesFromBarDailyInput() {
  const barItems = getBarItemsForDailyInput();
const inputData = getStoredBarDailyInput();
const batchId = createBarDailyInputBatchId();
const submittedAt = getCurrentTimestamp();
const submittedAtDisplay = getReadableTimestamp();

  const movementFields = [
    {
      field: "received",
      movementType: "Received"
    },
    {
      field: "transferIn",
      movementType: "Transfer In"
    },
    {
      field: "usage",
      movementType: "Usage"
    },
    {
      field: "waste",
      movementType: "Waste"
    },
    {
      field: "transferOut",
      movementType: "Transfer Out"
    },
    {
      field: "adjustment",
      movementType: "Adjustment"
    }
  ];

  const ledgerEntries = [];

  barItems.forEach((item) => {
    const rowData = inputData[item.itemId] || {};
    const notes = String(rowData.notes || "").trim();

    movementFields.forEach((movement) => {
      const rawValue = String(rowData[movement.field] || "").trim();

      if (rawValue === "") {
        return;
      }

      const quantity = Number(rawValue);

      if (Number.isNaN(quantity)) {
        return;
      }

      ledgerEntries.push({
    date: getTodayDateString(),
    submittedAt,
    submittedAtDisplay,
    batchId,
    department: "Bar",
    section: item.section || "",
    itemId: item.itemId || "",
    itemName: item.officialItemName || "",
    movementType: movement.movementType,
    quantity,
    unit: item.unit || "",
    source: "Bar Daily Input",
    notes
    });
    });
  });

  return ledgerEntries;
}

function getDailyInputValue(inputData, itemId, fieldName) {
  return inputData?.[itemId]?.[fieldName] || "";
}

function renderBarDailyInputRows() {
  const barItems = getBarItemsForDailyInput();
  const inputData = getStoredBarDailyInput();

  if (barItems.length === 0) {
    return `
      <tr>
        <td colspan="12">
          No Bar items found. Add Bar items in the Master List first.
        </td>
      </tr>
    `;
  }

  return barItems
    .map((item) => {
      const rowData = inputData[item.itemId] || {};
      const reviewStatus = getDailyReviewStatus(rowData);

      return `
        <tr>
          <td>${item.section || "-"}</td>
          <td>${item.itemId || "-"}</td>
          <td>${item.officialItemName || "-"}</td>
          <td>${item.unit || "-"}</td>

          <td>
            <input
              class="daily-input-cell"
              data-item-id="${item.itemId}"
              data-field="received"
              type="number"
              min="0"
              step="any"
              value="${getDailyInputValue(inputData, item.itemId, "received")}"
            />
          </td>

          <td>
            <input
              class="daily-input-cell blue-input"
              data-item-id="${item.itemId}"
              data-field="transferIn"
              type="number"
              min="0"
              step="any"
              value="${getDailyInputValue(inputData, item.itemId, "transferIn")}"
            />
          </td>

          <td>
            <input
              class="daily-input-cell blue-input"
              data-item-id="${item.itemId}"
              data-field="usage"
              type="number"
              min="0"
              step="any"
              value="${getDailyInputValue(inputData, item.itemId, "usage")}"
            />
          </td>

          <td>
            <input
              class="daily-input-cell blue-input"
              data-item-id="${item.itemId}"
              data-field="waste"
              type="number"
              min="0"
              step="any"
              value="${getDailyInputValue(inputData, item.itemId, "waste")}"
            />
          </td>

          <td>
            <input
              class="daily-input-cell blue-input"
              data-item-id="${item.itemId}"
              data-field="transferOut"
              type="number"
              min="0"
              step="any"
              value="${getDailyInputValue(inputData, item.itemId, "transferOut")}"
            />
          </td>

          <td>
            <input
              class="daily-input-cell blue-input"
              data-item-id="${item.itemId}"
              data-field="adjustment"
              type="number"
              step="any"
              value="${getDailyInputValue(inputData, item.itemId, "adjustment")}"
            />
          </td>

          <td>
            <input
              class="daily-input-cell notes-input"
              data-item-id="${item.itemId}"
              data-field="notes"
              type="text"
              value="${getDailyInputValue(inputData, item.itemId, "notes")}"
            />
          </td>

          <td>
            ${
              reviewStatus
                ? `<span class="badge ${
                    reviewStatus === "CHECK" ? "danger-badge" : ""
                  }">${reviewStatus}</span>`
                : "-"
            }
          </td>
        </tr>
      `;
    })
    .join("");
}

function getBarDailyInputSummary() {
  const inputData = getStoredBarDailyInput();
  const rows = Object.values(inputData);

  const rowsWithInput = rows.filter((row) => getDailyReviewStatus(row) !== "");
  const readyRows = rows.filter((row) => getDailyReviewStatus(row) === "READY");
  const checkRows = rows.filter((row) => getDailyReviewStatus(row) === "CHECK");

  return {
    rowsWithInput: rowsWithInput.length,
    readyRows: readyRows.length,
    checkRows: checkRows.length
  };
}

function getBranchLogTransactionContent() {
  const barItems = getBarItemsForDailyInput();
  const summary = getBarDailyInputSummary();

  return `
    <section class="grid">
      <div class="card">
        <p>Bar Items</p>
        <strong>${barItems.length}</strong>
      </div>

      <div class="card">
        <p>Rows With Input</p>
        <strong>${summary.rowsWithInput}</strong>
      </div>

      <div class="card">
        <p>Ready</p>
        <strong>${summary.readyRows}</strong>
      </div>

      <div class="card">
        <p>Needs Check</p>
        <strong>${summary.checkRows}</strong>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>BAR Daily Input — Today Only</h3>
          <p>
            Fill only the input columns: Received, Transfer In, Usage, Waste,
            Transfer Out, Adjustment, and Notes. Item rows come from the Master List.
          </p>
        </div>

        <div class="form-actions">
  <button class="primary-button" id="submit-bar-daily-input">
    Submit to Ledger
  </button>

  <button class="ghost-button" id="clear-bar-daily-input">
    Clear Today
  </button>
</div>
</div>
      </div>

      <div class="instruction-box">
        <strong>Instruction:</strong>
        <span>
          Item rows and IDs should not be edited here. Add or correct items in
          Master List. This page is only for today’s transaction input.
        </span>
      </div>

      <div class="table-wrap">
        <table class="daily-input-table">
          <thead>
            <tr>
              <th>Section</th>
              <th>Item ID</th>
              <th>Item Name</th>
              <th>Unit</th>
              <th>Received</th>
              <th>Transfer In</th>
              <th>Usage</th>
              <th>Waste</th>
              <th>Transfer Out</th>
              <th>Adjustment</th>
              <th>Notes</th>
              <th>Review</th>
            </tr>
          </thead>

          <tbody>
            ${renderBarDailyInputRows()}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function refreshBranchLogTransactionPage() {
  window.DMC_PAGES["branch-log-transaction"].content =
    getBranchLogTransactionContent();

  renderPage("branch-log-transaction");
}

function setupBranchLogTransactionEvents() {
  document.querySelectorAll(".daily-input-cell").forEach((input) => {
  input.addEventListener("change", () => {
    const inputData = getStoredBarDailyInput();
    const itemId = input.dataset.itemId;
    const field = input.dataset.field;

    inputData[itemId] = inputData[itemId] || {};
    inputData[itemId][field] = input.value;

    saveBarDailyInput(inputData);
  });
});

  const clearButton = document.getElementById("clear-bar-daily-input");
  const submitButton = document.getElementById("submit-bar-daily-input");

  if (submitButton) {
  submitButton.addEventListener("click", () => {
    const newLedgerEntries = buildLedgerEntriesFromBarDailyInput();

    if (newLedgerEntries.length === 0) {
      alert("No daily input entries to submit.");
      return;
    }

    const confirmed = confirm(
      `Submit ${newLedgerEntries.length} ledger entries and clear today's Bar Daily Input?`
    );

    if (!confirmed) {
      return;
    }

    const currentLedgerEntries = getStoredLedgerEntriesForDailyInput();
    const updatedLedgerEntries = [
      ...currentLedgerEntries,
      ...newLedgerEntries
    ];

    saveLedgerEntriesFromDailyInput(updatedLedgerEntries);
    localStorage.removeItem(DMC_BAR_DAILY_INPUT_STORAGE_KEY);

    alert("Bar Daily Input submitted to Ledger.");
    refreshBranchLogTransactionPage();
  });
}
  
  if (clearButton) {
    clearButton.addEventListener("click", () => {
      const confirmed = confirm("Clear today’s Bar Daily Input?");

      if (!confirmed) {
        return;
      }

      localStorage.removeItem(DMC_BAR_DAILY_INPUT_STORAGE_KEY);
      refreshBranchLogTransactionPage();
    });
  }
}

window.DMC_PAGES["branch-log-transaction"] = {
  eyebrow: "DMC-Iriga Branch",
  title: "Log Transaction",
  description:
    "Daily input screen for branch/station transactions. Starting with Bar Daily Input.",
  content: getBranchLogTransactionContent(),
  afterRender: setupBranchLogTransactionEvents
};
