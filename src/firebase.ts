import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistent multi-tab local cache to minimize cloud read units
let firestoreDb;
try {
  firestoreDb = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    },
    firebaseConfig.firestoreDatabaseId
  );
} catch {
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

// CRITICAL: Must pass databaseId from config
export const db = firestoreDb;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function isQuotaExceededError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';
  return (
    code === 'resource-exhausted' ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('quota metric') ||
    msg.includes('Free daily read units') ||
    msg.toLowerCase().includes('quota exceeded') ||
    msg.toLowerCase().includes('exceeded the quota')
  );
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
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  if (isQuotaExceededError(error)) {
    console.warn(`[Firestore] Kuota harian Firestore gratis tercapai pada operasi ${operationType} di ${path || 'database'}. Data aktif dalam mode lokal.`);
    throw error;
  }
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
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
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on startup
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (isQuotaExceededError(error)) {
      console.warn('Firebase Firestore: Quota limit reached for free tier. Running in local cache mode.');
      return;
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase Firestore: check configuration or client connectivity.');
    }
  }
}
