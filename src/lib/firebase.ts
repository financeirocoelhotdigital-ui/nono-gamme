import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import rawConfig from "../../firebase-applet-config.json";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (rawConfig as any)?.apiKey || "AIzaSyCc9ccAo7h8kdMW1_Nq_Mfvl8z6t35kJ0Q",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (rawConfig as any)?.authDomain || "gen-lang-client-0297514368.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || (rawConfig as any)?.projectId || "gen-lang-client-0297514368",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || (rawConfig as any)?.firestoreDatabaseId || "ai-studio-d08892e7-ff29-48d3-b6ea-e3dca700aa6a",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || (rawConfig as any)?.storageBucket || "gen-lang-client-0297514368.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || (rawConfig as any)?.messagingSenderId || "1048435508588",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || (rawConfig as any)?.appId || "1:1048435508588:web:d970f57faa223d11241f49",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

let dbInstance: any;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  }, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  try {
    dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  } catch (err2) {
    dbInstance = initializeFirestore(app, {});
  }
}
export const db = dbInstance;

let storageInstance: any = null;
try {
  storageInstance = getStorage(app);
} catch (e) {
  console.warn("Storage initialization notice:", e);
}
export const storage = storageInstance;
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  if (!auth.currentUser) {
    return;
  }
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || 'unauthenticated',
      email: auth.currentUser?.email || 'no-email',
      emailVerified: auth.currentUser?.emailVerified || false,
      isAnonymous: auth.currentUser?.isAnonymous || false,
      tenantId: auth.currentUser?.tenantId || '',
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName || '',
        email: provider.email || '',
        photoUrl: provider.photoURL || ''
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // Removed throw to prevent uncaught errors in snapshot listeners
}
