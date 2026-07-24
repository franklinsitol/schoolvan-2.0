import React, { useState, useEffect } from 'react';
import { 
  LifeBuoy, 
  Bus, 
  UserCheck, 
  Search, 
  Send, 
  MessageSquare, 
  Info, 
  CheckCircle2, 
  Upload, 
  Clock, 
  ShieldAlert, 
  XCircle, 
  Sparkles, 
  ArrowRight, 
  Percent, 
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, addDoc, onSnapshot, query, where, doc, updateDoc, getDoc } from 'firebase/firestore';
import { Ticket, AdminConfig } from '../types';
import toast from 'react-hot-toast';

export function SupportView() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'tickets' | 'financial' | 'cancellation'>('tickets');

  // Ticket Form States
  const [ticketProfile, setTicketProfile] = useState('Motorista');
  const [subject, setSubject] = useState('Suporte Geral');
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);

  // Financial / Payment Proof States
  const [pixNotes, setPixNotes] = useState('');
  const [submittingProof, setSubmittingProof] = useState(false);
  const [adminConfig, setAdminConfig] = useState<AdminConfig | null>(null);

  // Retention / Cancellation States
  const [cancelReason, setCancelReason] = useState('');
  const [cancellationStep, setCancellationStep] = useState<'reason' | 'offer' | 'done'>('reason');
  const [processingRetention, setProcessingRetention] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setContact(profile.phone || profile.email || '');
    }
  }, [profile]);

  // Load Admin Config
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'adminConfig', 'main'));
        if (snap.exists()) {
          setAdminConfig(snap.data() as AdminConfig);
        }
      } catch (e) {
        console.error("Config fetch error", e);
      }
    };
    fetchConfig();
  }, []);

  // Fetch My Tickets
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tickets'), (snapshot) => {
      const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Ticket));
      if (profile?.email) {
        setMyTickets(all.filter(t => t.contact?.includes(profile.email) || t.name === profile.name));
      } else {
        setMyTickets(all);
      }
    }, (err) => {
      console.error("Error loading tickets", err);
    });
    return () => unsub();
  }, [profile]);

  const subjects: Record<string, string[]> = {
    Motorista: ['Suporte Geral', 'Dúvida no Financeiro', 'Envio de Comprovante', 'Problema em Rota/Alunos', 'Cancelamento / Recompensa'],
    Responsavel: ['Acesso ao App', 'Aviso de Ausência', 'Reportar Erro', 'Sugestão'],
  };

  // Submit Ticket to Firestore
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim() || !message.trim()) {
      toast.error('Por favor, preencha todos os campos do chamado.');
      return;
    }

    setSubmitting(true);
    try {
      const newTicket = {
        dateTime: new Date().toLocaleString('pt-BR'),
        profile: ticketProfile,
        subject,
        name,
        contact,
        message,
        status: 'Aberto' as const,
        driverId: profile?.id || ''
      };

      await addDoc(collection(db, 'tickets'), newTicket);
      toast.success('Chamado aberto com sucesso! Nosso suporte responderá em breve.');
      
      setMessage('');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao abrir o chamado. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  // Automated Payment Proof Upload / Grace Extension
  const handleSubmitPaymentProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      toast.error('Você precisa estar logado para enviar comprovante.');
      return;
    }
    if (!pixNotes.trim()) {
      toast.error('Informe o código do Pix ou dados do comprovante.');
      return;
    }

    setSubmittingProof(true);
    try {
      const graceDays = adminConfig?.graceDaysAllowed || 3;
      const promiseDate = new Date();
      promiseDate.setDate(promiseDate.getDate() + graceDays);

      // 1. Update Driver Document
      await updateDoc(doc(db, 'drivers', profile.id), {
        paymentProofNotes: pixNotes,
        paymentProofSubmittedAt: new Date().toISOString(),
        invoiceStatus: 'Aguardando Pagamento',
        paymentPromiseUntil: promiseDate.toISOString(),
        status: 'Ativo'
      });

      // 2. Create Ticket automatically
      await addDoc(collection(db, 'tickets'), {
        dateTime: new Date().toLocaleString('pt-BR'),
        profile: 'Motorista',
        subject: 'Envio de Comprovante Pix',
        name: profile.name || 'Motorista',
        contact: profile.email || profile.phone || '',
        message: `Comprovante Pix/Transferência enviado: ${pixNotes}`,
        status: 'Aberto',
        driverId: profile.id
      });

      toast.success(`Comprovante recebido! Seu acesso foi liberado por +${graceDays} dias enquanto o Financeiro valida.`);
      setPixNotes('');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar comprovante.');
    } finally {
      setSubmittingProof(false);
    }
  };

  // Automated Retention & Cancellation Handlers
  const handleApplyDiscountOffer = async (type: 'temp50' | 'perm30' | 'free') => {
    if (!profile) return;
    setProcessingRetention(true);

    try {
      if (type === 'temp50') {
        const date3m = new Date();
        date3m.setMonth(date3m.getMonth() + 3);

        await updateDoc(doc(db, 'drivers', profile.id), {
          plan: 'Pro',
          discountType: 'temporary',
          discountPercent: 50,
          discountUntil: date3m.toISOString(),
          status: 'Ativo'
        });
        toast.success('Oferta Aceita! Você ganhou 50% de Desconto por 3 meses no Plano Pro!');
      } else if (type === 'perm30') {
        await updateDoc(doc(db, 'drivers', profile.id), {
          plan: 'Pro',
          discountType: 'permanent',
          discountPercent: 30,
          status: 'Ativo'
        });
        toast.success('Oferta Aceita! 30% de Desconto Definitivo aplicado no seu Plano Pro!');
      } else if (type === 'free') {
        await updateDoc(doc(db, 'drivers', profile.id), {
          plan: 'Gratuito',
          discountType: 'none',
          status: 'Ativo'
        });
        toast.success('Você migrou para o Plano Gratuito (Até 25 alunos) sem custo!');
      }

      setCancellationStep('done');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao aplicar oferta.');
    } finally {
      setProcessingRetention(false);
    }
  };

  const handleConfirmFinalCancellation = async () => {
    if (!profile) return;
    setProcessingRetention(true);

    try {
      await updateDoc(doc(db, 'drivers', profile.id), {
        plan: 'Gratuito',
        discountType: 'none',
        cancellationReason: cancelReason || 'Não informado',
        cancelledAt: new Date().toISOString()
      });

      // Auto-ticket
      await addDoc(collection(db, 'tickets'), {
        dateTime: new Date().toLocaleString('pt-BR'),
        profile: 'Motorista',
        subject: 'Cancelamento via Auto-Atendimento',
        name: profile.name || 'Motorista',
        contact: profile.email || '',
        message: `Cancelamento de assinatura realizado. Motivo: ${cancelReason}`,
        status: 'Fechado',
        driverId: profile.id
      });

      toast.success('Sua assinatura foi cancelada com sucesso. Você foi migrado para o Plano Gratuito sem cobranças futuras.');
      setCancellationStep('done');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao processar cancelamento.');
    } finally {
      setProcessingRetention(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-yellow-400 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl rotate-3">
          <LifeBuoy size={40} className="text-gray-900" />
        </div>
        <h2 className="text-4xl font-black text-gray-900 mb-2">Central de Sucesso & Atendimento</h2>
        <p className="text-gray-500 text-base">Atendimento automatizado, negociações financeiras e suporte em tempo real.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-3 border-b border-gray-200 pb-4">
        <button
          onClick={() => setActiveTab('tickets')}
          className={cn(
            "px-6 py-3 rounded-2xl font-bold text-sm transition-all flex items-center gap-2",
            activeTab === 'tickets' ? "bg-gray-900 text-yellow-400 shadow-lg" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          <MessageSquare size={18} /> Suporte & Chamados
        </button>
        <button
          onClick={() => setActiveTab('financial')}
          className={cn(
            "px-6 py-3 rounded-2xl font-bold text-sm transition-all flex items-center gap-2",
            activeTab === 'financial' ? "bg-gray-900 text-yellow-400 shadow-lg" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          <Upload size={18} /> Enviar Comprovante / Financeiro
        </button>
        <button
          onClick={() => setActiveTab('cancellation')}
          className={cn(
            "px-6 py-3 rounded-2xl font-bold text-sm transition-all flex items-center gap-2",
            activeTab === 'cancellation' ? "bg-red-600 text-white shadow-lg" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          )}
        >
          <XCircle size={18} /> Auto-Atendimento / Cancelamento
        </button>
      </div>

      {/* TAB 1: TICKETS FORM + REALTIME TICKET LIST */}
      {activeTab === 'tickets' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <SupportCard 
              icon={Bus} 
              title="SOU MOTORISTA" 
              color="yellow"
              items={[
                { q: "Como configuro minha conta?", a: "Cadastre sua Van e alunos nas abas 'Frota' e 'Alunos'." },
                { q: "Gestão de equipe?", a: "Crie logins para monitores na aba 'Equipe'." }
              ]}
            />
            <SupportCard 
              icon={UserCheck} 
              title="SOU RESPONSÁVEL" 
              color="blue"
              items={[
                { q: "Como entrar?", a: "Use o e-mail informado ao motorista para acessar." },
                { q: "Avisar falta?", a: "Clique em 'Não vai hoje' no painel principal." }
              ]}
            />
            <SupportCard 
              icon={Search} 
              title="QUERO CONTRATAR" 
              color="green"
              items={[
                { q: "Como achar van?", a: "Use a busca por cidade e bairro no Marketplace." },
                { q: "Solicitar Vaga?", a: "Clique no botão de contratação direta na van." }
              ]}
            />
          </div>

          <div className="bg-white rounded-[40px] shadow-xl border border-gray-100 overflow-hidden p-8 md:p-12 space-y-8">
            <div>
              <h3 className="text-2xl font-black text-gray-900 mb-2 flex items-center gap-3">
                <MessageSquare className="text-yellow-500" /> Abrir Novo Chamado de Suporte
              </h3>
              <p className="text-gray-500 text-sm">Seu chamado será enviado diretamente para a equipe administrativa.</p>
            </div>

            <form onSubmit={handleSubmitTicket} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Quem é você?</label>
                  <select 
                    value={ticketProfile}
                    onChange={(e) => setTicketProfile(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-bold"
                  >
                    <option value="Motorista">Motorista / Tio da Van</option>
                    <option value="Responsavel">Responsável / Pai ou Mãe</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Assunto</label>
                  <select 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-bold"
                  >
                    {subjects[ticketProfile]?.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Seu Nome</label>
                  <input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-bold" 
                    placeholder="Nome completo" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Contato (WhatsApp / E-mail)</label>
                  <input 
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-bold" 
                    placeholder="(00) 00000-0000 ou seu email" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Mensagem do Chamado</label>
                <textarea 
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none resize-none text-sm"
                  placeholder="Descreva sua solicitação com detalhes..."
                />
              </div>

              <button 
                type="submit"
                disabled={submitting}
                className="w-full py-4 bg-gray-900 text-yellow-400 font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Send size={20} />
                {submitting ? 'ENVIANDO...' : 'ENVIAR CHAMADO'}
              </button>
            </form>
          </div>

          {/* REALTIME MY TICKETS LIST */}
          <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm space-y-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="text-yellow-500" /> Meus Chamados Registrados ({myTickets.length})
            </h3>

            <div className="space-y-3">
              {myTickets.map((t) => (
                <div key={t.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 text-sm">{t.subject}</span>
                      <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold">
                        {t.profile}
                      </span>
                      <span className="text-xs text-gray-400">{t.dateTime}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{t.message}</p>
                  </div>

                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold border shrink-0",
                    t.status === 'Aberto' && "bg-yellow-50 text-yellow-800 border-yellow-200",
                    t.status === 'Em Andamento' && "bg-blue-50 text-blue-800 border-blue-200",
                    t.status === 'Fechado' && "bg-green-50 text-green-800 border-green-200"
                  )}>
                    {t.status}
                  </span>
                </div>
              ))}

              {myTickets.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-xs">
                  Você ainda não possui chamados abertos.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUTOMATED FINANCIAL & PAYMENT PROOF */}
      {activeTab === 'financial' && (
        <div className="bg-white rounded-[40px] shadow-xl border border-gray-100 p-8 md:p-12 space-y-8">
          <div>
            <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase">
              Liberação Automática
            </span>
            <h3 className="text-2xl font-black text-gray-900 mt-2 flex items-center gap-3">
              <Upload className="text-green-600" /> Envio de Comprovante Pix do SaaS
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              Fez o pagamento via Pix da licença? Envie o comprovante ou código abaixo para **liberar seu acesso imediatamente por 3 dias** enquanto o Super Admin valida o extrato!
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl space-y-2">
            <div className="text-xs text-yellow-900 font-bold uppercase">Chave Pix Oficial para Pagamento:</div>
            <div className="font-mono text-lg font-black text-gray-900">
              {adminConfig?.pixAdmin || 'pix@schoolvan.com.br'}
            </div>
            <div className="text-xs text-gray-600">
              Beneficiário: SchoolVan Gestão de Transporte Escolar
            </div>
          </div>

          <form onSubmit={handleSubmitPaymentProof} className="space-y-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                Código de Transação / Detalhes do Comprovante Pix
              </label>
              <textarea
                rows={3}
                value={pixNotes}
                onChange={(e) => setPixNotes(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-green-400 outline-none text-sm font-mono"
                placeholder="Cole aqui o ID da transação Pix, hora do pagamento ou cole o texto do comprovante..."
              />
            </div>

            <button
              type="submit"
              disabled={submittingProof}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
            >
              <CheckCircle2 size={20} />
              {submittingProof ? 'REGISTRANDO...' : 'ENVIAR COMPROVANTE & LIBERAR ACESSO'}
            </button>
          </form>
        </div>
      )}

      {/* TAB 3: SELF-SERVICE CANCELLATION & AUTOMATED RETENTION ENGINE */}
      {activeTab === 'cancellation' && (
        <div className="bg-white rounded-[40px] shadow-xl border border-gray-100 p-8 md:p-12 space-y-8">
          <div>
            <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full uppercase">
              Auto-Atendimento 100% Automático
            </span>
            <h3 className="text-2xl font-black text-gray-900 mt-2 flex items-center gap-2">
              <XCircle className="text-red-600" /> Gestão de Assinatura & Cancelamento
            </h3>
            <p className="text-gray-500 text-sm mt-1">
              Você tem total liberdade. Cancele ou altere seu plano sem precisar falar com atendente.
            </p>
          </div>

          {cancellationStep === 'reason' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Por qual motivo você deseja cancelar?</label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none"
                >
                  <option value="">Selecione o motivo...</option>
                  <option value="Preço do plano está alto">Preço do plano está alto no momento</option>
                  <option value="Tenho poucos alunos">Tenho poucos alunos cadastrados</option>
                  <option value="Troquei de van ou parei de rodar">Troquei de van ou parei de trabalhar no setor</option>
                  <option value="Estou usando outro aplicativo">Estou usando outro aplicativo</option>
                  <option value="Outro motivo">Outro motivo</option>
                </select>
              </div>

              <button
                onClick={() => setCancellationStep('offer')}
                disabled={!cancelReason}
                className="w-full py-4 bg-gray-900 text-yellow-400 font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-lg text-sm"
              >
                CONTINUAR
              </button>
            </div>
          )}

          {/* RETENTION OFFERS ENGINE */}
          {cancellationStep === 'offer' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-gray-900 p-6 rounded-3xl shadow-lg space-y-3">
                <div className="inline-flex items-center gap-1 bg-gray-900 text-yellow-400 text-[10px] font-black px-3 py-1 rounded-full uppercase">
                  <Sparkles size={12} /> Oferta Especial de Retenção
                </div>
                <h4 className="text-2xl font-black">Não vá embora! Temos uma proposta exclusiva para você:</h4>
                <p className="text-xs text-gray-800 font-bold">
                  Sabemos que manter uma frota escolar envolve custos. Escolha uma das opções abaixo com **aplicação imediata** no seu cadastro:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* OFFER 1: 50% OFF 3 MONTHS */}
                <div className="bg-gradient-to-b from-gray-900 to-black text-white p-6 rounded-3xl shadow-xl border-2 border-yellow-400 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[10px] bg-yellow-400 text-gray-900 font-black px-2.5 py-0.5 rounded-full uppercase">
                      Desconto Temporário
                    </span>
                    <h5 className="text-xl font-black mt-2 text-yellow-400">50% OFF por 3 Meses</h5>
                    <div className="text-3xl font-black mt-2">R$ 39,50 <span className="text-xs text-gray-400 font-normal">/mês</span></div>
                    <p className="text-xs text-gray-300 mt-2">
                      Pague metade do preço do Plano Pro durante os próximos 90 dias e mantenha todos os recursos ativados!
                    </p>
                  </div>

                  <button
                    onClick={() => handleApplyDiscountOffer('temp50')}
                    disabled={processingRetention}
                    className="w-full py-3 bg-yellow-400 text-gray-900 font-extrabold rounded-xl text-xs hover:bg-yellow-300 transition-all shadow"
                  >
                    ACEITAR 50% OFF (3 MESES)
                  </button>
                </div>

                {/* OFFER 2: 30% OFF PERMANENT */}
                <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[10px] bg-purple-100 text-purple-800 font-black px-2.5 py-0.5 rounded-full uppercase">
                      Desconto Definitivo
                    </span>
                    <h5 className="text-xl font-black mt-2 text-gray-900">30% OFF Para Sempre</h5>
                    <div className="text-3xl font-black mt-2 text-gray-900">R$ 55,30 <span className="text-xs text-gray-400 font-normal">/mês</span></div>
                    <p className="text-xs text-gray-500 mt-2">
                      Garante o valor reduzido para sempre na sua assinatura Pro.
                    </p>
                  </div>

                  <button
                    onClick={() => handleApplyDiscountOffer('perm30')}
                    disabled={processingRetention}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-all shadow"
                  >
                    ACEITAR 30% DEFINITIVO
                  </button>
                </div>

                {/* OFFER 3: FREE PLAN DOWNGRADE */}
                <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <span className="text-[10px] bg-gray-100 text-gray-700 font-black px-2.5 py-0.5 rounded-full uppercase">
                      Sem Custos
                    </span>
                    <h5 className="text-xl font-black mt-2 text-gray-900">Mudar para Gratuito</h5>
                    <div className="text-3xl font-black mt-2 text-gray-900">R$ 0 <span className="text-xs text-gray-400 font-normal">/mês</span></div>
                    <p className="text-xs text-gray-500 mt-2">
                      Mantenha até 25 alunos cadastrados e a van ativa sem pagar mensalidade.
                    </p>
                  </div>

                  <button
                    onClick={() => handleApplyDiscountOffer('free')}
                    disabled={processingRetention}
                    className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold rounded-xl text-xs transition-all"
                  >
                    MIGRAR PARA GRATUITO
                  </button>
                </div>
              </div>

              {/* FINAL CANCELLATION BUTTON */}
              <div className="pt-6 border-t border-gray-100 text-center space-y-2">
                <button
                  onClick={handleConfirmFinalCancellation}
                  disabled={processingRetention}
                  className="text-xs text-red-600 font-bold underline hover:text-red-800"
                >
                  Não quero nenhuma oferta, cancelar minha assinatura definitivamente agora.
                </button>
              </div>
            </div>
          )}

          {cancellationStep === 'done' && (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} />
              </div>
              <h4 className="text-2xl font-black text-gray-900">Solicitação Concluída!</h4>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Sua conta foi atualizada com sucesso. Obrigado por fazer parte da família SchoolVan!
              </p>
              <button
                onClick={() => setCancellationStep('reason')}
                className="px-6 py-2.5 bg-gray-100 text-gray-800 font-bold rounded-xl text-xs"
              >
                Voltar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SupportCard({ icon: Icon, title, color, items }: any) {
  const colors: any = {
    yellow: "text-yellow-600 bg-yellow-50 border-yellow-100",
    blue: "text-blue-600 bg-blue-50 border-blue-100",
    green: "text-green-600 bg-green-50 border-green-100",
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4", colors[color])}>
        <Icon size={24} />
      </div>
      <h4 className="font-black text-gray-900 mb-4">{title}</h4>
      <div className="space-y-4">
        {items.map((item: any, i: number) => (
          <div key={i} className="space-y-1">
            <div className="text-xs font-bold text-gray-900">{item.q}</div>
            <div className="text-xs text-gray-500 leading-relaxed">{item.a}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
