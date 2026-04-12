# Firebase Setup (ABPC)

## 1) Environment variables
Create `abpc/.env` (do not commit it) using `abpc/.env.example`.

## 2) Firebase Console required services
- **Authentication**: enable **Email/Password**
- **Firestore Database**: create database (production mode is fine; rules are provided)
- **Storage**: enable Storage bucket

## 3) Firestore collections used
Required (per spec):
- `users`
- `jobs`
- `subJobs`
- `reports`
- `priceList`
- `invoices`
- `quotations`
- `mediaUploads`

Also used by existing CRM screens:
- `customers`, `amc`, `messages`, `services`, `counters`

## 4) Create users + roles
In Firestore, create a `users/{uid}` document for each Firebase Auth user with:

- `name`: e.g. `Ankit Bhatt`
- `role`: `admin` or `Employee`
- `EmployeeName`: for Employees, set exactly `Nakul`, `Divyesh`, `Sagar` (used in job/report views)

Pricing admins are recognized by `name` being **Ankit Bhatt** or **Akanksha Bhatt**.

## 5) Deploy rules
- Firestore rules file: `abpc/firestore.rules`
- Storage rules file: `abpc/storage.rules`

Copy/paste these into Firebase Console rules editors (or deploy via Firebase CLI if you add it later).

## 6) Indexes (if prompted by Firestore)
Some queries may require indexes depending on your dataset:
- `jobs`: `assignedTo array-contains` + `createdAt desc`
- `reports`: `timestamp desc`
- `subJobs`: `createdAt desc`

If Firestore shows an index creation link in the console error, create the suggested index.

