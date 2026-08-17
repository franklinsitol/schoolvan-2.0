import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bus, 
  Users, 
  MapPinned, 
  Wallet, 
  Settings, 
  LifeBuoy, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  Plus,
  Search,
  ClipboardCheck,
  Bell,
  ShieldCheck,
  ShieldAlert,
  School,
  Calendar,
  CalendarX,
  Trash2
} from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { usePWAShellIntegration } from './hooks/usePWAShellIntegration';
import { cn } from './lib/utils';
import { useFirestore, useCollectionGroup } from './hooks/useFirestore';
import { Student, Vehicle, Driver } from './types';
import { 
  isStudentAbsentOnDate, 
  getTodayStr, 
  formatDateBR, 
  markStudentAbsent, 
  reintegrateStudentToRoute 
} from './lib/absence';
import { playBusHornSound, speakTioIAPrompt } from './lib/sound';
import { checkCanAddStudent } from './lib/plans';

import { auth, db } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { where, doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { SchoolVanLogo } from './components/SchoolVanLogo';
import { ErrorBoundary } from './components/ErrorBoundary';
import toast from 'react-hot-toast';
import { AuthModal } from './components/AuthModal';
import { Marketplace } from './components/Marketplace';
import { Dashboard } from './components/Dashboard';
import { VehiclesView } from './components/VehiclesView';
import { TeamView } from './components/TeamView';
import { FinanceView } from './components/FinanceView';
import { ProfileView } from './components/ProfileView';
import { SupportView } from './components/SupportView';
import { RoutesView } from './components/RoutesView';
import { CheckinModal } from './components/CheckinModal';
import { StudentModal } from './components/StudentModal';
import { VehicleModal } from './components/VehicleModal';
import { SuperAdminView } from './components/SuperAdminView';
import { LeadsView } from './components/LeadsView';
import { PWAPrompt } from './components/PWAPrompt';
import { OnboardingWizard } from './components/OnboardingWizard';
import { UpgradeTriggerModal } from './components/UpgradeTriggerModal';
import { SubscriptionModal } from './components/SubscriptionModal';
import { AICSMSupportAssistantModal } from './components/AICSMSupportAssistantModal';
import { TioIAFloatingDockWidget } from './components/TioIAFloatingDockWidget';
import { Lead } from './types';
import { Sparkles, Bot, Zap, Compass, Phone, MessageSquare, Building2, HelpCircle, Lock, Headphones, Calculator } from 'lucide-react';

// Views
const ParentView = () => {
  const { user } = useAuth();
  const userEmail = (user?.email || '').trim();

  const constraints = React.useMemo(() => {
    if (!userEmail) return [];
    return [where('parentEmail', '==', userEmail)];
  }, [userEmail]);

  const { data: students, loading } = useCollectionGroup<Student>(
    userEmail ? 'students' : '',
    constraints
  );

  const [scheduleDates, setScheduleDates] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

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
    const msg = customMsg || `Olá Tio/Tia da Van! Sou o responsável do(a) ${student.name}. Gostaria de confirmar informações sobre o transporte escolar.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <span className="bg-yellow-400 text-gray-900 text-xs font-black px-3 py-1 rounded-full uppercase">
            Acompanhamento em Tempo Real
          </span>
          <h2 className="text-3xl font-extrabold text-gray-900 mt-1">Área do Responsável</h2>
        </div>
        <button 
          onClick={() => signOut(auth)}
          className="text-sm font-bold text-gray-500 hover:text-red-500 cursor-pointer px-4 py-2 hover:bg-gray-100 rounded-xl transition-all"
        >
          Sair
        </button>
      </div>
      
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
  );
};
const Students = ({ onOpenUpgradeModal }: { onOpenUpgradeModal?: (reason: string) => void }) => {
  const { profile } = useAuth();
  const { data: students, loading } = useFirestore<Student>(`drivers/${profile?.id}/students`);
  const { data: vehicles } = useFirestore<Vehicle>(`drivers/${profile?.id}/vehicles`);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  if (loading) return <div className="p-8 text-center">Carregando...</div>;

  const userPlan = profile?.plan || 'Gratuito';

  const handleEdit = (student: Student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    const allowed = checkCanAddStudent(profile, students.length, onOpenUpgradeModal);
    if (!allowed) return;

    setSelectedStudent(null);
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900">Alunos</h2>
        <button 
          onClick={handleAdd}
          className="bg-gray-900 text-yellow-400 px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-gray-800 transition-all"
        >
          <Plus size={20} /> Novo Aluno
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Escola</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Horários</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Assento (Van)</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {students.map((student) => {
                const van = vehicles.find(v => v.id === student.vehicleId);
                return (
                  <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{student.name}</div>
                      {isStudentAbsentOnDate(student) && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 uppercase mt-0.5">
                          Ausente Hoje
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{student.schoolName || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {student.entryTime || '--:--'} / {student.exitTime || '--:--'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {student.seat || '-'} ({van?.name || '-'})
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleEdit(student)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Settings size={18} className="text-gray-400" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {students.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-gray-400">
                    Nenhum aluno cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StudentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        driverId={profile?.id || ''}
        vehicles={vehicles}
        student={selectedStudent}
        onOpenUpgradeModal={onOpenUpgradeModal}
      />
    </div>
  );
};

type View = 'market' | 'dash' | 'leads' | 'students' | 'routes' | 'vehicles' | 'team' | 'finance' | 'profile' | 'support' | 'parent' | 'superadmin';

export default function App() {
  const { user, profile, loading } = useAuth();
  const { triggerShellLogout } = usePWAShellIntegration();
  const [currentView, setCurrentView] = useState<View>('market');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [aicsmMode, setAicsmMode] = useState<'chat' | 'onboarding'>('chat');
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<'Pro' | 'Frota'>('Pro');
  const [subscriptionStep, setSubscriptionStep] = useState<'select' | 'pix' | 'contract'>('select');
  const [upgradeReason, setUpgradeReason] = useState('limit_students');
  const [isAICSMOpen, setIsAICSMOpen] = useState(false);
  const [triggerNewVehicleModal, setTriggerNewVehicleModal] = useState(false);
  const [isLandingMobileMenuOpen, setIsLandingMobileMenuOpen] = useState(false);
  const [authModal, setAuthModal] = useState<{ open: boolean; type: 'driver' | 'parent' }>({ open: false, type: 'driver' });
  const [impersonatedDriver, setImpersonatedDriver] = useState<Driver | null>(null);

  const handleLandingNav = (section: string) => {
    setIsLandingMobileMenuOpen(false);
    if (currentView !== 'market') {
      setCurrentView('market');
    }
    // Dispatch custom event to trigger smooth scroll in Marketplace component
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('schoolvan_nav', { detail: { section } }));
    }, 50);
  };

  const activeProfile = impersonatedDriver || profile;

  const { data: students } = useFirestore<Student>(activeProfile?.id ? `drivers/${activeProfile.id}/students` : '');
  const { data: vehicles } = useFirestore<Vehicle>(activeProfile?.id ? `drivers/${activeProfile.id}/vehicles` : '');
  const { data: leads } = useFirestore<Lead>(activeProfile?.id ? `drivers/${activeProfile.id}/leads` : '');

  // Calculate onboarding status
  const activeStudentsCount = students.filter(s => s.status !== 'Excluido').length;
  const isOnboardingCompleted = Boolean(
    activeProfile?.name && 
    activeProfile?.phone && 
    activeProfile?.pixKey && 
    vehicles.length > 0 && 
    activeStudentsCount > 0
  );

  useEffect(() => {
    if (window.location.pathname.includes('/cora')) {
      toast.success('Página de Redirecionamento da API Cora identificada!', { duration: 5000 });
    }
  }, []);

  // Auto-open onboarding for new driver if profile needs setup directly with Tio IA
  useEffect(() => {
    if (user && profile?.role === 'admin' && (!profile.pixKey || !profile.phone || students.length === 0)) {
      const hasSeenTour = localStorage.getItem(`onboarding_seen_${user.uid}`);
      if (!hasSeenTour) {
        setAicsmMode('onboarding');
        setIsAICSMOpen(true);
        localStorage.setItem(`onboarding_seen_${user.uid}`, 'true');
      }
    }
  }, [user, profile, students.length]);

  const isSuperAdmin = user?.email === 'franklin.toledo@gmail.com' || profile?.role === 'superadmin';
  const isParent = profile?.role === 'parent';

  // Strict role-based navigation & guard
  useEffect(() => {
    if (!user) {
      if (currentView !== 'market') {
        setCurrentView('market');
      }
      return;
    }

    if (isParent) {
      // Parents can ONLY access 'parent' or 'support'
      if (currentView !== 'parent' && currentView !== 'support') {
        setCurrentView('parent');
      }
    } else {
      // Drivers / Admins / Superadmins
      if (currentView === 'market') {
        setCurrentView('dash');
      }
    }
  }, [user, profile?.role, isParent, currentView]);

  useEffect(() => {
    if (user && authModal.open) {
      setAuthModal(prev => ({ ...prev, open: false }));
    }
  }, [user, authModal.open]);

  const handleLogout = async () => {
    setImpersonatedDriver(null);
    triggerShellLogout();
    await signOut(auth);
    setCurrentView('market');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50">
        <div className="w-16 h-16 bg-yellow-400/20 rounded-2xl flex items-center justify-center mb-3 animate-pulse">
          <SchoolVanLogo size={42} />
        </div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          SchoolVan
        </h1>
        <p className="text-gray-500 text-xs font-bold mt-1">Carregando transporte escolar...</p>
      </div>
    );
  }

  const isDriverFreePlan = !profile?.plan || profile.plan === 'Gratuito';
  const driverPlanName = profile?.plan || 'Gratuito';

  const navItems = isParent ? [
    { id: 'parent', label: 'Área dos Pais', icon: Users },
    { id: 'support', label: 'Suporte & Ajuda', icon: LifeBuoy, className: 'text-yellow-600 font-bold' }
  ] : [
    { id: 'dash', label: 'Painel Geral', icon: Bus },
    { id: 'leads', label: 'Pedidos de Vagas', icon: ClipboardCheck, className: 'text-yellow-700 font-black bg-yellow-50/80 hover:bg-yellow-100' },
    { id: 'students', label: 'Passageiros', icon: Users },
    { id: 'routes', label: 'Rotas & GPS', icon: MapPinned },
    { id: 'vehicles', label: 'Minha Frota', icon: Bus },
    { id: 'team', label: 'Colaboradores', icon: ShieldCheck },
    { id: 'finance', label: 'Mensalidades & Pix', icon: Wallet },
    { id: 'parent', label: 'Visão dos Pais', icon: Users, className: 'text-indigo-600 font-bold bg-indigo-50/50 hover:bg-indigo-100' },
    { id: 'profile', label: 'Meu Perfil & Pix', icon: Settings },
    { id: 'support', label: 'Suporte', icon: LifeBuoy, className: 'text-yellow-600 font-bold' },
    ...(isSuperAdmin ? [{ id: 'superadmin', label: 'Super Admin', icon: ShieldAlert, className: 'text-red-600 font-black bg-red-50' }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Toaster position="top-right" />

      {/* LGPD Impersonation Banner */}
      {impersonatedDriver && (
        <div className="bg-purple-900 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md border-b border-purple-700 z-50 sticky top-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-yellow-400 shrink-0" size={18} />
            <span>
              <strong>MODO SUPORTE LGPD ATIVO:</strong> Acessando como <strong>{impersonatedDriver.name}</strong> ({impersonatedDriver.email}).
              <span className="opacity-80 ml-2 hidden md:inline font-normal">Acesso auditado para suporte técnico.</span>
            </span>
          </div>
          <button
            onClick={() => {
              setImpersonatedDriver(null);
              setCurrentView('superadmin');
              toast.success('Modo suporte finalizado. Retornando ao Super Admin.');
            }}
            className="px-3 py-1 bg-yellow-400 text-purple-950 font-black rounded-lg text-xs hover:bg-yellow-300 transition-all cursor-pointer shrink-0 shadow-sm"
          >
            SAIR DO MODO SUPORTE
          </button>
        </div>
      )}

      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* User authenticated sidebar toggle */}
          {user && (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg lg:hidden"
            >
              <Menu size={22} />
            </button>
          )}

          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer shrink-0 group"
            onClick={() => {
              if (user) {
                setCurrentView(isParent ? 'parent' : 'dash');
              } else {
                setCurrentView('market');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            <SchoolVanLogo size={32} />
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl font-black tracking-tight text-gray-950 flex items-center">
                School<span className="text-yellow-500">Van</span>
              </span>
              {!user && (
                <span className="hidden xl:inline text-[9px] text-gray-400 font-bold uppercase tracking-wider -mt-1">
                  Gestão Inteligente
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 🌐 DESKTOP INSTITUTIONAL MENU (When visitor is on landing page) */}
        {!user && (
          <div className="hidden lg:flex items-center gap-6 text-xs font-bold text-gray-600">
            <button
              onClick={() => handleLandingNav('about')}
              className="hover:text-gray-950 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Building2 size={15} className="text-gray-400" />
              <span>Sobre</span>
            </button>

            <button
              onClick={() => handleLandingNav('features')}
              className="hover:text-gray-950 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles size={15} className="text-gray-400" />
              <span>Recursos & T.IA</span>
            </button>

            <button
              onClick={() => handleLandingNav('pricing')}
              className="hover:text-gray-950 transition-colors cursor-pointer flex items-center gap-1.5 text-yellow-600 font-black bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-200"
            >
              <Zap size={14} className="text-yellow-500 fill-yellow-500" />
              <span>Planos & Preços</span>
            </button>

            <button
              onClick={() => handleLandingNav('calc')}
              className="hover:text-gray-950 transition-colors cursor-pointer flex items-center gap-1.5 text-emerald-700"
            >
              <Calculator size={15} className="text-emerald-500" />
              <span>Calculadora</span>
            </button>

            <button
              onClick={() => handleLandingNav('faq')}
              className="hover:text-gray-950 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <HelpCircle size={15} className="text-gray-400" />
              <span>FAQ</span>
            </button>

            <button
              onClick={() => handleLandingNav('contact')}
              className="hover:text-gray-950 transition-colors cursor-pointer flex items-center gap-1.5 text-blue-600"
            >
              <Headphones size={15} className="text-blue-500" />
              <span>Atendimento</span>
            </button>
          </div>
        )}

        {/* Right CTA Actions & Mobile Hamburger */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {!user ? (
            <>
              <button 
                onClick={() => setAuthModal({ open: true, type: 'driver' })}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-950 hover:bg-gray-800 text-yellow-400 rounded-full font-black text-xs sm:text-sm transition-all whitespace-nowrap shadow-sm hover:shadow active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Zap size={14} className="fill-yellow-400" />
                <span>MOTORISTA</span>
              </button>

              <button 
                onClick={() => setAuthModal({ open: true, type: 'parent' })}
                className="px-3 sm:px-4 py-1.5 sm:py-2 border-2 border-gray-900 text-gray-900 rounded-full font-black text-xs sm:text-sm hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
              >
                RESPONSÁVEL
              </button>

              {/* 🍔 Mobile Landing Hamburger Toggle */}
              <button
                onClick={() => setIsLandingMobileMenuOpen(!isLandingMobileMenuOpen)}
                className="lg:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                aria-label="Abrir Menu de Navegação"
              >
                {isLandingMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              {profile?.role === 'admin' && (
                <>
                  {!isOnboardingCompleted && (
                    <button
                      onClick={() => {
                        setAicsmMode('onboarding');
                        setIsAICSMOpen(true);
                      }}
                      className="px-3 py-1.5 bg-yellow-100 dark:bg-yellow-950 text-gray-950 dark:text-yellow-400 hover:bg-yellow-200 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-yellow-400/40 animate-pulse"
                      title="Completar Onboarding com o Tio IA"
                    >
                      <Compass size={15} className="text-yellow-600 dark:text-yellow-400" />
                      <span className="hidden sm:inline">Onboarding Pendente</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setSubscriptionStep('select');
                      setIsSubscriptionModalOpen(true);
                    }}
                    className={cn(
                      "px-3 sm:px-3.5 py-1.5 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95 border",
                      isDriverFreePlan
                        ? "bg-yellow-400 text-gray-950 hover:bg-yellow-300 border-yellow-500 shadow-yellow-500/10"
                        : "bg-gray-950 text-yellow-400 hover:bg-gray-800 border-yellow-400/30"
                    )}
                    title="Ver meu plano, faturas e opções de contratação SchoolVan"
                  >
                    <Zap size={14} className={isDriverFreePlan ? "fill-gray-950" : "fill-yellow-400"} />
                    <span className="hidden sm:inline">
                      {isDriverFreePlan ? `Plano Gratuito (${students.length}/25) • Upgrade` : `Plano ${driverPlanName} • Em Dia`}
                    </span>
                    <span className="inline sm:hidden">
                      {isDriverFreePlan ? `Upgrade (${students.length}/25)` : driverPlanName}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse hidden sm:inline-block ml-0.5" />
                  </button>

                  <a
                    href="https://wa.me/5511947078453?text=Ol%C3%A1%20SchoolVan%21%20Preciso%20de%20ajuda."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
                    title="Suporte SchoolVan no WhatsApp: (11) 94707-8453"
                  >
                    <Phone size={14} />
                    <span className="hidden lg:inline">Zap SchoolVan</span>
                  </a>
                </>
              )}

              <span className="hidden md:block font-bold text-sm text-gray-800">{profile?.name || user.displayName || user.email}</span>
              <button 
                onClick={handleLogout}
                className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                title="Sair da Conta"
              >
                <LogOut size={20} />
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* 📱 MOBILE HAMBURGER SLIDE DRAWER FOR VISITORS */}
      <AnimatePresence>
        {!user && isLandingMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-b border-gray-200 shadow-xl overflow-hidden z-30 sticky top-14"
          >
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs font-black">
                <button
                  onClick={() => handleLandingNav('pricing')}
                  className="p-3 bg-yellow-400 text-gray-950 rounded-2xl flex items-center gap-2 font-black shadow-sm"
                >
                  <Zap size={16} className="fill-gray-950" />
                  <span>Planos & Preços</span>
                </button>

                <button
                  onClick={() => handleLandingNav('calc')}
                  className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl flex items-center gap-2 font-black"
                >
                  <Calculator size={16} />
                  <span>Calculadora</span>
                </button>
              </div>

              <div className="space-y-1 pt-2 border-t border-gray-100">
                <button
                  onClick={() => handleLandingNav('about')}
                  className="w-full p-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl flex items-center justify-between"
                >
                  <span className="flex items-center gap-2.5">
                    <Building2 size={16} className="text-gray-400" />
                    Sobre o SchoolVan
                  </span>
                  <ChevronRight size={16} className="text-gray-300" />
                </button>

                <button
                  onClick={() => handleLandingNav('features')}
                  className="w-full p-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl flex items-center justify-between"
                >
                  <span className="flex items-center gap-2.5">
                    <Sparkles size={16} className="text-yellow-500" />
                    Módulos & Copiloto T.IA
                  </span>
                  <ChevronRight size={16} className="text-gray-300" />
                </button>

                <button
                  onClick={() => handleLandingNav('security')}
                  className="w-full p-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl flex items-center justify-between"
                >
                  <span className="flex items-center gap-2.5">
                    <Lock size={16} className="text-emerald-500" />
                    Segurança & LGPD
                  </span>
                  <ChevronRight size={16} className="text-gray-300" />
                </button>

                <button
                  onClick={() => handleLandingNav('faq')}
                  className="w-full p-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl flex items-center justify-between"
                >
                  <span className="flex items-center gap-2.5">
                    <HelpCircle size={16} className="text-gray-400" />
                    Dúvidas Frequentes (FAQ)
                  </span>
                  <ChevronRight size={16} className="text-gray-300" />
                </button>

                <button
                  onClick={() => handleLandingNav('contact')}
                  className="w-full p-2.5 text-left text-sm font-bold text-gray-700 hover:bg-gray-50 rounded-xl flex items-center justify-between"
                >
                  <span className="flex items-center gap-2.5">
                    <Headphones size={16} className="text-blue-500" />
                    Central de Atendimento
                  </span>
                  <ChevronRight size={16} className="text-gray-300" />
                </button>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Servidores 99.98% Online
                </span>
                <a
                  href="https://wa.me/5511947078453?text=Ol%C3%A1%20SchoolVan%21"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 font-bold flex items-center gap-1"
                >
                  <MessageSquare size={13} />
                  WhatsApp
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthModal 
        isOpen={authModal.open} 
        onClose={() => setAuthModal({ ...authModal, open: false })} 
        type={authModal.type} 
      />

      <div className="flex">
        {/* Sidebar (Desktop) */}
        {user && (
          <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 min-h-[calc(100vh-64px)] p-4 sticky top-16 justify-between">
            <div className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as View)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer",
                    currentView === item.id 
                      ? "bg-yellow-400 text-gray-900 font-bold shadow-md" 
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900",
                    item.className
                  )}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* 🚐 Plan & Quota Desktop Sidebar Widget */}
            {!isParent && (
              <div className="pt-4 mt-6 border-t border-gray-100">
                <div className={cn(
                  "p-3.5 rounded-2xl border space-y-2.5",
                  isDriverFreePlan 
                    ? "bg-gradient-to-br from-amber-50 to-yellow-50/70 border-amber-200" 
                    : "bg-gradient-to-br from-emerald-50 to-teal-50/70 border-emerald-200"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-black text-gray-950 uppercase tracking-tight">
                        Plano {driverPlanName}
                      </span>
                    </div>
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-white text-gray-800 shadow-xs border border-gray-100">
                      {isDriverFreePlan ? `${students.length}/25 alunos` : 'Ilimitado'}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setSubscriptionStep('select');
                      setIsSubscriptionModalOpen(true);
                    }}
                    className={cn(
                      "w-full py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer active:scale-95",
                      isDriverFreePlan
                        ? "bg-gray-950 hover:bg-gray-800 text-yellow-400 border border-yellow-400/30"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white"
                    )}
                  >
                    <Zap size={13} className={isDriverFreePlan ? "fill-yellow-400" : "fill-white"} />
                    <span>{isDriverFreePlan ? 'Conhecer Plano Pro' : 'Ver Faturas & Plano'}</span>
                  </button>
                </div>
              </div>
            )}
          </aside>
        )}

        {/* Mobile Sidebar (Drawer) */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black/50 z-50 lg:hidden"
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-72 bg-white z-50 lg:hidden flex flex-col justify-between"
              >
                <div>
                  <div className="p-6 bg-yellow-400 flex items-center justify-between">
                    <span className="text-xl font-bold">Menu</span>
                    <button onClick={() => setIsSidebarOpen(false)}>
                      <X size={24} />
                    </button>
                  </div>
                  <div className="p-4 overflow-y-auto space-y-1">
                    {navItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setCurrentView(item.id as View);
                          setIsSidebarOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all cursor-pointer",
                          currentView === item.id 
                            ? "bg-yellow-400 text-gray-900 font-bold" 
                            : "text-gray-500 hover:bg-gray-50",
                          item.className
                        )}
                      >
                        <item.icon size={20} />
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 🚐 Plan & Quota Mobile Drawer Widget */}
                {!isParent && (
                  <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                    <div className={cn(
                      "p-3 rounded-2xl border space-y-2",
                      isDriverFreePlan 
                        ? "bg-gradient-to-br from-amber-50 to-yellow-50/70 border-amber-200" 
                        : "bg-gradient-to-br from-emerald-50 to-teal-50/70 border-emerald-200"
                    )}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-950">
                          Plano {driverPlanName}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-gray-800 shadow-xs">
                          {isDriverFreePlan ? `${students.length}/25 alunos` : 'Ilimitado'}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setIsSidebarOpen(false);
                          setSubscriptionStep('select');
                          setIsSubscriptionModalOpen(true);
                        }}
                        className={cn(
                          "w-full py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer",
                          isDriverFreePlan
                            ? "bg-gray-950 hover:bg-gray-800 text-yellow-400"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        )}
                      >
                        <Zap size={13} className={isDriverFreePlan ? "fill-yellow-400" : "fill-white"} />
                        <span>{isDriverFreePlan ? 'Conhecer Plano Pro' : 'Ver Faturas'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-4 pb-32 sm:pb-28">
          <ErrorBoundary>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {currentView === 'market' && (
                  <Marketplace onOpenAuth={(type) => setAuthModal({ open: true, type: type || 'driver' })} />
                )}
                {currentView === 'dash' && (
                  isParent ? <ParentView /> : (
                    <Dashboard 
                      onNavigateToLeads={() => setCurrentView('leads')}
                      onOpenSubscriptionModal={() => {
                        setSubscriptionStep('select');
                        setIsSubscriptionModalOpen(true);
                      }}
                    />
                  )
                )}
                {currentView === 'leads' && (
                  isParent ? <ParentView /> : (
                    <LeadsView 
                      onOpenUpgradeModal={(reason) => { 
                        setUpgradeReason(reason); 
                        setIsUpgradeModalOpen(true); 
                      }} 
                    />
                  )
                )}
                {currentView === 'students' && (
                  isParent ? <ParentView /> : (
                    <Students 
                      onOpenUpgradeModal={(reason) => { 
                        setUpgradeReason(reason); 
                        setIsUpgradeModalOpen(true); 
                      }} 
                    />
                  )
                )}
                {currentView === 'routes' && (isParent ? <ParentView /> : <RoutesView />)}
                {currentView === 'vehicles' && (
                  isParent ? <ParentView /> : (
                    <VehiclesView 
                      onOpenUpgradeModal={(reason) => { 
                        setUpgradeReason(reason); 
                        setIsUpgradeModalOpen(true); 
                      }} 
                      triggerNewVehicle={triggerNewVehicleModal}
                      onNewVehicleHandled={() => setTriggerNewVehicleModal(false)}
                    />
                  )
                )}
                {currentView === 'team' && (
                  isParent ? <ParentView /> : (
                    <TeamView 
                      onOpenUpgradeModal={(reason) => { 
                        setUpgradeReason(reason); 
                        setIsUpgradeModalOpen(true); 
                      }} 
                    />
                  )
                )}
                {currentView === 'finance' && (isParent ? <ParentView /> : <FinanceView onNavigateToProfile={() => setCurrentView('profile')} />)}
                {currentView === 'profile' && (
                  isParent ? <ParentView /> : (
                    <ProfileView 
                      onOpenSubscriptionModal={() => {
                        setSubscriptionStep('select');
                        setIsSubscriptionModalOpen(true);
                      }} 
                    />
                  )
                )}
                {currentView === 'support' && <SupportView />}
                {currentView === 'parent' && <ParentView />}
                {currentView === 'superadmin' && isSuperAdmin && (
                  <SuperAdminView 
                    onImpersonate={(driver) => { 
                      setImpersonatedDriver(driver); 
                      setCurrentView('dash'); 
                    }} 
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>

      <PWAPrompt />

      {/* Ergonomic Floating Bottom Command Dock & Tio IA Notification Bubble */}
      {user && profile?.role === 'admin' && (
        <TioIAFloatingDockWidget 
          profile={activeProfile}
          students={students}
          vehicles={vehicles}
          leads={leads}
          onOpenTioIA={(mode) => {
            setAicsmMode(mode || 'chat');
            setIsAICSMOpen(true);
          }}
          onOpenCheckin={() => setIsCheckinOpen(true)}
        />
      )}

      <CheckinModal 
        isOpen={isCheckinOpen} 
        onClose={() => setIsCheckinOpen(false)} 
        students={students} 
        driverId={activeProfile?.id || ''} 
      />

      <UpgradeTriggerModal 
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        reason={upgradeReason}
        studentCount={students.length}
        onOpenContractModal={(plan) => {
          setSubscriptionPlan(plan);
          setSubscriptionStep('contract');
          setIsSubscriptionModalOpen(true);
        }}
        onOpenPixCheckout={(plan) => {
          setSubscriptionPlan(plan);
          setSubscriptionStep('pix');
          setIsSubscriptionModalOpen(true);
        }}
        onConfirmAutoAdd={() => {
          setIsUpgradeModalOpen(false);
          setCurrentView('vehicles');
          setTriggerNewVehicleModal(true);
        }}
      />

      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        defaultPlan={subscriptionPlan}
        initialStep={subscriptionStep}
      />

      <AICSMSupportAssistantModal 
        isOpen={isAICSMOpen}
        initialMode={aicsmMode}
        onClose={() => setIsAICSMOpen(false)}
        onOpenCheckin={() => setIsCheckinOpen(true)}
        onOpenStudentModal={() => setCurrentView('students')}
        onNavigateTab={(tab) => setCurrentView(tab as View)}
        onOpenUpgradeModal={(reason) => {
          setIsAICSMOpen(false);
          setUpgradeReason(reason || 'limit_students');
          setIsUpgradeModalOpen(true);
        }}
      />
    </div>
  );
}
