import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  limit, 
  onSnapshot,
  increment,
  serverTimestamp
} from 'firebase/firestore';
import { School } from '../types';

// Baseline seed catalog of prominent Brazilian schools & colleges
export const BASELINE_BRAZILIAN_SCHOOLS: Omit<School, 'id'>[] = [
  {
    name: 'Colégio Objetivo - Unidade Paulista',
    normalizedName: 'colegio objetivo unidade paulista',
    address: 'Av. Paulista, 900 - Bela Vista, São Paulo - SP, 01310-100',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Bela Vista',
    type: 'particular',
    usageCount: 42,
  },
  {
    name: 'Colégio Bandeirantes',
    normalizedName: 'colegio bandeirantes',
    address: 'Rua Estela, 268 - Vila Mariana, São Paulo - SP, 04011-001',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Vila Mariana',
    type: 'particular',
    usageCount: 35,
  },
  {
    name: 'Colégio Dante Alighieri',
    normalizedName: 'colegio dante alighieri',
    address: 'Alameda Jaú, 1061 - Jardim Paulista, São Paulo - SP, 01420-001',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Jardim Paulista',
    type: 'particular',
    usageCount: 38,
  },
  {
    name: 'Colégio Santa Cruz',
    normalizedName: 'colegio santa cruz',
    address: 'Av. Arruda Botelho, 255 - Alto de Pinheiros, São Paulo - SP, 05466-000',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Alto de Pinheiros',
    type: 'particular',
    usageCount: 29,
  },
  {
    name: 'Colégio Porto Seguro - Unidade Morumbi',
    normalizedName: 'colegio porto seguro unidade morumbi',
    address: 'Rua Clementine Brenne, 30 - Morumbi, São Paulo - SP, 05659-090',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Morumbi',
    type: 'particular',
    usageCount: 31,
  },
  {
    name: 'Colégio Santo Américo',
    normalizedName: 'colegio santo americo',
    address: 'Rua Santo Américo, 275 - Jardim Colombo, São Paulo - SP, 05626-000',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Jardim Colombo',
    type: 'particular',
    usageCount: 24,
  },
  {
    name: 'Colégio Pentágono - Unidade Perdizes',
    normalizedName: 'colegio pentagono unidade perdizes',
    address: 'Rua Bartira, 937 - Perdizes, São Paulo - SP, 05009-000',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Perdizes',
    type: 'particular',
    usageCount: 22,
  },
  {
    name: 'Colégio Adventista - Unidade Liberdade',
    normalizedName: 'colegio adventista unidade liberdade',
    address: 'Rua Taguá, 64 - Liberdade, São Paulo - SP, 01508-010',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Liberdade',
    type: 'particular',
    usageCount: 26,
  },
  {
    name: 'Colégio Salesiano Santa Teresinha',
    normalizedName: 'colegio salesiano santa teresinha',
    address: 'Rua Dom Henrique Mourão, 367 - Santana, São Paulo - SP, 02405-030',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Santana',
    type: 'particular',
    usageCount: 20,
  },
  {
    name: 'Colégio Marista Arquidiocesano',
    normalizedName: 'colegio marista arquidiocesano',
    address: 'Rua Domingos de Morais, 2565 - Vila Mariana, São Paulo - SP, 04035-000',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Vila Mariana',
    type: 'particular',
    usageCount: 25,
  },
  {
    name: 'Colégio Etapa - Unidade Vila Mariana',
    normalizedName: 'colegio etapa unidade vila mariana',
    address: 'Rua Vergueiro, 1951 - Vila Mariana, São Paulo - SP, 04101-000',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Vila Mariana',
    type: 'particular',
    usageCount: 27,
  },
  {
    name: 'Colégio Anglo Leonardo da Vinci',
    normalizedName: 'colegio anglo leonardo da vinci',
    address: 'Rua Carlos Weber, 1400 - Vila Leopoldina, São Paulo - SP, 05303-000',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Vila Leopoldina',
    type: 'particular',
    usageCount: 19,
  },
  {
    name: 'E.E. Santos Dumont',
    normalizedName: 'ee santos dumont escola estadual',
    address: 'Rua Guaipá, 1500 - Vila Leopoldina, São Paulo - SP, 05089-000',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Vila Leopoldina',
    type: 'estadual',
    usageCount: 15,
  },
  {
    name: 'EMEF Presidente Kennedy',
    normalizedName: 'emef presidente kennedy escola municipal',
    address: 'Av. dos Bandeirantes, 2400 - Planalto Paulista, São Paulo - SP, 04071-000',
    city: 'São Paulo',
    state: 'SP',
    neighborhood: 'Planalto Paulista',
    type: 'municipal',
    usageCount: 14,
  }
];

// Helper to normalize strings for deduplication and indexing
export function normalizeSchoolName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s]/g, ' ') // remove special chars
    .replace(/\s+/g, ' ')
    .trim();
}

