import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Firestore SDK mock --------------------------------------------------------
const collection = vi.fn((db: unknown, path: string) => ({ db, path }));
const doc = vi.fn((db: unknown, path: string, id?: string) => ({ db, path, id }));
const addDoc = vi.fn();
const updateDoc = vi.fn();
const onSnapshot = vi.fn();
const query = vi.fn((...args: unknown[]) => ({ args }));
const where = vi.fn((...args: unknown[]) => ({ where: args }));
const getDocs = vi.fn();
const getDoc = vi.fn();
const deleteDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  collection,
  doc,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  getDoc,
  deleteDoc,
}));

// --- App-side dependencies -----------------------------------------------------
const handleFirestoreError = vi.fn((error: unknown) => {
  throw error;
});
const logFirestoreError = vi.fn();
const trackFirestoreUsage = vi.fn();

vi.mock('../lib/firebase', () => ({
  db: { __mock: true },
  handleFirestoreError,
  logFirestoreError,
  trackFirestoreUsage,
  OperationType: {
    LIST: 'list',
    GET: 'get',
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
  },
}));

const sendTelegramNotification = vi.fn();
vi.mock('../services/NotificationService', () => ({
  notificationService: { sendTelegramNotification },
}));

const getEmployeeByIdSync = vi.fn();
vi.mock('../services/EmployeeService', () => ({
  employeeService: { getEmployeeByIdSync },
}));

import { setReadOnlyOffline, ReadOnlyOfflineError } from '../lib/readOnlyMode';

