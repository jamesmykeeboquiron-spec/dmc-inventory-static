window.DMC_PAGES = window.DMC_PAGES || {};

(function registerProductionStandardsPage() {
  const STORAGE_KEYS = {
    standards: "dmc_production_standards",
    masterList: "dmc_master_list_items",
    settings: "dmc_inventory_settings"
  };

  const state = {
    isFormOpen: false,
    editingStandardId: "",
    ingredients: []
  };

  function readArray(key, fallback = []) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (error) {
      console.warn(`Unable to read ${key} from localStorage.`, error);
      return fallback;
    }
  }

  function readObject(key, fallback = {}) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed
        : fallback;
    } catch (error) {
      console.warn(`Unable to read ${key} from localStorage.`, error);
      return fallback;
    }
  }

  function writeStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function toNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function createId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;
  }

  function showNotice(message, type = "success", title = "Saved") {
    if (typeof window.DMC_SHOW_MODAL === "function") {
      window.DMC_SHOW_MODAL({
        type,
        title,
        message,
        confirmLabel: "OK"
      });
      return;
    }

    window.alert(message);
  }

  function confirmAction({ title, message, onConfirm }) {
    if (typeof window.DMC_CONFIRM_MODAL === "function") {
      window.DMC_CONFIRM_MODAL({
        type: "danger",
        title,
        message,
        confirmLabel: "Remove",
        cancelLabel: "Cancel",
        onConfirm
      });
      return;
    }

    if (window.confirm(message)) {
      onConfirm();
    }
  }

  function normalizeNamedValues(values) {
    return (values || [])
      .map((value) => {
        if (typeof value === "string") {
          return value;
        }

        return value?.name || value?.label || value?.value || "";
      })
      .filter(Boolean);
  }

  function getSettings() {
    const localSettings = readObject(STORAGE_KEYS.settings, {});
    const fallbackSettings = window.DMC_DATA?.settings || {};

    return Object.keys(localSettings).length ? localSettings : fallbackSettings;
  }

  function getStandards() {
    return readArray(STORAGE_KEYS.standards, []);
  }

  function saveStandards(standards) {
    writeStorage(STORAGE_KEYS.standards, standards);
  }

  function getMasterListItems() {
    const fallbackItems = window.DMC_DATA?.masterList?.items || [];
    return readArray(STORAGE_KEYS.masterList, fallbackItems);
  }

  function saveMasterListItems(items) {
    writeStorage(STORAGE_KEYS.masterList, items);
  }

  function getActiveMasterListItems() {
    return getMasterListItems()
      .filter((item) => item.active !== false)
      .sort((a, b) =>
        String(a.officialItemName || "").localeCompare(
          String(b.officialItemName || "")
        )
      );
  }

  function getEditingStandard() {
    if (!state.editingStandardId) {
      return null;
    }

    return (
      getStandards().find(
        (standard) => standard.standardId === state.editingStandardId
      ) || null
    );
  }

  function renderOptions(values, selectedValue = "", placeholder = "Select") {
    const options = values
      .map((value) => {
        const isSelected = value === selectedValue ? "selected" : "";
        return `<option value="${escapeHtml(value)}" ${isSelected}>${escapeHtml(
          value
        )}</option>`;
      })
      .join("");

    return `<option value="">${escapeHtml(placeholder)}</option>${options}`;
  }

  function renderItemOptions(items, selectedItemId = "") {
    return items
      .map((item) => {
        const isSelected = item.itemId === selectedItemId ? "selected" : "";
        return `
          <option value="${escapeHtml(item.itemId)}" ${isSelected}>
            ${escapeHtml(item.officialItemName || "Unnamed Item")} (${escapeHtml(
          item.itemId || "No ID"
        )})
          </option>
        `;
      })
      .join("");
  }

  function renderSummaryCards() {
    const standards = getStandards();
    const activeCount = standards.filter(
      (standard) => standard.active !== false
    ).length;

    return `
      <section class="production-standards-summary">
        <article class="production-summary-card">
          <span>Total Standards</span>
          <strong>${standards.length}</strong>
        </article>

        <article class="production-summary-card">
          <span>Active Products</span>
          <strong>${activeCount}</strong>
        </article>

        <article class="production-summary-card">
          <span>Expected Yield Basis</span>
          <strong>Primary Raw Material</strong>
        </article>
      </section>
    `;
  }

  function renderIngredientRows() {
    if (!state.ingredients.length) {
      return `
        <div class="instruction-box">
          <span>
            No supporting ingredients have been added. These ingredients are
            reference-only and do not affect the expected-yield calculation.
          </span>
        </div>
      `;
    }

    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ingredient</th>
              <th>Quantity</th>
              <th>Unit</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${state.ingredients
              .map(
                (ingredient, index) => `
                  <tr>
                    <td>${escapeHtml(ingredient.itemName)}</td>
                    <td>
                      <input
                        class="production-ingredient-input"
                        data-ingredient-quantity="${index}"
                        type="number"
                        min="0"
                        step="any"
                        value="${escapeHtml(ingredient.quantity)}"
                      />
                    </td>
                    <td>
                      <input
                        class="production-ingredient-input"
                        data-ingredient-unit="${index}"
                        type="text"
                        value="${escapeHtml(ingredient.unit)}"
                      />
                    </td>
                    <td>
                      <button
                        class="tiny-button danger"
                        data-remove-ingredient="${index}"
                        type="button"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderStandardForm() {
    if (!state.isFormOpen) {
      return "";
    }

    const editingStandard = getEditingStandard();
    const settings = getSettings();
    const units = normalizeNamedValues(settings.units);
    const departments = normalizeNamedValues(settings.departments);
    const sections = normalizeNamedValues(settings.sections);
    const masterListItems = getActiveMasterListItems();

    return `
      <section class="panel production-standard-form-panel">
        <div class="panel-header">
          <div>
            <h3>${editingStandard ? "Edit" : "Add"} Production Standard</h3>
            <p>
              Set a simple rule showing how much main raw material should produce
              a specific amount of finished product.
            </p>
          </div>
        </div>

        <form id="production-standard-form">
          <section class="production-form-section">
            <div class="production-section-heading">
              <span class="production-step-number">1</span>
              <div>
                <h4>Finished Product Details</h4>
                <p>What finished product are we setting a standard for?</p>
              </div>
            </div>

            <div class="form-grid">
              <label>
                Finished Product Name
                <input
                  id="production-product-name"
                  type="text"
                  required
                  placeholder="Example: Chicken Fingers"
                  value="${escapeHtml(editingStandard?.productName || "")}"
                />
              </label>

              <label>
                Department
                <select id="production-department" required>
                  ${renderOptions(
                    departments,
                    editingStandard?.department || "",
                    "Select department"
                  )}
                </select>
              </label>

              <label>
                Section
                <select id="production-section" required>
                  ${renderOptions(
                    sections,
                    editingStandard?.section || "",
                    "Select section"
                  )}
                </select>
              </label>

              <label>
                Finished Product Unit
                <select id="production-yield-unit" required>
                  ${renderOptions(
                    units,
                    editingStandard?.yieldUnit || editingStandard?.baseUnit || "",
                    "Example: Orders, Pieces, Trays"
                  )}
                </select>
              </label>

              <label>
                Status
                <select id="production-active-status">
                  <option value="true" ${
                    editingStandard?.active !== false ? "selected" : ""
                  }>Active</option>
                  <option value="false" ${
                    editingStandard?.active === false ? "selected" : ""
                  }>Inactive</option>
                </select>
              </label>
            </div>
          </section>

          <section class="production-form-section">
            <div class="production-section-heading">
              <span class="production-step-number">2</span>
              <div>
                <h4>Main Raw Material Standard</h4>
                <p>
                  How much of the main raw material should produce how many
                  finished products?
                </p>
              </div>
            </div>

            <div class="form-grid">
              <label class="form-full">
                Main Raw Material
                <select id="production-primary-material" required>
                  <option value="">Select main raw material</option>
                  ${renderItemOptions(
                    masterListItems,
                    editingStandard?.primaryRawMaterialId || ""
                  )}
                </select>
              </label>

              <label>
                Amount Used as Standard
                <input
                  id="production-standard-raw-quantity"
                  type="number"
                  min="0.0001"
                  step="any"
                  required
                  placeholder="Example: 1"
                  value="${escapeHtml(
                    editingStandard?.standardRawMaterialQty || ""
                  )}"
                />
              </label>

              <label>
                Raw Material Unit
                <select id="production-raw-material-unit" required>
                  ${renderOptions(
                    units,
                    editingStandard?.rawMaterialUnit || "",
                    "Example: kg, g, liters"
                  )}
                </select>
              </label>

              <label>
                Expected Output
                <input
                  id="production-expected-yield"
                  type="number"
                  min="0.0001"
                  step="any"
                  required
                  placeholder="Example: 10"
                  value="${escapeHtml(editingStandard?.expectedYield || "")}"
                />
              </label>
            </div>

            <div class="production-live-rule" id="production-live-rule">
              Complete the fields above to preview the standard.
            </div>
          </section>

          <section class="production-form-section">
            <div class="production-section-heading">
              <span class="production-step-number">3</span>
              <div>
                <h4>Supporting Ingredients</h4>
                <p>
                  Add other recipe ingredients for reference. These do not change
                  the expected-yield calculation.
                </p>
              </div>
            </div>

            ${renderIngredientRows()}

            <div class="form-grid production-add-ingredient-grid">
              <label>
                Ingredient
                <select id="production-new-ingredient">
                  <option value="">Select ingredient</option>
                  ${renderItemOptions(masterListItems)}
                </select>
              </label>

              <label>
                Quantity
                <input
                  id="production-new-ingredient-quantity"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Example: 200"
                />
              </label>

              <label>
                Unit
                <select id="production-new-ingredient-unit">
                  ${renderOptions(units, "", "Select unit")}
                </select>
              </label>

              <div class="production-add-ingredient-action">
                <button
                  class="ghost-button"
                  id="production-add-ingredient"
                  type="button"
                >
                  Add Ingredient
                </button>
              </div>
            </div>

            <div class="instruction-box production-reference-note">
              <strong>Reference only:</strong>
              <span>
                Expected yield will still be based only on the Main Raw Material.
              </span>
            </div>
          </section>

          <section class="production-form-section">
            <div class="production-section-heading">
              <span class="production-step-number">4</span>
              <div>
                <h4>Notes and Review</h4>
                <p>Review the standard before saving it.</p>
              </div>
            </div>

            <label class="production-notes-label">
              Standard Notes
              <textarea
                id="production-standard-notes"
                rows="3"
                placeholder="Optional preparation, portioning, or quality notes"
              >${escapeHtml(editingStandard?.notes || "")}</textarea>
            </label>

            <div class="production-review-card">
              <span>Standard Summary</span>
              <strong id="production-review-summary">
                Complete the standard fields above.
              </strong>
              <small id="production-review-details">
                Supporting ingredients: ${state.ingredients.length} · Status: ${
                  editingStandard?.active === false ? "Inactive" : "Active"
                }
              </small>
            </div>
          </section>

          <div class="form-actions production-form-actions">
            <button
              class="ghost-button"
              id="production-cancel-standard"
              type="button"
            >
              Cancel
            </button>

            <button class="primary-button" type="submit">
              ${editingStandard ? "Update" : "Save"} Production Standard
            </button>
          </div>
        </form>
      </section>
    `;
  }

  function renderStandardsTable() {
    const standards = getStandards();

    return `
      <section class="panel">
        <div class="panel-header">
          <div>
            <h3>Saved Production Standards</h3>
            <p>
              Each standard defines the expected yield produced from its primary
              raw-material quantity.
            </p>
          </div>

          <button
            class="primary-button"
            id="production-open-standard-form"
            type="button"
          >
            + Add Standard
          </button>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Finished Product</th>
                <th>Primary Raw Material Standard</th>
                <th>Expected Yield</th>
                <th>Ingredients</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${
                standards.length
                  ? standards
                      .map(
                        (standard) => `
                          <tr>
                            <td>
                              <strong>${escapeHtml(standard.productName)}</strong>
                              <small class="production-table-meta">
                                ${escapeHtml(standard.department || "-")} ·
                                ${escapeHtml(standard.section || "-")}
                              </small>
                            </td>
                            <td>
                              ${escapeHtml(standard.standardRawMaterialQty)}
                              ${escapeHtml(standard.rawMaterialUnit)}
                              ${escapeHtml(standard.primaryRawMaterialName)}
                            </td>
                            <td>
                              ${escapeHtml(standard.expectedYield)}
                              ${escapeHtml(
                                standard.yieldUnit || standard.baseUnit || ""
                              )}
                            </td>
                            <td>${(standard.ingredients || []).length}</td>
                            <td>
                              <span class="badge ${
                                standard.active === false ? "danger-badge" : ""
                              }">
                                ${standard.active === false ? "INACTIVE" : "ACTIVE"}
                              </span>
                            </td>
                            <td>
                              <button
                                class="tiny-button"
                                data-edit-production-standard="${escapeHtml(
                                  standard.standardId
                                )}"
                                type="button"
                              >
                                Edit
                              </button>

                              <button
                                class="tiny-button danger"
                                data-remove-production-standard="${escapeHtml(
                                  standard.standardId
                                )}"
                                type="button"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        `
                      )
                      .join("")
                  : `
                    <tr>
                      <td colspan="6">
                        No Production Standards have been saved yet.
                      </td>
                    </tr>
                  `
              }
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function getProductionStandardsContent() {
    return `
      <style>
        .production-standards-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }

        .production-summary-card {
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.02);
        }

        .production-summary-card span {
          display: block;
          margin-bottom: 7px;
          opacity: 0.72;
        }

        .production-summary-card strong {
          display: block;
          font-size: 22px;
          line-height: 1.2;
        }

        .production-ingredients-section {
          padding-top: 8px;
        }

        .production-subsection-heading {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .production-subsection-heading h4,
        .production-subsection-heading p {
          margin: 0;
        }

        .production-subsection-heading p {
          margin-top: 5px;
          opacity: 0.72;
        }

        .production-add-ingredient-grid {
          margin-top: 14px;
        }

        .production-add-ingredient-action {
          display: flex;
          align-items: end;
        }

        .production-table-meta {
          display: block;
          margin-top: 5px;
          opacity: 0.65;
        }

        .production-standard-form-panel form {
          display: grid;
          gap: 16px;
        }

        .production-form-section {
          padding: 18px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.02);
        }

        .production-section-heading {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 16px;
        }

        .production-section-heading h4,
        .production-section-heading p {
          margin: 0;
        }

        .production-section-heading p {
          margin-top: 5px;
          opacity: 0.7;
        }

        .production-step-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 30px;
          height: 30px;
          border-radius: 999px;
          border: 1px solid rgba(214, 174, 83, 0.55);
          background: rgba(214, 174, 83, 0.12);
          font-weight: 700;
        }

        .production-live-rule,
        .production-review-card {
          margin-top: 16px;
          padding: 15px 16px;
          border: 1px solid rgba(214, 174, 83, 0.35);
          border-radius: 12px;
          background: rgba(214, 174, 83, 0.08);
        }

        .production-live-rule {
          font-weight: 600;
          line-height: 1.5;
        }

        .production-review-card span,
        .production-review-card strong,
        .production-review-card small {
          display: block;
        }

        .production-review-card span {
          margin-bottom: 7px;
          opacity: 0.7;
        }

        .production-review-card strong {
          font-size: 17px;
          line-height: 1.5;
        }

        .production-review-card small {
          margin-top: 7px;
          opacity: 0.7;
        }

        .production-reference-note {
          margin-top: 14px;
        }

        .production-notes-label {
          display: block;
        }

        .production-notes-label textarea {
          width: 100%;
          margin-top: 7px;
        }

        .production-form-actions {
          justify-content: flex-end;
        }

        @media (max-width: 900px) {
          .production-standards-summary {
            grid-template-columns: 1fr;
          }
        }
      </style>

      ${renderSummaryCards()}
      ${renderStandardForm()}
      ${renderStandardsTable()}
    `;
  }

  function refreshProductionStandardsPage() {
    renderPage("production");
  }

  function syncIngredientInputs() {
    document
      .querySelectorAll("[data-ingredient-quantity]")
      .forEach((input) => {
        const index = Number(input.dataset.ingredientQuantity);

        if (state.ingredients[index]) {
          state.ingredients[index].quantity = toNumber(input.value);
        }
      });

    document.querySelectorAll("[data-ingredient-unit]").forEach((input) => {
      const index = Number(input.dataset.ingredientUnit);

      if (state.ingredients[index]) {
        state.ingredients[index].unit = input.value.trim();
      }
    });
  }

  function openNewStandardForm() {
    state.isFormOpen = true;
    state.editingStandardId = "";
    state.ingredients = [];
    refreshProductionStandardsPage();
  }

  function openEditStandardForm(standardId) {
    const standard = getStandards().find(
      (item) => item.standardId === standardId
    );

    if (!standard) {
      showNotice(
        "The selected Production Standard could not be found.",
        "warning",
        "Standard Not Found"
      );
      return;
    }

    state.isFormOpen = true;
    state.editingStandardId = standardId;
    state.ingredients = (standard.ingredients || []).map((ingredient) => ({
      ...ingredient
    }));

    refreshProductionStandardsPage();
  }

  function closeStandardForm() {
    state.isFormOpen = false;
    state.editingStandardId = "";
    state.ingredients = [];
    refreshProductionStandardsPage();
  }

  function addIngredient() {
    syncIngredientInputs();

    const itemId = document.getElementById(
      "production-new-ingredient"
    )?.value;
    const quantity = toNumber(
      document.getElementById("production-new-ingredient-quantity")?.value
    );
    const unit = document
      .getElementById("production-new-ingredient-unit")
      ?.value.trim();
    const item = getMasterListItems().find(
      (masterItem) => masterItem.itemId === itemId
    );

    if (!item || quantity <= 0 || !unit) {
      showNotice(
        "Select an ingredient, enter a quantity greater than zero, and choose a unit.",
        "warning",
        "Ingredient Details Required"
      );
      return;
    }

    const existingIngredient = state.ingredients.find(
      (ingredient) => ingredient.itemId === itemId
    );

    if (existingIngredient) {
      showNotice(
        "That ingredient is already included in this Production Standard.",
        "warning",
        "Duplicate Ingredient"
      );
      return;
    }

    state.ingredients.push({
      itemId,
      itemName: item.officialItemName || "Unnamed Item",
      quantity,
      unit
    });

    refreshProductionStandardsPage();
  }

  function removeIngredient(index) {
    syncIngredientInputs();
    state.ingredients.splice(index, 1);
    refreshProductionStandardsPage();
  }

  function buildStandardFromForm() {
    const existingStandard = getEditingStandard();
    const primaryRawMaterialId = document.getElementById(
      "production-primary-material"
    )?.value;
    const primaryRawMaterial = getMasterListItems().find(
      (item) => item.itemId === primaryRawMaterialId
    );
    const now = new Date().toISOString();

    return {
      standardId: existingStandard?.standardId || createId("PS"),
      linkedItemId: existingStandard?.linkedItemId || createId("FP"),
      productName: document
        .getElementById("production-product-name")
        ?.value.trim(),
      department: document.getElementById("production-department")?.value,
      section: document.getElementById("production-section")?.value,
      yieldUnit: document.getElementById("production-yield-unit")?.value,
      baseUnit: document.getElementById("production-yield-unit")?.value,
      primaryRawMaterialId,
      primaryRawMaterialName:
        primaryRawMaterial?.officialItemName || "",
      standardRawMaterialQty: toNumber(
        document.getElementById("production-standard-raw-quantity")?.value
      ),
      rawMaterialUnit: document.getElementById(
        "production-raw-material-unit"
      )?.value,
      expectedYield: toNumber(
        document.getElementById("production-expected-yield")?.value
      ),
      active:
        document.getElementById("production-active-status")?.value === "true",
      notes: document
        .getElementById("production-standard-notes")
        ?.value.trim(),
      ingredients: state.ingredients.map((ingredient) => ({ ...ingredient })),
      createdAt: existingStandard?.createdAt || now,
      updatedAt: now
    };
  }

  function validateStandard(standard) {
    if (!standard.productName) {
      return "Enter the finished-product name.";
    }

    if (!standard.department) {
      return "Select a department.";
    }

    if (!standard.section) {
      return "Select a section.";
    }

    if (!standard.primaryRawMaterialId || !standard.primaryRawMaterialName) {
      return "Select a valid primary raw material.";
    }

    if (standard.standardRawMaterialQty <= 0) {
      return "Enter a standard raw-material quantity greater than zero.";
    }

    if (!standard.rawMaterialUnit) {
      return "Select the raw-material unit.";
    }

    if (standard.expectedYield <= 0) {
      return "Enter an expected yield greater than zero.";
    }

    if (!standard.yieldUnit) {
      return "Select the finished-product yield unit.";
    }

    const duplicateName = getStandards().some(
      (savedStandard) =>
        savedStandard.standardId !== standard.standardId &&
        String(savedStandard.productName || "").trim().toLowerCase() ===
          standard.productName.toLowerCase()
    );

    if (duplicateName) {
      return "A Production Standard with that finished-product name already exists.";
    }

    return "";
  }

  function saveFinishedProductToMasterList(standard) {
    const masterListItems = getMasterListItems();
    const existingIndex = masterListItems.findIndex(
      (item) => item.itemId === standard.linkedItemId
    );
    const existingItem =
      existingIndex >= 0 ? masterListItems[existingIndex] : {};
    const existingAreas = Array.isArray(existingItem.operatingAreas)
      ? existingItem.operatingAreas
      : [];

    const finishedProductItem = {
      ...existingItem,
      itemId: standard.linkedItemId,
      officialItemName: standard.productName,
      department: standard.department,
      section: standard.section,
      unit: standard.yieldUnit,
      operatingAreas: Array.from(
        new Set([...existingAreas, "Commissary"])
      ),
      active: standard.active,
      itemType: "Finished Product"
    };

    if (existingIndex >= 0) {
      masterListItems[existingIndex] = finishedProductItem;
    } else {
      masterListItems.push(finishedProductItem);
    }

    saveMasterListItems(masterListItems);
  }

  function saveStandard(event) {
    event.preventDefault();
    syncIngredientInputs();

    const standard = buildStandardFromForm();
    const validationMessage = validateStandard(standard);

    if (validationMessage) {
      showNotice(validationMessage, "warning", "Check Production Standard");
      return;
    }

    const standards = getStandards();
    const existingIndex = standards.findIndex(
      (item) => item.standardId === standard.standardId
    );

    if (existingIndex >= 0) {
      standards[existingIndex] = standard;
    } else {
      standards.push(standard);
    }

    saveStandards(standards);
    saveFinishedProductToMasterList(standard);

    state.isFormOpen = false;
    state.editingStandardId = "";
    state.ingredients = [];

    showNotice(
      "The Production Standard was saved and its finished product was linked to the Master List."
    );

    refreshProductionStandardsPage();
  }

  function removeStandard(standardId) {
    const standard = getStandards().find(
      (item) => item.standardId === standardId
    );

    if (!standard) {
      return;
    }

    confirmAction({
      title: "Remove Production Standard?",
      message: `Remove the Production Standard for ${standard.productName}? Existing production history will not be deleted.`,
      onConfirm: () => {
        const remainingStandards = getStandards().filter(
          (item) => item.standardId !== standardId
        );

        saveStandards(remainingStandards);
        refreshProductionStandardsPage();
      }
    });
  }

  function updateProductionStandardPreview() {
    const productName = document
      .getElementById("production-product-name")
      ?.value.trim();
    const primarySelect = document.getElementById(
      "production-primary-material"
    );
    const primaryName = primarySelect?.selectedOptions?.[0]?.textContent
      ?.replace(/\s*\([^)]*\)\s*$/, "")
      .trim();
    const rawQuantity = document.getElementById(
      "production-standard-raw-quantity"
    )?.value;
    const rawUnit = document.getElementById(
      "production-raw-material-unit"
    )?.value;
    const expectedYield = document.getElementById(
      "production-expected-yield"
    )?.value;
    const yieldUnit = document.getElementById(
      "production-yield-unit"
    )?.value;
    const status =
      document.getElementById("production-active-status")?.value === "false"
        ? "Inactive"
        : "Active";

    const isComplete =
      productName &&
      primarySelect?.value &&
      rawQuantity &&
      rawUnit &&
      expectedYield &&
      yieldUnit;

    const summary = isComplete
      ? `${rawQuantity} ${rawUnit} ${primaryName} should produce ${expectedYield} ${yieldUnit} of ${productName}.`
      : "Complete the fields above to preview the standard.";

    const liveRule = document.getElementById("production-live-rule");
    const reviewSummary = document.getElementById(
      "production-review-summary"
    );
    const reviewDetails = document.getElementById(
      "production-review-details"
    );

    if (liveRule) {
      liveRule.textContent = summary;
    }

    if (reviewSummary) {
      reviewSummary.textContent = isComplete
        ? summary
        : "Complete the standard fields above.";
    }

    if (reviewDetails) {
      reviewDetails.textContent = `Supporting ingredients: ${state.ingredients.length} · Status: ${status}`;
    }
  }

  function setupProductionStandardsEvents() {
    document
      .getElementById("production-open-standard-form")
      ?.addEventListener("click", openNewStandardForm);

    document
      .getElementById("production-cancel-standard")
      ?.addEventListener("click", closeStandardForm);

    document
      .getElementById("production-add-ingredient")
      ?.addEventListener("click", addIngredient);

    document
      .getElementById("production-standard-form")
      ?.addEventListener("submit", saveStandard);

    document
      .querySelectorAll("[data-remove-ingredient]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          removeIngredient(Number(button.dataset.removeIngredient));
        });
      });

    document
      .querySelectorAll("[data-edit-production-standard]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          openEditStandardForm(button.dataset.editProductionStandard);
        });
      });

    document
      .querySelectorAll("[data-remove-production-standard]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          removeStandard(button.dataset.removeProductionStandard);
        });
      });

    [
      "production-product-name",
      "production-primary-material",
      "production-standard-raw-quantity",
      "production-raw-material-unit",
      "production-expected-yield",
      "production-yield-unit",
      "production-active-status"
    ].forEach((id) => {
      const field = document.getElementById(id);
      field?.addEventListener("input", updateProductionStandardPreview);
      field?.addEventListener("change", updateProductionStandardPreview);
    });

    updateProductionStandardPreview();
  }

  window.DMC_PAGES.production = {
    eyebrow: "Commissary",
    title: "Production Standards",
    description:
      "Define primary raw-material standards, expected yield, and supporting recipe ingredients.",
    getContent: getProductionStandardsContent,
    content: getProductionStandardsContent(),
    afterRender: setupProductionStandardsEvents
  };
})();
