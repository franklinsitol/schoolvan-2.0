import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Check, 
  X, 
  Zap, 
  ArrowRight, 
  Users, 
  Bus, 
  Volume2,
  Bot,
  MessageSquare,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { playBusHornSound, speakTiaPrompt } from '../lib/sound';
import toast from 'react-hot-toast';

interface UpgradeTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string; // e.g., 'limit_students' | 'multi_vehicle' | 'multi_vehicle_pro' | 'team_monitors' | 'ai_route'
  studentCount?: number;
  onOpenPixCheckout?: (plan: 'Pro' | 'Frota') => void;
}

export function UpgradeTriggerModal({ 
  isOpen, 
  onClose, 
  reason = 'limit_students',
  studentCount = 25,
  onOpenPixCheckout
}: UpgradeTriggerModalProps) {
  const { profile } = useAuth();
  const isVehicleUpgrade = reason === 'multi_vehicle' || reason === 'multi_vehicle_pro';
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'enterprise'>(isVehicleUpgrade ? 'enterprise' : 'pro');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Update selected plan when reason changes
  useEffect(() => {
    if (reason === 'multi_vehicle' || reason === 'multi_vehicle_pro') {
      setSelectedPlan('enterprise');
    } else {
      setSelectedPlan('pro');
    }
  }, [reason]);

  if (!isOpen || !profile) return null;

  const firstName = profile.name ? profile.name.split(' ')[0] : 'Tio';
  const estimatedMonthlyRevenue = Math.max(studentCount, 25) * 320; // Avg R$ 320 per student
  const customFee = 'customMonthlyFee' in profile ? profile.customMonthlyFee : undefined;
  const proCost = customFee !== undefined && customFee !== null ? customFee : 79;
  const frotaCost = 149;
  const proRevenueRatio = ((proCost / estimatedMonthlyRevenue) * 100).toFixed(1);

  const getReasonTitle = () => {
    switch (reason) {
      case 'multi_vehicle':
        return `Tio ${firstName}, sua van tá bombando e a frota vai crescer! 🚐💨`;
      case 'multi_vehicle_pro':
        return `Parabéns pela expansão, Tio ${firstName}! Hora do Plano Frota! 🚐🏢`;
      case 'team_monitors':
        return `Tio ${firstName}, vamos colocar sua equipe pra rodar com segurança! 👥📲`;
      case 'ai_route':
        return `Tio ${firstName}, hora de economizar combustível com rota inteligente! 📍⛽`;
      default:
        return `Tio ${firstName}, sua van está cheia! Atingiu o limite de ${studentCount} alunos! 🎒✨`;
    }
  };

  const getSpeechMessage = () => {
    switch (reason) {
      case 'multi_vehicle':
        return `Tio ${firstName}, no Plano Gratuito você tem 1 van cadastrada. Para adicionar novas vans e gerenciar motoristas simultâneos, faça o upgrade para o Plano Frota!`;
      case 'multi_vehicle_pro':
        return `Tio ${firstName}, o Plano Pro inclui 1 van completa com alunos ilimitados. Para expandir para até 3 vans ou mais, faça o upgrade para o Plano Frota!`;
      case 'team_monitors':
        return `Tio ${firstName}, o cadastro de monitores e motoristas colaboradores com controle de embarque pelo celular está disponível no Plano Pro!`;
      case 'ai_route':
        return `Tio ${firstName}, para calcular a melhor rota com GPS automático e economizar até 20% de diesel, venha para o Plano Pro!`;
      default:
        return `Tio ${firstName}, parabéns! Você atingiu o limite de 25 alunos no Plano Gratuito. Sua van já é um sucesso! Para cadastrar alunos ilimitados, avisos de cobrança no Zap e controle total, faça o upgrade para o Plano Pro!`;
    }
  };

  const handleSpeakTia = () => {
    playBusHornSound();
    setIsSpeaking(true);
    speakTiaPrompt(getSpeechMessage());
    setTimeout(() => setIsSpeaking(false), 5000);
  };

  const handleWhatsAppUpgrade = (planName: string, price: string) => {
    const msg = `Olá! Gostaria de assinar o *Plano ${planName} (${price}/mês)* no SchoolVan para a minha frota (${profile.name || profile.email}). Pode me enviar os dados para liberação imediata?`;
    window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(msg)}`, '_blank');
    toast.success('Direcionando para ativação no WhatsApp com o nosso Suporte!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
        className="w-full max-w-2xl my-auto relative flex flex-col items-start gap-2"
      >
        {/* T.IA MASCOT & SPEECH AVATAR HEADER */}
        <div className="flex items-center gap-3 pl-2 sm:pl-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-yellow-400 text-gray-950 flex items-center justify-center shadow-lg border-2 border-yellow-300 font-black">
              <Bot size={28} className="animate-bounce" />
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-gray-950"></span>
            </span>
          </div>

          <div className="text-white">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-yellow-400 tracking-wide uppercase">
                T.IA Copiloto
              </span>
              <span className="bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles size={10} /> Mensagem Direta
              </span>
            </div>
            <p className="text-xs text-gray-300">
              Sua assistente inteligente do transporte escolar
            </p>
          </div>
        </div>

        {/* 💬 BALÃO DE CONVERSA PRINCIPAL (SPEECH BALLOON CARD) */}
        <div className="bg-white dark:bg-gray-900 w-full rounded-3xl shadow-2xl overflow-hidden border-2 border-yellow-400/60 dark:border-yellow-400/40 relative">
          {/* Bubble Tail Notch pointing up to T.IA avatar */}
          <div className="absolute -top-2.5 left-6 sm:left-8 w-5 h-5 bg-yellow-400 border-t-2 border-l-2 border-yellow-300 transform rotate-45 z-20" />

          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-full transition-all z-30 cursor-pointer shadow-sm"
            title="Fechar"
          >
            <X size={18} />
          </button>

          {/* SPEECH BALLOON TOP (Amarelo / Notificação) */}
          <div className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 p-5 sm:p-7 text-gray-950 relative">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pr-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-950 text-yellow-400 text-xs font-black rounded-full uppercase tracking-wider shadow">
                <MessageSquare size={13} /> Fala da T.IA
              </div>

              {/* Botão de Ouvir Voz da T.IA */}
              <button
                onClick={handleSpeakTia}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/90 hover:bg-white text-gray-950 text-xs font-black rounded-full shadow-sm cursor-pointer transition-all active:scale-95 border border-black/10"
              >
                <Volume2 size={14} className={isSpeaking ? 'animate-bounce text-amber-600' : 'text-gray-950'} />
                <span>{isSpeaking ? 'Ouvindo T.IA...' : 'Ouvir a T.IA'}</span>
              </button>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
              {getReasonTitle()}
            </h2>

            {/* Fala real em formato de citação amigável */}
            <div className="mt-3 bg-gray-950/10 border-l-4 border-gray-950 p-3 rounded-r-xl text-xs sm:text-sm font-medium text-gray-950 leading-relaxed">
              "{getSpeechMessage()}"
            </div>

            {/* ROI Card da T.IA */}
            <div className="mt-4 bg-gray-950 text-white p-3.5 sm:p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg border border-yellow-400/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-yellow-400 text-gray-950 flex items-center justify-center font-bold shrink-0">
                  💡
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-black tracking-wider">
                    Dica Financeira da T.IA
                  </div>
                  <div className="text-xs text-gray-200">
                    Com {studentCount} alunos, você fatura ~<strong className="text-emerald-400">R$ {estimatedMonthlyRevenue.toLocaleString('pt-BR')}/mês</strong>.
                  </div>
                </div>
              </div>
              <div className="text-right sm:text-right shrink-0">
                <span className="text-xs text-yellow-400 font-black">Plano Pro = R$ 79/mês</span>
                <span className="text-[10px] text-gray-400 block">Apenas <strong className="text-white">{proRevenueRatio}%</strong> do faturamento!</span>
              </div>
            </div>
          </div>

          {/* PLAN SELECTION & ACTIONS */}
          <div className="p-5 sm:p-7 space-y-5">
            <div className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Escolha seu plano para liberação instantânea:
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* PLAN PRO */}
              <div 
                onClick={() => setSelectedPlan('pro')}
                className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                  selectedPlan === 'pro' 
                    ? 'border-yellow-400 bg-yellow-50/70 dark:bg-yellow-950/20 shadow-md ring-2 ring-yellow-400/20' 
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-0.5 bg-yellow-400 text-gray-950 text-[10px] font-black uppercase rounded-full shadow-sm">
                    Recomendado
                  </span>
                </div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">Plano Pro</h3>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">R$ {proCost}</span>
                  <span className="text-xs text-gray-500 font-bold">/mês</span>
                </div>

                <ul className="mt-3.5 space-y-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                    <span><strong>Alunos Ilimitados</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                    <span>1 Van Escolar inclusa</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                    <span>Equipe (Monitores/Colab.) liberada</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                    <span>Cobrança Automática via WhatsApp</span>
                  </li>
                </ul>
              </div>

              {/* PLAN FROTA PRO */}
              <div 
                onClick={() => setSelectedPlan('enterprise')}
                className={`p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                  selectedPlan === 'enterprise' 
                    ? 'border-yellow-400 bg-yellow-50/70 dark:bg-yellow-950/20 shadow-md ring-2 ring-yellow-400/20' 
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
              >
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-0.5 bg-gray-950 text-yellow-400 text-[10px] font-black uppercase rounded-full shadow-sm">
                    Para Frotas
                  </span>
                </div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">Plano Frota Pro</h3>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">R$ 149</span>
                  <span className="text-xs text-gray-500 font-bold">/mês</span>
                </div>

                <ul className="mt-3.5 space-y-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                    <span><strong>Alunos Ilimitados</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                    <span><strong>Até 3 Vans Inclusas</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                    <span>Colaboradores & Motoristas Ilimitados</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                    <span>Otimizador Inteligente de GPS</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="space-y-2.5 pt-1">
              <button
                onClick={() => {
                  if (onOpenPixCheckout) {
                    onClose();
                    onOpenPixCheckout(selectedPlan === 'pro' ? 'Pro' : 'Frota');
                  } else {
                    handleWhatsAppUpgrade(
                      selectedPlan === 'pro' ? 'Pro' : 'Frota Pro',
                      selectedPlan === 'pro' ? 'R$ 79/mês' : 'R$ 149/mês'
                    );
                  }
                }}
                className="w-full py-3.5 sm:py-4 bg-gray-950 text-yellow-400 font-black rounded-2xl text-sm sm:text-base shadow-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 border border-yellow-400/30"
              >
                <Zap size={18} className="text-yellow-400" />
                <span>Assinar Plano {selectedPlan === 'pro' ? 'Pro (R$ 79/mês)' : 'Frota Pro (R$ 149/mês)'}</span>
                <ArrowRight size={18} />
              </button>

              <button
                onClick={() => handleWhatsAppUpgrade(
                  selectedPlan === 'pro' ? 'Pro' : 'Frota Pro',
                  selectedPlan === 'pro' ? 'R$ 79' : 'R$ 149'
                )}
                className="w-full py-2 text-xs text-gray-600 dark:text-gray-400 font-bold hover:text-gray-900 dark:hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageSquare size={14} /> Falar com o suporte no WhatsApp para tirar dúvidas
              </button>

              <p className="text-[11px] text-center text-gray-400 flex items-center justify-center gap-1">
                <ShieldCheck size={13} className="text-emerald-500" />
                Liberação imediata via Pix sem taxa. Cancele a qualquer momento sem fidelidade.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

