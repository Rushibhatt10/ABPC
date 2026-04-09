export const AUTH_PROFILES = [
  {
    key: "ankit",
    loginLabel: "Ankit Bhatt",
    name: "Ankit Bhatt",
    roleName: "Admin",
    email: "ankit@abpc.local",
    password: "ankit123",
    workerTag: null,
    avatar: "AB",
  },
  {
    key: "akanksha",
    loginLabel: "Akanksha Bhatt",
    name: "Akanksha Bhatt",
    roleName: "Admin",
    email: "akanksha@abpc.local",
    password: "akanksha123",
    workerTag: null,
    avatar: "AK",
  },
  {
    key: "nakul",
    loginLabel: "Nakul",
    name: "Nakul",
    roleName: "Pest Controller",
    email: "nakul@abpc.local",
    password: "nakul123",
    workerTag: "Nakul",
    avatar: "NK",
  },
  {
    key: "divyesh",
    loginLabel: "Divyesh",
    name: "Divyesh",
    roleName: "Pest Controller",
    email: "divyesh@abpc.local",
    password: "divyesh123",
    workerTag: "Divyesh",
    avatar: "DV",
  },
  {
    key: "sagar",
    loginLabel: "Sagar",
    name: "Sagar",
    roleName: "Pest Controller",
    email: "sagar@abpc.local",
    password: "sagar123",
    workerTag: "Sagar",
    avatar: "SG",
  },
];

export const getProfileByKey = (key) => AUTH_PROFILES.find((p) => p.key === key);

export const isWorkerRole = (roleKey) =>
  ["nakul", "divyesh", "sagar"].includes(roleKey);

export const PRICING_ADMIN_NAMES = new Set(["Ankit Bhatt", "Akanksha Bhatt"]);

export const WORKERS = ["Nakul", "Divyesh", "Sagar"];
