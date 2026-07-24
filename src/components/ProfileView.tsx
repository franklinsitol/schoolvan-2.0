import React, { useState } from 'react';
import { Settings, Key, ShieldCheck, Mail, Phone, MapPin, CreditCard, FileText, Save } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export function ProfileView() {
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

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-2xl bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-8">
          <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
            <Settings className="text-yellow-500" /> Dados de Acesso e Perfil
          </h2>

          {profile?.termsAccepted && (
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-100">
                <ShieldCheck size={14} /> {profile.termsAccepted}
              </span>
            </div>
          )}

          <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100 mb-8 flex items-start gap-3">
            <Key className="text-yellow-600 shrink-0" size={20} />
            <p className="text-sm text-yellow-800">
              Aqui você pode atualizar seus dados de contato e cobrança. Para alterar sua senha, use as opções de recuperação do Google.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Nome Completo</label>
              <div className="relative">
                <Settings className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input id="name" value={formData.name} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">E-mail de Login</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input id="email" disabled value={formData.email} className="w-full pl-10 pr-4 py-3 bg-gray-100 border border-gray-100 rounded-xl outline-none font-bold text-gray-500 cursor-not-allowed" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">CPF / CNPJ</label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input id="cpfCnpj" value={formData.cpfCnpj} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input id="phone" value={formData.phone} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none" />
              </div>
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Cidade de Residência</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input id="city" value={formData.city} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none" />
              </div>
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Chave Pix (Para receber)</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input id="pixKey" value={formData.pixKey} onChange={handleChange} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none" />
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <button 
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-4 bg-yellow-400 text-gray-900 font-bold rounded-2xl hover:bg-yellow-500 transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Save size={20} /> SALVAR DADOS</>
              )}
            </button>
            <button className="flex-1 py-4 border-2 border-gray-900 text-gray-900 font-bold rounded-2xl hover:bg-gray-50 transition-all active:scale-95">
              VER TERMOS
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
