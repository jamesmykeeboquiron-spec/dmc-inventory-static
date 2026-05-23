window.DMC_PAGES = window.DMC_PAGES || {};

function getMasterListData() {
  return window.DMC_DATA?.masterList || {
    departments: [],
    items: []
  };
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

function getDepartmentIcon(departmentId) {
  const icons = {
    bar: "☕",
    kitchen: "🍳",
    dining: "🍽️",
    commissary: "📦"
  };

  return icons[departmentId] || "▥";
}

function renderBarMasterListRows() {
  const { items } = getMasterListData();
  const barItems = items.filter((item) => item.department === "BAR");

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

window.DMC_PAGES["master-list"] = {
  eyebrow: "Commissary",
  title: "Master List",
  description:
    "View inventory catalogs by department. Bar is being built first using the official Master List table format.",
  content: `
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
        <strong>${getMasterListData().departments.find((department) => department.id === "bar")?.sections.length || 0}</strong>
      </div>

      <div class="card">
        <p>Bar Items</p>
        <strong>${getMasterListData().items.filter((item) => item.department === "BAR").length}</strong>
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
            If this works, we will apply the same format to Kitchen, Dining, and Commissary.
          </p>
        </div>

        <button class="ghost-button">Official Format</button>
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
  `
};
