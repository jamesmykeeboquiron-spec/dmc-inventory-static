const fallbackPages = {
  "activity-log": {
    eyebrow: "Overview",
    title: "Activity Log",
    description: "Tracks recent user and inventory activity across the system."
  },

  reports: {
    eyebrow: "Overview",
    title: "Reports",
    description:
      "Future home for daily summaries, monthly audits, stock value, and usage reports."
  },

  "master-list": {
    eyebrow: "System",
    title: "Master List",
    description:
      "The main item catalog for ingredients, packaging, cleaning supplies, and other inventory items."
  },

  "warehouse-dashboard": {
    eyebrow: "Warehouse",
    title: "Warehouse Dashboard",
    description:
      "Overview of warehouse stock alerts, low stock items, pending orders, and warehouse movement activity."
  },

  "warehouse-stock": {
    eyebrow: "Warehouse",
    title: "Warehouse Stock",
    description:
      "Shows actual warehouse stock based on supplier receiving, transfers, waste, and adjustments."
  },

  "supplier-receiving": {
    eyebrow: "Warehouse",
    title: "Supplier Receiving",
    description:
      "Records items received from suppliers into the warehouse."
  },

  "warehouse-log-transaction": {
    eyebrow: "Warehouse",
    title: "Warehouse Log Transaction",
    description:
      "Records warehouse receiving, transfer out, waste, adjustment, and stock movement activity."
  },

  "commissary-stock": {
    eyebrow: "Commissary",
    title: "Commissary Stock",
    description:
      "Tracks stock available inside the commissary production center."
  },

  "commissary-dashboard": {
    eyebrow: "Commissary",
    title: "Commissary Dashboard",
    description:
      "Overview of commissary stock, production needs, orders, and finished product activity."
  },

  "commissary-orders": {
    eyebrow: "Commissary",
    title: "C. Place Orders",
    description:
      "Allows the commissary to order raw materials or needed stock from the warehouse."
  },

  "commissary-log-transaction": {
    eyebrow: "Commissary",
    title: "Commissary Log Transaction",
    description:
      "Records commissary receiving, usage, waste, production movement, and adjustments."
  },

  "finished-product-transfer": {
    eyebrow: "Commissary",
    title: "Finished Product Transfer",
    description:
      "Records finished products made by commissary and transferred back to warehouse."
  },

  production: {
    eyebrow: "Commissary",
    title: "Production",
    description:
      "Area for commissary production batches, prep output, and internal usage."
  },

  "branch-orders": {
    eyebrow: "Warehouse",
    title: "Branch Orders",
    description:
      "Shows branch and commissary requests waiting for warehouse review, preparation, and fulfillment."
  },

  "delivery-issues": {
    eyebrow: "Warehouse",
    title: "Delivery Issues",
    description:
      "Review delivery variances before deciding whether items are waste, returned stock, missing, or input error."
  },

  "purchase-orders": {
    eyebrow: "Warehouse",
    title: "Purchase Orders",
    description:
      "Tracks supplier purchase orders and external purchasing needs for warehouse stock."
  },

  "shopping-list": {
    eyebrow: "Warehouse",
    title: "Shopping List",
    description:
      "A practical list of items to buy based on low stock, branch needs, commissary needs, and manual requests."
  },

  "delivery-log": {
    eyebrow: "Warehouse",
    title: "Delivery Log",
    description:
      "Tracks deliveries sent from warehouse to commissary, branches, or received from suppliers."
  },

  "branch-dashboard": {
    eyebrow: "DMC-Iriga Branch",
    title: "Branch Dashboard",
    description:
      "Overview of one branch location, including stock status, pending orders, and incoming deliveries."
  },

  "branch-stock": {
    eyebrow: "DMC-Iriga Branch",
    title: "Branch Stock",
    description: "Tracks current stock available at the branch level."
  },

  "place-order": {
    eyebrow: "DMC-Iriga Branch",
    title: "Place Order",
    description: "Allows a branch to request stock from warehouse."
  },

  "incoming-deliveries": {
    eyebrow: "DMC-Iriga Branch",
    title: "Incoming Deliveries",
    description: "Shows deliveries expected or received by the branch."
  },

  "branch-log-transaction": {
    eyebrow: "DMC-Iriga Branch",
    title: "Branch Log Transaction",
    description:
      "Records branch usage, waste, adjustments, receiving, and transfers."
  },

  "order-history": {
    eyebrow: "DMC-Iriga Branch",
    title: "Order History",
    description: "Shows previous branch orders and their status."
  },

  "staff-access": {
    eyebrow: "System",
    title: "Staff & Access",
    description:
      "Future area for staff profiles, roles, access level, and user permissions."
  },

  settings: {
    eyebrow: "System",
    title: "Settings",
    description:
      "Manage setup categories, reusable dropdown options, units, people, and system preferences."
  },

  ledger: {
    eyebrow: "System",
    title: "Ledger",
    description:
      "Complete inventory movement history across warehouse, commissary, and branches."
  }
};

window.DMC_CURRENT_PAGE = window.DMC_CURRENT_PAGE || "dashboard";

