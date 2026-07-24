import React, { useState } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Copy, 
  CreditCard, 
  MessageSquare, 
  Send, 
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { Student, AdminConfig } from '../types';
import { db } from '../lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export function CSAssistant() {
  const { profile } = useAuth();
  const { data: students } = useFirestore<Student>(`drivers/${profile?.id}/students`);
  const [adminConfig, setAdminConfig] = useState<AdminConfig | null>(null);
  const [requestingPromise, setRequestingPromise] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);

  React.useEffect(() => {
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
  const proLimit = adminConfig?.proStudentLimit || 60;
  const activeStudentCount = students.filter(s => s.status !== 'Excluido').length;
  const isNearFreeLimit = currentPlan === 'Gratuito' && activeStudentCount >= freeLimit - 5;
  const isOverFreeLimit = currentPlan === 'Gratuito' && activeStudentCount >= freeLimit;
  const isLate = profile.invoiceStatus === 'Em Atraso';
  const hasActivePromise = profile.paymentPromiseUntil && new Date(profile.paymentPromiseUntil) > new Date();

  const handleCopyPix = () => {
    const pixKey = adminConfig?.pixAdmin || 'pix@schoolvan.com.br';
    navigator.clipboard.writeText(pixKey);
    setCopiedPix(true);
    toast.success('Chave Pix copiada para a área de transferência!');
    setTimeout(() => setCopiedPix(false), 3000);
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

  return (
    <div className="space-y-4 my-6">
      {/* Late Payment Notice + Auto CS Extension */}
      {isLate && !hasActivePromise && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-pink-600 text-white p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
              <AlertCircle size={28} className="text-yellow-300 animate-pulse" />
            </div>
            <div className="flex-1">
              <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Cobrança da Licença SaaS
              </span>
              <h3 className="text-xl font-black mt-2">Sua mensalidade da plataforma venceu!</h3>
              <p className="text-sm opacity-90 mt-1">
                Para manter as rotas e notificações para os pais funcionando sem interrupção, faça o Pix da licença ou solicite a liberação temporária.
              </p>
            </div>
          </div>

          <div className="bg-black/20 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 border border-white/10">
            <div>
              <div className="text-xs text-white/70">Chave Pix de Pagamento:</div>
              <div className="font-mono text-base font-bold text-yellow-300">
                {adminConfig?.pixAdmin || 'pix@schoolvan.com.br'}
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={handleCopyPix}
                className="flex-1 md:flex-none px-4 py-2.5 bg-yellow-400 text-gray-900 font-bold rounded-xl text-xs hover:bg-yellow-300 transition-all flex items-center justify-center gap-1.5 shadow"
              >
                {copiedPix ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                {copiedPix ? 'Copiado!' : 'Copiar Pix'}
              </button>

              <button
                onClick={handleRequestPromise}
                disabled={requestingPromise}
                className="flex-1 md:flex-none px-4 py-2.5 bg-white/20 text-white font-bold rounded-xl text-xs hover:bg-white/30 transition-all border border-white/20 flex items-center justify-center gap-1.5"
              >
                <Clock size={16} />
                +3 Dias de Tolêrancia
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Promise Extended Alert */}
      {hasActivePromise && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center justify-between text-blue-900 text-sm font-bold">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-blue-600 shrink-0" />
            <span>
              Acesso temporário concedido via Promessa de Pagamento até{' '}
              {new Date(profile.paymentPromiseUntil!).toLocaleDateString('pt-BR')}.
            </span>
          </div>
          <button onClick={handleCopyPix} className="text-xs underline text-blue-700">
            Pagar Pix
          </button>
        </div>
      )}

      {/* Upgrade Recommendation Engine (Near Limit or Scaling) */}
      {(isNearFreeLimit || isOverFreeLimit) && (
        <div className="bg-gradient-to-br from-yellow-400 via-amber-400 to-yellow-500 text-gray-900 p-6 rounded-3xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-900 text-yellow-400 rounded-2xl flex items-center justify-center shrink-0">
              <TrendingUp size={24} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gray-900 text-yellow-400 text-[10px] font-black uppercase">
                <Sparkles size={12} /> Sugestão do Assistente CS
              </div>
              <h4 className="text-lg font-black mt-1">
                Sua frota está crescendo! ({activeStudentCount}/{freeLimit} alunos)
              </h4>
              <p className="text-xs text-gray-800 font-medium">
                Você atingiu a marca do plano gratuito. Faça o upgrade para o **Plano Pro** por apenas R$ 79/mês para liberar até {proLimit} alunos e Web Push PWA aos pais!
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const msg = `Olá! Tenho ${activeStudentCount} alunos cadastrados e gostaria de assinar o Plano Pro no SchoolVan por R$79/mês.`;
              window.open(`https://wa.me/5511999999999?text=${encodeURIComponent(msg)}`, '_blank');
            }}
            className="w-full md:w-auto px-6 py-3 bg-gray-900 text-yellow-400 font-bold rounded-2xl text-sm shadow-xl hover:bg-gray-800 transition-all shrink-0 flex items-center justify-center gap-2"
          >
            MIGRAR PARA PLANO PRO <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
