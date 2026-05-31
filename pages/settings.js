window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_SETTINGS_STORAGE_KEY = "dmc_inventory_settings";
const DMC_SETTINGS_REASON_SYNC_KEY = "dmc_delivery_issue_reason_settings";

const DMC_SETTINGS_STOCK_ACTIONS = {
  NONE: "No Stock Movement",
  ADD_BACK_TO_COMMISSARY: "Add Back to Commissary Stock"
};

window.DMC_SELECTED_SETTINGS_CATEGORY =
  window.DMC_SELECTED_SETTINGS_CATEGORY || "settings";

window.DMC_SELECTED_SETUP_TYPE =
  window.DMC_SELECTED_SETUP_TYPE || "operating-area";

window.DMC_SETUP_LIBRARY_VIEW =
  window.DMC_SETUP_LIBRARY_VIEW || "operatingAreas";

window.DMC_SETUP_LIBRARY_SEARCH =
  window.DMC_SETUP_LIBRARY_SEARCH || "";

window.DMC_OPEN_SETUP_GROUPS =
  window.DMC_OPEN_SETUP_GROUPS || {
    systemMasterlist: true,
    itemSetup: false,
    operationalSetup: false,
    warehouseReturn: false
  };

function getDefaultDeliveryIssueReasons() {
  return [
    {
      id: "returned-usable-stock",
      name: "Returned to Usable Stock",
      category: "Recovered Stock",
      stockAction: DMC_SETTINGS_STOCK_ACTIONS.ADD_BACK_TO_COMMISSARY,
      active: true
    },
    {
      id: "confirmed-waste",
      name: "Confirmed Waste",
      category: "Waste",
      stockAction: DMC_SETTINGS_STOCK_ACTIONS.NONE,
      active: true
    },
    {
      id: "damaged-during-delivery",
      name: "Damaged During Delivery",
      category: "Waste / Delivery Damage",
      stockAction: DMC_SETTINGS_STOCK_ACTIONS.NONE,
      active: true
    },
    {
      id: "spoiled-during-delivery",
      name: "Spoiled During Delivery",
      category: "Waste / Spoilage",
      stockAction: DMC_SETTINGS_STOCK_ACTIONS.NONE,
      active: true
    },
    {
      id: "missing-driver-issue",
      name: "Missing / Driver Issue",
      category: "Missing / Accountability",
      stockAction: DMC_SETTINGS_STOCK_ACTIONS.NONE,
      active: true
    },
    {
      id: "packing-error",
      name: "Packing Error",
      category: "Commissary Error",
      stockAction: DMC_SETTINGS_STOCK_ACTIONS.NONE,
      active: true
    },
    {
      id: "branch-receiving-error",
      name: "Branch Receiving Error",
      category: "Branch Error",
      stockAction: DMC_SETTINGS_STOCK_ACTIONS.NONE,
      active: true
    },
    {
      id: "input-error",
      name: "Input Error",
      category: "System / Data Correction",
      stockAction: DMC_SETTINGS_STOCK_ACTIONS.NONE,
      active: true
    }
  ];
}

function getDefaultSettings() {
  return window.DMC_DATA?.settings || {
    operatingAreas: [],
    departments: [],
    sections: [],
    units: [],
    staffNames: [],
    managerNames: [],
    deliveryIssueReasons: getDefaultDeliveryIssueReasons()
  };
}

function normalizeSettings(settings) {
  return {
    operatingAreas: settings.operatingAreas || [],
    departments: settings.departments || [],
    sections: settings.sections || [],
    units: settings.units || [],
    staffNames: settings.staffNames || [],
    managerNames: settings.managerNames || [],
    deliveryIssueReasons:
      settings.deliveryIssueReasons || getDefaultDeliveryIssueReasons()
  };
}

function getStoredSettings() {
  const storedSettings = localStorage.getItem(DMC_SETTINGS_STORAGE_KEY);

  if (!storedSettings) {
    return normalizeSettings(getDefaultSettings());
  }

  try {
    return normalizeSettings(JSON.parse(storedSettings));
  } catch {
    return normalizeSettings(getDefaultSettings());
  }
}

