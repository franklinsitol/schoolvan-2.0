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
        // Check if driver
        const driverDoc = await getDoc(doc(db, 'drivers', firebaseUser.uid));
        if (driverDoc.exists()) {
          setProfile({ id: driverDoc.id, ...driverDoc.data() } as Driver);
        } else {
          // Check if team member in any driver's team
          // This is a bit complex in Firestore without a top-level team collection
          // For now, we'll assume drivers are the main users.
          // In a real app, we might have a top-level 'users' collection mapping to roles.
          setProfile(null);
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
