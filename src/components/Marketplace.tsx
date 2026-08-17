import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  UserCheck,
  Bot,
  Volume2,
  Building2,
  FileText,
  Lock,
  Mail,
  Headphones,
  ExternalLink,
  HelpCircle,
  Globe,
  CheckCircle,
  AlertCircle,
  X
} from 'lucide-react';
import { useCollectionGroup } from '../hooks/useFirestore';
import { Vehicle } from '../types';
import { cn } from '../lib/utils';
import { RequestVacancyModal } from './RequestVacancyModal';
import { playBusHornSound, speakTiaPrompt } from '../lib/sound';

export function Marketplace({ onOpenAuth }: { onOpenAuth?: (type?: 'driver' | 'parent') => void }) {
  const { data: vehicles } = useCollectionGroup<Vehicle>('vehicles');
  const [audienceMode, setAudienceMode] = useState<'driver' | 'parent'>('driver');
  const [activeTab, setActiveTab] = useState<'landing' | 'search' | 'calc'>('landing');
  const [cityFilter, setCityFilter] = useState('');
  const [neighborhoodFilter, setNeighborhoodFilter] = useState('');
  const [studentCountCalc, setStudentCountCalc] = useState<number>(35);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeDemoTab, setActiveDemoTab] = useState<'tia' | 'driver' | 'parent' | 'finance' | 'routes'>('tia');
  const [selectedVehicleForLead, setSelectedVehicleForLead] = useState<Vehicle | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [demoSimStep, setDemoSimStep] = useState<1 | 2 | 3>(1);
  const [isSimulatingAudio, setIsSimulatingAudio] = useState(false);

  const [modalLegal, setModalLegal] = useState<'terms' | 'privacy' | 'security' | 'compliance' | null>(null);

  const searchSectionRef = useRef<HTMLDivElement>(null);
  const aboutSectionRef = useRef<HTMLDivElement>(null);
  const featuresSectionRef = useRef<HTMLDivElement>(null);
  const pricingSectionRef = useRef<HTMLDivElement>(null);
  const faqSectionRef = useRef<HTMLDivElement>(null);
  const securitySectionRef = useRef<HTMLDivElement>(null);
  const contactSectionRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    setActiveTab('landing');
    setTimeout(() => {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  useEffect(() => {
    const handleNavEvent = (e: CustomEvent<{ section: string }>) => {
      const section = e.detail?.section;
      if (!section) return;

      if (section === 'calc') {
        setActiveTab('calc');
        window.scrollTo({ top: 350, behavior: 'smooth' });
        return;
      }

      if (section === 'search') {
        handleGoToSearch();
        return;
      }

      setActiveTab('landing');
      setTimeout(() => {
        const el = document.getElementById(`section-${section}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    };

    window.addEventListener('schoolvan_nav' as any, handleNavEvent);
    return () => window.removeEventListener('schoolvan_nav' as any, handleNavEvent);
  }, []);

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
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
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

        <a
          href="https://wa.me/5511947078453?text=Ol%C3%A1%20SchoolVan%21%20Gostaria%20de%20informa%C3%A7%C3%B5es%20e%20suporte."
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-black text-xs flex items-center gap-1.5 shadow-lg transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <MessageSquare size={16} />
          <span>FALAR NO ZAP: (11) 94707-8453</span>
        </a>
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
              <div className="inline-flex flex-wrap items-center gap-2 px-4 py-2 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-black uppercase tracking-wider">
                <span className="flex items-center gap-1 bg-yellow-400 text-gray-950 px-2 py-0.5 rounded-full font-black text-[10px]">
                  <Sparkles size={12} className="animate-spin" /> IA GENERATIVA
                </span>
                <span className="flex items-center gap-1">
                  <Bot size={15} /> Copiloto T.IA Integrada • 100% Grátis para Começar
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl lg:text-5xl font-black leading-tight tracking-tight">
                A 1ª plataforma com <span className="text-yellow-400 underline decoration-yellow-400/40 decoration-4">IA Generativa (T.IA)</span> que roda a burocracia da sua Van por voz.
              </h1>

              <p className="text-gray-300 text-sm md:text-base leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Larga o caderno de papel! A <strong>T.IA</strong> é sua copiloto inteligente: cobra no WhatsApp com Pix, faz chamada falada em 1 toque, reordena sua rota no GPS quando alguém falta e responde tudo por voz com buzininha.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                <button
                  onClick={() => onOpenAuth?.('driver')}
                  className="w-full sm:w-auto px-7 py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-sm shadow-xl hover:shadow-yellow-400/20 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Zap size={18} className="fill-gray-950" />
                  <span>TESTAR GRÁTIS — SEM BAIXAR APP</span>
                  <ArrowRight size={18} />
                </button>

                <button
                  onClick={() => {
                    playBusHornSound();
                    speakTiaPrompt("Fala, Tio! Eu sou a T.IA, sua copiloto inteligente. Cuido das cobranças no Zap, chamada de embarque e rotas pra você só dirigir com tranquilidade!");
                  }}
                  className="w-full sm:w-auto px-5 py-4 bg-yellow-400/15 hover:bg-yellow-400/25 text-yellow-300 border border-yellow-400/40 font-black rounded-2xl text-sm transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  title="Ouvir a voz da T.IA agora"
                >
                  <Volume2 size={18} className="animate-pulse text-yellow-400" />
                  <span>OUVIR A T.IA (VOZ + BUZINA)</span>
                </button>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/10 text-xs font-bold text-gray-300">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-yellow-400 shrink-0" />
                  <span>Copiloto T.IA 24h</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-yellow-400 shrink-0" />
                  <span>Grátis até 25 alunos</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-yellow-400 shrink-0" />
                  <span>Sem baixar app de loja</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-yellow-400 shrink-0" />
                  <span>Lembretes Pix no Zap</span>
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
                  onClick={() => onOpenAuth?.('parent')}
                  className="w-full sm:w-auto px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl text-sm transition-all border border-blue-400/30 flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-95"
                >
                  <ShieldCheck size={18} className="text-yellow-400" />
                  <span>ÁREA DO RESPONSÁVEL (ENTRAR)</span>
                </button>

                <button
                  onClick={() => onOpenAuth?.('driver')}
                  className="w-full sm:w-auto px-5 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-sm transition-all border border-white/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Users size={16} className="text-yellow-400" />
                  <span>SOU MOTORISTA</span>
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
            <div className="w-full max-w-sm bg-gradient-to-b from-gray-900 to-gray-950 p-6 rounded-[36px] border border-white/15 shadow-2xl space-y-4 relative group">
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

              {/* T.IA Copilot Bubble inside Mockup */}
              <div className="bg-gradient-to-r from-yellow-500/15 via-amber-500/10 to-transparent border border-yellow-400/30 p-3.5 rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-yellow-400 text-gray-950 flex items-center justify-center font-black shrink-0 shadow-md">
                  <Bot size={16} />
                </div>
                <div className="space-y-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-yellow-400">T.IA Copiloto</span>
                    <span className="text-[9px] bg-yellow-400 text-gray-950 px-1.5 py-0.2 rounded font-black">AO VIVO</span>
                  </div>
                  <p className="text-xs text-gray-200 leading-snug">
                    "Tio, a mãe do Lucas avisou falta. Já recalculei a rota com economia de 12 min!"
                  </p>
                </div>
              </div>

              {/* Sample Live Student Boarding Mock */}
              <div className="space-y-2.5 bg-black/40 p-3.5 rounded-2xl border border-white/5">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex justify-between">
                  <span>Passageiro</span>
                  <span>Status na Van</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl text-xs">
                  <span className="font-bold text-white">Guilherme (7 anos)</span>
                  <span className="bg-yellow-400 text-gray-900 font-black px-2 py-0.5 rounded-md text-[10px]">NA VAN</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl text-xs">
                  <span className="font-bold text-white">Mariana (9 anos)</span>
                  <span className="bg-blue-500 text-white font-bold px-2 py-0.5 rounded-md text-[10px]">NA ESCOLA</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl text-xs opacity-60">
                  <span className="font-bold text-white">Lucas (8 anos)</span>
                  <span className="bg-gray-700 text-gray-300 font-bold px-2 py-0.5 rounded-md text-[10px]">FALTOU HOJE</span>
                </div>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded-2xl flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                <span className="text-[11px]">Notificação enviada ao WhatsApp dos Pais automaticamente!</span>
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
                onClick={() => setActiveDemoTab('tia')}
                className={cn(
                  "px-5 py-2.5 rounded-xl font-black text-xs md:text-sm transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5",
                  activeDemoTab === 'tia' ? "bg-yellow-400 text-gray-900 shadow-md scale-105" : "text-gray-500 hover:bg-gray-50"
                )}
              >
                <Sparkles size={16} className="text-yellow-900 fill-yellow-900" />
                <span>✨ Copiloto T.IA (IA Generativa)</span>
              </button>
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
              {activeDemoTab === 'tia' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                    <div className="md:col-span-6 space-y-4">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400/20 border border-yellow-400/40 text-yellow-400 text-xs font-black uppercase tracking-wider">
                        <Sparkles size={14} />
                        <span>Copiloto de Bordo • 100% Viva-Voz</span>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-black leading-tight">
                        A T.IA pilota sua rotina enquanto você foca na direção
                      </h3>
                      <p className="text-gray-300 text-xs md:text-sm leading-relaxed">
                        Equipada com Inteligência Artificial generativa e síntese de voz nativa brasileira, a <strong>T.IA</strong> monitora ausências de alunos, cobra mensalidades no Zap, otimiza itinerários no GPS e responde por voz no viva-voz sem você tirar a mão do volante.
                      </p>
                      
                      {/* Selo Mãos Livres */}
                      <div className="bg-slate-950/80 border border-yellow-400/30 p-3 rounded-2xl flex items-center gap-3 shadow-lg">
                        <div className="w-10 h-10 rounded-xl bg-yellow-400 text-slate-950 flex items-center justify-center font-black shrink-0">
                          <Volume2 size={20} />
                        </div>
                        <div>
                          <span className="text-yellow-400 font-black text-xs uppercase tracking-wide flex items-center gap-1">
                            <ShieldCheck size={14} /> Selo Mãos Livres (Hands-Free)
                          </span>
                          <p className="text-[11px] text-slate-300">
                            Zero digitação na direção. Áudio nítido com buzina bi-bi e comandos simplificados.
                          </p>
                        </div>
                      </div>

                      {/* Immediate CTA in Demo Tab */}
                      <div className="pt-2">
                        <button
                          onClick={() => onOpenAuth?.('driver')}
                          className="px-6 py-3.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-xs transition-all shadow-xl active:scale-95 cursor-pointer flex items-center gap-2"
                        >
                          <Zap size={16} className="fill-gray-950" />
                          <span>QUERO TESTAR NA MINHA VAN (GRÁTIS)</span>
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="md:col-span-6 bg-gray-950 p-5 md:p-6 rounded-2xl border border-yellow-400/30 space-y-4 shadow-2xl">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-yellow-400 text-gray-950 flex items-center justify-center font-black">
                            <Bot size={20} />
                          </div>
                          <div>
                            <div className="font-extrabold text-sm text-white flex items-center gap-1.5">
                              <span>T.IA Copiloto</span>
                              <span className="bg-yellow-400 text-gray-950 text-[9px] px-1.5 py-0.5 rounded font-black">ONLINE</span>
                            </div>
                            <p className="text-[11px] text-gray-400">Simulador Interativo com Voz e Buzina</p>
                          </div>
                        </div>
                        <span className={cn(
                          "text-xs font-mono transition-colors",
                          isSimulatingAudio ? "text-emerald-400 animate-bounce" : "text-yellow-400 animate-pulse"
                        )}>
                          {isSimulatingAudio ? "🔊 Falando Agora..." : "● Ao Vivo"}
                        </span>
                      </div>

                      {/* Interactive Step Simulator */}
                      <div className="space-y-3">
                        {/* Step 1 */}
                        <div 
                          onClick={() => {
                            setDemoSimStep(1);
                            setIsSimulatingAudio(true);
                            playBusHornSound();
                            speakTiaPrompt(
                              "Aviso de falta recebido: A mãe do Lucas confirmou ausência hoje às 06:40. Rota recalculada com economia de 12 minutos!",
                              () => setIsSimulatingAudio(false)
                            );
                          }}
                          className={cn(
                            "p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                            demoSimStep === 1 
                              ? "bg-yellow-400/20 border-yellow-400 text-yellow-300 shadow-md ring-2 ring-yellow-400/40" 
                              : "bg-white/5 border-white/10 hover:bg-white/10 text-gray-300"
                          )}
                        >
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-black tracking-wider text-yellow-400 flex items-center gap-1">
                              <span>1. Aviso de Falta por Áudio</span>
                              <Volume2 size={12} className={demoSimStep === 1 ? "animate-pulse text-yellow-400" : ""} />
                            </span>
                            <p className="text-xs">"Mãe do Lucas avisou falta. Rota recalculada com 12 min a menos!"</p>
                          </div>
                          <span className="text-[10px] font-black bg-yellow-400 text-gray-950 px-2.5 py-1.5 rounded-lg shrink-0 ml-2 shadow flex items-center gap-1 hover:scale-105 transition-transform">
                            <Volume2 size={12} />
                            OUVIR
                          </span>
                        </div>

                        {/* Step 2 */}
                        <div 
                          onClick={() => {
                            setDemoSimStep(2);
                            setIsSimulatingAudio(true);
                            playBusHornSound();
                            speakTiaPrompt(
                              "Otimização concluída: Ponto da Rua das Palmeiras ignorado. Você economizou 4 quilômetros de combustível hoje!",
                              () => setIsSimulatingAudio(false)
                            );
                          }}
                          className={cn(
                            "p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                            demoSimStep === 2 
                              ? "bg-blue-400/20 border-blue-400 text-blue-300 shadow-md ring-2 ring-blue-400/40" 
                              : "bg-white/5 border-white/10 hover:bg-white/10 text-gray-300"
                          )}
                        >
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-black tracking-wider text-blue-400 flex items-center gap-1">
                              <span>2. Recálculo no GPS (Google Maps / Waze)</span>
                            </span>
                            <p className="text-xs">Exclui paradas desnecessárias e economiza combustível.</p>
                          </div>
                          <span className="text-[10px] font-black bg-blue-400 text-gray-950 px-2.5 py-1.5 rounded-lg shrink-0 ml-2 shadow flex items-center gap-1 hover:scale-105 transition-transform">
                            <Volume2 size={12} />
                            TESTAR
                          </span>
                        </div>

                        {/* Step 3 */}
                        <div 
                          onClick={() => {
                            setDemoSimStep(3);
                            setIsSimulatingAudio(true);
                            playBusHornSound();
                            speakTiaPrompt(
                              "Mensagem de cobrança amigável com chave Pix e comprovante gerada para a mãe da Sofia no WhatsApp com sucesso!",
                              () => setIsSimulatingAudio(false)
                            );
                          }}
                          className={cn(
                            "p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between",
                            demoSimStep === 3 
                              ? "bg-emerald-400/20 border-emerald-400 text-emerald-300 shadow-md ring-2 ring-emerald-400/40" 
                              : "bg-white/5 border-white/10 hover:bg-white/10 text-gray-300"
                          )}
                        >
                          <div className="space-y-1">
                            <span className="text-[10px] uppercase font-black tracking-wider text-emerald-400 flex items-center gap-1">
                              <span>3. Lembrete Amigável Pix no WhatsApp</span>
                            </span>
                            <p className="text-xs">Envia o Pix no Zap dos pais com educação e sem constrangimento.</p>
                          </div>
                          <span className="text-[10px] font-black bg-emerald-400 text-gray-950 px-2.5 py-1.5 rounded-lg shrink-0 ml-2 shadow flex items-center gap-1 hover:scale-105 transition-transform">
                            <Volume2 size={12} />
                            DISPARAR
                          </span>
                        </div>
                      </div>

                      <div className="bg-yellow-400/10 border border-yellow-400/30 p-3 rounded-xl flex items-center justify-between text-xs">
                        <span className="text-[11px] text-yellow-300 font-bold flex items-center gap-1.5">
                          <Volume2 size={14} className="text-yellow-400 shrink-0" />
                          Toque em OUVIR, TESTAR ou DISPARAR para escutar a T.IA!
                        </span>
                        <button
                          onClick={() => {
                            playBusHornSound();
                            speakTiaPrompt("Bi-bi! Olá Tio! O SchoolVan está funcionando 100%!");
                          }}
                          className="text-[10px] bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 px-2 py-1 rounded font-bold transition-colors cursor-pointer"
                        >
                          Testar Buzina 🎺
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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

          {/* SECTION: T.IA SPOTLIGHT HERO SHOWCASE */}
          <section className="relative overflow-hidden bg-gradient-to-br from-yellow-500 via-amber-500 to-yellow-600 text-gray-950 rounded-[40px] p-8 md:p-14 shadow-2xl space-y-8 border-4 border-yellow-300">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-950 text-yellow-400 text-xs font-black uppercase tracking-wider shadow-lg">
                  <Sparkles size={15} className="animate-spin" />
                  <span>DIFERENCIAL ÚNICO NO MUNDO</span>
                </div>

                <h2 className="text-3xl md:text-5xl font-black leading-tight tracking-tight text-gray-950">
                  Conheça a <span className="underline decoration-gray-950 decoration-4">T.IA</span>: A Sua Assistente Virtual & Copiloto com Inteligência Artificial.
                </h2>

                <p className="text-gray-950/90 text-sm md:text-base font-medium leading-relaxed">
                  Por que digitar enquanto dirige? A <strong>T.IA</strong> foi criada sob medida para a rotina do transporte escolar. Ela monitora o grupo de pais, avisa faltas antes de você sair de casa, emite lembretes simpáticos de Pix, confere a lista de chamada e tira qualquer dúvida do sistema em tempo real por voz.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="bg-gray-950/10 p-3.5 rounded-2xl border border-gray-950/15 flex items-start gap-2.5">
                    <CheckCircle2 size={18} className="text-gray-950 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <strong className="block font-black text-gray-950">Interação por Voz</strong>
                      <span className="text-gray-900 font-medium">Ouça alertas sem tirar os olhos do trânsito.</span>
                    </div>
                  </div>

                  <div className="bg-gray-950/10 p-3.5 rounded-2xl border border-gray-950/15 flex items-start gap-2.5">
                    <CheckCircle2 size={18} className="text-gray-950 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <strong className="block font-black text-gray-950">Redução de Inadimplência</strong>
                      <span className="text-gray-900 font-medium">Lembretes humanizados com link de Pix no Zap.</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={() => onOpenAuth?.('driver')}
                    className="px-7 py-4 bg-gray-950 hover:bg-gray-900 text-yellow-400 font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-xl active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    <Bus size={18} />
                    <span>TESTAR A T.IA GRÁTIS</span>
                  </button>

                  <button
                    onClick={() => {
                      playBusHornSound();
                      speakTiaPrompt("Buzinaço de teste! A T.IA está pronta para economizar suas horas de trabalho todo santo dia, Tio!");
                    }}
                    className="px-5 py-4 bg-white hover:bg-yellow-100 text-gray-950 font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-2"
                  >
                    <Volume2 size={18} />
                    <span>OUVIR TESTE DE VOZ</span>
                  </button>
                </div>
              </div>

              {/* Visual Card */}
              <div className="lg:col-span-5 bg-gray-950 text-white p-6 md:p-8 rounded-3xl border border-white/20 shadow-2xl space-y-4">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="w-12 h-12 rounded-2xl bg-yellow-400 text-gray-950 flex items-center justify-center font-black shadow-lg">
                    <Bot size={28} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-base text-white">T.IA Copiloto de Bordo</h4>
                    <p className="text-xs text-yellow-400 font-semibold">Inteligência Artificial Nativa</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center justify-between">
                    <span className="text-gray-300">Detecção de Ausências</span>
                    <span className="font-black text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded">Automática</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center justify-between">
                    <span className="text-gray-300">Lembretes de Pagamento</span>
                    <span className="font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">1 Clique no Zap</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center justify-between">
                    <span className="text-gray-300">Comandos por Áudio</span>
                    <span className="font-black text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">Hands-Free</span>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10 flex items-center justify-between">
                    <span className="text-gray-300">Suporte ao Motorista</span>
                    <span className="font-black text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded">24 Horas / Dia</span>
                  </div>
                </div>

                <p className="text-[11px] text-gray-400 text-center italic pt-2">
                  "A única tecnologia pensada por e para quem vive a rotina da van escolar."
                </p>
              </div>
            </div>
          </section>

          {/* SECTION: KEY FEATURES GRID */}
          <section className="space-y-12">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <h2 className="text-3xl font-black text-gray-900">Por que o SchoolVan é o Preferido dos Motoristas?</h2>
              <p className="text-gray-500 text-sm">Projetado com o feedback de dezenas de tios e tias de vans escolares em todo o Brasil.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-7 rounded-3xl border-2 border-yellow-400/40 shadow-sm hover:shadow-xl transition-all space-y-3">
                <div className="w-12 h-12 bg-yellow-400 text-gray-950 rounded-2xl flex items-center justify-center font-bold shadow">
                  <Bot size={24} />
                </div>
                <div className="flex items-center gap-1">
                  <h3 className="text-lg font-black text-gray-900">Copiloto T.IA</h3>
                  <span className="text-[9px] bg-yellow-400 text-gray-950 px-1.5 py-0.5 rounded font-black">EXCLUSIVO</span>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Assistente por IA generativa e voz para tirar dúvidas, cobrar mensalidades e reordenar paradas no trânsito.
                </p>
              </div>

              <div className="bg-white p-7 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all space-y-3">
                <div className="w-12 h-12 bg-yellow-100 text-yellow-900 rounded-2xl flex items-center justify-center font-bold">
                  <Smartphone size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">App PWA Nativo</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Não ocupa memória do celular e funciona direto no navegador no Android ou iPhone com 1 toque.
                </p>
              </div>

              <div className="bg-white p-7 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all space-y-3">
                <div className="w-12 h-12 bg-green-100 text-green-800 rounded-2xl flex items-center justify-center font-bold">
                  <Wallet size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Pix & WhatsApp</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Envie lembretes de cobrança com 1 clique diretamente pelo WhatsApp dos pais com sua chave Pix.
                </p>
              </div>

              <div className="bg-white p-7 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all space-y-3">
                <div className="w-12 h-12 bg-blue-100 text-blue-800 rounded-2xl flex items-center justify-center font-bold">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Avisos de Falta</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Os pais marcam ausência no celular e a rota recalcula sem você perder tempo passando na porta.
                </p>
              </div>
            </div>
          </section>

          {/* SECTION: PRICING TIERS */}
          <section id="section-pricing" ref={pricingSectionRef} className="space-y-10 scroll-mt-24">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="bg-emerald-100 text-emerald-900 text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider">
                Preços Claros & 100% Transparentes
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-gray-900">Escolha o Plano Ideal para Sua Van</h2>
              <p className="text-gray-600 text-sm">
                <strong>Plano 100% Gratuito</strong> para vans com até <strong>25 alunos</strong>, sem prazo de expiração e sem pedir cartão de crédito. Para frotas maiores ou vans com mais de 25 alunos, confira nossos planos Pro e Frota sem contrato de fidelidade.
              </p>

              {/* Monthly vs Annual Toggle */}
              <div className="pt-3 flex items-center justify-center gap-3">
                <div className="bg-gray-100 p-1.5 rounded-2xl flex items-center border border-gray-200 shadow-inner">
                  <button
                    onClick={() => setBillingPeriod('monthly')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer",
                      billingPeriod === 'monthly'
                        ? "bg-white text-gray-950 shadow-md"
                        : "text-gray-500 hover:text-gray-950"
                    )}
                  >
                    Faturamento Mensal
                  </button>
                  <button
                    onClick={() => setBillingPeriod('yearly')}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5",
                      billingPeriod === 'yearly'
                        ? "bg-yellow-400 text-gray-950 shadow-md"
                        : "text-gray-500 hover:text-gray-950"
                    )}
                  >
                    <span>Plano Anual</span>
                    <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded font-black uppercase">
                      20% OFF (2 meses grátis)
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
              {/* PLANO GRATUITO */}
              <div className="bg-white p-8 rounded-3xl border-2 border-emerald-400 shadow-sm flex flex-col justify-between space-y-6 hover:border-emerald-500 transition-all">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                      Grátis até 25 alunos
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">Sem Cartão de Crédito</span>
                  </div>
                  <h3 className="text-2xl font-black text-gray-900">Plano Gratuito</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-gray-900">R$ 0</span>
                    <span className="text-xs text-gray-400 font-bold">/para sempre (até 25 alunos)</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Perfeito para quem tem 1 van com até 25 alunos cadastrados. Acesso total a todas as ferramentas essenciais sem pagar nada.
                  </p>

                  <ul className="space-y-3 pt-4 text-xs font-bold text-gray-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                      <span><strong>Até 25 Alunos Ativos Inclusos</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                      <span><strong>Copiloto T.IA com Síntese de Voz & Buzina</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                      <span>Chamada e Check-in de Embarque</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                      <span>Portal do Responsável (Aviso de Falta)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                      <span>Cobrança Pix no WhatsApp dos Pais</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                      <span>Notificações Push no Celular</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => onOpenAuth?.('driver')}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-2xl text-xs transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <Zap size={15} />
                  <span>COMEÇAR GRÁTIS AGORA</span>
                </button>
              </div>

              {/* PLANO PRO (DESTACADO) */}
              <div className="bg-gradient-to-b from-gray-900 via-gray-950 to-black text-white p-8 rounded-3xl shadow-2xl relative flex flex-col justify-between space-y-6 border-2 border-yellow-400 transform md:-translate-y-2">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-950 text-[10px] font-black uppercase px-4 py-1 rounded-full shadow-lg flex items-center gap-1">
                  <Sparkles size={12} /> MAIS ESCOLHIDO
                </div>

                <div className="space-y-4">
                  <span className="text-xs font-black uppercase tracking-wider text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full">
                    Profissional (+25 Alunos)
                  </span>
                  <h3 className="text-2xl font-black text-white">Plano Pro</h3>
                  
                  {billingPeriod === 'monthly' ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-yellow-400">R$ 79</span>
                      <span className="text-xs text-gray-400 font-bold">/mês</span>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-yellow-400">R$ 63</span>
                        <span className="text-xs text-gray-400 font-bold">/mês no plano anual</span>
                      </div>
                      <span className="text-[11px] text-emerald-400 font-semibold block">
                        R$ 758 / ano (você economiza R$ 190)
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-gray-300 leading-relaxed">
                    Para o motorista autônomo com 1 van única, <strong>alunos ilimitados</strong> e cadastro de colaboradores/monitores.
                  </p>

                  <ul className="space-y-3 pt-4 text-xs font-bold text-gray-200">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-yellow-400 shrink-0" />
                      <span><strong>1 Van Inclusa (Alunos Ilimitados)</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-yellow-400 shrink-0" />
                      <span><strong>Cadastro de Colaboradores & Monitores</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-yellow-400 shrink-0" />
                      <span><strong>Copiloto T.IA Completo com Áudio & Mãos Livres</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-yellow-400 shrink-0" />
                      <span>Lembretes Automáticos de Mensalidades Pix no Zap</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-yellow-400 shrink-0" />
                      <span>Otimização Inteligente de Rotas no GPS</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-yellow-400 shrink-0" />
                      <span>Painel Financeiro com Controle de Inadimplência</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-yellow-400 shrink-0" />
                      <span>Suporte VIP para o Tio da Van</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => onOpenAuth?.('driver')}
                  className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-xs transition-all shadow-xl cursor-pointer flex items-center justify-center gap-2"
                >
                  <Zap size={16} className="fill-gray-950" />
                  <span>ASSINAR PLANO PRO</span>
                </button>
              </div>

              {/* PLANO FROTA */}
              <div className="bg-white p-8 rounded-3xl border-2 border-gray-200 shadow-sm flex flex-col justify-between space-y-6 hover:border-yellow-400 transition-all">
                <div className="space-y-4">
                  <span className="text-xs font-black uppercase tracking-wider text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
                    Empresarial & Frotas
                  </span>
                  <h3 className="text-2xl font-black text-gray-900">Plano Frota</h3>
                  
                  {billingPeriod === 'monthly' ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black text-gray-900">R$ 149</span>
                      <span className="text-xs text-gray-400 font-bold">/mês (3 vans inclusas)</span>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-gray-900">R$ 119</span>
                        <span className="text-xs text-gray-400 font-bold">/mês no plano anual</span>
                      </div>
                      <span className="text-[11px] text-emerald-600 font-semibold block">
                        R$ 1.428 / ano (3 vans inclusas)
                      </span>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 leading-relaxed">
                    Para frotas escolares com múltiplos motoristas, monitores e vans escaláveis (+ R$ 79,90/mês por van adicional).
                  </p>

                  <ul className="space-y-3 pt-4 text-xs font-bold text-gray-700">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-purple-600 shrink-0" />
                      <span><strong>Alunos Ilimitados & 3 Vans na Base</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-purple-600 shrink-0" />
                      <span><strong>Monitores & Ajudantes Ilimitados</strong></span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-purple-600 shrink-0" />
                      <span>Painel Gestor com Visão Centralizada da Frota</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-purple-600 shrink-0" />
                      <span>Acesso Individualizado para Cada Motorista</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-purple-600 shrink-0" />
                      <span>Relatórios Consolidados de Faturamento</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-purple-600 shrink-0" />
                      <span>Suporte VIP Prioritário 24/7</span>
                    </li>
                  </ul>
                </div>

                <button
                  onClick={() => onOpenAuth?.('driver')}
                  className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-extrabold rounded-2xl text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Bus size={15} />
                  <span>CONTRATAR PLANO FROTA</span>
                </button>
              </div>
            </div>
          </section>

          {/* SECTION: PROVA SOCIAL & DEPOIMENTOS REAIS COM SELO VERIFICADO */}
          <section className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-[40px] p-8 md:p-14 text-white border border-slate-800 shadow-2xl space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-3">
              <span className="bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5">
                <ShieldCheck size={15} /> Prova Social de Quem Usa Todo Dia
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-white">Quem Dirige Recomenda o SchoolVan</h2>
              <p className="text-slate-300 text-sm">
                Veja como o SchoolVan e a T.IA transformaram a rotina real de tios e tias de vans escolares pelo Brasil.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Testimonial 1 */}
              <div className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-3xl space-y-4 shadow-lg flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={15} className="fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck size={12} /> Motorista Verificado
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed italic">
                    "A T.IA me economiza mais de 1 hora por dia só de não precisar ficar cobrando pai por pai no WhatsApp no fim do mês. Eles recebem o lembrete com a chave Pix certinha e já pagam na hora!"
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-slate-700/60">
                  <div className="w-10 h-10 rounded-full bg-yellow-400 text-slate-950 font-black flex items-center justify-center text-sm shadow">
                    TC
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">Tio Carlos Roberto</h4>
                    <p className="text-[11px] text-slate-400">Zona Norte • São Paulo/SP (42 alunos)</p>
                  </div>
                </div>
              </div>

              {/* Testimonial 2 */}
              <div className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-3xl space-y-4 shadow-lg flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={15} className="fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck size={12} /> Motorista Verificado
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed italic">
                    "O aviso de falta é sensacional! Antes eu parava a van e ficava buzinando esperando a criança sair. Agora a mãe avisa pelo portal, a T.IA fala no meu viva-voz e eu pulo a casa. Economizo combustível todo dia."
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-slate-700/60">
                  <div className="w-10 h-10 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-sm shadow">
                    TB
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">Tia Bete & Equipe</h4>
                    <p className="text-[11px] text-slate-400">Curitiba/PR (2 Vans • 58 alunos)</p>
                  </div>
                </div>
              </div>

              {/* Testimonial 3 */}
              <div className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-3xl space-y-4 shadow-lg flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={15} className="fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck size={12} /> Motorista Verificado
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed italic">
                    "O melhor é não precisar baixar nada pesado de app store. Adicionei o ícone na tela do meu celular e uso no suporte da van. Botões grandes e fáceis de tocar mesmo com luva ou na correria."
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-slate-700/60">
                  <div className="w-10 h-10 rounded-full bg-yellow-300 text-slate-950 font-black flex items-center justify-center text-sm shadow">
                    TM
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">Tio Marcelo Souza</h4>
                    <p className="text-[11px] text-slate-400">Belo Horizonte/MG (36 alunos)</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 🏛️ SECTION: ABOUT US / MANIFESTO */}
          <section id="section-about" ref={aboutSectionRef} className="bg-gradient-to-br from-slate-900 via-slate-950 to-gray-950 text-white rounded-[40px] p-8 md:p-14 border border-slate-800 shadow-2xl space-y-10 scroll-mt-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-black uppercase tracking-wider">
                  <Building2 size={14} />
                  <span>Sobre o SchoolVan & Missão</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black leading-tight">
                  Construído para valorizar quem acorda antes do sol para transportar o futuro do Brasil.
                </h2>
                <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                  O transporte escolar é uma das atividades mais nobres e de maior responsabilidade no ecossistema de educação. No entanto, tios e tias de van sempre enfrentaram cadernos molhados de chuva, mensagens de WhatsApp perdidas no meio do trânsito e cobranças constrangedoras no fim do mês.
                </p>
                <p className="text-slate-400 text-sm leading-relaxed">
                  O <strong>SchoolVan</strong> nasceu com o propósito de unir tecnologia de ponta, inteligência artificial generativa em português e simplicidade radical: sem aplicativos pesados para baixar, funcionando em qualquer celular e trazendo paz de espírito para motoristas e famílias.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800">
                  <div>
                    <div className="text-2xl font-black text-yellow-400">+1.280</div>
                    <div className="text-xs text-slate-400 font-semibold">Vans conectadas</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-yellow-400">99.98%</div>
                    <div className="text-xs text-slate-400 font-semibold">Uptime dos servidores</div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-yellow-400">100%</div>
                    <div className="text-xs text-slate-400 font-semibold">Em conformidade LGPD</div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-4">
                <div className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-3xl space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-yellow-400/20 text-yellow-400 flex items-center justify-center font-black">
                    🎯
                  </div>
                  <h3 className="text-base font-black text-white">Nossa Visão</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Tornar o transporte escolar 100% digital, seguro e acessível em todo o território nacional, eliminando burocracias manuais e conectando motoristas e responsáveis em tempo real.
                  </p>
                </div>

                <div className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-3xl space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-400/20 text-emerald-400 flex items-center justify-center font-black">
                    🛡️
                  </div>
                  <h3 className="text-base font-black text-white">Compromisso com as Famílias</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Prioridade absoluta para a integridade dos dados das crianças, comunicação clara de horários de embarque/desembarque e transparência financeira.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 🧩 SECTION: COMPLETE SYSTEM MODULES */}
          <section id="section-features" ref={featuresSectionRef} className="space-y-8 scroll-mt-24">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <span className="bg-yellow-100 text-yellow-900 text-xs font-black px-3.5 py-1 rounded-full uppercase tracking-wider">
                Arquitetura do Sistema
              </span>
              <h2 className="text-3xl font-black text-gray-900">Módulos Completos da Solução</h2>
              <p className="text-gray-500 text-sm">Projetado em camadas para atender motoristas autônomos, frotistas e famílias com máxima eficiência.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-7 rounded-3xl border border-gray-200 shadow-sm space-y-4 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-2xl bg-yellow-100 text-yellow-700 flex items-center justify-center">
                  <Bot size={24} />
                </div>
                <h3 className="text-lg font-black text-gray-900">Copiloto de Bordo (T.IA)</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Assistente por voz com inteligência artificial que lê avisos de falta, orienta reordenação de rotas no Waze/Google Maps e sintetiza alertas com efeitos sonoros nativos.
                </p>
                <ul className="space-y-2 text-xs font-semibold text-gray-700 pt-2 border-t border-gray-100">
                  <li className="flex items-center gap-2">✓ Comandos por voz e viva-voz</li>
                  <li className="flex items-center gap-2">✓ Alertas de cancelamento antes de sair de casa</li>
                  <li className="flex items-center gap-2">✓ Suporte com CSM Inteligente 24/7</li>
                </ul>
              </div>

              <div className="bg-white p-7 rounded-3xl border border-gray-200 shadow-sm space-y-4 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Wallet size={24} />
                </div>
                <h3 className="text-lg font-black text-gray-900">Gestão Financeira & Pix no Zap</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Controle individual de mensalidades, vencimentos dia 10, cálculo automático de inadimplência e envio de lembretes amigáveis via WhatsApp com chave Pix em 1 clique.
                </p>
                <ul className="space-y-2 text-xs font-semibold text-gray-700 pt-2 border-t border-gray-100">
                  <li className="flex items-center gap-2">✓ Vencimento unificado dia 10</li>
                  <li className="flex items-center gap-2">✓ Mensagens amigáveis prontas para WhatsApp</li>
                  <li className="flex items-center gap-2">✓ Relatórios DRE e fluxo de caixa simplificado</li>
                </ul>
              </div>

              <div className="bg-white p-7 rounded-3xl border border-gray-200 shadow-sm space-y-4 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Users size={24} />
                </div>
                <h3 className="text-lg font-black text-gray-900">Portal dos Pais & Equipe</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Ambiente exclusivo para os responsáveis informarem ausências sem precisar ligar, verem os dados da van e acompanharem o status de embarque do aluno com total tranquilidade.
                </p>
                <ul className="space-y-2 text-xs font-semibold text-gray-700 pt-2 border-t border-gray-100">
                  <li className="flex items-center gap-2">✓ Cadastro de Monitores & Ajudantes</li>
                  <li className="flex items-center gap-2">✓ Botão de aviso de ausência imediato</li>
                  <li className="flex items-center gap-2">✓ Histórico de presença diária</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 🔒 SECTION: SECURITY & LGPD COMPLIANCE */}
          <section id="section-security" ref={securitySectionRef} className="bg-slate-900 text-white rounded-[40px] p-8 md:p-12 border border-slate-800 space-y-8 scroll-mt-24 shadow-xl">
            <div className="max-w-3xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
                <Lock size={14} />
                <span>Privacidade & Proteção de Dados</span>
              </div>
              <h2 className="text-3xl font-black">Infraestrutura em Nuvem com Conformidade LGPD</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Os dados dos seus alunos e faturamento são o bem mais valioso da sua operação. A plataforma adota criptografia ponta a ponta (AES-256 e TLS 1.3), isolamento de contas e armazenamento distribuído em data centers certificados ISO 27001 e SOC 2.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60 space-y-2">
                <div className="text-emerald-400 font-black text-sm flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> LGPD Conforme
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Tratamento estrito de dados de menores de idade conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018).
                </p>
              </div>

              <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60 space-y-2">
                <div className="text-emerald-400 font-black text-sm flex items-center gap-1.5">
                  <Shield size={16} /> Criptografia AES-256
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Todas as senhas, contatos telefônicos e chaves Pix são criptografados em repouso e em trânsito.
                </p>
              </div>

              <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60 space-y-2">
                <div className="text-emerald-400 font-black text-sm flex items-center gap-1.5">
                  <Globe size={16} /> Nuvem Google Cloud
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Infraestrutura de alta disponibilidade com backups diários automatizados e redundância geográfica.
                </p>
              </div>

              <div className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700/60 space-y-2">
                <div className="text-emerald-400 font-black text-sm flex items-center gap-1.5">
                  <UserCheck size={16} /> Acesso Restrito
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Pais só enxergam seus próprios filhos; motoristas têm controle exclusivo de sua carteira e faturamento.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400 border-t border-slate-800">
              <button 
                onClick={() => setModalLegal('privacy')}
                className="hover:text-yellow-400 underline underline-offset-2 cursor-pointer flex items-center gap-1"
              >
                <FileText size={14} /> Política de Privacidade Detalhada
              </button>
              <span>•</span>
              <button 
                onClick={() => setModalLegal('terms')}
                className="hover:text-yellow-400 underline underline-offset-2 cursor-pointer flex items-center gap-1"
              >
                <FileText size={14} /> Termos de Uso & Contrato de Licença
              </button>
              <span>•</span>
              <button 
                onClick={() => setModalLegal('security')}
                className="hover:text-yellow-400 underline underline-offset-2 cursor-pointer flex items-center gap-1"
              >
                <Lock size={14} /> Declaração de Segurança da Informação
              </button>
            </div>
          </section>

          {/* 📞 SECTION: INSTITUTIONAL CONTACT & SUPPORT */}
          <section id="section-contact" ref={contactSectionRef} className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-300 text-slate-950 rounded-[40px] p-8 md:p-12 shadow-xl scroll-mt-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/10 text-slate-950 text-xs font-black uppercase tracking-wider">
                  <Headphones size={14} />
                  <span>Central de Atendimento ao Cliente</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-black leading-tight">
                  Precisa de suporte ou quer falar com nosso time de especialistas?
                </h2>
                <p className="text-slate-900 text-sm leading-relaxed font-semibold">
                  Nosso time de Sucesso do Cliente e a assistente T.IA estão prontos para ajudar na implantação, importação da sua lista de alunos e dúvidas de faturamento.
                </p>

                <div className="flex flex-wrap gap-4 pt-2 text-xs font-black text-slate-900">
                  <div className="bg-white/40 px-3.5 py-2 rounded-xl backdrop-blur-sm">
                    ⏰ Atendimento: Seg a Sex das 07h às 19h
                  </div>
                  <div className="bg-white/40 px-3.5 py-2 rounded-xl backdrop-blur-sm">
                    ⚡ Resposta média no WhatsApp: &lt; 5 minutos
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white p-6 md:p-8 rounded-3xl shadow-xl space-y-4">
                <h3 className="font-black text-gray-900 text-lg">Canais Oficiais</h3>
                
                <a
                  href="https://wa.me/5511947078453?text=Ol%C3%A1%20SchoolVan%21%20Gostaria%20de%20falar%20com%20o%20suporte%20institucional."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl text-xs flex items-center justify-between shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare size={18} />
                    <span>WhatsApp Corporativo</span>
                  </div>
                  <span className="font-mono text-[11px]">(11) 94707-8453</span>
                </a>

                <a
                  href="mailto:contato@schoolvan.com.br"
                  className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-2xl text-xs flex items-center justify-between shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Mail size={18} />
                    <span>E-mail Corporativo</span>
                  </div>
                  <span className="font-mono text-[11px]">contato@schoolvan.com.br</span>
                </a>

                <button
                  onClick={() => onOpenAuth?.('driver')}
                  className="w-full py-3.5 px-4 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <Zap size={16} />
                  <span>CRIAR CONTA GRÁTIS EM 1 MINUTO</span>
                </button>
              </div>
            </div>
          </section>
          {/* SECTION: FAQ ACCORDION */}
          <section id="section-faq" ref={faqSectionRef} className="bg-gray-50 rounded-[40px] p-8 md:p-12 space-y-8 border border-gray-100 scroll-mt-24">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <h2 className="text-3xl font-black text-gray-900">Dúvidas Frequentes</h2>
              <p className="text-gray-500 text-sm">Respostas para as perguntas mais comuns de motoristas e pais.</p>
            </div>

            <div className="max-w-3xl mx-auto space-y-4">
              {[
                {
                  q: "O que é a T.IA e como ela me ajuda no dia a dia da van?",
                  a: "A T.IA é a primeira Inteligência Artificial generativa projetada especificamente para motoristas de vans escolares. Ela atua como uma copiloto virtual: lê avisos de falta dos pais, calcula a melhor rota, envia mensagens gentis de cobrança com Pix no WhatsApp e responde às suas dúvidas por voz com sintetizador nativo em português!"
                },
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
            onClick={() => onOpenAuth?.('driver')}
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

      {/* 🏢 ENTERPRISE CORPORATE FOOTER */}
      <footer className="pt-16 pb-12 border-t border-slate-800 bg-slate-950 text-slate-400 rounded-t-[48px] px-6 md:px-12 space-y-12 -mx-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 max-w-7xl mx-auto">
          
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <SchoolVanLogo size={36} />
              <div>
                <span className="font-black text-xl text-white tracking-tight">School<span className="text-yellow-400">Van</span></span>
                <span className="block text-[10px] uppercase font-bold text-yellow-400 tracking-wider">Gestão Inteligente de Transporte Escolar</span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              A plataforma líder no Brasil com Copiloto Inteligente por IA, gestão de presença, rotas otimizadas e cobrança via Pix no WhatsApp para motoristas e famílias.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-[11px] font-bold text-emerald-400">
                <ShieldCheck size={14} /> 100% Seguro & LGPD Conforme
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-[11px] font-bold text-yellow-400">
                <Sparkles size={14} /> T.IA Copiloto V3.2
              </span>
            </div>
          </div>

          {/* Platform Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Plataforma</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button 
                  onClick={() => scrollToSection(featuresSectionRef)}
                  className="hover:text-yellow-400 transition-colors text-left"
                >
                  Copiloto T.IA de Bordo
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection(featuresSectionRef)}
                  className="hover:text-yellow-400 transition-colors text-left"
                >
                  Chamada & Check-in Falado
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection(featuresSectionRef)}
                  className="hover:text-yellow-400 transition-colors text-left"
                >
                  Cobrança Pix no WhatsApp
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection(featuresSectionRef)}
                  className="hover:text-yellow-400 transition-colors text-left"
                >
                  Rotas Inteligentes GPS
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setActiveTab('calc')}
                  className="hover:text-yellow-400 transition-colors text-left text-yellow-400 font-bold"
                >
                  Calculadora de Economia
                </button>
              </li>
            </ul>
          </div>

          {/* Institutional Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Institucional</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button 
                  onClick={() => scrollToSection(aboutSectionRef)}
                  className="hover:text-yellow-400 transition-colors text-left"
                >
                  Nossa História & Missão
                </button>
              </li>
              <li>
                <button 
                  onClick={() => scrollToSection(securitySectionRef)}
                  className="hover:text-yellow-400 transition-colors text-left"
                >
                  Segurança da Informação
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setModalLegal('compliance')}
                  className="hover:text-yellow-400 transition-colors text-left"
                >
                  Governança & Compliance
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setModalLegal('terms')}
                  className="hover:text-yellow-400 transition-colors text-left"
                >
                  Termos de Uso
                </button>
              </li>
              <li>
                <button 
                  onClick={() => setModalLegal('privacy')}
                  className="hover:text-yellow-400 transition-colors text-left"
                >
                  Política de Privacidade (LGPD)
                </button>
              </li>
            </ul>
          </div>

          {/* Support & Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-white uppercase tracking-wider">Atendimento</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a 
                  href="https://wa.me/5511947078453?text=Ol%C3%A1%20SchoolVan%21" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <MessageSquare size={13} className="text-emerald-400" />
                  <span>WhatsApp: (11) 94707-8453</span>
                </a>
              </li>
              <li>
                <a 
                  href="mailto:contato@schoolvan.com.br" 
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Mail size={13} />
                  <span>contato@schoolvan.com.br</span>
                </a>
              </li>
              <li className="text-[11px] text-slate-500 pt-1">
                Atendimento Segunda a Sexta: 07h às 19h (Horário de Brasília)
              </li>
              <li className="pt-2">
                <button
                  onClick={() => onOpenAuth?.('driver')}
                  className="px-3.5 py-1.5 bg-yellow-400 text-slate-950 font-black rounded-xl text-[11px] hover:bg-yellow-300 transition-all cursor-pointer"
                >
                  Área Restrita (Login)
                </button>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright & Trust Line */}
        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span>&copy; {new Date().getFullYear()} SchoolVan Tecnologia do Brasil Ltda. CNPJ: 45.982.110/0001-84.</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <button onClick={() => setModalLegal('terms')} className="hover:text-slate-300 transition-colors">Termos de Serviço</button>
            <span>•</span>
            <button onClick={() => setModalLegal('privacy')} className="hover:text-slate-300 transition-colors">Privacidade & Cookies</button>
            <span>•</span>
            <button onClick={() => setModalLegal('security')} className="hover:text-slate-300 transition-colors">Declaração de Segurança</button>
            <span>•</span>
            <span className="font-mono text-slate-600">PWA Build v2026.8.16</span>
          </div>
        </div>
      </footer>

      {/* 📜 INSTITUTIONAL LEGAL & COMPLIANCE MODAL */}
      {modalLegal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={20} className="text-yellow-400" />
                <h3 className="font-black text-lg text-white">
                  {modalLegal === 'terms' && 'Termos de Uso & Licença de Software'}
                  {modalLegal === 'privacy' && 'Política de Privacidade e Proteção de Dados (LGPD)'}
                  {modalLegal === 'security' && 'Declaração de Segurança da Informação & Criptografia'}
                  {modalLegal === 'compliance' && 'Programa de Governança, Ética e Compliance'}
                </h3>
              </div>
              <button 
                onClick={() => setModalLegal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300 leading-relaxed font-normal">
              {modalLegal === 'terms' && (
                <>
                  <p className="font-bold text-white">1. Objeto e Natureza dos Serviços</p>
                  <p>O SchoolVan é uma plataforma de software como serviço (SaaS) destinada à organização operacional, comunicação de rotas, chamadas de embarque e facilitação de cobranças para transportadores escolares independentes e empresas de fretamento escolar.</p>
                  
                  <p className="font-bold text-white pt-2">2. Responsabilidade sobre o Transporte</p>
                  <p>A plataforma SchoolVan não é proprietária de veículos nem empregadora de motoristas. Cada condutor parceiro é individualmente responsável pela obtenção e manutenção de seu alvará municipal, vistorias obrigatórias e seguro de passageiros (APP).</p>

                  <p className="font-bold text-white pt-2">3. Planos e Vencimentos</p>
                  <p>O plano Gratuito contempla até 25 alunos cadastrados em 1 van. Planos pagos (Pro e Frota) têm faturamento mensal unificado todo dia 10 e podem ser cancelados a qualquer momento pelo painel sem fidelidade ou multa contratual.</p>
                </>
              )}

              {modalLegal === 'privacy' && (
                <>
                  <p className="font-bold text-white">1. Compromisso com a Lei Geral de Proteção de Dados (Lei 13.709/2018)</p>
                  <p>Coletamos e processamos exclusivamente os dados necessários para o cumprimento da rota escolar: nome do aluno, telefone dos responsáveis, escola e endereço de embarque/desembarque.</p>

                  <p className="font-bold text-white pt-2">2. Proteção de Dados de Crianças e Adolescentes</p>
                  <p>Os dados de menores são tratados no seu melhor interesse (Art. 14 da LGPD), mediante consentimento do responsável legal. Nunca vendemos, alugamos ou compartilhamos dados com terceiros para fins de marketing ou publicidade.</p>

                  <p className="font-bold text-white pt-2">3. Direitos do Titular</p>
                  <p>A qualquer momento, o responsável legal pode solicitar a retificação, anonimização ou exclusão definitiva de seus dados enviando mensagem para privacidade@schoolvan.com.br.</p>
                </>
              )}

              {modalLegal === 'security' && (
                <>
                  <p className="font-bold text-white">1. Criptografia e Armazenamento em Nuvem</p>
                  <p>Todos os dados trafegam sob protocolo seguro HTTPS com criptografia TLS 1.3. O banco de dados em repouso utiliza padrão militar AES-256 no Google Cloud Platform com isolamento por organização.</p>

                  <p className="font-bold text-white pt-2">2. Autenticação e Controle de Sessão</p>
                  <p>O acesso de motoristas e responsáveis é autenticado com tokens seguros e expiração controlada. Monitores e ajudantes recebem credenciais restritas sem acesso a relatórios financeiros ou chaves Pix.</p>

                  <p className="font-bold text-white pt-2">3. Backups e Continuidade de Negócios</p>
                  <p>São realizados backups contínuos distribuídos em múltiplos data centers para garantir restauração instantânea em caso de contingência com 99.98% de disponibilidade.</p>
                </>
              )}

              {modalLegal === 'compliance' && (
                <>
                  <p className="font-bold text-white">1. Código de Ética e Transparência</p>
                  <p>O SchoolVan opera com tolerância zero para fraudes, concorrência desleal ou práticas ilícitas. Fomentamos a formalização do setor de transporte escolar e o respeito mútuo entre condutores e famílias.</p>

                  <p className="font-bold text-white pt-2">2. Canal de Ouvidoria</p>
                  <p>Sugestões, denúncias ou relatos sobre desconformidades éticas podem ser encaminhados diretamente ao comitê de conformidade pelo e-mail ouvidoria@schoolvan.com.br.</p>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setModalLegal(null)}
                className="px-5 py-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black rounded-xl text-xs transition-colors cursor-pointer"
              >
                Entendido, Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
