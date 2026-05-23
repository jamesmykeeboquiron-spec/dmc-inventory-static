window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_MASTER_LIST_STORAGE_KEY = "dmc_master_list_items";
const DMC_SETTINGS_STORAGE_KEY_FOR_MASTER_LIST = "dmc_inventory_settings";

window.DMC_MASTER_LIST_FILTERS = window.DMC_MASTER_LIST_FILTERS || {
  department: "all",
  section: "all",
  search: ""
};

function getMasterListDefaultItems() {
  return window.DMC_DATA?.masterList?.items || [];
}

function getStoredMasterListItems() {
  const storedItems = localStorage.getItem(DMC_MASTER_LIST_STORAGE_KEY);

  if (!storedItems) {
    return getMasterListDefaultItems();
  }

  try {
    return JSON.parse(storedItems);
  } catch {
    return getMasterListDefaultItems();
  }
}

function saveMasterListItems(items) {
  localStorage.setItem(DMC_MASTER_LIST_STORAGE_KEY, JSON.stringify(items));
}

function getMasterListSettings() {
  const defaultSettings = window.DMC_DATA?.settings || {
    operatingAreas: [],
    departments: [],
    sections: [],
    units: []
  };

  const storedSettings = localStorage.getItem(
    DMC_SETTINGS_STORAGE_KEY_FOR_MASTER_LIST
  );

  if (!storedSettings) {
    return {
      operatingAreas: defaultSettings.operatingAreas || [],
      departments: defaultSettings.departments || [],
      sections: defaultSettings.sections || [],
      units: defaultSettings.units || []
    };
  }

  try {
    const parsedSettings = JSON.parse(storedSettings);

    return {
      operatingAreas: parsedSettings.operatingAreas || [],
      departments: parsedSettings.departments || [],
      sections: parsedSettings.sections || [],
      units: parsedSettings.units || []
    };
  } catch {
    return {
      operatingAreas: defaultSettings.operatingAreas || [],
      departments: defaultSettings.departments || [],
      sections: defaultSettings.sections || [],
      units: defaultSettings.units || []
    };
  }
}

function renderOptions(options, labelKey = "name") {
  return options
    .map((option) => `<option value="${option[labelKey]}">${option[labelKey]}</option>`)
    .join("");
}

function renderSectionOptions(settings, selectedDepartmentName) {
  const selectedDepartment = settings.departments.find(
    (department) => department.name === selectedDepartmentName
  );

  const sectionOptions = selectedDepartment
    ? settings.sections.filter(
        (section) => section.departmentId === selectedDepartment.id
      )
    : settings.sections;

  return renderOptions(sectionOptions);
}

function getCodePrefix(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.slice(0, 3))
    .join("")
    .slice(0, 3);
}

function getNextItemId(departmentName, sectionName) {
  const departmentCode = getCodePrefix(departmentName);
  const sectionCode = getCodePrefix(sectionName);
  const prefix = `${departmentCode}-${sectionCode}`;

  const matchingItems = getStoredMasterListItems().filter((item) =>
    String(item.itemId || "").startsWith(prefix)
  );

  const highestNumber = matchingItems.reduce((highest, item) => {
    const numberPart = String(item.itemId || "").split("-").pop();
    const parsedNumber = Number(numberPart);

    if (Number.isNaN(parsedNumber)) {
      return highest;
    }

    return Math.max(highest, parsedNumber);
  }, 0);

  const nextNumber = String(highestNumber + 1).padStart(3, "0");

  return `${prefix}-${nextNumber}`;
}

function updateItemIdPreview() {
  const departmentSelect = document.getElementById("department");
  const sectionSelect = document.getElementById("section");
  const itemIdInput = document.getElementById("itemId");

  if (!departmentSelect || !sectionSelect || !itemIdInput) {
    return;
  }

  itemIdInput.value = getNextItemId(
    departmentSelect.value,
    sectionSelect.value
  );
}

