# Employee Portal Firebase Wiring Checklist

Use this checklist to execute the Employee Portal Firebase work phase by phase.

## Phase 1: Leave Request Submit Flow

- [x] Confirm the File Leave page has visible submit and cancel actions.
- [x] Wire Submit Request to the Firebase-backed `handleSubmitLeave` function.
- [x] Add required-field validation for leave type, start date, end date, and reason.
- [x] Return the employee to the request/status flow after a successful submit.
- [x] Verify TypeScript with `npm.cmd run lint`.

## Phase 2: Undertime Request Data

- [x] Store planned time out, actual time out, and reason in Firestore.
- [x] Calculate undertime duration from planned and actual time.
- [x] Save a useful `timeLost` value instead of `Calculated by admin`.
- [x] Save a consistent deduction value instead of the hardcoded placeholder.
- [x] Show the saved details in employee and admin request views.
- [x] Verify TypeScript with `npm.cmd run lint`.

## Phase 3: Attachments

- [x] Decide whether leave and undertime attachments should use Firebase Storage.
- [x] Add file input handling for leave attachments.
- [x] Add file input handling for undertime attachments.
- [x] Save attachment metadata or download URLs in Firestore.
- [x] Show attachment links in employee and admin request views.
- [x] Verify TypeScript with `npm.cmd run lint`.

## Phase 4: Employee Authentication

- [x] Replace mock employee quick login with a real employee login method.
- [x] Keep employee session restore aligned with the selected auth approach.
- [x] Remove or clearly gate browser-demo face fallback behavior.
- [x] Confirm employee refresh stays on the Employee Portal.
- [x] Verify TypeScript with `npm.cmd run lint`.

## Phase 5: Face Enrollment Persistence

- [x] Persist face enrollment references in Firebase instead of memory only.
- [x] Remove the fallback that recognizes the first employee automatically.
- [x] Add clear failure states for missing or unmatched enrollment.
- [x] Confirm time clock attendance still writes through `attendanceService`.
- [x] Verify TypeScript with `npm.cmd run lint`.

## Phase 6: Employee-Scoped Notifications

- [x] Add employee targeting fields to notifications if needed.
- [x] Filter Employee Portal notifications by employee or role.
- [x] Keep admin-wide notifications visible only where intended.
- [x] Verify TypeScript with `npm.cmd run lint`.

## Phase 7: Time Clock Payroll Rules

- [x] Add a settings-driven payroll calculation helper for late, undertime, overtime, and away-site allowance.
- [x] Extend attendance logs with optional payroll adjustment fields.
- [x] Calculate late deduction and away-site allowance on Time In.
- [x] Calculate undertime deduction, overtime pay, gross adjustment, and review status on Time Out.
- [x] Include payroll fields in attendance logs and CSV export.
- [x] Use computed payroll fields in Workforce Insights instead of hardcoded amounts.
- [x] Verify TypeScript with `npm.cmd run lint`.
- [x] Verify production build with `npm.cmd run build`.
