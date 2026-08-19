import React, { useState } from 'react';
import { 
  Wallet, 
  CheckCircle2, 
  AlertCircle, 
  QrCode, 
  Copy, 
  Check, 
  MessageCircle, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  ArrowRight,
  User,
  School,
  FileText
} from 'lucide-react';
import { Student, Driver } from '../types';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface ParentFinanceViewProps {
  students: Student[];
  driversMap: Record<string, Driver>;
}

export function ParentFinanceView({ students, driversMap }: ParentFinanceViewProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id || '');

  const activeStudent = students.find(s => s.id === selectedStudentId) || students[0];
  const driver = activeStudent?.driverId ? driversMap[activeStudent.driverId] : null;

  const currentMonthIndex = new Date().getMonth(); // 0 = Jan, 7 = Aug
  const currentYear = new Date().getFullYear();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Generate timeline months from beginning of the school year up to current month
  const timelineMonths = React.useMemo(() => {
    if (!activeStudent) return [];

    const isCurrentlyLate = activeStudent.paymentStatus === 'Em Atraso';
    const paymentDay = activeStudent.paymentDay || 10;
    const value = activeStudent.value || 350;

    const list = [];
    // Show up to current month (or at least first 8 months)
    const maxMonth = Math.max(currentMonthIndex, 0);

    for (let m = 0; m <= maxMonth; m++) {
      const isCurrent = m === currentMonthIndex;
      const status = isCurrent && isCurrentlyLate ? 'Em Atraso' : 'Em Dia';
      
      const dueFormatted = `${String(paymentDay).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${currentYear}`;

      list.push({
        monthIndex: m,
        monthName: monthNames[m],
        year: currentYear,
        dueDate: dueFormatted,
        value,
        status,
        isCurrent
      });
    }

    return list.reverse(); // Most recent on top
  }, [activeStudent, currentMonthIndex, currentYear]);

  const handleCopyPix = (pixKey: string) => {
    if (!pixKey) {
      toast.error('Chave Pix não cadastrada pelo motorista.');
      return;
    }
    navigator.clipboard.writeText(pixKey);
    setCopiedKey(pixKey);
    toast.success('Chave Pix copiada com sucesso!');
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSendProof = (student: Student, driverObj?: Driver | null) => {
    const phone = driverObj?.phone?.replace(/\D/g, '') || '';
    const msg = `Olá ${driverObj?.name || 'Tio(a)'}! Segue o comprovante de pagamento da mensalidade do(a) aluno(a) ${student.name}.`;
    
    if (phone) {
      const formatted = phone.length <= 11 ? `55${phone}` : phone;
      window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  if (!activeStudent) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-gray-100 text-gray-400">
        <Wallet size={36} className="mx-auto opacity-30 mb-2" />
        <p className="font-bold text-gray-700">Nenhum aluno encontrado para exibir informações financeiras.</p>
      </div>
    );
  }

  const isLate = activeStudent.paymentStatus === 'Em Atraso';
  const driverPixKey = driver?.pixKey || '';
  const isBoletoPreference = activeStudent.billingPreference === 'boleto' || driver?.billingPreference === 'boleto';

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Student Selector if multiple children */}
      {students.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {students.map(s => (
            <button
              key={s.id}
              onClick={() => setSelectedStudentId(s.id)}
              className={cn(
                "px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 shrink-0 border",
                activeStudent.id === s.id
                  ? "bg-gray-950 text-yellow-400 border-gray-950 shadow-md"
                  : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              )}
            >
              <User size={14} />
              <span>{s.name}</span>
              {s.paymentStatus === 'Em Atraso' && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Main Status Header Card */}
      <div className={cn(
        "p-6 sm:p-8 rounded-[36px] shadow-lg border transition-all text-gray-950",
        isLate 
          ? "bg-gradient-to-br from-red-50 via-rose-50 to-orange-50 border-red-200 ring-2 ring-red-300"
          : "bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50/70 border-emerald-200"
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5 border-current/10">
          <div className="flex items-center gap-3.5">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center font-black shrink-0 shadow-md",
              isLate ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
            )}>
              {isLate ? <AlertCircle size={26} /> : <CheckCircle2 size={26} />}
            </div>
            <div>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full inline-block mb-1",
                isLate ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"
              )}>
                {isLate ? '⚠️ Mensalidade em Aberto' : '✓ Mensalidades em Dia'}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-gray-950">
                {activeStudent.name}
              </h3>
              <p className="text-xs text-gray-600 font-medium">
                Escola: {activeStudent.schoolName || 'Geral'} • Vencimento: Todo dia {activeStudent.paymentDay || 10}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider block">Valor da Mensalidade</span>
            <div className="text-2xl font-black text-gray-950">
              R$ {(activeStudent.value || 350).toFixed(2).replace('.', ',')}
            </div>
          </div>
        </div>

        {/* Action / Instructions according to status */}
        {isLate ? (
          <div className="mt-5 space-y-4">
            <p className="text-xs font-semibold text-red-900 leading-relaxed">
              {isBoletoPreference 
                ? 'O pagamento deste mês está pendente. Por favor, efetue o pagamento utilizando o boleto bancário enviado pelo motorista e envie o comprovante.'
                : 'O pagamento deste mês está pendente. Você pode realizar o pagamento via Pix utilizando a chave cadastrada do motorista abaixo e enviar o comprovante no WhatsApp.'}
            </p>

            {!isBoletoPreference && driverPixKey && (
              <div className="p-4 bg-white rounded-2xl border border-red-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                  <span className="flex items-center gap-1.5 text-gray-900 font-black">
                    <QrCode size={16} className="text-yellow-600" />
                    Chave Pix do Motorista ({driver?.name || 'Tio da Van'}):
                  </span>
                  <span className="text-[10px] text-gray-500 font-normal">Titular: {driver?.name || 'Motorista'}</span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                  <span className="font-mono text-xs font-bold text-gray-900 select-all break-all px-1">
                    {driverPixKey}
                  </span>
                  
                  <button
                    type="button"
                    onClick={() => handleCopyPix(driverPixKey)}
                    className="px-3.5 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xs rounded-lg shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {copiedKey === driverPixKey ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === driverPixKey ? 'Chave Copiada!' : 'Copiar Chave Pix'}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleSendProof(activeStudent, driver)}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <MessageCircle size={16} />
                <span>Enviar Comprovante no WhatsApp do Tio</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>Obrigado! Todas as mensalidades estão regulares. O status é atualizado diretamente pelo motorista.</span>
          </div>
        )}
      </div>

      {/* Monthly History Timeline */}
      <div className="bg-white p-6 sm:p-8 rounded-[36px] shadow-sm border border-gray-100 space-y-6">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h4 className="text-lg font-black text-gray-950 flex items-center gap-2">
              <Calendar size={18} className="text-yellow-500" />
              <span>Linha do Tempo das Mensalidades ({currentYear})</span>
            </h4>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Histórico mês a mês do contrato de transporte escolar.
            </p>
          </div>
        </div>

        {/* Timeline Items */}
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-200">
          {timelineMonths.map((item, idx) => {
            const isLateMonth = item.status === 'Em Atraso';

            return (
              <div key={idx} className="relative group">
                {/* Timeline Pin */}
                <div className={cn(
                  "absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shadow-xs transition-all",
                  isLateMonth
                    ? "bg-red-500 border-white text-white ring-4 ring-red-100"
                    : "bg-emerald-500 border-white text-white ring-4 ring-emerald-100"
                )}>
                  {isLateMonth ? (
                    <AlertCircle size={12} className="stroke-[3]" />
                  ) : (
                    <Check size={12} className="stroke-[3]" />
                  )}
                </div>

                {/* Timeline Card */}
                <div className={cn(
                  "p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                  isLateMonth
                    ? "bg-red-50/70 border-red-200 shadow-xs"
                    : item.isCurrent
                    ? "bg-emerald-50/60 border-emerald-200 shadow-xs"
                    : "bg-gray-50/80 border-gray-200/80"
                )}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm text-gray-950">
                        {item.monthName} de {item.year}
                      </span>
                      {item.isCurrent && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-yellow-400 text-gray-950">
                          Mês Atual
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-semibold flex items-center gap-1.5">
                      <Clock size={13} className="text-gray-400" />
                      Vencimento: {item.dueDate}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-current/10">
                    <div className="text-left sm:text-right">
                      <div className="text-sm font-black text-gray-950">
                        R$ {item.value.toFixed(2).replace('.', ',')}
                      </div>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md inline-block mt-0.5",
                        isLateMonth
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-100 text-emerald-800"
                      )}>
                        {item.status}
                      </span>
                    </div>

                    {isLateMonth && driverPixKey && !isBoletoPreference && (
                      <button
                        type="button"
                        onClick={() => handleCopyPix(driverPixKey)}
                        className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                        title="Copiar Chave Pix"
                      >
                        <Copy size={13} />
                        <span className="hidden sm:inline">Pagar Pix</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
