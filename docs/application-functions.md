# RSR Workforce Suite Application Functions

This document defines the intended functions of the application and the main data each function uses.

## 1. Entry And Session Routing

| Function | Description | Data / Storage |
| --- | --- | --- |
| Welcome screen | Lets users choose Time Clock, Employee Portal, or Management. | Local app navigation |
| Session restore | Keeps logged-in admins and employees on their correct page after refresh. | `sessionStorage.rsr_active_role` |
| Logo navigation | Sends logged-in users back to their own dashboard, not the landing page. | `PageLayout.onLogoClick` |
| Loading screen | Shows first-load brand loading state once per browser session. | `sessionStorage.rsr_app_loaded` |

## 2. Authentication And Access

| Function | Description | Data / Storage |
| --- | --- | --- |
| Admin login | Admin password login with Firebase-backed account data. | `adminAccounts/{admin}` |
| Assistant login | Assistant password login through admin login toggle. | `adminAccounts/{assistant}` |
| Employee facial login | Primary employee login method using registered facial profile records. | `facialRecognitionProfiles`, `employees` |
| Employee manual login | Secondary employee login with employee document ID or email plus PIN. | `employees` |
| Employee suspension guard | Blocks inactive/suspended employees from Employee Portal login and Time Clock punches. | `employees.status` |
| Employee session restore | Restores employee portal session by saved employee ID. | `sessionStorage.rsr_employee_id`, `employees` |
| Logout | Clears the active role and account-specific session keys. | `sessionStorage` |

## 3. Time Clock

| Function | Description | Data / Storage |
| --- | --- | --- |
| Site selection | Selects active work site before clock action. | `settings.sites`, `settings.activeSite` |
| Face verification | Verifies registered employee before punch. | `facialRecognitionProfiles`, `employees` |
| Time In | Creates or updates today’s attendance log with raw actual time-in, adjusted official time-in, photo, and automatic standard lunch deduction when Time In is at or after lunch end. | `attendance` |
| Time Out | Updates today’s attendance log with raw actual time-out, adjusted official time-out, work hours, overtime, and photo. | `attendance` |
| Payroll rules | Calculates late minutes, undertime, overtime, regular OT pay, flat OT allowance, away-site allowance, deductions, gross adjustment, review status, suspicious punch sequence notes, and payroll notes from configured shift rules. | `attendance`, `settings/config`, `employees` |
| Break actions | Records Lunch Out/In and PM Break Out/In timestamps, calculated break duration, and approval status on attendance logs. | `attendance` |
| Incomplete attendance guard | Blocks next-day Time In when a prior attendance record has Time In but no Time Out until admin approval is recorded. | `attendance` |
| Attendance adjustment | Applies configured grace, shift, break, OT, and allowance rules through payroll rule helpers. | Local logic, `settings` |
| Offline sync | Starts background sync for offline punch records when native wrapper support exists. | `SyncService`, `attendance` |

## 4. Employee Portal

| Function | Description | Data / Storage |
| --- | --- | --- |
| Employee dashboard | Shows logged-in employee summary, recent attendance, notifications, and request shortcuts. | `attendance`, `leaves`, `undertime`, `notifications` |
| My Time | Shows employee weekly attendance and overtime chart. | `attendance` |
| File Leave | Validates leave type/date policy, then submits leave request with optional attachment metadata. | `leaves`, Firebase Storage |
| Leave replenishment | Grants +2 Sick Leave and +2 Vacation Leave every 6 months from employee start date, records replenishment history, and schedules daily midnight checks while the app is running. | `employees` |
| Submit Undertime | Submits undertime request with planned/actual time, reason, duration, deduction, and optional attachment metadata. | `undertime`, Firebase Storage |
| Request status | Shows employee leave and undertime requests with status and attachments. | `leaves`, `undertime` |
| Employee notifications | Shows notifications scoped to the current employee or employee-wide notices. | `notifications` |
| Employee profile | Lets employee edit profile details and avatar. | `employees` |

## 5. Admin Dashboard

| Function | Description | Data / Storage |
| --- | --- | --- |
| Dashboard stats | Shows total employees, active today, departments, leave, inactive, undertime, activity, and leave balances. | `employees`, `attendance`, `undertime`, `notifications` |
| Pending requests modal | Reviews pending undertime requests and approves/rejects them. | `undertime` |
| Attendance and leave approvals | Reviews pending attendance/payroll records and leave requests, lets admin select official Time Out for pending Time Out reviews, applies approve/reject decisions with approval history, deducts paid leave balances on approval, and triggers AWOL recalculation after leave decisions. | `attendance`, `leaves`, `employees` |
| Leave balance modal | Shows employee leave balance snapshot. | `employees` |
| Activity modal | Shows admin/global notification activity. | `notifications` |
| Admin notifications | Shows admin/global notifications only. | `notifications` |

## 6. Attendance Logs

| Function | Description | Data / Storage |
| --- | --- | --- |
| Logs table | Shows attendance logs with filters/search/pagination. | `attendance`, `employees` |
| Export logs | Exports filtered attendance logs as CSV. | Browser download |
| Edit/update log | Updates attendance log records where supported by controller. | `attendance` |
| Photo references | Attendance logs can store time-in/time-out photo data. | `attendance.imageIn`, `attendance.imageOut` |
| Payroll fields | Shows and exports late deduction, undertime deduction, OT pay, away-site allowance, gross adjustment, and review status. | `attendance` |

## 7. Workforce Insights

