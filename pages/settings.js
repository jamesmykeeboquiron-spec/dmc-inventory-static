import { settingsGroups } from "../data/settingsData.js";

export function renderSettingsPage() {
  const systemSetup = settingsGroups.find((group) => group.id === "system");
  const otherGroups = settingsGroups.filter((group) => group.id !== "system");

  return `
    <section class="page-section">
      <div class="page-header">
        <div>
          <p class="eyebrow">System Configuration</p>
          <h1>Settings</h1>
          <p class="page-description">
            Manage dropdown options and system setup data used across the DMC Inventory app.
          </p>
        </div>
      </div>

      <div class="settings-dashboard">
        <article class="settings-card settings-card-active">
          <div>
            <p class="settings-card-label">Active</p>
            <h2>${systemSetup.title}</h2>
            <p>${systemSetup.description}</p>
          </div>
        </article>

        ${otherGroups
          .map(
            (group) => `
              <article class="settings-card settings-card-disabled">
                <div>
                  <p class="settings-card-label">Coming Soon</p>
                  <h2>${group.title}</h2>
                  <p>${group.description}</p>
                </div>
              </article>
            `
          )
          .join("")}
      </div>

      <div class="settings-content-panel">
        <div class="settings-content-header">
          <div>
            <p class="eyebrow">Active Setup Area</p>
            <h2>System Setup</h2>
            <p>
              These lists will later power dropdowns in the Master List Add Item form.
            </p>
          </div>
        </div>

        <div class="settings-grid">
          ${systemSetup.sections
            .map(
              (section) => `
                <article class="settings-list-card">
                  <div class="settings-list-header">
                    <div>
                      <h3>${section.title}</h3>
                      <p>${section.description}</p>
                    </div>
                    <button class="small-action-button" type="button">Add</button>
                  </div>

                  <div class="settings-chip-list">
                    ${section.items
                      .map((item) => `<span class="settings-chip">${item}</span>`)
                      .join("")}
                  </div>
                </article>
              `
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}
