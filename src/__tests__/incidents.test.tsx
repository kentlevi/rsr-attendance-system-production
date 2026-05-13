import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock Services
const showToast = vi.fn();
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));

vi.mock('../services/IncidentService', () => ({
  incidentService: {
    getAll: vi.fn(() => []),
    add: vi.fn(() => Promise.resolve()),
    subscribe: vi.fn(() => vi.fn()),
  }
}));

vi.mock('../services/EmployeeService', () => ({
  employeeService: {
    getAllEmployeesSync: vi.fn(() => []),
    subscribe: vi.fn(() => vi.fn()),
  }
}));

import { IncidentsView } from '../components/views/IncidentsView';
import { incidentService } from '../services/IncidentService';
import { employeeService } from '../services/EmployeeService';

describe('Incidents Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows an admin to log a new incident report', async () => {
    const mockEmployee = {
      id: 'emp-1',
      data: { name: 'John Doe', department: 'Engineering' }
    };

    vi.mocked(employeeService.getAllEmployeesSync).mockReturnValue([mockEmployee] as any);
    vi.mocked(incidentService.getAll).mockReturnValue([]);

    const user = userEvent.setup();
    render(<IncidentsView />);

    // Open Modal
    const logBtn = screen.getByRole('button', { name: /Log Incident/i });
    await user.click(logBtn);

    // Fill Form
    // Select Employee (Custom Select)
    const selectTrigger = screen.getByRole('button', { name: /Select Employee/i });
    await user.click(selectTrigger);
    const option = screen.getByRole('button', { name: /John Doe/i });
    await user.click(option);

    await user.type(screen.getByPlaceholderText(/Brief summary/i), 'Equipment Damage');
    await user.type(screen.getByPlaceholderText(/detailed information/i), 'Broke a laptop screen');
    
    // Type/Severity are already set to Infraction/Medium by default

    // Submit
    const saveBtn = screen.getByRole('button', { name: /Save Report/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(incidentService.add).toHaveBeenCalledWith(expect.objectContaining({
        employeeId: 'emp-1',
        title: 'Equipment Damage',
        description: 'Broke a laptop screen',
        type: 'Infraction',
        severity: 'Medium'
      }));
      expect(showToast).toHaveBeenCalledWith('Incident logged successfully');
    });
  });

  it('validates required fields in incident form', async () => {
    const user = userEvent.setup();
    render(<IncidentsView />);

    const logBtn = screen.getByRole('button', { name: /Log Incident/i });
    await user.click(logBtn);

    const saveBtn = screen.getByRole('button', { name: /Save Report/i });
    await user.click(saveBtn);

    expect(showToast).toHaveBeenCalledWith('Please fill in all required fields', 'warning');
    expect(incidentService.add).not.toHaveBeenCalled();
  });
});
