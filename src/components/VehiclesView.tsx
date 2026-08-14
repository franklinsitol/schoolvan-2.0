import React, { useState } from 'react';
import { Bus, Plus, Settings, MapPin, Users, Sparkles, Zap, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { Vehicle } from '../types';
import { VehicleModal } from './VehicleModal';
import { playBusHornSound, speakTioIAPrompt } from '../lib/sound';
import toast from 'react-hot-toast';

interface VehiclesViewProps {
  onOpenUpgradeModal?: (reason: string) => void;
}

export function VehiclesView({ onOpenUpgradeModal }: VehiclesViewProps) {
  const { profile } = useAuth();
  const { data: vehicles, loading } = useFirestore<Vehicle>(`drivers/${profile?.id}/vehicles`);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  if (loading) return <div className="p-8 text-center font-bold text-gray-500">Carregando frota...</div>;

  const userPlan = profile?.plan || 'Gratuito';
  const isFreePlan = userPlan === 'Gratuito';
  const isProPlan = userPlan === 'Pro';
  const vehicleLimit = isFreePlan ? 1 : isProPlan ? 1 : 3;

  const handleEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    if (isFreePlan && vehicles.length >= 1) {
      playBusHornSound();
      speakTioIAPrompt("Tio, no Plano Gratuito você pode ter apenas 1 van cadastrada. Para adicionar mais vans à sua frota, faça o upgrade para o Plano Frota!");
      toast.error('O Plano Gratuito permite apenas 1 van. Faça o upgrade para o Plano Frota!');
      if (onOpenUpgradeModal) {
        onOpenUpgradeModal('multi_vehicle');
      }
      return;
    }

    if (isProPlan && vehicles.length >= 1) {
      playBusHornSound();
      speakTioIAPrompt("Tio, o Plano Pro inclui 1 van. Para gerenciar mais vans, faça o upgrade para o Plano Frota!");
      toast.error('O Plano Pro inclui 1 van. Faça o upgrade para o Plano Frota para cadastrar mais vans!');
      if (onOpenUpgradeModal) {
        onOpenUpgradeModal('multi_vehicle_pro');
      }
      return;
    }

    setSelectedVehicle(null);
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Top Bar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-yellow-400/20 text-yellow-800 dark:text-yellow-300 text-xs font-black rounded-full uppercase tracking-wider">
              Plano {userPlan} • {vehicles.length}/{vehicleLimit} {vehicleLimit === 1 ? 'Van' : 'Vans'}
            </span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mt-1">Minha Frota de Vans</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gerencie veículos, capacidade de passageiros e áreas de atendimento.</p>
        </div>

        <div className="flex items-center gap-3">
          {((isFreePlan || isProPlan) && vehicles.length >= 1) && (
            <button
              onClick={() => onOpenUpgradeModal && onOpenUpgradeModal(isFreePlan ? 'multi_vehicle' : 'multi_vehicle_pro')}
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

      {/* Plan limit notice banner if at capacity */}
      {isFreePlan && vehicles.length >= 1 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-4 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400 text-gray-950 rounded-xl flex items-center justify-center shrink-0 font-bold">
              <Bus size={20} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wide text-amber-900 dark:text-amber-200">
                Limite de 1 Van no Plano Gratuito Atingido
              </h4>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                Para cadastrar novas vans e gerenciar motoristas parceiros, faça o upgrade para o <strong>Plano Frota</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenUpgradeModal && onOpenUpgradeModal('multi_vehicle')}
            className="px-4 py-2 bg-gray-950 text-yellow-400 font-bold rounded-xl text-xs shadow hover:bg-gray-800 transition-all shrink-0 cursor-pointer"
          >
            Ver Planos
          </button>
        </div>
      )}

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <div key={vehicle.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-yellow-50 dark:bg-yellow-950/40 rounded-2xl flex items-center justify-center text-yellow-600 dark:text-yellow-400">
                <Bus size={24} />
              </div>
              <button 
                onClick={() => handleEdit(vehicle)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors cursor-pointer"
                title="Editar dados da Van"
              >
                <Settings size={18} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-0.5">{vehicle.name}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-xs font-semibold mb-4">{vehicle.uncleName || 'Motorista Titular'}</p>

            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
                <Users size={16} className="text-yellow-500 shrink-0" />
                <span>{vehicle.capacity} Lugares (Assentos para Alunos)</span>
              </div>
              {vehicle.city && (
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400">
                  <MapPin size={16} className="text-yellow-500 shrink-0" />
                  <span>{vehicle.city}{vehicle.state ? ` - ${vehicle.state}` : ''}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {vehicles.length === 0 && (
          <div className="col-span-full text-center py-20 bg-white dark:bg-gray-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 text-gray-400 space-y-3">
            <Bus size={40} className="mx-auto opacity-40 text-yellow-500" />
            <p className="font-bold text-gray-600 dark:text-gray-300 text-sm">Nenhum veículo cadastrado na frota.</p>
            <button
              onClick={handleAdd}
              className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-full text-xs shadow transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus size={16} /> Cadastrar Primeira Van
            </button>
          </div>
        )}
      </div>

      <VehicleModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        driverId={profile?.id || ''}
        vehicle={selectedVehicle}
        onOpenUpgradeModal={onOpenUpgradeModal}
      />
    </div>
  );
}
