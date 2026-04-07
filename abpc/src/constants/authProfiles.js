export const AUTH_PROFILES = [
  {
    key: "admin",
    loginLabel: "Admin",
    name: "Ankit Bhatt",
    roleName: "Admin",
    email: "ankit.bhatt@abpc.local",
    password: "ankit123",
    workerTag: null,
  },
  {
    key: "p1",
    loginLabel: "P1",
    name: "P1",
    roleName: "Pest Controller 1",
    email: "p1@abpc.local",
    password: "p1",
    workerTag: "P1",
  },
  {
    key: "p2",
    loginLabel: "P2",
    name: "P2",
    roleName: "Pest Controller 2",
    email: "p2@abpc.local",
    password: "p2",
    workerTag: "P2",
  },
];

export const getProfileByKey = (key) => AUTH_PROFILES.find((profile) => profile.key === key);

export const isWorkerRole = (roleKey) => roleKey === "p1" || roleKey === "p2";
