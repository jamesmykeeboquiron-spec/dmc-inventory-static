window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_DELIVERY_ISSUES_STORAGE_KEY = "dmc_delivery_issues";

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
  const storedIssues = localStorage.getItem(DMC_DELIVERY_ISSUES_STORAGE_KEY);

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
  localStorage.setItem(DMC_DELIVERY_ISSUES_STORAGE_KEY, JSON.stringify(issues));
}

function formatDeliveryIssueDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
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
      String(issue.status || "").toLowerCase().includes(searchValue);

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

  return `
    <div class="branch-order-section delivery-issue-resolution-panel">
      <div class="panel-header">
        <div>
          <h4>Resolution Panel</h4>
          <p>
            Record management review. This first version only records the decision;
            it does not move stock automatically.
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
                  <option value="">Select resolution</option>
                  <option value="Confirmed Waste" ${
                    draft.resolution === "Confirmed Waste" ? "selected" : ""
                  }>Confirmed Waste</option>
                  <option value="Returned to Usable Stock" ${
                    draft.resolution === "Returned to Usable Stock" ? "selected" : ""
                  }>Returned to Usable Stock</option>
                  <option value="Missing / Driver Issue" ${
                    draft.resolution === "Missing / Driver Issue" ? "selected" : ""
                  }>Missing / Driver Issue</option>
                  <option value="Packing Error" ${
                    draft.resolution === "Packing Error" ? "selected" : ""
                  }>Packing Error</option>
                  <option value="Branch Receiving Error" ${
                    draft.resolution === "Branch Receiving Error" ? "selected" : ""
                  }>Branch Receiving Error</option>
                  <option value="Input Error" ${
                    draft.resolution === "Input Error" ? "selected" : ""
                  }>Input Error</option>
                </select>
              </label>

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

  if (draft.status === "Resolved" && !draft.resolution) {
    alert("Please select a resolution before marking this issue resolved.");
    return;
  }

  const confirmed = confirm(`Save review for ${issue.issueId}?`);

  if (!confirmed) {
    return;
  }

  const issues = getStoredDeliveryIssues();

  const updatedIssues = issues.map((storedIssue) => {
    if (storedIssue.issueId !== issue.issueId) {
      return storedIssue;
    }

    return {
      ...storedIssue,
      status: draft.status,
      resolution: draft.resolution,
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
