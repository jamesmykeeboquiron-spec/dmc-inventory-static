window.DMC_PAGES = window.DMC_PAGES || {};

function renderMasterListRows() {
  const items = window.DMC_DATA?.masterList || [];

  return items
    .map(
      (item) => `
        <tr>
          <td>${item.code}</td>
          <td>${item.name}</td>
          <td>${item.category}</td>
          <td>${item.unit}</td>
          <td>${item.parLevel}</td>
          <td>${item.storageArea}</td>
          <td><span class="badge">${item.status}</span></td>
        </tr>
      `
    )
    .join("");
}

window.DMC_PAGES["master-list"] = {
  eyebrow: "Commissary",
  title: "Master List",
  description:
    "The main item catalog for ingredients, packaging, cleaning supplies, and other inventory items.",
  content: `
    <section class="grid">
      <div class="card">
        <p>Total Items</p>
        <strong>${window.DMC_DATA?.masterList?.length || 0}</strong>
      </div>

      <div class="card">
        <p>Ingredients</p>
        <strong>${
          window.DMC_DATA?.masterList?.filter(
            (item) => item.category === "Ingredient"
          ).length || 0
        }</strong>
      </div>

      <div class="card">
        <p>Packaging</p>
        <strong>${
          window.DMC_DATA?.masterList?.filter(
            (item) => item.category === "Packaging"
          ).length || 0
        }</strong>
      </div>

      <div class="card">
        <p>Cleaning / Other</p>
        <strong>${
          window.DMC_DATA?.masterList?.filter(
            (item) => item.category === "Cleaning" || item.category === "Other"
          ).length || 0
        }</strong>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Inventory Item Catalog</h3>
          <p>
            This is the foundation list used by commissary stock, branch stock,
            orders, deliveries, and ledger records.
          </p>
        </div>

        <button class="ghost-button">Static Prototype</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Item Code</th>
              <th>Item Name</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Par Level</th>
              <th>Storage Area</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${renderMasterListRows()}
          </tbody>
        </table>
      </div>
    </section>
  `
};