function saveSettings(settings) {
  const normalizedSettings = normalizeSettings(settings);

  localStorage.setItem(
    DMC_SETTINGS_STORAGE_KEY,
    JSON.stringify(normalizedSettings)
  );

  localStorage.setItem(
    DMC_SETTINGS_REASON_SYNC_KEY,
    JSON.stringify(normalizedSettings.deliveryIssueReasons)
  );
}

function slugifySetting(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getSettingCollectionKey(setupType) {
  if (setupType === "operating-area") return "operatingAreas";
  if (setupType === "department") return "departments";
  if (setupType === "section") return "sections";
  if (setupType === "unit") return "units";
  if (setupType === "staff") return "staffNames";
  if (setupType === "manager") return "managerNames";
  if (setupType === "workflow") return "deliveryIssueReasons";

  return "";
}

function getSetupLabel(setupType) {
  if (setupType === "operating-area") return "Operating Area";
  if (setupType === "department") return "Department";
  if (setupType === "section") return "Section";
  if (setupType === "unit") return "Unit";
  if (setupType === "staff") return "Staff";
  if (setupType === "manager") return "Manager";
  if (setupType === "workflow") return "Workflow Rule";

  return "Setup Option";
}

function getSetupDescription(setupType) {
  if (setupType === "operating-area") {
    return "Operating Areas are reusable top-level options. Master List combines them with Department and Section when an item is created.";
  }

  if (setupType === "department") {
    return "Departments are reusable dropdown options. They are not locked to an Operating Area here.";
  }

  if (setupType === "section") {
    return "Sections are reusable dropdown options. They are not locked under a Department until an item is created in Master List.";
  }

  if (setupType === "unit") {
    return "Units are reusable item measurements. Master List applies the Unit when creating an item.";
  }

  if (setupType === "staff") {
    return "Staff names become reusable accountability dropdown options for Prepared By, Received By, Counted By, and Handled By fields.";
  }

  if (setupType === "manager") {
    return "Manager names become reusable accountability dropdown options for Ordered By, Approved By, Reviewed By, and Resolved By fields.";
  }

  if (setupType === "workflow") {
    return "Workflow Rules are used by inventory workflows, like Delivery Issues and stock action behavior.";
  }

  return "";
}

function getSetupPlaceholder(setupType) {
  if (setupType === "operating-area") return "Example: Branch/Station";
  if (setupType === "department") return "Example: Bar";
  if (setupType === "section") return "Example: Coffee";
  if (setupType === "unit") return "Example: kg";
  if (setupType === "staff") return "Example: Maria Santos";
  if (setupType === "manager") return "Example: Manager Ana";
  if (setupType === "workflow") return "Example: Damaged by rider";

  return "Type option name";
}

function getSetupPreviewText(setupType) {
  if (setupType === "operating-area") {
    return "This will become available in the Master List Operating Area dropdown.";
  }

  if (setupType === "department") {
    return "This will become available in the Master List Department dropdown.";
  }

  if (setupType === "section") {
    return "This will become available in the Master List Section dropdown.";
  }

  if (setupType === "unit") {
    return "This will become available in the Master List Unit dropdown.";
  }

  if (setupType === "staff") {
    return "This will become available in operational dropdowns like Prepared By, Received By, and Counted By.";
  }

  if (setupType === "manager") {
    return "This will become available in operational dropdowns like Ordered By, Approved By, Reviewed By, and Resolved By.";
  }

  if (setupType === "workflow") {
    return "This will become available in Delivery Issue resolution workflows.";
  }

  return "This option will be saved in the Setup Library.";
}

function getSetupIcon(setupType) {
  if (setupType === "operating-area") return "▧";
  if (setupType === "department") return "▦";
  if (setupType === "section") return "▩";
  if (setupType === "unit") return "◌";
  if (setupType === "staff") return "♙";
  if (setupType === "manager") return "♔";
  if (setupType === "workflow") return "⚠";

  return "⚙";
}

function getCollectionDisplayName(collectionKey) {
  if (collectionKey === "operatingAreas") return "Operating Areas";
  if (collectionKey === "departments") return "Departments";
  if (collectionKey === "sections") return "Sections";
  if (collectionKey === "units") return "Units";
  if (collectionKey === "staffNames") return "Staff Names";
  if (collectionKey === "managerNames") return "Manager Names";
  if (collectionKey === "deliveryIssueReasons") return "Workflow Rules";

  return "Setup Options";
}

function getCollectionRowLabel(collectionKey) {
  if (collectionKey === "operatingAreas") return "Operating Area Name";
  if (collectionKey === "departments") return "Department Name";
  if (collectionKey === "sections") return "Section Name";
  if (collectionKey === "units") return "Unit Name";
  if (collectionKey === "staffNames") return "Staff Name";
  if (collectionKey === "managerNames") return "Manager Name";
  if (collectionKey === "deliveryIssueReasons") return "Workflow Rule Name";

  return "Option Name";
}

function getCollectionUsedFor(collectionKey, item) {
  if (collectionKey === "operatingAreas") {
    return "Used for Master List item path";
  }

  if (collectionKey === "departments") {
    return "Available as a Master List dropdown option";
  }

  if (collectionKey === "sections") {
    return "Available as a Master List dropdown option";
  }

  if (collectionKey === "units") {
    return "Item measurement";
  }

  if (collectionKey === "staffNames") {
    return "Prepared By / Received By / Counted By";
  }

  if (collectionKey === "managerNames") {
    return "Ordered By / Approved By / Reviewed By";
  }

  if (collectionKey === "deliveryIssueReasons") {
    return item.stockAction || DMC_SETTINGS_STOCK_ACTIONS.NONE;
  }

  return "Reusable setup option";
}

function setupOptionExists(collection, name) {
  return collection.some(
    (item) => String(item.name || "").toLowerCase() === name.toLowerCase()
  );
}

function createBasicSettingOption(name) {
  return {
    id: slugifySetting(name),
    name,
    active: true
  };
}

function createWorkflowSettingOption(name, category, stockAction) {
  return {
    id: slugifySetting(name),
    name,
    category: category || "Custom",
    stockAction: stockAction || DMC_SETTINGS_STOCK_ACTIONS.NONE,
    active: true
  };
}

function addSetupOption(setupType) {
  const settings = getStoredSettings();
  const collectionKey = getSettingCollectionKey(setupType);

  if (!collectionKey) {
    return;
  }

  const nameInput = document.getElementById("setup-option-name");
  const categoryInput = document.getElementById("workflow-category");
  const stockActionInput = document.getElementById("workflow-stock-action");

  const name = nameInput?.value.trim();

  if (!name) {
    alert("Please enter a name first.");
    return;
  }

  if (setupOptionExists(settings[collectionKey], name)) {
    alert(`${getSetupLabel(setupType)} "${name}" already exists.`);
    return;
  }

  if (setupType === "workflow") {
    settings[collectionKey].push(
      createWorkflowSettingOption(
        name,
        categoryInput?.value.trim(),
        stockActionInput?.value
      )
    );
  } else {
    settings[collectionKey].push(createBasicSettingOption(name));
  }

  saveSettings(settings);
  refreshSettingsPage();
}

function editSetupOption(collectionKey, optionId) {
  const settings = getStoredSettings();
  const collection = settings[collectionKey] || [];
  const option = collection.find((item) => item.id === optionId);

  if (!option) {
    return;
  }

  const newName = prompt("Edit name:", option.name);

  if (!newName || !newName.trim()) {
    return;
  }

  option.name = newName.trim();

  if (collectionKey === "deliveryIssueReasons") {
    const newCategory = prompt("Edit category:", option.category || "Custom");

    if (newCategory && newCategory.trim()) {
      option.category = newCategory.trim();
    }

    const currentStockAction =
      option.stockAction || DMC_SETTINGS_STOCK_ACTIONS.NONE;

    const stockActionInput = prompt(
      `Edit Stock Action:\nType 1 for ${DMC_SETTINGS_STOCK_ACTIONS.NONE}\nType 2 for ${DMC_SETTINGS_STOCK_ACTIONS.ADD_BACK_TO_COMMISSARY}`,
      currentStockAction === DMC_SETTINGS_STOCK_ACTIONS.ADD_BACK_TO_COMMISSARY
        ? "2"
        : "1"
    );

    option.stockAction =
      stockActionInput === "2"
        ? DMC_SETTINGS_STOCK_ACTIONS.ADD_BACK_TO_COMMISSARY
        : DMC_SETTINGS_STOCK_ACTIONS.NONE;
  }

  saveSettings(settings);
  refreshSettingsPage();
}

function removeSetupOption(collectionKey, optionId) {
  const settings = getStoredSettings();
  const collection = settings[collectionKey] || [];
  const option = collection.find((item) => item.id === optionId);

  if (!option) {
    return;
  }

  const confirmed = confirm(`Remove "${option.name}"?`);

  if (!confirmed) {
    return;
  }

  settings[collectionKey] = collection.filter((item) => item.id !== optionId);

  saveSettings(settings);
  refreshSettingsPage();
}

function toggleSetupGroup(groupKey) {
  window.DMC_OPEN_SETUP_GROUPS[groupKey] = !window.DMC_OPEN_SETUP_GROUPS[
    groupKey
  ];

  refreshSettingsPage();
}

function renderSetupGroup(groupKey, title, description, options) {
  const isOpen = window.DMC_OPEN_SETUP_GROUPS[groupKey];
  const activeInside = options.some(
    (option) => option.type === window.DMC_SELECTED_SETUP_TYPE
  );

  return `
    <div class="settings-setup-group ${activeInside ? "active" : ""}">
      <button class="settings-setup-group-header" data-toggle-setup-group="${groupKey}">
        <span>
          <strong>${title}</strong>
          <small>${description}</small>
        </span>

        <span class="settings-setup-group-meta">
          ${activeInside ? `<i>Active</i>` : ""}
          <b>${isOpen ? "⌄" : "›"}</b>
        </span>
      </button>

      ${
        isOpen
          ? `
            <div class="settings-setup-option-list">
              ${options.map(renderSetupOptionButton).join("")}
            </div>
          `
          : ""
      }
    </div>
  `;
}

function renderSetupOptionButton(option) {
  const active = window.DMC_SELECTED_SETUP_TYPE === option.type;
  const disabled = option.disabled;

  return `
    <button
      class="settings-setup-option ${active ? "active" : ""} ${
    disabled ? "disabled" : ""
  }"
      data-select-setup-type="${option.type}"
      ${disabled ? "disabled" : ""}
    >
      <span class="settings-setup-option-icon">${option.icon}</span>

      <span>
        <strong>${option.label}</strong>
        <small>${option.description}</small>
      </span>

      ${active && !disabled ? `<b>›</b>` : ""}
    </button>
  `;
}

function renderSettingsCategories() {
  return `
    <section class="panel settings-category-shell">
      <div class="panel-header">
        <div>
          <h3>Settings Categories</h3>
          <p>
            Choose the setup category to manage. More categories can be added later.
          </p>
        </div>

        <span class="badge">Categories</span>
      </div>

      <div class="settings-category-grid">
        <button
          class="settings-category-card clickable-card ${
            window.DMC_SELECTED_SETTINGS_CATEGORY === "settings" ? "active" : ""
          }"
          data-settings-category="settings"
        >
          <div class="settings-category-icon">⚙</div>
          <div>
            <h4>Settings Category</h4>
            <p>
              Manage dropdown options used across Master List, Stock, Orders, and Reports.
            </p>
          </div>
          <span class="badge">Open</span>
        </button>

        <button
          class="settings-category-card disabled"
          type="button"
        >
          <div class="settings-category-icon">⌁</div>
          <div>
            <h4>Coming Soon Category</h4>
            <p>
              Future settings group for reports, audits, staff, or notifications.
            </p>
          </div>
          <span class="badge muted-badge">Soon</span>
        </button>
      </div>
    </section>
  `;
}

function renderSetupOptionsPanel() {
  return `
    <section class="panel settings-setup-options-panel">
      <div class="panel-header">
        <div>
          <h3>Setup Options</h3>
          <p>
            Choose a setup group first, then pick what kind of reusable option to add.
          </p>
        </div>

        <span class="badge">Step 1</span>
      </div>

      <div class="settings-setup-group-list">
        ${renderSetupGroup("systemMasterlist", "System Masterlist Setup", "Options used to build an item path in Master List.", [
          {
            type: "operating-area",
            icon: "▧",
            label: "Operating Area",
            description: "Reusable option such as Branch/Station or Commissary."
          },
          {
            type: "department",
            icon: "▦",
            label: "Department",
            description: "Reusable option such as Bar, Kitchen, or Dry Storage."
          },
          {
            type: "section",
            icon: "▩",
            label: "Section",
            description: "Reusable option such as Coffee, Dairy, Syrups, or Packaging."
          }
        ])}

        ${renderSetupGroup("itemSetup", "Item Setup", "Options attached directly to item records.", [
          {
            type: "unit",
            icon: "◌",
            label: "Unit",
            description: "Reusable item measurement such as kg, liter, bottle, or pcs."
          }
        ])}

        ${renderSetupGroup("operationalSetup", "Operational Setup", "People options used for accountability in inventory actions.", [
          {
            type: "staff",
            icon: "♙",
            label: "Staff",
            description: "Names of staff who prepare, receive, count, or handle items."
          },
          {
            type: "manager",
            icon: "♔",
            label: "Manager",
            description: "Names of managers who approve, order, resolve, or review items."
          }
        ])}

        ${renderSetupGroup("warehouseReturn", "Warehouse Return Setup", "Rules for returns, issues, suppliers, and future warehouse controls.", [
          {
            type: "workflow",
            icon: "⚠",
            label: "Workflow Rule",
            description: "Delivery issue reasons and stock-action rules."
          },
          {
            type: "purchasing",
            icon: "▤",
            label: "Purchasing Setup",
            description: "Suppliers, supplier items, and price history later.",
            disabled: true
          }
        ])}
      </div>
    </section>
  `;
}

function renderInputPanel() {
  const setupType = window.DMC_SELECTED_SETUP_TYPE;
  const label = getSetupLabel(setupType);
  const icon = getSetupIcon(setupType);

  if (setupType === "purchasing") {
    return `
      <section class="panel settings-input-panel">
        <div class="panel-header">
          <div>
            <h3>Purchasing Setup</h3>
            <p>
              Suppliers, supplier items, and price history will be added later
              after the inventory foundation is stable.
            </p>
          </div>

          <span class="badge muted-badge">Coming Soon</span>
        </div>

        <div class="settings-coming-soon-grid">
          <div class="settings-subsection-card">
            <h4>Suppliers</h4>
            <p>Future purchasing setup.</p>
          </div>

          <div class="settings-subsection-card">
            <h4>Supplier Items</h4>
            <p>Future purchasing setup.</p>
          </div>

          <div class="settings-subsection-card">
            <h4>Price History</h4>
            <p>Future purchasing setup.</p>
          </div>
        </div>
      </section>
    `;
  }

  return `
    <section class="panel settings-input-panel">
      <div class="panel-header">
        <div>
          <h3>${icon} Add ${label} Option</h3>
          <p>${getSetupDescription(setupType)}</p>
        </div>

        <span class="badge">Step 2</span>
      </div>

      ${
        setupType !== "unit" && setupType !== "workflow"
          ? `
            <div class="instruction-box">
              <strong>Dropdown Pool Rule:</strong>
              <span>
                Settings stores reusable dropdown options only. The actual item path is
                created later in Master List when an item is saved.
              </span>
            </div>
          `
          : ""
      }

      ${
        setupType === "staff" || setupType === "manager"
          ? `
            <div class="instruction-box">
              <strong>Access Later:</strong>
              <span>
                This is only for accountability dropdowns for now. Login access and permissions
                can be added later.
              </span>
            </div>
          `
          : ""
      }

      <form id="setup-option-form" class="form-grid settings-single-input-form">
        <label class="form-full">
          ${label} Name
          <input
            id="setup-option-name"
            type="text"
            placeholder="${getSetupPlaceholder(setupType)}"
            required
          />
        </label>

        ${
          setupType === "workflow"
            ? `
              <label>
                Category
                <input
                  id="workflow-category"
                  type="text"
                  placeholder="Example: Delivery Damage"
                />
              </label>

              <label>
                Stock Action
                <select id="workflow-stock-action">
                  <option value="${DMC_SETTINGS_STOCK_ACTIONS.NONE}">
                    ${DMC_SETTINGS_STOCK_ACTIONS.NONE}
                  </option>
                  <option value="${DMC_SETTINGS_STOCK_ACTIONS.ADD_BACK_TO_COMMISSARY}">
                    ${DMC_SETTINGS_STOCK_ACTIONS.ADD_BACK_TO_COMMISSARY}
                  </option>
                </select>
              </label>
            `
            : ""
        }

        <div class="settings-preview-box form-full">
          <strong>Preview Result:</strong>
          <span>${getSetupPreviewText(setupType)}</span>
        </div>

        <button class="primary-button form-full" type="submit">
          Add ${label} Option
        </button>
      </form>
    </section>
  `;
}

function getLibraryRows(collectionKey) {
  const settings = getStoredSettings();
  const searchValue = String(window.DMC_SETUP_LIBRARY_SEARCH || "")
    .toLowerCase()
    .trim();

  const rows = settings[collectionKey] || [];

  if (!searchValue) {
    return rows;
  }

  return rows.filter((item) => {
    return (
      String(item.name || "").toLowerCase().includes(searchValue) ||
      String(item.category || "").toLowerCase().includes(searchValue) ||
      String(item.stockAction || "").toLowerCase().includes(searchValue)
    );
  });
}

function renderSetupLibraryRows() {
  const collectionKey = window.DMC_SETUP_LIBRARY_VIEW;
  const rows = getLibraryRows(collectionKey);

  if (rows.length === 0) {
    return `
      <tr>
        <td colspan="4">No saved options found for this view.</td>
      </tr>
    `;
  }

  return rows
    .map(
      (item) => `
        <tr>
          <td>
            <strong>${item.name || "-"}</strong>
            ${
              item.category
                ? `<small class="table-subtext">${item.category}</small>`
                : ""
            }
          </td>
          <td>${getCollectionUsedFor(collectionKey, item)}</td>
          <td>
            <span class="badge ${item.active === false ? "muted-badge" : ""}">
              ${item.active === false ? "Inactive" : "Active"}
            </span>
          </td>
          <td>
            <div class="row-actions">
              <button
                class="tiny-button"
                data-edit-setup-option="${item.id}"
                data-setup-collection="${collectionKey}"
              >
                Edit
              </button>
              <button
                class="tiny-button danger"
                data-remove-setup-option="${item.id}"
                data-setup-collection="${collectionKey}"
              >
                Remove
              </button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderSetupLibrary() {
  const collectionKey = window.DMC_SETUP_LIBRARY_VIEW;

  return `
    <section class="panel settings-library-panel">
      <div class="panel-header">
        <div>
          <h3>Setup Library</h3>
          <p>
            Choose a setup list from the dropdown, then view or manage saved options
            in a focused table.
          </p>
        </div>

        <span class="badge">Saved Options</span>
      </div>

      <div class="filter-bar settings-library-toolbar">
        <label>
          View Saved Options
          <select id="setup-library-view">
            <option value="operatingAreas" ${
              collectionKey === "operatingAreas" ? "selected" : ""
            }>Operating Areas</option>
            <option value="departments" ${
              collectionKey === "departments" ? "selected" : ""
            }>Departments</option>
            <option value="sections" ${
              collectionKey === "sections" ? "selected" : ""
            }>Sections</option>
            <option value="units" ${
              collectionKey === "units" ? "selected" : ""
            }>Units</option>
            <option value="staffNames" ${
              collectionKey === "staffNames" ? "selected" : ""
            }>Staff Names</option>
            <option value="managerNames" ${
              collectionKey === "managerNames" ? "selected" : ""
            }>Manager Names</option>
            <option value="deliveryIssueReasons" ${
              collectionKey === "deliveryIssueReasons" ? "selected" : ""
            }>Workflow Rules</option>
          </select>
        </label>

        <label class="filter-search">
          Search Selected List
          <input
            id="setup-library-search"
            type="text"
            placeholder="Search setup option..."
            value="${window.DMC_SETUP_LIBRARY_SEARCH}"
          />
        </label>

        <button class="ghost-button" id="clear-setup-library-search">
          Clear Search
        </button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>${getCollectionRowLabel(collectionKey)}</th>
              <th>Used For</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${renderSetupLibraryRows()}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function getSettingsContent() {
  if (window.DMC_SELECTED_SETTINGS_CATEGORY !== "settings") {
    return `
      ${renderSettingsCategories()}

      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Coming Soon</h3>
            <p>
              This future category can be used later for Reports Setup,
              Audit Setup, Staff Setup, or Notifications.
            </p>
          </div>

          <span class="badge muted-badge">Future</span>
        </div>

        <div class="coming-soon">
          <div>
            <h3>No tools here yet</h3>
            <p>
              We can add another category here when the inventory foundation needs it.
            </p>
          </div>
        </div>
      </section>
    `;
  }

  return `
    ${renderSettingsCategories()}

    <section class="settings-foundation-layout">
      ${renderSetupOptionsPanel()}
      ${renderInputPanel()}
    </section>

    ${renderSetupLibrary()}
  `;
}

function refreshSettingsPage() {
  window.DMC_PAGES.settings.content = getSettingsContent();
  renderPage("settings");
}

function setupSettingsEvents() {
  document.querySelectorAll("[data-settings-category]").forEach((button) => {
    button.addEventListener("click", () => {
      window.DMC_SELECTED_SETTINGS_CATEGORY = button.dataset.settingsCategory;
      refreshSettingsPage();
    });
  });

  document.querySelectorAll("[data-toggle-setup-group]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleSetupGroup(button.dataset.toggleSetupGroup);
    });
  });

  document.querySelectorAll("[data-select-setup-type]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) {
        return;
      }

      window.DMC_SELECTED_SETUP_TYPE = button.dataset.selectSetupType;
      refreshSettingsPage();
    });
  });

  const setupForm = document.getElementById("setup-option-form");

  if (setupForm) {
    setupForm.addEventListener("submit", (event) => {
      event.preventDefault();
      addSetupOption(window.DMC_SELECTED_SETUP_TYPE);
    });
  }

  const libraryView = document.getElementById("setup-library-view");

  if (libraryView) {
    libraryView.addEventListener("change", () => {
      window.DMC_SETUP_LIBRARY_VIEW = libraryView.value;
      window.DMC_SETUP_LIBRARY_SEARCH = "";
      refreshSettingsPage();
    });
  }

  const librarySearch = document.getElementById("setup-library-search");

  if (librarySearch) {
    librarySearch.addEventListener("input", () => {
      window.DMC_SETUP_LIBRARY_SEARCH = librarySearch.value;
      refreshSettingsPage();
    });
  }

  const clearSearchButton = document.getElementById(
    "clear-setup-library-search"
  );

  if (clearSearchButton) {
    clearSearchButton.addEventListener("click", () => {
      window.DMC_SETUP_LIBRARY_SEARCH = "";
      refreshSettingsPage();
    });
  }

  document.querySelectorAll("[data-edit-setup-option]").forEach((button) => {
    button.addEventListener("click", () => {
      editSetupOption(
        button.dataset.setupCollection,
        button.dataset.editSetupOption
      );
    });
  });

  document.querySelectorAll("[data-remove-setup-option]").forEach((button) => {
    button.addEventListener("click", () => {
      removeSetupOption(
        button.dataset.setupCollection,
        button.dataset.removeSetupOption
      );
    });
  });
}

window.DMC_PAGES.settings = {
  eyebrow: "System",
  title: "Settings",
  description:
    "Manage setup categories and reusable dropdown options used across the inventory system.",
  getContent: getSettingsContent,
  content: getSettingsContent(),
  afterRender: setupSettingsEvents
};
