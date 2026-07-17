window.DMC_PAGES = window.DMC_PAGES || {};

const DMC_PRODUCTION_STANDARDS_STORAGE_KEY = "dmc_production_standards";
const DMC_PRODUCTION_MASTER_LIST_STORAGE_KEY = "dmc_master_list_items";
const DMC_PRODUCTION_SETTINGS_STORAGE_KEY = "dmc_inventory_settings";

window.DMC_PRODUCTION_ACTIVE_TAB = window.DMC_PRODUCTION_ACTIVE_TAB || "standards";
window.DMC_PRODUCTION_EDITING_STANDARD_ID =
  window.DMC_PRODUCTION_EDITING_STANDARD_ID || null;
window.DMC_PRODUCTION_FORM_OPEN = window.DMC_PRODUCTION_FORM_OPEN || false;
window.DMC_PRODUCTION_INGREDIENT_DRAFT =
  window.DMC_PRODUCTION_INGREDIENT_DRAFT || [];

function productionEscapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function productionReadArray(key, fallback = []) {
  const storedValue = localStorage.getItem(key);

  if (!storedValue) {
    return Array.isArray(fallback) ? fallback : [];
  }

  try {
    const parsedValue = JSON.parse(storedValue);
    return Array.isArray(parsedValue) ? parsedValue : fallback;
  } catch {
    return fallback;
  }
}

function productionWriteArray(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getProductionDefaultMasterItems() {
  return window.DMC_DATA?.masterList?.items || [];
}

function getProductionMasterItems() {
  return productionReadArray(
    DMC_PRODUCTION_MASTER_LIST_STORAGE_KEY,
    getProductionDefaultMasterItems()
  );
}

function saveProductionMasterItems(items) {
  productionWriteArray(DMC_PRODUCTION_MASTER_LIST_STORAGE_KEY, items);
}

function getProductionStandards() {
  return productionReadArray(DMC_PRODUCTION_STANDARDS_STORAGE_KEY, []);
}

function saveProductionStandards(standards) {
  productionWriteArray(DMC_PRODUCTION_STANDARDS_STORAGE_KEY, standards);
}

function getProductionSettings() {
  const fallback = window.DMC_DATA?.settings || {
    operatingAreas: [],
    departments: [],
    sections: [],
    units: []
  };

  const storedValue = localStorage.getItem(DMC_PRODUCTION_SETTINGS_STORAGE_KEY);

  if (!storedValue) {
    return fallback;
  }

  try {
    const parsedValue = JSON.parse(storedValue);
    return {
      operatingAreas: parsedValue.operatingAreas || [],
      departments: parsedValue.departments || [],
      sections: parsedValue.sections || [],
      units: parsedValue.units || []
    };
  } catch {
    return fallback;
  }
}

function getProductionOptionName(option) {
  return typeof option === "string" ? option : option?.name || "";
}

function renderProductionOptions(options, selectedValue = "", placeholder = "Select") {
  const normalized = (options || [])
    .map(getProductionOptionName)
    .filter(Boolean);

  return `
    <option value="">${productionEscapeHtml(placeholder)}</option>
    ${normalized
      .map(
        (name) => `
          <option value="${productionEscapeHtml(name)}" ${
            name === selectedValue ? "selected" : ""
          }>${productionEscapeHtml(name)}</option>
        `
      )
      .join("")}
  `;
}

function getProductionCodePrefix(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.slice(0, 3))
    .join("")
    .slice(0, 3);
}

function getNextProductionItemId(departmentName, sectionName) {
  const departmentCode = getProductionCodePrefix(departmentName);
  const sectionCode = getProductionCodePrefix(sectionName);

  if (!departmentCode || !sectionCode) {
    return "";
  }

  const prefix = `${departmentCode}-${sectionCode}`;
  const highestNumber = getProductionMasterItems()
    .filter((item) => String(item.itemId || "").startsWith(prefix))
    .reduce((highest, item) => {
      const parsed = Number(String(item.itemId || "").split("-").pop());
      return Number.isNaN(parsed) ? highest : Math.max(highest, parsed);
    }, 0);

  return `${prefix}-${String(highestNumber + 1).padStart(3, "0")}`;
}

function getEditingProductionStandard() {
  if (!window.DMC_PRODUCTION_EDITING_STANDARD_ID) {
    return null;
  }

  return getProductionStandards().find(
    (standard) => standard.standardId === window.DMC_PRODUCTION_EDITING_STANDARD_ID
  );
}

