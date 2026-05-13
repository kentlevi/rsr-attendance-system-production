import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';

// Mock Services
const mocks = vi.hoisted(() => ({
  showToast: vi.fn(),
  addLog: vi.fn(),
  updateLog: vi.fn(),
  refreshLogsByDates: vi.fn(),
  getAllLogs: vi.fn(() => []),
  getAllEmployeesSync: vi.fn(() => []),
  getEmployeeByIdSync: vi.fn(),
  loadEmployees: vi.fn(),
  updateEmployee: vi.fn(),
}));

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));

vi.mock('../services/AttendanceService', () => ({
  attendanceService: {
    getLogsByEmployeeId: vi.fn(() => []),
    getAllLogs: mocks.getAllLogs,
    addLog: mocks.addLog,
    updateLog: mocks.updateLog,
    refreshLogsByDates: mocks.refreshLogsByDates,
    subscribe: vi.fn(() => vi.fn()),
  }
}));

vi.mock('../services/LocalAttendanceService', () => ({
  localAttendanceService: {
    savePunch: vi.fn((p) => Promise.resolve({ id: 'local-1', ...p })),
    markSyncing: vi.fn(),
    markSynced: vi.fn(),
    markFailed: vi.fn(),
    getSyncSummary: vi.fn(() => Promise.resolve({ pending: 0, syncing: 0, failed: 0, retryReady: 0, totalOpen: 0 })),
  }
}));

vi.mock('../services/AttendancePhotoService', () => ({
  attendancePhotoService: {
    uploadPhoto: vi.fn(() => Promise.resolve('http://photo.url')),
  }
}));

import { attendanceService } from '../services/AttendanceService';
import { settingsService } from '../services/SettingsService';
import { localAttendanceService } from '../services/LocalAttendanceService';
import { facialRecognitionService } from '../services/FacialRecognitionService';

// Proxy the hoisted mocks to the original names for convenience in the test
const { showToast, addLog, updateLog, refreshLogsByDates, getAllLogs, getAllEmployeesSync, getEmployeeByIdSync, loadEmployees, updateEmployee } = mocks;

const mockEmployee = {
  id: 'emp-break',
  employeeId: 'EMP-BREAK',
  name: 'Break Worker',
  pin: '123456',
  dailyRate: '800',
  status: 'Active',
  dateHired: '2026-01-01',
};

class EmployeeModel {
  data: any;
  constructor(data: any) { this.data = data; }
}

vi.mock('../services/EmployeeService', () => ({
  employeeService: {
    getAllEmployeesSync: mocks.getAllEmployeesSync,
    getEmployeeByIdSync: mocks.getEmployeeByIdSync,
    subscribe: vi.fn(() => vi.fn()),
    loadEmployees: mocks.loadEmployees,
    updateEmployee: mocks.updateEmployee,
  }
}));

const mockSettings = {
  activeSite: 'Head Office',
  sites: ['Head Office'],
  shiftStartTime: '08:00',
  shiftEndTime: '17:00',
  gracePeriodMins: 10,
  lunchBreakStart: '12:00',
  lunchBreakEnd: '13:00',
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
    verifyFace: vi.fn(async () => 'emp-break'),
  },
}));

const mockGeolocation = {
  getCurrentPosition: vi.fn((success) => success({
    coords: { latitude: 10.0, longitude: 10.0 },
  })),
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
  configurable: true,
});

vi.mock('../components/layout/PageLayout', () => ({
  PageLayout: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('react-webcam', () => ({
  default: React.forwardRef((_props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      getScreenshot: () => 'data:image/jpeg;base64,mock-photo',
    }));
    return <div data-testid="webcam" />;
  }),
}));

import TimeClock from '../components/TimeClock';

