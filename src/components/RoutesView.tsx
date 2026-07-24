import React, { useState } from 'react';
import { MapPinned, Save, Navigation, Info, ChevronDown, ArrowUp, ArrowDown, Bus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { Student, Vehicle } from '../types';
import { cn } from '../lib/utils';

export function RoutesView() {
  const { profile } = useAuth();
  const [turno, setTurno] = useState('Manha_Ida');
  const { data: students } = useFirestore<Student>(`drivers/${profile?.id}/students`);
  const { data: vehicles } = useFirestore<Vehicle>(`drivers/${profile?.id}/vehicles`);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');

  const filteredStudents = students.filter(s => s.vehicleId === selectedVehicleId && s.status === 'Ativo');

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900">Gestão de Rotas</h2>
        <div className="flex items-center gap-3">
          <select 
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm outline-none focus:ring-2 focus:ring-yellow-400"
          >
            <option value="">Selecione a Van</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <select 
            value={turno}
            onChange={(e) => setTurno(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm outline-none focus:ring-2 focus:ring-yellow-400"
          >
            <option value="Manha_Ida">Manhã (Ida)</option>
            <option value="Tarde_Ida">Tarde (Ida)</option>
            <option value="Manha_Volta">Manhã (Volta)</option>
            <option value="Tarde_Volta">Tarde (Volta)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Route Order */}
        <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-sm">1</span>
              Ordem da Rota
            </h3>
            <button className="bg-yellow-400 text-gray-900 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-yellow-500 transition-all shadow-md">
              <Save size={18} /> Salvar
            </button>
          </div>

          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-6 flex items-start gap-3">
            <Info className="text-gray-400 shrink-0" size={20} />
            <p className="text-xs text-gray-500">
              Defina a ordem de embarque/desembarque. Os alunos marcados como "Ausentes" são movidos automaticamente para o final ou ignorados.
            </p>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-bold text-green-600 uppercase tracking-wider flex items-center gap-2">
              <Bus size={14} /> Alunos na Rota
            </label>
            <div className="space-y-2">
              {filteredStudents.filter(s => !s.ausenteHoje).map((student, i) => (
                <div key={student.id} className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm group">
                  <div className="flex flex-col gap-1">
                    <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-900 transition-colors">
                      <ArrowUp size={14} />
                    </button>
                    <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-900 transition-colors">
                      <ArrowDown size={14} />
                    </button>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">{student.name}</div>
                    <div className="text-xs text-gray-500">{student.studentAddress}</div>
                  </div>
                  <button className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition-colors opacity-0 group-hover:opacity-100">
                    <ArrowDown size={18} />
                  </button>
                </div>
              ))}
              {filteredStudents.filter(s => !s.ausenteHoje).length === 0 && (
                <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-50 rounded-2xl">
                  Nenhum aluno na rota.
                </div>
              )}
            </div>

            <div className="flex justify-center py-2">
              <ChevronDown className="text-gray-300" />
            </div>

            <label className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-2">
              <Info size={14} /> Alunos Ignorados / Ausentes
            </label>
            <div className="space-y-2 opacity-60">
              {filteredStudents.filter(s => s.ausenteHoje).map((student) => (
                <div key={student.id} className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">{student.name}</div>
                    <div className="text-xs text-gray-500">Ausente hoje</div>
                  </div>
                  <button className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-colors">
                    <ArrowUp size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* GPS Optimization */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-sm">2</span>
                Otimização e GPS
              </h3>
              <button className="bg-green-500 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-green-600 transition-all shadow-md">
                <MapPinned size={18} /> Traçar Rota
              </button>
            </div>

            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Navigation className="text-gray-300" size={32} />
              </div>
              <p className="text-gray-500 text-sm max-w-xs mx-auto">
                Clique em "Traçar Rota" para calcular o melhor caminho e abrir no Google Maps.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
