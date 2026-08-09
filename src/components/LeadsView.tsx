import React, { useState } from 'react';
import { 
  ClipboardList, 
  MessageSquare, 
  UserCheck, 
  XCircle, 
  Search, 
  Calendar, 
  MapPin, 
  School, 
  Clock, 
  Phone, 
  User, 
  Bus, 
  Check, 
  DollarSign, 
  Sparkles,
  ChevronRight,
  Filter,
  Trash2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { Lead, Vehicle, Student } from '../types';
import { doc, updateDoc, addDoc, collection, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

export function LeadsView() {
  const { profile } = useAuth();
  const driverId = profile?.id || '';
  
  const { data: leads, loading: loadingLeads } = useFirestore<Lead>(driverId ? `drivers/${driverId}/leads` : '');
  const { data: vehicles } = useFirestore<Vehicle>(driverId ? `drivers/${driverId}/vehicles` : '');

  const [activeTab, setActiveTab] = useState<'Todos' | 'Pendente' | 'Em Contato' | 'Convertido' | 'Recusado'>('Pendente');
  const [searchTerm, setSearchTerm] = useState('');

  // Conversion Modal State
  const [convertModalLead, setConvertModalLead] = useState<Lead | null>(null);
  const [convertValue, setConvertValue] = useState<number>(200);
  const [convertVehicleId, setConvertVehicleId] = useState<string>('');
  const [convertSeat, setConvertSeat] = useState<number>(1);
  const [convertPaymentDay, setConvertPaymentDay] = useState<number>(10);
  const [isConverting, setIsConverting] = useState(false);

  const filteredLeads = leads.filter(l => {
    const matchesTab = activeTab === 'Todos' || l.status === activeTab;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      l.childName?.toLowerCase().includes(searchLower) ||
      l.parentName?.toLowerCase().includes(searchLower) ||
      l.schoolName?.toLowerCase().includes(searchLower) ||
      l.school?.toLowerCase().includes(searchLower) ||
      l.phone?.includes(searchTerm);
    return matchesTab && matchesSearch;
  }).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  const pendingCount = leads.filter(l => l.status === 'Pendente').length;
  const contactingCount = leads.filter(l => l.status === 'Em Contato').length;
  const convertedCount = leads.filter(l => l.status === 'Convertido').length;
  const rejectedCount = leads.filter(l => l.status === 'Recusado').length;

  const handleOpenWhatsApp = async (lead: Lead) => {
    const cleanPhone = (lead.phone || '').replace(/\D/g, '');
    const vehicleName = lead.vehicleName ? `na van ${lead.vehicleName}` : 'no transporte escolar';
    const msg = `Olá ${lead.parentName}! Sou o motorista da van no SchoolVan. Recebi sua solicitação de vaga para o(a) ${lead.childName} na escola ${lead.schoolName || lead.school || ''}. Gostaria de confirmar alguns detalhes da rota. Podemos conversar?`;
    
    // Auto update status to 'Em Contato' if it was 'Pendente'
    if (lead.status === 'Pendente' && driverId) {
      try {
        const leadRef = doc(db, 'drivers', driverId, 'leads', lead.id);
        await updateDoc(leadRef, { status: 'Em Contato' });
      } catch (err) {
        console.error('Erro ao atualizar status do lead:', err);
      }
    }

    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleStartConversion = (lead: Lead) => {
    setConvertModalLead(lead);
    setConvertValue(lead.value || 200);
    setConvertVehicleId(lead.vehicleId || (vehicles[0]?.id || ''));
    setConvertSeat(1);
    setConvertPaymentDay(10);
  };

  const handleConfirmConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertModalLead || !driverId) return;

    setIsConverting(true);

    try {
      // 1. Create student document
      const newStudentData: Omit<Student, 'id'> = {
        driverId,
        name: convertModalLead.childName,
        parentName: convertModalLead.parentName,
        parentEmail: convertModalLead.email || '',
        parentPhone: convertModalLead.phone,
        tel1: convertModalLead.phone,
        studentAddress: convertModalLead.studentAddress || convertModalLead.address || '',
        schoolAddress: convertModalLead.schoolAddress || '',
        schoolName: convertModalLead.schoolName || convertModalLead.school || '',
        entryTime: convertModalLead.entryTime || '07:00',
        exitTime: convertModalLead.exitTime || '12:00',
        value: convertValue,
        vehicleId: convertVehicleId,
        seat: convertSeat,
        paymentDay: convertPaymentDay,
        status: 'Ativo',
        boardingStatus: 'Casa',
        lastCheck: new Date().toISOString()
      };

      await addDoc(collection(db, 'drivers', driverId, 'students'), newStudentData);

      // 2. Update lead status to 'Convertido'
      const leadRef = doc(db, 'drivers', driverId, 'leads', convertModalLead.id);
      await updateDoc(leadRef, {
        status: 'Convertido',
        value: convertValue
      });

      toast.success(`Parabéns! ${convertModalLead.childName} foi convertido(a) em aluno ativo! 🎉`);
      setConvertModalLead(null);
    } catch (err) {
      console.error('Erro ao converter lead em aluno:', err);
      toast.error('Erro ao converter lead. Tente novamente.');
    } finally {
      setIsConverting(false);
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: Lead['status']) => {
    if (!driverId) return;
    try {
      const leadRef = doc(db, 'drivers', driverId, 'leads', leadId);
      await updateDoc(leadRef, { status: newStatus });
      toast.success(`Status da solicitação alterado para "${newStatus}".`);
    } catch (err) {
      console.error('Erro ao alterar status:', err);
      toast.error('Erro ao atualizar solicitação.');
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!driverId) return;
    if (!window.confirm('Tem certeza que deseja excluir esta solicitação?')) return;

    try {
      const leadRef = doc(db, 'drivers', driverId, 'leads', leadId);
      await deleteDoc(leadRef);
      toast.success('Solicitação removida.');
    } catch (err) {
      console.error('Erro ao excluir solicitação:', err);
      toast.error('Erro ao remover solicitação.');
    }
  };

  if (loadingLeads) {
    return (
      <div className="p-8 text-center text-gray-500 font-bold">
        Carregando solicitações de vaga...
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="bg-yellow-400 text-gray-950 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
            Marketplace & Captação de Alunos
          </span>
          <h2 className="text-3xl font-black text-gray-900 mt-1">
            Solicitações de Vagas (Leads)
          </h2>
          <p className="text-xs text-gray-500">
            Pais que solicitaram vaga no Marketplace. Entre em contato via WhatsApp e converta em alunos ativos.
          </p>
        </div>

        {/* Status Counters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <div className="bg-yellow-50 border border-yellow-200 px-3 py-1.5 rounded-xl text-xs font-black text-yellow-800 flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            {pendingCount} Pendentes
          </div>
          <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-black text-blue-800 flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            {contactingCount} Em Contato
          </div>
          <div className="bg-green-50 border border-green-200 px-3 py-1.5 rounded-xl text-xs font-black text-green-800 flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {convertedCount} Convertidos
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-1">
            {(['Pendente', 'Em Contato', 'Convertido', 'Recusado', 'Todos'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                  activeTab === tab
                    ? "bg-gray-900 text-yellow-400 shadow-md"
                    : "text-gray-500 hover:bg-gray-100"
                )}
              >
                {tab === 'Pendente' && `Pendentes (${pendingCount})`}
                {tab === 'Em Contato' && `Em Contato (${contactingCount})`}
                {tab === 'Convertido' && `Convertidos (${convertedCount})`}
                {tab === 'Recusado' && `Recusados (${rejectedCount})`}
                {tab === 'Todos' && `Todos (${leads.length})`}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="Buscar aluno, pai ou escola..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-yellow-400 outline-none"
            />
          </div>

        </div>
      </div>

      {/* Leads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLeads.map((lead) => {
          const isPending = lead.status === 'Pendente';
          const isContacting = lead.status === 'Em Contato';
          const isConverted = lead.status === 'Convertido';
          const isRejected = lead.status === 'Recusado';

          return (
            <div 
              key={lead.id}
              className={cn(
                "bg-white rounded-3xl p-6 border shadow-sm transition-all flex flex-col justify-between space-y-4 relative overflow-hidden",
                isPending ? "border-yellow-300 ring-2 ring-yellow-400/20" :
                isContacting ? "border-blue-200" :
                isConverted ? "border-green-200 bg-green-50/20" :
                "border-gray-200 opacity-75"
              )}
            >
              {/* Card Header Tag */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                  isPending ? "bg-yellow-100 text-yellow-900 border-yellow-300" :
                  isContacting ? "bg-blue-100 text-blue-900 border-blue-300" :
                  isConverted ? "bg-green-100 text-green-900 border-green-300" :
                  "bg-red-100 text-red-800 border-red-200"
                )}>
                  {lead.status}
                </span>

                <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                  <Calendar size={12} />
                  {lead.date ? new Date(lead.date).toLocaleDateString('pt-BR') : 'Recente'}
                </span>
              </div>

              {/* Student & Parent Info */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-black text-gray-900 flex items-center gap-1.5">
                    <User size={18} className="text-yellow-600 shrink-0" />
                    {lead.childName}
                  </h3>
                  <div className="text-xs text-gray-500 font-bold mt-0.5">
                    Responsável: <span className="text-gray-900">{lead.parentName}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-gray-600 bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2">
                    <School size={14} className="text-yellow-600 shrink-0" />
                    <span className="font-bold text-gray-800">{lead.schoolName || lead.school || 'Escola não especificada'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-yellow-600 shrink-0" />
                    <span className="truncate">{lead.studentAddress || lead.address || 'Endereço não informado'}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-gray-200/60">
                    <Clock size={14} className="text-yellow-600 shrink-0" />
                    <span>Turno: <strong>{lead.shift || 'Manhã'}</strong> ({lead.entryTime || '07:00'} / {lead.exitTime || '12:00'})</span>
                  </div>

                  {lead.notes && (
                    <div className="text-[11px] text-gray-500 italic pt-1 border-t border-gray-200/60">
                      "{lead.notes}"
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                {/* 1. WhatsApp Button */}
                <button
                  onClick={() => handleOpenWhatsApp(lead)}
                  className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white font-extrabold rounded-xl text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <MessageSquare size={16} />
                  <span>Chamar no WhatsApp ({lead.phone})</span>
                </button>

                {/* 2. Convert to Student Button */}
                {!isConverted && (
                  <button
                    onClick={() => handleStartConversion(lead)}
                    className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <UserCheck size={16} />
                    <span>Converter em Aluno Ativo</span>
                  </button>
                )}

                {/* Secondary Actions */}
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  {!isRejected && !isConverted && (
                    <button
                      onClick={() => handleUpdateStatus(lead.id, 'Recusado')}
                      className="text-gray-400 hover:text-red-600 font-bold transition-colors cursor-pointer"
                    >
                      Marcar Recusado
                    </button>
                  )}

                  {isRejected && (
                    <button
                      onClick={() => handleUpdateStatus(lead.id, 'Pendente')}
                      className="text-gray-400 hover:text-yellow-600 font-bold transition-colors cursor-pointer"
                    >
                      Reativar Solicitação
                    </button>
                  )}

                  <button
                    onClick={() => handleDeleteLead(lead.id)}
                    className="text-gray-400 hover:text-red-600 font-bold transition-colors cursor-pointer ml-auto flex items-center gap-1"
                  >
                    <Trash2 size={13} /> Excluir
                  </button>
                </div>
              </div>

            </div>
          );
        })}

        {filteredLeads.length === 0 && (
          <div className="col-span-full py-16 bg-white rounded-3xl border border-gray-100 text-center space-y-3">
            <ClipboardList size={40} className="mx-auto text-gray-300" />
            <h3 className="text-lg font-bold text-gray-800">Nenhuma solicitação encontrada</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              {activeTab === 'Pendente' 
                ? 'Você não possui solicitações de vaga pendentes no momento. Divulgue sua van no Marketplace!' 
                : 'Nenhum lead com este filtro.'}
            </p>
          </div>
        )}
      </div>

      {/* CONVERT LEAD TO STUDENT MODAL */}
      {convertModalLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-lg w-full p-6 md:p-8 shadow-2xl space-y-6 relative">
            <button
              onClick={() => setConvertModalLead(null)}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-700 bg-gray-100 rounded-full cursor-pointer"
            >
              <XCircle size={20} />
            </button>

            <div>
              <span className="bg-green-100 text-green-800 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                Fechou Negócio?
              </span>
              <h3 className="text-2xl font-black text-gray-900 mt-2">
                Convertendo Lead em Aluno
              </h3>
              <p className="text-xs text-gray-500">
                Os dados preenchidos pelo responsável serão usados para cadastrar <strong className="text-gray-900">{convertModalLead.childName}</strong> na sua frota.
              </p>
            </div>

            <form onSubmit={handleConfirmConversion} className="space-y-4">
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-100 text-xs space-y-1">
                <div><strong>Aluno:</strong> {convertModalLead.childName}</div>
                <div><strong>Responsável:</strong> {convertModalLead.parentName} ({convertModalLead.phone})</div>
                <div><strong>Escola:</strong> {convertModalLead.schoolName || convertModalLead.school || '-'}</div>
                <div><strong>Endereço:</strong> {convertModalLead.studentAddress || convertModalLead.address || '-'}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Valor da Mensalidade (R$) *
                </label>
                <input 
                  type="number"
                  required
                  min={0}
                  value={convertValue}
                  onChange={(e) => setConvertValue(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-yellow-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Atribuir à Van
                  </label>
                  <select
                    value={convertVehicleId}
                    onChange={(e) => setConvertVehicleId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-yellow-400 outline-none"
                  >
                    <option value="">Nenhuma Van Selecionada</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.capacity} lug.)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Número do Assento
                  </label>
                  <input 
                    type="number"
                    min={1}
                    max={60}
                    value={convertSeat}
                    onChange={(e) => setConvertSeat(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-yellow-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Dia de Vencimento da Mensalidade
                </label>
                <select
                  value={convertPaymentDay}
                  onChange={(e) => setConvertPaymentDay(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-yellow-400 outline-none"
                >
                  {[5, 10, 15, 20, 25, 30].map(d => (
                    <option key={d} value={d}>Dia {d}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isConverting}
                  className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white font-black rounded-2xl text-xs transition-all shadow-xl active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Sparkles size={16} />
                  <span>{isConverting ? 'Ativando Aluno...' : 'CONFIRMAR E ATIVAR ALUNO'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
