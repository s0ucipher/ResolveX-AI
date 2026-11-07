import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  User as FirebaseUser,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';

// Vite environment variables for Firebase Client SDK
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || ''
};

// Check if valid Firebase configuration is provided
export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId
  );
};

// Initialize Firebase App safely (singleton)
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    // Set local persistence
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('Firebase persistence initialization warning:', err);
    });
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  } catch (err) {
    console.error('Failed to initialize Firebase SDK:', err);
  }
} else {
  console.info(
    'Firebase environment variables (VITE_FIREBASE_*) not set. Application will run in demonstration mode.'
  );
}

export { auth, googleProvider };

/**
 * Maps Firebase Auth error codes into clean, user-friendly messages.
 */
export const mapFirebaseError = (error: any): string => {
  if (!error) return 'An unexpected authentication error occurred.';
  const code = error.code || '';
  const message = error.message || '';

  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This user account has been disabled. Please contact administrator.';
    case 'auth/user-not-found':
      return 'No account was found with this email address. Please register first.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please try again or reset your password.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please sign in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please choose at least 6 characters with letters and numbers.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing authentication.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
    case 'auth/cancelled-popup-request':
      return 'Sign-in request was cancelled. Please try again.';
    case 'auth/network-request-failed':
      return 'Network error occurred. Please check your internet connection.';
    case 'auth/too-many-requests':
      return 'Too many failed login attempts. Access is temporarily disabled. Please reset your password or try again later.';
    case 'auth/requires-recent-login':
      return 'This operation is sensitive and requires recent authentication. Please sign in again.';
    default:
      if (message.includes('auth/')) {
        return message.replace(/^Firebase:\s*/, '');
      }
      return message || 'Authentication failed. Please check your credentials.';
  }
};

/**
 * Register a new user with Email and Password.
 */
export const registerWithEmail = async (
  name: string,
  email: string,
  pass: string
): Promise<FirebaseUser> => {
  if (!auth) {
    throw new Error('Firebase Authentication is not configured. Please supply VITE_FIREBASE_* environment variables in your Vercel Project Settings.');
  }

  const credential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (name.trim()) {
    try {
      await updateProfile(credential.user, { displayName: name.trim() });
    } catch (err) {
      console.warn('Could not update Firebase displayName:', err);
    }
  }

  // Optionally send email verification
  try {
    await sendEmailVerification(credential.user);
  } catch (err) {
    console.warn('Could not send verification email:', err);
  }

  return credential.user;
};

/**
 * Sign in with Email and Password.
 */
export const loginWithEmail = async (
  email: string,
  pass: string
): Promise<FirebaseUser> => {
  if (!auth) {
    throw new Error('Firebase Authentication is not configured. Please supply VITE_FIREBASE_* environment variables in your Vercel Project Settings.');
  }
  const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return credential.user;
};

/**
 * Sign in with Google Popup.
 */
export const loginWithGoogle = async (): Promise<FirebaseUser> => {
  if (!auth || !googleProvider) {
    throw new Error('Firebase Authentication is not configured. Please supply VITE_FIREBASE_* environment variables in your Vercel Project Settings.');
  }
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
};

/**
 * Send password reset email.
 */
export const requestPasswordReset = async (email: string): Promise<void> => {
  if (!auth) {
    throw new Error('Firebase Authentication is not configured. Please supply VITE_FIREBASE_* environment variables in your Vercel Project Settings.');
  }
  await sendPasswordResetEmail(auth, email.trim());
};

/**
 * Send email verification to current user.
 */
export const triggerEmailVerification = async (user: FirebaseUser): Promise<void> => {
  await sendEmailVerification(user);
};

/**
 * Sign out from Firebase.
 */
export const logoutFirebase = async (): Promise<void> => {
  if (auth) {
    await signOut(auth);
  }
};

/**
 * Get current Firebase ID Token.
 */
export const getFirebaseIdToken = async (forceRefresh = false): Promise<string | null> => {
  if (!auth || !auth.currentUser) return null;
  try {
    return await auth.currentUser.getIdToken(forceRefresh);
  } catch (err) {
    console.error('Failed to get Firebase ID token:', err);
    return null;
  }
};

