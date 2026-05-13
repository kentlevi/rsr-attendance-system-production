import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
}, (firebaseConfig as any).firestoreDatabaseId);

export const auth = getAuth();
export const storage = getStorage(app);

// Validate connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection successful");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is reporting as offline.");
    } else {
      console.error("Firebase connection error:", error);
    }
  }
}

/*
if (typeof window !== 'undefined') {
  testConnection();
}
*/

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}


function buildErrorInfo(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errMessage = error instanceof Error ? error.message : String(error);
  if (errMessage.toLowerCase().includes('quota') || errMessage.toLowerCase().includes('exceeded')) {
    console.error("FIREBASE QUOTA EXCEEDED! Please check Spark plan limits.");
  }
  return {
    error: errMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
}

function isPermissionDenied(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    msg.includes('missing or insufficient permissions') ||
    msg.includes('permission-denied') ||
    (error as any)?.code === 'permission-denied'
  );
}

/**
 * Use this from promise-based write paths (addDoc/updateDoc/deleteDoc) that are wrapped in try/catch.
 * It logs and re-throws so the caller can react.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = buildErrorInfo(error, operationType, path);
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Use this from onSnapshot error callbacks. Logs without throwing so the error
 * does not bubble up as an uncaught browser exception. Permission-denied errors
 * (which are expected for unauthenticated/unauthorized users) are logged at warn level.
 *
 * If `retry` is provided and the error is a transient permission-denied (e.g. rules
 * were deployed mid-bootstrap, or the auth token wasn't fully propagated yet), the
 * callback is invoked exactly once after a short delay to re-establish the listener.
 * Pass a guard from the caller so it's only retried once per subscription cycle.
 */
export function logFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
  retry?: () => void,
) {
  const errInfo = buildErrorInfo(error, operationType, path);
  if (isPermissionDenied(error)) {
    console.warn(`Firestore permission denied for ${path} (${operationType}). User may not have access — skipping subscription.`);
    if (retry) {
      console.warn(`Retrying subscription to ${path} in 2s…`);
      setTimeout(() => {
        try {
          retry();
        } catch (e) {
          console.warn(`Retry for ${path} threw:`, e);
        }
      }, 2000);
    }
  } else {
    console.error('Firestore Error (snapshot): ', JSON.stringify(errInfo));
  }
}

export function trackFirestoreUsage(operationType: OperationType, count = 1) {
    // Temporarily disabled for debugging
    console.log("Usage tracked:", operationType, count);
}

