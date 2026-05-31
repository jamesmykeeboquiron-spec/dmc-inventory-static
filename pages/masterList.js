window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_MASTER_LIST_STORAGE_KEY = "dmc_master_list_items";
const DMC_SETTINGS_STORAGE_KEY_FOR_MASTER_LIST = "dmc_inventory_settings";

window.DMC_MASTER_LIST_FILTERS = window.DMC_MASTER_LIST_FILTERS || {
  department: "all",
  section: "all",
  search: ""
};

window.DMC_MASTER_LIST_EDITING_ITEM_ID =
  window.DMC_MASTER_LIST_EDITING_ITEM_ID || null;

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

function getEditingMasterListItem() {
  if (!window.DMC_MASTER_LIST_EDITING_ITEM_ID) {
    return null;
  }

  return getStoredMasterListItems().find(
    (item) => item.itemId === window.DMC_MASTER_LIST_EDITING_ITEM_ID
  );
}

function renderOptions(options, selectedValue = "", labelKey = "name") {
  return options
    .map(
      (option) => `
        <option value="${option[labelKey]}" ${
        selectedValue === option[labelKey] ? "selected" : ""
      }>
          ${option[labelKey]}
        </option>
      `
    )
    .join("");
}

function getSectionsForDepartment(settings, selectedDepartmentNameOrId) {
  const selectedDepartment = settings.departments.find(
    (department) =>
      department.name === selectedDepartmentNameOrId ||
      department.id === selectedDepartmentNameOrId
  );

  if (!selectedDepartment) {
    return settings.sections || [];
  }

  return (settings.sections || []).filter(
    (section) => section.departmentId === selectedDepartment.id
  );
}

