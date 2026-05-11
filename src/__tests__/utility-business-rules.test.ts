import { describe, it, expect } from 'vitest';
import {
  adjustTimeIn,
  adjustTimeOut,
  calculateAttendanceStatus,
  calculateWorkHours,
} from '../lib/TimeLogic';
import {
  calculateBreakPunchUpdate,
  calculatePayrollForTimeIn,
  calculatePayrollForTimeOut,
  getEmployeeShift,
  parseTimeToMinutes,
} from '../lib/PayrollRules';
import {
  formatDateToISO,
  formatISOToDisplay,
  formatTimeTo12h,
} from '../lib/utils';
import type { Employee } from '../models/Employee';
import type { SystemSettings } from '../services/SettingsService';

const baseSettings: SystemSettings = {
  activeSite: 'Head Office',
  sites: ['Head Office', 'Site A'],
  shiftTemplates: [],
  dailyAllowance: 150,
  otAllowance: 75,
  awaySiteAllowance: 200,
  awaySiteAllowanceRule: 'Outside active site',
  shiftStartTime: '08:00',
  shiftEndTime: '17:00',
  gracePeriodMins: 10,
  lunchBreakStart: '12:00',
  lunchBreakEnd: '13:00',
  pmBreakStart: '15:00',
  pmBreakEnd: '15:15',
  autoTimeoutRule: 'After shift',
  smsEnabled: true,
  senderName: 'RSR',
  adminMobile: '',
  notificationGroup: '',
  telegramEnabled: false,
  telegramChatId: '',
};

const employee: Employee = {
  id: 'EMP-001',
  name: 'Employee One',
  email: 'employee@rsr.com',
  pin: '123456',
  avatar: 'https://example.com/avatar.jpg',
  department: 'Engineering',
  position: 'Engineer',
  status: 'Active',
  lastLogin: '-',
  dailyRate: '960',
  workLocation: 'Head Office',
};

describe('time and schedule helper functions', () => {
  it('classifies time-in values as present, late, or pending approval', () => {
    expect(calculateAttendanceStatus('08:00 AM')).toBe('Present');
    expect(calculateAttendanceStatus('08:11 AM')).toBe('Late');
    expect(calculateAttendanceStatus('05:01 PM')).toBe('Pending Approval');
  });

  it('snaps early time-in and buffered time-out values to official shift boundaries', () => {
    expect(adjustTimeIn('07:45 AM')).toBe('08:00 AM');
    expect(adjustTimeIn('08:15 AM')).toBe('08:15 AM');
    expect(adjustTimeOut('05:30 PM')).toEqual({
      adjustedTime: '05:00 PM',
      requiresApproval: false,
    });
    expect(adjustTimeOut('06:01 PM')).toEqual({
      adjustedTime: '06:01 PM',
      requiresApproval: true,
    });
  });

  it('calculates standard hours, lunch deduction, and overtime', () => {
    expect(calculateWorkHours('08:00 AM', '05:00 PM')).toEqual({
      workHours: '8.0h',
      overtime: '-',
    });
    expect(calculateWorkHours('08:00 AM', '07:00 PM')).toEqual({
      workHours: '8.0h',
      overtime: '2.0h',
    });
    expect(calculateWorkHours('-', '05:00 PM')).toEqual({
      workHours: '-',
      overtime: '-',
    });
  });

  it('parses 12-hour, 24-hour, and invalid time strings', () => {
    expect(parseTimeToMinutes('12:00 AM')).toBe(0);
    expect(parseTimeToMinutes('12:30 PM')).toBe(750);
    expect(parseTimeToMinutes('17:15')).toBe(1035);
    expect(parseTimeToMinutes('bad-input')).toBe(0);
  });

  it('selects employee-specific shift templates over default settings', () => {
    const shift = getEmployeeShift(
      { ...employee, shiftTemplateId: 'night' },
      {
        ...baseSettings,
        shiftTemplates: [
          {
            id: 'night',
            name: 'Night',
            startTime: '22:00',
            endTime: '07:00',
            gracePeriodMins: 5,
            isNightShift: true,
            nightDifferentialRate: 0.1,
          },
        ],
      },
    );

    expect(shift).toMatchObject({
      shiftStartTime: '22:00',
      shiftEndTime: '07:00',
      gracePeriodMins: 5,
      isNightShift: true,
    });
  });
});

