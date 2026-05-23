window.DMC_DATA = window.DMC_DATA || {};

window.DMC_DATA.settings = {
  operatingAreas: [
    {
      id: "branch-station",
      name: "Branch/Station"
    },
    {
      id: "commissary",
      name: "Commissary"
    }
  ],

  departments: [
    {
      id: "bar",
      name: "Bar",
      operatingAreaId: "branch-station"
    },
    {
      id: "kitchen",
      name: "Kitchen",
      operatingAreaId: "branch-station"
    },
    {
      id: "dining",
      name: "Dining",
      operatingAreaId: "branch-station"
    },
    {
      id: "commissary",
      name: "Commissary",
      operatingAreaId: "commissary"
    }
  ],

  sections: [
    {
      id: "bar-coffee",
      name: "Coffee",
      departmentId: "bar"
    },
    {
      id: "bar-milk",
      name: "Milk",
      departmentId: "bar"
    },
    {
      id: "bar-syrups",
      name: "Syrups",
      departmentId: "bar"
    },
    {
      id: "bar-powders",
      name: "Powders",
      departmentId: "bar"
    },
    {
      id: "bar-cups-lids",
      name: "Cups & Lids",
      departmentId: "bar"
    },
    {
      id: "bar-supplies",
      name: "Bar Supplies",
      departmentId: "bar"
    }
],

  units: [
    {
      id: "kg",
      name: "kg"
    },
    {
      id: "liters",
      name: "liters"
    },
    {
      id: "pcs",
      name: "pcs"
    },
    {
      id: "pack",
      name: "pack"
    },
    {
      id: "box",
      name: "box"
    },
    {
      id: "case",
      name: "case"
    },
    {
      id: "bag",
      name: "bag"
    },
    {
      id: "bottle",
      name: "bottle"
    }
  ]
};
