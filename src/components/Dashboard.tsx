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
  ShieldCheck
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

  const isFreePlan = !profile?.plan || profile.plan === 'Gratuito';
  const planName = profile?.plan || 'Gratuito';
  const maxStudentsLimit = isFreePlan ? 25 : 999;
  const currentStudentsCount = students.filter(s => s.status !== 'Excluido').length;
  const quotaPercent = isFreePlan ? Math.min(100, Math.round((currentStudentsCount / 25) * 100)) : 100;

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

  const vehicleCapacity = activeVehicle?.capacity || 16;
  const occupiedSeatsCount = vehicleStudents.filter(s => s.seat && s.seat <= vehicleCapacity).length;
  const freeSeatsCount = Math.max(0, vehicleCapacity - occupiedSeatsCount);
  
  const kpis = useMemo(() => {
    const totalRevenue = activeStudents.reduce((acc, s) => acc + (s.value || 0), 0);
    const totalCapacity = vehicles.length > 0 ? vehicles.reduce((acc, v) => acc + (v.capacity || 0), 0) : (activeVehicle?.capacity || 16);
    const avgTicket = activeStudents.length > 0 ? totalRevenue / activeStudents.length : 0;
    
    const received = finances
      .filter(f => f.status === 'Em Dia' && f.type === 'Receita')
      .reduce((acc, f) => acc + f.value, 0);
    
    const pending = finances
      .filter(f => f.status === 'Em Atraso' && f.type === 'Receita')
      .reduce((acc, f) => acc + f.value, 0);

    return { totalRevenue, totalCapacity, avgTicket, received, pending };
  }, [activeStudents, vehicles, activeVehicle, finances]);

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
          <p className="text-gray-500 text-sm font-medium">Aqui está o resumo da sua operação hoje.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-1.5 shadow-sm">
            <Bus size={18} className="text-yellow-600 shrink-0" />
            <select 
              value={activeVehicle?.id || ''}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="bg-transparent text-sm font-bold text-gray-900 outline-none cursor-pointer pr-2"
            >
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.capacity} Lugares)
                </option>
              ))}
              {vehicles.length === 0 && <option value="">Van Principal ({vehicleCapacity} Lugares)</option>}
            </select>
          </div>
        </div>
      </div>

      {/* 🚀 PLAN STATUS & VISIBILITY BANNER */}
      {onOpenSubscriptionModal && (
        <div className={cn(
          "rounded-3xl p-5 sm:p-6 shadow-sm border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4",
          isFreePlan 
            ? "bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/5 border-amber-200/80" 
            : "bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-white border-emerald-200"
        )}>
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5">
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm",
                isFreePlan ? "bg-yellow-400 text-gray-950" : "bg-emerald-600 text-white"
              )}>
                <Zap size={14} className={isFreePlan ? "fill-gray-950" : "fill-white"} />
                Plano {planName}
              </span>
              
              {isFreePlan ? (
                <span className="text-xs font-bold text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded-full">
                  Uso: {currentStudentsCount}/25 Alunos
                </span>
              ) : (
                <span className="text-xs font-bold text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck size={14} className="text-emerald-700" />
                  Alunos Ilimitados • Em Dia
                </span>
              )}
            </div>

            <p className="text-xs sm:text-sm text-gray-700 font-medium leading-relaxed">
              {isFreePlan ? (
                <>
                  Você está usando a <strong>versão gratuita do SchoolVan</strong>. Quer adicionar alunos ilimitados, WhatsApp automático da T.IA e adicionar novas vans? Contrate o <strong>Plano Pro</strong> sem pagar nada hoje (pague só proporcional no dia 10).
                </>
              ) : (
                <>
                  Seu plano <strong>{planName}</strong> está ativo com todos os recursos liberados! Fatura unificada com vencimento todo <strong>dia 10</strong>.
                </>
              )}
            </p>

            {/* Quota Progress Bar for Free Plan */}
            {isFreePlan && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[11px] font-bold text-gray-600">
                  <span>Capacidade do Plano Gratuito</span>
                  <span className={quotaPercent >= 80 ? "text-red-600 font-black" : "text-amber-800 font-black"}>
                    {currentStudentsCount} de 25 ({quotaPercent}%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-amber-200/50 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      quotaPercent >= 90 ? "bg-red-500" : quotaPercent >= 70 ? "bg-amber-500" : "bg-emerald-500"
                    )}
                    style={{ width: `${quotaPercent}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={onOpenSubscriptionModal}
              className={cn(
                "w-full sm:w-auto px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2",
                isFreePlan 
                  ? "bg-gray-950 hover:bg-gray-800 text-yellow-400 border border-yellow-400/30" 
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              )}
            >
              <Sparkles size={16} className={isFreePlan ? "text-yellow-400" : "text-emerald-200"} />
              <span>{isFreePlan ? 'VER PLANOS & CONTRATAR PRO' : 'GERENCIAR PLANO & FATURAS'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          label="Mensalidade Média" 
          value={`R$ ${kpis.avgTicket.toFixed(2)}`} 
          icon={TrendingUp}
          color="yellow"
        />
        <KpiCard 
          label="Arrecadação do Mês" 
          value={`R$ ${kpis.totalRevenue.toFixed(2)}`} 
          icon={Wallet}
          color="green"
          subValue={`Estimado com ${activeStudents.length} Passageiros`}
        />
        <KpiCard 
          label="Potencial (Van Cheia)" 
          value={`R$ ${(kpis.totalCapacity * (kpis.avgTicket || 350)).toFixed(2)}`} 
          icon={ArrowUpRight}
          color="blue"
          subValue={`${kpis.totalCapacity} Assentos na Frota`}
        />
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Seat Map */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                  <Armchair className="text-yellow-600" size={22} />
                  Mapa de Assentos da Van
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  {activeVehicle ? `${activeVehicle.name} • Capacidade Total: ${vehicleCapacity} Lugares` : `Capacidade Total: ${vehicleCapacity} Lugares`}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-green-50 text-green-700 font-bold text-xs rounded-full border border-green-200">
                  {freeSeatsCount} Vagas Livres
                </span>
                <span className="px-3 py-1 bg-yellow-50 text-yellow-800 font-bold text-xs rounded-full border border-yellow-200">
                  {occupiedSeatsCount}/{vehicleCapacity} Ocupados
                </span>
              </div>
            </div>

            <div className="flex justify-center my-2">
              <div className="relative bg-gray-50 border-4 border-gray-900 rounded-[40px] p-6 sm:p-8 pt-16 w-full max-w-xl shadow-xl">
                {/* Windshield / Bus Front */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-blue-300 border-2 border-gray-900 rounded-lg flex items-center justify-center">
                  <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Para-brisa</span>
                </div>
                <div className="absolute -left-3 top-10 w-3 h-12 bg-gray-900 rounded-l-lg" />
                <div className="absolute -right-3 top-10 w-3 h-12 bg-gray-900 rounded-r-lg" />
                
                {/* Driver Section */}
                <div className="flex items-center justify-between pb-6 mb-6 border-b-2 border-dashed border-gray-300">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-gray-900 rounded-xl flex items-center justify-center text-yellow-400 font-black shadow-md">
                      <Users size={20} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-gray-950 uppercase tracking-wider block">Cabine do Motorista</span>
                      <span className="text-[10px] text-gray-500 font-bold">{profile?.name || 'Tio(a)'}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-gray-400 block uppercase">Porta de Entrada</span>
                    <span className="text-xs font-black text-emerald-600">➡️ Embarque</span>
                  </div>
                </div>

                {/* Dynamic Seats Grid - Supports 1 to 60+ seats */}
                <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-4 gap-2.5 sm:gap-3.5 max-h-[460px] overflow-y-auto p-1 pr-2">
                  {Array.from({ length: vehicleCapacity }).map((_, i) => {
                    const seatNumber = i + 1;
                    const student = vehicleStudents.find(s => s.seat === seatNumber);
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
                            {student.name} {isAbsent ? '⚠️ (Ausente)' : '✅ (Confirmado)'}
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
            <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-md bg-red-500 shadow-sm" /> Ocupado</div>
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
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", colors[color])}>
        <Icon size={24} />
      </div>
      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-2xl font-black text-gray-900">{value}</div>
      {subValue && <div className="mt-2 text-xs text-gray-500 font-medium">{subValue}</div>}
    </div>
  );
}
