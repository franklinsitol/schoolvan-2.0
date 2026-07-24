import React, { useState } from 'react';
import { X, Save, Bus, Users, MapPin, Info, User } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { Vehicle } from '../types';
import toast from 'react-hot-toast';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverId: string;
  vehicle?: Vehicle | null;
}

export function VehicleModal({ isOpen, onClose, driverId, vehicle }: VehicleModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Vehicle>>(
    vehicle || {
      name: '',
      capacity: 16,
      uncleName: '',
      city: '',
      state: '',
      about: '',
    }
  );

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const vehicleData = {
        ...formData,
        driverId,
        updatedAt: new Date().toISOString(),
      };

      if (vehicle?.id) {
        await updateDoc(doc(db, `drivers/${driverId}/vehicles`, vehicle.id), vehicleData);
        toast.success('Veículo atualizado com sucesso!');
      } else {
        await addDoc(collection(db, `drivers/${driverId}/vehicles`), {
          ...vehicleData,
          createdAt: new Date().toISOString(),
        });
        toast.success('Veículo cadastrado com sucesso!');
      }
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar veículo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
        <div className="p-6 bg-yellow-400 flex items-center justify-between">
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <Bus /> {vehicle ? 'Editar Van' : 'Nova Van'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 ml-1">Nome da Van (Ex: Van 01)</label>
              <input
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 ml-1">Capacidade (Lugares)</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    required
                    type="number"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none"
                    value={formData.capacity}
                    onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 ml-1">Nome do Tio/Tia</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none"
                    value={formData.uncleName}
                    onChange={e => setFormData({ ...formData, uncleName: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 ml-1">Cidade</label>
                <input
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 ml-1">Estado (UF)</label>
                <input
                  maxLength={2}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none uppercase"
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 ml-1">Sobre a Van (Opcional)</label>
              <textarea
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none resize-none"
                placeholder="Ex: Atendemos região central, ar condicionado..."
                value={formData.about}
                onChange={e => setFormData({ ...formData, about: e.target.value })}
              />
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
                <Save size={20} /> {vehicle ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR VAN'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
