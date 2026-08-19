import React, { useState, useMemo } from 'react';
import { 
  Wallet, 
  MessageCircle, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Calendar,
  Bot,
  QrCode, 
  FileText, 
  UserCheck
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { Finance, Student, InvoiceStatus } from '../types';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { BillingRuleAutomation } from './BillingRuleAutomation';
import { BillingRuleModal } from './BillingRuleModal';
import { calculateStudentBillingStage, BILLING_STAGES } from '../lib/billingRuleUtils';
import toast from 'react-hot-toast';

export function FinanceView({ onNavigateToProfile }: { onNavigateToProfile?: () => void }) {
  const { profile } = useAuth();
  const { data: finances } = useFirestore<Finance>(`drivers/${profile?.id}/finance`);
  const { data: students } = useFirestore<Student>(`drivers/${profile?.id}/students`);
  
  const [activeTab, setActiveTab] = useState<'table' | 'billing_rule'>('table');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Em Dia' | 'Em Atraso'>('Todos');
  
  // Driver global billing preference
  const [billingPreference, setBillingPreference] = useState<'pix' | 'boleto'>(
    profile?.billingPreference || 'pix'
  );

  // Sync state if profile changes
  React.useEffect(() => {
    if (profile?.billingPreference) {
      setBillingPreference(profile.billingPreference);
    }
  }, [profile?.billingPreference]);

  const handleUpdateBillingPreference = async (pref: 'pix' | 'boleto') => {
    setBillingPreference(pref);
    if (!profile?.id) return;
    try {
      const driverRef = doc(db, 'drivers', profile.id);
      await setDoc(driverRef, { billingPreference: pref }, { merge: true });
      toast.success(
        pref === 'pix' 
          ? 'Cobrança padrão definida para "🟢 Pix com sua Chave Pix"!' 
          : 'Cobrança padrão definida para "📄 Boleto Bancário (sem chave Pix)"!'
      );
    } catch (err) {
      console.error('Erro ao salvar preferência de cobrança:', err);
      toast.error('Erro ao salvar preferência.');
    }
  };
  
  // Single student billing modal state
  const [selectedStudentForBilling, setSelectedStudentForBilling] = useState<{
    student: Student;
    status: InvoiceStatus;
  } | null>(null);

  const currentDay = new Date().getDate();

  const activeStudents = useMemo(() => {
    return students.filter(s => s.status !== 'Excluido');
  }, [students]);

  // Combine active students with finance documents
  const studentFinances = useMemo(() => {
    return activeStudents.map(student => {
      const financeDoc = finances.find(f => f.studentId === student.id);
      
      const defaultStatus: InvoiceStatus = student.paymentStatus || 'Em Dia';
      const status: InvoiceStatus = financeDoc?.status || defaultStatus;
      const value = financeDoc?.value !== undefined ? financeDoc.value : (student.value || 0);
      const paymentDay = student.paymentDay || 10;
      const stageKey = calculateStudentBillingStage(paymentDay, status, currentDay);

      return {
        studentId: student.id,
        financeId: financeDoc?.id || student.id,
        studentName: student.name,
        parentName: student.parentName || 'Responsável',
        parentPhone: student.parentPhone || student.tel1 || '',
        paymentDay,
        value,
        status,
        stageKey,
        student
      };
    });
  }, [activeStudents, finances, currentDay]);

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
      // 1. Update the finance document
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

      // 2. Also update student document directly in Firestore
      const studentRef = doc(db, `drivers/${profile.id}/students`, item.studentId);
      await updateDoc(studentRef, {
        paymentStatus: newStatus,
        lastPaidMonth: newStatus === 'Em Dia' ? new Date().toISOString().slice(0, 7) : null
      });

      toast.success(`Status de ${item.studentName} alterado para "${newStatus}"!`);
    } catch (error) {
      console.error('Error toggling finance status:', error);
      toast.error('Erro ao atualizar status de pagamento.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header & Tab Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-950">Gestão Financeira</h2>
          <p className="text-gray-600 text-sm font-medium">
            Controle de mensalidades, cobrança via WhatsApp e atualização rápida de status.
          </p>
        </div>

        {/* View mode toggle tabs */}
        <div className="flex items-center p-1 bg-gray-100/90 rounded-2xl border border-gray-200 shadow-inner flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('table')}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === 'table'
                ? "bg-white text-gray-950 shadow-sm"
                : "text-gray-600 hover:text-gray-950"
            )}
          >
            <Wallet size={15} />
            <span>Tabela de Mensalidades</span>
          </button>

          <button
            onClick={() => setActiveTab('billing_rule')}
            className={cn(
              "px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5",
              activeTab === 'billing_rule'
                ? "bg-gray-950 text-yellow-400 shadow-sm"
                : "text-amber-900 hover:text-gray-950"
            )}
          >
            <Bot size={15} className={activeTab === 'billing_rule' ? "fill-yellow-400" : ""} />
            <span>Régua da T.IA (WhatsApp)</span>
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          </button>
        </div>
      </div>

      {activeTab === 'billing_rule' ? (
        <BillingRuleAutomation 
          students={students} 
          finances={finances} 
          onOpenProfile={onNavigateToProfile}
        />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Previsto</span>
                <h3 className="text-2xl font-black text-gray-900">
                  R$ {totals.totalExpected.toFixed(2).replace('.', ',')}
                </h3>
                <p className="text-[11px] text-gray-500 font-semibold">{activeStudents.length} alunos cadastrados</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-yellow-50 text-yellow-600 flex items-center justify-center font-black">
                <Wallet size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Recebido (Em Dia)</span>
                <h3 className="text-2xl font-black text-emerald-600">
                  R$ {totals.totalReceived.toFixed(2).replace('.', ',')}
                </h3>
                <p className="text-[11px] text-emerald-700/80 font-semibold">
                  {studentFinances.filter(i => i.status === 'Em Dia').length} mensalidades em dia
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                <CheckCircle2 size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Pendente (Em Atraso)</span>
                <h3 className="text-2xl font-black text-red-600">
                  R$ {totals.totalPending.toFixed(2).replace('.', ',')}
                </h3>
                <p className="text-[11px] text-red-700/80 font-semibold">
                  {studentFinances.filter(i => i.status === 'Em Atraso').length} mensalidades pendentes
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-black">
                <AlertCircle size={24} />
              </div>
            </div>
          </div>

          {/* Forma de Cobrança Toggle Banner */}
          <div className="bg-gradient-to-r from-amber-50/90 via-yellow-50/80 to-amber-50/90 p-4 rounded-3xl border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-yellow-400 text-gray-950 flex items-center justify-center font-black shrink-0">
                <UserCheck size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wide text-amber-950">
                  Forma Padrão de Cobrança das Mensagens:
                </h4>
                <p className="text-xs text-amber-800 font-medium">
                  Escolha se as mensagens automáticas de cobrança devem incluir sua <strong>Chave Pix</strong> ou informar que o <strong>Boleto</strong> foi emitido no banco.
                </p>
              </div>
            </div>

            <div className="flex items-center p-1 bg-white rounded-2xl border border-amber-300 shrink-0 shadow-xs">
              <button
                type="button"
                onClick={() => handleUpdateBillingPreference('pix')}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5",
                  billingPreference === 'pix'
                    ? "bg-gray-950 text-yellow-400 shadow-sm"
                    : "text-gray-600 hover:text-gray-950"
                )}
              >
                <QrCode size={14} className={billingPreference === 'pix' ? "text-yellow-400" : ""} />
                <span>🟢 Cobrar por Pix</span>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateBillingPreference('boleto')}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5",
                  billingPreference === 'boleto'
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-950"
                )}
              >
                <FileText size={14} />
                <span>📄 Boleto Bancário</span>
              </button>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
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
                    <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-wider">Estágio T.IA</th>
                    <th className="px-6 py-4 text-[11px] font-black text-gray-500 uppercase tracking-wider text-right">Ação de Cobrança</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs font-semibold">
                  {filteredFinances.map((item) => {
                    const isLate = item.status === 'Em Atraso';
                    const isUpdating = updatingId === item.financeId;
                    const stageConfig = BILLING_STAGES[item.stageKey];

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
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-tight flex items-center gap-1 w-fit",
                            stageConfig.badgeColor
                          )}>
                            <Bot size={11} />
                            {stageConfig.shortLabel}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setSelectedStudentForBilling({
                              student: item.student,
                              status: item.status
                            })}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 transition-all shadow-sm active:scale-95 cursor-pointer"
                            title="Cobrar este aluno via WhatsApp"
                          >
                            <MessageCircle size={14} />
                            <span>Cobrar</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredFinances.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
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
        </>
      )}

      {/* Single Student Billing Modal */}
      {selectedStudentForBilling && (
        <BillingRuleModal
          isOpen={true}
          onClose={() => setSelectedStudentForBilling(null)}
          student={selectedStudentForBilling.student}
          financeStatus={selectedStudentForBilling.status}
          onOpenProfile={onNavigateToProfile}
        />
      )}
    </div>
  );
}
