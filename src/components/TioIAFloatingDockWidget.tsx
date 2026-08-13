import React, { useState, useEffect } from 'react';
import { Bot, ClipboardCheck, X, Volume2, CheckCircle2, MessageSquare } from 'lucide-react';
import { Student, Lead, Driver, TeamMember } from '../types';
import { isStudentAbsentOnDate } from '../lib/absence';
import { playBusHornSound, speakTioIAPrompt } from '../lib/sound';
import { getReadNotifications, markNotificationAsRead } from '../lib/tioNotifications';

interface TioIAFloatingDockWidgetProps {
  profile: Driver | TeamMember | null;
  students: Student[];
  leads: Lead[];
  onOpenTioIA: () => void;
  onOpenCheckin: () => void;
}

export function TioIAFloatingDockWidget({
  profile,
  students,
  leads,
  onOpenTioIA,
  onOpenCheckin
}: TioIAFloatingDockWidgetProps) {
  const [readIds, setReadIds] = useState<string[]>(getReadNotifications());
  const [hideBubble, setHideBubble] = useState(false);

  useEffect(() => {
    const handleUpdate = () => setReadIds(getReadNotifications());
    window.addEventListener('tioia_notifications_updated', handleUpdate);
    return () => window.removeEventListener('tioia_notifications_updated', handleUpdate);
  }, []);

  if (!profile) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const absentStudents = students.filter(s => isStudentAbsentOnDate(s, todayStr));
  const activeStudentCount = students.filter(s => s.status !== 'Excluido').length;
  const isLate = profile && 'invoiceStatus' in profile ? profile.invoiceStatus === 'Em Atraso' : false;
  const hasActivePromise = profile && 'paymentPromiseUntil' in profile && profile.paymentPromiseUntil ? new Date(profile.paymentPromiseUntil) > new Date() : false;

  // Construct active notification items
  const notifItems: Array<{
    id: string;
    title: string;
    message: string;
    type: 'absence' | 'billing' | 'lead' | 'limit';
  }> = [];

  // 1. Absences today
  if (absentStudents.length > 0) {
    const notifId = `absence-${todayStr}-${absentStudents.map(s => s.id).join('-')}`;
    if (!readIds.includes(notifId)) {
      notifItems.push({
        id: notifId,
        title: 'Falta Confirmada Hoje',
        message: absentStudents.length === 1
          ? `O pai de ${absentStudents[0].name} avisou que ele(a) NÃO VAI hoje!`
          : `${absentStudents.length} alunos não vão hoje: ${absentStudents.map(s => s.name).join(', ')}`,
        type: 'absence'
      });
    }
  }

  // 2. Billing overdue
  if (isLate && !hasActivePromise) {
    const notifId = `billing-late-${todayStr}`;
    if (!readIds.includes(notifId)) {
      notifItems.push({
        id: notifId,
        title: 'Licença Vencida',
        message: 'Sua mensalidade venceu. Copie a chave Pix para regularizar.',
        type: 'billing'
      });
    }
  }

  // 3. Leads
  if (leads.length > 0) {
    const notifId = `leads-${leads.length}`;
    if (!readIds.includes(notifId)) {
      notifItems.push({
        id: notifId,
        title: 'Pedidos de Orçamento',
        message: `Você recebeu ${leads.length} pedido(s) de orçamentos de pais!`,
        type: 'lead'
      });
    }
  }

  const unreadCount = notifItems.length;
  const topNotif = notifItems[0];

  const handleMarkAsRead = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    markNotificationAsRead(id);
  };

  const handleSpeech = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    playBusHornSound();
    speakTioIAPrompt(`Aviso do Tio IA: ${text}`);
  };

  return (
    <div className="fixed bottom-3 inset-x-3 max-w-lg mx-auto sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-40 flex flex-col items-start gap-2 pointer-events-none">
      
      {/* 💬 FLOATING SPEECH BUBBLE (BALÃO DE CONVERSA DO TIO IA) */}
      {topNotif && !hideBubble && (
        <div 
          onClick={onOpenTioIA}
          className="pointer-events-auto w-full bg-gray-950 text-white p-3.5 rounded-2xl shadow-2xl border-2 border-yellow-400 relative animate-bounce-short cursor-pointer group hover:scale-[1.01] transition-all"
        >
          {/* Bubble tail pointing down */}
          <div className="absolute -bottom-2 left-8 w-4 h-4 bg-gray-950 border-r-2 border-b-2 border-yellow-400 transform rotate-45" />

          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-yellow-400 text-gray-950 flex items-center justify-center shrink-0 font-black shadow">
                <Bot size={18} />
              </div>
              <div className="text-xs">
                <div className="font-black text-yellow-400 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                  <span>{topNotif.title}</span>
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
                </div>
                <p className="font-bold text-gray-100 mt-0.5 leading-snug">
                  {topNotif.message}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={(e) => handleSpeech(e, topNotif.message)}
                className="p-1.5 text-yellow-400 hover:text-yellow-300 bg-white/10 rounded-lg cursor-pointer"
                title="Ouvir em Voz Alta"
              >
                <Volume2 size={14} />
              </button>

              <button
                onClick={(e) => handleMarkAsRead(e, topNotif.id)}
                className="p-1.5 text-emerald-400 hover:text-emerald-300 bg-white/10 rounded-lg cursor-pointer flex items-center gap-0.5 text-[10px] font-black"
                title="Marcar como Lido"
              >
                <CheckCircle2 size={14} />
                <span className="hidden sm:inline">Lido</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setHideBubble(true);
                }}
                className="p-1 text-gray-400 hover:text-white rounded-lg cursor-pointer"
                title="Ocultar balão"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 ERGONOMIC BOTTOM DOCK BAR */}
      <div className="pointer-events-auto w-full flex items-center justify-between gap-2 bg-gray-950/95 backdrop-blur-md p-2 rounded-2xl sm:rounded-full shadow-2xl border-2 border-yellow-400/40">
        {/* AI CSM Assistant Pill Button with Badge */}
        <button 
          className="relative px-3.5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-xl sm:rounded-full shadow flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-xs shrink-0"
          onClick={onOpenTioIA}
          title="Abrir Chat do Tio IA"
        >
          <Bot size={18} className="shrink-0 text-gray-950" />
          <span className="font-extrabold uppercase tracking-tight">Tio IA</span>
          
          {/* Badge counter */}
          {unreadCount > 0 ? (
            <span className="px-1.5 py-0.5 bg-red-600 text-white text-[10px] font-black rounded-full ml-0.5 animate-pulse shadow">
              {unreadCount}
            </span>
          ) : (
            <span className="px-1.5 py-0.5 bg-gray-950 text-yellow-400 text-[9px] font-black rounded-full ml-0.5 uppercase hidden sm:inline">
              24h
            </span>
          )}
        </button>

        {/* Main Attendance Checklist Button */}
        <button 
          className="flex-1 sm:flex-initial px-4 py-2.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-gray-950 font-black rounded-xl sm:rounded-full shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer text-xs"
          onClick={onOpenCheckin}
          title="Abrir Lista de Chamada e Embarque da Van"
        >
          <ClipboardCheck size={20} className="shrink-0 text-gray-950" />
          <span className="font-black uppercase tracking-wider text-gray-950 truncate">Chamada do Embarque</span>
        </button>
      </div>

    </div>
  );
}
