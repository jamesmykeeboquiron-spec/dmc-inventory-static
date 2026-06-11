window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_BRANCH_DAILY_INPUT_MASTER_LIST_KEY = "dmc_master_list_items";
const DMC_BRANCH_DAILY_INPUT_LEDGER_KEY = "dmc_inventory_ledger_entries";
const DMC_BRANCH_DAILY_INPUT_TODAY_KEY = "dmc_branch_daily_input_today";

window.DMC_BRANCH_DAILY_INPUT_MODE =
  window.DMC_BRANCH_DAILY_INPUT_MODE || "edit";

window.DMC_BRANCH_DAILY_INPUT_DEPARTMENT =
  window.DMC_BRANCH_DAILY_INPUT_DEPARTMENT || "all";

window.DMC_BRANCH_DAILY_INPUT_SEARCH =
  window.DMC_BRANCH_DAILY_INPUT_SEARCH || "";

window.DMC_BRANCH_DAILY_INPUT_MANAGER =
  window.DMC_BRANCH_DAILY_INPUT_MANAGER || "";

function getBranchDailyInputMasterListItems() {
  const storedItems = localStorage.getItem(DMC_BRANCH_DAILY_INPUT_MASTER_LIST_KEY);

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

function getBranchDailyInputLedgerEntries() {
  const storedEntries = localStorage.getItem(DMC_BRANCH_DAILY_INPUT_LEDGER_KEY);

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

function saveBranchDailyInputLedgerEntries(entries) {
  localStorage.setItem(DMC_BRANCH_DAILY_INPUT_LEDGER_KEY, JSON.stringify(entries));
}

function getBranchDailyInputStoredRows() {
  const storedInput = localStorage.getItem(DMC_BRANCH_DAILY_INPUT_TODAY_KEY);

  if (!storedInput) {
    return {};
  }

  try {
    return JSON.parse(storedInput);
  } catch {
    return {};
  }
}

function saveBranchDailyInputRows(rows) {
  localStorage.setItem(DMC_BRANCH_DAILY_INPUT_TODAY_KEY, JSON.stringify(rows));
}

function getBranchDailyInputSettings() {
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

function getBranchDailyInputSettingName(option) {
  if (typeof option === "string") {
    return option;
  }

  return option?.name || option?.fullName || option?.label || "";
}

function getBranchDailyInputManagers() {
  const settings = getBranchDailyInputSettings();

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
    .map(getBranchDailyInputSettingName)
    .filter(Boolean);
}

function renderBranchDailyInputManagerOptions() {
  const currentManager = window.DMC_BRANCH_DAILY_INPUT_MANAGER;
  const managers = getBranchDailyInputManagers();

  if (managers.length === 0) {
    return `
      <option value="" ${currentManager === "" ? "selected" : ""}>
        Select manager
      </option>
      <option value="Branch Manager" ${
        currentManager === "Branch Manager" ? "selected" : ""
      }>
        Branch Manager
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

function itemBelongsToBranchDailyInput(item) {
  const operatingArea = String(item.operatingArea || "").toLowerCase();

  if (
    operatingArea.includes("warehouse") ||
    operatingArea.includes("stockroom") ||
    operatingArea.includes("commissary")
  ) {
    return false;
  }

  return item.active !== false;
}

function getAllBranchDailyInputItems() {
  return getBranchDailyInputMasterListItems().filter(itemBelongsToBranchDailyInput);
}

function getBranchDailyInputDepartments() {
  return [
    ...new Set(
      getAllBranchDailyInputItems()
        .map((item) => item.department || "Unassigned")
        .filter(Boolean)
    )
  ].sort();
}

function renderBranchDailyInputDepartmentOptions() {
  const currentDepartment = window.DMC_BRANCH_DAILY_INPUT_DEPARTMENT;

  return `
    <option value="all" ${currentDepartment === "all" ? "selected" : ""}>
      All Departments
    </option>
    ${getBranchDailyInputDepartments()
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

function getBranchDailyInputItems() {
  const selectedDepartment = String(
    window.DMC_BRANCH_DAILY_INPUT_DEPARTMENT || "all"
  ).toLowerCase();

  const searchValue = String(window.DMC_BRANCH_DAILY_INPUT_SEARCH || "")
    .toLowerCase()
    .trim();

  return getAllBranchDailyInputItems().filter((item) => {
    const itemDepartment = String(item.department || "Unassigned").toLowerCase();

    const matchesDepartment =
      selectedDepartment === "all" || itemDepartment === selectedDepartment;

    const matchesSearch =
      !searchValue ||
      String(item.itemId || "").toLowerCase().includes(searchValue) ||
      String(item.officialItemName || "").toLowerCase().includes(searchValue) ||
      String(item.department || "").toLowerCase().includes(searchValue) ||
      String(item.unit || "").toLowerCase().includes(searchValue);

    return matchesDepartment && matchesSearch;
  });
}

function entryBelongsToBranchDailyInput(entry) {
  const location = String(entry.location || entry.branch || "").toLowerCase();
  const source = String(entry.source || "").toLowerCase();
  const destination = String(entry.destination || "").toLowerCase();

  if (
    location.includes("warehouse") ||
    source.includes("warehouse daily input")
  ) {
    return false;
  }

  return (
    location.includes("dmc-iriga") ||
    location.includes("branch") ||
    destination.includes("dmc-iriga") ||
    destination.includes("branch") ||
    source.includes("incoming delivery receipt") ||
    source.includes("branch daily input") ||
    !entry.location
  );
}

function getBranchDailyInputLedgerEntriesForItem(itemId) {
  return getBranchDailyInputLedgerEntries().filter(
    (entry) =>
      entryBelongsToBranchDailyInput(entry) &&
      String(entry.itemId || "") === String(itemId || "")
  );
}

function getEntryTimeForBranchDailyInput(entry) {
  return String(entry.submittedAt || entry.date || "");
}

function getLatestRemainingCountEntry(itemId) {
  const entries = getBranchDailyInputLedgerEntriesForItem(itemId).filter(
    (entry) => entry.movementType === "Remaining Count"
  );

  if (entries.length === 0) {
    return null;
  }

  return [...entries].sort((a, b) => {
    return getEntryTimeForBranchDailyInput(b).localeCompare(
      getEntryTimeForBranchDailyInput(a)
    );
  })[0];
}

function calculateBranchDailyCurrentStock(item) {
  const entries = getBranchDailyInputLedgerEntriesForItem(item.itemId);
  const latestRemainingCount = getLatestRemainingCountEntry(item.itemId);

  if (latestRemainingCount) {
    const latestCountTime = getEntryTimeForBranchDailyInput(latestRemainingCount);
    const baseStock = Number(latestRemainingCount.quantity || 0);

    return entries
      .filter((entry) => {
        if (entry === latestRemainingCount) {
          return false;
        }

        return getEntryTimeForBranchDailyInput(entry) > latestCountTime;
      })
      .reduce((total, entry) => {
        const quantity = Number(entry.quantity || 0);

        if (entry.movementType === "Remaining Count") {
          return Number(entry.quantity || total);
        }

        if (entry.stockEffect === "add") {
          return total + quantity;
        }

        if (entry.stockEffect === "deduct") {
          return total - quantity;
        }

        if (
          entry.movementType === "Transfer In" ||
          entry.movementType === "Received"
        ) {
          return total + quantity;
        }

        return total;
      }, baseStock);
  }

  return entries.reduce((total, entry) => {
    const quantity = Number(entry.quantity || 0);

    if (entry.stockEffect === "add") {
      return total + quantity;
    }

    if (entry.stockEffect === "deduct") {
      return total - quantity;
    }

    if (
      entry.movementType === "Transfer In" ||
      entry.movementType === "Received"
    ) {
      return total + quantity;
    }

    if (
      entry.movementType === "Usage" ||
      entry.movementType === "Waste" ||
      entry.movementType === "Transfer Out"
    ) {
      return total - quantity;
    }

    return total;
  }, 0);
}

function getBranchDailyInputValue(inputData, itemId, fieldName) {
  return inputData?.[itemId]?.[fieldName] || "";
}

function getBranchDailyNumberValue(inputData, itemId, fieldName) {
  const rawValue = String(getBranchDailyInputValue(inputData, itemId, fieldName))
    .trim();

  if (rawValue === "") {
    return 0;
  }

  const parsedValue = Number(rawValue);

  return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

function getBranchDailyComputedValues(item, inputData) {
  const currentStock = calculateBranchDailyCurrentStock(item);
  const transIn = getBranchDailyNumberValue(inputData, item.itemId, "transferIn");
  const transOutCommissary = getBranchDailyNumberValue(
    inputData,
    item.itemId,
    "transOutCommissary"
  );
  const remaining = getBranchDailyNumberValue(inputData, item.itemId, "remaining");
  const waste = getBranchDailyNumberValue(inputData, item.itemId, "waste");

  const totalAvailable = currentStock + transIn;
  const hasRemaining =
    String(getBranchDailyInputValue(inputData, item.itemId, "remaining")).trim() !== "";

  const usageAuto = hasRemaining
    ? totalAvailable - transOutCommissary - remaining - waste
    : "";

  return {
    currentStock,
    transIn,
    transOutCommissary,
    remaining,
    waste,
    totalAvailable,
    usageAuto
  };
}

function getBranchDailyReviewStatus(item, rowData) {
  const inputFields = [
    "transferIn",
    "transOutCommissary",
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
    "transferIn",
    "transOutCommissary",
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

  const inputData = getBranchDailyInputStoredRows();
  const computed = getBranchDailyComputedValues(item, inputData);

  if (computed.usageAuto !== "" && computed.usageAuto < 0) {
    return "CHECK";
  }

  return "READY";
}

function getBranchDailyReviewRows() {
  const inputData = getBranchDailyInputStoredRows();

  return getAllBranchDailyInputItems()
    .map((item) => {
      const rowData = inputData[item.itemId] || {};
      const reviewStatus = getBranchDailyReviewStatus(item, rowData);
      const computed = getBranchDailyComputedValues(item, inputData);

      return {
        item,
        rowData,
        reviewStatus,
        computed
      };
    })
    .filter((row) => row.reviewStatus === "READY");
}

function getBranchDailyInputSummary() {
  const inputData = getBranchDailyInputStoredRows();

  const rows = getAllBranchDailyInputItems().map((item) => {
    const rowData = inputData[item.itemId] || {};
    const reviewStatus = getBranchDailyReviewStatus(item, rowData);

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

function getTodayDateStringForBranchDailyInput() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentBranchDailyInputTimestamp() {
  return new Date().toISOString();
}

function getReadableBranchDailyInputTimestamp() {
  const now = new Date();

  return now.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function createBranchDailyInputBatchId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replaceAll("-", "");
  const timePart = now.toTimeString().slice(0, 8).replaceAll(":", "");

  return `BR-DI-${datePart}-${timePart}`;
}

function buildBranchLedgerEntriesFromDailyInput() {
  const reviewRows = getBranchDailyReviewRows();
  const batchId = createBranchDailyInputBatchId();
  const submittedAt = getCurrentBranchDailyInputTimestamp();
  const submittedAtDisplay = getReadableBranchDailyInputTimestamp();
  const managerReviewedBy = window.DMC_BRANCH_DAILY_INPUT_MANAGER;

  const entries = [];

  reviewRows.forEach(({ item, rowData, computed }) => {
    const notes = String(rowData.notes || "").trim();
    const hasRemaining = String(rowData.remaining || "").trim() !== "";

    if (computed.transIn > 0) {
      entries.push({
        date: getTodayDateStringForBranchDailyInput(),
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "DMC-Iriga Branch",
        department: item.department || "",
        section: item.section || "",
        itemId: item.itemId || "",
        itemName: item.officialItemName || "",
        movementType: "Transfer In",
        movementField: "transferIn",
        stockEffect: "add",
        quantity: computed.transIn,
        unit: item.unit || "",
        managerReviewedBy,
        source: "Branch Daily Input",
        destination: "DMC-Iriga Branch",
        notes
      });
    }

    if (computed.transOutCommissary > 0) {
      entries.push({
        date: getTodayDateStringForBranchDailyInput(),
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "DMC-Iriga Branch",
        department: item.department || "",
        section: item.section || "",
        itemId: item.itemId || "",
        itemName: item.officialItemName || "",
        movementType: "Transfer Out",
        movementField: "transOutCommissary",
        stockEffect: "deduct",
        quantity: computed.transOutCommissary,
        unit: item.unit || "",
        managerReviewedBy,
        source: "Branch Daily Input",
        destination: "DMC Commissary",
        notes
      });
    }

    if (hasRemaining && computed.usageAuto > 0) {
      entries.push({
        date: getTodayDateStringForBranchDailyInput(),
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "DMC-Iriga Branch",
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
        source: "Branch Daily Input",
        destination: "Usage Report",
        notes
      });
    }

    if (computed.waste > 0) {
      entries.push({
        date: getTodayDateStringForBranchDailyInput(),
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "DMC-Iriga Branch",
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
        source: "Branch Daily Input",
        destination: "Waste Report",
        notes
      });
    }

    if (hasRemaining) {
      entries.push({
        date: getTodayDateStringForBranchDailyInput(),
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "DMC-Iriga Branch",
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
        source: "Branch Daily Input Closing Count",
        destination: "DMC-Iriga Branch",
        notes: [
          `Closing count submitted by ${managerReviewedBy || "branch manager"}.`,
          `Current: ${computed.currentStock}`,
          `Trans In: ${computed.transIn}`,
          `Trans Out Commissary: ${computed.transOutCommissary}`,
          `Total Available: ${computed.totalAvailable}`,
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
      computed.transOutCommissary <= 0 &&
      computed.waste <= 0
    ) {
      entries.push({
        date: getTodayDateStringForBranchDailyInput(),
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "DMC-Iriga Branch",
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
        source: "Branch Daily Input",
        destination: "Branch Notes",
        notes
      });
    }
  });

  return entries;
}

function renderBranchDailyInputRows() {
  const allBranchItems = getAllBranchDailyInputItems();
  const branchItems = getBranchDailyInputItems();
  const inputData = getBranchDailyInputStoredRows();

  if (allBranchItems.length === 0) {
    return `
      <tr>
        <td colspan="12">
          No Branch items found. Add branch items in the Master List first.
        </td>
      </tr>
    `;
  }

  if (branchItems.length === 0) {
    return `
      <tr>
        <td colspan="12">
          No Branch items found for the selected filter.
        </td>
      </tr>
    `;
  }

  return branchItems
    .map((item) => {
      const rowData = inputData[item.itemId] || {};
      const reviewStatus = getBranchDailyReviewStatus(item, rowData);
      const computed = getBranchDailyComputedValues(item, inputData);

      return `
        <tr>
          <td>${item.itemId || "-"}</td>
          <td>${item.officialItemName || "-"}</td>
          <td>${item.unit || "-"}</td>
          <td>${computed.currentStock} ${item.unit || ""}</td>

          <td>
            <input
              class="daily-input-cell branch-daily-input-cell"
              data-item-id="${item.itemId}"
              data-field="transferIn"
              type="number"
              min="0"
              step="any"
              value="${getBranchDailyInputValue(inputData, item.itemId, "transferIn")}"
            />
          </td>

          <td>${computed.totalAvailable} ${item.unit || ""}</td>

          <td>
            <input
              class="daily-input-cell branch-daily-input-cell"
              data-item-id="${item.itemId}"
              data-field="transOutCommissary"
              type="number"
              min="0"
              step="any"
              value="${getBranchDailyInputValue(inputData, item.itemId, "transOutCommissary")}"
            />
          </td>

          <td>
            <input
              class="daily-input-cell branch-daily-input-cell blue-input"
              data-item-id="${item.itemId}"
              data-field="remaining"
              type="number"
              min="0"
              step="any"
              value="${getBranchDailyInputValue(inputData, item.itemId, "remaining")}"
            />
          </td>

          <td>
            <input
              class="daily-input-cell branch-daily-input-cell blue-input"
              data-item-id="${item.itemId}"
              data-field="waste"
              type="number"
              min="0"
              step="any"
              value="${getBranchDailyInputValue(inputData, item.itemId, "waste")}"
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
              class="daily-input-cell branch-daily-input-cell notes-input"
              data-item-id="${item.itemId}"
              data-field="notes"
              type="text"
              value="${getBranchDailyInputValue(inputData, item.itemId, "notes")}"
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

function renderBranchDailyEditModeContent() {
  return `
    <div class="keyboard-hint">
      Press Tab to move across Trans In → Trans Out Commissary → Remaining → Waste → Notes, then continue to the next row.
    </div>

    <div class="instruction-box">
      <strong>Branch Daily Logic:</strong>
      <span>
        Blank rows are ignored. Managers can enter only the fields needed for that day.
        Usage is auto-computed only when Remaining is entered.
        Trans Out Commissary deducts from Branch Stock and will be received later by Commissary.
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
            <th>Trans Out Commissary</th>
            <th>Remaining</th>
            <th>Waste</th>
            <th>Usage Auto</th>
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

function renderBranchDailyReviewModeContent() {
  const reviewRows = getBranchDailyReviewRows();

  if (reviewRows.length === 0) {
    return `
      <div class="submit-preview-box">
        <h4>Branch Submit Review</h4>
        <p>No rows are ready to post. Go back to edit mode and enter at least one field on one row.</p>

        <div class="form-actions review-actions">
          <button class="ghost-button" id="back-to-branch-daily-edit-mode">
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
          <h4>Branch Submit Review</h4>
          <p>
            ${reviewRows.length} item row${
    reviewRows.length === 1 ? "" : "s"
  } ready to post. Fully blank rows are ignored.
          </p>
        </div>

        <div class="form-actions review-actions">
          <button class="ghost-button" id="back-to-branch-daily-edit-mode">
            Back to Edit
          </button>

          <button class="primary-button" id="submit-branch-daily-input">
            Submit to Branch Log
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
              <th>Trans Out Commissary</th>
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
                    <td>${computed.transIn || "-"}</td>
                    <td>${computed.totalAvailable}</td>
                    <td>${computed.transOutCommissary || "-"}</td>
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

function getBranchDailyInputContent() {
  const isReviewMode = window.DMC_BRANCH_DAILY_INPUT_MODE === "review";
  const summary = getBranchDailyInputSummary();

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
          <h3>Branch Daily Input — Today Only</h3>
          <p>
            Enter end-of-shift counts, waste, branch-to-commissary transfer outs, and notes only for items that had activity.
          </p>
        </div>

        <div class="form-actions">
          ${
            isReviewMode
              ? `<button class="ghost-button" id="back-to-branch-daily-edit-mode-top">Back to Edit</button>`
              : `<button class="primary-button" id="ready-for-branch-daily-review">Ready for Review</button>`
          }

          <button class="ghost-button" id="clear-branch-daily-input">
            Clear Today
          </button>
        </div>
      </div>

      <div class="warehouse-daily-input-toolbar">
        <label>
          Department
          <select id="branch-daily-input-department" ${
            isReviewMode ? "disabled" : ""
          }>
            ${renderBranchDailyInputDepartmentOptions()}
          </select>
        </label>

        <label class="filter-search">
          Search
          <input
            id="branch-daily-input-search"
            type="text"
            placeholder="Search item name or Item ID..."
            value="${window.DMC_BRANCH_DAILY_INPUT_SEARCH}"
            ${isReviewMode ? "disabled" : ""}
          />
        </label>

        <label>
          Manager Reviewed By
          <select id="branch-daily-manager-reviewed-by" ${
            isReviewMode ? "disabled" : ""
          }>
            ${renderBranchDailyInputManagerOptions()}
          </select>
        </label>
      </div>

      ${
        isReviewMode
          ? renderBranchDailyReviewModeContent()
          : renderBranchDailyEditModeContent()
      }
    </section>
  `;
}

function refreshBranchDailyInputPage() {
  window.DMC_PAGES["branch-daily-input"].content = getBranchDailyInputContent();
  renderPage("branch-daily-input");
}

function returnToBranchDailyEditMode() {
  window.DMC_BRANCH_DAILY_INPUT_MODE = "edit";
  refreshBranchDailyInputPage();
}

function showBranchDailyInputModal({ type, title, message, confirmLabel }) {
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

function showBranchDailyInputConfirm({
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

function saveBranchDailyCellValue(input) {
  const inputData = getBranchDailyInputStoredRows();
  const itemId = input.dataset.itemId;
  const field = input.dataset.field;

  inputData[itemId] = inputData[itemId] || {};
  inputData[itemId][field] = input.value;

  saveBranchDailyInputRows(inputData);
}

function saveAllVisibleBranchDailyInputs() {
  const inputData = getBranchDailyInputStoredRows();

  document.querySelectorAll(".branch-daily-input-cell").forEach((input) => {
    const itemId = input.dataset.itemId;
    const field = input.dataset.field;

    inputData[itemId] = inputData[itemId] || {};
    inputData[itemId][field] = input.value;
  });

  saveBranchDailyInputRows(inputData);
}

function focusNextBranchDailyInput(currentInput, direction = 1) {
  const inputs = Array.from(
    document.querySelectorAll(".branch-daily-input-cell")
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

function setupBranchDailyInputEvents() {
  const departmentSelect = document.getElementById(
    "branch-daily-input-department"
  );

  if (departmentSelect) {
    departmentSelect.addEventListener("change", () => {
      window.DMC_BRANCH_DAILY_INPUT_DEPARTMENT = departmentSelect.value;
      window.DMC_BRANCH_DAILY_INPUT_MODE = "edit";
      refreshBranchDailyInputPage();
    });
  }

  const searchInput = document.getElementById("branch-daily-input-search");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      window.DMC_BRANCH_DAILY_INPUT_SEARCH = searchInput.value;
      refreshBranchDailyInputPage();
    });
  }

  const managerSelect = document.getElementById(
    "branch-daily-manager-reviewed-by"
  );

  if (managerSelect) {
    managerSelect.addEventListener("change", () => {
      window.DMC_BRANCH_DAILY_INPUT_MANAGER = managerSelect.value;
    });
  }

  document.querySelectorAll(".branch-daily-input-cell").forEach((input) => {
  input.addEventListener("input", () => {
    const activeItemId = input.dataset.itemId;
    const activeField = input.dataset.field;
    const cursorPosition = input.selectionStart;

    saveBranchDailyCellValue(input);
    refreshBranchDailyInputPage();

    const refreshedInput = document.querySelector(
      `.branch-daily-input-cell[data-item-id="${activeItemId}"][data-field="${activeField}"]`
    );

    if (refreshedInput) {
      refreshedInput.focus();

      if (typeof cursorPosition === "number") {
        refreshedInput.setSelectionRange(cursorPosition, cursorPosition);
      }
    }
  });

  input.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") {
      return;
    }

    event.preventDefault();
    saveBranchDailyCellValue(input);

    focusNextBranchDailyInput(input, event.shiftKey ? -1 : 1);
  });
});

  const readyButton = document.getElementById("ready-for-branch-daily-review");

  if (readyButton) {
    readyButton.addEventListener("click", () => {
      saveAllVisibleBranchDailyInputs();

      const branchEntries = buildBranchLedgerEntriesFromDailyInput();
      const summary = getBranchDailyInputSummary();

      if (!window.DMC_BRANCH_DAILY_INPUT_MANAGER) {
        showBranchDailyInputModal({
          type: "warning",
          title: "Manager Required",
          message:
            "Please choose the manager who reviewed this Branch Daily Input before continuing.",
          confirmLabel: "Got it"
        });
        return;
      }

      if (branchEntries.length === 0) {
        showBranchDailyInputModal({
          type: "warning",
          title: "No Rows Ready",
          message:
            "No Branch Daily Input rows are ready for review yet. Enter at least one field on one item. Fully blank rows are ignored.",
          confirmLabel: "Got it"
        });
        return;
      }

      if (summary.checkRows > 0) {
        showBranchDailyInputModal({
          type: "warning",
          title: "Rows Need Review",
          message:
            "Some rows still need review. Please fix CHECK rows before posting.",
          confirmLabel: "Got it"
        });
        return;
      }

      window.DMC_BRANCH_DAILY_INPUT_MODE = "review";
      refreshBranchDailyInputPage();
    });
  }

  const backButtons = [
    document.getElementById("back-to-branch-daily-edit-mode"),
    document.getElementById("back-to-branch-daily-edit-mode-top")
  ];

  backButtons.forEach((button) => {
    if (button) {
      button.addEventListener("click", returnToBranchDailyEditMode);
    }
  });

  document.querySelectorAll("[data-preview-edit]").forEach((button) => {
    button.addEventListener("click", returnToBranchDailyEditMode);
  });

  document.querySelectorAll("[data-preview-remove-row]").forEach((button) => {
    button.addEventListener("click", () => {
      const itemId = button.dataset.previewRemoveRow;
      const inputData = getBranchDailyInputStoredRows();

      delete inputData[itemId];

      saveBranchDailyInputRows(inputData);
      refreshBranchDailyInputPage();
    });
  });

  const clearButton = document.getElementById("clear-branch-daily-input");

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      showBranchDailyInputConfirm({
        type: "danger",
        title: "Clear Branch Daily Input?",
        message:
          "This will clear today’s Branch Daily Input rows. This does not affect already submitted Branch Log entries.",
        confirmLabel: "Clear Today",
        cancelLabel: "Cancel",
        onConfirm: () => {
          localStorage.removeItem(DMC_BRANCH_DAILY_INPUT_TODAY_KEY);
          window.DMC_BRANCH_DAILY_INPUT_MODE = "edit";
          refreshBranchDailyInputPage();
        }
      });
    });
  }

  const submitButton = document.getElementById("submit-branch-daily-input");

  if (submitButton) {
    submitButton.addEventListener("click", () => {
      const newBranchEntries = buildBranchLedgerEntriesFromDailyInput();

      if (newBranchEntries.length === 0) {
        showBranchDailyInputModal({
          type: "warning",
          title: "No Branch Entries",
          message: "No Branch Daily Input entries are ready to submit.",
          confirmLabel: "Got it"
        });
        return;
      }

      showBranchDailyInputConfirm({
        type: "success",
        title: "Submit Branch Daily Input?",
        message: `Submit ${newBranchEntries.length} Branch Log entries and clear today’s input?`,
        confirmLabel: "Submit Entries",
        cancelLabel: "Cancel",
        onConfirm: () => {
          const currentLedgerEntries = getBranchDailyInputLedgerEntries();
          const updatedLedgerEntries = [...currentLedgerEntries, ...newBranchEntries];

          saveBranchDailyInputLedgerEntries(updatedLedgerEntries);
          localStorage.removeItem(DMC_BRANCH_DAILY_INPUT_TODAY_KEY);

          window.DMC_BRANCH_DAILY_INPUT_MODE = "edit";

          showBranchDailyInputModal({
            type: "success",
            title: "Branch Daily Input Submitted",
            message:
              "Branch Daily Input was submitted to Branch Log Transaction.",
            confirmLabel: "Continue"
          });

          refreshBranchDailyInputPage();
        }
      });
    });
  }
}

window.DMC_PAGES["branch-daily-input"] = {
  eyebrow: "DMC-Iriga Branch",
  title: "Branch Daily Input",
  description:
    "End-of-shift branch count sheet with auto-computed usage, transfer out to commissary, and remaining stock.",
  getContent: getBranchDailyInputContent,
  content: getBranchDailyInputContent(),
  afterRender: setupBranchDailyInputEvents
};
