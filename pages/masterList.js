window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_MASTER_LIST_STORAGE_KEY = "dmc_master_list_items";
const DMC_SETTINGS_STORAGE_KEY_FOR_MASTER_LIST = "dmc_inventory_settings";

window.DMC_MASTER_LIST_FILTERS = {
  operatingArea: window.DMC_MASTER_LIST_FILTERS?.operatingArea || "all",
  department: window.DMC_MASTER_LIST_FILTERS?.department || "all",
  search: window.DMC_MASTER_LIST_FILTERS?.search || ""
};

window.DMC_MASTER_LIST_EDITING_ITEM_ID =
  window.DMC_MASTER_LIST_EDITING_ITEM_ID || null;

window.DMC_MASTER_LIST_FORM_OPEN =
  window.DMC_MASTER_LIST_FORM_OPEN || false;

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

function normalizeMasterListSettings(settings) {
  return {
    operatingAreas: settings.operatingAreas || [],
    departments: settings.departments || [],
    sections: settings.sections || [],
    units: settings.units || []
  };
}

function getMasterListSettings() {
  const defaultSettings = normalizeMasterListSettings(
    window.DMC_DATA?.settings || {
      operatingAreas: [],
      departments: [],
      sections: [],
      units: []
    }
  );

  const storedSettings = localStorage.getItem(
    DMC_SETTINGS_STORAGE_KEY_FOR_MASTER_LIST
  );

  if (!storedSettings) {
    return defaultSettings;
  }

  try {
    return normalizeMasterListSettings(JSON.parse(storedSettings));
  } catch {
    return defaultSettings;
  }
}

function getSettingOptionName(option) {
  if (typeof option === "string") {
    return option;
  }

  return option?.name || "";
}

function renderOptions(options, selectedValue = "") {
  if (!options || options.length === 0) {
    return `
      <option value="">
        No options available
      </option>
    `;
  }

  return options
    .map((option) => {
      const optionName = getSettingOptionName(option);

      return `
        <option value="${optionName}" ${
        selectedValue === optionName ? "selected" : ""
      }>
          ${optionName}
        </option>
      `;
    })
    .join("");
}

