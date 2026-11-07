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
  saveLocalUser,
  findLocalUser,
  createLocalSessionToken,
  decodeLocalSessionToken,
  getCachedUser,
  setCachedUser
} from '../services/localFallback';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  token: string | null;
  loading: boolean;
  isFirebaseActive: boolean;
  login: (email: string, pass: string) => Promise<User>;
  register: (name: string, email: string, pass: string) => Promise<User>;
  registerAdmin: (name: string, email: string, pass: string) => Promise<User>;
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

// Authorized admin accounts allowed in client offline fallback
const AUTHORIZED_ADMIN_EMAILS = ['admin@complainai.ai', 'admin@resolvex.ai'];
const isEmailAdmin = (em?: string | null): boolean =>
  Boolean(em && AUTHORIZED_ADMIN_EMAILS.includes(em.trim().toLowerCase()));

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => getCachedUser());
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  const isFirebaseActive = isFirebaseConfigured() && Boolean(auth);

  useEffect(() => {
    if (!auth) {
      // Firebase not active in this environment; verify if local/demo token exists
      const savedToken = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY);
      if (savedToken) {
        if (savedToken.startsWith('local_jwt_')) {
          const localDecoded = decodeLocalSessionToken(savedToken);
          if (localDecoded) {
            setUser(localDecoded);
            setCachedUser(localDecoded);
            setLoading(false);
            return;
          }
        }

        const cached = getCachedUser();
        if (cached) {
          setUser(cached);
        }

        api.getMe()
          .then((u) => {
            setUser(u);
            setCachedUser(u);
          })
          .catch((err) => {
            console.warn('Backend getMe check unfulfilled, maintaining session:', err);
            if (!cached) {
              localStorage.removeItem(TOKEN_KEY);
              localStorage.removeItem(LEGACY_TOKEN_KEY);
              setUser(null);
              setToken(null);
            }
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
          setCachedUser(dbUser);
        } catch (err) {
          console.warn('Backend sync during onAuthStateChanged:', err);
          // Fallback user object while backend connects
          const fallbackUser: User = {
            id: 1,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            email: fbUser.email || '',
            role: isEmailAdmin(fbUser.email) ? 'admin' : 'user',
            is_active: true,
            created_at: new Date().toISOString(),
            firebase_uid: fbUser.uid
          };
          setUser(fallbackUser);
          setCachedUser(fallbackUser);
        }
      } else {
        // Firebase state signed out
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
        const fallbackUser: User = {
          id: 1,
          name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          email: fbUser.email || cleanEmail,
          role: isEmailAdmin(cleanEmail) ? 'admin' : 'user',
          is_active: true,
          created_at: new Date().toISOString(),
          firebase_uid: fbUser.uid
        };
        setUser(fallbackUser);
        setCachedUser(fallbackUser);
        return fallbackUser;
      }
    } else {
      // Try backend first
      try {
        const data = await api.login(cleanEmail, pass);
        localStorage.setItem(TOKEN_KEY, data.access_token);
        setToken(data.access_token);
        setUser(data.user);
        setCachedUser(data.user);
        saveLocalUser(data.user, pass);
        return data.user;
      } catch (backendErr: any) {
        console.warn('Backend login unavailable, checking local registered credentials:', backendErr);
        // Check registered local users
        const localUser = findLocalUser(cleanEmail, pass);
        if (localUser) {
          const localToken = createLocalSessionToken(localUser);
          localStorage.setItem(TOKEN_KEY, localToken);
          setToken(localToken);
          setUser(localUser);
          setCachedUser(localUser);
          return localUser;
        }

        // Check built-in demo credentials
        if (cleanEmail === 'admin@complainai.ai' || cleanEmail === 'admin@resolvex.ai') {
          const adminUser: User = {
            id: 1,
            name: 'Prof. Arvind Kumar (Campus Facilities Dean)',
            email: cleanEmail,
            role: 'admin',
            is_active: true,
            created_at: new Date().toISOString()
          };
          const localToken = createLocalSessionToken(adminUser);
          localStorage.setItem(TOKEN_KEY, localToken);
          setToken(localToken);
          setUser(adminUser);
          setCachedUser(adminUser);
          return adminUser;
        }
        if (cleanEmail === 'student@complainai.ai' || cleanEmail === 'student@resolvex.ai') {
          const studentUser: User = {
            id: 2,
            name: 'Rohan Sharma (Student Council Representative)',
            email: cleanEmail,
            role: 'user',
            is_active: true,
            created_at: new Date().toISOString()
          };
          const localToken = createLocalSessionToken(studentUser);
          localStorage.setItem(TOKEN_KEY, localToken);
          setToken(localToken);
          setUser(studentUser);
          setCachedUser(studentUser);
          return studentUser;
        }

        throw new Error('Invalid email or password. Please verify your credentials or register a new account.');
      }
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
        console.warn('Backend sync during register:', err);
        const fallbackUser: User = {
          id: 1,
          name: cleanName,
          email: cleanEmail,
          role: cleanEmail.includes('admin') ? 'admin' : 'user',
          is_active: true,
          created_at: new Date().toISOString(),
          firebase_uid: fbUser.uid
        };
        setUser(fallbackUser);
        setCachedUser(fallbackUser);
        return fallbackUser;
      }
    } else {
      // Local or standard API registration
      try {
        const data = await api.register(cleanName, cleanEmail, pass);
        localStorage.setItem(TOKEN_KEY, data.access_token);
        setToken(data.access_token);
        setUser(data.user);
        setCachedUser(data.user);
        saveLocalUser(data.user, pass);
        return data.user;
      } catch (backendErr: any) {
        console.warn('Backend API register unavailable, creating local campus user:', backendErr);
        // Create resilient local student account - registration is strictly role='user'
        const localUser: User = {
          id: Date.now(),
          name: cleanName,
          email: cleanEmail,
          role: 'user',
          is_active: true,
          created_at: new Date().toISOString()
        };
        saveLocalUser(localUser, pass);
        const localToken = createLocalSessionToken(localUser);
        localStorage.setItem(TOKEN_KEY, localToken);
        setToken(localToken);
        setUser(localUser);
        setCachedUser(localUser);
        return localUser;
      }
    }
  };

  const registerAdmin = async (name: string, email: string, pass: string): Promise<User> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    if (isFirebaseActive) {
      let fbUser;
      try {
        fbUser = await fbRegister(cleanName, cleanEmail, pass);
      } catch (fbErr: any) {
        if (fbErr?.code === 'auth/email-already-in-use') {
          fbUser = await fbLogin(cleanEmail, pass);
        } else {
          throw fbErr;
        }
      }
      const idToken = await fbUser.getIdToken();
      localStorage.setItem(TOKEN_KEY, idToken);
      setToken(idToken);
      setFirebaseUser(fbUser);

      try {
        const data = await api.registerAdmin(cleanName, cleanEmail, pass);
        setUser(data.user);
        setCachedUser(data.user);
        return data.user;
      } catch (err) {
        console.warn('Backend registerAdmin fallback:', err);
        const adminUser: User = {
          id: 1,
          name: cleanName || fbUser.displayName || 'Administrator',
          email: cleanEmail,
          role: 'admin',
          is_active: true,
          created_at: new Date().toISOString(),
          firebase_uid: fbUser.uid
        };
        setUser(adminUser);
        setCachedUser(adminUser);
        return adminUser;
      }
    } else {
      try {
        const data = await api.registerAdmin(cleanName, cleanEmail, pass);
        localStorage.setItem(TOKEN_KEY, data.access_token);
        setToken(data.access_token);
        setUser(data.user);
        setCachedUser(data.user);
        saveLocalUser(data.user, pass);
        return data.user;
      } catch (backendErr: any) {
        console.warn('Backend registerAdmin unavailable, creating local admin session:', backendErr);
        const adminUser: User = {
          id: Date.now(),
          name: cleanName,
          email: cleanEmail,
          role: 'admin',
          is_active: true,
          created_at: new Date().toISOString()
        };
        saveLocalUser(adminUser, pass);
        const localToken = createLocalSessionToken(adminUser);
        localStorage.setItem(TOKEN_KEY, localToken);
        setToken(localToken);
        setUser(adminUser);
        setCachedUser(adminUser);
        return adminUser;
      }
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
      setCachedUser(dbUser);
      return dbUser;
    } catch (err) {
      const fallbackUser: User = {
        id: 1,
        name: fbUser.displayName || 'Google User',
        email: fbUser.email || '',
        role: isEmailAdmin(fbUser.email) ? 'admin' : 'user',
        is_active: true,
        created_at: new Date().toISOString(),
        firebase_uid: fbUser.uid
      };
      setUser(fallbackUser);
      setCachedUser(fallbackUser);
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

    try {
      const data = await api.login(creds.email, creds.pass);
      localStorage.setItem(TOKEN_KEY, data.access_token);
      setToken(data.access_token);
      setUser(data.user);
      setCachedUser(data.user);
      return data.user;
    } catch {
      const demoUser: User = role === 'admin' ? {
        id: 1,
        name: 'Prof. Arvind Kumar (Campus Facilities Dean)',
        email: 'admin@complainai.ai',
        role: 'admin',
        is_active: true,
        created_at: new Date().toISOString()
      } : {
        id: 2,
        name: 'Rohan Sharma (Student Council Representative)',
        email: 'student@complainai.ai',
        role: 'user',
        is_active: true,
        created_at: new Date().toISOString()
      };
      const localToken = createLocalSessionToken(demoUser);
      localStorage.setItem(TOKEN_KEY, localToken);
      setToken(localToken);
      setUser(demoUser);
      setCachedUser(demoUser);
      return demoUser;
    }
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
