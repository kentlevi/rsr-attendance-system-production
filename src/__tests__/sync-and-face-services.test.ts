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
};
const localAttendanceServiceMock = {
  getRetryablePunches: vi.fn(),
  markSyncing: vi.fn(),
  markSynced: vi.fn(),
  markFailed: vi.fn(),
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
const euclideanDistance = vi.fn();
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
vi.mock('@vladmandic/face-api', () => ({
  nets: {
    tinyFaceDetector: { loadFromUri: tinyLoad },
    faceLandmark68Net: { loadFromUri: landLoad },
    faceRecognitionNet: { loadFromUri: recLoad },
  },
  tf: { ready: vi.fn().mockResolvedValue(undefined) },
  TinyFaceDetectorOptions: vi.fn(function TinyFaceDetectorOptions(options) {
    return options;
  }),
  detectSingleFace,
  euclideanDistance,
}));

describe('SyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(global.navigator, 'onLine', { value: true, configurable: true });
    attendanceServiceMock.getAllLogs.mockReturnValue([]);
    attendanceServiceMock.refreshLogsByDates.mockResolvedValue(undefined);
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
        faceDataEncodings: [[0.1, 0.1]],
      },
      {
        id: 'p3',
        employeeId: 'EMP-002',
        faceDataEncodings: [[0.8, 0.8]],
      },
    ];
    vi.spyOn(service, 'extractFaceDescriptor').mockResolvedValue([0.2, 0.2]);
    euclideanDistance
      .mockImplementationOnce(() => 0.2)
      .mockImplementationOnce(() => 0.7);

    const match = await service.verifyFace('data:image/jpeg;base64,abc');

    expect(match).toBe('EMP-001');
  });

  it('stores new profiles as JSON strings and updates the in-memory cache', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(123);
    const { FacialRecognitionService } = await import('../services/FacialRecognitionService');
    const service = new FacialRecognitionService();

    const profileId = await service.registerFace('EMP-001', [[1, 2, 3]]);

    expect(profileId).toBe('EMP-001-123');
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ faceDataEncodings: '[[1,2,3]]' }),
    );
  });
});
