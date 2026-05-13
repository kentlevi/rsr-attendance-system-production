import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Services - use vi.hoisted() so these are available when vi.mock() is hoisted
const { showToast, addIncident, getAllIncidents, getAllEmployeesSync } = vi.hoisted(() => ({
  showToast: vi.fn(),
  addIncident: vi.fn(),
  getAllIncidents: vi.fn(),
  getAllEmployeesSync: vi.fn(),
}));

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));

vi.mock('../services/IncidentService', () => ({
  incidentService: {
    add: addIncident,
    getAll: getAllIncidents,
    subscribe: vi.fn(() => () => {}),
  },
}));

vi.mock('../services/EmployeeService', () => ({
  employeeService: {
    getAllEmployeesSync,
  },
}));


const mockEmployee = {
  id: 'emp-1',
  data: { name: 'John Incident' }
};

const mockIncident = {
  id: 'inc-1',
  data: {
    employeeId: 'emp-1',
    type: 'Infraction',
    date: '2026-05-12',
    title: 'No Uniform',
    description: 'Caught without proper uniform at site.',
    severity: 'Medium',
    acknowledged: false,
    createdBy: 'Admin',
  }
};

import { IncidentsView } from '../components/views/IncidentsView';

describe('Incident Reporting Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAllEmployeesSync.mockReturnValue([mockEmployee]);
    getAllIncidents.mockReturnValue([mockIncident]);
  });

  it('renders existing incidents correctly', async () => {
    render(<IncidentsView />);
    
    expect(screen.getByText('John Incident')).toBeTruthy();
    expect(screen.getByText('No Uniform')).toBeTruthy();
    expect(screen.getByText('Infraction')).toBeTruthy();
  });

  it('successfully logs a new incident via the modal', async () => {
    const user = userEvent.setup();
    render(<IncidentsView />);

    // Open Modal
    const logBtn = screen.getByRole('button', { name: /Log Incident/i });
    await user.click(logBtn);

    // Fill Form
    const selectTrigger = await screen.findByText(/Select Employee/i);
    await user.click(selectTrigger);
    const option = await screen.findByRole('button', { name: /John Incident/i });
    await user.click(option);

    const titleInput = screen.getByPlaceholderText(/Brief summary/i);
    await user.type(titleInput, 'Late arrival');

    const descInput = screen.getByPlaceholderText(/Detailed description/i);
    await user.type(descInput, 'Arrived 2 hours late without notice.');

    // Submit
    const saveBtn = screen.getByRole('button', { name: /Save Report/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(addIncident).toHaveBeenCalledWith(expect.objectContaining({
        employeeId: 'emp-1',
        title: 'Late arrival',
        type: 'Infraction'
      }));
    });

    expect(showToast).toHaveBeenCalledWith('Incident logged successfully');
  });

  it('filters incidents based on search query', async () => {
    const user = userEvent.setup();
    getAllIncidents.mockReturnValue([
        mockIncident,
        { id: 'inc-2', data: { ...mockIncident.data, title: 'Merit Award', type: 'Merit', employeeId: 'emp-1' } }
    ]);
    
    render(<IncidentsView />);
    
    expect(screen.getByText('No Uniform')).toBeTruthy();
    expect(screen.getByText('Merit Award')).toBeTruthy();

    const searchInput = screen.getByPlaceholderText(/Search incidents/i);
    await user.type(searchInput, 'Uniform');

    expect(screen.queryByText('Merit Award')).toBeNull();
    expect(screen.getByText('No Uniform')).toBeTruthy();
  });
});
