import React, { useState, useMemo } from 'react';
import { Search, MapPin, Bus, Star, CheckCircle2, ShieldCheck, Smartphone, Zap, ArrowRight, DollarSign, Users, Award } from 'lucide-react';
import { useCollectionGroup } from '../hooks/useFirestore';
import { Vehicle } from '../types';
import { cn } from '../lib/utils';

export function Marketplace({ onOpenAuth }: { onOpenAuth?: () => void }) {
  const { data: vehicles, loading } = useCollectionGroup<Vehicle>('vehicles');
  const [activeTab, setActiveTab] = useState<'saas' | 'search'>('saas');
  const [cityFilter, setCityFilter] = useState('');
  const [neighborhoodFilter, setNeighborhoodFilter] = useState('');

  const cities = useMemo(() => {
    const set = new Set<string>();
    vehicles.forEach(v => {
      if (v.city) v.city.split(',').forEach(c => set.add(c.trim()));
    });
    return Array.from(set).sort();
  }, [vehicles]);

  const neighborhoods = useMemo(() => {
    const set = new Set<string>();
    vehicles.forEach(v => {
      if (v.neighborhood) v.neighborhood.split(',').forEach(n => set.add(n.trim()));
    });
    return Array.from(set).sort();
  }, [vehicles]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchesCity = !cityFilter || v.city?.toLowerCase().includes(cityFilter.toLowerCase());
      const matchesNeighborhood = !neighborhoodFilter || v.neighborhood?.toLowerCase().includes(neighborhoodFilter.toLowerCase());
      return matchesCity && matchesNeighborhood;
    });
  }, [vehicles, cityFilter, neighborhoodFilter]);

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-16">
      {/* SaaS Hero Section */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white p-8 md:p-16 rounded-[48px] shadow-2xl relative overflow-hidden text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-12">
        <div className="max-w-2xl space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-400 text-gray-900 text-xs font-black uppercase tracking-wider">
            <Zap size={14} className="fill-current" /> Plataforma #1 para Transporte Escolar
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight">
            Gerencie suas Vans e informe os pais <span className="text-yellow-400">em tempo real.</span>
          </h1>

          <p className="text-gray-300 text-base md:text-lg leading-relaxed">
            Elimine a inadimplência com cobranças automáticas via Pix, organize suas rotas em segundos e ofereça o acompanhamento de embarque para os pais via **PWA nativo**, sem precisar da PlayStore.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <button
              onClick={onOpenAuth}
              className="px-8 py-4 bg-yellow-400 text-gray-900 font-extrabold rounded-2xl text-base shadow-xl hover:bg-yellow-300 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              CRIAR CONTA GRATUITA <ArrowRight size={20} />
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className="px-8 py-4 bg-white/10 text-white font-bold rounded-2xl text-base hover:bg-white/20 transition-all border border-white/20 flex items-center justify-center gap-2"
            >
              <Search size={20} /> BUSCAR VANS POR CIDADE
            </button>
          </div>

          <div className="flex items-center gap-6 pt-6 text-xs text-gray-400 font-bold border-t border-white/10">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-yellow-400" /> Até 25 Alunos Grátis
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-yellow-400" /> PWA Direto no Celular
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-yellow-400" /> Cobrança via Pix
            </div>
          </div>
        </div>

        {/* Decorative App Mockup Badge */}
        <div className="relative z-10 w-full md:w-80 bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 text-center space-y-4 shrink-0 shadow-2xl">
          <div className="w-16 h-16 bg-yellow-400 text-gray-900 rounded-2xl flex items-center justify-center mx-auto font-black shadow-lg">
            <Bus size={36} />
          </div>
          <div className="font-extrabold text-xl">SchoolVan PWA</div>
          <p className="text-xs text-gray-300">
            Instalação instantânea no Android e iPhone. Sem burocracia de loja.
          </p>
          <div className="bg-yellow-400/20 text-yellow-300 text-xs font-bold py-2 rounded-xl border border-yellow-400/30">
            100% Responsivo & Notificações Push
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => setActiveTab('saas')}
          className={cn(
            "px-6 py-3 rounded-2xl font-bold text-sm transition-all flex items-center gap-2",
            activeTab === 'saas' 
              ? "bg-gray-900 text-yellow-400 shadow-xl" 
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          <Zap size={18} /> Planos & Recursos do SaaS
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={cn(
            "px-6 py-3 rounded-2xl font-bold text-sm transition-all flex items-center gap-2",
            activeTab === 'search' 
              ? "bg-gray-900 text-yellow-400 shadow-xl" 
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          <Search size={18} /> Encontrar Vans (Marketplace)
        </button>
      </div>

      {/* SECTION 1: SAAS PRICING TIERS */}
      {activeTab === 'saas' && (
        <div className="space-y-12">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-black text-gray-900">Planos Feitos para Todos os Portes</h2>
            <p className="text-gray-500 mt-2 text-sm">
              Comece no Gratuito e escale sua frota com tranquilidade. Cancele ou altere a qualquer momento.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* PLANO GRATUITO */}
            <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-6 hover:border-yellow-400 transition-all">
              <div className="space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
                  Entrada
                </span>
                <h3 className="text-2xl font-black text-gray-900">Gratuito</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-gray-900">R$ 0</span>
                  <span className="text-xs text-gray-400 font-bold">/mês</span>
                </div>
                <p className="text-xs text-gray-500">
                  Ideal para motoristas no início ou quem tem poucas vans e quer experimentar.
                </p>

                <ul className="space-y-3 pt-4 text-xs font-bold text-gray-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-green-500 shrink-0" /> **Até 25 Alunos ativos**
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-green-500 shrink-0" /> Chamada e Controle de Embarque
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-green-500 shrink-0" /> Portal para os Pais
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-green-500 shrink-0" /> 1 Van Cadastrada
                  </li>
                </ul>
              </div>

              <button
                onClick={onOpenAuth}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold rounded-2xl text-xs transition-colors"
              >
                CRIAR CONTA GRÁTIS
              </button>
            </div>

            {/* PLANO PRO (RECOMENDADO) */}
            <div className="bg-gradient-to-b from-gray-900 to-black text-white p-8 rounded-3xl shadow-2xl relative flex flex-col justify-between space-y-6 border-2 border-yellow-400">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-900 text-[10px] font-black uppercase px-4 py-1 rounded-full shadow">
                Mais Popular
              </div>

              <div className="space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full">
                  Profissional
                </span>
                <h3 className="text-2xl font-black text-white">Plano Pro</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-yellow-400">R$ 79</span>
                  <span className="text-xs text-gray-400 font-bold">/mês</span>
                </div>
                <p className="text-xs text-gray-300">
                  O motorista padrão roda de 30 a 50 alunos. O plano Pro atende com perfeição!
                </p>

                <ul className="space-y-3 pt-4 text-xs font-bold text-gray-200">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-yellow-400 shrink-0" /> **Até 60 Alunos ativos**
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-yellow-400 shrink-0" /> Notificações Web Push PWA aos Pais
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-yellow-400 shrink-0" /> Lembretes Automáticos no WhatsApp
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-yellow-400 shrink-0" /> Otimização de Rotas no Mapa
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-yellow-400 shrink-0" /> Cobrança Automatizada Pix
                  </li>
                </ul>
              </div>

              <button
                onClick={onOpenAuth}
                className="w-full py-4 bg-yellow-400 text-gray-900 font-extrabold rounded-2xl text-xs hover:bg-yellow-300 transition-all shadow-xl active:scale-95"
              >
                ASSINAR PLANO PRO
              </button>
            </div>

            {/* PLANO FROTA */}
            <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-6 hover:border-yellow-400 transition-all">
              <div className="space-y-4">
                <span className="text-xs font-black uppercase tracking-wider text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                  Empresarial
                </span>
                <h3 className="text-2xl font-black text-gray-900">Plano Frota</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-gray-900">R$ 149</span>
                  <span className="text-xs text-gray-400 font-bold">/mês</span>
                </div>
                <p className="text-xs text-gray-500">
                  Para empresas com múltiplas vans, monitores e equipe compartilhada.
                </p>

                <ul className="space-y-3 pt-4 text-xs font-bold text-gray-700">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-purple-600 shrink-0" /> **Alunos Ilimitados**
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-purple-600 shrink-0" /> Vans e Rotas Ilimitadas
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-purple-600 shrink-0" /> Multi-usuários e Monitores
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-purple-600 shrink-0" /> Relatório Financeiro DRE Completo
                  </li>
                </ul>
              </div>

              <button
                onClick={onOpenAuth}
                className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-2xl text-xs transition-colors"
              >
                CONTRATAR PLANO FROTA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: MARKETPLACE SEARCH */}
      {activeTab === 'search' && (
        <div className="space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-extrabold text-gray-900">Buscar Vans Escolares Por Cidade</h2>
            <p className="text-gray-500 text-sm mt-1">Encontre motoristas credenciados na sua região com vagas disponíveis.</p>

            <div className="mt-6 flex flex-col md:flex-row justify-center gap-4 max-w-2xl mx-auto">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <select 
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-yellow-400 outline-none"
                >
                  <option value="">Todas as Cidades</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <select 
                  value={neighborhoodFilter}
                  onChange={(e) => setNeighborhoodFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-yellow-400 outline-none"
                >
                  <option value="">Todos os Bairros</option>
                  {neighborhoods.map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredVehicles.map((vehicle) => (
              <div 
                key={vehicle.id}
                className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100"
              >
                <div className="h-48 bg-yellow-50 flex items-center justify-center relative overflow-hidden">
                  <Bus className="text-yellow-400 group-hover:scale-110 transition-transform duration-500" size={80} />
                  <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                    <Star size={12} fill="currentColor" /> Vagas Disponíveis
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{vehicle.uncleName || 'Tio da Van'}</h3>
                    <span className="text-yellow-600 font-bold">R$ {vehicle.value || '150'}</span>
                  </div>
                  <p className="text-gray-500 text-sm mb-4 line-clamp-2">{vehicle.about || 'Transporte escolar seguro, pontual e informatizado.'}</p>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin size={16} className="text-yellow-500" />
                      <span>{vehicle.city || 'Cidade'} • {vehicle.neighborhood || 'Bairro'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Bus size={16} className="text-yellow-500" />
                      <span>{vehicle.name} • {vehicle.capacity} Lugares</span>
                    </div>
                  </div>

                  <button 
                    onClick={onOpenAuth}
                    className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold rounded-2xl transition-colors shadow-md active:scale-95"
                  >
                    SOLICITAR VAGA
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredVehicles.length === 0 && (
            <div className="text-center py-20">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-gray-400" size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Nenhuma van encontrada</h3>
              <p className="text-gray-500 text-sm">Tente selecionar outra cidade ou bairro.</p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="pt-10 border-t border-gray-100 text-center text-gray-400 text-xs space-y-2">
        <p>&copy; 2026 SchoolVan (schoolvan.com.br). Plataforma inteligente de transporte escolar.</p>
        <p className="font-mono">Desenvolvido com tecnologia PWA, Firebase e React.</p>
      </footer>
    </div>
  );
}
