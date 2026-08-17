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
  CreditCard,
  FileText,
  ExternalLink
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
}

export function BillingRuleModal({ isOpen, onClose, student, financeStatus = 'Em Dia' }: BillingRuleModalProps) {
  const { profile } = useAuth();
  
  const currentDay = new Date().getDate();
  const paymentDay = student?.paymentDay || 10;
  
  // Recommended stage by T.IA
  const recommendedStage = useMemo(() => {
    return calculateStudentBillingStage(paymentDay, financeStatus === 'Em Atraso' ? 'Em Atraso' : 'Em Dia', currentDay);
  }, [paymentDay, financeStatus, currentDay]);

  const [selectedStageKey, setSelectedStageKey] = useState<BillingStageKey>(recommendedStage);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  
  // Asaas Instant Generation State
  const [generatingAsaas, setGeneratingAsaas] = useState<boolean>(false);
  const [asaasData, setAsaasData] = useState<{
    invoiceUrl?: string;
    bankSlipUrl?: string;
    pixQrCode?: string;
    pixCopiaECola?: string;
  } | null>(null);

  // Sync selected stage when modal opens or recommendation changes
  React.useEffect(() => {
    if (isOpen) {
      setSelectedStageKey(recommendedStage);
      setAsaasData(null);
    }
  }, [isOpen, recommendedStage]);

  const formattedData = useMemo(() => {
    if (!student) {
      return { messageText: '', pixCopiaECola: '' };
    }

    const baseData = formatBillingMessage({
      stageKey: selectedStageKey,
      studentName: student.name,
      parentName: student.parentName || 'Responsável',
      driverName: profile?.name || 'Tio da Van',
      value: student.value || 350,
      paymentDay: student.paymentDay || 10,
      pixKey: asaasData?.pixCopiaECola || profile?.pixKey || '',
      driverCity: profile?.city || 'São Paulo'
    });

    if (asaasData?.invoiceUrl) {
      baseData.messageText += `\n\n📄 *Link da Fatura Digital / Boleto:* ${asaasData.invoiceUrl}`;
    }

    return baseData;
  }, [student, selectedStageKey, profile, asaasData]);

  if (!isOpen || !student) return null;

  const handleGenerateAsaasCharge = async () => {
    setGeneratingAsaas(true);
    try {
      const dueDate = new Date();
      dueDate.setDate(paymentDay);
      if (dueDate.getDate() < currentDay) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }

      const res = await fetch('/api/asaas/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: student.parentName || `Responsável de ${student.name}`,
          customerPhone: student.parentPhone || student.tel1 || '',
          value: student.value || 350,
          dueDate: dueDate.toISOString().split('T')[0],
          description: `Mensalidade Transporte Escolar - ${student.name}`,
          billingType: 'PIX',
          splitFee: 1.50
        })
      });

      const data = await res.json();
      if (data.success) {
        setAsaasData({
          invoiceUrl: data.invoiceUrl,
          bankSlipUrl: data.bankSlipUrl,
          pixQrCode: data.pixQrCode,
          pixCopiaECola: data.pixCopiaECola
        });
        toast.success('Cobrança Asaas com Pix gerada com sucesso!');
      } else {
        toast.error(data.error || 'Não foi possível gerar no Asaas. Usando Pix manual.');
      }
    } catch (err) {
      toast.error('Erro de conexão com Asaas. Usando Pix manual.');
    } finally {
      setGeneratingAsaas(false);
    }
  };

  const handleCopyPix = () => {
    const codeToCopy = asaasData?.pixCopiaECola || formattedData.pixCopiaECola;
    if (!codeToCopy && !profile?.pixKey) {
      toast.error('Cadastre sua chave Pix em "Meu Perfil" primeiro.');
      return;
    }
    navigator.clipboard.writeText(codeToCopy);
    setCopiedKey(true);
    toast.success('Pix Copia e Cola copiado!');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(formattedData.messageText);
    setCopiedText(true);
    toast.success('Mensagem da T.IA copiada!');
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

  const activeStageConfig = BILLING_STAGES[selectedStageKey];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-gray-950 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-yellow-400 text-gray-950 flex items-center justify-center shadow-md">
              <Bot size={20} className="fill-gray-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Régua de Cobrança T.IA</h3>
                <span className="text-[10px] font-black bg-yellow-400 text-gray-950 px-2 py-0.5 rounded-full uppercase">
                  WhatsApp + Pix
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
              <span className="text-[10px] text-gray-500 font-bold uppercase">Status</span>
              <p className={cn("text-xs font-black mt-0.5", financeStatus === 'Em Atraso' ? "text-red-600" : "text-emerald-700")}>
                {financeStatus}
              </p>
            </div>
          </div>

          {/* Recommended Stage Notice */}
          <div className="flex items-center justify-between bg-yellow-50 p-3 rounded-2xl border border-yellow-200">
            <div className="flex items-center gap-2 text-yellow-950 font-bold">
              <Sparkles size={16} className="text-yellow-600 shrink-0" />
              <span>Etapa sugerida hoje (Dia {currentDay}): <strong>{BILLING_STAGES[recommendedStage].shortLabel}</strong></span>
            </div>
          </div>

          {/* Stage Selector Pills */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-700 uppercase tracking-wider block">
              Selecione o Estágio da Mensagem:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {(Object.keys(BILLING_STAGES) as BillingStageKey[]).map(key => {
                const isSelected = selectedStageKey === key;
                const stage = BILLING_STAGES[key];

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedStageKey(key)}
                    className={cn(
                      "p-2 rounded-xl text-left border transition-all cursor-pointer",
                      isSelected 
                        ? "bg-gray-950 text-yellow-400 border-gray-950 font-black shadow-sm" 
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 font-semibold"
                    )}
                  >
                    <div className="text-[9px] opacity-70 uppercase">Etapa {stage.stepNumber}</div>
                    <div className="text-[11px] truncate">{stage.shortLabel}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Asaas Integration Callout & Trigger */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 p-3.5 rounded-2xl border border-blue-200/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CreditCard size={16} />
              </div>
              <div>
                <span className="text-[11px] font-black text-blue-950 block">Cobrança Registrada Asaas (Pix + Boleto)</span>
                <span className="text-[10px] text-blue-700">Gera link de pagamento oficial com baixa automática via Webhook</span>
              </div>
            </div>
            <button
              type="button"
              disabled={generatingAsaas}
              onClick={handleGenerateAsaasCharge}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-[11px] flex items-center gap-1.5 shrink-0 transition-all cursor-pointer disabled:opacity-50"
            >
              {generatingAsaas ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles size={13} />
              )}
              <span>{asaasData ? 'Regerar no Asaas' : 'Gerar com Asaas'}</span>
            </button>
          </div>

          {/* WhatsApp Balloon Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-700">
              <span>Prévia da Mensagem (WhatsApp)</span>
              <button
                onClick={handleCopyMessage}
                className="text-yellow-700 hover:text-yellow-900 flex items-center gap-1 font-black cursor-pointer"
              >
                {copiedText ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedText ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>

            <div className="bg-[#EFEAE2] p-3.5 rounded-2xl border border-gray-200">
              <div className="bg-white rounded-xl p-3 shadow-xs text-[11px] text-gray-900 whitespace-pre-wrap leading-relaxed">
                {formattedData.messageText}
              </div>
            </div>
          </div>

          {/* Pix Copia e Cola Block */}
          <div className="bg-gray-950 text-white p-3.5 rounded-2xl border border-yellow-400/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-yellow-400 uppercase tracking-wider flex items-center gap-1">
                <QrCode size={13} /> {asaasData ? 'Pix Oficial Asaas (Baixa Automática)' : 'Pix Copia e Cola Gerado Automaticamente'}
              </span>
              <button
                onClick={handleCopyPix}
                className="px-2.5 py-0.5 bg-yellow-400 text-gray-950 hover:bg-yellow-300 font-black rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-all active:scale-95"
              >
                {copiedKey ? <Check size={11} /> : <Copy size={11} />}
                <span>{copiedKey ? 'Copiado' : 'Copiar Pix'}</span>
              </button>
            </div>
            
            <div className="p-2 bg-gray-900 rounded-lg font-mono text-[10px] text-emerald-400 break-all select-all">
              {asaasData?.pixCopiaECola || formattedData.pixCopiaECola}
            </div>

            {asaasData?.invoiceUrl && (
              <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-[11px]">
                <span className="text-gray-300">Fatura Digital / Boleto Online:</span>
                <a 
                  href={asaasData.invoiceUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-yellow-400 hover:underline font-bold flex items-center gap-1"
                >
                  <span>Abrir Fatura</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-100 transition-all cursor-pointer text-xs"
          >
            Fechar
          </button>

          <button
            onClick={handleSendWhatsApp}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer text-xs"
          >
            <Send size={15} />
            <span>Disparar WhatsApp com Pix</span>
          </button>
        </div>

      </div>
    </div>
  );
}
