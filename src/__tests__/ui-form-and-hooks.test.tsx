import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, renderHook } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const showToast = vi.fn();

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));

vi.mock('../components/common/Modal', () => ({
  Modal: ({ isOpen, title, footer, children }: any) => (
    isOpen ? (
      <section aria-label={title}>
        <h1>{title}</h1>
        <div>{children}</div>
        <footer>{footer}</footer>
      </section>
    ) : null
  ),
}));

vi.mock('../services/SettingsService', () => ({
  settingsService: {
    getSettings: () => ({
      sites: ['Head Office', 'Site A'],
      activeSite: 'Head Office',
      shiftStartTime: '08:00',
      shiftEndTime: '17:00',
      shiftTemplates: [
        {
          id: 'night',
          name: 'Night',
          startTime: '22:00',
          endTime: '07:00',
        },
      ],
    }),
  },
}));

vi.mock('../services/AttendanceService', () => ({
  attendanceService: {
    getAllLogs: vi.fn(() => []),
  },
}));

vi.mock('react-webcam', () => ({
  default: React.forwardRef(() => <div data-testid="webcam" />),
}));

vi.mock('../services/FacialRecognitionService', () => ({
  facialRecognitionService: {
    initModels: vi.fn().mockResolvedValue(undefined),
    extractFaceDescriptor: vi.fn(),
    registerFace: vi.fn(),
  },
}));

describe('AddEmployeeModal form validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prevents saving when required employee fields are missing', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    const { AddEmployeeModal } = await import('../components/views/staff/AddEmployeeModal');

    render(<AddEmployeeModal isOpen onClose={vi.fn()} onAdd={onAdd} />);

    await user.click(screen.getByRole('button', { name: 'Facial Data' }));
    await user.click(screen.getByRole('button', { name: 'Save Employee' }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Please fill in all required fields', 'warning');
  });

  it('submits a normalized employee payload when required fields are valid', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    const { AddEmployeeModal } = await import('../components/views/staff/AddEmployeeModal');

    render(<AddEmployeeModal isOpen onClose={onClose} onAdd={onAdd} />);

    await user.click(screen.getByRole('button', { name: 'Personal' }));
    await user.type(screen.getByPlaceholderText('Enter first name'), 'Juan');
    await user.type(screen.getByPlaceholderText('Enter last name'), 'Dela Cruz');
    await user.type(screen.getByPlaceholderText('Enter email address'), ' juan@example.com ');
    await user.click(screen.getByRole('button', { name: 'Employment' }));
    await user.click(screen.getByRole('button', { name: 'Select department' }));
    await user.click(screen.getByRole('button', { name: 'Engineering' }));
    await user.type(screen.getByPlaceholderText('Enter position or job title'), 'Site Engineer');
    await user.click(screen.getByRole('button', { name: 'Facial Data' }));
    await user.click(screen.getByRole('button', { name: 'Save Employee' }));

    await waitFor(() => expect(onAdd).toHaveBeenCalledTimes(1));
    expect(onAdd.mock.calls[0][0]).toMatchObject({
      name: 'Juan Dela Cruz',
      email: 'juan@example.com',
      department: 'Engineering',
      position: 'Site Engineer',
      status: 'Active',
    });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('dashboard and controller hooks', () => {
  it('returns the current workforce dashboard summary values', async () => {
    const { useWorkforceInsightsController } = await import('../controllers/WorkforceInsightsController');

    const { result } = renderHook(() => useWorkforceInsightsController());

    expect(result.current.data).toEqual({
      totalEmployees: 156,
      activeToday: 142,
      lateArrivals: 14,
      absent: 5,
    });
  });
});
