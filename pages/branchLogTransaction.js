window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_MASTER_LIST_STORAGE_KEY_FOR_DAILY_INPUT = "dmc_master_list_items";
const DMC_LEDGER_STORAGE_KEY_FOR_DAILY_INPUT = "dmc_inventory_ledger_entries";
const DMC_BRANCH_DAILY_INPUT_PREFIX = "dmc_branch_daily_input_today_";

window.DMC_BRANCH_LOG_SELECTED_DEPARTMENT =
  window.DMC_BRANCH_LOG_SELECTED_DEPARTMENT || "Bar";

window.DMC_BRANCH_LOG_MODE = window.DMC_BRANCH_LOG_MODE || "edit";

function getDailyInputMasterListItems() {
  const storedItems = localStorage.getItem(
    DMC_MASTER_LIST_STORAGE_KEY_FOR_DAILY_INPUT
  );

  if (storedItems) {
    try {
      return JSON.parse(storedItems);
    } catch {
      return window.DMC_DATA?.masterList?.items || [];
    }
  }

  return window.DMC_DATA?.masterList?.items || [];
}

function getBranchDepartments() {
  const storedSettings = localStorage.getItem("dmc_inventory_settings");

  if (storedSettings) {
    try {
      const settings = JSON.parse(storedSettings);
      return (settings.departments || []).filter(
        (department) => department.name !== "Commissary"
      );
    } catch {
      return [
        { id: "bar", name: "Bar" },
        { id: "kitchen", name: "Kitchen" },
        { id: "dining", name: "Dining" }
      ];
    }
  }

  return [
    { id: "bar", name: "Bar" },
    { id: "kitchen", name: "Kitchen" },
    { id: "dining", name: "Dining" }
  ];
}

function getDepartmentCode(departmentName) {
  const codeMap = {
    Bar: "BAR",
    Kitchen: "KIT",
    Dining: "DIN"
  };

  return (
    codeMap[departmentName] ||
    String(departmentName || "")
      .toUpperCase()
      .slice(0, 3)
  );
}

function getDailyInputStorageKey() {
  const departmentCode = getDepartmentCode(
    window.DMC_BRANCH_LOG_SELECTED_DEPARTMENT
  ).toLowerCase();

  return `${DMC_BRANCH_DAILY_INPUT_PREFIX}${departmentCode}`;
}

function getItemsForSelectedDepartment() {
  const selectedDepartment = window.DMC_BRANCH_LOG_SELECTED_DEPARTMENT;

  return getDailyInputMasterListItems().filter(
    (item) =>
      String(item.department || "").toLowerCase() ===
      String(selectedDepartment || "").toLowerCase()
  );
}

function getStoredBranchDailyInput() {
  const storedInput = localStorage.getItem(getDailyInputStorageKey());

  if (!storedInput) {
    return {};
  }

  try {
    return JSON.parse(storedInput);
  } catch {
    return {};
  }
}

