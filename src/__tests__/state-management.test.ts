import { describe, it, expect, vi, beforeEach } from 'vitest';

const authCallback = vi.hoisted(() => ({ current: null as null | ((user: any) => void) }));
const serviceMocks = vi.hoisted(() => {
  const makeService = () => ({
    initializeForUser: vi.fn(),
    stopSubscription: vi.fn(),
  });
  return {
    attendanceService: makeService(),
    leaveService: makeService(),
    employeeService: {
      ...makeService(),
      startLeaveReplenishmentScheduler: vi.fn(),
      stopLeaveReplenishmentScheduler: vi.fn(),
    },
    facialRecognitionService: {
      initializeForAdmin: vi.fn(),
      stopSubscription: vi.fn(),
    },
    incidentService: makeService(),
    settingsService: makeService(),
    notificationService: makeService(),
    smsService: makeService(),
    allowanceService: makeService(),
    undertimeService: makeService(),
  };
});

const firestoreMocks = vi.hoisted(() => ({
  collection: vi.fn((db: unknown, path: string) => ({ db, path })),
  doc: vi.fn((db: unknown, path: string, id?: string) => ({ db, path, id })),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  query: vi.fn((...args: unknown[]) => ({ args })),
  where: vi.fn((...args: unknown[]) => ({ where: args })),
  onSnapshot: vi.fn(),
}));

const firebaseAuth = vi.hoisted(() => ({
  currentUser: { uid: 'admin', email: 'admin@rsr.com' },
}));
const signOut = vi.hoisted(() => vi.fn());
const handleFirestoreError = vi.hoisted(() => vi.fn((error: unknown) => {
  throw error;
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((auth, callback) => {
    authCallback.current = callback;
    return vi.fn();
  }),
  signOut,
}));

vi.mock('firebase/firestore', () => firestoreMocks);

vi.mock('../lib/firebase', () => ({
  db: { name: 'mock-db' },
  auth: firebaseAuth,
  OperationType: {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LIST: 'list',
    GET: 'get',
    WRITE: 'write',
  },
  handleFirestoreError,
}));

vi.mock('../services/AttendanceService', () => ({
  attendanceService: serviceMocks.attendanceService,
}));
vi.mock('../services/LeaveService', () => ({
  leaveService: serviceMocks.leaveService,
}));
vi.mock('../services/EmployeeService', () => ({
  employeeService: serviceMocks.employeeService,
}));
vi.mock('../services/FacialRecognitionService', () => ({
  facialRecognitionService: serviceMocks.facialRecognitionService,
}));
vi.mock('../services/IncidentService', () => ({
  incidentService: serviceMocks.incidentService,
}));
vi.mock('../services/SettingsService', () => ({
  settingsService: serviceMocks.settingsService,
}));
vi.mock('../services/NotificationService', () => ({
  notificationService: serviceMocks.notificationService,
}));
vi.mock('../services/SmsService', () => ({
  smsService: serviceMocks.smsService,
}));
vi.mock('../services/AllowanceService', () => ({
  allowanceService: serviceMocks.allowanceService,
}));
vi.mock('../services/UndertimeService', () => ({
  undertimeService: serviceMocks.undertimeService,
}));

describe('auth store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes admin-scoped services for admin claims', async () => {
    const { useAuthStore } = await import('../store/authStore');
    useAuthStore.setState({ user: null, isAdmin: false, isEmployee: false, isLoading: true });

    useAuthStore.getState().init();
    await authCallback.current?.({
      uid: 'admin-uid',
      email: 'admin@rsr.com',
      getIdTokenResult: async () => ({ claims: { role: 'admin' } }),
    });

    expect(useAuthStore.getState()).toMatchObject({
      isAdmin: true,
      isEmployee: false,
      isLoading: false,
    });
    expect(serviceMocks.attendanceService.initializeForUser).toHaveBeenCalledWith(true, 'admin-uid');
    expect(serviceMocks.smsService.initializeForUser).toHaveBeenCalledWith(true);
    expect(serviceMocks.facialRecognitionService.initializeForAdmin).toHaveBeenCalled();
  });

  it('initializes employee-scoped services for employee claims and stops admin face subscription', async () => {
    const { useAuthStore } = await import('../store/authStore');
    useAuthStore.setState({ user: null, isAdmin: false, isEmployee: false, isLoading: true });

    useAuthStore.getState().init();
    await authCallback.current?.({
      uid: 'EMP-001',
      email: 'employee@rsrengineering.com',
      getIdTokenResult: async () => ({ claims: { role: 'employee' } }),
    });

    expect(useAuthStore.getState()).toMatchObject({
      isAdmin: false,
      isEmployee: true,
      isLoading: false,
    });
    expect(serviceMocks.employeeService.initializeForUser).toHaveBeenCalledWith(false, 'EMP-001');
    expect(serviceMocks.facialRecognitionService.stopSubscription).toHaveBeenCalled();
  });

  it('stops subscriptions and clears state on sign out', async () => {
    const { useAuthStore } = await import('../store/authStore');
    useAuthStore.setState({ user: { uid: 'admin' } as any, isAdmin: true, isEmployee: false, isLoading: false });

    await useAuthStore.getState().signOut();

    expect(signOut).toHaveBeenCalled();
    expect(serviceMocks.attendanceService.stopSubscription).toHaveBeenCalled();
    expect(serviceMocks.undertimeService.stopSubscription).toHaveBeenCalled();
    expect(useAuthStore.getState()).toMatchObject({
      user: null,
      isAdmin: false,
      isEmployee: false,
      isLoading: false,
    });
  });
});

describe('attendance store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('subscribes to recent logs and maps snapshots into AttendanceLogModel state', async () => {
    firestoreMocks.onSnapshot.mockImplementation((q, onNext) => {
      onNext({
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
      return vi.fn();
    });
    const { useAttendanceStore } = await import('../store/attendanceStore');
    useAttendanceStore.setState({ logs: [], isLoading: true, error: null });

    const unsubscribe = useAttendanceStore.getState().subscribeToLogs();

    expect(useAttendanceStore.getState().isLoading).toBe(false);
    expect(useAttendanceStore.getState().logs).toHaveLength(1);
    expect(useAttendanceStore.getState().logs[0].data.employeeId).toBe('EMP-001');
    expect(firestoreMocks.where).toHaveBeenCalledWith('date', '>=', expect.any(String));
    expect(typeof unsubscribe).toBe('function');
  });

  it('adds and updates attendance logs through Firestore', async () => {
    const { useAttendanceStore } = await import('../store/attendanceStore');

    await useAttendanceStore.getState().addLog({
      employeeId: 'EMP-001',
      date: '2026-05-11',
      timeIn: '08:00 AM',
      timeOut: '-',
      workHours: '-',
      overtime: '-',
      status: 'Present',
      location: 'Head Office',
    });
    await useAttendanceStore.getState().updateLog('log-1', { timeOut: '05:00 PM' });

    expect(firestoreMocks.addDoc).toHaveBeenCalled();
    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(expect.anything(), { timeOut: '05:00 PM' });
  });
});
