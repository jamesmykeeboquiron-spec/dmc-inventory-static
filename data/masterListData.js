window.DMC_DATA = window.DMC_DATA || {};

window.DMC_DATA.masterList = {
  departments: [
    {
      id: "bar",
      name: "Bar",
      description:
        "Inventory catalog for beverage station items, bar ingredients, milk, coffee, cups, lids, syrups, and bar supplies.",
      sections: ["Coffee", "Milk", "Syrups", "Powders", "Cups & Lids", "Bar Supplies"]
    },
    {
      id: "kitchen",
      name: "Kitchen",
      description:
        "Inventory catalog for kitchen ingredients, proteins, produce, dry goods, sauces, packaging, and kitchen supplies.",
      sections: []
    },
    {
      id: "dining",
      name: "Dining",
      description:
        "Inventory catalog for dining room service supplies, napkins, utensils, table supplies, guest supplies, and cleaning items.",
      sections: []
    },
    {
      id: "commissary",
      name: "Commissary",
      description:
        "Inventory catalog for commissary bulk items, production supplies, prepared items, transfer packaging, and storage supplies.",
      sections: []
    }
  ],

  items: [
    {
      inventoryLayer: "Branch/Station",
      department: "BAR",
      section: "Coffee",
      itemId: "BAR-COF-001",
      officialItemName: "Coffee Beans",
      unit: "kg",
      minimumStock: "",
      active: true,
      notes: ""
    },
    {
      inventoryLayer: "Branch/Station",
      department: "BAR",
      section: "Milk",
      itemId: "BAR-MLK-001",
      officialItemName: "Condensed Milk",
      unit: "liters",
      minimumStock: "",
      active: true,
      notes: ""
    }
  ]
};
