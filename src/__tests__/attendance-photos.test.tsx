import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock Services - use vi.hoisted() so these are available when vi.mock() is hoisted
const { showToast, getAllLogs, getAllEmployeesSync } = vi.hoisted(() => ({
  showToast: vi.fn(),
  getAllLogs: vi.fn(() => []),
  getAllEmployeesSync: vi.fn(() => []),
}));

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));

vi.mock('../services/AttendanceService', () => ({
  attendanceService: {
    getAllLogs,
    subscribe: vi.fn(() => () => {}),
    updateLog: vi.fn(),
  }
}));

vi.mock('../services/EmployeeService', () => ({
  employeeService: {
    getAllEmployeesSync,
    subscribe: vi.fn(() => () => {}),
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
    vi.mocked(attendanceService.getAllLogs).mockReturnValue([]);
    vi.mocked(employeeService.getAllEmployeesSync).mockReturnValue([]);
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
      { id: 'emp-1', data: { id: 'emp-1', name: 'John Doe' } },
    ];

    vi.mocked(attendanceService.getAllLogs).mockReturnValue(mockLogs as any);
    vi.mocked(employeeService.getAllEmployeesSync).mockReturnValue(mockEmployees as any);

    const user = userEvent.setup();
    render(<PhotosView />);

    // Check if photo item exists
    await waitFor(async () => {
       const elements = await screen.findAllByText('John Doe');
       expect(elements.length).toBeGreaterThan(0);
    }, { timeout: 10000 });
    expect(screen.getByText('Time In')).toBeDefined();

    // Check for the image
    const img = screen.getByRole('img');
    expect(img.getAttribute('src')).toBe('https://example.com/photo-in.jpg');

    // Open modal via the ZoomIn button (the photo card's expand button)
    // The button is positioned over the image; jsdom doesn't run hover styles
    // so just grab all buttons and pick the one matching the photo
    const photoCard = img.closest('div.relative.group');
    expect(photoCard).not.toBeNull();
    const zoomBtn = within(photoCard as HTMLElement).getAllByRole('button')[0];
    await user.click(zoomBtn);

    // Modal shows "Punch Timestamp" and the location (appears in both card and modal)
    await waitFor(() => {
      expect(screen.getByText(/Punch Timestamp/i)).toBeDefined();
    });
    expect(screen.getAllByText('Main Office').length).toBeGreaterThan(0);

    // Close modal — find the X button inside the modal (the one containing the lucide-x icon)
    const buttons = screen.getAllByRole('button');
    const closeBtn = buttons.find((b) => b.querySelector('.lucide-x'));
    expect(closeBtn).toBeDefined();
    await user.click(closeBtn!);

    await waitFor(() => {
      expect(screen.queryByText(/Punch Timestamp/i)).toBeNull();
    });
  });

  it('filters photos by employee', async () => {
     const mockLogs = [
      { id: '1', data: { id: '1', employeeId: 'emp-1', imageIn: 'url1', date: '2023-10-27' } },
      { id: '2', data: { id: '2', employeeId: 'emp-2', imageIn: 'url2', date: '2023-10-27' } },
    ];
    const mockEmployees = [
      { id: 'emp-1', data: { id: 'emp-1', name: 'Alice' } },
      { id: 'emp-2', data: { id: 'emp-2', name: 'Bob' } },
    ];

    vi.mocked(attendanceService.getAllLogs).mockReturnValue(mockLogs as any);
    vi.mocked(employeeService.getAllEmployeesSync).mockReturnValue(mockEmployees as any);

    const user = userEvent.setup();
    render(<PhotosView />);

    // Initially both Alice and Bob are present in the photo grid
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeDefined();
      expect(screen.getByText('Bob')).toBeDefined();
    });

    // Open the employee Select dropdown
    const empSelectTrigger = screen.getByText(/All Employees/i);
    await user.click(empSelectTrigger);

    // Click the Alice option (rendered in a portal)
    const aliceOption = await screen.findByRole('button', { name: /^Alice$/i });
    await user.click(aliceOption);

    // After filtering, Bob should no longer appear
    await waitFor(() => {
      expect(screen.queryByText('Bob')).toBeNull();
    }, { timeout: 10000 });
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
    // Alice should still be visible (in the photo card and/or the select trigger)
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
  });
});
