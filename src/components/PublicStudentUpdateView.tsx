import React, { useState, useEffect } from 'react';
import { 
  Bus, 
  User, 
  Calendar, 
  School, 
  Clock, 
  MapPin, 
  Phone, 
  Heart, 
  ShieldAlert, 
  CheckCircle2, 
  Save, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Send,
  MessageSquare,
  Building2,
  Loader2
} from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Student, Driver } from '../types';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';
import { SchoolAutocompleteInput } from './SchoolAutocompleteInput';
import { saveOrUpdateGlobalSchool } from '../services/schoolsService';
import toast from 'react-hot-toast';

interface PublicStudentUpdateViewProps {
  studentId: string;
  driverId: string;
  parentEmailParam?: string;
  onGoToApp: () => void;
}

export const PublicStudentUpdateView: React.FC<PublicStudentUpdateViewProps> = ({
  studentId,
  driverId,
  parentEmailParam,
  onGoToApp
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const [formData, setFormData] = useState<Partial<Student>>({
    name: '',
    birthDate: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    studentAddress: '',
    schoolName: '',
    schoolAddress: '',
    grade: '',
    shift: 'Manhã',
    entryTime: '07:00',
    exitTime: '12:00',
    prof1: '',
    resp1: '',
    resp2: '',
    tel1: '',
    tel2: '',
    tel3: '',
    medicalNotes: '',
    allergies: '',
    parentCpf: '',
    studentRg: ''
  });

  useEffect(() => {
    async function loadData() {
      if (!driverId || !studentId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Fetch student doc
        const studentDocRef = doc(db, 'drivers', driverId, 'students', studentId);
        const studentSnap = await getDoc(studentDocRef);

        if (studentSnap.exists()) {
          const stData = { id: studentSnap.id, ...studentSnap.data() } as Student;
          setStudent(stData);
          setFormData({
            name: stData.name || '',
            birthDate: stData.birthDate || '',
            parentName: stData.parentName || '',
            parentPhone: stData.parentPhone || stData.tel1 || '',
            parentEmail: stData.parentEmail || parentEmailParam || '',
            studentAddress: stData.studentAddress || '',
            schoolName: stData.schoolName || '',
            schoolAddress: stData.schoolAddress || '',
            grade: stData.grade || '',
            shift: stData.shift || 'Manhã',
            entryTime: stData.entryTime || '07:00',
            exitTime: stData.exitTime || '12:00',
            prof1: stData.prof1 || '',
            resp1: stData.resp1 || '',
            resp2: stData.resp2 || '',
            tel1: stData.tel1 || stData.parentPhone || '',
            tel2: stData.tel2 || '',
            tel3: stData.tel3 || '',
            medicalNotes: stData.medicalNotes || '',
            allergies: stData.allergies || '',
            parentCpf: stData.parentCpf || '',
            studentRg: stData.studentRg || ''
          });
        }

        // Fetch driver doc
        const driverDocRef = doc(db, 'drivers', driverId);
        const driverSnap = await getDoc(driverDocRef);
        if (driverSnap.exists()) {
          setDriver({ id: driverSnap.id, ...driverSnap.data() } as Driver);
        }
      } catch (err) {
        console.error('Erro ao carregar dados do aluno:', err);
        toast.error('Não foi possível carregar as informações do aluno.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [driverId, studentId, parentEmailParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name?.trim()) {
      toast.error('Nome do aluno é obrigatório!');
      return;
    }

    if (!formData.studentAddress?.trim()) {
      toast.error('Endereço da residência é obrigatório!');
      return;
    }

    if (!formData.schoolName?.trim()) {
      toast.error('Nome da escola é obrigatório!');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Salvando atualização...');

    try {
      if (formData.schoolName?.trim()) {
        try {
          await saveOrUpdateGlobalSchool({
            name: formData.schoolName.trim(),
            address: formData.schoolAddress?.trim() || '',
            driverId: driverId,
            driverName: driver?.name || 'Tio da Van'
          });
        } catch {
          // ignore
        }
      }

      const studentRef = doc(db, 'drivers', driverId, 'students', studentId);
      
      const payload: Partial<Student> = {
        name: formData.name.trim(),
        birthDate: formData.birthDate?.trim() || '',
        parentName: formData.parentName?.trim() || '',
        parentPhone: formData.parentPhone?.trim() || formData.tel1?.trim() || '',
        parentEmail: formData.parentEmail?.trim() || student?.parentEmail || '',
        studentAddress: formData.studentAddress.trim(),
        schoolName: formData.schoolName.trim(),
        schoolAddress: formData.schoolAddress?.trim() || '',
        grade: formData.grade?.trim() || '',
        shift: formData.shift || 'Manhã',
        entryTime: formData.entryTime || '07:00',
        exitTime: formData.exitTime || '12:00',
        prof1: formData.prof1?.trim() || '',
        resp1: formData.resp1?.trim() || '',
        resp2: formData.resp2?.trim() || '',
        tel1: formData.tel1?.trim() || formData.parentPhone?.trim() || '',
        tel2: formData.tel2?.trim() || '',
        tel3: formData.tel3?.trim() || '',
        medicalNotes: formData.medicalNotes?.trim() || '',
        allergies: formData.allergies?.trim() || '',
        parentCpf: formData.parentCpf?.trim() || '',
        studentRg: formData.studentRg?.trim() || '',
        updatedByParentAt: new Date().toISOString()
      };

      await updateDoc(studentRef, payload);
      toast.success('Cadastro atualizado com sucesso!', { id: toastId });
      setIsSuccess(true);
    } catch (err: any) {
      console.error('Erro ao salvar atualização pública:', err);
      toast.error('Erro ao salvar: ' + (err.message || 'Tente novamente.'), { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const handleNotifyDriverWhatsApp = () => {
    const driverPhone = driver?.phone || '';
    const cleanPhone = driverPhone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length >= 10 && !cleanPhone.startsWith('55') ? `55${cleanPhone}` : cleanPhone;
    
    const msg = `Olá Tio(a) ${driver?.name || 'da Van'}! Acabei de revisar e atualizar o cadastro de *${formData.name}* no SchoolVan. Qualquer dúvida estou à disposição! 👍🚐`;

    if (formattedPhone) {
      window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-gray-700">Carregando dados do aluno...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-[32px] border border-gray-200 shadow-xl max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert size={28} />
          </div>
          <h3 className="text-xl font-black text-gray-900">Cadastro não localizado</h3>
          <p className="text-xs text-gray-600">
            Não foi possível encontrar o registro deste aluno. Verifique com o motorista da van se o link está correto.
          </p>
          <button
            onClick={onGoToApp}
            className="w-full py-3 bg-gray-900 text-yellow-400 font-black text-xs rounded-2xl cursor-pointer"
          >
            Ir para a Página Inicial
          </button>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 sm:p-10 rounded-[36px] border border-gray-100 shadow-2xl max-w-lg w-full text-center space-y-6 animate-scale-up">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 size={42} />
          </div>

          <div className="space-y-2">
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
              Atualização Concluída
            </span>
            <h3 className="text-2xl font-black text-gray-900">
              Obrigado, {formData.parentName ? formData.parentName.split(' ')[0] : 'Responsável'}!
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              As informações de <strong>{formData.name}</strong> foram atualizadas com sucesso e sincronizadas em tempo real com a Van Escolar do <strong>{driver?.name || 'Tio da Van'}</strong>.
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-left text-xs space-y-1.5 text-gray-600">
            <p>• <strong>Escola:</strong> {formData.schoolName} ({formData.shift})</p>
            <p>• <strong>Residência:</strong> {formData.studentAddress}</p>
            <p>• <strong>WhatsApp:</strong> {formData.parentPhone || formData.tel1}</p>
          </div>

          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleNotifyDriverWhatsApp}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <MessageSquare size={16} />
              <span>Avisar Tio da Van no WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={onGoToApp}
              className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-2xl transition-all cursor-pointer"
            >
              Acessar SchoolVan
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-3 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Brand Header */}
        <div className="bg-gradient-to-r from-gray-900 via-gray-950 to-slate-900 text-white p-6 rounded-[32px] shadow-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-yellow-400 text-gray-950 flex items-center justify-center font-black shadow-md shrink-0">
              <Bus size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xs uppercase tracking-wider text-yellow-400">SchoolVan</span>
                <span className="text-[10px] bg-white/20 text-white font-bold px-2 py-0.5 rounded-full">Atualização</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white">Revisão Cadastral do Aluno</h2>
            </div>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-gray-400 uppercase font-bold block">Van Escolar:</span>
            <span className="text-xs font-black text-yellow-400">{driver?.name || 'Tio da Van'}</span>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-[36px] border border-gray-100 shadow-xl p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Intro text */}
            <div className="border-b border-gray-100 pb-4">
              <h3 className="text-base font-extrabold text-gray-900">
                Olá, {formData.parentName ? formData.parentName.split(' ')[0] : 'Responsável'}!
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Revise os dados de <strong>{formData.name || student.name}</strong> para mantermos a rota da van, GPS e contatos de emergência sempre corretos.
              </p>
            </div>

            {/* Section 1: Aluno */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <User className="text-yellow-500" size={18} />
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                  1. Dados do Passageiro
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-700 ml-1">
                    Nome Completo do Aluno <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-bold text-gray-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 ml-1">Data de Nascimento</label>
                  <input
                    type="date"
                    value={formData.birthDate || ''}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Residência */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <MapPin className="text-yellow-500" size={18} />
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                  2. Endereço da Residência (Embarque / Desembarque)
                </h4>
              </div>

              <AddressAutocompleteInput
                label="Endereço Completo com Número, Bairro e CEP"
                required
                value={formData.studentAddress || ''}
                onChange={(val) => setFormData({ ...formData, studentAddress: val })}
                placeholder="Ex: Rua das Flores, 123 - Apto 42, Centro, Santos - SP"
                helperBadge="Calcula o trajeto no GPS da van"
              />
            </div>

            {/* Section 3: Escola & Horários */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <School className="text-yellow-500" size={18} />
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                  3. Escola, Turno & Horários
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <SchoolAutocompleteInput
                    label="Escola / Colégio"
                    required
                    value={formData.schoolName || ''}
                    schoolAddress={formData.schoolAddress}
                    onChange={(name) => {
                      setFormData(prev => ({
                        ...prev,
                        schoolName: name,
                      }));
                    }}
                    onSelectSchool={(school) => {
                      setFormData(prev => ({
                        ...prev,
                        schoolName: school.name,
                        schoolAddress: school.address || prev.schoolAddress || ''
                      }));
                    }}
                    placeholder="Nome da escola"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 ml-1">Série / Ano</label>
                  <input
                    type="text"
                    value={formData.grade || ''}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    placeholder="Ex: 4º Ano Fundamental"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-700 ml-1">Turno</label>
                  <select
                    value={formData.shift || 'Manhã'}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-bold text-gray-900"
                  >
                    <option value="Manhã">Manhã</option>
                    <option value="Tarde">Tarde</option>
                    <option value="Integral">Integral</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 ml-1">Horário Entrada</label>
                  <input
                    type="time"
                    value={formData.entryTime || '07:00'}
                    onChange={(e) => setFormData({ ...formData, entryTime: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 ml-1">Horário Saída</label>
                  <input
                    type="time"
                    value={formData.exitTime || '12:00'}
                    onChange={(e) => setFormData({ ...formData, exitTime: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Telefones */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <Phone className="text-yellow-500" size={18} />
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                  4. Telefones & Contatos de Emergência
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-700 ml-1">Nome do Responsável</label>
                  <input
                    type="text"
                    value={formData.parentName || ''}
                    onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                    placeholder="Seu nome"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-bold text-gray-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-700 ml-1">WhatsApp Principal</label>
                  <input
                    type="tel"
                    value={formData.parentPhone || formData.tel1 || ''}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      parentPhone: e.target.value,
                      tel1: e.target.value 
                    })}
                    placeholder="(11) 99999-9999"
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-bold text-gray-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 ml-1">Segundo Responsável / Contato 2</label>
                  <input
                    type="text"
                    value={formData.resp2 || ''}
                    onChange={(e) => setFormData({ ...formData, resp2: e.target.value })}
                    placeholder="Nome do segundo contato"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-600 ml-1">Telefone Recado / Emergência</label>
                  <input
                    type="tel"
                    value={formData.tel2 || ''}
                    onChange={(e) => setFormData({ ...formData, tel2: e.target.value })}
                    placeholder="(11) 98888-8888"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Saúde & Cuidados */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                <Heart className="text-red-500" size={18} />
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">
                  5. Alergias, Saúde & Cuidados Especiais
                </h4>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 ml-1">Alergias ou Restrições:</label>
                  <input
                    type="text"
                    value={formData.allergies || ''}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                    placeholder="Ex: Picada de abelha, remédio X, intolerância à lactose..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-yellow-400 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-700 ml-1">Observações para o Tio da Van:</label>
                  <textarea
                    rows={2}
                    value={formData.medicalNotes || ''}
                    onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                    placeholder="Ex: Quem pode receber a criança no portão, cuidados no embarque..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-yellow-400 outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-yellow-400 font-black rounded-3xl shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98 cursor-pointer text-sm"
              >
                {saving ? (
                  <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={20} /> CONFIRMAR E SALVAR ATUALIZAÇÃO
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
