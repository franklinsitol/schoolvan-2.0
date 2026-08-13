import React, { useState } from 'react';
import { Bus, Plus, Settings, MapPin, Users } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { Vehicle } from '../types';
import { VehicleModal } from './VehicleModal';

interface VehiclesViewProps {
  onOpenUpgradeModal?: (reason: string) => void;
}

export function VehiclesView({ onOpenUpgradeModal }: VehiclesViewProps) {
  const { profile } = useAuth();
  const { data: vehicles, loading } = useFirestore<Vehicle>(`drivers/${profile?.id}/vehicles`);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  if (loading) return <div className="p-8 text-center">Carregando...</div>;

  const userPlan = profile?.plan || 'Gratuito';

  const handleEdit = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    if (userPlan === 'Gratuito' && vehicles.length >= 1) {
      if (onOpenUpgradeModal) {
        onOpenUpgradeModal('multi_vehicle');
      } else {
        alert('O Plano Gratuito permite apenas 1 van cadastrada. Faça upgrade!');
      }
      return;
    }

    if (userPlan === 'Pro' && vehicles.length >= 1) {
      if (onOpenUpgradeModal) {
        onOpenUpgradeModal('multi_vehicle_pro');
      } else {
        alert('O Plano Pro inclui 1 van. Faça upgrade para o Plano Frota para cadastrar mais vans!');
      }
      return;
    }

    setSelectedVehicle(null);
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900">Minha Frota</h2>
        <button 
          onClick={handleAdd}
          className="bg-gray-900 text-yellow-400 px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-gray-800 transition-all"
        >
          <Plus size={20} /> Nova Van
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <div key={vehicle.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-yellow-50 rounded-2xl flex items-center justify-center text-yellow-600">
                <Bus size={24} />
              </div>
              <button 
                onClick={() => handleEdit(vehicle)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Settings size={18} className="text-gray-400" />
              </button>
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-1">{vehicle.name}</h3>
            <p className="text-gray-500 text-sm mb-4">{vehicle.uncleName || 'Motorista'}</p>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users size={16} className="text-yellow-500" />
                <span>{vehicle.capacity} Lugares</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin size={16} className="text-yellow-500" />
                <span>{vehicle.city} - {vehicle.state}</span>
              </div>
            </div>
          </div>
        ))}
        {vehicles.length === 0 && (
          <div className="col-span-full text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100 text-gray-400">
            Nenhum veículo cadastrado.
          </div>
        )}
      </div>

      <VehicleModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        driverId={profile?.id || ''}
        vehicle={selectedVehicle}
      />
    </div>
  );
}
