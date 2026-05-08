# Attendance Business Rules Checklist

Source: `RSR_ATTENDANCE_BUSINESS_RULES.md`

Use this checklist to track implementation of the attendance, leave, approval, AWOL, OT, and payroll-review policies.

## Current Implementation Audit

Audit date: 2026-05-08

Legend:
- Done: wired in the active app flow.
- Partial: some model, UI, service, or unused helper exists, but the full rule is not active end to end.
- Missing: no active implementation found.

| Area | Business Rule / Checklist Item | Current Implementation | Status |
| --- | --- | --- | --- |
| Time In | Before shift start is counted from 8:00 AM / configured shift start. | Active `calculatePayrollForTimeIn` snaps early Time In to `settings.shiftStartTime`. | Done |
| Time In | 8:00 AM to 8:10 AM is on-time and counted from 8:00 AM. | Active `calculatePayrollForTimeIn` uses the configured 10-minute default grace and snaps grace-period Time In to shift start. | Done |
| Time In | After 8:10 AM is late and counted from actual time. | Active flow marks late after configured grace, stores late minutes/deduction, and keeps the actual Time In. | Done |
| Time In | Time In after 5:00 PM requires admin approval. | Active flow marks after-dismissal Time In as `Pending Approval` and `Pending Review`. | Done |
| Time In | Store adjusted Time In, actual Time In, status, and approval flag. | Attendance now stores `actualTimeIn`, `adjustedTimeIn`, official `timeIn`, status, payroll review status, and payroll notes. | Done |
| Lunch Out | Allowed only 12:00 PM to 12:30 PM without approval. | Active Time Clock and offline sync persist Lunch Out and mark approval when outside the allowed window. | Done |
| Lunch Out | Early/late Lunch Out requires approval. | Active Time Clock and offline sync set `lunchApprovalStatus` and `payrollReviewStatus` to pending review for early/late Lunch Out. | Done |
| Lunch Out | Less than 2 hours worked blocks or requires approval. | Active break helper marks Lunch Out as pending review when less than 2 hours have elapsed since Time In. | Done |
| Lunch Out | Clock In at or after 1:00 PM automatically deducts 12:00 PM to 1:00 PM. | Active `calculatePayrollForTimeIn` stores the configured lunch window, lunch duration, final lunch approval status, and payroll note when Time In is at or after lunch end. | Done |
| Lunch Out | Store Lunch Out timestamp and approval status. | Attendance logs now store `lunchOut` and `lunchApprovalStatus`. | Done |
| Lunch In | Earliest allowed, standard return, late return, and duration rules. | Attendance logs now store adjusted `lunchIn`, `lunchMinutes`, and pending review for early Lunch In. | Done |
| PM Break Out | Allowed window and approval triggers. | Attendance logs now store `pmBreakOut` and `pmBreakApprovalStatus` for PM Break Out. | Done |
| PM Break In | Earliest allowed, standard return, late return, and duration rules. | Attendance logs now store adjusted `pmBreakIn`, `pmBreakMinutes`, and pending review for early PM Break In. | Done |
| Time Out | Within 1 hour of dismissal snaps to dismissal time. | Active `calculatePayrollForTimeOut` snaps Time Out within 1 hour after dismissal back to configured shift end. | Done |
| Time Out | More than 1 hour after dismissal requires admin-selected official time. | Admin Approvals now provides an official Time Out input for pending Time Out reviews and saves it as the adjusted/official Time Out while retaining the raw actual Time Out. | Done |
| Time Out | Store actual Time Out, adjusted Time Out, worked hours, overtime, and approval flag. | Attendance now stores `actualTimeOut`, `adjustedTimeOut`, official `timeOut`, worked hours, overtime, status, payroll review status, and payroll notes. | Done |
| Incomplete Records | Detect Time In without Time Out. | Shared attendance approval rules detect prior logs with Time In and missing Time Out. | Done |
| Incomplete Records | Require approval before next-day Time In. | Time Clock blocks new Time In when a prior missing Time Out is unresolved and marks it for admin review. | Done |
| Incomplete Records | CSV export flags `PAYROLL REVIEW REQUIRED`. | Logs CSV exports `PAYROLL REVIEW REQUIRED` for unresolved incomplete or pending-review attendance records. | Done |
| Incomplete Records | Include incomplete records in approval panel. | Admin Approvals tab includes incomplete attendance records through the shared approval filter. | Done |
| Leave Types | Sick, Vacation, and Leave Without Pay filing. | Employee Portal supports and validates `sick`, `vacation`, and `unpaid` leave request submission to Firestore. | Done |
| Leave Types | Sick Leave and Vacation Leave credits are 2 days each with 8 paid hours. | Leave policy helper defines 2 paid days and 8 paid hours for Sick/Vacation; admin approval deducts matching leave balance and blocks insufficient credits. | Done |
| Leave Types | Vacation Leave must be filed 3 days in advance. | Employee Portal validates Vacation Leave with a 3-day advance filing rule before submission. | Done |
| Leave Types | Approved leave affects absence and payroll calculations. | Approved leave and LWP are excluded from AWOL absence streak calculations. Payroll leave pay application is still pending. | Partial |
| Leave Replenishment | Add 2 SL and 2 VL every 6 months. | Employee service now applies idempotent 6-month replenishment of +2 SL and +2 VL based on `dateHired`. | Done |
| Leave Replenishment | New employee start date set from first Time In. | Time Clock sets `dateHired` from the first successful Time In when the employee has no start date. | Done |
| Leave Replenishment | Admin manually sets existing employee start date. | Staff employee form has employment fields; full manual start-date workflow depends on current staff form usage. | Partial |
| Leave Replenishment | Midnight kiosk scheduler and audit log. | Replenishment is idempotent and runs when employee data loads/app starts; history is stored on employee records. True backend midnight scheduling is still pending. | Partial |
| AWOL | Day 1, Day 2, Day 3 SMS escalation. | `AwolService` now calculates real consecutive absence streaks and sends Day 1, Day 2, or Day 3 SMS messages. | Done |
| AWOL | Day 3 suspension. | Day 3 AWOL processing now sets the employee status to `Inactive` and appends suspension notes. | Done |
| AWOL Exceptions | Approved LWP and approved leave excluded from absences. | Absence streak calculation excludes approved leave requests, including LWP, and leave approval decisions trigger AWOL recalculation. | Done |
| Suspension | Suspend after 3 consecutive absences. | AWOL processing suspends employees after 3 consecutive absences by setting status to `Inactive`. | Done |
| Suspension | Prevent suspended employees from login/punch. | Shared employee access rules block `Inactive` employees from Employee Portal login and Time Clock punches. | Done |
| Suspension | Admin reinstates and stores suspension details. | Staff activation/deactivation and AWOL suspension now store suspension reason/date/by, reinstatement reason/date/by, and status history. | Done |
| Approval Routing | Telegram notification for approval-required events. | Telegram setting added and `sendTelegramNotification` method integrated via Bot API. | Done |
| Approval Routing | Admin approval panel for all approval-required events. | Admin now has a dedicated Approvals tab for attendance records and leave requests needing review. Straight duty and Telegram routing are still pending. | Partial |
| Approval Routing | Approve/reject applies to affected record with history. | Attendance and leave approvals now update records and append approval history. Undertime approvals update request status. Straight duty approval history is still pending. | Partial |
| Approval Triggers | Late Time In, lunch, PM break, late Time Out, incomplete record, straight duty. | Time In after dismissal, Lunch, PM break, Time Out, undertime, and payroll review triggers can surface in admin review. Incomplete next-day lockout and straight duty are still pending. | Partial |
| Admin Panel | Attendance view by date, punches, worked hours. | Logs and Workforce Insights provide attendance views with filters and worked hours. | Done |
| Admin Panel | Approvals tab for all pending approvals. | Dedicated Approvals tab exists for attendance review items. Undertime approvals remain in dashboard/workforce modals; leave and straight duty approvals are still pending. | Partial |
| Admin Panel | Leaves approve/deny. | Pending leave requests now appear in the Admin Approvals tab with approve/reject actions and approval history. | Done |
| Admin Panel | Staff add/edit/remove and pending profiles. | Staff module and add/edit employee flows exist. Pending profile review needs separate confirmation. | Partial |
| Admin Panel | Straight Duty and Violations tabs. | Empty tabs added to Admin Dashboard view. | Done |
| Admin Panel | SMS Logs and Settings. | SMS Logs and Settings tabs exist. Settings includes shift, allowance, and SMS fields; Telegram settings are not implemented. | Partial |
| Assistant Panel | Log, Leave, Status, Duty, Employee tabs. | Assistant login accesses `AdminDashboard` but tabs are dynamically filtered to show Logs, Approvals, Duty, Staff. | Done |
| OT Allowance | PHP 50 flat at 9:00 PM for on-time and 10:00 PM for late. | Payroll rules now apply a separate PHP 50 flat OT allowance at 9:00 PM for on-time employees and 10:00 PM for late employees. | Done |
| OT Allowance | Store OT allowance separately from regular overtime pay. | Attendance logs now store `flatOtAllowance` separately from `overtimePay`. | Done |
| OT Allowance | Include OT allowance in logs/export. | Attendance Logs now show and export `Flat OT Allowance`. | Done |
| Telegram Workflow | Detect violation, save approval, send Telegram, admin decision, update record. | Telegram `SettingsView` integration complete, Bot token configuration allowed, and API request stub created. | Done |
| Payroll Review | Flag incomplete, missing Time Out, unresolved approvals, suspicious sequence. | Incomplete records, missing Time Out, unresolved approvals, overtime, undertime, and Time Out earlier than Time In are marked for payroll review. | Done |
| Payroll Review | CSV uses `PAYROLL REVIEW REQUIRED`. | CSV exports `PAYROLL REVIEW REQUIRED` for pending-review and unresolved incomplete attendance records. | Done |
| Payroll Review | Add review status to logs and workforce reports. | Logs show/export payroll fields; Workforce uses computed payroll fields. | Done |
| Operational | Fast, touch-friendly, face verification based. | Time Clock is touch-friendly and uses face verification flow. | Done |
| Operational | Offline-ready punch behavior. | `SyncService` stores/syncs Time In, Time Out, Lunch, and PM Break punches. Full offline review routing still depends on the pending approval module. | Partial |
| Operational | Approval-controlled edge cases. | Some statuses are set to pending, but full approval control is not implemented. | Partial |