function getProductionIngredientCandidates(linkedItemId = "") {
  return getProductionMasterItems()
    .filter((item) => item.active !== false)
    .filter((item) => item.itemId !== linkedItemId)
    .sort((a, b) =>
      String(a.officialItemName || "").localeCompare(
        String(b.officialItemName || "")
      )
    );
}

function showProductionModal({ type = "info", title, message, confirmLabel = "OK" }) {
  if (typeof window.DMC_SHOW_MODAL === "function") {
    window.DMC_SHOW_MODAL({ type, title, message, confirmLabel });
    return;
  }

  alert(message);
}

function showProductionConfirm({ title, message, confirmLabel, onConfirm }) {
  if (typeof window.DMC_CONFIRM_MODAL === "function") {
    window.DMC_CONFIRM_MODAL({
      type: "danger",
      title,
      message,
      confirmLabel,
      cancelLabel: "Cancel",
      onConfirm
    });
    return;
  }

  if (confirm(message)) {
    onConfirm();
  }
}

function renderProductionTabs() {
  return `
    <div class="production-tab-shell" role="tablist" aria-label="Production sections">
      <button
        type="button"
        class="production-tab ${
          window.DMC_PRODUCTION_ACTIVE_TAB === "standards" ? "active" : ""
        }"
        data-production-tab="standards"
      >
        Production Standards
      </button>
      <button
        type="button"
        class="production-tab ${
          window.DMC_PRODUCTION_ACTIVE_TAB === "daily" ? "active" : ""
        }"
        data-production-tab="daily"
      >
        Daily Production
      </button>
    </div>
  `;
}

function renderProductionSummary() {
  const standards = getProductionStandards();
  const activeStandards = standards.filter((standard) => standard.active !== false);
  const totalIngredients = standards.reduce(
    (total, standard) => total + (standard.ingredients || []).length,
    0
  );

  return `
    <section class="production-summary-grid">
      <article class="production-summary-card">
        <span>Saved Standards</span>
        <strong>${standards.length}</strong>
      </article>
      <article class="production-summary-card">
        <span>Active Products</span>
        <strong>${activeStandards.length}</strong>
      </article>
      <article class="production-summary-card">
        <span>Recipe Lines</span>
        <strong>${totalIngredients}</strong>
      </article>
    </section>
  `;
}

