window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_MASTER_LIST_STORAGE_KEY_FOR_WAREHOUSE_INPUT =
  "dmc_master_list_items";
const DMC_WAREHOUSE_DAILY_INPUT_KEY = "dmc_warehouse_daily_input_today";
const DMC_WAREHOUSE_LEDGER_STORAGE_KEY = "dmc_inventory_ledger_entries";

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
      const parsedItems = JSON.parse(storedItems);

      if (!Array.isArray(parsedItems)) {
        return window.DMC_DATA?.masterList?.items || [];
      }

      return parsedItems;
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

function getWarehouseDailyInputItemOperatingAreas(item) {
  if (Array.isArray(item?.operatingAreas)) {
    return item.operatingAreas.filter(Boolean);
  }

  if (item?.operatingArea) {
    return String(item.operatingArea)
      .split(",")
      .map((area) => area.trim())
      .filter(Boolean);
  }

  return [];
}

function itemIsActiveInWarehouseDailyInputArea(item) {
  const areas = getWarehouseDailyInputItemOperatingAreas(item).map((area) =>
    String(area || "").toLowerCase()
  );

  return areas.some((area) => {
    return area.includes("warehouse") || area.includes("stockroom");
  });
}

function itemBelongsToWarehouseDailyInput(item) {
  if (item.active === false) {
    return false;
  }

  return itemIsActiveInWarehouseDailyInputArea(item);
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

  const searchValue = String(window.DMC_WAREHOUSE_DAILY_INPUT_SEARCH || "")
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
      String(item.department || "").toLowerCase().includes(searchValue) ||
      String(item.section || "").toLowerCase().includes(searchValue) ||
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

function getStoredWarehouseLedgerEntries() {
  const storedEntries = localStorage.getItem(DMC_WAREHOUSE_LEDGER_STORAGE_KEY);

  if (!storedEntries) {
    return window.DMC_DATA?.ledger || [];
  }

  try {
    const parsedEntries = JSON.parse(storedEntries);

    if (!Array.isArray(parsedEntries)) {
      return window.DMC_DATA?.ledger || [];
    }

    return parsedEntries;
  } catch {
    return window.DMC_DATA?.ledger || [];
  }
}

function saveWarehouseLedgerEntries(entries) {
  localStorage.setItem(
    DMC_WAREHOUSE_LEDGER_STORAGE_KEY,
    JSON.stringify(entries)
  );
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

  return `WH-DI-${datePart}-${timePart}`;
}

function entryBelongsToWarehouseDailyInput(entry) {
  const location = String(entry.location || "").toLowerCase();
  const department = String(entry.department || "").toLowerCase();
  const source = String(entry.source || "").toLowerCase();
  const destination = String(entry.destination || "").toLowerCase();

  if (
    source.includes("branch daily input") ||
    source.includes("commissary daily input closing count") ||
    source.includes("commissary daily input") ||
    location.includes("branch") ||
    location.includes("dmc-iriga") ||
    location.includes("commissary")
  ) {
    return false;
  }

  return (
    location.includes("warehouse") ||
    location.includes("stockroom") ||
    department.includes("warehouse") ||
    department.includes("stockroom") ||
    source.includes("warehouse") ||
    source.includes("supplier") ||
    source.includes("incoming from commissary") ||
    source.includes("commissary receipt") ||
    destination.includes("warehouse") ||
    destination.includes("stockroom")
  );
}

function getWarehouseDailyInputLedgerEntriesForItem(itemId) {
  return getStoredWarehouseLedgerEntries().filter(
    (entry) =>
      entryBelongsToWarehouseDailyInput(entry) &&
      String(entry.itemId || "") === String(itemId || "")
  );
}

function getWarehouseEntryTimeForDailyInput(entry) {
  return String(entry.submittedAt || entry.receivedAt || entry.date || "");
}

function getWarehouseEntryStockEffectForDailyInput(entry) {
  if (entry.stockEffect) {
    return entry.stockEffect;
  }

  if (
    entry.movementType === "Transfer In" ||
    entry.movementType === "Received" ||
    entry.movementType === "Supplier Receiving"
  ) {
    return "add";
  }

  if (
    entry.movementType === "Transfer Out" ||
    entry.movementType === "Waste"
  ) {
    return "deduct";
  }

  if (
    entry.movementType === "Remaining Count" ||
    entry.movementType === "Stock Count"
  ) {
    return "set";
  }

  return "report";
}

function getLatestWarehouseCountEntry(itemId) {
  const countEntries = getWarehouseDailyInputLedgerEntriesForItem(itemId).filter(
    (entry) =>
      entry.movementType === "Remaining Count" ||
      entry.movementType === "Stock Count" ||
      entry.stockEffect === "set"
  );

  if (countEntries.length === 0) {
    return null;
  }

  return [...countEntries].sort((a, b) => {
    return getWarehouseEntryTimeForDailyInput(b).localeCompare(
      getWarehouseEntryTimeForDailyInput(a)
    );
  })[0];
}

function calculateWarehouseDailyCurrentStock(item) {
  const entries = getWarehouseDailyInputLedgerEntriesForItem(item.itemId);
  const latestCount = getLatestWarehouseCountEntry(item.itemId);

  if (latestCount) {
    const latestCountTime = getWarehouseEntryTimeForDailyInput(latestCount);
    const baseStock = Number(latestCount.quantity || 0);

    return entries
      .filter((entry) => {
        if (entry === latestCount) {
          return false;
        }

        return getWarehouseEntryTimeForDailyInput(entry) > latestCountTime;
      })
      .reduce((total, entry) => {
        const quantity = Number(entry.quantity || 0);
        const stockEffect = getWarehouseEntryStockEffectForDailyInput(entry);

        if (stockEffect === "add") {
          return total + quantity;
        }

        if (stockEffect === "deduct") {
          return total - quantity;
        }

        if (stockEffect === "set") {
          return quantity;
        }

        return total;
      }, baseStock);
  }

  return entries.reduce((total, entry) => {
    const quantity = Number(entry.quantity || 0);
    const stockEffect = getWarehouseEntryStockEffectForDailyInput(entry);

    if (stockEffect === "add") {
      return total + quantity;
    }

    if (stockEffect === "deduct") {
      return total - quantity;
    }

    if (stockEffect === "set") {
      return quantity;
    }

    return total;
  }, 0);
}

function getWarehouseDailyInputValue(inputData, itemId, fieldName) {
  return inputData?.[itemId]?.[fieldName] || "";
}

function getWarehouseDailyNumberValue(inputData, itemId, fieldName) {
  const rawValue = String(
    getWarehouseDailyInputValue(inputData, itemId, fieldName)
  ).trim();

  if (rawValue === "") {
    return 0;
  }

  const parsedValue = Number(rawValue);

  return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

function getWarehouseDailyComputedValues(item, inputData) {
  const currentStock = calculateWarehouseDailyCurrentStock(item);
  const transferIn = getWarehouseDailyNumberValue(
    inputData,
    item.itemId,
    "transferIn"
  );
  const transferOut = getWarehouseDailyNumberValue(
    inputData,
    item.itemId,
    "transferOut"
  );
  const remaining = getWarehouseDailyNumberValue(
    inputData,
    item.itemId,
    "remaining"
  );
  const waste = getWarehouseDailyNumberValue(inputData, item.itemId, "waste");

  const totalAvailable = currentStock + transferIn;
  const hasRemaining =
    String(getWarehouseDailyInputValue(inputData, item.itemId, "remaining")).trim() !== "";

  const usageAuto = hasRemaining
    ? totalAvailable - transferOut - remaining - waste
    : "";

  return {
    currentStock,
    transferIn,
    totalAvailable,
    transferOut,
    remaining,
    waste,
    usageAuto
  };
}

function getWarehouseDailyReviewStatus(item, rowData) {
  const inputFields = [
    "transferIn",
    "transferOut",
    "remaining",
    "waste",
    "notes"
  ];

  const hasAnyInput = inputFields.some((field) => {
    return String(rowData?.[field] || "").trim() !== "";
  });

  if (!hasAnyInput) {
    return "";
  }

  const numericFields = ["transferIn", "transferOut", "remaining", "waste"];

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

  const inputData = getStoredWarehouseDailyInput();
  const computed = getWarehouseDailyComputedValues(item, inputData);

  if (computed.usageAuto !== "" && computed.usageAuto < 0) {
    return "CHECK";
  }

  return "READY";
}

function getWarehouseDailyReviewRows() {
  const inputData = getStoredWarehouseDailyInput();

  return getAllWarehouseDailyInputItems()
    .map((item) => {
      const rowData = inputData[item.itemId] || {};
      const reviewStatus = getWarehouseDailyReviewStatus(item, rowData);
      const computed = getWarehouseDailyComputedValues(item, inputData);

      return {
        item,
        rowData,
        reviewStatus,
        computed
      };
    })
    .filter((row) => row.reviewStatus === "READY");
}

function buildWarehouseLedgerEntriesFromDailyInput() {
  const reviewRows = getWarehouseDailyReviewRows();
  const batchId = createWarehouseDailyInputBatchId();
  const submittedAt = getCurrentWarehouseInputTimestamp();
  const submittedAtDisplay = getReadableWarehouseInputTimestamp();
  const managerReviewedBy = window.DMC_WAREHOUSE_MANAGER_REVIEWED_BY;

  const entries = [];

  reviewRows.forEach(({ item, rowData, computed }) => {
    const notes = String(rowData.notes || "").trim();
    const hasRemaining = String(rowData.remaining || "").trim() !== "";

    if (computed.transferIn > 0) {
      entries.push({
        date: getTodayDateStringForWarehouseInput(),
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "Warehouse",
        department: item.department || "",
        section: item.section || "",
        itemId: item.itemId || "",
        itemName: item.officialItemName || "",
        movementType: "Transfer In",
        movementField: "transferIn",
        stockEffect: "add",
        quantity: computed.transferIn,
        unit: item.unit || "",
        managerReviewedBy,
        source: "Warehouse Daily Input",
        destination: "Warehouse",
        notes
      });
    }

    if (computed.transferOut > 0) {
      entries.push({
        date: getTodayDateStringForWarehouseInput(),
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "Warehouse",
        department: item.department || "",
        section: item.section || "",
        itemId: item.itemId || "",
        itemName: item.officialItemName || "",
        movementType: "Transfer Out",
        movementField: "transferOut",
        stockEffect: "deduct",
        quantity: computed.transferOut,
        unit: item.unit || "",
        managerReviewedBy,
        source: "Warehouse Daily Input",
        destination: "Outgoing Transfer",
        notes
      });
    }

    if (hasRemaining && computed.usageAuto > 0) {
      entries.push({
        date: getTodayDateStringForWarehouseInput(),
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "Warehouse",
        department: item.department || "",
        section: item.section || "",
        itemId: item.itemId || "",
        itemName: item.officialItemName || "",
        movementType: "Usage",
        movementField: "usageAuto",
        stockEffect: "report",
        quantity: computed.usageAuto,
        unit: item.unit || "",
        managerReviewedBy,
        source: "Warehouse Daily Input",
        destination: "Usage Report",
        notes
      });
    }

    if (computed.waste > 0) {
      entries.push({
        date: getTodayDateStringForWarehouseInput(),
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "Warehouse",
        department: item.department || "",
        section: item.section || "",
        itemId: item.itemId || "",
        itemName: item.officialItemName || "",
        movementType: "Waste",
        movementField: "waste",
        stockEffect: "report",
        quantity: computed.waste,
        unit: item.unit || "",
        managerReviewedBy,
        source: "Warehouse Daily Input",
        destination: "Waste Report",
        notes
      });
    }

    if (hasRemaining) {
      entries.push({
        date: getTodayDateStringForWarehouseInput(),
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "Warehouse",
        department: item.department || "",
        section: item.section || "",
        itemId: item.itemId || "",
        itemName: item.officialItemName || "",
        movementType: "Remaining Count",
        movementField: "remaining",
        stockEffect: "set",
        quantity: computed.remaining,
        unit: item.unit || "",
        managerReviewedBy,
        source: "Warehouse Daily Input Closing Count",
        destination: "Warehouse",
        notes: [
          `Closing count submitted by ${managerReviewedBy || "warehouse manager"}.`,
          `Current: ${computed.currentStock}`,
          `Transfer In: ${computed.transferIn}`,
          `Total Available: ${computed.totalAvailable}`,
          `Transfer Out: ${computed.transferOut}`,
          `Remaining: ${computed.remaining}`,
          `Waste: ${computed.waste}`,
          `Usage Auto: ${computed.usageAuto}`,
          notes ? `Notes: ${notes}` : ""
        ]
          .filter(Boolean)
          .join(" ")
      });
    }

    if (
      !hasRemaining &&
      notes &&
      computed.transferIn <= 0 &&
      computed.transferOut <= 0 &&
      computed.waste <= 0
    ) {
      entries.push({
        date: getTodayDateStringForWarehouseInput(),
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "Warehouse",
        department: item.department || "",
        section: item.section || "",
        itemId: item.itemId || "",
        itemName: item.officialItemName || "",
        movementType: "Daily Note",
        movementField: "notes",
        stockEffect: "report",
        quantity: 0,
        unit: item.unit || "",
        managerReviewedBy,
        source: "Warehouse Daily Input",
        destination: "Warehouse Notes",
        notes
      });
    }
  });

  return entries;
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

function getWarehouseDailyInputSummary() {
  const inputData = getStoredWarehouseDailyInput();

  const rows = getAllWarehouseDailyInputItems().map((item) => {
    const rowData = inputData[item.itemId] || {};
    const reviewStatus = getWarehouseDailyReviewStatus(item, rowData);

    return {
      item,
      rowData,
      reviewStatus
    };
  });

  return {
    rowsWithInput: rows.filter((row) => row.reviewStatus !== "").length,
    readyRows: rows.filter((row) => row.reviewStatus === "READY").length,
    checkRows: rows.filter((row) => row.reviewStatus === "CHECK").length
  };
}

function renderWarehouseDailyInputRows() {
  const allWarehouseItems = getAllWarehouseDailyInputItems();
  const warehouseItems = getWarehouseDailyInputItems();
  const inputData = getStoredWarehouseDailyInput();

  if (allWarehouseItems.length === 0) {
    return `
      <tr>
        <td colspan="12">
          No Warehouse items found. Add Warehouse items in the Master List first.
        </td>
      </tr>
    `;
  }

  if (warehouseItems.length === 0) {
    return `
      <tr>
        <td colspan="12">
          No Warehouse items found for the selected filter.
        </td>
      </tr>
    `;
  }

  return warehouseItems
    .map((item) => {
      const rowData = inputData[item.itemId] || {};
      const reviewStatus = getWarehouseDailyReviewStatus(item, rowData);
      const computed = getWarehouseDailyComputedValues(item, inputData);

      return `
        <tr>
          <td>${item.itemId || "-"}</td>
          <td>${item.officialItemName || "-"}</td>
          <td>${item.unit || "-"}</td>
          <td>${computed.currentStock} ${item.unit || ""}</td>

          <td>
            <input
              class="daily-input-cell warehouse-daily-input-cell"
              data-item-id="${item.itemId}"
              data-field="transferIn"
              type="number"
              min="0"
              step="any"
              value="${getWarehouseDailyInputValue(inputData, item.itemId, "transferIn")}"
            />
          </td>

          <td>${computed.totalAvailable} ${item.unit || ""}</td>

          <td>
            <input
              class="daily-input-cell warehouse-daily-input-cell"
              data-item-id="${item.itemId}"
              data-field="transferOut"
              type="number"
              min="0"
              step="any"
              value="${getWarehouseDailyInputValue(inputData, item.itemId, "transferOut")}"
            />
          </td>

          <td>
            <input
              class="daily-input-cell warehouse-daily-input-cell blue-input"
              data-item-id="${item.itemId}"
              data-field="remaining"
              type="number"
              min="0"
              step="any"
              value="${getWarehouseDailyInputValue(inputData, item.itemId, "remaining")}"
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
              value="${getWarehouseDailyInputValue(inputData, item.itemId, "waste")}"
            />
          </td>

          <td>
            ${
              computed.usageAuto === ""
                ? "-"
                : `${computed.usageAuto} ${item.unit || ""}`
            }
          </td>

          <td>
            <input
              class="daily-input-cell warehouse-daily-input-cell notes-input"
              data-item-id="${item.itemId}"
              data-field="notes"
              type="text"
              value="${getWarehouseDailyInputValue(inputData, item.itemId, "notes")}"
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

function renderWarehouseEditModeContent() {
  return `
    <div class="keyboard-hint">
      Press Tab to move across Transfer In → Transfer Out → Remaining → Waste → Notes, then continue to the next row.
    </div>

    <div class="instruction-box">
      <strong>Warehouse Daily Logic:</strong>
      <span>
        Blank rows are ignored. Transfer In adds warehouse stock. Transfer Out deducts warehouse stock.
        Remaining becomes the physical stock truth. Usage is auto-computed only when Remaining is entered.
        Waste is reported but not double-deducted because Remaining Count sets physical stock.
      </span>
    </div>

    <div class="table-wrap warehouse-daily-input-table-wrap">
      <table class="daily-input-table warehouse-daily-input-table">
        <thead>
          <tr>
            <th>Item ID</th>
            <th>Item Name</th>
            <th>Unit</th>
            <th>Current</th>
            <th>Transfer In</th>
            <th>Total Available</th>
            <th>Transfer Out</th>
            <th>Remaining</th>
            <th>Waste</th>
            <th>Usage Auto</th>
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
        <p>No rows are ready to post. Go back to edit mode and enter at least one field on one row.</p>

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
  } ready to post. Fully blank rows are ignored.
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
              <th>Current</th>
              <th>Transfer In</th>
              <th>Total Available</th>
              <th>Transfer Out</th>
              <th>Remaining</th>
              <th>Waste</th>
              <th>Usage Auto</th>
              <th>Notes</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            ${reviewRows
              .map(({ item, rowData, computed }) => {
                return `
                  <tr>
                    <td>${item.itemId || "-"}</td>
                    <td>${item.officialItemName || "-"}</td>
                    <td>${item.unit || "-"}</td>
                    <td>${computed.currentStock}</td>
                    <td>${computed.transferIn || "-"}</td>
                    <td>${computed.totalAvailable}</td>
                    <td>${computed.transferOut || "-"}</td>
                    <td>${
                      String(rowData.remaining || "").trim() === ""
                        ? "-"
                        : computed.remaining
                    }</td>
                    <td>${computed.waste || "-"}</td>
                    <td>${
                      computed.usageAuto === "" ? "-" : computed.usageAuto
                    }</td>
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
  const summary = getWarehouseDailyInputSummary();

  return `
    <section class="grid">
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
          <h3>Warehouse Daily Input — Today Only</h3>
          <p>
            Enter end-of-shift warehouse counts, received/transferred in items, transfer outs, waste, and notes only for items that had activity.
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

function saveAllVisibleWarehouseInputs() {
  const inputData = getStoredWarehouseDailyInput();

  document.querySelectorAll(".warehouse-daily-input-cell").forEach((input) => {
    const itemId = input.dataset.itemId;
    const field = input.dataset.field;

    inputData[itemId] = inputData[itemId] || {};
    inputData[itemId][field] = input.value;
  });

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

    const valueLength = String(nextInput.value || "").length;

    if (typeof nextInput.setSelectionRange === "function") {
      nextInput.setSelectionRange(valueLength, valueLength);
    }
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

    input.addEventListener("change", () => {
      saveWarehouseCellValue(input);
      refreshWarehouseDailyInputPage();
    });

    input.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") {
        return;
      }

      event.preventDefault();
      saveWarehouseCellValue(input);
      refreshWarehouseDailyInputPage();

      setTimeout(() => {
        const refreshedInput = document.querySelector(
          `.warehouse-daily-input-cell[data-item-id="${input.dataset.itemId}"][data-field="${input.dataset.field}"]`
        );

        if (refreshedInput) {
          focusNextWarehouseInput(refreshedInput, event.shiftKey ? -1 : 1);
        }
      }, 0);
    });
  });

  const readyButton = document.getElementById("ready-for-warehouse-review");

  if (readyButton) {
    readyButton.addEventListener("click", () => {
      saveAllVisibleWarehouseInputs();

      const warehouseEntries = buildWarehouseLedgerEntriesFromDailyInput();
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

      if (warehouseEntries.length === 0) {
        showWarehouseInputModal({
          type: "warning",
          title: "No Rows Ready",
          message:
            "No Warehouse Daily Input rows are ready for review yet. Enter at least one field on one item. Fully blank rows are ignored.",
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
      const newWarehouseEntries = buildWarehouseLedgerEntriesFromDailyInput();

      if (newWarehouseEntries.length === 0) {
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
        message: `Submit ${newWarehouseEntries.length} Warehouse Log entries and clear today’s input?`,
        confirmLabel: "Submit Entries",
        cancelLabel: "Cancel",
        onConfirm: () => {
          const currentLedgerEntries = getStoredWarehouseLedgerEntries();
          const updatedLedgerEntries = [
            ...currentLedgerEntries,
            ...newWarehouseEntries
          ];

          saveWarehouseLedgerEntries(updatedLedgerEntries);
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
    "End-of-shift warehouse count sheet with auto-computed usage, transfer movement, waste, and remaining stock.",
  getContent: getWarehouseDailyInputContent,
  content: getWarehouseDailyInputContent(),
  afterRender: setupWarehouseDailyInputEvents
};
