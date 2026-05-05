export const DEFAULT_SETTINGS = {
  languages: {
    default: "vi",
    supported: ["vi", "en", "zh", "ja", "ko"],
  },
  production: {
    enable: true,
    minTargetWarning: 80,
  },
  warehouse: {
    enable: true,
    lowStockAlert: true,
    minStock: 100,
  },
  overtime: {
    hourlyRate: 35000,
  },
  mealOptions: [
    "Com ga",
    "Com suon",
    "Mi xao",
    "Bun bo",
  ],
  roles: ["admin", "manager", "worker"],
  machineList: [
    "May may 1 kim",
    "May vat so",
    "May kansai",
    "May dong nut",
    "May ep keo",
  ],
  departments: ["Cat", "May", "QC", "Dong goi", "Kho"],
  productTypes: ["Ao", "Quan", "Non", "Tui"],
} as const;

export type AppSettings = typeof DEFAULT_SETTINGS;
