import React, { useState, useEffect } from 'react';
import { X, Save, Bus, Users, MapPin, Info, User, DollarSign, Home } from 'lucide-react';
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

const BR_STATES = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

export function VehicleModal({ isOpen, onClose, driverId, vehicle }: VehicleModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    name: '',
    capacity: 15,
    uncleName: '',
    city: '',
    state: 'SP',
    neighborhood: '',
    garageAddress: '',
    value: 0,
    iconType: 'fa-shuttle-van',
    about: '',
  });

  useEffect(() => {
    if (vehicle) {
      setFormData({
        name: vehicle.name || '',
        capacity: vehicle.capacity || 15,
        uncleName: vehicle.uncleName || '',
        city: vehicle.city || '',
        state: vehicle.state || 'SP',
        neighborhood: vehicle.neighborhood || '',
        garageAddress: vehicle.garageAddress || '',
        value: vehicle.value || 0,
        iconType: vehicle.iconType || 'fa-shuttle-van',
        about: vehicle.about || '',
      });
    } else {
      setFormData({
        name: '',
        capacity: 15,
        uncleName: '',
        city: '',
        state: 'SP',
        neighborhood: '',
        garageAddress: '',
        value: 0,
        iconType: 'fa-shuttle-van',
        about: '',
      });
    }
  }, [vehicle]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 bg-gradient-to-r from-yellow-400 to-amber-400 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-black/10 flex items-center justify-center text-gray-900 font-bold">
              <Bus size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">
                {vehicle ? 'Editar Dados da Van' : 'Cadastrar Nova Van'}
              </h2>
              <p className="text-xs font-semibold text-gray-800 opacity-80">Gerencie capacidade, garagem e área de atuação</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition-colors text-gray-900 cursor-pointer">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 overflow-y-auto space-y-5">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 ml-1">Nome Interno da Van *</label>
              <input
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                placeholder="Ex: Van 01 - Rota Sul"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Capacidade (Lugares) *</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    required
                    type="number"
                    min="1"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                    value={formData.capacity || 15}
                    onChange={e => setFormData({ ...formData, capacity: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Valor Mensal Base (R$)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="number"
                    step="0.01"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                    placeholder="350.00"
                    value={formData.value || 0}
                    onChange={e => setFormData({ ...formData, value: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Nome do Tio(a) Público</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                    placeholder="Ex: Tio Franklin"
                    value={formData.uncleName || ''}
                    onChange={e => setFormData({ ...formData, uncleName: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Estado (UF)</label>
                <select
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                  value={formData.state || 'SP'}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                >
                  {BR_STATES.map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Cidades de Atuação</label>
                <input
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                  placeholder="Ex: Santos, São Vicente"
                  value={formData.city || ''}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 ml-1">Bairros de Atuação (Separados por vírgula)</label>
              <input
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                placeholder="Ex: Centro, Gonzaga, Boqueirão, Embaré"
                value={formData.neighborhood || ''}
                onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 ml-1">Endereço da Garagem (Partida/Fim da Rota GPS)</label>
              <div className="relative">
                <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                  placeholder="Ex: Rua Floriano Peixoto, 100 - Gonzaga"
                  value={formData.garageAddress || ''}
                  onChange={e => setFormData({ ...formData, garageAddress: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 ml-1">Ícone / Estilo do Veículo</label>
              <select
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                value={formData.iconType || 'fa-shuttle-van'}
                onChange={e => setFormData({ ...formData, iconType: e.target.value })}
              >
                <option value="fa-shuttle-van">🚐 Van Escolar Amarela Padrão</option>
                <option value="fa-bus">🚌 Micro-ônibus Escolar</option>
                <option value="fa-bus-alt">🚍 Ônibus Escolar Grande</option>
                <option value="fa-shuttle-van text-blue-500">🚙 Van Escolar Azul</option>
                <option value="fa-shuttle-van text-emerald-500">🚐 Van Escolar Branca / Teto Alto</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-600 ml-1">Sobre a Van / Diferenciais (Exibido no Marketplace)</label>
              <textarea
                rows={2}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium resize-none"
                placeholder="Ex: Ar-condicionado, Wi-Fi, monitora a bordo, câmera de segurança..."
                value={formData.about || ''}
                onChange={e => setFormData({ ...formData, about: e.target.value })}
              />
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full py-4 bg-gray-900 text-yellow-400 font-black rounded-3xl shadow-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save size={20} /> {vehicle ? 'SALVAR ALTERAÇÕES DA VAN' : 'CADASTRAR VEÍCULO'}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

