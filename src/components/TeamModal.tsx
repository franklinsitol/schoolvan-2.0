import React, { useState } from 'react';
import { X, Save, User, Mail, Phone, ShieldCheck, Bus } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { TeamMember, Vehicle } from '../types';
import toast from 'react-hot-toast';

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverId: string;
  vehicles: Vehicle[];
  member?: TeamMember | null;
}

export function TeamModal({ isOpen, onClose, driverId, vehicles, member }: TeamModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<TeamMember>>(
    member || {
      name: '',
      email: '',
      phone: '',
      vehicleId: vehicles[0]?.id || '',
      canEdit: false,
      role: 'colab',
    }
  );

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const memberData = {
        ...formData,
        ownerId: driverId,
        updatedAt: new Date().toISOString(),
      };

      if (member?.id) {
        await updateDoc(doc(db, `drivers/${driverId}/team`, member.id), memberData);
        toast.success('Colaborador atualizado!');
      } else {
        await addDoc(collection(db, `drivers/${driverId}/team`), {
          ...memberData,
          createdAt: new Date().toISOString(),
        });
        toast.success('Colaborador cadastrado!');
      }
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar colaborador.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
        <div className="p-6 bg-yellow-400 flex items-center justify-between">
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <ShieldCheck /> {member ? 'Editar Colaborador' : 'Novo Colaborador'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 ml-1">Nome Completo</label>
              <input
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  required
                  type="email"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 ml-1">WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 ml-1">Van Designada</label>
              <div className="relative">
                <Bus className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <select
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none"
                  value={formData.vehicleId}
                  onChange={e => setFormData({ ...formData, vehicleId: e.target.value })}
                >
                  <option value="">Nenhuma Van</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <input
                type="checkbox"
                id="canEdit"
                className="w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-400"
                checked={formData.canEdit}
                onChange={e => setFormData({ ...formData, canEdit: e.target.checked })}
              />
              <label htmlFor="canEdit" className="text-sm font-bold text-gray-700 cursor-pointer">
                Permitir edição de dados (Editor)
              </label>
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full py-4 bg-gray-900 text-yellow-400 font-black rounded-3xl shadow-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save size={20} /> {member ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR COLABORADOR'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
