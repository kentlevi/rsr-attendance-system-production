import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock Services
const showToast = vi.fn();
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));

vi.mock('../services/EmployeeService', () => ({
  employeeService: {
    getAllEmployeesSync: vi.fn(() => []),
    addEmployee: vi.fn(() => Promise.resolve()),
    updateEmployee: vi.fn(() => Promise.resolve()),
    deleteEmployee: vi.fn(() => Promise.resolve()),
    initializeForUser: vi.fn(),
    stopSubscription: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    loadEmployees: vi.fn(() => Promise.resolve([])),
  }
}));

vi.mock('../services/FacialRecognitionService', () => ({
  facialRecognitionService: {
    initializeForAdmin: vi.fn(),
    stopSubscription: vi.fn(),
  }
}));

// Mock PapaParse
vi.mock('papaparse', () => ({
  default: {
    unparse: vi.fn(() => 'csv,data'),
    parse: vi.fn((file, config) => {
      config.complete({
        data: [
          { "First Name": "Alice", "Last Name": "Brown", "Email": "alice@example.com", "Department": "IT" }
        ]
      });
    }),
  }
}));

import { StaffView } from '../components/views/StaffView';
import { employeeService } from '../services/EmployeeService';
import Papa from 'papaparse';

describe('Advanced Staff Controls Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock URL.createObjectURL for exports
    global.URL.createObjectURL = vi.fn(() => 'blob:url');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('handles CSV import for multiple employees', async () => {
    render(<StaffView />);
    
    const file = new File(['csv content'], 'staff.csv', { type: 'text/csv' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    if (!input) throw new Error("File input not found");

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(employeeService.addEmployee).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Alice Brown',
        email: 'alice@example.com'
      }));
      expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/added successfully/i));
    });
  });

  it('triggers staff list export', async () => {
    const mockEmployees = [
      { id: '1', data: { id: '1', name: 'John Doe', email: 'john@example.com', department: 'Eng', status: 'Active' } }
    ];
    vi.mocked(employeeService.getAllEmployeesSync).mockReturnValue(mockEmployees as any);

    const user = userEvent.setup();
    render(<StaffView />);

    // Mock document.createElement and link.click
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const exportBtn = screen.getByRole('button', { name: /Export/i });
    await user.click(exportBtn);

    expect(Papa.unparse).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    
    clickSpy.mockRestore();
  });

  it('toggles employee status via action menu', async () => {
    const mockEmployees = [
      { id: '1', data: { id: '1', name: 'John Doe', status: 'Active' } }
    ];
    vi.mocked(employeeService.getAllEmployeesSync).mockReturnValue(mockEmployees as any);

    const user = userEvent.setup();
    render(<StaffView />);

    // Open action menu (MoreVertical icon button)
    const row = screen.getByText('John Doe').closest('tr');
    if (!row) throw new Error("Row not found");
    const actionsBtn = within(row).getByRole('button', { name: /Actions/i });
    
    await user.click(actionsBtn);

    // Click "Deactivate" (since status is Active)
    const deactivateBtn = await screen.findByRole('button', { name: /Deactivate/i });
    await user.click(deactivateBtn);

    await waitFor(() => {
      expect(employeeService.updateEmployee).toHaveBeenCalledWith('1', expect.objectContaining({
        status: 'Inactive'
      }));
    });
  });
});
