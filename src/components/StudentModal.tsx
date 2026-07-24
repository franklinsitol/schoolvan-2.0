import React, { useState } from 'react';
import { X, Save, User, Mail, Phone, MapPin, School, Clock, Armchair } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { Student, Vehicle } from '../types';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverId: string;
  vehicles: Vehicle[];
  student?: Student | null;
}

export function StudentModal({ isOpen, onClose, driverId, vehicles, student }: StudentModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Student>>(
    student || {
      name: '',
      parentName: '',
      parentEmail: '',
      parentPhone: '',
      studentAddress: '',
      schoolAddress: '',
      schoolName: '',
      value: 0,
      status: 'Ativo',
      boardingStatus: 'Casa',
      entryTime: '',
      exitTime: '',
      paymentDay: 10,
      vehicleId: vehicles[0]?.id || '',
      seat: 0,
    }
  );

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const studentData = {
        ...formData,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 bg-yellow-400 flex items-center justify-between">
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <User /> {student ? 'Editar Aluno' : 'Novo Aluno'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Informações do Aluno</h3>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 ml-1">Nome do Aluno</label>
                <input
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 ml-1">Escola</label>
                <div className="relative">
                  <School className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none"
                    placeholder="Nome da Escola"
                    value={formData.schoolName}
                    onChange={e => setFormData({ ...formData, schoolName: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Parent Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Responsável</h3>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 ml-1">Nome do Responsável</label>
                <input
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none"
                  value={formData.parentName}
                  onChange={e => setFormData({ ...formData, parentName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 ml-1">E-mail (Para acesso ao App)</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    required
                    type="email"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none"
                    value={formData.parentEmail}
                    onChange={e => setFormData({ ...formData, parentEmail: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Logistics */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Logística</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 ml-1">Entrada</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="time"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none"
                      value={formData.entryTime}
                      onChange={e => setFormData({ ...formData, entryTime: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 ml-1">Saída</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="time"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none"
                      value={formData.exitTime}
                      onChange={e => setFormData({ ...formData, exitTime: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 ml-1">Van Designada</label>
                <select
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none"
                  value={formData.vehicleId}
                  onChange={e => setFormData({ ...formData, vehicleId: e.target.value })}
                >
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                  {vehicles.length === 0 && <option value="">Nenhuma Van cadastrada</option>}
                </select>
              </div>
            </div>

            {/* Financial */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Financeiro</h3>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 ml-1">Mensalidade (R$)</label>
                <input
                  type="number"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none"
                  value={formData.value}
                  onChange={e => setFormData({ ...formData, value: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 ml-1">Dia de Vencimento</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-yellow-400 outline-none"
                  value={formData.paymentDay}
                  onChange={e => setFormData({ ...formData, paymentDay: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              disabled={loading}
              className="w-full py-4 bg-gray-900 text-yellow-400 font-black rounded-3xl shadow-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={20} /> {student ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR ALUNO'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
