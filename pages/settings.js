window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_SETTINGS_STORAGE_KEY = "dmc_inventory_settings";
const DMC_SETTINGS_REASON_SYNC_KEY = "dmc_delivery_issue_reason_settings";

const DMC_SETTINGS_STOCK_ACTIONS = {
  NONE: "No Stock Movement",
  ADD_BACK_TO_COMMISSARY: "Add Back to Commissary Stock"
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
    deliveryIssueReasons: getDefaultDeliveryIssueReasons()
  };
}

function normalizeSettings(settings) {
  return {
    operatingAreas: settings.operatingAreas || [],
    departments: settings.departments || [],
    sections: settings.sections || [],
    units: settings.units || [],
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
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getAreaName(settings, areaId) {
  return settings.operatingAreas.find((area) => area.id === areaId)?.name || "-";
}

function getDepartmentName(settings, departmentId) {
  return (
    settings.departments.find((department) => department.id === departmentId)
      ?.name || "-"
  );
}

function renderOperatingAreaOptions(settings) {
  return settings.operatingAreas
    .map((area) => `<option value="${area.id}">${area.name}</option>`)
    .join("");
}

function renderDepartmentOptions(settings) {
  return settings.departments
    .map(
      (department) =>
        `<option value="${department.id}">${department.name}</option>`
    )
    .join("");
}

function renderDeliveryReasonStockActionOptions(currentAction) {
  return `
    <option value="${DMC_SETTINGS_STOCK_ACTIONS.NONE}" ${
    currentAction === DMC_SETTINGS_STOCK_ACTIONS.NONE ? "selected" : ""
  }>
      ${DMC_SETTINGS_STOCK_ACTIONS.NONE}
    </option>

    <option value="${DMC_SETTINGS_STOCK_ACTIONS.ADD_BACK_TO_COMMISSARY}" ${
    currentAction === DMC_SETTINGS_STOCK_ACTIONS.ADD_BACK_TO_COMMISSARY
      ? "selected"
      : ""
  }>
      ${DMC_SETTINGS_STOCK_ACTIONS.ADD_BACK_TO_COMMISSARY}
    </option>
  `;
}

function renderOperatingAreaRows(settings) {
  if (settings.operatingAreas.length === 0) {
    return `<tr><td colspan="4">No operating areas yet.</td></tr>`;
  }

  return settings.operatingAreas
    .map(
      (area) => `
        <tr>
          <td>${area.name}</td>
          <td>${area.id}</td>
          <td><span class="badge">Active</span></td>
          <td>
            <div class="row-actions">
              <button class="tiny-button" data-edit-area="${area.id}">Edit</button>
              <button class="tiny-button danger" data-remove-area="${area.id}">Remove</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderDepartmentRows(settings) {
  if (settings.departments.length === 0) {
    return `<tr><td colspan="5">No departments yet.</td></tr>`;
  }

  return settings.departments
    .map(
      (department) => `
        <tr>
          <td>${department.name}</td>
          <td>${getAreaName(settings, department.operatingAreaId)}</td>
          <td>${department.id}</td>
          <td><span class="badge">Active</span></td>
          <td>
            <div class="row-actions">
              <button class="tiny-button" data-edit-department="${department.id}">Edit</button>
              <button class="tiny-button danger" data-remove-department="${department.id}">Remove</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderSectionRows(settings) {
  if (settings.sections.length === 0) {
    return `<tr><td colspan="5">No sections yet.</td></tr>`;
  }

  return settings.sections
    .map(
      (section) => `
        <tr>
          <td>${section.name}</td>
          <td>${getDepartmentName(settings, section.departmentId)}</td>
          <td>${section.id}</td>
          <td><span class="badge">Active</span></td>
          <td>
            <div class="row-actions">
              <button class="tiny-button" data-edit-section="${section.id}">Edit</button>
              <button class="tiny-button danger" data-remove-section="${section.id}">Remove</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderUnitRows(settings) {
  if (settings.units.length === 0) {
    return `<tr><td colspan="4">No units yet.</td></tr>`;
  }

  return settings.units
    .map(
      (unit) => `
        <tr>
          <td>${unit.name}</td>
          <td>${unit.id}</td>
          <td><span class="badge">Active</span></td>
          <td>
            <div class="row-actions">
              <button class="tiny-button" data-edit-unit="${unit.id}">Edit</button>
              <button class="tiny-button danger" data-remove-unit="${unit.id}">Remove</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderDeliveryIssueReasonRows(settings) {
  if (settings.deliveryIssueReasons.length === 0) {
    return `<tr><td colspan="6">No delivery issue reasons yet.</td></tr>`;
  }

  return settings.deliveryIssueReasons
    .map(
      (reason) => `
        <tr>
          <td>${reason.name}</td>
          <td>${reason.category || "-"}</td>
          <td>${reason.stockAction || DMC_SETTINGS_STOCK_ACTIONS.NONE}</td>
          <td>
            <span class="badge ${
              reason.stockAction === DMC_SETTINGS_STOCK_ACTIONS.ADD_BACK_TO_COMMISSARY
                ? "info-badge"
                : "muted-badge"
            }">
              ${
                reason.stockAction === DMC_SETTINGS_STOCK_ACTIONS.ADD_BACK_TO_COMMISSARY
                  ? "Can affect stock"
                  : "Record only"
              }
            </span>
          </td>
          <td>
            <span class="badge ${reason.active !== false ? "" : "muted-badge"}">
              ${reason.active !== false ? "Active" : "Inactive"}
            </span>
          </td>
          <td>
            <div class="row-actions">
              <button class="tiny-button" data-edit-delivery-reason="${reason.id}">Edit</button>
              <button class="tiny-button" data-toggle-delivery-reason="${reason.id}">
                ${reason.active !== false ? "Disable" : "Enable"}
              </button>
              <button class="tiny-button danger" data-remove-delivery-reason="${reason.id}">Remove</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");
}

function getSystemSetupManagerContent(activeManager) {
  const settings = getStoredSettings();

  if (activeManager === "operating-areas") {
    return `
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Manage Operating Areas</h3>
            <p>Operating Areas are the top-level dropdown options, such as Branch/Station or Commissary.</p>
          </div>
        </div>

        <form id="add-operating-area-form" class="mini-form">
          <input id="operating-area-name" type="text" placeholder="Example: Branch/Station" required />
          <button class="primary-button" type="submit">Add Area</button>
        </form>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>ID</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${renderOperatingAreaRows(settings)}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  if (activeManager === "departments") {
    return `
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Manage Departments</h3>
            <p>Departments belong under an Operating Area. Example: Bar under Branch/Station.</p>
          </div>
        </div>

        <form id="add-department-form" class="mini-form stacked">
          <select id="department-operating-area" required>
            ${renderOperatingAreaOptions(settings)}
          </select>
          <input id="department-name" type="text" placeholder="Example: Bar" required />
          <button class="primary-button" type="submit">Add Department</button>
        </form>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Operating Area</th>
                <th>ID</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${renderDepartmentRows(settings)}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  if (activeManager === "sections") {
    return `
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Manage Sections</h3>
            <p>Sections belong under a Department. Example: Coffee under Bar.</p>
          </div>
        </div>

        <form id="add-section-form" class="mini-form stacked">
          <select id="section-department" required>
            ${renderDepartmentOptions(settings)}
          </select>
          <input id="section-name" type="text" placeholder="Example: Coffee" required />
          <button class="primary-button" type="submit">Add Section</button>
        </form>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>ID</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${renderSectionRows(settings)}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  if (activeManager === "units") {
    return `
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Manage Units</h3>
            <p>Units will be used in the Master List item form. Examples: kg, liters, pcs, pack, box, case, bag, bottle.</p>
          </div>
        </div>

        <form id="add-unit-form" class="mini-form">
          <input id="unit-name" type="text" placeholder="Example: gallon" required />
          <button class="primary-button" type="submit">Add Unit</button>
        </form>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>ID</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${renderUnitRows(settings)}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  if (activeManager === "delivery-issue-reasons") {
    return `
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Manage Delivery Issue Reasons</h3>
            <p>
              These reasons will be used when resolving Delivery Issues. Only
              “Add Back to Commissary Stock” affects stock. All other reasons are record-only.
            </p>
          </div>

          <button class="ghost-button" id="reset-delivery-issue-reasons">
            Reset Defaults
          </button>
        </div>

        <div class="instruction-box">
          <strong>Stock Safety Rule:</strong>
          <span>
            Waste, missing items, driver issues, damage, spoilage, and input errors should normally use
            “No Stock Movement.” Only recovered usable items should use “Add Back to Commissary Stock.”
          </span>
        </div>

        <form id="add-delivery-issue-reason-form" class="mini-form stacked">
          <input
            id="delivery-reason-name"
            type="text"
            placeholder="Example: Damaged by rider"
            required
          />

          <input
            id="delivery-reason-category"
            type="text"
            placeholder="Example: Delivery Damage"
            required
          />

          <select id="delivery-reason-stock-action" required>
            ${renderDeliveryReasonStockActionOptions(
              DMC_SETTINGS_STOCK_ACTIONS.NONE
            )}
          </select>

          <button class="primary-button" type="submit">Add Reason</button>
        </form>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Reason</th>
                <th>Category</th>
                <th>Stock Action</th>
                <th>Behavior</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${renderDeliveryIssueReasonRows(settings)}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  return "";
}

function getSettingsContent() {
  const settings = getStoredSettings();
  const activeManager = window.DMC_ACTIVE_SETTINGS_MANAGER || "operating-areas";
  const systemOpen = window.DMC_SYSTEM_SETUP_OPEN !== false;

  const activeDeliveryReasons = settings.deliveryIssueReasons.filter(
    (reason) => reason.active !== false
  ).length;

  return `
    <section class="grid">
      <div class="card">
        <p>Operating Areas</p>
        <strong>${settings.operatingAreas.length}</strong>
      </div>

      <div class="card">
        <p>Departments</p>
        <strong>${settings.departments.length}</strong>
      </div>

      <div class="card">
        <p>Sections</p>
        <strong>${settings.sections.length}</strong>
      </div>

      <div class="card">
        <p>Units</p>
        <strong>${settings.units.length}</strong>
      </div>

      <div class="card">
        <p>Delivery Reasons</p>
        <strong>${activeDeliveryReasons}</strong>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Settings Dashboard</h3>
          <p>
            Manage dropdown choices and setup lists. System Setup now includes Delivery Issue Reasons.
          </p>
        </div>
        <button class="ghost-button">Prototype Settings</button>
      </div>

      <div class="settings-category-grid">
        <button class="settings-category-card active clickable-card" id="toggle-system-setup">
          <div class="settings-category-icon">⚙</div>
          <div>
            <h4>System Setup</h4>
            <p>Operating Areas, Departments, Sections, Units, and Delivery Issue Reasons.</p>
          </div>
          <span class="badge">${systemOpen ? "Open" : "Closed"}</span>
        </button>

        <article class="settings-category-card">
          <div class="settings-category-icon">▧</div>
          <div>
            <h4>Inventory Setup</h4>
            <p>Locations, Movement Types, Stock Statuses, and Order Statuses.</p>
          </div>
          <span class="badge muted-badge">Soon</span>
        </article>

        <article class="settings-category-card">
          <div class="settings-category-icon">♟</div>
          <div>
            <h4>Admin Setup</h4>
            <p>Staff Roles, Access Levels, and Permissions.</p>
          </div>
          <span class="badge muted-badge">Soon</span>
        </article>

        <article class="settings-category-card">
          <div class="settings-category-icon">⌁</div>
          <div>
            <h4>Future Setup</h4>
            <p>Suppliers, Audit Rules, Report Settings, and future controls.</p>
          </div>
          <span class="badge muted-badge">Soon</span>
        </article>
      </div>
    </section>

    ${
      systemOpen
        ? `
          <section class="panel">
            <div class="panel-header">
              <div>
                <h3>System Setup Dropdown Manager</h3>
                <p>
                  Choose what you want to manage. These options will feed dropdowns and workflow controls.
                </p>
              </div>
            </div>

            <div class="settings-manager-tabs">
              <button class="manager-tab ${activeManager === "operating-areas" ? "active" : ""}" data-settings-manager="operating-areas">
                Operating Areas
              </button>
              <button class="manager-tab ${activeManager === "departments" ? "active" : ""}" data-settings-manager="departments">
                Departments
              </button>
              <button class="manager-tab ${activeManager === "sections" ? "active" : ""}" data-settings-manager="sections">
                Sections
              </button>
              <button class="manager-tab ${activeManager === "units" ? "active" : ""}" data-settings-manager="units">
                Units
              </button>
              <button class="manager-tab ${activeManager === "delivery-issue-reasons" ? "active" : ""}" data-settings-manager="delivery-issue-reasons">
                Delivery Issue Reasons
              </button>
              <button class="manager-tab disabled" type="button">
                Item Categories Soon
              </button>
            </div>
          </section>

          ${getSystemSetupManagerContent(activeManager)}
        `
        : ""
    }
  `;
}

function refreshSettingsPage() {
  window.DMC_PAGES.settings.content = getSettingsContent();
  renderPage("settings");
}

function setupSettingsEvents() {
  const toggleSystemSetup = document.getElementById("toggle-system-setup");

  if (toggleSystemSetup) {
    toggleSystemSetup.addEventListener("click", () => {
      window.DMC_SYSTEM_SETUP_OPEN = window.DMC_SYSTEM_SETUP_OPEN === false;
      refreshSettingsPage();
    });
  }

  document.querySelectorAll("[data-settings-manager]").forEach((button) => {
    button.addEventListener("click", () => {
      window.DMC_ACTIVE_SETTINGS_MANAGER = button.dataset.settingsManager;
      refreshSettingsPage();
    });
  });

  setupOperatingAreaEvents();
  setupDepartmentEvents();
  setupSectionEvents();
  setupUnitEvents();
  setupDeliveryIssueReasonEvents();
}

function setupOperatingAreaEvents() {
  const form = document.getElementById("add-operating-area-form");

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const settings = getStoredSettings();
      const name = document.getElementById("operating-area-name").value.trim();

      if (!name) return;

      settings.operatingAreas.push({
        id: slugifySetting(name),
        name
      });

      saveSettings(settings);
      refreshSettingsPage();
    });
  }

  document.querySelectorAll("[data-edit-area]").forEach((button) => {
    button.addEventListener("click", () => {
      const settings = getStoredSettings();
      const area = settings.operatingAreas.find(
        (item) => item.id === button.dataset.editArea
      );

      if (!area) return;

      const newName = prompt("Edit Operating Area name:", area.name);

      if (!newName || !newName.trim()) return;

      area.name = newName.trim();

      saveSettings(settings);
      refreshSettingsPage();
    });
  });

  document.querySelectorAll("[data-remove-area]").forEach((button) => {
    button.addEventListener("click", () => {
      const settings = getStoredSettings();
      const areaId = button.dataset.removeArea;

      const confirmed = confirm(
        "Remove this Operating Area? Departments and Sections under it will also be removed in this prototype."
      );

      if (!confirmed) return;

      const departmentIdsToRemove = settings.departments
        .filter((department) => department.operatingAreaId === areaId)
        .map((department) => department.id);

      settings.operatingAreas = settings.operatingAreas.filter(
        (area) => area.id !== areaId
      );

      settings.departments = settings.departments.filter(
        (department) => department.operatingAreaId !== areaId
      );

      settings.sections = settings.sections.filter(
        (section) => !departmentIdsToRemove.includes(section.departmentId)
      );

      saveSettings(settings);
      refreshSettingsPage();
    });
  });
}

function setupDepartmentEvents() {
  const form = document.getElementById("add-department-form");

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const settings = getStoredSettings();
      const name = document.getElementById("department-name").value.trim();
      const operatingAreaId = document.getElementById(
        "department-operating-area"
      ).value;

      if (!name) return;

      settings.departments.push({
        id: slugifySetting(name),
        name,
        operatingAreaId
      });

      saveSettings(settings);
      refreshSettingsPage();
    });
  }

  document.querySelectorAll("[data-edit-department]").forEach((button) => {
    button.addEventListener("click", () => {
      const settings = getStoredSettings();
      const department = settings.departments.find(
        (item) => item.id === button.dataset.editDepartment
      );

      if (!department) return;

      const newName = prompt("Edit Department name:", department.name);

      if (!newName || !newName.trim()) return;

      department.name = newName.trim();

      saveSettings(settings);
      refreshSettingsPage();
    });
  });

  document.querySelectorAll("[data-remove-department]").forEach((button) => {
    button.addEventListener("click", () => {
      const settings = getStoredSettings();
      const departmentId = button.dataset.removeDepartment;

      const confirmed = confirm(
        "Remove this Department? Sections under it will also be removed in this prototype."
      );

      if (!confirmed) return;

      settings.departments = settings.departments.filter(
        (department) => department.id !== departmentId
      );

      settings.sections = settings.sections.filter(
        (section) => section.departmentId !== departmentId
      );

      saveSettings(settings);
      refreshSettingsPage();
    });
  });
}

function setupSectionEvents() {
  const form = document.getElementById("add-section-form");

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const settings = getStoredSettings();
      const name = document.getElementById("section-name").value.trim();
      const departmentId = document.getElementById("section-department").value;

      if (!name) return;

      settings.sections.push({
        id: `${departmentId}-${slugifySetting(name)}`,
        name,
        departmentId
      });

      saveSettings(settings);
      refreshSettingsPage();
    });
  }

  document.querySelectorAll("[data-edit-section]").forEach((button) => {
    button.addEventListener("click", () => {
      const settings = getStoredSettings();
      const section = settings.sections.find(
        (item) => item.id === button.dataset.editSection
      );

      if (!section) return;

      const newName = prompt("Edit Section name:", section.name);

      if (!newName || !newName.trim()) return;

      section.name = newName.trim();

      saveSettings(settings);
      refreshSettingsPage();
    });
  });

  document.querySelectorAll("[data-remove-section]").forEach((button) => {
    button.addEventListener("click", () => {
      const settings = getStoredSettings();
      const sectionId = button.dataset.removeSection;

      const confirmed = confirm("Remove this Section?");

      if (!confirmed) return;

      settings.sections = settings.sections.filter(
        (section) => section.id !== sectionId
      );

      saveSettings(settings);
      refreshSettingsPage();
    });
  });
}

