# Employee Portal Feature Layout

The Employee Portal provides a secure, self-service channel for individuals to monitor their standing, collect digital paperwork, and resolve administrative tasks remotely.

## 1. Landing Dashboard
- **Welcome Banner**: Displays upcoming assigned shifts and general notice items.
- **Top Metrics Check**:
  - `Hours Worked this week` vs `Target Hours`
  - Current Available `Sick Leaves (SL)`
  - Current Available `Vacation Leaves (VL)`

## 2. Schedule & Upcoming Tab
- Visualization of the user's specific **Shift Template**.
- Breaks down requirements (e.g., standard time in, grace period allowances, designated lunch, and PM breaks).

## 3. Time History (Logs View)
- A personal readout of all timestamps generated from the centralized Time Clock Kiosk.
- Shows anomalies (Lates/Undertimes highlighted in red).
- Employees can identify if they've forgotten to clock-out without pestering HR.

## 4. File Leave Interface
- **Manual Form**: Employee dictates Start Date, End Date, Type (SL/VL/Emergency/Unpaid), and inputs a text reason.
- **Gemini AI Extraction (Chatbot)**: An integrated NLP chatbot feature where the user can just type: *"I'm taking tomorrow off because I have a fever."* 
  - The AI will internally hit a Node.js endpoint, extract "Sick Leave", map "tomorrow" to the physical date, generate the payload, and submit the leave to the Pending Approvals table while notifying the individual of successful submission.

## 5. Payslips & Compensation 
- **Digital Envelope History**: Access a grid of all finalized pay cycles distributed by the Admin.
- **Incident Lock System**: If an Admin registers an Infraction or Disciplinary Action against the employee, this entire tab undergoes a strict block. The user cannot view or download their payslip until an `I Acknowledge` button physically stamps acknowledging the violation.
- **PDF Download Capability**: Structural payslips detailing exact mathematical breakdowns (Overtime, Base, Adjustments, Night Differential, Deductions) exported beautifully through `jspdf` functionality.
