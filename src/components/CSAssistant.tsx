import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Copy, 
  MessageSquare, 
  ArrowRight,
  X,
  Volume2,
  Bot,
  UserX,
  Bus,
  Users
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { Student, AdminConfig, Lead } from '../types';
import { db } from '../lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { isStudentAbsentOnDate } from '../lib/absence';
import { playBusHornSound, speakTioIAPrompt } from '../lib/sound';
import toast from 'react-hot-toast';

interface CSAssistantProps {
  onOpenTioIA?: () => void;
  onOpenUpgradeModal?: (reason: string) => void;
}

export function CSAssistant({ onOpenTioIA, onOpenUpgradeModal }: CSAssistantProps) {
  const { profile } = useAuth();
  const { data: students } = useFirestore<Student>(profile?.id ? `drivers/${profile.id}/students` : '');
  const { data: leads } = useFirestore<Lead>(profile?.id ? `drivers/${profile.id}/leads` : '');
  
  const [adminConfig, setAdminConfig] = useState<AdminConfig | null>(null);
  const [requestingPromise, setRequestingPromise] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [dismissedNotifs, setDismissedNotifs] = useState<string[]>([]);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'adminConfig', 'main'));
        if (snap.exists()) {
          setAdminConfig(snap.data() as AdminConfig);
        }
      } catch (e) {
        console.error("Config fetch error", e);
      }
    };
    fetchConfig();
  }, []);

  if (!profile) return null;

  const currentPlan = profile.plan || 'Gratuito';
  const freeLimit = adminConfig?.freeStudentLimit || 25;
  const activeStudentCount = students.filter(s => s.status !== 'Excluido').length;
  const isNearFreeLimit = currentPlan === 'Gratuito' && activeStudentCount >= freeLimit - 3 && activeStudentCount < freeLimit;
  const isOverFreeLimit = currentPlan === 'Gratuito' && activeStudentCount >= freeLimit;
  const isLate = profile.invoiceStatus === 'Em Atraso';
  const hasActivePromise = profile.paymentPromiseUntil && new Date(profile.paymentPromiseUntil) > new Date();

  // Absent students today
  const absentStudentsToday = students.filter(s => isStudentAbsentOnDate(s, todayStr));

  // Dismiss notification helper
  const dismiss = (id: string) => {
    setDismissedNotifs(prev => [...prev, id]);
  };

  const handleCopyPix = () => {
    const pixKey = adminConfig?.pixAdmin || 'pix@schoolvan.com.br';
    navigator.clipboard.writeText(pixKey);
    setCopiedPix(true);
    toast.success('Chave Pix copiada!');
    setTimeout(() => {
      setCopiedPix(false);
    }, 2000);
  };

  const handleRequestPromise = async () => {
    setRequestingPromise(true);
    try {
      const graceDays = adminConfig?.graceDaysAllowed || 3;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + graceDays);

      await updateDoc(doc(db, 'drivers', profile.id), {
        paymentPromiseUntil: futureDate.toISOString(),
        invoiceStatus: 'Aguardando Pagamento'
      });

      toast.success(`Promessa registrada! Acesso estendido por mais ${graceDays} dias.`);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao registrar promessa.');
    } finally {
      setRequestingPromise(false);
    }
  };

  const playNotifSpeech = (title: string, message: string) => {
    playBusHornSound();
    speakTioIAPrompt(`${title}. ${message}`);
  };

  // Check if we have active notifications
  const hasAbsenceNotifs = absentStudentsToday.length > 0 && !dismissedNotifs.includes('absences');
  const hasBillingNotif = isLate && !hasActivePromise && !dismissedNotifs.includes('billing');
  const hasLimitNotif = (isNearFreeLimit || isOverFreeLimit) && !dismissedNotifs.includes('limit');
  const hasLeadsNotif = leads.length > 0 && !dismissedNotifs.includes('leads');

  if (!hasAbsenceNotifs && !hasBillingNotif && !hasLimitNotif && !hasLeadsNotif && !hasActivePromise) {
    return null;
  }

  return (
    <div className="space-y-4 my-6">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-yellow-400 text-gray-950 flex items-center justify-center font-black shadow-sm">
            <Bot size={18} />
          </div>
          <div>
            <h4 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-1.5">
              Feed de Avisos Ativos do Tio IA
              <span className="px-2 py-0.5 bg-yellow-400/20 text-yellow-800 dark:text-yellow-300 text-[10px] font-bold rounded-full uppercase">
                Em Tempo Real
              </span>
            </h4>
          </div>
        </div>

        {onOpenTioIA && (
          <button
            onClick={onOpenTioIA}
            className="text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-yellow-600 flex items-center gap-1 cursor-pointer bg-white dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
          >
            <MessageSquare size={14} className="text-yellow-500" />
            <span>Falar com Tio IA</span>
          </button>
        )}
      </div>

      {/* 1. ABSENCE NOTIFICATIONS (FALTAS DE HOJE AVISADAS PELOS PAIS) */}
      {hasAbsenceNotifs && (
        <div className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-gray-950 p-5 rounded-3xl shadow-lg relative border-2 border-yellow-300">
          <button 
            onClick={() => dismiss('absences')}
            className="absolute top-3.5 right-3.5 p-1 text-gray-900/60 hover:text-gray-950 bg-black/10 rounded-xl transition-all cursor-pointer"
            title="Ocultar aviso de falta"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 bg-gray-950 text-yellow-400 rounded-2xl flex items-center justify-center shrink-0 shadow">
              <UserX size={24} />
            </div>
            <div className="flex-1 pr-6">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-950 text-yellow-400 text-[10px] font-black uppercase tracking-wider">
                <Bus size={12} /> Tio IA Avisa: Falta Confirmada Hoje
              </div>
              <h3 className="text-base font-black mt-1 text-gray-950">
                {absentStudentsToday.length === 1 ? (
                  <>O pai de <strong>{absentStudentsToday[0].name}</strong> avisou que ele(a) NÃO VAI para a escola hoje!</>
                ) : (
                  <>{absentStudentsToday.length} alunos NÃO VÃO para a escola hoje: <strong>{absentStudentsToday.map(s => s.name).join(', ')}</strong>.</>
                )}
              </h3>
              <p className="text-xs font-medium text-gray-900/90 mt-1">
                Sua rota já foi atualizada para economizar tempo e combustível. Não precisa passar no endereço!
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-950/10 flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={() => playNotifSpeech('Aviso do Tio IA', `Atenção Tio: ${absentStudentsToday.map(s => s.name).join(', ')} não vai hoje para a escola.`)}
              className="px-3.5 py-2 bg-gray-950 text-yellow-400 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow hover:bg-gray-800 transition-all cursor-pointer"
            >
              <Volume2 size={16} /> Ouvir no Tio IA (Buzina + Voz)
            </button>

            {onOpenTioIA && (
              <button
                onClick={onOpenTioIA}
                className="px-3.5 py-2 bg-white/40 hover:bg-white/60 text-gray-950 font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <MessageSquare size={15} /> Ver Detalhes no Chat com Tio IA
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. LATE PAYMENT BILLING NOTICE */}
      {hasBillingNotif && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white p-5 rounded-3xl shadow-xl relative border-2 border-red-300">
          <button 
            onClick={() => dismiss('billing')}
            className="absolute top-3.5 right-3.5 p-1 text-white/70 hover:text-white bg-black/20 rounded-xl transition-all cursor-pointer"
            title="Fechar aviso"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <AlertCircle size={24} className="text-yellow-300 animate-pulse" />
            </div>
            <div className="flex-1 pr-6">
              <span className="bg-white/20 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Aviso de Cobrança do Tio IA
              </span>
              <h3 className="text-base font-black mt-1">
                Tio {profile.name || ''}, sua mensalidade da plataforma venceu!
              </h3>
              <p className="text-xs opacity-90 mt-1">
                Copie a chave Pix para regularizar sua licença do aplicativo e manter seu acesso e avisos aos pais ativos sem pausa.
              </p>
            </div>
          </div>

          <div className="bg-black/20 p-3.5 rounded-2xl mt-3 flex flex-col md:flex-row items-center justify-between gap-3 border border-white/10">
            <div>
              <div className="text-[11px] text-white/70">Chave Pix de Pagamento:</div>
              <div className="font-mono text-sm font-bold text-yellow-300">
                {adminConfig?.pixAdmin || 'pix@schoolvan.com.br'}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={handleCopyPix}
                className="flex-1 md:flex-none px-3.5 py-2 bg-yellow-400 text-gray-950 font-black rounded-xl text-xs hover:bg-yellow-300 transition-all flex items-center justify-center gap-1.5 shadow cursor-pointer"
              >
                {copiedPix ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                {copiedPix ? 'Copiado!' : 'Copiar Pix'}
              </button>

              <button
                onClick={handleRequestPromise}
                disabled={requestingPromise}
                className="flex-1 md:flex-none px-3.5 py-2 bg-white/20 text-white font-bold rounded-xl text-xs hover:bg-white/30 transition-all border border-white/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Clock size={16} />
                +3 Dias Tolerância
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE PROMISE BANNER */}
      {hasActivePromise && (
        <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 p-3.5 rounded-2xl flex items-center justify-between text-blue-900 dark:text-blue-200 text-xs font-bold shadow-sm">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
            <span>
              Acesso temporário concedido pelo Tio IA até{' '}
              {new Date(profile.paymentPromiseUntil!).toLocaleDateString('pt-BR')}.
            </span>
          </div>
          <button onClick={handleCopyPix} className="text-xs font-black underline text-blue-700 dark:text-blue-300 cursor-pointer">
            Copiar Pix
          </button>
        </div>
      )}

      {/* 3. PLAN LIMIT WARNING */}
      {hasLimitNotif && (
        <div className="bg-gradient-to-br from-yellow-400 via-amber-400 to-yellow-500 text-gray-950 p-5 rounded-3xl shadow-lg relative flex flex-col md:flex-row items-center justify-between gap-4">
          <button 
            onClick={() => dismiss('limit')}
            className="absolute top-3.5 right-3.5 p-1 text-gray-950/60 hover:text-gray-950 bg-black/10 rounded-xl transition-all cursor-pointer"
            title="Ocultar aviso"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 bg-gray-950 text-yellow-400 rounded-2xl flex items-center justify-center shrink-0">
              <TrendingUp size={22} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-950 text-yellow-400 text-[10px] font-black uppercase">
                <Sparkles size={12} /> Tio IA Parabeniza Sua Frota!
              </div>
              <h4 className="text-base font-black mt-1">
                Sua van está quase cheia! ({activeStudentCount}/{freeLimit} alunos)
              </h4>
              <p className="text-xs text-gray-900 font-medium mt-0.5">
                Faça upgrade para o Plano Pro e libere alunos e colaboradores ilimitados no seu SchoolVan.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (onOpenUpgradeModal) {
                onOpenUpgradeModal('limit_students');
              } else {
                toast.success('Abra as configurações do seu perfil para fazer o upgrade do plano!');
              }
            }}
            className="w-full md:w-auto px-5 py-2.5 bg-gray-950 text-yellow-400 font-black rounded-xl text-xs shadow-xl hover:bg-gray-800 transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            FAZER UPGRADE PRO <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* 4. NEW MARKETPLACE LEADS */}
      {hasLeadsNotif && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white p-5 rounded-3xl shadow-lg relative flex flex-col md:flex-row items-center justify-between gap-4">
          <button 
            onClick={() => dismiss('leads')}
            className="absolute top-3.5 right-3.5 p-1 text-white/70 hover:text-white bg-black/10 rounded-xl transition-all cursor-pointer"
            title="Ocultar aviso"
          >
            <X size={16} />
          </button>

          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <Users size={22} className="text-white" />
            </div>
            <div>
              <span className="bg-white/20 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Tio IA: Novos Interessados
              </span>
              <h4 className="text-base font-black mt-1">
                Você recebeu {leads.length} pedido(s) de orçamentos de pais!
              </h4>
              <p className="text-xs opacity-90 mt-0.5">
                Acesse a aba "Pedidos de Vagas" para responder os pais direto no WhatsApp.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
