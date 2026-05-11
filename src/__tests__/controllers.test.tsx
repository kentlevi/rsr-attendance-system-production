import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

const showToast = vi.fn();
const employeeService = {
  getAllEmployeesSync: vi.fn(),
  initializeForUser: vi.fn(),
  stopSubscription: vi.fn(),
  subscribe: vi.fn(),
  loadEmployees: vi.fn(),
  addEmployee: vi.fn(),
  updateEmployee: vi.fn(),
  deleteEmployee: vi.fn(),
};
const facialRecognitionService = {
  initializeForAdmin: vi.fn(),
  stopSubscription: vi.fn(),
};
const deleteField = vi.fn(() => ({ __delete: true }));

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));

vi.mock('../services/EmployeeService', () => ({
  employeeService,
}));

vi.mock('../services/FacialRecognitionService', () => ({
  facialRecognitionService,
}));

vi.mock('../lib/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'admin-uid',
      email: 'admin@rsr.com',
    },
  },
}));

vi.mock('firebase/firestore', () => ({
  deleteField,
}));

describe('StaffManagementController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    employeeService.getAllEmployeesSync.mockReturnValue([
      {
        data: {
          id: 'EMP-001',
          status: 'Active',
          name: 'Employee One',
          notes: '',
        },
      },
    ]);
    employeeService.subscribe.mockReturnValue(vi.fn());
    employeeService.loadEmployees.mockResolvedValue([]);
  });

  it('initializes staff management subscriptions for an admin user', async () => {
    const { useStaffManagementController } = await import('../controllers/StaffManagementController');

    renderHook(() => useStaffManagementController());

    expect(employeeService.initializeForUser).toHaveBeenCalledWith(true, 'admin-uid');
    await waitFor(() => expect(facialRecognitionService.initializeForAdmin).toHaveBeenCalled());
  });

  it('adds, updates, deletes, toggles, and resets employee access through the service layer', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const { useStaffManagementController } = await import('../controllers/StaffManagementController');
    const { result } = renderHook(() => useStaffManagementController());

    await act(async () => {
      await result.current.handleAddEmployee({
        id: 'EMP-002',
        name: 'Employee Two',
        email: 'two@rsr.com',
        department: 'Engineering',
        position: 'Engineer',
        status: 'Active',
        lastLogin: '-',
      } as any);
    });
    await act(async () => {
      await result.current.handleUpdateEmployee('EMP-001', { position: 'Lead Engineer' });
    });
    await act(async () => {
      await result.current.handleDeleteEmployee('EMP-001');
    });
    await act(async () => {
      await result.current.handleToggleEmployeeStatus('EMP-001', 'Active');
    });
    await act(async () => {
      await result.current.handleResetEmployeeAccess('EMP-001');
    });

    expect(employeeService.addEmployee).toHaveBeenCalledWith(expect.objectContaining({ id: 'EMP-002' }));
    expect(employeeService.updateEmployee).toHaveBeenCalledWith('EMP-001', { position: 'Lead Engineer' });
    expect(employeeService.deleteEmployee).toHaveBeenCalledWith('EMP-001');
    expect(employeeService.updateEmployee).toHaveBeenCalledWith(
      'EMP-001',
      expect.objectContaining({ status: 'Inactive' }),
    );
    expect(employeeService.updateEmployee).toHaveBeenCalledWith(
      'EMP-001',
      expect.objectContaining({
        pin: '100000',
        facialRecognitionProfileId: { __delete: true },
        facialDataImage: { __delete: true },
      }),
    );
    expect(showToast).toHaveBeenCalledWith('Access reset. New PIN: 100000', 'warning');
  });
});
