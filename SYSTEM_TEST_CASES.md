# RSR Engineering Attendance System: Comprehensive Test Cases

This document outlines the testing procedures and validation steps for the core features provided to each role within the system.

## 1. System Administrator Test Cases

### 1.1. Approvals & Leave Management
**Feature Context:** Approving/Rejecting leaves and handling anomalies.
- **Precondition:** Employee has submitted a Vacation Leave (VL) request via their portal; employee has a current VL balance > 0.
- **Action Steps:**
  1. Log in as **Admin**.
  2. Navigate to the **Approvals** tab.
  3. Locate the pending VL request.
  4. Click **Approve**.
- **Expected Result:** The request moves to 'Approved' status, and exactly 1 day is deducted from the requesting employee's VL balance in the database.

### 1.2. Logs & Historical Data
**Feature Context:** Viewing and exporting attendance data.
- **Precondition:** Existing attendance logs span over the last 30 days.
- **Action Steps:**
  1. Navigate to the **Logs** tab.
  2. Set the *From Date* to the 1st of the current month and the *To Date* to today.
  3. Search for a specific employee by name.
- **Expected Result:** The data table filters accurately to show only the target employee's logs within the date range. Export functionality generates a matching CSV file.

### 1.3. Payroll Generation
**Feature Context:** Computing wages, deductions, and night differential.
- **Precondition:** Defined shift templates, base rates, and approved logs exist for a 15-day cutoff.
- **Action Steps:**
  1. Navigate to the **Payroll** tab.
  2. Select the cutoff dates (e.g., 1st to 15th).
  3. Click **Generate Payroll**.
- **Expected Result:** The system accurately calculates `Total Days/Hours`, applies strict deductions for recorded lates/undertimes, adds configured allowances, maps night differential appropriately, and generates a downloadable Payslip PDF.

### 1.4. Incident Management (Disciplinary Actions)
**Feature Context:** Issuing structural constraints that block employee access.
- **Precondition:** Employee exists and has access to their portal.
- **Action Steps:**
  1. Navigate to the **Incidents** tab.
  2. Select an employee and issue a "Severity: High" Infraction.
  3. Log in as the targeted employee and attempt to navigate to the **Payslips** tab.
- **Expected Result:** The employee is physically blocked by an "Action Required" incident modal. The payslips remain locked until the employee physically clicks the **Acknowledge** button. Admin view updates to show "Acknowledged: True."

### 1.5. Geofencing & Settings Configurations
**Feature Context:** Defining operational boundaries.
- **Precondition:** Global settings contain site latitude, longitude, and an allowance radius (e.g., 50 meters).
- **Action Steps:**
  1. Navigate to the **Settings** tab.
  2. Change the boundary `Radius` to `10` meters.
  3. Attempt to clock in using a device situated 25 meters from the target location.
- **Expected Result:** The Time Clock blocks the login attempt with a "Too far from site location" error.

---

## 2. Assistant Role Test Cases

### 2.1. Restricted Leave Visibility
**Feature Context:** Read-only tracking of employee schedules without approval power.
- **Precondition:** Multiple Pending, Approved, and Rejected leaves exist in the database.
- **Action Steps:**
  1. Log in using an **Assistant** account.
  2. Navigate to the **Leave** tab (Approvals equivalent).
- **Expected Result:** The assistant can view all leave statuses but there are **no Action buttons (Approve/Reject)** available.

### 2.2. Constrained Real-Time Logs Viewing
**Feature Context:** Monitoring daily dispatch without digging into history.
- **Precondition:** Logs exist for today, yesterday, and last week.
- **Action Steps:**
  1. Navigate to the **Logs** tab.
  2. Attempt to change the *From Date* or *To Date* to yesterday.
- **Expected Result:** Date input fields are completely disabled and locked to `Today`. Only today's punches are visible.

### 2.3. Structural Tab Exclusions
**Feature Context:** Decoupling operations from executive functions.
- **Action Steps:** Log in as an **Assistant** and look at the sidebar menu.
- **Expected Result:** Tabs for `Payroll`, `Settings`, and `Incidents` do not exist. Direct URL attempts map to restricted access fallbacks.

---

## 3. Employee Portal Test Cases

### 3.1. Filing AI-Assisted Leave
**Feature Context:** Requesting time off natively.
- **Precondition:** Logged in as an employee with available SL balance.
- **Action Steps:**
  1. Navigate to the **File Leave** section.
  2. Use the Gemini AI Chatbot area and type: *"I am sick today, please file an SL for me."*
  3. Confirm the AI parsed the intent.
- **Expected Result:** The AI extracts the correct date (Today), categorizes it as "Sick Leave," and generates a payload. The leave shows up as "Pending" on the user's dashboard.

### 3.2. Acknowledging Appraisals/Incidents
**Feature Context:** Incident blocks.
- **Precondition:** An admin has issued a new incident for the user.
- **Action Steps:**
  1. Log in and attempt to download the latest payslip.
  2. Modal appears enforcing reading the incident log.
  3. Click **I Acknowledge**.
- **Expected Result:** The lock is removed and the user can now download their PDF payslip. The database updates the incident's state instantly.

---

## 4. Time Clock (Kiosk) Test Cases

### 4.1. The Face ID Biometric Bypass
**Feature Context:** Securing check-in authenticity.
- **Precondition:** Employee's face is embedded into the system. Time Clock Geofence is valid.
- **Action Steps:**
  1. Open the Time Clock.
  2. Authenticate through the facial recognition workflow.
- **Expected Result:** The system matches the face matrix against registered embeddings and instantly drops the user into the Action Registry (Clock In / Break / Out). No PIN is required.

### 4.2. State-Based Action Registry
**Feature Context:** Preventing illogical punch sequencing.
- **Precondition:** Employee is verified but hasn't punched in yet.
- **Action Steps:**
  1. Authenticate via PIN.
  2. Review available buttons.
- **Expected Result:** The **Clock In** button is the only logical primary action highlighted. If they click *Clock In*, close the interface, and re-authenticate, the system should now offer **Lunch Out** or **Clock Out** instead of a second *Clock In*.
