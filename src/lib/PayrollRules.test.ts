import assert from 'node:assert/strict';
import { calculateBreakPunchUpdate, calculatePayrollForTimeIn, calculatePayrollForTimeOut } from './PayrollRules';
import { SystemSettings } from '../services/SettingsService';
import { Employee } from '../models/Employee';

const settings: SystemSettings = {
  activeSite: 'Head Office',
  sites: ['Head Office', 'Site A', 'Site B'],
  dailyAllowance: 150,
  otAllowance: 75,
  awaySiteAllowance: 200,
  awaySiteAllowanceRule: 'Apply when employee is assigned outside active site',
  shiftStartTime: '08:00',
  shiftEndTime: '17:00',
  gracePeriodMins: 10,
  lunchBreakStart: '12:00',
  lunchBreakEnd: '13:00',
  pmBreakStart: '15:00',
  pmBreakEnd: '15:15',
  autoTimeoutRule: 'Out automatically after shift end time + grace period',
  smsEnabled: true,
  semaphoreApiKey: '',
  senderName: 'RSR-ATTEND',
  adminMobile: '',
  notificationGroup: 'Attendance Alerts',
  telegramEnabled: false,
  telegramBotToken: '',
  telegramChatId: '',
};

const employee: Employee = {
  id: 'emp-1',
  pin: '1001',
  name: 'Test Employee',
  email: 'test@example.com',
  department: 'Engineering',
  position: 'Staff',
  status: 'Active',
  avatar: '',
  dailyRate: '800',
  workLocation: 'Site A',
};

function pesoAmount(value?: string) {
  return Number(String(value || '').replace(/[^0-9.]/g, ''));
}

const graceTimeIn = calculatePayrollForTimeIn({
  employee,
  actualSite: 'Site A',
  timeIn: '08:05 AM',
  settings,
});

assert.equal(graceTimeIn.adjustedTimeIn, '08:00 AM');
assert.equal(graceTimeIn.actualTimeIn, '08:05 AM');
assert.equal(graceTimeIn.status, 'Present');
assert.equal(graceTimeIn.lateMinutes, 0);

const afterShiftTimeIn = calculatePayrollForTimeIn({
  employee,
  actualSite: 'Site A',
  timeIn: '05:05 PM',
  settings,
});

assert.equal(afterShiftTimeIn.status, 'Pending Approval');
assert.equal(afterShiftTimeIn.payrollReviewStatus, 'Pending Review');

const afterLunchTimeIn = calculatePayrollForTimeIn({
  employee,
  actualSite: 'Site A',
  timeIn: '01:15 PM',
  settings,
});

assert.equal(afterLunchTimeIn.lunchOut, '12:00 PM');
assert.equal(afterLunchTimeIn.lunchIn, '01:00 PM');
assert.equal(afterLunchTimeIn.lunchMinutes, 60);
assert.equal(afterLunchTimeIn.lunchApprovalStatus, 'Final');
assert.equal(afterLunchTimeIn.payrollNotes?.some((note) => note.includes('Lunch automatically deducted')), true);

const timeIn = calculatePayrollForTimeIn({
  employee,
  actualSite: 'Site B',
  timeIn: '08:30 AM',
  settings,
});

assert.equal(timeIn.adjustedTimeIn, '08:30 AM');
assert.equal(timeIn.status, 'Late');
assert.equal(timeIn.lateMinutes, 20);
assert.equal(pesoAmount(timeIn.lateDeduction), 33.33);
assert.equal(timeIn.scheduledSite, 'Site A');
assert.equal(timeIn.actualSite, 'Site B');
assert.equal(pesoAmount(timeIn.awaySiteAllowance), 200);

const timeOut = calculatePayrollForTimeOut({
  employee,
  actualSite: 'Site B',
  timeIn: '08:30 AM',
  timeOut: '06:30 PM',
  settings,
  existingPayroll: timeIn,
});

