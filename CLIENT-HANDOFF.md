# Client Handoff & Setup Guide

## 1. Firebase Project Setup Checklist

- [ ] Create a new Firebase project at [console.firebase.google.com](https://console.firebase.google.com/).
- [ ] Enable Firestore (Native mode).
- [ ] Enable Firebase Storage (for attendance photos, if opted in).
- [ ] Enable Authentication (Email/Password or Google Sign-In).
- [ ] Copy the Firebase config object into the `firebase-applet-config.json` or `.env` files.

## 2. Admin-Claim Assignment Checklist

- [ ] Register the first user account.
- [ ] By default, the system might not grant admin rights. You will need to manually set `role: 'admin'` in custom claims or bootstrap using an admin script.
- [ ] Ensure the admin user can access the Settings and Staff Management dashboards.

## 3. Firestore/Storage Rules Deployment Checklist

- [ ] Deploy `firestore.rules` via Firebase CLI: `firebase deploy --only firestore:rules`.
- [ ] Deploy `storage.rules` via Firebase CLI: `firebase deploy --only storage:rules`.
- [ ] Verify that employees can only write their own attendance.
- [ ] Verify that admins can read all attendance and modify settings.

## 4. Install/Setup Checklist Per Client

- [ ] Add all sites to the System Settings (Site Coordinates & Geofences).
- [ ] Set up default shift rules, grace periods, and lunch rules.
- [ ] Configure or disable SMS/Telegram if not needed.
- [ ] Decide on photo storage: opt-in to Firebase Storage or keep photos purely local to kiosks.

## 5. Offline Test Checklist

- [ ] Turn off Wi-Fi on the time clock tablet/PC.
- [ ] Successfully punch in (Time In) an employee.
- [ ] Ensure the success message is displayed.
- [ ] Check the "Pending Sync" counter at the bottom of the Time Clock screen.
- [ ] Restart the browser/tab and confirm the pending punch is not lost.

## 6. Sync Recovery Test Checklist

- [ ] Re-enable Wi-Fi.
- [ ] Wait up to 30 seconds for the auto-sync interval.
- [ ] Verify that the "Pending Sync" counter goes to 0 safely.
- [ ] Verify in the Logs page that the punch correctly shows up with the accurate offline timestamp.
- [ ] Ensure no duplicate tickets were created upon sync.

## 7. Monthly Export/Cleanup Checklist

- [ ] Go to the Settings page and locate the "Cloud Storage" section.
- [ ] Perform a "Dry-Run" cleanup to estimate how many records over the retention policy can be safely purged.
- [ ] Use the Export button on the Payroll or Attendance Logs view to secure a CSV/PDF backup of the current month.
- [ ] Run the cleanup task to save Firebase free tier quota. Wait for completion.
