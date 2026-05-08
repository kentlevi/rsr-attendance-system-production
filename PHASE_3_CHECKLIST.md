# Phase 3: Advanced Operations & Productivity

With Phase 2 out of the way, the system now has stable cloud functions, facial recognition logic, data exports, and secured rules. Moving forward, we should focus on elevating the application into a comprehensive HR and Operations tool, taking full advantage of the React and Node.js stack.

Here is the proposed checklist for the next level of features:

## 1. Complete Payroll System & PDF Payslips
*While we have CSV exports, employees need official records of their pay calculations.*
- [x] **Employee Financial Profiles:** Expand the Employee model to include base salary/rate, tax identifiers, and mandatory deductions (e.g., SSS, PhilHealth, Pag-IBIG).
- [x] **Payroll Cut-Off Management:** Create an Admin view to generate, lock, and archive bi-weekly/monthly payroll periods.
- [x] **Digital Payslips:** Implement PDF generation inside the Employee Portal so engineers can download their finalized payslips natively.

## 2. Geofencing & Location-Based Time Logs
*Particularly useful for engineers reporting directly to external construction sub-sites.*
- [x] **Site Coordinates:** Add longitude/latitude and radius definitions for "Site A", "Site B", etc., inside Admin Settings.
- [x] **Geolocation Verification:** Tie the browser's Geolocation API into the `TimeClock.tsx` screen.
- [x] **Map Analytics:** Add visual map markers in the Admin `LogsView` to verify exactly where an employee was physically located during their time-in punch.

## 3. Dynamic Shift Scheduling (Rosters)
*Not all engineers follow a strict 8 AM - 5 PM shift. We need variations.*
- [x] **Custom Shifts:** Allow admins to define multiple shift templates (Night Shift, Flexi-Time, Split Shift).
- [x] **Roster Assignments:** Allow assigning specific shifts per day, per week, or per employee.
- [x] **Night Differential & OT:** Adjust the attendance calculation logic to handle overnight shifts and automated night-differential bonuses.

## 4. AI HR Assistant (Chatbot Integration)
*We already have an AI endpoint for leave parsing; let's expand it into a full assistant.*
- [x] **Conversational Interface:** Add a floating AI widget inside the Employee Portal.
- [x] **Data Grounding:** Pass the employee's current leave balances and schedule to the AI, allowing it to answer queries like *"How many sick leaves do I have left?"*
- [x] **Action Execution:** Use Gemini Function Calling so the AI can automatically submit Leaves, request Allowances, or log Undertimes purely via conversation.

## 5. Performance Appraisals & Incident Reports
- [x] **Admin Incident Logging:** Create an admin view to log minor infractions, accident reports, or performance merits.
- [x] **Employee Acknowledgement:** Force employees to acknowledge new incident reports in their portal before they can view their payslips.
