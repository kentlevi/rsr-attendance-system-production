import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

const collection = vi.fn((db: unknown, path: string) => ({ db, path }));
const doc = vi.fn((db: unknown, path: string, id?: string) => ({ db, path, id }));
const getDoc = vi.fn();
const getDocs = vi.fn();
const setDoc = vi.fn();
const addDoc = vi.fn();
const updateDoc = vi.fn();
const deleteField = vi.fn(() => ({ __delete: true }));
const query = vi.fn((...args: unknown[]) => ({ args }));
const where = vi.fn((...args: unknown[]) => ({ where: args }));
const onSnapshot = vi.fn();
const ref = vi.fn((storage: unknown, path: string) => ({ storage, path }));
const uploadString = vi.fn();
const getDownloadURL = vi.fn();
const handleFirestoreError = vi.fn((error: unknown) => {
  throw error;
});
const trackFirestoreUsage = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteField,
  query,
  where,
  onSnapshot,
}));

vi.mock('firebase/storage', () => ({
  ref,
  uploadString,
  getDownloadURL,
}));

vi.mock('../lib/firebase', () => ({
  db: { name: 'mock-db' },
  storage: { name: 'mock-storage' },
  auth: { currentUser: { uid: 'admin', email: 'admin@rsr.com' } },
  OperationType: {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LIST: 'list',
    GET: 'get',
    WRITE: 'write',
  },
  handleFirestoreError,
  trackFirestoreUsage,
}));

describe('SettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('merges stored local settings over defaults', async () => {
    localStorage.setItem('rsr_settings', JSON.stringify({
      activeSite: 'Site A',
      smsEnabled: false,
    }));
    const { SettingsService } = await import('../services/SettingsService');

    const service = new SettingsService();

    expect(service.getSettings()).toMatchObject({
      activeSite: 'Site A',
      smsEnabled: false,
      shiftStartTime: '08:00',
    });
  });

  it('fetches settings from Firestore, caches them, and notifies subscribers', async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ activeSite: 'Site B', gracePeriodMins: 15 }),
    });
    const { SettingsService } = await import('../services/SettingsService');
    const service = new SettingsService();
    const listener = vi.fn();
    service.subscribe(listener);

    const settings = await service.fetchSettings();

    expect(settings.activeSite).toBe('Site B');
    expect(settings.gracePeriodMins).toBe(15);
    expect(JSON.parse(localStorage.getItem('rsr_settings') || '{}')).toMatchObject({
      activeSite: 'Site B',
      gracePeriodMins: 15,
    });
    expect(listener).toHaveBeenCalled();
  });

  it('optimistically updates settings and rolls back when Firestore write fails', async () => {
    setDoc.mockRejectedValue(new Error('write failed'));
    const { SettingsService } = await import('../services/SettingsService');
    const service = new SettingsService();
    const original = service.getSettings();

    await expect(service.updateSettings({ activeSite: 'Broken Site' })).rejects.toThrow('write failed');

    expect(service.getSettings().activeSite).toBe(original.activeSite);
    expect(handleFirestoreError).toHaveBeenCalled();
  });
});

describe('AttendanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads date-filtered attendance logs and publishes model data', async () => {
    getDocs.mockResolvedValue({
      size: 1,
      docs: [
        {
          id: 'log-1',
          data: () => ({
            employeeId: 'EMP-001',
            date: '2026-05-11',
            timeIn: '08:00 AM',
            timeOut: '-',
            status: 'Present',
          }),
        },
      ],
    });
    const { AttendanceService } = await import('../services/AttendanceService');
    const service = new AttendanceService();
    const listener = vi.fn();
    service.subscribe(listener);

    const logs = await service.loadLogsByDateRange('2026-05-01', '2026-05-11', false, 'EMP-001');

    expect(logs).toHaveLength(1);
    expect(logs[0].data.employeeId).toBe('EMP-001');
    expect(where).toHaveBeenCalledWith('employeeId', '==', 'EMP-001');
    expect(trackFirestoreUsage).toHaveBeenCalledWith('list', 1);
    expect(listener).toHaveBeenCalled();
  });

  it('writes new logs, updates logs, and clears photo fields', async () => {
    const { AttendanceService } = await import('../services/AttendanceService');
    const service = new AttendanceService();

    await service.addLog({
      employeeId: 'EMP-001',
      date: '2026-05-11',
      timeIn: '08:00 AM',
      timeOut: '-',
      workHours: '-',
      overtime: '-',
      status: 'Present',
      location: 'Head Office',
    });
    await service.updateLog('log-1', { timeOut: '05:00 PM' });
    await service.clearLogPhotos('log-1', ['imageIn']);

    expect(addDoc).toHaveBeenCalled();
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), { timeOut: '05:00 PM' });
    expect(updateDoc).toHaveBeenCalledWith(expect.anything(), { imageIn: { __delete: true } });
  });
});

describe('LocalAttendanceService', () => {
  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('rsr-attendance-local');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    });
  });

  beforeEach(() => {
    vi.resetModules();
  });

  it('stores offline punches and reports pending sync counts', async () => {
    const { localAttendanceService } = await import('../services/LocalAttendanceService');

    const punch = await localAttendanceService.savePunch({
      employeeId: 'EMP-001',
      employeeName: 'Employee One',
      action: 'Time In',
      timestamp: '2026-05-11T00:00:00.000Z',
      date: '2026-05-11',
      time: '08:00 AM',
      siteId: 'Head Office',
      photoCaptured: true,
    });

    expect(punch.status).toBe('pending');
    expect(await localAttendanceService.getPendingCount()).toBe(1);
    expect(await localAttendanceService.getSyncSummary()).toMatchObject({
      pending: 1,
      failed: 0,
      totalOpen: 1,
    });
    await localAttendanceService.markSynced(punch.id);
  });

  it('tracks sync retries and excludes synced punches from open totals', async () => {
    const { localAttendanceService } = await import('../services/LocalAttendanceService');
    const punch = await localAttendanceService.savePunch({
      employeeId: 'EMP-001',
      employeeName: 'Employee One',
      action: 'Time Out',
      timestamp: '2026-05-11T09:00:00.000Z',
      date: '2026-05-11',
      time: '05:00 PM',
      siteId: 'Head Office',
      photoCaptured: false,
    });

    await localAttendanceService.markSyncing(punch.id);
    expect(await localAttendanceService.getSyncSummary()).toMatchObject({ syncing: 1 });

    await localAttendanceService.markFailed(punch.id, new Error('network down'));
    expect(await localAttendanceService.getSyncSummary()).toMatchObject({ failed: 1 });

    await localAttendanceService.markSynced(punch.id);
    expect(await localAttendanceService.getSyncSummary()).toMatchObject({ totalOpen: 0 });
  });
});

describe('AttendancePhotoService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads attendance photos to the employee action path and returns the download URL', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(12345);
    getDownloadURL.mockResolvedValue('https://storage.test/photo.jpg');
    const { attendancePhotoService } = await import('../services/AttendancePhotoService');

    const url = await attendancePhotoService.uploadPhoto(
      'data:image/jpeg;base64,abc',
      'EMP-001',
      'Time In',
    );

    expect(ref).toHaveBeenCalledWith(
      { name: 'mock-storage' },
      'attendance-photos/EMP-001/12345-time-in.jpg',
    );
    expect(uploadString).toHaveBeenCalledWith(expect.anything(), 'data:image/jpeg;base64,abc', 'data_url');
    expect(url).toBe('https://storage.test/photo.jpg');
  });
});
