import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock Services
const showToast = vi.fn();
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));

vi.mock('../services/AttendanceService', () => ({
  attendanceService: {
    getAllLogs: vi.fn(),
    updateLog: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
  }
}));

vi.mock('../services/EmployeeService', () => ({
  employeeService: {
    getEmployeeByIdSync: vi.fn(),
    getAllEmployeesSync: vi.fn(() => []),
    updateEmployee: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
  }
}));

vi.mock('../services/LeaveService', () => ({
  leaveService: {
    getAllRequests: vi.fn(),
    updateRequest: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
  }
}));

vi.mock('../services/AwolService', () => ({
  awolService: {
    processAwolAlerts: vi.fn(),
  }
}));

// Mock Business Rules to avoid deep logic testing here (focus on flow)
vi.mock('../lib/AttendanceApprovalRules', () => ({
  applyAttendanceApprovalDecision: vi.fn((log) => ({ ...log, attendanceApprovalStatus: 'Approved' })),
  needsAttendanceApproval: vi.fn((log) => log.data.status === 'Pending Approval'),
}));

vi.mock('../lib/RequestApprovalRules', () => ({
  applyLeaveApprovalDecision: vi.fn((req) => ({ ...req, status: 'Approved' })),
  calculateLeaveBalanceUpdate: vi.fn(() => ({ ok: true, update: {} })),
}));

import { ApprovalsView } from '../components/views/ApprovalsView';
import { attendanceService } from '../services/AttendanceService';
import { leaveService } from '../services/LeaveService';
import { employeeService } from '../services/EmployeeService';

describe('Approvals Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows an admin to approve a pending attendance log', async () => {
    const mockLog = {
      id: 'log-1',
      data: {
        id: 'log-1',
        employeeId: 'emp-1',
        date: '2023-10-27',
        timeIn: '08:00 AM',
        timeOut: '05:00 PM',
        status: 'Pending Approval',
        attendanceApprovalStatus: 'Pending Review',
      }
    };
    const mockEmployee = {
      id: 'emp-1',
      data: { name: 'John Doe', department: 'Engineering' }
    };

    vi.mocked(attendanceService.getAllLogs).mockReturnValue([mockLog] as any);
    vi.mocked(employeeService.getEmployeeByIdSync).mockReturnValue(mockEmployee as any);
    vi.mocked(leaveService.getAllRequests).mockReturnValue([]);

    const user = userEvent.setup();
    render(<ApprovalsView />);

    // Check if log is displayed
    expect(screen.getByText('John Doe')).toBeDefined();
    expect(screen.getByText('Pending attendance approval')).toBeDefined();

    // Click Approve
    const approveBtn = screen.getByRole('button', { name: /Approve/i });
    await user.click(approveBtn);

    await waitFor(() => {
      expect(attendanceService.updateLog).toHaveBeenCalledWith('log-1', expect.any(Object));
      expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/approval approved/i), 'success');
    });
  });

  it('allows an admin to approve a leave request', async () => {
    const mockRequest = {
      id: 'req-1',
      data: {
        id: 'req-1',
        employeeId: 'emp-1',
        type: 'Sick Leave',
        startDate: '2023-10-28',
        endDate: '2023-10-29',
        status: 'Pending',
        reason: 'Flu',
      }
    };
    const mockEmployee = {
      id: 'emp-1',
      data: { name: 'John Doe', department: 'Engineering' }
    };

    vi.mocked(attendanceService.getAllLogs).mockReturnValue([]);
    vi.mocked(employeeService.getEmployeeByIdSync).mockReturnValue(mockEmployee as any);
    vi.mocked(leaveService.getAllRequests).mockReturnValue([mockRequest] as any);

    const user = userEvent.setup();
    render(<ApprovalsView />);

    // Check if leave request is displayed
    expect(screen.getByText('Sick Leave')).toBeDefined();
    expect(screen.getByText('Flu')).toBeDefined();

    // Click Approve on the second table (Leave Approvals)
    // There are multiple Approve buttons if both tables have data.
    // Here we only have leave requests.
    const approveBtn = screen.getByRole('button', { name: /Approve/i });
    await user.click(approveBtn);

    await waitFor(() => {
      expect(leaveService.updateRequest).toHaveBeenCalledWith('req-1', expect.any(Object));
      expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/leave request approved/i), 'success');
    });
  });
});
