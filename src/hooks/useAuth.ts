import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
          // Check if user is a registered driver
          const driverDoc = await getDoc(doc(db, 'drivers', firebaseUser.uid));
          if (driverDoc.exists()) {
            setProfile({ id: driverDoc.id, ...driverDoc.data() } as Driver);
          } else {
            // Check if user is in top-level users collection or is a Parent
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userDoc.exists()) {
              setProfile({ id: userDoc.id, ...userDoc.data() } as any);
            } else {
              // Default fallback profile for parents / external users
              const fallbackProfile: any = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
                email: firebaseUser.email || '',
                role: firebaseUser.email === 'franklin.toledo@gmail.com' ? 'superadmin' : 'parent',
                status: 'Ativo'
              };
              setProfile(fallbackProfile);
            }
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          // Fallback profile on error
          setProfile({
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
            email: firebaseUser.email || '',
            role: firebaseUser.email === 'franklin.toledo@gmail.com' ? 'superadmin' : 'parent',
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
