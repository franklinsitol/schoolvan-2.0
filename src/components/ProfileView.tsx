import React, { useState } from 'react';
import { Settings, Key, ShieldCheck, Mail, Phone, MapPin, CreditCard, FileText, Save, Zap, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface ProfileViewProps {
  onOpenSubscriptionModal?: () => void;
}

export function ProfileView({ onOpenSubscriptionModal }: ProfileViewProps = {}) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
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
      await updateDoc(doc(db, 'users', profile.id), formData);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  const invoiceStatus = profile?.invoiceStatus || 'Em Dia';

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 md:p-8">
          <h2 className="text-2xl font-black text-gray-950 mb-6 flex items-center gap-2">
            <Settings className="text-yellow-500" /> Dados de Acesso e Perfil
          </h2>

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

          {profile?.termsAccepted && (
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                <ShieldCheck size={14} /> {profile.termsAccepted}
              </span>
            </div>
          )}

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
    </div>
  );
}