function getEditingMasterListItem() {
  if (!window.DMC_MASTER_LIST_EDITING_ITEM_ID) {
    return null;
  }

  return getStoredMasterListItems().find(
    (item) => item.itemId === window.DMC_MASTER_LIST_EDITING_ITEM_ID
  );
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

  if (!departmentCode || !sectionCode) {
    return "";
  }

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

function showMasterListModal({ type, title, message, confirmLabel }) {
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

function showMasterListConfirm({
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

function getFilteredMasterListItems() {
  const filters = window.DMC_MASTER_LIST_FILTERS;
  const items = getStoredMasterListItems();

  return items.filter((item) => {
    const itemOperatingArea = String(item.operatingArea || "").toLowerCase();
    const itemDepartment = String(item.department || "").toLowerCase();

    const selectedOperatingArea = String(
      filters.operatingArea || "all"
    ).toLowerCase();

    const selectedDepartment = String(filters.department || "all").toLowerCase();

    const matchesOperatingArea =
      selectedOperatingArea === "all" ||
      itemOperatingArea === selectedOperatingArea;

    const matchesDepartment =
      selectedDepartment === "all" || itemDepartment === selectedDepartment;

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

    return matchesOperatingArea && matchesDepartment && matchesSearch;
  });
}

function renderOperatingAreaFilterOptions(settings) {
  const currentOperatingArea = window.DMC_MASTER_LIST_FILTERS.operatingArea;

  return `
    <option value="all" ${currentOperatingArea === "all" ? "selected" : ""}>
      All Operating Areas
    </option>
    ${(settings.operatingAreas || [])
      .map((operatingArea) => {
        const operatingAreaName = getSettingOptionName(operatingArea);

        return `
          <option value="${operatingAreaName}" ${
          currentOperatingArea === operatingAreaName ? "selected" : ""
        }>
            ${operatingAreaName}
          </option>
        `;
      })
      .join("")}
  `;
}

function renderDepartmentFilterOptions(settings) {
  const currentDepartment = window.DMC_MASTER_LIST_FILTERS.department;

  return `
    <option value="all" ${currentDepartment === "all" ? "selected" : ""}>
      All Departments
    </option>
    ${(settings.departments || [])
      .map((department) => {
        const departmentName = getSettingOptionName(department);

        return `
          <option value="${departmentName}" ${
          currentDepartment === departmentName ? "selected" : ""
        }>
            ${departmentName}
          </option>
        `;
      })
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

function renderAddEditItemPanel(settings, editingItem, isEditing) {
  const selectedOperatingArea =
    editingItem?.operatingArea ||
    getSettingOptionName(settings.operatingAreas[0]) ||
    "";

  const selectedDepartment =
    editingItem?.department || getSettingOptionName(settings.departments[0]) || "";

  const selectedSection =
    editingItem?.section || getSettingOptionName(settings.sections[0]) || "";

  const selectedUnit =
    editingItem?.unit || getSettingOptionName(settings.units[0]) || "";

  const selectedItemId =
    editingItem?.itemId || getNextItemId(selectedDepartment, selectedSection);

  const panelIsOpen = isEditing || window.DMC_MASTER_LIST_FORM_OPEN;

  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Add / Edit Master List Item</h3>
          <p>
            Use this panel to create or update an item. Dropdowns come from the
            Settings Setup Library.
          </p>
        </div>

        <button class="primary-button" id="show-add-item-panel">
          + Add Item
        </button>
      </div>

      <div class="add-item-panel ${panelIsOpen ? "" : "hidden"}" id="add-item-panel">
        <h4 id="master-list-form-title">
          ${isEditing ? "Edit Master List Item" : "Item Form"}
        </h4>

        <div class="instruction-box">
          <strong>Setup Library Connection:</strong>
          <span>
            Operating Area, Department, Section, and Unit are reusable dropdown
            options from Settings. The item path is created here when the item is saved.
          </span>
        </div>

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
              ${renderOptions(settings.sections, selectedSection)}
            </select>
          </label>

          <label>
            Item ID
            <input
              id="itemId"
              type="text"
              placeholder="Auto-generated"
              value="${selectedItemId}"
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
              <option value="true" ${
                editingItem?.active !== false ? "selected" : ""
              }>TRUE</option>
              <option value="false" ${
                editingItem?.active === false ? "selected" : ""
              }>FALSE</option>
            </select>
          </label>

          <label class="form-full">
            Notes
            <textarea id="notes" rows="3" placeholder="Optional notes">${
              editingItem?.notes || ""
            }</textarea>
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
    </section>
  `;
}

function renderFullMasterListPanel(settings) {
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Full Master List</h3>
          <p>
            Review, filter, edit, or remove saved item records.
          </p>
        </div>

        <span class="badge">Item Records</span>
      </div>

      <div class="master-list-filter-shell">
        <div class="master-list-filter-grid">
          <label class="filter-search">
            Search
            <input
              id="master-list-search"
              type="text"
              placeholder="Search item name, ID, unit, notes..."
              value="${window.DMC_MASTER_LIST_FILTERS.search}"
            />
          </label>

          <label>
            Operating Area
            <select id="master-list-operating-area-filter">
              ${renderOperatingAreaFilterOptions(settings)}
            </select>
          </label>

          <label>
            Department
            <select id="master-list-department-filter">
              ${renderDepartmentFilterOptions(settings)}
            </select>
          </label>

          <button class="ghost-button" id="clear-master-list-filters">
            Clear Filters
          </button>
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Operating Area</th>
              <th>Department</th>
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

function getMasterListContent() {
  const settings = getMasterListSettings();
  const editingItem = getEditingMasterListItem();
  const isEditing = Boolean(editingItem);

  return `
    ${renderAddEditItemPanel(settings, editingItem, isEditing)}
    ${renderFullMasterListPanel(settings)}
  `;
}

function refreshMasterListPage() {
  window.DMC_PAGES["master-list"].content = getMasterListContent();
  renderPage("master-list");
}

function openAddItemPanel() {
  window.DMC_MASTER_LIST_EDITING_ITEM_ID = null;
  window.DMC_MASTER_LIST_FORM_OPEN = true;
  refreshMasterListPage();
  updateItemIdPreview();
}

function cancelMasterListForm() {
  window.DMC_MASTER_LIST_EDITING_ITEM_ID = null;
  window.DMC_MASTER_LIST_FORM_OPEN = false;
  refreshMasterListPage();
}

function clearMasterListFormFields() {
  const officialItemName = document.getElementById("officialItemName");
  const minimumStock = document.getElementById("minimumStock");
  const notes = document.getElementById("notes");

  if (officialItemName) officialItemName.value = "";
  if (minimumStock) minimumStock.value = "";
  if (notes) notes.value = "";

  updateItemIdPreview();
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

  const operatingAreaFilter = document.getElementById(
    "master-list-operating-area-filter"
  );
  const departmentFilter = document.getElementById(
    "master-list-department-filter"
  );
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
    departmentSelect.addEventListener("change", updateItemIdPreview);
  }

  if (sectionSelect) {
    sectionSelect.addEventListener("change", updateItemIdPreview);
  }

  if (operatingAreaFilter) {
    operatingAreaFilter.addEventListener("change", () => {
      window.DMC_MASTER_LIST_FILTERS.operatingArea = operatingAreaFilter.value;
      refreshMasterListPage();
    });
  }

  if (departmentFilter) {
    departmentFilter.addEventListener("change", () => {
      window.DMC_MASTER_LIST_FILTERS.department = departmentFilter.value;
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
        operatingArea: "all",
        department: "all",
        search: ""
      };

      refreshMasterListPage();
    });
  }

  document.querySelectorAll("[data-edit-master-item]").forEach((button) => {
    button.addEventListener("click", () => {
      window.DMC_MASTER_LIST_EDITING_ITEM_ID = button.dataset.editMasterItem;
      window.DMC_MASTER_LIST_FORM_OPEN = true;
      refreshMasterListPage();
    });
  });

  document.querySelectorAll("[data-remove-master-item]").forEach((button) => {
    button.addEventListener("click", () => {
      const itemId = button.dataset.removeMasterItem;

      showMasterListConfirm({
        type: "danger",
        title: "Remove Master List Item?",
        message: `This will remove item ${itemId} from the Master List. This cannot be undone from this screen.`,
        confirmLabel: "Remove Item",
        cancelLabel: "Cancel",
        onConfirm: () => {
          const updatedItems = getStoredMasterListItems().filter(
            (item) => item.itemId !== itemId
          );

          saveMasterListItems(updatedItems);
          refreshMasterListPage();
        }
      });
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

      if (!savedItem.operatingArea) {
        showMasterListModal({
          type: "warning",
          title: "Operating Area Required",
          message:
            "Please add or select an Operating Area before saving this item.",
          confirmLabel: "Got it"
        });
        return;
      }

      if (!savedItem.department) {
        showMasterListModal({
          type: "warning",
          title: "Department Required",
          message: "Please add or select a Department before saving this item.",
          confirmLabel: "Got it"
        });
        return;
      }

      if (!savedItem.section) {
        showMasterListModal({
          type: "warning",
          title: "Section Required",
          message: "Please add or select a Section before saving this item.",
          confirmLabel: "Got it"
        });
        return;
      }

      if (!savedItem.unit) {
        showMasterListModal({
          type: "warning",
          title: "Unit Required",
          message: "Please add or select a Unit before saving this item.",
          confirmLabel: "Got it"
        });
        return;
      }

      if (!savedItem.itemId) {
        showMasterListModal({
          type: "warning",
          title: "Item ID Required",
          message: "Please add or generate an Item ID before saving this item.",
          confirmLabel: "Got it"
        });
        return;
      }

      if (isDuplicateItemId(savedItem.itemId, originalItemId)) {
        showMasterListModal({
          type: "warning",
          title: "Duplicate Item ID",
          message: `Item ID ${savedItem.itemId} already exists. Please use a unique Item ID.`,
          confirmLabel: "Got it"
        });
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
      window.DMC_MASTER_LIST_FORM_OPEN = true;

      refreshMasterListPage();

      showMasterListModal({
        type: "success",
        title: isEditing ? "Item Updated" : "Item Saved",
        message: isEditing
          ? "The item was updated successfully. The form will stay open so you can continue adding or editing items."
          : "The item was saved successfully. The form will stay open so you can add the next item.",
        confirmLabel: "Continue"
      });

      if (!isEditing) {
        setTimeout(clearMasterListFormFields, 0);
      }
    });
  }

  const addItemPanel = document.getElementById("add-item-panel");

  if (addItemPanel && !addItemPanel.classList.contains("hidden")) {
    updateItemIdPreview();
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
