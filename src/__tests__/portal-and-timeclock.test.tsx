import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const showToast = vi.fn();
const authenticatedFetch = vi.fn();
const signInWithEmailAndPassword = vi.fn();
const createUserWithEmailAndPassword = vi.fn();
const verifyFace = vi.fn();
const addLeaveRequest = vi.fn();
const addNotification = vi.fn();
const uploadRequestAttachment = vi.fn();
const addLog = vi.fn();
const updateLog = vi.fn();
const refreshLogsByDates = vi.fn();
const getAllLogs = vi.fn();
const savePunch = vi.fn();
const markSyncing = vi.fn();
const markSynced = vi.fn();
const markFailed = vi.fn();
const getSyncSummary = vi.fn();
const uploadPhoto = vi.fn();
const updateEmployee = vi.fn();
const loadEmployees = vi.fn();
const employee = {
  id: 'emp-1',
  name: 'Juan Dela Cruz',
  email: 'juan@example.com',
  department: 'Engineering',
  position: 'Engineer',
  status: 'Active',
  facialRecognitionProfileId: 'face-1',
};

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));

vi.mock('../components/layout/PageLayout', () => ({
  PageLayout: ({ children, title, headerRight }: any) => (
    <div>
      {title}
      {headerRight}
      {children}
    </div>
  ),
}));

vi.mock('../components/common/Select', () => ({
  Select: ({ children, options, placeholder, ...props }: any) => (
    <select {...props}>
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options ? options.map((option: string) => <option key={option} value={option}>{option}</option>) : children}
    </select>
  ),
}));

vi.mock('../components/common/DatePicker', () => ({
  DatePicker: ({ value, onChange, placeholder }: any) => (
    <input
      aria-label={placeholder}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
    />
  ),
}));

