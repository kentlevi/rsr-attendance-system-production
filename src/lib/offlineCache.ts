const DB_NAME = 'rsr-offline-cache';
const DB_VERSION = 2;
const FACE_STORE = 'faceProfiles';
const ADMIN_STORE = 'adminCredentials';
const EMPLOYEE_STORE = 'employees';
const EMPLOYEE_CRED_STORE = 'employeeCredentials';
const SETTINGS_STORE = 'settings';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FACE_STORE)) {
        db.createObjectStore(FACE_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(ADMIN_STORE)) {
        db.createObjectStore(ADMIN_STORE, { keyPath: 'email' });
      }
      if (!db.objectStoreNames.contains(EMPLOYEE_STORE)) {
        db.createObjectStore(EMPLOYEE_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(EMPLOYEE_CRED_STORE)) {
        db.createObjectStore(EMPLOYEE_CRED_STORE, { keyPath: 'loginId' });
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (objectStore: IDBObjectStore) => IDBRequest<T> | Promise<T>
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const objectStore = transaction.objectStore(store);
    const result = fn(objectStore);
    if (result instanceof IDBRequest) {
      result.onsuccess = () => resolve(result.result as T);
      result.onerror = () => reject(result.error);
    } else {
      Promise.resolve(result).then(resolve, reject);
    }
    transaction.onerror = () => reject(transaction.error);
  });
}

// ---------- Face profiles ----------

export interface CachedFaceProfile {
  id: string;
  employeeId: string;
  faceDataEncodings: number[][];
  createdAt: string;
}

export async function cacheFaceProfiles(profiles: CachedFaceProfile[]): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(FACE_STORE, 'readwrite');
      const store = transaction.objectStore(FACE_STORE);
      store.clear();
      for (const p of profiles) store.put(p);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (e) {
    console.warn('Failed to cache face profiles', e);
  }
}

export async function getCachedFaceProfiles(): Promise<CachedFaceProfile[]> {
  try {
    return await tx(FACE_STORE, 'readonly', (store) => store.getAll());
  } catch (e) {
    console.warn('Failed to read cached face profiles', e);
    return [];
  }
}

// ---------- Admin credentials ----------

export interface CachedAdminCredential {
  email: string;
  username: string;
  passwordHash: string;
  salt: string;
  role: string;
  displayName?: string;
  cachedAt: string;
}

async function deriveHash(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = hexToBytes(saltHex);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return bytesToHex(new Uint8Array(bits));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

function randomSaltHex(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export async function cacheAdminCredential(input: {
  email: string;
  username: string;
  password: string;
  role: string;
  displayName?: string;
}): Promise<void> {
  try {
    const salt = randomSaltHex();
    const passwordHash = await deriveHash(input.password, salt);
    const record: CachedAdminCredential = {
      email: input.email.toLowerCase().trim(),
      username: input.username,
      passwordHash,
      salt,
      role: input.role,
      displayName: input.displayName,
      cachedAt: new Date().toISOString(),
    };
    await tx(ADMIN_STORE, 'readwrite', (store) => store.put(record));
  } catch (e) {
    console.warn('Failed to cache admin credential', e);
  }
}

export async function verifyCachedAdminCredential(
  email: string,
  password: string
): Promise<CachedAdminCredential | null> {
  try {
    const record = await tx<CachedAdminCredential | undefined>(
      ADMIN_STORE,
      'readonly',
      (store) => store.get(email.toLowerCase().trim()) as IDBRequest<CachedAdminCredential | undefined>
    );
    if (!record) return null;
    const candidateHash = await deriveHash(password, record.salt);
    return candidateHash === record.passwordHash ? record : null;
  } catch (e) {
    console.warn('Failed to verify cached admin credential', e);
    return null;
  }
}

export async function clearCachedAdminCredential(email: string): Promise<void> {
  try {
    await tx(ADMIN_STORE, 'readwrite', (store) => store.delete(email.toLowerCase().trim()));
  } catch (e) {
    console.warn('Failed to clear cached admin credential', e);
  }
}

// ---------- Employee credentials ----------
//
// Mirrors the admin credential cache, but the loginId is whatever the employee
// typed (email or employeeId). PBKDF2 hashing keeps the raw PIN out of
// IndexedDB so an attacker who exfiltrates the cache can't extract it.

export interface CachedEmployeeCredential {
  loginId: string;              // normalised lower-case email or employeeId
  email: string;                // canonical email on the employee record
  employeeRecordId: string;     // Firestore doc id — used to resolve the record offline
  name: string;
  pinHash: string;
  salt: string;
  cachedAt: string;
}

export async function cacheEmployeeCredential(input: {
  loginId: string;
  email: string;
  employeeRecordId: string;
  name: string;
  pin: string;
}): Promise<void> {
  try {
    const salt = randomSaltHex();
    const pinHash = await deriveHash(input.pin, salt);
    const record: CachedEmployeeCredential = {
      loginId: input.loginId.toLowerCase().trim(),
      email: input.email.toLowerCase().trim(),
      employeeRecordId: input.employeeRecordId,
      name: input.name,
      pinHash,
      salt,
      cachedAt: new Date().toISOString(),
    };
    await tx(EMPLOYEE_CRED_STORE, 'readwrite', (store) => store.put(record));
  } catch (e) {
    console.warn('Failed to cache employee credential', e);
  }
}

export async function verifyCachedEmployeeCredential(
  loginId: string,
  pin: string,
): Promise<CachedEmployeeCredential | null> {
  try {
    const record = await tx<CachedEmployeeCredential | undefined>(
      EMPLOYEE_CRED_STORE,
      'readonly',
      (store) => store.get(loginId.toLowerCase().trim()) as IDBRequest<CachedEmployeeCredential | undefined>,
    );
    if (!record) return null;
    const candidateHash = await deriveHash(pin, record.salt);
    return candidateHash === record.pinHash ? record : null;
  } catch (e) {
    console.warn('Failed to verify cached employee credential', e);
    return null;
  }
}

// ---------- Generic key-value (for settings, etc.) ----------

export async function cacheSettings(key: string, value: unknown): Promise<void> {
  try {
    await tx(SETTINGS_STORE, 'readwrite', (store) =>
      store.put({ key, value, cachedAt: new Date().toISOString() })
    );
  } catch (e) {
    console.warn('Failed to cache settings', e);
  }
}

export async function getCachedSettings<T = unknown>(key: string): Promise<T | null> {
  try {
    const rec = await tx<{ value: T } | undefined>(
      SETTINGS_STORE,
      'readonly',
      (store) => store.get(key) as IDBRequest<{ value: T } | undefined>
    );
    return rec ? rec.value : null;
  } catch (e) {
    console.warn('Failed to read cached settings', e);
    return null;
  }
}
