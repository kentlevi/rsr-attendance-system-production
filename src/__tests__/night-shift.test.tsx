import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { calculatePayrollForTimeIn, calculatePayrollForTimeOut } from '../lib/PayrollRules';

// Mock Services
const showToast = vi.fn();
const addLog = vi.fn();
const updateLog = vi.fn();
const refreshLogsByDates = vi.fn();
const getAllLogs = vi.fn();

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));

vi.mock('../services/AttendanceService', () => ({
  attendanceService: {
    subscribe: vi.fn(() => () => {}),
    getAllLogs,
    refreshLogsByDates,
    addLog,
    updateLog,
  },
}));

const mockEmployee = {
  id: 'emp-night',
  employeeId: 'EMP-NIGHT',
  name: 'Night Worker',
  pin: '123456',
  dailyRate: '800',
  shiftTemplateId: 'night-shift',
  status: 'Active',
};

vi.mock('../services/EmployeeService', () => ({
  employeeService: {
    getAllEmployeesSync: vi.fn(() => [{ data: mockEmployee }]),
    getEmployeeByIdSync: vi.fn(() => ({ data: mockEmployee })),
    subscribe: vi.fn(() => () => {}),
    loadEmployees: vi.fn(async () => [{ data: mockEmployee }]),
  },
}));

const mockSettings = {
  activeSite: 'Head Office',
  sites: ['Head Office'],
  shiftTemplates: [
    {
      id: 'night-shift',
      name: 'Night Shift',
      startTime: '22:00',
      endTime: '06:00',
      gracePeriodMins: 10,
      isNightShift: true,
      nightDifferentialRate: 0.1, // 10%
    },
  ],
  attendancePhotoUploadEnabled: false,
};

vi.mock('../services/SettingsService', () => ({
  settingsService: {
    getSettings: vi.fn(() => mockSettings),
    subscribe: vi.fn((cb) => {
        cb(mockSettings);
        return () => {};
    }),
  },
}));

vi.mock('../services/FacialRecognitionService', () => ({
  facialRecognitionService: {
    verifyFace: vi.fn(async () => 'emp-night'),
  },
}));

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
  configurable: true,
});

// Mock PageLayout to avoid complexity
vi.mock('../components/layout/PageLayout', () => ({
  PageLayout: ({ children }: any) => <div>{children}</div>,
}));

// Mock Webcam
vi.mock('react-webcam', () => ({
  default: React.forwardRef((_props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      getScreenshot: () => 'data:image/jpeg;base64,mock-photo',
    }));
    return <div data-testid="webcam" />;
  }),
}));

import TimeClock from '../components/TimeClock';

describe('Night Shift Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    getAllLogs.mockReturnValue([]);
    refreshLogsByDates.mockResolvedValue([]);
  });

  it('calculates cross-day hours and night differential correctly', async () => {
    const user = userEvent.setup({ delay: null });
    
    // 1. Time In at 10:00 PM (22:00)
    const startDate = new Date('2026-05-12T22:00:00');
    vi.setSystemTime(startDate);
    
    render(<TimeClock onNavigate={vi.fn()} />);
    
    const timeInBtn = screen.getByRole('button', { name: /Time In/i });
    await user.click(timeInBtn);
    
    await waitFor(() => {
      expect(addLog).toHaveBeenCalled();
    });

    const addLogCall = addLog.mock.calls[0][0];
    expect(addLogCall.employeeId).toBe('emp-night');
    expect(addLogCall.timeIn).toBe('10:00 PM');
    expect(addLogCall.date).toBe('2026-05-12');

    // Mock existing log for the next day's punch-out
    const existingLogId = 'log-123';
    getAllLogs.mockReturnValue([{
      data: {
        ...addLogCall,
        id: existingLogId,
        location: 'Head Office'
      }
    }]);
    refreshLogsByDates.mockResolvedValue([{
      data: {
        ...addLogCall,
        id: existingLogId,
        location: 'Head Office'
      }
    }]);

    // 2. Time Out at 6:00 AM (06:00) the next day
    const endDate = new Date('2026-05-13T06:00:00');
    vi.setSystemTime(endDate);
    
    // We don't need to re-render, but TimeClock has internal state for currentTime
    // which is updated via setInterval. Since we used useFakeTimers, we might need to advance.
    vi.advanceTimersByTime(1000);

    const timeOutBtn = screen.getByRole('button', { name: /Time Out/i });
    await user.click(timeOutBtn);

    await waitFor(() => {
      expect(updateLog).toHaveBeenCalledWith(existingLogId, expect.anything());
    });

    const updateLogCall = updateLog.mock.calls[0][1];
    
    // Assertions on the calculated payroll data
    // 10pm to 6am is 8 hours.
    // Base rate is 800/day = 100/hr.
    // Night diff is 10% of 800 = 80.
    // Total gross adjustment should be roughly 80 (since it's a full night shift)
    
    expect(updateLogCall.timeOut).toBe('06:00 AM');
    expect(updateLogCall.workHours).toBe('8.0h');
    expect(updateLogCall.payrollNotes).toContain(expect.stringContaining('Night differential added'));
    
    // Check night diff amount
    // hourlyRate = 100. 8 hours * 100 * 0.1 = 80.
    expect(updateLogCall.grossAdjustment).toBe('₱80.00');
  });

  it('handles "Late" clock-in for night shift across midnight', async () => {
    const user = userEvent.setup({ delay: null });
    
    // 1. Time In at 10:30 PM (22:30) - Should be 20 mins late (grace is 10 mins)
    const startDate = new Date('2026-05-12T22:30:00');
    vi.setSystemTime(startDate);
    
    render(<TimeClock onNavigate={vi.fn()} />);
    
    await user.click(screen.getByRole('button', { name: /Time In/i }));
    
    await waitFor(() => {
      expect(addLog).toHaveBeenCalled();
    });

    const addLogCall = addLog.mock.calls[0][0];
    expect(addLogCall.status).toBe('Late');
    expect(addLogCall.lateMinutes).toBe(20);

    // 2. Time Out at 6:00 AM the next day
    const existingLogId = 'log-late';
    getAllLogs.mockReturnValue([{ data: { ...addLogCall, id: existingLogId, location: 'Head Office' } }]);
    refreshLogsByDates.mockResolvedValue([{ data: { ...addLogCall, id: existingLogId, location: 'Head Office' } }]);

    vi.setSystemTime(new Date('2026-05-13T06:00:00'));
    vi.advanceTimersByTime(1000);

    await user.click(screen.getByRole('button', { name: /Time Out/i }));

    await waitFor(() => {
      expect(updateLog).toHaveBeenCalledWith(existingLogId, expect.anything());
    });

    const updateLogCall = updateLog.mock.calls[0][1];
    
    // Work hours: 10:30pm to 6am is 7.5 hours.
    // Late deduction: 20 mins late. 800/8/60 = 1.666/min. 20 * 1.666 = 33.33.
    // Night diff: 7.5 hours * 100 * 0.1 = 75.00.
    // Gross adjustment: 75.00 - 33.33 = 41.67.
    
    expect(updateLogCall.workHours).toBe('7.5h');
    expect(updateLogCall.grossAdjustment).toBe('₱41.67');
  });
});
