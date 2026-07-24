import React, { useState } from 'react';
import { ShieldCheck, Plus, Settings, Mail, Phone, Bus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { TeamMember, Vehicle } from '../types';
import { cn } from '../lib/utils';
import { TeamModal } from './TeamModal';

export function TeamView() {
  const { profile } = useAuth();
  const { data: team, loading } = useFirestore<TeamMember>(`drivers/${profile?.id}/team`);
  const { data: vehicles } = useFirestore<Vehicle>(`drivers/${profile?.id}/vehicles`);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  if (loading) return <div className="p-8 text-center">Carregando...</div>;

  const handleEdit = (member: TeamMember) => {
    setSelectedMember(member);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setSelectedMember(null);
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-3xl font-extrabold text-gray-900">Minha Equipe</h2>
        <button 
          onClick={handleAdd}
          className="bg-gray-900 text-yellow-400 px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-gray-800 transition-all"
        >
          <Plus size={20} /> Novo Colaborador
        </button>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-8 flex items-start gap-3">
        <ShieldCheck className="text-blue-600 shrink-0" size={20} />
        <p className="text-sm text-blue-800">
          Crie login e senha para sua equipe (Motoristas ou Monitores). Você define quem pode editar ou apenas visualizar os dados.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {team.map((member) => {
          const van = vehicles.find(v => v.id === member.vehicleId);
          return (
            <div key={member.id} className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-gray-900">{member.name}</h3>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                    member.canEdit ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  )}>
                    {member.canEdit ? 'Editor' : 'Leitor'}
                  </span>
                </div>
                
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Mail size={14} />
                    <span>{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Phone size={14} />
                    <span>{member.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-700 font-medium mt-1">
                    <Bus size={14} className="text-yellow-500" />
                    <span className="bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                      {van?.name || 'Nenhuma Van vinculada'}
                    </span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => handleEdit(member)}
                className="p-3 hover:bg-gray-100 rounded-2xl transition-colors border border-gray-50"
              >
                <Settings size={20} className="text-gray-400" />
              </button>
            </div>
          );
        })}
        {team.length === 0 && (
          <div className="col-span-full text-center py-10 text-gray-400 text-sm">
            Nenhum colaborador cadastrado.
          </div>
        )}
      </div>

      <TeamModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        driverId={profile?.id || ''}
        vehicles={vehicles}
        member={selectedMember}
      />
    </div>
  );
}
