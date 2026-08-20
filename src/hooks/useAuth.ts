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

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up any previous Firestore listeners
      unsubs.forEach(unsub => unsub());
      unsubs = [];

      setUser(firebaseUser);

      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const cleanEmail = (firebaseUser.email || '').trim().toLowerCase();
      const isSuperAdminEmail = cleanEmail === 'franklin.toledo@gmail.com';
      const defaultName = firebaseUser.displayName || 
        (isSuperAdminEmail ? 'Franklin Toledo' : '') || 
        (cleanEmail ? cleanEmail.split('@')[0].replace('.', ' ') : '') || 
        'Tio da Van';

      try {
        // Step 1: Check if this user is registered as a Collaborator / Monitor in collaborator_invites
        let isColabInvite = false;
        if (cleanEmail) {
          try {
            const inviteSnap = await getDoc(doc(db, 'collaborator_invites', cleanEmail));
            if (inviteSnap.exists()) {
              isColabInvite = true;
              const inviteData = inviteSnap.data();
              const ownerId = inviteData.ownerId;

              // Listen to owner driver document and collaborator invite document
              if (ownerId) {
                const unsubDriver = onSnapshot(doc(db, 'drivers', ownerId), (driverSnap) => {
                  const driverData = driverSnap.exists() ? driverSnap.data() : {};
                  setProfile({
                    id: ownerId, // Point to owner driver so all subcollection queries load owner's students, vans, routes!
                    collaboratorUid: firebaseUser.uid,
                    name: inviteData.name || firebaseUser.displayName || defaultName,
                    email: firebaseUser.email || cleanEmail,
                    phone: inviteData.phone || firebaseUser.phoneNumber || '',
                    role: 'colab',
                    memberType: inviteData.memberType || 'Monitor',
                    canEdit: Boolean(inviteData.canEdit),
                    vehicleId: inviteData.vehicleId || '',
                    ownerId: ownerId,
                    ownerDriverName: driverData.name || inviteData.ownerDriverName || 'Tio da Van',
                    status: (driverData.status as any) || 'Ativo',
                    plan: driverData.plan || 'Básico',
                    invoiceStatus: driverData.invoiceStatus || 'Em Dia',
                    pixKey: driverData.pixKey
                  } as any);
                  setLoading(false);
                });
                unsubs.push(unsubDriver);

                // Also listen for any changes the driver makes to this member's permissions/van
                const unsubInvite = onSnapshot(doc(db, 'collaborator_invites', cleanEmail), (updatedInviteSnap) => {
                  if (updatedInviteSnap.exists()) {
                    const upData = updatedInviteSnap.data();
                    setProfile(prev => prev ? {
                      ...prev,
                      name: upData.name || prev.name,
                      phone: upData.phone || prev.phone,
                      memberType: upData.memberType || (prev as any).memberType || 'Monitor',
                      canEdit: Boolean(upData.canEdit),
                      vehicleId: upData.vehicleId || (prev as any).vehicleId,
                    } as any : null);
                  }
                });
                unsubs.push(unsubInvite);

                return; // Collaborator setup finished
              }
            }
          } catch (colabErr) {
            console.warn("Could not check collaborator invite:", colabErr);
          }
        }

        // Step 2: Regular Driver or Parent account
        const initialFallback: Driver = {
          id: firebaseUser.uid,
          name: defaultName,
          email: firebaseUser.email || '',
          phone: firebaseUser.phoneNumber || '',
          role: isSuperAdminEmail ? 'superadmin' : 'admin',
          status: 'Ativo',
          plan: 'Gratuito',
          invoiceStatus: 'Em Dia'
        };

        setProfile(initialFallback);
        setLoading(false);

        // Listen to drivers/{uid}
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
              // Check users/{uid} for parent role
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
                    console.warn("Firestore offline mode for user profile.");
                  }
                }
              );
              unsubs.push(unsubUser);
            }
          },
          (driverErr) => {
            if (driverErr.message?.includes('offline') || driverErr.code === 'unavailable') {
              console.warn("Firestore offline mode for driver profile.");
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
