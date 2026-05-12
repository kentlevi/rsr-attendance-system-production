import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock Services
vi.mock('../services/AttendanceService', () => ({
  attendanceService: {
    getAllLogs: vi.fn(() => []),
    subscribe: vi.fn(() => vi.fn()),
  }
}));

vi.mock('../services/EmployeeService', () => ({
  employeeService: {
    getAllEmployeesSync: vi.fn(() => []),
    subscribe: vi.fn(() => vi.fn()),
  }
}));

// Mock Framer Motion (can be problematic in tests)
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    img: ({ ...props }: any) => <img {...props} />,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

import { PhotosView } from '../components/views/PhotosView';
import { attendanceService } from '../services/AttendanceService';
import { employeeService } from '../services/EmployeeService';

describe('Attendance Photos Audit Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders photo grid and handles expansion', async () => {
    const mockLogs = [
      {
        id: 'log-1',
        data: {
          id: 'log-1',
          employeeId: 'emp-1',
          date: '2023-10-27',
          timeIn: '08:00 AM',
          imageIn: 'https://example.com/photo-in.jpg',
          location: 'Main Office'
        }
      }
    ];

    const mockEmployees = [
      { id: 'emp-1', data: { name: 'John Doe' } }
    ];

    vi.mocked(attendanceService.getAllLogs).mockReturnValue(mockLogs as any);
    vi.mocked(employeeService.getAllEmployeesSync).mockReturnValue(mockEmployees as any);

    const user = userEvent.setup();
    render(<PhotosView />);

    // Check if photo item exists
    expect(screen.getByText('John Doe')).toBeDefined();
    expect(screen.getByText('Time In')).toBeDefined();
    
    // Check for the image (using alt or src)
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('https://example.com/photo-in.jpg');

    // Click to expand
    // The photo item itself is clickable (the container)
    // We can find the button with "ZoomIn" icon or just click the image
    await user.click(img);

    // Check if modal opened
    // The modal shows "John Doe" and "Attendance Photo Details"
    expect(screen.getByText(/Attendance Photo Details/i)).toBeDefined();
    expect(screen.getByText('Main Office')).toBeDefined();

    // Close modal
    const closeBtn = screen.getByRole('button', { name: /close/i });
    await user.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Attendance Photo Details/i)).toBeNull();
    });
  });

  it('filters photos by employee', async () => {
     const mockLogs = [
      { id: '1', data: { employeeId: 'emp-1', imageIn: 'url1', date: '2023-10-27' } },
      { id: '2', data: { employeeId: 'emp-2', imageIn: 'url2', date: '2023-10-27' } },
    ];
    const mockEmployees = [
      { id: 'emp-1', data: { name: 'Alice' } },
      { id: 'emp-2', data: { name: 'Bob' } },
    ];

    vi.mocked(attendanceService.getAllLogs).mockReturnValue(mockLogs as any);
    vi.mocked(employeeService.getAllEmployeesSync).mockReturnValue(mockEmployees as any);

    const user = userEvent.setup();
    render(<PhotosView />);

    // The Select component uses a button as a trigger
    const empSelectTrigger = screen.getByRole('button', { name: /All Employees/i });
    await user.click(empSelectTrigger);

    // After clicking, the options are rendered in a portal (body)
    const aliceOption = screen.getByRole('button', { name: /Alice/i });
    await user.click(aliceOption);

    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.queryByText('Bob')).toBeNull();
  });
});
