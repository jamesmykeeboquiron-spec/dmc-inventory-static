window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_COMMISSARY_DAILY_INPUT_STOCK_KEY = "dmc_commissary_stock_items";
const DMC_COMMISSARY_DAILY_INPUT_MASTER_LIST_KEY = "dmc_master_list_items";
const DMC_COMMISSARY_DAILY_INPUT_LEDGER_KEY = "dmc_inventory_ledger_entries";
const DMC_COMMISSARY_DAILY_INPUT_TODAY_KEY = "dmc_commissary_daily_input_today";

window.DMC_COMMISSARY_DAILY_INPUT_MODE =
  window.DMC_COMMISSARY_DAILY_INPUT_MODE || "edit";

window.DMC_COMMISSARY_DAILY_INPUT_DEPARTMENT =
  window.DMC_COMMISSARY_DAILY_INPUT_DEPARTMENT || "all";

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

function getCommissaryDailyInputDepartments() {
  return [
    ...new Set(
      getAllCommissaryDailyInputItems()
        .map((item) => item.department || "Unassigned")
        .filter(Boolean)
    )
  ].sort();
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

function renderCommissaryDailyInputDepartmentOptions() {
  const currentDepartment = window.DMC_COMMISSARY_DAILY_INPUT_DEPARTMENT;

  return `
    <option value="all" ${currentDepartment === "all" ? "selected" : ""}>
      All Departments
    </option>
    ${getCommissaryDailyInputDepartments()
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
  const selectedDepartment = String(
    window.DMC_COMMISSARY_DAILY_INPUT_DEPARTMENT || "all"
  ).toLowerCase();

  const selectedSection = String(
    window.DMC_COMMISSARY_DAILY_INPUT_SECTION || "all"
  ).toLowerCase();

  const searchValue = String(window.DMC_COMMISSARY_DAILY_INPUT_SEARCH || "")
    .toLowerCase()
    .trim();

  return getAllCommissaryDailyInputItems().filter((item) => {
    const itemDepartment = String(item.department || "Unassigned").toLowerCase();
    const itemSection = String(item.section || "Unassigned").toLowerCase();
    const itemName = item.officialItemName || item.itemName || item.name || "";

    const matchesDepartment =
      selectedDepartment === "all" || itemDepartment === selectedDepartment;

    const matchesSection =
      selectedSection === "all" || itemSection === selectedSection;

    const matchesSearch =
      !searchValue ||
      String(item.itemId || "").toLowerCase().includes(searchValue) ||
      String(itemName || "").toLowerCase().includes(searchValue) ||
      String(item.department || "").toLowerCase().includes(searchValue) ||
      String(item.section || "").toLowerCase().includes(searchValue) ||
      String(item.unit || "").toLowerCase().includes(searchValue);

    return matchesDepartment && matchesSection && matchesSearch;
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

  const inWarehouse = getCommissaryDailyNumberValue(
    inputData,
    item.itemId,
    "transferInWarehouse"
  );

  const inBranch = getCommissaryDailyNumberValue(
    inputData,
    item.itemId,
    "transferInBranch"
  );

  const inProduction = getCommissaryDailyNumberValue(
    inputData,
    item.itemId,
    "transferInProduction"
  );

  const outWarehouse = getCommissaryDailyNumberValue(
    inputData,
    item.itemId,
    "transferOutWarehouse"
  );

  const outBranch = getCommissaryDailyNumberValue(
    inputData,
    item.itemId,
    "transferOutBranch"
  );

  const remaining = getCommissaryDailyNumberValue(
    inputData,
    item.itemId,
    "remaining"
  );

  const waste = getCommissaryDailyNumberValue(inputData, item.itemId, "waste");

  const totalIn = inWarehouse + inBranch + inProduction;
  const totalOut = outWarehouse + outBranch;
  const totalAvailable = currentStock + totalIn;

  const hasRemaining =
    String(
      getCommissaryDailyInputValue(inputData, item.itemId, "remaining")
    ).trim() !== "";

  const rawUsageAuto = hasRemaining
    ? totalAvailable - totalOut - remaining
    : "";

  const usageAuto = rawUsageAuto === "" ? "" : Math.max(0, rawUsageAuto);

  return {
    currentStock,
    inWarehouse,
    inBranch,
    inProduction,
    totalIn,
    outWarehouse,
    outBranch,
    totalOut,
    remaining,
    waste,
    totalAvailable,
    rawUsageAuto,
    usageAuto
  };
}

function getCommissaryDailyReviewStatus(item, rowData) {
  const inputFields = [
    "transferInWarehouse",
    "transferInBranch",
    "transferInProduction",
    "transferOutWarehouse",
    "transferOutBranch",
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

  const numericFields = [
    "transferInWarehouse",
    "transferInBranch",
    "transferInProduction",
    "transferOutWarehouse",
    "transferOutBranch",
    "remaining",
    "waste"
  ];

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

function addCommissaryTransferEntry(entries, config) {
  if (config.quantity <= 0) {
    return;
  }

  entries.push({
    date: getTodayDateStringForCommissaryDailyInput(),
    submittedAt: config.submittedAt,
    submittedAtDisplay: config.submittedAtDisplay,
    batchId: config.batchId,
    location: "Commissary",
    department: config.item.department || "Commissary",
    section: config.item.section || "",
    itemId: config.item.itemId || "",
    itemName: config.itemName,
    movementType: config.movementType,
    movementField: config.movementField,
    stockEffect: config.stockEffect,
    quantity: config.quantity,
    unit: config.item.unit || "",
    managerReviewedBy: config.managerReviewedBy,
    source: config.source,
    destination: config.destination,
    notes: config.notes
  });
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

    const sharedConfig = {
      item,
      itemName,
      batchId,
      submittedAt,
      submittedAtDisplay,
      managerReviewedBy
    };

    addCommissaryTransferEntry(entries, {
      ...sharedConfig,
      movementType: "Transfer In",
      movementField: "transferInWarehouse",
      stockEffect: "add",
      quantity: computed.inWarehouse,
      source: "Warehouse",
      destination: "Commissary",
      notes: notes || "Items received from Warehouse into Commissary."
    });

    addCommissaryTransferEntry(entries, {
      ...sharedConfig,
      movementType: "Transfer In",
      movementField: "transferInBranch",
      stockEffect: "add",
      quantity: computed.inBranch,
      source: "Branch",
      destination: "Commissary",
      notes: notes || "Items returned/transferred from Branch into Commissary."
    });

    addCommissaryTransferEntry(entries, {
      ...sharedConfig,
      movementType: "Transfer In",
      movementField: "transferInProduction",
      stockEffect: "add",
      quantity: computed.inProduction,
      source: "Production",
      destination: "Commissary",
      notes: notes || "Finished products made by Commissary production."
    });

    addCommissaryTransferEntry(entries, {
      ...sharedConfig,
      movementType: "Transfer Out",
      movementField: "transferOutWarehouse",
      stockEffect: "deduct",
      quantity: computed.outWarehouse,
      source: "Commissary",
      destination: "Warehouse",
      notes: notes || "Products/items sent from Commissary to Warehouse."
    });

    addCommissaryTransferEntry(entries, {
      ...sharedConfig,
      movementType: "Transfer Out",
      movementField: "transferOutBranch",
      stockEffect: "deduct",
      quantity: computed.outBranch,
      source: "Commissary",
      destination: "Branch",
      notes: notes || "Products/items sent from Commissary to Branch."
    });

    if (hasRemaining && computed.usageAuto > 0) {
      entries.push({
        date: getTodayDateStringForCommissaryDailyInput(),
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "Commissary",
        department: item.department || "Commissary",
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
          "Auto-computed from Current + Total In - Total Out - Remaining."
      });
    }

    if (computed.waste > 0) {
      entries.push({
        date: getTodayDateStringForCommissaryDailyInput(),
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "Commissary",
        department: item.department || "Commissary",
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
        department: item.department || "Commissary",
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
          `In Warehouse: ${computed.inWarehouse}`,
          `In Branch: ${computed.inBranch}`,
          `In Production: ${computed.inProduction}`,
          `Total In: ${computed.totalIn}`,
          `Total Available: ${computed.totalAvailable}`,
          `Out Warehouse: ${computed.outWarehouse}`,
          `Out Branch: ${computed.outBranch}`,
          `Total Out: ${computed.totalOut}`,
          `Remaining: ${computed.remaining}`,
          `Waste: ${computed.waste}`,
          `Usage Auto: ${computed.usageAuto}`,
          computed.rawUsageAuto !== "" && computed.rawUsageAuto < 0
            ? `Count correction: Remaining was higher than expected available stock.`
            : "",
          notes ? `Notes: ${notes}` : ""
        ]
          .filter(Boolean)
          .join(" ")
      });
    }

    if (
      !hasRemaining &&
      notes &&
      computed.totalIn <= 0 &&
      computed.totalOut <= 0 &&
      computed.waste <= 0
    ) {
      entries.push({
        date: getTodayDateStringForCommissaryDailyInput(),
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "Commissary",
        department: item.department || "Commissary",
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
        <td colspan="15">
          No Commissary items found. Add commissary items in the Master List first.
        </td>
      </tr>
    `;
  }

  if (commissaryItems.length === 0) {
    return `
      <tr>
        <td colspan="15">
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
        <tr data-commissary-row="${item.itemId}" data-current-stock="${computed.currentStock}">
          <td>${item.itemId || "-"}</td>
          <td>
            ${itemName}
            <small class="table-subtext">
              ${item.department || "Unassigned"} • ${item.section || "Unassigned"}
            </small>
          </td>
          <td>${item.unit || "-"}</td>
          <td>${computed.currentStock} ${item.unit || ""}</td>

          <td>
            <input
              class="daily-input-cell commissary-daily-input-cell"
              data-item-id="${item.itemId}"
              data-field="transferInWarehouse"
              type="number"
              min="0"
              step="any"
              value="${getCommissaryDailyInputValue(
                inputData,
                item.itemId,
                "transferInWarehouse"
              )}"
            />
          </td>

          <td>
            <input
              class="daily-input-cell commissary-daily-input-cell"
              data-item-id="${item.itemId}"
              data-field="transferInBranch"
              type="number"
              min="0"
              step="any"
              value="${getCommissaryDailyInputValue(
                inputData,
                item.itemId,
                "transferInBranch"
              )}"
            />
          </td>

          <td>
            <input
              class="daily-input-cell commissary-daily-input-cell"
              data-item-id="${item.itemId}"
              data-field="transferInProduction"
              type="number"
              min="0"
              step="any"
              value="${getCommissaryDailyInputValue(
                inputData,
                item.itemId,
                "transferInProduction"
              )}"
            />
          </td>

          <td>
            <strong data-total-available="${item.itemId}">
              ${computed.totalAvailable} ${item.unit || ""}
            </strong>
          </td>

          <td>
            <input
              class="daily-input-cell commissary-daily-input-cell"
              data-item-id="${item.itemId}"
              data-field="transferOutWarehouse"
              type="number"
              min="0"
              step="any"
              value="${getCommissaryDailyInputValue(
                inputData,
                item.itemId,
                "transferOutWarehouse"
              )}"
            />
          </td>

          <td>
            <input
              class="daily-input-cell commissary-daily-input-cell"
              data-item-id="${item.itemId}"
              data-field="transferOutBranch"
              type="number"
              min="0"
              step="any"
              value="${getCommissaryDailyInputValue(
                inputData,
                item.itemId,
                "transferOutBranch"
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
            <strong data-usage-auto="${item.itemId}">
              ${
                computed.usageAuto === ""
                  ? "-"
                  : `${computed.usageAuto} ${item.unit || ""}`
              }
            </strong>
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

          <td data-review-status="${item.itemId}">
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
      Press Tab to move across In Warehouse → In Branch → In Production → Out Warehouse → Out Branch → Remaining → Waste → Notes.
    </div>

    <div class="instruction-box">
      <strong>Commissary Daily Logic:</strong>
      <span>
        In Production auto-fills Out Warehouse by default, but Out Warehouse stays editable if some finished products need to remain in Commissary.
        Total Available and Usage Auto update while typing. Remaining Count becomes the stock truth.
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
            <th>In Warehouse</th>
            <th>In Branch</th>
            <th>In Production</th>
            <th>Total Available</th>
            <th>Out Warehouse</th>
            <th>Out Branch</th>
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
              <th>In Warehouse</th>
              <th>In Branch</th>
              <th>In Production</th>
              <th>Total Available</th>
              <th>Out Warehouse</th>
              <th>Out Branch</th>
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
                    <td>${computed.inWarehouse || "-"}</td>
                    <td>${computed.inBranch || "-"}</td>
                    <td>${computed.inProduction || "-"}</td>
                    <td>${computed.totalAvailable}</td>
                    <td>${computed.outWarehouse || "-"}</td>
                    <td>${computed.outBranch || "-"}</td>
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
            Enter commissary transfers, production output, remaining count, waste, and notes only for items that had activity.
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
          Department
          <select id="commissary-daily-input-department" ${
            isReviewMode ? "disabled" : ""
          }>
            ${renderCommissaryDailyInputDepartmentOptions()}
          </select>
        </label>

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

function getCommissaryLiveNumber(input) {
  if (!input) {
    return 0;
  }

  const value = String(input.value || "").trim();

  if (value === "") {
    return 0;
  }

  const parsedValue = Number(value);

  return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

function getCommissaryLiveInput(row, fieldName) {
  return row.querySelector(`[data-field="${fieldName}"]`);
}

function updateCommissaryDailyLiveRow(itemId) {
  const row = document.querySelector(`[data-commissary-row="${itemId}"]`);

  if (!row) {
    return;
  }

  const currentStock = Number(row.dataset.currentStock || 0);

  const inWarehouse = getCommissaryLiveNumber(
    getCommissaryLiveInput(row, "transferInWarehouse")
  );
  const inBranch = getCommissaryLiveNumber(
    getCommissaryLiveInput(row, "transferInBranch")
  );
  const inProduction = getCommissaryLiveNumber(
    getCommissaryLiveInput(row, "transferInProduction")
  );
  const outWarehouse = getCommissaryLiveNumber(
    getCommissaryLiveInput(row, "transferOutWarehouse")
  );
  const outBranch = getCommissaryLiveNumber(
    getCommissaryLiveInput(row, "transferOutBranch")
  );
  const remainingInput = getCommissaryLiveInput(row, "remaining");
  const wasteInput = getCommissaryLiveInput(row, "waste");
  const notesInput = getCommissaryLiveInput(row, "notes");

  const remainingValue = String(remainingInput?.value || "").trim();
  const remaining = getCommissaryLiveNumber(remainingInput);
  const waste = getCommissaryLiveNumber(wasteInput);

  const totalAvailable = currentStock + inWarehouse + inBranch + inProduction;
  const totalOut = outWarehouse + outBranch;

  const rawUsageAuto =
    remainingValue === "" ? "" : totalAvailable - totalOut - remaining;

  const usageAuto = rawUsageAuto === "" ? "" : Math.max(0, rawUsageAuto);

  const totalAvailableDisplay = document.querySelector(
    `[data-total-available="${itemId}"]`
  );
  const usageDisplay = document.querySelector(`[data-usage-auto="${itemId}"]`);
  const reviewDisplay = document.querySelector(`[data-review-status="${itemId}"]`);

  const unit = row.children[2]?.textContent || "";

  if (totalAvailableDisplay) {
    totalAvailableDisplay.textContent = `${totalAvailable} ${unit}`;
  }

  if (usageDisplay) {
    usageDisplay.textContent = usageAuto === "" ? "-" : `${usageAuto} ${unit}`;
  }

  const hasAnyInput =
    inWarehouse > 0 ||
    inBranch > 0 ||
    inProduction > 0 ||
    outWarehouse > 0 ||
    outBranch > 0 ||
    remainingValue !== "" ||
    waste > 0 ||
    String(notesInput?.value || "").trim() !== "";

  const hasInvalidNumber = Array.from(
    row.querySelectorAll('input[type="number"]')
  ).some((input) => {
    const value = String(input.value || "").trim();

    if (value === "") {
      return false;
    }

    return Number.isNaN(Number(value)) || Number(value) < 0;
  });

  if (reviewDisplay) {
    if (!hasAnyInput) {
      reviewDisplay.innerHTML = "-";
    } else if (hasInvalidNumber) {
      reviewDisplay.innerHTML = `<span class="badge danger-badge">CHECK</span>`;
    } else {
      reviewDisplay.innerHTML = `<span class="badge">READY</span>`;
    }
  }
}

function handleCommissaryProductionAutoFill(input) {
  if (input.dataset.field !== "transferInProduction") {
    return;
  }

  const inputData = getCommissaryDailyInputStoredRows();
  const itemId = input.dataset.itemId;
  const rowData = inputData[itemId] || {};
  const row = document.querySelector(`[data-commissary-row="${itemId}"]`);
  const outWarehouseInput = row?.querySelector(
    '[data-field="transferOutWarehouse"]'
  );

  if (!outWarehouseInput) {
    return;
  }

  const currentOutValue = String(outWarehouseInput.value || "").trim();
  const wasAutoSynced = rowData.outWarehouseAutoSynced === true;

  if (currentOutValue === "" || wasAutoSynced) {
    outWarehouseInput.value = input.value;

    rowData.transferOutWarehouse = input.value;
    rowData.outWarehouseAutoSynced = true;
    inputData[itemId] = rowData;

    saveCommissaryDailyInputRows(inputData);
  }
}

function handleCommissaryOutWarehouseManualEdit(input) {
  if (input.dataset.field !== "transferOutWarehouse") {
    return;
  }

  const inputData = getCommissaryDailyInputStoredRows();
  const itemId = input.dataset.itemId;

  inputData[itemId] = inputData[itemId] || {};
  inputData[itemId].outWarehouseAutoSynced = false;
  inputData[itemId].transferOutWarehouse = input.value;

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
  const departmentSelect = document.getElementById(
    "commissary-daily-input-department"
  );

  if (departmentSelect) {
    departmentSelect.addEventListener("change", () => {
      window.DMC_COMMISSARY_DAILY_INPUT_DEPARTMENT = departmentSelect.value;
      window.DMC_COMMISSARY_DAILY_INPUT_MODE = "edit";
      refreshCommissaryDailyInputPage();
    });
  }

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
      if (input.dataset.field === "transferOutWarehouse") {
        handleCommissaryOutWarehouseManualEdit(input);
      } else {
        saveCommissaryDailyCellValue(input);
      }

      handleCommissaryProductionAutoFill(input);
      updateCommissaryDailyLiveRow(input.dataset.itemId);
    });

    input.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") {
        return;
      }

      event.preventDefault();

      if (input.dataset.field === "transferOutWarehouse") {
        handleCommissaryOutWarehouseManualEdit(input);
      } else {
        saveCommissaryDailyCellValue(input);
      }

      handleCommissaryProductionAutoFill(input);
      updateCommissaryDailyLiveRow(input.dataset.itemId);
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
    "Daily commissary sheet with warehouse, branch, production, remaining count, and auto-computed usage.",
  getContent: getCommissaryDailyInputContent,
  content: getCommissaryDailyInputContent(),
  afterRender: setupCommissaryDailyInputEvents
};
