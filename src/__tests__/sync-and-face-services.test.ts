import { describe, it, expect, vi, beforeEach } from 'vitest';

const attendanceServiceMock = {
  getAllLogs: vi.fn(),
  addLog: vi.fn(),
  updateLog: vi.fn(),
  refreshLogsByDates: vi.fn(),
};
const employeeServiceMock = {
  getEmployeeById: vi.fn(),
};
const settingsServiceMock = {
  getSettings: vi.fn(),
};
const attendancePhotoServiceMock = {
  uploadPhoto: vi.fn(),
  uploadDirect: vi.fn(),
};
const localAttendanceServiceMock = {
  getRetryablePunches: vi.fn(),
  markSyncing: vi.fn(),
  markSynced: vi.fn(),
  markFailed: vi.fn(),
  getSyncSummary: vi.fn(),
  pruneSynced: vi.fn(),
};
const localUploadQueueMock = {
  getCount: vi.fn(),
  getRetryable: vi.fn(),
  markUploading: vi.fn(),
  markFailed: vi.fn(),
  remove: vi.fn(),
};
const pendingNotificationQueueMock = {
  getCount: vi.fn(),
  getRetryable: vi.fn(),
  markSending: vi.fn(),
  markFailed: vi.fn(),
  remove: vi.fn(),
};
const notificationServiceMock = {
  deliverTelegramDirect: vi.fn(),
  sendSmsDirect: vi.fn(),
};
const requestAttachmentServiceMock = {
  uploadDirect: vi.fn(),
};
const calculatePayrollForTimeIn = vi.fn();
const calculatePayrollForTimeOut = vi.fn();
const calculateBreakPunchUpdate = vi.fn();

const collection = vi.fn();
const doc = vi.fn((db: unknown, path: string, id: string) => ({ db, path, id }));
const getDocs = vi.fn();
const onSnapshot = vi.fn();
const setDoc = vi.fn();
const handleFirestoreError = vi.fn((error: unknown) => {
  throw error;
});
const detectSingleFace = vi.fn();
const tinyLoad = vi.fn();
const landLoad = vi.fn();
const recLoad = vi.fn();

vi.mock('../services/AttendanceService', () => ({
  attendanceService: attendanceServiceMock,
}));
vi.mock('../services/EmployeeService', () => ({
  employeeService: employeeServiceMock,
}));
vi.mock('../services/SettingsService', () => ({
  settingsService: settingsServiceMock,
}));
vi.mock('../services/AttendancePhotoService', () => ({
  attendancePhotoService: attendancePhotoServiceMock,
}));
vi.mock('../services/LocalAttendanceService', () => ({
  localAttendanceService: localAttendanceServiceMock,
}));
vi.mock('../services/LocalUploadQueue', () => ({
  localUploadQueue: localUploadQueueMock,
}));
vi.mock('../services/PendingNotificationQueue', () => ({
  pendingNotificationQueue: pendingNotificationQueueMock,
}));
vi.mock('../services/NotificationService', () => ({
  notificationService: notificationServiceMock,
}));
vi.mock('../services/RequestAttachmentService', () => ({
  requestAttachmentService: requestAttachmentServiceMock,
}));
vi.mock('../lib/PayrollRules', () => ({
  calculatePayrollForTimeIn,
  calculatePayrollForTimeOut,
  calculateBreakPunchUpdate,
}));
vi.mock('firebase/firestore', () => ({
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
}));
vi.mock('../lib/firebase', () => ({
  db: { name: 'mock-db' },
  OperationType: {
    CREATE: 'create',
    UPDATE: 'update',
    LIST: 'list',
  },
  handleFirestoreError,
}));
vi.mock('@vladmandic/human', () => {
  class MockHuman {
    load = vi.fn().mockResolvedValue(undefined);
    detect = vi.fn().mockResolvedValue({ face: [] });
    match = {
      similarity: vi.fn().mockImplementation(() => { throw new Error('Mock error to trigger fallback'); }),
      distance: vi.fn()
    };
  }
  return {
    Human: MockHuman
  };
});

