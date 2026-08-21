import React, { useState, useEffect } from 'react';
import { X, Save, User, Mail, Phone, MapPin, School, Clock, Armchair, BookOpen, Users, DollarSign, Calendar, Shield, MessageSquare, Send } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { Student, Vehicle } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { checkCanAddStudent } from '../lib/plans';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';
import { SchoolAutocompleteInput } from './SchoolAutocompleteInput';
import { saveOrUpdateGlobalSchool } from '../services/schoolsService';
import { AskParentUpdateModal } from './AskParentUpdateModal';
import toast from 'react-hot-toast';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverId: string;
  vehicles: Vehicle[];
  student?: Student | null;
  onOpenUpgradeModal?: (reason: string) => void;
}

export function StudentModal({ isOpen, onClose, driverId, vehicles, student, onOpenUpgradeModal }: StudentModalProps) {
  const { profile } = useAuth();
  const { data: existingStudents } = useFirestore<Student>(driverId ? `drivers/${driverId}/students` : '');
  const [loading, setLoading] = useState(false);
  const [isAskParentModalOpen, setIsAskParentModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Student>>({
    name: '',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    studentAddress: '',
    schoolAddress: '',
    schoolName: '',
    grade: '',
    shift: 'Manhã',
    prof1: '',
    prof2: '',
    resp1: '',
    resp2: '',
    tel1: '',
    tel2: '',
    tel3: '',
    value: 350,
    status: 'Ativo',
    boardingStatus: 'Casa',
    entryTime: '07:00',
    exitTime: '12:00',
    paymentDay: 10,
    vehicleId: vehicles[0]?.id || '',
    seat: 1,
    parentAccess: true,
  });

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || '',
        parentName: student.parentName || '',
        parentEmail: student.parentEmail || '',
        parentPhone: student.parentPhone || student.tel1 || '',
        studentAddress: student.studentAddress || '',
        schoolAddress: student.schoolAddress || '',
        schoolName: student.schoolName || '',
        grade: student.grade || '',
        shift: student.shift || (student.grade?.toLowerCase().includes('tarde') ? 'Tarde' : student.grade?.toLowerCase().includes('integral') ? 'Integral' : 'Manhã'),
        prof1: student.prof1 || '',
        prof2: student.prof2 || '',
        resp1: student.resp1 || '',
        resp2: student.resp2 || '',
        tel1: student.tel1 || student.parentPhone || '',
        tel2: student.tel2 || '',
        tel3: student.tel3 || '',
        value: student.value !== undefined ? student.value : 350,
        status: student.status || 'Ativo',
        boardingStatus: student.boardingStatus || 'Casa',
        entryTime: student.entryTime || '07:00',
        exitTime: student.exitTime || '12:00',
        paymentDay: student.paymentDay || 10,
        vehicleId: student.vehicleId || vehicles[0]?.id || '',
        seat: student.seat || 1,
        parentAccess: student.parentAccess !== false,
      });
    } else {
      setFormData({
        name: '',
        parentName: '',
        parentEmail: '',
        parentPhone: '',
        studentAddress: '',
        schoolAddress: '',
        schoolName: '',
        grade: '',
        shift: 'Manhã',
        prof1: '',
        prof2: '',
        resp1: '',
        resp2: '',
        tel1: '',
        tel2: '',
        tel3: '',
        value: 350,
        status: 'Ativo',
        boardingStatus: 'Casa',
        entryTime: '07:00',
        exitTime: '12:00',
        paymentDay: 10,
        vehicleId: vehicles[0]?.id || '',
        seat: 1,
        parentAccess: true,
      });
    }
  }, [student, vehicles]);

  if (!isOpen) return null;

  const selectedVehicle = vehicles.find(v => v.id === formData.vehicleId);
  const maxSeats = selectedVehicle?.capacity || 20;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Strict validation for required fields that interfere with other modules
    if (!formData.name?.trim()) {
      toast.error('Nome do aluno é obrigatório!');
      return;
    }

    if (!formData.shift?.trim()) {
      toast.error('Turno é obrigatório (interfere na separação das rotas)!');
      return;
    }

    if (!formData.studentAddress?.trim()) {
      toast.error('Endereço da residência é obrigatório (interfere no GPS da rota)!');
      return;
    }

    if (!formData.schoolName?.trim()) {
      toast.error('Nome da escola é obrigatório (interfere na rota)!');
      return;
    }

    if (!formData.schoolAddress?.trim()) {
      toast.error('Endereço da escola é obrigatório (interfere no GPS da rota)!');
      return;
    }

    if (!formData.parentName?.trim()) {
      toast.error('Nome do responsável é obrigatório!');
      return;
    }

    const cleanPhone = (formData.parentPhone || formData.tel1 || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error('WhatsApp do responsável é obrigatório (interfere na cobrança por Zap)!');
      return;
    }

    if (!formData.parentEmail?.trim() || !formData.parentEmail.includes('@')) {
      toast.error('E-mail do responsável é obrigatório (interfere no acesso dos pais)!');
      return;
    }

    const parsedValue = Number(formData.value);
    if (isNaN(parsedValue) || parsedValue < 0) {
      toast.error('Valor da mensalidade é obrigatório (interfere no financeiro)!');
      return;
    }

    const parsedPaymentDay = Number(formData.paymentDay);
    if (isNaN(parsedPaymentDay) || parsedPaymentDay < 1 || parsedPaymentDay > 31) {
      toast.error('Dia do vencimento deve ser entre 1 e 31!');
      return;
    }

    // Check student limit on creation
    if (!student?.id) {
      const allowed = checkCanAddStudent(profile, existingStudents.length, onOpenUpgradeModal);
      if (!allowed) {
        onClose();
        return;
      }
    }

    setLoading(true);

    try {
      const studentData = {
        ...formData,
        value: parsedValue,
        paymentDay: parsedPaymentDay,
        parentPhone: formData.parentPhone || formData.tel1 || '',
        tel1: formData.parentPhone || formData.tel1 || '',
        shift: formData.shift || 'Manhã',
        driverId,
        updatedAt: new Date().toISOString(),
      };

      if (student?.id) {
        await updateDoc(doc(db, `drivers/${driverId}/students`, student.id), studentData);
        toast.success('Aluno atualizado com sucesso!');
      } else {
        await addDoc(collection(db, `drivers/${driverId}/students`), {
          ...studentData,
          createdAt: new Date().toISOString(),
          boardingStatus: 'Casa',
          status: 'Ativo'
        });
        toast.success('Aluno cadastrado com sucesso!');
      }

      // Automatically register/update this school in the global collective schools database
      if (formData.schoolName && formData.schoolAddress) {
        saveOrUpdateGlobalSchool({
          name: formData.schoolName,
          address: formData.schoolAddress,
          driverId,
          driverName: profile?.name,
        }).catch((err) => console.warn('Could not sync school globally:', err));
      }

      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar aluno.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-yellow-400 to-amber-400 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-black/10 flex items-center justify-center text-gray-900 font-bold">
              <User size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">
                {student ? 'Editar Informações do Aluno' : 'Novo Cadastro de Aluno'}
              </h2>
              <p className="text-xs font-semibold text-gray-800 opacity-90">
                Campos com * são obrigatórios e alimentam as rotas, GPS, cobranças e portal dos pais
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-black/10 rounded-full transition-colors text-gray-900 cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 md:p-8 overflow-y-auto space-y-8">
          {/* 📲 WhatsApp Parent Self-Update Request Banner */}
          {student && (
            <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-emerald-950">
                    Pedir para o Responsável Atualizar o Cadastro
                  </h4>
                  <p className="text-[11px] text-emerald-700 font-medium">
                    Envie um link seguro no WhatsApp para o pai/mãe preencher endereço, escola, contatos e alergias.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAskParentModalOpen(true)}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              >
                <Send size={13} />
                <span>Enviar no WhatsApp</span>
              </button>
            </div>
          )}
          
          {/* Section 1: Dados do Aluno */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="text-yellow-500" size={18} />
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">1. Informações do Aluno & Turno</h3>
              </div>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                Interfere na Rota & GPS
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-black text-gray-700 ml-1 flex items-center gap-1">
                  Nome Completo do Aluno <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 focus:border-yellow-500 outline-none text-sm font-bold text-gray-900"
                  placeholder="Ex: Gabriel Toledo"
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-gray-700 ml-1 flex items-center gap-1">
                  Turno Escolar <span className="text-red-500">*</span>
                  <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1 rounded">(Filtra a Rota)</span>
                </label>
                <select
                  required
                  className="w-full px-4 py-3 bg-yellow-50/70 border-2 border-yellow-300 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-black text-gray-950 cursor-pointer"
                  value={formData.shift || 'Manhã'}
                  onChange={e => {
                    const s = e.target.value;
                    setFormData({
                      ...formData,
                      shift: s,
                      entryTime: s === 'Tarde' ? '13:00' : '07:00',
                      exitTime: s === 'Tarde' ? '18:00' : '12:00',
                    });
                  }}
                >
                  <option value="Manhã">🌅 Manhã (Entrada Cedo)</option>
                  <option value="Tarde">🌇 Tarde (Entrada Meio-dia)</option>
                  <option value="Integral">☀️ Integral (Dia Todo)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Série / Ano Escolar</label>
                <input
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                  placeholder="Ex: 5º Ano B"
                  value={formData.grade || ''}
                  onChange={e => setFormData({ ...formData, grade: e.target.value })}
                />
              </div>

              <div className="md:col-span-2">
                <AddressAutocompleteInput
                  label="Endereço da Residência (Embarque Casa)"
                  helperBadge="GPS Rota"
                  required
                  placeholder="Digite rua, número, bairro e cidade (ou CEP)..."
                  value={formData.studentAddress || ''}
                  onChange={(val) => setFormData({ ...formData, studentAddress: val })}
                />
              </div>

              <div className="md:col-span-2">
                <SchoolAutocompleteInput
                  label="Nome da Escola"
                  helperBadge="Banco Coletivo • Auto-preenche"
                  required
                  placeholder="Comece a digitar (ex: Objetivo, Bandeirantes, Santos...)"
                  value={formData.schoolName || ''}
                  schoolAddress={formData.schoolAddress}
                  onChange={(val) => setFormData(prev => ({ ...prev, schoolName: val }))}
                  onSelectSchool={(school) => {
                    setFormData(prev => ({
                      ...prev,
                      schoolName: school.name,
                      schoolAddress: school.address || prev.schoolAddress,
                    }));
                    if (school.address) {
                      toast.success(`Endereço da escola preenchido automaticamente!`, { icon: '🏫' });
                    }
                  }}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Professora 1</label>
                <input
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                  placeholder="Ex: Profe Cláudia"
                  value={formData.prof1 || ''}
                  onChange={e => setFormData({ ...formData, prof1: e.target.value })}
                />
              </div>

              <div className="md:col-span-3">
                <AddressAutocompleteInput
                  label="Endereço Completo da Escola"
                  helperBadge="Desembarque GPS"
                  required
                  isSchool
                  placeholder="Digite o endereço da escola, bairro ou CEP..."
                  value={formData.schoolAddress || ''}
                  onChange={(val) => setFormData({ ...formData, schoolAddress: val })}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Responsáveis e Contatos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <Users className="text-yellow-500" size={18} />
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">2. Responsáveis, Cobrança & Acesso</h3>
              </div>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                Cobrança Zap & App dos Pais
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-700 ml-1 flex items-center gap-1">
                  Nome do Responsável Principal <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-bold text-gray-900"
                  placeholder="Ex: Cristiane Toledo (Mãe)"
                  value={formData.parentName || ''}
                  onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-gray-700 ml-1 flex items-center gap-1">
                  Celular / WhatsApp Principal <span className="text-red-500">*</span>
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1 rounded">(Cobrança no Zap)</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    required
                    className="w-full pl-12 pr-4 py-3 bg-emerald-50/50 border-2 border-emerald-300 rounded-2xl focus:ring-2 focus:ring-emerald-400 outline-none text-sm font-black text-gray-950"
                    placeholder="(11) 99999-9999"
                    value={formData.parentPhone || formData.tel1 || ''}
                    onChange={e => setFormData({ ...formData, parentPhone: e.target.value, tel1: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-black text-gray-700 ml-1 flex items-center gap-1">
                  E-mail do Responsável <span className="text-red-500">*</span>
                  <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-1 rounded">(Login/Acesso no App dos Pais)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    required
                    type="email"
                    className="w-full pl-12 pr-4 py-3 bg-blue-50/50 border-2 border-blue-300 rounded-2xl focus:ring-2 focus:ring-blue-400 outline-none text-sm font-bold text-gray-950"
                    placeholder="exemplo@gmail.com"
                    value={formData.parentEmail || ''}
                    onChange={e => setFormData({ ...formData, parentEmail: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Telefone 2 (Adicional / Recado)</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                    placeholder="Opcional"
                    value={formData.tel2 || ''}
                    onChange={e => setFormData({ ...formData, tel2: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Responsável Extra (Pai/Avô)</label>
                <input
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                  placeholder="Ex: Carlos (Pai) - (11) 98888-8888"
                  value={formData.resp1 || ''}
                  onChange={e => setFormData({ ...formData, resp1: e.target.value })}
                />
              </div>
            </div>

            <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-200 flex items-center justify-between mt-2">
              <div className="flex items-center gap-3">
                <Shield className="text-yellow-600" size={20} />
                <div>
                  <div className="text-xs font-bold text-gray-900">Acesso ao App dos Pais Habilitado</div>
                  <div className="text-[11px] text-gray-600">O responsável usa o e-mail cadastrado acima para acessar o rastreio e enviar avisos de faltas.</div>
                </div>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-gray-300 text-yellow-500 focus:ring-yellow-400 cursor-pointer"
                checked={formData.parentAccess !== false}
                onChange={e => setFormData({ ...formData, parentAccess: e.target.checked })}
              />
            </div>
          </div>

          {/* Section 3: Logística & Van */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <Clock className="text-yellow-500" size={18} />
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">3. Logística, Horários & Van</h3>
              </div>
              <span className="text-[11px] font-bold text-purple-800 bg-purple-100 px-2.5 py-0.5 rounded-full">
                Horários da Rota
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-700 ml-1 flex items-center gap-1">
                  Horário Entrada <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-bold text-gray-900"
                  value={formData.entryTime || '07:00'}
                  onChange={e => setFormData({ ...formData, entryTime: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-gray-700 ml-1 flex items-center gap-1">
                  Horário Saída <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-bold text-gray-900"
                  value={formData.exitTime || '12:00'}
                  onChange={e => setFormData({ ...formData, exitTime: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Van Designada</label>
                <select
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                  value={formData.vehicleId || ''}
                  onChange={e => setFormData({ ...formData, vehicleId: e.target.value })}
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                  {vehicles.length === 0 && <option value="">Nenhuma Van Cadastrada</option>}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Número do Assento</label>
                <div className="relative">
                  <Armchair className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                    value={formData.seat || 1}
                    onChange={e => setFormData({ ...formData, seat: Number(e.target.value) })}
                  >
                    {Array.from({ length: maxSeats }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>Assento {num}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Financeiro */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <DollarSign className="text-yellow-500" size={18} />
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">4. Cobrança & Mensalidade</h3>
              </div>
              <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full">
                Interfere no Financeiro
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-700 ml-1 flex items-center gap-1">
                  Valor Mensal (R$) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-black text-gray-900"
                    placeholder="350.00"
                    value={formData.value !== undefined && formData.value !== null ? formData.value : ''}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData({ ...formData, value: val === '' ? ('' as any) : Number(val) });
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-gray-700 ml-1 flex items-center gap-1">
                  Dia do Vencimento (1 a 31) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-black text-gray-900"
                    placeholder="10"
                    value={formData.paymentDay !== undefined && formData.paymentDay !== null ? formData.paymentDay : ''}
                    onChange={e => {
                      const val = e.target.value;
                      setFormData({ ...formData, paymentDay: val === '' ? ('' as any) : Number(val) });
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-4 shrink-0">
            <button
              disabled={loading}
              className="w-full py-4 bg-gray-900 text-yellow-400 font-black rounded-3xl shadow-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98 cursor-pointer"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={20} /> {student ? 'SALVAR ALTERAÇÕES DO ALUNO' : 'CONFIRMAR CADASTRO DE ALUNO'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Ask Parent Update Modal */}
      {student && (
        <AskParentUpdateModal
          isOpen={isAskParentModalOpen}
          onClose={() => setIsAskParentModalOpen(false)}
          student={student}
          driverId={driverId}
          driverName={profile?.name}
          driverPhone={profile?.phone}
        />
      )}
    </div>
  );
}

