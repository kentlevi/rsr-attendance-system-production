import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock Services
const showToast = vi.fn();
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));

vi.mock('../services/SettingsService', () => ({
  settingsService: {
    getSettings: vi.fn(() => ({
      sites: ['Main Office'],
      shiftStartTime: '08:00',
      shiftEndTime: '17:00',
    })),
  }
}));

// Mock FacialRecognitionService
vi.mock('../services/FacialRecognitionService', () => ({
  facialRecognitionService: {
    initModels: vi.fn(() => Promise.resolve()),
    registerFace: vi.fn(() => Promise.resolve('mock-profile-id')),
    extractFaceDescriptor: vi.fn(() => Promise.resolve([0.1, 0.2])),
  }
}));

// Mock Utils
vi.mock('../lib/utils', async () => {
  const actual = await vi.importActual('../lib/utils');
  return {
    ...actual,
    resizeImage: vi.fn((img) => Promise.resolve(img)),
  };
});

// Mock framer-motion to avoid animation issues
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { AddEmployeeModal } from '../components/views/staff/AddEmployeeModal';

describe('Staff Management - AddEmployeeModal', () => {
  const onAdd = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates required fields when creating a new staff member', async () => {
    const user = userEvent.setup();
    render(<AddEmployeeModal isOpen={true} onClose={onClose} onAdd={onAdd} />);

    // Go to Facial Data tab
    await user.click(screen.getByRole('button', { name: /Facial Data/i }));
    
    // Save Employee
    const saveBtn = screen.getByRole('button', { name: /Save Employee/i });
    await user.click(saveBtn);

    expect(showToast).toHaveBeenCalledWith("Please fill in all required fields", "warning");
  });

  it('successfully creates a staff member when all fields are valid', async () => {
    const user = userEvent.setup();
    render(<AddEmployeeModal isOpen={true} onClose={onClose} onAdd={onAdd} />);

    // Personal Tab
    await user.type(screen.getByPlaceholderText(/Enter first name/i), 'Jane');
    await user.type(screen.getByPlaceholderText(/Enter last name/i), 'Doe');
    await user.click(screen.getByRole('button', { name: /Next/i }));

    // Employment Tab
    await user.type(screen.getByPlaceholderText(/Enter employee ID/i), 'EMP-999');
    
    // Select Department (Custom Select)
    const deptBtn = screen.getByRole('button', { name: /Select department/i });
    await user.click(deptBtn);
    const deptOption = screen.getByRole('button', { name: /Engineering/i });
    await user.click(deptOption);

    await user.type(screen.getByPlaceholderText(/Enter position or job title/i), 'Software Engineer');
    
    // Select Employment Type
    const typeBtn = screen.getByRole('button', { name: /Select employment type/i });
    await user.click(typeBtn);
    const typeOption = screen.getByRole('button', { name: /Regular/i });
    await user.click(typeOption);

    // Select Work Location (Site)
    const siteBtn = screen.getByRole('button', { name: /Select work location/i });
    await user.click(siteBtn);
    const siteOption = screen.getByRole('button', { name: /Main Office/i });
    await user.click(siteOption);
    
    // Skip to the end
    await user.click(screen.getByRole('button', { name: /Facial Data/i }));
    
    const saveBtn = screen.getByRole('button', { name: /Save Employee/i });
    await user.click(saveBtn);

    await waitFor(() => {
      expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Jane Doe',
        employeeId: 'EMP-999',
        department: 'Engineering',
        position: 'Software Engineer'
      }));
    });
    
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/successfully/i), "success");
    expect(onClose).toHaveBeenCalled();
  });
});