function renderIngredientRows(editingStandard) {
  const ingredients = window.DMC_PRODUCTION_INGREDIENT_DRAFT;
  const candidates = getProductionIngredientCandidates(editingStandard?.linkedItemId);
  const settings = getProductionSettings();

  if (ingredients.length === 0) {
    return `
      <div class="production-empty-recipe">
        No ingredients added yet. Select an existing Master List item below.
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
          ${ingredients
            .map((ingredient, index) => {
              const selectedCandidate = candidates.find(
                (item) => item.itemId === ingredient.itemId
              );
              const fallbackName = ingredient.itemName || selectedCandidate?.officialItemName || "Unknown Item";

              return `
                <tr>
                  <td>
                    <strong>${productionEscapeHtml(fallbackName)}</strong><br />
                    <small>${productionEscapeHtml(ingredient.itemId)}</small>
                  </td>
                  <td>
                    <input
                      class="production-inline-input"
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      value="${productionEscapeHtml(ingredient.quantity)}"
                      data-production-ingredient-quantity="${index}"
                    />
                  </td>
                  <td>
                    <select data-production-ingredient-unit="${index}">
                      ${renderProductionOptions(
                        settings.units,
                        ingredient.unit,
                        "Unit"
                      )}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      class="tiny-button danger"
                      data-remove-production-ingredient="${index}"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderProductionStandardForm(settings, editingStandard) {
  const isEditing = Boolean(editingStandard);
  const formOpen = isEditing || window.DMC_PRODUCTION_FORM_OPEN;
  const departments = settings.departments || [];
  const sections = settings.sections || [];
  const units = settings.units || [];
  const defaultDepartment = getProductionOptionName(departments[0]);
  const defaultSection = getProductionOptionName(sections[0]);
  const defaultUnit = getProductionOptionName(units[0]);
  const selectedDepartment = editingStandard?.department || defaultDepartment;
  const selectedSection = editingStandard?.section || defaultSection;
  const selectedBaseUnit = editingStandard?.baseUnit || defaultUnit;
  const itemId =
    editingStandard?.linkedItemId ||
    getNextProductionItemId(selectedDepartment, selectedSection);
  const candidates = getProductionIngredientCandidates(editingStandard?.linkedItemId);

  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Production Standards</h3>
          <p>Create finished products and define the standard recipe used by Daily Production.</p>
        </div>
        <button type="button" class="primary-button" id="open-production-standard-form">
          + Add Standard
        </button>
      </div>

      <div class="instruction-box">
        <strong>One source of truth:</strong>
        <span>
          Saving a standard creates or updates one linked finished-product item in the Master List. It does not add stock.
        </span>
      </div>

      <div class="add-item-panel ${formOpen ? "" : "hidden"}" id="production-standard-form-panel">
        <h4>${isEditing ? "Edit Production Standard" : "New Production Standard"}</h4>

        <form id="production-standard-form" class="form-grid">
          <label>
            Finished Product Name
            <input
              id="production-product-name"
              type="text"
              value="${productionEscapeHtml(editingStandard?.productName || "")}"
              placeholder="Chicken Fingers"
              required
            />
          </label>

          <label>
            Linked Item ID
            <input
              id="production-linked-item-id"
              type="text"
              value="${productionEscapeHtml(itemId)}"
              readonly
            />
          </label>

          <label>
            Department
            <select id="production-department" required>
              ${renderProductionOptions(departments, selectedDepartment, "Department")}
            </select>
          </label>

          <label>
            Section
            <select id="production-section" required>
              ${renderProductionOptions(sections, selectedSection, "Section")}
            </select>
          </label>

          <label>
            Base Inventory Unit
            <select id="production-base-unit" required>
              ${renderProductionOptions(units, selectedBaseUnit, "Base unit")}
            </select>
          </label>

          <label>
            Minimum Stock
            <input
              id="production-minimum-stock"
              type="number"
              min="0"
              step="0.01"
              value="${productionEscapeHtml(editingStandard?.minimumStock || "")}"
              placeholder="Optional"
            />
          </label>

          <label>
            Package Unit
            <select id="production-package-unit">
              ${renderProductionOptions(
                units,
                editingStandard?.packageUnit || "",
                "Optional package unit"
              )}
            </select>
          </label>

          <label>
            Base Units per Package
            <input
              id="production-units-per-package"
              type="number"
              min="0"
              step="0.01"
              value="${productionEscapeHtml(editingStandard?.unitsPerPackage || "")}"
              placeholder="Example: 10"
            />
          </label>

          <label>
            Expected Yield per Batch
            <input
              id="production-expected-yield"
              type="number"
              min="0.0001"
              step="0.0001"
              value="${productionEscapeHtml(editingStandard?.expectedYield || "")}"
              placeholder="Example: 100"
              required
            />
          </label>

          <label>
            Active
            <select id="production-active">
              <option value="true" ${editingStandard?.active !== false ? "selected" : ""}>TRUE</option>
              <option value="false" ${editingStandard?.active === false ? "selected" : ""}>FALSE</option>
            </select>
          </label>

          <label class="form-full">
            Standard Notes
            <textarea id="production-standard-notes" rows="3" placeholder="Optional preparation or packaging notes">${productionEscapeHtml(
              editingStandard?.notes || ""
            )}</textarea>
          </label>

          <div class="form-full production-recipe-builder">
            <div class="production-recipe-heading">
              <div>
                <h4>Recipe Ingredients</h4>
                <p>Select ingredients from the existing Master List.</p>
              </div>
            </div>

            ${renderIngredientRows(editingStandard)}

            <div class="production-add-ingredient-row">
              <label>
                Ingredient
                <select id="production-new-ingredient">
                  <option value="">Select Master List item</option>
                  ${candidates
                    .map(
                      (item) => `
                        <option value="${productionEscapeHtml(item.itemId)}">
                          ${productionEscapeHtml(item.officialItemName)} (${productionEscapeHtml(item.itemId)})
                        </option>
                      `
                    )
                    .join("")}
                </select>
              </label>

              <label>
                Quantity
                <input id="production-new-ingredient-quantity" type="number" min="0.0001" step="0.0001" />
              </label>

              <label>
                Unit
                <select id="production-new-ingredient-unit">
                  ${renderProductionOptions(units, "", "Unit")}
                </select>
              </label>

              <button type="button" class="ghost-button" id="add-production-ingredient">
                Add Ingredient
              </button>
            </div>
          </div>

          <div class="form-actions form-full">
            <button type="submit" class="primary-button">
              ${isEditing ? "Save Changes" : "Save Production Standard"}
            </button>
            <button type="button" class="ghost-button" id="cancel-production-standard-form">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </section>
  `;
}

function renderProductionStandardsTable() {
  const standards = getProductionStandards();

  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Saved Product Standards</h3>
          <p>Edit recipes and yields without creating duplicate Master List items.</p>
        </div>
        <span class="badge">${standards.length} Standard${standards.length === 1 ? "" : "s"}</span>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Finished Product</th>
              <th>Item ID</th>
              <th>Base Unit</th>
              <th>Package</th>
              <th>Expected Yield</th>
              <th>Ingredients</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${
              standards.length === 0
                ? `<tr><td colspan="8">No production standards saved yet.</td></tr>`
                : standards
                    .map(
                      (standard) => `
                        <tr>
                          <td><strong>${productionEscapeHtml(standard.productName)}</strong></td>
                          <td>${productionEscapeHtml(standard.linkedItemId)}</td>
                          <td>${productionEscapeHtml(standard.baseUnit)}</td>
                          <td>${
                            standard.packageUnit && standard.unitsPerPackage
                              ? `${productionEscapeHtml(standard.unitsPerPackage)} ${productionEscapeHtml(
                                  standard.baseUnit
                                )} / ${productionEscapeHtml(standard.packageUnit)}`
                              : "-"
                          }</td>
                          <td>${productionEscapeHtml(standard.expectedYield)} ${productionEscapeHtml(
                            standard.baseUnit
                          )}</td>
                          <td>${(standard.ingredients || []).length}</td>
                          <td><span class="badge">${standard.active !== false ? "ACTIVE" : "INACTIVE"}</span></td>
                          <td>
                            <div class="row-actions">
                              <button type="button" class="tiny-button" data-edit-production-standard="${productionEscapeHtml(
                                standard.standardId
                              )}">Edit</button>
                              <button type="button" class="tiny-button danger" data-remove-production-standard="${productionEscapeHtml(
                                standard.standardId
                              )}">Remove</button>
                            </div>
                          </td>
                        </tr>
                      `
                    )
                    .join("")
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderProductionStandardsContent() {
  const settings = getProductionSettings();
  const editingStandard = getEditingProductionStandard();

  return `
    ${renderProductionSummary()}
    ${renderProductionStandardForm(settings, editingStandard)}
    ${renderProductionStandardsTable()}
  `;
}

function renderDailyProductionPlaceholder() {
  const activeStandards = getProductionStandards().filter(
    (standard) => standard.active !== false
  );

  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>Daily Production</h3>
          <p>This tab will record actual production after the standards workflow is verified.</p>
        </div>
        <span class="badge">Next Step</span>
      </div>

      <div class="instruction-box">
        <strong>Ready for the next phase:</strong>
        <span>
          ${activeStandards.length} active finished product${activeStandards.length === 1 ? " is" : "s are"}
          available for future production batches. No ingredient deduction or stock movement is active yet.
        </span>
      </div>

      <div class="production-placeholder-grid">
        <article class="production-placeholder-card">
          <strong>1. Select Product</strong>
          <span>Choose a saved Production Standard.</span>
        </article>
        <article class="production-placeholder-card">
          <strong>2. Record Actual Yield</strong>
          <span>Enter the quantity physically produced.</span>
        </article>
        <article class="production-placeholder-card">
          <strong>3. Review Movement</strong>
          <span>Preview ingredient deductions and finished stock addition.</span>
        </article>
      </div>
    </section>
  `;
}

