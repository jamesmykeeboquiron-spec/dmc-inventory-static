window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_PLACE_ORDER_MASTER_LIST_KEY = "dmc_master_list_items";
const DMC_PLACE_ORDER_STORAGE_KEY = "dmc_branch_orders";

window.DMC_PLACE_ORDER_SELECTED_DEPARTMENT =
  window.DMC_PLACE_ORDER_SELECTED_DEPARTMENT || "Bar";

window.DMC_PLACE_ORDER_DRAFT = window.DMC_PLACE_ORDER_DRAFT || {};

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

  return getPlaceOrderMasterListItems().filter((item) => {
    const matchesDepartment =
      String(item.department || "").toLowerCase() ===
      String(selectedDepartment || "").toLowerCase();

    const isActive = item.active !== false;

    return matchesDepartment && isActive;
  });
}

function getDraftQty(itemId) {
  return window.DMC_PLACE_ORDER_DRAFT[itemId]?.requestedQty || "";
}

function getDraftNotes(itemId) {
  return window.DMC_PLACE_ORDER_DRAFT[itemId]?.notes || "";
}

function getOrderLinesFromDraft() {
  const items = getItemsForPlaceOrder();

  return items
    .map((item) => {
      const draftLine = window.DMC_PLACE_ORDER_DRAFT[item.itemId] || {};
      const requestedQty = Number(draftLine.requestedQty || 0);

      if (Number.isNaN(requestedQty) || requestedQty <= 0) {
        return null;
      }

      return {
        itemId: item.itemId,
        itemName: item.officialItemName,
        section: item.section,
        requestedQty,
        unit: item.unit,
        notes: draftLine.notes || ""
      };
    })
    .filter(Boolean);
}

function getTodayOrderDate() {
  return new Date().toISOString().slice(0, 10);
}

function createOrderId() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replaceAll("-", "");
  const timePart = now.toTimeString().slice(0, 8).replaceAll(":", "");

  return `BR-${datePart}-${timePart}`;
}

function renderPlaceOrderRows() {
  const items = getItemsForPlaceOrder();

  if (items.length === 0) {
    return `
      <tr>
        <td colspan="7">
          No active ${window.DMC_PLACE_ORDER_SELECTED_DEPARTMENT} items found.
          Add active items in Master List first.
        </td>
      </tr>
    `;
  }

  return items
    .map(
      (item) => `
        <tr>
          <td>${item.section || "-"}</td>
          <td>${item.itemId || "-"}</td>
          <td>${item.officialItemName || "-"}</td>
          <td>${item.unit || "-"}</td>
          <td>
            <input
              class="order-qty-input"
              data-order-item="${item.itemId}"
              type="number"
              min="0"
              step="any"
              placeholder="0"
              value="${getDraftQty(item.itemId)}"
            />
          </td>
          <td>
            <input
              class="order-notes-input"
              data-order-notes="${item.itemId}"
              type="text"
              placeholder="Optional"
              value="${getDraftNotes(item.itemId)}"
            />
          </td>
          <td>
            ${
              Number(getDraftQty(item.itemId) || 0) > 0
                ? `<span class="badge">Ready</span>`
                : `<span class="badge muted-badge">No Qty</span>`
            }
          </td>
        </tr>
      `
    )
    .join("");
}

