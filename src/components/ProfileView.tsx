import React, { useState } from 'react';
import { 
  Settings, 
  Key, 
  ShieldCheck, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  FileText, 
  Save, 
  Zap, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Lock,
  ExternalLink,
  Scale,
  Baby,
  Award,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { LegalTermsModal } from './LegalTermsModal';
import { DriverVerificationModal } from './DriverVerificationModal';
import { Driver } from '../types';
import toast from 'react-hot-toast';

interface ProfileViewProps {
  onOpenSubscriptionModal?: () => void;
}

export function ProfileView({ onOpenSubscriptionModal }: ProfileViewProps = {}) {
  const { profile } = useAuth();
  const driverProfile = profile as unknown as Driver;
  const [loading, setLoading] = useState(false);
  const [isLegalModalOpen, setIsLegalModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [legalModalTab, setLegalModalTab] = useState<'adhesion' | 'privacy' | 'security' | 'rights'>('adhesion');
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    city: profile?.city || '',
    cpfCnpj: profile?.cpfCnpj || '',
    pixKey: profile?.pixKey || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSave = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const collectionName = profile.role === 'admin' ? 'drivers' : 'users';
      await updateDoc(doc(db, collectionName, profile.id), formData);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  const invoiceStatus = profile?.invoiceStatus || 'Em Dia';
  const isDriverVerified = Boolean(driverProfile?.isVerified || driverProfile?.verificationStatus === 'verificado' || driverProfile?.verificationStatus === 'verified');
  const isPendingVerification = driverProfile?.verificationStatus === 'em_analise' || driverProfile?.verificationStatus === 'pending';
  const isRejectedVerification = driverProfile?.verificationStatus === 'rejeitado' || driverProfile?.verificationStatus === 'rejected';

  const openLegalTab = (tab: 'adhesion' | 'privacy' | 'security' | 'rights') => {
    setLegalModalTab(tab);
    setIsLegalModalOpen(true);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-gray-950 flex items-center gap-2">
              <Settings className="text-yellow-500" /> Dados de Acesso e Perfil
            </h2>
            {isDriverVerified && (
              <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-black rounded-full flex items-center gap-1 shadow-sm">
                <CheckCircle2 size={14} /> Selo Verificado
              </span>
            )}
          </div>

          {/* Subscription Status Card */}
          <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-black text-white p-5 rounded-2xl mb-6 shadow-xl border border-yellow-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-yellow-400 text-gray-950 text-[10px] font-black uppercase rounded-full">
                  SaaS SchoolVan
                </span>
                {invoiceStatus === 'Em Dia' && (
                  <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 size={13} /> Em Dia
                  </span>
                )}
                {invoiceStatus === 'Aguardando Pagamento' && (
                  <span className="text-xs text-amber-400 font-bold flex items-center gap-1">
                    <Clock size={13} /> Aguardando Confirmação
                  </span>
                )}
                {invoiceStatus === 'Em Atraso' && (
                  <span className="text-xs text-red-400 font-bold flex items-center gap-1">
                    <AlertCircle size={13} /> Fatura Pendente
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black text-white mt-1">
                Plano {profile?.plan || 'Gratuito'}
              </h3>
              <p className="text-xs text-gray-300 mt-0.5">
                Vencimento unificado todo dia 10 • Liberação instantânea
              </p>
            </div>

            {onOpenSubscriptionModal && (
              <button
                onClick={onOpenSubscriptionModal}
                className="px-4 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow active:scale-95 shrink-0"
              >
                <Zap size={14} /> Gerenciar Meu Plano & Fatura
              </button>
            )}
          </div>

          {/* 🌟 Professional Verification Badge & Legal Accreditation (Pro / Frota) */}
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-yellow-300/80 p-5 rounded-2xl mb-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 bg-yellow-400 text-gray-950 rounded-2xl flex items-center justify-center font-black shrink-0 shadow-md">
                <Award size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-black text-gray-950">
                    Selo de Motorista Verificado Oficial
                  </h3>
                  {isDriverVerified && (
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full border border-emerald-300">
                      ✓ Aprovado
                    </span>
                  )}
                  {isPendingVerification && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded-full border border-blue-300 animate-pulse">
                      ⏳ Em Análise (SLA 3-5 dias)
                    </span>
                  )}
                  {!isDriverVerified && !isPendingVerification && !isRejectedVerification && (
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-700 text-[10px] font-bold rounded-full">
                      Não Solicitado
                    </span>
                  )}
                  {isRejectedVerification && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] font-bold rounded-full border border-red-300">
                      Ajustes Necessários
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Envie CNH com EAR, Curso de Transporte Escolar e Alvará Municipal para obter o selo de confiança destacado para os pais no Marketplace.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsVerificationModalOpen(true)}
              className="px-4 py-2.5 bg-gray-950 hover:bg-gray-800 text-yellow-400 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shrink-0 active:scale-95"
            >
              <span>{isDriverVerified ? 'Ver Documentos' : 'Enviar Documentos'}</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Legal Compliance, Privacy & Security Card */}
          <div className="bg-gradient-to-br from-slate-900 to-gray-950 text-white p-5 rounded-2xl mb-6 shadow-md border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-emerald-400" />
                <span className="text-xs font-black text-white uppercase tracking-wider">
                  Conformidade Jurídica & LGPD
                </span>
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold rounded-full border border-emerald-500/30">
                v2026.1 Válida
              </span>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed font-normal">
              Sua conta está protegida sob a <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</strong> e o <strong>Artigo 14 (Tratamento de Dados de Crianças e Menores de Idade)</strong>.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <button
                type="button"
                onClick={() => openLegalTab('adhesion')}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-center border border-white/10 transition-all cursor-pointer group"
              >
                <FileText size={14} className="mx-auto text-yellow-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold block text-gray-200">Termos de Uso</span>
              </button>

              <button
                type="button"
                onClick={() => openLegalTab('privacy')}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-center border border-white/10 transition-all cursor-pointer group"
              >
                <Baby size={14} className="mx-auto text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold block text-gray-200">Privacidade LGPD</span>
              </button>

              <button
                type="button"
                onClick={() => openLegalTab('security')}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-center border border-white/10 transition-all cursor-pointer group"
              >
                <Lock size={14} className="mx-auto text-blue-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold block text-gray-200">Segurança & TLS</span>
              </button>

              <button
                type="button"
                onClick={() => openLegalTab('rights')}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-center border border-white/10 transition-all cursor-pointer group"
              >
                <Scale size={14} className="mx-auto text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold block text-gray-200">Seus Direitos</span>
              </button>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-200 mb-8 flex items-start gap-3">
            <Key className="text-yellow-700 shrink-0" size={20} />
            <p className="text-xs sm:text-sm text-yellow-950 font-medium leading-relaxed">
              Aqui você pode atualizar seus dados de contato e chave Pix para recebimento dos pais. Para alterar sua senha, use as opções de recuperação do Google.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Nome Completo</label>
              <div className="relative">
                <Settings className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input id="name" value={formData.name} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none font-medium text-sm" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">E-mail de Login</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input id="email" disabled value={formData.email} className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-200 rounded-xl outline-none font-bold text-gray-600 cursor-not-allowed text-sm" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">CPF / CNPJ</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input id="cpfCnpj" value={formData.cpfCnpj} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none font-medium text-sm" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input id="phone" value={formData.phone} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none font-medium text-sm" />
              </div>
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Cidade de Atuação / Residência</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input id="city" value={formData.city} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none font-medium text-sm" />
              </div>
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider ml-1">Chave Pix (Para receber dos pais dos alunos)</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input id="pixKey" value={formData.pixKey} onChange={handleChange} placeholder="CPF, Celular, E-mail ou Chave Aleatória" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none font-medium text-sm" />
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-4 bg-yellow-400 text-gray-950 font-black rounded-2xl hover:bg-yellow-300 transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Save size={20} /> SALVAR DADOS</>
              )}
            </button>
          </div>
        </div>
      </div>

      <LegalTermsModal 
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        defaultTab={legalModalTab}
      />

      <DriverVerificationModal 
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        driver={driverProfile || ({ id: profile?.id || '', name: profile?.name || '', email: profile?.email || '', status: 'Ativo' } as Driver)}
        onOpenUpgradeModal={onOpenSubscriptionModal ? () => onOpenSubscriptionModal() : undefined}
      />
    </div>
  );
}
