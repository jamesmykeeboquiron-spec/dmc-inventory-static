window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_COMMISSARY_DAILY_INPUT_STOCK_KEY = "dmc_commissary_stock_items";
const DMC_COMMISSARY_DAILY_INPUT_MASTER_LIST_KEY = "dmc_master_list_items";
const DMC_COMMISSARY_DAILY_INPUT_LEDGER_KEY = "dmc_inventory_ledger_entries";
const DMC_COMMISSARY_DAILY_INPUT_TODAY_KEY = "dmc_commissary_daily_input_today";

window.DMC_COMMISSARY_DAILY_INPUT_MODE =
  window.DMC_COMMISSARY_DAILY_INPUT_MODE || "edit";

window.DMC_COMMISSARY_DAILY_INPUT_SECTION =
  window.DMC_COMMISSARY_DAILY_INPUT_SECTION || "all";

window.DMC_COMMISSARY_DAILY_INPUT_SEARCH =
  window.DMC_COMMISSARY_DAILY_INPUT_SEARCH || "";

window.DMC_COMMISSARY_DAILY_INPUT_MANAGER =
  window.DMC_COMMISSARY_DAILY_INPUT_MANAGER || "";

function getCommissaryDailyInputStockItems() {
  const storedItems = localStorage.getItem(DMC_COMMISSARY_DAILY_INPUT_STOCK_KEY);

  if (!storedItems) {
    return window.DMC_DATA?.commissaryStock || [];
  }

  try {
    const parsedItems = JSON.parse(storedItems);

    if (!Array.isArray(parsedItems)) {
      return window.DMC_DATA?.commissaryStock || [];
    }

    return parsedItems;
  } catch {
    return window.DMC_DATA?.commissaryStock || [];
  }
}

function getCommissaryDailyInputMasterListItems() {
  const storedItems = localStorage.getItem(
    DMC_COMMISSARY_DAILY_INPUT_MASTER_LIST_KEY
  );

  if (!storedItems) {
    return [];
  }

  try {
    const parsedItems = JSON.parse(storedItems);

    if (!Array.isArray(parsedItems)) {
      return [];
    }

    return parsedItems;
  } catch {
    return [];
  }
}

function getCommissaryDailyInputLedgerEntries() {
  const storedEntries = localStorage.getItem(
    DMC_COMMISSARY_DAILY_INPUT_LEDGER_KEY
  );

  if (!storedEntries) {
    return [];
  }

  try {
    const parsedEntries = JSON.parse(storedEntries);

    if (!Array.isArray(parsedEntries)) {
      return [];
    }

    return parsedEntries;
  } catch {
    return [];
  }
}

function saveCommissaryDailyInputLedgerEntries(entries) {
  localStorage.setItem(
    DMC_COMMISSARY_DAILY_INPUT_LEDGER_KEY,
    JSON.stringify(entries)
  );
}

function getCommissaryDailyInputStoredRows() {
  const storedInput = localStorage.getItem(DMC_COMMISSARY_DAILY_INPUT_TODAY_KEY);

  if (!storedInput) {
    return {};
  }

  try {
    return JSON.parse(storedInput);
  } catch {
    return {};
  }
}

function saveCommissaryDailyInputRows(rows) {
  localStorage.setItem(
    DMC_COMMISSARY_DAILY_INPUT_TODAY_KEY,
    JSON.stringify(rows)
  );
}

