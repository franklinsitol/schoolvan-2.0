import React, { useState } from 'react';
import { 
  Bus, 
  Plus, 
  Settings, 
  MapPin, 
  Users, 
  Zap, 
  Trash2, 
  AlertTriangle, 
  X, 
  ShieldAlert, 
  ShieldCheck, 
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { Vehicle } from '../types';
import { VehicleModal } from './VehicleModal';
import { playBusHornSound } from '../lib/sound';
import { checkCanAddVehicle, getPlanTier, isFrotaPlan, isFreePlan, isProPlan } from '../lib/plans';
import { db } from '../lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface VehiclesViewProps {
  onOpenUpgradeModal?: (reason: string) => void;
  triggerNewVehicle?: boolean;
  onNewVehicleHandled?: () => void;
}

export function getInspectionStatus(vehicle: Vehicle) {
  if (!vehicle.nextInspectionDate) {
    return {
      status: 'uninformed' as const,
      label: 'Vistoria Não Informada',
      badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
      icon: Clock,
      daysDiff: null
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextDate = new Date(vehicle.nextInspectionDate);
  const diffTime = nextDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'expired' as const,
      label: `Vistoria Vencida (${Math.abs(diffDays)} dias)`,
      badgeClass: 'bg-red-500 text-white border-red-600 font-black animate-pulse',
      icon: AlertTriangle,
      daysDiff: diffDays
    };
  } else if (diffDays <= 30) {
    return {
      status: 'warning' as const,
      label: `Vistoria Vence em ${diffDays} dias`,
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      icon: AlertCircle,
      daysDiff: diffDays
    };
  } else {
    return {
      status: 'ok' as const,
      label: `Vistoria em Dia (até ${new Date(vehicle.nextInspectionDate).toLocaleDateString('pt-BR')})`,
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
      icon: CheckCircle2,
      daysDiff: diffDays
    };
  }
}

