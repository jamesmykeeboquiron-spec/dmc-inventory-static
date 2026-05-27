window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_PLACE_ORDER_MASTER_LIST_KEY = "dmc_master_list_items";
const DMC_PLACE_ORDER_STORAGE_KEY = "dmc_branch_orders";

window.DMC_PLACE_ORDER_SELECTED_DEPARTMENT =
  window.DMC_PLACE_ORDER_SELECTED_DEPARTMENT || "Bar";

window.DMC_PLACE_ORDER_SELECTED_ITEM_ID =
  window.DMC_PLACE_ORDER_SELECTED_ITEM_ID || "";

window.DMC_PLACE_ORDER_SEARCH = window.DMC_PLACE_ORDER_SEARCH || "";

window.DMC_PLACE_ORDER_QTY = window.DMC_PLACE_ORDER_QTY || "";

window.DMC_PLACE_ORDER_CART = window.DMC_PLACE_ORDER_CART || [];

window.DMC_PLACE_ORDER_NOTES = window.DMC_PLACE_ORDER_NOTES || "";

window.DMC_PLACE_ORDER_URGENT = window.DMC_PLACE_ORDER_URGENT || false;

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

function getPlaceOrderDepartments() {
  const storedSettings = localStorage.getItem("dmc_inventory_settings");

  if (storedSettings) {
    try {
      const settings = JSON.parse(storedSettings);

      return (settings.departments || []).filter(
        (department) => department.name !== "Commissary"
      );
    } catch {
      return [
        { id: "bar", name: "Bar" },
        { id: "kitchen", name: "Kitchen" },
        { id: "dining", name: "Dining" }
      ];
    }
  }

  return [
    { id: "bar", name: "Bar" },
    { id: "kitchen", name: "Kitchen" },
    { id: "dining", name: "Dining" }
  ];
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

  return getPlaceOrderMasterListItems().filter((item) => {
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
    const selectedItem = getPlaceOrderMasterListItems().find(
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
          ${item.itemId} — ${item.officialItemName}
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
        <span>Pick items and add them to this order.</span>
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
  const filteredItems = getItemsForPlaceOrder();
  const selectedItem = getSelectedPlaceOrderItem();
  const submittedOrders = getStoredBranchOrders();

  return `
    <section class="grid">
      <div class="card">
        <p>${selectedDepartment} Items Found</p>
        <strong>${filteredItems.length}</strong>
      </div>

      <div class="card">
        <p>Cart Items</p>
        <strong>${getCartItemCount()}</strong>
      </div>

      <div class="card">
        <p>Total Requested</p>
        <strong>${getCartRequestedTotal()}</strong>
      </div>

      <div class="card">
        <p>Submitted Orders</p>
        <strong>${submittedOrders.length}</strong>
      </div>
    </section>

    <section class="place-order-layout">
      <div class="panel place-order-builder">
        <div class="panel-header">
          <div>
            <h3>Add Item to Order</h3>
            <p>Select an item, enter quantity, then add it to the order cart.</p>
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
            Search Item
            <input
              id="place-order-search"
              type="text"
              placeholder="Type item name, item ID, section, unit..."
              value="${window.DMC_PLACE_ORDER_SEARCH}"
            />
          </label>

          <label class="form-full">
            Select Item
            <select id="place-order-item-select">
              ${renderPlaceOrderItemOptions()}
            </select>
          </label>

          <div class="selected-order-item form-full">
            ${
              selectedItem
                ? `
                  <p class="eyebrow">Selected Item</p>
                  <h4>${selectedItem.officialItemName}</h4>
                  <span>${selectedItem.itemId} • ${selectedItem.section || "-"} • ${selectedItem.unit || "-"}</span>
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
            <input type="text" value="Branch Manager" disabled />
          </label>

          <button class="primary-button form-full" id="add-item-to-order">
            + Add to Order
          </button>
        </div>
      </div>

      <div class="panel place-order-cart">
        <div class="panel-header">
          <div>
            <h3>Order Cart</h3>
            <p>${getCartItemCount()} items ready for commissary request.</p>
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
              placeholder="Special instructions for commissary..."
            >${window.DMC_PLACE_ORDER_NOTES}</textarea>
          </label>

          <div class="form-actions">
            <button class="ghost-button" id="clear-place-order-cart">
              Clear Cart
            </button>

            <button class="primary-button" id="submit-branch-order">
              Submit Order
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
    searchInput.addEventListener("change", () => {
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
    qtyInput.addEventListener("change", () => {
      window.DMC_PLACE_ORDER_QTY = qtyInput.value;
    });
  }

  if (urgentInput) {
    urgentInput.addEventListener("change", () => {
      window.DMC_PLACE_ORDER_URGENT = urgentInput.checked;
    });
  }

  if (notesInput) {
    notesInput.addEventListener("change", () => {
      window.DMC_PLACE_ORDER_NOTES = notesInput.value;
    });
  }

  if (addButton) {
    addButton.addEventListener("click", () => {
      const selectedItem = getSelectedPlaceOrderItem();
      const requestedQty = Number(window.DMC_PLACE_ORDER_QTY || 0);

      if (!selectedItem) {
        alert("Please select an item first.");
        return;
      }

      if (Number.isNaN(requestedQty) || requestedQty <= 0) {
        alert("Please enter a requested quantity greater than 0.");
        return;
      }

      const existingIndex = window.DMC_PLACE_ORDER_CART.findIndex(
        (line) => line.itemId === selectedItem.itemId
      );

      const cartLine = {
        itemId: selectedItem.itemId,
        itemName: selectedItem.officialItemName,
        section: selectedItem.section,
        requestedQty,
        unit: selectedItem.unit,
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
      const confirmed = confirm("Clear this order cart?");

      if (!confirmed) {
        return;
      }

      window.DMC_PLACE_ORDER_CART = [];
      window.DMC_PLACE_ORDER_QTY = "";
      window.DMC_PLACE_ORDER_NOTES = "";
      window.DMC_PLACE_ORDER_URGENT = false;

      refreshPlaceOrderPage();
    });
  }

  if (submitButton) {
    submitButton.addEventListener("click", () => {
      const cart = window.DMC_PLACE_ORDER_CART;

      if (cart.length === 0) {
        alert("No items in the order cart.");
        return;
      }

      const selectedDepartment = window.DMC_PLACE_ORDER_SELECTED_DEPARTMENT;

      const confirmed = confirm(
        `Submit ${cart.length} item request(s) for ${selectedDepartment}?`
      );

      if (!confirmed) {
        return;
      }

      const orders = getStoredBranchOrders();

      const newOrder = {
        orderId: createOrderId(),
        branch: "DMC-Iriga Branch",
        department: selectedDepartment,
        orderDate: getTodayOrderDate(),
        urgent: window.DMC_PLACE_ORDER_URGENT,
        notes: window.DMC_PLACE_ORDER_NOTES,
        status: "Submitted",
        statusHistory: [
          {
            status: "Submitted",
            timestamp: new Date().toISOString(),
            note: "Branch submitted order request."
          }
        ],
        lines: cart
      };

      saveBranchOrders([newOrder, ...orders]);

      window.DMC_PLACE_ORDER_CART = [];
      window.DMC_PLACE_ORDER_QTY = "";
      window.DMC_PLACE_ORDER_NOTES = "";
      window.DMC_PLACE_ORDER_URGENT = false;

      alert("Order submitted to Commissary Branch Orders.");
      refreshPlaceOrderPage();
    });
  }
}

window.DMC_PAGES["place-order"] = {
  eyebrow: "DMC-Iriga Branch",
  title: "Place Order",
  description:
    "Create branch stock requests for commissary review and fulfillment.",
  content: getPlaceOrderContent(),
  afterRender: setupPlaceOrderEvents
};
