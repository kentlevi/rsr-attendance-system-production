import { employeeService } from './EmployeeService';
import { attendanceService } from './AttendanceService';
import { leaveService } from './LeaveService';
import { calculateAbsenceStreak } from '../lib/AbsenceRules';
import { getEmployeeStatusTransitionUpdate } from '../lib/EmployeeStatusRules';

class AwolService {
  async processAwolAlerts() {
    console.log("Checking for AWOL statuses...");
    
    // In a production application, this would run on a Node.js backend using Firebase Admin SDK
    // and Firebase Functions schedule or a CRON job. For this prototype, we simulate the logic.
    
    try {
      const employees = employeeService.getAllEmployeesSync();
      const attendanceLogs = attendanceService.getAllLogs().map((log) => log.data);
      const leaveRequests = leaveService.getAllRequests().map((request) => request.data);
      const today = new Date().toISOString().slice(0, 10);
      
      for (const emp of employees) {
        if (emp.data.status === 'Inactive' || emp.data.status === 'On Leave') continue;

        const absence = calculateAbsenceStreak({
          employeeId: emp.data.id,
          today,
          attendanceLogs,
          leaveRequests,
        });

        if (absence.shouldSendSms) {
          await this.sendAwolSms(emp.data, absence.alertDay);
        }

        if (absence.shouldSuspend) {
          await employeeService.updateEmployee(
            emp.data.id,
            getEmployeeStatusTransitionUpdate(emp.data, {
              nextStatus: 'Inactive',
              reason: `AWOL: ${absence.absentDays} consecutive absences on ${today}.`,
              actor: 'System',
            }),
          );
        }
      }
    } catch (e) {
      console.error("AWOL process failed", e);
    }
  }

  async sendAwolSms(employee: any, dayOfAbsence: number) {
    if (!employee.phone) return;

    let message = "";
    if (dayOfAbsence === 1) {
      message = `Notice: Dear ${employee.name}, we noticed you are absent today without prior notice. Please contact HR or your direct supervisor immediately.`;
    } else if (dayOfAbsence === 2) {
      message = `Urgent Notice: Dear ${employee.name}, you have been absent for 2 consecutive days. Please explain your absence immediately to avoid disciplinary action.`;
    } else if (dayOfAbsence >= 3) {
      message = `AWOL Notice: Dear ${employee.name}, you have been absent for 3 consecutive days without notice. You are now placed on preventative suspension pending investigation.`;
    }

    try {
      // Call the Semaphore SMS API endpoint implemented in server.ts
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: employee.phone,
          message: message,
          employeeName: employee.name,
          sendername: "RSR-HR"
        })
      });
      const data = await response.json();
      console.log(`AWOL SMS sent to ${employee.name}:`, data);
    } catch (e) {
      console.error(`Failed to send AWOL SMS to ${employee.name}`, e);
    }
  }
}

export const awolService = new AwolService();
