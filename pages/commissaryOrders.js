window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_COMMISSARY_ORDER_MASTER_LIST_KEY = "dmc_master_list_items";
const DMC_COMMISSARY_ORDER_LEDGER_KEY = "dmc_inventory_ledger_entries";
const DMC_COMMISSARY_ORDER_STORAGE_KEY = "dmc_commissary_orders";
const DMC_COMMISSARY_ORDER_MINIMUMS_KEY = "dmc_commissary_stock_minimums";

window.DMC_COMMISSARY_ORDER_SELECTED_SECTION =
  window.DMC_COMMISSARY_ORDER_SELECTED_SECTION || "all";
window.DMC_COMMISSARY_ORDER_SELECTED_ITEM_ID =
  window.DMC_COMMISSARY_ORDER_SELECTED_ITEM_ID || "";
window.DMC_COMMISSARY_ORDER_SEARCH = window.DMC_COMMISSARY_ORDER_SEARCH || "";
window.DMC_COMMISSARY_ORDER_QTY = window.DMC_COMMISSARY_ORDER_QTY || "";
window.DMC_COMMISSARY_ORDER_CART = window.DMC_COMMISSARY_ORDER_CART || [];
window.DMC_COMMISSARY_ORDER_NOTES = window.DMC_COMMISSARY_ORDER_NOTES || "";
window.DMC_COMMISSARY_ORDER_URGENT = window.DMC_COMMISSARY_ORDER_URGENT || false;
window.DMC_COMMISSARY_ORDER_REQUESTED_BY =
  window.DMC_COMMISSARY_ORDER_REQUESTED_BY || "";

function getCommissaryOrderMasterListItems() {
  const storedItems = localStorage.getItem(DMC_COMMISSARY_ORDER_MASTER_LIST_KEY);
  if (!storedItems) return [];
  try {
    const parsedItems = JSON.parse(storedItems);
    return Array.isArray(parsedItems) ? parsedItems : [];
  } catch {
    return [];
  }
}

function getCommissaryOrderLedgerEntries() {
  const storedEntries = localStorage.getItem(DMC_COMMISSARY_ORDER_LEDGER_KEY);
  if (!storedEntries) return window.DMC_DATA?.ledger || [];
  try {
    const parsedEntries = JSON.parse(storedEntries);
    return Array.isArray(parsedEntries) ? parsedEntries : [];
  } catch {
    return window.DMC_DATA?.ledger || [];
  }
}