function getCommissaryDailyInputSettings() {
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

function getCommissaryDailyInputSettingName(option) {
  if (typeof option === "string") {
    return option;
  }

  return option?.name || option?.fullName || option?.label || "";
}

function getCommissaryDailyInputManagers() {
  const settings = getCommissaryDailyInputSettings();

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
    .map(getCommissaryDailyInputSettingName)
    .filter(Boolean);
}

function renderCommissaryDailyInputManagerOptions() {
  const currentManager = window.DMC_COMMISSARY_DAILY_INPUT_MANAGER;
  const managers = getCommissaryDailyInputManagers();

  if (managers.length === 0) {
    return `
      <option value="" ${currentManager === "" ? "selected" : ""}>
        Select manager
      </option>
      <option value="Commissary Manager" ${
        currentManager === "Commissary Manager" ? "selected" : ""
      }>
        Commissary Manager
      </option>
      <option value="Admin Staff" ${
        currentManager === "Admin Staff" ? "selected" : ""
      }>
        Admin Staff
      </option>
    `;
  }

  return `
    <option value="" ${currentManager === "" ? "selected" : ""}>
      Select manager
    </option>
    ${managers
      .map(
        (manager) => `
          <option value="${manager}" ${
          currentManager === manager ? "selected" : ""
        }>
            ${manager}
          </option>
        `
      )
      .join("")}
  `;
}

function itemBelongsToCommissaryDailyInput(item) {
  const operatingArea = String(item.operatingArea || "").toLowerCase();
  const department = String(item.department || "").toLowerCase();
  const section = String(item.section || "").toLowerCase();

  if (item.active === false) {
    return false;
  }

  return (
    operatingArea.includes("commissary") ||
    department.includes("commissary") ||
    section.includes("commissary")
  );
}

function getAllCommissaryDailyInputItems() {
  const stockItems = getCommissaryDailyInputStockItems();
  const masterListItems = getCommissaryDailyInputMasterListItems().filter(
    itemBelongsToCommissaryDailyInput
  );

  const combinedItemsById = {};

  [...stockItems, ...masterListItems].forEach((item) => {
    const itemId = String(item.itemId || "").trim();

    if (!itemId) {
      return;
    }

    combinedItemsById[itemId] = {
      ...combinedItemsById[itemId],
      ...item
    };
  });

  return Object.values(combinedItemsById);
}

function getCommissaryDailyInputSections() {
  return [
    ...new Set(
      getAllCommissaryDailyInputItems()
        .map((item) => item.section || "Unassigned")
        .filter(Boolean)
    )
  ].sort();
}

function renderCommissaryDailyInputSectionOptions() {
  const currentSection = window.DMC_COMMISSARY_DAILY_INPUT_SECTION;

  return `
    <option value="all" ${currentSection === "all" ? "selected" : ""}>
      All Sections
    </option>
    ${getCommissaryDailyInputSections()
      .map(
        (section) => `
          <option value="${section}" ${
          currentSection === section ? "selected" : ""
        }>
            ${section}
          </option>
        `
      )
      .join("")}
  `;
}

function getCommissaryDailyInputItems() {
  const selectedSection = String(
    window.DMC_COMMISSARY_DAILY_INPUT_SECTION || "all"
  ).toLowerCase();

  const searchValue = String(window.DMC_COMMISSARY_DAILY_INPUT_SEARCH || "")
    .toLowerCase()
    .trim();

  return getAllCommissaryDailyInputItems().filter((item) => {
    const itemSection = String(item.section || "Unassigned").toLowerCase();

    const matchesSection =
      selectedSection === "all" || itemSection === selectedSection;

    const itemName = item.officialItemName || item.itemName || item.name || "";

    const matchesSearch =
      !searchValue ||
      String(item.itemId || "").toLowerCase().includes(searchValue) ||
      String(itemName || "").toLowerCase().includes(searchValue) ||
      String(item.section || "").toLowerCase().includes(searchValue) ||
      String(item.unit || "").toLowerCase().includes(searchValue);

    return matchesSection && matchesSearch;
  });
}

function entryBelongsToCommissaryDailyInput(entry) {
  const location = String(entry.location || "").toLowerCase();
  const department = String(entry.department || "").toLowerCase();
  const source = String(entry.source || "").toLowerCase();
  const destination = String(entry.destination || "").toLowerCase();

  return (
    location.includes("commissary") ||
    department.includes("commissary") ||
    source.includes("commissary") ||
    destination.includes("commissary")
  );
}

function getCommissaryDailyInputLedgerEntriesForItem(itemId) {
  return getCommissaryDailyInputLedgerEntries().filter(
    (entry) =>
      entryBelongsToCommissaryDailyInput(entry) &&
      String(entry.itemId || "") === String(itemId || "")
  );
}

function getEntryTimeForCommissaryDailyInput(entry) {
  return String(entry.submittedAt || entry.date || "");
}

function getLatestCommissaryRemainingCountEntry(itemId) {
  const entries = getCommissaryDailyInputLedgerEntriesForItem(itemId).filter(
    (entry) =>
      entry.movementType === "Remaining Count" || entry.stockEffect === "set"
  );

  if (entries.length === 0) {
    return null;
  }

  return [...entries].sort((a, b) => {
    return getEntryTimeForCommissaryDailyInput(b).localeCompare(
      getEntryTimeForCommissaryDailyInput(a)
    );
  })[0];
}

function getCommissaryDailyInputOpeningStock(item) {
  const openingStock =
    item.currentStock ??
    item.startingStock ??
    item.openingStock ??
    item.quantity ??
    0;

  const parsedStock = Number(openingStock);

  return Number.isNaN(parsedStock) ? 0 : parsedStock;
}

function getCommissaryEntryStockEffect(entry) {
  if (entry.stockEffect) {
    return entry.stockEffect;
  }

  if (entry.movementType === "Transfer In" || entry.movementType === "Received") {
    return "add";
  }

  if (entry.movementType === "Transfer Out") {
    return "deduct";
  }

  if (entry.movementType === "Remaining Count") {
    return "set";
  }

  return "report";
}

function calculateCommissaryDailyCurrentStock(item) {
  const itemId = item.itemId || "";
  const entries = getCommissaryDailyInputLedgerEntriesForItem(itemId);
  const latestRemainingCount = getLatestCommissaryRemainingCountEntry(itemId);

  if (latestRemainingCount) {
    const latestCountTime =
      getEntryTimeForCommissaryDailyInput(latestRemainingCount);
    const baseStock = Number(latestRemainingCount.quantity || 0);

    return entries
      .filter((entry) => {
        if (entry === latestRemainingCount) {
          return false;
        }

        return getEntryTimeForCommissaryDailyInput(entry) > latestCountTime;
      })
      .reduce((total, entry) => {
        const quantity = Number(entry.quantity || 0);
        const stockEffect = getCommissaryEntryStockEffect(entry);

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
    const stockEffect = getCommissaryEntryStockEffect(entry);

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
  }, getCommissaryDailyInputOpeningStock(item));
}

function getCommissaryDailyInputValue(inputData, itemId, fieldName) {
  return inputData?.[itemId]?.[fieldName] || "";
}

function getCommissaryDailyNumberValue(inputData, itemId, fieldName) {
  const rawValue = String(
    getCommissaryDailyInputValue(inputData, itemId, fieldName)
  ).trim();

  if (rawValue === "") {
    return 0;
  }

  const parsedValue = Number(rawValue);

  return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

function getCommissaryDailyComputedValues(item, inputData) {
  const currentStock = calculateCommissaryDailyCurrentStock(item);
  const transIn = getCommissaryDailyNumberValue(
    inputData,
    item.itemId,
    "transferIn"
  );
  const transOut = getCommissaryDailyNumberValue(
    inputData,
    item.itemId,
    "transferOut"
  );
  const remaining = getCommissaryDailyNumberValue(
    inputData,
    item.itemId,
    "remaining"
  );
  const waste = getCommissaryDailyNumberValue(inputData, item.itemId, "waste");

  const totalAvailable = currentStock + transIn;
  const hasRemaining =
    String(
      getCommissaryDailyInputValue(inputData, item.itemId, "remaining")
    ).trim() !== "";

  const usageAuto = hasRemaining ? totalAvailable - transOut - remaining : "";

  return {
    currentStock,
    transIn,
    transOut,
    remaining,
    waste,
    totalAvailable,
    usageAuto
  };
}

function getCommissaryDailyReviewStatus(item, rowData) {
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

  const inputData = getCommissaryDailyInputStoredRows();
  const computed = getCommissaryDailyComputedValues(item, inputData);

  if (computed.usageAuto !== "" && computed.usageAuto < 0) {
    return "CHECK";
  }

  return "READY";
}

function getCommissaryDailyReviewRows() {
  const inputData = getCommissaryDailyInputStoredRows();

  return getAllCommissaryDailyInputItems()
    .map((item) => {
      const rowData = inputData[item.itemId] || {};
      const reviewStatus = getCommissaryDailyReviewStatus(item, rowData);
      const computed = getCommissaryDailyComputedValues(item, inputData);

      return {
        item,
        rowData,
        reviewStatus,
        computed
      };
    })
    .filter((row) => row.reviewStatus === "READY");
}

function getCommissaryDailyInputSummary() {
  const inputData = getCommissaryDailyInputStoredRows();

  const rows = getAllCommissaryDailyInputItems().map((item) => {
    const rowData = inputData[item.itemId] || {};
    const reviewStatus = getCommissaryDailyReviewStatus(item, rowData);

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

function getTodayDateStringForCommissaryDailyInput() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentCommissaryDailyInputTimestamp() {
  return new Date().toISOString();
}

function getReadableCommissaryDailyInputTimestamp() {
  const now = new Date();

  return now.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function createCommissaryDailyInputBatchId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replaceAll("-", "");
  const timePart = now.toTimeString().slice(0, 8).replaceAll(":", "");

  return `COM-DI-${datePart}-${timePart}`;
}

function buildCommissaryLedgerEntriesFromDailyInput() {
  const reviewRows = getCommissaryDailyReviewRows();
  const batchId = createCommissaryDailyInputBatchId();
  const submittedAt = getCurrentCommissaryDailyInputTimestamp();
  const submittedAtDisplay = getReadableCommissaryDailyInputTimestamp();
  const managerReviewedBy = window.DMC_COMMISSARY_DAILY_INPUT_MANAGER;

  const entries = [];

  reviewRows.forEach(({ item, rowData, computed }) => {
    const notes = String(rowData.notes || "").trim();
    const hasRemaining = String(rowData.remaining || "").trim() !== "";

    const itemName =
      item.officialItemName || item.itemName || item.name || "";

    if (computed.transIn > 0) {
      entries.push({
        date: getTodayDateStringForCommissaryDailyInput(),
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "Commissary",
        department: "Commissary",
        section: item.section || "",
        itemId: item.itemId || "",
        itemName,
        movementType: "Transfer In",
        movementField: "transferIn",
        stockEffect: "add",
        quantity: computed.transIn,
        unit: item.unit || "",
        managerReviewedBy,
        source: "Commissary Daily Input",
        destination: "Commissary",
        notes: notes || "Items/products added into Commissary."
      });
    }

    if (computed.transOut > 0) {
      entries.push({
        date: getTodayDateStringForCommissaryDailyInput(),
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "Commissary",
        department: "Commissary",
        section: item.section || "",
        itemId: item.itemId || "",
        itemName,
        movementType: "Transfer Out",
        movementField: "transferOut",
        stockEffect: "deduct",
        quantity: computed.transOut,
        unit: item.unit || "",
        managerReviewedBy,
        source: "Commissary Daily Input",
        destination: "Warehouse",
        notes: notes || "Products/items sent from Commissary to Warehouse."
      });
    }

    if (hasRemaining && computed.usageAuto > 0) {
      entries.push({
        date: getTodayDateStringForCommissaryDailyInput(),
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "Commissary",
        department: "Commissary",
        section: item.section || "",
        itemId: item.itemId || "",
        itemName,
        movementType: "Usage",
        movementField: "usageAuto",
        stockEffect: "report",
        quantity: computed.usageAuto,
        unit: item.unit || "",
        managerReviewedBy,
        source: "Commissary Daily Input",
        destination: "Usage Report",
        notes:
          notes ||
          "Auto-computed from Current + Trans In - Trans Out - Remaining."
      });
    }

    if (computed.waste > 0) {
      entries.push({
        date: getTodayDateStringForCommissaryDailyInput(),
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "Commissary",
        department: "Commissary",
        section: item.section || "",
        itemId: item.itemId || "",
        itemName,
        movementType: "Waste",
        movementField: "waste",
        stockEffect: "report",
        quantity: computed.waste,
        unit: item.unit || "",
        managerReviewedBy,
        source: "Commissary Daily Input",
        destination: "Waste Report",
        notes:
          notes ||
          "Waste reported only. It is not double-deducted because Remaining Count sets physical stock."
      });
    }

    if (hasRemaining) {
      entries.push({
        date: getTodayDateStringForCommissaryDailyInput(),
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "Commissary",
        department: "Commissary",
        section: item.section || "",
        itemId: item.itemId || "",
        itemName,
        movementType: "Remaining Count",
        movementField: "remaining",
        stockEffect: "set",
        quantity: computed.remaining,
        unit: item.unit || "",
        managerReviewedBy,
        source: "Commissary Daily Input Closing Count",
        destination: "Commissary",
        notes: [
          `Closing count submitted by ${
            managerReviewedBy || "commissary manager"
          }.`,
          `Current: ${computed.currentStock}`,
          `Trans In: ${computed.transIn}`,
          `Total Available: ${computed.totalAvailable}`,
          `Trans Out: ${computed.transOut}`,
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
      computed.transIn <= 0 &&
      computed.transOut <= 0 &&
      computed.waste <= 0
    ) {
      entries.push({
        date: getTodayDateStringForCommissaryDailyInput(),
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "Commissary",
        department: "Commissary",
        section: item.section || "",
        itemId: item.itemId || "",
        itemName,
        movementType: "Daily Note",
        movementField: "notes",
        stockEffect: "report",
        quantity: 0,
        unit: item.unit || "",
        managerReviewedBy,
        source: "Commissary Daily Input",
        destination: "Commissary Notes",
        notes
      });
    }
  });

  return entries;
}

function renderCommissaryDailyInputRows() {
  const allCommissaryItems = getAllCommissaryDailyInputItems();
  const commissaryItems = getCommissaryDailyInputItems();
  const inputData = getCommissaryDailyInputStoredRows();

  if (allCommissaryItems.length === 0) {
    return `
      <tr>
        <td colspan="12">
          No Commissary items found. Add commissary items in the Master List first.
        </td>
      </tr>
    `;
  }

  if (commissaryItems.length === 0) {
    return `
      <tr>
        <td colspan="12">
          No Commissary items found for the selected filter.
        </td>
      </tr>
    `;
  }

  return commissaryItems
    .map((item) => {
      const rowData = inputData[item.itemId] || {};
      const reviewStatus = getCommissaryDailyReviewStatus(item, rowData);
      const computed = getCommissaryDailyComputedValues(item, inputData);
      const itemName =
        item.officialItemName || item.itemName || item.name || "-";

      return `
        <tr>
          <td>${item.itemId || "-"}</td>
          <td>${itemName}</td>
          <td>${item.unit || "-"}</td>
          <td>${computed.currentStock} ${item.unit || ""}</td>

          <td>
            <input
              class="daily-input-cell commissary-daily-input-cell"
              data-item-id="${item.itemId}"
              data-field="transferIn"
              type="number"
              min="0"
              step="any"
              value="${getCommissaryDailyInputValue(
                inputData,
                item.itemId,
                "transferIn"
              )}"
            />
          </td>

          <td>${computed.totalAvailable} ${item.unit || ""}</td>

          <td>
            <input
              class="daily-input-cell commissary-daily-input-cell"
              data-item-id="${item.itemId}"
              data-field="transferOut"
              type="number"
              min="0"
              step="any"
              value="${getCommissaryDailyInputValue(
                inputData,
                item.itemId,
                "transferOut"
              )}"
            />
          </td>

          <td>
            <input
              class="daily-input-cell commissary-daily-input-cell blue-input"
              data-item-id="${item.itemId}"
              data-field="remaining"
              type="number"
              min="0"
              step="any"
              value="${getCommissaryDailyInputValue(
                inputData,
                item.itemId,
                "remaining"
              )}"
            />
          </td>

          <td>
            <input
              class="daily-input-cell commissary-daily-input-cell blue-input"
              data-item-id="${item.itemId}"
              data-field="waste"
              type="number"
              min="0"
              step="any"
              value="${getCommissaryDailyInputValue(
                inputData,
                item.itemId,
                "waste"
              )}"
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
              class="daily-input-cell commissary-daily-input-cell notes-input"
              data-item-id="${item.itemId}"
              data-field="notes"
              type="text"
              value="${getCommissaryDailyInputValue(
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

function renderCommissaryDailyEditModeContent() {
  return `
    <div class="keyboard-hint">
      Press Tab to move across Trans In → Trans Out → Remaining → Waste → Notes, then continue to the next row.
    </div>

    <div class="instruction-box">
      <strong>Commissary Daily Logic:</strong>
      <span>
        Blank rows are ignored. Managers can enter only the fields needed for that day.
        Usage is auto-computed only when Remaining is entered. Waste is recorded for reports and not double-deducted.
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
            <th>Trans In</th>
            <th>Total Available</th>
            <th>Trans Out</th>
            <th>Remaining</th>
            <th>Waste</th>
            <th>Usage Auto</th>
            <th>Notes</th>
            <th>Review</th>
          </tr>
        </thead>

        <tbody>
          ${renderCommissaryDailyInputRows()}
        </tbody>
      </table>
    </div>
  `;
}

function renderCommissaryDailyReviewModeContent() {
  const reviewRows = getCommissaryDailyReviewRows();

  if (reviewRows.length === 0) {
    return `
      <div class="submit-preview-box">
        <h4>Commissary Submit Review</h4>
        <p>No rows are ready to post. Go back to edit mode and enter at least one field on one row.</p>

        <div class="form-actions review-actions">
          <button class="ghost-button" id="back-to-commissary-daily-edit-mode">
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
          <h4>Commissary Submit Review</h4>
          <p>
            ${reviewRows.length} item row${
    reviewRows.length === 1 ? "" : "s"
  } ready to post. Fully blank rows are ignored.
          </p>
        </div>

        <div class="form-actions review-actions">
          <button class="ghost-button" id="back-to-commissary-daily-edit-mode">
            Back to Edit
          </button>

          <button class="primary-button" id="submit-commissary-daily-input">
            Submit to Commissary Log
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
              <th>Trans In</th>
              <th>Total Available</th>
              <th>Trans Out</th>
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
                const itemName =
                  item.officialItemName || item.itemName || item.name || "-";

                return `
                  <tr>
                    <td>${item.itemId || "-"}</td>
                    <td>${itemName}</td>
                    <td>${item.unit || "-"}</td>
                    <td>${computed.currentStock}</td>
                    <td>${computed.transIn || "-"}</td>
                    <td>${computed.totalAvailable}</td>
                    <td>${computed.transOut || "-"}</td>
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

function getCommissaryDailyInputContent() {
  const isReviewMode = window.DMC_COMMISSARY_DAILY_INPUT_MODE === "review";
  const summary = getCommissaryDailyInputSummary();

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
          <h3>Commissary Daily Input — Today Only</h3>
          <p>
            Enter commissary transfer movement, remaining count, waste, and notes only for items that had activity.
          </p>
        </div>

        <div class="form-actions">
          ${
            isReviewMode
              ? `<button class="ghost-button" id="back-to-commissary-daily-edit-mode-top">Back to Edit</button>`
              : `<button class="primary-button" id="ready-for-commissary-daily-review">Ready for Review</button>`
          }

          <button class="ghost-button" id="clear-commissary-daily-input">
            Clear Today
          </button>
        </div>
      </div>

      <div class="warehouse-daily-input-toolbar">
        <label>
          Section
          <select id="commissary-daily-input-section" ${
            isReviewMode ? "disabled" : ""
          }>
            ${renderCommissaryDailyInputSectionOptions()}
          </select>
        </label>

        <label class="filter-search">
          Search
          <input
            id="commissary-daily-input-search"
            type="text"
            placeholder="Search item name or Item ID..."
            value="${window.DMC_COMMISSARY_DAILY_INPUT_SEARCH}"
            ${isReviewMode ? "disabled" : ""}
          />
        </label>

        <label>
          Manager Reviewed By
          <select id="commissary-daily-manager-reviewed-by" ${
            isReviewMode ? "disabled" : ""
          }>
            ${renderCommissaryDailyInputManagerOptions()}
          </select>
        </label>
      </div>

      ${
        isReviewMode
          ? renderCommissaryDailyReviewModeContent()
          : renderCommissaryDailyEditModeContent()
      }
    </section>
  `;
}

function refreshCommissaryDailyInputPage() {
  window.DMC_PAGES["commissary-daily-input"].content =
    getCommissaryDailyInputContent();

  renderPage("commissary-daily-input");
}

function returnToCommissaryDailyEditMode() {
  window.DMC_COMMISSARY_DAILY_INPUT_MODE = "edit";
  refreshCommissaryDailyInputPage();
}

function showCommissaryDailyInputModal({
  type,
  title,
  message,
  confirmLabel
}) {
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

function showCommissaryDailyInputConfirm({
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

function saveCommissaryDailyCellValue(input) {
  const inputData = getCommissaryDailyInputStoredRows();
  const itemId = input.dataset.itemId;
  const field = input.dataset.field;

  inputData[itemId] = inputData[itemId] || {};
  inputData[itemId][field] = input.value;

  saveCommissaryDailyInputRows(inputData);
}

function saveAllVisibleCommissaryDailyInputs() {
  const inputData = getCommissaryDailyInputStoredRows();

  document.querySelectorAll(".commissary-daily-input-cell").forEach((input) => {
    const itemId = input.dataset.itemId;
    const field = input.dataset.field;

    inputData[itemId] = inputData[itemId] || {};
    inputData[itemId][field] = input.value;
  });

  saveCommissaryDailyInputRows(inputData);
}

function focusNextCommissaryDailyInput(currentInput, direction = 1) {
  const inputs = Array.from(
    document.querySelectorAll(".commissary-daily-input-cell")
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

function setupCommissaryDailyInputEvents() {
  const sectionSelect = document.getElementById(
    "commissary-daily-input-section"
  );

  if (sectionSelect) {
    sectionSelect.addEventListener("change", () => {
      window.DMC_COMMISSARY_DAILY_INPUT_SECTION = sectionSelect.value;
      window.DMC_COMMISSARY_DAILY_INPUT_MODE = "edit";
      refreshCommissaryDailyInputPage();
    });
  }

  const searchInput = document.getElementById("commissary-daily-input-search");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      window.DMC_COMMISSARY_DAILY_INPUT_SEARCH = searchInput.value;
      refreshCommissaryDailyInputPage();
    });
  }

  const managerSelect = document.getElementById(
    "commissary-daily-manager-reviewed-by"
  );

  if (managerSelect) {
    managerSelect.addEventListener("change", () => {
      window.DMC_COMMISSARY_DAILY_INPUT_MANAGER = managerSelect.value;
    });
  }

  document.querySelectorAll(".commissary-daily-input-cell").forEach((input) => {
    input.addEventListener("input", () => {
      saveCommissaryDailyCellValue(input);
    });

    input.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") {
        return;
      }

      event.preventDefault();
      saveCommissaryDailyCellValue(input);

      focusNextCommissaryDailyInput(input, event.shiftKey ? -1 : 1);
    });
  });

  const readyButton = document.getElementById(
    "ready-for-commissary-daily-review"
  );

  if (readyButton) {
    readyButton.addEventListener("click", () => {
      saveAllVisibleCommissaryDailyInputs();

      const commissaryEntries = buildCommissaryLedgerEntriesFromDailyInput();
      const summary = getCommissaryDailyInputSummary();

      if (!window.DMC_COMMISSARY_DAILY_INPUT_MANAGER) {
        showCommissaryDailyInputModal({
          type: "warning",
          title: "Manager Required",
          message:
            "Please choose the manager who reviewed this Commissary Daily Input before continuing.",
          confirmLabel: "Got it"
        });
        return;
      }

      if (commissaryEntries.length === 0) {
        showCommissaryDailyInputModal({
          type: "warning",
          title: "No Rows Ready",
          message:
            "No Commissary Daily Input rows are ready for review yet. Enter at least one field on one item. Fully blank rows are ignored.",
          confirmLabel: "Got it"
        });
        return;
      }

      if (summary.checkRows > 0) {
        showCommissaryDailyInputModal({
          type: "warning",
          title: "Rows Need Review",
          message:
            "Some rows still need review. Please fix CHECK rows before posting.",
          confirmLabel: "Got it"
        });
        return;
      }

      window.DMC_COMMISSARY_DAILY_INPUT_MODE = "review";
      refreshCommissaryDailyInputPage();
    });
  }

  const backButtons = [
    document.getElementById("back-to-commissary-daily-edit-mode"),
    document.getElementById("back-to-commissary-daily-edit-mode-top")
  ];

  backButtons.forEach((button) => {
    if (button) {
      button.addEventListener("click", returnToCommissaryDailyEditMode);
    }
  });

  document.querySelectorAll("[data-preview-edit]").forEach((button) => {
    button.addEventListener("click", returnToCommissaryDailyEditMode);
  });

  document.querySelectorAll("[data-preview-remove-row]").forEach((button) => {
    button.addEventListener("click", () => {
      const itemId = button.dataset.previewRemoveRow;
      const inputData = getCommissaryDailyInputStoredRows();

      delete inputData[itemId];

      saveCommissaryDailyInputRows(inputData);
      refreshCommissaryDailyInputPage();
    });
  });

  const clearButton = document.getElementById("clear-commissary-daily-input");

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      showCommissaryDailyInputConfirm({
        type: "danger",
        title: "Clear Commissary Daily Input?",
        message:
          "This will clear today’s Commissary Daily Input rows. This does not affect already submitted Commissary Log entries.",
        confirmLabel: "Clear Today",
        cancelLabel: "Cancel",
        onConfirm: () => {
          localStorage.removeItem(DMC_COMMISSARY_DAILY_INPUT_TODAY_KEY);
          window.DMC_COMMISSARY_DAILY_INPUT_MODE = "edit";
          refreshCommissaryDailyInputPage();
        }
      });
    });
  }

  const submitButton = document.getElementById("submit-commissary-daily-input");

  if (submitButton) {
    submitButton.addEventListener("click", () => {
      const newCommissaryEntries = buildCommissaryLedgerEntriesFromDailyInput();

      if (newCommissaryEntries.length === 0) {
        showCommissaryDailyInputModal({
          type: "warning",
          title: "No Commissary Entries",
          message: "No Commissary Daily Input entries are ready to submit.",
          confirmLabel: "Got it"
        });
        return;
      }

      showCommissaryDailyInputConfirm({
        type: "success",
        title: "Submit Commissary Daily Input?",
        message: `Submit ${newCommissaryEntries.length} Commissary Log entries and clear today’s input?`,
        confirmLabel: "Submit Entries",
        cancelLabel: "Cancel",
        onConfirm: () => {
          const currentLedgerEntries = getCommissaryDailyInputLedgerEntries();
          const updatedLedgerEntries = [
            ...currentLedgerEntries,
            ...newCommissaryEntries
          ];

          saveCommissaryDailyInputLedgerEntries(updatedLedgerEntries);
          localStorage.removeItem(DMC_COMMISSARY_DAILY_INPUT_TODAY_KEY);

          window.DMC_COMMISSARY_DAILY_INPUT_MODE = "edit";

          showCommissaryDailyInputModal({
            type: "success",
            title: "Commissary Daily Input Submitted",
            message:
              "Commissary Daily Input was submitted to Commissary Log Transaction.",
            confirmLabel: "Continue"
          });

          refreshCommissaryDailyInputPage();
        }
      });
    });
  }
}

window.DMC_PAGES["commissary-daily-input"] = {
  eyebrow: "Commissary",
  title: "Commissary Daily Input",
  description:
    "Daily commissary sheet with transfer in, transfer out, remaining count, and auto-computed usage.",
  getContent: getCommissaryDailyInputContent,
  content: getCommissaryDailyInputContent(),
  afterRender: setupCommissaryDailyInputEvents
};