function renderSectionOptions(
  settings,
  selectedDepartmentName,
  selectedSection = ""
) {
  const sectionOptions = getSectionsForDepartment(
    settings,
    selectedDepartmentName
  );

  if (sectionOptions.length === 0) {
    return `
      <option value="">
        No sections available for this department
      </option>
    `;
  }

  return renderOptions(sectionOptions, selectedSection);
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
  const editingItem = getEditingMasterListItem();

  if (editingItem) {
    return;
  }

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

  const visibleSections = getSectionsForDepartment(
    settings,
    filters.department
  );

  const sectionsToShow =
    filters.department === "all" ? settings.sections || [] : visibleSections;

  return `
    <option value="all" ${filters.section === "all" ? "selected" : ""}>
      All Sections
    </option>
    ${sectionsToShow
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
        <td colspan="10">No items match the current filters.</td>
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
          <td>
            <div class="row-actions">
              <button class="tiny-button" data-edit-master-item="${item.itemId}">
                Edit
              </button>
              <button class="tiny-button danger" data-remove-master-item="${item.itemId}">
                Remove
              </button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");
}

function getMasterListContent() {
  const allItems = getStoredMasterListItems();
  const filteredItems = getFilteredMasterListItems();
  const settings = getMasterListSettings();
  const editingItem = getEditingMasterListItem();
  const isEditing = Boolean(editingItem);

  const selectedOperatingArea =
    editingItem?.operatingArea || settings.operatingAreas[0]?.name || "";

  const selectedDepartment =
    editingItem?.department || settings.departments[0]?.name || "";

  const availableSectionsForSelectedDepartment = getSectionsForDepartment(
    settings,
    selectedDepartment
  );

  const selectedSection =
    editingItem?.section || availableSectionsForSelectedDepartment[0]?.name || "";

  const selectedUnit = editingItem?.unit || settings.units[0]?.name || "";

  return `
    <section class="grid">
      <div class="card">
        <p>Showing Items</p>
        <strong>${filteredItems.length}</strong>
      </div>

      <div class="card">
        <p>Total Items</p>
        <strong>${allItems.length}</strong>
      </div>

      <div class="card">
        <p>Sections</p>
        <strong>${settings.sections.length}</strong>
      </div>

      <div class="card">
        <p>Units</p>
        <strong>${settings.units.length}</strong>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Master List Item Catalog</h3>
          <p>
            This catalog uses dropdown options from Settings for Operating Area,
            Department, Section, and Unit.
          </p>
        </div>

        <button class="primary-button" id="show-add-item-panel">
          + Add Item
        </button>
      </div>

      <div class="add-item-panel ${isEditing ? "" : "hidden"}" id="add-item-panel">
        <h4 id="master-list-form-title">
          ${isEditing ? "Edit Master List Item" : "Add Master List Item"}
        </h4>

        <form id="add-item-form" class="form-grid">
          <label>
            Operating Area
            <select id="operatingArea" required>
              ${renderOptions(settings.operatingAreas, selectedOperatingArea)}
            </select>
          </label>

          <label>
            Department
            <select id="department" required>
              ${renderOptions(settings.departments, selectedDepartment)}
            </select>
          </label>

          <label>
            Section
            <select id="section" required>
              ${renderSectionOptions(settings, selectedDepartment, selectedSection)}
            </select>
          </label>

          <label>
            Item ID
            <input
              id="itemId"
              type="text"
              placeholder="Auto-generated"
              value="${editingItem?.itemId || ""}"
              required
            />
          </label>

          <label>
            Official Item Name
            <input
              id="officialItemName"
              type="text"
              placeholder="Espresso Beans"
              value="${editingItem?.officialItemName || ""}"
              required
            />
          </label>

          <label>
            Unit
            <select id="unit" required>
              ${renderOptions(settings.units, selectedUnit)}
            </select>
          </label>

          <label>
            Minimum Stock
            <input
              id="minimumStock"
              type="text"
              placeholder="Optional"
              value="${editingItem?.minimumStock || ""}"
            />
          </label>

          <label>
            Active
            <select id="active" required>
              <option value="true" ${editingItem?.active !== false ? "selected" : ""}>TRUE</option>
              <option value="false" ${editingItem?.active === false ? "selected" : ""}>FALSE</option>
            </select>
          </label>

          <label class="form-full">
            Notes
            <textarea id="notes" rows="3" placeholder="Optional notes">${editingItem?.notes || ""}</textarea>
          </label>

          <div class="form-actions form-full">
            <button type="submit" class="primary-button">
              ${isEditing ? "Save Changes" : "Save Item"}
            </button>
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
              <th>Actions</th>
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

function refreshMasterListPage() {
  window.DMC_PAGES["master-list"].content = getMasterListContent();
  renderPage("master-list");
}

function updateSectionDropdown() {
  const settings = getMasterListSettings();
  const departmentSelect = document.getElementById("department");
  const sectionSelect = document.getElementById("section");

  if (!departmentSelect || !sectionSelect) {
    return;
  }

  const currentSection = sectionSelect.value;
  const availableSections = getSectionsForDepartment(
    settings,
    departmentSelect.value
  );

  const currentSectionStillValid = availableSections.some(
    (section) => section.name === currentSection
  );

  const nextSelectedSection = currentSectionStillValid
    ? currentSection
    : availableSections[0]?.name || "";

  sectionSelect.innerHTML = renderSectionOptions(
    settings,
    departmentSelect.value,
    nextSelectedSection
  );

  sectionSelect.value = nextSelectedSection;

  updateItemIdPreview();
}

function openAddItemPanel() {
  window.DMC_MASTER_LIST_EDITING_ITEM_ID = null;
  refreshMasterListPage();

  const addItemPanel = document.getElementById("add-item-panel");

  if (addItemPanel) {
    addItemPanel.classList.remove("hidden");
  }

  updateSectionDropdown();
  updateItemIdPreview();
}

function cancelMasterListForm() {
  window.DMC_MASTER_LIST_EDITING_ITEM_ID = null;
  refreshMasterListPage();
}

function isDuplicateItemId(itemId, originalItemId = null) {
  return getStoredMasterListItems().some((item) => {
    if (originalItemId && item.itemId === originalItemId) {
      return false;
    }

    return (
      String(item.itemId || "").toLowerCase() ===
      String(itemId || "").toLowerCase()
    );
  });
}

function setupMasterListEvents() {
  const showButton = document.getElementById("show-add-item-panel");
  const cancelButton = document.getElementById("cancel-add-item");
  const addItemForm = document.getElementById("add-item-form");
  const departmentSelect = document.getElementById("department");
  const sectionSelect = document.getElementById("section");

  const departmentFilter = document.getElementById(
    "master-list-department-filter"
  );
  const sectionFilter = document.getElementById("master-list-section-filter");
  const searchInput = document.getElementById("master-list-search");
  const clearFiltersButton = document.getElementById(
    "clear-master-list-filters"
  );

  if (showButton) {
    showButton.addEventListener("click", openAddItemPanel);
  }

  if (cancelButton) {
    cancelButton.addEventListener("click", cancelMasterListForm);
  }

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
      refreshMasterListPage();
    });
  }

  if (sectionFilter) {
    sectionFilter.addEventListener("change", () => {
      window.DMC_MASTER_LIST_FILTERS.section = sectionFilter.value;
      refreshMasterListPage();
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      window.DMC_MASTER_LIST_FILTERS.search = searchInput.value;
      refreshMasterListPage();
    });
  }

  if (clearFiltersButton) {
    clearFiltersButton.addEventListener("click", () => {
      window.DMC_MASTER_LIST_FILTERS = {
        department: "all",
        section: "all",
        search: ""
      };

      refreshMasterListPage();
    });
  }

  document.querySelectorAll("[data-edit-master-item]").forEach((button) => {
    button.addEventListener("click", () => {
      window.DMC_MASTER_LIST_EDITING_ITEM_ID = button.dataset.editMasterItem;
      refreshMasterListPage();
    });
  });

  document.querySelectorAll("[data-remove-master-item]").forEach((button) => {
    button.addEventListener("click", () => {
      const itemId = button.dataset.removeMasterItem;
      const confirmed = confirm(`Remove item ${itemId} from Master List?`);

      if (!confirmed) {
        return;
      }

      const updatedItems = getStoredMasterListItems().filter(
        (item) => item.itemId !== itemId
      );

      saveMasterListItems(updatedItems);
      refreshMasterListPage();
    });
  });

  if (addItemForm) {
    addItemForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const originalItemId = window.DMC_MASTER_LIST_EDITING_ITEM_ID;
      const isEditing = Boolean(originalItemId);

      const savedItem = {
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

      if (!savedItem.section) {
        alert("Please add or select a Section before saving this item.");
        return;
      }

      if (isDuplicateItemId(savedItem.itemId, originalItemId)) {
        alert(
          `Item ID ${savedItem.itemId} already exists. Please use a unique Item ID.`
        );
        return;
      }

      const currentItems = getStoredMasterListItems();

      const updatedItems = isEditing
        ? currentItems.map((item) =>
            item.itemId === originalItemId ? savedItem : item
          )
        : [...currentItems, savedItem];

      saveMasterListItems(updatedItems);

      window.DMC_MASTER_LIST_EDITING_ITEM_ID = null;
      refreshMasterListPage();
    });
  }
}

window.DMC_PAGES["master-list"] = {
  eyebrow: "System",
  title: "Master List",
  description:
    "Manage the official item catalog. Dropdowns come from Settings.",
  getContent: getMasterListContent,
  content: getMasterListContent(),
  afterRender: setupMasterListEvents
};
