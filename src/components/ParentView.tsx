import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Bus, 
  School, 
  Calendar, 
  CalendarX, 
  Trash2, 
  Bell,
  BellRing, 
  Radio, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Smartphone, 
  Phone, 
  Users, 
  Wallet,
  X 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCollectionGroup } from '../hooks/useFirestore';
import { Student, RouteIncident, Driver } from '../types';
import { cn } from '../lib/utils';
import { 
  isStudentAbsentOnDate, 
  getTodayStr, 
  formatDateBR, 
  markStudentAbsent, 
  reintegrateStudentToRoute 
} from '../lib/absence';
import { 
  showIncidentPushNotification, 
  showStudentStatusPushNotification,
  showPaymentPushNotification,
  playIncidentAlertChime, 
  playPaymentChime,
  isPushNotificationSupported, 
  getPushNotificationPermission, 
  requestPushNotificationPermission 
} from '../lib/pushNotifications';
import { 
  getStoredNotifications, 
  subscribeNotificationStore 
} from '../lib/notificationStore';
import { NotificationCenterModal } from './NotificationCenterModal';
import { auth, db } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { where, doc, updateDoc, arrayUnion, onSnapshot } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { ParentFinanceView } from './ParentFinanceView';

interface ParentViewProps {
  initialTab?: 'routes' | 'finance';
}

