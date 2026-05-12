import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
  id: 'emp-break',
  employeeId: 'EMP-BREAK',
  name: 'Break Worker',
  pin: '123456',
  dailyRate: '800',
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
    vi.useFakeTimers();
    getAllLogs.mockReturnValue([]);
    refreshLogsByDates.mockResolvedValue([]);
  });

  it('automatically deducts 60 minutes for a full day shift (8 AM to 5 PM) without manual break punches', async () => {
    const user = userEvent.setup({ delay: null });
    
    // 1. Time In at 08:00 AM
    vi.setSystemTime(new Date('2026-05-12T08:00:00'));
    render(<TimeClock onNavigate={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Time In/i }));
    
    await waitFor(() => expect(addLog).toHaveBeenCalled());
    const initialLog = addLog.mock.calls[0][0];

    // 2. Time Out at 05:00 PM
    const logWithId = { data: { ...initialLog, id: 'log-auto-break', location: 'Head Office' } };
    getAllLogs.mockReturnValue([logWithId]);
    refreshLogsByDates.mockResolvedValue([logWithId]);

    vi.setSystemTime(new Date('2026-05-12T17:00:00'));
    vi.advanceTimersByTime(1000);
    await user.click(screen.getByRole('button', { name: /Time Out/i }));

    await waitFor(() => expect(updateLog).toHaveBeenCalled());
    const result = updateLog.mock.calls[0][1];

    // 8 AM to 5 PM is 9 hours. 9 - 1 hour lunch = 8 hours.
    expect(result.workHours).toBe('8.0h');
    expect(result.undertimeMinutes).toBe(0);
  });

  it('handles manual lunch punches correctly and uses the actual duration', async () => {
    const user = userEvent.setup({ delay: null });
    
    // 1. Time In at 08:00 AM
    vi.setSystemTime(new Date('2026-05-12T08:00:00'));
    render(<TimeClock onNavigate={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: /Time In/i }));
    await waitFor(() => expect(addLog).toHaveBeenCalled());
    
    let currentLog = { data: { ...addLog.mock.calls[0][0], id: 'log-manual-break', location: 'Head Office' } };
    getAllLogs.mockReturnValue([currentLog]);
    refreshLogsByDates.mockResolvedValue([currentLog]);

    // 2. Lunch Out at 12:00 PM
    vi.setSystemTime(new Date('2026-05-12T12:00:00'));
    vi.advanceTimersByTime(1000);
    await user.click(screen.getByRole('button', { name: /Lunch Out/i }));
    await waitFor(() => expect(updateLog).toHaveBeenCalled());
    
    // Update our mock log with the Lunch Out info
    currentLog.data = { ...currentLog.data, ...updateLog.mock.calls[0][1] };
    updateLog.mockClear();

    // 3. Lunch In at 01:30 PM (90 minutes lunch)
    vi.setSystemTime(new Date('2026-05-12T13:30:00'));
    vi.advanceTimersByTime(1000);
    await user.click(screen.getByRole('button', { name: /Lunch In/i }));
    await waitFor(() => expect(updateLog).toHaveBeenCalled());
    
    currentLog.data = { ...currentLog.data, ...updateLog.mock.calls[0][1] };
    expect(currentLog.data.lunchMinutes).toBe(90);
    updateLog.mockClear();

    // 4. Time Out at 05:00 PM
    vi.setSystemTime(new Date('2026-05-12T17:00:00'));
    vi.advanceTimersByTime(1000);
    await user.click(screen.getByRole('button', { name: /Time Out/i }));

    await waitFor(() => expect(updateLog).toHaveBeenCalled());
    const result = updateLog.mock.calls[0][1];

    // Total span: 9 hours (540 mins)
    // Lunch taken: 90 mins
    // Actual work: 540 - 90 = 450 mins = 7.5 hours.
    // If the system still auto-deducts 60 mins instead of 90, it will say 8 hours.
    // We want it to be 7.5h.
    expect(result.workHours).toBe('7.5h');
    expect(result.undertimeMinutes).toBe(30);
  });
});