function getFilteredMasterListItems() {
  const filters = window.DMC_MASTER_LIST_FILTERS;
  const items = getStoredMasterListItems();

  return items.filter((item) => {
    const itemDepartment = String(item.department || "").toLowerCase();
    const itemSection = String(item.section || "").toLowerCase();

    const selectedDepartment = String(filters.department || "all").toLowerCase();
    const selectedSection = String(filters.section || "all").toLowerCase();

    const matchesDepartment =
      selectedDepartment === "all" || itemDepartment === selectedDepartment;

    const matchesSection =
      selectedSection === "all" || itemSection === selectedSection;

    const searchValue = String(filters.search || "").toLowerCase().trim();

    const matchesSearch =
      !searchValue ||
      String(item.itemId || "").toLowerCase().includes(searchValue) ||
      String(item.officialItemName || "").toLowerCase().includes(searchValue) ||
      String(item.operatingArea || "").toLowerCase().includes(searchValue) ||
      String(item.department || "").toLowerCase().includes(searchValue) ||
      String(item.section || "").toLowerCase().includes(searchValue) ||
      String(item.unit || "").toLowerCase().includes(searchValue) ||
      String(item.notes || "").toLowerCase().includes(searchValue);

    return matchesDepartment && matchesSection && matchesSearch;
  });
}

function renderDepartmentFilterOptions(settings) {
  const currentDepartment = window.DMC_MASTER_LIST_FILTERS.department;

  return `
    <option value="all" ${currentDepartment === "all" ? "selected" : ""}>
      All Departments
    </option>
    ${settings.departments
      .map(
        (department) => `
          <option value="${department.name}" ${
          currentDepartment === department.name ? "selected" : ""
        }>
            ${department.name}
          </option>
        `
      )
      .join("")}
  `;
}

function renderSectionFilterOptions(settings) {
  const filters = window.DMC_MASTER_LIST_FILTERS;

  const selectedDepartment = settings.departments.find(
    (department) => department.name === filters.department
  );

  const visibleSections =
    filters.department === "all" || !selectedDepartment
      ? settings.sections
      : settings.sections.filter(
          (section) => section.departmentId === selectedDepartment.id
        );

  return `
    <option value="all" ${filters.section === "all" ? "selected" : ""}>
      All Sections
    </option>
    ${visibleSections
      .map(
        (section) => `
          <option value="${section.name}" ${
          filters.section === section.name ? "selected" : ""
        }>
            ${section.name}
          </option>
        `
      )
      .join("")}
  `;
}

