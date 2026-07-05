window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_PLACE_ORDER_MASTER_LIST_KEY = "dmc_master_list_items";
const DMC_PLACE_ORDER_STORAGE_KEY = "dmc_branch_orders";
const DMC_PLACE_ORDER_BRANCH_MINIMUMS_KEY = "dmc_branch_stock_minimums";

window.DMC_PLACE_ORDER_SELECTED_DEPARTMENT =
  window.DMC_PLACE_ORDER_SELECTED_DEPARTMENT || "Bar";

window.DMC_PLACE_ORDER_SELECTED_ITEM_ID =
  window.DMC_PLACE_ORDER_SELECTED_ITEM_ID || "";

window.DMC_PLACE_ORDER_SEARCH = window.DMC_PLACE_ORDER_SEARCH || "";

window.DMC_PLACE_ORDER_QTY = window.DMC_PLACE_ORDER_QTY || "";

window.DMC_PLACE_ORDER_CART = window.DMC_PLACE_ORDER_CART || [];

window.DMC_PLACE_ORDER_NOTES = window.DMC_PLACE_ORDER_NOTES || "";

window.DMC_PLACE_ORDER_URGENT = window.DMC_PLACE_ORDER_URGENT || false;

window.DMC_PLACE_ORDER_REQUESTED_BY =
  window.DMC_PLACE_ORDER_REQUESTED_BY || "";

function getPlaceOrderMasterListItems() {
  const storedItems = localStorage.getItem(DMC_PLACE_ORDER_MASTER_LIST_KEY);

  if (storedItems) {
    try {
      return JSON.parse(storedItems);
    } catch {
      return window.DMC_DATA?.masterList?.items || [];
    }
  }

  return window.DMC_DATA?.masterList?.items || [];
}

