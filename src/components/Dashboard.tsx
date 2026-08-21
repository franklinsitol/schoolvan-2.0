import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Users, 
  Bus, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight,
  ClipboardList,
  MessageSquare,
  UserCheck,
  ArrowRight,
  Armchair,
  CheckCircle2,
  Zap,
  Sparkles,
  ShieldCheck,
  Target,
  Settings2,
  X,
  Plus,
  HelpCircle
} from 'lucide-react';
import { PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { Student, Vehicle, Lead, Finance } from '../types';
import { cn } from '../lib/utils';
import { isStudentAbsentOnDate } from '../lib/absence';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

export function Dashboard({ 
  onNavigateToLeads,
  onOpenSubscriptionModal 
}: { 
  onNavigateToLeads?: () => void;
  onOpenSubscriptionModal?: () => void;
}) {
  const { profile } = useAuth();
  const { data: students } = useFirestore<Student>(`drivers/${profile?.id}/students`);
  const { data: vehicles } = useFirestore<Vehicle>(`drivers/${profile?.id}/vehicles`);
  const { data: leads } = useFirestore<Lead>(`drivers/${profile?.id}/leads`);
  const { data: finances } = useFirestore<Finance>(`drivers/${profile?.id}/finance`);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<'Todos' | 'Manhã' | 'Tarde' | 'Noite'>('Todos');
  const [isTargetModalOpen, setIsTargetModalOpen] = useState<boolean>(false);
  const [savingTarget, setSavingTarget] = useState<boolean>(false);

  const activeVehicle = useMemo(() => {
    if (selectedVehicleId) {
      return vehicles.find(v => v.id === selectedVehicleId) || vehicles[0];
    }
    return vehicles[0] || null;
  }, [vehicles, selectedVehicleId]);

  const activeStudents = useMemo(() => students.filter(s => s.status === 'Ativo'), [students]);

  const vehicleStudents = useMemo(() => {
    if (!activeVehicle?.id) return activeStudents;
    return activeStudents.filter(s => !s.vehicleId || s.vehicleId === activeVehicle.id);
  }, [activeStudents, activeVehicle]);

  const shiftStudents = useMemo(() => {
    if (selectedShift === 'Todos') return vehicleStudents;
    return vehicleStudents.filter(s => (s.shift || 'Manhã') === selectedShift);
  }, [vehicleStudents, selectedShift]);

  // Physical seats per single ride
  const physicalSeats = activeVehicle?.capacity || (vehicles.length > 0 ? vehicles.reduce((acc, v) => acc + (v.capacity || 0), 0) : 16);
  const vehicleCapacity = activeVehicle?.capacity || 16;
  const occupiedSeatsCount = shiftStudents.filter(s => s.seat && s.seat <= vehicleCapacity).length;
  const freeSeatsCount = Math.max(0, vehicleCapacity - occupiedSeatsCount);

  // Multi-shift operational calculation (Turnos: Manhã, Tarde, Integral/Noite)
  const shiftsCount = activeVehicle?.shiftsCount || profile?.shiftsCount || 3;
  const multiShiftCapacity = (activeVehicle ? (activeVehicle.capacity || 16) : vehicles.reduce((sum, v) => sum + (v.capacity || 16), 0) || 16) * shiftsCount;
  
  // Custom driver target
  const targetStudents = activeVehicle?.targetStudents || profile?.targetStudents || multiShiftCapacity || 48;
  
  const kpis = useMemo(() => {
    const totalRevenue = activeStudents.reduce((acc, s) => acc + (s.value || 0), 0);
    const totalCapacity = vehicles.length > 0 ? vehicles.reduce((acc, v) => acc + (v.capacity || 0), 0) : (activeVehicle?.capacity || 16);
    const avgTicket = activeStudents.length > 0 ? totalRevenue / activeStudents.length : (activeVehicle?.value || 380);
    
    const potentialRevenue = targetStudents * (avgTicket || 380);
    const occupancyPercent = targetStudents > 0 ? Math.min(100, Math.round((activeStudents.length / targetStudents) * 100)) : 0;
    const remainingToTarget = Math.max(0, targetStudents - activeStudents.length);

    const received = finances
      .filter(f => f.status === 'Em Dia' && f.type === 'Receita')
      .reduce((acc, f) => acc + f.value, 0);
    
    const pending = finances
      .filter(f => f.status === 'Em Atraso' && f.type === 'Receita')
      .reduce((acc, f) => acc + f.value, 0);

    return { 
      totalRevenue, 
      totalCapacity, 
      avgTicket, 
      received, 
      pending,
      potentialRevenue,
      targetStudents,
      occupancyPercent,
      remainingToTarget,
      multiShiftCapacity,
      shiftsCount,
      physicalSeats
    };
  }, [activeStudents, vehicles, activeVehicle, finances, targetStudents, multiShiftCapacity, shiftsCount, physicalSeats]);

  const [formPhysicalSeats, setFormPhysicalSeats] = useState<number>(physicalSeats);
  const [formShiftsCount, setFormShiftsCount] = useState<number>(shiftsCount);
  const [formTargetStudents, setFormTargetStudents] = useState<number>(targetStudents);

  const handleOpenTargetModal = () => {
    setFormPhysicalSeats(activeVehicle?.capacity || 16);
    setFormShiftsCount(activeVehicle?.shiftsCount || profile?.shiftsCount || 3);
    setFormTargetStudents(targetStudents);
    setIsTargetModalOpen(true);
  };

  const handleSaveTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    setSavingTarget(true);

    try {
      const updates = {
        targetStudents: Number(formTargetStudents) || 48,
        shiftsCount: Number(formShiftsCount) || 3
      };

      // Update driver profile
      await updateDoc(doc(db, 'drivers', profile.id), updates);

      // If active vehicle exists, update vehicle capacity and targets too
      if (activeVehicle?.id) {
        await updateDoc(doc(db, `drivers/${profile.id}/vehicles`, activeVehicle.id), {
          ...updates,
          capacity: Number(formPhysicalSeats) || 16
        });
      }

      toast.success('🎯 Meta de alunos e capacidade da van atualizadas com sucesso!');
      setIsTargetModalOpen(false);
    } catch (err) {
      console.error('Erro ao salvar meta:', err);
      toast.error('Não foi possível salvar a meta no momento.');
    } finally {
      setSavingTarget(false);
    }
  };

  const chartData = [
    { name: 'Recebido', value: kpis.received, color: '#10b981' },
    { name: 'Pendente', value: kpis.pending, color: '#ef4444' }
  ];

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900">Olá, {profile?.name || 'Franklin'}!</h2>
          <p className="text-gray-500 text-sm font-medium">Aqui está o resumo da sua operação e o potencial da sua van hoje.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenTargetModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-900 font-bold text-xs rounded-2xl border border-yellow-200 shadow-xs transition-all cursor-pointer"
            title="Ajustar meta de alunos e turnos da van"
          >
            <Target size={15} className="text-yellow-600" />
            <span>Meta: {targetStudents} Alunos</span>
            <Settings2 size={13} className="text-yellow-700 opacity-60 ml-0.5" />
          </button>

          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-1.5 shadow-sm">
            <Bus size={18} className="text-yellow-600 shrink-0" />
            <select 
              value={activeVehicle?.id || ''}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="bg-transparent text-sm font-bold text-gray-900 outline-none cursor-pointer pr-2"
            >
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.capacity} Lug./Viagem)
                </option>
              ))}
              {vehicles.length === 0 && <option value="">Van Principal ({vehicleCapacity} Lugares)</option>}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          label="Mensalidade Média" 
          value={`R$ ${kpis.avgTicket.toFixed(2)}`} 
          icon={TrendingUp}
          color="yellow"
          subValue="Ticket médio por aluno ativo"
        />

        <KpiCard 
          label="Arrecadação Atual" 
          value={`R$ ${kpis.totalRevenue.toFixed(2)}`} 
          icon={Wallet}
          color="green"
          subValue={`${activeStudents.length} de ${targetStudents} Alunos na Carteira`}
        />

        {/* Dynamic Multi-Shift / Target Full Van Potential */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative group overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-50 text-blue-600 border border-blue-100">
              <ArrowUpRight size={24} />
            </div>
            <button
              type="button"
              onClick={handleOpenTargetModal}
              className="text-[11px] font-black text-blue-600 hover:text-blue-800 bg-blue-50/80 hover:bg-blue-100 px-2 py-1 rounded-xl transition-colors cursor-pointer flex items-center gap-1"
              title="Clique para personalizar sua meta de alunos"
            >
              <Target size={12} />
              <span>Ajustar Meta</span>
            </button>
          </div>

          <div className="mt-3">
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Potencial (Van Lotada)</span>
              <span className="text-[11px] font-extrabold text-blue-600">{kpis.occupancyPercent}%</span>
            </div>
            <div className="text-2xl font-black text-gray-900">
              R$ {kpis.potentialRevenue.toFixed(2)}
            </div>

            {/* Progress bar to target */}
            <div className="mt-2.5 space-y-1.5">
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, kpis.occupancyPercent)}%` }}
                />
              </div>
              <div className="text-[11px] text-gray-500 font-medium flex items-center justify-between">
                <span>Meta: <strong>{targetStudents} alunos</strong></span>
                <span className="text-blue-700 font-bold">
                  {kpis.remainingToTarget === 0 ? '🎉 Meta 100% Batida!' : `Faltam ${kpis.remainingToTarget} vagas`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-20 h-20 shrink-0 flex items-center justify-center">
            <PieChart width={80} height={80}>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={38}
                paddingAngle={5}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-bold text-green-600">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Recebido: R$ {kpis.received.toFixed(0)}
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-red-600">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              Pendente: R$ {kpis.pending.toFixed(0)}
            </div>
          </div>
        </div>
      </div>

      {/* Operational Understanding Notice / Quick Insight */}
      <div className="bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border border-yellow-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-yellow-400 text-gray-950 flex items-center justify-center font-black shrink-0 shadow-xs">
            <Sparkles size={20} />
          </div>
          <div>
            <h4 className="text-sm font-black text-gray-950 flex items-center gap-2">
              Entendimento Operacional: Assentos da Van vs. Giro Diário
            </h4>
            <p className="text-xs text-gray-700 font-medium mt-0.5">
              Sua van tem <strong>{vehicleCapacity} assentos físicos com cinto</strong> por viagem. Como você opera <strong>{shiftsCount} turnos diários</strong> (Manhã, Tarde e Integral), sua carteira tem potencial para atender <strong>{multiShiftCapacity} a {targetStudents} alunos/mês</strong>!
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleOpenTargetModal}
          className="px-4 py-2 bg-gray-950 hover:bg-gray-800 text-yellow-400 font-black text-xs rounded-xl transition-all shrink-0 cursor-pointer shadow-sm"
        >
          Configurar Metas
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Seat Map */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                  <Armchair className="text-yellow-600" size={22} />
                  Mapa de Assentos da Van
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  {activeVehicle ? `${activeVehicle.name} • Capacidade Física: ${vehicleCapacity} Assentos Simultâneos` : `Capacidade Física: ${vehicleCapacity} Assentos Simultâneos`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-green-50 text-green-700 font-bold text-xs rounded-full border border-green-200">
                  {freeSeatsCount} Vagas Livres
                </span>
                <span className="px-3 py-1 bg-yellow-50 text-yellow-800 font-bold text-xs rounded-full border border-yellow-200">
                  {occupiedSeatsCount}/{vehicleCapacity} Ocupados ({selectedShift})
                </span>
              </div>
            </div>

            {/* Shift Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 p-3 bg-gray-50 rounded-2xl border border-gray-200">
              <div className="text-xs font-bold text-gray-700">
                <span className="text-gray-500">Filtrar Ocupação por Turno da Rota:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(['Todos', 'Manhã', 'Tarde', 'Noite'] as const).map(shift => (
                  <button
                    key={shift}
                    type="button"
                    onClick={() => setSelectedShift(shift)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer",
                      selectedShift === shift
                        ? "bg-yellow-400 text-gray-950 shadow-sm"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                    )}
                  >
                    {shift === 'Manhã' ? '☀️ Manhã' : shift === 'Tarde' ? '🌤️ Tarde' : shift === 'Noite' ? '🌙 Noite' : '⭐ Todos'}
                  </button>
                ))}
              </div>
            </div>

            {/* Van Graphic Container */}
            <div className="flex justify-center my-2">
              <div className="relative bg-white border-4 border-gray-900 rounded-[44px] p-6 sm:p-8 pt-8 w-full max-w-xl shadow-2xl">
                
                {/* 💡 Stylized Headlights (Faróis Dianteiros) */}
                <div className="absolute -top-3.5 left-10 w-8 h-5 bg-gradient-to-b from-amber-300 to-yellow-400 rounded-t-full border-2 border-gray-900 shadow-[0_-4px_12px_rgba(250,204,21,0.9)] flex items-center justify-center">
                  <div className="w-3 h-1.5 bg-white/90 rounded-full" />
                </div>
                <div className="absolute -top-3.5 right-10 w-8 h-5 bg-gradient-to-b from-amber-300 to-yellow-400 rounded-t-full border-2 border-gray-900 shadow-[0_-4px_12px_rgba(250,204,21,0.9)] flex items-center justify-center">
                  <div className="w-3 h-1.5 bg-white/90 rounded-full" />
                </div>

                {/* 🛞 Front Left Wheel (Pneu Dianteiro Esquerdo) */}
                <div className="absolute -left-4 top-24 w-4 h-16 bg-gray-950 rounded-l-xl border-2 border-gray-800 shadow-xl flex flex-col justify-around py-1 items-center z-10">
                  <div className="w-1.5 h-1 bg-gray-600 rounded-full" />
                  <div className="w-1.5 h-1 bg-yellow-400/80 rounded-full" />
                  <div className="w-1.5 h-1 bg-gray-600 rounded-full" />
                </div>

                {/* 🛞 Front Right Wheel (Pneu Dianteiro Direito) */}
                <div className="absolute -right-4 top-24 w-4 h-16 bg-gray-950 rounded-r-xl border-2 border-gray-800 shadow-xl flex flex-col justify-around py-1 items-center z-10">
                  <div className="w-1.5 h-1 bg-gray-600 rounded-full" />
                  <div className="w-1.5 h-1 bg-yellow-400/80 rounded-full" />
                  <div className="w-1.5 h-1 bg-gray-600 rounded-full" />
                </div>

                {/* 🛞 Rear Left Wheel (Pneu Traseiro Esquerdo) */}
                <div className="absolute -left-4 bottom-14 w-4 h-16 bg-gray-950 rounded-l-xl border-2 border-gray-800 shadow-xl flex flex-col justify-around py-1 items-center z-10">
                  <div className="w-1.5 h-1 bg-gray-600 rounded-full" />
                  <div className="w-1.5 h-1 bg-yellow-400/80 rounded-full" />
                  <div className="w-1.5 h-1 bg-gray-600 rounded-full" />
                </div>

                {/* 🛞 Rear Right Wheel (Pneu Traseiro Direito) */}
                <div className="absolute -right-4 bottom-14 w-4 h-16 bg-gray-950 rounded-r-xl border-2 border-gray-800 shadow-xl flex flex-col justify-around py-1 items-center z-10">
                  <div className="w-1.5 h-1 bg-gray-600 rounded-full" />
                  <div className="w-1.5 h-1 bg-yellow-400/80 rounded-full" />
                  <div className="w-1.5 h-1 bg-gray-600 rounded-full" />
                </div>

                {/* 🪟 Windshield / Para-brisa */}
                <div className="w-full h-11 bg-gradient-to-r from-sky-200 via-blue-200 to-sky-200 border-2 border-gray-900 rounded-2xl flex items-center justify-center shadow-inner mb-5">
                  <span className="text-[11px] font-black text-gray-800 uppercase tracking-widest flex items-center gap-1.5">
                    🚍 Para-brisa Dianteiro
                  </span>
                </div>
                
                {/* 👨‍✈️ Driver Section */}
                <div className="flex items-center justify-between gap-3 pb-5 mb-5 border-b-2 border-dashed border-gray-300 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-yellow-400 font-black shadow-md shrink-0">
                      <Users size={18} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-gray-950 uppercase tracking-wider block">Cabine do Motorista</span>
                      <span className="text-[11px] text-gray-600 font-bold">{profile?.name || 'Tio(a) da Van'}</span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Seats Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 gap-2.5 sm:gap-3.5 max-h-[460px] overflow-y-auto p-1 pr-2">
                  {Array.from({ length: vehicleCapacity }).map((_, i) => {
                    const seatNumber = i + 1;
                    const student = shiftStudents.find(s => s.seat === seatNumber);
                    const isAbsent = student ? isStudentAbsentOnDate(student) : false;

                    return (
                      <div 
                        key={seatNumber}
                        title={student ? `${student.name} (Assento ${seatNumber})${isAbsent ? ' - Ausente Hoje' : ''}` : `Assento ${seatNumber} Livre`}
                        className={cn(
                          "h-14 rounded-2xl flex flex-col items-center justify-center text-xs font-bold shadow-sm border transition-all duration-200 relative group cursor-default",
                          student 
                            ? isAbsent 
                              ? "bg-gray-400 text-white border-gray-500"
                              : "bg-red-500 text-white border-red-600 shadow-red-100"
                            : "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600 shadow-emerald-100"
                        )}
                      >
                        <span className="text-[9px] opacity-75 font-mono leading-none mb-0.5">#{seatNumber}</span>
                        <span className="font-extrabold truncate max-w-[54px] text-[11px] leading-tight px-1">
                          {student ? student.name.split(' ')[0] : 'Livre'}
                        </span>
                        
                        {/* Hover Tooltip */}
                        {student && (
                          <div className="hidden group-hover:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-950 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap z-20 shadow-lg pointer-events-none">
                            {student.name} • {student.shift || 'Manhã'} {isAbsent ? '⚠️ (Ausente)' : '✅ (Confirmado)'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-5 text-xs font-bold pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-md bg-emerald-500 shadow-sm" /> Assento Livre</div>
            <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-md bg-red-500 shadow-sm" /> Ocupado no Turno</div>
            <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-md bg-gray-400 shadow-sm" /> Ausente Hoje</div>
          </div>
        </div>

        {/* Leads */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900">
                <ClipboardList className="text-yellow-500" /> Solicitações de Vaga
              </h3>
              {leads.filter(l => l.status === 'Pendente').length > 0 && (
                <span className="bg-yellow-400 text-gray-950 font-black text-xs px-2.5 py-0.5 rounded-full">
                  {leads.filter(l => l.status === 'Pendente').length} nova(s)
                </span>
              )}
            </div>

            <div className="space-y-3">
              {leads.filter(l => l.status === 'Pendente').slice(0, 3).map(lead => {
                const cleanPhone = (lead.phone || '').replace(/\D/g, '');
                const msg = `Olá ${lead.parentName}! Sou o motorista da van no SchoolVan. Recebi sua solicitação de vaga para o(a) ${lead.childName}. Vamos conversar?`;
                const waUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`;

                return (
                  <div key={lead.id} className="p-4 bg-yellow-50/80 rounded-2xl border border-yellow-200/60 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-extrabold text-gray-900 text-sm">{lead.childName}</div>
                        <div className="text-xs text-gray-600 font-medium">
                          Pai/Mãe: <strong>{lead.parentName}</strong>
                        </div>
                        {(lead.schoolName || lead.school) && (
                          <div className="text-[11px] text-gray-500">
                            Escola: {lead.schoolName || lead.school}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <a 
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <MessageSquare size={14} />
                        <span>WhatsApp</span>
                      </a>
                      
                      <button 
                        onClick={onNavigateToLeads}
                        className="flex-1 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-950 rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1 shadow-sm cursor-pointer"
                      >
                        <UserCheck size={14} />
                        <span>Ver Details</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              {leads.filter(l => l.status === 'Pendente').length === 0 && (
                <div className="text-center py-10 text-gray-400 text-xs">
                  Nenhuma solicitação de vaga pendente no momento.
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 mt-4">
            <button
              onClick={onNavigateToLeads}
              className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-yellow-400 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Gerenciar Todas as Solicitações ({leads.length})</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Target and Multi-shift Configuration Modal */}
      {isTargetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100">
            <div className="p-6 bg-gradient-to-r from-yellow-400 to-amber-400 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-black/10 flex items-center justify-center text-gray-950 font-bold">
                  <Target size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-950">Configurar Metas e Turnos</h3>
                  <p className="text-xs font-bold text-gray-900 opacity-90">Defina o potencial real da sua van escolar</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setIsTargetModalOpen(false)}
                className="p-2 hover:bg-black/10 rounded-full transition-colors text-gray-950 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveTarget} className="p-6 space-y-5 overflow-y-auto">
              <div className="p-4 bg-blue-50 border border-blue-200/60 rounded-2xl space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-black text-blue-950">
                  <HelpCircle size={15} className="text-blue-600 shrink-0" />
                  <span>Como funciona o cálculo de potencial?</span>
                </div>
                <p className="text-xs text-blue-900 font-medium leading-relaxed">
                  Uma van com <strong>{formPhysicalSeats} assentos físicos</strong> faz vários giros por dia (desembarca da manhã, embarca da tarde, etc). Ao multiplicar pelos turnos ou definir sua meta, o sistema calcula seu faturamento máximo com a carteira cheia.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 ml-1">
                    Assentos Físicos da Van *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    required
                    value={formPhysicalSeats}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 1;
                      setFormPhysicalSeats(val);
                      setFormTargetStudents(val * formShiftsCount);
                    }}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-yellow-400 outline-none"
                    placeholder="16"
                  />
                  <span className="text-[10px] text-gray-500 ml-1">Capacidade do documento/viagem</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 ml-1">
                    Turnos que a Van Roda *
                  </label>
                  <select
                    value={formShiftsCount}
                    onChange={(e) => {
                      const shifts = Number(e.target.value) || 1;
                      setFormShiftsCount(shifts);
                      setFormTargetStudents(formPhysicalSeats * shifts);
                    }}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-900 focus:ring-2 focus:ring-yellow-400 outline-none cursor-pointer"
                  >
                    <option value={1}>1 Turno (Apenas Manhã ou Tarde)</option>
                    <option value={2}>2 Turnos (Manhã + Tarde)</option>
                    <option value={3}>3 Turnos (Manhã + Tarde + Integral/Noite)</option>
                    <option value={4}>4 Turnos / Giros Intensivos</option>
                  </select>
                  <span className="text-[10px] text-gray-500 ml-1">Giro operacional no dia</span>
                </div>
              </div>

              <div className="space-y-1.5 pt-1 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-800 ml-1">
                    🎯 Meta de Alunos da Carteira (Total)
                  </label>
                  <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60">
                    Sugerido: {formPhysicalSeats * formShiftsCount} alunos
                  </span>
                </div>
                <input
                  type="number"
                  min="1"
                  max="300"
                  required
                  value={formTargetStudents}
                  onChange={(e) => setFormTargetStudents(Number(e.target.value) || 1)}
                  className="w-full px-4 py-3 bg-yellow-50/50 border-2 border-yellow-400/80 rounded-2xl text-base font-black text-gray-950 focus:ring-2 focus:ring-yellow-400 outline-none"
                  placeholder="50"
                />
                <p className="text-[11px] text-gray-500 ml-1">
                  Ex: Você pode colocar <strong>50 alunos</strong> para sua meta global de contratos mensais.
                </p>
              </div>

              {/* Real-time potential simulation */}
              <div className="p-4 bg-gray-950 rounded-2xl text-white space-y-2">
                <div className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider">
                  Simulação de Potencial (Van Cheia)
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-gray-300">
                    {formTargetStudents} alunos × R$ {(kpis.avgTicket || 380).toFixed(0)} médio
                  </span>
                  <span className="text-xl font-black text-emerald-400">
                    R$ {(formTargetStudents * (kpis.avgTicket || 380)).toFixed(2)}/mês
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTargetModalOpen(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingTarget}
                  className="flex-1 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xs rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {savingTarget ? 'Salvando...' : 'Salvar Meta da Carteira'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, subValue }: any) {
  const colors: any = {
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-100",
    green: "bg-green-50 text-green-600 border-green-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
      <div>
        <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", colors[color])}>
          <Icon size={24} />
        </div>
        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</div>
        <div className="text-2xl font-black text-gray-900">{value}</div>
      </div>
      {subValue && <div className="mt-3 text-xs text-gray-500 font-medium pt-2 border-t border-gray-50">{subValue}</div>}
    </div>
  );
}