function getCommissaryOrderSettings() {
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

function getCommissaryOrderSettingName(option) {
  if (typeof option === "string") return option;
  return option?.name || option?.fullName || option?.label || "";
}

function getCommissaryOrderManagers() {
  const settings = getCommissaryOrderSettings();
  const managerSources = [
    ...(settings.managerNames || []),
    ...(settings.managers || []),
    ...(settings.commissaryManagers || [])
  ];
  const staffManagers = (settings.staffMembers || settings.staff || []).filter(
    (staff) => {
      const role = String(staff.role || staff.position || staff.access || "").toLowerCase();
      return role.includes("manager") || role.includes("admin");
    }
  );
  return [...managerSources, ...staffManagers]
    .map(getCommissaryOrderSettingName)
    .filter(Boolean);
}

function renderCommissaryRequestedByOptions() {
  const currentManager = window.DMC_COMMISSARY_ORDER_REQUESTED_BY;
  const managers = getCommissaryOrderManagers();
  if (managers.length === 0) {
    return `
      <option value="" ${currentManager === "" ? "selected" : ""}>Select requesting manager</option>
      <option value="Commissary Manager" ${currentManager === "Commissary Manager" ? "selected" : ""}>Commissary Manager</option>
      <option value="Manager Ana" ${currentManager === "Manager Ana" ? "selected" : ""}>Manager Ana</option>
    `;
  }
  return `
    <option value="" ${currentManager === "" ? "selected" : ""}>Select requesting manager</option>
    ${managers.map((manager) => `
      <option value="${manager}" ${currentManager === manager ? "selected" : ""}>${manager}</option>
    `).join("")}
  `;
}

function getStoredCommissaryOrders() {
  const storedOrders = localStorage.getItem(DMC_COMMISSARY_ORDER_STORAGE_KEY);
  if (!storedOrders) return [];
  try {
    const parsedOrders = JSON.parse(storedOrders);
    return Array.isArray(parsedOrders) ? parsedOrders : [];
  } catch {
    return [];
  }
}

function saveCommissaryOrders(orders) {
  localStorage.setItem(DMC_COMMISSARY_ORDER_STORAGE_KEY, JSON.stringify(orders));
}

function getCommissaryOrderItemOperatingAreas(item) {
  if (Array.isArray(item?.operatingAreas)) return item.operatingAreas.filter(Boolean);
  if (item?.operatingArea) {
    return String(item.operatingArea).split(",").map((area) => area.trim()).filter(Boolean);
  }
  return [];
}

function itemBelongsToCommissaryOrder(item) {
  if (item.active === false) return false;
  return getCommissaryOrderItemOperatingAreas(item)
    .map((area) => String(area || "").toLowerCase())
    .some((area) => area.includes("commissary"));
}

function entryBelongsToCommissaryOrderStock(entry) {
  const location = String(entry.location || "").toLowerCase();
  const department = String(entry.department || "").toLowerCase();
  const source = String(entry.source || "").toLowerCase();
  const destination = String(entry.destination || "").toLowerCase();
  const movementField = String(entry.movementField || "");
  const stockEffect = String(entry.stockEffect || "").toLowerCase();

  const isBranchSendingToCommissary =
    movementField === "transOutCommissary" ||
    (source.includes("branch daily input") && destination.includes("commissary") && stockEffect === "deduct");

  if (isBranchSendingToCommissary) return false;

  return (
    location.includes("commissary") ||
    department.includes("commissary") ||
    source.includes("commissary") ||
    destination.includes("commissary") ||
    movementField === "receivedFromBranch"
  );
}

function getCommissaryOrderLedgerEntriesOnly() {
  return getCommissaryOrderLedgerEntries().filter(entryBelongsToCommissaryOrderStock);
}

function getCommissaryOrderLedgerEntriesForItem(itemId) {
  return getCommissaryOrderLedgerEntriesOnly().filter(
    (entry) => String(entry.itemId || "") === String(itemId || "")
  );
}

function getCommissaryOrderEntryTime(entry) {
  return String(entry.submittedAt || entry.date || "");
}

function getCommissaryOrderEntryStockEffect(entry) {
  if (entry.stockEffect) return entry.stockEffect;
  if (entry.movementType === "Transfer In" || entry.movementType === "Received") return "add";
  if (entry.movementType === "Transfer Out") return "deduct";
  if (entry.movementType === "Remaining Count") return "set";
  return "report";
}

function getLatestCommissaryOrderRemainingCount(itemId) {
  const remainingEntries = getCommissaryOrderLedgerEntriesForItem(itemId).filter(
    (entry) => entry.movementType === "Remaining Count" || entry.stockEffect === "set"
  );
  if (remainingEntries.length === 0) return null;
  return [...remainingEntries].sort((a, b) => {
    return getCommissaryOrderEntryTime(b).localeCompare(getCommissaryOrderEntryTime(a));
  })[0];
}

function getCommissaryOrderOpeningStock(item) {
  const openingStock = item.currentStock ?? item.startingStock ?? item.openingStock ?? item.quantity ?? 0;
  const parsedStock = Number(openingStock);
  return Number.isNaN(parsedStock) ? 0 : parsedStock;
}

function calculateCommissaryOrderCurrentStock(item) {
  const entries = getCommissaryOrderLedgerEntriesForItem(item.itemId);
  const latestRemainingCount = getLatestCommissaryOrderRemainingCount(item.itemId);

  if (latestRemainingCount) {
    const latestRemainingTime = getCommissaryOrderEntryTime(latestRemainingCount);
    const startingFromRemaining = Number(latestRemainingCount.quantity || 0);
    return entries
      .filter((entry) => entry !== latestRemainingCount && getCommissaryOrderEntryTime(entry) > latestRemainingTime)
      .reduce((total, entry) => {
        const quantity = Number(entry.quantity || 0);
        const stockEffect = getCommissaryOrderEntryStockEffect(entry);
        if (stockEffect === "add") return total + quantity;
        if (stockEffect === "deduct") return total - quantity;
        if (stockEffect === "set") return quantity;
        return total;
      }, Number.isNaN(startingFromRemaining) ? 0 : startingFromRemaining);
  }

  return entries.reduce((total, entry) => {
    const quantity = Number(entry.quantity || 0);
    const stockEffect = getCommissaryOrderEntryStockEffect(entry);
    if (stockEffect === "add") return total + quantity;
    if (stockEffect === "deduct") return total - quantity;
    if (stockEffect === "set") return quantity;
    return total;
  }, getCommissaryOrderOpeningStock(item));
}

function getCommissaryOrderMinimums() {
  const storedMinimums = localStorage.getItem(DMC_COMMISSARY_ORDER_MINIMUMS_KEY);
  if (!storedMinimums) return {};
  try {
    const parsedMinimums = JSON.parse(storedMinimums);
    return parsedMinimums && typeof parsedMinimums === "object" ? parsedMinimums : {};
  } catch {
    return {};
  }
}

function getCommissaryOrderStockItems() {
  return getCommissaryOrderMasterListItems()
    .filter(itemBelongsToCommissaryOrder)
    .map((item) => {
      const currentStock = calculateCommissaryOrderCurrentStock(item);
      const minimums = getCommissaryOrderMinimums();
      const itemId = String(item.itemId || "");
      const minimumStock =
        itemId && minimums[itemId] !== undefined
          ? Number(minimums[itemId])
          : Number(item.minimumStock || 0);
      return {
        ...item,
        itemName: item.officialItemName || item.itemName || item.name || "Unnamed Item",
        currentStock: Number.isNaN(currentStock) ? 0 : currentStock,
        minimumStock: Number.isNaN(minimumStock) ? 0 : minimumStock,
        section: item.section || "Unassigned",
        department: item.department || "Commissary",
        unit: item.unit || "-"
      };
    });
}

function getCommissaryOrderStockStatus(item) {
  const currentStock = Number(item.currentStock || 0);
  const minimumStock = Number(item.minimumStock || 0);
  if (currentStock <= 0) return "Critical";
  if (minimumStock > 0 && currentStock < minimumStock) return "Low";
  return "Good";
}

function getCommissaryOrderStockBadgeClass(status) {
  if (status === "Critical") return "danger-badge";
  if (status === "Low") return "warning-badge";
  return "success";
}

function showCommissaryOrderModal({ type, title, message, confirmLabel }) {
  if (typeof window.DMC_SHOW_MODAL === "function") {
    window.DMC_SHOW_MODAL({ type, title, message, confirmLabel });
    return;
  }
  alert(message);
}

function showCommissaryOrderConfirm({ type, title, message, confirmLabel, cancelLabel, onConfirm }) {
  if (typeof window.DMC_CONFIRM_MODAL === "function") {
    window.DMC_CONFIRM_MODAL({ type, title, message, confirmLabel, cancelLabel, onConfirm });
    return;
  }
  if (confirm(message)) onConfirm();
}

function getCommissaryOrderSections() {
  return [...new Set(getCommissaryOrderStockItems().map((item) => item.section).filter(Boolean))].sort();
}

function renderCommissaryOrderSectionOptions() {
  const selectedSection = window.DMC_COMMISSARY_ORDER_SELECTED_SECTION;
  return `
    <option value="all" ${selectedSection === "all" ? "selected" : ""}>All Sections</option>
    ${getCommissaryOrderSections().map((section) => `
      <option value="${section}" ${selectedSection === section ? "selected" : ""}>${section}</option>
    `).join("")}
  `;
}

function getItemsForCommissaryOrder() {
  const selectedSection = window.DMC_COMMISSARY_ORDER_SELECTED_SECTION;
  const searchValue = String(window.DMC_COMMISSARY_ORDER_SEARCH || "").toLowerCase().trim();
  return getCommissaryOrderStockItems().filter((item) => {
    const matchesSection =
      selectedSection === "all" ||
      String(item.section || "").toLowerCase() === String(selectedSection || "").toLowerCase();
    const matchesSearch =
      !searchValue ||
      String(item.itemId || "").toLowerCase().includes(searchValue) ||
      String(item.itemName || "").toLowerCase().includes(searchValue) ||
      String(item.section || "").toLowerCase().includes(searchValue) ||
      String(item.unit || "").toLowerCase().includes(searchValue);
    return matchesSection && matchesSearch;
  });
}

function getSelectedCommissaryOrderItem() {
  const items = getItemsForCommissaryOrder();
  if (window.DMC_COMMISSARY_ORDER_SELECTED_ITEM_ID) {
    const selectedItem = getCommissaryOrderStockItems().find(
      (item) => item.itemId === window.DMC_COMMISSARY_ORDER_SELECTED_ITEM_ID
    );
    if (selectedItem) return selectedItem;
  }
  return items[0] || null;
}

function renderCommissaryOrderItemOptions() {
  const items = getItemsForCommissaryOrder();
  const selectedItem = getSelectedCommissaryOrderItem();
  if (items.length === 0) return `<option value="">No items found</option>`;
  return items.map((item) => `
    <option value="${item.itemId}" ${selectedItem?.itemId === item.itemId ? "selected" : ""}>
      ${item.itemName || "Unnamed Item"}
    </option>
  `).join("");
}

function createCommissaryOrderId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replaceAll("-", "");
  const timePart = now.toTimeString().slice(0, 8).replaceAll(":", "");
  return `COM-${datePart}-${timePart}`;
}