function getProductionContent() {
  return `
    <style>
      .production-tab-shell {
        display: flex;
        gap: 10px;
        padding: 8px;
        margin-bottom: 18px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.025);
      }
      .production-tab {
        flex: 1;
        min-height: 44px;
        border: 1px solid transparent;
        border-radius: 10px;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-weight: 700;
      }
      .production-tab.active {
        border-color: rgba(214, 177, 86, 0.45);
        background: rgba(214, 177, 86, 0.12);
      }
      .production-summary-grid,
      .production-placeholder-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 14px;
        margin-bottom: 18px;
      }
      .production-summary-card,
      .production-placeholder-card {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 18px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.025);
      }
      .production-summary-card span,
      .production-placeholder-card span {
        opacity: 0.72;
      }
      .production-summary-card strong {
        font-size: 28px;
      }
      .production-recipe-builder {
        padding: 16px;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
      }
      .production-recipe-heading {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      .production-recipe-heading h4,
      .production-recipe-heading p {
        margin: 0;
      }
      .production-add-ingredient-row {
        display: grid;
        grid-template-columns: minmax(220px, 2fr) minmax(110px, 0.8fr) minmax(130px, 1fr) auto;
        gap: 12px;
        align-items: end;
        margin-top: 14px;
      }
      .production-empty-recipe {
        padding: 18px;
        border: 1px dashed rgba(255, 255, 255, 0.15);
        border-radius: 10px;
        text-align: center;
        opacity: 0.72;
      }
      .production-inline-input {
        min-width: 100px;
      }
      @media (max-width: 900px) {
        .production-summary-grid,
        .production-placeholder-grid,
        .production-add-ingredient-row {
          grid-template-columns: 1fr;
        }
        .production-tab-shell {
          flex-direction: column;
        }
      }
    </style>

    ${renderProductionTabs()}
    ${
      window.DMC_PRODUCTION_ACTIVE_TAB === "daily"
        ? renderDailyProductionPlaceholder()
        : renderProductionStandardsContent()
    }
  `;
}

