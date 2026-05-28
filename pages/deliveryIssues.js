window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_DELIVERY_ISSUES_PAGE_STORAGE_KEY = "dmc_delivery_issues";
const DMC_DELIVERY_ISSUES_LEDGER_STORAGE_KEY = "dmc_inventory_ledger_entries";
const DMC_DELIVERY_ISSUES_SETTINGS_STORAGE_KEY = "dmc_inventory_settings";
const DMC_DELIVERY_ISSUES_REASON_SYNC_KEY =
  "dmc_delivery_issue_reason_settings";

const DMC_DELIVERY_STOCK_ACTIONS = {
  NONE: "No Stock Movement",
  ADD_BACK_TO_COMMISSARY: "Add Back to Commissary Stock"
};

const DMC_DEFAULT_DELIVERY_ISSUE_REASONS = [
  {
    id: "returned-usable-stock",
    name: "Returned to Usable Stock",
    category: "Recovered Stock",
    stockAction: DMC_DELIVERY_STOCK_ACTIONS.ADD_BACK_TO_COMMISSARY,
    active: true
  },
  {
    id: "confirmed-waste",
    name: "Confirmed Waste",
    category: "Waste",
    stockAction: DMC_DELIVERY_STOCK_ACTIONS.NONE,
    active: true
  },
  {
    id: "damaged-during-delivery",
    name: "Damaged During Delivery",
    category: "Waste / Delivery Damage",
    stockAction: DMC_DELIVERY_STOCK_ACTIONS.NONE,
    active: true
  },
  {
    id: "spoiled-during-delivery",
    name: "Spoiled During Delivery",
    category: "Waste / Spoilage",
    stockAction: DMC_DELIVERY_STOCK_ACTIONS.NONE,
    active: true
  },
  {
    id: "missing-driver-issue",
    name: "Missing / Driver Issue",
    category: "Missing / Accountability",
    stockAction: DMC_DELIVERY_STOCK_ACTIONS.NONE,
    active: true
  },
  {
    id: "packing-error",
    name: "Packing Error",
    category: "Commissary Error",
    stockAction: DMC_DELIVERY_STOCK_ACTIONS.NONE,
    active: true
  },
  {
    id: "branch-receiving-error",
    name: "Branch Receiving Error",
    category: "Branch Error",
    stockAction: DMC_DELIVERY_STOCK_ACTIONS.NONE,
    active: true
  },
  {
    id: "input-error",
    name: "Input Error",
    category: "System / Data Correction",
    stockAction: DMC_DELIVERY_STOCK_ACTIONS.NONE,
    active: true
  }
];

window.DMC_DELIVERY_ISSUES_SELECTED_STATUS =
  window.DMC_DELIVERY_ISSUES_SELECTED_STATUS || "all";

window.DMC_DELIVERY_ISSUES_SEARCH =
  window.DMC_DELIVERY_ISSUES_SEARCH || "";

window.DMC_DELIVERY_ISSUES_SELECTED_ID =
  window.DMC_DELIVERY_ISSUES_SELECTED_ID || "";

window.DMC_DELIVERY_ISSUE_RESOLUTION_DRAFT =
  window.DMC_DELIVERY_ISSUE_RESOLUTION_DRAFT || {
    status: "Under Review",
    resolution: "",
    resolutionNotes: ""
  };

function getStoredDeliveryIssues() {
  const storedIssues = localStorage.getItem(DMC_DELIVERY_ISSUES_PAGE_STORAGE_KEY);

  if (!storedIssues) {
    return [];
  }

  try {
    return JSON.parse(storedIssues);
  } catch {
    return [];
  }
}

function saveDeliveryIssues(issues) {
  localStorage.setItem(
    DMC_DELIVERY_ISSUES_PAGE_STORAGE_KEY,
    JSON.stringify(issues)
  );
}