// Generate document ID from name and city
export function generateSchoolDocId(name: string, city?: string): string {
  const normName = normalizeSchoolName(name).replace(/\s+/g, '-').slice(0, 50);
  const normCity = city ? normalizeSchoolName(city).replace(/\s+/g, '-').slice(0, 20) : 'br';
  return `school-${normName}-${normCity}`.replace(/[^a-z0-9-]/g, '').toLowerCase();
}

// In-memory cache for ultra-fast instant autocomplete
let cachedSchools: School[] = [];
let isCacheLoaded = false;
let activeUnsubscribe: (() => void) | null = null;

// Initialize live listener to Firestore schools collection
export function initSchoolsListener(onUpdate?: (schools: School[]) => void) {
  if (activeUnsubscribe) {
    if (onUpdate && cachedSchools.length > 0) {
      onUpdate(cachedSchools);
    }
    return activeUnsubscribe;
  }

  try {
    const schoolsRef = collection(db, 'schools');
    const q = query(schoolsRef, limit(300));

    activeUnsubscribe = onSnapshot(q, (snapshot) => {
      const firestoreSchools: School[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<School, 'id'>;
        firestoreSchools.push({
          id: doc.id,
          ...data,
        });
      });

      // Merge with baseline schools to ensure full coverage
      const mergedMap = new Map<string, School>();

      // 1. Add baseline seeds
      BASELINE_BRAZILIAN_SCHOOLS.forEach((base, index) => {
        const normKey = base.normalizedName || normalizeSchoolName(base.name);
        mergedMap.set(normKey, {
          id: `seed-${index}-${normKey.slice(0, 20)}`,
          ...base,
        });
      });

      // 2. Override / enrich with real Firestore data from drivers
      firestoreSchools.forEach((fs) => {
        const normKey = fs.normalizedName || normalizeSchoolName(fs.name);
        mergedMap.set(normKey, fs);
      });

      cachedSchools = Array.from(mergedMap.values()).sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
      isCacheLoaded = true;

      if (onUpdate) {
        onUpdate(cachedSchools);
      }
    }, (error) => {
      console.warn('Could not listen to schools collection (using local baseline):', error);
      if (!isCacheLoaded) {
        cachedSchools = BASELINE_BRAZILIAN_SCHOOLS.map((b, i) => ({
          id: `seed-${i}`,
          ...b,
        }));
        isCacheLoaded = true;
        if (onUpdate) onUpdate(cachedSchools);
      }
    });

    return activeUnsubscribe;
  } catch (err) {
    console.error('Error starting schools listener:', err);
    if (!isCacheLoaded) {
      cachedSchools = BASELINE_BRAZILIAN_SCHOOLS.map((b, i) => ({
        id: `seed-${i}`,
        ...b,
      }));
      isCacheLoaded = true;
      if (onUpdate) onUpdate(cachedSchools);
    }
    return () => {};
  }
}

