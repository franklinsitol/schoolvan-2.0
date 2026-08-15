import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Driver, TeamMember } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Driver | TeamMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          // 1. First check if user is a parent in the 'users' collection
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setProfile({ id: userDoc.id, ...userData } as any);
          } else {
            // 2. Check if user is a registered driver
            const driverDoc = await getDoc(doc(db, 'drivers', firebaseUser.uid));
            if (driverDoc.exists()) {
              setProfile({ id: driverDoc.id, ...driverDoc.data() } as Driver);
            } else {
              // 3. Fallback profile
              const isSuperAdminEmail = firebaseUser.email === 'franklin.toledo@gmail.com';
              const fallbackProfile: any = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Responsável',
                email: firebaseUser.email || '',
                role: isSuperAdminEmail ? 'superadmin' : 'parent',
                status: 'Ativo'
              };
              setProfile(fallbackProfile);
            }
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          const isSuperAdminEmail = firebaseUser.email === 'franklin.toledo@gmail.com';
          setProfile({
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Responsável',
            email: firebaseUser.email || '',
            role: isSuperAdminEmail ? 'superadmin' : 'parent',
            status: 'Ativo'
          } as any);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, profile, loading };
}