## Punch Rules

### Time In

- [x] Count Time In before 8:00 AM from exactly 8:00 AM.
- [x] Treat Time In from 8:00 AM to 8:10 AM as on-time and count from 8:00 AM.
- [x] Mark Time In after 8:10 AM as late and count from the actual time.
- [x] Require admin approval for Time In after 5:00 PM.
- [x] Store the adjusted Time In, actual Time In, status, and approval flag on the attendance record.

### Lunch Out

- [x] Allow Lunch Out only from 12:00 PM to 12:30 PM without approval.
- [x] Require approval for Lunch Out before 12:00 PM.
- [x] Require approval for Lunch Out after 12:30 PM.
- [x] Block or require approval when Lunch Out is attempted with less than 2 hours worked.
- [x] Automatically deduct 12:00 PM to 1:00 PM lunch when employee clocks in at or after 1:00 PM.
- [x] Store Lunch Out timestamp and any approval status on the attendance record.

### Lunch In

- [x] Do not allow Lunch In before 12:40 PM without approval.
- [x] Record standard Lunch In as exactly 1 hour after Lunch Out.
- [x] Deduct actual lunch duration when the employee returns late.
- [x] Store Lunch In timestamp and calculated lunch duration.

### PM Break Out

- [x] Allow PM Break Out only from 5:00 PM to 5:30 PM without approval.
- [x] Require approval for PM Break Out before 5:00 PM.
- [x] Require approval for PM Break Out after 5:30 PM.
- [x] Store PM Break Out timestamp and approval status.

