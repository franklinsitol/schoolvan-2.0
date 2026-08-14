import React, { useState, useEffect } from 'react';
import { X, Save, User, Mail, Phone, MapPin, School, Clock, Armchair, BookOpen, Users, DollarSign, Calendar, Shield } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { Student, Vehicle } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { checkCanAddStudent } from '../lib/plans';
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
  const [formData, setFormData] = useState<Partial<Student>>({
    name: '',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    studentAddress: '',
    schoolAddress: '',
    schoolName: '',
    grade: '',
    prof1: '',
    prof2: '',
    resp1: '',
    resp2: '',
    tel1: '',
    tel2: '',
    tel3: '',
    value: 0,
    status: 'Ativo',
    boardingStatus: 'Casa',
    entryTime: '',
    exitTime: '',
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
        prof1: student.prof1 || '',
        prof2: student.prof2 || '',
        resp1: student.resp1 || '',
        resp2: student.resp2 || '',
        tel1: student.tel1 || student.parentPhone || '',
        tel2: student.tel2 || '',
        tel3: student.tel3 || '',
        value: student.value || 0,
        status: student.status || 'Ativo',
        boardingStatus: student.boardingStatus || 'Casa',
        entryTime: student.entryTime || '',
        exitTime: student.exitTime || '',
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
        prof1: '',
        prof2: '',
        resp1: '',
        resp2: '',
        tel1: '',
        tel2: '',
        tel3: '',
        value: 0,
        status: 'Ativo',
        boardingStatus: 'Casa',
        entryTime: '',
        exitTime: '',
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
      const parsedValue = Number(formData.value);
      const finalValue = isNaN(parsedValue) || parsedValue < 0 ? 0 : parsedValue;
      const parsedPaymentDay = Number(formData.paymentDay);
      const finalPaymentDay = isNaN(parsedPaymentDay) || parsedPaymentDay < 1 ? 10 : Math.min(31, parsedPaymentDay);

      const studentData = {
        ...formData,
        value: finalValue,
        paymentDay: finalPaymentDay,
        parentPhone: formData.parentPhone || formData.tel1 || '',
        tel1: formData.parentPhone || formData.tel1 || '',
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
              <p className="text-xs font-semibold text-gray-800 opacity-80">Preencha os dados completos do aluno e responsáveis</p>
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
          
          {/* Section 1: Dados do Aluno */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <BookOpen className="text-yellow-500" size={18} />
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">1. Informações do Aluno</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Nome Completo do Aluno *</label>
                <input
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                  placeholder="Ex: Gabriel Toledo"
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Série / Ano</label>
                <input
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                  placeholder="Ex: 5º Ano B"
                  value={formData.grade || ''}
                  onChange={e => setFormData({ ...formData, grade: e.target.value })}
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Endereço da Residência (Casa)</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                    placeholder="Ex: Av. Brasil, 123 - Centro"
                    value={formData.studentAddress || ''}
                    onChange={e => setFormData({ ...formData, studentAddress: e.target.value })}
                  />
                </div>
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

              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Nome da Escola</label>
                <div className="relative">
                  <School className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                    placeholder="Ex: Colégio Objetivo"
                    value={formData.schoolName || ''}
                    onChange={e => setFormData({ ...formData, schoolName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Professora 2 (Opcional)</label>
                <input
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                  placeholder="Ex: Profe Maria"
                  value={formData.prof2 || ''}
                  onChange={e => setFormData({ ...formData, prof2: e.target.value })}
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Endereço da Escola</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                    placeholder="Ex: Rua das Flores, 500 - Gonzaga"
                    value={formData.schoolAddress || ''}
                    onChange={e => setFormData({ ...formData, schoolAddress: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Responsáveis e Contatos */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <Users className="text-yellow-500" size={18} />
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">2. Responsáveis & Contatos</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Responsável Principal (Financeiro) *</label>
                <input
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                  placeholder="Ex: Cristiane Toledo"
                  value={formData.parentName || ''}
                  onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">E-mail do Responsável (Acesso App) *</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    required
                    type="email"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                    placeholder="exemplo@gmail.com"
                    value={formData.parentEmail || ''}
                    onChange={e => setFormData({ ...formData, parentEmail: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Telefone / WhatsApp Principal *</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    required
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                    placeholder="(11) 99999-9999"
                    value={formData.parentPhone || formData.tel1 || ''}
                    onChange={e => setFormData({ ...formData, parentPhone: e.target.value, tel1: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Telefone 2 (Adicional)</label>
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
                <label className="text-xs font-bold text-gray-600 ml-1">Responsável Extra 1</label>
                <input
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                  placeholder="Ex: Pai, Avó, Tio"
                  value={formData.resp1 || ''}
                  onChange={e => setFormData({ ...formData, resp1: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Responsável Extra 2 / Telefone 3</label>
                <input
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                  placeholder="Ex: Vovô Mario / (11) 98888-8888"
                  value={formData.resp2 || ''}
                  onChange={e => setFormData({ ...formData, resp2: e.target.value })}
                />
              </div>
            </div>

            <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-200 flex items-center justify-between mt-2">
              <div className="flex items-center gap-3">
                <Shield className="text-yellow-600" size={20} />
                <div>
                  <div className="text-xs font-bold text-gray-900">Acesso ao App dos Pais</div>
                  <div className="text-[11px] text-gray-600">Permite que os responsáveis façam login para ver rastreio e avisar faltas.</div>
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
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <Clock className="text-yellow-500" size={18} />
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">3. Logística de Transporte</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Horário Entrada</label>
                <input
                  type="time"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                  value={formData.entryTime || ''}
                  onChange={e => setFormData({ ...formData, entryTime: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Horário Saída</label>
                <input
                  type="time"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                  value={formData.exitTime || ''}
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
            <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
              <DollarSign className="text-yellow-500" size={18} />
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">4. Cobrança e Financeiro</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-600 ml-1">Valor Mensal (R$)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="number"
                    step="0.01"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
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
                <label className="text-xs font-bold text-gray-600 ml-1">Dia do Vencimento</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
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
    </div>
  );
}

