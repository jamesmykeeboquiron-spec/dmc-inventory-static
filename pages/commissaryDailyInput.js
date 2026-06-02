window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_COMMISSARY_DAILY_STOCK_KEY = "dmc_commissary_stock_items";
const DMC_COMMISSARY_DAILY_MASTER_LIST_KEY = "dmc_master_list_items";
const DMC_COMMISSARY_DAILY_LEDGER_KEY = "dmc_inventory_ledger_entries";

window.DMC_COMMISSARY_DAILY_FILTERS = window.DMC_COMMISSARY_DAILY_FILTERS || {
  section: "all",
  search: ""
};

window.DMC_COMMISSARY_DAILY_INPUTS =
  window.DMC_COMMISSARY_DAILY_INPUTS || {};

window.DMC_COMMISSARY_DAILY_REVIEWED_BY =
  window.DMC_COMMISSARY_DAILY_REVIEWED_BY || "";

function getStoredCommissaryDailyStockItems() {
  const storedItems = localStorage.getItem(DMC_COMMISSARY_DAILY_STOCK_KEY);

  if (!storedItems) {
    return window.DMC_DATA?.commissaryStock || [];
  }

  try {
    const parsedItems = JSON.parse(storedItems);
    return Array.isArray(parsedItems) ? parsedItems : [];
  } catch {
    return window.DMC_DATA?.commissaryStock || [];
  }
}

function getStoredCommissaryDailyMasterListItems() {
  const storedItems = localStorage.getItem(DMC_COMMISSARY_DAILY_MASTER_LIST_KEY);

  if (!storedItems) {
    return [];
  }

  try {
    const parsedItems = JSON.parse(storedItems);
    return Array.isArray(parsedItems) ? parsedItems : [];
  } catch {
    return [];
  }
}

function getStoredCommissaryDailyLedgerEntries() {
  const storedEntries = localStorage.getItem(DMC_COMMISSARY_DAILY_LEDGER_KEY);

  if (!storedEntries) {
    return window.DMC_DATA?.ledger || [];
  }

  try {
    const parsedEntries = JSON.parse(storedEntries);
    return Array.isArray(parsedEntries) ? parsedEntries : [];
  } catch {
    return window.DMC_DATA?.ledger || [];
  }
}

function saveCommissaryDailyLedgerEntries(entries) {
  localStorage.setItem(DMC_COMMISSARY_DAILY_LEDGER_KEY, JSON.stringify(entries));
}

function getCommissaryDailySettings() {
  const storedSettings = localStorage.getItem("dmc_inventory_settings");

  if (!storedSettings) {
    return {
      managerNames: [],
      managers: [],
      staffNames: [],
      staff: [],
      staffMembers: []
    };
  }

  try {
    return JSON.parse(storedSettings);
  } catch {
    return {
      managerNames: [],
      managers: [],
      staffNames: [],
      staff: [],
      staffMembers: []
    };
  }
}

function getCommissaryDailySettingName(option) {
  if (typeof option === "string") {
    return option;
  }

  return option?.name || option?.fullName || option?.label || "";
}

function getCommissaryDailyReviewers() {
  const settings = getCommissaryDailySettings();

  const managerSources = [
    ...(settings.managerNames || []),
    ...(settings.managers || [])
  ];

  const staffManagers = (settings.staffMembers || settings.staff || []).filter(
    (staff) => {
      const role = String(staff.role || staff.position || staff.access || "")
        .toLowerCase();

      return role.includes("manager") || role.includes("admin");
    }
  );

  return [...managerSources, ...staffManagers]
    .map(getCommissaryDailySettingName)
    .filter(Boolean);
}

function renderCommissaryDailyReviewerOptions(currentValue) {
  const reviewers = getCommissaryDailyReviewers();

  if (reviewers.length === 0) {
    return `
      <option value="" ${!currentValue ? "selected" : ""}>Select reviewer</option>
      <option value="Commissary Manager" ${
        currentValue === "Commissary Manager" ? "selected" : ""
      }>Commissary Manager</option>
      <option value="Admin Staff" ${
        currentValue === "Admin Staff" ? "selected" : ""
      }>Admin Staff</option>
    `;
  }

  return `
    <option value="" ${!currentValue ? "selected" : ""}>Select reviewer</option>
    ${reviewers
      .map(
        (reviewer) => `
          <option value="${reviewer}" ${
          currentValue === reviewer ? "selected" : ""
        }>
            ${reviewer}
          </option>
        `
      )
      .join("")}
  `;
}

