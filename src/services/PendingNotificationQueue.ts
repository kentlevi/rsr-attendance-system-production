export type NotificationKind = 'telegram' | 'sms';
export type NotificationStatus = 'pending' | 'sending' | 'failed';

export interface PendingNotification {
  id: string;
  kind: NotificationKind;
  message: string;
  payload?: Record<string, any>;
  status: NotificationStatus;
  retryCount: number;
  nextRetryAt: string;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
}

const DB_NAME = 'rsr-notification-queue';
const DB_VERSION = 1;
const STORE = 'notifications';

class PendingNotificationQueue {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return this.dbPromise;
  }

  private async tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
    const db = await this.getDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const store = transaction.objectStore(STORE);
      const req = fn(store);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async enqueue(input: { kind: NotificationKind; message: string; payload?: Record<string, any> }): Promise<PendingNotification> {
    const now = new Date().toISOString();
    const record: PendingNotification = {
      id: `${input.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind: input.kind,
      message: input.message,
      payload: input.payload,
      status: 'pending',
      retryCount: 0,
      nextRetryAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await this.tx('readwrite', (store) => store.put(record));
    return record;
  }

  async getAll(): Promise<PendingNotification[]> {
    try {
      return await this.tx('readonly', (store) => store.getAll());
    } catch {
      return [];
    }
  }

  async getRetryable(): Promise<PendingNotification[]> {
    const all = await this.getAll();
    const now = Date.now();
    return all.filter((n) => n.status !== 'sending' && new Date(n.nextRetryAt).getTime() <= now);
  }

  async markSending(id: string): Promise<void> {
    await this.patch(id, { status: 'sending', updatedAt: new Date().toISOString() });
  }

  async markFailed(id: string, error: unknown): Promise<void> {
    const all = await this.getAll();
    const current = all.find((n) => n.id === id);
    const retryCount = (current?.retryCount ?? 0) + 1;
    const backoffMs = Math.min(120_000, 2000 * Math.pow(2, retryCount));
    await this.patch(id, {
      status: 'failed',
      retryCount,
      nextRetryAt: new Date(Date.now() + backoffMs).toISOString(),
      lastError: error instanceof Error ? error.message : String(error),
      updatedAt: new Date().toISOString(),
    });
  }

  async remove(id: string): Promise<void> {
    await this.tx('readwrite', (store) => store.delete(id));
  }

  async getCount(): Promise<number> {
    try {
      return await this.tx('readonly', (store) => store.count());
    } catch {
      return 0;
    }
  }

  private async patch(id: string, fields: Partial<PendingNotification>): Promise<void> {
    const db = await this.getDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const existing = getReq.result as PendingNotification | undefined;
        if (!existing) {
          resolve();
          return;
        }
        store.put({ ...existing, ...fields });
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}

export const pendingNotificationQueue = new PendingNotificationQueue();
