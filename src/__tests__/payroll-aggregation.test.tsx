import { describe, expect, it } from 'vitest';
import { calculateEmployeePayrollSummary } from '../lib/PayrollCalculator';
import { AttendanceLogModel } from '../models/AttendanceLog';
import { LeaveRequestModel } from '../models/LeaveRequest';

describe('Payroll Aggregation Logic', () => {
  const mockEmployee: any = {
    id: 'emp-1',
    name: 'John Doe',
    dailyRate: '₱800.00'
  };

  const mockLogs: AttendanceLogModel[] = [
    new AttendanceLogModel({
      id: 'log-1',
      employeeId: 'emp-1',
      date: '2026-05-01',
      timeIn: '08:00 AM',
      timeOut: '05:00 PM',
      workHours: '9.00',
      overtime: '1.00',
      location: 'Main Office',
      status: 'Present',
      overtimePay: '₱100.00', // 1 hour OT
      lateDeduction: '₱50.00', // Late
      payrollNotes: ['Night differential added (₱0.00).']
    } as any),
    new AttendanceLogModel({
      id: 'log-2',
      employeeId: 'emp-1',
      date: '2026-05-02',
      timeIn: '08:00 AM',
      timeOut: '05:00 PM',
      workHours: '9.00',
      overtime: '1.00',
      location: 'Main Office',
      status: 'Present',
      overtimePay: '₱0.00',
      lateDeduction: '₱0.00',
      payrollNotes: ['Night differential added (₱80.00).'] // Night shift day
    } as any)
  ];

  const mockLeaves: LeaveRequestModel[] = [
    new LeaveRequestModel({
      id: 'leave-1',
      employeeId: 'emp-1',
      startDate: '2026-05-03',
      endDate: '2026-05-03',
      type: 'Vacation',
      status: 'Approved',
      reason: 'Personal'
    })
  ];

  it('correctly aggregates pay for 2 work days and 1 paid leave', () => {
    // 2 days present + 1 day leave = 3 days total
    // Basic Pay = 3 * 800 = 2400
    // OT = 100
    // ND = 80
    // Late = 50
    // Gross Adjustment = 100 + 80 - 50 = 130
    // Gross Pay = 2400 + 130 = 2530

    const summary = calculateEmployeePayrollSummary(
      mockEmployee,
      mockLogs,
      mockLeaves,
      [], // No incidents
      '2026-05-01',
      '2026-05-15'
    );

    expect(summary.totalDaysPresent).toBe(2);
    expect(summary.totalPaidLeaves).toBe(1);
    expect(summary.basicPay).toBe(2400);
    expect(summary.overtimePay).toBe(100);
    expect(summary.nightDifferential).toBe(80);
    expect(summary.lateDeduction).toBe(50);
    expect(summary.violationDeduction).toBe(0);
    expect(summary.grossPay).toBe(2530);
  });

  it('correctly applies violation deductions', () => {
    const mockIncidents: any[] = [
      {
        data: {
          type: 'Infraction',
          severity: 'High',
          date: '2026-05-05'
        }
      }
    ];

    const summary = calculateEmployeePayrollSummary(
      mockEmployee,
      mockLogs,
      mockLeaves,
      mockIncidents,
      '2026-05-01',
      '2026-05-15'
    );

    // Basic pay 2400 + adj 130 - violation 500 = 2030
    expect(summary.violationDeduction).toBe(500);
    expect(summary.grossPay).toBe(2030);
  });

  it('excludes logs outside the date range', () => {
    const summary = calculateEmployeePayrollSummary(
      mockEmployee,
      mockLogs,
      mockLeaves,
      [],
      '2026-05-10',
      '2026-05-20'
    );

    expect(summary.totalDaysPresent).toBe(0);
    expect(summary.totalPaidLeaves).toBe(0);
    expect(summary.basicPay).toBe(0);
  });
});
