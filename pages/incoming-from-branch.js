window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_INCOMING_BRANCH_LEDGER_KEY = "dmc_inventory_ledger_entries";

window.DMC_INCOMING_BRANCH_FILTERS =
  window.DMC_INCOMING_BRANCH_FILTERS || {
    status: "pending",
    startDate: "",
    endDate: "",
    search: "",
    selectedBatchId: "",
    detailDepartment: "all",
    detailSection: "all"
  };

window.DMC_INCOMING_BRANCH_RECEIVE_DRAFT =
  window.DMC_INCOMING_BRANCH_RECEIVE_DRAFT || {};

function getIncomingBranchLedgerEntries() {
  const storedEntries = localStorage.getItem(DMC_INCOMING_BRANCH_LEDGER_KEY);

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

function saveIncomingBranchLedgerEntries(entries) {
  localStorage.setItem(DMC_INCOMING_BRANCH_LEDGER_KEY, JSON.stringify(entries));
}

function formatIncomingBranchDateTime(value) {
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

function getIncomingBranchTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getIncomingBranchNowIso() {
  return new Date().toISOString();
}

function createIncomingBranchCommissaryReceiptBatchId(sourceBatchId) {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replaceAll("-", "");
  const timePart = now.toTimeString().slice(0, 8).replaceAll(":", "");

  return `COM-BR-REC-${datePart}-${timePart}-${String(sourceBatchId || "")
    .slice(-6)
    .replace(/[^A-Z0-9]/gi, "")}`;
}

function entryIsBranchTransferOutToCommissary(entry) {
  const movementField = String(entry.movementField || "");
  const movementType = String(entry.movementType || "");
  const source = String(entry.source || "").toLowerCase();
  const destination = String(entry.destination || "").toLowerCase();
  const location = String(entry.location || "").toLowerCase();

  return (
    movementField === "transOutCommissary" ||
    (movementType === "Transfer Out" &&
      (source.includes("branch") || location.includes("branch")) &&
      destination.includes("commissary"))
  );
}

function getIncomingBranchTransferEntries() {
  return getIncomingBranchLedgerEntries().filter(
    entryIsBranchTransferOutToCommissary
  );
}

function groupIncomingBranchEntriesByBatch(entries) {
  return entries.reduce((groups, entry) => {
    const batchId = entry.batchId || "No Batch ID";

    groups[batchId] = groups[batchId] || [];
    groups[batchId].push(entry);

    return groups;
  }, {});
}

function getIncomingBranchReceiptKey(batchId) {
  return `dmc_incoming_branch_receipt_${batchId}`;
}

function getIncomingBranchStoredReceipt(batchId) {
  const storedReceipt = localStorage.getItem(getIncomingBranchReceiptKey(batchId));

  if (!storedReceipt) {
    return null;
  }

  try {
    return JSON.parse(storedReceipt);
  } catch {
    return null;
  }
}

function saveIncomingBranchReceipt(batchId, receipt) {
  localStorage.setItem(getIncomingBranchReceiptKey(batchId), JSON.stringify(receipt));
}

function getIncomingBranchBatchStatus(batch) {
  const receipt = getIncomingBranchStoredReceipt(batch.batchId);

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

function getIncomingBranchStatusBadgeClass(status) {
  if (status === "Received") {
    return "success";
  }

  if (status === "Variance") {
    return "warning-badge";
  }

  return "info-badge";
}

function getIncomingBranchBatchTimestamp(batch) {
  const firstEntry = batch.entries[0] || {};

  return firstEntry.submittedAt || firstEntry.date || "";
}

function getIncomingBranchBatchesRaw() {
  const groupedEntries = groupIncomingBranchEntriesByBatch(
    getIncomingBranchTransferEntries()
  );

  return Object.entries(groupedEntries)
    .map(([batchId, entries]) => ({
      batchId,
      entries
    }))
    .sort((a, b) => {
      return String(getIncomingBranchBatchTimestamp(b)).localeCompare(
        String(getIncomingBranchBatchTimestamp(a))
      );
    });
}

function getIncomingBranchBatches() {
  const filters = window.DMC_INCOMING_BRANCH_FILTERS;
  const searchValue = String(filters.search || "").toLowerCase().trim();
  const selectedStatus = String(filters.status || "pending");
  const startDate = String(filters.startDate || "");
  const endDate = String(filters.endDate || "");

  return getIncomingBranchBatchesRaw().filter((batch) => {
    const firstEntry = batch.entries[0] || {};
    const entryDate = String(firstEntry.date || "");
    const batchStatus = getIncomingBranchBatchStatus(batch);

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

function getSelectedIncomingBranchBatch() {
  const batches = getIncomingBranchBatches();

  if (batches.length === 0) {
    return null;
  }

  const selectedBatchId = window.DMC_INCOMING_BRANCH_FILTERS.selectedBatchId;

  const selectedBatch = batches.find(
    (batch) => batch.batchId === selectedBatchId
  );

  return selectedBatch || batches[0] || null;
}

function getIncomingBranchSummary() {
  const batches = getIncomingBranchBatchesRaw();

  return {
    total: batches.length,
    pending: batches.filter(
      (batch) => getIncomingBranchBatchStatus(batch) === "Pending Receipt"
    ).length,
    received: batches.filter(
      (batch) => getIncomingBranchBatchStatus(batch) === "Received"
    ).length,
    variance: batches.filter(
      (batch) => getIncomingBranchBatchStatus(batch) === "Variance"
    ).length
  };
}

function renderIncomingBranchStatusOptions() {
  const currentStatus = window.DMC_INCOMING_BRANCH_FILTERS.status;
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

function getIncomingBranchSentTotal(batch) {
  return batch.entries.reduce((total, entry) => {
    const quantity = Number(entry.quantity || 0);

    return total + (Number.isNaN(quantity) ? 0 : quantity);
  }, 0);
}

function getIncomingBranchLineKey(entry) {
  return [
    entry.batchId || "batch",
    entry.itemId || "item",
    entry.movementField || "transOutCommissary",
    entry.source || "Branch",
    entry.destination || "Commissary"
  ].join("__");
}

function getIncomingBranchDraft(batch) {
  if (!batch) {
    return {
      receivedBy: "",
      receivingNotes: "",
      lines: {}
    };
  }

  const existingReceipt = getIncomingBranchStoredReceipt(batch.batchId);

  if (!window.DMC_INCOMING_BRANCH_RECEIVE_DRAFT[batch.batchId]) {
    const lineDrafts = {};

    batch.entries.forEach((entry) => {
      const lineKey = getIncomingBranchLineKey(entry);

      lineDrafts[lineKey] = {
        itemId: entry.itemId || "",
        receivedQty:
          existingReceipt?.lines?.[lineKey]?.receivedQty ??
          entry.quantity ??
          "",
        condition: existingReceipt?.lines?.[lineKey]?.condition || "Good"
      };
    });

    window.DMC_INCOMING_BRANCH_RECEIVE_DRAFT[batch.batchId] = {
      receivedBy: existingReceipt?.receivedBy || "",
      receivingNotes: existingReceipt?.receivingNotes || "",
      lines: lineDrafts
    };
  }

  return window.DMC_INCOMING_BRANCH_RECEIVE_DRAFT[batch.batchId];
}

function saveIncomingBranchDraftFromInputs(batch) {
  if (!batch) {
    return;
  }

  const draft = getIncomingBranchDraft(batch);

  document.querySelectorAll("[data-incoming-branch-received]").forEach(
    (input) => {
      const lineKey = input.dataset.incomingBranchReceived;

      draft.lines[lineKey] = draft.lines[lineKey] || {};
      draft.lines[lineKey].receivedQty = input.value;
    }
  );

  document.querySelectorAll("[data-incoming-branch-condition]").forEach(
    (select) => {
      const lineKey = select.dataset.incomingBranchCondition;

      draft.lines[lineKey] = draft.lines[lineKey] || {};
      draft.lines[lineKey].condition = select.value;
    }
  );

  const receivedByInput = document.getElementById("incoming-branch-received-by");
  const receivingNotesInput = document.getElementById(
    "incoming-branch-receiving-notes"
  );

  draft.receivedBy = receivedByInput?.value || "";
  draft.receivingNotes = receivingNotesInput?.value || "";

  window.DMC_INCOMING_BRANCH_RECEIVE_DRAFT[batch.batchId] = draft;
}

function getIncomingBranchDraftStatus(batch) {
  const draft = getIncomingBranchDraft(batch);

  const hasVariance = batch.entries.some((entry) => {
    const lineKey = getIncomingBranchLineKey(entry);
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

function buildCommissaryReceiptLedgerEntriesFromIncomingBranch(
  batch,
  draft,
  receiptBatchId,
  receivedAt
) {
  const receivedDate = getIncomingBranchTodayDate();

  return batch.entries
    .map((entry) => {
      const lineKey = getIncomingBranchLineKey(entry);
      const lineDraft = draft.lines?.[lineKey] || {};
      const receivedQty = Number(lineDraft.receivedQty || 0);
      const sentQty = Number(entry.quantity || 0);
      const variance = receivedQty - sentQty;
      const condition = lineDraft.condition || "Good";

      if (Number.isNaN(receivedQty) || receivedQty <= 0) {
        return null;
      }

      return {
        date: receivedDate,
        submittedAt: receivedAt,
        receivedAt,
        batchId: receiptBatchId,
        sourceBatchId: batch.batchId,
        sourceLineKey: lineKey,
        location: "DMC Commissary",
        department: entry.department || "Commissary",
        section: entry.section || "",
        itemId: entry.itemId || "",
        itemName: entry.itemName || "-",
        movementType: "Transfer In",
        movementField: "receivedFromBranch",
        stockEffect: "add",
        quantity: receivedQty,
        sentQuantity: sentQty,
        variance,
        unit: entry.unit || "",
        receivedBy: draft.receivedBy,
        managerReviewedBy: draft.receivedBy,
        source: "Incoming from Branch",
        destination: "DMC Commissary",
        condition,
        notes: [
          `Commissary received from Branch.`,
          `Original Branch Batch: ${batch.batchId}.`,
          `Sent Qty: ${sentQty}.`,
          `Received Qty: ${receivedQty}.`,
          `Variance: ${variance}.`,
          `Condition: ${condition}.`,
          draft.receivingNotes
            ? `Receiving Notes: ${draft.receivingNotes}`
            : "",
          entry.notes ? `Branch Notes: ${entry.notes}` : ""
        ]
          .filter(Boolean)
          .join(" ")
      };
    })
    .filter(Boolean);
}

function postIncomingBranchReceiptToCommissaryLedger(batch, draft) {
  const existingReceipt = getIncomingBranchStoredReceipt(batch.batchId);

  if (existingReceipt?.postedToCommissaryStock === true) {
    return {
      alreadyPosted: true,
      receipt: existingReceipt,
      postedEntries: []
    };
  }

  const receiptStatus = getIncomingBranchDraftStatus(batch);
  const receivedAt = getIncomingBranchNowIso();
  const receiptBatchId = createIncomingBranchCommissaryReceiptBatchId(
    batch.batchId
  );

  const postedEntries = buildCommissaryReceiptLedgerEntriesFromIncomingBranch(
    batch,
    draft,
    receiptBatchId,
    receivedAt
  );

  const currentLedgerEntries = getIncomingBranchLedgerEntries();
  saveIncomingBranchLedgerEntries([...currentLedgerEntries, ...postedEntries]);

  const receipt = {
    batchId: batch.batchId,
    receiptBatchId,
    status: receiptStatus,
    receivedBy: draft.receivedBy,
    receivingNotes: draft.receivingNotes,
    receivedAt,
    lines: draft.lines,
    postedToCommissaryStock: true,
    postedLedgerBatchId: receiptBatchId,
    postedEntryCount: postedEntries.length
  };

  saveIncomingBranchReceipt(batch.batchId, receipt);

  return {
    alreadyPosted: false,
    receipt,
    postedEntries
  };
}

function getIncomingBranchDepartments(batch) {
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

function getIncomingBranchSections(batch) {
  if (!batch) {
    return [];
  }

  const selectedDepartment = String(
    window.DMC_INCOMING_BRANCH_FILTERS.detailDepartment || "all"
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

function renderIncomingBranchDepartmentOptions(batch) {
  const currentDepartment =
    window.DMC_INCOMING_BRANCH_FILTERS.detailDepartment || "all";

  return `
    <option value="all" ${currentDepartment === "all" ? "selected" : ""}>
      All Departments
    </option>
    ${getIncomingBranchDepartments(batch)
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

function renderIncomingBranchSectionOptions(batch) {
  const currentSection =
    window.DMC_INCOMING_BRANCH_FILTERS.detailSection || "all";

  return `
    <option value="all" ${currentSection === "all" ? "selected" : ""}>
      All Sections
    </option>
    ${getIncomingBranchSections(batch)
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

function getFilteredIncomingBranchLines(batch) {
  if (!batch) {
    return [];
  }

  const selectedDepartment = String(
    window.DMC_INCOMING_BRANCH_FILTERS.detailDepartment || "all"
  ).toLowerCase();

  const selectedSection = String(
    window.DMC_INCOMING_BRANCH_FILTERS.detailSection || "all"
  ).toLowerCase();

  return batch.entries.filter((entry) => {
    const entryDepartment = String(
      entry.department || "Unassigned"
    ).toLowerCase();
    const entrySection = String(entry.section || "Unassigned").toLowerCase();

    const matchesDepartment =
      selectedDepartment === "all" || entryDepartment === selectedDepartment;

    const matchesSection =
      selectedSection === "all" || entrySection === selectedSection;

    return matchesDepartment && matchesSection;
  });
}

function renderIncomingBranchBatchList() {
  const batches = getIncomingBranchBatches();
  const selectedBatch = getSelectedIncomingBranchBatch();

  if (batches.length === 0) {
    return `
      <div class="order-list-empty">
        <p>No incoming Branch transfers found.</p>
        <span>Branch Trans Out Commissary batches will appear here.</span>
      </div>
    `;
  }

  return `
    <div class="branch-order-list incoming-commissary-list-scroll">
      ${batches
        .map((batch) => {
          const firstEntry = batch.entries[0] || {};
          const status = getIncomingBranchBatchStatus(batch);
          const receipt = getIncomingBranchStoredReceipt(batch.batchId);

          return `
            <button
              class="branch-order-list-item ${
                selectedBatch?.batchId === batch.batchId ? "active" : ""
              }"
              data-select-incoming-branch="${batch.batchId}"
            >
              <div>
                <strong>${batch.batchId}</strong>
                <p>Branch → Commissary • ${(batch.entries || []).length} item(s)</p>
                <span>
                  Sent: ${formatIncomingBranchDateTime(
                    firstEntry.submittedAt || firstEntry.date
                  )}
                </span>
                ${
                  receipt?.postedLedgerBatchId
                    ? `<small class="table-subtext">Posted: ${receipt.postedLedgerBatchId}</small>`
                    : ""
                }
              </div>

              <div class="branch-order-list-meta">
                <span class="badge ${getIncomingBranchStatusBadgeClass(status)}">
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

function renderIncomingBranchLines(batch) {
  const draft = getIncomingBranchDraft(batch);
  const batchStatus = getIncomingBranchBatchStatus(batch);
  const isLocked = batchStatus === "Received" || batchStatus === "Variance";
  const filteredLines = getFilteredIncomingBranchLines(batch);

  if (!batch || !batch.entries || batch.entries.length === 0) {
    return `
      <p class="submit-preview-empty">
        No incoming lines found for this Branch transfer.
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
              const lineKey = getIncomingBranchLineKey(entry);
              const sentQty = Number(entry.quantity || 0);
              const receivedValue = draft.lines?.[lineKey]?.receivedQty ?? "";
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
                      data-incoming-branch-received="${lineKey}"
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
                      data-incoming-branch-condition="${lineKey}"
                      ${isLocked ? "disabled" : ""}
                    >
                      <option value="Good" ${
                        condition === "Good" ? "selected" : ""
                      }>
                        Good
                      </option>
                      <option value="Damaged" ${
                        condition === "Damaged" ? "selected" : ""
                      }>
                        Damaged
                      </option>
                      <option value="Missing" ${
                        condition === "Missing" ? "selected" : ""
                      }>
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

function renderSelectedIncomingBranchTransfer() {
  const batch = getSelectedIncomingBranchBatch();

  if (!batch) {
    return `
      <section class="panel branch-order-detail">
        <div class="order-list-empty">
          <p>No Branch transfer selected.</p>
          <span>Select a pending incoming transfer from the list.</span>
        </div>
      </section>
    `;
  }

  const firstEntry = batch.entries[0] || {};
  const draft = getIncomingBranchDraft(batch);
  const batchStatus = getIncomingBranchBatchStatus(batch);
  const receipt = getIncomingBranchStoredReceipt(batch.batchId);
  const isLocked = batchStatus === "Received" || batchStatus === "Variance";
  const sentTotal = getIncomingBranchSentTotal(batch);
  const previewStatus = getIncomingBranchDraftStatus(batch);

  return `
    <section class="panel branch-order-detail">
      <div class="panel-header">
        <div>
          <h3>${batch.batchId}</h3>
          <p>
            Branch → Commissary • ${firstEntry.date || "-"}
          </p>
        </div>

        <div class="branch-order-list-meta">
          <span class="badge ${getIncomingBranchStatusBadgeClass(batchStatus)}">
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
          <strong>${formatIncomingBranchDateTime(
            firstEntry.submittedAt || firstEntry.date
          )}</strong>
        </div>

        <div>
          <p class="eyebrow">Source</p>
          <strong>${firstEntry.source || "Branch"}</strong>
        </div>

        <div>
          <p class="eyebrow">Destination</p>
          <strong>${firstEntry.destination || "DMC Commissary"}</strong>
        </div>

        <div>
          <p class="eyebrow">Sent Total</p>
          <strong>${sentTotal}</strong>
        </div>

        ${
          receipt?.postedLedgerBatchId
            ? `
              <div>
                <p class="eyebrow">Commissary Receipt Batch</p>
                <strong>${receipt.postedLedgerBatchId}</strong>
              </div>
            `
            : ""
        }
      </div>

      <div class="branch-order-section">
        <div class="fulfillment-panel-header">
          <div>
            <h4>Commissary Receiving Check</h4>
            <p>Confirm the quantity Commissary actually received from Branch.</p>
          </div>

          <span class="badge">
            ${receipt?.postedToCommissaryStock ? "Posted to Commissary Stock" : "Ready to Receive"}
          </span>
        </div>

        <div class="warehouse-order-filter-grid">
          <label>
            Department
            <select id="incoming-branch-detail-department" ${
              isLocked ? "disabled" : ""
            }>
              ${renderIncomingBranchDepartmentOptions(batch)}
            </select>
          </label>

          <label>
            Section
            <select id="incoming-branch-detail-section" ${
              isLocked ? "disabled" : ""
            }>
              ${renderIncomingBranchSectionOptions(batch)}
            </select>
          </label>
        </div>

        ${renderIncomingBranchLines(batch)}
      </div>

      <div class="branch-order-section fulfillment-panel">
        <div class="fulfillment-meta-grid warehouse-fulfillment-meta-grid">
          <label>
            Received By
            <input
              id="incoming-branch-received-by"
              type="text"
              placeholder="Commissary receiver name"
              value="${draft.receivedBy || ""}"
              ${isLocked ? "disabled" : ""}
            />
          </label>

          <label class="form-full">
            Receiving Notes
            <textarea
              id="incoming-branch-receiving-notes"
              rows="3"
              placeholder="Receiving notes, variance explanation, handling notes..."
              ${isLocked ? "disabled" : ""}
            >${draft.receivingNotes || ""}</textarea>
          </label>
        </div>
      </div>

      <div class="instruction-box">
        <strong>Stock Rule:</strong>
        <span>
          Confirm Receipt posts actual Received Qty to Commissary Stock. If Sent Qty and Received Qty are different,
          the receipt is saved as Variance and Commissary Stock only increases by the actual received quantity.
        </span>
      </div>

      <div class="form-actions branch-order-actions">
        <button
          class="primary-button"
          id="confirm-incoming-branch-receipt"
          ${isLocked ? "disabled" : ""}
        >
          Confirm Receipt
        </button>

        <button
          class="ghost-button"
          id="save-incoming-branch-draft"
          ${isLocked ? "disabled" : ""}
        >
          Save Draft
        </button>

        <span class="badge ${getIncomingBranchStatusBadgeClass(previewStatus)}">
          Preview: ${previewStatus}
        </span>
      </div>
    </section>
  `;
}

function getIncomingFromBranchContent() {
  const filters = window.DMC_INCOMING_BRANCH_FILTERS;
  const summary = getIncomingBranchSummary();

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
            <h3>Incoming from Branch</h3>
            <p>Commissary receiving queue for items sent back from Branch.</p>
          </div>
        </div>

        <div class="warehouse-order-filter-grid">
          <label>
            Status
            <select id="incoming-branch-status-filter">
              ${renderIncomingBranchStatusOptions()}
            </select>
          </label>

          <label>
            Start Date
            <input
              id="incoming-branch-start-date"
              type="date"
              value="${filters.startDate}"
            />
          </label>

          <label>
            End Date
            <input
              id="incoming-branch-end-date"
              type="date"
              value="${filters.endDate}"
            />
          </label>
        </div>

        <div class="filter-bar branch-order-search-bar">
          <label class="filter-search">
            Search
            <input
              id="incoming-branch-search"
              type="text"
              placeholder="Search batch, item, sender, notes..."
              value="${filters.search}"
            />
          </label>

          <button class="ghost-button" id="clear-incoming-branch-filters">
            Clear
          </button>
        </div>

        ${renderIncomingBranchBatchList()}
      </section>

      ${renderSelectedIncomingBranchTransfer()}
    </section>
  `;
}

function refreshIncomingFromBranchPage() {
  window.DMC_PAGES["incoming-from-branch"].content =
    getIncomingFromBranchContent();

  renderPage("incoming-from-branch");
}

function setupIncomingFromBranchEvents() {
  const statusFilter = document.getElementById("incoming-branch-status-filter");
  const startDateInput = document.getElementById("incoming-branch-start-date");
  const endDateInput = document.getElementById("incoming-branch-end-date");
  const searchInput = document.getElementById("incoming-branch-search");
  const clearButton = document.getElementById("clear-incoming-branch-filters");

  if (statusFilter) {
    statusFilter.addEventListener("change", () => {
      window.DMC_INCOMING_BRANCH_FILTERS.status = statusFilter.value;
      window.DMC_INCOMING_BRANCH_FILTERS.selectedBatchId = "";
      refreshIncomingFromBranchPage();
    });
  }

  if (startDateInput) {
    startDateInput.addEventListener("change", () => {
      window.DMC_INCOMING_BRANCH_FILTERS.startDate = startDateInput.value;
      window.DMC_INCOMING_BRANCH_FILTERS.selectedBatchId = "";
      refreshIncomingFromBranchPage();
    });
  }

  if (endDateInput) {
    endDateInput.addEventListener("change", () => {
      window.DMC_INCOMING_BRANCH_FILTERS.endDate = endDateInput.value;
      window.DMC_INCOMING_BRANCH_FILTERS.selectedBatchId = "";
      refreshIncomingFromBranchPage();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      window.DMC_INCOMING_BRANCH_FILTERS.search = searchInput.value;
      window.DMC_INCOMING_BRANCH_FILTERS.selectedBatchId = "";
      refreshIncomingFromBranchPage();
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      window.DMC_INCOMING_BRANCH_FILTERS = {
        status: "pending",
        startDate: "",
        endDate: "",
        search: "",
        selectedBatchId: "",
        detailDepartment: "all",
        detailSection: "all"
      };

      refreshIncomingFromBranchPage();
    });
  }

  document.querySelectorAll("[data-select-incoming-branch]").forEach((button) => {
    button.addEventListener("click", () => {
      window.DMC_INCOMING_BRANCH_FILTERS.selectedBatchId =
        button.dataset.selectIncomingBranch;
      window.DMC_INCOMING_BRANCH_FILTERS.detailDepartment = "all";
      window.DMC_INCOMING_BRANCH_FILTERS.detailSection = "all";

      refreshIncomingFromBranchPage();
    });
  });

  const detailDepartmentFilter = document.getElementById(
    "incoming-branch-detail-department"
  );

  if (detailDepartmentFilter) {
    detailDepartmentFilter.addEventListener("change", () => {
      const selectedBatch = getSelectedIncomingBranchBatch();

      saveIncomingBranchDraftFromInputs(selectedBatch);

      window.DMC_INCOMING_BRANCH_FILTERS.detailDepartment =
        detailDepartmentFilter.value;
      window.DMC_INCOMING_BRANCH_FILTERS.detailSection = "all";

      refreshIncomingFromBranchPage();
    });
  }

  const detailSectionFilter = document.getElementById(
    "incoming-branch-detail-section"
  );

  if (detailSectionFilter) {
    detailSectionFilter.addEventListener("change", () => {
      const selectedBatch = getSelectedIncomingBranchBatch();

      saveIncomingBranchDraftFromInputs(selectedBatch);

      window.DMC_INCOMING_BRANCH_FILTERS.detailSection =
        detailSectionFilter.value;

      refreshIncomingFromBranchPage();
    });
  }

  const selectedBatch = getSelectedIncomingBranchBatch();

  document
    .querySelectorAll(
      "[data-incoming-branch-received], [data-incoming-branch-condition]"
    )
    .forEach((input) => {
      input.addEventListener("input", () => {
        saveIncomingBranchDraftFromInputs(selectedBatch);
      });

      input.addEventListener("change", () => {
        saveIncomingBranchDraftFromInputs(selectedBatch);
        refreshIncomingFromBranchPage();
      });
    });

  const receivedByInput = document.getElementById("incoming-branch-received-by");
  const receivingNotesInput = document.getElementById(
    "incoming-branch-receiving-notes"
  );

  [receivedByInput, receivingNotesInput].forEach((input) => {
    if (input) {
      input.addEventListener("input", () => {
        saveIncomingBranchDraftFromInputs(selectedBatch);
      });
    }
  });

  const saveDraftButton = document.getElementById("save-incoming-branch-draft");

  if (saveDraftButton && selectedBatch) {
    saveDraftButton.addEventListener("click", () => {
      saveIncomingBranchDraftFromInputs(selectedBatch);

      if (typeof window.DMC_SHOW_MODAL === "function") {
        window.DMC_SHOW_MODAL({
          type: "success",
          title: "Draft Saved",
          message:
            "Incoming from Branch receiving draft was saved for this batch.",
          confirmLabel: "Continue"
        });
      }
    });
  }

  const confirmButton = document.getElementById(
    "confirm-incoming-branch-receipt"
  );

  if (confirmButton && selectedBatch) {
    confirmButton.addEventListener("click", () => {
      saveIncomingBranchDraftFromInputs(selectedBatch);

      const draft = getIncomingBranchDraft(selectedBatch);

      if (!String(draft.receivedBy || "").trim()) {
        if (typeof window.DMC_SHOW_MODAL === "function") {
          window.DMC_SHOW_MODAL({
            type: "warning",
            title: "Received By Required",
            message:
              "Please enter who received this Branch transfer before confirming.",
            confirmLabel: "Got it"
          });
        } else {
          alert("Please enter who received this Branch transfer.");
        }

        return;
      }

      const hasInvalidReceivedQty = selectedBatch.entries.some((entry) => {
        const lineKey = getIncomingBranchLineKey(entry);
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
            message: "Please enter a valid received quantity for every line.",
            confirmLabel: "Got it"
          });
        } else {
          alert("Please enter a valid received quantity for every line.");
        }

        return;
      }

      const postResult = postIncomingBranchReceiptToCommissaryLedger(
        selectedBatch,
        draft
      );

      window.DMC_INCOMING_BRANCH_FILTERS.selectedBatchId =
        selectedBatch.batchId;

      if (typeof window.DMC_SHOW_MODAL === "function") {
        window.DMC_SHOW_MODAL({
          type:
            postResult.receipt.status === "Variance" ? "warning" : "success",
          title:
            postResult.receipt.status === "Variance"
              ? "Receipt Posted with Variance"
              : "Receipt Posted",
          message: postResult.alreadyPosted
            ? "This receipt was already posted to Commissary Stock, so it was not posted again."
            : `Receipt was saved and ${postResult.postedEntries.length} Commissary Stock movement entr${
                postResult.postedEntries.length === 1 ? "y was" : "ies were"
              } posted using actual received quantity.`,
          confirmLabel: "Continue"
        });
      }

      refreshIncomingFromBranchPage();
    });
  }
}

window.DMC_PAGES["incoming-from-branch"] = {
  eyebrow: "DMC Commissary",
  title: "Incoming from Branch",
  description:
    "Commissary receiving queue for items transferred out from Branch.",
  getContent: getIncomingFromBranchContent,
  content: getIncomingFromBranchContent(),
  afterRender: setupIncomingFromBranchEvents
};
