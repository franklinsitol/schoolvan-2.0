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

import { auth } from './lib/firebase';
import { signOut } from 'firebase/auth';
import { where } from 'firebase/firestore';
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
  
  if (loading) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900">Área do Responsável</h2>
        <button 
          onClick={() => signOut(auth)}
          className="text-sm font-bold text-gray-500 hover:text-red-500"
        >
          Sair
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {students.map(student => {
          const status = student.boardingStatus || 'Casa';
          const isApath = status === 'A CAMINHO';
          
          return (
            <div key={student.id} className="space-y-6">
              <div className={cn(
                "p-8 rounded-[40px] shadow-xl text-center transition-all",
                status === 'Van' ? "bg-gradient-to-br from-yellow-400 to-yellow-500 text-gray-900" :
                status === 'Escola' ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white" :
                status === 'NÃO VAI' ? "bg-gradient-to-br from-gray-400 to-gray-500 text-white" :
                "bg-gradient-to-br from-red-500 to-red-600 text-white"
              )}>
                 <Bus size={48} className="mx-auto mb-4" />
                 <h2 className="text-4xl font-black mb-2 uppercase">{status}</h2>
                 <p className="font-bold opacity-80">
                   {status === 'Van' ? 'A caminho' : 
                    status === 'Escola' ? 'Na escola' :
                    status === 'Casa' ? 'Em casa' : 'Ausente hoje'}
                 </p>
              </div>
              
              <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold mb-4">{student.name}</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-gray-600">
                    <School size={20} className="text-yellow-500" />
                    <span>{student.schoolName || 'Escola não informada'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-600">
                    <Users size={20} className="text-yellow-500" />
                    <span>Último check: {student.lastCheck ? new Date(student.lastCheck).toLocaleTimeString() : '--:--'}</span>
                  </div>
                </div>
                
                <div className="mt-8 flex gap-3">
                  <button className="flex-1 py-3 bg-green-500 text-white font-bold rounded-2xl shadow-lg hover:bg-green-600 transition-all active:scale-95">
                    WhatsApp
                  </button>
                  <button 
                    className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
                    onClick={() => {/* Report absence */}}
                  >
                    {student.ausenteHoje ? 'Vai hoje' : 'Não vai hoje'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {students.length === 0 && (
          <div className="col-span-full text-center py-20 text-gray-400">
            Nenhum aluno vinculado ao seu e-mail.
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

  const { data: students } = useFirestore<Student>(`drivers/${profile?.id}/students`);

  useEffect(() => {
    if (user && currentView === 'market') {
      if (profile?.role === 'admin') {
        setCurrentView('dash');
      } else {
        setCurrentView('dash'); // Default for now
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

  const navItems = [
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
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {user && (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg lg:hidden"
            >
              <Menu size={24} />
            </button>
          )}
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setCurrentView(user ? 'dash' : 'market')}
          >
            <Bus className="text-yellow-400" size={28} />
            <span className="text-xl font-extrabold tracking-tight">SchoolVan</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!user ? (
            <>
              <button 
                onClick={() => setAuthModal({ open: true, type: 'driver' })}
                className="px-4 py-2 bg-gray-900 text-yellow-400 rounded-full font-bold text-sm hover:bg-gray-800 transition-colors"
              >
                MOTORISTA
              </button>
              <button 
                onClick={() => setAuthModal({ open: true, type: 'parent' })}
                className="px-4 py-2 border-2 border-gray-900 text-gray-900 rounded-full font-bold text-sm hover:bg-gray-50 transition-colors"
              >
                RESPONSÁVEL
              </button>
            </>
          ) : (
            <div className="flex items-center gap-4">
              <span className="hidden md:block font-bold text-sm">{profile?.name || user.displayName || user.email}</span>
              <button 
                onClick={handleLogout}
                className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
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
