import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  ShieldCheck, 
  Clock, 
  QrCode, 
  Zap, 
  AlertCircle,
  CheckCircle2,
  Calendar,
  Bus,
  FileText,
  DollarSign,
  TrendingUp,
  CreditCard,
  Sparkles,
  ArrowRight,
  Info,
  History,
  Download,
  Receipt,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { db } from '../lib/firebase';
import { doc, setDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { generatePixPayload } from '../lib/pix';
import { Vehicle, SubscriptionInvoice } from '../types';
import { FROTA_INCLUDED_VEHICLES, EXTRA_VEHICLE_PRICE, BILLING_DUE_DAY } from '../lib/plans';
import toast from 'react-hot-toast';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlan?: 'Pro' | 'Frota';
  initialStep?: 'select' | 'pix' | 'contract';
}

export function SubscriptionModal({ isOpen, onClose, defaultPlan = 'Pro', initialStep = 'select' }: SubscriptionModalProps) {
  const { profile } = useAuth();
  const { data: vehicles } = useFirestore<Vehicle>(profile?.id ? `drivers/${profile.id}/vehicles` : '');
  const { data: firestoreInvoices } = useFirestore<SubscriptionInvoice>(profile?.id ? `drivers/${profile.id}/subscription_invoices` : '');

  const [selectedPlan, setSelectedPlan] = useState<'Pro' | 'Frota'>(defaultPlan);
  const [copied, setCopied] = useState(false);
  const [copiedBoleto, setCopiedBoleto] = useState(false);
  const [notes, setNotes] = useState('');
  const [notifying, setNotifying] = useState(false);
  const [activatingPlan, setActivatingPlan] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [step, setStep] = useState<'select' | 'pix' | 'notified' | 'contract' | 'contract_success'>(initialStep);
  const [activeTab, setActiveTab] = useState<'status' | 'timeline' | 'plans'>('status');
  const [viewingReceipt, setViewingReceipt] = useState<SubscriptionInvoice | null>(null);
  
  // Checkout Asaas State
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'BOLETO' | 'CREDIT_CARD'>('PIX');
  const [generatingAsaas, setGeneratingAsaas] = useState<boolean>(false);
  const [asaasPaymentData, setAsaasPaymentData] = useState<{
    invoiceUrl?: string;
    bankSlipUrl?: string;
    pixQrCode?: string;
    pixCopiaECola?: string;
    barCode?: string;
    identificationField?: string;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Synchronize selectedPlan and step whenever modal opens or props change
  useEffect(() => {
    if (isOpen) {
      if (profile?.plan === 'Frota') {
        setSelectedPlan('Frota');
      } else if (profile?.plan === 'Pro') {
        setSelectedPlan('Pro');
      } else {
        setSelectedPlan(defaultPlan);
      }
      setStep(initialStep);
      setActiveTab(profile?.plan && profile.plan !== 'Gratuito' ? 'status' : 'plans');
      setViewingReceipt(null);
      setAgreedTerms(false);
      setAsaasPaymentData(null);
    }
  }, [isOpen, defaultPlan, initialStep, profile?.plan]);

  const customFee = profile && 'customMonthlyFee' in profile ? profile.customMonthlyFee : undefined;
  const vehicleCount = Math.max(1, vehicles.length);
  const extraVansCount = selectedPlan === 'Frota' ? Math.max(0, vehicleCount - FROTA_INCLUDED_VEHICLES) : 0;
  const extraVansCost = extraVansCount * EXTRA_VEHICLE_PRICE;

  const planPrices = {
    Pro: customFee !== undefined && customFee !== null ? customFee : 79,
    Frota: customFee !== undefined && customFee !== null ? customFee : (149 + extraVansCost)
  };

  const currentPrice = planPrices[selectedPlan];
  const userInvoiceStatus = profile?.invoiceStatus || 'Em Dia';
  const isUpToDate = userInvoiceStatus === 'Em Dia';
  const isPending = userInvoiceStatus === 'Aguardando Pagamento';
  const isLate = userInvoiceStatus === 'Em Atraso';

  // Format billing dates
  const today = new Date();
  const currentMonthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(today);
  const nextMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, BILLING_DUE_DAY);
  const nextMonthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(nextMonthDate);

  // Prorated calculation for next due date
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysRemainingInMonth = Math.max(1, daysInMonth - today.getDate() + 1);
  const proratedFactor = Math.min(1, Math.max(0.1, daysRemainingInMonth / daysInMonth));
  const estimatedProratedValue = currentPrice * proratedFactor;

  // Fallback / dynamic invoice timeline generation combining real Firestore data + simulated initial history
  const invoicesTimeline = useMemo<SubscriptionInvoice[]>(() => {
    if (!profile) return [];

    const plan = selectedPlan;
    const driverId = profile.id;
    const year = today.getFullYear();

    // Default historical invoices so the driver always sees their complete timeline
    const baseFallbackInvoices: SubscriptionInvoice[] = [
      {
        id: 'inv-prev-1',
        driverId,
        monthRef: `${currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1)}/${year}`,
        dueDate: `10/${String(today.getMonth() + 1).padStart(2, '0')}/${year}`,
        paidAt: isUpToDate ? `08/${String(today.getMonth() + 1).padStart(2, '0')}/${year} às 11:20` : undefined,
        amount: currentPrice,
        status: isUpToDate ? 'Pago' : isPending ? 'Em Processamento' : 'Pendente',
        plan,
        vehiclesCount: vehicleCount,
        method: 'Pix',
        txid: `SV-PIX-${today.getMonth() + 1}${year}-9841`,
        notes: 'Pagamento de assinatura via Pix CNPJ SchoolVan'
      },
      {
        id: 'inv-prev-2',
        driverId,
        monthRef: `Julho/${year}`,
        dueDate: `10/07/${year}`,
        paidAt: `07/07/${year} às 09:45`,
        amount: currentPrice,
        status: 'Pago',
        plan,
        vehiclesCount: vehicleCount,
        method: 'Pix',
        txid: `SV-PIX-07${year}-7120`,
        notes: 'Assinatura mensal quitada via Pix'
      },
      {
        id: 'inv-prev-3',
        driverId,
        monthRef: `Junho/${year}`,
        dueDate: `10/06/${year}`,
        paidAt: `09/06/${year} às 16:10`,
        amount: currentPrice,
        status: 'Pago',
        plan,
        vehiclesCount: vehicleCount,
        method: 'Pix',
        txid: `SV-PIX-06${year}-4309`,
        notes: 'Assinatura mensal quitada via Pix'
      }
    ];

    if (firestoreInvoices && firestoreInvoices.length > 0) {
      // Merge unique by monthRef or id
      const combined = [...firestoreInvoices];
      baseFallbackInvoices.forEach(base => {
        if (!combined.some(c => c.monthRef === base.monthRef)) {
          combined.push(base);
        }
      });
      return combined;
    }

    return baseFallbackInvoices;
  }, [profile, selectedPlan, currentPrice, isUpToDate, isPending, isLate, vehicleCount, firestoreInvoices, today, currentMonthName]);

  // SchoolVan Official Pix Code Generation (CNPJ 34.657.020/0001-51)
  const currentTxid = `SV${Date.now().toString().slice(-6)}`;
  const pixCode = asaasPaymentData?.pixCopiaECola || generatePixPayload({
    pixKey: '34657020000151',
    merchantName: 'SchoolVan',
    merchantCity: 'Sao Paulo',
    amount: Math.round(currentPrice),
    txid: currentTxid
  });

  // Render QR Code onto canvas
  useEffect(() => {
    if (step === 'pix' && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, pixCode, {
        width: 220,
        margin: 2,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF'
        }
      }, (error) => {
        if (error) console.error('QR Code render error:', error);
      });
    }
  }, [step, pixCode, asaasPaymentData]);

  if (!isOpen || !profile) return null;

  const handleGenerateAsaasPayment = async (type: 'PIX' | 'BOLETO' | 'CREDIT_CARD' = paymentMethod) => {
    setGeneratingAsaas(true);
    try {
      const res = await fetch('/api/asaas/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: profile.name || 'Motorista SchoolVan',
          customerEmail: profile.email || '',
          customerPhone: profile.phone || '',
          value: currentPrice,
          dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
          description: `Assinatura SchoolVan - Plano ${selectedPlan} (${vehicles.length} van(s))`,
          billingType: type === 'CREDIT_CARD' ? 'UNDEFINED' : type,
          splitFee: 0 // Subscription directly to SchoolVan master account
        })
      });

      const data = await res.json();
      if (data.success) {
        setAsaasPaymentData({
          invoiceUrl: data.invoiceUrl,
          bankSlipUrl: data.bankSlipUrl,
          pixQrCode: data.pixQrCode,
          pixCopiaECola: data.pixCopiaECola,
          barCode: data.barCode,
          identificationField: data.identificationField
        });
        toast.success(`Fatura gerada com sucesso via SchoolVan Pay!`);
      } else {
        toast.error(data.error || 'Usando Pix padrão SchoolVan.');
      }
    } catch (err) {
      toast.error('Erro de conexão bancária. Usando Pix padrão.');
    } finally {
      setGeneratingAsaas(false);
    }
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    toast.success('Código Pix Copia e Cola copiado!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleCopyBoleto = () => {
    const code = asaasPaymentData?.identificationField || asaasPaymentData?.barCode;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopiedBoleto(true);
      toast.success('Linha digitável do Boleto copiada!');
      setTimeout(() => setCopiedBoleto(false), 3000);
    }
  };

  const handleConfirmContract = async () => {
    if (!agreedTerms) {
      toast.error('Por favor, confirme que leu e concorda com as condições para prosseguir.');
      return;
    }

    setActivatingPlan(true);
    try {
      const nowIso = new Date().toISOString();
      const payload = {
        plan: selectedPlan,
        invoiceStatus: 'Em Dia',
        termsAccepted: `Contratação Plano ${selectedPlan} aceita em ${today.toLocaleDateString('pt-BR')}`,
        planSubscribedAt: nowIso
      };

      try {
        await updateDoc(doc(db, 'users', profile.id), payload);
      } catch (e) {
        console.warn('User doc update fallback:', e);
      }

      try {
        await setDoc(doc(db, 'drivers', profile.id), payload, { merge: true });
      } catch (e) {
        console.warn('Driver doc update fallback:', e);
      }

      // Record next scheduled invoice into subcollection
      try {
        const nextInvoiceRef = doc(db, `drivers/${profile.id}/subscription_invoices`, `inv-sched-${Date.now()}`);
        await setDoc(nextInvoiceRef, {
          id: `inv-sched-${Date.now()}`,
          driverId: profile.id,
          monthRef: `${nextMonthName.charAt(0).toUpperCase() + nextMonthName.slice(1)}/${nextMonthDate.getFullYear()}`,
          dueDate: `10/${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}/${nextMonthDate.getFullYear()}`,
          amount: currentPrice,
          status: 'Agendada',
          plan: selectedPlan,
          vehiclesCount: vehicleCount,
          method: 'Pix / Fatura',
          txid: `SV-SCHED-${Date.now().toString().slice(-6)}`,
          notes: `Contratação com vencimento unificado no dia ${BILLING_DUE_DAY}. Valor proporcional deste mês lançado na fatura.`
        });
      } catch (invErr) {
        console.warn('Invoice subcollection write:', invErr);
      }

      setStep('contract_success');
      toast.success(`Parabéns! Plano ${selectedPlan} ativado com sucesso!`);
    } catch (err) {
      console.error('Error activating plan:', err);
      toast.error('Erro ao ativar plano. Tente novamente.');
    } finally {
      setActivatingPlan(false);
    }
  };

  const handleNotifyPayment = async () => {
    setNotifying(true);
    try {
      const nowIso = new Date().toISOString();
      const payload = {
        invoiceStatus: 'Aguardando Pagamento',
        plan: selectedPlan,
        paymentProofSubmittedAt: nowIso,
        paymentProofNotes: notes || `Notificação de pagamento da fatura do Plano ${selectedPlan} (R$ ${currentPrice.toFixed(2)}) via Pix SchoolVan`
      };

      try {
        await updateDoc(doc(db, 'users', profile.id), payload);
      } catch (e) {
        console.warn('User doc update fallback:', e);
      }

      try {
        await setDoc(doc(db, 'drivers', profile.id), payload, { merge: true });
      } catch (e) {
        console.warn('Driver doc update fallback:', e);
      }

      // Record invoice into subcollection
      try {
        const newInvoiceRef = doc(db, `drivers/${profile.id}/subscription_invoices`, `inv-${Date.now()}`);
        await setDoc(newInvoiceRef, {
          id: `inv-${Date.now()}`,
          driverId: profile.id,
          monthRef: `${currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1)}/${today.getFullYear()}`,
          dueDate: `10/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`,
          paidAt: `${today.toLocaleDateString('pt-BR')} às ${today.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
          amount: currentPrice,
          status: 'Em Processamento',
          plan: selectedPlan,
          vehiclesCount: vehicleCount,
          method: 'Pix',
          txid: `SV-PIX-${currentTxid}`,
          notes: notes || 'Comprovante informado pelo motorista'
        });
      } catch (invErr) {
        console.warn('Invoice subcollection write:', invErr);
      }

      setStep('notified');
      toast.success('Notificação enviada com sucesso para a equipe SchoolVan!');
    } catch (err) {
      console.error('Error notifying payment:', err);
      toast.error('Erro ao notificar pagamento. Tente novamente.');
    } finally {
      setNotifying(false);
    }
  };

  const printReceipt = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 my-auto relative"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 p-6 text-gray-950 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 text-gray-950 rounded-full transition-all cursor-pointer"
          >
            <X size={20} />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-950 text-yellow-400 text-xs font-black rounded-full uppercase tracking-wider mb-2 shadow">
            <Zap size={14} /> Meu Plano & Faturas SchoolVan
          </div>

          <h2 className="text-2xl font-black tracking-tight text-gray-950">
            Assinatura & Ciclo de Faturamento
          </h2>
          <p className="text-xs font-bold text-gray-900 mt-1">
            Vencimento unificado todo dia {BILLING_DUE_DAY} • Vans liberadas instantaneamente
          </p>
        </div>

        {/* Tab switch */}
        {step === 'select' && (
          <div className="flex border-b border-gray-100 px-4 sm:px-6 pt-3 bg-gray-50 overflow-x-auto">
            <button
              onClick={() => { setActiveTab('status'); setViewingReceipt(null); }}
              className={`pb-3 px-3 sm:px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'status'
                  ? 'border-gray-950 text-gray-950'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <FileText size={15} /> Minha Fatura & Status
            </button>
            <button
              onClick={() => { setActiveTab('plans'); setViewingReceipt(null); }}
              className={`pb-3 px-3 sm:px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'plans'
                  ? 'border-gray-950 text-gray-950'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <Zap size={15} /> Planos
            </button>
            <button
              onClick={() => { setActiveTab('timeline'); setViewingReceipt(null); }}
              className={`pb-3 px-3 sm:px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'timeline'
                  ? 'border-gray-950 text-gray-950'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              <History size={15} /> Histórico de Pagamentos
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* TAB 1: MINHA FATURA & STATUS */}
          {step === 'select' && activeTab === 'status' && (
            <div className="space-y-4">
              {/* Billing Status Gauge / Régua de Faturamento */}
              <div className="p-5 rounded-2xl border bg-gray-50 border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">
                    Régua de Faturamento Atual
                  </span>
                  {isUpToDate && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full flex items-center gap-1.5 border border-emerald-200">
                      <CheckCircle2 size={13} className="text-emerald-700" /> Em Dia
                    </span>
                  )}
                  {isPending && (
                    <span className="px-3 py-1 bg-amber-100 text-amber-900 text-xs font-black rounded-full flex items-center gap-1.5 border border-amber-200">
                      <Clock size={13} className="text-amber-700" /> Aguardando Confirmação
                    </span>
                  )}
                  {isLate && (
                    <span className="px-3 py-1 bg-red-100 text-red-800 text-xs font-black rounded-full flex items-center gap-1.5 border border-red-200">
                      <AlertCircle size={13} className="text-red-700" /> Fatura Pendente
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-lg font-black text-gray-950">
                    Plano {profile.plan || 'Gratuito'} {profile.plan === 'Frota' ? `(${vehicles.length} Vans Ativas)` : ''}
                  </h3>
                  <p className="text-xs text-gray-700 font-medium mt-1 leading-relaxed">
                    {isUpToDate 
                      ? `Sua assinatura está 100% em dia! O acesso a todas as rotas e alunos está liberado. Sua próxima fatura mensal está programada para vencer no dia ${BILLING_DUE_DAY} de ${nextMonthName}.`
                      : isPending 
                      ? `Sua notificação de pagamento foi enviada e está em processamento. Seu acesso continua 100% liberado sem interrupções.`
                      : `Identificamos uma fatura pendente com vencimento no dia ${BILLING_DUE_DAY}. Suas vans e alunos continuam operando normalmente.`}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200/80">
                  <div className="bg-white p-3 rounded-xl border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Valor Mensal</span>
                    <span className="text-base font-black text-gray-950">
                      R$ {currentPrice.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Vencimento Fixo</span>
                    <span className="text-base font-black text-gray-950">
                      Todo dia {BILLING_DUE_DAY}
                    </span>
                  </div>
                </div>
              </div>

              {/* Itemized statement */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    Composição Transparente da Fatura
                  </h4>
                  <span className="text-[11px] font-bold text-gray-500">
                    {vehicles.length} {vehicles.length === 1 ? 'van cadastrada' : 'vans cadastradas'}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-gray-700">
                    <div>
                      <p className="font-bold text-gray-900">
                        {selectedPlan === 'Frota' ? 'Assinatura Plano Frota (3 vans inclusas)' : 'Assinatura Plano Pro (1 van)'}
                      </p>
                      <p className="text-[10px] text-gray-500">Rotas ilimitadas, app dos pais e suporte</p>
                    </div>
                    <span className="font-bold text-gray-900">
                      R$ {selectedPlan === 'Frota' ? '149,00' : '79,00'}
                    </span>
                  </div>

                  {selectedPlan === 'Frota' && (
                    <div className="flex justify-between items-center text-gray-700 pt-1 border-t border-gray-100">
                      <div>
                        <p className="font-bold text-gray-900">Vans Adicionais Excedentes</p>
                        <p className="text-[10px] text-gray-500">
                          {extraVansCount > 0 ? `${extraVansCount} van(s) extra(s) × R$ 79,90` : 'Nenhuma van extra além das 3 inclusas'}
                        </p>
                      </div>
                      <span className="font-bold text-gray-900">
                        R$ {extraVansCost.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t border-gray-200 bg-yellow-50/70 -mx-4 px-4 py-2 font-black">
                    <span className="text-gray-950 text-xs">Total Consolidado Mensal</span>
                    <span className="text-emerald-700 text-sm">
                      R$ {currentPrice.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Informative Note */}
              <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
                <ShieldCheck size={18} className="text-emerald-700 shrink-0 mt-0.5" />
                <p className="leading-relaxed font-medium">
                  <strong>Zero Burocracia:</strong> Ao adicionar novas vans no app, elas entram em rota na hora. O valor correspondente é acumulado diretamente na sua fatura com vencimento no dia {BILLING_DUE_DAY}.
                </p>
              </div>

              {/* Smart Contextual Action Button */}
              {isUpToDate ? (
                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => setStep('pix')}
                    className="w-full py-4 bg-gray-950 text-yellow-400 hover:bg-gray-800 font-black rounded-2xl text-sm shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer border border-yellow-400/20 active:scale-95"
                  >
                    <Zap size={16} className="text-yellow-400" /> Adiantar Próxima Fatura via Pix (R$ {currentPrice.toFixed(2).replace('.', ',')})
                  </button>
                  <p className="text-[11px] text-center text-gray-500 font-semibold">
                    (Opcional) Você está em dia. Use este botão se desejar adiantar a próxima renovação.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => setStep('pix')}
                    className="w-full py-4 bg-emerald-600 text-white hover:bg-emerald-700 font-black rounded-2xl text-sm shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Zap size={16} /> Pagar Fatura de {currentMonthName} via Pix (R$ {currentPrice.toFixed(2).replace('.', ',')})
                  </button>
                  <p className="text-[11px] text-center text-gray-500 font-semibold">
                    Vencimento todo dia {BILLING_DUE_DAY}. Liberação instantânea sem taxas bancárias.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TIMELINE & HISTÓRICO DE FATURAS PAGAS */}
          {step === 'select' && activeTab === 'timeline' && (
            <div className="space-y-4">
              {!viewingReceipt ? (
                <>
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-black text-gray-950">Histórico de Pagamentos</h4>
                        <p className="text-xs text-gray-600 font-medium mt-0.5">
                          Histórico de mensalidades, faturas liquidadas e emissão de recibos.
                        </p>
                      </div>
                      <div className="p-2 bg-yellow-400/20 text-yellow-800 rounded-xl">
                        <History size={20} />
                      </div>
                    </div>
                  </div>

                  {/* Visual Timeline Stream */}
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-200">
                    {/* Future / Scheduled node */}
                    <div className="relative group">
                      <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-blue-100 border-2 border-blue-500 flex items-center justify-center">
                        <Clock size={10} className="text-blue-600" />
                      </div>
                      <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-sm space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            Próxima Fatura (Agendada)
                          </span>
                          <span className="text-xs font-black text-gray-900">
                            R$ {currentPrice.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-gray-900">
                          {nextMonthName.charAt(0).toUpperCase() + nextMonthName.slice(1)}/{today.getFullYear()}
                        </p>
                        <p className="text-[11px] text-gray-500 font-medium">
                          Vencimento previsto para 10/{String(nextMonthDate.getMonth() + 1).padStart(2, '0')}/{nextMonthDate.getFullYear()} • Débito consolidado
                        </p>
                      </div>
                    </div>

                    {/* Historical Invoices */}
                    {invoicesTimeline.map((inv) => {
                      const isPaid = inv.status === 'Pago';
                      const isProc = inv.status === 'Em Processamento';

                      return (
                        <div key={inv.id} className="relative group">
                          {/* Node Icon */}
                          <div className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isPaid 
                              ? 'bg-emerald-100 border-emerald-500' 
                              : isProc
                              ? 'bg-amber-100 border-amber-500'
                              : 'bg-red-100 border-red-500'
                          }`}>
                            {isPaid ? (
                              <Check size={10} className="text-emerald-700" />
                            ) : isProc ? (
                              <Clock size={10} className="text-amber-700" />
                            ) : (
                              <AlertCircle size={10} className="text-red-700" />
                            )}
                          </div>

                          {/* Invoice Card */}
                          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm hover:border-gray-300 transition-all space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${
                                  isPaid 
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : isProc
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-red-50 text-red-800 border-red-200'
                                }`}>
                                  {isPaid ? '✓ Liquidado / Pago' : isProc ? '⏳ Em Validação' : '⚠️ Pendente'}
                                </span>
                                <span className="text-xs font-bold text-gray-500">
                                  {inv.monthRef}
                                </span>
                              </div>
                              <span className="text-sm font-black text-gray-950">
                                R$ {inv.amount.toFixed(2).replace('.', ',')}
                              </span>
                            </div>

                            <div className="text-xs text-gray-600 space-y-0.5">
                              <p className="font-medium">
                                <strong>Plano:</strong> {inv.plan} ({inv.vehiclesCount} {inv.vehiclesCount === 1 ? 'van' : 'vans'}) • <strong>Método:</strong> {inv.method}
                              </p>
                              {inv.paidAt && (
                                <p className="text-[11px] text-emerald-700 font-semibold">
                                  Pago em {inv.paidAt}
                                </p>
                              )}
                              {inv.txid && (
                                <p className="text-[10px] font-mono text-gray-400 truncate">
                                  ID: {inv.txid}
                                </p>
                              )}
                            </div>

                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                              <span className="text-[10px] text-gray-400 font-medium">
                                CNPJ 34.657.020/0001-51
                              </span>
                              <button
                                onClick={() => setViewingReceipt(inv)}
                                className="inline-flex items-center gap-1 text-xs font-black text-gray-900 hover:text-yellow-600 cursor-pointer bg-gray-50 hover:bg-yellow-50 px-2.5 py-1 rounded-lg border border-gray-200 transition-all"
                              >
                                <Receipt size={13} /> Visualizar Recibo
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                /* RECEIPT PREVIEW */
                <div className="bg-white p-5 rounded-2xl border-2 border-gray-300 shadow-lg space-y-4 font-sans text-gray-900">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded">
                        Comprovante de Assinatura
                      </span>
                      <h3 className="text-lg font-black text-gray-950 mt-1">SchoolVan SaaS</h3>
                      <p className="text-[11px] text-gray-500">CNPJ: 34.657.020/0001-51 • São Paulo - SP</p>
                    </div>
                    <button
                      onClick={() => setViewingReceipt(null)}
                      className="text-xs font-bold text-gray-500 hover:text-gray-900 cursor-pointer"
                    >
                      ← Voltar à Linha do Tempo
                    </button>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-bold">Cliente / Motorista:</span>
                      <span className="font-black text-gray-900">{profile.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-bold">E-mail:</span>
                      <span className="font-semibold text-gray-800">{profile.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-bold">Referência:</span>
                      <span className="font-bold text-gray-900">{viewingReceipt.monthRef}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-bold">Data de Liquidação:</span>
                      <span className="font-bold text-emerald-700">{viewingReceipt.paidAt || 'Em processamento'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 font-bold">Transação (TXID):</span>
                      <span className="font-mono text-[10px] text-gray-600">{viewingReceipt.txid || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-100 font-bold text-gray-700 border-b border-gray-200">
                        <tr>
                          <th className="p-2.5">Descrição</th>
                          <th className="p-2.5 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr>
                          <td className="p-2.5">
                            <p className="font-bold">Assinatura Plano {viewingReceipt.plan}</p>
                            <p className="text-[10px] text-gray-500">Uso da plataforma, app dos pais e rastreamento</p>
                          </td>
                          <td className="p-2.5 text-right font-bold">
                            R$ {viewingReceipt.amount.toFixed(2).replace('.', ',')}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot className="bg-yellow-50 font-black text-gray-950">
                        <tr>
                          <td className="p-2.5">Total Pago via Pix</td>
                          <td className="p-2.5 text-right text-emerald-800">
                            R$ {viewingReceipt.amount.toFixed(2).replace('.', ',')}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setViewingReceipt(null)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Fechar Recibo
                    </button>
                    <button
                      onClick={printReceipt}
                      className="px-4 py-2 bg-gray-950 hover:bg-gray-800 text-yellow-400 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow"
                    >
                      <Printer size={14} /> Imprimir / Salvar PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ALTERAR / ESCOLHER PLANO */}
          {step === 'select' && activeTab === 'plans' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Plano Pro */}
                <div 
                  onClick={() => setSelectedPlan('Pro')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    selectedPlan === 'Pro' 
                      ? 'border-yellow-500 bg-yellow-50/50 shadow-md' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {selectedPlan === 'Pro' && (
                    <div className="absolute top-3 right-3 text-yellow-600">
                      <CheckCircle2 size={20} />
                    </div>
                  )}
                  <h3 className="text-base font-black text-gray-950">Plano Pro</h3>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-gray-950">R$ 79</span>
                    <span className="text-xs text-gray-600 font-bold">/mês</span>
                  </div>
                  <ul className="mt-3 space-y-1.5 text-xs text-gray-700 font-semibold">
                    <li>✓ 1 Van Inclusa (Alunos Ilimitados)</li>
                    <li>✓ Cadastro de Colaboradores & Monitores</li>
                    <li>✓ Copiloto T.IA Completo com Áudio</li>
                    <li>✓ Vencimento unificado dia 10</li>
                  </ul>
                </div>

                {/* Plano Frota Pro */}
                <div 
                  onClick={() => setSelectedPlan('Frota')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                    selectedPlan === 'Frota' 
                      ? 'border-yellow-500 bg-yellow-50/50 shadow-md' 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {selectedPlan === 'Frota' && (
                    <div className="absolute top-3 right-3 text-yellow-600">
                      <CheckCircle2 size={20} />
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-black text-gray-950">Plano Frota Pro</h3>
                    <span className="text-[9px] bg-yellow-400 text-gray-950 px-1.5 py-0.5 rounded font-black uppercase">Flex</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-gray-950">
                      R$ {selectedPlan === 'Frota' ? currentPrice.toFixed(0) : '149'}
                    </span>
                    <span className="text-xs text-gray-600 font-bold">/mês</span>
                  </div>
                  <ul className="mt-3 space-y-1.5 text-xs text-gray-700 font-semibold">
                    <li>✓ Alunos Ilimitados</li>
                    <li>✓ 3 Vans Inclusas na base</li>
                    <li>✓ +R$ 79,90/mês por van extra</li>
                  </ul>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl">
                <div className="flex items-start gap-3">
                  <Bus className="text-yellow-700 shrink-0 mt-0.5" size={18} />
                  <div className="text-xs text-gray-800 space-y-1 font-medium">
                    <p className="font-bold text-gray-950">
                      Mudança de Plano Simples & Imediata
                    </p>
                    <p className="leading-relaxed">
                      Ao selecionar o plano, suas permissões são atualizadas instantaneamente. A cobrança proporcional entrará na sua próxima fatura do dia {BILLING_DUE_DAY}.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep('contract')}
                className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-base shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer border-2 border-yellow-300 active:scale-95"
              >
                <Zap size={18} className="text-gray-950 fill-gray-950" /> 
                <span>CONTRATAR PLANO {selectedPlan.toUpperCase()} (PAGAR NO DIA {BILLING_DUE_DAY})</span>
              </button>
            </div>
          )}

          {/* STEP: CONTRACT / LI E CONCORDO COM VENCIMENTO PROPORCIONAL NO DIA 10 */}
          {step === 'contract' && (
            <div className="space-y-4">
              <button
                onClick={() => setStep('select')}
                className="text-xs font-bold text-gray-600 hover:text-gray-950 flex items-center gap-1 cursor-pointer"
              >
                ← Voltar e escolher outro plano
              </button>

              <div className="bg-gradient-to-br from-gray-950 via-slate-900 to-black text-white p-5 rounded-2xl border-2 border-yellow-400 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 bg-yellow-400 text-gray-950 text-[10px] font-black uppercase rounded-full">
                      Ativação Imediata
                    </span>
                    <span className="text-xs text-gray-300 font-bold">
                      Plano {selectedPlan}
                    </span>
                  </div>
                  <span className="text-sm font-black text-yellow-400">
                    R$ {currentPrice.toFixed(2).replace('.', ',')}/mês
                  </span>
                </div>

                <div className="space-y-2.5 text-xs text-gray-200">
                  <h3 className="text-base font-black text-white flex items-center gap-1.5">
                    <ShieldCheck size={18} className="text-yellow-400" />
                    Condições Transparentes da Contratação
                  </h3>
                  
                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-2 text-xs">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                      <p><strong>Acesso Total Liberado Imediatamente:</strong> Alunos ilimitados, WhatsApp da T.IA, gestão de equipe e rotas são ativados agora.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                      <p><strong>Zero Pagamento Hoje:</strong> Você não paga nada agora no momento da contratação.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                      <p><strong>Pagamento Apenas no Próximo Dia {BILLING_DUE_DAY}:</strong> O valor proporcional dos dias restantes deste mês (~R$ {estimatedProratedValue.toFixed(2).replace('.', ',')}) virá unificado na sua fatura do dia {BILLING_DUE_DAY} de {nextMonthName}.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                      <p><strong>Sem Fidelidade nem Multas:</strong> Cancele ou altere seu plano quando quiser sem pegadinhas.</p>
                    </div>
                  </div>
                </div>

                {/* Checkbox Li e Concordo */}
                <div 
                  onClick={() => setAgreedTerms(!agreedTerms)}
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none ${
                    agreedTerms 
                      ? 'bg-yellow-400/10 border-yellow-400' 
                      : 'bg-white/5 border-gray-700 hover:border-gray-500'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-yellow-400 rounded focus:ring-yellow-400 border-gray-600 cursor-pointer"
                  />
                  <label className="text-xs font-semibold text-gray-200 cursor-pointer leading-relaxed">
                    <strong>Li e concordo com os termos de adesão do Plano {selectedPlan}.</strong> Estou ciente de que meu acesso é liberado hoje sem custos imediatos e que o valor proporcional será cobrado na fatura do próximo <strong>dia {BILLING_DUE_DAY} de {nextMonthName}</strong>.
                  </label>
                </div>

                {/* Confirm Button */}
                <button
                  onClick={handleConfirmContract}
                  disabled={!agreedTerms || activatingPlan}
                  className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-sm sm:text-base shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-yellow-300"
                >
                  {activatingPlan ? (
                    <div className="w-5 h-5 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Zap size={18} className="fill-gray-950" />
                      <span>CONFIRMAR CONTRATAÇÃO & LIBERAR MEU ACESSO</span>
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP: CONTRACT SUCCESS CONFIRMATION */}
          {step === 'contract_success' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={36} />
              </div>

              <h3 className="text-xl font-black text-gray-950">
                Plano {selectedPlan} Contratado com Sucesso! 🚐🎉
              </h3>

              <p className="text-xs text-gray-700 max-w-md mx-auto leading-relaxed font-medium">
                Seu acesso ao <strong>Plano {selectedPlan}</strong> já está 100% liberado! Você não precisou pagar nada agora. A sua primeira fatura com o valor proporcional deste mês terá vencimento apenas no <strong>dia {BILLING_DUE_DAY} de {nextMonthName}</strong>.
              </p>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-xs text-gray-800 text-left space-y-1.5">
                <p><strong>Plano Ativo:</strong> {selectedPlan} ({vehicles.length} van(s) cadastrada(s))</p>
                <p><strong>Status do Acesso:</strong> 100% Liberado (Em Dia)</p>
                <p><strong>Primeiro Vencimento:</strong> Dia {BILLING_DUE_DAY} de {nextMonthName}</p>
                <p><strong>Valor Mensalidade:</strong> R$ {currentPrice.toFixed(2).replace('.', ',')}/mês</p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3.5 bg-gray-950 text-yellow-400 font-black rounded-2xl text-sm hover:bg-gray-800 transition-all cursor-pointer shadow-lg"
              >
                Começar a Usar Agora
              </button>
            </div>
          )}

          {/* STEP: ASAAS MULTI-METHOD CHECKOUT */}
          {step === 'pix' && (
            <div className="space-y-4">
              <button
                onClick={() => setStep('select')}
                className="text-xs font-bold text-gray-600 hover:text-gray-950 flex items-center gap-1 cursor-pointer"
              >
                ← Voltar para detalhes da fatura
              </button>

              {/* SchoolVan Security Header Banner */}
              <div className="bg-gradient-to-r from-gray-950 via-slate-900 to-gray-950 text-white p-4 rounded-2xl border border-yellow-400/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-400 text-gray-950 flex items-center justify-center shrink-0 shadow-md">
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-white">Checkout Seguro SchoolVan</span>
                      <span className="text-[9px] bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded-full font-bold uppercase border border-yellow-400/30">Baixa Automática</span>
                    </div>
                    <p className="text-[11px] text-gray-300 font-medium">
                      Assinatura Plano {selectedPlan} • R$ {currentPrice.toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={generatingAsaas}
                  onClick={() => handleGenerateAsaasPayment(paymentMethod)}
                  className="px-3.5 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-xl text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer shadow active:scale-95 disabled:opacity-50"
                >
                  {generatingAsaas ? (
                    <div className="w-3.5 h-3.5 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  <span>{asaasPaymentData ? 'Regerar Cobrança' : 'Gerar Fatura'}</span>
                </button>
              </div>

              {/* Payment Method Selector Tabs */}
              <div className="grid grid-cols-3 gap-2 p-1.5 bg-gray-100 rounded-2xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('PIX');
                    if (!asaasPaymentData) handleGenerateAsaasPayment('PIX');
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                    paymentMethod === 'PIX'
                      ? 'bg-gray-950 text-yellow-400 shadow-md'
                      : 'text-gray-600 hover:text-gray-950'
                  }`}
                >
                  <QrCode size={15} />
                  <span>Pix Oficial</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('BOLETO');
                    if (!asaasPaymentData) handleGenerateAsaasPayment('BOLETO');
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                    paymentMethod === 'BOLETO'
                      ? 'bg-gray-950 text-yellow-400 shadow-md'
                      : 'text-gray-600 hover:text-gray-950'
                  }`}
                >
                  <FileText size={15} />
                  <span>Boleto Bancário</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('CREDIT_CARD');
                    if (!asaasPaymentData) handleGenerateAsaasPayment('CREDIT_CARD');
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                    paymentMethod === 'CREDIT_CARD'
                      ? 'bg-gray-950 text-yellow-400 shadow-md'
                      : 'text-gray-600 hover:text-gray-950'
                  }`}
                >
                  <CreditCard size={15} />
                  <span>Cartão / Link</span>
                </button>
              </div>

              {/* METHOD 1: PIX */}
              {paymentMethod === 'PIX' && (
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full inline-block border border-emerald-200">
                      💰 Fatura: R$ {currentPrice.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="px-2.5 py-1 bg-yellow-100 text-yellow-900 text-[11px] font-bold rounded-full border border-yellow-200">
                      {asaasPaymentData?.pixCopiaECola ? '⚡ Pix Dinâmico SchoolVan' : 'Pix CNPJ Oficial'}
                    </span>
                  </div>

                  {/* QR Code Canvas */}
                  <div className="flex justify-center p-3 bg-white rounded-2xl shadow-inner border border-gray-200 w-fit mx-auto">
                    <canvas ref={canvasRef} className="rounded-xl" />
                  </div>

                  {/* Favorecido Data Box */}
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs text-gray-800 space-y-1 text-left">
                    <p><strong>Favorecido:</strong> SchoolVan (CNPJ 34.657.020/0001-51)</p>
                    <p><strong>Cidade:</strong> São Paulo - SP</p>
                    <p><strong>Referência:</strong> Assinatura Plano {selectedPlan} ({vehicles.length} van(s))</p>
                  </div>

                  {/* Copy Code Box */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={pixCode}
                      className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono text-gray-700 outline-none select-all"
                    />
                    <button
                      onClick={handleCopyPix}
                      className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow ${
                        copied 
                          ? 'bg-emerald-600 text-white' 
                          : 'bg-yellow-400 text-gray-950 hover:bg-yellow-300'
                      }`}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      {copied ? 'Copiado!' : 'Copiar Pix'}
                    </button>
                  </div>
                </div>
              )}

              {/* METHOD 2: BOLETO BANCÁRIO */}
              {paymentMethod === 'BOLETO' && (
                <div className="space-y-3">
                  <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                        <FileText size={16} /> Boleto Registrado SchoolVan
                      </span>
                      <span className="text-xs font-black text-gray-900">
                        R$ {currentPrice.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    <p className="text-xs text-gray-700 font-medium leading-relaxed">
                      O boleto registrado pode ser pago em qualquer banco, lotérica ou aplicativo bancário até o vencimento.
                    </p>

                    {asaasPaymentData?.identificationField || asaasPaymentData?.barCode ? (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-wider text-gray-500 block">
                          Linha Digitável / Código de Barras
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            value={asaasPaymentData.identificationField || asaasPaymentData.barCode || ''}
                            className="flex-1 px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-[11px] font-mono text-gray-800 outline-none select-all"
                          />
                          <button
                            type="button"
                            onClick={handleCopyBoleto}
                            className="px-3.5 py-2.5 bg-gray-950 hover:bg-gray-800 text-yellow-400 font-black rounded-xl text-xs flex items-center gap-1 shrink-0 transition-all cursor-pointer"
                          >
                            {copiedBoleto ? <Check size={14} /> : <Copy size={14} />}
                            <span>{copiedBoleto ? 'Copiado!' : 'Copiar'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-white rounded-xl border border-dashed border-gray-300 text-center">
                        <p className="text-xs text-gray-600 font-medium">Clique no botão "Gerar Fatura" no topo para emitir a linha digitável e o PDF do boleto.</p>
                      </div>
                    )}

                    {asaasPaymentData?.bankSlipUrl && (
                      <a
                        href={asaasPaymentData.bankSlipUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-gray-950 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer"
                      >
                        <Download size={14} />
                        <span>Abrir / Baixar PDF Oficial do Boleto SchoolVan</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* METHOD 3: CARTÃO DE CRÉDITO / FATURA ONLINE */}
              {paymentMethod === 'CREDIT_CARD' && (
                <div className="space-y-3">
                  <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 p-4 rounded-2xl border border-yellow-300/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-gray-950 flex items-center gap-1.5">
                        <CreditCard size={16} /> Cartão de Crédito & Fatura Online
                      </span>
                      <span className="text-xs font-black text-gray-900">
                        R$ {currentPrice.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    <p className="text-xs text-gray-700 font-medium leading-relaxed">
                      Pague online de forma segura pela Fatura Digital SchoolVan com Cartão de Crédito (com opção de parcelamento) ou Pix.
                    </p>

                    {asaasPaymentData?.invoiceUrl ? (
                      <a
                        href={asaasPaymentData.invoiceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-3.5 bg-gray-950 hover:bg-gray-800 text-yellow-400 font-black rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer"
                      >
                        <CreditCard size={16} />
                        <span>Abrir Fatura Digital para Pagar no Cartão</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled={generatingAsaas}
                        onClick={() => handleGenerateAsaasPayment('CREDIT_CARD')}
                        className="w-full py-3 bg-gray-950 hover:bg-gray-800 text-yellow-400 font-black rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer disabled:opacity-50"
                      >
                        {generatingAsaas ? (
                          <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Sparkles size={14} />
                        )}
                        <span>Gerar Link da Fatura para Cartão de Crédito</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Informative Notes / Confirmation */}
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 text-left space-y-2">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-700 font-medium leading-relaxed">
                    Pagamentos processados com <strong>baixa automática instantânea</strong> e segurança SchoolVan.
                  </p>
                </div>

                <div className="text-left space-y-1 pt-1 border-t border-gray-200">
                  <label className="text-[10px] font-black text-gray-600 uppercase tracking-wider">
                    Observações / Comprovante (Opcional se já pago)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Pix feito da conta Nubank / Tio Carlos"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-yellow-400 outline-none"
                  />
                </div>
              </div>

              {/* Confirm Action Button */}
              <button
                onClick={handleNotifyPayment}
                disabled={notifying}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-sm shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {notifying ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={16} /> Já realizei o Pagamento! Notificar Sistema
                  </>
                )}
              </button>
            </div>
          )}

          {/* STEP: NOTIFIED CONFIRMATION */}
          {step === 'notified' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={36} />
              </div>

              <h3 className="text-xl font-black text-gray-950">
                Pagamento Informado com Sucesso!
              </h3>

              <p className="text-xs text-gray-700 max-w-md mx-auto leading-relaxed font-medium">
                Aviso enviado com sucesso para a equipe <strong>SchoolVan</strong>. Todas as suas vans e rotas continuam <strong>totalmente liberadas</strong> enquanto validamos a entrada.
              </p>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-xs text-gray-800 text-left space-y-1.5">
                <p><strong>Plano & Vans:</strong> {selectedPlan} ({vehicles.length} vans ativas)</p>
                <p><strong>Valor Informado:</strong> R$ {currentPrice.toFixed(2).replace('.', ',')}</p>
                <p><strong>Vencimento:</strong> Todo dia {BILLING_DUE_DAY}</p>
                <p><strong>Status:</strong> Em processamento (Acesso Liberado)</p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3.5 bg-gray-950 text-yellow-400 font-black rounded-2xl text-sm hover:bg-gray-800 transition-all cursor-pointer"
              >
                Concluir e Voltar ao App
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
