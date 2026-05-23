window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_SETTINGS_STORAGE_KEY = "dmc_inventory_settings";

function getDefaultSettings() {
  return window.DMC_DATA?.settings || {
    operatingAreas: [],
    departments: [],
    sections: []
  };
}

function getStoredSettings() {
  const storedSettings = localStorage.getItem(DMC_SETTINGS_STORAGE_KEY);

  if (!storedSettings) {
    return getDefaultSettings();
  }

  try {
    return JSON.parse(storedSettings);
  } catch {
    return getDefaultSettings();
  }
}

function saveSettings(settings) {
  localStorage.setItem(DMC_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

function slugifySetting(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function renderOperatingAreaRows(settings) {
  return settings.operatingAreas
    .map(
      (area) => `
        <tr>
          <td>${area.name}</td>
          <td>${area.id}</td>
          <td><span class="badge">Active</span></td>
        </tr>
      `
    )
    .join("");
}

function renderDepartmentRows(settings) {
  return settings.departments
    .map((department) => {
      const area = settings.operatingAreas.find(
        (item) => item.id === department.operatingAreaId
      );

      return `
        <tr>
          <td>${department.name}</td>
          <td>${area?.name || "-"}</td>
          <td>${department.id}</td>
          <td><span class="badge">Active</span></td>
        </tr>
      `;
    })
    .join("");
}

function renderSectionRows(settings) {
  return settings.sections
    .map((section) => {
      const department = settings.departments.find(
        (item) => item.id === section.departmentId
      );

      return `
        <tr>
          <td>${section.name}</td>
          <td>${department?.name || "-"}</td>
          <td>${section.id}</td>
          <td><span class="badge">Active</span></td>
        </tr>
      `;
    })
    .join("");
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

function getSettingsContent() {
  const settings = getStoredSettings();

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
        <p>Storage</p>
        <strong>Local</strong>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Settings Dashboard</h3>
          <p>
            Manage the dropdown choices and setup lists that will power the
            inventory forms. For now, System Setup is active and saves locally
            in this browser.
          </p>
        </div>

        <button class="ghost-button">Prototype Settings</button>
      </div>

      <div class="settings-category-grid">
        <article class="settings-category-card active">
          <div class="settings-category-icon">⚙</div>
          <div>
            <h4>System Setup</h4>
            <p>Operating Areas, Departments, Sections, Units, and Item Categories.</p>
          </div>
          <span class="badge">Active</span>
        </article>

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

    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>System Setup</h3>
          <p>
            These values will become dropdown options in the Master List Add Item
            form. The relationship is Operating Area → Department → Section.
          </p>
        </div>

        <button class="ghost-button">Dropdown Source</button>
      </div>

      <div class="settings-subsection-grid">
        <article class="settings-subsection-card active">
          <h4>Operating Areas</h4>
          <p>Top-level inventory area such as Branch/Station or Commissary.</p>
        </article>

        <article class="settings-subsection-card active">
          <h4>Departments</h4>
          <p>Departments such as Bar, Kitchen, Dining, and Commissary.</p>
        </article>

        <article class="settings-subsection-card active">
          <h4>Sections</h4>
          <p>Groups under each department, such as Coffee, Milk, or Cups & Lids.</p>
        </article>

        <article class="settings-subsection-card disabled">
          <h4>Units</h4>
          <p>Coming later: kg, liters, pcs, pack, case, box, and more.</p>
        </article>

        <article class="settings-subsection-card disabled">
          <h4>Item Categories</h4>
          <p>Coming later: Ingredient, Packaging, Cleaning, Supply, and more.</p>
        </article>
      </div>
    </section>

    <section class="settings-grid">
      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>Operating Areas</h3>
            <p>The top-level area where inventory belongs.</p>
          </div>
        </div>

        <form id="add-operating-area-form" class="mini-form">
          <input id="operating-area-name" type="text" placeholder="Example: Branch/Station" required />
          <button class="primary-button" type="submit">Add</button>
        </form>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>ID</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${renderOperatingAreaRows(settings)}
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <div>
            <h3>Departments</h3>
            <p>Departments belong under an operating area.</p>
          </div>
        </div>

        <form id="add-department-form" class="mini-form stacked">
          <select id="department-operating-area" required>
            ${renderOperatingAreaOptions(settings)}
          </select>
          <input id="department-name" type="text" placeholder="Example: Bar" required />
          <button class="primary-button" type="submit">Add</button>
        </form>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Operating Area</th>
                <th>ID</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${renderDepartmentRows(settings)}
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel settings-wide">
        <div class="panel-header">
          <div>
            <h3>Sections</h3>
            <p>Sections belong under a department and will organize item lists.</p>
          </div>
        </div>

        <form id="add-section-form" class="mini-form stacked">
          <select id="section-department" required>
            ${renderDepartmentOptions(settings)}
          </select>
          <input id="section-name" type="text" placeholder="Example: Coffee" required />
          <button class="primary-button" type="submit">Add</button>
        </form>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>ID</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${renderSectionRows(settings)}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}

function setupSettingsEvents() {
  const operatingAreaForm = document.getElementById("add-operating-area-form");
  const departmentForm = document.getElementById("add-department-form");
  const sectionForm = document.getElementById("add-section-form");

  if (operatingAreaForm) {
    operatingAreaForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const settings = getStoredSettings();
      const nameInput = document.getElementById("operating-area-name");
      const name = nameInput.value.trim();

      if (!name) {
        return;
      }

      settings.operatingAreas.push({
        id: slugifySetting(name),
        name
      });

      saveSettings(settings);
      window.DMC_PAGES.settings.content = getSettingsContent();
      renderPage("settings");
    });
  }

  if (departmentForm) {
    departmentForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const settings = getStoredSettings();
      const areaId = document.getElementById("department-operating-area").value;
      const nameInput = document.getElementById("department-name");
      const name = nameInput.value.trim();

      if (!name) {
        return;
      }

      settings.departments.push({
        id: slugifySetting(name),
        name,
        operatingAreaId: areaId
      });

      saveSettings(settings);
      window.DMC_PAGES.settings.content = getSettingsContent();
      renderPage("settings");
    });
  }

  if (sectionForm) {
    sectionForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const settings = getStoredSettings();
      const departmentId = document.getElementById("section-department").value;
      const nameInput = document.getElementById("section-name");
      const name = nameInput.value.trim();

      if (!name) {
        return;
      }

      settings.sections.push({
        id: `${departmentId}-${slugifySetting(name)}`,
        name,
        departmentId
      });

      saveSettings(settings);
      window.DMC_PAGES.settings.content = getSettingsContent();
      renderPage("settings");
    });
  }
}

window.DMC_PAGES.settings = {
  eyebrow: "System",
  title: "Settings",
  description:
    "Manage dropdown options for Operating Areas, Departments, and Sections.",
  content: getSettingsContent(),
  afterRender: setupSettingsEvents
};
