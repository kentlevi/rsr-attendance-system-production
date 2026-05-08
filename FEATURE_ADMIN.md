# Admin Dashboard Feature Layout

The Admin Dashboard acts as the central command hub for the RSR Engineering Attendance System. All structural tabs and features dynamically pull live from the Firebase database and interact with each other seamlessly.

## 1. Top Navigation & Global Header
- **Profile Avatar**: Allows the active admin or sub-admin to log out or dive into their personal settings.
- **Dynamic Stats Banner**: Displays critical metrics like `Total Employees`, `Present Today`, `Pending Leaves`, etc.

## 2. Dashboard View
- A comprehensive bird's-eye view presenting:
  - **Today's Attendance Chart**: D3 or Recharts visualization mapping attendance density across the day.
  - **Quick Action Widgets**: Shortcut buttons mapped to frequently accessed functions (e.g., Export logs, File new incident).
  - **Real-Time Staff Presence**: Shows who is currently clocked-in vs. who hasn't arrived.

## 3. Approvals View
- **Attendance Anomalies**: Any log requiring manual oversight (Missing Time-out, Out-of-bounds Geofencing attempt, Unscheduled Overtime or Undertime). Admin selects `Approve` (granting the anomaly) or `Reject` (squashing the request/time).
- **Leave Requests List**: Dedicated sub-section viewing all `Pending` leaves filed by employees through the portal. Validates remaining Sick Leave (SL) or Vacation Leave (VL) balances actively against the employee's DB record before allowing an `Approve` click.

## 4. Logs View
- **Historical Timesheet Data**: Contains every explicit time punch event.
- **Filters**: Arbitrary Date-Range pickers (`From` and `To`), Search terms (by Employee Name or PIN), and filter by Status.
- **Exports**: Quick generate CSV/Excel exports. 
- **Geographic Proof**: Verification of the distance computation for each mobile/tablet time bump directly from the employee's location.

## 5. Payroll Management View
- **Cut-off Generator**: Admins define a `Start Date` and `End Date`. 
- **Calculator Logic**: The system maps all Approved Logs, counts Standard Hours, processes Night Differential allocations based on shift logic, and dynamically docks Undertime/Tardiness against the Daily Base Rate.
- **Allowances & Adjustments**: Applies untaxable flat-rate bonuses.
- **Payslip Release**: Commits the calculated payroll into PDF entries dispatched to individual Employee profiles for claiming.

## 6. Staff / Employee Management
- **Roster Grid**: Displays all personnel including Face ID status, active PIN, and assigned Shift Template.
- **Onboarding / Editing**:
  - Ability to create an employee with specific contact info, base salary, default coordinates, and designated Shift Schedule.
  - **Embedded Biometrics**: Captures active facial encodings required for Face ID logins. 

## 7. Incidents View
- Generates structural constraints (Appraisals, Merits, Infractions, Accidents) upon employees.
- Forces an **Action Required Lock** on the user portal until the incident is acknowledged by the target employee.

## 8. Settings & Configurations View
- **Shift Templating Engine**: Define grace periods, shift durations, scheduled breaks, and night differentiations.
- **Site/Geolocation Enforcement**: Lock down physical boundaries indicating where the engineering crew is actually allowed to clock in (Lat/Lng with radius in meters).
- **Integrations**: SMS/Provider keys, or other external system credentials.
