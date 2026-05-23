window.DMC_PAGES = window.DMC_PAGES || {};

function getMasterListData() {
  return window.DMC_DATA?.masterList || {
    departments: [],
    items: []
  };
}

function getStoredMasterListItems() {
  const storedItems = localStorage.getItem("dmc_master_list_items");

  if (!storedItems) {
    return getMasterListData().items;
  }

  try {
    return JSON.parse(storedItems);
  } catch {
    return getMasterListData().items;
  }
}

function saveMasterListItems(items) {
  localStorage.setItem("dmc_master_list_items", JSON.stringify(items));
}

function getAllMasterListItems() {
  return getStoredMasterListItems();
}

function getDepartmentIcon(departmentId) {
  const icons = {
    bar: "☕",
    kitchen: "🍳",
    dining: "🍽️",
    commissary: "📦"
  };

  return icons[departmentId] || "▥";
}

function renderDepartmentCards() {
  const { departments } = getMasterListData();

  return departments
    .map((department) => {
      const sectionPreview =
        department.sections.length > 0
          ? department.sections
              .map((section) => `<span class="section-chip">${section}</span>`)
              .join("")
          : `<span class="section-chip muted">Sections to be added later</span>`;

      return `
        <article class="department-card">
          <div class="department-icon">${getDepartmentIcon(department.id)}</div>

          <div>
            <h4>${department.name} Inventory Catalog</h4>
            <p>${department.description}</p>

            <div class="section-chip-row">
              ${sectionPreview}
            </div>
          </div>

          <span class="badge">${department.name}</span>
        </article>
      `;
    })
    .join("");
}

function renderBarMasterListRows() {
  const barItems = getAllMasterListItems().filter(
    (item) => item.department === "BAR"
  );

  if (barItems.length === 0) {
    return `
      <tr>
        <td colspan="9">No Bar items added yet.</td>
      </tr>
    `;
  }

  return barItems
    .map(
      (item) => `
        <tr>
          <td>${item.inventoryLayer}</td>
          <td>${item.department}</td>
          <td>${item.section}</td>
          <td>${item.itemId}</td>
          <td>${item.officialItemName}</td>
          <td>${item.unit}</td>
          <td>${item.minimumStock || "-"}</td>
          <td>
            <span class="badge">${item.active ? "TRUE" : "FALSE"}</span>
          </td>
          <td>${item.notes || "-"}</td>
        </tr>
      `
    )
    .join("");
}

function getMasterListContent() {
  const barDepartment = getMasterListData().departments.find(
    (department) => department.id === "bar"
  );

  const barItems = getAllMasterListItems().filter(
    (item) => item.department === "BAR"
  );

  return `
    <section class="grid">
      <div class="card">
        <p>Department Catalogs</p>
        <strong>4</strong>
      </div>

      <div class="card">
        <p>Active Build</p>
        <strong>Bar</strong>
      </div>

      <div class="card">
        <p>Bar Sections</p>
        <strong>${barDepartment?.sections.length || 0}</strong>
      </div>

      <div class="card">
        <p>Bar Items</p>
        <strong>${barItems.length}</strong>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Inventory Catalog by Department</h3>
          <p>
            The Master List starts by department. Each department will later
            have its own sections and official item catalog.
          </p>
        </div>

        <button class="ghost-button">Department View</button>
      </div>

      <div class="department-catalog-grid">
        ${renderDepartmentCards()}
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Bar Inventory Catalog</h3>
          <p>
            First test department using the official Master List format from the spreadsheet.
            Added items are saved locally in this browser for prototype testing.
          </p>
        </div>

        <button class="primary-button" id="show-add-item-panel">
          + Add Item
        </button>
      </div>

      <div class="add-item-panel hidden" id="add-item-panel">
        <h4>Add Bar Item</h4>

        <form id="add-item-form" class="form-grid">
          <label>
            Inventory Layer
            <select id="inventoryLayer" required>
              <option value="Branch/Station">Branch/Station</option>
              <option value="Commissary">Commissary</option>
              <option value="System">System</option>
            </select>
          </label>

          <label>
            Department
            <select id="department" required>
              <option value="BAR">BAR</option>
            </select>
          </label>

          <label>
            Section
            <input id="section" type="text" placeholder="Coffee" required />
          </label>

          <label>
            Item ID
            <input id="itemId" type="text" placeholder="BAR-COF-002" required />
          </label>

          <label>
            Official Item Name
            <input id="officialItemName" type="text" placeholder="Espresso Beans" required />
          </label>

          <label>
            Unit
            <input id="unit" type="text" placeholder="kg, liters, pcs, pack" required />
          </label>

          <label>
            Minimum Stock
            <input id="minimumStock" type="text" placeholder="Optional" />
          </label>

          <label>
            Active
            <select id="active" required>
              <option value="true">TRUE</option>
              <option value="false">FALSE</option>
            </select>
          </label>

          <label class="form-full">
            Notes
            <textarea id="notes" rows="3" placeholder="Optional notes"></textarea>
          </label>

          <div class="form-actions form-full">
            <button type="submit" class="primary-button">Save Item</button>
            <button type="button" class="ghost-button" id="cancel-add-item">
              Cancel
            </button>
          </div>
        </form>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Inventory Layer</th>
              <th>Department</th>
              <th>Section</th>
              <th>Item ID</th>
              <th>Official Item Name</th>
              <th>Unit</th>
              <th>Minimum Stock</th>
              <th>Active</th>
              <th>Notes</th>
            </tr>
          </thead>

          <tbody>
            ${renderBarMasterListRows()}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function setupMasterListEvents() {
  const addItemPanel = document.getElementById("add-item-panel");
  const showButton = document.getElementById("show-add-item-panel");
  const cancelButton = document.getElementById("cancel-add-item");
  const addItemForm = document.getElementById("add-item-form");

  if (!addItemPanel || !showButton || !cancelButton || !addItemForm) {
    return;
  }

  showButton.addEventListener("click", () => {
    addItemPanel.classList.remove("hidden");
  });

  cancelButton.addEventListener("click", () => {
    addItemPanel.classList.add("hidden");
    addItemForm.reset();
  });

  addItemForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const newItem = {
      inventoryLayer: document.getElementById("inventoryLayer").value,
      department: document.getElementById("department").value,
      section: document.getElementById("section").value.trim(),
      itemId: document.getElementById("itemId").value.trim(),
      officialItemName: document
        .getElementById("officialItemName")
        .value.trim(),
      unit: document.getElementById("unit").value.trim(),
      minimumStock: document.getElementById("minimumStock").value.trim(),
      active: document.getElementById("active").value === "true",
      notes: document.getElementById("notes").value.trim()
    };

    const currentItems = getAllMasterListItems();
    const updatedItems = [...currentItems, newItem];

    saveMasterListItems(updatedItems);

    window.DMC_PAGES["master-list"].content = getMasterListContent();
    renderPage("master-list");
  });
}

window.DMC_PAGES["master-list"] = {
  eyebrow: "Commissary",
  title: "Master List",
  description:
    "View inventory catalogs by department. Bar is being built first using the official Master List table format.",
  content: getMasterListContent(),
  afterRender: setupMasterListEvents
};
