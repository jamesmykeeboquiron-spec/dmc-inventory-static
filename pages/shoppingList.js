window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_SHOPPING_LIST_MASTER_LIST_KEY = "dmc_master_list_items";
const DMC_SHOPPING_LIST_LEDGER_KEY = "dmc_inventory_ledger_entries";
const DMC_SHOPPING_LIST_DRAFT_KEY = "dmc_shopping_list_draft";
const DMC_SHOPPING_LIST_PURCHASE_ORDERS_KEY = "dmc_purchase_orders";

window.DMC_SHOPPING_LIST_SEARCH = window.DMC_SHOPPING_LIST_SEARCH || "";
window.DMC_SHOPPING_LIST_DEPARTMENT =
  window.DMC_SHOPPING_LIST_DEPARTMENT || "all";
window.DMC_SHOPPING_LIST_SELECTED_ITEM_ID =
  window.DMC_SHOPPING_LIST_SELECTED_ITEM_ID || "";

function getStoredShoppingListMasterItems() {
  const storedItems = localStorage.getItem(DMC_SHOPPING_LIST_MASTER_LIST_KEY);

  if (!storedItems) {
    return window.DMC_DATA?.masterList?.items || [];
  }

  try {
    const parsedItems = JSON.parse(storedItems);

    if (!Array.isArray(parsedItems)) {
      return window.DMC_DATA?.masterList?.items || [];
    }

    return parsedItems;
  } catch {
    return window.DMC_DATA?.masterList?.items || [];
  }
}

function getStoredShoppingListLedgerEntries() {
  const storedEntries = localStorage.getItem(DMC_SHOPPING_LIST_LEDGER_KEY);

  if (!storedEntries) {
    return window.DMC_DATA?.ledger || [];
  }

  try {
    const parsedEntries = JSON.parse(storedEntries);

    if (!Array.isArray(parsedEntries)) {
      return window.DMC_DATA?.ledger || [];
    }

    return parsedEntries;
  } catch {
    return window.DMC_DATA?.ledger || [];
  }
}

function getStoredShoppingListPurchaseOrders() {
  const storedOrders = localStorage.getItem(
    DMC_SHOPPING_LIST_PURCHASE_ORDERS_KEY
  );

  if (!storedOrders) {
    return [];
  }

  try {
    const parsedOrders = JSON.parse(storedOrders);

    if (!Array.isArray(parsedOrders)) {
      return [];
    }

    return parsedOrders;
  } catch {
    return [];
  }
}

function saveShoppingListPurchaseOrders(orders) {
  localStorage.setItem(
    DMC_SHOPPING_LIST_PURCHASE_ORDERS_KEY,
    JSON.stringify(orders)
  );
}

function getDefaultShoppingListDraft() {
  return {
    supplier: "",
    preparedBy: "",
    neededDate: "",
    notes: "",
    lines: []
  };
}

function getStoredShoppingListDraft() {
  const storedDraft = localStorage.getItem(DMC_SHOPPING_LIST_DRAFT_KEY);

  if (!storedDraft) {
    return getDefaultShoppingListDraft();
  }

  try {
    const parsedDraft = JSON.parse(storedDraft);

    if (!parsedDraft || typeof parsedDraft !== "object") {
      return getDefaultShoppingListDraft();
    }

    return {
      ...getDefaultShoppingListDraft(),
      ...parsedDraft,
      lines: Array.isArray(parsedDraft.lines) ? parsedDraft.lines : []
    };
  } catch {
    return getDefaultShoppingListDraft();
  }
}

function saveShoppingListDraft(draft) {
  localStorage.setItem(DMC_SHOPPING_LIST_DRAFT_KEY, JSON.stringify(draft));
}

function clearShoppingListDraft() {
  localStorage.removeItem(DMC_SHOPPING_LIST_DRAFT_KEY);
}

