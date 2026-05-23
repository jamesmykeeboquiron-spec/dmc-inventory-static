window.DMC_PAGES = window.DMC_PAGES || {};

window.DMC_PAGES["master-list"] = {
  eyebrow: "Commissary",
  title: "Master List",
  description:
    "View inventory catalogs by department. Each department will later contain its own item sections and item list.",
  content: `
    <section class="grid">
      <div class="card">
        <p>Department Catalogs</p>
        <strong>4</strong>
      </div>

      <div class="card">
        <p>Current View</p>
        <strong>Catalog</strong>
      </div>

      <div class="card">
        <p>Item Details</p>
        <strong>Later</strong>
      </div>

      <div class="card">
        <p>Status</p>
        <strong>Draft</strong>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Inventory Catalog by Department</h3>
          <p>
            Select a department catalog first. Later, each department will have
            item sections such as ingredients, packaging, cleaning supplies,
            service supplies, and other operating items.
          </p>
        </div>

        <button class="ghost-button">Master List Structure</button>
      </div>

      <div class="department-catalog-grid">
        <article class="department-card">
          <div class="department-icon">☕</div>
          <div>
            <h4>Bar Inventory Catalog</h4>
            <p>
              Coffee, milk, syrups, cups, lids, straws, bar tools, and other
              beverage station supplies.
            </p>
          </div>
          <span class="badge">Bar</span>
        </article>

        <article class="department-card">
          <div class="department-icon">🍳</div>
          <div>
            <h4>Kitchen Inventory Catalog</h4>
            <p>
              Proteins, dry goods, produce, sauces, condiments, kitchen
              packaging, and kitchen operating supplies.
            </p>
          </div>
          <span class="badge">Kitchen</span>
        </article>

        <article class="department-card">
          <div class="department-icon">🍽️</div>
          <div>
            <h4>Dining Inventory Catalog</h4>
            <p>
              Napkins, utensils, takeout supplies, table supplies, cleaning
              items, and front-of-house service supplies.
            </p>
          </div>
          <span class="badge">Dining</span>
        </article>

        <article class="department-card">
          <div class="department-icon">📦</div>
          <div>
            <h4>Commissary Inventory Catalog</h4>
            <p>
              Bulk ingredients, prepared items, transfer supplies, storage
              supplies, packaging, and commissary production items.
            </p>
          </div>
          <span class="badge">Commissary</span>
        </article>
      </div>
    </section>

    <section class="coming-soon">
      <div>
        <h3>Next Discussion</h3>
        <p>
          After this department catalog structure is approved, we will decide
          what sections should exist under Bar, Kitchen, Dining, and Commissary
          before adding actual inventory items.
        </p>
      </div>
    </section>
  `
};
