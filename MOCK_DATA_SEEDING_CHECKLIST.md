# Mock Data Seeding Checklist

This checklist outlines the steps to populate our newly connected **Firebase Firestore** with dummy (mock) data. Since we migrated all our features (Employees, Attendance, Leaves, Undertime, Allowances, SMS Logs, Notifications) to use the live Firestore database, the previously static mock data is no longer there. 

To properly test the application, we need to create seed scripts to inject realistic dummy data directly into Firestore.

## 1. Authentication & Users
- [x] Create a single `SeedDummyEmployee` inline component to quickly add a dummy employee for testing the Employee Portal login (Completed!).
- [x] Create a Node.js script (`scripts/seed-employees.ts`) to bulk-insert 10-20 realistic employees across different departments with varying balances and profiles.

## 2. Admin & Manager Hierarchy
- [x] Create default Admin accounts with usernames and safe default passwords in the `adminAccounts` collection.
- [x] Map Supervisors to specific dummy employees for testing approval features.

## 3. Attendance Logs
- [x] Script to inject at least 2 weeks of historical time logs (`timeIn`, `timeOut`) for multiple employees.
- [x] Sprinkle a few "Late" and "Undertime" logs to trigger dashboard statistics.
- [x] Inject `facialRecognitionProfileId` for simulated face login history.

## 4. Requests (Leave, Undertime)
- [x] Seed "Pending" Leave Requests (Vacation, Sick) to appear in the Admin Approvals View.
- [x] Seed "Approved" and "Rejected" Leaves to show historical records for the Employee Portal.
- [x] Seed "Pending" and "Approved" Undertime Requests.

## 5. Allowances & Deductions
- [x] Provide weekly allowance data for a specific group of dummy employees (e.g., specific departments).
- [x] Add deduction cases (e.g., Unpaid Leaves tracking).

## 6. System Notifications
- [x] Seed historical system notifications (e.g., "Jane requested Sick Leave", "Daily Database Backup completed").
- [x] Emulate SMS Logs showing simulated messages sent via Semaphore (such as AWOL warnings).

---

### How to Execute Seeds
Once the scripts for the above data are written, they can be executed by running a local Node-script (such as `npx tsx scripts/seed-database.ts`) that initializes the Firebase Admin SDK or the standard Firebase App, mapping standard objects to their respective collections.
