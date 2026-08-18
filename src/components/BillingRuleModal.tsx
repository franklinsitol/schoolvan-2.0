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
  ExternalLink,
  ShieldCheck,
  Zap,
  UserCheck,
  BadgePercent,
  ArrowRight,
  Info
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
  
  // Billing Mode: 'manual' (Driver's own Pix key, 0% fee) or 'schoolvan_pay' (Gateway with automatic reconciliation)
  const [billingMode, setBillingMode] = useState<'manual' | 'schoolvan_pay'>('manual');

  // Recommended stage by T.IA
  const recommendedStage = useMemo(() => {
    return calculateStudentBillingStage(paymentDay, financeStatus === 'Em Atraso' ? 'Em Atraso' : 'Em Dia', currentDay);
  }, [paymentDay, financeStatus, currentDay]);

  const [selectedStageKey, setSelectedStageKey] = useState<BillingStageKey>(recommendedStage);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  
  // Asaas Instant Generation State
  const [billingType, setBillingType] = useState<'PIX' | 'BOLETO' | 'UNDEFINED'>('PIX');
  const [generatingAsaas, setGeneratingAsaas] = useState<boolean>(false);
  const [copiedBoleto, setCopiedBoleto] = useState<boolean>(false);
  const [asaasData, setAsaasData] = useState<{
    invoiceUrl?: string;
    bankSlipUrl?: string;
    pixQrCode?: string;
    pixCopiaECola?: string;
    barCode?: string;
    identificationField?: string;
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
      return { messageText: '', pixString: '', billingMethod: billingMode };
    }

    return formatBillingMessage({
      stageKey: selectedStageKey,
      studentName: student.name,
      parentName: student.parentName || 'Responsável',
      driverName: profile?.name || 'Tio da Van',
      value: student.value || 350,
      paymentDay: student.paymentDay || 10,
      pixKey: profile?.pixKey || '',
      driverCity: profile?.city || 'São Paulo',
      billingMethod: billingMode,
      asaasPixCopiaECola: asaasData?.pixCopiaECola,
      asaasInvoiceUrl: asaasData?.invoiceUrl
    });
  }, [student, selectedStageKey, profile, billingMode, asaasData]);

  if (!isOpen || !student) return null;

  const handleGenerateAsaasCharge = async (type: 'PIX' | 'BOLETO' | 'UNDEFINED' = billingType) => {
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
          billingType: type,
          splitFee: 0.99
        })
      });

      const data = await res.json();
      if (data.success) {
        setAsaasData({
          invoiceUrl: data.invoiceUrl,
          bankSlipUrl: data.bankSlipUrl,
          pixQrCode: data.pixQrCode,
          pixCopiaECola: data.pixCopiaECola,
          barCode: data.barCode,
          identificationField: data.identificationField
        });
        toast.success(`Cobrança (${type === 'BOLETO' ? 'Boleto' : type === 'PIX' ? 'Pix Dinâmico' : 'Fatura'}) gerada no SchoolVan Pay!`);
      } else {
        toast.error(data.error || 'Não foi possível gerar a cobrança online. Usando chave padrão.');
      }
    } catch (err) {
      toast.error('Erro ao conectar com o serviço SchoolVan Pay.');
    } finally {
      setGeneratingAsaas(false);
    }
  };

  const handleCopyPix = () => {
    const codeToCopy = formattedData.pixString;
    if (!codeToCopy || codeToCopy.includes('não cadastrada')) {
      toast.error('Cadastre sua chave Pix em "Meu Perfil" primeiro.');
      return;
    }
    navigator.clipboard.writeText(codeToCopy);
    setCopiedKey(true);
    toast.success(billingMode === 'manual' ? 'Sua Chave Pix foi copiada!' : 'Pix Copia e Cola copiado!');
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
              <Bot size={20} className="fill-gray-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white">Cobrança de Mensalidade</h3>
                <span className="text-[10px] font-black bg-yellow-400 text-gray-950 px-2 py-0.5 rounded-full uppercase">
                  {billingMode === 'manual' ? 'Manual (Sua Chave Pix)' : 'SchoolVan Pay (Baixa Auto)'}
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

          {/* TWO MAIN BILLING CHOICES: MANUAL vs SCHOOLVAN PAY */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-black text-gray-800 uppercase tracking-wider block">
              Como você deseja cobrar este aluno?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              {/* Option 1: Manual Billing */}
              <button
                type="button"
                onClick={() => setBillingMode('manual')}
                className={cn(
                  "p-3 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between relative",
                  billingMode === 'manual'
                    ? "bg-yellow-50/80 border-yellow-400 shadow-sm"
                    : "bg-white border-gray-200 hover:border-gray-300 opacity-80"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-black text-gray-950 text-xs">
                    <UserCheck size={16} className={billingMode === 'manual' ? "text-yellow-600" : "text-gray-400"} />
                    <span>Cobrar Manualmente</span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full">
                    0% Taxa (Grátis)
                  </span>
                </div>
                <p className="text-[10px] text-gray-600 mt-1 leading-normal font-medium">
                  Envia sua <strong>própria chave Pix</strong> cadastrada. O pai manda o comprovante e você altera o status para Em Dia.
                </p>
              </button>

              {/* Option 2: Automated SchoolVan Pay */}
              <button
                type="button"
                onClick={() => {
                  setBillingMode('schoolvan_pay');
                  if (!asaasData) {
                    handleGenerateAsaasCharge(billingType);
                  }
                }}
                className={cn(
                  "p-3 rounded-2xl text-left border-2 transition-all cursor-pointer flex flex-col justify-between relative",
                  billingMode === 'schoolvan_pay'
                    ? "bg-gray-950 text-white border-gray-950 shadow-md"
                    : "bg-white border-gray-200 hover:border-gray-300 opacity-80"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-black text-yellow-400 text-xs">
                    <Zap size={16} className="text-yellow-400" />
                    <span>Cobrar com SchoolVan</span>
                  </div>
                  <span className="px-2 py-0.5 bg-yellow-400 text-gray-950 text-[10px] font-black rounded-full">
                    ⚡ Baixa Automática
                  </span>
                </div>
                <p className={cn("text-[10px] mt-1 leading-normal font-medium", billingMode === 'schoolvan_pay' ? "text-gray-300" : "text-gray-600")}>
                  Gera Pix Dinâmico e Boleto. <strong>O sistema dá baixa automática</strong> no app assim que o pai pagar!
                </p>
              </button>
            </div>
          </div>

          {/* Details for Manual Mode */}
          {billingMode === 'manual' && (
            <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/80 space-y-2">
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

              <p className="text-[10px] text-amber-800 font-medium leading-relaxed">
                ✓ <strong>100% Gratuito (0% de taxa)</strong>: O pagamento cai direto na sua conta bancária sem intermediários.
              </p>
            </div>
          )}

          {/* Details for SchoolVan Pay Mode */}
          {billingMode === 'schoolvan_pay' && (
            <div className="bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/5 p-3.5 rounded-2xl border border-yellow-300/80 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-black text-gray-950 block">Escolha a Forma de Cobrança Online:</span>
                  <span className="text-[10px] text-gray-700">Apenas R$ 0,99 por Pix recebido • Sem mensalidades</span>
                </div>

                <div className="flex items-center gap-1">
                  {(['PIX', 'BOLETO', 'UNDEFINED'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      disabled={generatingAsaas}
                      onClick={() => {
                        setBillingType(type);
                        handleGenerateAsaasCharge(type);
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer",
                        billingType === type
                          ? "bg-gray-950 text-yellow-400 shadow-xs"
                          : "bg-white text-gray-800 border border-gray-200 hover:bg-gray-100"
                      )}
                    >
                      {type === 'PIX' ? '⚡ Pix Dinâmico' : type === 'BOLETO' ? '📄 Boleto' : '🔗 Fatura Digital'}
                    </button>
                  ))}
                </div>
              </div>

              {/* SchoolVan Action status banner */}
              {generatingAsaas ? (
                <div className="p-4 bg-white rounded-xl border border-yellow-300/60 text-center space-y-2">
                  <div className="w-5 h-5 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-[11px] font-bold text-gray-700">Gerando cobrança instantânea com baixa automática no SchoolVan Pay...</p>
                </div>
              ) : asaasData ? (
                <div className="p-2.5 bg-white rounded-xl border border-yellow-300/60 text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between text-gray-900 font-bold">
                    <span className="flex items-center gap-1 text-emerald-700 font-black">
                      <ShieldCheck size={14} /> Cobrança Ativa no SchoolVan Pay
                    </span>
                    {asaasData.invoiceUrl && (
                      <a
                        href={asaasData.invoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-yellow-700 hover:underline flex items-center gap-1 font-black"
                      >
                        <ExternalLink size={12} />
                        <span>Abrir Fatura</span>
                      </a>
                    )}
                  </div>

                  {asaasData.pixCopiaECola && (
                    <div className="pt-1">
                      <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold mb-1">
                        <span>Pix Copia e Cola (Dinâmico):</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(asaasData.pixCopiaECola || '');
                            toast.success('Pix Copia e Cola copiado!');
                          }}
                          className="text-yellow-700 hover:underline"
                        >
                          Copiar Código
                        </button>
                      </div>
                      <div className="p-2 bg-gray-900 text-emerald-400 font-mono text-[9px] rounded-lg break-all select-all">
                        {asaasData.pixCopiaECola}
                      </div>
                    </div>
                  )}

                  {asaasData.identificationField && (
                    <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
                      <span className="text-[10px] text-gray-500 font-mono truncate flex-1 select-all">
                        {asaasData.identificationField}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (asaasData.identificationField) {
                            navigator.clipboard.writeText(asaasData.identificationField);
                            setCopiedBoleto(true);
                            toast.success('Linha digitável do Boleto copiada!');
                            setTimeout(() => setCopiedBoleto(false), 2000);
                          }
                        }}
                        className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-[10px] font-black rounded cursor-pointer"
                      >
                        {copiedBoleto ? 'Copiado!' : 'Copiar Boleto'}
                      </button>
                    </div>
                  )}

                  {asaasData.bankSlipUrl && (
                    <div className="pt-1">
                      <a
                        href={asaasData.bankSlipUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-black text-amber-800 hover:underline"
                      >
                        <FileText size={11} /> Baixar PDF Oficial do Boleto SchoolVan
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-white rounded-xl border border-yellow-200 flex items-center justify-between">
                  <span className="text-[10px] text-gray-600">Clique para emitir com QR Code dinâmico:</span>
                  <button
                    type="button"
                    onClick={() => handleGenerateAsaasCharge(billingType)}
                    className="px-3 py-1.5 bg-yellow-400 text-gray-950 font-black rounded-lg text-[10px] hover:bg-yellow-300 transition-all cursor-pointer"
                  >
                    ⚡ Gerar Cobrança Agora
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Stage Selector Pills */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black text-gray-700 uppercase tracking-wider block">
                Etapa da Mensagem:
              </label>
              <span className="text-[10px] text-gray-500 font-medium">
                Sugerido hoje: <strong>{BILLING_STAGES[recommendedStage].shortLabel}</strong>
              </span>
            </div>
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
            <span>Enviar no WhatsApp ({billingMode === 'manual' ? 'Sua Chave Pix' : 'SchoolVan Pay'})</span>
          </button>
        </div>

      </div>
    </div>
  );
}