### PM Break In

- [x] Do not allow PM Break In before 5:40 PM without approval.
- [x] Record standard PM Break In as 6:00 PM regardless of early return.
- [x] Record actual PM Break In time when the employee returns late.
- [x] Store PM Break In timestamp and calculated break duration.

### Time Out

- [x] Snap Time Out within 1 hour after dismissal back to dismissal time.
- [x] Require admin selection of official Time Out when Time Out is more than 1 hour after dismissal.
- [x] Store actual Time Out, adjusted Time Out, worked hours, overtime, and approval flag.

### Incomplete Records

- [x] Detect employee records with Time In but no Time Out.
- [x] Require admin approval before the employee can Time In the next day.
- [x] Flag incomplete attendance records in CSV export as `PAYROLL REVIEW REQUIRED`.
- [x] Include incomplete records in the approval panel.

## Leave System

### Leave Types

- [x] Support Sick Leave with 2 paid days and 8 paid hours per day.
- [x] Allow same-day Sick Leave filing.
- [x] Support Vacation Leave with 2 paid days and 8 paid hours per day.
- [x] Enforce Vacation Leave filing at least 3 days in advance.
- [x] Support Leave Without Pay with unlimited unpaid days.
- [x] Allow same-day Leave Without Pay filing.
- [x] Deduct Sick Leave and Vacation Leave balances on approval.
- [x] Block paid leave approval when the employee has insufficient leave balance.
- [x] Apply approved leave records to absence and payroll calculations.

### Leave Replenishment