window.DMC_MODAL_STATE = window.DMC_MODAL_STATE || {
  open: false,
  type: "info",
  title: "",
  message: "",
  confirmLabel: "OK",
  cancelLabel: "",
  onConfirm: null
};

function getPages() {
  return {
    ...fallbackPages,
    ...(window.DMC_PAGES || {})
  };
}

function getComingSoonContent(page) {
  return `
    <section class="coming-soon">
      <div>
        <h3>${page.title}</h3>
        <p>
          This section is connected in the sidebar. We will build its table,
          forms, buttons, and workflow in its own separate page file later.
        </p>
      </div>
    </section>
  `;
}

function renderDmcModal() {
  const modal = window.DMC_MODAL_STATE;

  if (!modal.open) {
    return "";
  }

  const icon =
    modal.type === "success"
      ? "✓"
      : modal.type === "danger" || modal.type === "warning"
      ? "!"
      : "i";

  return `
    <div class="dmc-modal-overlay" id="dmc-modal-overlay">
      <section class="dmc-modal-card ${modal.type}" id="dmc-modal-card">
        <button class="dmc-modal-close" id="dmc-modal-close" type="button">
          ×
        </button>

        <div class="dmc-modal-icon">
          ${icon}
        </div>

        <div class="dmc-modal-content">
          <h3>${modal.title || "Notice"}</h3>
          <p>${modal.message || ""}</p>
        </div>

        <div class="dmc-modal-actions">
          ${
            modal.cancelLabel
              ? `
                <button class="ghost-button" id="dmc-modal-cancel" type="button">
                  ${modal.cancelLabel}
                </button>
              `
              : ""
          }

          <button
            class="primary-button ${
              modal.type === "danger" ? "danger-action" : ""
            }"
            id="dmc-modal-confirm"
            type="button"
          >
            ${modal.confirmLabel || "OK"}
          </button>
        </div>
      </section>
    </div>
  `;
}

function renderGlobalModalOnly() {
  const existingModal = document.getElementById("dmc-modal-root");

  if (existingModal) {
    existingModal.remove();
  }

  const modalRoot = document.createElement("div");
  modalRoot.id = "dmc-modal-root";
  modalRoot.innerHTML = renderDmcModal();

  document.body.appendChild(modalRoot);

  bindDmcModalEvents();
}

function closeDmcModal() {
  window.DMC_MODAL_STATE = {
    open: false,
    type: "info",
    title: "",
    message: "",
    confirmLabel: "OK",
    cancelLabel: "",
    onConfirm: null
  };

  renderGlobalModalOnly();
}

function bindDmcModalEvents() {
  const modal = window.DMC_MODAL_STATE;

  const overlay = document.getElementById("dmc-modal-overlay");
  const card = document.getElementById("dmc-modal-card");
  const closeButton = document.getElementById("dmc-modal-close");
  const cancelButton = document.getElementById("dmc-modal-cancel");
  const confirmButton = document.getElementById("dmc-modal-confirm");

  if (overlay) {
    overlay.addEventListener("click", closeDmcModal);
  }

  if (card) {
    card.addEventListener("click", (event) => {
      event.stopPropagation();
    });
  }

  if (closeButton) {
    closeButton.addEventListener("click", closeDmcModal);
  }

  if (cancelButton) {
    cancelButton.addEventListener("click", closeDmcModal);
  }

  if (confirmButton) {
    confirmButton.addEventListener("click", () => {
      const onConfirm = modal.onConfirm;

      closeDmcModal();

      if (typeof onConfirm === "function") {
        onConfirm();
      }
    });
  }
}

window.DMC_SHOW_MODAL = function ({
  type = "info",
  title = "Notice",
  message = "",
  confirmLabel = "OK"
}) {
  window.DMC_MODAL_STATE = {
    open: true,
    type,
    title,
    message,
    confirmLabel,
    cancelLabel: "",
    onConfirm: null
  };

  renderGlobalModalOnly();
};

window.DMC_CONFIRM_MODAL = function ({
  type = "danger",
  title = "Are you sure?",
  message = "",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm = null
}) {
  window.DMC_MODAL_STATE = {
    open: true,
    type,
    title,
    message,
    confirmLabel,
    cancelLabel,
    onConfirm
  };

  renderGlobalModalOnly();
};

function renderPage(pageId) {
  const pages = getPages();
  const page = pages[pageId];

  if (!page) {
    console.warn(`Page not found: ${pageId}`);
    return;
  }

  window.DMC_CURRENT_PAGE = pageId;

  document.getElementById("page-eyebrow").textContent = page.eyebrow;
  document.getElementById("page-title").textContent = page.title;
  document.getElementById("page-description").textContent = page.description;

  const pageContent =
    typeof page.getContent === "function"
      ? page.getContent()
      : page.content || getComingSoonContent(page);

  document.getElementById("page-content").innerHTML = pageContent;

  if (typeof page.afterRender === "function") {
    page.afterRender();
  }

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active");
  });

  const activeLink = document.querySelector(`[data-page="${pageId}"]`);

  if (activeLink) {
    activeLink.classList.add("active");
  }

  renderGlobalModalOnly();
}

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    renderPage(link.dataset.page);
  });
});

renderPage("dashboard");
