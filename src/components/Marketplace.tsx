import React, { useState, useMemo, useRef } from 'react';
import { SchoolVanLogo } from './SchoolVanLogo';
import { 
  Search, 
  MapPin, 
  Bus, 
  Star, 
  CheckCircle2, 
  ShieldCheck, 
  Smartphone, 
  Zap, 
  ArrowRight, 
  Wallet, 
  Users, 
  Award, 
  Clock, 
  Sparkles, 
  Calculator, 
  ChevronDown, 
  ChevronUp, 
  MessageSquare, 
  TrendingUp, 
  Check, 
  Share2, 
  Bell, 
  PlayCircle,
  Shield,
  PhoneCall,
  Heart,
  UserCheck
} from 'lucide-react';
import { useCollectionGroup } from '../hooks/useFirestore';
import { Vehicle } from '../types';
import { cn } from '../lib/utils';
import { RequestVacancyModal } from './RequestVacancyModal';

export function Marketplace({ onOpenAuth }: { onOpenAuth?: () => void }) {
  const { data: vehicles } = useCollectionGroup<Vehicle>('vehicles');
  const [audienceMode, setAudienceMode] = useState<'driver' | 'parent'>('driver');
  const [activeTab, setActiveTab] = useState<'landing' | 'search' | 'calc'>('landing');
  const [cityFilter, setCityFilter] = useState('');
  const [neighborhoodFilter, setNeighborhoodFilter] = useState('');
  const [studentCountCalc, setStudentCountCalc] = useState<number>(35);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeDemoTab, setActiveDemoTab] = useState<'driver' | 'parent' | 'finance' | 'routes'>('driver');
  const [selectedVehicleForLead, setSelectedVehicleForLead] = useState<Vehicle | null>(null);

  const searchSectionRef = useRef<HTMLDivElement>(null);

  const handleGoToSearch = () => {
    setAudienceMode('parent');
    setActiveTab('search');
    setTimeout(() => {
      searchSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

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
      if ((v as any).hiddenInMarketplace === true) return false;
      const matchesCity = !cityFilter || v.city?.toLowerCase().includes(cityFilter.toLowerCase());
      const matchesNeighborhood = !neighborhoodFilter || v.neighborhood?.toLowerCase().includes(neighborhoodFilter.toLowerCase());
      return matchesCity && matchesNeighborhood;
    });
  }, [vehicles, cityFilter, neighborhoodFilter]);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  // Calculator estimations
  const monthlyRevenue = studentCountCalc * 220; // Average R$ 220 per student
  const estimatedTimeSavedHours = Math.round(studentCountCalc * 0.8);
  const estimatedDelinquencyReduced = Math.round(monthlyRevenue * 0.15); // 15% reduction in late payments

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 md:py-12 space-y-16">
      
      {/* 🚀 AUDIENCE SELECTOR HEADER BANNER */}
      <div className="flex justify-center mb-6">
        <div className="bg-gray-900 p-1.5 rounded-full border border-gray-800 shadow-xl flex items-center gap-1">
          <button
            onClick={() => setAudienceMode('driver')}
            className={cn(
              "px-5 py-2.5 rounded-full text-xs font-black transition-all cursor-pointer flex items-center gap-2",
              audienceMode === 'driver' 
                ? "bg-yellow-400 text-gray-950 shadow-md scale-105" 
                : "text-gray-400 hover:text-white"
            )}
          >
            <SchoolVanLogo size={18} />
            <span>SOU MOTORISTA / TIO DA VAN</span>
          </button>

          <button
            onClick={() => setAudienceMode('parent')}
            className={cn(
              "px-5 py-2.5 rounded-full text-xs font-black transition-all cursor-pointer flex items-center gap-2",
              audienceMode === 'parent' 
                ? "bg-yellow-400 text-gray-950 shadow-md scale-105" 
                : "text-gray-400 hover:text-white"
            )}
          >
            <Users size={16} />
            <span>SOU PAI / MÃE (PROCURO VAN)</span>
          </button>
        </div>
      </div>

      {/* 🚀 SALES HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-black text-white rounded-[40px] md:rounded-[56px] p-6 md:p-14 border border-yellow-400/20 shadow-2xl">
        {/* Subtle Background Glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Hero Copy - DRIVER MODE */}
          {audienceMode === 'driver' && (
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-black uppercase tracking-wider">
                <Zap size={15} className="fill-current text-yellow-400" />
                <span>Aplicativo do Tio da Van • 100% Grátis para Começar</span>
              </div>

              <h1 className="text-3xl md:text-5xl lg:text-5xl font-black leading-tight tracking-tight">
                Cobre no <span className="text-yellow-400 underline decoration-yellow-400/40 decoration-4">Zap com Pix</span>, faça chamada em 1 toque e lote sua Van.
              </h1>

              <p className="text-gray-300 text-sm md:text-base leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Larga o caderno de papel! O SchoolVan organiza seus passageiros, envia avisos de mensalidade no WhatsApp dos pais com sua chave Pix e ajusta sua rota no GPS quando alguém avisa que vai faltar.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <button
                  onClick={onOpenAuth}
                  className="w-full sm:w-auto px-7 py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-sm shadow-xl hover:shadow-yellow-400/20 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Bus size={18} />
                  <span>CRIAR MINHA CONTA GRÁTIS</span>
                  <ArrowRight size={18} />
                </button>

                <button
                  onClick={handleGoToSearch}
                  className="w-full sm:w-auto px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-sm transition-all border border-white/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Search size={18} className="text-yellow-400" />
                  <span>BUSCAR VANS CADASTRADAS</span>
                </button>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-6 border-t border-white/10 text-xs font-bold text-gray-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-yellow-400 shrink-0" />
                  <span>Grátis até 25 alunos</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-yellow-400 shrink-0" />
                  <span>Sem baixar app nas lojas</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-yellow-400 shrink-0" />
                  <span>Notificação no Zap dos Pais</span>
                </div>
              </div>
            </div>
          )}

          {/* Hero Copy - PARENT MODE */}
          {audienceMode === 'parent' && (
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-xs font-black uppercase tracking-wider">
                <ShieldCheck size={15} className="text-blue-400" />
                <span>Portal dos Pais • Transporte Escolar de Confiança</span>
              </div>

              <h1 className="text-3xl md:text-5xl lg:text-5xl font-black leading-tight tracking-tight">
                Encontre uma <span className="text-yellow-400 underline decoration-yellow-400/40 decoration-4">Van Escolar Segura</span> perto da escola do seu filho.
              </h1>

              <p className="text-gray-300 text-sm md:text-base leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Pesquise por cidade e bairro, veja vans credenciadas com vagas abertas e acompanhe o embarque do seu filho direto no celular, com avisos em tempo real.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <button
                  onClick={handleGoToSearch}
                  className="w-full sm:w-auto px-7 py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-sm shadow-xl hover:shadow-yellow-400/20 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Search size={18} />
                  <span>PROCURAR VANS NA MINHA CIDADE</span>
                  <ArrowRight size={18} />
                </button>

                <button
                  onClick={onOpenAuth}
                  className="w-full sm:w-auto px-6 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-sm transition-all border border-white/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Users size={18} className="text-yellow-400" />
                  <span>SOU MOTORISTA DE VAN</span>
                </button>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-6 border-t border-white/10 text-xs font-bold text-gray-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-yellow-400 shrink-0" />
                  <span>Vans Credenciadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-yellow-400 shrink-0" />
                  <span>Status em Tempo Real</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-yellow-400 shrink-0" />
                  <span>Aviso de Falta em 1 Toque</span>
                </div>
              </div>
            </div>
          )}

          {/* Hero Interactive Card / Phone Mockup Badge */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm bg-gradient-to-b from-gray-900 to-gray-950 p-6 rounded-[36px] border border-white/15 shadow-2xl space-y-6 relative group">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-400 text-gray-900 rounded-xl flex items-center justify-center font-black">
                    <SchoolVanLogo size={26} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">Van do Tio Carlos</h4>
                    <p className="text-xs text-yellow-400 font-medium">Rota Escolar - Manhã</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-green-500/20 text-green-400 text-[10px] font-bold rounded-full border border-green-500/30">
                  Em Trânsito
                </span>
              </div>

              {/* Sample Live Student Boarding Mock */}
              <div className="space-y-3 bg-black/40 p-4 rounded-2xl border border-white/5">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider flex justify-between">
                  <span>Passageiro</span>
                  <span>Status na Van</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-2.5 rounded-xl text-xs">
                  <span className="font-bold text-white">Guilherme (7 anos)</span>
                  <span className="bg-yellow-400 text-gray-900 font-black px-2 py-0.5 rounded-md text-[10px]">NA VAN</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-2.5 rounded-xl text-xs">
                  <span className="font-bold text-white">Mariana (9 anos)</span>
                  <span className="bg-blue-500 text-white font-bold px-2 py-0.5 rounded-md text-[10px]">NA ESCOLA</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-2.5 rounded-xl text-xs opacity-60">
                  <span className="font-bold text-white">Lucas (8 anos)</span>
                  <span className="bg-gray-700 text-gray-300 font-bold px-2 py-0.5 rounded-md text-[10px]">FALTOU HOJE</span>
                </div>
              </div>

              <div className="bg-yellow-400/10 border border-yellow-400/30 p-3 rounded-2xl flex items-center gap-3 text-xs text-yellow-300">
                <Bell size={18} className="shrink-0" />
                <span>Notificação enviada ao WhatsApp dos Pais automaticamente!</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 📊 PLATFORM NAVIGATION SELECTOR */}
      <div className="flex justify-center gap-2 md:gap-4 flex-wrap">
        <button
          onClick={() => setActiveTab('landing')}
          className={cn(
            "px-6 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 cursor-pointer",
            activeTab === 'landing' 
              ? "bg-gray-900 text-yellow-400 shadow-xl" 
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          <Zap size={18} /> Recursos & Demonstração
        </button>

        <button
          onClick={() => setActiveTab('calc')}
          className={cn(
            "px-6 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 cursor-pointer",
            activeTab === 'calc' 
              ? "bg-gray-900 text-yellow-400 shadow-xl" 
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          <Calculator size={18} /> Calculadora de Economia
        </button>

        <button
          onClick={handleGoToSearch}
          className={cn(
            "px-6 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 cursor-pointer",
            activeTab === 'search' 
              ? "bg-gray-900 text-yellow-400 shadow-xl" 
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          <Search size={18} /> Encontrar Vans na Minha Região
        </button>
      </div>

      {/* 🌟 MAIN LANDING CONTENT */}
      {activeTab === 'landing' && (
        <div className="space-y-20">

          {/* SECTION: INTERACTIVE APP PREVIEW DEMO */}
          <section className="bg-white rounded-[40px] p-6 md:p-12 border border-gray-100 shadow-xl space-y-8">
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <span className="bg-yellow-100 text-yellow-900 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                Interface Moderna & Fluida
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">
                Veja o SchoolVan em Ação
              </h2>
              <p className="text-gray-500 text-sm">
                Desenvolvido pensando na rotina corrida do motorista: botões grandes, chamadas de 1 toque e acesso rápido para os pais.
              </p>
            </div>

            {/* Demo Tabs */}
            <div className="flex justify-center gap-2 border-b border-gray-100 pb-4 overflow-x-auto">
              <button
                onClick={() => setActiveDemoTab('driver')}
                className={cn(
                  "px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all cursor-pointer whitespace-nowrap",
                  activeDemoTab === 'driver' ? "bg-yellow-400 text-gray-900 shadow" : "text-gray-500 hover:bg-gray-50"
                )}
              >
                🚌 Painel do Motorista
              </button>
              <button
                onClick={() => setActiveDemoTab('parent')}
                className={cn(
                  "px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all cursor-pointer whitespace-nowrap",
                  activeDemoTab === 'parent' ? "bg-yellow-400 text-gray-900 shadow" : "text-gray-500 hover:bg-gray-50"
                )}
              >
                👨‍👩‍👧 Portal do Responsável
              </button>
              <button
                onClick={() => setActiveDemoTab('finance')}
                className={cn(
                  "px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all cursor-pointer whitespace-nowrap",
                  activeDemoTab === 'finance' ? "bg-yellow-400 text-gray-900 shadow" : "text-gray-500 hover:bg-gray-50"
                )}
              >
                💰 Gestão Pix & Financeiro
              </button>
              <button
                onClick={() => setActiveDemoTab('routes')}
                className={cn(
                  "px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all cursor-pointer whitespace-nowrap",
                  activeDemoTab === 'routes' ? "bg-yellow-400 text-gray-900 shadow" : "text-gray-500 hover:bg-gray-50"
                )}
              >
                🗺️ Otimização de Rotas
              </button>
            </div>

            {/* Demo Screen Preview */}
            <div className="bg-gray-900 text-white rounded-3xl p-6 md:p-8 border border-gray-800 shadow-2xl">
              {activeDemoTab === 'driver' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="space-y-4 md:col-span-1">
                    <span className="text-yellow-400 font-bold text-xs uppercase tracking-wider">Chamada em 1 Toque</span>
                    <h3 className="text-2xl font-black">Embarque Rápido na Van</h3>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Marque o embarque do aluno com apenas um toque. O sistema altera o status em tempo real e já envia a notificação para a mãe ou pai.
                    </p>
                    <ul className="space-y-2 text-xs text-gray-300">
                      <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-yellow-400" /> Confirmação sonora instantânea</li>
                      <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-yellow-400" /> Registro do horário exato de embarque</li>
                    </ul>
                  </div>
                  <div className="md:col-span-2 bg-gray-950 p-6 rounded-2xl border border-white/10 space-y-4">
                    <div className="flex justify-between items-center text-xs font-bold text-gray-400 border-b border-white/10 pb-2">
                      <span>Aluno</span>
                      <span>Horário</span>
                      <span>Ação de Chamada</span>
                    </div>
                    <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl text-xs">
                      <div>
                        <div className="font-black text-white">Pedro Henrique</div>
                        <div className="text-[10px] text-gray-400">Colegio Santo Agostinho</div>
                      </div>
                      <span className="font-mono text-gray-300">07:15</span>
                      <button className="px-3 py-1.5 bg-yellow-400 text-gray-900 font-black rounded-lg cursor-pointer hover:bg-yellow-300">
                        MARCAR NA VAN
                      </button>
                    </div>
                    <div className="flex items-center justify-between bg-white/5 p-3 rounded-xl text-xs">
                      <div>
                        <div className="font-black text-white">Beatriz Lima</div>
                        <div className="text-[10px] text-gray-400">Escola Dom Bosco</div>
                      </div>
                      <span className="font-mono text-gray-300">07:22</span>
                      <span className="px-3 py-1 bg-green-500/20 text-green-400 font-bold rounded-lg border border-green-500/30">
                        NA ESCOLA
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeDemoTab === 'parent' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="space-y-4 md:col-span-1">
                    <span className="text-yellow-400 font-bold text-xs uppercase tracking-wider">Tranquilidade para os Pais</span>
                    <h3 className="text-2xl font-black">Acompanhamento sem Instalar Lojas</h3>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Os pais acessam pelo PWA no celular, sabem onde o filho está e podem avisar ausência com 1 clique antes do motorista sair de casa!
                    </p>
                  </div>
                  <div className="md:col-span-2 bg-gradient-to-br from-yellow-500 to-amber-600 text-gray-950 p-6 rounded-2xl shadow-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-sm uppercase tracking-wider">Status do Aluno</span>
                      <span className="bg-gray-950 text-yellow-400 font-bold text-[10px] px-2.5 py-1 rounded-full">
                        A CAMINHO
                      </span>
                    </div>
                    <div className="text-center py-4 space-y-2">
                      <Bus size={40} className="mx-auto text-gray-950" />
                      <h4 className="text-3xl font-black uppercase">NA VAN ESCOLAR</h4>
                      <p className="text-xs font-bold opacity-80">Seu filho foi embarcado às 07:15 e está a caminho da escola.</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 py-2.5 bg-gray-950 text-white font-bold text-xs rounded-xl hover:bg-gray-900 cursor-pointer">
                        Avisar "Não vai hoje"
                      </button>
                      <button className="flex-1 py-2.5 bg-green-700 text-white font-bold text-xs rounded-xl hover:bg-green-800 cursor-pointer">
                        Falar no WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeDemoTab === 'finance' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="space-y-4 md:col-span-1">
                    <span className="text-yellow-400 font-bold text-xs uppercase tracking-wider">Fim da Inadimplência</span>
                    <h3 className="text-2xl font-black">Cobrança e Lembrete Pix</h3>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      Envie mensagens formatadas no WhatsApp com sua chave Pix e valor pré-preenchido. Baixa automática e controle de inadimplentes.
                    </p>
                  </div>
                  <div className="md:col-span-2 bg-gray-950 p-6 rounded-2xl border border-white/10 space-y-3">
                    <div className="flex justify-between items-center p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs">
                      <div>
                        <span className="font-bold text-white">Carla M. (Mãe do Matheus)</span>
                        <div className="text-[10px] text-red-400">Mensalidade Vencida (R$ 220,00)</div>
                      </div>
                      <button className="px-3 py-1.5 bg-green-500 text-white font-bold rounded-lg cursor-pointer hover:bg-green-600 flex items-center gap-1">
                        <MessageSquare size={14} /> Lembrar Pix
                      </button>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-xs">
                      <div>
                        <span className="font-bold text-white">Roberto F. (Pai da Julia)</span>
                        <div className="text-[10px] text-green-400">Pago via Pix - Em Dia</div>
                      </div>
                      <span className="px-2.5 py-1 bg-green-500/20 text-green-400 font-bold rounded-lg">
                        EM DIA
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {activeDemoTab === 'routes' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  <div className="space-y-4 md:col-span-1">
                    <span className="text-yellow-400 font-bold text-xs uppercase tracking-wider">Economia de Combustível</span>
                    <h3 className="text-2xl font-black">Rotas Inteligentes no GPS</h3>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      O sistema reordena os alunos ativos e remove ausentes, gerando o link direto com todos os pontos para o Google Maps ou Waze.
                    </p>
                  </div>
                  <div className="md:col-span-2 bg-gray-950 p-6 rounded-2xl border border-white/10 text-center space-y-4">
                    <MapPin size={40} className="mx-auto text-yellow-400 animate-bounce" />
                    <h4 className="text-lg font-bold text-white">Rota Otimizada com 12 Paradas</h4>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                      Alunos marcados como "Não vai hoje" foram removidos automaticamente da rota para poupar seu tempo!
                    </p>
                    <button className="px-6 py-3 bg-yellow-400 text-gray-900 font-black text-xs rounded-xl cursor-pointer hover:bg-yellow-300 shadow-lg">
                      ABRIR NO GOOGLE MAPS GPS
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* SECTION: KEY FEATURES GRID */}
          <section className="space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <h2 className="text-3xl font-black text-gray-900">Por que o SchoolVan é o Preferido dos Motoristas?</h2>
              <p className="text-gray-500 text-sm">Projetado com o feedback de dezenas de tios e tias de vans escolares em todo o Brasil.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all space-y-4">
                <div className="w-12 h-12 bg-yellow-100 text-yellow-900 rounded-2xl flex items-center justify-center font-bold">
                  <Smartphone size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">App PWA Nativo</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Não ocupa memória do celular e funciona direto no navegador no Android ou iPhone. Basta clicar em "Adicionar à Tela Inicial".
                </p>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all space-y-4">
                <div className="w-12 h-12 bg-green-100 text-green-800 rounded-2xl flex items-center justify-center font-bold">
                  <Wallet size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Pix & WhatsApp Integrados</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Envie lembretes de cobrança com 1 clique diretamente pelo WhatsApp dos pais. Menos constrangimento e mais pontualidade.
                </p>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all space-y-4">
                <div className="w-12 h-12 bg-blue-100 text-blue-800 rounded-2xl flex items-center justify-center font-bold">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Avisos de Ausência em Tempo Real</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Chega de ir até a casa do aluno e descobrir que ele faltou. Os pais marcam "Ausente" e sua rota ajusta na hora.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION: PRICING TIERS */}
          <section className="space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="bg-green-100 text-green-900 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                Preços Justos e Acessíveis
              </span>
              <h2 className="text-3xl font-black text-gray-900">Escolha o Plano Ideal para Sua Frota</h2>
              <p className="text-gray-500 text-sm">Comece no plano gratuito. Troque ou cancele quando quiser sem fidelidade.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
              {/* PLANO GRATUITO */}
              <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-6 hover:border-yellow-400 transition-all">
                <div className="space-y-4">
                  <span className="text-xs font-black uppercase tracking-wider text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                    Entrada
                  </span>
                  <h3 className="text-2xl font-black text-gray-900">Plano Gratuito</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-gray-900">R$ 0</span>
                    <span className="text-xs text-gray-400 font-bold">/para sempre</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Perfeito para quem tem até 1 van e quer testar a organização digital sem custo.
                  </p>

                  <ul className="space-y-3 pt-4 text-xs font-bold text-gray-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                      <span><strong>Até 25 Alunos Ativos</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                      <span>Controle de Embarque & Chamada</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                      <span>Portal do Responsável</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                      <span>Notificações Push no Celular</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={onOpenAuth}
                  className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-yellow-400 font-extrabold rounded-2xl text-xs transition-all cursor-pointer shadow-md"
                >
                  CRIAR CONTA GRÁTIS
                </button>
              </div>

              {/* PLANO PRO (DESTACADO) */}
              <div className="bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white p-8 rounded-3xl shadow-2xl relative flex flex-col justify-between space-y-6 border-2 border-yellow-400 transform md:-translate-y-2">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-950 text-[10px] font-black uppercase px-4 py-1 rounded-full shadow-lg flex items-center gap-1">
                  <Sparkles size={12} /> MAIS POPULAR
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
                    O tamanho ideal para cobrir até 60 alunos em 1 ou 2 vans com tranquilidade.
                  </p>

                  <ul className="space-y-3 pt-4 text-xs font-bold text-gray-200">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-yellow-400 shrink-0" />
                      <span><strong>Até 60 Alunos Ativos</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-yellow-400 shrink-0" />
                      <span>Lembretes Automáticos WhatsApp</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-yellow-400 shrink-0" />
                      <span>Cobrança Automatizada Pix</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-yellow-400 shrink-0" />
                      <span>Otimização e Traçado de Rotas</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={onOpenAuth}
                  className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-xs transition-all shadow-xl cursor-pointer"
                >
                  EXPERIMENTAR PLANO PRO
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
                    Para frotas maiores com múltiplos motoristas, monitores e relatórios completos.
                  </p>

                  <ul className="space-y-3 pt-4 text-xs font-bold text-gray-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-purple-600 shrink-0" />
                      <span><strong>Alunos e Vans Ilimitados</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-purple-600 shrink-0" />
                      <span>Acesso para Monitores de Van</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-purple-600 shrink-0" />
                      <span>Relatórios Financeiros DRE</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-purple-600 shrink-0" />
                      <span>Suporte Prioritário VIP</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={onOpenAuth}
                  className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-extrabold rounded-2xl text-xs transition-all cursor-pointer"
                >
                  CONTRATAR PLANO FROTA
                </button>
              </div>
            </div>
          </section>

          {/* SECTION: FAQ ACCORDION */}
          <section className="bg-gray-50 rounded-[40px] p-8 md:p-12 space-y-8 border border-gray-100">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-3xl font-black text-gray-900">Dúvidas Frequentes</h2>
              <p className="text-gray-500 text-sm">Respostas para as perguntas mais comuns de motoristas e pais.</p>
            </div>

            <div className="max-w-3xl mx-auto space-y-4">
              {[
                {
                  q: "Preciso baixar o aplicativo pela Google Play Store ou App Store?",
                  a: "Não! O SchoolVan é um PWA (Progressive Web App) nativo. Você instala diretamente pelo navegador no seu celular com apenas 1 clique em 'Adicionar à Tela Inicial', sem ocupar espaço de memória."
                },
                {
                  q: "O plano gratuito é grátis de verdade ou é teste por tempo limitado?",
                  a: "O Plano Gratuito é 100% grátis sem prazo de expiração para até 25 alunos ativos. Você não precisa cadastrar cartão de crédito."
                },
                {
                  q: "Como os pais sabem o horário que o filho entrou na van?",
                  a: "Quando o motorista ou monitor realiza o check-in na lista de presença, o sistema altera o status do aluno e envia uma notificação push e aviso formatado diretamente para o responsável."
                },
                {
                  q: "Como funciona a cobrança via Pix?",
                  a: "Você cadastra sua chave Pix no seu Perfil. O sistema gera mensagens personalizadas com o valor da mensalidade e a chave Pix, que podem ser enviadas em 1 clique para o WhatsApp do responsável."
                }
              ].map((item, idx) => (
                <div key={idx} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-5 text-left font-bold text-gray-900 flex justify-between items-center gap-4 cursor-pointer hover:bg-gray-50/50"
                  >
                    <span>{item.q}</span>
                    {openFaq === idx ? <ChevronUp size={20} className="text-yellow-600" /> : <ChevronDown size={20} className="text-gray-400" />}
                  </button>
                  {openFaq === idx && (
                    <div className="px-5 pb-5 text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

        </div>
      )}

      {/* 🧮 CALCULATOR TAB */}
      {activeTab === 'calc' && (
        <div className="bg-white rounded-[40px] p-8 md:p-12 border border-gray-100 shadow-xl space-y-8 max-w-3xl mx-auto">
          <div className="text-center space-y-2">
            <span className="bg-yellow-100 text-yellow-900 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
              Calculadora de Impacto
            </span>
            <h2 className="text-3xl font-black text-gray-900">Quanto você economiza com o SchoolVan?</h2>
            <p className="text-gray-500 text-sm">Ajuste o número de alunos e veja a estimativa de tempo e dinheiro preservados.</p>
          </div>

          <div className="space-y-6 bg-gray-50 p-6 rounded-3xl border border-gray-100">
            <div className="flex justify-between items-center">
              <label className="font-extrabold text-sm text-gray-900">Alunos Transportados:</label>
              <span className="text-2xl font-black text-yellow-600">{studentCountCalc} Alunos</span>
            </div>

            <input
              type="range"
              min={10}
              max={120}
              step={5}
              value={studentCountCalc}
              onChange={(e) => setStudentCountCalc(Number(e.target.value))}
              className="w-full accent-yellow-400 h-3 bg-gray-200 rounded-lg cursor-pointer"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <div className="bg-white p-4 rounded-2xl border border-gray-100 text-center space-y-1 shadow-sm">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Faturamento Estimado</span>
                <div className="text-xl font-black text-gray-900">R$ {monthlyRevenue.toLocaleString('pt-BR')}/mês</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 text-center space-y-1 shadow-sm">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Horas Salvas/Mês</span>
                <div className="text-xl font-black text-yellow-600">~{estimatedTimeSavedHours} Horas</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-100 text-center space-y-1 shadow-sm">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Inadimplência Evitada</span>
                <div className="text-xl font-black text-green-600">R$ {estimatedDelinquencyReduced.toLocaleString('pt-BR')}</div>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenAuth}
            className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-sm transition-all shadow-xl cursor-pointer flex items-center justify-center gap-2"
          >
            <span>COMEÇAR AGORA NO PLANO GRATUITO</span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}

      {/* 🔍 MARKETPLACE SEARCH TAB FOR PARENTS */}
      {activeTab === 'search' && (
        <div ref={searchSectionRef} className="space-y-8 scroll-mt-20">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="bg-blue-100 text-blue-900 text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider">
              👨‍👩‍👧 Espaço dos Pais & Mães
            </span>
            <h2 className="text-3xl font-extrabold text-gray-900">Encontre a Van Ideal para seu Filho</h2>
            <p className="text-gray-500 text-sm">Selecione sua cidade ou bairro para ver os Tios e Tias de Van credenciados com vagas abertas.</p>

            <div className="mt-6 flex flex-col md:flex-row justify-center gap-4 max-w-2xl mx-auto">
              <div className="relative flex-1">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-yellow-600" size={20} />
                <select 
                  value={cityFilter}
                  onChange={(e) => setCityFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none text-sm font-bold cursor-pointer"
                >
                  <option value="">🏙️ Todas as Cidades</option>
                  {cities.map(city => (
                    <option key={city} value={city}>📍 {city}</option>
                  ))}
                </select>
              </div>

              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-yellow-600" size={20} />
                <select 
                  value={neighborhoodFilter}
                  onChange={(e) => setNeighborhoodFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none text-sm font-bold cursor-pointer"
                >
                  <option value="">🏫 Todos os Bairros / Escolas</option>
                  {neighborhoods.map(n => (
                    <option key={n} value={n}>🏡 {n}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredVehicles.map((vehicle) => (
              <div 
                key={vehicle.id}
                className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col justify-between"
              >
                <div>
                  <div className="h-44 bg-gradient-to-br from-yellow-100 via-amber-50 to-yellow-50 flex items-center justify-center relative overflow-hidden">
                    <div className="group-hover:scale-110 transition-transform duration-500 filter drop-shadow-md">
                      <SchoolVanLogo size={88} />
                    </div>
                    <div className="absolute top-4 right-4 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                      <Star size={12} fill="currentColor" /> Vagas Abertas
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-black text-gray-900">{vehicle.uncleName || 'Tio da Van'}</h3>
                        <p className="text-xs text-yellow-700 font-bold mt-0.5">{vehicle.name || 'Van Escolar'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-400 font-bold block">A partir de</span>
                        <span className="text-lg font-black text-emerald-600">R$ {vehicle.value || '150'}/mês</span>
                      </div>
                    </div>

                    <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">
                      {vehicle.about || 'Transporte escolar credenciado, pontual, com acompanhamento dos alunos em tempo real para os pais.'}
                    </p>

                    <div className="space-y-2 pt-2 border-t border-gray-100 text-xs font-bold text-gray-700">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-yellow-500 shrink-0" />
                        <span>{vehicle.city || 'Cidade'} • {vehicle.neighborhood || 'Bairros atendidos'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                        <span>Notificação de Embarque no WhatsApp dos Pais</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <button 
                    onClick={() => setSelectedVehicleForLead(vehicle)}
                    className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                  >
                    <MessageSquare size={16} />
                    <span>PEDIR VAGA / ORÇAMENTO NO ZAP</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredVehicles.length === 0 && (
            <div className="text-center py-16 bg-white rounded-3xl border border-gray-100 space-y-3">
              <div className="bg-yellow-100 text-yellow-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <Search className="text-yellow-600" size={28} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Nenhuma van encontrada nessa busca</h3>
              <p className="text-gray-500 text-xs max-w-md mx-auto">Tente selecionar "Todas as Cidades" ou entre em contato para solicitar indicação de motorista na sua região.</p>
            </div>
          )}
        </div>
      )}

      {/* REQUEST VACANCY MODAL FOR PARENTS (NO REGISTRATION NEEDED) */}
      <RequestVacancyModal 
        isOpen={!!selectedVehicleForLead}
        onClose={() => setSelectedVehicleForLead(null)}
        vehicle={selectedVehicleForLead}
      />

      {/* FOOTER */}
      <footer className="pt-10 border-t border-gray-200 text-center text-gray-400 text-xs space-y-2">
        <p>&copy; 2026 SchoolVan (schoolvan.com.br). Todos os direitos reservados.</p>
        <p className="font-mono text-[11px]">Plataforma PWA Nativa • Notificações Push • Gestão Inteligente de Frota</p>
      </footer>

    </div>
  );
}
