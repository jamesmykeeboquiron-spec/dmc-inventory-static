export const settingsGroups = [
  {
    id: "system",
    title: "System Setup",
    status: "active",
    description: "Manage the core setup used by the inventory catalog.",
    sections: [
      {
        id: "operatingAreas",
        title: "Operating Areas",
        description: "High-level inventory areas such as Kitchen, Bar, or Packaging.",
        items: ["Kitchen", "Bar", "Packaging", "Cleaning"],
      },
      {
        id: "departments",
        title: "Departments",
        description: "Departments inside each operating area.",
        items: ["Hot Kitchen", "Cold Kitchen", "Beverage", "Dishwashing"],
      },
      {
        id: "sections",
        title: "Sections",
        description: "Smaller sections used to organize inventory items.",
        items: ["Dry Storage", "Chiller", "Freezer", "Prep Area"],
      },
      {
        id: "units",
        title: "Units",
        description: "Measurement units used by inventory items.",
        items: ["pcs", "case", "kg", "g", "liter", "ml", "pack"],
      },
      {
        id: "itemCategories",
        title: "Item Categories",
        description: "General item groupings for catalog organization.",
        items: ["Ingredient", "Packaging", "Cleaning", "Other"],
      },
    ],
  },
  {
    id: "inventory",
    title: "Inventory Setup",
    status: "comingSoon",
    description: "Future setup for stock tracking, movement, and ordering.",
    sections: [
      "Locations",
      "Movement Types",
      "Stock Statuses",
      "Order Statuses",
    ],
  },
  {
    id: "admin",
    title: "Admin Setup",
    status: "comingSoon",
    description: "Future setup for staff access and permission control.",
    sections: [
      "Staff Roles",
      "Access Levels",
      "Permissions",
    ],
  },
  {
    id: "future",
    title: "Future Setup",
    status: "comingSoon",
    description: "Future system controls for suppliers, audits, and reports.",
    sections: [
      "Suppliers",
      "Audit Rules",
      "Report Settings",
    ],
  },
];
