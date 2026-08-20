import React, { useState, useEffect, useRef } from 'react';
import { School as SchoolIcon, Search, Loader2, CheckCircle2, Sparkles, MapPin, Building2, X, Users, BookOpen } from 'lucide-react';
import { School } from '../types';
import { searchGlobalSchools, initSchoolsListener, BASELINE_BRAZILIAN_SCHOOLS } from '../services/schoolsService';

interface SchoolAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectSchool?: (school: School) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
  helperBadge?: string;
  id?: string;
  schoolAddress?: string;
}

export function SchoolAutocompleteInput({
  value,
  onChange,
  onSelectSchool,
  placeholder = 'Ex: Colégio Objetivo, Escola Santos...',
  label = 'Nome da Escola',
  required = false,
  className = '',
  helperBadge = 'Banco de Escolas',
  id,
  schoolAddress,
}: SchoolAutocompleteInputProps) {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [suggestions, setSuggestions] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isInternalChangeRef = useRef(false);

  // Sync external value
  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }
    setSearchTerm(value || '');
  }, [value]);

  // Init global schools catalog listener on mount
  useEffect(() => {
    const unsub = initSchoolsListener();
    return () => {
      if (unsub) unsub();
    };
  }, []);

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

  // Debounced search
  useEffect(() => {
    const trimmed = searchTerm.trim();

    if (trimmed.length === 0) {
      // Empty input: provide popular schools as quick recommendations
      searchGlobalSchools('', { limitResults: 6 }).then((results) => {
        setSuggestions(results);
      });
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchGlobalSchools(trimmed, {
          limitResults: 8,
          signal: abortControllerRef.current?.signal,
        });
        setSuggestions(results);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error searching schools:', err);
        }
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    setSelectedSchool(null);
    isInternalChangeRef.current = true;
    onChange(val);
    if (!isOpen) setIsOpen(true);
  };

  const handleSelect = (school: School) => {
    setSearchTerm(school.name);
    setSelectedSchool(school);
    isInternalChangeRef.current = true;
    onChange(school.name);

    if (onSelectSchool) {
      onSelectSchool(school);
    }

    setIsOpen(false);
  };

  const handleClear = () => {
    setSearchTerm('');
    setSelectedSchool(null);
    isInternalChangeRef.current = true;
    onChange('');
    setSuggestions([]);
  };

  return (
    <div ref={wrapperRef} className={`relative w-full space-y-1.5 ${className}`}>
      {/* Header Label */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
            <SchoolIcon size={15} className="text-yellow-600 dark:text-yellow-400" />
            <span>{label}</span>
            {required && <span className="text-red-500">*</span>}
          </label>

          {helperBadge && (
            <span className="text-[10px] font-bold text-amber-900 dark:text-yellow-300 bg-amber-100 dark:bg-yellow-950/80 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Sparkles size={10} className="text-yellow-600 dark:text-yellow-400" />
              {helperBadge}
            </span>
          )}
        </div>
      )}

      {/* Input Box */}
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-gray-400 pointer-events-none">
          {loading ? (
            <Loader2 className="animate-spin text-yellow-500" size={16} />
          ) : (
            <Search className="text-yellow-600 dark:text-yellow-400" size={16} />
          )}
        </div>

        <input
          id={id}
          type="text"
          required={required}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0 || searchTerm.length >= 0) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          className={`w-full pl-10 pr-9 py-2.5 bg-white dark:bg-gray-900 border-2 rounded-xl text-xs sm:text-sm font-bold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none transition-all ${
            selectedSchool || (schoolAddress && searchTerm)
              ? 'border-yellow-400 bg-yellow-50/20 dark:bg-yellow-950/20 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-300/40'
              : 'border-gray-200 dark:border-gray-700 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-300/40'
          }`}
          autoComplete="off"
        />

        {searchTerm && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Limpar nome da escola"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Auto-filled Notification Pill */}
      {selectedSchool?.address && (
        <div className="px-2.5 py-1 bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800/60 rounded-lg flex items-center justify-between text-[11px] text-yellow-900 dark:text-yellow-200 animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5 truncate">
            <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="font-bold">Endereço Auto-Preenchido:</span>
            <span className="truncate opacity-90">{selectedSchool.address}</span>
          </div>
          <span className="text-[9px] font-black uppercase tracking-wider bg-yellow-400 text-gray-950 px-1.5 py-0.2 rounded shrink-0 ml-2">
            Banco Coletivo
          </span>
        </div>
      )}

      {/* Suggestions Dropdown */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3.5 py-2 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/50 dark:to-amber-950/50 border-b border-yellow-100 dark:border-gray-800 flex items-center justify-between text-[11px] font-bold text-amber-900 dark:text-yellow-300">
            <span className="flex items-center gap-1.5">
              <BookOpen size={12} className="text-yellow-600 dark:text-yellow-400" />
              {searchTerm ? 'Escolas Encontradas no Banco' : 'Escolas Frequentes / Sugeridas'}
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
              Preenche o endereço com 1 clique
            </span>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800">
            {suggestions.length > 0 ? (
              suggestions.map((school) => (
                <button
                  key={school.id}
                  type="button"
                  onClick={() => handleSelect(school)}
                  className="w-full text-left px-3.5 py-3 hover:bg-yellow-50 dark:hover:bg-gray-800/90 transition-colors flex items-start gap-3 group cursor-pointer"
                >
                  <div className="mt-0.5 p-2 rounded-xl bg-yellow-100 dark:bg-yellow-950/60 text-yellow-800 dark:text-yellow-300 group-hover:bg-yellow-400 group-hover:text-gray-950 transition-colors shrink-0">
                    <SchoolIcon size={16} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs sm:text-sm font-black text-gray-900 dark:text-white truncate group-hover:text-yellow-700 dark:group-hover:text-yellow-400">
                        {school.name}
                      </p>
                      {school.usageCount && school.usageCount > 1 ? (
                        <span className="text-[9px] font-bold text-amber-800 dark:text-yellow-300 bg-amber-100 dark:bg-yellow-950/80 px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                          <Users size={9} />
                          {school.usageCount} vans
                        </span>
                      ) : null}
                    </div>

                    <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5 flex items-center gap-1">
                      <MapPin size={10} className="text-gray-400 shrink-0" />
                      <span>{school.address || 'Endereço a cadastrar'}</span>
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
                  Pesquisando no banco de escolas e mapa...
                </p>
              </div>
            ) : (
              <div className="py-4 px-4 text-center space-y-1">
                <p className="text-xs text-gray-700 dark:text-gray-200 font-bold">
                  Escola nova!
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Ao preencher o endereço abaixo e salvar o aluno, ela será adicionada ao banco coletivo automaticamente.
                </p>
              </div>
            )}
          </div>

          <div className="px-3 py-2 bg-gray-50 dark:bg-gray-950/60 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span>💡 Clique na escola para auto-preencher o endereço</span>
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
  );
}
