import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Driver, TeamMember } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Driver | TeamMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // Clean up any previous Firestore listeners
      unsubs.forEach(unsub => unsub());
      unsubs = [];

      setUser(firebaseUser);

      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const isSuperAdminEmail = firebaseUser.email === 'franklin.toledo@gmail.com';
      const initialFallback: Driver = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
        email: firebaseUser.email || '',
        phone: firebaseUser.phoneNumber || '',
        role: isSuperAdminEmail ? 'superadmin' : 'admin',
        status: 'Ativo',
        plan: 'Gratuito',
        invoiceStatus: 'Em Dia'
      };

      // Set initial profile immediately so UI is responsive even if offline or backend takes time
      setProfile(initialFallback);
      setLoading(false);

      // 1. Listen to drivers/{uid}
      try {
        const driverDocRef = doc(db, 'drivers', firebaseUser.uid);
        const unsubDriver = onSnapshot(
          driverDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const driverData = docSnap.data();
              setProfile({
                id: docSnap.id,
                ...initialFallback,
                ...driverData,
                role: (driverData as any).role || (isSuperAdminEmail ? 'superadmin' : 'admin')
              } as Driver);
            } else {
              // 2. Check users/{uid} if not found in drivers
              const userDocRef = doc(db, 'users', firebaseUser.uid);
              const unsubUser = onSnapshot(
                userDocRef,
                (userSnap) => {
                  if (userSnap.exists()) {
                    const userData = userSnap.data();
                    setProfile({
                      id: userSnap.id,
                      ...initialFallback,
                      ...userData,
                      role: (userData as any).role || (isSuperAdminEmail ? 'superadmin' : 'parent')
                    } as any);
                  }
                },
                (userErr) => {
                  if (userErr.message?.includes('offline') || userErr.code === 'unavailable') {
                    console.warn("Firestore running in offline mode for user profile.");
                  }
                }
              );
              unsubs.push(unsubUser);
            }
          },
          (driverErr) => {
            if (driverErr.message?.includes('offline') || driverErr.code === 'unavailable') {
              console.warn("Firestore running in offline mode for driver profile.");
            } else {
              console.error("Error observing driver profile:", driverErr);
            }
          }
        );
        unsubs.push(unsubDriver);
      } catch (err) {
        console.warn("Could not attach profile listener, using cached/fallback profile:", err);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubs.forEach(unsub => unsub());
    };
  }, []);

  return { user, profile, loading };
}