function getPlaceOrderSettings() {
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

function getSettingName(option) {
  if (typeof option === "string") {
    return option;
  }

  return option?.name || option?.fullName || option?.label || "";
}

function getPlaceOrderManagers() {
  const settings = getPlaceOrderSettings();

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
    .map(getSettingName)
    .filter(Boolean);
}

function renderRequestedByOptions() {
  const currentManager = window.DMC_PLACE_ORDER_REQUESTED_BY;
  const managers = getPlaceOrderManagers();

  if (managers.length === 0) {
    return `
      <option value="" ${currentManager === "" ? "selected" : ""}>
        Select requesting manager
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
      Select requesting manager
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

function getStoredBranchOrders() {
  const storedOrders = localStorage.getItem(DMC_PLACE_ORDER_STORAGE_KEY);

  if (!storedOrders) {
    return [];
  }

  try {
    return JSON.parse(storedOrders);
  } catch {
    return [];
  }
}

function saveBranchOrders(orders) {
  localStorage.setItem(DMC_PLACE_ORDER_STORAGE_KEY, JSON.stringify(orders));
}


function getPlaceOrderCurrentBranchStock(item) {
  const possibleValues = [
    item.currentStock,
    item.branchStock,
    item.stockOnHand,
    item.stockLeft,
    item.quantityOnHand,
    item.quantity,
    item.onHand
  ];

  const foundValue = possibleValues.find((value) => value !== undefined && value !== null && value !== "");
  const parsedValue = Number(foundValue || 0);

  return Number.isNaN(parsedValue) ? 0 : parsedValue;
}

function getPlaceOrderBranchMinimums() {
  const storedMinimums = localStorage.getItem(
    DMC_PLACE_ORDER_BRANCH_MINIMUMS_KEY
  );

  if (!storedMinimums) {
    return {};
  }

  try {
    const parsedMinimums = JSON.parse(storedMinimums);

    return parsedMinimums && typeof parsedMinimums === "object"
      ? parsedMinimums
      : {};
  } catch {
    return {};
  }
}

function isPlaceOrderBranchItem(item) {
  const areas = item.operatingAreas || item.assignedAreas || item.locations || [];
  const areaText = Array.isArray(areas)
    ? areas.join(" ").toLowerCase()
    : String(areas || "").toLowerCase();

  const explicitArea = String(
    item.operatingArea || item.location || item.area || ""
  ).toLowerCase();

  return (
    item.active !== false &&
    (
      item.branch === true ||
      item.isBranch === true ||
      areaText.includes("branch") ||
      explicitArea.includes("branch")
    )
  );
}

function getPlaceOrderBranchStockItems() {
  return getPlaceOrderMasterListItems()
    .filter(isPlaceOrderBranchItem)
    .map((item) => {
      const currentStock = getPlaceOrderCurrentBranchStock(item);
      const minimums = getPlaceOrderBranchMinimums();
      const itemId = String(item.itemId || "");
      const minimumStock =
        itemId && minimums[itemId] !== undefined
          ? Number(minimums[itemId])
          : Number(item.minimumStock || 0);

      return {
        ...item,
        currentStock: Number.isNaN(currentStock) ? 0 : currentStock,
        minimumStock: Number.isNaN(minimumStock) ? 0 : minimumStock
      };
    });
}

function getPlaceOrderBranchStockStatus(item) {
  const currentStock = Number(item.currentStock || 0);
  const minimumStock = Number(item.minimumStock || 0);

  if (currentStock <= 0) {
    return "Critical";
  }

  if (minimumStock > 0 && currentStock < minimumStock) {
    return "Low";
  }

  return "Good";
}

function getPlaceOrderStockBadgeClass(status) {
  if (status === "Critical") {
    return "danger-badge";
  }

  if (status === "Low") {
    return "warning-badge";
  }

  return "success";
}

function showPlaceOrderModal({ type, title, message, confirmLabel }) {
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

function showPlaceOrderConfirm({
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

function getPlaceOrderDepartments() {
  const departments = [
    ...new Set(
      getPlaceOrderBranchStockItems()
        .map((item) => item.department)
        .filter(Boolean)
    )
  ].sort();

  if (departments.length === 0) {
    return [
      { id: "bar", name: "Bar" },
      { id: "kitchen", name: "Kitchen" },
      { id: "dining", name: "Dining" }
    ];
  }

  return departments.map((department) => ({
    id: String(department).toLowerCase().replaceAll(" ", "-"),
    name: department
  }));
}

function renderPlaceOrderDepartmentOptions() {
  const selectedDepartment = window.DMC_PLACE_ORDER_SELECTED_DEPARTMENT;

  return getPlaceOrderDepartments()
    .map(
      (department) => `
        <option value="${department.name}" ${
        selectedDepartment === department.name ? "selected" : ""
      }>
          ${department.name}
        </option>
      `
    )
    .join("");
}

function getItemsForPlaceOrder() {
  const selectedDepartment = window.DMC_PLACE_ORDER_SELECTED_DEPARTMENT;
  const searchValue = String(window.DMC_PLACE_ORDER_SEARCH || "")
    .toLowerCase()
    .trim();

  return getPlaceOrderBranchStockItems().filter((item) => {
    const matchesDepartment =
      String(item.department || "").toLowerCase() ===
      String(selectedDepartment || "").toLowerCase();

    const isActive = item.active !== false;

    const matchesSearch =
      !searchValue ||
      String(item.itemId || "").toLowerCase().includes(searchValue) ||
      String(item.officialItemName || "").toLowerCase().includes(searchValue) ||
      String(item.section || "").toLowerCase().includes(searchValue) ||
      String(item.unit || "").toLowerCase().includes(searchValue);

    return matchesDepartment && isActive && matchesSearch;
  });
}

function getSelectedPlaceOrderItem() {
  const items = getItemsForPlaceOrder();

  if (window.DMC_PLACE_ORDER_SELECTED_ITEM_ID) {
    const selectedItem = getPlaceOrderBranchStockItems().find(
      (item) => item.itemId === window.DMC_PLACE_ORDER_SELECTED_ITEM_ID
    );

    if (selectedItem) {
      return selectedItem;
    }
  }

  return items[0] || null;
}

function renderPlaceOrderItemOptions() {
  const items = getItemsForPlaceOrder();
  const selectedItem = getSelectedPlaceOrderItem();

  if (items.length === 0) {
    return `<option value="">No items found</option>`;
  }

  return items
    .map(
      (item) => `
        <option value="${item.itemId}" ${
        selectedItem?.itemId === item.itemId ? "selected" : ""
      }>
          ${item.officialItemName || item.itemName || item.name || "Unnamed Item"}
        </option>
      `
    )
    .join("");
}

function createOrderId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replaceAll("-", "");
  const timePart = now.toTimeString().slice(0, 8).replaceAll(":", "");

  return `BR-${datePart}-${timePart}`;
}

function getTodayOrderDate() {
  return new Date().toISOString().slice(0, 10);
}

function getCartItemCount() {
  return window.DMC_PLACE_ORDER_CART.length;
}

function getCartRequestedTotal() {
  return window.DMC_PLACE_ORDER_CART.reduce(
    (total, line) => total + Number(line.requestedQty || 0),
    0
  );
}

function renderOrderCart() {
  const cart = window.DMC_PLACE_ORDER_CART;

  if (cart.length === 0) {
    return `
      <div class="order-cart-empty">
        <p>Cart is empty</p>
        <span>Pick branch stock items and add them to this order.</span>
      </div>
    `;
  }

  return `
    <div class="order-cart-list">
      ${cart
        .map(
          (line, index) => `
            <div class="order-cart-item">
              <div>
                <strong>${line.itemName}</strong>
                <p>${line.itemId} • ${line.section || "-"} • ${line.unit}</p>
              </div>

              <div class="order-cart-qty">
                <span>${line.requestedQty} ${line.unit}</span>
                <button class="tiny-button danger" data-remove-cart-line="${index}">
                  Remove
                </button>
              </div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function getPlaceOrderContent() {
  const selectedDepartment = window.DMC_PLACE_ORDER_SELECTED_DEPARTMENT;
  const selectedItem = getSelectedPlaceOrderItem();

  return `
    <section class="place-order-layout">
      <div class="panel place-order-builder">
        <div class="panel-header">
          <div>
            <h3>Create Branch Order</h3>
            <p>Choose a branch stock item, check stock left, then add it to the order cart.</p>
          </div>
        </div>

        <div class="order-builder-form">
          <label>
            Department
            <select id="place-order-department-select">
              ${renderPlaceOrderDepartmentOptions()}
            </select>
          </label>

          <label>
            Search Branch Stock
            <input
              id="place-order-search"
              type="text"
              placeholder="Type item name, item ID, section, unit..."
              value="${window.DMC_PLACE_ORDER_SEARCH}"
            />
          </label>

          <label class="form-full">
            Select Branch Item
            <select id="place-order-item-select">
              ${renderPlaceOrderItemOptions()}
            </select>
          </label>

          <div class="selected-order-item form-full">
            ${
              selectedItem
                ? `
                  <p class="eyebrow">Selected Item</p>
                  <h4>${selectedItem.officialItemName || selectedItem.itemName || selectedItem.name}</h4>
                  <span>
                    Branch Stock Left:
                    <strong>${selectedItem.currentStock}</strong>
                    ${selectedItem.unit || ""}
                  </span>
                  <span>
                    Minimum: ${selectedItem.minimumStock || 0} ${selectedItem.unit || ""} •
                    <span class="badge ${getPlaceOrderStockBadgeClass(getPlaceOrderBranchStockStatus(selectedItem))}">
                      ${getPlaceOrderBranchStockStatus(selectedItem)}
                    </span>
                  </span>
                `
                : `
                  <p class="eyebrow">Selected Item</p>
                  <h4>No item selected</h4>
                  <span>Try adjusting the department or search field.</span>
                `
            }
          </div>

          <label>
            Quantity Requested
            <input
              id="place-order-qty"
              type="number"
              min="0"
              step="any"
              placeholder="0"
              value="${window.DMC_PLACE_ORDER_QTY}"
            />
          </label>

          <label>
            Requested By
            <select id="place-order-requested-by">
              ${renderRequestedByOptions()}
            </select>
          </label>

          <button
            class="primary-button form-full"
            id="add-item-to-order"
            style="
              background: linear-gradient(135deg, rgba(37, 99, 235, 0.96), rgba(96, 165, 250, 0.72));
              border: 1px solid rgba(147, 197, 253, 0.75);
              color: #eff6ff;
              box-shadow: 0 10px 24px rgba(37, 99, 235, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.22);
              backdrop-filter: blur(10px);
            "
          >
            + Add to Order
          </button>
        </div>
      </div>

      <div class="panel place-order-cart">
        <div class="panel-header">
          <div>
            <h3>Branch Order Cart</h3>
            <p>${getCartItemCount()} items ready to request from Warehouse.</p>
          </div>

          <span class="badge">${getCartItemCount()} Items</span>
        </div>

        <div class="order-cart-body">
          ${renderOrderCart()}
        </div>

        <div class="order-submit-area">
          <label class="urgent-check">
            <input
              id="place-order-urgent"
              type="checkbox"
              ${window.DMC_PLACE_ORDER_URGENT ? "checked" : ""}
            />
            <span>Mark as urgent</span>
          </label>

          <label>
            Notes
            <textarea
              id="place-order-notes"
              rows="3"
              placeholder="Special instructions for Warehouse..."
            >${window.DMC_PLACE_ORDER_NOTES}</textarea>
          </label>

          <div class="form-actions">
            <button class="ghost-button" id="clear-place-order-cart">
              Clear Cart
            </button>

            <button
              class="primary-button"
              id="submit-branch-order"
              style="
                background: linear-gradient(135deg, rgba(22, 163, 74, 0.96), rgba(74, 222, 128, 0.72));
                border: 1px solid rgba(134, 239, 172, 0.75);
                color: #f0fdf4;
                box-shadow: 0 10px 24px rgba(22, 163, 74, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.22);
                backdrop-filter: blur(10px);
              "
            >
              Submit Order to Warehouse
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function refreshPlaceOrderPage() {
  window.DMC_PAGES["place-order"].content = getPlaceOrderContent();
  renderPage("place-order");
}

function setupPlaceOrderEvents() {
  const departmentSelect = document.getElementById(
    "place-order-department-select"
  );
  const searchInput = document.getElementById("place-order-search");
  const itemSelect = document.getElementById("place-order-item-select");
  const qtyInput = document.getElementById("place-order-qty");
  const requestedBySelect = document.getElementById("place-order-requested-by");
  const addButton = document.getElementById("add-item-to-order");
  const clearButton = document.getElementById("clear-place-order-cart");
  const submitButton = document.getElementById("submit-branch-order");
  const urgentInput = document.getElementById("place-order-urgent");
  const notesInput = document.getElementById("place-order-notes");

  if (departmentSelect) {
    departmentSelect.addEventListener("change", () => {
      window.DMC_PLACE_ORDER_SELECTED_DEPARTMENT = departmentSelect.value;
      window.DMC_PLACE_ORDER_SELECTED_ITEM_ID = "";
      window.DMC_PLACE_ORDER_SEARCH = "";
      window.DMC_PLACE_ORDER_QTY = "";
      refreshPlaceOrderPage();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      window.DMC_PLACE_ORDER_SEARCH = searchInput.value;
      window.DMC_PLACE_ORDER_SELECTED_ITEM_ID = "";
      refreshPlaceOrderPage();
    });
  }

  if (itemSelect) {
    itemSelect.addEventListener("change", () => {
      window.DMC_PLACE_ORDER_SELECTED_ITEM_ID = itemSelect.value;
      refreshPlaceOrderPage();
    });
  }

  if (qtyInput) {
    qtyInput.addEventListener("input", () => {
      window.DMC_PLACE_ORDER_QTY = qtyInput.value;
    });
  }

  if (requestedBySelect) {
    requestedBySelect.addEventListener("change", () => {
      window.DMC_PLACE_ORDER_REQUESTED_BY = requestedBySelect.value;
    });
  }

  if (urgentInput) {
    urgentInput.addEventListener("change", () => {
      window.DMC_PLACE_ORDER_URGENT = urgentInput.checked;
    });
  }

  if (notesInput) {
    notesInput.addEventListener("input", () => {
      window.DMC_PLACE_ORDER_NOTES = notesInput.value;
    });
  }

  if (addButton) {
    addButton.addEventListener("click", () => {
      const selectedItem = getSelectedPlaceOrderItem();
      const requestedQty = Number(window.DMC_PLACE_ORDER_QTY || 0);

      if (!selectedItem) {
        showPlaceOrderModal({
          type: "warning",
          title: "No Item Selected",
          message: "Please select an item first.",
          confirmLabel: "Got it"
        });
        return;
      }

      if (Number.isNaN(requestedQty) || requestedQty <= 0) {
        showPlaceOrderModal({
          type: "warning",
          title: "Quantity Required",
          message: "Please enter a requested quantity greater than 0.",
          confirmLabel: "Got it"
        });
        return;
      }

      const existingIndex = window.DMC_PLACE_ORDER_CART.findIndex(
        (line) => line.itemId === selectedItem.itemId
      );

      const cartLine = {
        itemId: selectedItem.itemId,
        itemName: selectedItem.officialItemName || selectedItem.itemName || selectedItem.name || "Unnamed Item",
        section: selectedItem.section,
        department: selectedItem.department,
        requestedQty,
        unit: selectedItem.unit,
        currentBranchStock: selectedItem.currentStock,
        branchMinimumStock: selectedItem.minimumStock,
        notes: ""
      };

      if (existingIndex >= 0) {
        window.DMC_PLACE_ORDER_CART[existingIndex] = cartLine;
      } else {
        window.DMC_PLACE_ORDER_CART.push(cartLine);
      }

      window.DMC_PLACE_ORDER_QTY = "";
      refreshPlaceOrderPage();
    });
  }

  document.querySelectorAll("[data-remove-cart-line]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.removeCartLine);

      window.DMC_PLACE_ORDER_CART = window.DMC_PLACE_ORDER_CART.filter(
        (_, lineIndex) => lineIndex !== index
      );

      refreshPlaceOrderPage();
    });
  });

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      showPlaceOrderConfirm({
        type: "danger",
        title: "Clear Order Cart?",
        message: "This will remove all items currently in the order cart.",
        confirmLabel: "Clear Cart",
        cancelLabel: "Cancel",
        onConfirm: () => {
          window.DMC_PLACE_ORDER_CART = [];
          window.DMC_PLACE_ORDER_QTY = "";
          window.DMC_PLACE_ORDER_NOTES = "";
          window.DMC_PLACE_ORDER_URGENT = false;

          refreshPlaceOrderPage();
        }
      });
    });
  }

  if (submitButton) {
    submitButton.addEventListener("click", () => {
      const cart = window.DMC_PLACE_ORDER_CART;

      if (cart.length === 0) {
        showPlaceOrderModal({
          type: "warning",
          title: "Order Cart Empty",
          message: "No items in the order cart.",
          confirmLabel: "Got it"
        });
        return;
      }

      if (!window.DMC_PLACE_ORDER_REQUESTED_BY) {
        showPlaceOrderModal({
          type: "warning",
          title: "Requesting Manager Required",
          message: "Please select the requesting manager.",
          confirmLabel: "Got it"
        });
        return;
      }

      const selectedDepartment = window.DMC_PLACE_ORDER_SELECTED_DEPARTMENT;

      showPlaceOrderConfirm({
        type: "success",
        title: "Submit Order to Warehouse?",
        message: `Submit ${cart.length} item request(s) for ${selectedDepartment} to Warehouse?`,
        confirmLabel: "Submit Order",
        cancelLabel: "Cancel",
        onConfirm: () => {
          const orders = getStoredBranchOrders();

          const newOrder = {
            orderId: createOrderId(),
            source: "DMC-Iriga Branch",
            requestSource: "DMC-Iriga Branch",
            branch: "DMC-Iriga Branch",
            destination: "Warehouse",
            department: selectedDepartment,
            requestedBy: window.DMC_PLACE_ORDER_REQUESTED_BY,
            orderDate: getTodayOrderDate(),
            urgent: window.DMC_PLACE_ORDER_URGENT,
            notes: window.DMC_PLACE_ORDER_NOTES,
            status: "Submitted",
            statusHistory: [
              {
                status: "Submitted",
                timestamp: new Date().toISOString(),
                note: "DMC-Iriga Branch submitted order request to Warehouse."
              }
            ],
            lines: cart
          };

          saveBranchOrders([newOrder, ...orders]);

          window.DMC_PLACE_ORDER_CART = [];
          window.DMC_PLACE_ORDER_QTY = "";
          window.DMC_PLACE_ORDER_NOTES = "";
          window.DMC_PLACE_ORDER_URGENT = false;

          showPlaceOrderModal({
            type: "success",
            title: "Order Submitted",
            message: "Order submitted to Warehouse Branch Orders.",
            confirmLabel: "Continue"
          });

          refreshPlaceOrderPage();
        }
      });
    });
  }
}

window.DMC_PAGES["place-order"] = {
  eyebrow: "DMC-Iriga Branch",
  title: "Place Order",
  description:
    "Create branch stock requests for Warehouse review and fulfillment.",
  getContent: getPlaceOrderContent,
  content: getPlaceOrderContent(),
  afterRender: setupPlaceOrderEvents
};
