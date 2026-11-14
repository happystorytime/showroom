import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { classifyAuthError } from './pureCalculations';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const firebaseStorage = getStorage(app);

// Keep basic Workspace sign-in lightweight (no extra Sheets/Drive consent prompt during initial login)
const loginProvider = new GoogleAuthProvider();
loginProvider.setCustomParameters({ prompt: 'select_account' });

// Incremental OAuth provider used only when the user explicitly syncs to Google Sheets
const sheetsProvider = new GoogleAuthProvider();
sheetsProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
sheetsProvider.addScope('https://www.googleapis.com/auth/drive.file');
sheetsProvider.setCustomParameters({ prompt: 'consent' });

let cachedAccessToken: string | null = null;
let pendingSignIn: Promise<{ user: User; accessToken: string | null } | null> | null = null;

export const initAuth = (
  onAuthChange: (user: User | null, token: string | null) => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      onAuthChange(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      onAuthChange(null, null);
    }
  });
};

async function runPopupSignIn(
  provider: GoogleAuthProvider
): Promise<{ user: User; accessToken: string | null } | null> {
  if (pendingSignIn) {
    return pendingSignIn;
  }

  pendingSignIn = (async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        cachedAccessToken = credential.accessToken;
      }
      return { user: result.user, accessToken: cachedAccessToken };
    } catch (error) {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
      const info = classifyAuthError(error, hostname);
      if (info.isUserCancelled) {
        return null;
      }
      if (info.code === 'auth/unknown') {
        console.warn('Sign in issue:', info.code, info.message);
      }
      throw new Error(info.message);
    } finally {
      pendingSignIn = null;
    }
  })();

  return pendingSignIn;
}

export const googleSignIn = async (): Promise<{ user: User; accessToken: string | null } | null> => {
  return runPopupSignIn(loginProvider);
};

export const googleSheetsSignIn = async (): Promise<{ user: User; accessToken: string | null } | null> => {
  return runPopupSignIn(sheetsProvider);
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};
