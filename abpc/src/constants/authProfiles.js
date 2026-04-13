export const AUTH_PROFILES = [
  {
    key: "ankit",
    loginLabel: "Ankit Bhatt",
    name: "Ankit Bhatt",
    roleName: "Admin",
    email: "ankbhatt8004@gmail.com",
    password: "merabacchahaitu",
    EmployeeTag: null,
    avatar: "AB",
  },
  {
    key: "akanksha",
    loginLabel: "Akanksha Bhatt",
    name: "Akanksha Bhatt",
    roleName: "Admin",
    email: "bhattakanksha029@gmail.com",
    password: "merabacchahaitu",
    EmployeeTag: null,
    avatar: "AK",
  },
  {
    key: "nakul",
    loginLabel: "Nakul",
    name: "Nakul",
    roleName: "Pest Controller",
    email: "nakul@abpc.local",
    password: "nakul123",
    EmployeeTag: "Nakul",
    avatar: "NK",
  },
  {
    key: "divyesh",
    loginLabel: "Divyesh",
    name: "Divyesh",
    roleName: "Pest Controller",
    email: "divyesh@abpc.local",
    password: "divyesh123",
    EmployeeTag: "Divyesh",
    avatar: "DV",
  },
  {
    key: "sagar",
    loginLabel: "Sagar",
    name: "Sagar",
    roleName: "Pest Controller",
    email: "sagar@abpc.local",
    password: "sagar123",
    EmployeeTag: "Sagar",
    avatar: "SG",
  },
];

export const getProfileByKey = (key) => AUTH_PROFILES.find((p) => p.key === key);

export const isEmployeeRole = (roleKey) =>
  ["nakul", "divyesh", "sagar"].includes(roleKey);

export const PRICING_ADMIN_NAMES = new Set(["Ankit Bhatt", "Akanksha Bhatt"]);

export const EmployeeS = ["Nakul", "Divyesh", "Sagar"];
