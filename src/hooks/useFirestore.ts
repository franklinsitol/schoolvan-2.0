import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  onSnapshot, 
  QueryConstraint,
  collectionGroup
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useFirestore<T>(collectionPath: string, constraints: QueryConstraint[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Safety check: Don't attempt to query if path is invalid or contains 'undefined'/'null'
    if (!collectionPath || collectionPath.includes('undefined') || collectionPath.includes('null')) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubscribe = () => {};

    try {
      const q = query(collection(db, collectionPath), ...constraints);
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as T);
        });
        setData(items);
        setLoading(false);
      }, (err) => {
        if (err.message?.includes('offline') || (err as any).code === 'unavailable') {
          console.warn(`Firestore working in offline cache mode for [${collectionPath}]`);
        } else {
          console.error(`Firestore error on [${collectionPath}]:`, err);
        }
        setError(err);
        setLoading(false);
      });
    } catch (err: any) {
      console.error(`Error initializing collection reference [${collectionPath}]:`, err);
      setError(err);
      setLoading(false);
    }

    return () => unsubscribe();
  }, [collectionPath, JSON.stringify(constraints)]);

  return { data, loading, error };
}

export function useCollectionGroup<T>(collectionId: string, constraints: QueryConstraint[] = []) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!collectionId || collectionId.includes('undefined') || collectionId.includes('null')) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubscribe = () => {};

    try {
      const q = query(collectionGroup(db, collectionId), ...constraints);
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((doc) => {
          const docData = doc.data();
          const driverIdFromPath = doc.ref.parent?.parent?.id;
          items.push({ 
            id: doc.id, 
            driverId: (docData as any)?.driverId || driverIdFromPath,
            ...docData 
          } as T);
        });
        setData(items);
        setLoading(false);
      }, (err) => {
        if (err.message?.includes('offline') || (err as any).code === 'unavailable') {
          console.warn(`CollectionGroup working in offline mode for [${collectionId}]`);
        } else {
          console.error(`CollectionGroup error on [${collectionId}]:`, err);
        }
        setLoading(false);
      });
    } catch (err: any) {
      console.error(`Error initializing collectionGroup reference [${collectionId}]:`, err);
      setLoading(false);
    }

    return () => unsubscribe();
  }, [collectionId, JSON.stringify(constraints)]);

  return { data, loading };
}
