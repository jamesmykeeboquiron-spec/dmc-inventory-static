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

function saveIncomingCommissaryLedgerEntries(entries) {
  localStorage.setItem(
    DMC_INCOMING_COMMISSARY_LEDGER_KEY,
    JSON.stringify(entries)
  );
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

function getIncomingCommissaryTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getIncomingCommissaryTimestamp() {
  return new Date().toISOString();
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

function buildIncomingCommissaryWarehouseLedgerEntries(batch, draft, receiptStatus) {
  const receivedAt = getIncomingCommissaryTimestamp();
  const receivedDate = getIncomingCommissaryTodayDate();

  return batch.entries
    .map((entry) => {
      const lineKey = getIncomingCommissaryLineKey(entry);
      const draftLine = draft.lines?.[lineKey] || {};
      const receivedQty = Number(draftLine.receivedQty || 0);
      const sentQty = Number(entry.quantity || 0);
      const variance = receivedQty - sentQty;
      const condition = draftLine.condition || "Good";

      if (Number.isNaN(receivedQty) || receivedQty <= 0) {
        return null;
      }

      return {
        date: receivedDate,
        submittedAt: receivedAt,
        receivedAt,
        batchId: `WH-RCV-${batch.batchId}`,
        sourceBatchId: batch.batchId,
        receiptSourceBatchId: batch.batchId,
        receiptLineKey: lineKey,
        location: "Warehouse",
        department: entry.department || "Warehouse",
        section: entry.section || "",
        itemId: entry.itemId || "",
        itemName: entry.itemName || "",
        movementType: "Transfer In",
        movementField: "incomingFromCommissaryReceived",
        stockEffect: "add",
        quantity: receivedQty,
        sentQuantity: sentQty,
        variance,
        unit: entry.unit || "",
        source: "Incoming from Commissary",
        destination: "Warehouse",
        receivedBy: draft.receivedBy,
        managerReviewedBy: draft.receivedBy,
        condition,
        receiptStatus,
        notes: [
          `Warehouse received from Commissary batch ${batch.batchId}.`,
          `Sent Qty: ${sentQty}.`,
          `Received Qty: ${receivedQty}.`,
          `Variance: ${variance}.`,
          `Condition: ${condition}.`,
          draft.receivingNotes ? `Receiving Notes: ${draft.receivingNotes}` : "",
          entry.notes ? `Original Notes: ${entry.notes}` : ""
        ]
          .filter(Boolean)
          .join(" ")
      };
    })
    .filter(Boolean);
}

function warehouseReceiptAlreadyPosted(batchId) {
  return getIncomingCommissaryLedgerEntries().some((entry) => {
    return (
      entry.movementField === "incomingFromCommissaryReceived" &&
      entry.receiptSourceBatchId === batchId
    );
  });
}

function postIncomingCommissaryReceiptToWarehouseLedger(batch, draft, receiptStatus) {
  if (warehouseReceiptAlreadyPosted(batch.batchId)) {
    return {
      posted: false,
      entries: []
    };
  }

  const currentEntries = getIncomingCommissaryLedgerEntries();
  const warehouseEntries = buildIncomingCommissaryWarehouseLedgerEntries(
    batch,
    draft,
    receiptStatus
  );

  saveIncomingCommissaryLedgerEntries([...currentEntries, ...warehouseEntries]);

  return {
    posted: true,
    entries: warehouseEntries
  };
}

function renderIncomingCommissaryBatchList() {
  const batches = getIncomingCommissaryBatches();
  const selectedBatch = getSelectedIncomingCommissaryBatch();

  if (batches.length === 0) {
    return `
      <div class="order-list-empty">
        <p>No incoming Commissary transfers found.</p>
        <span>
