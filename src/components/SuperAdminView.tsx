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
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  UserCheck,
  Clock,
  FileText,
  Award,
  RefreshCw,
  X
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, doc, updateDoc, getDoc, setDoc, getDocs, onSnapshot, query, orderBy } from 'firebase/firestore';
import { Driver, Ticket, AdminConfig } from '../types';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface SuperAdminViewProps {
  onImpersonate?: (driver: Driver) => void;
}

export function SuperAdminView({ onImpersonate }: SuperAdminViewProps = {}) {
  const [activeTab, setActiveTab] = useState<'drivers' | 'tickets' | 'gateway' | 'config'>('drivers');
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
    lgpdText: 'Política de privacidade LGPD...',
    paymentGatewayProvider: 'cora',
    coraClientId: 'app-hKTVJB2iqimj0uUNqAjSS',
    coraClientSecret: '9c8d3404-f99c-4a5a-8210-e856ba586eaa',
    coraEnvironment: 'stage',
    coraPlatformSplitFee: 1.50,
    coraAutoSync: true,
    asaasEnvironment: 'sandbox',
    asaasPlatformSplitFee: 1.50,
    asaasSplitType: 'FIXED',
    asaasAutoSync: true
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'Ativo' | 'Bloqueado'>('todos');
  const [invoiceFilter, setInvoiceFilter] = useState<'todos' | 'Em Dia' | 'Em Atraso' | 'Pendente'>('todos');
  const [marketplaceFilter, setMarketplaceFilter] = useState<'todos' | 'visivel' | 'oculto'>('todos');
  const [planFilter, setPlanFilter] = useState<'todos' | 'Gratuito' | 'Pro' | 'Frota'>('todos');
  const [verificationFilter, setVerificationFilter] = useState<'todos' | 'pending' | 'verified' | 'unverified'>('todos');
  const [viewingVerificationDriver, setViewingVerificationDriver] = useState<Driver | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [testingCora, setTestingCora] = useState(false);
  const [coraTestStatus, setCoraTestStatus] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [testingAsaas, setTestingAsaas] = useState(false);
  const [asaasTestStatus, setAsaasTestStatus] = useState<{ success: boolean; message: string; details?: any } | null>(null);
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
    const currentStatus = driver.status || 'Ativo';
    const newStatus = currentStatus === 'Ativo' ? 'Bloqueado' : 'Ativo';
    try {
      await setDoc(doc(db, 'drivers', driver.id), { status: newStatus }, { merge: true });
      toast.success(`Motorista ${driver.name || 'Motorista'} alterado para ${newStatus}`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao alterar status do motorista");
    }
  };

  const handleSetInvoiceStatus = async (driver: Driver, newInvoiceStatus: 'Em Dia' | 'Em Atraso' | 'Pendente') => {
    try {
      const payload: any = { invoiceStatus: newInvoiceStatus };
      if (newInvoiceStatus === 'Em Dia') {
        payload.status = 'Ativo';
        payload.paymentProofNotes = null;
      } else if (newInvoiceStatus === 'Em Atraso') {
        payload.status = 'Bloqueado';
      }
      await setDoc(doc(db, 'drivers', driver.id), payload, { merge: true });
      toast.success(`Fatura de ${driver.name || 'Motorista'} alterada para "${newInvoiceStatus}" em 1 clique!`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao alterar status de fatura");
    }
  };

  const handleToggleMarketplaceVisibility = async (driver: Driver) => {
    const isCurrentlyHidden = !!driver.hiddenInMarketplace;
    const newHiddenState = !isCurrentlyHidden;

    try {
      // Update driver record
      await setDoc(doc(db, 'drivers', driver.id), { hiddenInMarketplace: newHiddenState }, { merge: true });

      // Update vehicles under driver
      try {
        const vehiclesSnap = await getDocs(collection(db, `drivers/${driver.id}/vehicles`));
        vehiclesSnap.forEach((vDoc) => {
          updateDoc(vDoc.ref, { hiddenInMarketplace: newHiddenState });
        });
      } catch (vecErr) {
        console.warn('Erro ao atualizar veículos para ocultar marketplace:', vecErr);
      }

      toast.success(
        newHiddenState 
          ? `Motorista ${driver.name} OCULTO do Marketplace!` 
          : `Motorista ${driver.name} VISÍVEL no Marketplace!`
      );
    } catch (e) {
      console.error(e);
      toast.error("Erro ao alterar visibilidade no marketplace");
    }
  };

  const handleResetPassword = async (driver: Driver) => {
    if (!driver.email) {
      toast.error("Motorista não possui e-mail cadastrado.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, driver.email);
      toast.success(`E-mail de redefinição de senha enviado com sucesso para ${driver.email}!`, { duration: 6000 });
    } catch (e: any) {
      console.error(e);
      toast.error(`Erro ao enviar redefinição de senha: ${e.message || 'Erro inesperado'}`);
    }
  };

  const handleToggleRole = async (driver: Driver) => {
    const newRole = driver.role === 'superadmin' ? 'admin' : 'superadmin';
    try {
      await setDoc(doc(db, 'drivers', driver.id), { role: newRole }, { merge: true });
      toast.success(`Permissão de ${driver.name || 'Motorista'} alterada para ${newRole.toUpperCase()}`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao alterar permissão");
    }
  };

  const handleSetPlan = async (driver: Driver, newPlan: 'Gratuito' | 'Pro' | 'Frota') => {
    try {
      await setDoc(doc(db, 'drivers', driver.id), { plan: newPlan }, { merge: true });
      toast.success(`Plano de ${driver.name || 'Motorista'} alterado para ${newPlan}`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao alterar plano");
    }
  };

  const handleSetCustomMonthlyFee = async (driver: Driver, fee: number | undefined) => {
    try {
      await setDoc(doc(db, 'drivers', driver.id), { customMonthlyFee: fee !== undefined && !isNaN(fee) ? fee : null }, { merge: true });
      toast.success(`Mensalidade de ${driver.name || 'Motorista'} ${fee !== undefined ? `definida para R$ ${fee}` : 'restaurada ao padrão'}!`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao alterar mensalidade");
    }
  };

  const handleGrantPromise = async (driver: Driver) => {
    const now = new Date();
    now.setDate(now.getDate() + (config.graceDaysAllowed || 3));
    const promiseIso = now.toISOString();

    try {
      await setDoc(doc(db, 'drivers', driver.id), { 
        paymentPromiseUntil: promiseIso,
        status: 'Ativo',
        invoiceStatus: 'Aguardando Pagamento'
      }, { merge: true });
      toast.success(`Concedido prazo de 3 dias para ${driver.name || 'Motorista'}`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao conceder promessa de pagamento");
    }
  };

  const handleApprovePaymentProof = async (driver: Driver) => {
    try {
      await setDoc(doc(db, 'drivers', driver.id), {
        invoiceStatus: 'Em Dia',
        status: 'Ativo',
        paymentProofNotes: null
      }, { merge: true });
      toast.success(`Pagamento de ${driver.name || 'Motorista'} APROVADO! Conta ativada e fatura em dia.`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao aprovar pagamento");
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, newStatus: Ticket['status']) => {
    try {
      await setDoc(doc(db, 'tickets', ticketId), { status: newStatus }, { merge: true });
      toast.success(`Chamado atualizado para ${newStatus}`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao atualizar chamado");
    }
  };

  const handleApproveVerification = async (driver: Driver) => {
    try {
      await updateDoc(doc(db, 'drivers', driver.id), {
        verificationStatus: 'verified',
        isVerified: true,
        verifiedAt: new Date().toISOString()
      });
      toast.success(`Selo de Verificado CONCEDIDO para ${driver.name || 'Motorista'}!`);
      setViewingVerificationDriver(null);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao aprovar verificação");
    }
  };

  const handleRejectVerification = async (driver: Driver) => {
    try {
      await updateDoc(doc(db, 'drivers', driver.id), {
        verificationStatus: 'rejected',
        isVerified: false
      });
      toast.error(`Verificação reprovada para ${driver.name || 'Motorista'}. Solicitado reenvio de documentos.`);
      setViewingVerificationDriver(null);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao reprovar verificação");
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

  const handleTestCoraConnection = async () => {
    setTestingCora(true);
    setCoraTestStatus(null);
    try {
      const response = await fetch('/api/cora/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: config.coraClientId,
          clientSecret: config.coraClientSecret,
          environment: config.coraEnvironment || 'stage'
        })
      });
      const data = await response.json();
      if (data.success) {
        setCoraTestStatus({
          success: true,
          message: data.message || `Conexão bem sucedida com o Cora Bank (${data.environment.toUpperCase()})!`,
          details: data
        });
        toast.success(`Integração Cora Bank validada com sucesso! Token gerado (${data.environment}).`);
      } else {
        setCoraTestStatus({
          success: false,
          message: data.message || data.error || 'Erro ao autenticar com o Cora Bank.',
          details: data
        });
        toast.error(data.message || 'Falha na autenticação com Cora Bank');
      }
    } catch (err: any) {
      console.error("Erro ao testar conexão Cora:", err);
      setCoraTestStatus({
        success: false,
        message: 'Erro de rede ou servidor ao testar conexão Cora Bank.'
      });
      toast.error('Erro de comunicação ao testar Cora Bank.');
    } finally {
      setTestingCora(false);
    }
  };

  const handleTestAsaasConnection = async () => {
    setTestingAsaas(true);
    setAsaasTestStatus(null);
    try {
      const response = await fetch('/api/asaas/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customApiKey: config.asaasApiKey,
          customEnvironment: config.asaasEnvironment || 'sandbox'
        })
      });
      const data = await response.json();
      if (data.success) {
        setAsaasTestStatus({
          success: true,
          message: `Conexão bem sucedida! Ambiente: ${data.environment.toUpperCase()}`,
          details: data
        });
        toast.success(`Integração Asaas validada com sucesso (${data.environment})!`);
      } else {
        setAsaasTestStatus({
          success: false,
          message: data.error || data.message || 'Erro ao conectar com a API do Asaas.',
          details: data
        });
        toast.error(data.error || data.message || 'Falha na autenticação com Asaas');
      }
    } catch (err: any) {
      console.error("Erro ao testar conexão Asaas:", err);
      setAsaasTestStatus({
        success: false,
        message: 'Erro de rede ou servidor ao testar conexão Asaas.'
      });
      toast.error('Erro de comunicação ao testar Asaas.');
    } finally {
      setTestingAsaas(false);
    }
  };

  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = (d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (d.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (d.city || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (d.phone || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || d.status === statusFilter;
    const matchesInvoice = invoiceFilter === 'todos' || (d.invoiceStatus || 'Em Dia') === invoiceFilter;
    const matchesMarketplace = marketplaceFilter === 'todos' || 
      (marketplaceFilter === 'visivel' && !d.hiddenInMarketplace) ||
      (marketplaceFilter === 'oculto' && !!d.hiddenInMarketplace);
    const matchesPlan = planFilter === 'todos' || (d.plan || 'Gratuito') === planFilter;
    const isPending = d.verificationStatus === 'pending' || d.verificationStatus === 'em_analise';
    const isVerified = Boolean(d.isVerified || d.verificationStatus === 'verified' || d.verificationStatus === 'verificado');
    const isUnverified = !d.verificationStatus || d.verificationStatus === 'unverified' || d.verificationStatus === 'nao_enviado';

    const matchesVerification = verificationFilter === 'todos' ||
      (verificationFilter === 'pending' && isPending) ||
      (verificationFilter === 'verified' && isVerified) ||
      (verificationFilter === 'unverified' && isUnverified);

    return matchesSearch && matchesStatus && matchesInvoice && matchesMarketplace && matchesPlan && matchesVerification;
  });

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('todos');
    setInvoiceFilter('todos');
    setMarketplaceFilter('todos');
    setPlanFilter('todos');
    setVerificationFilter('todos');
  };

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'todos' || invoiceFilter !== 'todos' || marketplaceFilter !== 'todos' || planFilter !== 'todos' || verificationFilter !== 'todos';

  const totalRevenue = drivers.reduce((acc, d) => acc + (d.pricePerStudent || 150), 0);
  const activeCount = drivers.filter(d => d.status === 'Ativo').length;
  const blockedCount = drivers.filter(d => d.status === 'Bloqueado').length;
  const pendingVerificationCount = drivers.filter(d => d.verificationStatus === 'pending' || d.verificationStatus === 'em_analise').length;

  const pendingPixDrivers = drivers.filter(d => d.invoiceStatus === 'Aguardando Pagamento');
  const pendingPixCount = pendingPixDrivers.length;

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
              onClick={() => setActiveTab('gateway')}
              className={cn(
                "px-5 py-2.5 rounded-2xl text-sm font-bold transition-all flex items-center gap-1.5",
                activeTab === 'gateway' ? "bg-yellow-400 text-gray-900 shadow-lg" : "bg-white/10 text-white hover:bg-white/20"
              )}
            >
              <CreditCard size={15} />
              <span>Gateway Bancário (Cora Bank)</span>
              {(config.coraClientId || config.asaasApiKey) && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
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
        <div 
          onClick={resetFilters}
          className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-yellow-300 transition-all"
          title="Clique para ver todos"
        >
          <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Motoristas</div>
            <div className="text-2xl font-black text-gray-900">{drivers.length}</div>
          </div>
        </div>

        <div 
          onClick={() => { resetFilters(); setStatusFilter('Ativo'); }}
          className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-green-300 transition-all"
          title="Filtrar contas ativas"
        >
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contas Ativas</div>
            <div className="text-2xl font-black text-gray-900">{activeCount}</div>
          </div>
        </div>

        <div 
          onClick={() => { resetFilters(); setStatusFilter('Bloqueado'); }}
          className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-red-300 transition-all"
          title="Filtrar contas bloqueadas"
        >
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
            <AlertCircle size={24} />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bloqueados</div>
            <div className="text-2xl font-black text-gray-900">{blockedCount}</div>
          </div>
        </div>

        <div 
          onClick={() => setActiveTab('tickets')}
          className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 cursor-pointer hover:border-blue-300 transition-all"
          title="Ver chamados de suporte"
        >
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
          {/* Pending Pix Alert Banner */}
          {pendingPixCount > 0 && (
            <div className="bg-amber-50 border-2 border-amber-300 p-5 rounded-3xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-400 text-gray-950 rounded-2xl flex items-center justify-center font-black shrink-0 shadow">
                  🔔
                </div>
                <div>
                  <h3 className="text-sm font-black text-amber-950">
                    {pendingPixCount} {pendingPixCount === 1 ? 'Motorista notificou' : 'Motoristas notificaram'} pagamento de Pix SchoolVan!
                  </h3>
                  <p className="text-xs text-amber-800 font-medium">
                    Verifique o extrato da sua conta bancária Cora e clique em <strong>Aprovar Pix</strong> para colocar a fatura em dia.
                  </p>
                </div>
              </div>
              <button
                onClick={() => { resetFilters(); setInvoiceFilter('Pendente'); }}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-gray-950 font-black rounded-xl text-xs shadow transition-all cursor-pointer shrink-0"
              >
                Filtrar Notificados ({pendingPixCount})
              </button>
            </div>
          )}

          {/* 🌟 Pending Verification Review Banner (SLA 3-5 days) */}
          {pendingVerificationCount > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 p-5 rounded-3xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black shrink-0 shadow">
                  📑
                </div>
                <div>
                  <h3 className="text-sm font-black text-blue-950">
                    {pendingVerificationCount} {pendingVerificationCount === 1 ? 'Motorista enviou documentos para Selo Verificado' : 'Motoristas enviaram documentos para Selo Verificado'} (SLA 3 a 5 dias)
                  </h3>
                  <p className="text-xs text-blue-800 font-medium">
                    Analise CNH (com EAR), Curso de Transporte Escolar e Alvará Municipal para homologar o selo oficial.
                  </p>
                </div>
              </div>
              <button
                onClick={() => { resetFilters(); setVerificationFilter('pending'); }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xs shadow transition-all cursor-pointer shrink-0"
              >
                Analisar Pendentes ({pendingVerificationCount})
              </button>
            </div>
          )}

          {/* Smart Filters Toolbar */}
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
              {/* Search Bar */}
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por nome, e-mail, cidade ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400 text-sm font-medium"
                />
              </div>

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer"
                >
                  ✕ Limpar Filtros
                </button>
              )}
            </div>

            {/* Smart Filters Selects */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-gray-100 text-xs">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Status Fatura</label>
                <select
                  value={invoiceFilter}
                  onChange={(e) => setInvoiceFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-700 cursor-pointer"
                >
                  <option value="todos">Todas Faturas</option>
                  <option value="Em Dia">✓ Fatura OK (Em Dia)</option>
                  <option value="Em Atraso">✕ Fatura Atrasada</option>
                  <option value="Pendente">⏳ Fatura Pendente</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Status Conta</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-700 cursor-pointer"
                >
                  <option value="todos">Todas Contas</option>
                  <option value="Ativo">🟢 Apenas Ativos</option>
                  <option value="Bloqueado">🔴 Apenas Bloqueados</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Marketplace</label>
                <select
                  value={marketplaceFilter}
                  onChange={(e) => setMarketplaceFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-700 cursor-pointer"
                >
                  <option value="todos">Todos no Mkt</option>
                  <option value="visivel">👁️ Visíveis no Mkt</option>
                  <option value="oculto">🙈 Ocultos no Mkt</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Plano SaaS</label>
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-700 cursor-pointer"
                >
                  <option value="todos">Todos os Planos</option>
                  <option value="Gratuito">Gratuito</option>
                  <option value="Pro">Pro (R$79)</option>
                  <option value="Frota">Frota (R$149)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Selo Verificado</label>
                <select
                  value={verificationFilter}
                  onChange={(e) => setVerificationFilter(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold text-gray-700 cursor-pointer"
                >
                  <option value="todos">Todos Selos</option>
                  <option value="pending">⏳ Em Análise (SLA)</option>
                  <option value="verified">✓ Aprovados</option>
                  <option value="unverified">Não Solicitado</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Motorista / E-mail</th>
                    <th className="px-5 py-3.5">Cargo / Plano</th>
                    <th className="px-5 py-3.5">Mensalidade (R$)</th>
                    <th className="px-5 py-3.5">Fatura (1 Clique)</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Ações em 1 Linha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredDrivers.map((driver) => {
                    const isBlocked = driver.status === 'Bloqueado';
                    const isSuper = driver.role === 'superadmin' || driver.email === 'franklin.toledo@gmail.com';
                    const currentPlan = driver.plan || 'Gratuito';
                    const promiseActive = driver.paymentPromiseUntil && new Date(driver.paymentPromiseUntil) > new Date();

                    return (
                      <tr key={driver.id} className="hover:bg-gray-50/60 transition-colors">
                        {/* Motorista */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{driver.name || 'Sem nome'}</span>
                            {isSuper && (
                              <span className="bg-purple-100 text-purple-800 text-[10px] font-black px-2 py-0.5 rounded-full">SUPER</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">{driver.email}</div>
                          {driver.phone && <div className="text-[11px] text-gray-400">Tel: {driver.phone}</div>}
                        </td>

                        {/* Cargo / Plano */}
                        <td className="px-5 py-3">
                          <div className="flex flex-col gap-1 items-start">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleToggleRole(driver)}
                                disabled={driver.email === 'franklin.toledo@gmail.com'}
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer",
                                  isSuper
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                                )}
                              >
                                {isSuper ? 'Super Admin' : 'Motorista'}
                              </button>

                              <select
                                value={currentPlan}
                                onChange={(e) => handleSetPlan(driver, e.target.value as any)}
                                className="px-2 py-0.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 outline-none cursor-pointer"
                              >
                                <option value="Gratuito">Gratuito</option>
                                <option value="Pro">Pro (R$79)</option>
                                <option value="Frota">Frota (R$149)</option>
                              </select>
                            </div>

                            {driver.discountPercent && (
                              <div className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                                Desc. {driver.discountPercent}% ({driver.discountType === 'temporary' ? '3m' : 'Perm'})
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Mensalidade Personalizada */}
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1" title="Defina um valor personalizado de mensalidade para este cliente">
                            <span className="text-xs font-bold text-gray-400">R$</span>
                            <input
                              type="number"
                              placeholder={currentPlan === 'Gratuito' ? '0' : currentPlan === 'Pro' ? '79' : '149'}
                              key={`fee-${driver.id}-${driver.customMonthlyFee}`}
                              defaultValue={driver.customMonthlyFee !== undefined && driver.customMonthlyFee !== null ? driver.customMonthlyFee : ''}
                              onBlur={(e) => {
                                const val = e.target.value.trim();
                                const num = val === '' ? undefined : Number(val);
                                if (num !== driver.customMonthlyFee) {
                                  handleSetCustomMonthlyFee(driver, num);
                                }
                              }}
                              className="w-20 px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-yellow-400"
                            />
                          </div>
                        </td>

                        {/* Fatura 1-Clique */}
                        <td className="px-5 py-3">
                          <div className="flex flex-col gap-1 items-start min-w-[140px]">
                            <select
                              value={driver.invoiceStatus || 'Em Dia'}
                              onChange={(e) => handleSetInvoiceStatus(driver, e.target.value as any)}
                              className={cn(
                                "w-full px-2.5 py-1 rounded-xl text-xs font-extrabold border outline-none transition-all cursor-pointer shadow-sm",
                                driver.invoiceStatus === 'Em Dia' ? "bg-green-100 text-green-800 border-green-300" :
                                driver.invoiceStatus === 'Em Atraso' ? "bg-red-100 text-red-800 border-red-300" :
                                "bg-amber-100 text-amber-800 border-amber-300"
                              )}
                            >
                              <option value="Em Dia">✓ Fatura OK</option>
                              <option value="Em Atraso">✕ Fatura Atraso</option>
                              <option value="Pendente">⏳ Fatura Pendente</option>
                            </select>

                            <div className="flex items-center justify-between w-full text-[10px]">
                              {promiseActive ? (
                                <span className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                  Grace {new Date(driver.paymentPromiseUntil!).toLocaleDateString('pt-BR')}
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleGrantPromise(driver)}
                                  className="font-bold text-yellow-700 hover:underline cursor-pointer"
                                  title="Dar 3 dias de tolerância"
                                >
                                  + 3d Grace
                                </button>
                              )}

                              {driver.paymentProofNotes && (
                                <button
                                  onClick={() => handleApprovePaymentProof(driver)}
                                  className="font-extrabold text-green-700 bg-green-100 hover:bg-green-200 px-1.5 py-0.5 rounded border border-green-300 cursor-pointer animate-pulse"
                                  title={`Pix enviado: ${driver.paymentProofNotes} - Clique para Aprovar`}
                                >
                                  Aprovar Pix
                                </button>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Status Conta & Mkt */}
                        <td className="px-5 py-3">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1",
                              isBlocked ? "bg-red-100 text-red-800 border-red-200" : "bg-green-100 text-green-800 border-green-200"
                            )}>
                              {isBlocked ? <Lock size={10} /> : <Unlock size={10} />}
                              {driver.status || 'Ativo'}
                            </span>

                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center gap-1",
                              driver.hiddenInMarketplace ? "bg-gray-100 text-gray-600 border-gray-200" : "bg-blue-50 text-blue-700 border-blue-200"
                            )}>
                              {driver.hiddenInMarketplace ? <EyeOff size={10} /> : <Eye size={10} />}
                              {driver.hiddenInMarketplace ? 'Oculto Mkt' : 'Visível Mkt'}
                            </span>

                            {/* Verification Badge / Action */}
                            {driver.verificationStatus === 'pending' && (
                              <button
                                onClick={() => setViewingVerificationDriver(driver)}
                                className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-300 animate-pulse flex items-center gap-1 cursor-pointer hover:bg-blue-200 shadow-sm"
                                title="Analisar documentos e validar Selo Verificado (SLA 3-5 dias)"
                              >
                                ⏳ Docs Pendentes
                              </button>
                            )}

                            {(driver.isVerified || driver.verificationStatus === 'verified') && (
                              <button
                                onClick={() => setViewingVerificationDriver(driver)}
                                className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 cursor-pointer hover:bg-emerald-200"
                                title="Selo Verificado Ativo - Clique para ver documentos"
                              >
                                ✓ Verificado
                              </button>
                            )}

                            {driver.verificationStatus === 'rejected' && (
                              <button
                                onClick={() => setViewingVerificationDriver(driver)}
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1 cursor-pointer hover:bg-red-100"
                                title="Documentos reprovados - Clique para ver histórico"
                              >
                                ✕ Docs Reprovados
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Ações em 1 Linha */}
                        <td className="px-5 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Document Review Button */}
                            <button
                              onClick={() => setViewingVerificationDriver(driver)}
                              title="Vistoriar Documentos e Selo Verificado"
                              className={cn(
                                "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 cursor-pointer shrink-0",
                                driver.verificationStatus === 'pending'
                                  ? "bg-blue-600 text-white hover:bg-blue-700 border-blue-600 shadow-sm animate-pulse"
                                  : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                              )}
                            >
                              <FileText size={13} />
                              <span>{driver.verificationStatus === 'pending' ? 'Vistoriar' : 'Docs'}</span>
                            </button>

                            {/* Lock/Unlock Button */}
                            <button
                              onClick={() => handleToggleDriverStatus(driver)}
                              title={isBlocked ? "Desbloquear Conta" : "Bloquear Conta"}
                              className={cn(
                                "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer shrink-0",
                                isBlocked ? "bg-green-600 text-white hover:bg-green-700" : "bg-red-500 text-white hover:bg-red-600"
                              )}
                            >
                              {isBlocked ? <Unlock size={13} /> : <Lock size={13} />}
                              <span>{isBlocked ? 'Desbloquear' : 'Bloquear'}</span>
                            </button>

                            {/* Hide from Marketplace Toggle */}
                            <button
                              onClick={() => handleToggleMarketplaceVisibility(driver)}
                              title={driver.hiddenInMarketplace ? "Mostrar no Marketplace" : "Ocultar do Marketplace"}
                              className={cn(
                                "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 cursor-pointer shrink-0",
                                driver.hiddenInMarketplace
                                  ? "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                  : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
                              )}
                            >
                              {driver.hiddenInMarketplace ? <Eye size={13} /> : <EyeOff size={13} />}
                              <span>{driver.hiddenInMarketplace ? 'Exibir Mkt' : 'Ocultar Mkt'}</span>
                            </button>

                            {/* Reset Password */}
                            <button
                              onClick={() => handleResetPassword(driver)}
                              title="Enviar e-mail de redefinição de senha ao motorista"
                              className="px-2.5 py-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-900 border border-yellow-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <KeyRound size={13} />
                              <span>Reset Senha</span>
                            </button>

                            {/* Support Impersonation (LGPD) */}
                            {onImpersonate && (
                              <button
                                onClick={() => {
                                  toast.success(`Iniciando modo suporte LGPD para ${driver.name || 'Motorista'}`);
                                  onImpersonate(driver);
                                }}
                                title="Entrar como usuário para prestar suporte (LGPD)"
                                className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-extrabold transition-all shadow-sm flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                <UserCheck size={13} />
                                <span>Entrar</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredDrivers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-400 font-medium">
                        Nenhum motorista encontrado com os filtros selecionados.
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

      {/* TAB 3: CORA BANK & ASAAS GATEWAY CONFIGURATION */}
      {activeTab === 'gateway' && (
        <form onSubmit={handleSaveConfig} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm space-y-8 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-2xl">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Integração Bancária & Gateway de Pagamentos</h2>
                  <p className="text-xs text-gray-500">
                    Gerencie a integração oficial com o <strong>Cora Bank</strong> (OAuth 2.0 / Homologação e Produção) e gateways auxiliares.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5",
                config.coraClientId ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              )}>
                <span className={cn("w-2 h-2 rounded-full", config.coraClientId ? "bg-emerald-500 animate-pulse" : "bg-amber-500")} />
                {config.coraClientId ? "Cora Bank Conectado" : "Aguardando Credenciais Cora"}
              </span>
            </div>
          </div>

          {/* Seleção do Provedor Ativo */}
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-200/80 space-y-3">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
              Gateway de Pagamento Ativo da Plataforma
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={cn(
                "p-4 rounded-2xl border-2 flex items-center gap-3 cursor-pointer transition-all",
                (config.paymentGatewayProvider || 'cora') === 'cora'
                  ? "bg-yellow-50/70 border-yellow-400 text-gray-900 shadow-sm"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              )}>
                <input
                  type="radio"
                  name="paymentGatewayProvider"
                  value="cora"
                  checked={(config.paymentGatewayProvider || 'cora') === 'cora'}
                  onChange={() => setConfig({ ...config, paymentGatewayProvider: 'cora' })}
                  className="accent-yellow-500 w-4 h-4"
                />
                <div>
                  <div className="font-bold text-sm flex items-center gap-1.5">
                    <span>🏦 Cora Bank (Recomendado / Ativo)</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-black">OFICIAL</span>
                  </div>
                  <div className="text-xs text-gray-500">API Direta de Cobranças Pix e Boletos via OAuth2</div>
                </div>
              </label>

              <label className={cn(
                "p-4 rounded-2xl border-2 flex items-center gap-3 cursor-pointer transition-all",
                config.paymentGatewayProvider === 'asaas'
                  ? "bg-blue-50/70 border-blue-400 text-gray-900 shadow-sm"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
              )}>
                <input
                  type="radio"
                  name="paymentGatewayProvider"
                  value="asaas"
                  checked={config.paymentGatewayProvider === 'asaas'}
                  onChange={() => setConfig({ ...config, paymentGatewayProvider: 'asaas' })}
                  className="accent-blue-500 w-4 h-4"
                />
                <div>
                  <div className="font-bold text-sm">Asaas Gateway (Legado / Alternativo)</div>
                  <div className="text-xs text-gray-500">Chave de acesso Access Token $aact_...</div>
                </div>
              </label>
            </div>
          </div>

          {/* SEÇÃO CORA BANK */}
          <div className="border border-yellow-200/80 bg-yellow-50/30 p-6 rounded-3xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                  <span>🏦 Configuração da API Cora Bank</span>
                  <span className="text-xs px-2.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full font-bold">OAuth 2.0</span>
                </h3>
                <p className="text-xs text-gray-500">
                  Credenciais fornecidas pelo time de integrações da Cora no e-mail de aprovação de homologação.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ambiente Cora */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                  Ambiente Cora
                </label>
                <select
                  value={config.coraEnvironment || 'stage'}
                  onChange={(e) => setConfig({ ...config, coraEnvironment: e.target.value as any })}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400 text-sm font-bold text-gray-800"
                >
                  <option value="stage">Homologação / Testes (api.stage.cora.com.br)</option>
                  <option value="production">Produção Oficial (api.cora.com.br)</option>
                </select>
                <p className="text-[11px] text-gray-400 ml-1">
                  Ambiente de testes solicitado pela Cora para validação inicial antes da virada para produção.
                </p>
              </div>

              {/* Taxa de Split SchoolVan */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                  Taxa SchoolVan por Cobrança Emitida
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-sm font-bold text-gray-400">R$</span>
                  <input
                    type="number"
                    step="0.10"
                    min="0"
                    value={config.coraPlatformSplitFee ?? 1.50}
                    onChange={(e) => setConfig({ ...config, coraPlatformSplitFee: Number(e.target.value) })}
                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400 text-sm font-bold text-gray-800"
                    placeholder="1.50"
                  />
                </div>
                <p className="text-[11px] text-gray-400 ml-1">
                  Valor que a SchoolVan retém por mensalidade escolar emitida.
                </p>
              </div>

              {/* Client ID Cora */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                  Cora Client ID
                </label>
                <input
                  type="text"
                  value={config.coraClientId || ''}
                  onChange={(e) => setConfig({ ...config, coraClientId: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400 text-sm font-mono text-gray-800"
                  placeholder="app-hKTVJB2iqimj0uUNqAjSS"
                />
              </div>

              {/* Client Secret Cora */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                  Cora Client Secret
                </label>
                <input
                  type="password"
                  value={config.coraClientSecret || ''}
                  onChange={(e) => setConfig({ ...config, coraClientSecret: e.target.value })}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400 text-sm font-mono text-gray-800"
                  placeholder="9c8d3404-f99c-4a5a-8210-e856ba586eaa"
                />
              </div>

              {/* URL do Webhook da Cora na SchoolVan */}
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                  URL de Notificações / Webhook Cora Bank
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/api/cora/webhook`}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs font-mono text-gray-600 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/api/cora/webhook`);
                      toast.success('URL do Webhook Cora copiada!');
                    }}
                    className="px-4 py-3 bg-gray-900 text-yellow-400 font-bold rounded-2xl text-xs whitespace-nowrap hover:bg-gray-800"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              {/* Sincronização Automática Cora */}
              <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-gray-200 flex items-start gap-4">
                <input
                  type="checkbox"
                  id="coraAutoSync"
                  checked={config.coraAutoSync ?? true}
                  onChange={(e) => setConfig({ ...config, coraAutoSync: e.target.checked })}
                  className="w-5 h-5 mt-0.5 accent-yellow-400 rounded cursor-pointer"
                />
                <div>
                  <label htmlFor="coraAutoSync" className="text-sm font-bold text-gray-900 cursor-pointer block">
                    Ativar Baixa Automática e Confirmação via T.IA (Cora Bank)
                  </label>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Quando o Cora Bank confirmar a liquidação de uma fatura Pix ou Boleto, a SchoolVan dá baixa na hora e notifica pai e motorista.
                  </p>
                </div>
              </div>
            </div>

            {/* Test Cora Status Message */}
            {coraTestStatus && (
              <div className={cn(
                "p-4 rounded-2xl border text-xs font-semibold flex items-start gap-3",
                coraTestStatus.success 
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900" 
                  : "bg-rose-50 border-rose-200 text-rose-900"
              )}>
                {coraTestStatus.success ? (
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <p className="font-bold">{coraTestStatus.message}</p>
                  {coraTestStatus.details && (
                    <p className="font-mono text-[11px] opacity-80">
                      Status: {coraTestStatus.details.authenticated ? 'Token OAuth2 Válido' : 'Falha na Validação'}
                      {coraTestStatus.details.expiresIn ? ` • Validade do Token: ${coraTestStatus.details.expiresIn}s` : ''}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>
              <button
                type="button"
                disabled={testingCora || !config.coraClientId}
                onClick={handleTestCoraConnection}
                className="w-full sm:w-auto px-6 py-3.5 bg-yellow-500 hover:bg-yellow-600 text-gray-950 font-bold rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {testingCora ? (
                  <div className="w-5 h-5 border-2 border-gray-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <RefreshCw size={18} />
                    <span>Testar Conexão OAuth2 com Cora Bank</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={savingConfig}
              className="flex-1 w-full py-4 bg-gray-900 text-yellow-400 font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {savingConfig ? (
                <div className="w-5 h-5 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={20} /> SALVAR CONFIGURAÇÕES DO GATEWAY CORA
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: GLOBAL CONFIG */}
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

      {/* 🌟 Modal de Vistoria de Documentos e Selo Verificado */}
      {viewingVerificationDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-black text-white p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-400 text-gray-950 rounded-2xl flex items-center justify-center font-black shadow-md">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black">
                    Vistoria de Documentos Profissionais
                  </h3>
                  <p className="text-xs text-gray-300">
                    {viewingVerificationDriver.name || 'Motorista'} • {viewingVerificationDriver.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingVerificationDriver(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="bg-amber-50 border border-yellow-200 p-4 rounded-2xl flex items-start gap-3">
                <ShieldAlert className="text-amber-700 shrink-0 mt-0.5" size={18} />
                <div className="text-xs text-amber-950 leading-relaxed font-medium">
                  <strong>Protocolo de Homologação (SLA 3-5 dias):</strong> Valide se a CNH possui anotação EAR (Exerce Atividade Remunerada) com validade em dia, se o curso de Condutor Escolar está dentro dos 5 anos e se o Alvará Municipal está vigente.
                </div>
              </div>

              {/* Status Atual */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status Atual do Selo:</span>
                <span className={cn(
                  "px-3 py-1 text-xs font-black rounded-full border",
                  viewingVerificationDriver.isVerified || viewingVerificationDriver.verificationStatus === 'verified' || viewingVerificationDriver.verificationStatus === 'verificado'
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : viewingVerificationDriver.verificationStatus === 'pending' || viewingVerificationDriver.verificationStatus === 'em_analise'
                    ? "bg-blue-100 text-blue-800 border-blue-300 animate-pulse"
                    : "bg-gray-200 text-gray-800 border-gray-300"
                )}>
                  {viewingVerificationDriver.isVerified || viewingVerificationDriver.verificationStatus === 'verified' || viewingVerificationDriver.verificationStatus === 'verificado'
                    ? '✓ Selo Verificado Concedido'
                    : viewingVerificationDriver.verificationStatus === 'pending' || viewingVerificationDriver.verificationStatus === 'em_analise'
                    ? '⏳ Análise Pendente'
                    : viewingVerificationDriver.verificationStatus === 'rejected' || viewingVerificationDriver.verificationStatus === 'rejeitado'
                    ? '✕ Reprovado / Ajuste Solicitado'
                    : 'Não Solicitado'}
                </span>
              </div>

              {/* Documentos Enviados */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                  Documentos Submetidos pelo Motorista
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* CNH com EAR */}
                  <div className="p-4 bg-white border border-gray-200 rounded-2xl space-y-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <FileText size={14} className="text-blue-600" /> CNH com EAR
                      </span>
                      {viewingVerificationDriver.cnhNumber || viewingVerificationDriver.verificationDocs?.cnhEarFile ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Preenchido / Anexado
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-400">Pendente</span>
                      )}
                    </div>
                    {viewingVerificationDriver.cnhNumber && (
                      <div className="text-xs text-gray-700">
                        Nº CNH: <strong>{viewingVerificationDriver.cnhNumber}</strong> (Cat. {viewingVerificationDriver.cnhCategory || 'D'})
                      </div>
                    )}
                    {viewingVerificationDriver.cnhValidUntil && (
                      <div className="text-[11px] text-gray-500">
                        Validade CNH: <strong>{new Date(viewingVerificationDriver.cnhValidUntil).toLocaleDateString('pt-BR')}</strong>
                      </div>
                    )}
                    {viewingVerificationDriver.verificationDocs?.cnhEarFile && (
                      <a
                        href={viewingVerificationDriver.verificationDocs.cnhEarFile}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-black text-blue-600 hover:underline pt-1"
                      >
                        <ExternalLink size={12} /> Abrir Documento CNH
                      </a>
                    )}
                  </div>

                  {/* Curso de Transporte Escolar */}
                  <div className="p-4 bg-white border border-gray-200 rounded-2xl space-y-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <FileText size={14} className="text-purple-600" /> Curso de Condutor Escolar
                      </span>
                      {viewingVerificationDriver.schoolCourseNumber || viewingVerificationDriver.verificationDocs?.schoolCourseFile ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Preenchido / Anexado
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-400">Pendente</span>
                      )}
                    </div>
                    {viewingVerificationDriver.schoolCourseNumber && (
                      <div className="text-xs text-gray-700">
                        Certificado nº: <strong>{viewingVerificationDriver.schoolCourseNumber}</strong>
                      </div>
                    )}
                    {viewingVerificationDriver.schoolCourseValidUntil && (
                      <div className="text-[11px] text-gray-500">
                        Validade Curso: <strong>{new Date(viewingVerificationDriver.schoolCourseValidUntil).toLocaleDateString('pt-BR')}</strong>
                      </div>
                    )}
                    {viewingVerificationDriver.verificationDocs?.schoolCourseFile && (
                      <a
                        href={viewingVerificationDriver.verificationDocs.schoolCourseFile}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-black text-purple-600 hover:underline pt-1"
                      >
                        <ExternalLink size={12} /> Abrir Certificado Curso
                      </a>
                    )}
                  </div>

                  {/* Alvará Municipal */}
                  <div className="p-4 bg-white border border-gray-200 rounded-2xl space-y-2 shadow-sm sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                        <Building size={14} className="text-amber-600" /> Alvará / Autorização da Prefeitura
                      </span>
                      {viewingVerificationDriver.municipalLicenseNumber || viewingVerificationDriver.verificationDocs?.municipalLicenseFile ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Preenchido / Anexado
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-400">Pendente</span>
                      )}
                    </div>
                    {viewingVerificationDriver.municipalLicenseNumber && (
                      <div className="text-xs text-gray-700">
                        Nº do Alvará/Licença: <strong>{viewingVerificationDriver.municipalLicenseNumber}</strong>
                      </div>
                    )}
                    {viewingVerificationDriver.municipalLicenseValidUntil && (
                      <div className="text-[11px] text-gray-500">
                        Validade Alvará: <strong>{new Date(viewingVerificationDriver.municipalLicenseValidUntil).toLocaleDateString('pt-BR')}</strong>
                      </div>
                    )}
                    {viewingVerificationDriver.verificationDocs?.municipalLicenseFile && (
                      <a
                        href={viewingVerificationDriver.verificationDocs.municipalLicenseFile}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-black text-amber-700 hover:underline pt-1"
                      >
                        <ExternalLink size={12} /> Abrir Alvará Municipal
                      </a>
                    )}
                  </div>

                  {/* Document Files Lista */}
                  {viewingVerificationDriver.documentFiles && viewingVerificationDriver.documentFiles.length > 0 && (
                    <div className="sm:col-span-2 p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                      <div className="text-xs font-black text-gray-900 uppercase">Arquivos Anexados:</div>
                      <div className="space-y-1">
                        {viewingVerificationDriver.documentFiles.map((docItem, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-gray-100">
                            <span className="font-medium text-gray-800 flex items-center gap-1.5">
                              <FileText size={13} className="text-yellow-600" />
                              {docItem.name}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(docItem.date).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => handleRejectVerification(viewingVerificationDriver)}
                className="flex-1 py-3 px-4 bg-red-100 hover:bg-red-200 text-red-800 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
              >
                Reprovar / Solicitar Ajustes
              </button>

              <button
                type="button"
                onClick={() => handleApproveVerification(viewingVerificationDriver)}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <CheckCircle2 size={16} /> APROVAR SELO VERIFICADO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
