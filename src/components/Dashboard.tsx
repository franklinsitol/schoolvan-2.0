import React, { useMemo } from 'react';
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
  ArrowRight
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { Student, Vehicle, Lead, Finance } from '../types';
import { cn } from '../lib/utils';
import { isStudentAbsentOnDate } from '../lib/absence';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../lib/firebase';
import toast from 'react-hot-toast';

export function Dashboard({ onNavigateToLeads }: { onNavigateToLeads?: () => void }) {
  const { profile } = useAuth();
  const { data: students } = useFirestore<Student>(`drivers/${profile?.id}/students`);
  const { data: vehicles } = useFirestore<Vehicle>(`drivers/${profile?.id}/vehicles`);
  const { data: leads } = useFirestore<Lead>(`drivers/${profile?.id}/leads`);
  const { data: finances } = useFirestore<Finance>(`drivers/${profile?.id}/finance`);

  const activeStudents = useMemo(() => students.filter(s => s.status === 'Ativo'), [students]);
  
  const kpis = useMemo(() => {
    const totalRevenue = activeStudents.reduce((acc, s) => acc + (s.value || 0), 0);
    const totalCapacity = vehicles.reduce((acc, v) => acc + v.capacity, 0);
    const avgTicket = activeStudents.length > 0 ? totalRevenue / activeStudents.length : 0;
    
    const received = finances
      .filter(f => f.status === 'Em Dia' && f.type === 'Receita')
      .reduce((acc, f) => acc + f.value, 0);
    
    const pending = finances
      .filter(f => f.status === 'Em Atraso' && f.type === 'Receita')
      .reduce((acc, f) => acc + f.value, 0);

    return { totalRevenue, totalCapacity, avgTicket, received, pending };
  }, [activeStudents, vehicles, finances]);

  const chartData = [
    { name: 'Recebido', value: kpis.received, color: '#10b981' },
    { name: 'Pendente', value: kpis.pending, color: '#ef4444' }
  ];

  return (
    <div className="p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900">Olá, {profile?.name}!</h2>
          <p className="text-gray-500">Aqui está o resumo da sua operação hoje.</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm outline-none focus:ring-2 focus:ring-yellow-400">
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
            {vehicles.length === 0 && <option>Nenhuma Van</option>}
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          label="Ticket Médio" 
          value={`R$ ${kpis.avgTicket.toFixed(2)}`} 
          icon={TrendingUp}
          color="yellow"
        />
        <KpiCard 
          label="Faturamento Total" 
          value={`R$ ${kpis.totalRevenue.toFixed(2)}`} 
          icon={Wallet}
          color="green"
          subValue={`Líquido Est.: R$ ${(kpis.totalRevenue * 0.9).toFixed(2)}`}
        />
        <KpiCard 
          label="Potencial Máximo" 
          value={`R$ ${(kpis.totalCapacity * kpis.avgTicket).toFixed(2)}`} 
          icon={ArrowUpRight}
          color="blue"
          subValue={`${kpis.totalCapacity} Lugares Totais`}
        />
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-20 h-20">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={25}
                  outerRadius={40}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
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
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h3 className="text-xl font-bold mb-6">Mapa de Assentos</h3>
          <div className="flex justify-center">
            <div className="relative bg-gray-100 border-4 border-gray-900 rounded-[40px] p-10 pt-16 min-w-[300px] shadow-2xl">
              {/* Bus Details */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-blue-400/80 border-2 border-gray-900 rounded-lg" />
              <div className="absolute -left-3 top-10 w-3 h-12 bg-gray-900 rounded-l-lg" />
              <div className="absolute -right-3 top-10 w-3 h-12 bg-gray-900 rounded-r-lg" />
              
              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white border border-gray-900">
                  <Users size={20} />
                </div>
                <span className="font-bold text-gray-900 uppercase tracking-wider">Motorista</span>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 16 }).map((_, i) => {
                  const student = activeStudents.find(s => s.seat === i + 1);
                  return (
                    <div 
                      key={i}
                      className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center text-xs font-bold shadow-sm border transition-all",
                        student 
                          ? isStudentAbsentOnDate(student) 
                            ? "bg-gray-400 text-white border-gray-500"
                            : "bg-red-500 text-white border-red-600"
                          : "bg-green-500 text-white border-green-600"
                      )}
                    >
                      {student ? student.name.substring(0, 3).toUpperCase() : i + 1}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="mt-8 flex justify-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-green-500" /> Livre</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-500" /> Ocupado</div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-gray-400" /> Ausente</div>
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
