import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import {
  getFirebaseUserProfile,
  registerUser,
  sendPasswordReset,
  signIn,
  startPresence,
  updateUserProfile,
} from '../services/firebaseData';
import { auth, firebaseConfigError } from '../services/firebase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(firebaseConfigError);
  const stopPresenceRef = useRef(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return undefined;
    }

    let requestId = 0;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const currentRequest = ++requestId;
      if (stopPresenceRef.current) {
        stopPresenceRef.current();
        stopPresenceRef.current = null;
      }
      if (!firebaseUser) {
        setUser(null);
        setAuthError(firebaseConfigError);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        let profile;
        for (let attempt = 0; attempt < 40; attempt += 1) {
          try {
            profile = await getFirebaseUserProfile(firebaseUser.uid, firebaseUser.email);
            break;
          } catch (error) {
            if (
              !error.message.includes('does not have a ChatPulse profile')
              || attempt === 39
            ) {
              throw error;
            }
            await new Promise((resolve) => setTimeout(resolve, 250));
            if (currentRequest !== requestId) return;
          }
        }
        if (currentRequest !== requestId) return;
        setUser(profile);
        setAuthError('');
        stopPresenceRef.current = startPresence(firebaseUser.uid);
      } catch (error) {
        if (currentRequest !== requestId) return;
        console.error('Failed to load the Firebase user profile:', error);
        setUser(null);
        setAuthError(error.message);
      } finally {
        if (currentRequest === requestId) setLoading(false);
      }
    });

    return () => {
      requestId += 1;
      unsubscribe();
      if (stopPresenceRef.current) {
        stopPresenceRef.current();
        stopPresenceRef.current = null;
      }
    };
  }, []);

  const login = async (email, password, rememberMe = true) => {
    const credential = await signIn(email, password, rememberMe);
    const profile = await getFirebaseUserProfile(credential.user.uid, credential.user.email);
    setUser(profile);
    setAuthError('');
    return profile;
  };

  const register = async (details) => {
    const profile = await registerUser(details);
    setUser(profile);
    setAuthError('');
    return profile;
  };

  const logout = async () => {
    if (!auth) return;
    if (stopPresenceRef.current) {
      await stopPresenceRef.current();
      stopPresenceRef.current = null;
    }
    await signOut(auth);
    setUser(null);
  };

  const updateProfile = async (details) => {
    if (!user) throw new Error('You must be signed in to update your profile.');
    const updatedUser = await updateUserProfile(user, details);
    setUser(updatedUser);
    return updatedUser;
  };

  const resetPassword = async (email) => sendPasswordReset(email);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
