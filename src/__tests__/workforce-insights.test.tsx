import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock Services - use vi.hoisted() so showToast is available when vi.mock() is hoisted
const { showToast } = vi.hoisted(() => ({
  showToast: vi.fn(),
}));
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));

vi.mock('../services/AttendanceService', () => ({
  attendanceService: {
    getAllLogs: vi.fn(() => []),
    subscribe: vi.fn(() => vi.fn()),
  }
}));

vi.mock('../services/EmployeeService', () => ({
  employeeService: {
    getEmployeeByIdSync: vi.fn(),
    getAllEmployeesSync: vi.fn(() => []),
    subscribe: vi.fn(() => vi.fn()),
  }
}));

vi.mock('../services/UndertimeService', () => ({
  undertimeService: {
    getAllRequests: vi.fn(() => []),
    updateRequest: vi.fn(() => Promise.resolve()),
    subscribe: vi.fn(() => vi.fn()),
  }
}));

vi.mock('../services/AllowanceService', () => ({
  allowanceService: {
    getAll: vi.fn(() => []),
    subscribe: vi.fn(() => vi.fn()),
  }
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Recharts (since it depends on DOM measurements)
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  PieChart: ({ children }: any) => <div>{children}</div>,
  AreaChart: ({ children }: any) => <div>{children}</div>,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Area: () => null,
  Pie: () => null,
  Cell: () => null,
  Tooltip: () => null,
}));

import { WorkforceInsightsView } from '../components/views/WorkforceInsightsView';
import { attendanceService } from '../services/AttendanceService';
import { employeeService } from '../services/EmployeeService';
import { undertimeService } from '../services/UndertimeService';

describe('Workforce Insights View', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders stats correctly based on attendance logs', async () => {
    // Use ISO UTC date to match component's default selectedDate (toISOString().split('T')[0])
    const today = new Date().toISOString().split('T')[0];
    const mockLogs = [
      { data: { employeeId: 'emp-1', status: 'Present', date: today } },
      { data: { employeeId: 'emp-2', status: 'Late', date: today } },
    ];
    const mockEmployees = [
      { id: 'emp-1', data: { name: 'John Doe' } },
      { id: 'emp-2', data: { name: 'Jane Smith' } },
      { id: 'emp-3', data: { name: 'Bob Wilson' } },
    ];

    vi.mocked(attendanceService.getAllLogs).mockReturnValue(mockLogs as any);
    vi.mocked(employeeService.getAllEmployeesSync).mockReturnValue(mockEmployees as any);

    render(<WorkforceInsightsView />);

    // Check stats cards
    // 2 present (Present + Late), 1 absent (Bob Wilson)
    expect(await screen.findAllByText('2')).toBeDefined(); // Active Today
    expect(await screen.findAllByText('1')).toBeDefined(); // Absent
  });

  it('allows an admin to approve an undertime request', async () => {
    const today = new Date().toISOString().split('T')[0];
    const mockRequest = {
      data: {
        id: 'req-1',
        employeeId: 'emp-1',
        type: 'Personal',
        date: today,
        status: 'Pending Review',
        timeLost: '2.0h'
      }
    };
    const mockEmployee = { id: 'emp-1', data: { name: 'John Doe', department: 'Eng' } };

    vi.mocked(undertimeService.getAllRequests).mockReturnValue([mockRequest] as any);
    vi.mocked(employeeService.getEmployeeByIdSync).mockReturnValue(mockEmployee as any);
    vi.mocked(employeeService.getAllEmployeesSync).mockReturnValue([mockEmployee] as any);

    const user = userEvent.setup();
    render(<WorkforceInsightsView />);

    // Scope search to Undertime Summary card's header row
    const undertimeHeader = await screen.findByText(/Undertime Summary/i);
    const headerRow = undertimeHeader.closest('.flex.items-center.justify-between');
    if (!headerRow) throw new Error("Undertime header row not found");
    
    const viewAllBtn = within(headerRow as HTMLElement).getByRole('button', { name: /View all/i });
    await user.click(viewAllBtn);

    // Now in Modal
    const modal = await screen.findByRole('dialog');
    expect(within(modal).getAllByText('John Doe')[0]).toBeDefined();
    
    // DataTable inside modal renders mobile + desktop layouts, so the button appears twice.
    const approveBtn = within(modal).getAllByRole('button', { name: /Approve/i })[0];
    await user.click(approveBtn);

    await waitFor(() => {
      expect(undertimeService.updateRequest).toHaveBeenCalledWith('req-1', { status: 'Approved' });
    });
  });
});