function setupUnitEvents() {
  const form = document.getElementById("add-unit-form");

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const settings = getStoredSettings();
      const name = document.getElementById("unit-name").value.trim();

      if (!name) return;

      settings.units.push({
        id: slugifySetting(name),
        name
      });

      saveSettings(settings);
      refreshSettingsPage();
    });
  }

  document.querySelectorAll("[data-edit-unit]").forEach((button) => {
    button.addEventListener("click", () => {
      const settings = getStoredSettings();
      const unit = settings.units.find(
        (item) => item.id === button.dataset.editUnit
      );

      if (!unit) return;

      const newName = prompt("Edit Unit name:", unit.name);

      if (!newName || !newName.trim()) return;

      unit.name = newName.trim();

      saveSettings(settings);
      refreshSettingsPage();
    });
  });

  document.querySelectorAll("[data-remove-unit]").forEach((button) => {
    button.addEventListener("click", () => {
      const settings = getStoredSettings();
      const unitId = button.dataset.removeUnit;

      const confirmed = confirm("Remove this Unit?");

      if (!confirmed) return;

      settings.units = settings.units.filter((unit) => unit.id !== unitId);

      saveSettings(settings);
      refreshSettingsPage();
    });
  });
}

function setupDeliveryIssueReasonEvents() {
  const form = document.getElementById("add-delivery-issue-reason-form");

  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const settings = getStoredSettings();
      const name = document.getElementById("delivery-reason-name").value.trim();
      const category = document
        .getElementById("delivery-reason-category")
        .value.trim();
      const stockAction = document.getElementById(
        "delivery-reason-stock-action"
      ).value;

      if (!name) return;

      const newReasonId = slugifySetting(name);

      const alreadyExists = settings.deliveryIssueReasons.some(
        (reason) =>
          reason.id === newReasonId ||
          String(reason.name || "").toLowerCase() === name.toLowerCase()
      );

      if (alreadyExists) {
        alert("That delivery issue reason already exists.");
        return;
      }

      settings.deliveryIssueReasons.push({
        id: newReasonId,
        name,
        category: category || "Custom",
        stockAction: stockAction || DMC_SETTINGS_STOCK_ACTIONS.NONE,
        active: true
      });

      saveSettings(settings);
      refreshSettingsPage();
    });
  }

  const resetButton = document.getElementById("reset-delivery-issue-reasons");

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      const confirmed = confirm("Reset Delivery Issue Reasons to defaults?");

      if (!confirmed) return;

      const settings = getStoredSettings();
      settings.deliveryIssueReasons = getDefaultDeliveryIssueReasons();

      saveSettings(settings);
      refreshSettingsPage();
    });
  }

  document.querySelectorAll("[data-edit-delivery-reason]").forEach((button) => {
    button.addEventListener("click", () => {
      const settings = getStoredSettings();
      const reason = settings.deliveryIssueReasons.find(
        (item) => item.id === button.dataset.editDeliveryReason
      );

      if (!reason) return;

      const newName = prompt("Edit Reason name:", reason.name);

      if (!newName || !newName.trim()) return;

      const newCategory = prompt(
        "Edit Category:",
        reason.category || "Custom"
      );

      if (!newCategory || !newCategory.trim()) return;

      const currentStockAction =
        reason.stockAction || DMC_SETTINGS_STOCK_ACTIONS.NONE;

      const stockActionInput = prompt(
        `Edit Stock Action:\nType 1 for ${DMC_SETTINGS_STOCK_ACTIONS.NONE}\nType 2 for ${DMC_SETTINGS_STOCK_ACTIONS.ADD_BACK_TO_COMMISSARY}`,
        currentStockAction === DMC_SETTINGS_STOCK_ACTIONS.ADD_BACK_TO_COMMISSARY
          ? "2"
          : "1"
      );

      const newStockAction =
        stockActionInput === "2"
          ? DMC_SETTINGS_STOCK_ACTIONS.ADD_BACK_TO_COMMISSARY
          : DMC_SETTINGS_STOCK_ACTIONS.NONE;

      reason.name = newName.trim();
      reason.category = newCategory.trim();
      reason.stockAction = newStockAction;

      saveSettings(settings);
      refreshSettingsPage();
    });
  });

  document.querySelectorAll("[data-toggle-delivery-reason]").forEach((button) => {
    button.addEventListener("click", () => {
      const settings = getStoredSettings();
      const reason = settings.deliveryIssueReasons.find(
        (item) => item.id === button.dataset.toggleDeliveryReason
      );

      if (!reason) return;

      reason.active = reason.active === false;

      saveSettings(settings);
      refreshSettingsPage();
    });
  });

  document.querySelectorAll("[data-remove-delivery-reason]").forEach((button) => {
    button.addEventListener("click", () => {
      const settings = getStoredSettings();
      const reasonId = button.dataset.removeDeliveryReason;

      const confirmed = confirm("Remove this Delivery Issue Reason?");

      if (!confirmed) return;

      settings.deliveryIssueReasons = settings.deliveryIssueReasons.filter(
        (reason) => reason.id !== reasonId
      );

      saveSettings(settings);
      refreshSettingsPage();
    });
  });
}

window.DMC_PAGES.settings = {
  eyebrow: "System",
  title: "Settings",
  description:
    "Manage system setup options like operating areas, departments, sections, units, and delivery issue reasons.",
  getContent: getSettingsContent,
  content: getSettingsContent(),
  afterRender: setupSettingsEvents
};