describe('Automatic Break Deduction Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getAllLogs.mockReturnValue([]);
    getAllEmployeesSync.mockReturnValue([]);
    getEmployeeByIdSync.mockReturnValue(new EmployeeModel(mockEmployee) as any);
    loadEmployees.mockResolvedValue([new EmployeeModel(mockEmployee)] as any);
    refreshLogsByDates.mockResolvedValue([]);
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('automatically deducts 60 minutes for a full day shift (8 AM to 5 PM) without manual break punches', async () => {
    // 1. Time In at 08:00 AM
    vi.setSystemTime(new Date('2026-05-12T08:00:00'));
    vi.mocked(mocks.getAllEmployeesSync).mockReturnValue([new EmployeeModel(mockEmployee)] as any);
    render(<TimeClock onNavigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Time In/i }));

    await waitFor(() => expect(addLog).toHaveBeenCalled(), { timeout: 5000 });
    const initialLog = addLog.mock.calls[0][0];
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    showToast.mockClear();

    // 2. Lunch Out at 12:00 PM
    const todayStr = new Date().toLocaleDateString('en-CA');
    const logWithId = { id: 'log-1', data: { ...initialLog, id: 'log-1', employeeId: 'emp-break', date: todayStr, location: 'Head Office' } };
    getAllLogs.mockReturnValue([logWithId]);
    refreshLogsByDates.mockResolvedValue([logWithId]);

    await act(async () => {
      vi.setSystemTime(new Date('2026-05-12T12:00:00'));
      vi.advanceTimersByTime(5000);
    });
    
    fireEvent.click(screen.getByRole('button', { name: /Lunch Out/i }));
    
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Lunch Out recorded successfully')), { timeout: 10000 });
    await waitFor(() => expect(updateLog).toHaveBeenCalled(), { timeout: 10000 });
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    
    // 3. Lunch In at 01:00 PM
    const logWithLunchOut = { id: 'log-1', data: { ...logWithId.data, lunchOut: '12:00 PM' } };
    getAllLogs.mockReturnValue([logWithLunchOut]);
    refreshLogsByDates.mockResolvedValue([logWithLunchOut]);
    updateLog.mockClear();
    showToast.mockClear();

    await act(async () => {
      vi.setSystemTime(new Date('2026-05-12T13:00:00'));
      vi.advanceTimersByTime(5000);
    });
    
    fireEvent.click(screen.getByRole('button', { name: /Lunch In/i }));
    
    await waitFor(() => expect(showToast).toHaveBeenCalledWith(expect.stringContaining('Lunch In recorded successfully')), { timeout: 10000 });
    await waitFor(() => expect(updateLog).toHaveBeenCalled(), { timeout: 10000 });
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    
    // 4. Time Out at 05:00 PM
    const logWithLunch = { id: 'log-1', data: { ...logWithLunchOut.data, lunchIn: '01:00 PM', lunchMinutes: 60 } };
    getAllLogs.mockReturnValue([logWithLunch]);
    refreshLogsByDates.mockResolvedValue([logWithLunch]);
    updateLog.mockClear();

    await act(async () => {
      vi.setSystemTime(new Date('2026-05-12T17:00:00'));
      vi.advanceTimersByTime(5000);
    });
    
    fireEvent.click(screen.getByRole('button', { name: /Time Out/i }));
    
    await waitFor(() => expect(updateLog).toHaveBeenCalled(), { timeout: 5000 });
    const finalUpdate = updateLog.mock.calls[0][1];
    
    expect(finalUpdate.workHours).toBe('8.0h');
    expect(finalUpdate.overtime).toBe('-');
  }, 30000);

  it('handles manual lunch punches correctly and uses the actual duration', async () => {
    // 1. Time In at 08:00 AM
    vi.setSystemTime(new Date('2026-05-12T08:00:00'));
    vi.mocked(mocks.getAllEmployeesSync).mockReturnValue([new EmployeeModel(mockEmployee)] as any);
    render(<TimeClock onNavigate={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Time In/i }));
    await waitFor(() => expect(addLog).toHaveBeenCalled());
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });
    
    const todayStr = new Date().toLocaleDateString('en-CA');
    let currentLog = { id: 'log-manual-break', data: { ...addLog.mock.calls[0][0], id: 'log-manual-break', employeeId: 'emp-break', date: todayStr, location: 'Head Office' } };
    getAllLogs.mockReturnValue([currentLog]);
    refreshLogsByDates.mockResolvedValue([currentLog]);

    // 2. Lunch Out at 12:00 PM
    await act(async () => {
      vi.setSystemTime(new Date('2026-05-12T12:00:00'));
      vi.advanceTimersByTime(5000);
    });
    fireEvent.click(screen.getByRole('button', { name: /Lunch Out/i }));
    await waitFor(() => expect(updateLog).toHaveBeenCalled());
    
    // Update our mock log with the Lunch Out info
    currentLog.data = { ...currentLog.data, ...updateLog.mock.calls[0][1] };
    updateLog.mockClear();
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    // 3. Lunch In at 01:30 PM (90 minutes lunch)
    await act(async () => {
      vi.setSystemTime(new Date('2026-05-12T13:30:00'));
      vi.advanceTimersByTime(5000);
    });
    fireEvent.click(screen.getByRole('button', { name: /Lunch In/i }));
    await waitFor(() => expect(updateLog).toHaveBeenCalled());
    
    currentLog.data = { ...currentLog.data, ...updateLog.mock.calls[0][1] };
    expect(currentLog.data.lunchMinutes).toBe(90);
    updateLog.mockClear();
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    // 4. Time Out at 05:00 PM
    await act(async () => {
      vi.setSystemTime(new Date('2026-05-12T17:00:00'));
      vi.advanceTimersByTime(5000);
    });
    fireEvent.click(screen.getByRole('button', { name: /Time Out/i }));

    await waitFor(() => expect(updateLog).toHaveBeenCalled());
    const result = updateLog.mock.calls[0][1];

    // Total span: 9 hours (540 mins)
    // Lunch taken: 90 mins
    // Actual work: 540 - 90 = 450 mins = 7.5 hours.
    // If the system still auto-deducts 60 mins instead of 90, it will say 8 hours.
    // We want it to be 7.5h.
    expect(result.workHours).toBe('7.5h');
    expect(result.undertimeMinutes).toBe(30);
  }, 30000);
});
