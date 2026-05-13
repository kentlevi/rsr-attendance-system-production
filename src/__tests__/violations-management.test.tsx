import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock Services
vi.mock('../services/IncidentService', () => ({
  incidentService: {
    getAll: vi.fn(() => []),
    subscribe: vi.fn(() => vi.fn()),
  }
}));

vi.mock('../services/EmployeeService', () => ({
  employeeService: {
    getEmployeeByIdSync: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
  }
}));

import { ViolationsView } from '../components/views/ViolationsView';
import { incidentService } from '../services/IncidentService';
import { employeeService } from '../services/EmployeeService';

describe('Violations Management Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders infractions and applies filters', async () => {
    const mockInfractions = [
      {
        id: '1',
        data: {
          employeeId: 'emp-1',
          type: 'Infraction',
          title: 'Unexcused Absence',
          severity: 'High',
          date: '2023-10-27',
          acknowledged: false
        }
      },
      {
        id: '2',
        data: {
          employeeId: 'emp-2',
          type: 'Infraction',
          title: 'Late Clock-in',
          severity: 'Low',
          date: '2023-10-26',
          acknowledged: true
        }
      }
    ];

    const mockEmployees: any = {
      'emp-1': { id: 'emp-1', data: { name: 'John Doe' } },
      'emp-2': { id: 'emp-2', data: { name: 'Jane Smith' } }
    };

    vi.mocked(incidentService.getAll).mockReturnValue(mockInfractions as any);
    vi.mocked(employeeService.getEmployeeByIdSync).mockImplementation((id: string) => mockEmployees[id]);

    const user = userEvent.setup();
    render(<ViolationsView />);

    // DataTable renders mobile + desktop layouts, so cells appear in multiple places.
    expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Unexcused Absence').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0);

    // Filter by Severity
    const severitySelectTrigger = screen.getByRole('button', { name: /All Severities/i });
    await user.click(severitySelectTrigger);
    const highOption = screen.getByRole('button', { name: /High Severity/i });
    await user.click(highOption);

    expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
    expect(screen.queryByText('Jane Smith')).toBeNull();

    // Reset filter
    await user.click(screen.getAllByRole('button', { name: /High Severity/i })[0]);
    await user.click(screen.getAllByRole('button', { name: /All Severities/i })[0]);

    const searchInput = screen.getByPlaceholderText(/Search violations/i);
    await user.type(searchInput, 'Smith');

    expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0);
    expect(screen.queryByText('John Doe')).toBeNull();
  });
});
