'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

interface UserData {
  uid: string;
  displayName: string;
  credits: number;
  coins: number;
  currentTeam: string | null;
  outfitImageUrl: string | null;
  stats: {
    dunks: number;
    points: number;
    gamesPlayed: number;
    wins: number;
  };
  unlockedLocations: string[];
  tutorialCompleted?: boolean;
}

interface AuthContextType {
  user: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  refreshUserData: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Listen for user data changes
        const userRef = doc(db, 'users', user.uid);
        const unsubscribeData = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data() as UserData);
          } else {
            // Initialize user data
            const initialData: UserData = {
              uid: user.uid,
              displayName: user.displayName || 'Rookie',
              credits: 100,
              coins: 10,
              currentTeam: null,
              outfitImageUrl: null,
              stats: { dunks: 0, points: 0, gamesPlayed: 0, wins: 0 },
              unlockedLocations: ['USA'],
              tutorialCompleted: false,
            };
            setDoc(userRef, initialData);
            setUserData(initialData);
          }
          setLoading(false);
        });
        return () => unsubscribeData();
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const refreshUserData = async () => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        setUserData(docSnap.data() as UserData);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
