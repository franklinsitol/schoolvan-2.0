import React, { useState } from 'react';
import { Wallet, Info, MessageCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { Finance, Student } from '../types';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export function FinanceView() {
  const { profile } = useAuth();
  const { data: finances, loading } = useFirestore<Finance>(`drivers/${profile?.id}/finance`);
  const { data: students } = useFirestore<Student>(`drivers/${profile?.id}/students`);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  if (loading) return <div className="p-8 text-center">Carregando...</div>;

  const toggleStatus = async (finance: Finance) => {
    if (updatingId) return;
    setUpdatingId(finance.id);
    try {
      const newStatus = finance.status === 'Em Dia' ? 'Em Atraso' : 'Em Dia';
      await updateDoc(doc(db, `drivers/${profile?.id}/finance`, finance.id), {
        status: newStatus
      });
      toast.success(`Status alterado para ${newStatus}`);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao alterar status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const shareWA = (finance: Finance, student?: Student) => {
    if (!student?.parentPhone) {
      toast.error('Telefone do responsável não cadastrado.');
      return;
    }
    const msg = `Olá ${student.parentName}, aqui é da Van do ${profile?.name}. Gostaria de lembrar sobre a mensalidade do(a) ${student.name} no valor de R$ ${finance.value.toFixed(2)}. Segue minha chave Pix: ${profile?.pixKey || 'Não cadastrada'}. Obrigado!`;
    const url = `https://wa.me/55${student.parentPhone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="p-4 md:p-8">
      <h2 className="text-3xl font-extrabold text-gray-900 mb-8">Financeiro</h2>
      
      <div className="bg-white p-4 rounded-2xl border border-gray-100 mb-8 flex items-start gap-3 shadow-sm">
        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
          <Info className="text-blue-500" size={20} />
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">
          Clique no status para alternar entre <span className="font-bold text-green-600">"Em Dia"</span> e <span className="font-bold text-red-600">"Em Atraso"</span>. 
          Use o botão do WhatsApp para enviar lembretes de cobrança automáticos.
        </p>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Aluno</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Responsável</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Valor</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Cobrar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {finances.map((finance) => {
                const student = students.find(s => s.id === finance.studentId);
                const isLate = finance.status === 'Em Atraso';
                const isUpdating = updatingId === finance.id;
                
                return (
                  <tr key={finance.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{finance.studentName}</div>
                      <div className="text-[10px] text-gray-400 uppercase font-bold tracking-tighter">Ref: {finance.ref || 'Mensalidade'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{student?.parentName || '-'}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">R$ {finance.value.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <button 
                        disabled={isUpdating}
                        className={cn(
                          "px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border",
                          isLate 
                            ? "bg-red-50 text-red-600 border-red-100 hover:bg-red-100" 
                            : "bg-green-50 text-green-600 border-green-100 hover:bg-green-100",
                          isUpdating && "opacity-50 cursor-wait"
                        )}
                        onClick={() => toggleStatus(finance)}
                      >
                        {isUpdating ? (
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                          isLate ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />
                        )}
                        {finance.status}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        className="p-2 text-green-600 hover:bg-green-50 rounded-xl transition-colors border border-transparent hover:border-green-100 group"
                        onClick={() => shareWA(finance, student)}
                        title="Enviar cobrança via WhatsApp"
                      >
                        <MessageCircle size={20} className="group-hover:scale-110 transition-transform" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {finances.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Wallet size={40} className="opacity-20" />
                      <p className="text-sm">Nenhum registro financeiro encontrado.</p>
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