function saveBranchDailyInput(inputData) {
  localStorage.setItem(getDailyInputStorageKey(), JSON.stringify(inputData));
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
  return new Date().toISOString().slice(0, 10);
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

function createDailyInputBatchId() {
  const now = new Date();
  const departmentCode = getDepartmentCode(
    window.DMC_BRANCH_LOG_SELECTED_DEPARTMENT
  );
  const datePart = now.toISOString().slice(0, 10).replaceAll("-", "");
  const timePart = now.toTimeString().slice(0, 8).replaceAll(":", "");

  return `${departmentCode}-${datePart}-${timePart}`;
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

function buildLedgerEntriesFromBranchDailyInput() {
  const departmentItems = getItemsForSelectedDepartment();
  const inputData = getStoredBranchDailyInput();
  const batchId = createDailyInputBatchId();
  const submittedAt = getCurrentTimestamp();
  const submittedAtDisplay = getReadableTimestamp();
  const selectedDepartment = window.DMC_BRANCH_LOG_SELECTED_DEPARTMENT;

  const movementFields = [
    { field: "received", movementType: "Received" },
    { field: "transferIn", movementType: "Transfer In" },
    { field: "usage", movementType: "Usage" },
    { field: "waste", movementType: "Waste" },
    { field: "transferOut", movementType: "Transfer Out" },
    { field: "adjustment", movementType: "Adjustment" }
  ];

  const ledgerEntries = [];

  departmentItems.forEach((item) => {
    const rowData = inputData[item.itemId] || {};
    const notes = String(rowData.notes || "").trim();

    movementFields.forEach((movement) => {
      const rawValue = String(rowData[movement.field] || "").trim();

      if (rawValue === "") {
        return;
      }

      const quantity = Number(rawValue);

      if (Number.isNaN(quantity) || quantity === 0) {
        return;
      }

      ledgerEntries.push({
        date: getTodayDateString(),
        submittedAt,
        submittedAtDisplay,
        batchId,
        department: selectedDepartment,
        section: item.section || "",
        itemId: item.itemId || "",
        itemName: item.officialItemName || "",
        movementType: movement.movementType,
        movementField: movement.field,
        quantity,
        unit: item.unit || "",
        source: `${selectedDepartment} Daily Input`,
        notes
      });
    });
  });

  return ledgerEntries;
}

function getDailyInputValue(inputData, itemId, fieldName) {
  return inputData?.[itemId]?.[fieldName] || "";
}

function renderDepartmentOptions() {
  const selectedDepartment = window.DMC_BRANCH_LOG_SELECTED_DEPARTMENT;

  return getBranchDepartments()
    .map(
      (department) => `
        <option value="${department.name}" ${
        selectedDepartment === department.name ? "selected" : ""
      }>
          ${department.name}
        </option>
      `
    )
    .join("");
}

function renderBranchDailyInputRows() {
  const departmentItems = getItemsForSelectedDepartment();
  const inputData = getStoredBranchDailyInput();
  const selectedDepartment = window.DMC_BRANCH_LOG_SELECTED_DEPARTMENT;

  if (departmentItems.length === 0) {
    return `
      <tr>
        <td colspan="12">
          No ${selectedDepartment} items found. Add ${selectedDepartment} items in the Master List first.
        </td>
      </tr>
    `;
  }

  return departmentItems
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
            <input class="daily-input-cell" data-item-id="${item.itemId}" data-field="received" type="number" min="0" step="any" value="${getDailyInputValue(inputData, item.itemId, "received")}" />
          </td>

          <td>
            <input class="daily-input-cell blue-input" data-item-id="${item.itemId}" data-field="transferIn" type="number" min="0" step="any" value="${getDailyInputValue(inputData, item.itemId, "transferIn")}" />
          </td>

          <td>
            <input class="daily-input-cell blue-input" data-item-id="${item.itemId}" data-field="usage" type="number" min="0" step="any" value="${getDailyInputValue(inputData, item.itemId, "usage")}" />
          </td>

          <td>
            <input class="daily-input-cell blue-input" data-item-id="${item.itemId}" data-field="waste" type="number" min="0" step="any" value="${getDailyInputValue(inputData, item.itemId, "waste")}" />
          </td>

          <td>
            <input class="daily-input-cell blue-input" data-item-id="${item.itemId}" data-field="transferOut" type="number" min="0" step="any" value="${getDailyInputValue(inputData, item.itemId, "transferOut")}" />
          </td>

          <td>
            <input class="daily-input-cell blue-input" data-item-id="${item.itemId}" data-field="adjustment" type="number" step="any" value="${getDailyInputValue(inputData, item.itemId, "adjustment")}" />
          </td>

          <td>
            <input class="daily-input-cell notes-input" data-item-id="${item.itemId}" data-field="notes" type="text" value="${getDailyInputValue(inputData, item.itemId, "notes")}" />
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

function getBranchDailyInputSummary() {
  const inputData = getStoredBranchDailyInput();
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

function renderSubmitPreviewList() {
  const ledgerEntries = buildLedgerEntriesFromBranchDailyInput();

  if (ledgerEntries.length === 0) {
    return `
      <p class="submit-preview-empty">
        No movements ready to submit yet. Go back to edit mode and fill in any movement field.
      </p>
    `;
  }

  return `
    <ul class="submit-preview-list review-mode-list">
      ${ledgerEntries
        .map(
          (entry) => `
            <li>
              <div>
                <strong>${entry.itemName}</strong>
                <span>${entry.movementType}: ${entry.quantity} ${entry.unit}</span>
              </div>

              <div class="preview-actions">
                <button
                  class="tiny-button"
                  data-preview-edit="true"
                >
                  Edit
                </button>

                <button
                  class="tiny-button danger"
                  data-preview-remove-item="${entry.itemId}"
                  data-preview-remove-field="${entry.movementField}"
                >
                  Remove
                </button>
              </div>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderEditModeContent(summary) {
  return `
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
          ${renderBranchDailyInputRows()}
        </tbody>
      </table>
    </div>
  `;
}

function renderReviewModeContent() {
  return `
    <div class="submit-preview-box">
      <div>
        <h4>Submit Review</h4>
        <p>
          Review the movements below before posting. Use Edit to return to the table,
          or Remove to clear a pending movement from today’s input.
        </p>
      </div>

      ${renderSubmitPreviewList()}

      <div class="form-actions review-actions">
        <button class="ghost-button" id="back-to-edit-mode">
          Back to Edit
        </button>

        <button class="primary-button" id="submit-branch-daily-input">
          Submit to Ledger
        </button>
      </div>
    </div>
  `;
}

function getBranchLogTransactionContent() {
  const selectedDepartment = window.DMC_BRANCH_LOG_SELECTED_DEPARTMENT;
  const departmentItems = getItemsForSelectedDepartment();
  const summary = getBranchDailyInputSummary();
  const isReviewMode = window.DMC_BRANCH_LOG_MODE === "review";

  return `
    <section class="grid">
      <div class="card">
        <p>${selectedDepartment} Items</p>
        <strong>${departmentItems.length}</strong>
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
          <h3>${selectedDepartment} Daily Input — Today Only</h3>
          <p>
            Select a department, enter today’s movements, review them, then submit to Ledger.
          </p>
        </div>

        <div class="form-actions">
          ${
            isReviewMode
              ? `<button class="ghost-button" id="back-to-edit-mode-top">Back to Edit</button>`
              : `<button class="primary-button" id="ready-for-review">Ready for Review</button>`
          }

          <button class="ghost-button" id="clear-branch-daily-input">
            Clear Today
          </button>
        </div>
      </div>

      <div class="filter-bar">
        <label>
          Department
          <select id="branch-log-department-select" ${isReviewMode ? "disabled" : ""}>
            ${renderDepartmentOptions()}
          </select>
        </label>

        <label class="filter-search">
          Current Mode
          <input
            type="text"
            value="${isReviewMode ? "Review Mode" : `${selectedDepartment} Daily Input`}"
            disabled
          />
        </label>
      </div>

      ${isReviewMode ? renderReviewModeContent() : renderEditModeContent(summary)}
    </section>
  `;
}

function refreshBranchLogTransactionPage() {
  window.DMC_PAGES["branch-log-transaction"].content =
    getBranchLogTransactionContent();

  renderPage("branch-log-transaction");
}

function returnToEditMode() {
  window.DMC_BRANCH_LOG_MODE = "edit";
  refreshBranchLogTransactionPage();
}

function setupBranchLogTransactionEvents() {
  const departmentSelect = document.getElementById(
    "branch-log-department-select"
  );

  if (departmentSelect) {
    departmentSelect.addEventListener("change", () => {
      window.DMC_BRANCH_LOG_SELECTED_DEPARTMENT = departmentSelect.value;
      window.DMC_BRANCH_LOG_MODE = "edit";
      refreshBranchLogTransactionPage();
    });
  }

  document.querySelectorAll(".daily-input-cell").forEach((input) => {
    input.addEventListener("change", () => {
      const inputData = getStoredBranchDailyInput();
      const itemId = input.dataset.itemId;
      const field = input.dataset.field;

      inputData[itemId] = inputData[itemId] || {};
      inputData[itemId][field] = input.value;

      saveBranchDailyInput(inputData);
    });
  });

  const readyButton = document.getElementById("ready-for-review");

  if (readyButton) {
    readyButton.addEventListener("click", () => {
      const ledgerEntries = buildLedgerEntriesFromBranchDailyInput();

      if (ledgerEntries.length === 0) {
        alert("No movements ready for review.");
        return;
      }

      window.DMC_BRANCH_LOG_MODE = "review";
      refreshBranchLogTransactionPage();
    });
  }

  const backButtons = [
    document.getElementById("back-to-edit-mode"),
    document.getElementById("back-to-edit-mode-top")
  ];

  backButtons.forEach((button) => {
    if (button) {
      button.addEventListener("click", returnToEditMode);
    }
  });

  document.querySelectorAll("[data-preview-edit]").forEach((button) => {
    button.addEventListener("click", returnToEditMode);
  });

  document.querySelectorAll("[data-preview-remove-item]").forEach((button) => {
    button.addEventListener("click", () => {
      const itemId = button.dataset.previewRemoveItem;
      const field = button.dataset.previewRemoveField;
      const inputData = getStoredBranchDailyInput();

      if (inputData[itemId]) {
        inputData[itemId][field] = "";
      }

      saveBranchDailyInput(inputData);
      refreshBranchLogTransactionPage();
    });
  });

  const clearButton = document.getElementById("clear-branch-daily-input");
  const submitButton = document.getElementById("submit-branch-daily-input");

  if (submitButton) {
    submitButton.addEventListener("click", () => {
      const newLedgerEntries = buildLedgerEntriesFromBranchDailyInput();
      const selectedDepartment = window.DMC_BRANCH_LOG_SELECTED_DEPARTMENT;

      if (newLedgerEntries.length === 0) {
        alert(`No ${selectedDepartment} daily input entries to submit.`);
        return;
      }

      const confirmed = confirm(
        `Submit ${newLedgerEntries.length} ledger entries for ${selectedDepartment} and clear today's input?`
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
      localStorage.removeItem(getDailyInputStorageKey());

      window.DMC_BRANCH_LOG_MODE = "edit";

      alert(`${selectedDepartment} Daily Input submitted to Ledger.`);
      refreshBranchLogTransactionPage();
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      const selectedDepartment = window.DMC_BRANCH_LOG_SELECTED_DEPARTMENT;
      const confirmed = confirm(`Clear today's ${selectedDepartment} Daily Input?`);

      if (!confirmed) {
        return;
      }

      localStorage.removeItem(getDailyInputStorageKey());
      window.DMC_BRANCH_LOG_MODE = "edit";
      refreshBranchLogTransactionPage();
    });
  }
}

window.DMC_PAGES["branch-log-transaction"] = {
  eyebrow: "DMC-Iriga Branch",
  title: "Log Transaction",
  description:
    "Daily input screen for branch/station transactions by department.",
  getContent: getBranchLogTransactionContent,
  content: getBranchLogTransactionContent(),
  afterRender: setupBranchLogTransactionEvents
};
