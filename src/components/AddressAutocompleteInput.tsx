import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2, School, Home, Building2, X, CheckCircle2, Sparkles, Hash, Layers } from 'lucide-react';

export interface AddressSuggestion {
  id: string;
  label: string;
  road: string;
  houseNumber?: string;
  suburb?: string;
  city?: string;
  state?: string;
  cep?: string;
  mainText: string;
  secondaryText: string;
  type?: 'school' | 'residential' | 'place';
  lat?: string;
  lon?: string;
}

interface AddressAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  isSchool?: boolean;
  className?: string;
  helperBadge?: string;
  id?: string;
}

// Helper to parse existing single-line address into parts
function parseExistingAddress(fullAddr: string): {
  street: string;
  number: string;
  complement: string;
  neighborhoodCity: string;
} {
  if (!fullAddr || typeof fullAddr !== 'string') {
    return { street: '', number: '', complement: '', neighborhoodCity: '' };
  }

  const trimmed = fullAddr.trim();
  if (!trimmed) {
    return { street: '', number: '', complement: '', neighborhoodCity: '' };
  }

  // Common pattern: "Rua das Flores, 123 - Apto 4, Centro, Santos - SP" or "Rua X, 123"
  const commaParts = trimmed.split(',').map(s => s.trim());
  const street = commaParts[0] || '';

  let number = '';
  let complement = '';
  let neighborhoodCity = '';

  if (commaParts.length > 1) {
    const secondPart = commaParts[1];
    // Check if second part has dash for complement: "123 - Apto 4"
    if (secondPart.includes(' - ')) {
      const subParts = secondPart.split(' - ').map(s => s.trim());
      number = subParts[0] || '';
      complement = subParts.slice(1).join(' - ') || '';
    } else {
      number = secondPart;
    }

    if (commaParts.length > 2) {
      neighborhoodCity = commaParts.slice(2).join(', ');
    }
  }

  return {
    street,
    number,
    complement,
    neighborhoodCity,
  };
}

// Generate phonetic/orthographic variants for Brazilian search (e.g. Luiz -> Luis, Souza -> Sousa)
function generateSearchVariants(text: string): string[] {
  const clean = text.trim();
  const variants = new Set<string>();
  variants.add(clean);

  // Z <-> S replacement
  if (clean.toLowerCase().includes('z')) {
    variants.add(clean.replace(/z/gi, 's'));
  }
  if (clean.toLowerCase().includes('s')) {
    variants.add(clean.replace(/s/gi, 'z'));
  }

  // Strip common street prefixes
  const strippedPrefix = clean.replace(/^(rua|r\.|avenida|av\.|alameda|al\.|travessa|tv\.|praça|praca|estrada|est\.)\s+/i, '');
  if (strippedPrefix && strippedPrefix !== clean) {
    variants.add(strippedPrefix);
    if (strippedPrefix.toLowerCase().includes('z')) {
      variants.add(strippedPrefix.replace(/z/gi, 's'));
    }
    if (strippedPrefix.toLowerCase().includes('s')) {
      variants.add(strippedPrefix.replace(/s/gi, 'z'));
    }
  }

  return Array.from(variants);
}