assert.equal(timeOut.workHours, '7.8h');
assert.equal(timeOut.overtime, '1.0h');
assert.equal(timeOut.undertimeMinutes, 0);
assert.equal(timeOut.overtimeMinutes, 60);
assert.equal(pesoAmount(timeOut.overtimePay), 75);
assert.equal(pesoAmount(timeOut.flatOtAllowance), 0);
assert.equal(pesoAmount(timeOut.grossAdjustment), 241.67);
assert.equal(timeOut.payrollReviewStatus, 'Pending Review');

const onTimeFlatOt = calculatePayrollForTimeOut({
  employee,
  actualSite: 'Site A',
  timeIn: '08:00 AM',
  timeOut: '09:00 PM',
  settings,
});

assert.equal(pesoAmount(onTimeFlatOt.flatOtAllowance), 50);

const lateFlatOt = calculatePayrollForTimeOut({
  employee,
  actualSite: 'Site A',
  timeIn: '08:30 AM',
  timeOut: '10:00 PM',
  settings,
  existingPayroll: timeIn,
});

assert.equal(pesoAmount(lateFlatOt.flatOtAllowance), 50);

const snappedTimeOut = calculatePayrollForTimeOut({
  employee,
  actualSite: 'Site A',
  timeIn: '08:00 AM',
  timeOut: '05:30 PM',
  settings,
});

assert.equal(snappedTimeOut.adjustedTimeOut, '05:00 PM');
assert.equal(snappedTimeOut.actualTimeOut, '05:30 PM');
assert.equal(snappedTimeOut.overtimeMinutes, 0);
assert.equal(snappedTimeOut.requiresApproval, false);

const undertime = calculatePayrollForTimeOut({
  employee,
  actualSite: 'Site A',
  timeIn: '08:00 AM',
  timeOut: '04:00 PM',
  settings,
});

assert.equal(undertime.workHours, '6.8h');
assert.equal(undertime.undertimeMinutes, 60);
assert.equal(pesoAmount(undertime.undertimeDeduction), 100);
assert.equal(pesoAmount(undertime.awaySiteAllowance), 0);
assert.equal(undertime.grossAdjustment?.startsWith('-'), true);
assert.equal(pesoAmount(undertime.grossAdjustment), 100);

const suspiciousTimeOut = calculatePayrollForTimeOut({
  employee,
  actualSite: 'Site A',
  timeIn: '05:00 PM',
  timeOut: '08:00 AM',
  settings,
});

assert.equal(suspiciousTimeOut.requiresApproval, true);
assert.equal(suspiciousTimeOut.payrollReviewStatus, 'Pending Review');
assert.equal(suspiciousTimeOut.payrollNotes?.some((note) => note.includes('Suspicious punch sequence')), true);

const earlyLunchOut = calculateBreakPunchUpdate({
  action: 'Lunch Out',
  time: '11:55 AM',
  settings,
  existingLog: {
    timeIn: '08:00 AM',
  },
});

assert.equal(earlyLunchOut.lunchOut, '11:55 AM');
assert.equal(earlyLunchOut.lunchApprovalStatus, 'Pending Review');
assert.equal(earlyLunchOut.payrollReviewStatus, 'Pending Review');
assert.equal(earlyLunchOut.requiresApproval, true);

const standardLunchIn = calculateBreakPunchUpdate({
  action: 'Lunch In',
  time: '12:45 PM',
  settings,
  existingLog: {
    timeIn: '08:00 AM',
    lunchOut: '12:15 PM',
  },
});

assert.equal(standardLunchIn.lunchIn, '01:15 PM');
assert.equal(standardLunchIn.lunchMinutes, 60);
assert.equal(standardLunchIn.requiresApproval, false);

const standardPmBreakIn = calculateBreakPunchUpdate({
  action: 'PM Break In',
  time: '05:45 PM',
  settings,
  existingLog: {
    timeIn: '08:00 AM',
    pmBreakOut: '05:15 PM',
  },
});

assert.equal(standardPmBreakIn.pmBreakIn, '06:00 PM');
assert.equal(standardPmBreakIn.pmBreakMinutes, 45);
assert.equal(standardPmBreakIn.requiresApproval, false);

console.log('PayrollRules tests passed');
