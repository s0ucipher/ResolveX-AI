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

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  token: string | null;
  loading: boolean;
  isFirebaseActive: boolean;
  login: (email: string, pass: string) => Promise<User>;
  register: (name: string, email: string, pass: string) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
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
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  const isFirebaseActive = isFirebaseConfigured() && Boolean(auth);

  useEffect(() => {
    if (!auth) {
      // Firebase not active in this environment; verify if local/demo token exists
      const savedToken = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
      if (savedToken) {
        api.getMe()
          .then(setUser)
          .catch(() => {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(LEGACY_TOKEN_KEY);
            setUser(null);
            setToken(null);
          })
          .finally(() => setLoading(false));
      } else {
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

          // Synchronize user profile with backend database
          const dbUser = await api.syncUser(
            fbUser.displayName || undefined,
            fbUser.email || undefined
          );
          setUser(dbUser);
        } catch (err) {
          console.warn('Backend sync during onAuthStateChanged:', err);
          // Fallback user object while backend connects
          setUser({
            id: 1,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            email: fbUser.email || '',
            role: (fbUser.email && fbUser.email.toLowerCase().includes('admin')) ? 'admin' : 'user',
            is_active: true,
            created_at: new Date().toISOString(),
            firebase_uid: fbUser.uid
          });
        }
      } else {
        // Firebase state signed out
        if (isFirebaseConfigured()) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(LEGACY_TOKEN_KEY);
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<User> => {
    if (isFirebaseActive) {
      const fbUser = await fbLogin(email, pass);
      const idToken = await fbUser.getIdToken();
      localStorage.setItem(TOKEN_KEY, idToken);
      setToken(idToken);
      setFirebaseUser(fbUser);
      try {
        const dbUser = await api.syncUser(fbUser.displayName || undefined, fbUser.email || undefined);
        setUser(dbUser);
        return dbUser;
      } catch (err) {
        const fallbackUser: User = {
          id: 1,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          email: fbUser.email || email,
          role: (email.toLowerCase().includes('admin')) ? 'admin' : 'user',
          is_active: true,
          created_at: new Date().toISOString(),
          firebase_uid: fbUser.uid
        };
        setUser(fallbackUser);
        return fallbackUser;
      }
    } else {
      // Fallback local API login
      const data = await api.login(email, pass);
      localStorage.setItem(TOKEN_KEY, data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      return data.user;
    }
  };

  const register = async (name: string, email: string, pass: string): Promise<User> => {
    if (isFirebaseActive) {
      const fbUser = await fbRegister(name, email, pass);
      const idToken = await fbUser.getIdToken();
      localStorage.setItem(TOKEN_KEY, idToken);
      setToken(idToken);
      setFirebaseUser(fbUser);
      try {
        const dbUser = await api.syncUser(name, email);
        setUser(dbUser);
        return dbUser;
      } catch (err) {
        const fallbackUser: User = {
          id: 1,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role: 'user',
          is_active: true,
          created_at: new Date().toISOString(),
          firebase_uid: fbUser.uid
        };
        setUser(fallbackUser);
        return fallbackUser;
      }
    } else {
      // Fallback local API registration
      const data = await api.register(name, email, pass);
      localStorage.setItem(TOKEN_KEY, data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      return data.user;
    }
  };

  const loginWithGoogle = async (): Promise<User> => {
    if (!isFirebaseActive) {
      throw new Error('Google Sign-In requires Firebase configuration. Please configure VITE_FIREBASE_* environment variables in your deployment.');
    }
    const fbUser = await fbLoginGoogle();
    const idToken = await fbUser.getIdToken();
    localStorage.setItem(TOKEN_KEY, idToken);
    setToken(idToken);
    setFirebaseUser(fbUser);
    try {
      const dbUser = await api.syncUser(fbUser.displayName || undefined, fbUser.email || undefined);
      setUser(dbUser);
      return dbUser;
    } catch (err) {
      const fallbackUser: User = {
        id: 1,
        name: fbUser.displayName || 'Google User',
        email: fbUser.email || '',
        role: (fbUser.email && fbUser.email.toLowerCase().includes('admin')) ? 'admin' : 'user',
        is_active: true,
        created_at: new Date().toISOString(),
        firebase_uid: fbUser.uid
      };
      setUser(fallbackUser);
      return fallbackUser;
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
    return data.user;
  };

  const logout = () => {
    if (isFirebaseActive) {
      logoutFirebase().catch((err) => console.warn('Firebase logout warning:', err));
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
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
        login,
        register,
        loginWithGoogle,
        resetPassword,
        sendVerificationEmail,
        loginDemo,
        logout,
        isAdmin: user?.role === 'admin'
      }}
    >
      {children}
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
