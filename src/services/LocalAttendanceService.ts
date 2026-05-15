import { BreakPunchAction } from '../lib/PayrollRules';

export type LocalAttendanceAction = 'Time In' | 'Time Out' | BreakPunchAction;
export type LocalSyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';

export interface LocalAttendancePunch {
  id: string;
  employeeId: string;
  employeeName: string;
  action: LocalAttendanceAction;
  timestamp: string;
  date: string;
  time: string;
  siteId: string;
  photoDataUrl?: string;
  photoCaptured: boolean;
  latitude?: number;
  longitude?: number;
  geofenceDistance?: number;
  geofenceStatus?: 'Inside' | 'Outside';
  status: LocalSyncStatus;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
  lastSyncAttemptAt?: string;
  syncedAt?: string;
  nextRetryAt?: string;
  lastError?: string;
}

export interface LocalAttendanceSyncSummary {
  pending: number;
  syncing: number;
  failed: number;
  retryReady: number;
  totalOpen: number;
}

const DB_NAME = 'rsr-attendance-local';
const DB_VERSION = 1;
const PUNCH_STORE = 'attendancePunches';

// Pruning: punches that synced more than this many days ago are deleted from
// IndexedDB. Firestore is the authoritative store at that point; keeping the
// local copy only bloats the device (each punch can carry a ~50KB photo data URL).
const SYNCED_RETENTION_DAYS = 30;

class LocalAttendanceService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  async savePunch(
    punch: Omit<
      LocalAttendancePunch,
      'id' | 'status' | 'retryCount' | 'createdAt' | 'updatedAt'
    >,
  ): Promise<LocalAttendancePunch> {
    const now = new Date().toISOString();
    const record: LocalAttendancePunch = {
      ...punch,
      id: this.createPunchId(punch.employeeId, punch.action, punch.timestamp),
      status: 'pending',
      retryCount: 0,
      nextRetryAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const db = await this.getDb();
    await this.put(db, record);
    return record;
  }

  async markSyncing(id: string): Promise<void> {
    await this.patchPunch(id, {
      status: 'syncing',
      lastSyncAttemptAt: new Date().toISOString(),
    });
  }

  async markSynced(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.patchPunch(id, {
      status: 'synced',
      syncedAt: now,
      nextRetryAt: undefined,
      lastError: undefined,
    });
  }

  async markFailed(id: string, error: unknown): Promise<void> {
    const existing = await this.getPunch(id);
    const retryCount = (existing?.retryCount || 0) + 1;
    await this.patchPunch(id, {
      status: 'failed',
      retryCount,
      nextRetryAt: this.getNextRetryAt(retryCount),
      lastError: error instanceof Error ? error.message : String(error),
    });
  }

  async getPendingPunches(): Promise<LocalAttendancePunch[]> {
    const punches = await this.getAllPunches();
    return punches.filter((punch) => punch.status === 'pending' || punch.status === 'failed' || punch.status === 'syncing');
  }

  async getPendingCount(): Promise<number> {
    return (await this.getPendingPunches()).length;
  }

  async getRetryablePunches(now = new Date()): Promise<LocalAttendancePunch[]> {
    const nowMs = now.getTime();
    const punches = await this.getPendingPunches();
    return punches.filter((punch) => {
      if (punch.status === 'syncing') return true;
      if (punch.status === 'pending') return true;
      if (!punch.nextRetryAt) return true;
      return new Date(punch.nextRetryAt).getTime() <= nowMs;
    });
  }

  async getSyncSummary(now = new Date()): Promise<LocalAttendanceSyncSummary> {
    const punches = await this.getPendingPunches();
    const retryable = await this.getRetryablePunches(now);

    return {
      pending: punches.filter((punch) => punch.status === 'pending').length,
      syncing: punches.filter((punch) => punch.status === 'syncing').length,
      failed: punches.filter((punch) => punch.status === 'failed').length,
      retryReady: retryable.length,
      totalOpen: punches.length,
    };
  }

  async getAllPunches(): Promise<LocalAttendancePunch[]> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PUNCH_STORE, 'readonly');
      const request = transaction.objectStore(PUNCH_STORE).getAll();
      request.onsuccess = () => resolve(request.result as LocalAttendancePunch[]);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete punches that have been synced for longer than SYNCED_RETENTION_DAYS.
   * Called opportunistically by SyncService after each successful sync pass.
   * Returns the number of records pruned.
   */
  async pruneSynced(now = new Date()): Promise<number> {
    const cutoffMs = now.getTime() - SYNCED_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const all = await this.getAllPunches();
    const stale = all.filter(
      (p) => p.status === 'synced' && p.syncedAt && new Date(p.syncedAt).getTime() < cutoffMs
    );
    if (stale.length === 0) return 0;

    const db = await this.getDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(PUNCH_STORE, 'readwrite');
      const store = transaction.objectStore(PUNCH_STORE);
      for (const punch of stale) store.delete(punch.id);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    return stale.length;
  }

  private async patchPunch(id: string, patch: Partial<LocalAttendancePunch>): Promise<void> {
    const existing = await this.getPunch(id);
    if (!existing) return;

    const updated: LocalAttendancePunch = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    const db = await this.getDb();
    await this.put(db, updated);
  }

  private async getPunch(id: string): Promise<LocalAttendancePunch | null> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PUNCH_STORE, 'readonly');
      const request = transaction.objectStore(PUNCH_STORE).get(id);
      request.onsuccess = () => resolve((request.result as LocalAttendancePunch | undefined) || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async put(db: IDBDatabase, record: LocalAttendancePunch): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(PUNCH_STORE, 'readwrite');
      transaction.objectStore(PUNCH_STORE).put(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  private getDb(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(PUNCH_STORE)) {
            const store = db.createObjectStore(PUNCH_STORE, { keyPath: 'id' });
            store.createIndex('status', 'status', { unique: false });
            store.createIndex('employeeId', 'employeeId', { unique: false });
            store.createIndex('date', 'date', { unique: false });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    return this.dbPromise;
  }

  private createPunchId(employeeId: string, action: LocalAttendanceAction, timestamp: string): string {
    const normalizedAction = action.toLowerCase().replace(/\s+/g, '-');
    return `${employeeId}-${normalizedAction}-${timestamp}`;
  }

  private getNextRetryAt(retryCount: number): string {
    const retryDelaysMs = [
      30 * 1000,
      2 * 60 * 1000,
      5 * 60 * 1000,
      15 * 60 * 1000,
      30 * 60 * 1000,
    ];
    const delay = retryDelaysMs[Math.min(retryCount - 1, retryDelaysMs.length - 1)];
    return new Date(Date.now() + delay).toISOString();
  }
}

export const localAttendanceService = new LocalAttendanceService();
