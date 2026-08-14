import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  Info, 
  MessageCircle, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  DollarSign, 
  Calendar 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { Finance, Student, InvoiceStatus } from '../types';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export function FinanceView() {
  const { profile } = useAuth();
  const { data: finances } = useFirestore<Finance>(`drivers/${profile?.id}/finance`);
  const { data: students } = useFirestore<Student>(`drivers/${profile?.id}/students`);
  
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Em Dia' | 'Em Atraso'>('Todos');

  const activeStudents = useMemo(() => {
    return students.filter(s => s.status !== 'Excluido');
  }, [students]);

  // Combine active students with finance documents
  const studentFinances = useMemo(() => {
    return activeStudents.map(student => {
      const financeDoc = finances.find(f => f.studentId === student.id);
      
      const defaultStatus: InvoiceStatus = 'Em Dia';
      const status: InvoiceStatus = financeDoc?.status || defaultStatus;
      const value = financeDoc?.value !== undefined ? financeDoc.value : (student.value || 0);
      const paymentDay = student.paymentDay || 10;

      return {
        studentId: student.id,
        financeId: financeDoc?.id || student.id,
        studentName: student.name,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        paymentDay,
        value,
        status,
        student
      };
    });
  }, [activeStudents, finances]);

  // Totals calculations
  const totals = useMemo(() => {
    let totalExpected = 0;
    let totalReceived = 0;
    let totalPending = 0;

    studentFinances.forEach(item => {
      totalExpected += item.value;
      if (item.status === 'Em Dia') {
        totalReceived += item.value;
      } else {
        totalPending += item.value;
      }
    });

    return { totalExpected, totalReceived, totalPending };
  }, [studentFinances]);

  // Filtered by Search and Status
  const filteredFinances = useMemo(() => {
    return studentFinances.filter(item => {
      const matchesSearch = 
        item.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.parentName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = 
        statusFilter === 'Todos' ||
        (statusFilter === 'Em Dia' && item.status === 'Em Dia') ||
        (statusFilter === 'Em Atraso' && item.status === 'Em Atraso');

      return matchesSearch && matchesStatus;
    });
  }, [studentFinances, searchTerm, statusFilter]);

  const toggleStatus = async (item: typeof studentFinances[0]) => {
    if (!profile?.id) return;
    setUpdatingId(item.financeId);
    
    const newStatus: InvoiceStatus = item.status === 'Em Dia' ? 'Em Atraso' : 'Em Dia';
    
    try {
      const financeRef = doc(db, `drivers/${profile.id}/finance`, item.financeId);
      await setDoc(financeRef, {
        studentId: item.studentId,
        studentName: item.studentName,
        parentName: item.parentName,
        parentPhone: item.parentPhone,
        paymentDay: item.paymentDay,
        value: item.value,
        status: newStatus,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      toast.success(`Status de ${item.studentName} alterado para "${newStatus}"!`);
    } catch (error) {
      console.error('Error toggling finance status:', error);
      toast.error('Erro ao atualizar status de pagamento.');
    } finally {
      setUpdatingId(null);
    }
  };

  const shareWA = (item: typeof studentFinances[0]) => {
    if (!item.parentPhone) {
      toast.error('Telefone do responsável não cadastrado.');
      return;
    }

    const cleanPhone = item.parentPhone.replace(/\D/g, '');
    const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    const driverPix = profile?.pixKey ? ` Chave Pix: ${profile.pixKey}.` : '';

    const text = `Olá ${item.parentName}, tudo bem? Aqui é da Van do(a) ${profile?.name || 'Tio da Van'}. Passando para lembrar da mensalidade escolar do(a) ${item.studentName} no valor de R$ ${item.value.toFixed(2).replace('.', ',')} com vencimento dia ${item.paymentDay}.${driverPix} Muito obrigado!`;
    const url = `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-950">Gestão de Mensalidades dos Alunos</h2>
          <p className="text-gray-600 text-sm font-medium">Controle de recebimentos, fluxo de caixa e cobranças via WhatsApp dos seus passageiros.</p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Faturamento Previsto</p>
            <p className="text-2xl font-black text-gray-950 mt-1">R$ {totals.totalExpected.toFixed(2).replace('.', ',')}</p>
            <p className="text-[11px] font-semibold text-gray-500 mt-1">{activeStudents.length} alunos ativos</p>
          </div>
          <div className="w-12 h-12 bg-yellow-50 rounded-2xl flex items-center justify-center text-yellow-600">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Total Recebido (Em Dia)</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">R$ {totals.totalReceived.toFixed(2).replace('.', ',')}</p>
            <p className="text-[11px] font-semibold text-emerald-800/80 mt-1">
              {studentFinances.filter(f => f.status === 'Em Dia').length} em dia
            </p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Pendente (Em Atraso)</p>
            <p className="text-2xl font-black text-red-600 mt-1">R$ {totals.totalPending.toFixed(2).replace('.', ',')}</p>
            <p className="text-[11px] font-semibold text-red-700/80 mt-1">
              {studentFinances.filter(f => f.status === 'Em Atraso').length} pendente(s)
            </p>
          </div>
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-600">
            <AlertCircle size={24} />
          </div>
        </div>
      </div>

      {/* Info Notice */}
      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-start gap-3 text-xs text-blue-950">
        <Info className="text-blue-600 shrink-0 mt-0.5" size={18} />
        <div>
          <p className="font-bold text-blue-950">Todos os alunos ativos aparecem nesta tabela automaticamente.</p>
          <p className="text-blue-900 mt-0.5 font-medium leading-relaxed">
            Clique no botão de status para alternar entre <span className="font-bold text-emerald-700">"Em Dia"</span> e <span className="font-bold text-red-600">"Em Atraso"</span>. O botão <span className="font-bold text-emerald-800">"Cobrar"</span> abre o WhatsApp já com o texto personalizado e a sua chave Pix.
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar aluno ou responsável..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-yellow-400 outline-none shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {(['Todos', 'Em Dia', 'Em Atraso'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border",
                statusFilter === status
                  ? "bg-gray-950 text-yellow-400 border-gray-950 shadow-md"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[28px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-wider">Aluno</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-wider">Responsável</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-wider">Dia Venc.</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-wider">Mensalidade</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-wider text-right">Ação / Cobrança</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-semibold">
              {filteredFinances.map((item) => {
                const isLate = item.status === 'Em Atraso';
                const isUpdating = updatingId === item.financeId;

                return (
                  <tr key={item.financeId} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-black text-gray-950 text-sm">{item.studentName}</div>
                      <div className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">
                        Escola: {item.student.schoolName || 'Geral'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      <div className="font-bold text-gray-900">{item.parentName}</div>
                      <div className="text-[10px] text-gray-500">{item.parentPhone || 'Sem telefone'}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-800">
                      <span className="inline-flex items-center gap-1 bg-gray-100 px-2.5 py-1 rounded-lg text-xs font-bold text-gray-800">
                        <Calendar size={12} className="text-gray-500" /> Dia {item.paymentDay}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-black text-gray-950 text-sm">
                      R$ {item.value.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        disabled={isUpdating}
                        onClick={() => toggleStatus(item)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-full text-xs font-black transition-all flex items-center gap-1.5 border cursor-pointer active:scale-95",
                          isLate
                            ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100",
                          isUpdating && "opacity-50 cursor-wait"
                        )}
                        title="Clique para alternar o status do pagamento"
                      >
                        {isUpdating ? (
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : isLate ? (
                          <AlertCircle size={14} />
                        ) : (
                          <CheckCircle2 size={14} />
                        )}
                        {item.status}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => shareWA(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition-all shadow-sm active:scale-95 cursor-pointer"
                        title="Lembrar cobrança via WhatsApp"
                      >
                        <MessageCircle size={15} /> Cobrar
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredFinances.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Wallet size={36} className="opacity-40 text-gray-400" />
                      <p className="font-bold text-gray-700">Nenhum aluno encontrado para os filtros selecionados.</p>
                      <p className="text-xs text-gray-500">Cadastre alunos no menu "Alunos" para que apareçam na gestão financeira.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
