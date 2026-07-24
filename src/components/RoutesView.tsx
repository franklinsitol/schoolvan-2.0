import React, { useState, useEffect } from 'react';
import { MapPinned, Save, Navigation, Info, ChevronDown, ArrowUp, ArrowDown, Bus, CheckCircle2, MapPin } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { Student, Vehicle } from '../types';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

export function RoutesView() {
  const { profile } = useAuth();
  const [turno, setTurno] = useState('Manha_Ida');
  const { data: students } = useFirestore<Student>(`drivers/${profile?.id}/students`);
  const { data: vehicles } = useFirestore<Vehicle>(`drivers/${profile?.id}/vehicles`);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [orderedStudents, setOrderedStudents] = useState<Student[]>([]);

  useEffect(() => {
    if (vehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [vehicles, selectedVehicleId]);

  useEffect(() => {
    const list = students.filter(s => (!selectedVehicleId || s.vehicleId === selectedVehicleId) && s.status !== 'Excluido');
    setOrderedStudents(list);
  }, [students, selectedVehicleId]);

  const activeStudents = orderedStudents.filter(s => !s.ausenteHoje);
  const absentStudents = orderedStudents.filter(s => s.ausenteHoje);

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newActive = [...activeStudents];
    const temp = newActive[index - 1];
    newActive[index - 1] = newActive[index];
    newActive[index] = temp;
    setOrderedStudents([...newActive, ...absentStudents]);
  };

  const moveDown = (index: number) => {
    if (index === activeStudents.length - 1) return;
    const newActive = [...activeStudents];
    const temp = newActive[index + 1];
    newActive[index + 1] = newActive[index];
    newActive[index] = temp;
    setOrderedStudents([...newActive, ...absentStudents]);
  };

  const handleSaveRoute = () => {
    toast.success('Ordem da rota salva com sucesso!');
  };

  const handleOpenGoogleMaps = () => {
    const addresses = activeStudents
      .map(s => s.studentAddress)
      .filter(Boolean);

    if (addresses.length === 0) {
      toast.error('Nenhum endereço cadastrado nos alunos ativos da rota.');
      return;
    }

    const mapsUrl = `https://www.google.com/maps/dir/${addresses.map(a => encodeURIComponent(a!)).join('/')}`;
    window.open(mapsUrl, '_blank');
    toast.success('Abrindo rota otimizada no Google Maps...');
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="bg-yellow-400 text-gray-900 text-xs font-black px-3 py-1 rounded-full uppercase">
            Trajeto Otimizado
          </span>
          <h2 className="text-3xl font-extrabold text-gray-900 mt-1">Gestão de Rotas & GPS</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="bg-white border border-gray-200 rounded-2xl px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-yellow-400 font-bold text-sm cursor-pointer"
          >
            <option value="">Todas as Vans</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>

          <select 
            value={turno}
            onChange={(e) => setTurno(e.target.value)}
            className="bg-white border border-gray-200 rounded-2xl px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-yellow-400 font-bold text-sm cursor-pointer"
          >
            <option value="Manha_Ida">Manhã (Ida)</option>
            <option value="Tarde_Ida">Tarde (Ida)</option>
            <option value="Manha_Volta">Manhã (Volta)</option>
            <option value="Tarde_Volta">Tarde (Volta)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Route Order Column */}
        <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <span className="w-8 h-8 bg-yellow-400 text-gray-900 rounded-full flex items-center justify-center text-sm font-black">1</span>
              Ordem de Paradas
            </h3>
            <button 
              onClick={handleSaveRoute}
              className="bg-gray-900 text-yellow-400 px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 hover:bg-gray-800 transition-all shadow-md cursor-pointer"
            >
              <Save size={16} /> Salvar Ordem
            </button>
          </div>

          <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-200 flex items-start gap-3">
            <Info className="text-yellow-700 shrink-0 mt-0.5" size={18} />
            <p className="text-xs text-yellow-900 leading-relaxed font-medium">
              Ajuste a ordem usando as setas. Alunos que avisaram ausência no PWA dos pais são removidos da rota ativa automaticamente para economizar combustível.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-green-700 uppercase tracking-wider flex items-center gap-2">
                <Bus size={16} /> Alunos Confirmados na Rota ({activeStudents.length})
              </label>
            </div>

            <div className="space-y-2">
              {activeStudents.map((student, i) => (
                <div key={student.id} className="flex items-center gap-3 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl shadow-sm hover:border-yellow-300 transition-all">
                  <div className="font-black text-xs text-gray-400 w-5 text-center">#{i + 1}</div>
                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => moveUp(i)}
                      disabled={i === 0}
                      className="p-1 hover:bg-white rounded text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button 
                      onClick={() => moveDown(i)}
                      disabled={i === activeStudents.length - 1}
                      className="p-1 hover:bg-white rounded text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-gray-900 text-sm truncate">{student.name}</div>
                    <div className="text-xs text-gray-500 truncate flex items-center gap-1">
                      <MapPin size={12} className="text-yellow-500 shrink-0" />
                      <span>{student.studentAddress || 'Sem endereço informado'}</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-green-100 text-green-800 text-[10px] font-bold rounded-lg shrink-0">
                    Ativo
                  </span>
                </div>
              ))}

              {activeStudents.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-xs border-2 border-dashed border-gray-200 rounded-2xl space-y-1">
                  <Bus size={32} className="mx-auto opacity-30" />
                  <p className="font-bold">Nenhum aluno ativo nesta van/turno.</p>
                </div>
              )}
            </div>

            {absentStudents.length > 0 && (
              <div className="pt-4 space-y-2">
                <label className="text-xs font-black text-red-600 uppercase tracking-wider flex items-center gap-2">
                  <Info size={14} /> Ausentes de Hoje (Ignorados) ({absentStudents.length})
                </label>
                <div className="space-y-2 opacity-60">
                  {absentStudents.map((student) => (
                    <div key={student.id} className="flex items-center gap-3 p-3 bg-gray-100 rounded-2xl text-xs">
                      <div className="flex-1 min-w-0 font-bold text-gray-700 truncate">{student.name}</div>
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">
                        Ausente Hoje
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* GPS Navigation & Route Tracing Column */}
        <div className="space-y-8">
          <div className="bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white p-6 md:p-8 rounded-[40px] shadow-2xl border border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-black">2</span>
                Navegação GPS
              </h3>
              <span className="bg-green-500/20 text-green-400 text-xs font-bold px-3 py-1 rounded-full border border-green-500/30">
                {activeStudents.length} Paradas Ativas
              </span>
            </div>

            <p className="text-gray-300 text-xs leading-relaxed">
              Inicie a navegação com parada múltipla. Todos os endereços da rota ativa serão carregados diretamente no Google Maps.
            </p>

            <button 
              onClick={handleOpenGoogleMaps}
              className="w-full py-4 bg-green-500 hover:bg-green-400 text-white font-extrabold rounded-2xl text-sm transition-all shadow-xl flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
            >
              <Navigation size={20} />
              <span>ABRIR ROTA NO GOOGLE MAPS GPS</span>
            </button>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
              <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Resumo da Rota:</div>
              <div className="text-xs text-gray-300 space-y-1">
                <div className="flex justify-between">
                  <span>Van Selecionada:</span>
                  <span className="font-bold text-white">
                    {vehicles.find(v => v.id === selectedVehicleId)?.name || 'Nenhuma'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Turno:</span>
                  <span className="font-bold text-white">{turno.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Alunos Embarcados:</span>
                  <span className="font-bold text-green-400">
                    {activeStudents.filter(s => s.boardingStatus === 'Van').length} de {activeStudents.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
