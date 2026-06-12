window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_COMMISSARY_LOG_STORAGE_KEY_FOR_LOG_PAGE =
const DMC_WAREHOUSE_LOG_STORAGE_KEY_FOR_LOG_PAGE =
"dmc_inventory_ledger_entries";

window.DMC_COMMISSARY_LOG_FILTERS = window.DMC_COMMISSARY_LOG_FILTERS || {
window.DMC_WAREHOUSE_LOG_FILTERS = window.DMC_WAREHOUSE_LOG_FILTERS || {
startDate: "",
endDate: "",
  section: "all",
  department: "all",
movementType: "all",
search: "",
selectedBatchId: ""
};

window.DMC_COMMISSARY_LOG_NOTE_LOOKUP =
  window.DMC_COMMISSARY_LOG_NOTE_LOOKUP || {};
window.DMC_WAREHOUSE_LOG_NOTE_LOOKUP =
  window.DMC_WAREHOUSE_LOG_NOTE_LOOKUP || {};

function getStoredCommissaryLogEntriesForLogPage() {
function getStoredWarehouseLogEntriesForLogPage() {
const storedEntries = localStorage.getItem(
    DMC_COMMISSARY_LOG_STORAGE_KEY_FOR_LOG_PAGE
    DMC_WAREHOUSE_LOG_STORAGE_KEY_FOR_LOG_PAGE
);

if (!storedEntries) {
@@ -37,7 +37,7 @@ function getStoredCommissaryLogEntriesForLogPage() {
}
}

function formatCommissaryLogDateTime(value) {
function formatWarehouseLogDateTime(value) {
if (!value) {
return "-";
}
@@ -57,57 +57,74 @@ function formatCommissaryLogDateTime(value) {
});
}

function entryBelongsToCommissaryLog(entry) {
function entryBelongsToWarehouseLog(entry) {
const location = String(entry.location || "").toLowerCase();
const department = String(entry.department || "").toLowerCase();
const source = String(entry.source || "").toLowerCase();
const destination = String(entry.destination || "").toLowerCase();
  const movementField = String(entry.movementField || "");
  const stockEffect = String(entry.stockEffect || "").toLowerCase();
  const movementField = String(entry.movementField || "").toLowerCase();

  const isBranchSendingToCommissary =
    movementField === "transOutCommissary" ||
    (source.includes("branch daily input") &&
      destination.includes("commissary") &&
      stockEffect === "deduct");

  if (isBranchSendingToCommissary) {
  if (
    source.includes("branch daily input") ||
    source.includes("commissary daily input") ||
    source.includes("commissary daily input closing count") ||
    movementField === "transferoutwarehouse"
  ) {
return false;
}

  return (
    location.includes("commissary") ||
    department.includes("commissary") ||
    source.includes("commissary daily input") ||
    source.includes("commissary daily input closing count") ||
    source.includes("commissary") ||
    source.includes("incoming from branch") ||
    destination.includes("commissary") ||
    movementField === "receivedFromBranch"
  );
  if (source.includes("incoming from commissary")) {
    return true;
  }

  if (
    location.includes("warehouse") ||
    location.includes("stockroom") ||
    department.includes("warehouse") ||
    department.includes("stockroom")
  ) {
    return true;
  }

  if (
    source.includes("warehouse") ||
    source.includes("stockroom") ||
    source.includes("supplier")
  ) {
    return true;
  }

  if (destination.includes("warehouse") || destination.includes("stockroom")) {
    return !location.includes("commissary");
  }

  return false;
}

function getCommissaryLogEntriesOnly() {
  return getStoredCommissaryLogEntriesForLogPage().filter(
    entryBelongsToCommissaryLog
function getWarehouseLogEntriesOnly() {
  return getStoredWarehouseLogEntriesForLogPage().filter(
    entryBelongsToWarehouseLog
);
}

function getCommissaryLogSections() {
function getWarehouseLogDepartments() {
return [
...new Set(
      getCommissaryLogEntriesOnly()
        .map((entry) => entry.section || "")
      getWarehouseLogEntriesOnly()
        .map((entry) => entry.department || "")
.filter(Boolean)
)
].sort();
}

function getCommissaryLogMovementTypes() {
function getWarehouseLogMovementTypes() {
const preferredOrder = [
"Transfer In",
    "Received",
    "Supplier Receiving",
"Transfer Out",
"Remaining Count",
    "Stock Count",
"Usage",
"Waste",
"Daily Note",
@@ -116,7 +133,7 @@ function getCommissaryLogMovementTypes() {

const movementTypes = [
...new Set(
      getCommissaryLogEntriesOnly()
      getWarehouseLogEntriesOnly()
.map((entry) => entry.movementType || "")
.filter(Boolean)
)
@@ -142,23 +159,23 @@ function getCommissaryLogMovementTypes() {
});
}

function getFilteredCommissaryLogEntries() {
  const filters = window.DMC_COMMISSARY_LOG_FILTERS;
function getFilteredWarehouseLogEntries() {
  const filters = window.DMC_WAREHOUSE_LOG_FILTERS;
const searchValue = String(filters.search || "").toLowerCase().trim();
  const selectedSection = String(filters.section || "all");
  const selectedDepartment = String(filters.department || "all");
const selectedMovementType = String(filters.movementType || "all");
const startDate = String(filters.startDate || "");
const endDate = String(filters.endDate || "");

  return getCommissaryLogEntriesOnly().filter((entry) => {
  return getWarehouseLogEntriesOnly().filter((entry) => {
const entryDate = String(entry.date || "");

const matchesStartDate = !startDate || entryDate >= startDate;
const matchesEndDate = !endDate || entryDate <= endDate;

    const matchesSection =
      selectedSection === "all" ||
      String(entry.section || "") === selectedSection;
    const matchesDepartment =
      selectedDepartment === "all" ||
      String(entry.department || "") === selectedDepartment;

const matchesMovementType =
selectedMovementType === "all" ||
@@ -174,21 +191,22 @@ function getFilteredCommissaryLogEntries() {
String(entry.section || "").toLowerCase().includes(searchValue) ||
String(entry.source || "").toLowerCase().includes(searchValue) ||
String(entry.destination || "").toLowerCase().includes(searchValue) ||
      String(entry.notes || "").toLowerCase().includes(searchValue) ||
      String(entry.receivedBy || "").toLowerCase().includes(searchValue) ||
String(entry.managerReviewedBy || "").toLowerCase().includes(searchValue) ||
      String(entry.receivedBy || "").toLowerCase().includes(searchValue);
      String(entry.condition || "").toLowerCase().includes(searchValue) ||
      String(entry.notes || "").toLowerCase().includes(searchValue);

return (
matchesStartDate &&
matchesEndDate &&
      matchesSection &&
      matchesDepartment &&
matchesMovementType &&
matchesSearch
);
});
}

function groupCommissaryLogEntriesByBatch(entries) {
function groupWarehouseLogEntriesByBatch(entries) {
return entries.reduce((groups, entry) => {
const batchId = entry.batchId || "No Batch ID";

@@ -199,31 +217,34 @@ function groupCommissaryLogEntriesByBatch(entries) {
}, {});
}

function getCommissaryLogBatches() {
  const filteredEntries = getFilteredCommissaryLogEntries();
  const groupedEntries = groupCommissaryLogEntriesByBatch(filteredEntries);
function getWarehouseLogEntryTime(entry) {
  return String(entry.submittedAt || entry.receivedAt || entry.date || "");
}

function getWarehouseLogBatches() {
  const filteredEntries = getFilteredWarehouseLogEntries();
  const groupedEntries = groupWarehouseLogEntriesByBatch(filteredEntries);

return Object.entries(groupedEntries)
.map(([batchId, entries]) => ({
batchId,
entries
}))
.sort((a, b) => {
      const aSubmitted = a.entries[0]?.submittedAt || a.entries[0]?.date || "";
      const bSubmitted = b.entries[0]?.submittedAt || b.entries[0]?.date || "";

      return String(bSubmitted).localeCompare(String(aSubmitted));
      return getWarehouseLogEntryTime(b.entries[0] || {}).localeCompare(
        getWarehouseLogEntryTime(a.entries[0] || {})
      );
});
}

function getSelectedCommissaryLogBatch() {
  const batches = getCommissaryLogBatches();
function getSelectedWarehouseLogBatch() {
  const batches = getWarehouseLogBatches();

if (batches.length === 0) {
return null;
}

  const selectedBatchId = window.DMC_COMMISSARY_LOG_FILTERS.selectedBatchId;
  const selectedBatchId = window.DMC_WAREHOUSE_LOG_FILTERS.selectedBatchId;

const selectedBatch = batches.find(
(batch) => batch.batchId === selectedBatchId
@@ -232,35 +253,35 @@ function getSelectedCommissaryLogBatch() {
return selectedBatch || batches[0] || null;
}

function renderCommissaryLogSectionOptions() {
  const currentSection = window.DMC_COMMISSARY_LOG_FILTERS.section;
function renderWarehouseLogDepartmentOptions() {
  const currentDepartment = window.DMC_WAREHOUSE_LOG_FILTERS.department;

return `
    <option value="all" ${currentSection === "all" ? "selected" : ""}>
      All Sections
    <option value="all" ${currentDepartment === "all" ? "selected" : ""}>
      All Departments
   </option>
    ${getCommissaryLogSections()
    ${getWarehouseLogDepartments()
     .map(
        (section) => `
          <option value="${section}" ${
          currentSection === section ? "selected" : ""
        (department) => `
          <option value="${department}" ${
          currentDepartment === department ? "selected" : ""
       }>
            ${section}
            ${department}
         </option>
       `
     )
     .join("")}
 `;
}

function renderCommissaryLogMovementOptions() {
  const currentMovementType = window.DMC_COMMISSARY_LOG_FILTERS.movementType;
function renderWarehouseLogMovementOptions() {
  const currentMovementType = window.DMC_WAREHOUSE_LOG_FILTERS.movementType;

return `
   <option value="all" ${currentMovementType === "all" ? "selected" : ""}>
     All Movements
   </option>
    ${getCommissaryLogMovementTypes()
    ${getWarehouseLogMovementTypes()
     .map(
       (movementType) => `
         <option value="${movementType}" ${
@@ -274,61 +295,71 @@ function renderCommissaryLogMovementOptions() {
 `;
}

function getCommissaryBatchSourceLabel(batch) {
  const entries = batch.entries || [];

  const hasProduction = entries.some(
    (entry) => entry.movementField === "transferInProduction"
  );

  const hasOutWarehouse = entries.some(
    (entry) => entry.movementField === "transferOutWarehouse"
  );

  const hasOutBranch = entries.some(
    (entry) => entry.movementField === "transferOutBranch"
  );

  const hasReceivedFromBranch = entries.some(
    (entry) => entry.movementField === "receivedFromBranch"
  );
function getWarehouseEntryStockEffect(entry) {
  if (entry.stockEffect) {
    return entry.stockEffect;
  }

  const hasRemaining = entries.some(
    (entry) =>
      entry.movementType === "Remaining Count" || entry.stockEffect === "set"
  );
  if (
    entry.movementType === "Transfer In" ||
    entry.movementType === "Received" ||
    entry.movementType === "Supplier Receiving"
  ) {
    return "add";
  }

  if (hasReceivedFromBranch) {
    return "Received from Branch";
  if (
    entry.movementType === "Transfer Out" ||
    entry.movementType === "Waste" ||
    entry.movementType === "Usage"
  ) {
    return "deduct";
}

  if (hasProduction && hasOutWarehouse) {
    return "Commissary Production to Warehouse";
  if (
    entry.movementType === "Stock Count" ||
    entry.movementType === "Remaining Count"
  ) {
    return "set";
}

  if (hasProduction) {
    return "Commissary Production Batch";
  return "report";
}

function getWarehouseBatchSourceLabel(batch) {
  const entries = batch.entries || [];
  const firstEntry = entries[0] || {};
  const source = String(firstEntry.source || "").toLowerCase();

  if (
    entries.some((entry) =>
      String(entry.source || "")
        .toLowerCase()
        .includes("incoming from commissary")
    )
  ) {
    return "Received from Commissary";
}

  if (hasOutWarehouse) {
    return "Commissary Transfer to Warehouse";
  if (source.includes("supplier")) {
    return "Supplier Receiving Batch";
}

  if (hasOutBranch) {
    return "Commissary Transfer to Branch";
  if (source.includes("warehouse daily input")) {
    return "Warehouse Daily Input Batch";
}

  if (hasRemaining) {
    return "Commissary Daily Closing Batch";
  if (entries.some((entry) => getWarehouseEntryStockEffect(entry) === "deduct")) {
    return "Warehouse Transfer Out Batch";
}

  return "Commissary Daily Input Batch";
  return "Warehouse Movement Batch";
}

function getCommissaryBatchEffectCounts(batch) {
function getWarehouseBatchEffectCounts(batch) {
return batch.entries.reduce(
(counts, entry) => {
      const effect = entry.stockEffect || "report";
      const effect = getWarehouseEntryStockEffect(entry);

if (effect === "add") {
counts.add += 1;
@@ -351,83 +382,100 @@ function getCommissaryBatchEffectCounts(batch) {
);
}

function getCommissaryLogNumber(value) {
function getWarehouseLogNumber(value) {
const numberValue = Number(value || 0);

return Number.isNaN(numberValue) ? 0 : numberValue;
}

function cleanCommissaryLogNotes(notes) {
  let cleanedNotes = String(notes || "").trim();
function cleanWarehouseLogNotes(entryOrNotes) {
  let notes =
    typeof entryOrNotes === "string"
      ? String(entryOrNotes || "").trim()
      : String(entryOrNotes?.notes || "").trim();

  if (!cleanedNotes) {
  if (!notes) {
return "";
}

  const entry = typeof entryOrNotes === "string" ? {} : entryOrNotes || {};

const defaultFragments = [
    "Items received from Warehouse into Commissary.",
    "Items returned/transferred from Branch into Commissary.",
    "Finished products made by Commissary production.",
    "Products/items sent from Commissary to Warehouse.",
    "Products/items sent from Commissary to Branch.",
    "Auto-computed from Current + Total In - Total Out - Remaining.",
    "Waste reported only. It is not double-deducted because Remaining Count sets physical stock.",
    "Daily note.",
    "Warehouse received from Commissary.",
    `Original Commissary Batch: ${entry.sourceBatchId || ""}.`,
    `Sent Qty: ${entry.sentQuantity ?? ""}.`,
    `Received Qty: ${entry.quantity ?? ""}.`,
    `Variance: ${entry.variance ?? ""}.`,
    `Condition: ${entry.condition || ""}.`,
"No notes",
"N/A"
];

defaultFragments.forEach((fragment) => {
    cleanedNotes = cleanedNotes.replace(fragment, "");
    if (
      fragment &&
      fragment !== "Original Commissary Batch: ." &&
      fragment !== "Sent Qty: ." &&
      fragment !== "Received Qty: ." &&
      fragment !== "Variance: ." &&
      fragment !== "Condition: ."
    ) {
      notes = notes.replace(fragment, "");
    }
});

  cleanedNotes = cleanedNotes
  notes = notes
.replace(/Closing count submitted by[^.]*\./gi, "")
.replace(/Current:\s*[-\d.]+/gi, "")
    .replace(/In Warehouse:\s*[-\d.]+/gi, "")
    .replace(/In Branch:\s*[-\d.]+/gi, "")
    .replace(/In Production:\s*[-\d.]+/gi, "")
    .replace(/Total In:\s*[-\d.]+/gi, "")
    .replace(/Transfer In:\s*[-\d.]+/gi, "")
.replace(/Total Available:\s*[-\d.]+/gi, "")
    .replace(/Out Warehouse:\s*[-\d.]+/gi, "")
    .replace(/Out Branch:\s*[-\d.]+/gi, "")
    .replace(/Total Out:\s*[-\d.]+/gi, "")
    .replace(/Transfer Out:\s*[-\d.]+/gi, "")
.replace(/Remaining:\s*[-\d.]+/gi, "")
.replace(/Waste:\s*[-\d.]+/gi, "")
.replace(/Usage Auto:\s*[-\d.]+/gi, "")
    .replace(/^Receiving Notes:\s*/i, "")
    .replace(/^Commissary Notes:\s*/i, "")
.replace(/^Notes:\s*/i, "")
.replace(/\s+/g, " ")
.trim();

  return cleanedNotes;
  if (
    notes === "Warehouse received from Commissary." ||
    notes === "No notes" ||
    notes === "N/A"
  ) {
    return "";
  }

  return notes;
}

function createCommissaryLogNoteKey(itemId, index) {
function createWarehouseLogNoteKey(itemId, index) {
return `${itemId || "item"}__${index}`;
}

function renderCommissaryLogNotes(notes, itemId, index) {
  const cleanedNotes = cleanCommissaryLogNotes(notes);
function renderWarehouseLogNotes(notes, itemId, index) {
  const cleanedNotes = cleanWarehouseLogNotes(notes);

if (!cleanedNotes) {
return "-";
}

  const noteKey = createCommissaryLogNoteKey(itemId, index);
  window.DMC_COMMISSARY_LOG_NOTE_LOOKUP[noteKey] = cleanedNotes;
  const noteKey = createWarehouseLogNoteKey(itemId, index);
  window.DMC_WAREHOUSE_LOG_NOTE_LOOKUP[noteKey] = cleanedNotes;

if (cleanedNotes.length <= 55) {
return cleanedNotes;
}

return `
    <button class="tiny-button" data-commissary-note-key="${noteKey}">
    <button class="tiny-button" data-warehouse-note-key="${noteKey}">
     View Notes
   </button>
 `;
}

function getCommissaryLogGroupedItemRows(batch) {
function getWarehouseGroupedItemRows(batch) {
const groupedRows = {};

batch.entries.forEach((entry) => {
@@ -439,78 +487,76 @@ function getCommissaryLogGroupedItemRows(batch) {
itemId: entry.itemId || "-",
itemName: entry.itemName || "-",
unit: entry.unit || "-",
      inWarehouse: 0,
      inBranch: 0,
      inProduction: 0,
      outWarehouse: 0,
      outBranch: 0,
      receivedIn: 0,
      out: 0,
remaining: "",
usage: 0,
waste: 0,
      sentQty: "",
      variance: "",
      condition: "",
notes: []
};

const row = groupedRows[itemId];
    const quantity = getCommissaryLogNumber(entry.quantity);
    const quantity = getWarehouseLogNumber(entry.quantity);
    const stockEffect = getWarehouseEntryStockEffect(entry);
    const movementType = String(entry.movementType || "");
const movementField = String(entry.movementField || "");
const source = String(entry.source || "").toLowerCase();
    const destination = String(entry.destination || "").toLowerCase();

if (
      movementField === "transferInWarehouse" ||
      (entry.movementType === "Transfer In" && source.includes("warehouse"))
      stockEffect === "add" ||
      movementType === "Transfer In" ||
      movementType === "Received" ||
      movementType === "Supplier Receiving" ||
      source.includes("incoming from commissary")
) {
      row.inWarehouse += quantity;
      row.receivedIn += quantity;
}

if (
      movementField === "transferInBranch" ||
      movementField === "receivedFromBranch" ||
      source.includes("incoming from branch") ||
      (entry.movementType === "Transfer In" && source.includes("branch"))
      movementType === "Transfer Out" ||
      movementField === "transferOut" ||
      stockEffect === "deduct"
) {
      row.inBranch += quantity;
      if (movementType !== "Waste" && movementType !== "Usage") {
        row.out += quantity;
      }
}

if (
      movementField === "transferInProduction" ||
      (entry.movementType === "Transfer In" && source.includes("production"))
      movementType === "Remaining Count" ||
      movementType === "Stock Count" ||
      stockEffect === "set"
) {
      row.inProduction += quantity;
      row.remaining = quantity;
}

    if (
      movementField === "transferOutWarehouse" ||
      (entry.movementType === "Transfer Out" &&
        destination.includes("warehouse"))
    ) {
      row.outWarehouse += quantity;
    if (movementType === "Usage" || movementField === "usageAuto") {
      row.usage += quantity;
}

    if (
      movementField === "transferOutBranch" ||
      (entry.movementType === "Transfer Out" && destination.includes("branch"))
    ) {
      row.outBranch += quantity;
    if (movementType === "Waste" || movementField === "waste") {
      row.waste += quantity;
}

    if (
      entry.movementType === "Remaining Count" ||
      entry.stockEffect === "set"
    ) {
      row.remaining = quantity;
    if (entry.sentQuantity !== undefined && entry.sentQuantity !== null) {
      row.sentQty = entry.sentQuantity;
}

    if (entry.movementType === "Usage") {
      row.usage += quantity;
    if (entry.variance !== undefined && entry.variance !== null) {
      row.variance = entry.variance;
}

    if (entry.movementType === "Waste") {
      row.waste += quantity;
    if (entry.condition) {
      row.condition = entry.condition;
}

    if (String(entry.notes || "").trim() !== "") {
      row.notes.push(entry.notes);
    const cleanedNotes = cleanWarehouseLogNotes(entry);

    if (cleanedNotes) {
      row.notes.push(cleanedNotes);
}
});

@@ -519,38 +565,38 @@ function getCommissaryLogGroupedItemRows(batch) {
});
}

function renderCommissaryBatchList() {
  const batches = getCommissaryLogBatches();
function renderWarehouseBatchList() {
  const batches = getWarehouseLogBatches();

if (batches.length === 0) {
return `
     <div class="warehouse-log-empty-card">
        No submitted Commissary batches match the current filters.
        No submitted Warehouse batches match the current filters.
     </div>
   `;
}

return batches
.map((batch) => {
const firstEntry = batch.entries[0] || {};
      const counts = getCommissaryBatchEffectCounts(batch);
      const counts = getWarehouseBatchEffectCounts(batch);
const isActive =
        window.DMC_COMMISSARY_LOG_FILTERS.selectedBatchId === batch.batchId ||
        (!window.DMC_COMMISSARY_LOG_FILTERS.selectedBatchId &&
          getSelectedCommissaryLogBatch()?.batchId === batch.batchId);
        window.DMC_WAREHOUSE_LOG_FILTERS.selectedBatchId === batch.batchId ||
        (!window.DMC_WAREHOUSE_LOG_FILTERS.selectedBatchId &&
          getSelectedWarehouseLogBatch()?.batchId === batch.batchId);

return `
       <button
         class="warehouse-log-batch-card ${isActive ? "active" : ""}"
          data-commissary-batch-id="${batch.batchId}"
          data-warehouse-batch-id="${batch.batchId}"
       >
         <div class="warehouse-log-batch-card-top">
           <div>
              <strong>${getCommissaryBatchSourceLabel(batch)}</strong>
              <strong>${getWarehouseBatchSourceLabel(batch)}</strong>
             <span>${batch.batchId}</span>
           </div>

            <em>${batch.entries.length} rows</em>
            <em>${batch.entries.length} records</em>
         </div>

         <div class="warehouse-log-batch-card-meta">
@@ -559,18 +605,18 @@ function renderCommissaryBatchList() {
         </div>

         <div class="warehouse-log-batch-card-meta">
            <span>Section</span>
            <strong>${firstEntry.section || "-"}</strong>
            <span>Department</span>
            <strong>${firstEntry.department || "-"}</strong>
         </div>

         <div class="warehouse-log-batch-card-meta">
            <span>Effect</span>
            <span>Summary</span>
           <strong>
             <span class="positive-text">+${counts.add}</span>
             /
             <span>${counts.deduct} out</span>
             /
              <span>${counts.set} set</span>
              <span>${counts.set} count</span>
             /
             <span>${counts.report} report</span>
           </strong>
@@ -581,12 +627,18 @@ function renderCommissaryBatchList() {
.join("");
}

function renderCommissaryBatchLineTable(batch) {
  const rows = getCommissaryLogGroupedItemRows(batch);
function renderWarehouseBatchLineTable(batch) {
  if (!batch || batch.entries.length === 0) {
    return `
      <p class="submit-preview-empty">No warehouse movement lines found.</p>
    `;
  }

  const rows = getWarehouseGroupedItemRows(batch);

if (rows.length === 0) {
return `
      <p class="submit-preview-empty">No commissary movement lines found.</p>
      <p class="submit-preview-empty">No warehouse movement lines found.</p>
   `;
}

@@ -599,15 +651,15 @@ function renderCommissaryBatchLineTable(batch) {
           <th>Section</th>
           <th>Item ID</th>
           <th>Item Name</th>
            <th>In Warehouse</th>
            <th>In Branch</th>
            <th>In Production</th>
            <th>Out Warehouse</th>
            <th>Out Branch</th>
            <th>Received / In</th>
            <th>Out</th>
           <th>Remaining</th>
           <th>Usage</th>
           <th>Waste</th>
            <th>Sent Qty</th>
            <th>Variance</th>
           <th>Unit</th>
            <th>Condition</th>
           <th>Notes</th>
         </tr>
       </thead>
@@ -624,20 +676,26 @@ function renderCommissaryBatchLineTable(batch) {
                 <td>${row.section || "-"}</td>
                 <td>${row.itemId || "-"}</td>
                 <td>${row.itemName || "-"}</td>
                  <td>${row.inWarehouse || "-"}</td>
                  <td>${row.inBranch || "-"}</td>
                  <td>${row.inProduction || "-"}</td>
                  <td>${row.outWarehouse || "-"}</td>
                  <td>${row.outBranch || "-"}</td>
                  <td class="${row.receivedIn ? "positive-text" : ""}">
                    ${row.receivedIn || "-"}
                  </td>
                  <td class="${row.out ? "negative-text" : ""}">
                    ${row.out || "-"}
                  </td>
                 <td>${row.remaining === "" ? "-" : row.remaining}</td>
                 <td>${row.usage || "-"}</td>
                 <td>${row.waste || "-"}</td>
                  <td>${row.sentQty === "" ? "-" : row.sentQty}</td>
                  <td class="${
                    row.variance !== "" && Number(row.variance) !== 0
                      ? "danger-text"
                      : ""
                  }">
                    ${row.variance === "" ? "-" : row.variance}
                  </td>
                 <td>${row.unit || "-"}</td>
                  <td>${renderCommissaryLogNotes(
                    joinedNotes,
                    row.itemId,
                    index
                  )}</td>
                  <td>${row.condition || "-"}</td>
                  <td>${renderWarehouseLogNotes(joinedNotes, row.itemId, index)}</td>
               </tr>
             `;
           })
@@ -648,24 +706,24 @@ function renderCommissaryBatchLineTable(batch) {
 `;
}

function renderSelectedCommissaryBatchDetails() {
  const selectedBatch = getSelectedCommissaryLogBatch();
function renderSelectedWarehouseBatchDetails() {
  const selectedBatch = getSelectedWarehouseLogBatch();

if (!selectedBatch) {
return `
     <section class="panel delivery-log-detail">
       <div class="order-list-empty">
         <p>No batch selected.</p>
          <span>Select a submitted batch from the left panel.</span>
          <span>Select a submitted Warehouse batch from the left panel.</span>
       </div>
     </section>
   `;
}

const firstEntry = selectedBatch.entries[0] || {};
const reviewedBy =
    firstEntry.managerReviewedBy ||
firstEntry.receivedBy ||
    firstEntry.managerReviewedBy ||
firstEntry.preparedBy ||
"-";

@@ -675,7 +733,7 @@ function renderSelectedCommissaryBatchDetails() {
       <div>
         <h3>${selectedBatch.batchId}</h3>
         <p>
            Commissary • ${firstEntry.department || "-"} • ${
            Warehouse • ${firstEntry.department || "-"} • ${
   firstEntry.section || "-"
 }
         </p>
@@ -688,14 +746,14 @@ function renderSelectedCommissaryBatchDetails() {

     <div class="delivery-log-info-grid">
       <div>
          <p class="eyebrow">Submitted At</p>
          <strong>${formatCommissaryLogDateTime(
            firstEntry.submittedAt || firstEntry.date
          <p class="eyebrow">Submitted / Received At</p>
          <strong>${formatWarehouseLogDateTime(
            firstEntry.submittedAt || firstEntry.receivedAt || firstEntry.date
         )}</strong>
       </div>

       <div>
          <p class="eyebrow">Reviewed By / Received By</p>
          <p class="eyebrow">Received / Reviewed By</p>
         <strong>${reviewedBy}</strong>
       </div>

@@ -704,11 +762,6 @@ function renderSelectedCommissaryBatchDetails() {
         <strong>${firstEntry.department || "-"}</strong>
       </div>

        <div>
          <p class="eyebrow">Section</p>
          <strong>${firstEntry.section || "-"}</strong>
        </div>

       <div>
         <p class="eyebrow">Source</p>
         <strong>${firstEntry.source || "-"}</strong>
@@ -719,38 +772,31 @@ function renderSelectedCommissaryBatchDetails() {
         <strong>${firstEntry.destination || "-"}</strong>
       </div>

        ${
          firstEntry.sourceBatchId
            ? `
              <div>
                <p class="eyebrow">Original Batch</p>
                <strong>${firstEntry.sourceBatchId}</strong>
              </div>
            `
            : ""
        }
        <div>
          <p class="eyebrow">Original Batch</p>
          <strong>${firstEntry.sourceBatchId || "-"}</strong>
        </div>
     </div>

     <div class="branch-order-section">
        <h4>Commissary Movement Lines</h4>
        ${renderCommissaryBatchLineTable(selectedBatch)}
        <h4>Warehouse Movement Summary</h4>
        ${renderWarehouseBatchLineTable(selectedBatch)}
     </div>

     <div class="instruction-box">
       <strong>Stock Rule:</strong>
       <span>
          In Warehouse, In Branch, and In Production add to Commissary stock.
          Out Warehouse and Out Branch deduct from Commissary stock.
          Remaining Count becomes the latest stock truth, while Usage and Waste are kept for reporting.
          Received / In adds stock. Out deducts stock. Remaining Count becomes the latest physical stock truth.
          Usage and Waste are kept for reporting. Sent Qty, Variance, and Condition are shown for receiving batches.
       </span>
     </div>
   </section>
 `;
}

function getCommissaryLogTransactionContent() {
  const filters = window.DMC_COMMISSARY_LOG_FILTERS;
  const batches = getCommissaryLogBatches();
function getWarehouseLogTransactionContent() {
  const filters = window.DMC_WAREHOUSE_LOG_FILTERS;
  const batches = getWarehouseLogBatches();

return `
   <section class="grid">
@@ -760,24 +806,24 @@ function getCommissaryLogTransactionContent() {
     </div>

     <div class="card">
        <p>Sections</p>
        <strong>${getCommissaryLogSections().length}</strong>
        <p>Departments</p>
        <strong>${getWarehouseLogDepartments().length}</strong>
     </div>

     <div class="card">
       <p>Movement Types</p>
        <strong>${getCommissaryLogMovementTypes().length}</strong>
        <strong>${getWarehouseLogMovementTypes().length}</strong>
     </div>
   </section>

   <section class="delivery-log-layout branch-log-layout">
     <section class="panel delivery-log-list-panel">
       <div class="panel-header">
         <div>
            <h3>Commissary Log Transaction</h3>
            <h3>Warehouse Log Transaction</h3>
           <p>
              Read-only history of Commissary Daily Input, production, transfer movement,
              remaining counts, usage, waste, and notes.
              Read-only history of Warehouse receiving, supplier activity,
              commissary receipts, transfer movement, counts, usage, waste, and notes.
           </p>
         </div>

@@ -789,7 +835,7 @@ function getCommissaryLogTransactionContent() {
           <label>
             Start Date
             <input
                id="commissary-log-start-date"
                id="warehouse-log-start-date"
               type="date"
               value="${filters.startDate}"
             />
@@ -798,43 +844,43 @@ function getCommissaryLogTransactionContent() {
           <label>
             End Date
             <input
                id="commissary-log-end-date"
                id="warehouse-log-end-date"
               type="date"
               value="${filters.endDate}"
             />
           </label>
         </div>

         <label>
            Section
            <select id="commissary-log-section-filter">
              ${renderCommissaryLogSectionOptions()}
            Department
            <select id="warehouse-log-department-filter">
              ${renderWarehouseLogDepartmentOptions()}
           </select>
         </label>

         <label>
           Movement Type
            <select id="commissary-log-movement-filter">
              ${renderCommissaryLogMovementOptions()}
            <select id="warehouse-log-movement-filter">
              ${renderWarehouseLogMovementOptions()}
           </select>
         </label>

         <label class="filter-search">
           Search
           <input
              id="commissary-log-search"
              id="warehouse-log-search"
             type="text"
              placeholder="Search item, batch, source, destination, notes..."
              placeholder="Search item, batch, source, receiver, notes..."
             value="${filters.search}"
           />
         </label>

         <div class="warehouse-log-filter-actions">
            <button class="ghost-button" id="clear-commissary-log-filters">
            <button class="ghost-button" id="clear-warehouse-log-filters">
             Clear
           </button>

            <button class="primary-button" id="export-commissary-log">
            <button class="primary-button" id="export-warehouse-log">
             Export
           </button>
         </div>
@@ -846,83 +892,85 @@ function getCommissaryLogTransactionContent() {
       </div>

       <div class="warehouse-log-batch-list">
          ${renderCommissaryBatchList()}
          ${renderWarehouseBatchList()}
       </div>
     </section>

      ${renderSelectedCommissaryBatchDetails()}
      ${renderSelectedWarehouseBatchDetails()}
   </section>
 `;
}

function refreshCommissaryLogTransactionPage() {
  window.DMC_PAGES["commissary-log-transaction"].content =
    getCommissaryLogTransactionContent();
function refreshWarehouseLogTransactionPage() {
  window.DMC_PAGES["warehouse-log-transaction"].content =
    getWarehouseLogTransactionContent();

  renderPage("commissary-log-transaction");
  renderPage("warehouse-log-transaction");
}

function setupCommissaryLogTransactionEvents() {
  const startDateInput = document.getElementById("commissary-log-start-date");
  const endDateInput = document.getElementById("commissary-log-end-date");
  const sectionFilter = document.getElementById("commissary-log-section-filter");
  const movementFilter = document.getElementById("commissary-log-movement-filter");
  const searchInput = document.getElementById("commissary-log-search");
  const clearButton = document.getElementById("clear-commissary-log-filters");
  const exportButton = document.getElementById("export-commissary-log");
function setupWarehouseLogTransactionEvents() {
  const startDateInput = document.getElementById("warehouse-log-start-date");
  const endDateInput = document.getElementById("warehouse-log-end-date");
  const departmentFilter = document.getElementById(
    "warehouse-log-department-filter"
  );
  const movementFilter = document.getElementById("warehouse-log-movement-filter");
  const searchInput = document.getElementById("warehouse-log-search");
  const clearButton = document.getElementById("clear-warehouse-log-filters");
  const exportButton = document.getElementById("export-warehouse-log");

if (startDateInput) {
startDateInput.addEventListener("change", () => {
      window.DMC_COMMISSARY_LOG_FILTERS.startDate = startDateInput.value;
      window.DMC_COMMISSARY_LOG_FILTERS.selectedBatchId = "";
      refreshCommissaryLogTransactionPage();
      window.DMC_WAREHOUSE_LOG_FILTERS.startDate = startDateInput.value;
      window.DMC_WAREHOUSE_LOG_FILTERS.selectedBatchId = "";
      refreshWarehouseLogTransactionPage();
});
}

if (endDateInput) {
endDateInput.addEventListener("change", () => {
      window.DMC_COMMISSARY_LOG_FILTERS.endDate = endDateInput.value;
      window.DMC_COMMISSARY_LOG_FILTERS.selectedBatchId = "";
      refreshCommissaryLogTransactionPage();
      window.DMC_WAREHOUSE_LOG_FILTERS.endDate = endDateInput.value;
      window.DMC_WAREHOUSE_LOG_FILTERS.selectedBatchId = "";
      refreshWarehouseLogTransactionPage();
});
}

  if (sectionFilter) {
    sectionFilter.addEventListener("change", () => {
      window.DMC_COMMISSARY_LOG_FILTERS.section = sectionFilter.value;
      window.DMC_COMMISSARY_LOG_FILTERS.selectedBatchId = "";
      refreshCommissaryLogTransactionPage();
  if (departmentFilter) {
    departmentFilter.addEventListener("change", () => {
      window.DMC_WAREHOUSE_LOG_FILTERS.department = departmentFilter.value;
      window.DMC_WAREHOUSE_LOG_FILTERS.selectedBatchId = "";
      refreshWarehouseLogTransactionPage();
});
}

if (movementFilter) {
movementFilter.addEventListener("change", () => {
      window.DMC_COMMISSARY_LOG_FILTERS.movementType = movementFilter.value;
      window.DMC_COMMISSARY_LOG_FILTERS.selectedBatchId = "";
      refreshCommissaryLogTransactionPage();
      window.DMC_WAREHOUSE_LOG_FILTERS.movementType = movementFilter.value;
      window.DMC_WAREHOUSE_LOG_FILTERS.selectedBatchId = "";
      refreshWarehouseLogTransactionPage();
});
}

if (searchInput) {
searchInput.addEventListener("input", () => {
      window.DMC_COMMISSARY_LOG_FILTERS.search = searchInput.value;
      window.DMC_COMMISSARY_LOG_FILTERS.selectedBatchId = "";
      refreshCommissaryLogTransactionPage();
      window.DMC_WAREHOUSE_LOG_FILTERS.search = searchInput.value;
      window.DMC_WAREHOUSE_LOG_FILTERS.selectedBatchId = "";
      refreshWarehouseLogTransactionPage();
});
}

if (clearButton) {
clearButton.addEventListener("click", () => {
      window.DMC_COMMISSARY_LOG_FILTERS = {
      window.DMC_WAREHOUSE_LOG_FILTERS = {
startDate: "",
endDate: "",
        section: "all",
        department: "all",
movementType: "all",
search: "",
selectedBatchId: ""
};

      refreshCommissaryLogTransactionPage();
      refreshWarehouseLogTransactionPage();
});
}

@@ -933,26 +981,26 @@ function setupCommissaryLogTransactionEvents() {
type: "info",
title: "Export Coming Soon",
message:
            "Export/print for Commissary Log Transaction will be connected after the reporting workflow is finalized.",
            "Export/print for Warehouse Log Transaction will be connected after the reporting workflow is finalized.",
confirmLabel: "Got it"
});
}
});
}

  document.querySelectorAll("[data-commissary-batch-id]").forEach((button) => {
  document.querySelectorAll("[data-warehouse-batch-id]").forEach((button) => {
button.addEventListener("click", () => {
      window.DMC_COMMISSARY_LOG_FILTERS.selectedBatchId =
        button.dataset.commissaryBatchId;
      window.DMC_WAREHOUSE_LOG_FILTERS.selectedBatchId =
        button.dataset.warehouseBatchId;

      refreshCommissaryLogTransactionPage();
      refreshWarehouseLogTransactionPage();
});
});

  document.querySelectorAll("[data-commissary-note-key]").forEach((button) => {
  document.querySelectorAll("[data-warehouse-note-key]").forEach((button) => {
button.addEventListener("click", () => {
      const noteKey = button.dataset.commissaryNoteKey;
      const note = window.DMC_COMMISSARY_LOG_NOTE_LOOKUP[noteKey] || "";
      const noteKey = button.dataset.warehouseNoteKey;
      const note = window.DMC_WAREHOUSE_LOG_NOTE_LOOKUP[noteKey] || "";

if (typeof window.DMC_SHOW_MODAL === "function") {
window.DMC_SHOW_MODAL({
@@ -968,12 +1016,12 @@ function setupCommissaryLogTransactionEvents() {
});
}

window.DMC_PAGES["commissary-log-transaction"] = {
  eyebrow: "Commissary",
  title: "Commissary Log Transaction",
window.DMC_PAGES["warehouse-log-transaction"] = {
  eyebrow: "Warehouse",
  title: "Warehouse Log Transaction",
description:
    "Read-only batch history of Commissary Daily Input, production, transfer movement, usage, waste, and closing counts.",
  getContent: getCommissaryLogTransactionContent,
  content: getCommissaryLogTransactionContent(),
  afterRender: setupCommissaryLogTransactionEvents
    "Read-only batch history of posted Warehouse receiving, commissary receipts, transfer movement, counts, usage, waste, and stock effects.",
  getContent: getWarehouseLogTransactionContent,
  content: getWarehouseLogTransactionContent(),
  afterRender: setupWarehouseLogTransactionEvents
};
