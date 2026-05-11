import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const showToast = vi.fn();
const signInWithEmailAndPassword = vi.fn();
const createUserWithEmailAndPassword = vi.fn();
const updatePassword = vi.fn();
const signOut = vi.fn();
const getAccount = vi.fn();

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ showToast }),
}));

vi.mock('../components/layout/PageLayout', () => ({
  PageLayout: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('../lib/firebase', () => ({
  auth: {
    currentUser: { uid: 'admin', email: 'admin@rsr.com' },
    signOut,
  },
}));

vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual<typeof import('firebase/auth')>('firebase/auth');
  return {
    ...actual,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updatePassword,
  };
});

vi.mock('../services/AdminAccountService', () => ({
  adminAccountService: { getAccount },
}));

describe('AdminLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs in an administrator with the entered password and navigates to admin', async () => {
    signInWithEmailAndPassword.mockResolvedValue({});
    getAccount.mockResolvedValue({
      fullName: 'Administrator',
      password: 'password123',
    });
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    const { default: AdminLogin } = await import('../components/AdminLogin');

    render(<AdminLogin onNavigate={onNavigate} />);

    await user.type(screen.getByPlaceholderText('Enter password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'admin@rsr.com',
      'password123',
    ));
    expect(showToast).toHaveBeenCalledWith('Login successful!', 'success');
    expect(onNavigate).toHaveBeenCalledWith('admin');
  });

  it('switches to assistant mode and uses the assistant email for sign-in', async () => {
    signInWithEmailAndPassword.mockResolvedValue({});
    getAccount.mockResolvedValue({ password: 'assistpw' });
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    const { default: AdminLogin } = await import('../components/AdminLogin');

    render(<AdminLogin onNavigate={onNavigate} />);
    await user.click(screen.getByRole('button', { name: 'Assistant' }));
    await user.type(screen.getByPlaceholderText('Enter password'), 'assistpw');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'hr@rsr.com',
      'assistpw',
    ));
    expect(onNavigate).toHaveBeenCalledWith('admin');
  });

  it('shows a Firebase configuration error when email/password auth is disabled', async () => {
    signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/operation-not-allowed' });
    const user = userEvent.setup();
    const { default: AdminLogin } = await import('../components/AdminLogin');

    render(<AdminLogin onNavigate={vi.fn()} />);
    await user.type(screen.getByPlaceholderText('Enter password'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('Email/Password Auth is disabled! Please enable it in Firebase Console.')).toBeInTheDocument();
  });

  it('falls back to creating the default Firebase user when the default password is used and the auth user does not exist', async () => {
    signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/user-not-found' });
    createUserWithEmailAndPassword.mockResolvedValue({});
    getAccount.mockResolvedValue({ password: 'admin' });
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    const { default: AdminLogin } = await import('../components/AdminLogin');

    render(<AdminLogin onNavigate={onNavigate} />);
    await user.type(screen.getByPlaceholderText('Enter password'), 'admin');
    await user.click(screen.getByRole('button', { name: 'Login' }));

    await waitFor(() => expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'admin@rsr.com',
      'admin0',
    ));
    expect(onNavigate).toHaveBeenCalledWith('admin');
  });
});