function refreshProductionPage() {
  window.DMC_PAGES.production.content = getProductionContent();
  renderPage("production");
}

function initializeProductionIngredientDraft(standard = null) {
  window.DMC_PRODUCTION_INGREDIENT_DRAFT = (standard?.ingredients || []).map(
    (ingredient) => ({ ...ingredient })
  );
}

function resetProductionFormState() {
  window.DMC_PRODUCTION_EDITING_STANDARD_ID = null;
  window.DMC_PRODUCTION_FORM_OPEN = false;
  window.DMC_PRODUCTION_INGREDIENT_DRAFT = [];
}

function updateProductionItemIdPreview() {
  if (getEditingProductionStandard()) {
    return;
  }

  const department = document.getElementById("production-department")?.value;
  const section = document.getElementById("production-section")?.value;
  const itemIdInput = document.getElementById("production-linked-item-id");

  if (itemIdInput) {
    itemIdInput.value = getNextProductionItemId(department, section);
  }
}

function addProductionIngredientFromForm() {
  const itemId = document.getElementById("production-new-ingredient")?.value;
  const quantity = document.getElementById("production-new-ingredient-quantity")?.value;
  const unit = document.getElementById("production-new-ingredient-unit")?.value;
  const item = getProductionMasterItems().find((candidate) => candidate.itemId === itemId);

  if (!itemId || !item || !quantity || Number(quantity) <= 0 || !unit) {
    showProductionModal({
      type: "warning",
      title: "Ingredient Details Required",
      message: "Select an ingredient, enter a quantity greater than zero, and choose a unit.",
      confirmLabel: "Got it"
    });
    return;
  }

  if (
    window.DMC_PRODUCTION_INGREDIENT_DRAFT.some(
      (ingredient) => ingredient.itemId === itemId
    )
  ) {
    showProductionModal({
      type: "warning",
      title: "Ingredient Already Added",
      message: "Edit the existing recipe row instead of adding the same ingredient twice.",
      confirmLabel: "Got it"
    });
    return;
  }

  window.DMC_PRODUCTION_INGREDIENT_DRAFT.push({
    itemId,
    itemName: item.officialItemName || "",
    quantity: Number(quantity),
    unit
  });

  refreshProductionPage();
}

function syncProductionIngredientDraftFromRenderedRows() {
  document.querySelectorAll("[data-production-ingredient-quantity]").forEach((input) => {
    const index = Number(input.dataset.productionIngredientQuantity);
    if (window.DMC_PRODUCTION_INGREDIENT_DRAFT[index]) {
      window.DMC_PRODUCTION_INGREDIENT_DRAFT[index].quantity = Number(input.value);
    }
  });

  document.querySelectorAll("[data-production-ingredient-unit]").forEach((select) => {
    const index = Number(select.dataset.productionIngredientUnit);
    if (window.DMC_PRODUCTION_INGREDIENT_DRAFT[index]) {
      window.DMC_PRODUCTION_INGREDIENT_DRAFT[index].unit = select.value;
    }
  });
}

