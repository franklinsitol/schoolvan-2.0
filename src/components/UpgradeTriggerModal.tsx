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
  ShieldCheck,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { playBusHornSound, speakTiaPrompt } from '../lib/sound';
import toast from 'react-hot-toast';

interface UpgradeTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string; // e.g., 'limit_students' | 'multi_vehicle' | 'multi_vehicle_pro' | 'extra_vehicle' | 'team_monitors' | 'ai_route'
  studentCount?: number;
  onOpenPixCheckout?: (plan: 'Pro' | 'Frota') => void;
  onConfirmAutoAdd?: () => void;
}

export function UpgradeTriggerModal({ 
  isOpen, 
  onClose, 
  reason = 'limit_students',
  studentCount = 25,
  onOpenPixCheckout,
  onConfirmAutoAdd
}: UpgradeTriggerModalProps) {
  const { profile } = useAuth();
  const isVehicleUpgrade = reason === 'multi_vehicle' || reason === 'multi_vehicle_pro' || reason === 'extra_vehicle';
  const isExtraVehicle = reason === 'extra_vehicle';
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'enterprise'>(isVehicleUpgrade ? 'enterprise' : 'pro');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Update selected plan when reason changes
  useEffect(() => {
    if (reason === 'multi_vehicle' || reason === 'multi_vehicle_pro' || reason === 'extra_vehicle') {
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
  const extraVehiclePrice = 79.90;
  const totalFrotaExtraCost = frotaCost + extraVehiclePrice; // R$ 228,90
  const proRevenueRatio = ((proCost / estimatedMonthlyRevenue) * 100).toFixed(1);

  const getReasonTitle = () => {
    switch (reason) {
      case 'extra_vehicle':
        return `Tio ${firstName}, 4ª Van Pronta para Ativação! 🚐✨`;
      case 'multi_vehicle':
        return `Tio ${firstName}, sua frota tá crescendo! 🚐💨`;
      case 'multi_vehicle_pro':
        return `Hora de expandir para o Plano Frota, Tio ${firstName}! 🚐🏢`;
      case 'team_monitors':
        return `Tio ${firstName}, equipe e monitores liberados no Plano Pro! 👥📲`;
      case 'ai_route':
        return `Tio ${firstName}, rota inteligente com economia de diesel! 📍⛽`;
      default:
        return `Tio ${firstName}, van cheia! Limite de ${studentCount} alunos atingido! 🎒✨`;
    }
  };

  const getSpeechMessage = () => {
    switch (reason) {
      case 'extra_vehicle':
        return `Tio ${firstName}, você está adicionando uma nova van para sua frota! Seu Plano Frota inclui 3 vans completas. Cada van adicional custa apenas R$ 79,90 por mês. Vamos liberar sua van agora mesmo sem você precisar parar, e a cobrança proporcional virá unificada na sua fatura com vencimento no dia 10!`;
      case 'multi_vehicle':
        return `Tio ${firstName}, no Plano Gratuito você pode ter 1 van cadastrada. Para gerenciar várias vans e motoristas simultâneos, faça o upgrade para o Plano Frota!`;
      case 'multi_vehicle_pro':
        return `Tio ${firstName}, o Plano Pro inclui 1 van com alunos ilimitados. Para expandir para até 3 vans ou mais, faça o upgrade para o Plano Frota!`;
      case 'team_monitors':
        return `Tio ${firstName}, o cadastro de monitores e motoristas colaboradores com controle de embarque pelo celular está disponível no Plano Pro!`;
      case 'ai_route':
        return `Tio ${firstName}, para calcular a melhor rota com GPS automático e economizar até 20% de combustível, venha para o Plano Pro!`;
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

  const activePlanPrice = selectedPlan === 'pro' ? proCost : frotaCost;
  const activePlanName = selectedPlan === 'pro' ? 'Pro' : 'Frota';

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end items-center px-3 sm:px-4 pb-3 sm:pb-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div 
        initial={{ scale: 0.92, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 30 }}
        transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
        className="w-full max-w-xl relative flex flex-col items-start gap-2.5 my-auto sm:my-0 sm:mb-2 max-h-[92vh]"
      >
        {/* 💬 BALÃO DE CONVERSA PRINCIPAL DA T.IA (ESTILO ONBOARDING COM RABICHO APONTANDO PARA A T.IA) */}
        <div className="bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white w-full rounded-3xl shadow-2xl border-2 border-yellow-400 overflow-hidden relative flex flex-col">
          
          {/* Bubble Tail Notch pointing DOWN towards the T.IA floating button */}
          <div className="absolute -bottom-2.5 left-8 sm:left-10 w-5 h-5 bg-gray-950 border-r-2 border-b-2 border-yellow-400 transform rotate-45 z-30" />

          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white rounded-full transition-all z-30 cursor-pointer shadow-sm"
            title="Fechar balão"
          >
            <X size={18} />
          </button>

          {/* BALÃO HEADER (T.IA AVATAR + FALA) */}
          <div className="p-4 sm:p-5 border-b border-yellow-400/20 bg-gradient-to-r from-yellow-500/10 via-transparent to-yellow-500/5 relative">
            <div className="flex items-start gap-3">
              {/* T.IA Avatar Icon with Active Ping Status */}
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-2xl bg-yellow-400 text-gray-950 flex items-center justify-center font-black shadow-lg border-2 border-yellow-300">
                  <Bot size={24} className="animate-bounce" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-80"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 border-2 border-gray-950 items-center justify-center text-[9px] font-black text-white">
                    !
                  </span>
                </span>
              </div>

              {/* Title & Speech Controls */}
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-xs font-black uppercase tracking-wider text-yellow-400 flex items-center gap-1">
                    <Sparkles size={13} className="text-yellow-400" /> Copiloto T.IA • Aviso da Van
                  </span>
                  <span className="bg-yellow-400 text-gray-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1 shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Notificação
                  </span>
                </div>

                <h2 className="text-base sm:text-lg font-black text-white leading-tight">
                  {getReasonTitle()}
                </h2>
              </div>
            </div>

            {/* Fala real da T.IA em citação amarela */}
            <div className="mt-3 bg-yellow-400/10 border-l-4 border-yellow-400 p-3 rounded-r-xl text-xs sm:text-sm font-medium text-gray-100 leading-relaxed relative shadow-inner">
              <p className="italic">
                "{getSpeechMessage()}"
              </p>

              {/* Botão de Áudio da T.IA */}
              <div className="mt-2.5 flex items-center justify-between">
                <button
                  onClick={handleSpeakTia}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-gray-950 text-xs font-black rounded-lg shadow-sm cursor-pointer transition-all active:scale-95"
                >
                  <Volume2 size={14} className={isSpeaking ? 'animate-bounce text-gray-950' : 'text-gray-950'} />
                  <span>{isSpeaking ? 'Ouvindo T.IA...' : 'Ouvir Mensagem'}</span>
                </button>

                <span className="text-[11px] text-gray-400">
                  💡 Liberação 100% imediata
                </span>
              </div>
            </div>

            {/* ROI da Van */}
            <div className="mt-3 bg-gray-900/90 border border-yellow-400/20 p-2.5 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">💰</span>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-black">Faturamento da sua Van</div>
                  <div className="text-white font-bold">~R$ {estimatedMonthlyRevenue.toLocaleString('pt-BR')}/mês</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-gray-400 uppercase font-black">
                  {selectedPlan === 'enterprise' ? 'Plano Frota Pro' : 'Plano Pro'}
                </div>
                <div className="text-yellow-400 font-black">
                  R$ {activePlanPrice}/mês ({((activePlanPrice / estimatedMonthlyRevenue) * 100).toFixed(1)}% do ganho)
                </div>
              </div>
            </div>
          </div>

          {/* PLAN SELECTION & ACTIONS */}
          <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto">
            {isExtraVehicle ? (
              <div className="space-y-3.5">
                <div className="bg-gray-900/90 border border-yellow-400/40 p-4 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs border-b border-gray-800 pb-2">
                    <span className="text-gray-300 font-medium">Plano Frota Pro (Até 3 Vans Inclusas):</span>
                    <span className="text-white font-bold">R$ 149,00/mês</span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-b border-gray-800 pb-2">
                    <span className="text-yellow-400 font-bold flex items-center gap-1">
                      <Plus size={14} className="text-yellow-400" /> 1x Van Adicional (4ª van em diante):
                    </span>
                    <span className="text-yellow-400 font-black">+ R$ 79,90/mês</span>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-1">
                    <div>
                      <span className="text-white font-black block">Nova Mensalidade Consolidada:</span>
                      <span className="text-[11px] text-gray-400">Vencimento unificado todo dia 10</span>
                    </div>
                    <span className="text-xl font-black text-yellow-400">R$ {totalFrotaExtraCost.toFixed(2).replace('.', ',')}<span className="text-xs text-gray-400 font-normal">/mês</span></span>
                  </div>
                </div>

                <div className="bg-emerald-950/40 border border-emerald-500/30 p-3 rounded-xl flex items-start gap-2.5 text-xs text-emerald-200">
                  <Sparkles size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-bold">Liberação Imediata na Prática!</strong>
                    Você não precisa pagar nada agora para cadastrar. A van é ativada no mesmo instante e o valor proporcional deste mês será adicionado à sua fatura mensal do <strong>dia 10</strong>.
                  </div>
                </div>

                {/* PRIMARY AUTO ADD BUTTON */}
                <button
                  onClick={() => {
                    onClose();
                    if (onConfirmAutoAdd) {
                      onConfirmAutoAdd();
                    }
                  }}
                  className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-sm sm:text-base shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 border-2 border-yellow-300"
                >
                  <Zap size={18} className="text-gray-950 fill-gray-950" />
                  <span>Liberar e Cadastrar Nova Van Agora</span>
                  <ArrowRight size={18} />
                </button>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    onClick={() => {
                      if (onOpenPixCheckout) {
                        onClose();
                        onOpenPixCheckout('Frota');
                      }
                    }}
                    className="text-xs text-yellow-400 hover:underline font-bold py-1"
                  >
                    Ver dados Pix
                  </button>
                  <button
                    onClick={() => handleWhatsAppUpgrade('Frota Pro (+ Van Extra)', `R$ ${totalFrotaExtraCost.toFixed(2).replace('.', ',')}`)}
                    className="text-xs text-gray-400 hover:text-white font-bold py-1 flex items-center gap-1 cursor-pointer"
                  >
                    <MessageSquare size={13} /> Tirar dúvidas no WhatsApp
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center justify-between">
                  <span>Selecione o plano desejado:</span>
                  <span className="text-yellow-400 text-[11px]">Pix Copia e Cola instantâneo</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* PLAN PRO */}
                  <div 
                    onClick={() => setSelectedPlan('pro')}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      selectedPlan === 'pro' 
                        ? 'border-yellow-400 bg-yellow-400/10 shadow-lg ring-1 ring-yellow-400/30' 
                        : 'border-gray-800 bg-gray-900/60 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        selectedPlan === 'pro' ? 'bg-yellow-400 text-gray-950' : 'bg-gray-800 text-gray-400'
                      }`}>
                        1 Van Principal
                      </span>
                      {selectedPlan === 'pro' && (
                        <CheckCircle2 size={18} className="text-yellow-400" />
                      )}
                    </div>
                    <h3 className="text-sm font-black text-white mt-1">Plano Pro</h3>
                    <div className="mt-0.5 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-white">R$ {proCost}</span>
                      <span className="text-xs text-gray-400 font-bold">/mês</span>
                    </div>
                    <ul className="mt-2.5 space-y-1 text-xs text-gray-200">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        <span><strong>Alunos Ilimitados</strong></span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        <span>1 Van Escolar inclusa</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        <span>Monitores & Colaboradores</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        <span>Cobrança Automática Zap</span>
                      </li>
                    </ul>
                  </div>

                  {/* PLAN FROTA PRO */}
                  <div 
                    onClick={() => setSelectedPlan('enterprise')}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      selectedPlan === 'enterprise' 
                        ? 'border-yellow-400 bg-yellow-400/10 shadow-lg ring-1 ring-yellow-400/30' 
                        : 'border-gray-800 bg-gray-900/60 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        selectedPlan === 'enterprise' ? 'bg-yellow-400 text-gray-950' : 'bg-gray-800 text-gray-400'
                      }`}>
                        {isVehicleUpgrade ? 'Recomendado para Você' : 'Para Frotas'}
                      </span>
                      {selectedPlan === 'enterprise' && (
                        <CheckCircle2 size={18} className="text-yellow-400" />
                      )}
                    </div>
                    <h3 className="text-sm font-black text-white mt-1">Plano Frota Pro</h3>
                    <div className="mt-0.5 flex items-baseline gap-1">
                      <span className="text-2xl font-black text-white">R$ {frotaCost}</span>
                      <span className="text-xs text-gray-400 font-bold">/mês</span>
                    </div>
                    <ul className="mt-2.5 space-y-1 text-xs text-gray-200">
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        <span><strong>Alunos Ilimitados</strong></span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        <span><strong>Até 3 Vans Inclusas</strong></span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        <span>Motoristas & Equipe Ilimitada</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                        <span>Otimizador Inteligente GPS</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* ACTION BUTTONS */}
                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => {
                      if (onOpenPixCheckout) {
                        onClose();
                        onOpenPixCheckout(activePlanName);
                      } else {
                        handleWhatsAppUpgrade(
                          activePlanName === 'Pro' ? 'Pro' : 'Frota Pro',
                          activePlanName === 'Pro' ? `R$ ${proCost}/mês` : `R$ ${frotaCost}/mês`
                        );
                      }
                    }}
                    className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-sm sm:text-base shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 border-2 border-yellow-300"
                  >
                    <Zap size={18} className="text-gray-950 fill-gray-950" />
                    <span>Assinar Plano {activePlanName} (R$ {activePlanPrice}/mês via Pix)</span>
                    <ArrowRight size={18} />
                  </button>

                  <button
                    onClick={() => handleWhatsAppUpgrade(
                      activePlanName === 'Pro' ? 'Pro' : 'Frota Pro',
                      `R$ ${activePlanPrice}`
                    )}
                    className="w-full py-1 text-xs text-gray-400 hover:text-white font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <MessageSquare size={14} /> Falar com o suporte no WhatsApp para tirar dúvidas
                  </button>

                  <p className="text-[10px] text-center text-gray-400 flex items-center justify-center gap-1">
                    <ShieldCheck size={12} className="text-emerald-400" />
                    Liberação instantânea via Pix. Sem fidelidade, cancele quando quiser.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 🚀 BOTÃO FLUTUANTE DA T.IA COM SINAL DE NOTIFICAÇÃO (ONDE O RABICHO DO BALÃO APONTA) */}
        <div className="w-full flex items-center justify-between gap-2 bg-gray-950/95 backdrop-blur-md p-2 rounded-2xl sm:rounded-full shadow-2xl border-2 border-yellow-400">
          {/* Active Glowing T.IA Button Pill with Notification Indicator */}
          <div className="relative px-3.5 py-2.5 bg-yellow-400 text-gray-950 font-black rounded-xl sm:rounded-full shadow-lg flex items-center justify-center gap-1.5 ring-4 ring-yellow-400/50 text-xs shrink-0">
            <Bot size={18} className="shrink-0 text-gray-950 animate-bounce" />
            <span className="font-extrabold uppercase tracking-tight">T.IA</span>
            
            {/* Notification Alert Signal Badge */}
            <span className="relative flex h-5 w-5 ml-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-80"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-red-600 text-white font-black text-[10px] items-center justify-center shadow">
                1
              </span>
            </span>

            <span className="px-1.5 py-0.5 bg-gray-950 text-yellow-400 text-[9px] font-black rounded-full ml-1 uppercase hidden sm:inline">
              Aviso Ativo
            </span>
          </div>

          {/* Chamada / Fechar rápida */}
          <button 
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-gray-200 hover:text-white text-xs font-black rounded-xl sm:rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Fechar e continuar no sistema</span>
            <X size={15} className="text-gray-400" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

