import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Services
const showToast = vi.fn();
const addRequest = vi.fn();
const getEmployeeByIdSync = vi.fn();
const getAllEmployeesSync = vi.fn();

vi.mock('../../../context/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));

vi.mock('../../../services/LeaveService', () => ({
  leaveService: {
    addRequest,
    subscribe: vi.fn(() => () => {}),
  },
}));

const mockEmployee = {
  id: 'emp-leave',
  name: 'Leave Tester',
  vlBalance: 2,
  slBalance: 1,
  department: 'QA',
};

vi.mock('../../../services/EmployeeService', () => ({
  employeeService: {
    getEmployeeByIdSync,
    getAllEmployeesSync,
  },
}));

vi.mock('../../common/Modal', () => ({
  Modal: ({ children, isOpen, title, footer }: any) => isOpen ? (
    <div data-testid="modal">
      <h1>{title}</h1>
      {children}
      <div data-testid="modal-footer">{footer}</div>
    </div>
  ) : null,
}));

// Mock DatePicker to simplify input
vi.mock('../../common/DatePicker', () => ({
  DatePicker: ({ value, onChange, placeholder }: any) => (
    <input 
      data-testid="date-picker"
      value={value} 
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)} 
    />
  ),
}));

import { FileLeaveModal } from '../components/views/common/FileLeaveModal';

describe('Leave Credit Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getEmployeeByIdSync.mockReturnValue({ data: mockEmployee });
    getAllEmployeesSync.mockReturnValue([{ data: mockEmployee }]);
  });

  it('prevents filing a leave request that exceeds available credits', async () => {
    const user = userEvent.setup();
    render(<FileLeaveModal isOpen={true} onClose={vi.fn()} />);

    // Select Employee
    const select = screen.getByLabelText(/Select Employee/i);
    await user.selectOptions(select, 'emp-leave');

    // Select Vacation Leave (Type is vacation by default)
    
    // Set Dates: 2026-06-01 to 2026-06-04 (4 days, but balance is 2)
    const datePickers = screen.getAllByTestId('date-picker');
    await user.type(datePickers[0], '2026-06-01');
    await user.type(datePickers[1], '2026-06-04');

    // Submit
    const submitBtn = screen.getByRole('button', { name: /File Request/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining('Insufficient Vacation Leave credits'),
        'warning'
      );
    });

    expect(addRequest).not.toHaveBeenCalled();
  });

  it('allows filing a leave request within available credits', async () => {
    const user = userEvent.setup();
    render(<FileLeaveModal isOpen={true} onClose={vi.fn()} />);

    const select = screen.getByLabelText(/Select Employee/i);
    await user.selectOptions(select, 'emp-leave');

    // Set Dates: 2026-06-01 to 2026-06-02 (2 days, balance is 2)
    const datePickers = screen.getAllByTestId('date-picker');
    await user.clear(datePickers[0]);
    await user.type(datePickers[0], '2026-06-01');
    await user.clear(datePickers[1]);
    await user.type(datePickers[1], '2026-06-02');

    const submitBtn = screen.getByRole('button', { name: /File Request/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(addRequest).toHaveBeenCalled();
    });

    expect(showToast).toHaveBeenCalledWith(
        expect.stringContaining('successfully'),
        'success'
    );
  });
});