function getShoppingListItemOperatingAreas(item) {
  if (Array.isArray(item?.operatingAreas)) {
    return item.operatingAreas.filter(Boolean);
  }

  if (item?.operatingArea) {
    return String(item.operatingArea)
      .split(",")
      .map((area) => area.trim())
      .filter(Boolean);
  }

  return [];
}

function itemIsActiveInWarehouseForShoppingList(item) {
  const areas = getShoppingListItemOperatingAreas(item).map((area) =>
    String(area || "").toLowerCase()
  );

  return areas.some((area) => {
    return area.includes("warehouse") || area.includes("stockroom");
  });
}

function getShoppingListMasterItems() {
  return getStoredShoppingListMasterItems()
    .filter((item) => item.active !== false)
    .filter(itemIsActiveInWarehouseForShoppingList)
    .sort((a, b) => {
      return String(a.officialItemName || a.name || "").localeCompare(
        String(b.officialItemName || b.name || "")
      );
    });
}

function getShoppingListDepartments() {
  return [
    ...new Set(
      getShoppingListMasterItems()
        .map((item) => item.department || "Unassigned")
        .filter(Boolean)
    )
  ].sort();
}

function entryBelongsToWarehouseShoppingStock(entry) {
  const location = String(entry.location || "").toLowerCase();
  const department = String(entry.department || "").toLowerCase();
  const source = String(entry.source || "").toLowerCase();
  const destination = String(entry.destination || "").toLowerCase();

  if (
    source.includes("branch daily input") ||
    source.includes("commissary daily input") ||
    location.includes("branch") ||
    location.includes("dmc-iriga") ||
    location.includes("commissary")
  ) {
    return false;
  }

  return (
    location.includes("warehouse") ||
    location.includes("stockroom") ||
    department.includes("warehouse") ||
    department.includes("stockroom") ||
    source.includes("warehouse") ||
    source.includes("supplier") ||
    source.includes("incoming from commissary") ||
    source.includes("commissary receipt") ||
    destination.includes("warehouse") ||
    destination.includes("stockroom")
  );
}

function getShoppingListLedgerEntriesForItem(itemId) {
  return getStoredShoppingListLedgerEntries().filter((entry) => {
    return (
      entryBelongsToWarehouseShoppingStock(entry) &&
      String(entry.itemId || "") === String(itemId || "")
    );
  });
}

function getShoppingListEntryTime(entry) {
  return String(entry.submittedAt || entry.receivedAt || entry.date || "");
}

function getShoppingListEntryStockEffect(entry) {
  if (entry.stockEffect) {
    return entry.stockEffect;
  }

  if (
    entry.movementType === "Transfer In" ||
    entry.movementType === "Received" ||
    entry.movementType === "Supplier Receiving"
  ) {
    return "add";
  }

  if (
    entry.movementType === "Transfer Out" ||
    entry.movementType === "Usage" ||
    entry.movementType === "Waste"
  ) {
    return "deduct";
  }

  if (
    entry.movementType === "Remaining Count" ||
    entry.movementType === "Stock Count"
  ) {
    return "set";
  }

  return "report";
}

function getLatestShoppingListCountEntry(itemId) {
  const countEntries = getShoppingListLedgerEntriesForItem(itemId).filter(
    (entry) =>
      entry.movementType === "Remaining Count" ||
      entry.movementType === "Stock Count" ||
      entry.stockEffect === "set"
  );

  if (countEntries.length === 0) {
    return null;
  }

  return [...countEntries].sort((a, b) => {
    return getShoppingListEntryTime(b).localeCompare(
      getShoppingListEntryTime(a)
    );
  })[0];
}

function getShoppingListOpeningStock(item) {
  const openingStock =
    item.openingStock ??
    item.startingStock ??
    item.currentStock ??
    item.quantity ??
    0;

  const parsedStock = Number(openingStock);

  return Number.isNaN(parsedStock) ? 0 : parsedStock;
}