| Function | Description | Data / Storage |
| --- | --- | --- |
| Workforce filters | Filters attendance by date, site, department, and search. | `attendance`, `employees`, `settings` |
| Attendance overview | Shows daily status per employee. | `attendance`, `employees`, `leaves`, `undertime` |
| Attendance distribution | Shows present/absent/late/on leave/off-site/undertime summary. | Derived from attendance and employee records |
| Undertime summary | Shows pending/approved totals and total undertime. | `undertime` |
| Activity feed | Shows clock-in/site activity. | `attendance` |
| Export report | Exports filtered workforce report as CSV. | Browser download |
| Payroll insights | Uses computed attendance payroll fields for site allowance and undertime values instead of hardcoded amounts. | `attendance` |
| Refresh | Reloads filtered workforce view from current subscribed data. | Local state |

## 8. Photos

| Function | Description | Data / Storage |
| --- | --- | --- |
| Photo review | Reviews time-in/time-out verification photos from attendance logs. | `attendance.imageIn`, `attendance.imageOut` |
| Export photos report | Exports filtered photo metadata as CSV. | Browser download |
| Clear photos | Clears photo fields for filtered attendance logs. | `attendance` |

## 9. Staff Management

| Function | Description | Data / Storage |
| --- | --- | --- |
| Staff list | Shows employee records with filtering and search. | `employees` |
| Add employee | Creates employee record and optional facial enrollment. | `employees`, `facialRecognitionProfiles` |
| Edit employee | Updates employee profile/employment/account fields. | `employees` |
| Employee details | Shows overview, employment, access, and log reference tabs. | `employees` |
| Activate/deactivate | Toggles employee status and stores suspension/reinstatement audit history. | `employees.status`, `employees.statusHistory` |
| Reset access | Generates a new PIN and clears facial profile reference. | `employees` |
| Delete employee | Deletes employee record after confirmation. | `employees` |
| Import CSV | Imports employee rows from CSV template. | `employees` |
| Export staff list | Exports current employee list as CSV. | Browser download |
| Download template | Downloads staff import CSV template. | Browser download |

## 10. Settings

| Function | Description | Data / Storage |
| --- | --- | --- |
| Site settings | Manages active site and site list. | `settings/config` |
| Shift schedule | Manages shift start/end and break windows. | `settings/config` |
| Grace period | Manages time-in grace period. | `settings/config` |
| Allowances | Manages daily, overtime, and away-site allowance values/rules. | `settings/config` |
| Auto timeout rule | Manages timeout rule text/configuration. | `settings/config` |
| SMS settings | Manages SMS enabled flag, API key, sender name, admin mobile, and notification group. | `settings/config` |
| Save settings | Persists updated configuration. | `settings/config` |
| Test SMS | Sends a test SMS through backend endpoint and logs result where supported. | Backend API, `sms_logs` |
| AWOL check | Calculates consecutive absences from attendance logs, excludes approved leave/LWP, runs after leave approval decisions, sends escalation SMS, and suspends employees on Day 3 with suspension audit fields. | `employees`, `attendance`, `leaves`, `sms_logs` |

## 11. SMS Logs

| Function | Description | Data / Storage |
| --- | --- | --- |
| SMS logs table | Shows outbound SMS communication logs. | `sms_logs` |
| SMS filters | Filters by department, position, status, and search. | `sms_logs`, `employees` |
| Refresh logs | Reloads SMS logs from service/subscription. | `sms_logs` |
| Export logs | Exports filtered SMS logs as CSV. | Browser download |

## 12. Profile Management

| Function | Description | Data / Storage |
| --- | --- | --- |
| Admin profile | Admin/assistant profile information and avatar editing. | `adminProfiles`, `adminAccounts` |
| Admin password change | Updates admin/assistant password. | `adminAccounts` |
| Employee profile | Employee personal/profile editing and avatar upload as data URL. | `employees` |

## 13. Notifications

| Function | Description | Data / Storage |
| --- | --- | --- |
| Admin notifications | Admin/global notifications shown in admin shell and dashboard. | `notifications.targetRole = admin/all` |
| Employee notifications | Employee-specific and employee-wide notifications shown in Employee Portal. | `notifications.employeeId`, `notifications.targetRole = employee/all` |
| Mark all as read | Marks visible notification records as read through service call. Current service marks all records unless further scoped. | `notifications` |
| Clear all | Clears notification records through service call. Current service clears all records unless further scoped. | `notifications` |

## 14. Firebase Data Collections

| Collection | Purpose |
| --- | --- |
| `employees` | Employee master records, PINs, status, profile, leave balances, and facial profile reference |
| `attendance` | Daily attendance logs, times, photos, hours, overtime, status, location, and payroll adjustment fields |
| `leaves` | Employee leave requests |
| `undertime` | Employee undertime requests |
| `facialRecognitionProfiles` | Stored face enrollment sample references/data for browser demo verification |
| `notifications` | Admin, employee, and global notifications |
| `settings/config` | System settings and policies |
| `sms_logs` | Outbound SMS log records |
| `adminAccounts` | Admin and assistant login/account records |
| `adminProfiles` | Admin and assistant profile records |
| `allowances` | Allowance records where used |

## 15. Known Functional Gaps

- Real biometric matching engine is not implemented; current facial verification is still a browser-demo profile lookup.
- Attendance and leave approval UI is implemented; straight duty approvals still need a dedicated admin workflow.
- Notification `markAllAsRead` and `clearAll` currently act broadly in the service; scoped bulk actions should be added before using them for employee-only bulk operations.
- Firebase Storage rules must be deployed before attachment uploads work in the live Firebase project.
- Admin and employee passwords/PINs are stored as plain text in Firestore records; production should use Firebase Auth or hashed credentials.