function buildSavedProductionStandard(existingStandard = null) {
  const now = new Date().toISOString();

  return {
    standardId:
      existingStandard?.standardId ||
      `PS-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    linkedItemId: document.getElementById("production-linked-item-id").value.trim(),
    productName: document.getElementById("production-product-name").value.trim(),
    department: document.getElementById("production-department").value,
    section: document.getElementById("production-section").value,
    baseUnit: document.getElementById("production-base-unit").value,
    minimumStock: document.getElementById("production-minimum-stock").value.trim(),
    packageUnit: document.getElementById("production-package-unit").value,
    unitsPerPackage: document.getElementById("production-units-per-package").value.trim(),
    expectedYield: Number(document.getElementById("production-expected-yield").value),
    active: document.getElementById("production-active").value === "true",
    notes: document.getElementById("production-standard-notes").value.trim(),
    ingredients: window.DMC_PRODUCTION_INGREDIENT_DRAFT.map((ingredient) => ({
      ...ingredient,
      quantity: Number(ingredient.quantity)
    })),
    createdAt: existingStandard?.createdAt || now,
    updatedAt: now
  };
}

function validateProductionStandard(standard, existingStandard = null) {
  if (
    !standard.productName ||
    !standard.linkedItemId ||
    !standard.department ||
    !standard.section ||
    !standard.baseUnit ||
    !standard.expectedYield ||
    standard.expectedYield <= 0
  ) {
    return "Complete the required finished-product fields and enter an expected yield greater than zero.";
  }

  if (standard.ingredients.length === 0) {
    return "Add at least one recipe ingredient before saving the Production Standard.";
  }

  if (
    standard.ingredients.some(
      (ingredient) => !ingredient.itemId || !ingredient.unit || ingredient.quantity <= 0
    )
  ) {
    return "Every ingredient must have a valid quantity and unit.";
  }

  if (
    standard.packageUnit &&
    (!standard.unitsPerPackage || Number(standard.unitsPerPackage) <= 0)
  ) {
    return "Enter the number of base units contained in the selected package unit.";
  }

  const duplicateName = getProductionStandards().some(
    (candidate) =>
      candidate.standardId !== existingStandard?.standardId &&
      String(candidate.productName || "").toLowerCase() ===
        standard.productName.toLowerCase()
  );

  if (duplicateName) {
    return "A Production Standard with this finished-product name already exists. Edit the existing standard instead.";
  }

  const duplicateItemId = getProductionMasterItems().some(
    (item) =>
      item.itemId === standard.linkedItemId &&
      item.itemId !== existingStandard?.linkedItemId
  );

  if (duplicateItemId) {
    return `Item ID ${standard.linkedItemId} already exists in the Master List.`;
  }

  return "";
}

function upsertFinishedProductInMasterList(standard, existingStandard = null) {
  const masterItems = getProductionMasterItems();
  const existingIndex = masterItems.findIndex(
    (item) => item.itemId === (existingStandard?.linkedItemId || standard.linkedItemId)
  );

  const existingItem = existingIndex >= 0 ? masterItems[existingIndex] : null;
  const operatingAreas = Array.from(
    new Set([
      ...(Array.isArray(existingItem?.operatingAreas)
        ? existingItem.operatingAreas
        : String(existingItem?.operatingArea || "")
            .split(",")
            .map((area) => area.trim())
            .filter(Boolean)),
      "Commissary"
    ])
  );

  const finishedProductItem = {
    ...(existingItem || {}),
    operatingAreas,
    operatingArea: operatingAreas.join(", "),
    department: standard.department,
    section: standard.section,
    itemId: standard.linkedItemId,
    officialItemName: standard.productName,
    unit: standard.baseUnit,
    minimumStock: standard.minimumStock,
    active: standard.active,
    notes:
      standard.notes ||
      existingItem?.notes ||
      "Finished product linked to Production Standards.",
    itemType: "Finished Product",
    productionStandardId: standard.standardId
  };

  if (existingIndex >= 0) {
    masterItems[existingIndex] = finishedProductItem;
  } else {
    masterItems.push(finishedProductItem);
  }

  saveProductionMasterItems(masterItems);
}

function saveProductionStandardFromForm(event) {
  event.preventDefault();
  syncProductionIngredientDraftFromRenderedRows();

  const existingStandard = getEditingProductionStandard();
  const standard = buildSavedProductionStandard(existingStandard);
  const validationMessage = validateProductionStandard(standard, existingStandard);

  if (validationMessage) {
    showProductionModal({
      type: "warning",
      title: "Cannot Save Standard",
      message: validationMessage,
      confirmLabel: "Review"
    });
    return;
  }

  const standards = getProductionStandards();
  const updatedStandards = existingStandard
    ? standards.map((candidate) =>
        candidate.standardId === existingStandard.standardId ? standard : candidate
      )
    : [...standards, standard];

  saveProductionStandards(updatedStandards);
  upsertFinishedProductInMasterList(standard, existingStandard);
  resetProductionFormState();
  refreshProductionPage();

  showProductionModal({
    type: "success",
    title: existingStandard ? "Standard Updated" : "Production Standard Saved",
    message: `${standard.productName} is now linked to Master List item ${standard.linkedItemId}. No stock was added.`,
    confirmLabel: "Continue"
  });
}

function setupProductionEvents() {
  document.querySelectorAll("[data-production-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      window.DMC_PRODUCTION_ACTIVE_TAB = button.dataset.productionTab;
      resetProductionFormState();
      refreshProductionPage();
    });
  });

  const openFormButton = document.getElementById("open-production-standard-form");
  if (openFormButton) {
    openFormButton.addEventListener("click", () => {
      window.DMC_PRODUCTION_EDITING_STANDARD_ID = null;
      window.DMC_PRODUCTION_FORM_OPEN = true;
      initializeProductionIngredientDraft();
      refreshProductionPage();
    });
  }

  const cancelButton = document.getElementById("cancel-production-standard-form");
  if (cancelButton) {
    cancelButton.addEventListener("click", () => {
      resetProductionFormState();
      refreshProductionPage();
    });
  }

  const departmentSelect = document.getElementById("production-department");
  const sectionSelect = document.getElementById("production-section");
  departmentSelect?.addEventListener("change", updateProductionItemIdPreview);
  sectionSelect?.addEventListener("change", updateProductionItemIdPreview);

  const addIngredientButton = document.getElementById("add-production-ingredient");
  addIngredientButton?.addEventListener("click", addProductionIngredientFromForm);

  document.querySelectorAll("[data-remove-production-ingredient]").forEach((button) => {
    button.addEventListener("click", () => {
      syncProductionIngredientDraftFromRenderedRows();
      const index = Number(button.dataset.removeProductionIngredient);
      window.DMC_PRODUCTION_INGREDIENT_DRAFT.splice(index, 1);
      refreshProductionPage();
    });
  });

  document.querySelectorAll("[data-edit-production-standard]").forEach((button) => {
    button.addEventListener("click", () => {
      const standardId = button.dataset.editProductionStandard;
      const standard = getProductionStandards().find(
        (candidate) => candidate.standardId === standardId
      );
      window.DMC_PRODUCTION_EDITING_STANDARD_ID = standardId;
      window.DMC_PRODUCTION_FORM_OPEN = true;
      initializeProductionIngredientDraft(standard);
      refreshProductionPage();
    });
  });

  document.querySelectorAll("[data-remove-production-standard]").forEach((button) => {
    button.addEventListener("click", () => {
      const standardId = button.dataset.removeProductionStandard;
      const standard = getProductionStandards().find(
        (candidate) => candidate.standardId === standardId
      );

      showProductionConfirm({
        title: "Remove Production Standard?",
        message: `This removes the recipe for ${standard?.productName || "this product"}. The linked Master List item will remain to protect stock and transaction history.`,
        confirmLabel: "Remove Standard",
        onConfirm: () => {
          saveProductionStandards(
            getProductionStandards().filter(
              (candidate) => candidate.standardId !== standardId
            )
          );
          resetProductionFormState();
          refreshProductionPage();
        }
      });
    });
  });

  const form = document.getElementById("production-standard-form");
  form?.addEventListener("submit", saveProductionStandardFromForm);

  updateProductionItemIdPreview();
}

window.DMC_PAGES.production = {
  eyebrow: "Commissary",
  title: "Production",
  description:
    "Create finished-product standards and prepare the workflow for daily production batches.",
  getContent: getProductionContent,
  content: getProductionContent(),
  afterRender: setupProductionEvents
};
