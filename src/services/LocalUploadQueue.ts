export type UploadKind = 'attendance-photo' | 'request-attachment' | 'profile-avatar' | 'incident-evidence';

export type UploadStatus = 'pending' | 'uploading' | 'failed';

export interface PendingUpload {
  id: string;
  kind: UploadKind;
  // For data-URL uploads (base64). For blob uploads we store the blob directly.
  dataUrl?: string;
  blob?: Blob;
  fileName?: string;
  contentType?: string;
  // Destination path in Firebase Storage. If empty, the consumer derives one at upload time.
  storagePath?: string;
  // Free-form context the caller uses to apply the result (e.g. logId, employeeId, action, field).
  context: Record<string, any>;
  status: UploadStatus;
  retryCount: number;
  nextRetryAt: string;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
}

const DB_NAME = 'rsr-upload-queue';
const DB_VERSION = 1;
const STORE = 'uploads';

class LocalUploadQueue {
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

  private generateId(kind: UploadKind): string {
    return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async enqueue(
    input: Omit<PendingUpload, 'id' | 'status' | 'retryCount' | 'nextRetryAt' | 'createdAt' | 'updatedAt'>
  ): Promise<PendingUpload> {
    const now = new Date().toISOString();
    const record: PendingUpload = {
      ...input,
      id: this.generateId(input.kind),
      status: 'pending',
      retryCount: 0,
      nextRetryAt: now,
      createdAt: now,
      updatedAt: now,
    };
    await this.tx('readwrite', (store) => store.put(record));
    return record;
  }

  async getAll(): Promise<PendingUpload[]> {
    try {
      return await this.tx('readonly', (store) => store.getAll());
    } catch (e) {
      console.warn('Failed to read upload queue', e);
      return [];
    }
  }

  async getRetryable(): Promise<PendingUpload[]> {
    const all = await this.getAll();
    const now = Date.now();
    return all.filter(
      (u) => u.status !== 'uploading' && new Date(u.nextRetryAt).getTime() <= now
    );
  }

  async markUploading(id: string): Promise<void> {
    await this.patch(id, { status: 'uploading', updatedAt: new Date().toISOString() });
  }

  async markFailed(id: string, error: unknown): Promise<void> {
    const all = await this.getAll();
    const current = all.find((u) => u.id === id);
    const retryCount = (current?.retryCount ?? 0) + 1;
    const backoffMs = Math.min(60_000, 1000 * Math.pow(2, retryCount));
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

  private async patch(id: string, fields: Partial<PendingUpload>): Promise<void> {
    const db = await this.getDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const existing = getReq.result as PendingUpload | undefined;
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

  async getCount(): Promise<number> {
    try {
      return await this.tx('readonly', (store) => store.count());
    } catch {
      return 0;
    }
  }
}

export const localUploadQueue = new LocalUploadQueue();