describe('IncidentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setReadOnlyOffline(false);
    getEmployeeByIdSync.mockReturnValue({ data: { name: 'John Doe' } });
  });

  it('caches incidents from onSnapshot and exposes them via getAll', async () => {
    let snapshotCallback: any;
    onSnapshot.mockImplementation((_q, cb) => {
      snapshotCallback = cb;
      return () => {};
    });

    const { IncidentService } = await import('../services/IncidentService');
    const service = new IncidentService();
    service.initializeForUser(true);

    snapshotCallback({
      docs: [
        { id: 'i1', data: () => ({ employeeId: 'EMP-A', acknowledged: false, type: 'Infraction', severity: 'High' }) },
        { id: 'i2', data: () => ({ employeeId: 'EMP-A', acknowledged: true, type: 'Infraction', severity: 'Low' }) },
        { id: 'i3', data: () => ({ employeeId: 'EMP-B', acknowledged: false, type: 'Accident', severity: 'Medium' }) },
      ],
    });

    const all = service.getAll();
    expect(all).toHaveLength(3);
    expect(all.map((r: any) => r.id).sort()).toEqual(['i1', 'i2', 'i3']);
  });

  it('filters incidents by employeeId and acknowledged status', async () => {
    let snapshotCallback: any;
    onSnapshot.mockImplementation((_q, cb) => {
      snapshotCallback = cb;
      return () => {};
    });

    const { IncidentService } = await import('../services/IncidentService');
    const service = new IncidentService();
    service.initializeForUser(true);

    snapshotCallback({
      docs: [
        { id: 'i1', data: () => ({ employeeId: 'EMP-A', acknowledged: false }) },
        { id: 'i2', data: () => ({ employeeId: 'EMP-A', acknowledged: true }) },
        { id: 'i3', data: () => ({ employeeId: 'EMP-B', acknowledged: false }) },
      ],
    });

    expect(service.getIncidentsForEmployee('EMP-A')).toHaveLength(2);
    expect(service.getIncidentsForEmployee('EMP-B')).toHaveLength(1);
    expect(service.getUnacknowledgedIncidents('EMP-A')).toHaveLength(1);
    expect(service.getUnacknowledgedIncidents('EMP-A')[0].id).toBe('i1');
  });

  it('writes a new incident and triggers a Telegram notification', async () => {
    addDoc.mockResolvedValue({ id: 'new-id' });

    const { IncidentService } = await import('../services/IncidentService');
    const service = new IncidentService();

    const id = await service.add({
      employeeId: 'EMP-A',
      type: 'Infraction',
      date: '2026-05-15',
      title: 'Tardiness',
      description: 'Late by 30 minutes',
      severity: 'Medium',
      acknowledged: false,
      createdBy: 'admin',
      createdAt: '2026-05-15T08:00:00Z',
    });

    expect(id).toBe('new-id');
    expect(addDoc).toHaveBeenCalled();
    expect(sendTelegramNotification).toHaveBeenCalledWith(
      expect.stringContaining('John Doe')
    );
    expect(sendTelegramNotification).toHaveBeenCalledWith(
      expect.stringContaining('Tardiness')
    );
  });

  it('falls back to "An employee" when the employee record cannot be resolved', async () => {
    addDoc.mockResolvedValue({ id: 'new-id' });
    getEmployeeByIdSync.mockReturnValue(null);

    const { IncidentService } = await import('../services/IncidentService');
    const service = new IncidentService();

    await service.add({
      employeeId: 'EMP-MISSING',
      type: 'Infraction',
      date: '2026-05-15',
      title: 'Unknown',
      description: 'No employee found',
      severity: 'Low',
      acknowledged: false,
      createdBy: 'admin',
      createdAt: '2026-05-15T08:00:00Z',
    });

    expect(sendTelegramNotification).toHaveBeenCalledWith(
      expect.stringContaining('An employee')
    );
  });

  it('blocks add() when offline read-only mode is active', async () => {
    setReadOnlyOffline(true);

    const { IncidentService } = await import('../services/IncidentService');
    const service = new IncidentService();

    await expect(
      service.add({
        employeeId: 'EMP-A',
        type: 'Infraction',
        date: '2026-05-15',
        title: 'X',
        description: 'Y',
        severity: 'Low',
        acknowledged: false,
        createdBy: 'admin',
        createdAt: '2026-05-15T08:00:00Z',
      })
    ).rejects.toBeInstanceOf(ReadOnlyOfflineError);

    expect(addDoc).not.toHaveBeenCalled();
    expect(sendTelegramNotification).not.toHaveBeenCalled();
  });

  it('acknowledges an incident with timestamp', async () => {
    updateDoc.mockResolvedValue(undefined);

    const { IncidentService } = await import('../services/IncidentService');
    const service = new IncidentService();

    await service.acknowledgeIncident('i1');

    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        acknowledged: true,
        acknowledgedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      })
    );
  });

  it('blocks acknowledgeIncident() when offline read-only mode is active', async () => {
    setReadOnlyOffline(true);

    const { IncidentService } = await import('../services/IncidentService');
    const service = new IncidentService();

    await expect(service.acknowledgeIncident('i1')).rejects.toBeInstanceOf(
      ReadOnlyOfflineError
    );
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('notifies listeners when incidents update', async () => {
    let snapshotCallback: any;
    onSnapshot.mockImplementation((_q, cb) => {
      snapshotCallback = cb;
      return () => {};
    });

    const { IncidentService } = await import('../services/IncidentService');
    const service = new IncidentService();
    service.initializeForUser(true);

    const listener = vi.fn();
    service.subscribe(listener);

    snapshotCallback({ docs: [] });
    expect(listener).toHaveBeenCalledTimes(1);

    snapshotCallback({
      docs: [{ id: 'i1', data: () => ({ employeeId: 'EMP-A' }) }],
    });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('scopes the listen query for non-admin to employeeId', async () => {
    const { IncidentService } = await import('../services/IncidentService');
    const service = new IncidentService();
    service.initializeForUser(false, 'EMP-X');

    // where() should have been called with employeeId == 'EMP-X' for non-admin
    expect(where).toHaveBeenCalledWith('employeeId', '==', 'EMP-X');
  });

  it('does NOT scope the listen query when admin', async () => {
    where.mockClear();
    const { IncidentService } = await import('../services/IncidentService');
    const service = new IncidentService();
    service.initializeForUser(true);

    // No employeeId filter for admins (they see everything)
    expect(where).not.toHaveBeenCalled();
  });
});
