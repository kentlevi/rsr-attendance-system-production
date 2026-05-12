import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
      activeSite: 'Main Office',
      sites: ['Main Office', 'Site A'],
      dailyAllowance: 100,
      otAllowance: 50,
      awaySiteAllowance: 200,
      awaySiteAllowanceRule: 'Apply when employee is assigned outside active site',
      shiftStartTime: '08:00',
      shiftEndTime: '17:00',
      gracePeriodMins: 15,
      lunchBreakStart: '12:00',
      lunchBreakEnd: '13:00',
      pmBreakStart: '15:00',
      pmBreakEnd: '15:15',
      autoTimeoutRule: 'Do not auto timeout',
      smsEnabled: true,
      senderName: 'RSR ENG',
      adminMobile: '09123456789',
      notificationGroup: 'Attendance Alerts',
      attendancePhotoUploadEnabled: true,
      cloudRetentionDays: 90,
      photoRetentionDays: 30
    })),
    updateSettings: vi.fn(() => Promise.resolve()),
    subscribe: vi.fn(() => vi.fn()),
  }
}));

import { SettingsView } from '../components/views/SettingsView';
import { settingsService } from '../services/SettingsService';

describe('Settings Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders current settings correctly', () => {
    render(<SettingsView />);
    
    expect(screen.getByDisplayValue('RSR ENG')).toBeDefined();
    expect(screen.getByDisplayValue('09123456789')).toBeDefined();
    expect(screen.getByDisplayValue('15')).toBeDefined(); // Grace period
  });

  it('triggers auto-save after changing a setting', async () => {
    const user = userEvent.setup({ delay: null });
    render(<SettingsView />);

    const graceInput = screen.getByDisplayValue('15');
    await user.clear(graceInput);
    await user.type(graceInput, '30');

    // Wait for auto-save debounce (1500ms)
    await waitFor(() => {
      expect(settingsService.updateSettings).toHaveBeenCalledWith(expect.objectContaining({
        gracePeriodMins: 30
      }));
    }, { timeout: 3000 });

    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/saved successfully/i));
  });

  it('allows adding a new site to the site list', async () => {
    const user = userEvent.setup({ delay: null });
    render(<SettingsView />);

    const addInput = screen.getByPlaceholderText(/Add new site/i);
    await user.type(addInput, 'Site B{Enter}');

    await waitFor(() => {
      expect(settingsService.updateSettings).toHaveBeenCalledWith(expect.objectContaining({
        sites: expect.arrayContaining(['Main Office', 'Site A', 'Site B'])
      }));
    }, { timeout: 3000 });
  });

  it('can run a manual AWOL check', async () => {
    // Mock AwolService
    const processAwolAlerts = vi.fn(() => Promise.resolve());
    vi.doMock('../services/AwolService', () => ({
      awolService: {
        processAwolAlerts
      }
    }));

    const user = userEvent.setup();
    render(<SettingsView />);

    const awolBtn = screen.getByRole('button', { name: /Run AWOL Check/i });
    await user.click(awolBtn);

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('AWOL Check completed!');
    });
  });
});