function renderMasterListRows() {
  const items = getFilteredMasterListItems();

  if (items.length === 0) {
    return `
      <tr>
        <td colspan="9">No items match the current filters.</td>
      </tr>
    `;
  }

  return items
    .map(
      (item) => `
        <tr>
          <td>${item.operatingArea || "-"}</td>
          <td>${item.department || "-"}</td>
          <td>${item.section || "-"}</td>
          <td>${item.itemId || "-"}</td>
          <td>${item.officialItemName || "-"}</td>
          <td>${item.unit || "-"}</td>
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
  const items = getStoredMasterListItems();
  const filteredItems = getFilteredMasterListItems();
  const settings = getMasterListSettings();

  const departmentsCount = settings.departments.length;
  const sectionsCount = settings.sections.length;
  const unitsCount = settings.units.length;

  return `
    <section class="grid">
      <div class="card">
        <p>Showing Items</p>
        <strong>${filteredItems.length}</strong>
      </div>

      <div class="card">
        <p>Departments</p>
        <strong>${departmentsCount}</strong>
      </div>

      <div class="card">
        <p>Sections</p>
        <strong>${sectionsCount}</strong>
      </div>

      <div class="card">
        <p>Units</p>
        <strong>${unitsCount}</strong>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Master List Item Catalog</h3>
          <p>
            This catalog now uses dropdown options from Settings for Operating
            Area, Department, Section, and Unit.
          </p>
        </div>

        <button class="primary-button" id="show-add-item-panel">
          + Add Item
        </button>
      </div>

      <div class="add-item-panel hidden" id="add-item-panel">
        <h4>Add Master List Item</h4>

        <form id="add-item-form" class="form-grid">
          <label>
            Operating Area
            <select id="operatingArea" required>
              ${renderOptions(settings.operatingAreas)}
            </select>
          </label>

          <label>
            Department
            <select id="department" required>
              ${renderOptions(settings.departments)}
            </select>
          </label>

          <label>
            Section
            <select id="section" required>
              ${renderSectionOptions(settings, settings.departments[0]?.name)}
            </select>
          </label>

          <label>
            Item ID
            <input id="itemId" type="text" placeholder="Auto-generated" required />
          </label>

          <label>
            Official Item Name
            <input id="officialItemName" type="text" placeholder="Espresso Beans" required />
          </label>

          <label>
            Unit
            <select id="unit" required>
              ${renderOptions(settings.units)}
            </select>
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

<div class="filter-bar">
  <label>
    Department
    <select id="master-list-department-filter">
      ${renderDepartmentFilterOptions(settings)}
    </select>
  </label>

  <label>
    Section
    <select id="master-list-section-filter">
      ${renderSectionFilterOptions(settings)}
    </select>
  </label>

  <label class="filter-search">
    Search
    <input
      id="master-list-search"
      type="text"
      placeholder="Search item name, ID, section, unit..."
      value="${window.DMC_MASTER_LIST_FILTERS.search}"
    />
  </label>

  <button class="ghost-button" id="clear-master-list-filters">
    Clear Filters
  </button>
</div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Operating Area</th>
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
            ${renderMasterListRows()}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function updateSectionDropdown() {
  const settings = getMasterListSettings();
  const departmentSelect = document.getElementById("department");
  const departmentFilter = document.getElementById("master-list-department-filter");
  const sectionFilter = document.getElementById("master-list-section-filter");
  const searchInput = document.getElementById("master-list-search");
  const clearFiltersButton = document.getElementById("clear-master-list-filters");
  const sectionSelect = document.getElementById("section");

  if (!departmentSelect || !sectionSelect) {
    return;
  }

  sectionSelect.innerHTML = renderSectionOptions(
    settings,
    departmentSelect.value
  );

  updateItemIdPreview();
}

function setupMasterListEvents() {
  const addItemPanel = document.getElementById("add-item-panel");
  const showButton = document.getElementById("show-add-item-panel");
  const cancelButton = document.getElementById("cancel-add-item");
  const addItemForm = document.getElementById("add-item-form");
  const departmentSelect = document.getElementById("department");
  const sectionSelect = document.getElementById("section");

  if (!addItemPanel || !showButton || !cancelButton || !addItemForm) {
    return;
  }

  showButton.addEventListener("click", () => {
  addItemPanel.classList.remove("hidden");
  updateSectionDropdown();
  updateItemIdPreview();
});

  cancelButton.addEventListener("click", () => {
  addItemPanel.classList.add("hidden");
  addItemForm.reset();
  updateSectionDropdown();
  updateItemIdPreview();
});

  if (departmentSelect) {
    departmentSelect.addEventListener("change", updateSectionDropdown);
  }

  if (sectionSelect) {
  sectionSelect.addEventListener("change", updateItemIdPreview);
  }

  if (departmentFilter) {
  departmentFilter.addEventListener("change", () => {
    window.DMC_MASTER_LIST_FILTERS.department = departmentFilter.value;
    window.DMC_MASTER_LIST_FILTERS.section = "all";
    window.DMC_PAGES["master-list"].content = getMasterListContent();
    renderPage("master-list");
  });
}

if (sectionFilter) {
  sectionFilter.addEventListener("change", () => {
    window.DMC_MASTER_LIST_FILTERS.section = sectionFilter.value;
    window.DMC_PAGES["master-list"].content = getMasterListContent();
    renderPage("master-list");
  });
}

if (searchInput) {
  searchInput.addEventListener("input", () => {
    window.DMC_MASTER_LIST_FILTERS.search = searchInput.value;
    window.DMC_PAGES["master-list"].content = getMasterListContent();
    renderPage("master-list");
  });
}

if (clearFiltersButton) {
  clearFiltersButton.addEventListener("click", () => {
    window.DMC_MASTER_LIST_FILTERS = {
      department: "all",
      section: "all",
      search: ""
    };

    window.DMC_PAGES["master-list"].content = getMasterListContent();
    renderPage("master-list");
  });
}
  
  addItemForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const newItem = {
      operatingArea: document.getElementById("operatingArea").value,
      department: document.getElementById("department").value,
      section: document.getElementById("section").value,
      itemId: document.getElementById("itemId").value.trim(),
      officialItemName: document
        .getElementById("officialItemName")
        .value.trim(),
      unit: document.getElementById("unit").value,
      minimumStock: document.getElementById("minimumStock").value.trim(),
      active: document.getElementById("active").value === "true",
      notes: document.getElementById("notes").value.trim()
    };

    const currentItems = getStoredMasterListItems();
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
    "Manage the official item catalog. Dropdowns now come from Settings.",
  content: getMasterListContent(),
  afterRender: setupMasterListEvents
};