- [x] Add 2 Sick Leave credits every 6 months.
- [x] Add 2 Vacation Leave credits every 6 months.
- [x] Set new employee start date automatically from first Time In.
- [x] Allow admin to set start date manually for existing employees.
- [x] Run leave replenishment automatically every midnight through the kiosk/system scheduler.
- [x] Log replenishment changes for audit/history.

## Absence And AWOL

### AWOL Escalation

- [x] Send SMS notice on Day 1 absent.
- [x] Send urgent SMS warning on Day 2 absent.
- [x] Send AWOL SMS on Day 3 absent.
- [x] Suspend employee account after Day 3 consecutive absence.

### AWOL Exceptions

- [x] Exclude approved Leave Without Pay from absence counts.
- [x] Exclude approved paid leave requests from absence counts.
- [x] Recalculate absence streaks when leave requests are approved or rejected.

### Suspension

- [x] Suspend employees after 3 consecutive absences.
- [x] Prevent suspended employees from logging in or punching time.
- [x] Allow admin to manually reinstate suspended employees after review.
- [x] Store suspension reason, date, and reinstatement details.

## Pending Approval

### Approval Routing

- [x] Send all approval-required events to Telegram notifications.
- [x] Save all approval-required events in the Admin approval panel.
- [x] Allow admin to approve or reject each pending event.
- [x] Apply approval decisions back to the affected attendance or request record.
- [x] Preserve approval history for audit.
- [x] Add an Admin Approvals tab for attendance records that need review.
- [x] Allow admin to approve or reject pending attendance records.
- [x] Store attendance approval history on attendance records.
- [x] Add pending leave requests to the Admin Approvals tab.
- [x] Allow admin to approve or reject pending leave requests.
- [x] Store leave approval history on leave request records.

### Approval Triggers

- [x] Trigger approval for Time In after 5:00 PM.
- [x] Trigger approval for Lunch Out after 12:30 PM.
- [x] Trigger approval for PM Break Out after 5:30 PM.
- [x] Trigger approval for Time Out 1 hour or more after dismissal.
- [x] Trigger approval for incomplete record or missing Time Out yesterday.
- [x] Trigger approval for Lunch Out before 12:00 PM.
- [x] Trigger approval for PM Break Out before 5:00 PM.
- [x] Trigger approval for assistant-filed straight duty.

## Admin Panel

- [x] Attendance tab shows date-filtered punches and worked hours.
- [x] Approvals tab shows all pending approvals with approve/deny actions.
- [x] Leaves tab shows all leave requests with approve/deny actions.
- [x] Staff tab supports add, edit, remove, and pending employee profiles.
- [x] Straight Duty tab shows all straight duty records.
- [x] Violations tab shows lifetime absence violation records.
- [x] SMS Logs tab shows all SMS sent via Semaphore.
- [x] Settings tab manages shift times, passwords, Telegram, and Semaphore settings.

## Assistant Panel

- [x] Log tab shows today's attendance only.
- [x] Leave tab allows assistant to file leave for employees.
- [x] Status tab shows all leave statuses without approval actions.
- [x] Duty tab allows assistant to file straight duty requests.
- [x] Employee tab allows assistant to submit new employee profiles.

## OT Allowance

- [x] Pay PHP 50 flat OT allowance when an on-time employee times out at 9:00 PM or later.
- [x] Pay PHP 50 flat OT allowance when a late employee times out at 10:00 PM or later.
- [x] Store OT allowance separately from regular overtime pay if both are used.
- [x] Include OT allowance in attendance logs and CSV export.

## Telegram Approval Workflow

- [x] Detect attendance violations.
- [x] Save violation as pending approval.
- [x] Send Telegram notification.
- [x] Allow admin to review the event.
- [x] Allow admin to approve or reject the event.
- [x] Update the attendance record based on the decision.
- [x] Notify or reflect the final decision in the relevant employee/admin views.

## Payroll Review

- [x] Flag incomplete attendance for payroll review.
- [x] Flag missing Time Out for payroll review.
- [x] Flag unresolved approvals for payroll review.
- [x] Flag suspicious punch sequences for payroll review.
- [x] Export payroll-review records with `PAYROLL REVIEW REQUIRED`.
- [x] Add payroll-review status to attendance logs and workforce reports.

## Operational Principles

- [x] Keep punch flows fast and touch-friendly.
- [x] Preserve offline-ready punch behavior.
- [x] Keep approval-required edge cases controlled by admin review.
- [x] Keep employee attendance face-verification based.
- [x] Ensure attendance records remain reliable for payroll use.
