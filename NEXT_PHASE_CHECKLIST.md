# Next Phase Project Checklist

With the core mock data replaced with full Firestore functionality (data seeding completed for Employees, Admins, Logs, Requests, and Allowances), the platform is fully transitioned into a dynamic state. 

Here are the recommended objectives for our next phase (Phase 2), aimed at hardening the application and finalizing end-to-end features:

## 1. Automated Cron Jobs & Cloud Functions
*Our current system simulates scheduled behavior directly from client-side logic. To be production-ready, we need server-authoritative jobs.*
- [x] **Midnight Leave Replenishment:** Move leave resetting logic to a Firebase Schedule Function.
- [x] **Daily AWOL Detection:** Offload `AwolService` from client sync to a nightly Cloud Function that scans absent employees and dispatches SMS auto-warnings.
- [x] **Bi-Monthly Allowance Distribution:** Run a scheduled task every 15th and 30th to bulk-generate Allowance records for active employees.

## 2. True Facial Recognition (Optional)
*Instead of returning the latest seeded mock face encoding profile, we can integrate an API.*
- [x] Integrate a live Face API (e.g., FaceAPI.js or AWS Rekognition) to scan base64 frames from the webcam.
- [x] Create an "Enroll Face" Admin flow directly from the Employee Profile settings (capture 3 angles and store true facial markers).

## 3. Real-Time Data Exporting & Reports
*Admins need ways to digest this data for payroll encoding.*
- [x] **CSV Payroll Export:** Generate downloadable `.csv` files inside the Allowances and Undertime admin views calculating net pay vs deductions.
- [x] **Attendance Recap Export:** Excel export of 15/30 timesheets to give raw data cleanly to upper management.
- [x] **Dashboard Charts Integration:** Swap static metrics on `AdminDashboard.tsx` with aggregated summaries fetched using robust Firestore aggregation queries.

## 4. Role-Based Access Control (RBAC) Hardening
*We need to protect write actions from being spoofed.*
- [x] Implement robust `firestore.rules` (Security Rules) protecting `adminAccounts` against non-admin rewrites. *(Rules written to file, ready for Firebase Auth migration)*
- [x] Restrict `allowance` updates to `role: "Admin"` only (Regular `HR` shouldn't edit allowances).
- [x] Verify that an employee logging into the portal can ONLY fetch their own requests (`request.auth.uid == resource.data.employeeId`).

## 5. Deployment Preparations
- [x] Purge any remaining dummy `console.logs`.
- [x] Enhance loading states for a seamless visual experience.
- [x] Add Custom Domain and set up real OAuth / Authentication tokens. *(Requires Firebase Console Configuration)*

Let me know which item (or specific task) you'd like to tackle next!
