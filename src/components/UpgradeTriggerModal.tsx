import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Check, 
  X, 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  HelpCircle, 
  Users, 
  Bus, 
  Lock, 
  Star,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { Student } from '../types';
import toast from 'react-hot-toast';

interface UpgradeTriggerModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string; // e.g., 'limit_students' | 'multi_vehicle' | 'team_monitors' | 'ai_route'
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

  // Update selected plan when reason changes
  useEffect(() => {
    if (reason === 'multi_vehicle' || reason === 'multi_vehicle_pro') {
      setSelectedPlan('enterprise');
    } else {
      setSelectedPlan('pro');
    }
  }, [reason]);

  if (!isOpen || !profile) return null;

  const estimatedMonthlyRevenue = Math.max(studentCount, 25) * 320; // Avg R$ 320 per student
  const customFee = 'customMonthlyFee' in profile ? profile.customMonthlyFee : undefined;
  const proCost = customFee !== undefined && customFee !== null ? customFee : 79;
  const frotaCost = 149;
  const proRevenueRatio = ((proCost / estimatedMonthlyRevenue) * 100).toFixed(1);

  const getReasonTitle = () => {
    switch (reason) {
      case 'multi_vehicle':
        return 'Sua frota precisa de mais de 1 Van!';
      case 'multi_vehicle_pro':
        return 'Upgrade para o Plano Frota (Até 3 Vans)!';
      case 'team_monitors':
        return 'Gerencie Monitores e Motoristas Colaboradores!';
      case 'ai_route':
        return 'Otimização de Rota por GPS em 1 Clique!';
      default:
        return `Você atingiu o limite de ${studentCount} alunos do Plano Gratuito!`;
    }
  };

  const getReasonDescription = () => {
    switch (reason) {
      case 'multi_vehicle':
        return 'O Plano Gratuito inclui apenas 1 van cadastrada. Faça upgrade para o Plano Pro ou Frota para expandir sua operação escolar!';
      case 'multi_vehicle_pro':
        return 'O Plano Pro inclui 1 van. Faça o upgrade para o Plano Frota para gerenciar até 3 vans inclusas e adicionar vans extras por apenas R$ 79/van!';
      case 'team_monitors':
        return 'Cadastre monitores e motoristas colaboradores com acessos personalizados para controle de embarque e chamada no celular.';
      case 'ai_route':
        return 'Reorganize dezenas de endereços por ordem lógica de horário e distância para economizar até 20% de combustível.';
      default:
        return `Sua frota está crescendo! Para cadastrar alunos ilimitados, notificações e relatórios completos, faça o upgrade para o Plano Pro.`;
    }
  };

  const handleWhatsAppUpgrade = (planName: string, price: string) => {
    const msg = `Olá! Gostaria de assinar o *Plano ${planName} (${price}/mês)* no SchoolVan para a minha frota (${profile.name || profile.email}). Pode me enviar os dados para liberação imediata?`;
    window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(msg)}`, '_blank');
    toast.success('Direcionando para ativação no WhatsApp com o nosso Suporte!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 my-auto relative"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/10 dark:bg-white/10 hover:bg-black/20 text-gray-700 dark:text-gray-200 rounded-full transition-all z-10"
        >
          <X size={20} />
        </button>

        {/* Top Feature Banner */}
        <div className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 p-6 sm:p-8 text-gray-950">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-950 text-yellow-400 text-xs font-black rounded-full uppercase tracking-wider mb-3 shadow">
            <Sparkles size={14} /> Recomendação do CSM Digital
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            {getReasonTitle()}
          </h2>
          <p className="text-sm font-medium text-gray-900 mt-2">
            {getReasonDescription()}
          </p>

          {/* ROI Calculator Card */}
          <div className="mt-5 bg-gray-950 text-white p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl border border-yellow-400/30">
            <div>
              <div className="text-[10px] text-gray-400 uppercase font-black tracking-wider">
                💡 Retorno Sobre Investimento (ROI)
              </div>
              <div className="text-xs text-gray-300 mt-0.5">
                Com {studentCount} alunos, sua receita é de ~<strong className="text-emerald-400">R$ {estimatedMonthlyRevenue.toLocaleString('pt-BR')}/mês</strong>.
              </div>
            </div>
            <div className="text-right sm:text-right shrink-0">
              <span className="text-xs text-yellow-400 font-bold block">Plano Pro = R$ 79/mês</span>
              <span className="text-[10px] text-gray-400 font-medium">Equivale a apenas <strong className="text-white">{proRevenueRatio}%</strong> do seu faturamento!</span>
            </div>
          </div>
        </div>

        {/* Plan Switcher Cards */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* PLAN PRO */}
            <div 
              onClick={() => setSelectedPlan('pro')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                selectedPlan === 'pro' 
                  ? 'border-yellow-400 bg-yellow-50/50 dark:bg-yellow-950/20 shadow-lg' 
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
              }`}
            >
              <div className="absolute top-3 right-3">
                <span className="px-2.5 py-0.5 bg-yellow-400 text-gray-950 text-[10px] font-black uppercase rounded-full">
                  Mais Popular
                </span>
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Plano Pro</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-black text-gray-900 dark:text-white">R$ {proCost}</span>
                <span className="text-xs text-gray-500 font-bold">/mês</span>
              </div>

              <ul className="mt-4 space-y-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  Alunos Ilimitados
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  1 Van Escolar
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  Colaboradores (Monitores/Motoristas) Liberados
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  Avisos Push & WhatsApp Nativo
                </li>
              </ul>
            </div>

            {/* PLAN ENTERPRISE */}
            <div 
              onClick={() => setSelectedPlan('enterprise')}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative ${
                selectedPlan === 'enterprise' 
                  ? 'border-yellow-400 bg-yellow-50/50 dark:bg-yellow-950/20 shadow-lg' 
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
              }`}
            >
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Plano Frota Pro</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-black text-gray-900 dark:text-white">R$ 149</span>
                <span className="text-xs text-gray-500 font-bold">/mês</span>
              </div>

              <ul className="mt-4 space-y-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  Alunos Ilimitados
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  3 Vans Inclusas (+R$ 79/van extra)
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  Colaboradores Ilimitados
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  Otimizador Inteligente de GPS
                </li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
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
              className="w-full py-4 bg-gray-950 text-yellow-400 font-black rounded-2xl text-base shadow-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 border border-yellow-400/20"
            >
              <Zap size={20} className="text-yellow-400" />
              Assinar Plano {selectedPlan === 'pro' ? 'Pro (R$ 79/mês)' : 'Frota Pro (R$ 149/mês)'} <ArrowRight size={20} />
            </button>

            <button
              onClick={() => handleWhatsAppUpgrade(
                selectedPlan === 'pro' ? 'Pro' : 'Frota Pro',
                selectedPlan === 'pro' ? 'R$ 79' : 'R$ 149'
              )}
              className="w-full py-2.5 text-xs text-gray-600 dark:text-gray-400 font-bold hover:text-gray-900 dark:hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Prefere tirar dúvidas pelo WhatsApp antes? Clique aqui
            </button>

            <p className="text-[11px] text-center text-gray-400">
              🔒 Liberação imediata após confirmação Pix SchoolVan. Sem fidelidade, cancele quando quiser.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
