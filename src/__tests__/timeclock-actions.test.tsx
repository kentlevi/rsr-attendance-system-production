import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock Firebase
vi.mock('../lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
}));

const mockGetScreenshot = vi.fn(() => 'data:image/jpeg;base64,mock-data');
vi.mock('react-webcam', () => ({
  default: React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      getScreenshot: mockGetScreenshot,
    }));
    return <div data-testid="mock-webcam" />;
  }),
}));

const showToast = vi.fn();
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));

// Mock Services
import { EmployeeModel } from '../models/Employee';
import { employeeService } from '../services/EmployeeService';
import { attendanceService } from '../services/AttendanceService';
import { localAttendanceService } from '../services/LocalAttendanceService';
import { settingsService } from '../services/SettingsService';
import { syncService } from '../services/SyncService';
import { attendancePhotoService } from '../services/AttendancePhotoService';

vi.mock('../services/EmployeeService', () => ({
  employeeService: {
    getEmployeeByIdSync: vi.fn(),
    getAllEmployeesSync: vi.fn(),
    updateEmployee: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
  }
}));

vi.mock('../services/AttendanceService', () => ({
  attendanceService: {
    refreshLogsByDates: vi.fn(),
    getAllLogs: vi.fn(),
    addLog: vi.fn(),
    updateLog: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
  }
}));

vi.mock('../services/LocalAttendanceService', () => ({
  localAttendanceService: {
    savePunch: vi.fn(),
    markSyncing: vi.fn(),
    markSynced: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    getSyncSummary: vi.fn(),
    markFailed: vi.fn(),
  }
}));

vi.mock('../services/SettingsService', () => ({
  settingsService: {
    getSettings: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
  }
}));

vi.mock('../services/SyncService', () => ({
  syncService: {
    subscribe: vi.fn(() => vi.fn()),
  }
}));

vi.mock('../services/AttendancePhotoService', () => ({
  attendancePhotoService: {
    uploadPhoto: vi.fn(),
  }
}));

// Mock Human library
vi.mock('@vladmandic/human', () => {
  return {
    Human: class {
      load = vi.fn().mockResolvedValue(undefined);
      detect = vi.fn().mockResolvedValue({ face: [] });
    }
  };
});

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(() => Promise.resolve({ 
    empty: false, 
    docs: [{ 
      id: 'emp-1', 
      data: () => ({ 
        name: 'John Doe', 
        employeeId: 'EMP-001',
        pin: '123456',
        status: 'Active'
      }) 
    }] 
  })),
}));

// Import component AFTER mocks are defined
import TimeClock from '../components/TimeClock';

// Mock Geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn().mockImplementation((success) => 
    success({
      coords: {
        latitude: 14.5995,
        longitude: 120.9842,
      },
    })
  ),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
  configurable: true,
});