function calculateShoppingListCurrentStock(item) {
  const entries = getShoppingListLedgerEntriesForItem(item.itemId);
  const latestCount = getLatestShoppingListCountEntry(item.itemId);

  if (latestCount) {
    const latestCountTime = getShoppingListEntryTime(latestCount);
    const baseStock = Number(latestCount.quantity || 0);

    return entries
      .filter((entry) => {
        if (entry === latestCount) {
          return false;
        }

        return getShoppingListEntryTime(entry) > latestCountTime;
      })
      .reduce((total, entry) => {
        const quantity = Number(entry.quantity || 0);
        const stockEffect = getShoppingListEntryStockEffect(entry);

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
    const stockEffect = getShoppingListEntryStockEffect(entry);

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
  }, getShoppingListOpeningStock(item));
}

function getShoppingListItemStatus(item) {
  const currentStock = calculateShoppingListCurrentStock(item);
  const minimumStock = Number(item.minimumStock || 0);

  if (currentStock <= 0) {
    return "Out of Stock";
  }

  if (minimumStock > 0 && currentStock < minimumStock) {
    return "Low Stock";
  }

  return "In Stock";
}

function getShoppingListStatusBadgeClass(status) {
  if (status === "Out of Stock") {
    return "danger";
  }

  if (status === "Low Stock") {
    return "warning";
  }

  return "success";
}

function getFilteredShoppingListMasterItems() {
  const searchValue = String(window.DMC_SHOPPING_LIST_SEARCH || "")
    .toLowerCase()
    .trim();

  const selectedDepartment = String(
    window.DMC_SHOPPING_LIST_DEPARTMENT || "all"
  ).toLowerCase();

  return getShoppingListMasterItems().filter((item) => {
    const itemDepartment = String(
      item.department || "Unassigned"
    ).toLowerCase();

    const matchesDepartment =
      selectedDepartment === "all" || itemDepartment === selectedDepartment;

    const matchesSearch =
      !searchValue ||
      String(item.itemId || "").toLowerCase().includes(searchValue) ||
      String(item.officialItemName || item.name || "")
        .toLowerCase()
        .includes(searchValue) ||
      String(item.department || "").toLowerCase().includes(searchValue) ||
      String(item.section || "").toLowerCase().includes(searchValue) ||
      String(item.unit || "").toLowerCase().includes(searchValue);

    return matchesDepartment && matchesSearch;
  });
}

function getShoppingListSelectedItem() {
  const items = getFilteredShoppingListMasterItems();

  if (window.DMC_SHOPPING_LIST_SELECTED_ITEM_ID) {
    const selectedItem = items.find(
      (item) =>
        String(item.itemId || "") ===
        String(window.DMC_SHOPPING_LIST_SELECTED_ITEM_ID || "")
    );

    if (selectedItem) {
      return selectedItem;
    }
  }

  return items[0] || null;
}

function getShoppingListDraftSummary() {
  const draft = getStoredShoppingListDraft();
  const lines = draft.lines || [];

  const totalQty = lines.reduce((total, line) => {
    const qty = Number(line.orderQty || 0);
    return total + (Number.isNaN(qty) ? 0 : qty);
  }, 0);

  const urgentCount = lines.filter((line) => line.priority === "Urgent").length;
  const highCount = lines.filter((line) => line.priority === "High").length;

  return {
    itemCount: lines.length,
    totalQty,
    urgentCount,
    highCount
  };
}

function createShoppingListPurchaseOrderId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replaceAll("-", "");
  const timePart = now.toTimeString().slice(0, 8).replaceAll(":", "");

  return `PO-${datePart}-${timePart}`;
}

