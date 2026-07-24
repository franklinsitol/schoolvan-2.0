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
  School
} from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { cn } from './lib/utils';
import { useFirestore, useCollectionGroup } from './hooks/useFirestore';
import { Student, Vehicle } from './types';

import { auth, db } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { where, doc, updateDoc } from 'firebase/firestore';
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
import { CSAssistant } from './components/CSAssistant';
import { PWAPrompt } from './components/PWAPrompt';

// Views
const ParentView = () => {
  const { user } = useAuth();
  const { data: students, loading } = useCollectionGroup<Student>('students', [
    where('parentEmail', '==', user?.email)
  ]);
  
  if (loading) return <div className="p-8 text-center font-bold text-gray-500">Carregando dados do aluno...</div>;

  const toggleAbsence = async (student: Student) => {
    if (!student.driverId || !student.id) {
      toast.error('Identificador do aluno não encontrado.');
      return;
    }
    try {
      const studentRef = doc(db, 'drivers', student.driverId, 'students', student.id);
      await updateDoc(studentRef, {
        ausenteHoje: !student.ausenteHoje,
        lastCheck: new Date().toISOString()
      });
      toast.success(student.ausenteHoje ? 'Aluno marcado como PRESENTE hoje!' : 'Aviso de AUSÊNCIA enviado ao motorista!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao registrar alteração de ausência.');
    }
  };

  const contactDriver = (student: Student) => {
    const msg = `Olá Tio/Tia da Van! Sou o responsável do(a) ${student.name}. Gostaria de confirmar informações sobre o transporte de hoje.`;
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {students.map(student => {
          const status = student.boardingStatus || (student.ausenteHoje ? 'NÃO VAI' : 'Casa');
          
          return (
            <div key={student.id} className="space-y-6">
              <div className={cn(
                "p-8 rounded-[40px] shadow-xl text-center transition-all",
                status === 'Van' ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-gray-950" :
                status === 'Escola' ? "bg-gradient-to-br from-blue-500 to-indigo-600 text-white" :
                student.ausenteHoje || status === 'NÃO VAI' ? "bg-gradient-to-br from-gray-500 to-gray-700 text-white" :
                "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
              )}>
                 <Bus size={48} className="mx-auto mb-4 animate-bounce-short" />
                 <h2 className="text-3xl font-black mb-2 uppercase tracking-wide">
                   {student.ausenteHoje ? 'AUSENTE HOJE' : status}
                 </h2>
                 <p className="font-bold text-sm opacity-90">
                   {student.ausenteHoje ? 'Aviso de ausência enviado ao motorista' :
                    status === 'Van' ? 'Em trânsito na Van Escolar' : 
                    status === 'Escola' ? 'Entregue com segurança na Escola' :
                    'Em casa / Aguardando embarque'}
                 </p>
              </div>
              
              <div className="bg-white p-6 rounded-[36px] shadow-sm border border-gray-100 space-y-4">
                <h3 className="text-xl font-black text-gray-900">{student.name}</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 text-gray-600">
                    <School size={18} className="text-yellow-500 shrink-0" />
                    <span>{student.schoolName || 'Escola não informada'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Users size={18} className="text-yellow-500 shrink-0" />
                    <span>Último Status: {student.lastCheck ? new Date(student.lastCheck).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                  </div>
                </div>
                
                <div className="mt-6 flex gap-3 pt-2">
                  <button 
                    onClick={() => contactDriver(student)}
                    className="flex-1 py-3 bg-green-500 text-white font-extrabold rounded-2xl shadow-md hover:bg-green-600 transition-all cursor-pointer active:scale-95 text-xs flex items-center justify-center gap-1.5"
                  >
                    Falar no WhatsApp
                  </button>
                  <button 
                    className={cn(
                      "flex-1 py-3 font-extrabold rounded-2xl transition-all cursor-pointer active:scale-95 text-xs",
                      student.ausenteHoje 
                        ? "bg-yellow-400 text-gray-900 hover:bg-yellow-300 shadow-md" 
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    )}
                    onClick={() => toggleAbsence(student)}
                  >
                    {student.ausenteHoje ? '✓ Vai hoje' : '✕ Não vai hoje'}
                  </button>
                </div>
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
const Students = () => {
  const { profile } = useAuth();
  const { data: students, loading } = useFirestore<Student>(`drivers/${profile?.id}/students`);
  const { data: vehicles } = useFirestore<Vehicle>(`drivers/${profile?.id}/vehicles`);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  if (loading) return <div className="p-8 text-center">Carregando...</div>;

  const handleEdit = (student: Student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
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
                      {student.ausenteHoje && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          Ausente
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
      />
    </div>
  );
};

type View = 'market' | 'dash' | 'students' | 'routes' | 'vehicles' | 'team' | 'finance' | 'profile' | 'support' | 'parent' | 'superadmin';

export default function App() {
  const { user, profile, loading } = useAuth();
  const [currentView, setCurrentView] = useState<View>('market');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [authModal, setAuthModal] = useState<{ open: boolean; type: 'driver' | 'parent' }>({ open: false, type: 'driver' });

  const { data: students } = useFirestore<Student>(profile?.id ? `drivers/${profile.id}/students` : '');

  useEffect(() => {
    if (user && currentView === 'market') {
      if (profile?.role === 'parent') {
        setCurrentView('parent');
      } else {
        setCurrentView('dash');
      }
    } else if (!user && currentView !== 'market') {
      setCurrentView('market');
    }
  }, [user, profile]);

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentView('market');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-50">
        <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bus className="text-yellow-400" /> SchoolVan
        </h1>
        <p className="text-gray-500 mt-2">Carregando...</p>
      </div>
    );
  }

  const isSuperAdmin = user?.email === 'franklin.toledo@gmail.com' || profile?.role === 'superadmin';
  const isParent = profile?.role === 'parent';

  const navItems = isParent ? [
    { id: 'parent', label: 'Área do Aluno', icon: Users },
    { id: 'support', label: 'Ajuda & Suporte', icon: LifeBuoy, className: 'text-yellow-600 font-bold' }
  ] : [
    { id: 'dash', label: 'Início', icon: Bus },
    { id: 'students', label: 'Alunos', icon: Users },
    { id: 'routes', label: 'Rotas', icon: MapPinned },
    { id: 'vehicles', label: 'Frota', icon: Bus },
    { id: 'team', label: 'Minha Equipe', icon: ShieldCheck },
    { id: 'finance', label: 'Financeiro', icon: Wallet },
    { id: 'profile', label: 'Perfil', icon: Settings },
    { id: 'support', label: 'Ajuda & Suporte', icon: LifeBuoy, className: 'text-yellow-600 font-bold' },
    ...(isSuperAdmin ? [{ id: 'superadmin', label: 'Super Admin', icon: ShieldAlert, className: 'text-red-600 font-black bg-red-50' }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Toaster position="top-right" />

      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-100 px-3 sm:px-6 py-3 flex items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {user && (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg lg:hidden"
            >
              <Menu size={22} />
            </button>
          )}
          <div 
            className="flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0"
            onClick={() => setCurrentView(user ? 'dash' : 'market')}
          >
            <Bus className="text-yellow-400 shrink-0" size={26} />
            <span className="text-lg sm:text-xl font-extrabold tracking-tight">SchoolVan</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {!user ? (
            <>
              <button 
                onClick={() => setAuthModal({ open: true, type: 'driver' })}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-gray-900 text-yellow-400 rounded-full font-extrabold text-[11px] sm:text-sm hover:bg-gray-800 transition-colors whitespace-nowrap shadow-sm cursor-pointer"
              >
                MOTORISTA
              </button>
              <button 
                onClick={() => setAuthModal({ open: true, type: 'parent' })}
                className="px-2.5 sm:px-4 py-1.5 sm:py-2 border-2 border-gray-900 text-gray-900 rounded-full font-extrabold text-[11px] sm:text-sm hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
              >
                RESPONSÁVEL
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="hidden md:block font-bold text-sm">{profile?.name || user.displayName || user.email}</span>
              <button 
                onClick={handleLogout}
                className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
              >
                <LogOut size={20} />
              </button>
            </div>
          )}
        </div>
      </nav>

      <AuthModal 
        isOpen={authModal.open} 
        onClose={() => setAuthModal({ ...authModal, open: false })} 
        type={authModal.type} 
      />

      <div className="flex">
        {/* Sidebar (Desktop) */}
        {user && (
          <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 min-h-[calc(100vh-64px)] p-4 sticky top-16">
            <div className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as View)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
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
                className="fixed inset-y-0 left-0 w-72 bg-white z-50 lg:hidden flex flex-col"
              >
                <div className="p-6 bg-yellow-400 flex items-center justify-between">
                  <span className="text-xl font-bold">Menu</span>
                  <button onClick={() => setIsSidebarOpen(false)}>
                    <X size={24} />
                  </button>
                </div>
                <div className="p-4 flex-1 overflow-y-auto space-y-1">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setCurrentView(item.id as View);
                        setIsSidebarOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-4 rounded-xl transition-all",
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
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-4">
          <ErrorBoundary>
            {user && profile?.role === 'admin' && <CSAssistant />}

            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {currentView === 'market' && <Marketplace onOpenAuth={() => setAuthModal({ open: true, type: 'driver' })} />}
                {currentView === 'dash' && <Dashboard />}
                {currentView === 'students' && <Students />}
                {currentView === 'routes' && <RoutesView />}
                {currentView === 'vehicles' && <VehiclesView />}
                {currentView === 'team' && <TeamView />}
                {currentView === 'finance' && <FinanceView />}
                {currentView === 'profile' && <ProfileView />}
                {currentView === 'support' && <SupportView />}
                {currentView === 'parent' && <ParentView />}
                {currentView === 'superadmin' && <SuperAdminView />}
              </motion.div>
            </AnimatePresence>
          </ErrorBoundary>
        </main>
      </div>

      <PWAPrompt />

      {/* FAB (Mobile Check-in) */}
      {user && profile?.role === 'admin' && (
        <button 
          className="fixed bottom-6 right-6 w-16 h-16 bg-gray-900 text-yellow-400 rounded-full shadow-2xl flex items-center justify-center z-40 hover:scale-110 transition-transform active:scale-95"
          onClick={() => setIsCheckinOpen(true)}
        >
          <ClipboardCheck size={28} />
        </button>
      )}

      <CheckinModal 
        isOpen={isCheckinOpen} 
        onClose={() => setIsCheckinOpen(false)} 
        students={students} 
        driverId={profile?.id || ''} 
      />
    </div>
  );
}