vi.mock('../components/common/TimePicker', () => ({
  TimePicker: ({ value, onChange }: any) => (
    <input
      aria-label="Time picker"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

vi.mock('../components/common/DataTable', () => ({
  DataTable: ({ data, emptyMessage }: any) => (
    <div>{data?.length ? `Rows: ${data.length}` : emptyMessage}</div>
  ),
}));

vi.mock('../components/common/Modal', () => ({
  Modal: ({ isOpen, children }: any) => (isOpen ? <div>{children}</div> : null),
}));

vi.mock('../components/views/ProfileView', () => ({
  default: () => <div>Profile View</div>,
}));

vi.mock('../components/views/common/HrAssistantChatbot', () => ({
  HrAssistantChatbot: () => <div>HR Assistant</div>,
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

vi.mock('react-webcam', () => ({
  default: React.forwardRef((_props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      getScreenshot: () => 'data:image/jpeg;base64,mock-photo',
    }));
    return <div data-testid="webcam" />;
  }),
}));

vi.mock('../lib/api', () => ({
  authenticatedFetch,
}));

vi.mock('../lib/LeaveRules', () => ({
  validateLeaveRequest: vi.fn(() => ({ valid: true, message: '' })),
}));

vi.mock('../lib/EmployeeAccessRules', () => ({
  canEmployeeAccessPortal: vi.fn(() => ({ allowed: true })),
  canEmployeeAccessAttendance: vi.fn(() => ({ allowed: true })),
}));

vi.mock('../services/EmployeeService', () => ({
  employeeService: {
    getAllEmployeesSync: vi.fn(() => [{ data: employee }]),
    subscribe: vi.fn(() => () => {}),
    getEmployeeByIdSync: vi.fn(() => ({ data: employee })),
    getEmployeeById: vi.fn(async () => ({ data: employee })),
    updateEmployee,
    loadEmployees,
  },
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

vi.mock('../services/LeaveService', () => ({
  leaveService: {
    subscribe: vi.fn(() => () => {}),
    getAllRequests: vi.fn(() => []),
    addRequest: addLeaveRequest,
  },
}));

vi.mock('../services/IncidentService', () => ({
  incidentService: {
    subscribe: vi.fn(() => () => {}),
    getUnacknowledgedIncidents: vi.fn(() => []),
  },
}));

vi.mock('../services/UndertimeService', () => ({
  undertimeService: {
    subscribe: vi.fn(() => () => {}),
    getAllRequests: vi.fn(() => []),
  },
}));

vi.mock('../services/NotificationService', () => ({
  notificationService: {
    subscribe: vi.fn(() => () => {}),
    getEmployeeNotifications: vi.fn(() => []),
    addNotification,
    markAsRead: vi.fn(),
  },
}));

vi.mock('../services/SettingsService', () => ({
  settingsService: {
    getSettings: vi.fn(() => ({
      sites: ['Head Office'],
      activeSite: 'Head Office',
      attendancePhotoUploadEnabled: false,
      shiftStartTime: '08:00',
      shiftEndTime: '17:00',
    })),
    subscribe: vi.fn(() => () => {}),
  },
}));

vi.mock('../services/RequestAttachmentService', () => ({
  requestAttachmentService: {
    uploadRequestAttachment,
  },
}));

vi.mock('../services/AttendancePhotoService', () => ({
  attendancePhotoService: {
    uploadPhoto,
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

vi.mock('../services/FacialRecognitionService', () => ({
  facialRecognitionService: {
    verifyFace,
  },
}));

vi.mock('../lib/firebase', () => ({
  auth: {
    currentUser: null,
  },
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ currentUser: { uid: 'emp-1' } })),
  signInWithCustomToken: vi.fn(),
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
}));

vi.mock('../lib/PayrollRules', () => ({
  calculatePayrollForTimeIn: vi.fn(() => ({
    adjustedTimeIn: '08:00 AM',
    status: 'On Time',
  })),
  calculatePayrollForTimeOut: vi.fn(() => ({
    adjustedTimeOut: '05:00 PM',
    workHours: '8.00',
    overtime: '0.00',
    requiresApproval: false,
  })),
  calculateBreakPunchUpdate: vi.fn(() => ({
    lunchOut: '12:00 PM',
    requiresApproval: false,
  })),
}));

vi.mock('../lib/AttendanceApprovalRules', () => ({
  findBlockingIncompleteAttendance: vi.fn(() => null),
  getIncompleteAttendanceReviewUpdate: vi.fn(() => ({ reviewStatus: 'Pending' })),
}));

describe('EmployeePortal business flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    getAllLogs.mockReturnValue([]);
    refreshLogsByDates.mockResolvedValue([]);
    authenticatedFetch.mockResolvedValue({
      json: async () => ({
        type: 'Sick Leave',
        startDate: '2026-05-12',
        endDate: '2026-05-13',
        reason: 'Medical recovery',
      }),
    });
    signInWithEmailAndPassword.mockResolvedValue(undefined);
    createUserWithEmailAndPassword.mockResolvedValue(undefined);
    addLeaveRequest.mockResolvedValue(undefined);
    addNotification.mockResolvedValue(undefined);
    uploadRequestAttachment.mockResolvedValue({ url: 'https://example.com/file.pdf' });
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });
  });

  it('requires employee credentials for manual portal login', async () => {
    const user = userEvent.setup();
    const { default: EmployeePortal } = await import('../components/EmployeePortal');

    render(<EmployeePortal onNavigate={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Manual Login' }));
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(showToast).toHaveBeenCalledWith('Enter your employee ID or email and PIN.', 'warning');
    expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('auto-fills and submits a leave request from the employee portal', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem('rsr_active_role', 'employee');
    sessionStorage.setItem('rsr_employee_id', employee.id);
    const { default: EmployeePortal } = await import('../components/EmployeePortal');

    render(<EmployeePortal onNavigate={vi.fn()} />);

    await user.click(await screen.findByRole('button', { name: /Apply for Leave/i }));
    await user.type(screen.getByPlaceholderText('Describe your leave request'), 'I need sick leave tomorrow and the next day for medical recovery.');
    await user.click(screen.getByRole('button', { name: 'Auto-fill' }));

    await waitFor(() => {
      expect(screen.getByDisplayValue('2026-05-12')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2026-05-13')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Medical recovery')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Submit Request' }));

    await waitFor(() => expect(addLeaveRequest).toHaveBeenCalledWith({
      employeeId: employee.id,
      startDate: '2026-05-12',
      endDate: '2026-05-13',
      type: 'sick',
      status: 'Pending',
      reason: 'Medical recovery',
      attachments: [],
    }));
    expect(addNotification).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Leave request submitted',
      employeeId: employee.id,
    }));
    expect(showToast).toHaveBeenCalledWith('Leave request submitted successfully!');
  });
});

describe('TimeClock attendance flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSyncSummary.mockResolvedValue({
      pending: 0,
      syncing: 0,
      failed: 0,
      retryReady: 0,
      totalOpen: 0,
    });
    savePunch.mockResolvedValue({ id: 'punch-1' });
    markSyncing.mockResolvedValue(undefined);
    markSynced.mockResolvedValue(undefined);
    markFailed.mockResolvedValue(undefined);
    refreshLogsByDates.mockResolvedValue([]);
    getAllLogs.mockReturnValue([]);
    addLog.mockResolvedValue(undefined);
    updateLog.mockResolvedValue(undefined);
    updateEmployee.mockResolvedValue(undefined);
    loadEmployees.mockResolvedValue([{ data: employee }]);
    verifyFace.mockResolvedValue(employee.id);
    Object.defineProperty(window, 'scrollTo', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      value: true,
    });
  });

  it('records a time-in punch after a successful kiosk face match', async () => {
    const user = userEvent.setup();
    const { default: TimeClock } = await import('../components/TimeClock');

    render(<TimeClock onNavigate={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Time In' }));

    await waitFor(() => expect(savePunch).toHaveBeenCalledWith(expect.objectContaining({
      employeeId: employee.id,
      employeeName: employee.name,
      action: 'Time In',
      siteId: 'Head Office',
      photoCaptured: true,
    })));
    expect(markSyncing).toHaveBeenCalledWith('punch-1');
    expect(addLog).toHaveBeenCalledWith(expect.objectContaining({
      employeeId: employee.id,
      timeIn: '08:00 AM',
      timeOut: '-',
      status: 'On Time',
      location: 'Head Office',
    }));
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining(`Welcome ${employee.name}! Time In recorded at`));
  });

  it('rejects time-out when the employee has not clocked in yet', async () => {
    const user = userEvent.setup();
    const { default: TimeClock } = await import('../components/TimeClock');

    render(<TimeClock onNavigate={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Time Out' }));

    await waitFor(() => expect(showToast).toHaveBeenCalledWith(
      `${employee.name}, you must clock in before clocking out`,
      'error',
    ));
    expect(addLog).not.toHaveBeenCalled();
    expect(updateLog).not.toHaveBeenCalled();
  });
});
