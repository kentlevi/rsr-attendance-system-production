import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Papa from 'papaparse';

// Mock Services & Controller
const handleAddEmployee = vi.fn();
const handleUpdateEmployee = vi.fn();
const handleDeleteEmployee = vi.fn();
const handleToggleEmployeeStatus = vi.fn();
const handleResetEmployeeAccess = vi.fn();

vi.mock('../../controllers/StaffManagementController', () => ({
  useStaffManagementController: () => ({
    employees: [
        { data: { id: '1', name: 'Existing One', employeeId: 'EMP-001', department: 'HR', status: 'Active' } }
    ],
    selectedEmployeeId: null,
    setSelectedEmployeeId: vi.fn(),
    isAddEmployeeModalOpen: false,
    setIsAddEmployeeModalOpen: vi.fn(),
    editingEmployeeId: null,
    setEditingEmployeeId: vi.fn(),
    handleAddEmployee,
    handleUpdateEmployee,
    handleDeleteEmployee,
    handleToggleEmployeeStatus,
    handleResetEmployeeAccess,
  }),
}));

vi.mock('../common/StatsCard', () => ({
  StatsCard: () => <div data-testid="stats-card" />,
}));

// Mock PapaParse to control the CSV parsing
vi.mock('papaparse', async () => {
  const actual = await vi.importActual('papaparse');
  return {
    ...actual,
    parse: vi.fn((file, config) => {
        // Trigger complete immediately with mock data
        config.complete({
            data: [
                { "First Name": "Bulk", "Last Name": "One", "Email": "one@example.com", "Department": "IT" },
                { "First Name": "Bulk", "Last Name": "Two", "Email": "two@example.com", "Department": "Sales" }
            ]
        });
    }),
    unparse: vi.fn(() => 'mock,csv,content'),
  };
});

// Mock URL.createObjectURL and other browser APIs
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

import { StaffView } from '../components/views/StaffView';

describe('Staff Bulk Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('successfully imports multiple employees from a CSV file', async () => {
    render(<StaffView />);
    
    // Find the hidden file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    // Create a mock file
    const file = new File(['mock csv content'], 'staff.csv', { type: 'text/csv' });
    
    // Trigger the change event
    await fireEvent.change(fileInput, { target: { files: [file] } });

    // Verify that handleAddEmployee was called for each row in our mock data
    await waitFor(() => {
      expect(handleAddEmployee).toHaveBeenCalledTimes(2);
    });

    expect(handleAddEmployee).toHaveBeenNthCalledWith(1, expect.objectContaining({
      name: 'Bulk One',
      email: 'one@example.com',
      department: 'IT'
    }));

    expect(handleAddEmployee).toHaveBeenNthCalledWith(2, expect.objectContaining({
      name: 'Bulk Two',
      email: 'two@example.com',
      department: 'Sales'
    }));
  });

  it('exports the staff list to CSV when clicking the export button', async () => {
    const user = userEvent.setup();
    render(<StaffView />);
    
    // Mock document.createElement and click
    const link = {
        href: '',
        setAttribute: vi.fn(),
        click: vi.fn(),
        style: {}
    };
    const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(link as any);
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => ({} as any));
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => ({} as any));

    const exportBtn = screen.getByRole('button', { name: /Export CSV/i });
    await user.click(exportBtn);

    expect(Papa.unparse).toHaveBeenCalled();
    expect(link.click).toHaveBeenCalled();
    
    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});