export function AddressAutocompleteInput({
  value,
  onChange,
  placeholder = 'Digite o nome da rua, avenida ou CEP...',
  label,
  required = false,
  isSchool = false,
  className = '',
  helperBadge,
  id,
}: AddressAutocompleteInputProps) {
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhoodCity, setNeighborhoodCity] = useState('');

  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const numberInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isInternalUpdateRef = useRef(false);

  // Sync internal state when external value changes
  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    const parsed = parseExistingAddress(value || '');
    setStreet(parsed.street || value || '');
    setNumber(parsed.number || '');
    setComplement(parsed.complement || '');
    setNeighborhoodCity(parsed.neighborhoodCity || '');
    if (value && value.length > 5) {
      setIsVerified(true);
    }
  }, [value]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compile full address string and trigger onChange
  const emitCompiledAddress = (
    newStreet: string,
    newNumber: string,
    newComplement: string,
    newNeighborhoodCity: string
  ) => {
    const s = newStreet.trim();
    const n = newNumber.trim();
    const c = newComplement.trim();
    const nc = newNeighborhoodCity.trim();

    if (!s && !n) {
      isInternalUpdateRef.current = true;
      onChange('');
      return;
    }

    let compiled = s;
    if (n) {
      compiled += `, ${n}`;
    }
    if (c) {
      compiled += ` - ${c}`;
    }
    if (nc) {
      compiled += `, ${nc}`;
    }

    isInternalUpdateRef.current = true;
    onChange(compiled);
  };

  // Fetch address suggestions (Multi-engine: Photon + ViaCEP + Nominatim)
  useEffect(() => {
    const trimmed = street.trim();

    if (trimmed.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    // Check if query is CEP (e.g. 11055-000 or 11055000)
    const cepClean = trimmed.replace(/\D/g, '');
    if (cepClean.length === 8) {
      fetchCep(cepClean);
      return;
    }

    const timer = setTimeout(() => {
      fetchAddressSuggestions(trimmed);
    }, 280);

    return () => clearTimeout(timer);
  }, [street, isSchool]);

  const fetchCep = async (cep: string) => {
    setLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
      if (res.ok) {
        const data = await res.json();
        const streetPart = data.street || '';
        const neighborhoodCityPart = `${data.neighborhood || ''}, ${data.city || ''} - ${data.state || ''} (CEP ${data.cep})`;
        const full = `${streetPart}, ${neighborhoodCityPart}`;

        setSuggestions([
          {
            id: `cep-${data.cep}`,
            label: full,
            road: streetPart,
            suburb: data.neighborhood,
            city: data.city,
            state: data.state,
            cep: data.cep,
            mainText: streetPart || `CEP ${data.cep}`,
            secondaryText: neighborhoodCityPart,
            type: 'residential',
          },
        ]);
        setIsOpen(true);
      }
    } catch {
      // fallback silently
    } finally {
      setLoading(false);
    }
  };

  const fetchAddressSuggestions = async (searchTerm: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    try {
      const searchVariants = generateSearchVariants(searchTerm);
      const allResults: AddressSuggestion[] = [];
      const seenKeys = new Set<string>();

      const addUnique = (item: AddressSuggestion) => {
        const key = `${(item.road || item.mainText).toLowerCase().trim()}|${(item.suburb || '').toLowerCase().trim()}|${(item.city || '').toLowerCase().trim()}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          allResults.push(item);
        }
      };

      // 1. Primary Engine: Photon (Fast, Fuzzy, Typo-Tolerant, Handles Brazil districts like Perus)
      for (const variant of searchVariants.slice(0, 3)) {
        try {
          const queryParam = isSchool ? `${variant} escola` : variant;
          const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(queryParam)}&limit=7&lang=pt`;
          const res = await fetch(url, { signal: abortControllerRef.current.signal });
          if (res.ok) {
            const data = await res.json();
            if (data.features && Array.isArray(data.features)) {
              for (const f of data.features) {
                const p = f.properties || {};
                const road = p.street || p.name || '';
                const houseNumber = p.housenumber || '';
                const city = p.city || p.town || p.municipality || '';
                const state = p.state || '';
                const suburb = p.district || p.locality || '';
                const mainText = road || p.name || 'Logradouro';
                const secondaryParts = [suburb, city, state, p.postcode ? `CEP ${p.postcode}` : ''].filter(Boolean);
                const secondaryText = secondaryParts.join(', ') || (p.country || 'Brasil');

                const isEducationPlace =
                  isSchool ||
                  p.osm_value === 'school' ||
                  p.osm_value === 'kindergarten' ||
                  mainText.toLowerCase().includes('escola') ||
                  mainText.toLowerCase().includes('colégio') ||
                  mainText.toLowerCase().includes('colegio');

                addUnique({
                  id: `ph-${p.osm_id || Math.random()}`,
                  label: `${mainText}${houseNumber ? ', ' + houseNumber : ''}, ${secondaryText}`,
                  road: road || mainText,
                  houseNumber: houseNumber,
                  suburb: suburb,
                  city: city,
                  state: state,
                  cep: p.postcode,
                  mainText: mainText,
                  secondaryText: secondaryText,
                  type: isEducationPlace ? 'school' : 'residential',
                  lat: f.geometry?.coordinates?.[1]?.toString(),
                  lon: f.geometry?.coordinates?.[0]?.toString(),
                });
              }
            }
          }
        } catch {
          // ignore single variant failure
        }
      }

      // 2. Secondary Engine: ViaCEP Logradouro Search (for SP / Brazilian streets)
      if (allResults.length < 5) {
        const cleanForViaCep = searchTerm.replace(/^(rua|r\.|avenida|av\.|alameda|al\.|travessa|tv\.)\s+/i, '').trim();
        if (cleanForViaCep.length >= 3) {
          try {
            const viaCepVariants = [cleanForViaCep, cleanForViaCep.replace(/z/gi, 's'), cleanForViaCep.replace(/s/gi, 'z')];
            for (const v of Array.from(new Set(viaCepVariants)).slice(0, 2)) {
              const res = await fetch(`https://viacep.com.br/ws/SP/Sao%20Paulo/${encodeURIComponent(v)}/json/`, {
                signal: abortControllerRef.current.signal,
              });
              if (res.ok) {
                const viaData = await res.json();
                if (Array.isArray(viaData)) {
                  for (const vItem of viaData.slice(0, 5)) {
                    const road = vItem.logradouro || '';
                    const suburb = vItem.bairro || '';
                    const city = vItem.localidade || 'São Paulo';
                    const state = vItem.uf || 'SP';
                    const secondaryText = `${suburb}, ${city} - ${state} (CEP ${vItem.cep})`;

                    addUnique({
                      id: `vc-${vItem.cep}`,
                      label: `${road}, ${secondaryText}`,
                      road: road,
                      suburb: suburb,
                      city: city,
                      state: state,
                      cep: vItem.cep,
                      mainText: road,
                      secondaryText: secondaryText,
                      type: 'residential',
                    });
                  }
                }
              }
            }
          } catch {
            // ignore
          }
        }
      }

      // 3. Tertiary Engine: Nominatim OpenStreetMap
      if (allResults.length < 4) {
        try {
          const searchTarget = isSchool ? `${searchTerm} escola colegio` : searchTerm;
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchTarget
          )}&countrycodes=br&addressdetails=1&limit=5`;

          const response = await fetch(url, {
            signal: abortControllerRef.current.signal,
            headers: {
              'Accept-Language': 'pt-BR,pt;q=0.9',
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data)) {
              for (const item of data) {
                const addr = item.address || {};
                const road = addr.road || addr.pedestrian || addr.street || item.name || '';
                const houseNumber = addr.house_number || '';
                const suburb = addr.suburb || addr.neighbourhood || addr.city_district || '';
                const city = addr.city || addr.town || addr.municipality || '';
                const state = addr.state ? `${addr.state}` : '';

                const mainText = road || item.display_name.split(',')[0];
                const secondaryParts = [suburb, city, state].filter(Boolean).join(', ');
                const secondaryText = secondaryParts || item.display_name.split(',').slice(1, 4).join(', ');

                const isEducationPlace =
                  isSchool ||
                  item.type === 'school' ||
                  item.class === 'amenity' ||
                  item.display_name.toLowerCase().includes('escola') ||
                  item.display_name.toLowerCase().includes('colégio') ||
                  item.display_name.toLowerCase().includes('colegio');

                addUnique({
                  id: String(item.place_id || Math.random()),
                  label: item.display_name,
                  road: road || mainText,
                  houseNumber: houseNumber,
                  suburb: suburb,
                  city: city,
                  state: state,
                  mainText: mainText || item.display_name,
                  secondaryText: secondaryText || 'Brasil',
                  type: isEducationPlace ? 'school' : 'residential',
                  lat: item.lat,
                  lon: item.lon,
                });
              }
            }
          }
        } catch {
          // ignore
        }
      }

      setSuggestions(allResults.slice(0, 7));
      setIsOpen(true);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching suggestions', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    const selectedStreet = suggestion.road || suggestion.mainText;
    const selectedNumber = suggestion.houseNumber || number || '';
    const selectedNeighborhoodCity = suggestion.secondaryText || '';

    setStreet(selectedStreet);
    if (suggestion.houseNumber) {
      setNumber(suggestion.houseNumber);
    }
    setNeighborhoodCity(selectedNeighborhoodCity);
    setIsVerified(true);
    setIsOpen(false);
    setSuggestions([]);

    emitCompiledAddress(selectedStreet, selectedNumber, complement, selectedNeighborhoodCity);

    // Focus on number input for fast typing
    setTimeout(() => {
      if (numberInputRef.current && !suggestion.houseNumber) {
        numberInputRef.current.focus();
      }
    }, 100);
  };

  const handleStreetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setStreet(val);
    setIsVerified(false);
    if (!isOpen && val.trim().length >= 3) {
      setIsOpen(true);
    }
    emitCompiledAddress(val, number, complement, neighborhoodCity);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNumber(val);
    emitCompiledAddress(street, val, complement, neighborhoodCity);
  };

  const handleComplementChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setComplement(val);
    emitCompiledAddress(street, number, val, neighborhoodCity);
  };

  const handleClearAll = () => {
    setStreet('');
    setNumber('');
    setComplement('');
    setNeighborhoodCity('');
    setIsVerified(false);
    setSuggestions([]);
    setIsOpen(false);
    emitCompiledAddress('', '', '', '');
  };

  const compiledDisplay = value || (street ? `${street}${number ? ', ' + number : ''}` : '');

  return (
    <div ref={wrapperRef} className={`relative w-full space-y-2 ${className}`}>
      {/* Header Label */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
            {isSchool ? <School size={14} className="text-yellow-600 dark:text-yellow-400" /> : <MapPin size={14} className="text-amber-500" />}
            <span>{label}</span>
            {required && <span className="text-red-500">*</span>}
          </label>
          {helperBadge && (
            <span className="text-[10px] font-bold text-amber-800 dark:text-yellow-300 bg-amber-100 dark:bg-yellow-950/80 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Sparkles size={10} />
              {helperBadge}
            </span>
          )}
        </div>
      )}

      {/* Row 1: Logradouro / Rua (com Autocomplete Inteligente no Mapa) */}
      <div className="relative">
        <div className="relative flex items-center">
          <div className="absolute left-3.5 text-gray-400 pointer-events-none">
            {loading ? (
              <Loader2 className="animate-spin text-yellow-500" size={16} />
            ) : isSchool ? (
              <School size={16} className="text-yellow-500" />
            ) : (
              <Search size={16} className="text-amber-500" />
            )}
          </div>

          <input
            id={id}
            type="text"
            required={required}
            value={street}
            onChange={handleStreetChange}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true);
            }}
            placeholder={placeholder}
            className={`w-full pl-10 pr-9 py-2.5 bg-white dark:bg-gray-900 border-2 rounded-xl text-xs sm:text-sm font-semibold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none transition-all ${
              isVerified
                ? 'border-emerald-400 bg-emerald-50/20 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-300/40'
                : 'border-gray-200 dark:border-gray-700 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-300/40'
            }`}
            autoComplete="off"
          />

          {street && (
            <button
              type="button"
              onClick={handleClearAll}
              className="absolute right-2.5 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Limpar endereço"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdown Suggestions List (Busca Cartográfica no Mapa) */}
        {isOpen && (
          <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-3.5 py-2 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/40 dark:to-amber-950/40 border-b border-yellow-100 dark:border-gray-800 flex items-center justify-between text-[11px] font-bold text-amber-900 dark:text-yellow-300">
              <span className="flex items-center gap-1.5">
                <Search size={12} className="text-yellow-600 dark:text-yellow-400" />
                Sugestões de Endereço no Mapa
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                Digite o nome da via ou CEP
              </span>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
              {suggestions.length > 0 ? (
                suggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full text-left px-3.5 py-3 hover:bg-yellow-50/80 dark:hover:bg-gray-800/80 transition-colors flex items-start gap-3 group cursor-pointer"
                  >
                    <div className="mt-0.5 p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 group-hover:bg-yellow-400 group-hover:text-gray-950 transition-colors shrink-0">
                      {item.type === 'school' ? (
                        <School size={16} />
                      ) : item.type === 'place' ? (
                        <Building2 size={16} />
                      ) : (
                        <Home size={16} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate group-hover:text-yellow-700 dark:group-hover:text-yellow-400">
                        {item.mainText}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                        {item.secondaryText}
                      </p>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 self-center">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    </div>
                  </button>
                ))
              ) : loading ? (
                <div className="py-6 px-4 text-center">
                  <Loader2 className="animate-spin text-yellow-500 mx-auto mb-2" size={20} />
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    Buscando endereços no mapa...
                  </p>
                </div>
              ) : (
                <div className="py-4 px-4 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    Nenhum endereço exato encontrado na lista. Você pode continuar digitando normalmente e colocar o número abaixo.
                  </p>
                </div>
              )}
            </div>

            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-950/60 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-between">
              <span>💡 Dica: Você também pode digitar o CEP com 8 dígitos</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gray-600 dark:text-gray-300 font-bold hover:underline"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Row 2: Campos Separados de Número e Complemento com compilação automática */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Número */}
        <div className="sm:col-span-1">
          <div className="relative flex items-center">
            <div className="absolute left-3 text-gray-400 pointer-events-none">
              <Hash size={14} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <input
              ref={numberInputRef}
              type="text"
              required={required}
              value={number}
              onChange={handleNumberChange}
              placeholder="Número * (ex: 120 ou S/N)"
              className="w-full pl-8 pr-3 py-2 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-300/40 rounded-xl text-xs sm:text-sm font-semibold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Complemento */}
        <div className="sm:col-span-2">
          <div className="relative flex items-center">
            <div className="absolute left-3 text-gray-400 pointer-events-none">
              <Layers size={14} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={complement}
              onChange={handleComplementChange}
              placeholder="Complemento (Apto, Bloco, Casa 2...)"
              className="w-full pl-8 pr-3 py-2 bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-300/40 rounded-xl text-xs sm:text-sm font-semibold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Visual Indicator of Compiled Address */}
      {compiledDisplay && (
        <div className="px-2.5 py-1 bg-gray-50 dark:bg-gray-900/90 border border-gray-200/80 dark:border-gray-800 rounded-lg flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-300">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin size={12} className="text-amber-500 shrink-0" />
            <span className="font-bold text-gray-700 dark:text-gray-300 shrink-0">Compilado:</span>
            <span className="truncate font-medium text-gray-900 dark:text-gray-100">{compiledDisplay}</span>
          </div>
          {number ? (
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded shrink-0">
              Nº {number} OK
            </span>
          ) : (
            <span className="text-[10px] font-bold text-amber-700 dark:text-yellow-400 bg-amber-100 dark:bg-yellow-950/60 px-1.5 py-0.5 rounded shrink-0">
              Falta o Nº
            </span>
          )}
        </div>
      )}
    </div>
  );
}