function getStoredDeliveryIssueLedgerEntries() {
  const storedEntries = localStorage.getItem(
    DMC_DELIVERY_ISSUES_LEDGER_STORAGE_KEY
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

function saveDeliveryIssueLedgerEntries(entries) {
  localStorage.setItem(
    DMC_DELIVERY_ISSUES_LEDGER_STORAGE_KEY,
    JSON.stringify(entries)
  );
}

function normalizeDeliveryIssueReasons(reasons) {
  if (!Array.isArray(reasons)) {
    return DMC_DEFAULT_DELIVERY_ISSUE_REASONS;
  }

  return reasons.map((reason) => ({
    id: reason.id || reason.name || `reason-${Date.now()}`,
    name: reason.name || "Unnamed Reason",
    category: reason.category || "Uncategorized",
    stockAction:
      reason.stockAction || DMC_DELIVERY_STOCK_ACTIONS.NONE,
    active: reason.active !== false
  }));
}

function getDeliveryIssueReasonsFromSettings() {
  const syncedReasons = localStorage.getItem(
    DMC_DELIVERY_ISSUES_REASON_SYNC_KEY
  );

  if (syncedReasons) {
    try {
      return normalizeDeliveryIssueReasons(JSON.parse(syncedReasons));
    } catch {
      // continue to full settings fallback
    }
  }

  const storedSettings = localStorage.getItem(
    DMC_DELIVERY_ISSUES_SETTINGS_STORAGE_KEY
  );

  if (storedSettings) {
    try {
      const settings = JSON.parse(storedSettings);

      if (settings.deliveryIssueReasons) {
        return normalizeDeliveryIssueReasons(settings.deliveryIssueReasons);
      }
    } catch {
      // continue to default fallback
    }
  }

  return DMC_DEFAULT_DELIVERY_ISSUE_REASONS;
}

function getDeliveryIssueReasons() {
  return getDeliveryIssueReasonsFromSettings();
}

function getActiveDeliveryIssueReasons() {
  return getDeliveryIssueReasons().filter((reason) => reason.active !== false);
}

function getDeliveryIssueReasonConfig(reasonName) {
  return (
    getDeliveryIssueReasons().find((reason) => reason.name === reasonName) || {
      name: reasonName || "",
      category: "Uncategorized",
      stockAction: DMC_DELIVERY_STOCK_ACTIONS.NONE,
      active: true
    }
  );
}

function getDeliveryIssueTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDeliveryIssueReadableTimestamp() {
  const now = new Date();

  return now.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getDeliveryIssueTimestamp(issue) {
  if (issue.createdAt) {
    return new Date(issue.createdAt).getTime();
  }

  return 0;
}

function getSortedDeliveryIssues() {
  return [...getStoredDeliveryIssues()].sort(
    (a, b) => getDeliveryIssueTimestamp(b) - getDeliveryIssueTimestamp(a)
  );
}

function getFilteredDeliveryIssues() {
  const status = window.DMC_DELIVERY_ISSUES_SELECTED_STATUS;
  const searchValue = String(window.DMC_DELIVERY_ISSUES_SEARCH || "")
    .toLowerCase()
    .trim();

  return getSortedDeliveryIssues().filter((issue) => {
    const matchesStatus = status === "all" || issue.status === status;

    const matchesSearch =
      !searchValue ||
      String(issue.issueId || "").toLowerCase().includes(searchValue) ||
      String(issue.orderId || "").toLowerCase().includes(searchValue) ||
      String(issue.branch || "").toLowerCase().includes(searchValue) ||
      String(issue.department || "").toLowerCase().includes(searchValue) ||
      String(issue.itemId || "").toLowerCase().includes(searchValue) ||
      String(issue.itemName || "").toLowerCase().includes(searchValue) ||
      String(issue.condition || "").toLowerCase().includes(searchValue) ||
      String(issue.issueReason || "").toLowerCase().includes(searchValue) ||
      String(issue.driver || "").toLowerCase().includes(searchValue) ||
      String(issue.receivedBy || "").toLowerCase().includes(searchValue) ||
      String(issue.status || "").toLowerCase().includes(searchValue) ||
      String(issue.resolution || "").toLowerCase().includes(searchValue) ||
      String(issue.resolutionCategory || "")
        .toLowerCase()
        .includes(searchValue);

    return matchesStatus && matchesSearch;
  });
}

function getSelectedDeliveryIssue() {
  const issues = getFilteredDeliveryIssues();

  if (window.DMC_DELIVERY_ISSUES_SELECTED_ID) {
    const selectedIssue = issues.find(
      (issue) => issue.issueId === window.DMC_DELIVERY_ISSUES_SELECTED_ID
    );

    if (selectedIssue) {
      return selectedIssue;
    }
  }

  return issues[0] || null;
}

function getDeliveryIssuesSummary() {
  const issues = getStoredDeliveryIssues();

  return {
    total: issues.length,
    open: issues.filter((issue) => issue.status === "Open").length,
    underReview: issues.filter((issue) => issue.status === "Under Review")
      .length,
    resolved: issues.filter((issue) => issue.status === "Resolved").length
  };
}

function getDeliveryIssueStatusBadgeClass(status) {
  if (status === "Open") return "danger-badge";
  if (status === "Under Review") return "warning-badge";
  if (status === "Resolved") return "info-badge";
  return "";
}

function getDeliveryIssueReasonBadgeClass(reason) {
  if (reason === "Missing") return "danger-badge";
  if (reason === "Damaged") return "warning-badge";
  if (reason === "Spoiled") return "danger-badge";
  if (reason === "Short Received") return "warning-badge";
  if (reason === "Over Received") return "info-badge";
  return "";
}

function renderDeliveryIssueStatusOptions() {
  const selectedStatus = window.DMC_DELIVERY_ISSUES_SELECTED_STATUS;
  const statuses = ["Open", "Under Review", "Resolved"];

  return `
    <option value="all" ${selectedStatus === "all" ? "selected" : ""}>
      All Issues
    </option>
    ${statuses
      .map(
        (status) => `
          <option value="${status}" ${selectedStatus === status ? "selected" : ""}>
            ${status}
          </option>
        `
      )
      .join("")}
  `;
}

function renderDeliveryIssueResolutionOptions(currentResolution) {
  const reasons = getActiveDeliveryIssueReasons();
  const savedReasonStillExists = getDeliveryIssueReasonConfig(currentResolution);

  const shouldIncludeCurrentInactiveReason =
    currentResolution &&
    !reasons.some((reason) => reason.name === currentResolution);

  return `
    <option value="">Select resolution</option>

    ${
      shouldIncludeCurrentInactiveReason
        ? `
          <option value="${currentResolution}" selected>
            ${currentResolution} (inactive)
          </option>
        `
        : ""
    }

    ${reasons
      .map(
        (reason) => `
          <option
            value="${reason.name}"
            ${currentResolution === reason.name ? "selected" : ""}
          >
            ${reason.name}
          </option>
        `
      )
      .join("")}
  `;
}

function getDeliveryIssueReturnQuantity(issue) {
  const varianceQty = Number(issue.varianceQty || 0);

  if (!Number.isNaN(varianceQty) && varianceQty !== 0) {
    return Math.abs(varianceQty);
  }

  const sentQty = Number(issue.sentQty || 0);
  const receivedQty = Number(issue.receivedQty || 0);

  if (Number.isNaN(sentQty) || Number.isNaN(receivedQty)) {
    return 0;
  }

  return Math.abs(sentQty - receivedQty);
}

function hasDeliveryIssueLedgerEntry(issue) {
  return getStoredDeliveryIssueLedgerEntries().some(
    (entry) =>
      entry.deliveryIssueId === issue.issueId &&
      entry.source === "Delivery Issue Resolution"
  );
}

function buildDeliveryIssueLedgerEntry(issue, reasonConfig) {
  const quantity = getDeliveryIssueReturnQuantity(issue);
  const submittedAt = new Date().toISOString();
  const submittedAtDisplay = getDeliveryIssueReadableTimestamp();

  return {
    date: getDeliveryIssueTodayDate(),
    submittedAt,
    submittedAtDisplay,
    batchId: issue.issueId,
    deliveryIssueId: issue.issueId,
    orderId: issue.orderId || "",
    department: "Commissary",
    section: issue.section || "",
    itemId: issue.itemId || "",
    itemName: issue.itemName || "",
    movementType: "Transfer In",
    quantity,
    unit: issue.unit || "",
    source: "Delivery Issue Resolution",
    notes: `Returned to usable commissary stock from delivery issue ${issue.issueId}. Resolution: ${reasonConfig.name}. Original order: ${issue.orderId || "-"}.`
  };
}

function writeDeliveryIssueStockReturnToLedger(issue, reasonConfig) {
  if (
    reasonConfig.stockAction !==
    DMC_DELIVERY_STOCK_ACTIONS.ADD_BACK_TO_COMMISSARY
  ) {
    return false;
  }

  if (hasDeliveryIssueLedgerEntry(issue)) {
    return false;
  }

  const quantity = getDeliveryIssueReturnQuantity(issue);

  if (quantity <= 0) {
    return false;
  }

  const currentLedgerEntries = getStoredDeliveryIssueLedgerEntries();
  const ledgerEntry = buildDeliveryIssueLedgerEntry(issue, reasonConfig);

  saveDeliveryIssueLedgerEntries([...currentLedgerEntries, ledgerEntry]);

  return true;
}

function renderDeliveryIssueList() {
  const issues = getFilteredDeliveryIssues();
  const selectedIssue = getSelectedDeliveryIssue();

  if (issues.length === 0) {
    return `
      <div class="order-list-empty">
        <p>No delivery issues found.</p>
        <span>Variance records from Incoming Deliveries will appear here.</span>
      </div>
    `;
  }

  return `
    <div class="delivery-issue-list">
      ${issues
        .map(
          (issue) => `
            <button
              class="delivery-issue-list-item ${
                selectedIssue?.issueId === issue.issueId ? "active" : ""
              }"
              data-select-delivery-issue="${issue.issueId}"
            >
              <div>
                <strong>${issue.itemName || "-"}</strong>
                <p>${issue.orderId || "-"} • ${issue.department || "-"}</p>
                <span>
                  Sent ${issue.sentQty} / Received ${issue.receivedQty} ${issue.unit || ""}
                </span>
              </div>

              <div class="delivery-issue-list-meta">
                <span class="badge ${getDeliveryIssueReasonBadgeClass(issue.issueReason)}">
                  ${issue.issueReason || "Needs Review"}
                </span>
                <span class="badge ${getDeliveryIssueStatusBadgeClass(issue.status)}">
                  ${issue.status || "Open"}
                </span>
              </div>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderDeliveryIssueComparison(issue) {
  const sentQty = Number(issue.sentQty || 0);
  const receivedQty = Number(issue.receivedQty || 0);
  const varianceQty = Number(issue.varianceQty || receivedQty - sentQty);

  return `
    <div class="delivery-issue-comparison">
      <div>
        <p class="eyebrow">Sent Qty</p>
        <strong>${sentQty}</strong>
        <span>${issue.unit || ""}</span>
      </div>

      <div>
        <p class="eyebrow">Received Qty</p>
        <strong>${receivedQty}</strong>
        <span>${issue.unit || ""}</span>
      </div>

      <div>
        <p class="eyebrow">Variance</p>
        <strong class="${varianceQty === 0 ? "" : "danger-text"}">
          ${varianceQty}
        </strong>
        <span>${issue.unit || ""}</span>
      </div>

      <div>
        <p class="eyebrow">Condition</p>
        <strong>${issue.condition || "-"}</strong>
        <span>${issue.issueReason || "Needs Review"}</span>
      </div>
    </div>
  `;
}

function renderDeliveryIssueResolutionPanel(issue) {
  if (!issue) {
    return "";
  }

  const isResolved = issue.status === "Resolved";
  const draft = window.DMC_DELIVERY_ISSUE_RESOLUTION_DRAFT;
  const selectedReasonConfig = getDeliveryIssueReasonConfig(draft.resolution);
  const savedReasonConfig = getDeliveryIssueReasonConfig(issue.resolution);

  return `
    <div class="branch-order-section delivery-issue-resolution-panel">
      <div class="panel-header">
        <div>
          <h4>Resolution Panel</h4>
          <p>
            Resolution reasons are now controlled from Settings. Only “Add Back
            to Commissary Stock” affects inventory.
          </p>
        </div>

        <span class="badge ${getDeliveryIssueStatusBadgeClass(issue.status)}">
          ${issue.status || "Open"}
        </span>
      </div>

      ${
        isResolved
          ? `
            <div class="instruction-box">
              <strong>Resolved:</strong>
              <span>
                Resolution: ${issue.resolution || "-"}.
                Category: ${
                  issue.resolutionCategory ||
                  savedReasonConfig.category ||
                  "-"
                }.
                Stock Action: ${
                  issue.stockAction ||
                  savedReasonConfig.stockAction ||
                  DMC_DELIVERY_STOCK_ACTIONS.NONE
                }.
                Notes: ${issue.resolutionNotes || "-"}
              </span>
            </div>
          `
          : `
            <div class="delivery-issue-resolution-grid">
              <label>
                Status
                <select id="delivery-issue-status-update">
                  <option value="Under Review" ${
                    draft.status === "Under Review" ? "selected" : ""
                  }>Under Review</option>
                  <option value="Resolved" ${
                    draft.status === "Resolved" ? "selected" : ""
                  }>Resolved</option>
                </select>
              </label>

              <label>
                Resolution
                <select id="delivery-issue-resolution">
                  ${renderDeliveryIssueResolutionOptions(draft.resolution)}
                </select>
              </label>

              <div class="instruction-box form-full">
                <strong>Stock Action:</strong>
                <span>
                  ${
                    draft.resolution
                      ? `${selectedReasonConfig.stockAction} — ${selectedReasonConfig.category}`
                      : "Select a resolution to see if it affects stock."
                  }
                </span>
              </div>

              <label class="form-full">
                Resolution Notes
                <textarea
                  id="delivery-issue-resolution-notes"
                  rows="3"
                  placeholder="Manager notes, investigation result, action taken..."
                >${draft.resolutionNotes || ""}</textarea>
              </label>
            </div>

            <div class="form-actions delivery-issue-actions">
              <button class="primary-button" id="save-delivery-issue-review">
                Save Review
              </button>
            </div>
          `
      }
    </div>
  `;
}

function renderSelectedDeliveryIssue() {
  const issue = getSelectedDeliveryIssue();

  if (!issue) {
    return `
      <section class="panel delivery-issue-detail">
        <div class="order-list-empty">
          <p>No issue selected.</p>
          <span>Select a delivery issue from the left panel.</span>
        </div>
      </section>
    `;
  }

  return `
    <section class="panel delivery-issue-detail">
      <div class="panel-header">
        <div>
          <h3>${issue.issueId}</h3>
          <p>
            ${issue.orderId || "-"} • ${issue.branch || "-"} • ${issue.department || "-"}
          </p>
        </div>

        <div class="branch-order-list-meta">
          <span class="badge ${getDeliveryIssueReasonBadgeClass(issue.issueReason)}">
            ${issue.issueReason || "Needs Review"}
          </span>
          <span class="badge ${getDeliveryIssueStatusBadgeClass(issue.status)}">
            ${issue.status || "Open"}
          </span>
        </div>
      </div>

      <div class="branch-order-info-grid">
        <div>
          <p class="eyebrow">Item</p>
          <strong>${issue.itemName || "-"}</strong>
        </div>

        <div>
          <p class="eyebrow">Driver / Rider</p>
          <strong>${issue.driver || "-"}</strong>
        </div>

        <div>
          <p class="eyebrow">Prepared By</p>
          <strong>${issue.preparedBy || "-"}</strong>
        </div>

        <div>
          <p class="eyebrow">Received By</p>
          <strong>${issue.receivedBy || "-"}</strong>
        </div>
      </div>

      ${renderDeliveryIssueComparison(issue)}

      <div class="branch-order-section">
        <h4>Branch Notes</h4>
        <div class="instruction-box">
          <strong>Line Notes:</strong>
          <span>${issue.branchLineNotes || "-"}</span>
        </div>
        <div class="instruction-box">
          <strong>Receiving Notes:</strong>
          <span>${issue.branchReceivingNotes || "-"}</span>
        </div>
      </div>

      <div class="branch-order-section">
        <h4>Delivery Notes</h4>
        <div class="instruction-box">
          <strong>Commissary Notes:</strong>
          <span>${issue.deliveryNotes || "-"}</span>
        </div>
      </div>

      ${renderDeliveryIssueResolutionPanel(issue)}
    </section>
  `;
}

function getDeliveryIssuesContent() {
  const summary = getDeliveryIssuesSummary();

  return `
    <section class="grid">
      <div class="card">
        <p>Total Issues</p>
        <strong>${summary.total}</strong>
      </div>

      <div class="card">
        <p>Open</p>
        <strong>${summary.open}</strong>
      </div>

      <div class="card">
        <p>Under Review</p>
        <strong>${summary.underReview}</strong>
      </div>

      <div class="card">
        <p>Resolved</p>
        <strong>${summary.resolved}</strong>
      </div>
    </section>

    <section class="delivery-issues-layout">
      <section class="panel delivery-issue-list-panel">
        <div class="panel-header">
          <div>
            <h3>Delivery Issues</h3>
            <p>Review variance, damaged, spoiled, or missing delivery items.</p>
          </div>

          <select id="delivery-issue-status-filter">
            ${renderDeliveryIssueStatusOptions()}
          </select>
        </div>

        <div class="filter-bar branch-order-search-bar">
          <label class="filter-search">
            Search
            <input
              id="delivery-issue-search"
              type="text"
              placeholder="Search order, item, driver, reason..."
              value="${window.DMC_DELIVERY_ISSUES_SEARCH}"
            />
          </label>
        </div>

        ${renderDeliveryIssueList()}
      </section>

      ${renderSelectedDeliveryIssue()}
    </section>
  `;
}

function refreshDeliveryIssuesPage() {
  window.DMC_PAGES["delivery-issues"].content = getDeliveryIssuesContent();
  renderPage("delivery-issues");
}

function saveDeliveryIssueResolutionDraftFromInputs() {
  const statusInput = document.getElementById("delivery-issue-status-update");
  const resolutionInput = document.getElementById("delivery-issue-resolution");
  const notesInput = document.getElementById("delivery-issue-resolution-notes");

  window.DMC_DELIVERY_ISSUE_RESOLUTION_DRAFT = {
    status: statusInput?.value || "Under Review",
    resolution: resolutionInput?.value || "",
    resolutionNotes: notesInput?.value || ""
  };
}

function saveSelectedDeliveryIssueReview(issue) {
  if (!issue) {
    return;
  }

  saveDeliveryIssueResolutionDraftFromInputs();

  const draft = window.DMC_DELIVERY_ISSUE_RESOLUTION_DRAFT;
  const reasonConfig = getDeliveryIssueReasonConfig(draft.resolution);

  if (draft.status === "Resolved" && !draft.resolution) {
    alert("Please select a resolution before marking this issue resolved.");
    return;
  }

  const shouldAddBackToStock =
    draft.status === "Resolved" &&
    reasonConfig.stockAction ===
      DMC_DELIVERY_STOCK_ACTIONS.ADD_BACK_TO_COMMISSARY;

  const confirmed = confirm(
    shouldAddBackToStock
      ? `Save review for ${issue.issueId} and add ${getDeliveryIssueReturnQuantity(
          issue
        )} ${issue.unit || ""} back to Commissary Stock through the Ledger?`
      : `Save review for ${issue.issueId}?`
  );

  if (!confirmed) {
    return;
  }

  const ledgerEntryCreated = shouldAddBackToStock
    ? writeDeliveryIssueStockReturnToLedger(issue, reasonConfig)
    : false;

  const issues = getStoredDeliveryIssues();

  const updatedIssues = issues.map((storedIssue) => {
    if (storedIssue.issueId !== issue.issueId) {
      return storedIssue;
    }

    return {
      ...storedIssue,
      status: draft.status,
      resolution: draft.resolution,
      resolutionCategory: reasonConfig.category,
      stockAction: reasonConfig.stockAction,
      stockActionApplied:
        reasonConfig.stockAction ===
        DMC_DELIVERY_STOCK_ACTIONS.ADD_BACK_TO_COMMISSARY
          ? true
          : false,
      ledgerEntryCreated,
      resolutionNotes: draft.resolutionNotes,
      resolvedAt: draft.status === "Resolved" ? new Date().toISOString() : ""
    };
  });

  saveDeliveryIssues(updatedIssues);

  window.DMC_DELIVERY_ISSUES_SELECTED_ID = issue.issueId;
  window.DMC_DELIVERY_ISSUE_RESOLUTION_DRAFT = {
    status: "Under Review",
    resolution: "",
    resolutionNotes: ""
  };

  alert(
    shouldAddBackToStock
      ? "Review saved. Returned usable stock was added back to Commissary through the Ledger."
      : "Review saved. This resolution was recorded only and did not change stock."
  );

  refreshDeliveryIssuesPage();
}

function setupDeliveryIssuesEvents() {
  const statusFilter = document.getElementById("delivery-issue-status-filter");
  const searchInput = document.getElementById("delivery-issue-search");

  if (statusFilter) {
    statusFilter.addEventListener("change", () => {
      window.DMC_DELIVERY_ISSUES_SELECTED_STATUS = statusFilter.value;
      window.DMC_DELIVERY_ISSUES_SELECTED_ID = "";
      refreshDeliveryIssuesPage();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("change", () => {
      window.DMC_DELIVERY_ISSUES_SEARCH = searchInput.value;
      window.DMC_DELIVERY_ISSUES_SELECTED_ID = "";
      refreshDeliveryIssuesPage();
    });
  }

  document.querySelectorAll("[data-select-delivery-issue]").forEach((button) => {
    button.addEventListener("click", () => {
      window.DMC_DELIVERY_ISSUES_SELECTED_ID =
        button.dataset.selectDeliveryIssue;

      window.DMC_DELIVERY_ISSUE_RESOLUTION_DRAFT = {
        status: "Under Review",
        resolution: "",
        resolutionNotes: ""
      };

      refreshDeliveryIssuesPage();
    });
  });

  const selectedIssue = getSelectedDeliveryIssue();

  const statusInput = document.getElementById("delivery-issue-status-update");
  const resolutionInput = document.getElementById("delivery-issue-resolution");
  const notesInput = document.getElementById("delivery-issue-resolution-notes");

  [statusInput, resolutionInput, notesInput].forEach((input) => {
    if (input) {
      input.addEventListener("change", () => {
        saveDeliveryIssueResolutionDraftFromInputs();
        refreshDeliveryIssuesPage();
      });
    }
  });

  const saveButton = document.getElementById("save-delivery-issue-review");

  if (saveButton) {
    saveButton.addEventListener("click", () => {
      saveSelectedDeliveryIssueReview(selectedIssue);
    });
  }
}

window.DMC_PAGES["delivery-issues"] = {
  eyebrow: "Commissary",
  title: "Delivery Issues",
  description:
    "Review delivery variances before deciding whether items are waste, returned stock, missing, or input error.",
  getContent: getDeliveryIssuesContent,
  content: getDeliveryIssuesContent(),
  afterRender: setupDeliveryIssuesEvents
};
