import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock jsPDF
const mockSave = vi.fn();
const mockText = vi.fn();
const mockAutoTable = vi.fn();

vi.mock('jspdf', () => {
  return {
    jsPDF: vi.fn().mockImplementation(() => ({
      save: mockSave,
      text: mockText,
      setFontSize: vi.fn(),
      setFont: vi.fn(),
      autoTable: mockAutoTable,
      previousAutoTable: { finalY: 120 }
    }))
  };
});

// Mock Services
const showToast = vi.fn();
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));

vi.mock('../components/common/DatePicker', () => ({
  DatePicker: ({ value, onChange, placeholder }: any) => (
    <input 
      data-testid="date-picker"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock('../services/EmployeeService', () => ({
  employeeService: {
    getAllEmployeesSync: vi.fn(() => []),
    subscribe: vi.fn(() => vi.fn()),
  }
}));

import { PayrollView } from '../components/views/PayrollView';
import { employeeService } from '../services/EmployeeService';

describe('Payroll Management Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders employee list and calculates payroll on PDF generation', async () => {
    const mockEmployee = {
      id: 'emp-1',
      data: {
        id: 'emp-1',
        name: 'John Doe',
        department: 'Engineering',
        position: 'Software Engineer',
        dailyRate: '1000'
      }
    };

    vi.mocked(employeeService.getAllEmployeesSync).mockReturnValue([mockEmployee] as any);

    const user = userEvent.setup();
    render(<PayrollView />);

    // Check if employee is in the table
    expect(screen.getByText('John Doe')).toBeDefined();
    expect(screen.getByText('₱ 1000')).toBeDefined();

    // Set date range (simulated via service state if needed, but here it's local state)
    // We'll target the DatePickers by placeholder
    // Set date range using our mocked input
    const datePickers = screen.getAllByTestId('date-picker');
    const startInput = datePickers[0];
    const endInput = datePickers[1];

    await user.type(startInput, '2023-10-01');
    await user.type(endInput, '2023-10-15');

    // Generate PDF
    const generateBtn = screen.getByRole('button', { name: /Generate PDF/i });
    await user.click(generateBtn);

    // Verify PDF content calculation
    // Basic Pay for 14 days (Oct 1 to Oct 15 is 14 days difference, ceil might make it 15 or 14)
    // Let's check the code: 
    // const timeDiff = Math.abs(new Date(endPeriod).getTime() - new Date(startPeriod).getTime());
    // const totalDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) || 15;
    // Oct 15 - Oct 1 = 14 days. 
    
    await waitFor(() => {
      // Filename check
      expect(mockSave).toHaveBeenCalledWith(expect.stringMatching(/John_Doe_Payslip.pdf/i));
      
      // Calculation check (Basic Pay should be in the autoTable call)
      // basicPay = 1000 * 14 = 14000
      // tax = 14000 * 0.1 = 1400
      expect(mockAutoTable).toHaveBeenCalledWith(expect.objectContaining({
        body: expect.arrayContaining([
          expect.arrayContaining(['Basic Pay', 'P 14000.00', 'Withholding Tax', 'P 1400.00'])
        ])
      }));
    });
  });

  it('filters employee list by name', async () => {
    const mockEmployees = [
      { id: '1', data: { name: 'Alice Smith', department: 'HR' } },
      { id: '2', data: { name: 'Bob Wilson', department: 'Sales' } },
    ];
    vi.mocked(employeeService.getAllEmployeesSync).mockReturnValue(mockEmployees as any);

    const user = userEvent.setup();
    render(<PayrollView />);

    const searchInput = screen.getByPlaceholderText(/Search employee/i);
    await user.type(searchInput, 'Alice');

    expect(screen.getByText('Alice Smith')).toBeDefined();
    expect(screen.queryByText('Bob Wilson')).toBeNull();
  });
});