export function VehiclesView({ 
  onOpenUpgradeModal,
  triggerNewVehicle,
  onNewVehicleHandled
}: VehiclesViewProps) {
  const { profile } = useAuth();
  const { data: vehicles, loading } = useFirestore<Vehicle>(profile?.id ? `drivers/${profile.id}/vehicles` : '');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Auto-open vehicle modal when triggered from T.IA modal confirmation
  React.useEffect(() => {
    if (triggerNewVehicle) {
      setSelectedVehicle(null);
      setIsModalOpen(true);
      if (onNewVehicleHandled) {
        onNewVehicleHandled();
      }
    }
  }, [triggerNewVehicle, onNewVehicleHandled]);

  if (loading) {
    return (
      <div className="p-8 text-center font-bold text-gray-500 flex items-center justify-center gap-2">
        <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
        <span>Carregando frota...</span>
      </div>
    );
  }

  const currentPlan = getPlanTier(profile);
  const hasFrota = isFrotaPlan(profile);
  
  // Free / Basic = 1 van; Pro = 1 van; Frota = 3 inclusas + ilimitadas adicionais
  const extraVansCount = hasFrota ? Math.max(0, vehicles.length - 3) : 0;
  const monthlyExtraFee = extraVansCount * 79.90;

  // Inspections analysis
  const expiredVehicles = vehicles.filter(v => getInspectionStatus(v).status === 'expired');
  const warningVehicles = vehicles.filter(v => getInspectionStatus(v).status === 'warning');

  const handleEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    const allowed = checkCanAddVehicle(profile, vehicles.length, onOpenUpgradeModal);
    if (!allowed) return;

    setSelectedVehicle(null);
    setIsModalOpen(true);
  };

  const confirmDeleteVehicle = async () => {
    if (!profile?.id || !vehicleToDelete?.id) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, `drivers/${profile.id}/vehicles`, vehicleToDelete.id));
      playBusHornSound();
      toast.success(`Van "${vehicleToDelete.name}" excluída com sucesso!`);
      if (selectedVehicle?.id === vehicleToDelete.id) {
        setSelectedVehicle(null);
        setIsModalOpen(false);
      }
      setVehicleToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir veículo:', error);
      toast.error('Erro ao excluir van. Tente novamente.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-yellow-400/25 border border-yellow-500/40 text-yellow-950 text-xs font-black rounded-full uppercase tracking-wider">
              Plano {currentPlan} • {vehicles.length} {vehicles.length === 1 ? 'Van' : 'Vans'} {hasFrota && (extraVansCount > 0 ? `(3 Inclusas + ${extraVansCount} Extras)` : '(3 Inclusas)')}
            </span>
          </div>
          <h2 className="text-3xl font-black text-gray-950 mt-1">Minha Frota & Vistorias</h2>
          <p className="text-sm font-medium text-gray-600">Controle de veículos, laudos semestrais (CTB Art. 136) e capacidade de assentos.</p>
        </div>

        <div className="flex items-center gap-3">
          {((isFreePlan(profile) || isProPlan(profile)) && vehicles.length >= 1) && (
            <button
              onClick={() => onOpenUpgradeModal && onOpenUpgradeModal(isFreePlan(profile) ? 'multi_vehicle' : 'multi_vehicle_pro')}
              className="px-4 py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-gray-950 font-black rounded-full text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Zap size={15} /> Fazer Upgrade da Frota
            </button>
          )}

          <button 
            onClick={handleAdd}
            className="bg-gray-950 text-yellow-400 px-6 py-2.5 rounded-full font-black text-sm flex items-center gap-2 hover:bg-gray-800 transition-all cursor-pointer shadow-lg active:scale-95"
          >
            <Plus size={18} /> Nova Van
          </button>
        </div>
      </div>

      {/* ⚠️ INSPECTION ALERT BANNER (IF ANY VEHICLE EXPIRED OR EXPIRING SOON) */}
      {expiredVehicles.length > 0 && (
        <div className="bg-red-500 text-white p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-red-600 flex items-center justify-center font-black shrink-0">
              <AlertTriangle size={22} />
            </div>
            <div>
              <h4 className="font-black text-sm uppercase tracking-wide">
                Atenção: {expiredVehicles.length} {expiredVehicles.length === 1 ? 'Veículo com Vistoria Vencida!' : 'Veículos com Vistoria Vencida!'}
              </h4>
              <p className="text-xs text-red-100 mt-0.5">
                Vans com laudo semestral vencido estão sujeitas a autuação e apreensão pelos órgãos de trânsito (CTB Art. 136).
              </p>
            </div>
          </div>
        </div>
      )}

      {warningVehicles.length > 0 && expiredVehicles.length === 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 text-amber-950 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-gray-950 flex items-center justify-center font-black shrink-0">
              <Clock size={22} />
            </div>
            <div>
              <h4 className="font-black text-sm">
                Alerta Preventivo de Vistoria ({warningVehicles.length} {warningVehicles.length === 1 ? 'veículo' : 'veículos'})
              </h4>
              <p className="text-xs text-amber-900 mt-0.5">
                Agende a inspeção veicular semestral junto ao Detran/órgão gestor para manter a regularidade da frota.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Frota Plan: Informative Banner if 3 or more vans */}
      {hasFrota && (
        <div className="bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-transparent border border-yellow-500/30 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 text-gray-950 rounded-xl flex items-center justify-center shrink-0 font-black shadow-sm">
              <Bus size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-black uppercase tracking-wide text-gray-950">
                  Plano Frota Pro • 3 Vans Inclusas (+ R$ 79,90/mês por van adicional)
                </h4>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Vencimento dia 10
                </span>
              </div>
              <p className="text-xs text-gray-700 mt-0.5">
                {extraVansCount > 0 
                  ? `Você possui ${vehicles.length} vans cadastradas (${extraVansCount} adicional = +R$ ${monthlyExtraFee.toFixed(2).replace('.', ',')}/mês). A liberação é imediata e o proporcional vem na fatura consolidada do dia 10.` 
                  : 'Suas primeiras 3 vans estão 100% inclusas no valor base (R$ 149/mês). A partir da 4ª van, adicione novas vans na hora sem travar seu negócio!'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plan limit notice banner if Free/Pro at capacity */}
      {(isFreePlan(profile) || isProPlan(profile)) && vehicles.length >= 1 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400 text-gray-950 rounded-xl flex items-center justify-center shrink-0 font-bold shadow-sm">
              <Bus size={20} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wide text-amber-950">
                Capacidade de 1 Van ({currentPlan}) Ativa
              </h4>
              <p className="text-xs text-amber-900 mt-0.5">
                Para cadastrar novas vans e gerenciar motoristas parceiros simultâneos, faça o upgrade para o <strong>Plano Frota</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenUpgradeModal && onOpenUpgradeModal(isFreePlan(profile) ? 'multi_vehicle' : 'multi_vehicle_pro')}
            className="px-4 py-2 bg-gray-950 text-yellow-400 font-black rounded-xl text-xs shadow hover:bg-gray-800 transition-all shrink-0 cursor-pointer"
          >
            Upgrade Plano Frota
          </button>
        </div>
      )}

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => {
          const insp = getInspectionStatus(vehicle);
          const InspIcon = insp.icon;

          return (
            <div key={vehicle.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200/90 hover:shadow-md transition-all flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="w-12 h-12 bg-yellow-100/70 border border-yellow-200 rounded-2xl flex items-center justify-center text-yellow-700 shadow-sm">
                    <Bus size={24} />
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleEdit(vehicle)}
                      className="p-2 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-gray-500 hover:text-gray-900"
                      title="Editar dados da Van"
                    >
                      <Settings size={18} />
                    </button>
                    <button 
                      onClick={() => setVehicleToDelete(vehicle)}
                      className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl transition-colors cursor-pointer"
                      title="Excluir Van da Frota"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xl font-black text-gray-950 mb-0.5">{vehicle.name}</h3>
                    <p className="text-gray-600 text-xs font-bold">{vehicle.uncleName || 'Motorista Titular'}</p>
                  </div>
                  {vehicle.plate && (
                    <span className="px-2.5 py-1 bg-gray-900 text-yellow-400 font-mono font-black text-xs rounded-lg uppercase tracking-wider border border-yellow-400/30">
                      {vehicle.plate}
                    </span>
                  )}
                </div>
              </div>

              {/* Inspection Badge */}
              <div className={`px-3 py-2 rounded-2xl border text-xs flex items-center gap-2 ${insp.badgeClass}`}>
                <InspIcon size={16} className="shrink-0" />
                <span className="truncate">{insp.label}</span>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                  <span className="flex items-center gap-1.5">
                    <Users size={15} className="text-yellow-600 shrink-0" />
                    <span>{vehicle.capacity} Lugares</span>
                  </span>
                  {vehicle.tacografoValidUntil && (
                    <span className="text-[11px] font-semibold text-gray-500">
                      Tacógrafo: {new Date(vehicle.tacografoValidUntil).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>

                {vehicle.city && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                    <MapPin size={15} className="text-yellow-600 shrink-0" />
                    <span className="truncate">{vehicle.city}{vehicle.state ? ` - ${vehicle.state}` : ''} {vehicle.neighborhood ? `(${vehicle.neighborhood})` : ''}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {vehicles.length === 0 && (
          <div className="col-span-full text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-200 text-gray-500 space-y-3 shadow-sm">
            <Bus size={40} className="mx-auto opacity-40 text-yellow-600" />
            <p className="font-bold text-gray-800 text-sm">Nenhum veículo cadastrado na frota.</p>
            <button
              onClick={handleAdd}
              className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-full text-xs shadow transition-all inline-flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus size={16} /> Cadastrar Primeira Van
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal (Iframe-safe custom dialog) */}
      {vehicleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-200 animate-scale-up">
            <div className="p-6 bg-red-50 border-b border-red-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-500 text-white flex items-center justify-center shrink-0 shadow-md">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-950">Excluir Van da Frota</h3>
                  <p className="text-xs font-semibold text-red-700">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              <button
                onClick={() => setVehicleToDelete(null)}
                className="p-1.5 hover:bg-red-100 text-gray-500 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                Tem certeza que deseja excluir permanentemente a van <strong className="text-gray-950 font-black">"{vehicleToDelete.name}"</strong> ({vehicleToDelete.capacity} lugares)?
              </p>
              
              <div className="bg-amber-50 border border-amber-200/80 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
                <ShieldAlert size={18} className="text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Os passageiros e cobranças permanecerão salvos na plataforma, mas a van deixará de aparecer no painel de rotas e no marketplace.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setVehicleToDelete(null)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={confirmDeleteVehicle}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl text-xs shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Excluindo...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={15} />
                      <span>Sim, Excluir Van</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <VehicleModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        driverId={profile?.id || ''}
        vehicle={selectedVehicle}
        onOpenUpgradeModal={onOpenUpgradeModal}
        onDeleteRequest={(v) => {
          setIsModalOpen(false);
          setVehicleToDelete(v);
        }}
      />
    </div>
  );
}