describe('attendance and payroll rules', () => {
  it('records an on-time time-in as present and final', () => {
    const result = calculatePayrollForTimeIn({
      employee,
      actualSite: 'Head Office',
      timeIn: '08:05 AM',
      settings: baseSettings,
    });

    expect(result.status).toBe('Present');
    expect(result.adjustedTimeIn).toBe('08:00 AM');
    expect(result.payrollReviewStatus).toBe('Final');
    expect(result.lateMinutes).toBe(0);
  });

  it('flags late and after-dismissal time-ins for deductions or approval', () => {
    const late = calculatePayrollForTimeIn({
      employee,
      actualSite: 'Site A',
      timeIn: '08:30 AM',
      settings: baseSettings,
    });
    const afterShift = calculatePayrollForTimeIn({
      employee,
      actualSite: 'Head Office',
      timeIn: '05:30 PM',
      settings: baseSettings,
    });

    expect(late.status).toBe('Late');
    expect(late.lateMinutes).toBe(20);
    expect(late.awaySiteAllowance).toContain('200.00');
    expect(afterShift.status).toBe('Pending Approval');
    expect(afterShift.payrollNotes).toContain('Time In after dismissal requires approval.');
  });

  it('validates break punches against schedule windows', () => {
    const earlyLunch = calculateBreakPunchUpdate({
      action: 'Lunch Out',
      time: '11:30 AM',
      settings: baseSettings,
      existingLog: { timeIn: '08:00 AM' },
    });
    const normalLunchIn = calculateBreakPunchUpdate({
      action: 'Lunch In',
      time: '01:00 PM',
      settings: baseSettings,
      existingLog: { lunchOut: '12:00 PM' },
    });

    expect(earlyLunch.requiresApproval).toBe(true);
    expect(earlyLunch.payrollNotes).toContain('Early Lunch Out requires approval.');
    expect(normalLunchIn.requiresApproval).toBe(false);
    expect(normalLunchIn.lunchMinutes).toBe(60);
  });

  it('calculates time-out work hours, undertime, overtime, and suspicious punch sequences', () => {
    const normal = calculatePayrollForTimeOut({
      employee,
      actualSite: 'Head Office',
      timeIn: '08:00 AM',
      timeOut: '05:00 PM',
      settings: baseSettings,
    });
    const suspicious = calculatePayrollForTimeOut({
      employee,
      actualSite: 'Head Office',
      timeIn: '04:00 PM',
      timeOut: '08:00 AM',
      settings: baseSettings,
    });

    expect(normal.workHours).toBe('7.8h');
    expect(normal.requiresApproval).toBe(false);
    expect(suspicious.requiresApproval).toBe(true);
    expect(suspicious.payrollNotes).toContain('Suspicious punch sequence: Time Out is earlier than Time In.');
  });
});

describe('utility formatting helpers', () => {
  it('normalizes display dates and times for forms and tables', () => {
    expect(formatDateToISO('2026-05-11')).toBe('2026-05-11');
    expect(formatISOToDisplay('2026-05-11')).toBe('May 11, 2026');
    expect(formatTimeTo12h('17:05')).toBe('05:05 PM');
    expect(formatTimeTo12h(undefined)).toBe('');
  });

  it('returns the original invalid date input instead of throwing', () => {
    expect(formatDateToISO('not-a-date')).toBe('not-a-date');
    expect(formatISOToDisplay('not-a-date')).toBe('not-a-date');
  });
});