function showCommissaryDailyModal({ type, title, message, confirmLabel }) {
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

function showCommissaryDailyConfirm({
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

function getCommissaryDailyTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getCommissaryDailyReadableTimestamp() {
  const now = new Date();

  return now.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function itemBelongsToCommissaryDaily(item) {
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

function getCommissaryDailyBaseItems() {
  const stockItems = getStoredCommissaryDailyStockItems();
  const masterListItems = getStoredCommissaryDailyMasterListItems().filter(
    itemBelongsToCommissaryDaily
  );

  const combinedById = {};

  [...stockItems, ...masterListItems].forEach((item) => {
    const itemId = String(item.itemId || "").trim();

    if (!itemId) {
      return;
    }

    combinedById[itemId] = {
      ...combinedById[itemId],
      ...item
    };
  });

  return Object.values(combinedById);
}

function entryBelongsToCommissaryDaily(entry) {
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

function getCommissaryDailyLedgerEntriesOnly() {
  return getStoredCommissaryDailyLedgerEntries().filter(
    entryBelongsToCommissaryDaily
  );
}

function getCommissaryDailyEntriesForItem(itemId) {
  return getCommissaryDailyLedgerEntriesOnly().filter(
    (entry) => String(entry.itemId || "") === String(itemId || "")
  );
}

function getCommissaryDailyEntryTime(entry) {
  return String(entry.submittedAt || entry.date || "");
}

function getCommissaryDailyEntryStockEffect(entry) {
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

function getLatestCommissaryDailyRemainingCount(itemId) {
  const remainingEntries = getCommissaryDailyEntriesForItem(itemId).filter(
    (entry) =>
      entry.movementType === "Remaining Count" || entry.stockEffect === "set"
  );

  if (remainingEntries.length === 0) {
    return null;
  }

  return [...remainingEntries].sort((a, b) => {
    return getCommissaryDailyEntryTime(b).localeCompare(
      getCommissaryDailyEntryTime(a)
    );
  })[0];
}

function getCommissaryDailyOpeningStockValue(item) {
  const openingStock =
    item.currentStock ??
    item.startingStock ??
    item.openingStock ??
    item.quantity ??
    0;

  const parsedStock = Number(openingStock);

  return Number.isNaN(parsedStock) ? 0 : parsedStock;
}

function calculateCommissaryDailyCurrentStock(item) {
  const entries = getCommissaryDailyEntriesForItem(item.itemId);
  const latestRemainingCount = getLatestCommissaryDailyRemainingCount(
    item.itemId
  );

  if (latestRemainingCount) {
    const latestRemainingTime = getCommissaryDailyEntryTime(
      latestRemainingCount
    );
    const startingFromRemaining = Number(latestRemainingCount.quantity || 0);

    return entries
      .filter((entry) => {
        if (entry === latestRemainingCount) {
          return false;
        }

        return getCommissaryDailyEntryTime(entry) > latestRemainingTime;
      })
      .reduce((total, entry) => {
        const quantity = Number(entry.quantity || 0);
        const stockEffect = getCommissaryDailyEntryStockEffect(entry);

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
      }, startingFromRemaining);
  }

  return entries.reduce((total, entry) => {
    const quantity = Number(entry.quantity || 0);
    const stockEffect = getCommissaryDailyEntryStockEffect(entry);

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
  }, getCommissaryDailyOpeningStockValue(item));
}

function getCommissaryDailyInputForItem(itemId) {
  window.DMC_COMMISSARY_DAILY_INPUTS[itemId] =
    window.DMC_COMMISSARY_DAILY_INPUTS[itemId] || {
      transferIn: "",
      transferOut: "",
      remaining: "",
      waste: "",
      notes: ""
    };

  return window.DMC_COMMISSARY_DAILY_INPUTS[itemId];
}

function getCommissaryDailyNumber(value) {
  const numberValue = Number(value || 0);

  return Number.isNaN(numberValue) ? 0 : numberValue;
}

function getCommissaryDailyTotalAvailable(item) {
  const input = getCommissaryDailyInputForItem(item.itemId);
  const current = getCommissaryDailyNumber(item.currentStock);
  const transferIn = getCommissaryDailyNumber(input.transferIn);

  return current + transferIn;
}

function getCommissaryDailyUsage(item) {
  const input = getCommissaryDailyInputForItem(item.itemId);
  const remainingValue = input.remaining;

  if (
    remainingValue === "" ||
    remainingValue === null ||
    remainingValue === undefined
  ) {
    return "";
  }

  const remaining = Number(remainingValue);

  if (Number.isNaN(remaining)) {
    return "";
  }

  const totalAvailable = getCommissaryDailyTotalAvailable(item);
  const transferOut = getCommissaryDailyNumber(input.transferOut);
  const usage = totalAvailable - transferOut - remaining;

  return usage < 0 ? 0 : usage;
}

function normalizeCommissaryDailyItem(item) {
  const normalizedItem = {
    itemId: item.itemId || "-",
    itemName: item.officialItemName || item.itemName || item.name || "-",
    section: item.section || "Unassigned",
    unit: item.unit || "-",
    minimumStock: Number(item.minimumStock || 0),
    notes: item.notes || item.note || ""
  };

  const currentStock = calculateCommissaryDailyCurrentStock(normalizedItem);

  return {
    ...normalizedItem,
    currentStock
  };
}

function getCommissaryDailyRows() {
  return getCommissaryDailyBaseItems().map(normalizeCommissaryDailyItem);
}

function getCommissaryDailySections() {
  return [
    ...new Set(getCommissaryDailyRows().map((item) => item.section))
  ]
    .filter(Boolean)
    .sort();
}

function getFilteredCommissaryDailyRows() {
  const filters = window.DMC_COMMISSARY_DAILY_FILTERS;
  const searchValue = String(filters.search || "").toLowerCase().trim();
  const selectedSection = String(filters.section || "all").toLowerCase();

  return getCommissaryDailyRows().filter((item) => {
    const itemSection = String(item.section || "").toLowerCase();

    const matchesSection =
      selectedSection === "all" || itemSection === selectedSection;

    const matchesSearch =
      !searchValue ||
      String(item.itemId || "").toLowerCase().includes(searchValue) ||
      String(item.itemName || "").toLowerCase().includes(searchValue) ||
      String(item.section || "").toLowerCase().includes(searchValue) ||
      String(item.unit || "").toLowerCase().includes(searchValue);

    return matchesSection && matchesSearch;
  });
}

function getCommissaryDailyReviewStatus(item) {
  const input = getCommissaryDailyInputForItem(item.itemId);

  const hasTransferIn = String(input.transferIn || "").trim() !== "";
  const hasTransferOut = String(input.transferOut || "").trim() !== "";
  const hasRemaining = String(input.remaining || "").trim() !== "";
  const hasWaste = String(input.waste || "").trim() !== "";
  const hasNotes = String(input.notes || "").trim() !== "";

  if (!hasTransferIn && !hasTransferOut && !hasRemaining && !hasWaste && !hasNotes) {
    return "";
  }

  const fieldsToCheck = [
    input.transferIn,
    input.transferOut,
    input.remaining,
    input.waste
  ];

  const hasInvalidNumber = fieldsToCheck.some((value) => {
    if (String(value || "").trim() === "") {
      return false;
    }

    return Number.isNaN(Number(value)) || Number(value) < 0;
  });

  if (hasInvalidNumber) {
    return "CHECK";
  }

  return "READY";
}

function renderCommissaryDailySectionOptions() {
  const currentSection = window.DMC_COMMISSARY_DAILY_FILTERS.section;

  return `
    <option value="all" ${currentSection === "all" ? "selected" : ""}>
      All Sections
    </option>
    ${getCommissaryDailySections()
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

function renderCommissaryDailyRows() {
  const rows = getFilteredCommissaryDailyRows();

  if (rows.length === 0) {
    return `
      <tr>
        <td colspan="12">No commissary items match the current filters.</td>
      </tr>
    `;
  }

  return rows
    .map((item) => {
      const input = getCommissaryDailyInputForItem(item.itemId);
      const totalAvailable = getCommissaryDailyTotalAvailable(item);
      const usage = getCommissaryDailyUsage(item);
      const reviewStatus = getCommissaryDailyReviewStatus(item);

      return `
        <tr>
          <td>${item.itemId}</td>
          <td>
            <strong>${item.itemName}</strong>
            <small class="table-subtext">${item.section}</small>
          </td>
          <td>${item.unit}</td>
          <td>${item.currentStock}</td>
          <td>
            <input
              class="commissary-daily-input"
              data-commissary-transfer-in="${item.itemId}"
              type="number"
              min="0"
              step="any"
              value="${input.transferIn}"
              placeholder="0"
            />
          </td>
          <td>
            <strong>${totalAvailable}</strong>
          </td>
          <td>
            <input
              class="commissary-daily-input"
              data-commissary-transfer-out="${item.itemId}"
              type="number"
              min="0"
              step="any"
              value="${input.transferOut}"
              placeholder="0"
            />
          </td>
          <td>
            <input
              class="commissary-daily-input"
              data-commissary-remaining="${item.itemId}"
              type="number"
              min="0"
              step="any"
              value="${input.remaining}"
              placeholder="Count"
            />
          </td>
          <td>${usage === "" ? "-" : usage}</td>
          <td>
            <input
              class="commissary-daily-input"
              data-commissary-waste="${item.itemId}"
              type="number"
              min="0"
              step="any"
              value="${input.waste}"
              placeholder="Optional"
            />
          </td>
          <td>
            <input
              class="commissary-daily-notes"
              data-commissary-notes="${item.itemId}"
              type="text"
              value="${input.notes}"
              placeholder="Optional"
            />
          </td>
          <td>
            ${
              reviewStatus
                ? `<span class="badge ${
                    reviewStatus === "READY" ? "success" : "warning-badge"
                  }">${reviewStatus}</span>`
                : `<span class="muted-text">No input</span>`
            }
          </td>
        </tr>
      `;
    })
    .join("");
}

function getCommissaryDailyFilledRows() {
  return getCommissaryDailyRows().filter((item) => {
    const input = getCommissaryDailyInputForItem(item.itemId);

    return (
      String(input.transferIn || "").trim() !== "" ||
      String(input.transferOut || "").trim() !== "" ||
      String(input.remaining || "").trim() !== "" ||
      String(input.waste || "").trim() !== "" ||
      String(input.notes || "").trim() !== ""
    );
  });
}

function buildCommissaryDailyLedgerEntries({ reviewedBy }) {
  const submittedAt = new Date().toISOString();
  const submittedAtDisplay = getCommissaryDailyReadableTimestamp();
  const date = getCommissaryDailyTodayDate();
  const batchId = `COM-DI-${date.replaceAll("-", "")}-${Date.now()}`;

  const ledgerEntries = [];

  getCommissaryDailyFilledRows().forEach((item) => {
    const input = getCommissaryDailyInputForItem(item.itemId);

    const transferIn = getCommissaryDailyNumber(input.transferIn);
    const transferOut = getCommissaryDailyNumber(input.transferOut);
    const remaining = getCommissaryDailyNumber(input.remaining);
    const waste = getCommissaryDailyNumber(input.waste);
    const usage = getCommissaryDailyUsage(item);
    const notes = String(input.notes || "").trim();

    if (String(input.transferIn || "").trim() !== "" && transferIn > 0) {
      ledgerEntries.push({
        date,
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "Commissary",
        department: "Commissary",
        section: item.section || "",
        itemId: item.itemId || "",
        itemName: item.itemName || "",
        movementType: "Transfer In",
        movementField: "transferIn",
        stockEffect: "add",
        quantity: transferIn,
        unit: item.unit || "",
        managerReviewedBy: reviewedBy,
        source: "Commissary Daily Input Transfer In",
        destination: "Commissary",
        notes:
          notes ||
          "Items received from Warehouse, market, or production output."
      });
    }

    if (String(input.transferOut || "").trim() !== "" && transferOut > 0) {
      ledgerEntries.push({
        date,
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "Commissary",
        department: "Commissary",
        section: item.section || "",
        itemId: item.itemId || "",
        itemName: item.itemName || "",
        movementType: "Transfer Out",
        movementField: "transferOut",
        stockEffect: "deduct",
        quantity: transferOut,
        unit: item.unit || "",
        managerReviewedBy: reviewedBy,
        source: "Commissary Daily Input Transfer Out",
        destination: "Warehouse",
        notes:
          notes ||
          "Products/items sent from Commissary to Warehouse."
      });
    }

    if (String(input.remaining || "").trim() !== "") {
      ledgerEntries.push({
        date,
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "Commissary",
        department: "Commissary",
        section: item.section || "",
        itemId: item.itemId || "",
        itemName: item.itemName || "",
        movementType: "Remaining Count",
        movementField: "remaining",
        stockEffect: "set",
        quantity: remaining,
        unit: item.unit || "",
        managerReviewedBy: reviewedBy,
        source: "Commissary Daily Input Closing Count",
        destination: "Commissary",
        notes: notes || "Commissary closing count."
      });

      if (usage !== "" && Number(usage) > 0) {
        ledgerEntries.push({
          date,
          submittedAt,
          submittedAtDisplay,
          batchId,
          location: "Commissary",
          department: "Commissary",
          section: item.section || "",
          itemId: item.itemId || "",
          itemName: item.itemName || "",
          movementType: "Usage",
          movementField: "usage",
          stockEffect: "report",
          quantity: Number(usage),
          unit: item.unit || "",
          managerReviewedBy: reviewedBy,
          source: "Commissary Daily Input Auto Usage",
          destination: "Commissary",
          notes:
            "Auto-computed from Current + Trans In - Trans Out - Remaining."
        });
      }
    }

    if (String(input.waste || "").trim() !== "" && waste > 0) {
      ledgerEntries.push({
        date,
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "Commissary",
        department: "Commissary",
        section: item.section || "",
        itemId: item.itemId || "",
        itemName: item.itemName || "",
        movementType: "Waste",
        movementField: "waste",
        stockEffect: "report",
        quantity: waste,
        unit: item.unit || "",
        managerReviewedBy: reviewedBy,
        source: "Commissary Daily Input Waste Report",
        destination: "Commissary",
        notes:
          notes ||
          "Waste reported. Not double-deducted because Remaining Count sets physical stock."
      });
    }

    if (
      notes &&
      transferIn <= 0 &&
      transferOut <= 0 &&
      String(input.remaining || "").trim() === "" &&
      waste <= 0
    ) {
      ledgerEntries.push({
        date,
        submittedAt,
        submittedAtDisplay,
        batchId,
        location: "Commissary",
        department: "Commissary",
        section: item.section || "",
        itemId: item.itemId || "",
        itemName: item.itemName || "",
        movementType: "Daily Note",
        movementField: "notes",
        stockEffect: "report",
        quantity: 0,
        unit: item.unit || "",
        managerReviewedBy: reviewedBy,
        source: "Commissary Daily Input Note",
        destination: "Commissary",
        notes
      });
    }
  });

  return ledgerEntries;
}

function saveCommissaryDailyInputsFromPage() {
  document.querySelectorAll("[data-commissary-transfer-in]").forEach((input) => {
    const itemId = input.dataset.commissaryTransferIn;
    const currentInput = getCommissaryDailyInputForItem(itemId);

    currentInput.transferIn = input.value;
  });

  document.querySelectorAll("[data-commissary-transfer-out]").forEach((input) => {
    const itemId = input.dataset.commissaryTransferOut;
    const currentInput = getCommissaryDailyInputForItem(itemId);

    currentInput.transferOut = input.value;
  });

  document.querySelectorAll("[data-commissary-remaining]").forEach((input) => {
    const itemId = input.dataset.commissaryRemaining;
    const currentInput = getCommissaryDailyInputForItem(itemId);

    currentInput.remaining = input.value;
  });

  document.querySelectorAll("[data-commissary-waste]").forEach((input) => {
    const itemId = input.dataset.commissaryWaste;
    const currentInput = getCommissaryDailyInputForItem(itemId);

    currentInput.waste = input.value;
  });

  document.querySelectorAll("[data-commissary-notes]").forEach((input) => {
    const itemId = input.dataset.commissaryNotes;
    const currentInput = getCommissaryDailyInputForItem(itemId);

    currentInput.notes = input.value;
  });
}

function clearCommissaryDailyInputs() {
  window.DMC_COMMISSARY_DAILY_INPUTS = {};
}

function submitCommissaryDailyInput() {
  saveCommissaryDailyInputsFromPage();

  const reviewerInput = document.getElementById("commissary-daily-reviewed-by");
  const reviewedBy = reviewerInput?.value || "";

  if (!String(reviewedBy || "").trim()) {
    showCommissaryDailyModal({
      type: "warning",
      title: "Reviewed By Required",
      message: "Please select who reviewed this Commissary Daily Input.",
      confirmLabel: "Got it"
    });
    return;
  }

  const filledRows = getCommissaryDailyFilledRows();

  if (filledRows.length === 0) {
    showCommissaryDailyModal({
      type: "warning",
      title: "No Input Found",
      message:
        "Please enter at least one Trans In, Trans Out, Remaining count, Waste value, or Note before submitting.",
      confirmLabel: "Got it"
    });
    return;
  }

  const hasInvalidRows = filledRows.some((item) => {
    const input = getCommissaryDailyInputForItem(item.itemId);
    const fieldsToCheck = [
      input.transferIn,
      input.transferOut,
      input.remaining,
      input.waste
    ];

    return fieldsToCheck.some((value) => {
      if (String(value || "").trim() === "") {
        return false;
      }

      return Number.isNaN(Number(value)) || Number(value) < 0;
    });
  });

  if (hasInvalidRows) {
    showCommissaryDailyModal({
      type: "warning",
      title: "Check Input",
      message: "Trans In, Trans Out, Remaining, and Waste cannot be negative.",
      confirmLabel: "Got it"
    });
    return;
  }

  const ledgerEntries = buildCommissaryDailyLedgerEntries({ reviewedBy });

  if (ledgerEntries.length === 0) {
    showCommissaryDailyModal({
      type: "warning",
      title: "No Ledger Rows Created",
      message: "No valid rows were found to submit.",
      confirmLabel: "Got it"
    });
    return;
  }

  showCommissaryDailyConfirm({
    type: "success",
    title: "Submit Commissary Daily Input?",
    message: `Submit ${ledgerEntries.length} Commissary ledger row(s)?`,
    confirmLabel: "Submit",
    cancelLabel: "Cancel",
    onConfirm: () => {
      const currentLedger = getStoredCommissaryDailyLedgerEntries();

      saveCommissaryDailyLedgerEntries([...currentLedger, ...ledgerEntries]);
      clearCommissaryDailyInputs();

      showCommissaryDailyModal({
        type: "success",
        title: "Commissary Daily Input Submitted",
        message:
          "Commissary ledger entries were posted. Trans In/Out updated stock, Remaining Count is the stock truth, and Usage/Waste were recorded for reports.",
        confirmLabel: "Continue"
      });

      refreshCommissaryDailyInputPage();
    }
  });
}

function getCommissaryDailyContent() {
  const reviewerValue = window.DMC_COMMISSARY_DAILY_REVIEWED_BY || "";
  const rows = getCommissaryDailyRows();
  const filledRows = getCommissaryDailyFilledRows();

  return `
    <section class="grid">
      <div class="card">
        <p>Commissary Items</p>
        <strong>${rows.length}</strong>
        <span>daily input items</span>
      </div>

      <div class="card">
        <p>Input Rows</p>
        <strong>${filledRows.length}</strong>
        <span>ready for review</span>
      </div>

      <div class="card">
        <p>Total Trans In</p>
        <strong>
          ${rows.reduce((total, item) => {
            const input = getCommissaryDailyInputForItem(item.itemId);
            return total + getCommissaryDailyNumber(input.transferIn);
          }, 0)}
        </strong>
        <span>current draft</span>
      </div>

      <div class="card">
        <p>Total Trans Out</p>
        <strong>
          ${rows.reduce((total, item) => {
            const input = getCommissaryDailyInputForItem(item.itemId);
            return total + getCommissaryDailyNumber(input.transferOut);
          }, 0)}
        </strong>
        <span>current draft</span>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Commissary Daily Input</h3>
          <p>
            Input Trans In, Trans Out, and Remaining. Usage is auto-computed.
          </p>
        </div>

        <span class="badge">Daily Count</span>
      </div>

      <div class="instruction-box">
        <strong>Usage Rule:</strong>
        <span>
          Total Available = Current + Trans In. Usage Auto = Total Available - Trans Out - Remaining.
          Waste is recorded for reports and is not double-deducted because Remaining Count sets the physical stock.
        </span>
      </div>

      <div class="filter-bar">
        <label>
          Section
          <select id="commissary-daily-section-filter">
            ${renderCommissaryDailySectionOptions()}
          </select>
        </label>

        <label class="filter-search">
          Search
          <input
            id="commissary-daily-search"
            type="text"
            placeholder="Search item, ID, section, unit..."
            value="${window.DMC_COMMISSARY_DAILY_FILTERS.search}"
          />
        </label>

        <label>
          Reviewed By
          <select id="commissary-daily-reviewed-by">
            ${renderCommissaryDailyReviewerOptions(reviewerValue)}
          </select>
        </label>

        <button class="ghost-button" id="clear-commissary-daily-filters">
          Clear Filters
        </button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item ID</th>
              <th>Item</th>
              <th>Unit</th>
              <th>Current</th>
              <th>Trans In</th>
              <th>Total Available</th>
              <th>Trans Out</th>
              <th>Remaining</th>
              <th>Usage Auto</th>
              <th>Waste</th>
              <th>Notes</th>
              <th>Review</th>
            </tr>
          </thead>

          <tbody>
            ${renderCommissaryDailyRows()}
          </tbody>
        </table>
      </div>

      <div class="form-actions">
        <button class="ghost-button" id="clear-commissary-daily-inputs">
          Clear Inputs
        </button>

        <button class="primary-button" id="submit-commissary-daily-input">
          Submit Commissary Daily Input
        </button>
      </div>
    </section>
  `;
}

function refreshCommissaryDailyInputPage() {
  window.DMC_PAGES["commissary-daily-input"].content =
    getCommissaryDailyContent();

  renderPage("commissary-daily-input");
}

function setupCommissaryDailyInputEvents() {
  const sectionFilter = document.getElementById("commissary-daily-section-filter");
  const searchInput = document.getElementById("commissary-daily-search");
  const reviewedByInput = document.getElementById("commissary-daily-reviewed-by");
  const clearFiltersButton = document.getElementById(
    "clear-commissary-daily-filters"
  );
  const clearInputsButton = document.getElementById(
    "clear-commissary-daily-inputs"
  );
  const submitButton = document.getElementById("submit-commissary-daily-input");

  if (sectionFilter) {
    sectionFilter.addEventListener("change", () => {
      saveCommissaryDailyInputsFromPage();
      window.DMC_COMMISSARY_DAILY_FILTERS.section = sectionFilter.value;
      refreshCommissaryDailyInputPage();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      saveCommissaryDailyInputsFromPage();
      window.DMC_COMMISSARY_DAILY_FILTERS.search = searchInput.value;
      refreshCommissaryDailyInputPage();
    });
  }

  if (reviewedByInput) {
    reviewedByInput.addEventListener("change", () => {
      window.DMC_COMMISSARY_DAILY_REVIEWED_BY = reviewedByInput.value;
    });
  }

  document
    .querySelectorAll(
      "[data-commissary-transfer-in], [data-commissary-transfer-out], [data-commissary-remaining], [data-commissary-waste]"
    )
    .forEach((input) => {
      input.addEventListener("input", () => {
        saveCommissaryDailyInputsFromPage();
        refreshCommissaryDailyInputPage();
      });
    });

  document.querySelectorAll("[data-commissary-notes]").forEach((input) => {
    input.addEventListener("input", () => {
      saveCommissaryDailyInputsFromPage();
    });
  });

  if (clearFiltersButton) {
    clearFiltersButton.addEventListener("click", () => {
      saveCommissaryDailyInputsFromPage();

      window.DMC_COMMISSARY_DAILY_FILTERS = {
        section: "all",
        search: ""
      };

      refreshCommissaryDailyInputPage();
    });
  }

  if (clearInputsButton) {
    clearInputsButton.addEventListener("click", () => {
      showCommissaryDailyConfirm({
        type: "warning",
        title: "Clear Commissary Inputs?",
        message:
          "This will clear unsaved Trans In, Trans Out, Remaining, Waste, and Notes entries.",
        confirmLabel: "Clear",
        cancelLabel: "Cancel",
        onConfirm: () => {
          clearCommissaryDailyInputs();
          refreshCommissaryDailyInputPage();
        }
      });
    });
  }

  if (submitButton) {
    submitButton.addEventListener("click", () => {
      submitCommissaryDailyInput();
    });
  }
}

window.DMC_PAGES["commissary-daily-input"] = {
  eyebrow: "Commissary",
  title: "Commissary Daily Input",
  description:
    "Record commissary transfer in, transfer out, remaining count, and auto-computed usage.",
  getContent: getCommissaryDailyContent,
  content: getCommissaryDailyContent(),
  afterRender: setupCommissaryDailyInputEvents
};
