import React, { useState, useMemo } from 'react';
import { 
  Bot, 
  Send, 
  Copy, 
  Check, 
  Sparkles, 
  Calendar, 
  DollarSign, 
  QrCode, 
  Info, 
  MessageCircle, 
  RotateCcw, 
  ShieldAlert, 
  ChevronRight, 
  Edit3,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Student, Finance } from '../types';
import { 
  BILLING_STAGES, 
  BillingStageKey, 
  calculateStudentBillingStage, 
  formatBillingMessage, 
  generatePixCopiaECola 
} from '../lib/billingRuleUtils';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface BillingRuleAutomationProps {
  students: Student[];
  finances: Finance[];
  onOpenProfile?: () => void;
}

export function BillingRuleAutomation({ students, finances, onOpenProfile }: BillingRuleAutomationProps) {
  const { profile } = useAuth();
  
  const [selectedStageKey, setSelectedStageKey] = useState<BillingStageKey>('virada_mes');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [customTemplates, setCustomTemplates] = useState<Partial<Record<BillingStageKey, string>>>({});
  const [isEditingTemplate, setIsEditingTemplate] = useState<boolean>(false);
  const [templateDraft, setTemplateDraft] = useState<string>('');

  const currentDay = new Date().getDate();

  const activeStudents = useMemo(() => {
    return students.filter(s => s.status !== 'Excluido');
  }, [students]);

  // Combine student with finance status
  const studentsWithStatus = useMemo(() => {
    return activeStudents.map(student => {
      const fin = finances.find(f => f.studentId === student.id);
      const status = fin?.status || 'Em Dia';
      const paymentDay = student.paymentDay || 10;
      const value = fin?.value !== undefined ? fin.value : (student.value || 0);
      const stageKey = calculateStudentBillingStage(paymentDay, status, currentDay);

      return {
        ...student,
        financeStatus: status,
        paymentDay,
        value,
        stageKey
      };
    });
  }, [activeStudents, finances, currentDay]);

  // Group counts by stage
  const stageCounts = useMemo(() => {
    const counts: Record<BillingStageKey, number> = {
      virada_mes: 0,
      lembrete_preventivo: 0,
      dia_vencimento: 0,
      atraso_leve: 0,
      atraso_critico: 0
    };

    studentsWithStatus.forEach(s => {
      if (counts[s.stageKey] !== undefined) {
        counts[s.stageKey]++;
      }
    });

    return counts;
  }, [studentsWithStatus]);

  // Filter students for the selected stage
  const studentsInSelectedStage = useMemo(() => {
    return studentsWithStatus.filter(s => s.stageKey === selectedStageKey);
  }, [studentsWithStatus, selectedStageKey]);

  // Target student for preview
  const currentPreviewStudent = useMemo(() => {
    if (selectedStudentId) {
      return studentsWithStatus.find(s => s.id === selectedStudentId) || studentsInSelectedStage[0] || studentsWithStatus[0];
    }
    return studentsInSelectedStage[0] || studentsWithStatus[0];
  }, [selectedStudentId, studentsInSelectedStage, studentsWithStatus]);

  // Current formatted message & Pix
  const currentMessageData = useMemo(() => {
    if (!currentPreviewStudent) {
      return {
        messageText: 'Nenhum aluno cadastrado para gerar prévia.',
        pixCopiaECola: profile?.pixKey || ''
      };
    }

    const templateToUse = customTemplates[selectedStageKey] || BILLING_STAGES[selectedStageKey].defaultTemplate;

    return formatBillingMessage({
      stageKey: selectedStageKey,
      studentName: currentPreviewStudent.name,
      parentName: currentPreviewStudent.parentName || 'Responsável',
      driverName: profile?.name || 'Tio da Van',
      value: currentPreviewStudent.value || 350,
      paymentDay: currentPreviewStudent.paymentDay || 10,
      pixKey: profile?.pixKey || '',
      driverCity: profile?.city || 'São Paulo',
      customTemplate: templateToUse
    });
  }, [currentPreviewStudent, selectedStageKey, customTemplates, profile]);

  const handleCopyPix = () => {
    if (!profile?.pixKey) {
      toast.error('Cadastre sua chave Pix em "Meu Perfil" primeiro.');
      return;
    }
    navigator.clipboard.writeText(currentMessageData.pixCopiaECola);
    setCopiedKey(true);
    toast.success('Código Pix Copia e Cola copiado com sucesso!');
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(currentMessageData.messageText);
    setCopiedText(true);
    toast.success('Mensagem completa da T.IA copiada!');
    setTimeout(() => setCopiedText(false), 2500);
  };

  const handleSendWhatsApp = (student: typeof studentsWithStatus[0]) => {
    if (!student.parentPhone && !student.tel1) {
      toast.error(`Responsável de ${student.name} sem telefone cadastrado.`);
      return;
    }

    const phone = (student.parentPhone || student.tel1 || '').replace(/\D/g, '');
    const formattedPhone = phone.length <= 11 ? `55${phone}` : phone;

    const templateToUse = customTemplates[selectedStageKey] || BILLING_STAGES[selectedStageKey].defaultTemplate;

    const { messageText } = formatBillingMessage({
      stageKey: selectedStageKey,
      studentName: student.name,
      parentName: student.parentName || 'Responsável',
      driverName: profile?.name || 'Tio da Van',
      value: student.value || 350,
      paymentDay: student.paymentDay || 10,
      pixKey: profile?.pixKey || '',
      driverCity: profile?.city || 'São Paulo',
      customTemplate: templateToUse
    });

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  const handleSaveCustomTemplate = () => {
    setCustomTemplates(prev => ({
      ...prev,
      [selectedStageKey]: templateDraft
    }));
    setIsEditingTemplate(false);
    toast.success('Modelo de mensagem da T.IA atualizado!');
  };

  const handleResetTemplate = () => {
    setCustomTemplates(prev => {
      const next = { ...prev };
      delete next[selectedStageKey];
      return next;
    });
    setTemplateDraft(BILLING_STAGES[selectedStageKey].defaultTemplate);
    setIsEditingTemplate(false);
    toast.success('Modelo restaurado para o padrão recomendado da T.IA!');
  };

  const activeStageConfig = BILLING_STAGES[selectedStageKey];

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-yellow-950 text-white p-6 rounded-[28px] border border-yellow-500/30 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-48 h-48 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-yellow-400 text-gray-950 text-xs font-black rounded-full flex items-center gap-1.5 shadow-sm uppercase tracking-wider">
                <Bot size={14} className="fill-gray-950" />
                Régua de Cobrança T.IA
              </span>
              <span className="text-xs font-bold text-yellow-300/90 bg-yellow-400/10 border border-yellow-400/20 px-2.5 py-0.5 rounded-full">
                Hoje é dia {currentDay} do mês
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white">
              Automação de Comunicação com Pix Copia e Cola
            </h3>
            
            <p className="text-xs sm:text-sm text-gray-300 font-medium leading-relaxed">
              A T.IA calcula a data de vencimento de cada aluno e classifica em <strong>5 estágios automáticos</strong>: da virada do mês até o pós-vencimento. As mensagens já vêm prontas com valor correto, chave Pix e código Pix Copia e Cola bancário oficial.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {!profile?.pixKey ? (
              <button
                onClick={onOpenProfile}
                className="px-4 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <QrCode size={15} /> Cadastrar Minha Chave Pix
              </button>
            ) : (
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 text-xs">
                <div className="text-[10px] text-yellow-300 font-bold uppercase">Sua Chave Pix Ativa:</div>
                <div className="font-mono font-black text-white text-xs truncate max-w-[200px]">
                  {profile.pixKey}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5 Stages Progress Bar / Interactive Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {(Object.keys(BILLING_STAGES) as BillingStageKey[]).map((key) => {
          const stage = BILLING_STAGES[key];
          const count = stageCounts[key];
          const isSelected = selectedStageKey === key;

          return (
            <button
              key={key}
              onClick={() => {
                setSelectedStageKey(key);
                setSelectedStudentId('');
              }}
              className={cn(
                "p-4 rounded-2xl border transition-all text-left flex flex-col justify-between cursor-pointer active:scale-95 shadow-sm relative overflow-hidden group",
                isSelected
                  ? "bg-gray-950 text-white border-yellow-400 ring-2 ring-yellow-400/40 shadow-md"
                  : "bg-white text-gray-900 border-gray-200 hover:border-gray-300 hover:bg-gray-50/80"
              )}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className={cn(
                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                    isSelected ? "bg-yellow-400 text-gray-950" : "bg-gray-100 text-gray-600"
                  )}>
                    Etapa {stage.stepNumber}
                  </span>
                  
                  <span className={cn(
                    "text-xs font-black px-2 py-0.5 rounded-full flex items-center gap-1",
                    count > 0 
                      ? (isSelected ? "bg-emerald-500 text-white" : "bg-emerald-100 text-emerald-800")
                      : (isSelected ? "bg-white/10 text-gray-300" : "bg-gray-100 text-gray-400")
                  )}>
                    {count} {count === 1 ? 'aluno' : 'alunos'}
                  </span>
                </div>

                <h4 className="text-xs font-black tracking-tight leading-tight line-clamp-2">
                  {stage.shortLabel}
                </h4>
                
                <p className={cn(
                  "text-[10px] font-medium mt-1 line-clamp-1",
                  isSelected ? "text-yellow-300/90" : "text-gray-500"
                )}>
                  {stage.defaultTriggerDays}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-current/10 flex items-center justify-between text-[11px] font-bold">
                <span className={isSelected ? "text-gray-300" : "text-gray-500"}>Ver mensagem</span>
                <ChevronRight size={14} className={isSelected ? "text-yellow-400" : "text-gray-400 group-hover:translate-x-0.5 transition-transform"} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Workspace: Stage Detail & WhatsApp Dispatcher */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Stage Info & Student List (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className={cn(
                  "text-[10px] font-black uppercase px-2.5 py-1 rounded-full border inline-block mb-1.5",
                  activeStageConfig.badgeColor
                )}>
                  {activeStageConfig.name}
                </span>
                <h4 className="text-base font-black text-gray-950">
                  {activeStageConfig.tone}
                </h4>
                <p className="text-xs text-gray-600 font-medium mt-1">
                  {activeStageConfig.description}
                </p>
              </div>
            </div>

            <div className="bg-amber-50/70 p-3 rounded-2xl border border-amber-200/80 text-[11px] font-semibold text-amber-950 flex items-center gap-2">
              <Calendar size={15} className="text-amber-700 shrink-0" />
              <span>{activeStageConfig.daysDescription}</span>
            </div>

            {/* Students in this stage */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-black text-gray-950 uppercase tracking-wider">
                  Alunos neste Estágio Hoje ({studentsInSelectedStage.length})
                </h5>
                <span className="text-[10px] font-bold text-gray-500">
                  Total de {activeStudents.length} alunos
                </span>
              </div>

              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {studentsInSelectedStage.map((st) => {
                  const isSelected = (currentPreviewStudent?.id === st.id);
                  const isLate = st.financeStatus === 'Em Atraso';

                  return (
                    <div
                      key={st.id}
                      onClick={() => setSelectedStudentId(st.id)}
                      className={cn(
                        "p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer",
                        isSelected
                          ? "bg-yellow-50 border-yellow-400 shadow-sm"
                          : "bg-gray-50/60 border-gray-200 hover:bg-gray-100/80"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-gray-950 truncate">
                            {st.name}
                          </p>
                          <span className={cn(
                            "text-[9px] font-black px-1.5 py-0.2 rounded-md",
                            isLate ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-800"
                          )}>
                            {st.financeStatus}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-semibold truncate">
                          Resp: {st.parentName || 'Pai/Mãe'} • Venc. Dia {st.paymentDay} • R$ {st.value.toFixed(2)}
                        </p>
                      </div>

                      <div className="shrink-0 flex items-center gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSendWhatsApp(st);
                          }}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer"
                          title="Enviar WhatsApp da Régua para este responsável"
                        >
                          <MessageCircle size={13} />
                          <span>Disparar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {studentsInSelectedStage.length === 0 && (
                  <div className="p-6 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-1">
                    <p className="text-xs font-bold text-gray-700">
                      Nenhum aluno está exatamente neste estágio hoje (dia {currentDay}).
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Você pode selecionar qualquer aluno para gerar a mensagem ou visualizar outras etapas da régua.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Message Preview, Pix Copia e Cola & Actions (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-yellow-500" />
                  <h4 className="text-sm font-black text-gray-950 uppercase tracking-wide">
                    Mensagem Gerada pela T.IA
                  </h4>
                </div>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Personalizada para: <strong className="text-gray-900">{currentPreviewStudent?.name || 'Aluno Exemplo'}</strong> (Resp: {currentPreviewStudent?.parentName || 'Responsável'})
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!isEditingTemplate ? (
                  <button
                    onClick={() => {
                      setTemplateDraft(customTemplates[selectedStageKey] || activeStageConfig.defaultTemplate);
                      setIsEditingTemplate(true);
                    }}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 size={13} />
                    <span>Personalizar Modelo</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleResetTemplate}
                      className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                      title="Restaurar padrão"
                    >
                      <RotateCcw size={13} /> Padrão
                    </button>
                    <button
                      onClick={handleSaveCustomTemplate}
                      className="px-3 py-1.5 bg-gray-950 hover:bg-gray-800 text-yellow-400 text-xs font-black rounded-xl transition-all cursor-pointer"
                    >
                      Salvar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Template Editor or Formatted WhatsApp Message Preview */}
            {isEditingTemplate ? (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 text-blue-900 text-xs rounded-2xl border border-blue-100 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Info size={14} className="text-blue-600" /> Tags Dinâmicas Disponíveis:
                  </p>
                  <p className="font-mono text-[11px] text-blue-800">
                    [NOME_RESPONSAVEL], [NOME_ALUNO], [NOME_TIO], [VALOR], [DIA_VENCIMENTO], [PIX_COPIA_COLA], [CHAVE_PIX]
                  </p>
                </div>

                <textarea
                  rows={10}
                  value={templateDraft}
                  onChange={(e) => setTemplateDraft(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-300 rounded-2xl text-xs font-mono text-gray-900 focus:ring-2 focus:ring-yellow-400 outline-none leading-relaxed"
                />
              </div>
            ) : (
              <div className="space-y-3">
                {/* WhatsApp Chat Balloon Preview */}
                <div className="bg-[#EFEAE2] p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-inner relative">
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-xs text-gray-900 whitespace-pre-wrap font-sans leading-relaxed relative">
                    <div className="absolute top-2 right-2 text-[10px] text-gray-400 font-mono">
                      WhatsApp Preview
                    </div>
                    {currentMessageData.messageText}
                  </div>
                </div>

                {/* Pix Copia e Cola Card Display */}
                <div className="bg-gray-950 text-white p-4 rounded-2xl border border-yellow-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <QrCode size={16} className="text-yellow-400" />
                      <span className="text-xs font-black uppercase text-yellow-400 tracking-wider">
                        Pix Copia e Cola (BR Code EMV Automático)
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400">
                      Venc. Dia {currentPreviewStudent?.paymentDay || 10} • R$ {currentPreviewStudent?.value?.toFixed(2) || '0,00'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-gray-900 rounded-xl border border-gray-800 font-mono text-[11px] text-emerald-400 break-all select-all">
                    {currentMessageData.pixCopiaECola}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[10px] text-gray-400">
                      Funciona em qualquer banco (Nubank, Itaú, Bradesco, Inter, Caixa, Santander).
                    </p>
                    <button
                      onClick={handleCopyPix}
                      className="px-3 py-1 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-lg text-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                      {copiedKey ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedKey ? 'Copiado!' : 'Copiar Pix'}</span>
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                  <button
                    onClick={handleCopyMessage}
                    className="w-full sm:flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer border border-gray-200"
                  >
                    {copiedText ? <Check size={15} /> : <Copy size={15} />}
                    <span>{copiedText ? 'Texto Copiado!' : 'Copiar Mensagem'}</span>
                  </button>

                  {currentPreviewStudent && (
                    <button
                      onClick={() => handleSendWhatsApp(currentPreviewStudent)}
                      className="w-full sm:flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <Send size={15} />
                      <span>Abrir WhatsApp do Responsável</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
