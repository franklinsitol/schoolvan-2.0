import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  Bus, 
  Wallet, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  Settings, 
  MessageSquare, 
  Bell, 
  Save, 
  Search,
  Filter,
  Lock,
  Unlock,
  CreditCard,
  Building,
  TrendingUp,
  Phone,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, doc, updateDoc, getDoc, setDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Driver, Ticket, AdminConfig } from '../types';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

export function SuperAdminView() {
  const [activeTab, setActiveTab] = useState<'drivers' | 'tickets' | 'config'>('drivers');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [config, setConfig] = useState<AdminConfig>({
    pixAdmin: 'pix@schoolvan.com.br',
    defaultPrice: 150,
    proPrice: 79,
    frotaPrice: 149,
    freeStudentLimit: 25,
    proStudentLimit: 60,
    graceDaysAllowed: 3,
    supportEmails: 'suporte@schoolvan.com.br',
    onboardTitle: 'Bem-vindo ao SchoolVan!',
    onboardMsg: 'Sua plataforma completa de gestão de transporte escolar.',
    popupActive: false,
    popupMsg: '',
    termsText: 'Termos de uso do sistema...',
    lgpdText: 'Política de privacidade LGPD...'
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'Ativo' | 'Bloqueado'>('todos');
  const [savingConfig, setSavingConfig] = useState(false);
  const isInitialTicketsRef = useRef(true);

  // Auto-request Notification permission for Super Admin PWA
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Load Drivers & Realtime Support Tickets
  useEffect(() => {
    const unsubDrivers = onSnapshot(collection(db, 'drivers'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver));
      setDrivers(docs);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching drivers:", err);
      setLoading(false);
    });

    const unsubTickets = onSnapshot(query(collection(db, 'tickets')), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));

      // Trigger Web Push Notification if a NEW ticket arrives in real-time
      if (!isInitialTicketsRef.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const newTicket = change.doc.data() as Ticket;
            toast.success(`🔔 NOVO CHAMADO: ${newTicket.name} - ${newTicket.subject}`, {
              duration: 8000,
              icon: '📩'
            });

            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification('🔔 SchoolVan SuperAdmin: Novo Chamado!', {
                  body: `${newTicket.name} (${newTicket.profile}): ${newTicket.subject}`,
                  icon: '/icon.png',
                  badge: '/icon.png'
                });
              } catch (e) {
                console.error("Notification trigger error", e);
              }
            }
          }
        });
      } else {
        isInitialTicketsRef.current = false;
      }

      setTickets(docs);
    }, (err) => {
      console.error("Error fetching tickets:", err);
    });

    // Load Admin Config
    const loadConfig = async () => {
      try {
        const configDoc = await getDoc(doc(db, 'adminConfig', 'main'));
        if (configDoc.exists()) {
          setConfig(configDoc.data() as AdminConfig);
        }
      } catch (e) {
        console.error("Error loading config:", e);
      }
    };

    loadConfig();

    return () => {
      unsubDrivers();
      unsubTickets();
    };
  }, []);

  const handleToggleDriverStatus = async (driver: Driver) => {
    const newStatus = driver.status === 'Ativo' ? 'Bloqueado' : 'Ativo';
    try {
      await updateDoc(doc(db, 'drivers', driver.id), { status: newStatus });
      toast.success(`Motorista ${driver.name} alterado para ${newStatus}`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao alterar status do motorista");
    }
  };

  const handleToggleRole = async (driver: Driver) => {
    const newRole = driver.role === 'superadmin' ? 'admin' : 'superadmin';
    try {
      await updateDoc(doc(db, 'drivers', driver.id), { role: newRole });
      toast.success(`Permissão de ${driver.name} alterada para ${newRole.toUpperCase()}`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao alterar permissão");
    }
  };

  const handleSetPlan = async (driver: Driver, newPlan: 'Gratuito' | 'Pro' | 'Frota') => {
    try {
      await updateDoc(doc(db, 'drivers', driver.id), { plan: newPlan });
      toast.success(`Plano de ${driver.name} alterado para ${newPlan}`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao alterar plano");
    }
  };

  const handleGrantPromise = async (driver: Driver) => {
    const now = new Date();
    now.setDate(now.getDate() + (config.graceDaysAllowed || 3));
    const promiseIso = now.toISOString();

    try {
      await updateDoc(doc(db, 'drivers', driver.id), { 
        paymentPromiseUntil: promiseIso,
        status: 'Ativo',
        invoiceStatus: 'Aguardando Pagamento'
      });
      toast.success(`Concedido prazo de 3 dias para ${driver.name}`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao conceder promessa de pagamento");
    }
  };

  const handleApprovePaymentProof = async (driver: Driver) => {
    try {
      await updateDoc(doc(db, 'drivers', driver.id), {
        invoiceStatus: 'Em Dia',
        status: 'Ativo',
        paymentProofNotes: null
      });
      toast.success(`Pagamento de ${driver.name} APROVADO! Conta ativada e fatura em dia.`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao aprovar pagamento");
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: Ticket['status']) => {
    try {
      await updateDoc(doc(db, 'tickets', ticketId), { status: newStatus });
      toast.success(`Chamado atualizado para ${newStatus}`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao atualizar chamado");
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      await setDoc(doc(db, 'adminConfig', 'main'), config, { merge: true });
      toast.success("Configurações globais salvas com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSavingConfig(false);
    }
  };

  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = (d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (d.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (d.city || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = drivers.reduce((acc, d) => acc + (d.pricePerStudent || 150), 0);
  const activeCount = drivers.filter(d => d.status === 'Ativo').length;
  const blockedCount = drivers.filter(d => d.status === 'Bloqueado').length;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-black text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-400 text-gray-900 text-xs font-black uppercase tracking-wider mb-3">
              <ShieldAlert size={14} /> Painel Super Admin
            </div>
            <h1 className="text-3xl md:text-4xl font-black">Gestão Geral do SaaS</h1>
            <p className="text-gray-400 mt-1">Controle de motoristas, licenças, avisos globais e suporte do SchoolVan.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('drivers')}
              className={cn(
                "px-5 py-2.5 rounded-2xl text-sm font-bold transition-all",
                activeTab === 'drivers' ? "bg-yellow-400 text-gray-900 shadow-lg" : "bg-white/10 text-white hover:bg-white/20"
              )}
            >
              Motoristas ({drivers.length})
            </button>
            <button
              onClick={() => setActiveTab('tickets')}
              className={cn(
                "px-5 py-2.5 rounded-2xl text-sm font-bold transition-all relative",
                activeTab === 'tickets' ? "bg-yellow-400 text-gray-900 shadow-lg" : "bg-white/10 text-white hover:bg-white/20"
              )}
            >
              Chamados ({tickets.filter(t => t.status === 'Aberto').length})
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={cn(
                "px-5 py-2.5 rounded-2xl text-sm font-bold transition-all",
                activeTab === 'config' ? "bg-yellow-400 text-gray-900 shadow-lg" : "bg-white/10 text-white hover:bg-white/20"
              )}
            >
              Configurações
            </button>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Motoristas</div>
            <div className="text-2xl font-black text-gray-900">{drivers.length}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contas Ativas</div>
            <div className="text-2xl font-black text-gray-900">{activeCount}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
            <AlertCircle size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bloqueados</div>
            <div className="text-2xl font-black text-gray-900">{blockedCount}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <MessageSquare size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tickets Abertos</div>
            <div className="text-2xl font-black text-gray-900">{tickets.filter(t => t.status === 'Aberto').length}</div>
          </div>
        </div>
      </div>

      {/* TAB 1: DRIVERS MANAGEMENT */}
      {activeTab === 'drivers' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar motorista por nome, e-mail ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400 text-sm"
              />
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Filter size={18} className="text-gray-400 shrink-0" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none text-sm font-bold text-gray-700"
              >
                <option value="todos">Todos os Status</option>
                <option value="Ativo">Apenas Ativos</option>
                <option value="Bloqueado">Apenas Bloqueados</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Motorista / E-mail</th>
                    <th className="px-6 py-4">Cargo</th>
                    <th className="px-6 py-4">Plano Escolhido</th>
                    <th className="px-6 py-4">Promessa / Status Fatura</th>
                    <th className="px-6 py-4">Status Conta</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-sm">
                  {filteredDrivers.map((driver) => {
                    const isBlocked = driver.status === 'Bloqueado';
                    const isSuper = driver.role === 'superadmin' || driver.email === 'franklin.toledo@gmail.com';
                    const currentPlan = driver.plan || 'Gratuito';
                    const isLate = driver.invoiceStatus === 'Em Atraso';
                    const promiseActive = driver.paymentPromiseUntil && new Date(driver.paymentPromiseUntil) > new Date();

                    return (
                      <tr key={driver.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{driver.name || 'Sem nome'}</span>
                            {isSuper && (
                              <span className="bg-purple-100 text-purple-800 text-[10px] font-black px-2 py-0.5 rounded-full">SUPER ADMIN</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{driver.email}</div>
                          {driver.phone && <div className="text-[11px] text-gray-400">Tel: {driver.phone}</div>}
                        </td>

                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleRole(driver)}
                            disabled={driver.email === 'franklin.toledo@gmail.com'}
                            className={cn(
                              "px-3 py-1 rounded-full text-xs font-bold transition-all border",
                              isSuper
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                            )}
                          >
                            {isSuper ? 'Super Admin' : 'Motorista'}
                          </button>
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <select
                              value={currentPlan}
                              onChange={(e) => handleSetPlan(driver, e.target.value as any)}
                              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
                            >
                              <option value="Gratuito">Gratuito (Até 25 Alunos)</option>
                              <option value="Pro">Pro (R$79 / Até 60 Alunos)</option>
                              <option value="Frota">Frota (R$149 / Ilimitado)</option>
                            </select>

                            {driver.discountPercent && (
                              <div className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                                Desconto {driver.discountPercent}% ({driver.discountType === 'temporary' ? '3 Meses' : 'Definitivo'})
                              </div>
                            )}

                            {driver.cancellationReason && (
                              <div className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                                Cancelou: {driver.cancellationReason}
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="space-y-1.5">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[11px] font-bold border inline-flex items-center gap-1",
                              isLate ? "bg-red-50 text-red-600 border-red-200" : "bg-green-50 text-green-700 border-green-200"
                            )}>
                              {isLate ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
                              {driver.invoiceStatus || 'Em Dia'}
                            </span>

                            {driver.paymentProofNotes && (
                              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded-xl text-[10px] space-y-1">
                                <div className="font-bold text-yellow-900">Comprovante Pix Enviado:</div>
                                <div className="text-gray-700 font-mono line-clamp-2">{driver.paymentProofNotes}</div>
                                <button
                                  onClick={() => handleApprovePaymentProof(driver)}
                                  className="w-full py-1 bg-green-600 text-white font-bold rounded-lg text-[10px] hover:bg-green-700 transition-colors"
                                >
                                  ✓ Aprovar Pix & Liberar Fatura
                                </button>
                              </div>
                            )}

                            {promiseActive ? (
                              <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                                Promessa até {new Date(driver.paymentPromiseUntil!).toLocaleDateString('pt-BR')}
                              </div>
                            ) : (
                              <button
                                onClick={() => handleGrantPromise(driver)}
                                className="block text-[10px] font-bold text-yellow-700 hover:underline"
                              >
                                + Conceder 3 Dias Grace
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold border inline-flex items-center gap-1",
                            isBlocked 
                              ? "bg-red-100 text-red-800 border-red-200" 
                              : "bg-green-100 text-green-800 border-green-200"
                          )}>
                            {isBlocked ? <Lock size={12} /> : <Unlock size={12} />}
                            {driver.status || 'Ativo'}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleToggleDriverStatus(driver)}
                            className={cn(
                              "px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm",
                              isBlocked 
                                ? "bg-green-600 text-white hover:bg-green-700" 
                                : "bg-red-500 text-white hover:bg-red-600"
                            )}
                          >
                            {isBlocked ? 'Desbloquear' : 'Bloquear'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredDrivers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                        Nenhum motorista encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUPPORT TICKETS */}
      {activeTab === 'tickets' && (
        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="text-yellow-500" /> Chamados de Suporte ({tickets.length})
            </h2>

            <button
              onClick={() => {
                if ('Notification' in window) {
                  Notification.requestPermission().then((permission) => {
                    if (permission === 'granted') {
                      toast.success('Notificações PWA ativadas para novos chamados!');
                    } else {
                      toast.error('Permissão de notificação negada no navegador.');
                    }
                  });
                }
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl flex items-center gap-2 transition-all self-start md:self-auto"
            >
              <Bell size={14} className="text-yellow-600" /> Ativar Notificações PWA / Desktop
            </button>
          </div>

          <div className="space-y-4">
            {tickets.map((t) => {
              const cleanPhone = t.contact?.replace(/\D/g, '') || '';
              const formattedPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
              const waText = encodeURIComponent(`Olá ${t.name}, sou do suporte do SchoolVan! Vi seu chamado de assunto "${t.subject}": "${t.message}". Como posso te ajudar?`);

              return (
                <div key={t.id} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-900">{t.name}</span>
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2.5 py-0.5 rounded-full font-bold">
                        {t.profile}
                      </span>
                      <span className="text-xs text-gray-400">{t.dateTime || 'Recente'}</span>
                    </div>
                    <div className="text-sm font-bold text-gray-700">{t.subject}</div>
                    <p className="text-xs text-gray-500">{t.message}</p>
                    <div className="text-[11px] text-gray-400 font-mono">Contato: {t.contact}</div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={cleanPhone.length >= 8 ? `https://wa.me/${formattedPhone}?text=${waText}` : `https://wa.me/?text=${waText}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Phone size={14} /> Atender no WhatsApp
                    </a>

                    <select
                      value={t.status}
                      onChange={(e) => handleUpdateTicketStatus(t.id, e.target.value as any)}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold outline-none shadow-sm"
                    >
                      <option value="Aberto">Aberto</option>
                      <option value="Em Andamento">Em Andamento</option>
                      <option value="Fechado">Fechado</option>
                    </select>
                  </div>
                </div>
              );
            })}

            {tickets.length === 0 && (
              <div className="text-center py-16 text-gray-400 text-sm">
                Nenhum chamado de suporte aberto.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: GLOBAL CONFIG */}
      {activeTab === 'config' && (
        <form onSubmit={handleSaveConfig} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-8">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Settings className="text-yellow-500" /> Configurações Globais do SaaS
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Chave Pix do Super Admin (Para Cobrança dos Motoristas)</label>
              <input
                type="text"
                value={config.pixAdmin || ''}
                onChange={(e) => setConfig({ ...config, pixAdmin: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400 text-sm font-bold text-gray-800"
                placeholder="Ex: pix@schoolvan.com.br"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Dias de Tolerância / Grace Period (Promessa)</label>
              <input
                type="number"
                value={config.graceDaysAllowed || 3}
                onChange={(e) => setConfig({ ...config, graceDaysAllowed: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400 text-sm font-bold text-gray-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Preço Plano Pro (R$ / mês)</label>
              <input
                type="number"
                value={config.proPrice || 79}
                onChange={(e) => setConfig({ ...config, proPrice: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400 text-sm font-bold text-gray-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Preço Plano Frota (R$ / mês)</label>
              <input
                type="number"
                value={config.frotaPrice || 149}
                onChange={(e) => setConfig({ ...config, frotaPrice: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400 text-sm font-bold text-gray-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Limite Alunos - Plano Gratuito</label>
              <input
                type="number"
                value={config.freeStudentLimit || 25}
                onChange={(e) => setConfig({ ...config, freeStudentLimit: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400 text-sm font-bold text-gray-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Limite Alunos - Plano Pro</label>
              <input
                type="number"
                value={config.proStudentLimit || 60}
                onChange={(e) => setConfig({ ...config, proStudentLimit: Number(e.target.value) })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400 text-sm font-bold text-gray-800"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Aviso Pop-Up Global (Para todos os motoristas)</label>
              <div className="flex items-center gap-3 mb-2">
                <input
                  type="checkbox"
                  id="popupActive"
                  checked={config.popupActive || false}
                  onChange={(e) => setConfig({ ...config, popupActive: e.target.checked })}
                  className="w-5 h-5 accent-yellow-400 rounded cursor-pointer"
                />
                <label htmlFor="popupActive" className="text-sm font-bold text-gray-700 cursor-pointer">
                  Ativar Pop-up Global de Alerta
                </label>
              </div>
              <textarea
                rows={3}
                value={config.popupMsg || ''}
                onChange={(e) => setConfig({ ...config, popupMsg: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400 text-sm resize-none"
                placeholder="Digite a mensagem de alerta global..."
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Termos de Uso do Sistema</label>
              <textarea
                rows={4}
                value={config.termsText || ''}
                onChange={(e) => setConfig({ ...config, termsText: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400 text-sm resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={savingConfig}
            className="w-full py-4 bg-gray-900 text-yellow-400 font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {savingConfig ? (
              <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save size={20} /> SALVAR CONFIGURAÇÕES DO SAAS
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