function renderPlaceOrderPreview() {
  const lines = getOrderLinesFromDraft();

  if (lines.length === 0) {
    return `
      <p class="submit-preview-empty">
        No order lines yet. Enter a requested quantity to preview the order.
      </p>
    `;
  }

  return `
    <ul class="submit-preview-list">
      ${lines
        .map(
          (line) => `
            <li>
              <strong>${line.itemName}</strong>
              <span>Request: ${line.requestedQty} ${line.unit}</span>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function getPlaceOrderSummary() {
  const items = getItemsForPlaceOrder();
  const lines = getOrderLinesFromDraft();

  return {
    availableItems: items.length,
    orderLines: lines.length,
    totalRequested: lines.reduce(
      (total, line) => total + Number(line.requestedQty || 0),
      0
    ),
    submittedOrders: getStoredBranchOrders().length
  };
}

function getPlaceOrderContent() {
  const selectedDepartment = window.DMC_PLACE_ORDER_SELECTED_DEPARTMENT;
  const summary = getPlaceOrderSummary();

  return `
    <section class="grid">
      <div class="card">
        <p>${selectedDepartment} Items</p>
        <strong>${summary.availableItems}</strong>
      </div>

      <div class="card">
        <p>Order Lines</p>
        <strong>${summary.orderLines}</strong>
      </div>

      <div class="card">
        <p>Total Requested</p>
        <strong>${summary.totalRequested}</strong>
      </div>

      <div class="card">
        <p>Submitted Orders</p>
        <strong>${summary.submittedOrders}</strong>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Place Branch Order</h3>
          <p>
            Request stock from commissary. Submitting an order does not change stock yet.
          </p>
        </div>

        <div class="form-actions">
          <button class="primary-button" id="submit-branch-order">
            Submit Order
          </button>

          <button class="ghost-button" id="clear-place-order-draft">
            Clear Draft
          </button>
        </div>
      </div>

      <div class="filter-bar">
        <label>
          Department
          <select id="place-order-department-select">
            ${renderPlaceOrderDepartmentOptions()}
          </select>
        </label>

        <label class="filter-search">
          Order Status
          <input type="text" value="Draft" disabled />
        </label>
      </div>

      <div class="instruction-box">
        <strong>Order Note:</strong>
        <span>
          This creates a request for commissary. Stock will only move later when commissary sends delivery and branch confirms received items.
        </span>
      </div>

      <div class="submit-preview-box">
        <div>
          <h4>Order Preview</h4>
          <p>Only items with requested quantity greater than 0 will be submitted.</p>
        </div>

        ${renderPlaceOrderPreview()}
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Section</th>
              <th>Item ID</th>
              <th>Item Name</th>
              <th>Unit</th>
              <th>Requested Qty</th>
              <th>Line Notes</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            ${renderPlaceOrderRows()}
          </tbody>
        </table>
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
  const submitButton = document.getElementById("submit-branch-order");
  const clearButton = document.getElementById("clear-place-order-draft");

  if (departmentSelect) {
    departmentSelect.addEventListener("change", () => {
      window.DMC_PLACE_ORDER_SELECTED_DEPARTMENT = departmentSelect.value;
      window.DMC_PLACE_ORDER_DRAFT = {};
      refreshPlaceOrderPage();
    });
  }

  document.querySelectorAll("[data-order-item]").forEach((input) => {
    input.addEventListener("change", () => {
      const itemId = input.dataset.orderItem;

      window.DMC_PLACE_ORDER_DRAFT[itemId] =
        window.DMC_PLACE_ORDER_DRAFT[itemId] || {};

      window.DMC_PLACE_ORDER_DRAFT[itemId].requestedQty = input.value;

      refreshPlaceOrderPage();
    });
  });

  document.querySelectorAll("[data-order-notes]").forEach((input) => {
    input.addEventListener("change", () => {
      const itemId = input.dataset.orderNotes;

      window.DMC_PLACE_ORDER_DRAFT[itemId] =
        window.DMC_PLACE_ORDER_DRAFT[itemId] || {};

      window.DMC_PLACE_ORDER_DRAFT[itemId].notes = input.value;

      refreshPlaceOrderPage();
    });
  });

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      const confirmed = confirm("Clear this order draft?");

      if (!confirmed) {
        return;
      }

      window.DMC_PLACE_ORDER_DRAFT = {};
      refreshPlaceOrderPage();
    });
  }

  if (submitButton) {
    submitButton.addEventListener("click", () => {
      const orderLines = getOrderLinesFromDraft();

      if (orderLines.length === 0) {
        alert("No order lines to submit.");
        return;
      }

      const selectedDepartment = window.DMC_PLACE_ORDER_SELECTED_DEPARTMENT;

      const confirmed = confirm(
        `Submit ${orderLines.length} order lines for ${selectedDepartment}?`
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
        status: "Submitted",
        statusHistory: [
          {
            status: "Submitted",
            timestamp: new Date().toISOString(),
            note: "Branch submitted order request."
          }
        ],
        lines: orderLines
      };

      saveBranchOrders([newOrder, ...orders]);

      window.DMC_PLACE_ORDER_DRAFT = {};

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
