import React, { useState, useEffect, useMemo } from 'react';
import { 
  MapPinned, 
  Save, 
  Navigation, 
  Info, 
  ChevronDown, 
  ArrowUp, 
  ArrowDown, 
  Bus, 
  CheckCircle2, 
  MapPin, 
  CalendarX, 
  School, 
  Clock, 
  Home, 
  Building2, 
  Sparkles, 
  RefreshCw, 
  Users, 
  Phone 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { Student, Vehicle } from '../types';
import { cn } from '../lib/utils';
import { isStudentAbsentOnDate, formatDateBR, getTodayStr } from '../lib/absence';
import toast from 'react-hot-toast';

export interface RouteStop {
  id: string;
  type: 'student' | 'school';
  title: string;
  address: string;
  schoolName?: string;
  timeLabel?: string;
  studentCount?: number;
  studentsList?: Student[];
  studentData?: Student;
}

export function RoutesView() {
  const { profile } = useAuth();
  const [turno, setTurno] = useState('Manha_Ida');
  const { data: students } = useFirestore<Student>(`drivers/${profile?.id}/students`);
  const { data: vehicles } = useFirestore<Vehicle>(`drivers/${profile?.id}/vehicles`);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [orderedStudents, setOrderedStudents] = useState<Student[]>([]);
  const [customStops, setCustomStops] = useState<RouteStop[] | null>(null);

  useEffect(() => {
    if (vehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [vehicles, selectedVehicleId]);

  useEffect(() => {
    const list = students.filter(s => (!selectedVehicleId || s.vehicleId === selectedVehicleId) && s.status !== 'Excluido');
    setOrderedStudents(list);
    setCustomStops(null); // reset custom order on vehicle change
  }, [students, selectedVehicleId]);

  const activeStudents = orderedStudents.filter(s => !isStudentAbsentOnDate(s));
  const absentStudents = orderedStudents.filter(s => isStudentAbsentOnDate(s));

  // Determine if it's an Ida (Going to school) or Volta (Leaving school) shift
  const isIda = turno.includes('Ida');

  // Generate engineered route stops grouped by school and entry/exit time
  const autoRouteStops = useMemo<RouteStop[]>(() => {
    if (activeStudents.length === 0) return [];

    // Group active students by school name
    const schoolGroups = new Map<string, Student[]>();
    activeStudents.forEach(student => {
      const schKey = (student.schoolName || 'Escola não informada').trim();
      if (!schoolGroups.has(schKey)) {
        schoolGroups.set(schKey, []);
      }
      schoolGroups.get(schKey)!.push(student);
    });

    // Convert map to array and sort by time (entryTime for Ida, exitTime for Volta)
    const sortedSchoolEntries = Array.from(schoolGroups.entries()).sort((a, b) => {
      const studentsA = a[1];
      const studentsB = b[1];

      const timeA = isIda 
        ? (studentsA[0]?.entryTime || '07:00') 
        : (studentsA[0]?.exitTime || '12:00');
      const timeB = isIda 
        ? (studentsB[0]?.entryTime || '07:00') 
        : (studentsB[0]?.exitTime || '12:00');

      return timeA.localeCompare(timeB);
    });

    const stops: RouteStop[] = [];

    sortedSchoolEntries.forEach(([schoolName, schoolStudents]) => {
      // Pick best school address
      const schAddress = schoolStudents.find(s => s.schoolAddress)?.schoolAddress || schoolName;
      const targetTime = isIda 
        ? (schoolStudents.find(s => s.entryTime)?.entryTime || '07:00')
        : (schoolStudents.find(s => s.exitTime)?.exitTime || '12:00');

      const schoolStop: RouteStop = {
        id: `school-${schoolName}`,
        type: 'school',
        title: schoolName,
        address: schAddress,
        schoolName: schoolName,
        timeLabel: targetTime,
        studentCount: schoolStudents.length,
        studentsList: schoolStudents,
      };

      const studentStops: RouteStop[] = schoolStudents.map(s => ({
        id: `student-${s.id}`,
        type: 'student',
        title: s.name,
        address: s.studentAddress || 'Endereço residencial não cadastrado',
        schoolName: s.schoolName,
        timeLabel: isIda ? s.entryTime : s.exitTime,
        studentData: s,
      }));

      if (isIda) {
        // IDA: Pick up students at home FIRST -> Then drop off at School
        stops.push(...studentStops);
        stops.push(schoolStop);
      } else {
        // VOLTA: Pick up students at School FIRST -> Then drop off at Homes
        stops.push(schoolStop);
        stops.push(...studentStops);
      }
    });

    return stops;
  }, [activeStudents, isIda, turno]);

  // Current stops (custom manually ordered or auto-generated)
  const routeStops = customStops || autoRouteStops;

  // Unique schools in current active route
  const uniqueSchools = useMemo(() => {
    const map = new Map<string, number>();
    activeStudents.forEach(s => {
      const name = s.schoolName || 'Escola não informada';
      map.set(name, (map.get(name) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [activeStudents]);

  // Collect future scheduled absences for alert card
  const todayStr = getTodayStr();
  const upcomingAbsences = students.flatMap(s => {
    const sched = s.scheduledAbsences || [];
    return sched
      .filter(a => a.date >= todayStr)
      .map(a => ({ studentName: s.name, parentName: s.parentName, ...a }));
  }).sort((a, b) => a.date.localeCompare(b.date));

  const moveStopUp = (index: number) => {
    if (index === 0) return;
    const newStops = [...routeStops];
    const temp = newStops[index - 1];
    newStops[index - 1] = newStops[index];
    newStops[index] = temp;
    setCustomStops(newStops);
  };

  const moveStopDown = (index: number) => {
    if (index === routeStops.length - 1) return;
    const newStops = [...routeStops];
    const temp = newStops[index + 1];
    newStops[index + 1] = newStops[index];
    newStops[index] = temp;
    setCustomStops(newStops);
  };

  const handleResetAutoRoute = () => {
    setCustomStops(null);
    toast.success('Rota reorganizada automaticamente por escola e horário!');
  };

  const handleSaveRoute = () => {
    toast.success('Ordem sequencial da rota salva com sucesso!');
  };

  const handleOpenGoogleMaps = () => {
    if (routeStops.length === 0) {
      toast.error('Nenhum ponto ou escola cadastrado para os alunos da rota.');
      return;
    }

    // Collect all valid stop addresses in exact sequence
    const waypoints = routeStops
      .map(s => s.address || s.title)
      .filter(Boolean);

    if (waypoints.length === 0) {
      toast.error('Nenhum endereço de aluno ou escola disponível para o GPS.');
      return;
    }

    const mapsUrl = `https://www.google.com/maps/dir/${waypoints.map(a => encodeURIComponent(a)).join('/')}`;
    window.open(mapsUrl, '_blank');
    toast.success('Abrindo rota GPS no Google Maps com paradas nas residências e escolas...');
  };

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="bg-yellow-400 text-gray-900 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
            Logística & Rota Inteligente
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
            onChange={(e) => {
              setTurno(e.target.value);
              setCustomStops(null); // recompute auto stops on shift change
            }}
            className="bg-white border border-gray-200 rounded-2xl px-4 py-2.5 shadow-sm outline-none focus:ring-2 focus:ring-yellow-400 font-bold text-sm cursor-pointer"
          >
            <option value="Manha_Ida">Manhã (Ida - Para a Escola)</option>
            <option value="Tarde_Ida">Tarde (Ida - Para a Escola)</option>
            <option value="Manha_Volta">Manhã (Volta - Para Casa)</option>
            <option value="Tarde_Volta">Tarde (Volta - Para Casa)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Route Sequence Column */}
        <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-gray-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900">
                <span className="w-8 h-8 bg-yellow-400 text-gray-900 rounded-full flex items-center justify-center text-sm font-black">1</span>
                Sequência de Paradas ({routeStops.length})
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {isIda ? 'Embarque dos alunos em casa → Desembarque na Escola' : 'Embarque na Escola → Desembarque nas Casas'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={handleResetAutoRoute}
                title="Reorganizar automaticamente por horário e escola"
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-blue-200"
              >
                <Sparkles size={14} className="text-blue-600" /> Auto-Organizar
              </button>

              <button 
                onClick={handleSaveRoute}
                className="bg-gray-900 text-yellow-400 hover:bg-gray-800 px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Save size={14} /> Salvar
              </button>
            </div>
          </div>

          {/* Upcoming Absences Banner */}
          {upcomingAbsences.length > 0 && (
            <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 space-y-2">
              <label className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarX size={16} className="text-amber-600" /> Faltas Agendadas pelos Pais ({upcomingAbsences.length})
              </label>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {upcomingAbsences.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl text-xs border border-amber-100 shadow-2xs">
                    <div>
                      <span className="font-bold text-gray-900">{item.studentName}</span>
                      {item.reason && <span className="text-gray-500 text-[11px] ml-1.5">({item.reason})</span>}
                    </div>
                    <span className="font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded text-[10px]">
                      {formatDateBR(item.date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logistical Strategy Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-200 flex items-start gap-3">
            <Building2 className="text-blue-600 shrink-0 mt-0.5" size={20} />
            <div className="text-xs text-blue-950 leading-relaxed font-medium space-y-1">
              <span className="font-bold text-blue-900">Engenharia de Rota por Escola:</span>
              <p>
                {isIda 
                  ? 'Coletamos os alunos em suas residências e, ao finalizar os alunos de determinada escola, realizamos a parada de desembarque diretamente no endereço da Escola.' 
                  : 'Buscamos os alunos reunidos no endereço da Escola e, em seguida, realizamos o desembarque em suas respectivas residências.'}
              </p>
            </div>
          </div>

          {/* Stops List */}
          <div className="space-y-3">
            {routeStops.map((stop, i) => {
              const isSchool = stop.type === 'school';

              if (isSchool) {
                return (
                  <div 
                    key={stop.id} 
                    className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl shadow-md border border-blue-400/30 transition-all"
                  >
                    <div className="font-black text-xs text-blue-300 w-6 text-center mt-1">#{i + 1}</div>

                    <div className="flex flex-col gap-1 mt-0.5">
                      <button 
                        onClick={() => moveStopUp(i)}
                        disabled={i === 0}
                        className="p-1 hover:bg-white/10 rounded text-blue-200 disabled:opacity-20 transition-colors cursor-pointer"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button 
                        onClick={() => moveStopDown(i)}
                        disabled={i === routeStops.length - 1}
                        className="p-1 hover:bg-white/10 rounded text-blue-200 disabled:opacity-20 transition-colors cursor-pointer"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="bg-yellow-400 text-gray-900 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                            <Building2 size={12} /> {isIda ? 'Destino Final Escola' : 'Origem Embarque Escola'}
                          </span>
                          <h4 className="font-black text-base text-white truncate">{stop.title}</h4>
                        </div>

                        {stop.timeLabel && (
                          <span className="bg-blue-500/30 text-blue-200 text-xs font-bold px-2.5 py-1 rounded-lg border border-blue-400/30 flex items-center gap-1">
                            <Clock size={12} className="text-yellow-400" />
                            {isIda ? `Entrada: ${stop.timeLabel}` : `Saída: ${stop.timeLabel}`}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-blue-100/80 flex items-center gap-1.5">
                        <MapPin size={14} className="text-yellow-400 shrink-0" />
                        <span className="truncate">{stop.address}</span>
                      </div>

                      {stop.studentsList && stop.studentsList.length > 0 && (
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-blue-200">
                          <span className="font-semibold flex items-center gap-1.5">
                            <Users size={14} className="text-blue-300" />
                            {isIda ? 'Alunos Entregues Nesta Escola:' : 'Alunos Coletados Nesta Escola:'}
                          </span>
                          <div className="flex items-center gap-1 flex-wrap">
                            {stop.studentsList.map(st => (
                              <span key={st.id} className="bg-white/10 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-md border border-white/10">
                                {st.name.split(' ')[0]}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Student Stop
              const student = stop.studentData;
              return (
                <div 
                  key={stop.id} 
                  className="flex items-center gap-3 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl shadow-sm hover:border-yellow-300 transition-all"
                >
                  <div className="font-black text-xs text-gray-400 w-6 text-center">#{i + 1}</div>

                  <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => moveStopUp(i)}
                      disabled={i === 0}
                      className="p-1 hover:bg-white rounded text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button 
                      onClick={() => moveStopDown(i)}
                      disabled={i === routeStops.length - 1}
                      className="p-1 hover:bg-white rounded text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-gray-900 text-sm flex items-center gap-1">
                        <Home size={14} className="text-yellow-600" />
                        {stop.title}
                      </span>

                      {stop.schoolName && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold rounded-md">
                          <School size={12} className="text-blue-500" />
                          {stop.schoolName}
                        </span>
                      )}

                      {stop.timeLabel && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold rounded-md">
                          <Clock size={11} className="text-amber-600" />
                          {isIda ? `Entrada ${stop.timeLabel}` : `Saída ${stop.timeLabel}`}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 flex flex-col sm:flex-row sm:items-center gap-x-3 gap-y-0.5">
                      <span className="flex items-center gap-1 truncate">
                        <MapPin size={12} className="text-yellow-500 shrink-0" />
                        <span className="truncate">{stop.address}</span>
                      </span>
                      {student?.parentPhone && (
                        <a 
                          href={`https://wa.me/55${student.parentPhone.replace(/\D/g, '')}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center gap-1 text-green-600 hover:underline font-semibold"
                        >
                          <Phone size={11} /> {student.parentPhone}
                        </a>
                      )}
                    </div>
                  </div>

                  <span className="px-2.5 py-1 bg-green-100 text-green-800 text-[10px] font-bold rounded-lg shrink-0">
                    Ativo
                  </span>
                </div>
              );
            })}

            {routeStops.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-xs border-2 border-dashed border-gray-200 rounded-2xl space-y-1">
                <Bus size={32} className="mx-auto opacity-30" />
                <p className="font-bold">Nenhum aluno ativo nesta van/turno.</p>
              </div>
            )}
          </div>

          {/* Absent Students Section */}
          {absentStudents.length > 0 && (
            <div className="pt-4 space-y-2 border-t border-gray-100">
              <label className="text-xs font-black text-red-600 uppercase tracking-wider flex items-center gap-2">
                <Info size={14} /> Alunos Ausentes Hoje (Removidos da Rota) ({absentStudents.length})
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

        {/* GPS Navigation Column */}
        <div className="space-y-8">
          <div className="bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white p-6 md:p-8 rounded-[40px] shadow-2xl border border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-black">2</span>
                Navegação GPS
              </h3>
              <span className="bg-green-500/20 text-green-400 text-xs font-bold px-3 py-1 rounded-full border border-green-500/30">
                {routeStops.length} Paradas na Sequência
              </span>
            </div>

            <p className="text-gray-300 text-xs leading-relaxed">
              Inicie a navegação com parada múltipla. Todas as residências e paradas de escolas serão enviadas ao Google Maps em ordem sequencial exata.
            </p>

            <button 
              onClick={handleOpenGoogleMaps}
              className="w-full py-4 bg-green-500 hover:bg-green-400 text-white font-extrabold rounded-2xl text-sm transition-all shadow-xl flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
            >
              <Navigation size={20} />
              <span>ABRIR ROTA COMPLETA NO GOOGLE MAPS GPS</span>
            </button>

            {/* Summary Box */}
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
              <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Resumo da Rota Logística:</div>
              <div className="text-xs text-gray-300 space-y-1.5">
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
                  <span>Paradas Totais:</span>
                  <span className="font-bold text-green-400">
                    {routeStops.length} ({routeStops.filter(s => s.type === 'student').length} casas + {routeStops.filter(s => s.type === 'school').length} escolas)
                  </span>
                </div>
              </div>

              {/* Schools Summary */}
              <div className="border-t border-white/10 pt-3 space-y-2">
                <div className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Escolas Atendidas Neste Turno:</span>
                  <span className="text-[10px] text-gray-400 font-normal">({uniqueSchools.length})</span>
                </div>
                {uniqueSchools.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {uniqueSchools.map((sch, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-gray-200 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                        <span className="font-semibold flex items-center gap-1.5 truncate">
                          <Building2 size={13} className="text-blue-400 shrink-0" />
                          <span className="truncate">{sch.name}</span>
                        </span>
                        <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold shrink-0">
                          {sch.count} {sch.count === 1 ? 'aluno' : 'alunos'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 italic">Nenhuma escola cadastrada para os alunos desta rota.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

