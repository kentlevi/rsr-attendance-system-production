import { describe, it, expect, vi, beforeEach } from 'vitest';

const collection = vi.fn((db: unknown, path: string) => ({ db, path }));
const doc = vi.fn((db: unknown, path: string, id?: string) => ({ db, path, id }));
const getDoc = vi.fn();
const setDoc = vi.fn();
const addDoc = vi.fn();
const updateDoc = vi.fn();
const onSnapshot = vi.fn();
const query = vi.fn((...args: unknown[]) => ({ args }));
const where = vi.fn((...args: unknown[]) => ({ where: args }));
const orderBy = vi.fn((...args: unknown[]) => ({ orderBy: args }));
const getDocs = vi.fn();
const writeBatch = vi.fn();
const handleFirestoreError = vi.fn((error: unknown) => {
  throw error;
});

vi.mock('firebase/firestore', () => ({
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  getDocs,
  writeBatch,
}));

vi.mock('../lib/firebase', () => ({
  db: { name: 'mock-db' },
  OperationType: {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LIST: 'list',
    GET: 'get',
  },
  handleFirestoreError,
}));

vi.mock('../services/SettingsService', () => ({
  settingsService: {
    getSettings: vi.fn(() => ({
      telegramEnabled: true,
      telegramChatId: 'chat-1',
    })),
  },
}));

describe('Firestore-backed service failure branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the fallback admin account when Firestore lookup fails', async () => {
    getDoc.mockRejectedValue(new Error('missing'));
    const { adminAccountService } = await import('../services/AdminAccountService');
    const fallback = {
      fullName: 'Admin',
      username: 'admin',
      email: 'admin@rsr.com',
      department: 'Administration',
      mobile: '',
      position: 'Admin',
      gender: 'Any',
      dateRegistered: '',
      address: '',
      lastLogin: '',
      timezone: 'Asia/Manila',
      role: 'Administrator',
      avatar: '',
      password: 'secret',
    };

    const account = await adminAccountService.getAccount('admin', fallback);

    expect(account).toEqual(fallback);
    expect(handleFirestoreError).toHaveBeenCalled();
  });

  it('surfaces add and update failures for leave requests', async () => {
    addDoc.mockRejectedValueOnce(new Error('add leave failed'));
    updateDoc.mockRejectedValueOnce(new Error('update leave failed'));
    const { leaveService } = await import('../services/LeaveService');

    await expect(leaveService.addRequest({
      employeeId: 'EMP-001',
      type: 'Vacation Leave',
      startDate: '2026-05-11',
      endDate: '2026-05-11',
      reason: 'Trip',
      status: 'Pending',
    } as any)).rejects.toThrow('add leave failed');

    await expect(leaveService.updateRequest('leave-1', { status: 'Approved' } as any)).rejects.toThrow('update leave failed');
  });

  it('marks notifications read in batch and surfaces batch errors', async () => {
    const update = vi.fn();
    const commit = vi.fn().mockRejectedValue(new Error('batch failed'));
    writeBatch.mockReturnValue({ update, delete: vi.fn(), commit });
    getDocs.mockResolvedValue({
      docs: [
        { data: () => ({ isRead: false }), ref: { id: 'n1' } },
        { data: () => ({ isRead: true }), ref: { id: 'n2' } },
      ],
    });
    const { notificationService } = await import('../services/NotificationService');

    await expect(notificationService.markAllAsRead()).rejects.toThrow('batch failed');

    expect(update).toHaveBeenCalledTimes(1);
    expect(handleFirestoreError).toHaveBeenCalled();
  });

  it('surfaces SMS log fetch failures after delegating to the shared Firestore error handler', async () => {
    getDocs.mockRejectedValue(new Error('sms failed'));
    const { smsService } = await import('../services/SmsService');

    await expect(smsService.getAllLogs()).rejects.toThrow('sms failed');
  });
});