describe('SyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(global.navigator, 'onLine', { value: true, configurable: true });
    attendanceServiceMock.getAllLogs.mockReturnValue([]);
    attendanceServiceMock.refreshLogsByDates.mockResolvedValue(undefined);
    localAttendanceServiceMock.getRetryablePunches.mockResolvedValue([]);
    settingsServiceMock.getSettings.mockReturnValue({
      attendancePhotoUploadEnabled: false,
      shiftStartTime: '08:00',
      shiftEndTime: '17:00',
      gracePeriodMins: 10,
      lunchBreakStart: '12:00',
      lunchBreakEnd: '13:00',
      pmBreakStart: '15:00',
      pmBreakEnd: '15:15',
      awaySiteAllowance: 200,
      otAllowance: 75,
    });
    employeeServiceMock.getEmployeeById.mockResolvedValue({
      data: {
        id: 'EMP-001',
        name: 'Employee One',
        pin: '123456',
        avatar: 'https://example.com/a.jpg',
        dailyRate: '960',
        workLocation: 'Head Office',
      },
    });
  });

  it('records Android kiosk punches offline and triggers sync when online', async () => {
    const processSyncSpy = vi.fn().mockResolvedValue(undefined);
    (globalThis as any).window = Object.assign(window, {
      Android: {
        savePunchOffline: vi.fn(),
      },
    });
    const { SyncService } = await import('../services/SyncService');
    const service = new SyncService();
    vi.spyOn(service, 'processSync').mockImplementation(processSyncSpy);

    service.recordPunch('EMP-001', 'Time In', '2026-05-11T00:00:00.000Z', 'Head Office');

    expect(window.Android?.savePunchOffline).toHaveBeenCalledWith(
      'EMP-001',
      'Time In',
      '2026-05-11T00:00:00.000Z',
      'Head Office',
    );
    expect(processSyncSpy).toHaveBeenCalled();
  });

  it('syncs retryable local punches and marks failures when upload logic throws', async () => {
    localAttendanceServiceMock.getRetryablePunches.mockResolvedValue([
      {
        id: 'punch-1',
        employeeId: 'EMP-404',
        employeeName: 'Missing Employee',
        action: 'Time In',
        date: '2026-05-11',
        time: '08:00 AM',
        siteId: 'Head Office',
        timestamp: '2026-05-11T00:00:00.000Z',
      },
    ]);
    employeeServiceMock.getEmployeeById.mockResolvedValue(null);
    const { SyncService } = await import('../services/SyncService');
    const service = new SyncService();

    await service.processSync();

    expect(localAttendanceServiceMock.markSyncing).toHaveBeenCalledWith('punch-1');
    expect(localAttendanceServiceMock.markFailed).toHaveBeenCalledWith(
      'punch-1',
      expect.any(Error),
    );
    expect(localAttendanceServiceMock.markSynced).not.toHaveBeenCalled();
  });

  it('creates a pending approval log when an Android time-out arrives without an existing record', async () => {
    (globalThis as any).window = Object.assign(window, {
      Android: {
        getUnsyncedPunches: vi.fn(() => JSON.stringify([
          {
            id: 7,
            empCode: 'EMP-001',
            type: 'Time Out',
            timestamp: '2026-05-11T09:00:00.000Z',
            siteId: 'Site A',
          },
        ])),
        markPunchSynced: vi.fn(),
      },
    });
    const { SyncService } = await import('../services/SyncService');
    const service = new SyncService();

    await service.processSync();

    expect(attendanceServiceMock.addLog).toHaveBeenCalledWith(expect.objectContaining({
      employeeId: 'EMP-001',
      status: 'Pending Approval',
      location: 'Site A',
    }));
    expect(window.Android?.markPunchSynced).toHaveBeenCalledWith(7);
  });

  // -------------------------------------------------------------------
  // getAggregatedSyncSummary — combines per-queue counts into one bag.
  // -------------------------------------------------------------------
  it('aggregates pending counts across punches, uploads and notifications', async () => {
    localAttendanceServiceMock.getSyncSummary.mockResolvedValue({ totalOpen: 3 });
    localUploadQueueMock.getCount.mockResolvedValue(2);
    pendingNotificationQueueMock.getCount.mockResolvedValue(5);
    const { SyncService } = await import('../services/SyncService');
    const service = new SyncService();

    const summary = await service.getAggregatedSyncSummary();

    expect(summary).toEqual({
      punches: 3,
      uploads: 2,
      notifications: 5,
      totalOpen: 10,
    });
  });

  it('treats failing queue reads as zero so the summary stays usable', async () => {
    localAttendanceServiceMock.getSyncSummary.mockRejectedValue(new Error('idb dead'));
    localUploadQueueMock.getCount.mockRejectedValue(new Error('idb dead'));
    pendingNotificationQueueMock.getCount.mockResolvedValue(7);
    const { SyncService } = await import('../services/SyncService');
    const service = new SyncService();

    const summary = await service.getAggregatedSyncSummary();

    expect(summary).toEqual({
      punches: 0,
      uploads: 0,
      notifications: 7,
      totalOpen: 7,
    });
  });

  // -------------------------------------------------------------------
  // processSync should not run reentrantly and is a no-op when offline.
  // -------------------------------------------------------------------
  it('is a no-op when navigator.onLine is false', async () => {
    Object.defineProperty(global.navigator, 'onLine', { value: false, configurable: true });
    localAttendanceServiceMock.getRetryablePunches.mockResolvedValue([
      { id: 'p1', employeeId: 'E', action: 'Time In', date: '2026-05-15', time: '08:00 AM', siteId: 'HQ', timestamp: '2026-05-15T00:00:00Z' },
    ]);
    const { SyncService } = await import('../services/SyncService');
    const service = new SyncService();

    await service.processSync();

    // Should not have entered the punch-processing path
    expect(localAttendanceServiceMock.markSyncing).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Pruning the queue after a sync pass — opportunistic cleanup.
  // -------------------------------------------------------------------
  it('opportunistically prunes synced punches after a successful sync pass', async () => {
    // Prune runs at the end of processLocalAttendancePunches — but that path
    // exits early when there are no pending punches. Provide one that
    // intentionally fails sync so we still exercise the prune line.
    localAttendanceServiceMock.getRetryablePunches.mockResolvedValue([
      {
        id: 'p-prune-1',
        employeeId: 'EMP-X',
        employeeName: 'X',
        action: 'Time In',
        date: '2026-05-15',
        time: '08:00 AM',
        siteId: 'HQ',
        timestamp: '2026-05-15T00:00:00Z',
      },
    ]);
    employeeServiceMock.getEmployeeById.mockResolvedValue(null); // forces sync to fail
    localAttendanceServiceMock.pruneSynced.mockResolvedValue(0);
    localUploadQueueMock.getRetryable.mockResolvedValue([]);
    pendingNotificationQueueMock.getRetryable.mockResolvedValue([]);
    const { SyncService } = await import('../services/SyncService');
    const service = new SyncService();

    await service.processSync();

    expect(localAttendanceServiceMock.pruneSynced).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Upload queue replay — should mark items uploading/uploaded/failed
  // around the upload attempt.
  // -------------------------------------------------------------------
  it('replays a queued attendance photo upload and removes it from the queue', async () => {
    localAttendanceServiceMock.getRetryablePunches.mockResolvedValue([]);
    localUploadQueueMock.getRetryable.mockResolvedValue([
      {
        id: 'up-1',
        kind: 'attendance-photo',
        context: { employeeId: 'E', action: 'Time In' },
        dataUrl: 'data:image/jpeg;base64,xxx',
      },
    ]);
    // attendancePhotoService.uploadDirect is the kind=attendance-photo replay path
    (attendancePhotoServiceMock as any).uploadDirect = vi.fn().mockResolvedValue('https://cdn/photo.jpg');
    const { SyncService } = await import('../services/SyncService');
    const service = new SyncService();

    await service.processSync();

    expect(localUploadQueueMock.markUploading).toHaveBeenCalledWith('up-1');
    expect(attendancePhotoServiceMock.uploadDirect).toHaveBeenCalledWith(
      'data:image/jpeg;base64,xxx',
      'E',
      'Time In',
    );
    expect(localUploadQueueMock.remove).toHaveBeenCalledWith('up-1');
    expect(localUploadQueueMock.markFailed).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------
  // Notification queue replay
  // -------------------------------------------------------------------
  it('replays a queued telegram notification and marks it sent', async () => {
    localAttendanceServiceMock.getRetryablePunches.mockResolvedValue([]);
    pendingNotificationQueueMock.getRetryable.mockResolvedValue([
      { id: 'n-1', kind: 'telegram', message: '<b>Test</b>' },
    ]);
    notificationServiceMock.deliverTelegramDirect.mockResolvedValue(undefined);
    const { SyncService } = await import('../services/SyncService');
    const service = new SyncService();

    await service.processSync();

    expect(pendingNotificationQueueMock.markSending).toHaveBeenCalledWith('n-1');
    expect(notificationServiceMock.deliverTelegramDirect).toHaveBeenCalledWith('<b>Test</b>');
    expect(pendingNotificationQueueMock.remove).toHaveBeenCalledWith('n-1');
  });

  it('marks notification queue items failed when delivery throws', async () => {
    // Reset all queue mocks explicitly so leftover mockResolvedValue from
    // earlier tests doesn't leak into this one (vi.clearAllMocks only clears
    // call history, not implementations).
    localAttendanceServiceMock.getRetryablePunches.mockResolvedValue([]);
    localUploadQueueMock.getRetryable.mockResolvedValue([]);
    pendingNotificationQueueMock.getRetryable.mockResolvedValue([
      { id: 'n-2', kind: 'telegram', message: 'X' },
    ]);
    notificationServiceMock.deliverTelegramDirect.mockRejectedValue(new Error('429'));
    const { SyncService } = await import('../services/SyncService');
    const service = new SyncService();

    await service.processSync();

    expect(pendingNotificationQueueMock.markFailed).toHaveBeenCalledWith('n-2', expect.any(Error));
    expect(pendingNotificationQueueMock.remove).not.toHaveBeenCalled();
  });
});

describe('FacialRecognitionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDocs.mockResolvedValue({
      docs: [
        {
          id: 'profile-1',
          data: () => ({
            employeeId: 'EMP-001',
            faceDataEncodings: JSON.stringify([[0.1, 0.2], [0.3, 0.4]]),
          }),
        },
      ],
    });
  });

  it('loads profile documents and parses stringified face encodings', async () => {
    const { FacialRecognitionService } = await import('../services/FacialRecognitionService');
    const service = new FacialRecognitionService();

    const profiles = await service.loadProfiles();

    expect(profiles[0].faceDataEncodings).toEqual([[0.1, 0.2], [0.3, 0.4]]);
  });

  it('returns null when no image is provided or no descriptor can be extracted', async () => {
    const { FacialRecognitionService } = await import('../services/FacialRecognitionService');
    const service = new FacialRecognitionService();
    vi.spyOn(service, 'extractFaceDescriptor').mockResolvedValue(null);

    await expect(service.verifyFace('')).resolves.toBeNull();
    await expect(service.verifyFace('data:image/jpeg;base64,abc')).resolves.toBeNull();
  });

  it('ignores malformed encodings and returns the closest matching employee id', async () => {
    const { FacialRecognitionService } = await import('../services/FacialRecognitionService');
    const service = new FacialRecognitionService();
    (service as any).profiles = [
      {
        id: 'p1',
        employeeId: 'EMP-BAD',
        faceDataEncodings: 'not-json',
      },
      {
        id: 'p2',
        employeeId: 'EMP-001',
        faceDataEncodings: [[0.2, 0.2]], // Cosine similarity will be 1.0
      },
      {
        id: 'p3',
        employeeId: 'EMP-002',
        faceDataEncodings: [[-0.2, 0.2]], // Cosine similarity will be 0.0
      },
    ];
    vi.spyOn(service, 'extractFaceDescriptor').mockResolvedValue([0.2, 0.2]);

    const match = await service.verifyFace('data:image/jpeg;base64,abc');

    expect(match).toBe('EMP-001');
  });

  it('stores new profiles as JSON strings and updates the in-memory cache', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(123);
    const { FacialRecognitionService } = await import('../services/FacialRecognitionService');
    const service = new FacialRecognitionService();

    const profileId = await service.registerFace('EMP-001', [[1, 2, 3]]);

    expect(profileId).toBe('EMP-001');
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ faceDataEncodings: '[[1,2,3]]' }),
    );
  });
});
