import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Clock, 
  QrCode, 
  Send, 
  Zap, 
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { generatePixPayload } from '../lib/pix';
import toast from 'react-hot-toast';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPlan?: 'Pro' | 'Frota';
}

export function SubscriptionModal({ isOpen, onClose, defaultPlan = 'Pro' }: SubscriptionModalProps) {
  const { profile } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<'Pro' | 'Frota'>(defaultPlan);
  const [copied, setCopied] = useState(false);
  const [notes, setNotes] = useState('');
  const [notifying, setNotifying] = useState(false);
  const [step, setStep] = useState<'select' | 'pix' | 'notified'>('select');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const planPrices = {
    Pro: 79,
    Frota: 149
  };

  const currentPrice = planPrices[selectedPlan];

  // SchoolVan Official Pix Code Generation (CNPJ 34.657.020/0001-51)
  const pixCode = generatePixPayload({
    pixKey: '34657020000151',
    merchantName: 'SchoolVan',
    merchantCity: 'Sao Paulo',
    amount: currentPrice,
    txid: `SV${Date.now().toString().slice(-6)}`
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
  }, [step, pixCode]);

  if (!isOpen || !profile) return null;

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    toast.success('Código Pix Copia e Cola copiado!');
    setTimeout(() => setCopied(false), 3000);
  };

  const handleNotifyPayment = async () => {
    setNotifying(true);
    try {
      const payload = {
        invoiceStatus: 'Aguardando Pagamento',
        plan: selectedPlan,
        paymentProofSubmittedAt: new Date().toISOString(),
        paymentProofNotes: notes || `Notificação de pagamento do Plano ${selectedPlan} (R$ ${currentPrice}) via Pix SchoolVan`
      };

      // Update both collections if available
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

      setStep('notified');
      toast.success('Notificação de pagamento enviada ao Super Admin!');
    } catch (err) {
      console.error('Error notifying payment:', err);
      toast.error('Erro ao notificar pagamento. Tente novamente.');
    } finally {
      setNotifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-900 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 my-auto relative"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 p-6 text-gray-950 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 text-gray-950 rounded-full transition-all"
          >
            <X size={20} />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-950 text-yellow-400 text-xs font-black rounded-full uppercase tracking-wider mb-2 shadow">
            <Zap size={14} /> Assinatura SchoolVan
          </div>

          <h2 className="text-2xl font-black tracking-tight">
            Planos & Mensalidade do Tio da Van
          </h2>
          <p className="text-xs font-semibold text-gray-900 mt-1">
            Escolha o plano ideal para sua frota e renove via Pix sem taxas extras.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {step === 'select' && (
            <>
              {/* Current Status Pill */}
              <div className="bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Status Atual</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    Plano {profile.plan || 'Gratuito'} ({profile.invoiceStatus || 'Em Dia'})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Identificação</span>
                  <span className="text-xs font-mono font-bold text-gray-600 dark:text-gray-300">{profile.name || profile.email}</span>
                </div>
              </div>

              {/* Plan Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* PRO */}
                <div 
                  onClick={() => setSelectedPlan('Pro')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all relative ${
                    selectedPlan === 'Pro' 
                      ? 'border-yellow-400 bg-yellow-50/60 dark:bg-yellow-950/30 shadow-md' 
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                  }`}
                >
                  {selectedPlan === 'Pro' && (
                    <div className="absolute top-3 right-3 text-yellow-600 dark:text-yellow-400">
                      <CheckCircle2 size={20} />
                    </div>
                  )}
                  <h3 className="text-base font-black text-gray-900 dark:text-white">Plano Pro</h3>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-gray-900 dark:text-white">R$ 79</span>
                    <span className="text-xs text-gray-500 font-bold">/mês</span>
                  </div>
                  <ul className="mt-3 space-y-1.5 text-xs text-gray-600 dark:text-gray-300 font-medium">
                    <li>✓ Alunos Ilimitados</li>
                    <li>✓ Notificações Zap & PWA</li>
                    <li>✓ Suporte VIP Prioritário</li>
                  </ul>
                </div>

                {/* FROTA */}
                <div 
                  onClick={() => setSelectedPlan('Frota')}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all relative ${
                    selectedPlan === 'Frota' 
                      ? 'border-yellow-400 bg-yellow-50/60 dark:bg-yellow-950/30 shadow-md' 
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-300'
                  }`}
                >
                  {selectedPlan === 'Frota' && (
                    <div className="absolute top-3 right-3 text-yellow-600 dark:text-yellow-400">
                      <CheckCircle2 size={20} />
                    </div>
                  )}
                  <h3 className="text-base font-black text-gray-900 dark:text-white">Plano Frota Pro</h3>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-black text-gray-900 dark:text-white">R$ 149</span>
                    <span className="text-xs text-gray-500 font-bold">/mês</span>
                  </div>
                  <ul className="mt-3 space-y-1.5 text-xs text-gray-600 dark:text-gray-300 font-medium">
                    <li>✓ Até 5 Vans e Monitores</li>
                    <li>✓ Otimização de Rotas por GPS</li>
                    <li>✓ Tudo do Plano Pro</li>
                  </ul>
                </div>
              </div>

              {/* Advance to Pix */}
              <button
                onClick={() => setStep('pix')}
                className="w-full py-4 bg-gray-950 text-yellow-400 font-black rounded-2xl text-base shadow-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 cursor-pointer border border-yellow-400/20 active:scale-95"
              >
                <Zap size={18} className="text-yellow-400" /> Assinar Plano {selectedPlan} (R$ {currentPrice},00/mês)
              </button>
            </>
          )}

          {step === 'pix' && (
            <>
              {/* Pix Display Section */}
              <div className="text-center space-y-3">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-black rounded-full inline-block">
                  💰 Valor exato travado: R$ {currentPrice},00
                </span>

                <h3 className="text-lg font-black text-gray-900 dark:text-white">
                  Escaneie ou copie o Pix Copia e Cola
                </h3>

                {/* QR Code Canvas */}
                <div className="flex justify-center my-3">
                  <div className="p-3 bg-white border-2 border-gray-950 rounded-2xl shadow-xl inline-block">
                    <canvas ref={canvasRef} className="mx-auto" />
                  </div>
                </div>

                {/* Receiver Info */}
                <div className="bg-gray-50 dark:bg-gray-800/80 p-3 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-700 dark:text-gray-300 space-y-1 text-left">
                  <p><strong>Favorecido:</strong> SchoolVan (CNPJ 34.657.020/0001-51)</p>
                  <p><strong>Cidade:</strong> São Paulo - SP</p>
                  <p><strong>Identificador:</strong> Plano {selectedPlan}</p>
                </div>

                {/* Copy Code Box */}
                <div className="relative">
                  <textarea
                    readOnly
                    rows={2}
                    value={pixCode}
                    className="w-full p-3 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-mono text-[11px] text-gray-600 dark:text-gray-300 select-all outline-none resize-none"
                  />
                  <button
                    onClick={handleCopyPix}
                    className="absolute top-2 right-2 px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold text-xs rounded-lg shadow flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copiado!' : 'Copiar Pix'}
                  </button>
                </div>

                {/* User Notice requested by spec */}
                <div className="bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200/80 dark:border-amber-800/60 text-left flex items-start gap-3">
                  <AlertCircle size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-900 dark:text-amber-200 font-medium leading-relaxed">
                    Pagamento via Pix direcionado para <strong>SchoolVan</strong>. Após realizar o pagamento no seu banco, clique no botão abaixo para notificar o sistema. Seu acesso continua <strong>100% liberado</strong> durante a verificação!
                  </p>
                </div>

                {/* Optional note field */}
                <div className="text-left space-y-1">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider ml-1">Observações / Comprovante (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Paguei pelo banco Nubank no nome de Carlos"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => setStep('select')}
                    className="py-3 px-4 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleNotifyPayment}
                    disabled={notifying}
                    className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl text-sm shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {notifying ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <><Send size={16} /> Já Paguei! Notificar Aprovação</>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {step === 'notified' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 size={36} />
              </div>

              <h3 className="text-xl font-black text-gray-900 dark:text-white">
                Notificação Recebida!
              </h3>

              <p className="text-xs text-gray-600 dark:text-gray-300 max-w-md mx-auto leading-relaxed">
                Aviso enviado com sucesso para a equipe <strong>SchoolVan</strong>. Seu acesso ao app continua <strong>totalmente liberado</strong> sem interrupções enquanto confirmamos a entrada do Pix.
              </p>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-600 dark:text-gray-300 text-left space-y-1">
                <p><strong>Plano Selecionado:</strong> {selectedPlan} (R$ {currentPrice},00/mês)</p>
                <p><strong>Status da Fatura:</strong> Aguardando Aprovação</p>
                <p><strong>Acesso:</strong> Liberado normalmente</p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-3.5 bg-gray-950 text-yellow-400 font-bold rounded-2xl text-sm shadow-xl hover:bg-gray-800 transition-all cursor-pointer"
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
