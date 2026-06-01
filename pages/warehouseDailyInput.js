window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_MASTER_LIST_STORAGE_KEY_FOR_WAREHOUSE_INPUT =
  "dmc_master_list_items";
const DMC_WAREHOUSE_DAILY_INPUT_KEY = "dmc_warehouse_daily_input_today";
const DMC_WAREHOUSE_LOG_STORAGE_KEY = "dmc_warehouse_log_entries";

window.DMC_WAREHOUSE_DAILY_INPUT_MODE =
  window.DMC_WAREHOUSE_DAILY_INPUT_MODE || "edit";

window.DMC_WAREHOUSE_MANAGER_REVIEWED_BY =
  window.DMC_WAREHOUSE_MANAGER_REVIEWED_BY || "";

window.DMC_WAREHOUSE_DAILY_INPUT_DEPARTMENT =
  window.DMC_WAREHOUSE_DAILY_INPUT_DEPARTMENT || "all";

window.DMC_WAREHOUSE_DAILY_INPUT_SEARCH =
  window.DMC_WAREHOUSE_DAILY_INPUT_SEARCH || "";

function getWarehouseInputMasterListItems() {
  const storedItems = localStorage.getItem(
    DMC_MASTER_LIST_STORAGE_KEY_FOR_WAREHOUSE_INPUT
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

function getWarehouseInputSettings() {
  const storedSettings = localStorage.getItem("dmc_inventory_settings");

  if (storedSettings) {
    try {
      return JSON.parse(storedSettings);
    } catch {
      return { managerNames: [], managers: [] };
    }
  }

  return { managerNames: [], managers: [] };
}

function getSettingName(option) {
  if (typeof option === "string") {
    return option;
  }

  return option?.name || "";
}

function itemBelongsToWarehouseDailyInput(item) {
  const operatingArea = String(item.operatingArea || "").toLowerCase();

  return (
    operatingArea.includes("warehouse") ||
    operatingArea.includes("stockroom")
  );
}

function getAllWarehouseDailyInputItems() {
  return getWarehouseInputMasterListItems().filter(
    itemBelongsToWarehouseDailyInput
  );
}

function getWarehouseDailyInputDepartments() {
  return [
    ...new Set(
      getAllWarehouseDailyInputItems()
        .map((item) => item.department || "Unassigned")
        .filter(Boolean)
    )
  ].sort();
}

function getWarehouseDailyInputItems() {
  const selectedDepartment = String(
    window.DMC_WAREHOUSE_DAILY_INPUT_DEPARTMENT || "all"
  ).toLowerCase();

  const searchValue = String(
    window.DMC_WAREHOUSE_DAILY_INPUT_SEARCH || ""
  )
    .toLowerCase()
    .trim();

  return getAllWarehouseDailyInputItems().filter((item) => {
    const itemDepartment = String(
      item.department || "Unassigned"
    ).toLowerCase();

    const matchesDepartment =
      selectedDepartment === "all" || itemDepartment === selectedDepartment;

    const matchesSearch =
      !searchValue ||
      String(item.itemId || "").toLowerCase().includes(searchValue) ||
      String(item.officialItemName || "").toLowerCase().includes(searchValue) ||
      String(item.unit || "").toLowerCase().includes(searchValue);

    return matchesDepartment && matchesSearch;
  });
}

function getStoredWarehouseDailyInput() {
  const storedInput = localStorage.getItem(DMC_WAREHOUSE_DAILY_INPUT_KEY);

  if (!storedInput) {
    return {};
  }

  try {
    return JSON.parse(storedInput);
  } catch {
    return {};
  }
}

function saveWarehouseDailyInput(inputData) {
  localStorage.setItem(
    DMC_WAREHOUSE_DAILY_INPUT_KEY,
    JSON.stringify(inputData)
  );
}

function getStoredWarehouseLogEntries() {
  const storedEntries = localStorage.getItem(DMC_WAREHOUSE_LOG_STORAGE_KEY);

  if (!storedEntries) {
    return [];
  }

  try {
    return JSON.parse(storedEntries);
  } catch {
    return [];
  }
}

function saveWarehouseLogEntries(entries) {
  localStorage.setItem(DMC_WAREHOUSE_LOG_STORAGE_KEY, JSON.stringify(entries));
}

function getTodayDateStringForWarehouseInput() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentWarehouseInputTimestamp() {
  return new Date().toISOString();
}

function getReadableWarehouseInputTimestamp() {
  const now = new Date();

  return now.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function createWarehouseDailyInputBatchId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replaceAll("-", "");
  const timePart = now.toTimeString().slice(0, 8).replaceAll(":", "");

  return `WH-${datePart}-${timePart}`;
}

function getWarehouseDailyInputValue(inputData, itemId, fieldName) {
  return inputData?.[itemId]?.[fieldName] || "";
}

function getWarehouseDailyReviewStatus(rowData) {
  const inputFields = ["transferIn", "transferOut", "waste", "notes"];

  const hasAnyInput = inputFields.some((field) => {
    return String(rowData?.[field] || "").trim() !== "";
  });

  if (!hasAnyInput) {
    return "";
  }

  const numericFields = ["transferIn", "transferOut", "waste"];

  const hasInvalidNumber = numericFields.some((field) => {
    const value = String(rowData?.[field] || "").trim();

    if (value === "") {
      return false;
    }

    return Number.isNaN(Number(value)) || Number(value) < 0;
  });

  if (hasInvalidNumber) {
    return "CHECK";
  }

  const hasWaste = String(rowData?.waste || "").trim() !== "";
  const hasNotes = String(rowData?.notes || "").trim() !== "";

  if (hasWaste && !hasNotes) {
    return "CHECK";
  }

  return "READY";
}

function getWarehouseDailyReviewRows() {
  const inputData = getStoredWarehouseDailyInput();

  return getAllWarehouseDailyInputItems()
    .map((item) => {
      const rowData = inputData[item.itemId] || {};
      const reviewStatus = getWarehouseDailyReviewStatus(rowData);

      return {
        item,
        rowData,
        reviewStatus
      };
    })
    .filter((row) => row.reviewStatus === "READY");
}

function buildWarehouseLogEntriesFromDailyInput() {
  const warehouseItems = getAllWarehouseDailyInputItems();
  const inputData = getStoredWarehouseDailyInput();
  const batchId = createWarehouseDailyInputBatchId();
  const submittedAt = getCurrentWarehouseInputTimestamp();
  const submittedAtDisplay = getReadableWarehouseInputTimestamp();
  const managerReviewedBy = window.DMC_WAREHOUSE_MANAGER_REVIEWED_BY;

  const movementFields = [
    {
      field: "transferIn",
      movementType: "Transfer In",
      stockEffect: "add"
    },
    {
      field: "transferOut",
      movementType: "Transfer Out",
      stockEffect: "deduct"
    },
    {
      field: "waste",
      movementType: "Waste",
      stockEffect: "deduct"
    }
  ];

  const warehouseLogEntries = [];

  warehouseItems.forEach((item) => {
    const rowData = inputData[item.itemId] || {};
    const reviewStatus = getWarehouseDailyReviewStatus(rowData);
    const notes = String(rowData.notes || "").trim();

    if (reviewStatus !== "READY") {
      return;
    }

    movementFields.forEach((movement) => {
      const rawValue = String(rowData[movement.field] || "").trim();

      if (rawValue === "") {
        return;
      }

      const quantity = Number(rawValue);

      if (Number.isNaN(quantity) || quantity <= 0) {
        return;
      }

      warehouseLogEntries.push({
        date: getTodayDateStringForWarehouseInput(),
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "Warehouse",
        department: item.department || "",
        itemId: item.itemId || "",
        itemName: item.officialItemName || "",
        movementType: movement.movementType,
        movementField: movement.field,
        stockEffect: movement.stockEffect,
        quantity,
        unit: item.unit || "",
        managerReviewedBy,
        source:
          movement.movementType === "Transfer In"
            ? "Warehouse Daily Input"
            : "Warehouse",
        destination:
          movement.movementType === "Transfer In"
            ? "Warehouse"
            : movement.movementType === "Waste"
            ? "Waste"
            : "Outgoing Transfer",
        notes
      });
    });
  });

  return warehouseLogEntries;
}

function renderWarehouseDepartmentOptions() {
  const currentDepartment = window.DMC_WAREHOUSE_DAILY_INPUT_DEPARTMENT;

  return `
    <option value="all" ${currentDepartment === "all" ? "selected" : ""}>
      All Departments
    </option>
    ${getWarehouseDailyInputDepartments()
      .map(
        (department) => `
          <option value="${department}" ${
          currentDepartment === department ? "selected" : ""
        }>
            ${department}
          </option>
        `
      )
      .join("")}
  `;
}

function renderWarehouseManagerOptions() {
  const settings = getWarehouseInputSettings();
  const currentManager = window.DMC_WAREHOUSE_MANAGER_REVIEWED_BY;
  const managers = settings.managerNames || settings.managers || [];

  if (managers.length === 0) {
    return `
      <option value="" ${currentManager === "" ? "selected" : ""}>
        Select manager
      </option>
      <option value="Manager Ana" ${
        currentManager === "Manager Ana" ? "selected" : ""
      }>
        Manager Ana
      </option>
    `;
  }

  return `
    <option value="" ${currentManager === "" ? "selected" : ""}>
      Select manager
    </option>
    ${managers
      .map((manager) => {
        const managerName = getSettingName(manager);

        return `
          <option value="${managerName}" ${
          currentManager === managerName ? "selected" : ""
        }>
            ${managerName}
          </option>
        `;
      })
      .join("")}
  `;
}

function renderWarehouseDailyInputRows() {
  const allWarehouseItems = getAllWarehouseDailyInputItems();
  const warehouseItems = getWarehouseDailyInputItems();
  const inputData = getStoredWarehouseDailyInput();

  if (allWarehouseItems.length === 0) {
    return `
      <tr>
        <td colspan="8">
          No Warehouse items found. Add Warehouse items in the Master List first.
        </td>
      </tr>
    `;
  }

  if (warehouseItems.length === 0) {
    return `
      <tr>
        <td colspan="8">
          No Warehouse items found for the selected filter.
        </td>
      </tr>
    `;
  }

  return warehouseItems
    .map((item) => {
      const rowData = inputData[item.itemId] || {};
      const reviewStatus = getWarehouseDailyReviewStatus(rowData);

      return `
        <tr>
          <td>${item.itemId || "-"}</td>
          <td>${item.officialItemName || "-"}</td>
          <td>${item.unit || "-"}</td>

          <td>
            <input
              class="daily-input-cell warehouse-daily-input-cell"
              data-item-id="${item.itemId}"
              data-field="transferIn"
              type="number"
              min="0"
              step="any"
              value="${getWarehouseDailyInputValue(
                inputData,
                item.itemId,
                "transferIn"
              )}"
            />
          </td>

          <td>
            <input
              class="daily-input-cell warehouse-daily-input-cell blue-input"
              data-item-id="${item.itemId}"
              data-field="transferOut"
              type="number"
              min="0"
              step="any"
              value="${getWarehouseDailyInputValue(
                inputData,
                item.itemId,
                "transferOut"
              )}"
            />
          </td>

          <td>
            <input
              class="daily-input-cell warehouse-daily-input-cell blue-input"
              data-item-id="${item.itemId}"
              data-field="waste"
              type="number"
              min="0"
              step="any"
              value="${getWarehouseDailyInputValue(
                inputData,
                item.itemId,
                "waste"
              )}"
            />
          </td>

          <td>
            <input
              class="daily-input-cell warehouse-daily-input-cell notes-input"
              data-item-id="${item.itemId}"
              data-field="notes"
              type="text"
              value="${getWarehouseDailyInputValue(
                inputData,
                item.itemId,
                "notes"
              )}"
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

function getWarehouseDailyInputSummary() {
  const inputData = getStoredWarehouseDailyInput();
  const rows = Object.values(inputData);

  const rowsWithInput = rows.filter(
    (row) => getWarehouseDailyReviewStatus(row) !== ""
  );
  const readyRows = rows.filter(
    (row) => getWarehouseDailyReviewStatus(row) === "READY"
  );
  const checkRows = rows.filter(
    (row) => getWarehouseDailyReviewStatus(row) === "CHECK"
  );

  return {
    rowsWithInput: rowsWithInput.length,
    readyRows: readyRows.length,
    checkRows: checkRows.length
  };
}

function renderWarehouseEditModeContent() {
  return `
    <div class="keyboard-hint">
      Press Tab to move across Transfer In → Transfer Out → Waste → Notes, then continue to the next row.
    </div>

    <div class="table-wrap warehouse-daily-input-table-wrap">
      <table class="daily-input-table warehouse-daily-input-table">
        <thead>
          <tr>
            <th>Item ID</th>
            <th>Item Name</th>
            <th>Unit</th>
            <th>Transfer In</th>
            <th>Transfer Out</th>
            <th>Waste</th>
            <th>Notes</th>
            <th>Review</th>
          </tr>
        </thead>

        <tbody>
          ${renderWarehouseDailyInputRows()}
        </tbody>
      </table>
    </div>
  `;
}

function renderWarehouseReviewModeContent() {
  const reviewRows = getWarehouseDailyReviewRows();

  if (reviewRows.length === 0) {
    return `
      <div class="submit-preview-box">
        <h4>Warehouse Submit Review</h4>
        <p>No rows are ready to post. Go back to edit mode and fill in today’s movements.</p>

        <div class="form-actions review-actions">
          <button class="ghost-button" id="back-to-warehouse-edit-mode">
            Back to Edit
          </button>
        </div>
      </div>
    `;
  }

  return `
    <div class="submit-preview-box">
      <div class="review-mode-header">
        <div>
          <h4>Warehouse Submit Review</h4>
          <p>
            ${reviewRows.length} item row${
    reviewRows.length === 1 ? "" : "s"
  } ready to post. Review the table before submitting to Warehouse Log.
          </p>
        </div>

        <div class="form-actions review-actions">
          <button class="ghost-button" id="back-to-warehouse-edit-mode">
            Back to Edit
          </button>

          <button class="primary-button" id="submit-warehouse-daily-input">
            Submit to Warehouse Log
          </button>
        </div>
      </div>

      <div class="table-wrap warehouse-review-table-wrap">
        <table class="daily-input-table warehouse-review-table">
          <thead>
            <tr>
              <th>Item ID</th>
              <th>Item Name</th>
              <th>Unit</th>
              <th>Transfer In</th>
              <th>Transfer Out</th>
              <th>Waste</th>
              <th>Notes</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            ${reviewRows
              .map(({ item, rowData }) => {
                return `
                  <tr>
                    <td>${item.itemId || "-"}</td>
                    <td>${item.officialItemName || "-"}</td>
                    <td>${item.unit || "-"}</td>
                    <td>${rowData.transferIn || "-"}</td>
                    <td>${rowData.transferOut || "-"}</td>
                    <td>${rowData.waste || "-"}</td>
                    <td>${rowData.notes || "-"}</td>
                    <td>
                      <div class="row-actions">
                        <button
                          class="tiny-button"
                          data-preview-edit="true"
                        >
                          Edit
                        </button>

                        <button
                          class="tiny-button danger"
                          data-preview-remove-row="${item.itemId}"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function getWarehouseDailyInputContent() {
  const isReviewMode = window.DMC_WAREHOUSE_DAILY_INPUT_MODE === "review";

  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Warehouse Daily Input — Today Only</h3>
          <p>
            Enter today’s Warehouse movements, review them, then submit to Warehouse Log Transaction.
          </p>
        </div>

        <div class="form-actions">
          ${
            isReviewMode
              ? `<button class="ghost-button" id="back-to-warehouse-edit-mode-top">Back to Edit</button>`
              : `<button class="primary-button" id="ready-for-warehouse-review">Ready for Review</button>`
          }

          <button class="ghost-button" id="clear-warehouse-daily-input">
            Clear Today
          </button>
        </div>
      </div>

      <div class="warehouse-daily-input-toolbar">
        <label>
          Department
          <select id="warehouse-daily-input-department" ${
            isReviewMode ? "disabled" : ""
          }>
            ${renderWarehouseDepartmentOptions()}
          </select>
        </label>

        <label class="filter-search">
          Search
          <input
            id="warehouse-daily-input-search"
            type="text"
            placeholder="Search item name or Item ID..."
            value="${window.DMC_WAREHOUSE_DAILY_INPUT_SEARCH}"
            ${isReviewMode ? "disabled" : ""}
          />
        </label>

        <label>
          Manager Reviewed By
          <select id="warehouse-manager-reviewed-by" ${
            isReviewMode ? "disabled" : ""
          }>
            ${renderWarehouseManagerOptions()}
          </select>
        </label>
      </div>

      ${
        isReviewMode
          ? renderWarehouseReviewModeContent()
          : renderWarehouseEditModeContent()
      }
    </section>
  `;
}

function refreshWarehouseDailyInputPage() {
  window.DMC_PAGES["warehouse-daily-input"].content =
    getWarehouseDailyInputContent();

  renderPage("warehouse-daily-input");
}

function returnToWarehouseEditMode() {
  window.DMC_WAREHOUSE_DAILY_INPUT_MODE = "edit";
  refreshWarehouseDailyInputPage();
}

function showWarehouseInputModal({ type, title, message, confirmLabel }) {
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

function showWarehouseInputConfirm({
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

function saveWarehouseCellValue(input) {
  const inputData = getStoredWarehouseDailyInput();
  const itemId = input.dataset.itemId;
  const field = input.dataset.field;

  inputData[itemId] = inputData[itemId] || {};
  inputData[itemId][field] = input.value;

  saveWarehouseDailyInput(inputData);
}

function focusNextWarehouseInput(currentInput, direction = 1) {
  const inputs = Array.from(
    document.querySelectorAll(".warehouse-daily-input-cell")
  ).filter((input) => !input.disabled);

  const currentIndex = inputs.indexOf(currentInput);

  if (currentIndex === -1) {
    return;
  }

  const nextInput = inputs[currentIndex + direction];

  if (nextInput) {
    nextInput.focus();
    nextInput.select();
  }
}

function setupWarehouseDailyInputEvents() {
  const departmentSelect = document.getElementById(
    "warehouse-daily-input-department"
  );

  if (departmentSelect) {
    departmentSelect.addEventListener("change", () => {
      window.DMC_WAREHOUSE_DAILY_INPUT_DEPARTMENT = departmentSelect.value;
      window.DMC_WAREHOUSE_DAILY_INPUT_MODE = "edit";
      refreshWarehouseDailyInputPage();
    });
  }

  const searchInput = document.getElementById("warehouse-daily-input-search");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      window.DMC_WAREHOUSE_DAILY_INPUT_SEARCH = searchInput.value;
      refreshWarehouseDailyInputPage();
    });
  }

  const managerSelect = document.getElementById("warehouse-manager-reviewed-by");

  if (managerSelect) {
    managerSelect.addEventListener("change", () => {
      window.DMC_WAREHOUSE_MANAGER_REVIEWED_BY = managerSelect.value;
    });
  }

  document.querySelectorAll(".warehouse-daily-input-cell").forEach((input) => {
    input.addEventListener("input", () => {
      saveWarehouseCellValue(input);
    });

    input.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") {
        return;
      }

      event.preventDefault();
      saveWarehouseCellValue(input);

      focusNextWarehouseInput(input, event.shiftKey ? -1 : 1);
    });
  });

  const readyButton = document.getElementById("ready-for-warehouse-review");

  if (readyButton) {
    readyButton.addEventListener("click", () => {
      const warehouseLogEntries = buildWarehouseLogEntriesFromDailyInput();
      const summary = getWarehouseDailyInputSummary();

      if (!window.DMC_WAREHOUSE_MANAGER_REVIEWED_BY) {
        showWarehouseInputModal({
          type: "warning",
          title: "Manager Required",
          message:
            "Please choose the manager who reviewed this Warehouse Daily Input before continuing.",
          confirmLabel: "Got it"
        });
        return;
      }

      if (warehouseLogEntries.length === 0) {
        showWarehouseInputModal({
          type: "warning",
          title: "No Movements Ready",
          message:
            "No Warehouse Daily Input movements are ready for review yet.",
          confirmLabel: "Got it"
        });
        return;
      }

      if (summary.checkRows > 0) {
        showWarehouseInputModal({
          type: "warning",
          title: "Rows Need Review",
          message:
            "Some rows still need review. Please fix CHECK rows before posting.",
          confirmLabel: "Got it"
        });
        return;
      }

      window.DMC_WAREHOUSE_DAILY_INPUT_MODE = "review";
      refreshWarehouseDailyInputPage();
    });
  }

  const backButtons = [
    document.getElementById("back-to-warehouse-edit-mode"),
    document.getElementById("back-to-warehouse-edit-mode-top")
  ];

  backButtons.forEach((button) => {
    if (button) {
      button.addEventListener("click", returnToWarehouseEditMode);
    }
  });

  document.querySelectorAll("[data-preview-edit]").forEach((button) => {
    button.addEventListener("click", returnToWarehouseEditMode);
  });

  document.querySelectorAll("[data-preview-remove-row]").forEach((button) => {
    button.addEventListener("click", () => {
      const itemId = button.dataset.previewRemoveRow;
      const inputData = getStoredWarehouseDailyInput();

      delete inputData[itemId];

      saveWarehouseDailyInput(inputData);
      refreshWarehouseDailyInputPage();
    });
  });

  const clearButton = document.getElementById("clear-warehouse-daily-input");

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      showWarehouseInputConfirm({
        type: "danger",
        title: "Clear Warehouse Daily Input?",
        message:
          "This will clear today’s Warehouse Daily Input rows. This does not affect already submitted Warehouse Log entries.",
        confirmLabel: "Clear Today",
        cancelLabel: "Cancel",
        onConfirm: () => {
          localStorage.removeItem(DMC_WAREHOUSE_DAILY_INPUT_KEY);
          window.DMC_WAREHOUSE_DAILY_INPUT_MODE = "edit";
          refreshWarehouseDailyInputPage();
        }
      });
    });
  }

  const submitButton = document.getElementById("submit-warehouse-daily-input");

  if (submitButton) {
    submitButton.addEventListener("click", () => {
      const newWarehouseLogEntries = buildWarehouseLogEntriesFromDailyInput();

      if (newWarehouseLogEntries.length === 0) {
        showWarehouseInputModal({
          type: "warning",
          title: "No Warehouse Entries",
          message: "No Warehouse Daily Input entries are ready to submit.",
          confirmLabel: "Got it"
        });
        return;
      }

      showWarehouseInputConfirm({
        type: "success",
        title: "Submit Warehouse Daily Input?",
        message: `Submit ${newWarehouseLogEntries.length} Warehouse Log entries and clear today’s input?`,
        confirmLabel: "Submit Entries",
        cancelLabel: "Cancel",
        onConfirm: () => {
          const currentWarehouseLogEntries = getStoredWarehouseLogEntries();
          const updatedWarehouseLogEntries = [
            ...currentWarehouseLogEntries,
            ...newWarehouseLogEntries
          ];

          saveWarehouseLogEntries(updatedWarehouseLogEntries);
          localStorage.removeItem(DMC_WAREHOUSE_DAILY_INPUT_KEY);

          window.DMC_WAREHOUSE_DAILY_INPUT_MODE = "edit";

          showWarehouseInputModal({
            type: "success",
            title: "Warehouse Daily Input Submitted",
            message:
              "Warehouse Daily Input was submitted to Warehouse Log Transaction.",
            confirmLabel: "Continue"
          });

          refreshWarehouseDailyInputPage();
        }
      });
    });
  }
}

window.DMC_PAGES["warehouse-daily-input"] = {
  eyebrow: "Warehouse",
  title: "Warehouse Daily Input",
  description:
    "Daily input sheet for Warehouse transfer in, transfer out, waste, and notes.",
  getContent: getWarehouseDailyInputContent,
  content: getWarehouseDailyInputContent(),
  afterRender: setupWarehouseDailyInputEvents
};
