import React, { useState, useMemo } from 'react';
import { 
  X, 
  Bot, 
  Send, 
  Copy, 
  Check, 
  QrCode, 
  Calendar, 
  MessageCircle, 
  Sparkles, 
  AlertCircle, 
  FileText, 
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Student, InvoiceStatus } from '../types';
import { 
  BILLING_STAGES, 
  BillingStageKey, 
  calculateStudentBillingStage, 
  formatBillingMessage 
} from '../lib/billingRuleUtils';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface BillingRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  financeStatus?: InvoiceStatus;
  onOpenProfile?: () => void;
}

export function BillingRuleModal({ 
  isOpen, 
  onClose, 
  student, 
  financeStatus = 'Em Dia',
  onOpenProfile 
}: BillingRuleModalProps) {
  const { profile } = useAuth();
  
  const currentDay = new Date().getDate();
  const paymentDay = student?.paymentDay || 10;
  
  // Payment mode toggle: 'pix' (Includes driver's Pix key) vs 'sem_pix' (Polite reminder without specific method)
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'sem_pix'>(
    student?.billingPreference === 'sem_pix' || profile?.billingPreference === 'sem_pix' ? 'sem_pix' : 'pix'
  );

  // Recommended stage
  const recommendedStage = useMemo(() => {
    return calculateStudentBillingStage(paymentDay, financeStatus === 'Em Atraso' ? 'Em Atraso' : 'Em Dia', currentDay);
  }, [paymentDay, financeStatus, currentDay]);

  const [selectedStageKey, setSelectedStageKey] = useState<BillingStageKey>(recommendedStage);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Sync selected stage when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedStageKey(recommendedStage);
      setPaymentMethod(
        student?.billingPreference === 'sem_pix' || profile?.billingPreference === 'sem_pix' ? 'sem_pix' : 'pix'
      );
    }
  }, [isOpen, recommendedStage, student, profile]);

  const formattedData = useMemo(() => {
    if (!student) {
      return { messageText: '', pixString: '', paymentMethod };
    }

    return formatBillingMessage({
      stageKey: selectedStageKey,
      studentName: student.name,
      parentName: student.parentName || 'Responsável',
      driverName: profile?.name || 'Tio(a) da Van',
      value: student.value || 350,
      paymentDay: student.paymentDay || 10,
      pixKey: profile?.pixKey || '',
      paymentMethod
    });
  }, [student, selectedStageKey, profile, paymentMethod]);

  if (!isOpen || !student) return null;

  const handleCopyPix = () => {
    const codeToCopy = formattedData.pixString;
    if (!codeToCopy || codeToCopy.includes('não cadastrada')) {
      toast.error('Cadastre sua chave Pix em "Meu Perfil" primeiro.');
      return;
    }
    navigator.clipboard.writeText(codeToCopy);
    setCopiedKey(true);
    toast.success('Chave Pix copiada com sucesso!');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(formattedData.messageText);
    setCopiedText(true);
    toast.success('Mensagem de cobrança copiada!');
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleSendWhatsApp = () => {
    const phone = (student.parentPhone || student.tel1 || '').replace(/\D/g, '');
    if (!phone) {
      toast.error('Telefone do responsável não cadastrado.');
      return;
    }
    const formattedPhone = phone.length <= 11 ? `55${phone}` : phone;
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(formattedData.messageText)}`;
    window.open(url, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gray-950 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-yellow-400 text-gray-950 flex items-center justify-center shadow-md">
              <MessageCircle size={20} className="fill-gray-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Cobrança de Mensalidade</h3>
                <span className={cn(
                  "text-[10px] font-black px-2 py-0.5 rounded-full uppercase",
                  paymentMethod === 'pix' ? "bg-yellow-400 text-gray-950" : "bg-blue-400 text-gray-950"
                )}>
                  {paymentMethod === 'pix' ? '🟢 Com Chave Pix' : '📋 Sem Chave Pix'}
                </span>
              </div>
              <p className="text-xs text-gray-300">
                Aluno: <strong className="text-yellow-400">{student.name}</strong> • Resp: {student.parentName || 'Responsável'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          
          {/* Quick info row */}
          <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-2xl border border-gray-200">
            <div>
              <span className="text-[10px] text-gray-500 font-bold uppercase">Mensalidade</span>
              <p className="text-sm font-black text-gray-950">R$ {(student.value || 350).toFixed(2).replace('.', ',')}</p>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold uppercase">Vencimento</span>
              <p className="text-sm font-black text-gray-950">Todo dia {paymentDay}</p>
            </div>
            <div>
              <span className="text-[10px] text-gray-500 font-bold uppercase">Status Atual</span>
              <p className={cn("text-xs font-black mt-0.5", financeStatus === 'Em Atraso' ? "text-red-600" : "text-emerald-700")}>
                {financeStatus}
              </p>
            </div>
          </div>

          {/* Forma de Cobrança Toggle: Pix vs Sem Pix */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-800 uppercase tracking-wider block">
              Forma de Cobrança para este Envio:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={cn(
                  "p-3 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between relative",
                  paymentMethod === 'pix'
                    ? "bg-yellow-50/90 border-yellow-400 shadow-sm"
                    : "bg-white border-gray-200 hover:border-gray-300 opacity-80"
                )}
              >
                <div className="flex items-center gap-1.5 font-black text-gray-950 text-xs">
                  <QrCode size={16} className={paymentMethod === 'pix' ? "text-yellow-600" : "text-gray-400"} />
                  <span>🟢 Com Chave Pix</span>
                </div>
                <p className="text-[10px] text-gray-600 mt-1 leading-normal font-medium">
                  Envia o valor com sua <strong>Chave Pix</strong> cadastrada e solicita o comprovante.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('sem_pix')}
                className={cn(
                  "p-3 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between relative",
                  paymentMethod === 'sem_pix'
                    ? "bg-gray-900 border-gray-950 text-white shadow-sm"
                    : "bg-white border-gray-200 hover:border-gray-300 opacity-80"
                )}
              >
                <div className="flex items-center gap-1.5 font-black text-xs">
                  <FileText size={16} className={paymentMethod === 'sem_pix' ? "text-yellow-400" : "text-gray-400"} />
                  <span className={paymentMethod === 'sem_pix' ? "text-white" : "text-gray-950"}>📋 Sem Chave Pix</span>
                </div>
                <p className={cn("text-[10px] mt-1 leading-normal font-medium", paymentMethod === 'sem_pix' ? "text-gray-300" : "text-gray-600")}>
                  Envia um <strong>lembrete amigável</strong> da mensalidade sem fixar forma de pagamento.
                </p>
              </button>
            </div>
          </div>

          {/* Pix Key Details when in Pix Mode */}
          {paymentMethod === 'pix' && (
            <div className="bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-950 flex items-center gap-1.5">
                  <QrCode size={14} className="text-amber-700" />
                  Sua Chave Pix Cadastrada:
                </span>
                {profile?.pixKey && (
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="px-2.5 py-0.5 bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey ? <Check size={11} /> : <Copy size={11} />}
                    <span>{copiedKey ? 'Copiada' : 'Copiar Chave'}</span>
                  </button>
                )}
              </div>

              {profile?.pixKey ? (
                <div className="p-2.5 bg-white rounded-xl border border-amber-200 font-mono text-xs font-bold text-gray-900 break-all select-all flex items-center justify-between">
                  <span>{profile.pixKey}</span>
                  <span className="text-[10px] text-gray-500 font-sans font-normal">Titular: {profile.name || 'Você'}</span>
                </div>
              ) : (
                <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-red-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertCircle size={14} />
                    <span>Nenhuma chave Pix cadastrada no seu perfil!</span>
                  </div>
                  <p className="text-[10px] text-red-700">
                    Cadastre seu CPF, celular ou e-mail na aba "Meu Perfil" para que seus clientes recebam sua chave correta.
                  </p>
                  {onOpenProfile && (
                    <button
                      type="button"
                      onClick={onOpenProfile}
                      className="mt-1 text-[10px] font-black text-red-900 underline cursor-pointer"
                    >
                      Ir para Meu Perfil agora →
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Stage selector */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-800 uppercase tracking-wider flex items-center justify-between">
              <span>Etapa da Régua de Cobrança:</span>
              <span className="text-[10px] text-yellow-800 font-normal">Recomendado pela T.IA para o dia de hoje</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {(Object.keys(BILLING_STAGES) as BillingStageKey[]).map((key) => {
                const stage = BILLING_STAGES[key];
                const isSelected = selectedStageKey === key;
                const isRec = recommendedStage === key;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedStageKey(key)}
                    className={cn(
                      "p-2 rounded-xl text-left border transition-all text-[11px] cursor-pointer flex flex-col justify-between",
                      isSelected
                        ? "bg-gray-950 text-yellow-400 border-gray-950 shadow-sm"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{stage.shortLabel}</span>
                      {isRec && (
                        <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" title="Etapa Recomendada para Hoje" />
                      )}
                    </div>
                    <span className="text-[9px] opacity-70 mt-0.5">{stage.defaultTriggerDays}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview of the formatted message */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <MessageCircle size={14} className="text-emerald-600" />
                <span>Prévia da Mensagem (WhatsApp)</span>
              </label>

              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[10px] font-bold text-gray-600 hover:text-gray-950 flex items-center gap-1 cursor-pointer bg-gray-100 px-2 py-0.5 rounded-md"
              >
                {copiedText ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                <span>{copiedText ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>

            <div className="p-3.5 bg-emerald-50/60 rounded-2xl border border-emerald-200 text-gray-900 whitespace-pre-wrap font-sans text-xs leading-relaxed max-h-48 overflow-y-auto shadow-inner">
              {formattedData.messageText}
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-100 cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Send size={15} />
            <span>Enviar no WhatsApp do Responsável</span>
          </button>
        </div>

      </div>
    </div>
  );
}
