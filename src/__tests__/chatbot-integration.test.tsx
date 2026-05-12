import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Mock Services
const showToast = vi.fn();
vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));

// Mock scrollIntoView for JSDOM
window.HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock('../services/LeaveService', () => ({
  leaveService: {
    addRequest: vi.fn(() => Promise.resolve()),
  }
}));

vi.mock('../lib/api', () => ({
  authenticatedFetch: vi.fn(),
}));

import { HrAssistantChatbot } from '../components/views/common/HrAssistantChatbot';
import { authenticatedFetch } from '../lib/api';
import { leaveService } from '../services/LeaveService';

describe('HR Assistant Chatbot', () => {
  const mockEmployee = {
    id: 'emp-1',
    name: 'Jane Doe',
    department: 'Engineering',
    position: 'Developer',
    vlBalance: 10,
    slBalance: 8
  };
  const mockSettings = {
    shiftStartTime: '08:00',
    shiftEndTime: '17:00',
    gracePeriodMins: 10,
    dailyAllowance: 150,
    otAllowance: 75,
    awaySiteAllowance: 200
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the chatbot and displays the greeting message', async () => {
    const user = userEvent.setup();
    render(<HrAssistantChatbot employee={mockEmployee} settings={mockSettings} />);

    // Click toggle button (Chat icon)
    const toggleBtn = screen.getByRole('button');
    await user.click(toggleBtn);

    expect(screen.getByText(/Hi Jane! I'm your RSR HR Assistant/i)).toBeDefined();
  });

  it('sends a message and displays the assistant response', async () => {
    const user = userEvent.setup();
    
    vi.mocked(authenticatedFetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ text: "I can help with that." })
    } as any);

    render(<HrAssistantChatbot employee={mockEmployee} settings={mockSettings} />);

    // Open chat
    await user.click(screen.getByRole('button'));

    // Type message
    const input = screen.getByPlaceholderText(/Ask me anything/i);
    await user.type(input, 'How do I file a leave?{enter}');

    expect(screen.getByText('How do I file a leave?')).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText('I can help with that.')).toBeDefined();
    });
  });

  it('handles tool calls (filing leave) from the AI', async () => {
    const user = userEvent.setup();
    
    // First call returns a function call
    vi.mocked(authenticatedFetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        functionCall: {
          name: 'fileLeave',
          args: {
            type: 'Sick Leave',
            startDate: '2023-11-01',
            endDate: '2023-11-01',
            reason: 'Medical checkup'
          }
        }
      })
    } as any);

    // Second call (after tool execution) returns final text
    vi.mocked(authenticatedFetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ text: "I've filed your sick leave for Nov 1st." })
    } as any);

    render(<HrAssistantChatbot employee={mockEmployee} settings={mockSettings} />);

    // Open chat
    await user.click(screen.getByRole('button'));

    const input = screen.getByPlaceholderText(/Ask me anything/i);
    await user.type(input, 'File a sick leave for tomorrow{enter}');

    await waitFor(() => {
      expect(leaveService.addRequest).toHaveBeenCalledWith(expect.objectContaining({
        type: 'Sick Leave',
        reason: 'Medical checkup'
      }));
      expect(screen.getByText(/filed your sick leave/i)).toBeDefined();
    });
  });

  it('shows an error toast if the API fails', async () => {
    const user = userEvent.setup();
    vi.mocked(authenticatedFetch).mockRejectedValueOnce(new Error('Network Error'));

    render(<HrAssistantChatbot employee={mockEmployee} settings={mockSettings} />);

    await user.click(screen.getByRole('button'));
    const input = screen.getByPlaceholderText(/Ask me anything/i);
    await user.type(input, 'Hello{enter}');

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith("Failed to connect to HR Assistant.", "error");
    });
  });
});
