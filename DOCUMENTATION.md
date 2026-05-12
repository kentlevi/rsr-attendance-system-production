# RSR Attendance System: Official Client Guide (Phase 1)

Welcome to the **RSR Attendance & Workforce Management System**. This document provides a comprehensive overview of the features active in **Phase 1**, designed to stabilize your attendance tracking, security, and workforce intelligence.

---

## 🟢 Phase 1: Attendance & Core Management (Active)

### 1. Smart Attendance & Biometrics
The core of the system is a high-security biometric attendance pipeline designed to eliminate "proxy punching" and ensure physical presence.

*   **Facial Recognition**: Uses AI-driven matching with configurable sensitivity. The system scans face embeddings and matches them against a registered master profile.
*   **GPS Geo-Fencing**: Validates that clock-ins/outs occur within the designated site radius.
*   **Photo Verification**: Captures a live photo during every punch, stored in the cloud for administrative audit.
*   **Automatic Time-Out**: A safety rule that automatically clocks out employees who forget to do so after their shift ends plus a grace period.

### 2. Leave & Time-Off Management
A robust workflow for managing employee absences without disrupting operations.

*   **Credit-Based System**: Employees are granted Sick Leave (SL) and Vacation Leave (VL) credits.
*   **Validation Rules**: Prevents filing for leaves that exceed available credits.
*   **Automatic Replenishment**: Every 6 months, the system automatically replenishes leave credits based on company policy.
*   **Approval Workflow**: Managers receive instant notifications to approve or reject requests via the dashboard.

### 3. Disciplinary & Incident Tracking
Maintain a safe and productive environment with built-in reporting.

*   **Incident Logging**: Record Infractions, Accidents, Merits, and Other incidents.
*   **AWOL Detection**: 
    *   **1-2 Days Absence**: Automated SMS reminders sent to the employee.
    *   **3 Consecutive Days**: Automatic **Preventative Suspension** and high-priority alert to management.
*   **Audit Trail**: Every status change (Suspension, Reinstatement) is logged with a mandatory reason and administrative actor.

### 4. Real-Time Notifications
The system keeps the management team informed wherever they are.

*   **Telegram Bot Integration**: Instant HTML-formatted alerts for:
    *   New Leave Requests
    *   Incident Reports (Accidents/Infractions)
    *   AWOL Suspensions
*   **SMS Gateway**: Direct text alerts to employees for attendance reminders and urgent notices.

### 5. Workforce Intelligence (Dashboard)
Transform raw data into actionable management insights.

*   **7-Day Attendance Trend**: A rolling visual chart showing workforce stability and attendance peaks.
*   **Distribution Analytics**: Real-time breakdown of who is Present, Absent, on Leave, or at an Away-Site.
*   **Undertime Summary**: Tracks lost productivity hours and identifies frequent early departures.
*   **Live Activity Feed**: A real-time stream of every clock-in and site activity across the company.

---

## 🟡 Phase 2: Payroll & Advanced Automation (Coming Soon)

The following features are architected and ready for activation in the next release phase:

*   **Automated Payroll Aggregation**: Pulls data from logs, leaves, and infractions to calculate net pay.
*   **Night Shift Differential**: Automated 10% premium for hours worked between 10 PM and 6 AM.
*   **Disciplinary Deductions**: Automated fines (₱500/₱200) based on validated infraction logs.
*   **Digital Payslips**: Professional PDF generation with itemized earnings and deductions.
*   **Allowance Management**: Site-specific and OT allowance automation.

---

**RSR Engineering & Management Team**  
*Precision in Attendance. Excellence in Management.*