describe('TimeClock Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default Employee Mock
    vi.mocked(employeeService.getEmployeeByIdSync).mockImplementation((id) => {
       if (id === 'EMP-001' || id === 'emp-1') {
         return new EmployeeModel({ 
           id: 'emp-1', 
           name: 'John Doe', 
           employeeId: 'EMP-001',
           pin: '123456',
           status: 'Active',
           email: 'john@example.com',
           department: 'Eng',
           position: 'Dev',
           avatar: ''
         });
       }
       return null;
    });

    vi.mocked(employeeService.getAllEmployeesSync).mockReturnValue([
      new EmployeeModel({
        id: 'emp-1',
        name: 'John Doe',
        employeeId: 'EMP-001',
        pin: '123456',
        status: 'Active',
        email: 'john@example.com',
        department: 'Eng',
        position: 'Dev',
        avatar: '',
        slBalance: 10,
        vlBalance: 10,
      })
    ]);

    // Default Settings Mock
    vi.mocked(settingsService.getSettings).mockReturnValue({
      activeSite: 'Main Office',
      sites: ['Main Office', 'Head Office'],
      shiftStartTime: '08:00',
      shiftEndTime: '17:00',
      attendancePhotoUploadEnabled: false,
      dailyAllowance: 0,
      otAllowance: 0,
      awaySiteAllowance: 0,
      awaySiteAllowanceRule: '',
      gracePeriodMins: 10,
      lunchBreakStart: '12:00',
      lunchBreakEnd: '13:00',
      pmBreakStart: '15:00',
      pmBreakEnd: '15:15',
      autoTimeoutRule: '',
      smsEnabled: false,
      senderName: '',
      adminMobile: '',
      notificationGroup: '',
      telegramEnabled: false,
      telegramChatId: '',
      siteCoordinates: {
        'Head Office': { lat: 14.5995, lng: 120.9842, radius: 100 }
      }
    } as any);

    // Default Attendance Mock
    vi.mocked(attendanceService.refreshLogsByDates).mockResolvedValue([]);
    vi.mocked(attendanceService.getAllLogs).mockReturnValue([]);
    vi.mocked(attendanceService.addLog).mockResolvedValue(undefined);
    vi.mocked(attendanceService.updateLog).mockResolvedValue(undefined);

    // Default Local Attendance Mock
    vi.mocked(localAttendanceService.savePunch).mockResolvedValue({ id: 'local-1' } as any);
    vi.mocked(localAttendanceService.getSyncSummary).mockResolvedValue({ 
      pending: 0, 
      syncing: 0, 
      failed: 0, 
      retryReady: 0, 
      totalOpen: 0 
    });

    // Default Photo Mock
    vi.mocked(attendancePhotoService.uploadPhoto).mockResolvedValue('https://mock-photo-url.com');
  });

  it('allows manual punch via PIN override', async () => {
    const user = userEvent.setup();
    render(<TimeClock onNavigate={() => {}} />);

    const overrideBtn = await screen.findByText(/Face Not Working\? Use PIN Override/i);
    await user.click(overrideBtn);

    const modal = screen.getByRole('dialog');
    await user.click(within(modal).getByRole('button', { name: /Time In/i }));

    await user.type(within(modal).getByPlaceholderText(/Enter employee ID or email/i), 'EMP-001');
    await user.type(within(modal).getByPlaceholderText(/Enter access PIN/i), '123456');

    const submitBtn = within(modal).getByRole('button', { name: /Confirm Time In/i });
    await user.click(submitBtn);

    await waitFor(() => {
      const calls = showToast.mock.calls;
      const found = calls.some(call => /Welcome John Doe! Time In recorded/i.test(call[0]));
      expect(found).toBe(true);
    }, { timeout: 15000 });
  }, 30000);

  it('allows manual "Time Out" via PIN override', async () => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    vi.mocked(attendanceService.refreshLogsByDates).mockResolvedValue([{
      id: 'log-1',
      data: {
        id: 'log-1',
        employeeId: 'emp-1',
        date: todayStr,
        timeIn: '08:00 AM',
        location: 'Head Office',
        status: 'On Time'
      }
    }] as any);

    const user = userEvent.setup();
    render(<TimeClock onNavigate={() => {}} />);

    const overrideBtn = await screen.findByText(/Face Not Working\? Use PIN Override/i);
    await user.click(overrideBtn);

    const modal = screen.getByRole('dialog');
    await user.click(within(modal).getByRole('button', { name: /Time Out/i }));

    await user.type(within(modal).getByPlaceholderText(/Enter employee ID or email/i), 'EMP-001');
    await user.type(within(modal).getByPlaceholderText(/Enter access PIN/i), '123456');

    const submitBtn = within(modal).getByRole('button', { name: /Confirm Time Out/i });
    await user.click(submitBtn);

    await waitFor(() => {
      const calls = showToast.mock.calls;
      const found = calls.some(call => /Goodbye John Doe! Time Out recorded/i.test(call[0]));
      expect(found).toBe(true);
    }, { timeout: 15000 });
  }, 30000);

  it('blocks punch if user is outside geofence radius', async () => {
    vi.mocked(settingsService.getSettings).mockReturnValue({
      sites: ['Main Office'],
      shiftStartTime: '08:00',
      shiftEndTime: '17:00',
      attendancePhotoUploadEnabled: false,
      // @ts-ignore
      geofencingEnabled: true,
      siteCoordinates: {
        'Head Office': { lat: 10.0, lng: 10.0, radius: 100 }
      }
    } as any);

    const user = userEvent.setup();
    render(<TimeClock onNavigate={() => {}} />);

    const overrideBtn = await screen.findByText(/Face Not Working\? Use PIN Override/i);
    await user.click(overrideBtn);
    
    const modal = screen.getByRole('dialog');
    await user.click(within(modal).getByRole('button', { name: /Time In/i }));

    await user.type(within(modal).getByPlaceholderText(/Enter employee ID or email/i), 'EMP-001');
    await user.type(within(modal).getByPlaceholderText(/Enter access PIN/i), '123456');

    const submitBtn = within(modal).getByRole('button', { name: /Confirm Time In/i });
    await user.click(submitBtn);

    await waitFor(() => {
      const calls = showToast.mock.calls;
      const found = calls.some(call => /Too far from Head Office/i.test(call[0]));
      expect(found).toBe(true);
    }, { timeout: 15000 });
  }, 30000);

  it('saves punch locally when offline and shows warning', async () => {
    const onLineSpy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    const user = userEvent.setup();
    render(<TimeClock onNavigate={() => {}} />);

    const overrideBtn = await screen.findByText(/Face Not Working\? Use PIN Override/i);
    await user.click(overrideBtn);

    const modal = screen.getByRole('dialog');
    await user.click(within(modal).getByRole('button', { name: /Time In/i }));

    await user.type(within(modal).getByPlaceholderText(/Enter employee ID or email/i), 'EMP-001');
    await user.type(within(modal).getByPlaceholderText(/Enter access PIN/i), '123456');

    const submitBtn = within(modal).getByRole('button', { name: /Confirm Time In/i });
    await user.click(submitBtn);

    await waitFor(() => {
      const calls = showToast.mock.calls;
      const found = calls.some(call => /saved locally and will sync when internet returns/i.test(call[0]));
      expect(found).toBe(true);
    });

    onLineSpy.mockRestore();
  });

  it('marks punch as failed in local storage if cloud sync throws error', async () => {
    vi.mocked(attendanceService.addLog).mockRejectedValueOnce(new Error('Network error'));

    const user = userEvent.setup();
    render(<TimeClock onNavigate={() => {}} />);

    const overrideBtn = await screen.findByText(/Face Not Working\? Use PIN Override/i);
    await user.click(overrideBtn);

    const modal = screen.getByRole('dialog');
    await user.click(within(modal).getByRole('button', { name: /Time In/i }));

    await user.type(within(modal).getByPlaceholderText(/Enter employee ID or email/i), 'EMP-001');
    await user.type(within(modal).getByPlaceholderText(/Enter access PIN/i), '123456');

    const submitBtn = within(modal).getByRole('button', { name: /Confirm Time In/i });
    await user.click(submitBtn);

    await waitFor(() => {
      const calls = showToast.mock.calls;
      const found = calls.some(call => /Cloud sync failed and will be retried later/i.test(call[0]));
      expect(found).toBe(true);
    });

    expect(localAttendanceService.markFailed).toHaveBeenCalled();
  });

  it('rejects invalid credentials in PIN override', async () => {
    const user = userEvent.setup();
    render(<TimeClock onNavigate={() => {}} />);

    const overrideBtn = await screen.findByText(/Face Not Working\? Use PIN Override/i);
    await user.click(overrideBtn);
    
    const modal = screen.getByRole('dialog');
    await user.click(within(modal).getByRole('button', { name: /Time In/i }));

    await user.type(within(modal).getByPlaceholderText(/Enter employee ID or email/i), 'WRONG-ID');
    await user.type(within(modal).getByPlaceholderText(/Enter access PIN/i), '000000');

    const submitBtn = within(modal).getByRole('button', { name: /Confirm Time In/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/Invalid credentials/i), 'error');
    });
  });
});
