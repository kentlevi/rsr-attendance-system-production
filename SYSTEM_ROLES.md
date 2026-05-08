# System Roles & Access Control

This document provides a high-level overview of the access permissions for each distinct user role within the RSR Engineering Attendance System.

## 1. System Administrator (Admin)
The **Admin** holds unrestricted access to all modules and configurations. The Admin is authorized to act on behalf of the company to manage employees, process payroll, approve leaves, configure business settings, and respond to incidents.

### Key Capabilities:
- Full access to the global **Dashboard** metrics and Analytics.
- Ability to **Approve/Reject** leave requests, overtime, undertime, and missing punches (Approvals/Leaves tab).
- Unrestricted access to the **Logs** tab, allowing arbitrary date range queries and history exports.
- **Straight Duty** full management access.
- **Staff** management (Create, Edit, Delete employees, Reset PIN, Upload Face embeddings).
- **Payroll** generation and review capabilities.
- Setting **Incidents** and disciplinary actions.
- Administrative tools including the HR Chatbot, Settings (shift configurations, geofencing coordinates, SMS API), and Admin Profile.

## 2. Admin Assistant (Assistant)
The **Assistant** is a delegated admin role designed for supervisors or dispatch officers who need operational awareness but lack executive HR privileges (such as approving paid leaves or calculating payroll). 

### Key Capabilities:
- **Filtered Dashboard Viewer**: Can see top-level staff summaries, but cannot enforce payroll adjustments.
- **Leave View (Approvals Tab Replacement)**: Assistants have read-only visibility into *all* leave requests (Pending, Approved, Rejected) to schedule work properly around absence, but they **cannot approve or reject** the requests.
- **Today-Only Logs Access**: Assistants can view real-time Attendance Logs, but their query window is strictly locked to `Today`. They cannot browse historical logs.
- **Straight Duty**: Read-only oversight of straight duty personnel assignments.
- **Staff/Employee Context**: Can view employee rosters and schedules, allowing smooth daily coordination.
- **Restricted Access**: The Assistant cannot see Payroll, Settings, global configuration, or Incidents tabs.

## 3. Regular Employee
The **Employee** accesses the system primarily through two interfaces: the Time Clock (Kiosk representation) and the Employee Portal. They only have control and visibility over their personal data.

### Key Capabilities:
- **Employee Portal**: 
  - Access to an individual Dashboard tracking their daily schedule, total hours, and leave balances.
  - Submitting **File Leave** requests (Sick, Vacation, Emergency, Unpaid), powered organically or via AI prompt.
  - Viewing, acknowledging, and downloading structural **Payslips**.
  - Reviewing the **Time History** of their punches.
  - **Reviewing Incidents**: If tagged with an infraction or incident, their workflow is physically blocked until they *Acknowledge* the notice.
- **Time Clock Interface**: Used to physically log in and out of shifts using Biometric Face ID or Backup PIN validations under strict physical Geofencing checks.
