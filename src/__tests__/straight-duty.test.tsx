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
  ToastProvider: ({ children }: any) => <>{children}</>,
}));


vi.mock('../services/EmployeeService', () => ({
  employeeService: {
    getAllEmployeesSync: vi.fn(() => []),
  }
}));

// Redundant mocks removed as they are now global in setupTests.ts


import { StraightDutyView } from '../components/views/StraightDutyView';
import { employeeService } from '../services/EmployeeService';
import { ToastProvider } from '../context/ToastContext';

describe('Straight Duty Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows an assistant to file a straight duty request', async () => {
    const mockEmployee = {
      data: { id: 'emp-1', name: 'John Doe' }
    };
    vi.mocked(employeeService.getAllEmployeesSync).mockReturnValue([mockEmployee] as any);

    const user = userEvent.setup();
    // Render as Assistant
    render(
      <ToastProvider>
        <StraightDutyView isAssistant={true} />
      </ToastProvider>
    );


    // Open Modal
    const fileBtn = screen.getByRole('button', { name: /File Straight Duty/i });
    await user.click(fileBtn);

    // Select Employee (Custom Select)
    const selectTrigger = await screen.findByText(/Choose/i);
    await user.click(selectTrigger);

    const option = await screen.findByRole('button', { name: /John Doe/i });
    await user.click(option);

    // Select Date (Custom DatePicker)
    const dateBtn = screen.getByRole('button', { name: /Select date/i });
    await user.click(dateBtn);
    
    // Find the day "1" in the picker
    const dayOne = screen.getAllByRole('button', { name: /^1$/ }).find(el => el.closest('.sm\\:w-\\[340px\\]'));
    if (dayOne) {
       await user.click(dayOne);
    } else {
       // Fallback if the above selector is too brittle
       const allButtons = screen.getAllByRole('button');
       const firstOne = allButtons.find(b => b.textContent === '1');
       if (firstOne) await user.click(firstOne);
    }

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Submit Request/i });
    await user.click(submitBtn);

    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/submitted/i), "success");
    expect(screen.getByText('John Doe')).toBeDefined();
    expect(screen.getByText('Pending')).toBeDefined();
  });

  it('allows an admin to approve a pending straight duty request', async () => {
    const mockEmployee = {
      data: { id: 'emp-1', name: 'John Doe' }
    };
    vi.mocked(employeeService.getAllEmployeesSync).mockReturnValue([mockEmployee] as any);

    const user = userEvent.setup();
    // Render as Admin
    const { rerender } = render(
      <ToastProvider>
        <StraightDutyView isAssistant={true} />
      </ToastProvider>
    );

    // First file a request as assistant
    await user.click(screen.getByRole('button', { name: /File Straight Duty/i }));
    await user.click(await screen.findByText(/Choose/i));

    await user.click(await screen.findByRole('button', { name: /John Doe/i }));
    
    // Pick date
    await user.click(screen.getByRole('button', { name: /Select date/i }));
    const dayBtn = screen.getAllByRole('button').find(b => b.textContent === '1');
    if (dayBtn) await user.click(dayBtn);

    await user.click(screen.getByRole('button', { name: /Submit Request/i }));

    // Re-render as Admin (to see the action buttons)
    rerender(
      <ToastProvider>
        <StraightDutyView isAssistant={false} />
      </ToastProvider>
    );

    // Wait for the table to refresh and show the request
    const approveBtn = await screen.findByRole('button', { name: /Approve/i });
    await user.click(approveBtn);

    expect(showToast).toHaveBeenCalledWith("Request approved.", "success");
    expect(screen.getByText('Approved')).toBeDefined();
  });
});
