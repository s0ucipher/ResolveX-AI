import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { User } from '../types';
import { api } from '../services/api';
import {
  auth,
  isFirebaseConfigured,
  registerWithEmail as fbRegister,
  loginWithEmail as fbLogin,
  loginWithGoogle as fbLoginGoogle,
  requestPasswordReset,
  triggerEmailVerification,
  logoutFirebase
} from '../services/firebase';
import {
  retireObsoleteCredentialKeys,
  getCachedUser,
  setCachedUser
} from '../services/localFallback';
import { FirebaseConfigModal } from '../components/FirebaseConfigModal';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  token: string | null;
  loading: boolean;
  isFirebaseActive: boolean;
  showFirebaseModal: boolean;
  setShowFirebaseModal: (show: boolean) => void;
  login: (email: string, pass: string) => Promise<User>;
  register: (name: string, email: string, pass: string) => Promise<User>;
  registerAdmin: (name: string, email: string, pass: string) => Promise<User>;
  loginWithGoogle: (asRole?: 'user' | 'admin', department?: string) => Promise<User>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  loginDemo: (role: 'admin' | 'student') => Promise<User>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'complainai_token';
const LEGACY_TOKEN_KEY = 'resolvex_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    retireObsoleteCredentialKeys();
    const hasToken = Boolean(localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY));
    return hasToken ? getCachedUser() : null;
  });
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY));
  const [loading, setLoading] = useState(true);
  const [showFirebaseModal, setShowFirebaseModal] = useState(false);

  const isFirebaseActive = isFirebaseConfigured() && Boolean(auth);

  useEffect(() => {
    retireObsoleteCredentialKeys();
    if (!auth) {
      const savedToken = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
      if (savedToken) {
        api.getMe()
          .then((u) => {
            setUser(u);
            setCachedUser(u);
          })
          .catch(() => {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(LEGACY_TOKEN_KEY);
            setCachedUser(null);
            setUser(null);
            setToken(null);
          })
          .finally(() => setLoading(false));
      } else {
        setCachedUser(null);
        setUser(null);
        setLoading(false);
      }
      return;
    }

    // Subscribe to Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const idToken = await fbUser.getIdToken();
          localStorage.setItem(TOKEN_KEY, idToken);
          setToken(idToken);

          // Synchronize user profile with backend database (server controls roles)
          const dbUser = await api.syncUser(
            fbUser.displayName || undefined,
            fbUser.email || undefined
          );
          setUser(dbUser);
          setCachedUser(dbUser);
        } catch (err) {
          console.warn('Backend sync failed during onAuthStateChanged; signing out:', err);
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(LEGACY_TOKEN_KEY);
          setCachedUser(null);
          setUser(null);
          setToken(null);
        }
      } else {
        if (isFirebaseConfigured()) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(LEGACY_TOKEN_KEY);
          setCachedUser(null);
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<User> => {
    const cleanEmail = email.trim().toLowerCase();

    if (isFirebaseActive) {
      const fbUser = await fbLogin(cleanEmail, pass);
      const idToken = await fbUser.getIdToken();
      localStorage.setItem(TOKEN_KEY, idToken);
      setToken(idToken);
      setFirebaseUser(fbUser);
      try {
        const dbUser = await api.syncUser(fbUser.displayName || undefined, fbUser.email || undefined);
        setUser(dbUser);
        setCachedUser(dbUser);
        return dbUser;
      } catch (err) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(LEGACY_TOKEN_KEY);
        setCachedUser(null);
        setUser(null);
        setToken(null);
        throw err;
      }
    } else {
      const data = await api.login(cleanEmail, pass);
      localStorage.setItem(TOKEN_KEY, data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      setCachedUser(data.user);
      return data.user;
    }
  };

  const register = async (name: string, email: string, pass: string): Promise<User> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (isFirebaseActive) {
      const fbUser = await fbRegister(cleanName, cleanEmail, pass);
      const idToken = await fbUser.getIdToken();
      localStorage.setItem(TOKEN_KEY, idToken);
      setToken(idToken);
      setFirebaseUser(fbUser);
      try {
        const dbUser = await api.syncUser(cleanName, cleanEmail);
        setUser(dbUser);
        setCachedUser(dbUser);
        return dbUser;
      } catch (err) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(LEGACY_TOKEN_KEY);
        setCachedUser(null);
        setUser(null);
        setToken(null);
        throw err;
      }
    } else {
      const data = await api.register(cleanName, cleanEmail, pass);
      localStorage.setItem(TOKEN_KEY, data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      setCachedUser(data.user);
      return data.user;
    }
  };

  const registerAdmin = async (): Promise<User> => {
    throw new Error(
      'Public administrator registration is disabled. Administrators must be provisioned using the server management utility.'
    );
  };

  const loginWithGoogle = async (_asRole: 'user' | 'admin' = 'user', department?: string): Promise<User> => {
    if (!isFirebaseActive) {
      setShowFirebaseModal(true);
      throw new Error('Google Sign-In requires active Firebase credentials. Click "Save & Activate" in the configuration modal to connect.');
    }
    const fbUser = await fbLoginGoogle();
    const idToken = await fbUser.getIdToken();
    localStorage.setItem(TOKEN_KEY, idToken);
    setToken(idToken);
    setFirebaseUser(fbUser);

    const targetName = department ? `${fbUser.displayName || 'Administrator'} (${department})` : (fbUser.displayName || undefined);

    try {
      const dbUser = await api.syncUser(targetName, fbUser.email || undefined, undefined, department);
      setUser(dbUser);
      setCachedUser(dbUser);
      return dbUser;
    } catch (err) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
      setCachedUser(null);
      setUser(null);
      setToken(null);
      throw err;
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    if (!isFirebaseActive) {
      throw new Error('Password reset requires Firebase configuration.');
    }
    await requestPasswordReset(email);
  };

  const sendVerificationEmail = async (): Promise<void> => {
    if (firebaseUser) {
      await triggerEmailVerification(firebaseUser);
    }
  };

  const loginDemo = async (role: 'admin' | 'student'): Promise<User> => {
    const creds = role === 'admin'
      ? { email: 'admin@complainai.ai', pass: 'Admin@ComplainAI2026!' }
      : { email: 'student@complainai.ai', pass: 'Student@ComplainAI2026!' };

    const data = await api.login(creds.email, creds.pass);
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    setCachedUser(data.user);
    return data.user;
  };

  const logout = () => {
    if (isFirebaseActive) {
      logoutFirebase().catch((err) => console.warn('Firebase logout warning:', err));
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    setCachedUser(null);
    setToken(null);
    setUser(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        token,
        loading,
        isFirebaseActive,
        showFirebaseModal,
        setShowFirebaseModal,
        login,
        register,
        registerAdmin,
        loginWithGoogle,
        resetPassword,
        sendVerificationEmail,
        loginDemo,
        logout,
        isAdmin: user?.role === 'admin'
      }}
    >
      {children}
      <FirebaseConfigModal
        isOpen={showFirebaseModal}
        onClose={() => setShowFirebaseModal(false)}
      />
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
