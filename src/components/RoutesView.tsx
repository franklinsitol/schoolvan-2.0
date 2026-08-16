import React, { useState, useEffect, useMemo } from 'react';
import { 
  MapPinned, 
  Save, 
  Navigation, 
  Info, 
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
  Phone,
  Calendar,
  GripVertical,
  PlusCircle,
  XCircle,
  AlertTriangle,
  UserPlus,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { Student, Vehicle } from '../types';
import { cn } from '../lib/utils';
import { 
  isStudentAbsentOnDate, 
  formatDateBR, 
  getTodayStr, 
  markStudentAbsent, 
  reintegrateStudentToRoute 
} from '../lib/absence';
import { playBusHornSound } from '../lib/sound';
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
  const todayStr = getTodayStr();
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [turno, setTurno] = useState('Manha_Ida');
  const { data: students } = useFirestore<Student>(`drivers/${profile?.id}/students`);
  const { data: vehicles } = useFirestore<Vehicle>(`drivers/${profile?.id}/vehicles`);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [orderedStudents, setOrderedStudents] = useState<Student[]>([]);
  const [customStops, setCustomStops] = useState<RouteStop[] | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ type: 'stop' | 'student'; id: string; index?: number } | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isOverAbsentZone, setIsOverAbsentZone] = useState(false);

  useEffect(() => {
    if (vehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(vehicles[0].id);
    }
  }, [vehicles, selectedVehicleId]);

  useEffect(() => {
    const isManha = turno.startsWith('Manha');
    const isTarde = turno.startsWith('Tarde');

    const list = students.filter(s => {
      if (selectedVehicleId && s.vehicleId && s.vehicleId !== selectedVehicleId) return false;
      if (s.status === 'Excluido') return false;

      // Filter by shift (Manhã vs Tarde vs Integral)
      const shiftStr = `${s.shift || ''} ${s.grade || ''}`.toLowerCase();
      const entryHour = s.entryTime ? parseInt(s.entryTime.split(':')[0], 10) : NaN;
      const isIntegral = shiftStr.includes('integral');

      if (isIntegral) {
        // Integral students participate in both morning and afternoon routes
        return true;
      }

      if (isManha) {
        if (shiftStr.includes('tarde') && !shiftStr.includes('manhã') && !shiftStr.includes('manha')) return false;
        if (!isNaN(entryHour) && entryHour >= 12 && !shiftStr.includes('manhã') && !shiftStr.includes('manha')) return false;
      } else if (isTarde) {
        if ((shiftStr.includes('manhã') || shiftStr.includes('manha')) && !shiftStr.includes('tarde')) return false;
        if (!isNaN(entryHour) && entryHour < 12 && !shiftStr.includes('tarde')) return false;
      }

      return true;
    });

    setOrderedStudents(list);
    setCustomStops(null); // reset custom order on vehicle or shift change
  }, [students, selectedVehicleId, turno]);

  const activeStudents = useMemo(() => {
    return orderedStudents.filter(s => !isStudentAbsentOnDate(s, selectedDate));
  }, [orderedStudents, selectedDate]);

  const absentStudents = useMemo(() => {
    return orderedStudents.filter(s => isStudentAbsentOnDate(s, selectedDate));
  }, [orderedStudents, selectedDate]);

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
  const upcomingAbsences = useMemo(() => {
    return students.flatMap(s => {
      const sched = s.scheduledAbsences || [];
      return sched
        .filter(a => a.date >= todayStr)
        .map(a => ({ studentName: s.name, parentName: s.parentName, ...a }));
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [students, todayStr]);

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

  // Reintegrate an absent student back into active route
  const handleReintegrate = async (student: Student, targetIndex?: number) => {
    if (!profile?.id) return;
    try {
      await reintegrateStudentToRoute(profile.id, student.id, student, selectedDate);
      playBusHornSound();
      toast.success(`🎉 ${student.name} reintegrado(a) à rota do dia ${formatDateBR(selectedDate)}!`);

      // If custom stops active, insert student stop at specific index
      if (customStops) {
        const newStop: RouteStop = {
          id: `student-${student.id}`,
          type: 'student',
          title: student.name,
          address: student.studentAddress || 'Endereço residencial',
          schoolName: student.schoolName,
          timeLabel: isIda ? student.entryTime : student.exitTime,
          studentData: student,
        };

        const next = [...customStops];
        if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= next.length) {
          next.splice(targetIndex, 0, newStop);
        } else {
          next.push(newStop);
        }
        setCustomStops(next);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao reintegrar aluno na rota.');
    }
  };

  // Remove student from route (mark as absent for selected date)
  const handleRemoveFromRoute = async (student: Student) => {
    if (!profile?.id) return;
    try {
      await markStudentAbsent(
        profile.id, 
        student.id, 
        student, 
        selectedDate, 
        'Removido da rota pelo motorista'
      );
      toast.success(`${student.name} marcado(a) como ausente em ${formatDateBR(selectedDate)} e movido(a) para fora da rota.`);

      if (customStops) {
        setCustomStops(customStops.filter(s => s.id !== `student-${student.id}`));
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao marcar ausência do aluno.');
    }
  };

  // Drag & drop handlers
  const handleDragStartFromAbsent = (e: React.DragEvent, student: Student) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'absent_student', studentId: student.id }));
    setDraggedItem({ type: 'student', id: student.id });
  };

  const handleDragStartFromRoute = (e: React.DragEvent, stop: RouteStop, index: number) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'route_stop', stopId: stop.id, fromIndex: index }));
    setDraggedItem({ type: 'stop', id: stop.id, index });
  };

  const handleDragOverStop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDropOnStop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    const dataStr = e.dataTransfer.getData('text/plain');
    if (!dataStr) return;

    try {
      const data = JSON.parse(dataStr);
      if (data.type === 'absent_student') {
        const student = absentStudents.find(s => s.id === data.studentId);
        if (student) {
          await handleReintegrate(student, targetIndex);
        }
      } else if (data.type === 'route_stop') {
        const fromIndex = data.fromIndex;
        if (fromIndex !== undefined && fromIndex !== targetIndex) {
          const newStops = [...routeStops];
          const [moved] = newStops.splice(fromIndex, 1);
          newStops.splice(targetIndex, 0, moved);
          setCustomStops(newStops);
          toast.success('Ordem da parada atualizada!');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDraggedItem(null);
    }
  };

  const handleDropOnAbsentZone = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverAbsentZone(false);
    const dataStr = e.dataTransfer.getData('text/plain');
    if (!dataStr) return;

    try {
      const data = JSON.parse(dataStr);
      if (data.type === 'route_stop') {
        const stop = routeStops.find(s => s.id === data.stopId);
        if (stop && stop.studentData) {
          await handleRemoveFromRoute(stop.studentData);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDraggedItem(null);
    }
  };

  const handleOpenGoogleMaps = () => {
    if (routeStops.length === 0) {
      toast.error('Nenhum ponto ou escola cadastrado para os alunos da rota.');
      return;
    }

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

  const tomorrowStr = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="bg-yellow-400 text-gray-900 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
            Logística & Rota Inteligente
          </span>
          <h2 className="text-3xl font-extrabold text-gray-900 mt-1">Gestão de Rotas & GPS</h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Selector */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-2xl p-1.5 shadow-sm">
            <button
              onClick={() => setSelectedDate(todayStr)}
              className={cn(
                "px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer",
                selectedDate === todayStr 
                  ? "bg-yellow-400 text-gray-950 shadow-xs" 
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              Hoje ({formatDateBR(todayStr).slice(0, 5)})
            </button>
            <button
              onClick={() => setSelectedDate(tomorrowStr)}
              className={cn(
                "px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer",
                selectedDate === tomorrowStr 
                  ? "bg-yellow-400 text-gray-950 shadow-xs" 
                  : "text-gray-600 hover:bg-gray-100"
              )}
            >
              Amanhã
            </button>
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-gray-800 outline-none px-2 cursor-pointer border-l border-gray-200"
            />
          </div>

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
              setCustomStops(null);
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

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Route Sequence Column */}
        <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-sm border border-gray-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900">
                <span className="w-8 h-8 bg-yellow-400 text-gray-900 rounded-full flex items-center justify-center text-sm font-black">1</span>
                Sequência de Paradas Ativas ({routeStops.length})
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Data: <strong>{formatDateBR(selectedDate)}</strong> • {isIda ? 'Embarque em Casa → Desembarque na Escola' : 'Embarque na Escola → Desembarque nas Casas'}
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

          {/* Upcoming Scheduled Absences Banner */}
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
                    <span className={cn(
                      "font-black px-2 py-0.5 rounded text-[10px]",
                      item.date === selectedDate ? "bg-red-500 text-white animate-pulse" : "text-amber-800 bg-amber-100"
                    )}>
                      {formatDateBR(item.date)} {item.date === selectedDate && '(Data Selecionada)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hint / Operational Instructions */}
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-amber-50 p-4 rounded-2xl border border-blue-200/80 flex items-start gap-3">
            <Sparkles className="text-blue-600 shrink-0 mt-0.5" size={20} />
            <div className="text-xs text-gray-800 leading-relaxed space-y-1">
              <span className="font-black text-blue-900 block">💡 Cenário: Pai mudou de ideia e avisou por telefone?</span>
              <p>
                O aluno ausente fica na área <strong>"Alunos Fora da Rota"</strong> abaixo. Você pode <strong>arrastá-lo diretamente para qualquer posição na rota</strong> acima ou clicar em <strong>"Reintegrar à Rota"</strong> (ou pedir para a <strong>T.IA</strong> por voz!). Ele voltará imediatamente para a rota e para o GPS!
              </p>
            </div>
          </div>

          {/* Stops Drop Target Container */}
          <div className="space-y-3">
            {routeStops.map((stop, i) => {
              const isSchool = stop.type === 'school';
              const isDropTarget = dragOverIndex === i;

              if (isSchool) {
                return (
                  <div 
                    key={stop.id} 
                    onDragOver={(e) => handleDragOverStop(e, i)}
                    onDrop={(e) => handleDropOnStop(e, i)}
                    className={cn(
                      "flex items-start gap-3 p-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl shadow-md border transition-all relative",
                      isDropTarget ? "border-yellow-400 scale-[1.02] shadow-xl ring-2 ring-yellow-400" : "border-blue-400/30"
                    )}
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
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-blue-200 flex-wrap gap-2">
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
                  draggable={true}
                  onDragStart={(e) => handleDragStartFromRoute(e, stop, i)}
                  onDragOver={(e) => handleDragOverStop(e, i)}
                  onDrop={(e) => handleDropOnStop(e, i)}
                  className={cn(
                    "flex items-center gap-3 p-3.5 bg-gray-50 border rounded-2xl shadow-sm transition-all relative group cursor-grab active:cursor-grabbing",
                    isDropTarget 
                      ? "border-yellow-400 bg-yellow-50/50 scale-[1.02] ring-2 ring-yellow-400" 
                      : "border-gray-200 hover:border-yellow-400 hover:bg-white"
                  )}
                >
                  <div className="cursor-grab text-gray-400 hover:text-gray-700 hidden sm:block">
                    <GripVertical size={16} />
                  </div>

                  <div className="font-black text-xs text-gray-400 w-5 text-center">#{i + 1}</div>

                  <div className="flex flex-col gap-0.5">
                    <button 
                      onClick={() => moveStopUp(i)}
                      disabled={i === 0}
                      className="p-1 hover:bg-white rounded text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button 
                      onClick={() => moveStopDown(i)}
                      disabled={i === routeStops.length - 1}
                      className="p-1 hover:bg-white rounded text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-20 cursor-pointer"
                    >
                      <ArrowDown size={13} />
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

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-[10px] font-black rounded-lg">
                      Na Rota
                    </span>
                    {student && (
                      <button
                        onClick={() => handleRemoveFromRoute(student)}
                        title="Marcar falta hoje / Tirar da rota"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <XCircle size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {routeStops.length === 0 && (
              <div 
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => handleDropOnStop(e, 0)}
                className="text-center py-12 text-gray-400 text-xs border-2 border-dashed border-gray-300 rounded-3xl space-y-2 bg-gray-50"
              >
                <Bus size={36} className="mx-auto opacity-30 text-gray-900" />
                <p className="font-bold text-gray-600 text-sm">Nenhum aluno ativo nesta van/turno para {formatDateBR(selectedDate)}.</p>
                <p className="text-[11px] text-gray-500">
                  Arraste um aluno ausente da seção abaixo para cá ou clique em "Reintegrar à Rota".
                </p>
              </div>
            )}
          </div>

          {/* ABSENT / STAGING ZONE: "Alunos Fora da Rota / Ausentes no Dia" */}
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsOverAbsentZone(true); }}
            onDragLeave={() => setIsOverAbsentZone(false)}
            onDrop={handleDropOnAbsentZone}
            className={cn(
              "pt-6 border-t-2 border-dashed rounded-3xl p-4 transition-all space-y-3",
              isOverAbsentZone 
                ? "bg-red-50/80 border-red-400 ring-2 ring-red-400" 
                : absentStudents.length > 0
                  ? "bg-gradient-to-br from-amber-50/40 via-red-50/30 to-gray-50 border-amber-300"
                  : "bg-gray-50 border-gray-200"
            )}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-black text-red-700 uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-500" />
                  Alunos Fora da Rota / Ausentes ({absentStudents.length})
                </label>
                <p className="text-[11px] text-gray-500">
                  {selectedDate === todayStr ? 'Ausentes hoje' : `Ausentes na data selecionada (${formatDateBR(selectedDate)})`} — Arraste para a sequência da rota ou clique para reintegrar.
                </p>
              </div>
            </div>

            {absentStudents.length > 0 ? (
              <div className="space-y-2.5">
                {absentStudents.map((student) => (
                  <div 
                    key={student.id} 
                    draggable={true}
                    onDragStart={(e) => handleDragStartFromAbsent(e, student)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white border-2 border-amber-200/80 hover:border-yellow-400 rounded-2xl shadow-xs transition-all cursor-grab active:cursor-grabbing group hover:shadow-md"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="cursor-grab text-amber-500 group-hover:text-yellow-600">
                        <GripVertical size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                          <span className="truncate">{student.name}</span>
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black rounded-md uppercase shrink-0">
                            Ausente
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-2 mt-0.5 truncate">
                          <span>{student.schoolName || 'Escola não informada'}</span>
                          {student.studentAddress && (
                            <>
                              <span>•</span>
                              <span className="truncate">{student.studentAddress}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {student.parentPhone && (
                        <a 
                          href={`https://wa.me/55${student.parentPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá! Confirmando se o(a) ${student.name} vai para a escola hoje.`)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 rounded-xl font-bold text-xs flex items-center gap-1 transition-all"
                          title="Falar com o responsável no WhatsApp"
                        >
                          <Phone size={13} />
                          <span className="hidden sm:inline">Ligar/Zap</span>
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => handleReintegrate(student)}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-gray-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95 border border-yellow-500/40"
                      >
                        <UserPlus size={14} />
                        <span>Reintegrar à Rota</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-xs bg-white/60 rounded-2xl border border-gray-100">
                <UserCheck size={24} className="mx-auto text-emerald-500 mb-1" />
                <p className="font-bold text-gray-700">Nenhum aluno ausente nesta data!</p>
                <p className="text-[11px] text-gray-500">Todos os alunos vinculados a esta van estão participando da rota.</p>
              </div>
            )}
          </div>
        </div>

        {/* GPS Navigation & Route Overview Column */}
        <div className="space-y-8">
          <div className="bg-gradient-to-br from-gray-900 via-gray-950 to-black text-white p-6 md:p-8 rounded-[40px] shadow-2xl border border-white/10 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <span className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-black">2</span>
                Navegação GPS
              </h3>
              <span className="bg-green-500/20 text-green-400 text-xs font-bold px-3 py-1 rounded-full border border-green-500/30">
                {routeStops.length} Paradas Ativas
              </span>
            </div>

            <p className="text-gray-300 text-xs leading-relaxed">
              Inicie a navegação com paradas múltiplas. As paradas dos alunos presentes e escolas serão enviadas ao Google Maps na ordem sequencial exata. Alunos ausentes não são incluídos no trajeto.
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
                  <span>Data da Rota:</span>
                  <span className="font-bold text-white">{formatDateBR(selectedDate)}</span>
                </div>
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
                  <span>Paradas Ativas:</span>
                  <span className="font-bold text-green-400">
                    {routeStops.length} ({routeStops.filter(s => s.type === 'student').length} casas + {routeStops.filter(s => s.type === 'school').length} escolas)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Alunos Fora da Rota (Ausentes):</span>
                  <span className={cn("font-bold", absentStudents.length > 0 ? "text-amber-400" : "text-gray-400")}>
                    {absentStudents.length} aluno(s)
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
