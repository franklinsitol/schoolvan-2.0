import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Bus, 
  Users, 
  MapPin, 
  Info, 
  User, 
  DollarSign, 
  Home, 
  AlertCircle, 
  Sparkles, 
  Trash2,
  ShieldCheck,
  Calendar,
  FileText
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { Vehicle } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { playBusHornSound } from '../lib/sound';
import { checkCanAddVehicle, getPlanTier, isFrotaPlan, isFreePlan, isProPlan } from '../lib/plans';
import toast from 'react-hot-toast';

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverId: string;
  vehicle?: Vehicle | null;
  onOpenUpgradeModal?: (reason: string) => void;
  onDeleteRequest?: (vehicle: Vehicle) => void;
}

const BR_STATES = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

export function VehicleModal({ isOpen, onClose, driverId, vehicle, onOpenUpgradeModal, onDeleteRequest }: VehicleModalProps) {
  const { profile } = useAuth();
  const { data: existingVehicles } = useFirestore<Vehicle>(driverId ? `drivers/${driverId}/vehicles` : '');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    model: string;
    plate: string;
    renavam: string;
    capacity: number | string;
    uncleName: string;
    city: string;
    state: string;
    neighborhood: string;
    garageAddress: string;
    value: number | string;
    iconType: string;
    about: string;
    lastInspectionDate: string;
    nextInspectionDate: string;
    tacografoValidUntil: string;
  }>({
    name: '',
    model: '',
    plate: '',
    renavam: '',
    capacity: 15,
    uncleName: '',
    city: '',
    state: 'SP',
    neighborhood: '',
    garageAddress: '',
    value: '',
    iconType: 'fa-shuttle-van',
    about: '',
    lastInspectionDate: '',
    nextInspectionDate: '',
    tacografoValidUntil: '',
  });

  const rawPlan = profile?.plan || 'Gratuito';
  const planLower = rawPlan.toLowerCase();
  const isFrotaPlan = planLower.includes('frota') || planLower.includes('empresa') || planLower.includes('ilimitado');
  const isProPlan = !isFrotaPlan && planLower.includes('pro');
  const isFreePlan = !isFrotaPlan && !isProPlan;

  useEffect(() => {
    if (vehicle) {
      setFormData({
        name: vehicle.name || '',
        model: vehicle.model || '',
        plate: vehicle.plate || '',
        renavam: vehicle.renavam || '',
        capacity: vehicle.capacity !== undefined ? vehicle.capacity : 15,
        uncleName: vehicle.uncleName || '',
        city: vehicle.city || '',
        state: vehicle.state || 'SP',
        neighborhood: vehicle.neighborhood || '',
        garageAddress: vehicle.garageAddress || '',
        value: vehicle.value !== undefined && vehicle.value !== null ? vehicle.value : '',
        iconType: vehicle.iconType || 'fa-shuttle-van',
        about: vehicle.about || '',
        lastInspectionDate: vehicle.lastInspectionDate || '',
        nextInspectionDate: vehicle.nextInspectionDate || '',
        tacografoValidUntil: vehicle.tacografoValidUntil || '',
      });
    } else {
      setFormData({
        name: '',
        model: '',
        plate: '',
        renavam: '',
        capacity: 15,
        uncleName: '',
        city: '',
        state: 'SP',
        neighborhood: '',
        garageAddress: '',
        value: '',
        iconType: 'fa-shuttle-van',
        about: '',
        lastInspectionDate: '',
        nextInspectionDate: '',
        tacografoValidUntil: '',
      });
    }
  }, [vehicle]);

  const handleLastInspectionChange = (lastDate: string) => {
    if (lastDate) {
      // Calculate +6 months (semiannual inspection requirement)
      const d = new Date(lastDate);
      d.setMonth(d.getMonth() + 6);
      const nextDateStr = d.toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        lastInspectionDate: lastDate,
        nextInspectionDate: prev.nextInspectionDate ? prev.nextInspectionDate : nextDateStr
      }));
    } else {
      setFormData(prev => ({ ...prev, lastInspectionDate: lastDate }));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check vehicle limits on creation
    const isNewVehicle = !vehicle?.id;
    if (isNewVehicle) {
      const allowed = checkCanAddVehicle(profile, existingVehicles.length, onOpenUpgradeModal);
      if (!allowed) {
        onClose();
        return;
      }
    }

    setLoading(true);

    try {
      const parsedCapacity = Number(formData.capacity);
      const finalCapacity = isNaN(parsedCapacity) || parsedCapacity < 1 ? 15 : parsedCapacity;
      const parsedValue = Number(formData.value);
      const finalValue = isNaN(parsedValue) || parsedValue < 0 ? 0 : parsedValue;

      const vehicleData = {
        ...formData,
        capacity: finalCapacity,
        value: finalValue,
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
      <div className="bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200">
        <div className="p-6 bg-gradient-to-r from-yellow-400 to-amber-400 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-black/10 flex items-center justify-center text-gray-900 font-bold">
              <Bus size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-950">
                {vehicle ? 'Editar Dados da Van' : 'Cadastrar Nova Van'}
              </h2>
              <p className="text-xs font-bold text-gray-900 opacity-90">Gerencie capacidade, garagem e área de atuação</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition-colors text-gray-950 cursor-pointer">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 overflow-y-auto space-y-5">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 ml-1">Nome Interno da Van *</label>
              <input
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium text-gray-900"
                placeholder="Ex: Van 01 - Rota Sul"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 ml-1">Capacidade (Lugares) *</label>
                <div className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    required
                    type="number"
                    min="1"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium text-gray-900"
                    placeholder="15"
                    value={formData.capacity}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData({ ...formData, capacity: val === '' ? '' : Number(val) });
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 ml-1">Valor Mensal Base (R$)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="number"
                    step="0.01"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium text-gray-900"
                    placeholder="350.00"
                    value={formData.value}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData({ ...formData, value: val === '' ? '' : Number(val) });
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 ml-1">Nome do Tio(a) Público</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium text-gray-900"
                    placeholder="Ex: Tio Franklin"
                    value={formData.uncleName || ''}
                    onChange={e => setFormData({ ...formData, uncleName: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-700 ml-1">Estado (UF)</label>
                <select
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium text-gray-900"
                  value={formData.state || 'SP'}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                >
                  {BR_STATES.map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-700 ml-1">Cidades de Atuação</label>
                <input
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium text-gray-900"
                  placeholder="Ex: Santos, São Vicente"
                  value={formData.city || ''}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 ml-1">Bairros de Atuação (Separados por vírgula)</label>
              <input
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium text-gray-900"
                placeholder="Ex: Centro, Gonzaga, Boqueirão, Embaré"
                value={formData.neighborhood || ''}
                onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 ml-1">Endereço da Garagem (Partida/Fim da Rota GPS)</label>
              <div className="relative">
                <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium text-gray-900"
                  placeholder="Ex: Rua Floriano Peixoto, 100 - Gonzaga"
                  value={formData.garageAddress || ''}
                  onChange={e => setFormData({ ...formData, garageAddress: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-700 ml-1">Ícone / Estilo do Veículo</label>
              <select
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium text-gray-900"
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
              <label className="text-xs font-bold text-gray-700 ml-1">Sobre a Van / Diferenciais (Exibido no Marketplace)</label>
              <textarea
                rows={2}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium resize-none text-gray-900"
                placeholder="Ex: Ar-condicionado, Wi-Fi, monitora a bordo, câmera de segurança..."
                value={formData.about || ''}
                onChange={e => setFormData({ ...formData, about: e.target.value })}
              />
            </div>

            {/* 🛡️ INSPECTION & REGULATION CONTROL (CTB Art. 136) */}
            <div className="p-4 bg-yellow-50/70 border border-yellow-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-yellow-200/60 pb-2">
                <span className="text-xs font-black uppercase tracking-wider text-yellow-950 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-yellow-600" /> Controle de Vistorias & Tacógrafo (CTB Art. 136)
                </span>
                <span className="text-[10px] font-bold text-yellow-800 bg-yellow-200/60 px-2 py-0.5 rounded-md">
                  Semestral Obrigatória
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700 block">Placa do Veículo (Mercosul)</label>
                  <input
                    type="text"
                    placeholder="Ex: ABC1D23"
                    value={formData.plate}
                    onChange={e => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 uppercase focus:ring-2 focus:ring-yellow-400 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700 block">Código RENAVAM</label>
                  <input
                    type="text"
                    placeholder="Ex: 00123456789"
                    value={formData.renavam}
                    onChange={e => setFormData({ ...formData, renavam: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-yellow-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700 block">Data Última Vistoria</label>
                  <input
                    type="date"
                    value={formData.lastInspectionDate}
                    onChange={e => handleLastInspectionChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-yellow-400 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700 block">Próxima Vistoria (Validade)</label>
                  <input
                    type="date"
                    value={formData.nextInspectionDate}
                    onChange={e => setFormData({ ...formData, nextInspectionDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-yellow-400 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-700 block">Validade Tacógrafo</label>
                  <input
                    type="date"
                    value={formData.tacografoValidUntil}
                    onChange={e => setFormData({ ...formData, tacografoValidUntil: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-yellow-400 outline-none"
                  />
                </div>
              </div>

              <p className="text-[11px] text-yellow-900 leading-snug">
                💡 <em>O sistema alerta automaticamente quando a vistoria semestral ou o laudo do cronotacógrafo estiver a menos de 30 dias do vencimento.</em>
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gray-950 text-yellow-400 font-black rounded-2xl shadow-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={20} /> {vehicle ? 'SALVAR ALTERAÇÕES DA VAN' : 'CADASTRAR VEÍCULO'}
                </>
              )}
            </button>

            {vehicle && onDeleteRequest && (
              <button
                type="button"
                onClick={() => onDeleteRequest(vehicle)}
                className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer"
              >
                <Trash2 size={16} /> Excluir esta Van da Frota
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}