function getTodayCommissaryOrderDate() {
  return new Date().toISOString().slice(0, 10);
}

function getCommissaryOrderCartItemCount() {
  return window.DMC_COMMISSARY_ORDER_CART.length;
}

function renderCommissaryOrderCart() {
  const cart = window.DMC_COMMISSARY_ORDER_CART;
  if (cart.length === 0) {
    return `
      <div class="order-cart-empty">
        <p>Cart is empty</p>
        <span>Pick commissary stock items and add them to this order.</span>
      </div>
    `;
  }
  return `
    <div class="order-cart-list">
      ${cart.map((line, index) => `
        <div class="order-cart-item">
          <div>
            <strong>${line.itemName}</strong>
            <p>${line.itemId} • ${line.section || "-"} • ${line.unit}</p>
          </div>
          <div class="order-cart-qty">
            <span>${line.requestedQty} ${line.unit}</span>
            <button class="tiny-button danger" data-remove-commissary-cart-line="${index}">Remove</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function getCommissaryOrderContent() {
  const selectedItem = getSelectedCommissaryOrderItem();
  return `
    <section class="place-order-layout">
      <div class="panel place-order-builder">
        <div class="panel-header">
          <div>
            <h3>Create Commissary Order</h3>
            <p>Choose a commissary stock item, check stock left, then add it to the order cart.</p>
          </div>
        </div>
        <div class="order-builder-form">
          <label>
            Section
            <select id="commissary-order-section-select">${renderCommissaryOrderSectionOptions()}</select>
          </label>
          <label>
            Search Commissary Stock
            <input id="commissary-order-search" type="text" placeholder="Type item name, item ID, section, unit..." value="${window.DMC_COMMISSARY_ORDER_SEARCH}" />
          </label>
          <label class="form-full">
            Select Commissary Item
            <select id="commissary-order-item-select">${renderCommissaryOrderItemOptions()}</select>
          </label>
          <div class="selected-order-item form-full">
            ${selectedItem ? `
              <p class="eyebrow">Selected Item</p>
              <h4>${selectedItem.itemName}</h4>
              <span>Commissary Stock Left: <strong>${selectedItem.currentStock}</strong> ${selectedItem.unit || ""}</span>
              <span>
                Minimum: ${selectedItem.minimumStock || 0} ${selectedItem.unit || ""} •
                <span class="badge ${getCommissaryOrderStockBadgeClass(getCommissaryOrderStockStatus(selectedItem))}">
                  ${getCommissaryOrderStockStatus(selectedItem)}
                </span>
              </span>
            ` : `
              <p class="eyebrow">Selected Item</p>
              <h4>No item selected</h4>
              <span>Try adjusting the section or search field.</span>
            `}
          </div>
          <label>
            Quantity Requested
            <input id="commissary-order-qty" type="number" min="0" step="any" placeholder="0" value="${window.DMC_COMMISSARY_ORDER_QTY}" />
          </label>
          <label>
            Requested By
            <select id="commissary-order-requested-by">${renderCommissaryRequestedByOptions()}</select>
          </label>
          <button class="primary-button form-full" id="add-item-to-commissary-order" style="background: linear-gradient(135deg, rgba(37, 99, 235, 0.96), rgba(96, 165, 250, 0.72)); border: 1px solid rgba(147, 197, 253, 0.75); color: #eff6ff; box-shadow: 0 10px 24px rgba(37, 99, 235, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.22); backdrop-filter: blur(10px);">
            + Add to Order
          </button>
        </div>
      </div>
      <div class="panel place-order-cart">
        <div class="panel-header">
          <div>
            <h3>Commissary Order Cart</h3>
            <p>${getCommissaryOrderCartItemCount()} items ready to request from Warehouse.</p>
          </div>
          <span class="badge">${getCommissaryOrderCartItemCount()} Items</span>
        </div>
        <div class="order-cart-body">${renderCommissaryOrderCart()}</div>
        <div class="order-submit-area">
          <label class="urgent-check">
            <input id="commissary-order-urgent" type="checkbox" ${window.DMC_COMMISSARY_ORDER_URGENT ? "checked" : ""} />
            <span>Mark as urgent</span>
          </label>
          <label>
            Notes
            <textarea id="commissary-order-notes" rows="3" placeholder="Special instructions for Warehouse...">${window.DMC_COMMISSARY_ORDER_NOTES}</textarea>
          </label>
          <div class="form-actions">
            <button class="ghost-button" id="clear-commissary-order-cart">Clear Cart</button>
            <button class="primary-button" id="submit-commissary-order" style="background: linear-gradient(135deg, rgba(22, 163, 74, 0.96), rgba(74, 222, 128, 0.72)); border: 1px solid rgba(134, 239, 172, 0.75); color: #f0fdf4; box-shadow: 0 10px 24px rgba(22, 163, 74, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.22); backdrop-filter: blur(10px);">
              Submit Order to Warehouse
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function refreshCommissaryOrderPage() {
  window.DMC_PAGES["commissary-orders"].content = getCommissaryOrderContent();
  renderPage("commissary-orders");
}

function setupCommissaryOrderEvents() {
  const sectionSelect = document.getElementById("commissary-order-section-select");
  const searchInput = document.getElementById("commissary-order-search");
  const itemSelect = document.getElementById("commissary-order-item-select");
  const qtyInput = document.getElementById("commissary-order-qty");
  const requestedBySelect = document.getElementById("commissary-order-requested-by");
  const addButton = document.getElementById("add-item-to-commissary-order");
  const clearButton = document.getElementById("clear-commissary-order-cart");
  const submitButton = document.getElementById("submit-commissary-order");
  const urgentInput = document.getElementById("commissary-order-urgent");
  const notesInput = document.getElementById("commissary-order-notes");

  if (sectionSelect) {
    sectionSelect.addEventListener("change", () => {
      window.DMC_COMMISSARY_ORDER_SELECTED_SECTION = sectionSelect.value;
      window.DMC_COMMISSARY_ORDER_SELECTED_ITEM_ID = "";
      window.DMC_COMMISSARY_ORDER_SEARCH = "";
      window.DMC_COMMISSARY_ORDER_QTY = "";
      refreshCommissaryOrderPage();
    });
  }
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      window.DMC_COMMISSARY_ORDER_SEARCH = searchInput.value;
      window.DMC_COMMISSARY_ORDER_SELECTED_ITEM_ID = "";
      refreshCommissaryOrderPage();
    });
  }
  if (itemSelect) {
    itemSelect.addEventListener("change", () => {
      window.DMC_COMMISSARY_ORDER_SELECTED_ITEM_ID = itemSelect.value;
      refreshCommissaryOrderPage();
    });
  }
  if (qtyInput) {
    qtyInput.addEventListener("input", () => {
      window.DMC_COMMISSARY_ORDER_QTY = qtyInput.value;
    });
  }
  if (requestedBySelect) {
    requestedBySelect.addEventListener("change", () => {
      window.DMC_COMMISSARY_ORDER_REQUESTED_BY = requestedBySelect.value;
    });
  }
  if (urgentInput) {
    urgentInput.addEventListener("change", () => {
      window.DMC_COMMISSARY_ORDER_URGENT = urgentInput.checked;
    });
  }
  if (notesInput) {
    notesInput.addEventListener("input", () => {
      window.DMC_COMMISSARY_ORDER_NOTES = notesInput.value;
    });
  }
  if (addButton) {
    addButton.addEventListener("click", () => {
      const selectedItem = getSelectedCommissaryOrderItem();
      const requestedQty = Number(window.DMC_COMMISSARY_ORDER_QTY || 0);
      if (!selectedItem) {
        showCommissaryOrderModal({ type: "warning", title: "No Item Selected", message: "Please select an item first.", confirmLabel: "Got it" });
        return;
      }
      if (Number.isNaN(requestedQty) || requestedQty <= 0) {
        showCommissaryOrderModal({ type: "warning", title: "Quantity Required", message: "Please enter a requested quantity greater than 0.", confirmLabel: "Got it" });
        return;
      }
      const existingIndex = window.DMC_COMMISSARY_ORDER_CART.findIndex((line) => line.itemId === selectedItem.itemId);
      const cartLine = {
        itemId: selectedItem.itemId,
        itemName: selectedItem.itemName || "Unnamed Item",
        section: selectedItem.section,
        department: selectedItem.department || "Commissary",
        requestedQty,
        unit: selectedItem.unit,
        currentCommissaryStock: selectedItem.currentStock,
        commissaryMinimumStock: selectedItem.minimumStock,
        notes: ""
      };
      if (existingIndex >= 0) {
        window.DMC_COMMISSARY_ORDER_CART[existingIndex] = cartLine;
      } else {
        window.DMC_COMMISSARY_ORDER_CART.push(cartLine);
      }
      window.DMC_COMMISSARY_ORDER_QTY = "";
      refreshCommissaryOrderPage();
    });
  }
  document.querySelectorAll("[data-remove-commissary-cart-line]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.removeCommissaryCartLine);
      window.DMC_COMMISSARY_ORDER_CART = window.DMC_COMMISSARY_ORDER_CART.filter((_, lineIndex) => lineIndex !== index);
      refreshCommissaryOrderPage();
    });
  });
  if (clearButton) {
    clearButton.addEventListener("click", () => {
      showCommissaryOrderConfirm({
        type: "danger",
        title: "Clear Order Cart?",
        message: "This will remove all items currently in the order cart.",
        confirmLabel: "Clear Cart",
        cancelLabel: "Cancel",
        onConfirm: () => {
          window.DMC_COMMISSARY_ORDER_CART = [];
          window.DMC_COMMISSARY_ORDER_QTY = "";
          window.DMC_COMMISSARY_ORDER_NOTES = "";
          window.DMC_COMMISSARY_ORDER_URGENT = false;
          refreshCommissaryOrderPage();
        }
      });
    });
  }
  if (submitButton) {
    submitButton.addEventListener("click", () => {
      const cart = window.DMC_COMMISSARY_ORDER_CART;
      if (cart.length === 0) {
        showCommissaryOrderModal({ type: "warning", title: "Order Cart Empty", message: "No items in the order cart.", confirmLabel: "Got it" });
        return;
      }
      if (!window.DMC_COMMISSARY_ORDER_REQUESTED_BY) {
        showCommissaryOrderModal({ type: "warning", title: "Requesting Manager Required", message: "Please select the requesting manager.", confirmLabel: "Got it" });
        return;
      }
      showCommissaryOrderConfirm({
        type: "success",
        title: "Submit Order to Warehouse?",
        message: `Submit ${cart.length} commissary item request(s) to Warehouse?`,
        confirmLabel: "Submit Order",
        cancelLabel: "Cancel",
        onConfirm: () => {
          const orders = getStoredCommissaryOrders();
          const newOrder = {
            orderId: createCommissaryOrderId(),
            source: "Commissary",
            requestSource: "Commissary",
            branch: "",
            destination: "Warehouse",
            department: "Commissary",
            section: window.DMC_COMMISSARY_ORDER_SELECTED_SECTION,
            requestedBy: window.DMC_COMMISSARY_ORDER_REQUESTED_BY,
            orderDate: getTodayCommissaryOrderDate(),
            urgent: window.DMC_COMMISSARY_ORDER_URGENT,
            notes: window.DMC_COMMISSARY_ORDER_NOTES,
            status: "Submitted",
            statusHistory: [
              {
                status: "Submitted",
                timestamp: new Date().toISOString(),
                note: "Commissary submitted order request to Warehouse."
              }
            ],
            lines: cart
          };
          saveCommissaryOrders([newOrder, ...orders]);
          window.DMC_COMMISSARY_ORDER_CART = [];
          window.DMC_COMMISSARY_ORDER_QTY = "";
          window.DMC_COMMISSARY_ORDER_NOTES = "";
          window.DMC_COMMISSARY_ORDER_URGENT = false;
          showCommissaryOrderModal({
            type: "success",
            title: "Order Submitted",
            message: "Order submitted to Warehouse Commissary Orders.",
            confirmLabel: "Continue"
          });
          refreshCommissaryOrderPage();
        }
      });
    });
  }
}

window.DMC_PAGES["commissary-orders"] = {
  eyebrow: "Commissary",
  title: "C. Place Orders",
  description: "Create commissary stock requests for Warehouse review and fulfillment.",
  getContent: getCommissaryOrderContent,
  content: getCommissaryOrderContent(),
  afterRender: setupCommissaryOrderEvents
};
