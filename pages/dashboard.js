window.DMC_PAGES = window.DMC_PAGES || {};

window.DMC_PAGES.dashboard = {
  eyebrow: "Overview",
  title: "Dashboard",
  description:
    "Static prototype for the DMC Inventory System. The full sidebar is now organized into separate files.",
  content: `
    <section class="grid">
      <div class="card">
        <p>Master Items</p>
        <strong>24</strong>
      </div>

      <div class="card">
        <p>Locations</p>
        <strong>5</strong>
      </div>

      <div class="card">
        <p>Pending Orders</p>
        <strong>3</strong>
      </div>

      <div class="card">
        <p>Ledger Entries</p>
        <strong>12</strong>
      </div>
    </section>

    <section class="panel">
      <h3>Recent Stock Movements</h3>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Item</th>
            <th>Movement</th>
            <th>Location</th>
            <th>Qty</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Today</td>
            <td>Coffee Beans</td>
            <td>Received</td>
            <td>Commissary</td>
            <td>20 bags</td>
            <td><span class="badge">Posted</span></td>
          </tr>
          <tr>
            <td>Today</td>
            <td>Fresh Milk</td>
            <td>Transfer</td>
            <td>BAR</td>
            <td>6 gallons</td>
            <td><span class="badge">Posted</span></td>
          </tr>
          <tr>
            <td>Yesterday</td>
            <td>Paper Cups 12oz</td>
            <td>Usage</td>
            <td>Branch</td>
            <td>150 pcs</td>
            <td><span class="badge">Reviewed</span></td>
          </tr>
        </tbody>
      </table>
    </section>
  `
};
