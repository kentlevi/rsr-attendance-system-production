import { describe, expect, it } from 'vitest';
import { calculatePayrollForTimeOut } from '../lib/PayrollRules';

describe('Night Shift Payroll Calculation', () => {
  const mockSettings: any = {
    shiftStartTime: '08:00 AM',
    shiftEndTime: '05:00 PM',
    // Night shifts don't use day-shift breaks; set to same time to avoid deduction from standardWorkMinutes
    lunchBreakStart: '00:00',
    lunchBreakEnd: '00:00',
    pmBreakStart: '00:00',
    pmBreakEnd: '00:00',
    gracePeriodMins: 15,
    otAllowance: 100,
    shiftTemplates: [
      {
        id: 'night-template',
        name: 'Night Shift',
        startTime: '10:00 PM',
        endTime: '07:00 AM',
        isNightShift: true,
        nightDifferentialRate: 0.10, // 10%
        gracePeriodMins: 15
      }
    ]
  };

  const mockEmployee: any = {
    dailyRate: '₱800.00',
    shiftTemplateId: 'night-template',
    workLocation: 'Site A'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates 10% night differential for a full 8-hour night shift', () => {
    // 10 PM to 6 AM = 8 hours
    // Hourly rate = 800 / 8 = 100
    // Night Diff = 100 * 8 * 0.10 = 80
    const result = calculatePayrollForTimeOut({
      employee: mockEmployee,
      actualSite: 'Site A',
      timeIn: '10:00 PM',
      timeOut: '06:00 AM',
      settings: {
        ...mockSettings,
        lunchBreakStart: '00:00',
        lunchBreakEnd: '00:00',
        pmBreakStart: '00:00',
        pmBreakEnd: '00:00',
        shiftTemplates: [
          {
            ...mockSettings.shiftTemplates[0],
            endTime: '06:00 AM'
          }
        ]
      }
    });

    expect(result.workHours).toBe('8.0h');
    // grossAdjustment should include ₱80.00
    // Since actualSite === scheduledSite (assumed Site A), no away allowance.
    // No OT, no undertime.
    expect(result.grossAdjustment).toBe('₱80.00');
    expect(result.payrollNotes).toContain('Night differential added (₱80.00).');
  });

  it('calculates night differential only for standard hours (not overtime)', () => {
    // 10 PM to 7 AM = 9 hours (8h standard + 1h OT)
    // Hourly rate = 100
    // ND = 100 * 8 * 0.10 = 80 (ND usually doesn't apply to OT or has a different rate, but current code uses standardWorkMinutes)
    const result = calculatePayrollForTimeOut({
      employee: mockEmployee,
      actualSite: 'Site A',
      timeIn: '10:00 PM',
      timeOut: '07:00 AM',
      settings: {
        ...mockSettings,
        lunchBreakStart: '12:00',
        lunchBreakEnd: '13:00',
        pmBreakStart: '15:00',
        pmBreakEnd: '15:00',
      }
    });

    expect(result.workHours).toBe('8.0h');
    expect(result.overtime).toBe('1.0h');
    expect(result.payrollNotes).toContain('Night differential added (₱80.00).');
    
    // Total Gross = 80 (ND) + 100 (OT) = 180
    expect(result.grossAdjustment).toBe('₱180.00');
  });
});