// Search schools with hybrid local database + live cartographic fallback (Photon/OSM)
export async function searchGlobalSchools(
  queryText: string,
  options?: { city?: string; limitResults?: number; signal?: AbortSignal }
): Promise<School[]> {
  const limitCount = options?.limitResults || 8;
  const clean = queryText.trim();
  const normalizedQuery = normalizeSchoolName(clean);

  // If empty, return top most used schools
  if (!clean || clean.length < 2) {
    if (cachedSchools.length === 0) {
      initSchoolsListener();
    }
    return cachedSchools.slice(0, limitCount);
  }

  const results: School[] = [];
  const seenKeys = new Set<string>();

  const addResult = (school: School) => {
    const key = normalizeSchoolName(school.name);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      results.push(school);
    }
  };

  // 1. Search in local/Firestore Cache first (Exact & Substring Matches)
  if (cachedSchools.length === 0) {
    initSchoolsListener();
  }

  const queryTokens = normalizedQuery.split(' ').filter(t => t.length >= 2);

  // Score match helper
  const matches = cachedSchools.filter((school) => {
    const norm = school.normalizedName || normalizeSchoolName(school.name);
    const normAddr = normalizeSchoolName(school.address || '');
    
    // Direct inclusion
    if (norm.includes(normalizedQuery) || normAddr.includes(normalizedQuery)) {
      return true;
    }

    // Token intersection (e.g. "objetivo" and "paulista")
    if (queryTokens.length > 1) {
      return queryTokens.every(t => norm.includes(t) || normAddr.includes(t));
    }

    return false;
  });

  matches.forEach(addResult);

  // 2. If we need more results, query Komoot Photon / OSM for real Brazilian educational institutions
  if (results.length < limitCount && clean.length >= 3) {
    try {
      const searchParam = `${clean} escola colegio`;
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(searchParam)}&limit=10&lang=pt`;
      const res = await fetch(url, { signal: options?.signal });

      if (res.ok) {
        const data = await res.json();
        if (data.features && Array.isArray(data.features)) {
          for (const f of data.features) {
            const p = f.properties || {};
            const name = p.name || p.street || '';
            const city = p.city || p.town || p.municipality || 'São Paulo';
            const state = p.state || 'SP';
            const suburb = p.district || p.locality || '';
            const road = p.street || '';
            const houseNumber = p.housenumber || '';
            const postcode = p.postcode || '';

            if (!name) continue;

            const isEdu = 
              p.osm_value === 'school' || 
              p.osm_value === 'kindergarten' || 
              p.osm_value === 'college' ||
              p.osm_value === 'university' ||
              name.toLowerCase().includes('escola') ||
              name.toLowerCase().includes('colégio') ||
              name.toLowerCase().includes('colegio') ||
              name.toLowerCase().includes('e.e.') ||
              name.toLowerCase().includes('emef') ||
              name.toLowerCase().includes('emei') ||
              name.toLowerCase().includes('ciep') ||
              name.toLowerCase().includes('educandário') ||
              name.toLowerCase().includes('externato') ||
              name.toLowerCase().includes('instituto');

            if (!isEdu && clean.length < 5) continue;

            const addrParts = [
              road ? `${road}${houseNumber ? ', ' + houseNumber : ''}` : name,
              suburb,
              city ? `${city} - ${state}` : '',
              postcode ? `CEP ${postcode}` : ''
            ].filter(Boolean);

            const compiledAddress = addrParts.join(', ');

            const schoolObj: School = {
              id: `osm-${p.osm_id || Math.random()}`,
              name: name,
              normalizedName: normalizeSchoolName(name),
              address: compiledAddress,
              city: city,
              state: state,
              neighborhood: suburb,
              cep: postcode,
              lat: f.geometry?.coordinates?.[1]?.toString(),
              lon: f.geometry?.coordinates?.[0]?.toString(),
              type: name.toLowerCase().includes('colegio') || name.toLowerCase().includes('colégio') 
                ? 'colegio' 
                : name.toLowerCase().includes('estadual') || name.toLowerCase().includes('e.e.') 
                ? 'estadual'
                : name.toLowerCase().includes('municipal') || name.toLowerCase().includes('emef')
                ? 'municipal'
                : 'escola',
              usageCount: 1,
            };

            addResult(schoolObj);
            if (results.length >= limitCount) break;
          }
        }
      }
    } catch {
      // ignore network errors on external fallback
    }
  }

  return results.slice(0, limitCount);
}

// Automatically save or increment usage of a school into the collective Firestore database
export async function saveOrUpdateGlobalSchool(schoolData: {
  name: string;
  address: string;
  city?: string;
  state?: string;
  neighborhood?: string;
  cep?: string;
  driverId?: string;
  driverName?: string;
}): Promise<School | null> {
  const cleanName = schoolData.name?.trim();
  const cleanAddress = schoolData.address?.trim();

  if (!cleanName || cleanName.length < 2) return null;

  const normalized = normalizeSchoolName(cleanName);
  const docId = generateSchoolDocId(cleanName, schoolData.city);

  try {
    // Check if doc exists in cached list or write to Firestore
    const schoolRef = doc(db, 'schools', docId);

    const newRecord: Omit<School, 'id'> = {
      name: cleanName,
      normalizedName: normalized,
      address: cleanAddress || '',
      city: schoolData.city || '',
      state: schoolData.state || 'SP',
      neighborhood: schoolData.neighborhood || '',
      cep: schoolData.cep || '',
      usageCount: 1,
      lastUsedAt: new Date().toISOString(),
      createdByDriverId: schoolData.driverId,
      createdByDriverName: schoolData.driverName,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    // Use merge setDoc to avoid overwrite data if already present
    await setDoc(schoolRef, {
      ...newRecord,
      usageCount: increment(1),
      updatedAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
      // only update address if new address provided is non-empty
      ...(cleanAddress ? { address: cleanAddress } : {})
    }, { merge: true });

    // Update local cache immediately
    const existingIndex = cachedSchools.findIndex(s => s.normalizedName === normalized || s.id === docId);
    const updatedItem: School = {
      id: docId,
      ...newRecord,
      usageCount: existingIndex >= 0 ? (cachedSchools[existingIndex].usageCount || 1) + 1 : 1,
    };

    if (existingIndex >= 0) {
      cachedSchools[existingIndex] = updatedItem;
    } else {
      cachedSchools.unshift(updatedItem);
    }

    return updatedItem;
  } catch (error) {
    console.warn('Could not persist school to global Firestore collection (using local session):', error);
    return {
      id: docId,
      name: cleanName,
      normalizedName: normalized,
      address: cleanAddress || '',
      city: schoolData.city || '',
      state: schoolData.state || 'SP',
      usageCount: 1,
    };
  }
}
