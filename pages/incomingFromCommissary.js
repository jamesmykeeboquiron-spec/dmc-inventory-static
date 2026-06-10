window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_INCOMING_COMMISSARY_LEDGER_KEY = "dmc_inventory_ledger_entries";

window.DMC_INCOMING_COMMISSARY_FILTERS =
  window.DMC_INCOMING_COMMISSARY_FILTERS || {
    status: "pending",
    startDate: "",
    endDate: "",
    search: "",
    selectedBatchId: "",
    detailDepartment: "all",
    detailSection: "all"
  };

window.DMC_INCOMING_COMMISSARY_RECEIVE_DRAFT =
  window.DMC_INCOMING_COMMISSARY_RECEIVE_DRAFT || {};

function getIncomingCommissaryLedgerEntries() {
  const storedEntries = localStorage.getItem(DMC_INCOMING_COMMISSARY_LEDGER_KEY);

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

function formatIncomingCommissaryDateTime(value) {
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

function entryIsCommissaryTransferOutToWarehouse(entry) {
  const movementField = String(entry.movementField || "");
  const movementType = String(entry.movementType || "");
  const source = String(entry.source || "").toLowerCase();
  const destination = String(entry.destination || "").toLowerCase();

  return (
    movementField === "transferOutWarehouse" ||
    (
      movementType === "Transfer Out" &&
      source.includes("commissary") &&
      destination.includes("warehouse")
    )
  );
}

function getIncomingCommissaryTransferEntries() {
  return getIncomingCommissaryLedgerEntries().filter(
    entryIsCommissaryTransferOutToWarehouse
  );
}

function groupIncomingCommissaryEntriesByBatch(entries) {
  return entries.reduce((groups, entry) => {
    const batchId = entry.batchId || "No Batch ID";

    groups[batchId] = groups[batchId] || [];
    groups[batchId].push(entry);

    return groups;
  }, {});
}

function getIncomingCommissaryReceiptKey(batchId) {
  return `dmc_incoming_commissary_receipt_${batchId}`;
}

function getIncomingCommissaryStoredReceipt(batchId) {
  const storedReceipt = localStorage.getItem(
    getIncomingCommissaryReceiptKey(batchId)
  );

  if (!storedReceipt) {
    return null;
  }

  try {
    return JSON.parse(storedReceipt);
  } catch {
    return null;
  }
}

function saveIncomingCommissaryReceipt(batchId, receipt) {
  localStorage.setItem(
    getIncomingCommissaryReceiptKey(batchId),
    JSON.stringify(receipt)
  );
}

function getIncomingCommissaryBatchStatus(batch) {
  const receipt = getIncomingCommissaryStoredReceipt(batch.batchId);

  if (!receipt) {
    return "Pending Receipt";
  }

  if (receipt.status === "Variance") {
    return "Variance";
  }

  if (receipt.status === "Received") {
    return "Received";
  }

  return "Pending Receipt";
}

function getIncomingCommissaryStatusBadgeClass(status) {
  if (status === "Received") {
    return "success";
  }

  if (status === "Variance") {
    return "warning-badge";
  }

  return "info-badge";
}

function getIncomingCommissaryBatchTimestamp(batch) {
  const firstEntry = batch.entries[0] || {};

  return firstEntry.submittedAt || firstEntry.date || "";
}

function getIncomingCommissaryBatchesRaw() {
  const groupedEntries = groupIncomingCommissaryEntriesByBatch(
    getIncomingCommissaryTransferEntries()
  );

  return Object.entries(groupedEntries)
    .map(([batchId, entries]) => ({
      batchId,
      entries
    }))
    .sort((a, b) => {
      return String(getIncomingCommissaryBatchTimestamp(b)).localeCompare(
        String(getIncomingCommissaryBatchTimestamp(a))
      );
    });
}

function getIncomingCommissaryBatches() {
  const filters = window.DMC_INCOMING_COMMISSARY_FILTERS;
  const searchValue = String(filters.search || "").toLowerCase().trim();
  const selectedStatus = String(filters.status || "pending");
  const startDate = String(filters.startDate || "");
  const endDate = String(filters.endDate || "");

  return getIncomingCommissaryBatchesRaw().filter((batch) => {
    const firstEntry = batch.entries[0] || {};
    const entryDate = String(firstEntry.date || "");
    const batchStatus = getIncomingCommissaryBatchStatus(batch);

    const matchesStartDate = !startDate || entryDate >= startDate;
    const matchesEndDate = !endDate || entryDate <= endDate;

    const matchesStatus =
      selectedStatus === "all" ||
      (selectedStatus === "pending" && batchStatus === "Pending Receipt") ||
      batchStatus === selectedStatus;

    const matchesSearch =
      !searchValue ||
      String(batch.batchId || "").toLowerCase().includes(searchValue) ||
      String(firstEntry.managerReviewedBy || "")
        .toLowerCase()
        .includes(searchValue) ||
      String(firstEntry.source || "").toLowerCase().includes(searchValue) ||
      String(firstEntry.destination || "").toLowerCase().includes(searchValue) ||
      batch.entries.some(
        (entry) =>
          String(entry.itemId || "").toLowerCase().includes(searchValue) ||
          String(entry.itemName || "").toLowerCase().includes(searchValue) ||
          String(entry.department || "").toLowerCase().includes(searchValue) ||
          String(entry.section || "").toLowerCase().includes(searchValue) ||
          String(entry.notes || "").toLowerCase().includes(searchValue)
      );

    return (
      matchesStartDate &&
      matchesEndDate &&
      matchesStatus &&
      matchesSearch
    );
  });
}

function getSelectedIncomingCommissaryBatch() {
  const batches = getIncomingCommissaryBatches();

  if (batches.length === 0) {
    return null;
  }

  const selectedBatchId = window.DMC_INCOMING_COMMISSARY_FILTERS.selectedBatchId;

  const selectedBatch = batches.find(
    (batch) => batch.batchId === selectedBatchId
  );

  return selectedBatch || batches[0] || null;
}

function getIncomingCommissarySummary() {
  const batches = getIncomingCommissaryBatchesRaw();

  return {
    total: batches.length,
    pending: batches.filter(
      (batch) => getIncomingCommissaryBatchStatus(batch) === "Pending Receipt"
    ).length,
    received: batches.filter(
      (batch) => getIncomingCommissaryBatchStatus(batch) === "Received"
    ).length,
    variance: batches.filter(
      (batch) => getIncomingCommissaryBatchStatus(batch) === "Variance"
    ).length
  };
}

function renderIncomingCommissaryStatusOptions() {
  const currentStatus = window.DMC_INCOMING_COMMISSARY_FILTERS.status;

  const statuses = ["Received", "Variance"];

  return `
    <option value="pending" ${currentStatus === "pending" ? "selected" : ""}>
      Pending Receipt
    </option>
    <option value="all" ${currentStatus === "all" ? "selected" : ""}>
      All Transfers
    </option>
    ${statuses
      .map(
        (status) => `
          <option value="${status}" ${currentStatus === status ? "selected" : ""}>
            ${status}
          </option>
        `
      )
      .join("")}
  `;
}

function getIncomingCommissarySentTotal(batch) {
  return batch.entries.reduce((total, entry) => {
    const quantity = Number(entry.quantity || 0);

    return total + (Number.isNaN(quantity) ? 0 : quantity);
  }, 0);
}

function getIncomingCommissaryLineKey(entry) {
  return [
    entry.batchId || "batch",
    entry.itemId || "item",
    entry.movementField || "transferOutWarehouse",
    entry.source || "Commissary",
    entry.destination || "Warehouse"
  ].join("__");
}

function getIncomingCommissaryDraft(batch) {
  if (!batch) {
    return {
      receivedBy: "",
      receivingNotes: "",
      lines: {}
    };
  }

  const existingReceipt = getIncomingCommissaryStoredReceipt(batch.batchId);

  if (!window.DMC_INCOMING_COMMISSARY_RECEIVE_DRAFT[batch.batchId]) {
    const lineDrafts = {};

    batch.entries.forEach((entry) => {
      const lineKey = getIncomingCommissaryLineKey(entry);

      lineDrafts[lineKey] = {
        itemId: entry.itemId || "",
        receivedQty:
          existingReceipt?.lines?.[lineKey]?.receivedQty ??
          entry.quantity ??
          "",
        condition:
          existingReceipt?.lines?.[lineKey]?.condition ||
          "Good"
      };
    });

    window.DMC_INCOMING_COMMISSARY_RECEIVE_DRAFT[batch.batchId] = {
      receivedBy: existingReceipt?.receivedBy || "",
      receivingNotes: existingReceipt?.receivingNotes || "",
      lines: lineDrafts
    };
  }

  return window.DMC_INCOMING_COMMISSARY_RECEIVE_DRAFT[batch.batchId];
}

function saveIncomingCommissaryDraftFromInputs(batch) {
  if (!batch) {
    return;
  }

  const draft = getIncomingCommissaryDraft(batch);

  document.querySelectorAll("[data-incoming-commissary-received]").forEach(
    (input) => {
      const lineKey = input.dataset.incomingCommissaryReceived;

      draft.lines[lineKey] = draft.lines[lineKey] || {};
      draft.lines[lineKey].receivedQty = input.value;
    }
  );

  document.querySelectorAll("[data-incoming-commissary-condition]").forEach(
    (select) => {
      const lineKey = select.dataset.incomingCommissaryCondition;

      draft.lines[lineKey] = draft.lines[lineKey] || {};
      draft.lines[lineKey].condition = select.value;
    }
  );

  const receivedByInput = document.getElementById(
    "incoming-commissary-received-by"
  );
  const receivingNotesInput = document.getElementById(
    "incoming-commissary-receiving-notes"
  );

  draft.receivedBy = receivedByInput?.value || "";
  draft.receivingNotes = receivingNotesInput?.value || "";

  window.DMC_INCOMING_COMMISSARY_RECEIVE_DRAFT[batch.batchId] = draft;
}

function getIncomingCommissaryDraftStatus(batch) {
  const draft = getIncomingCommissaryDraft(batch);

  const hasVariance = batch.entries.some((entry) => {
    const lineKey = getIncomingCommissaryLineKey(entry);
    const sentQty = Number(entry.quantity || 0);
    const receivedQty = Number(draft.lines?.[lineKey]?.receivedQty ?? "");

    if (Number.isNaN(receivedQty)) {
      return true;
    }

    const condition = draft.lines?.[lineKey]?.condition || "Good";

    return receivedQty !== sentQty || condition !== "Good";
  });

  return hasVariance ? "Variance" : "Received";
}

function getIncomingCommissaryDepartments(batch) {
  if (!batch) {
    return [];
  }

  return [
    ...new Set(
      batch.entries
        .map((entry) => entry.department || "Unassigned")
        .filter(Boolean)
    )
  ].sort();
}

function getIncomingCommissarySections(batch) {
  if (!batch) {
    return [];
  }

  const selectedDepartment = String(
    window.DMC_INCOMING_COMMISSARY_FILTERS.detailDepartment || "all"
  ).toLowerCase();

  return [
    ...new Set(
      batch.entries
        .filter((entry) => {
          const entryDepartment = String(
            entry.department || "Unassigned"
          ).toLowerCase();

          return (
            selectedDepartment === "all" ||
            entryDepartment === selectedDepartment
          );
        })
        .map((entry) => entry.section || "Unassigned")
        .filter(Boolean)
    )
  ].sort();
}

function renderIncomingCommissaryDepartmentOptions(batch) {
  const currentDepartment =
    window.DMC_INCOMING_COMMISSARY_FILTERS.detailDepartment || "all";

  return `
    <option value="all" ${currentDepartment === "all" ? "selected" : ""}>
      All Departments
    </option>
    ${getIncomingCommissaryDepartments(batch)
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

function renderIncomingCommissarySectionOptions(batch) {
  const currentSection =
    window.DMC_INCOMING_COMMISSARY_FILTERS.detailSection || "all";

  return `
    <option value="all" ${currentSection === "all" ? "selected" : ""}>
      All Sections
    </option>
    ${getIncomingCommissarySections(batch)
      .map(
        (section) => `
          <option value="${section}" ${currentSection === section ? "selected" : ""}>
            ${section}
          </option>
        `
      )
      .join("")}
  `;
}

function getFilteredIncomingCommissaryLines(batch) {
  if (!batch) {
    return [];
  }

  const selectedDepartment = String(
    window.DMC_INCOMING_COMMISSARY_FILTERS.detailDepartment || "all"
  ).toLowerCase();

  const selectedSection = String(
    window.DMC_INCOMING_COMMISSARY_FILTERS.detailSection || "all"
  ).toLowerCase();

  return batch.entries.filter((entry) => {
    const entryDepartment = String(entry.department || "Unassigned").toLowerCase();
    const entrySection = String(entry.section || "Unassigned").toLowerCase();

    const matchesDepartment =
      selectedDepartment === "all" || entryDepartment === selectedDepartment;

    const matchesSection =
      selectedSection === "all" || entrySection === selectedSection;

    return matchesDepartment && matchesSection;
  });
}

function renderIncomingCommissaryBatchList() {
  const batches = getIncomingCommissaryBatches();
  const selectedBatch = getSelectedIncomingCommissaryBatch();

  if (batches.length === 0) {
    return `
      <div class="order-list-empty">
        <p>No incoming Commissary transfers found.</p>
        <span>Commissary Out Warehouse batches will appear here.</span>
      </div>
    `;
  }

  return `
    <div class="branch-order-list incoming-commissary-list-scroll">
      ${batches
        .map((batch) => {
          const firstEntry = batch.entries[0] || {};
          const status = getIncomingCommissaryBatchStatus(batch);

          return `
            <button
              class="branch-order-list-item ${
                selectedBatch?.batchId === batch.batchId ? "active" : ""
              }"
              data-select-incoming-commissary="${batch.batchId}"
            >
              <div>
                <strong>${batch.batchId}</strong>
                <p>Commissary → Warehouse • ${(batch.entries || []).length} item(s)</p>
                <span>
                  Sent: ${formatIncomingCommissaryDateTime(
                    firstEntry.submittedAt || firstEntry.date
                  )}
                </span>
              </div>

              <div class="branch-order-list-meta">
                <span class="badge ${getIncomingCommissaryStatusBadgeClass(status)}">
                  ${status}
                </span>
              </div>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderIncomingCommissaryLines(batch) {
  const draft = getIncomingCommissaryDraft(batch);
  const batchStatus = getIncomingCommissaryBatchStatus(batch);
  const isLocked = batchStatus === "Received" || batchStatus === "Variance";
  const filteredLines = getFilteredIncomingCommissaryLines(batch);

  if (!batch || !batch.entries || batch.entries.length === 0) {
    return `
      <p class="submit-preview-empty">
        No incoming lines found for this Commissary transfer.
      </p>
    `;
  }

  if (filteredLines.length === 0) {
    return `
      <p class="submit-preview-empty">
        No lines match the selected Department/Section filters.
      </p>
    `;
  }

  return `
    <div class="warehouse-order-fulfillment-table-wrap incoming-commissary-line-scroll">
      <table class="warehouse-order-fulfillment-table">
        <thead>
          <tr>
            <th>Department</th>
            <th>Section</th>
            <th>Item ID</th>
            <th>Item Name</th>
            <th>Sent Qty</th>
            <th>Received Qty</th>
            <th>Variance</th>
            <th>Unit</th>
            <th>Condition</th>
          </tr>
        </thead>

        <tbody>
          ${filteredLines
            .map((entry) => {
              const lineKey = getIncomingCommissaryLineKey(entry);
              const sentQty = Number(entry.quantity || 0);
              const receivedValue =
                draft.lines?.[lineKey]?.receivedQty ?? "";
              const receivedQty = Number(receivedValue);
              const hasReceivedQty =
                String(receivedValue || "").trim() !== "" &&
                !Number.isNaN(receivedQty);
              const variance = hasReceivedQty ? receivedQty - sentQty : "-";
              const condition = draft.lines?.[lineKey]?.condition || "Good";

              return `
                <tr>
                  <td>${entry.department || "-"}</td>
                  <td>${entry.section || "-"}</td>
                  <td>${entry.itemId || "-"}</td>
                  <td>${entry.itemName || "-"}</td>
                  <td>${sentQty}</td>
                  <td>
                    <input
                      class="fulfillment-input"
                      data-incoming-commissary-received="${lineKey}"
                      type="number"
                      min="0"
                      step="any"
                      value="${receivedValue}"
                      ${isLocked ? "disabled" : ""}
                    />
                  </td>
                  <td>
                    <span class="${
                      variance !== "-" && variance !== 0 ? "danger-text" : ""
                    }">
                      ${variance}
                    </span>
                  </td>
                  <td>${entry.unit || "-"}</td>
                  <td>
                    <select
                      data-incoming-commissary-condition="${lineKey}"
                      ${isLocked ? "disabled" : ""}
                    >
                      <option value="Good" ${condition === "Good" ? "selected" : ""}>
                        Good
                      </option>
                      <option value="Damaged" ${condition === "Damaged" ? "selected" : ""}>
                        Damaged
                      </option>
                      <option value="Missing" ${condition === "Missing" ? "selected" : ""}>
                        Missing
                      </option>
                      <option value="Needs Review" ${
                        condition === "Needs Review" ? "selected" : ""
                      }>
                        Needs Review
                      </option>
                    </select>
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSelectedIncomingCommissaryTransfer() {
  const batch = getSelectedIncomingCommissaryBatch();

  if (!batch) {
    return `
      <section class="panel branch-order-detail">
        <div class="order-list-empty">
          <p>No Commissary transfer selected.</p>
          <span>Select a pending incoming transfer from the list.</span>
        </div>
      </section>
    `;
  }

  const firstEntry = batch.entries[0] || {};
  const draft = getIncomingCommissaryDraft(batch);
  const batchStatus = getIncomingCommissaryBatchStatus(batch);
  const isLocked = batchStatus === "Received" || batchStatus === "Variance";
  const sentTotal = getIncomingCommissarySentTotal(batch);
  const previewStatus = getIncomingCommissaryDraftStatus(batch);

  return `
    <section class="panel branch-order-detail">
      <div class="panel-header">
        <div>
          <h3>${batch.batchId}</h3>
          <p>
            Commissary → Warehouse • ${firstEntry.date || "-"}
          </p>
        </div>

        <div class="branch-order-list-meta">
          <span class="badge ${getIncomingCommissaryStatusBadgeClass(batchStatus)}">
            ${batchStatus}
          </span>
        </div>
      </div>

      <div class="branch-order-info-grid warehouse-order-info-grid">
        <div>
          <p class="eyebrow">Sent By / Reviewed By</p>
          <strong>${firstEntry.managerReviewedBy || "-"}</strong>
        </div>

        <div>
          <p class="eyebrow">Sent At</p>
          <strong>${formatIncomingCommissaryDateTime(
            firstEntry.submittedAt || firstEntry.date
          )}</strong>
        </div>

        <div>
          <p class="eyebrow">Source</p>
          <strong>${firstEntry.source || "Commissary"}</strong>
        </div>

        <div>
          <p class="eyebrow">Destination</p>
          <strong>${firstEntry.destination || "Warehouse"}</strong>
        </div>

        <div>
          <p class="eyebrow">Sent Total</p>
          <strong>${sentTotal}</strong>
        </div>
      </div>

      <div class="branch-order-section">
        <div class="fulfillment-panel-header">
          <div>
            <h4>Warehouse Receiving Check</h4>
            <p>Confirm the quantity Warehouse actually received from Commissary.</p>
          </div>

          <span class="badge">Draft Receive Only</span>
        </div>

        <div class="warehouse-order-filter-grid">
          <label>
            Department
            <select id="incoming-commissary-detail-department">
              ${renderIncomingCommissaryDepartmentOptions(batch)}
            </select>
          </label>

          <label>
            Section
            <select id="incoming-commissary-detail-section">
              ${renderIncomingCommissarySectionOptions(batch)}
            </select>
          </label>
        </div>

        ${renderIncomingCommissaryLines(batch)}
      </div>

      <div class="branch-order-section fulfillment-panel">
        <div class="fulfillment-meta-grid warehouse-fulfillment-meta-grid">
          <label>
            Received By
            <input
              id="incoming-commissary-received-by"
              type="text"
              placeholder="Warehouse receiver name"
              value="${draft.receivedBy || ""}"
              ${isLocked ? "disabled" : ""}
            />
          </label>

          <label class="form-full">
            Receiving Notes
            <textarea
              id="incoming-commissary-receiving-notes"
              rows="3"
              placeholder="Receiving notes, variance explanation, handling notes..."
              ${isLocked ? "disabled" : ""}
            >${draft.receivingNotes || ""}</textarea>
          </label>
        </div>
      </div>

      <div class="instruction-box">
        <strong>Current Version:</strong>
        <span>
          This page is currently a Warehouse receiving workspace only. Confirming receipt saves the receipt status for this page,
          but it does not update Warehouse Stock yet. Warehouse Stock will connect after this view is finalized.
        </span>
      </div>

      <div class="form-actions branch-order-actions">
        <button
          class="primary-button"
          id="confirm-incoming-commissary-receipt"
          ${isLocked ? "disabled" : ""}
        >
          Confirm Receipt Preview
        </button>

        <button
          class="ghost-button"
          id="save-incoming-commissary-draft"
          ${isLocked ? "disabled" : ""}
        >
          Save Draft
        </button>

        <span class="badge ${getIncomingCommissaryStatusBadgeClass(previewStatus)}">
          Preview: ${previewStatus}
        </span>
      </div>
    </section>
  `;
}

function getIncomingFromCommissaryContent() {
  const filters = window.DMC_INCOMING_COMMISSARY_FILTERS;
  const summary = getIncomingCommissarySummary();

  return `
    <section class="grid">
      <div class="card">
        <p>Total Transfers</p>
        <strong>${summary.total}</strong>
      </div>

      <div class="card">
        <p>Pending</p>
        <strong>${summary.pending}</strong>
      </div>

      <div class="card">
        <p>Received</p>
        <strong>${summary.received}</strong>
      </div>

      <div class="card">
        <p>Variance</p>
        <strong>${summary.variance}</strong>
      </div>
    </section>

    <section class="branch-orders-layout">
      <section class="panel branch-order-list-panel">
        <div class="panel-header">
          <div>
            <h3>Incoming from Commissary</h3>
            <p>Warehouse receiving queue for products/items sent from Commissary.</p>
          </div>
        </div>

        <div class="warehouse-order-filter-grid">
          <label>
            Status
            <select id="incoming-commissary-status-filter">
              ${renderIncomingCommissaryStatusOptions()}
            </select>
          </label>

          <label>
            Start Date
            <input
              id="incoming-commissary-start-date"
              type="date"
              value="${filters.startDate}"
            />
          </label>

          <label>
            End Date
            <input
              id="incoming-commissary-end-date"
              type="date"
              value="${filters.endDate}"
            />
          </label>
        </div>

        <div class="filter-bar branch-order-search-bar">
          <label class="filter-search">
            Search
            <input
              id="incoming-commissary-search"
              type="text"
              placeholder="Search batch, item, sender, notes..."
              value="${filters.search}"
            />
          </label>

          <button class="ghost-button" id="clear-incoming-commissary-filters">
            Clear
          </button>
        </div>

        ${renderIncomingCommissaryBatchList()}
      </section>

      ${renderSelectedIncomingCommissaryTransfer()}
    </section>
  `;
}

function refreshIncomingFromCommissaryPage() {
  window.DMC_PAGES["incoming-from-commissary"].content =
    getIncomingFromCommissaryContent();

  renderPage("incoming-from-commissary");
}

function setupIncomingFromCommissaryEvents() {
  const statusFilter = document.getElementById(
    "incoming-commissary-status-filter"
  );
  const startDateInput = document.getElementById(
    "incoming-commissary-start-date"
  );
  const endDateInput = document.getElementById("incoming-commissary-end-date");
  const searchInput = document.getElementById("incoming-commissary-search");
  const clearButton = document.getElementById(
    "clear-incoming-commissary-filters"
  );

  if (statusFilter) {
    statusFilter.addEventListener("change", () => {
      window.DMC_INCOMING_COMMISSARY_FILTERS.status = statusFilter.value;
      window.DMC_INCOMING_COMMISSARY_FILTERS.selectedBatchId = "";
      refreshIncomingFromCommissaryPage();
    });
  }

  if (startDateInput) {
    startDateInput.addEventListener("change", () => {
      window.DMC_INCOMING_COMMISSARY_FILTERS.startDate = startDateInput.value;
      window.DMC_INCOMING_COMMISSARY_FILTERS.selectedBatchId = "";
      refreshIncomingFromCommissaryPage();
    });
  }

  if (endDateInput) {
    endDateInput.addEventListener("change", () => {
      window.DMC_INCOMING_COMMISSARY_FILTERS.endDate = endDateInput.value;
      window.DMC_INCOMING_COMMISSARY_FILTERS.selectedBatchId = "";
      refreshIncomingFromCommissaryPage();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      window.DMC_INCOMING_COMMISSARY_FILTERS.search = searchInput.value;
      window.DMC_INCOMING_COMMISSARY_FILTERS.selectedBatchId = "";
      refreshIncomingFromCommissaryPage();
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      window.DMC_INCOMING_COMMISSARY_FILTERS = {
        status: "pending",
        startDate: "",
        endDate: "",
        search: "",
        selectedBatchId: "",
        detailDepartment: "all",
        detailSection: "all"
      };

      refreshIncomingFromCommissaryPage();
    });
  }

  document.querySelectorAll("[data-select-incoming-commissary]").forEach(
    (button) => {
      button.addEventListener("click", () => {
        window.DMC_INCOMING_COMMISSARY_FILTERS.selectedBatchId =
          button.dataset.selectIncomingCommissary;
        window.DMC_INCOMING_COMMISSARY_FILTERS.detailDepartment = "all";
        window.DMC_INCOMING_COMMISSARY_FILTERS.detailSection = "all";

        refreshIncomingFromCommissaryPage();
      });
    }
  );

  const detailDepartmentFilter = document.getElementById(
    "incoming-commissary-detail-department"
  );

  if (detailDepartmentFilter) {
    detailDepartmentFilter.addEventListener("change", () => {
      const selectedBatch = getSelectedIncomingCommissaryBatch();

      saveIncomingCommissaryDraftFromInputs(selectedBatch);

      window.DMC_INCOMING_COMMISSARY_FILTERS.detailDepartment =
        detailDepartmentFilter.value;
      window.DMC_INCOMING_COMMISSARY_FILTERS.detailSection = "all";

      refreshIncomingFromCommissaryPage();
    });
  }

  const detailSectionFilter = document.getElementById(
    "incoming-commissary-detail-section"
  );

  if (detailSectionFilter) {
    detailSectionFilter.addEventListener("change", () => {
      const selectedBatch = getSelectedIncomingCommissaryBatch();

      saveIncomingCommissaryDraftFromInputs(selectedBatch);

      window.DMC_INCOMING_COMMISSARY_FILTERS.detailSection =
        detailSectionFilter.value;

      refreshIncomingFromCommissaryPage();
    });
  }

  const selectedBatch = getSelectedIncomingCommissaryBatch();

  document
    .querySelectorAll(
      "[data-incoming-commissary-received], [data-incoming-commissary-condition]"
    )
    .forEach((input) => {
      input.addEventListener("input", () => {
        saveIncomingCommissaryDraftFromInputs(selectedBatch);
      });

      input.addEventListener("change", () => {
        saveIncomingCommissaryDraftFromInputs(selectedBatch);
        refreshIncomingFromCommissaryPage();
      });
    });

  const receivedByInput = document.getElementById(
    "incoming-commissary-received-by"
  );
  const receivingNotesInput = document.getElementById(
    "incoming-commissary-receiving-notes"
  );

  [receivedByInput, receivingNotesInput].forEach((input) => {
    if (input) {
      input.addEventListener("input", () => {
        saveIncomingCommissaryDraftFromInputs(selectedBatch);
      });
    }
  });

  const saveDraftButton = document.getElementById(
    "save-incoming-commissary-draft"
  );

  if (saveDraftButton && selectedBatch) {
    saveDraftButton.addEventListener("click", () => {
      saveIncomingCommissaryDraftFromInputs(selectedBatch);

      if (typeof window.DMC_SHOW_MODAL === "function") {
        window.DMC_SHOW_MODAL({
          type: "success",
          title: "Draft Saved",
          message:
            "Incoming from Commissary receiving draft was saved for this batch.",
          confirmLabel: "Continue"
        });
      }
    });
  }

  const confirmButton = document.getElementById(
    "confirm-incoming-commissary-receipt"
  );

  if (confirmButton && selectedBatch) {
    confirmButton.addEventListener("click", () => {
      saveIncomingCommissaryDraftFromInputs(selectedBatch);

      const draft = getIncomingCommissaryDraft(selectedBatch);

      if (!String(draft.receivedBy || "").trim()) {
        if (typeof window.DMC_SHOW_MODAL === "function") {
          window.DMC_SHOW_MODAL({
            type: "warning",
            title: "Received By Required",
            message:
              "Please enter who received this Commissary transfer before confirming.",
            confirmLabel: "Got it"
          });
        } else {
          alert("Please enter who received this Commissary transfer.");
        }

        return;
      }

      const hasInvalidReceivedQty = selectedBatch.entries.some((entry) => {
        const lineKey = getIncomingCommissaryLineKey(entry);
        const value = draft.lines?.[lineKey]?.receivedQty;
        const quantity = Number(value);

        return (
          String(value || "").trim() === "" ||
          Number.isNaN(quantity) ||
          quantity < 0
        );
      });

      if (hasInvalidReceivedQty) {
        if (typeof window.DMC_SHOW_MODAL === "function") {
          window.DMC_SHOW_MODAL({
            type: "warning",
            title: "Check Received Quantity",
            message:
              "Please enter a valid received quantity for every line.",
            confirmLabel: "Got it"
          });
        } else {
          alert("Please enter a valid received quantity for every line.");
        }

        return;
      }

      const receiptStatus = getIncomingCommissaryDraftStatus(selectedBatch);

      saveIncomingCommissaryReceipt(selectedBatch.batchId, {
        batchId: selectedBatch.batchId,
        status: receiptStatus,
        receivedBy: draft.receivedBy,
        receivingNotes: draft.receivingNotes,
        receivedAt: new Date().toISOString(),
        lines: draft.lines
      });

      window.DMC_INCOMING_COMMISSARY_FILTERS.selectedBatchId =
        selectedBatch.batchId;

      if (typeof window.DMC_SHOW_MODAL === "function") {
        window.DMC_SHOW_MODAL({
          type: receiptStatus === "Variance" ? "warning" : "success",
          title:
            receiptStatus === "Variance"
              ? "Receipt Saved with Variance"
              : "Receipt Saved",
          message:
            "Receipt preview was saved. Warehouse Stock is not updated yet; we will connect stock after finalizing this page.",
          confirmLabel: "Continue"
        });
      }

      refreshIncomingFromCommissaryPage();
    });
  }
}

window.DMC_PAGES["incoming-from-commissary"] = {
  eyebrow: "Warehouse",
  title: "Incoming from Commissary",
  description:
    "Warehouse receiving queue for products and items transferred out from Commissary.",
  getContent: getIncomingFromCommissaryContent,
  content: getIncomingFromCommissaryContent(),
  afterRender: setupIncomingFromCommissaryEvents
};
