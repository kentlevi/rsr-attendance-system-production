import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { calculatePayrollForTimeIn, calculatePayrollForTimeOut } from '../lib/PayrollRules';

// Mock Services - use vi.hoisted() so these are available when vi.mock() is hoisted
const { showToast, addLog, updateLog, refreshLogsByDates, getAllLogs, getSyncSummary, savePunch, markSyncing, markSynced, markFailed } = vi.hoisted(() => ({
  showToast: vi.fn(),
  addLog: vi.fn(),
  updateLog: vi.fn(),
  refreshLogsByDates: vi.fn(),
  getAllLogs: vi.fn(),
  getSyncSummary: vi.fn(),
  savePunch: vi.fn(),
  markSyncing: vi.fn(),
  markSynced: vi.fn(),
  markFailed: vi.fn(),
}));

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

vi.mock('../services/LocalAttendanceService', () => ({
  localAttendanceService: {
    savePunch,
    markSyncing,
    markSynced,
    markFailed,
    getSyncSummary,
  },
}));

vi.mock('../services/AttendancePhotoService', () => ({
  attendancePhotoService: {
    uploadPhoto: vi.fn(() => Promise.resolve('http://photo.url')),
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
  dateHired: '2026-01-01',
  workLocation: 'Head Office',
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

// Mock Geolocation
const customMockGeolocation = {
  getCurrentPosition: vi.fn((success) => success({
    coords: {
      latitude: 10.0,
      longitude: 10.0,
    },
  })),
};

if (typeof navigator !== 'undefined') {
  Object.defineProperty(navigator, 'geolocation', {
    value: customMockGeolocation,
    writable: true,
    configurable: true,
  });
}

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
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getAllLogs.mockReturnValue([]);
    refreshLogsByDates.mockResolvedValue([]);
    getSyncSummary.mockResolvedValue({ pending: 0, syncing: 0, failed: 0, retryReady: 0, totalOpen: 0 });
    savePunch.mockResolvedValue({ id: 'local-night' });
    markSyncing.mockResolvedValue(undefined);
    markSynced.mockResolvedValue(undefined);
    markFailed.mockResolvedValue(undefined);
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('calculates cross-day hours and night differential correctly', async () => {
    // 1. Time In at 10:00 PM (22:00)
    const startDate = new Date('2026-05-12T22:00:00');
    vi.setSystemTime(startDate);
    
    render(<TimeClock onNavigate={vi.fn()} />);
    
    const timeInBtn = screen.getByRole('button', { name: /Time In/i });
    fireEvent.click(timeInBtn);
    
    await waitFor(() => {
      expect(addLog).toHaveBeenCalled();
    });

    const addLogCall = addLog.mock.calls[0][0];
    expect(addLogCall.employeeId).toBe('emp-night');
    expect(addLogCall.timeIn).toBe('10:00 PM');
    expect(addLogCall.date).toBe('2026-05-12');
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

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
    await act(async () => {
      vi.setSystemTime(endDate);
      vi.advanceTimersByTime(1000);
    });

    const timeOutBtn = screen.getByRole('button', { name: /Time Out/i });
    fireEvent.click(timeOutBtn);

    await waitFor(() => {
      expect(updateLog).toHaveBeenCalledWith(existingLogId, expect.anything());
    }, { timeout: 10000 });

    const updateLogCall = updateLog.mock.calls[0][1];
    
    expect(updateLogCall.timeOut).toBe('06:00 AM');
    expect(updateLogCall.workHours).toBe('8.0h');
    expect(updateLogCall.payrollNotes?.some((note: string) => note.includes('Night differential added'))).toBe(true);
    expect(updateLogCall.grossAdjustment).toBe('₱80.00');
  }, 60000);

  it('handles "Late" clock-in for night shift across midnight', async () => {
    // 1. Time In at 10:30 PM (22:30) - Should be 20 mins late (grace is 10 mins)
    const startDate = new Date('2026-05-12T22:30:00');
    vi.setSystemTime(startDate);
    
    render(<TimeClock onNavigate={vi.fn()} />);
    
    fireEvent.click(screen.getByRole('button', { name: /Time In/i }));
    
    await waitFor(() => {
      expect(addLog).toHaveBeenCalled();
    });

    const addLogCall = addLog.mock.calls[0][0];
    expect(addLogCall.status).toBe('Late');
    expect(addLogCall.lateMinutes).toBe(20);
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    // 2. Time Out at 6:00 AM the next day
    const existingLogId = 'log-late';
    getAllLogs.mockReturnValue([{ data: { ...addLogCall, id: existingLogId, location: 'Head Office' } }]);
    refreshLogsByDates.mockResolvedValue([{ data: { ...addLogCall, id: existingLogId, location: 'Head Office' } }]);

    await act(async () => {
      vi.setSystemTime(new Date('2026-05-13T06:00:00'));
      vi.advanceTimersByTime(1000);
    });

    fireEvent.click(screen.getByRole('button', { name: /Time Out/i }));

    await waitFor(() => {
      expect(updateLog).toHaveBeenCalledWith(existingLogId, expect.anything());
    }, { timeout: 10000 });

    const updateLogCall = updateLog.mock.calls[0][1];
    
    expect(updateLogCall.workHours).toBe('7.5h');
    expect(updateLogCall.undertimeMinutes).toBe(30);
    expect(updateLogCall.grossAdjustment).toBe('-₱8.33');
  }, 60000);
});