function getShoppingListReadableTimestamp() {
  const now = new Date();

  return now.toLocaleString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getTodayShoppingListDate() {
  return new Date().toISOString().slice(0, 10);
}

function renderShoppingListDepartmentOptions() {
  const currentDepartment = window.DMC_SHOPPING_LIST_DEPARTMENT;

  return `
    <option value="all" ${currentDepartment === "all" ? "selected" : ""}>
      All Departments
    </option>
    ${getShoppingListDepartments()
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

function renderShoppingListItemList() {
  const items = getFilteredShoppingListMasterItems();
  const selectedItem = getShoppingListSelectedItem();

  if (items.length === 0) {
    return `
      <div class="order-list-empty">
        <p>No Warehouse items found.</p>
        <span>Add items to Master List and check Warehouse under Active In.</span>
      </div>
    `;
  }

  return `
    <div class="branch-order-list">
      ${items
        .map((item) => {
          const currentStock = calculateShoppingListCurrentStock(item);
          const status = getShoppingListItemStatus(item);

          return `
            <button
              class="branch-order-list-item ${
                selectedItem?.itemId === item.itemId ? "active" : ""
              }"
              data-select-shopping-item="${item.itemId}"
            >
              <div>
                <strong>${item.officialItemName || item.name || "-"}</strong>
                <p>${item.itemId || "-"} • ${item.section || "No section"}</p>
                <span>
                  Current: ${currentStock} ${item.unit || ""} • Minimum:
                  ${Number(item.minimumStock || 0)} ${item.unit || ""}
                </span>
              </div>

              <div class="branch-order-list-meta">
                <span class="badge ${getShoppingListStatusBadgeClass(status)}">
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

function renderPriorityOptions(currentPriority) {
  const priorities = ["Normal", "High", "Urgent"];

  return priorities
    .map(
      (priority) => `
        <option value="${priority}" ${
        currentPriority === priority ? "selected" : ""
      }>
          ${priority}
        </option>
      `
    )
    .join("");
}

function renderShoppingListDraftRows() {
  const draft = getStoredShoppingListDraft();
  const lines = draft.lines || [];

  if (lines.length === 0) {
    return `
      <tr>
        <td colspan="10">
          No items added yet. Select an item from the left, set quantity, then click Add to Shopping List.
        </td>
      </tr>
    `;
  }

  return lines
    .map(
      (line, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>
            <strong>${line.itemName || "-"}</strong>
            <small class="table-subtext">${line.itemId || "-"}</small>
          </td>
          <td>${line.section || "-"}</td>
          <td>${line.currentStock ?? "-"}</td>
          <td>${line.minimumStock ?? "-"}</td>
          <td>
            <input
              class="daily-input-cell shopping-list-line-input"
              data-shopping-line-index="${index}"
              data-field="orderQty"
              type="number"
              min="0"
              step="any"
              value="${line.orderQty || ""}"
            />
          </td>
          <td>${line.unit || "-"}</td>
          <td>
            <select
              class="shopping-list-line-input"
              data-shopping-line-index="${index}"
              data-field="priority"
            >
              ${renderPriorityOptions(line.priority || "Normal")}
            </select>
          </td>
          <td>
            <input
              class="daily-input-cell shopping-list-line-input notes-input"
              data-shopping-line-index="${index}"
              data-field="notes"
              type="text"
              value="${line.notes || ""}"
              placeholder="Optional"
            />
          </td>
          <td>
            <button
              class="tiny-button danger"
              data-remove-shopping-line="${index}"
            >
              Remove
            </button>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderSelectedShoppingListItemPanel() {
  const selectedItem = getShoppingListSelectedItem();

  if (!selectedItem) {
    return `
      <div class="instruction-box">
        <strong>No Item Selected:</strong>
        <span>Select a Warehouse item from the list to add it to the Shopping List.</span>
      </div>
    `;
  }

  const currentStock = calculateShoppingListCurrentStock(selectedItem);
  const status = getShoppingListItemStatus(selectedItem);

  return `
    <div class="submit-preview-box">
      <div class="review-mode-header">
        <div>
          <h4>${selectedItem.officialItemName || selectedItem.name || "-"}</h4>
          <p>
            ${selectedItem.itemId || "-"} • ${selectedItem.section || "No section"} •
            Current: ${currentStock} ${selectedItem.unit || ""} •
            Minimum: ${Number(selectedItem.minimumStock || 0)} ${
    selectedItem.unit || ""
  }
          </p>
        </div>

        <span class="badge ${getShoppingListStatusBadgeClass(status)}">
          ${status}
        </span>
      </div>

      <div class="shopping-list-add-grid">
        <label>
          Quantity to Buy
          <input
            id="shopping-list-add-qty"
            type="number"
            min="0"
            step="any"
            placeholder="Example: 5"
          />
        </label>

        <label>
          Priority
          <select id="shopping-list-add-priority">
            <option value="Normal">Normal</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </label>

        <label class="form-full">
          Item Notes
          <input
            id="shopping-list-add-notes"
            type="text"
            placeholder="Example: buy if price is good, preferred brand, substitute allowed..."
          />
        </label>

        <div class="form-actions form-full">
          <button class="primary-button" id="add-selected-shopping-item">
            Add to Shopping List
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderShoppingListDraftHeader() {
  const draft = getStoredShoppingListDraft();

  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Shopping List Draft</h3>
          <p>
            Manager-controlled buying list. Add, remove, and edit items before creating a Purchase Order.
          </p>
        </div>

        <span class="badge info-badge">Draft</span>
      </div>

      <div class="shopping-list-draft-grid">
        <label>
          Supplier / Store
          <input
            id="shopping-list-supplier"
            type="text"
            placeholder="Example: Local Market, Gaisano, Supplier Name"
            value="${draft.supplier || ""}"
          />
        </label>

        <label>
          Prepared By
          <input
            id="shopping-list-prepared-by"
            type="text"
            placeholder="Manager name"
            value="${draft.preparedBy || ""}"
          />
        </label>

        <label>
          Needed Date
          <input
            id="shopping-list-needed-date"
            type="date"
            value="${draft.neededDate || ""}"
          />
        </label>

        <label class="form-full">
          Draft Notes
          <input
            id="shopping-list-draft-notes"
            type="text"
            placeholder="Overall notes for this buying list"
            value="${draft.notes || ""}"
          />
        </label>
      </div>
    </section>
  `;
}

function renderShoppingListDraftTable() {
  return `
    <section class="panel shopping-list-detail">
      <div class="panel-header">
        <div>
          <h3>Items to Buy</h3>
          <p>
            This is still editable. Purchase Order is created only when you click Create Purchase Order.
          </p>
        </div>

        <div class="form-actions">
          <button class="ghost-button danger" id="clear-shopping-list-draft">
            Clear Draft
          </button>

          <button class="primary-button" id="create-purchase-order-from-shopping-list">
            Create Purchase Order
          </button>
        </div>
      </div>

      <div class="instruction-box">
        <strong>Manager Control:</strong>
        <span>
          Items can be added even if stock is not low. Suggested stock levels are only reference.
          Quantity, priority, and notes can be edited before creating the Purchase Order.
        </span>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Item</th>
              <th>Section</th>
              <th>Current</th>
              <th>Minimum</th>
              <th>Qty to Buy</th>
              <th>Unit</th>
              <th>Priority</th>
              <th>Notes</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            ${renderShoppingListDraftRows()}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function getShoppingListContent() {
  const summary = getShoppingListDraftSummary();

  return `
    <section class="grid">
      <div class="card">
        <p>Draft Items</p>
        <strong>${summary.itemCount}</strong>
      </div>

      <div class="card">
        <p>Total Qty</p>
        <strong>${summary.totalQty}</strong>
      </div>

      <div class="card">
        <p>Urgent</p>
        <strong>${summary.urgentCount}</strong>
      </div>

      <div class="card">
        <p>High Priority</p>
        <strong>${summary.highCount}</strong>
      </div>
    </section>

    <section class="branch-orders-layout shopping-list-layout">
      <section class="panel branch-order-list-panel">
        <div class="panel-header">
          <div>
            <h3>Warehouse Items</h3>
            <p>Select items to add to the Shopping List. Low stock is only a guide.</p>
          </div>

          <span class="badge">Master List</span>
        </div>

        <div class="filter-bar branch-order-search-bar">
          <label>
            Department
            <select id="shopping-list-department-filter">
              ${renderShoppingListDepartmentOptions()}
            </select>
          </label>

          <label class="filter-search">
            Search
            <input
              id="shopping-list-search"
              type="text"
              placeholder="Search item, ID, section..."
              value="${window.DMC_SHOPPING_LIST_SEARCH}"
            />
          </label>
        </div>

        ${renderShoppingListItemList()}

        <div class="branch-order-section">
          <h4>Add Selected Item</h4>
          ${renderSelectedShoppingListItemPanel()}
        </div>
      </section>

      <section>
        ${renderShoppingListDraftHeader()}
        ${renderShoppingListDraftTable()}
      </section>
    </section>
  `;
}

function refreshShoppingListPage() {
  window.DMC_PAGES["shopping-list"].content = getShoppingListContent();
  renderPage("shopping-list");
}

function updateShoppingListDraftField(fieldName, value) {
  const draft = getStoredShoppingListDraft();

  draft[fieldName] = value;

  saveShoppingListDraft(draft);
}

function addSelectedItemToShoppingListDraft() {
  const selectedItem = getShoppingListSelectedItem();

  if (!selectedItem) {
    return;
  }

  const qtyInput = document.getElementById("shopping-list-add-qty");
  const priorityInput = document.getElementById("shopping-list-add-priority");
  const notesInput = document.getElementById("shopping-list-add-notes");

  const rawQty = String(qtyInput?.value || "").trim();
  const orderQty = Number(rawQty);

  if (!rawQty || Number.isNaN(orderQty) || orderQty <= 0) {
    if (typeof window.DMC_SHOW_MODAL === "function") {
      window.DMC_SHOW_MODAL({
        type: "warning",
        title: "Quantity Required",
        message: "Please enter a quantity greater than 0 before adding the item.",
        confirmLabel: "Got it"
      });
    } else {
      alert("Please enter a quantity greater than 0 before adding the item.");
    }

    return;
  }

  const draft = getStoredShoppingListDraft();
  const currentStock = calculateShoppingListCurrentStock(selectedItem);
  const existingLineIndex = draft.lines.findIndex(
    (line) => String(line.itemId) === String(selectedItem.itemId)
  );

  const newLine = {
    lineId: `SL-LINE-${Date.now()}`,
    itemId: selectedItem.itemId || "",
    itemName: selectedItem.officialItemName || selectedItem.name || "",
    department: selectedItem.department || "",
    section: selectedItem.section || "",
    unit: selectedItem.unit || "",
    currentStock,
    minimumStock: Number(selectedItem.minimumStock || 0),
    orderQty,
    receivedQty: 0,
    priority: priorityInput?.value || "Normal",
    notes: notesInput?.value || ""
  };

  if (existingLineIndex >= 0) {
    const existingLine = draft.lines[existingLineIndex];

    draft.lines[existingLineIndex] = {
      ...existingLine,
      orderQty: Number(existingLine.orderQty || 0) + orderQty,
      priority: newLine.priority,
      notes: newLine.notes || existingLine.notes || "",
      currentStock,
      minimumStock: Number(selectedItem.minimumStock || 0)
    };
  } else {
    draft.lines.push(newLine);
  }

  saveShoppingListDraft(draft);
  refreshShoppingListPage();
}

function updateShoppingListLine(index, fieldName, value) {
  const draft = getStoredShoppingListDraft();

  if (!draft.lines[index]) {
    return;
  }

  if (fieldName === "orderQty") {
    const parsedValue = Number(value);

    draft.lines[index][fieldName] = Number.isNaN(parsedValue)
      ? ""
      : parsedValue;
  } else {
    draft.lines[index][fieldName] = value;
  }

  saveShoppingListDraft(draft);
}

function removeShoppingListLine(index) {
  const draft = getStoredShoppingListDraft();

  draft.lines.splice(index, 1);

  saveShoppingListDraft(draft);
  refreshShoppingListPage();
}

function createPurchaseOrderFromShoppingList() {
  const draft = getStoredShoppingListDraft();
  const validLines = (draft.lines || []).filter((line) => {
    const qty = Number(line.orderQty || 0);
    return !Number.isNaN(qty) && qty > 0;
  });

  if (validLines.length === 0) {
    if (typeof window.DMC_SHOW_MODAL === "function") {
      window.DMC_SHOW_MODAL({
        type: "warning",
        title: "No Items to Order",
        message:
          "Please add at least one item with a quantity greater than 0 before creating a Purchase Order.",
        confirmLabel: "Got it"
      });
    } else {
      alert("Please add at least one item with a quantity greater than 0.");
    }

    return;
  }

  const createOrder = () => {
    const now = new Date().toISOString();
    const purchaseOrderId = createShoppingListPurchaseOrderId();

    const newOrder = {
      purchaseOrderId,
      supplier: draft.supplier || "Unassigned Supplier / Store",
      preparedBy: draft.preparedBy || "",
      expectedDate: draft.neededDate || "",
      notes: draft.notes || "",
      status: "Draft",
      source: "Shopping List",
      createdAt: now,
      updatedAt: now,
      createdAtDisplay: getShoppingListReadableTimestamp(),
      lines: validLines.map((line, index) => ({
        lineId: `${purchaseOrderId}-LINE-${index + 1}`,
        itemId: line.itemId || "",
        itemName: line.itemName || "",
        department: line.department || "",
        section: line.section || "",
        unit: line.unit || "",
        orderQty: Number(line.orderQty || 0),
        receivedQty: 0,
        priority: line.priority || "Normal",
        notes: line.notes || "",
        currentStockAtCreation: line.currentStock ?? "",
        minimumStockAtCreation: line.minimumStock ?? ""
      }))
    };

    const currentOrders = getStoredShoppingListPurchaseOrders();

    saveShoppingListPurchaseOrders([newOrder, ...currentOrders]);
    clearShoppingListDraft();

    if (typeof window.DMC_SHOW_MODAL === "function") {
      window.DMC_SHOW_MODAL({
        type: "success",
        title: "Purchase Order Created",
        message: `${purchaseOrderId} was created from the Shopping List. You can review it in Purchase Orders.`,
        confirmLabel: "Continue"
      });
    } else {
      alert(`${purchaseOrderId} was created from the Shopping List.`);
    }

    refreshShoppingListPage();
  };

  if (typeof window.DMC_CONFIRM_MODAL === "function") {
    window.DMC_CONFIRM_MODAL({
      type: "success",
      title: "Create Purchase Order?",
      message: `Create a Purchase Order with ${validLines.length} item${
        validLines.length === 1 ? "" : "s"
      } from this Shopping List?`,
      confirmLabel: "Create PO",
      cancelLabel: "Cancel",
      onConfirm: createOrder
    });
  } else if (
    confirm(
      `Create a Purchase Order with ${validLines.length} item${
        validLines.length === 1 ? "" : "s"
      } from this Shopping List?`
    )
  ) {
    createOrder();
  }
}

function clearShoppingListDraftWithConfirmation() {
  const clearDraft = () => {
    clearShoppingListDraft();
    refreshShoppingListPage();
  };

  if (typeof window.DMC_CONFIRM_MODAL === "function") {
    window.DMC_CONFIRM_MODAL({
      type: "danger",
      title: "Clear Shopping List Draft?",
      message:
        "This will clear the current Shopping List draft only. Purchase Orders will not be deleted.",
      confirmLabel: "Clear Draft",
      cancelLabel: "Cancel",
      onConfirm: clearDraft
    });
  } else if (
    confirm(
      "This will clear the current Shopping List draft only. Purchase Orders will not be deleted. Continue?"
    )
  ) {
    clearDraft();
  }
}

function setupShoppingListEvents() {
  const departmentFilter = document.getElementById(
    "shopping-list-department-filter"
  );
  const searchInput = document.getElementById("shopping-list-search");

  const supplierInput = document.getElementById("shopping-list-supplier");
  const preparedByInput = document.getElementById("shopping-list-prepared-by");
  const neededDateInput = document.getElementById("shopping-list-needed-date");
  const draftNotesInput = document.getElementById("shopping-list-draft-notes");

  const addButton = document.getElementById("add-selected-shopping-item");
  const clearDraftButton = document.getElementById("clear-shopping-list-draft");
  const createPurchaseOrderButton = document.getElementById(
    "create-purchase-order-from-shopping-list"
  );

  if (departmentFilter) {
    departmentFilter.addEventListener("change", () => {
      window.DMC_SHOPPING_LIST_DEPARTMENT = departmentFilter.value;
      window.DMC_SHOPPING_LIST_SELECTED_ITEM_ID = "";
      refreshShoppingListPage();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      window.DMC_SHOPPING_LIST_SEARCH = searchInput.value;
      window.DMC_SHOPPING_LIST_SELECTED_ITEM_ID = "";
      refreshShoppingListPage();
    });
  }

  document.querySelectorAll("[data-select-shopping-item]").forEach((button) => {
    button.addEventListener("click", () => {
      window.DMC_SHOPPING_LIST_SELECTED_ITEM_ID =
        button.dataset.selectShoppingItem;

      refreshShoppingListPage();
    });
  });

  if (supplierInput) {
    supplierInput.addEventListener("input", () => {
      updateShoppingListDraftField("supplier", supplierInput.value);
    });
  }

  if (preparedByInput) {
    preparedByInput.addEventListener("input", () => {
      updateShoppingListDraftField("preparedBy", preparedByInput.value);
    });
  }

  if (neededDateInput) {
    neededDateInput.addEventListener("change", () => {
      updateShoppingListDraftField("neededDate", neededDateInput.value);
    });
  }

  if (draftNotesInput) {
    draftNotesInput.addEventListener("input", () => {
      updateShoppingListDraftField("notes", draftNotesInput.value);
    });
  }

  if (addButton) {
    addButton.addEventListener("click", addSelectedItemToShoppingListDraft);
  }

  document.querySelectorAll(".shopping-list-line-input").forEach((input) => {
    input.addEventListener("input", () => {
      updateShoppingListLine(
        Number(input.dataset.shoppingLineIndex),
        input.dataset.field,
        input.value
      );
    });

    input.addEventListener("change", () => {
      updateShoppingListLine(
        Number(input.dataset.shoppingLineIndex),
        input.dataset.field,
        input.value
      );

      refreshShoppingListPage();
    });
  });

  document.querySelectorAll("[data-remove-shopping-line]").forEach((button) => {
    button.addEventListener("click", () => {
      removeShoppingListLine(Number(button.dataset.removeShoppingLine));
    });
  });

  if (clearDraftButton) {
    clearDraftButton.addEventListener("click", clearShoppingListDraftWithConfirmation);
  }

  if (createPurchaseOrderButton) {
    createPurchaseOrderButton.addEventListener(
      "click",
      createPurchaseOrderFromShoppingList
    );
  }
}

window.DMC_PAGES["shopping-list"] = {
  eyebrow: "Warehouse",
  title: "Shopping List",
  description:
    "Manager-controlled buying draft for Warehouse items before creating Purchase Orders.",
  getContent: getShoppingListContent,
  content: getShoppingListContent(),
  afterRender: setupShoppingListEvents
};
