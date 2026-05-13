import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock Services - use vi.hoisted() so these are available when vi.mock() is hoisted
const { showToast, hideToast, updateLog, updateRequest, updateEmployee, getAllLogs, getAllRequests, getEmployeeByIdSync, getAllEmployeesSync } = vi.hoisted(() => ({
  showToast: vi.fn(),
  hideToast: vi.fn(),
  updateLog: vi.fn(),
  updateRequest: vi.fn(),
  updateEmployee: vi.fn(),
  getAllLogs: vi.fn(() => []),
  getAllRequests: vi.fn(() => []),
  getEmployeeByIdSync: vi.fn(() => null),
  getAllEmployeesSync: vi.fn(() => []),
}));

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast, hideToast }),
  ToastProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock('../services/AttendanceService', () => ({
  attendanceService: {
    getAllLogs,
    subscribe: vi.fn(() => () => {}),
    updateLog,
  },
}));

vi.mock('../services/LeaveService', () => ({
  leaveService: {
    getAllRequests,
    subscribe: vi.fn(() => () => {}),
    updateRequest,
  },
}));

vi.mock('../services/EmployeeService', () => ({
  employeeService: {
    getEmployeeByIdSync,
    getAllEmployeesSync,
    updateEmployee,
    subscribe: vi.fn(() => () => {}),
  },
}));

vi.mock('../services/AwolService', () => ({
  awolService: {
    processAwolAlerts: vi.fn(async () => {}),
  },
}));

vi.mock('../components/views/common/FileLeaveModal', () => ({
  FileLeaveModal: () => <div data-testid="file-leave-modal" />,
}));



const mockEmployee = {
  id: 'emp-1',
  name: 'John Doe',
  vlBalance: 10,
  slBalance: 5,
  avatar: '',
  department: 'IT',
};

const mockLeaveRequest = {
  id: 'leave-1',
  employeeId: 'emp-1',
  type: 'vacation',
  startDate: '2026-06-01',
  endDate: '2026-06-03', // 3 days
  status: 'Pending',
  reason: 'Vacation time',
};

import { ApprovalsView } from '../components/views/ApprovalsView';
import { leaveService } from '../services/LeaveService';
import { employeeService } from '../services/EmployeeService';
import { ToastProvider } from '../context/ToastContext';

describe('Leave Approval Deduction Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllLogs.mockReturnValue([]);
    getAllRequests.mockReturnValue([{ data: mockLeaveRequest }]);
    getEmployeeByIdSync.mockReturnValue({ data: mockEmployee });
    getAllEmployeesSync.mockReturnValue([mockEmployee]);
  });

  it('deducts leave credits from employee balance when leave is approved', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <ApprovalsView />
      </ToastProvider>
    );


    // DataTable renders mobile + desktop layouts simultaneously, so each button appears twice.
    const approveBtn = screen.getAllByRole('button', { name: /Approve/i })[0];
    await user.click(approveBtn);

    // Verify employee balance update
    // 10 VL - 3 requested = 7 VL remaining
    await waitFor(() => {
      expect(updateEmployee).toHaveBeenCalledWith('emp-1', {
        vlBalance: 7
      });
    });

    // Verify leave request status update
    expect(updateRequest).toHaveBeenCalledWith('leave-1', expect.objectContaining({
      status: 'Approved'
    }));

    expect(showToast).toHaveBeenCalledWith(
      expect.stringMatching(/Leave request approved/i),
      'success'
    );
  });

  it('prevents approval if balance has become insufficient since filing', async () => {
    const user = userEvent.setup();
    
    // Mock employee with insufficient balance now (maybe used elsewhere)
    getEmployeeByIdSync.mockReturnValue({ 
        data: { ...mockEmployee, vlBalance: 1 } 
    });

    render(
      <ToastProvider>
        <ApprovalsView />
      </ToastProvider>
    );


    const approveBtn = screen.getAllByRole('button', { name: /Approve/i })[0];
    await user.click(approveBtn);

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining('Insufficient Vacation Leave balance'),
        'warning'
      );
    });

    // Should NOT update employee or request status
    expect(updateEmployee).not.toHaveBeenCalled();
    expect(updateRequest).not.toHaveBeenCalled();
  });
});