export const ParentView: React.FC<ParentViewProps> = ({ initialTab = 'routes' }) => {
  const { user } = useAuth();
  const userEmail = (user?.email || '').trim();

  const constraints = useMemo(() => {
    if (!userEmail) return [];
    return [where('parentEmail', '==', userEmail)];
  }, [userEmail]);

  const { data: students, loading } = useCollectionGroup<Student>(
    userEmail ? 'students' : '',
    constraints
  );

  const { data: allIncidents } = useCollectionGroup<RouteIncident>(
    userEmail ? 'incidents' : ''
  );

  const [parentTab, setParentTab] = useState<'routes' | 'finance'>(initialTab);
  const [scheduleDates, setScheduleDates] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<string>(() => getPushNotificationPermission());
  const notifiedIncidentsRef = useRef<Set<string>>(new Set());

  // Notification Center modal state & real-time store listener
  const [isNotifCenterOpen, setIsNotifCenterOpen] = useState(false);
  const [storedNotifications, setStoredNotifications] = useState(() => getStoredNotifications(userEmail));

  useEffect(() => {
    setStoredNotifications(getStoredNotifications(userEmail));
    const unsub = subscribeNotificationStore((list) => {
      if (userEmail) {
        const clean = userEmail.trim().toLowerCase();
        setStoredNotifications(list.filter(n => !n.targetUserEmail || n.targetUserEmail.trim().toLowerCase() === clean));
      } else {
        setStoredNotifications(list);
      }
    });
    return unsub;
  }, [userEmail]);

  const unreadNotifCount = useMemo(() => {
    return storedNotifications.filter(n => !n.read).length;
  }, [storedNotifications]);

  // Dismissible late payment banner logic (stored in sessionStorage: only reappears when parent logs in again or new session)
  const bannerDismissKey = useMemo(() => `schoolvan_dismissed_late_${userEmail}`, [userEmail]);
  const [isLateBannerDismissed, setIsLateBannerDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem(`schoolvan_dismissed_late_${userEmail}`) === 'true';
    } catch {
      return false;
    }
  });

  const handleDismissLateBanner = () => {
    setIsLateBannerDismissed(true);
    try {
      sessionStorage.setItem(bannerDismissKey, 'true');
    } catch (e) {
      // ignore
    }
  };

  // Real-time synchronization of drivers for the parent's students
  const [driversMap, setDriversMap] = useState<Record<string, Driver>>({});

  const driverIds = useMemo(() => {
    return Array.from(new Set(students.map(s => s.driverId).filter(Boolean)));
  }, [students]);

  useEffect(() => {
    if (driverIds.length === 0) return;
    const unsubs = driverIds.map(dId => {
      return onSnapshot(
        doc(db, 'drivers', dId), 
        (snap) => {
          if (snap.exists()) {
            setDriversMap(prev => ({
              ...prev,
              [dId]: { id: snap.id, ...snap.data() } as Driver
            }));
          }
        },
        (err) => {
          console.warn(`Snapshot listener warning for driver [${dId}]:`, err);
        }
      );
    });

    return () => {
      unsubs.forEach(unsub => unsub());
    };
  }, [driverIds]);

  const relevantIncidents = useMemo(() => {
    return allIncidents.filter(inc => 
      driverIds.includes(inc.driverId) || 
      (inc.targetStudentEmails && inc.targetStudentEmails.includes(userEmail))
    );
  }, [allIncidents, driverIds, userEmail]);

  const activeIncidents = useMemo(() => {
    return relevantIncidents.filter(inc => inc.status === 'active');
  }, [relevantIncidents]);

  const recentResolvedIncidents = useMemo(() => {
    return relevantIncidents.filter(inc => 
      inc.status === 'resolved' && 
      inc.resolvedAt && 
      (Date.now() - new Date(inc.resolvedAt).getTime() < 3 * 60 * 60 * 1000)
    );
  }, [relevantIncidents]);

  // Trigger push and sound when an active incident arrives
  useEffect(() => {
    activeIncidents.forEach(inc => {
      if (inc.id && !notifiedIncidentsRef.current.has(inc.id)) {
        notifiedIncidentsRef.current.add(inc.id);
        playIncidentAlertChime();
        showIncidentPushNotification(inc);
      }
    });
  }, [activeIncidents]);

  // Track and trigger real-time push notifications when student boarding status changes (in van, at school, at home, on the way)
  const previousStudentStatusesRef = useRef<Record<string, string>>({});
  const isInitialStudentLoadRef = useRef<boolean>(true);

  useEffect(() => {
    if (students.length === 0) return;

    if (isInitialStudentLoadRef.current) {
      students.forEach(s => {
        if (s.id) {
          previousStudentStatusesRef.current[s.id] = s.boardingStatus || 'Casa';
        }
      });
      isInitialStudentLoadRef.current = false;
      return;
    }

    students.forEach(s => {
      if (!s.id) return;
      const prevStatus = previousStudentStatusesRef.current[s.id];
      const currentStatus = s.boardingStatus || 'Casa';

      if (prevStatus && prevStatus !== currentStatus) {
        previousStudentStatusesRef.current[s.id] = currentStatus;

        // Fire native push notification + audio chime + vibration
        showStudentStatusPushNotification({
          studentName: s.name,
          status: currentStatus,
          schoolName: s.schoolName,
          studentId: s.id
        });

        const statusLabels: Record<string, string> = {
          'Van': 'acabou de embarcar na van escolar 🚌',
          'Escola': `foi entregue na escola ${s.schoolName ? `(${s.schoolName})` : ''} 🏫`,
          'Casa': 'chegou em casa com segurança 🏠',
          'A CAMINHO': 'a van está a caminho da sua residência! 🚐',
          'NÃO VAI': 'ausência confirmada para hoje 🚫'
        };

        toast(`🔔 ${s.name}: ${statusLabels[currentStatus] || `Status alterado para ${currentStatus}`}`, {
          icon: currentStatus === 'Escola' ? '🏫' : currentStatus === 'Van' ? '🚌' : '🚐',
          duration: 5000
        });
      } else {
        previousStudentStatusesRef.current[s.id] = currentStatus;
      }
    });
  }, [students]);

  // Track and trigger real-time push notification & chime when driver toggles payment status (Em Atraso / Em Dia)
  const previousPaymentStatusesRef = useRef<Record<string, string>>({});
  const isInitialPaymentLoadRef = useRef<boolean>(true);

  useEffect(() => {
    if (students.length === 0) return;

    if (isInitialPaymentLoadRef.current) {
      students.forEach(s => {
        if (s.id) {
          previousPaymentStatusesRef.current[s.id] = s.paymentStatus || 'Em Dia';
        }
      });
      isInitialPaymentLoadRef.current = false;
      return;
    }

    students.forEach(s => {
      if (!s.id) return;
      const prevPayment = previousPaymentStatusesRef.current[s.id];
      const currentPayment = s.paymentStatus || 'Em Dia';

      if (prevPayment && prevPayment !== currentPayment) {
        previousPaymentStatusesRef.current[s.id] = currentPayment;

        const driverObj = s.driverId ? driversMap[s.driverId] : null;

        // Fire native push notification + audio chime + vibration
        showPaymentPushNotification({
          studentName: s.name,
          status: currentPayment as 'Em Atraso' | 'Em Dia',
          value: s.value,
          paymentDay: s.paymentDay,
          driverName: driverObj?.name || 'Tio da Van',
          studentId: s.id
        });

        if (currentPayment === 'Em Atraso') {
          toast.error(`⚠️ Mensalidade de ${s.name} em aberto! Clique na aba "Mensalidades" para pagar via Pix ou enviar comprovante.`, {
            duration: 8000
          });
        } else {
          toast.success(`✓ Pagamento de ${s.name} registrado como "Em Dia" pelo motorista!`, {
            duration: 6000
          });
        }
      } else {
        previousPaymentStatusesRef.current[s.id] = currentPayment;
      }
    });
  }, [students, driversMap]);

  const handleEnablePush = async () => {
    const perm = await requestPushNotificationPermission();
    setPushStatus(perm);
    if (perm === 'granted') {
      playIncidentAlertChime();
      toast.success('🔔 Notificações push ativadas com sucesso neste aparelho!');
    } else if (perm === 'denied') {
      toast.error('Permissão de notificação negada no navegador.');
    }
  };

  const handleAcknowledgeIncident = async (incident: RouteIncident) => {
    if (!incident.id || !incident.driverId) return;
    try {
      await updateDoc(doc(db, 'drivers', incident.driverId, 'incidents', incident.id), {
        acknowledgedByParentEmails: arrayUnion(userEmail)
      });
      toast.success('Leitura confirmada! O motorista foi informado que você está ciente.');
    } catch (err: any) {
      console.error('Erro ao confirmar leitura:', err);
      toast.error('Erro ao registrar confirmação.');
    }
  };

  if (loading && students.length === 0) {
    return <div className="p-8 text-center font-bold text-gray-500">Carregando dados do aluno...</div>;
  }

  const todayStr = getTodayStr();

  const toggleAbsenceToday = async (student: Student) => {
    const driverId = student.driverId;
    if (!driverId || !student.id) {
      toast.error('Identificador do aluno ou do motorista não encontrado.');
      return;
    }
    const isCurrentlyAbsent = isStudentAbsentOnDate(student, todayStr);
    try {
      if (isCurrentlyAbsent) {
        await reintegrateStudentToRoute(driverId, student.id, student, todayStr, userEmail);
        toast.success('Aluno marcado como PRESENTE hoje!');
      } else {
        await markStudentAbsent(driverId, student.id, student, todayStr, 'Aviso de falta enviado pelo responsável', userEmail);
        toast.success('Aviso de AUSÊNCIA enviado ao motorista para HOJE!');
      }
    } catch (err: any) {
      console.error('Erro ao registrar ausência:', err);
      toast.error(err?.message ? `Erro ao registrar: ${err.message}` : 'Erro ao registrar alteração de ausência.');
    }
  };

  const handleScheduleAbsence = async (student: Student) => {
    const selectedDate = scheduleDates[student.id];
    const reasonText = reasons[student.id] || 'Sem motivo informado';

    if (!selectedDate) {
      toast.error('Por favor, selecione uma data para agendar a falta.');
      return;
    }

    const driverId = student.driverId;
    if (!driverId || !student.id) {
      toast.error('Erro ao identificar o motorista/aluno.');
      return;
    }

    setSubmittingId(student.id);

    try {
      const currentDates = student.absenceDates || [];
      if (currentDates.includes(selectedDate)) {
        toast.error('Falta já agendada para este dia.');
        setSubmittingId(null);
        return;
      }

      await markStudentAbsent(
        driverId, 
        student.id, 
        student, 
        selectedDate, 
        `Falta programada: ${reasonText}`,
        userEmail
      );

      toast.success(`Falta agendada com sucesso para ${formatDateBR(selectedDate)}!`);

      // Clear input state
      setScheduleDates(prev => ({ ...prev, [student.id]: '' }));
      setReasons(prev => ({ ...prev, [student.id]: '' }));
    } catch (err: any) {
      console.error('Erro ao agendar falta:', err);
      toast.error(err?.message ? `Erro ao agendar: ${err.message}` : 'Erro ao agendar falta.');
    } finally {
      setSubmittingId(null);
    }
  };

  const handleRemoveScheduledAbsence = async (student: Student, dateToRemove: string) => {
    const driverId = student.driverId;
    if (!driverId || !student.id) return;

    try {
      await reintegrateStudentToRoute(driverId, student.id, student, dateToRemove, userEmail);
      toast.success(`Falta do dia ${formatDateBR(dateToRemove)} cancelada.`);
    } catch (err: any) {
      console.error('Erro ao cancelar falta:', err);
      toast.error(err?.message ? `Erro ao cancelar: ${err.message}` : 'Erro ao cancelar falta agendada.');
    }
  };

  const contactDriver = (student: Student, customMsg?: string) => {
    const driverObj = student.driverId ? driversMap[student.driverId] : null;
    const phone = driverObj?.phone?.replace(/\D/g, '') || '';
    const msg = customMsg || `Olá ${driverObj?.name || 'Tio(a)'}! Sou o responsável do(a) ${student.name}. Gostaria de falar sobre o transporte escolar.`;
    
    if (phone) {
      const formatted = phone.length <= 11 ? `55${phone}` : phone;
      window.open(`https://wa.me/${formatted}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  const lateStudents = students.filter(s => s.paymentStatus === 'Em Atraso');

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <span className="bg-yellow-400 text-gray-900 text-xs font-black px-3 py-1 rounded-full uppercase">
            Área da Família
          </span>
          <h2 className="text-3xl font-extrabold text-gray-900 mt-1">Área do Responsável</h2>
        </div>

        {/* Tab Navigation Switches & Notification Center */}
        <div className="flex items-center gap-2">
          {/* Notification Center Trigger Bell */}
          <button
            type="button"
            onClick={() => setIsNotifCenterOpen(true)}
            className="p-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200/80 text-gray-800 transition-all cursor-pointer relative flex items-center justify-center"
            title="Central de Notificações"
          >
            <Bell size={18} />
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white font-black text-[10px] flex items-center justify-center animate-pulse border-2 border-white shadow-xs">
                {unreadNotifCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-1.5 bg-gray-100 p-1.5 rounded-2xl">
            <button
              type="button"
              onClick={() => setParentTab('routes')}
              className={cn(
                "px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5",
                parentTab === 'routes'
                  ? "bg-white text-gray-950 shadow-sm"
                  : "text-gray-600 hover:text-gray-950"
              )}
            >
              <Bus size={15} />
              <span>Rotas</span>
            </button>

            <button
              type="button"
              onClick={() => setParentTab('finance')}
              className={cn(
                "px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 relative",
                parentTab === 'finance'
                  ? "bg-white text-gray-950 shadow-sm"
                  : "text-gray-600 hover:text-gray-950"
              )}
            >
              <Wallet size={15} />
              <span>Mensalidades</span>
              {lateStudents.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ⚠️ LATE PAYMENT NOTICE BANNER (Visible on both tabs, dismissible until next login) */}
      {lateStudents.length > 0 && !isLateBannerDismissed && (
        <div className="p-5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white rounded-[32px] shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white text-red-600 flex items-center justify-center font-black shrink-0 shadow-md">
              <AlertTriangle size={26} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full inline-block mb-1">
                Lembrete de Cobrança
              </span>
              <h4 className="font-extrabold text-white text-base">
                Mensalidade de {lateStudents.map(s => s.name).join(', ')} em aberto
              </h4>
              <p className="text-xs text-white/90">
                O pagamento referente a este mês consta pendente. Acesse a aba de mensalidades para pagar via Pix e enviar o comprovante.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setParentTab('finance')}
              className="flex-1 sm:flex-initial px-5 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
            >
              <Wallet size={16} />
              <span>Ver Mensalidade & Pagar Pix</span>
            </button>

            <button
              type="button"
              onClick={handleDismissLateBanner}
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all cursor-pointer flex items-center justify-center shrink-0"
              title="Fechar aviso nesta sessão (reaparece no próximo login)"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Tab 1: ROUTES & BOARDING VIEW */}
      {parentTab === 'routes' && (
        <div className="space-y-6 animate-fade-in">
          {/* 🔔 PUSH NOTIFICATION PERMISSION BANNER */}
          {isPushNotificationSupported() && pushStatus !== 'granted' && (
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-[32px] shadow-lg border border-blue-400/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-yellow-400 text-gray-950 flex items-center justify-center font-black shrink-0 shadow-md">
                  <BellRing size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black uppercase tracking-wider text-yellow-400">
                      Alertas em Tempo Real no Celular
                    </span>
                    <span className="text-[10px] bg-yellow-400/20 text-yellow-300 font-bold px-2 py-0.5 rounded-full">
                      Recomendado
                    </span>
                  </div>
                  <h4 className="font-extrabold text-white text-sm mt-0.5">
                    Ativar Notificações Push no Aparelho
                  </h4>
                  <p className="text-xs text-gray-300">
                    Receba avisos instantâneos com som na tela quando a van estiver próxima ou houver cobranças/imprevistos.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleEnablePush}
                className="w-full sm:w-auto px-5 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
              >
                <Smartphone size={16} />
                <span>Ativar Notificações Push</span>
              </button>
            </div>
          )}

          {/* 🚨 LIVE ACTIVE INCIDENTS BROADCAST DISPLAY FOR PARENTS */}
          {activeIncidents.length > 0 && (
            <div className="space-y-4 animate-fade-in">
              {activeIncidents.map(incident => {
                const isAcknowledged = incident.acknowledgedByParentEmails?.includes(userEmail);
                const isEmergencia = incident.incidentType === 'emergencia';

                return (
                  <div 
                    key={incident.id}
                    className={`p-6 rounded-[36px] shadow-2xl border-2 transition-all space-y-4 ${
                      isEmergencia
                        ? 'bg-gradient-to-br from-red-900 via-rose-900 to-red-950 text-white border-red-500 ring-4 ring-red-500/30 animate-pulse'
                        : 'bg-gradient-to-br from-amber-500/15 via-yellow-500/10 to-amber-500/5 text-gray-950 border-yellow-400 ring-4 ring-yellow-400/20'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 border-current/10">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shrink-0 shadow-lg ${
                          isEmergencia ? 'bg-white text-red-700' : 'bg-yellow-400 text-gray-950'
                        }`}>
                          <AlertTriangle size={26} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                              isEmergencia ? 'bg-red-500 text-white' : 'bg-yellow-400 text-gray-950'
                            }`}>
                              <Radio size={12} className="animate-pulse" /> Comunicado de Rota em Tempo Real
                            </span>
                            {incident.estimatedDelay && (
                              <span className="text-xs font-black bg-black/10 dark:bg-white/10 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <Clock size={12} /> Previsão: +{incident.estimatedDelay} min
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl font-black mt-1">
                            {incident.title}
                          </h3>
                        </div>
                      </div>

                      <div className="text-xs font-semibold opacity-80 text-right shrink-0">
                        Enviado às {new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {/* Message Body */}
                    <div className="p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-current/10 text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-line text-gray-900 shadow-sm">
                      {incident.message}
                    </div>

                    {/* Action Row */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                      <div className="flex items-center gap-2">
                        {isAcknowledged ? (
                          <span className="px-4 py-2.5 bg-emerald-100 text-emerald-800 rounded-2xl font-black text-xs flex items-center gap-2 shadow-xs border border-emerald-300">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            <span>Você confirmou leitura deste comunicado</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAcknowledgeIncident(incident)}
                            className="px-5 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                          >
                            <CheckCircle2 size={16} />
                            <span>✓ Confirmar Leitura / Estou Ciente</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {students.length > 0 && (
                          <button
                            type="button"
                            onClick={() => contactDriver(students[0], `Olá! Recebi o comunicado de imprevisto (${incident.title}) sobre a rota.`)}
                            className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                          >
                            <Phone size={14} />
                            <span>Falar com o Motorista</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ✅ RECENTLY RESOLVED INCIDENTS BANNER */}
          {activeIncidents.length === 0 && recentResolvedIncidents.length > 0 && (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-[28px] shadow-sm flex items-center gap-3 text-emerald-900 animate-fade-in">
              <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800">
                  Rota Normalizada & Sem Imprevistos
                </h4>
                <p className="text-xs text-emerald-700">
                  {recentResolvedIncidents[0].resolvedMessage || 'O imprevisto anterior foi totalmente resolvido pelo motorista e a van segue a rota com segurança.'}
                </p>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-8">
            {students.map(student => {
              const isAbsentToday = isStudentAbsentOnDate(student, todayStr);
              const status = isAbsentToday ? 'NÃO VAI' : (student.boardingStatus || 'Casa');
              const scheduledList = student.scheduledAbsences || [];
              
              return (
                <div key={student.id} className="space-y-6">
                  {/* Status Header Banner */}
                  <div className={cn(
                    "p-8 rounded-[40px] shadow-xl text-center transition-all",
                    status === 'A CAMINHO' ? "bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 text-white animate-pulse" :
                    status === 'Van' ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-gray-950" :
                    status === 'Escola' ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white" :
                    isAbsentToday || status === 'NÃO VAI' ? "bg-gradient-to-br from-gray-600 to-gray-800 text-white" :
                    "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                  )}>
                     <Bus size={48} className="mx-auto mb-4 animate-bounce-short" />
                     <h2 className="text-3xl font-black mb-2 uppercase tracking-wide">
                       {isAbsentToday ? 'AUSENTE HOJE' : status === 'A CAMINHO' ? '🚐 A VAN É A PRÓXIMA!' : status}
                     </h2>
                     <p className="font-bold text-sm opacity-90">
                       {isAbsentToday ? 'Aviso de ausência registrado! O aluno não participará da rota de hoje.' :
                        status === 'A CAMINHO' ? '🔔 O passageiro anterior embarcou! A van está a caminho da sua residência agora. Prepare seu filho(a).' :
                        status === 'Van' ? 'Em trânsito na Van Escolar' : 
                        status === 'Escola' ? 'Entregue com segurança na Escola' :
                        'Em casa / Aguardando embarque'}
                     </p>
                  </div>
                  
                  <div className="bg-white p-6 rounded-[36px] shadow-sm border border-gray-100 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
                      <div>
                        <h3 className="text-2xl font-black text-gray-900">{student.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <School size={16} className="text-yellow-500 shrink-0" />
                          <span>{student.schoolName || 'Escola não informada'}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        Última att: {student.lastCheck ? new Date(student.lastCheck).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                      </div>
                    </div>
                    
                    {/* Immediate Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={() => contactDriver(student)}
                        className="flex-1 min-w-[140px] py-3 bg-green-500 text-white font-extrabold rounded-2xl shadow-md hover:bg-green-600 transition-all cursor-pointer active:scale-95 text-xs flex items-center justify-center gap-1.5"
                      >
                        Falar no WhatsApp
                      </button>
                      <button 
                        className={cn(
                          "flex-1 min-w-[140px] py-3 font-extrabold rounded-2xl transition-all cursor-pointer active:scale-95 text-xs border",
                          isAbsentToday 
                            ? "bg-yellow-400 text-gray-900 border-yellow-400 hover:bg-yellow-300 shadow-md" 
                            : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                        )}
                        onClick={() => toggleAbsenceToday(student)}
                      >
                        {isAbsentToday ? '✓ Vai hoje' : '✕ Não vai HOJE'}
                      </button>
                    </div>

                    {/* Schedule Absence Block */}
                    <div className="bg-gradient-to-br from-amber-50/60 to-yellow-50/60 p-5 rounded-3xl border border-amber-200 space-y-4">
                      <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm">
                        <CalendarX size={20} className="text-amber-600" />
                        <span>Agendar Falta Futura</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Programe ausências futuras (ex: consultas médicas, viagens). O motorista receberá o aviso antecipadamente e o aluno será removido da rota no dia agendado.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-extrabold text-gray-600 uppercase mb-1">Data da Falta</label>
                          <input 
                            type="date"
                            min={todayStr}
                            value={scheduleDates[student.id] || ''}
                            onChange={(e) => setScheduleDates({ ...scheduleDates, [student.id]: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-yellow-400"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-extrabold text-gray-600 uppercase mb-1">Motivo (Opcional)</label>
                          <select 
                            value={reasons[student.id] || ''}
                            onChange={(e) => setReasons({ ...reasons, [student.id]: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-yellow-400"
                          >
                            <option value="">Selecione um motivo...</option>
                            <option value="Consulta médica">Consulta Médica / Exames</option>
                            <option value="Viagem">Viagem Familiar</option>
                            <option value="Doença / Indisposto">Doença / Indisposto</option>
                            <option value="Compromisso pessoal">Compromisso Pessoal</option>
                            <option value="Outro">Outro Motivo</option>
                          </select>
                        </div>
                      </div>

                      <button
                        disabled={submittingId === student.id}
                        onClick={() => handleScheduleAbsence(student)}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Calendar size={16} />
                        {submittingId === student.id ? 'Agendando...' : 'Confirmar Agendamento de Falta'}
                      </button>
                    </div>

                    {/* List of Scheduled Absences */}
                    {scheduledList.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
                          <Calendar size={14} /> Faltas Futuras Agendadas ({scheduledList.length})
                        </h4>
                        <div className="space-y-2">
                          {scheduledList.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs">
                              <div>
                                <div className="font-extrabold text-gray-900 text-sm">
                                  {formatDateBR(item.date)}
                                  {item.date === todayStr && <span className="ml-2 text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-black">HOJE</span>}
                                </div>
                                <div className="text-gray-500 text-xs">{item.reason || 'Sem motivo especificado'}</div>
                              </div>

                              <button
                                onClick={() => handleRemoveScheduledAbsence(student, item.date)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer"
                                title="Cancelar esta falta agendada"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {students.length === 0 && (
              <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-gray-100 text-gray-400 space-y-2">
                <Users size={40} className="mx-auto opacity-30" />
                <p className="font-bold text-gray-600">Nenhum aluno vinculado ao e-mail ({user?.email})</p>
                <p className="text-xs text-gray-400">Solicite ao seu motorista que cadastre este mesmo e-mail no perfil do aluno.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: FINANCE & PAYMENT TIMELINE VIEW */}
      {parentTab === 'finance' && (
        <ParentFinanceView students={students} driversMap={driversMap} />
      )}

      {/* 🔔 NOTIFICATION CENTER MODAL */}
      <NotificationCenterModal
        isOpen={isNotifCenterOpen}
        onClose={() => setIsNotifCenterOpen(false)}
        userEmail={userEmail}
        onNavigateTab={(tab) => {
          if (tab === 'finance') setParentTab('finance');
          if (tab === 'routes') setParentTab('routes');
        }}
      />
    </div>
  );
};
