import React, { useState } from 'react';
import { X, Bus, CheckCircle2, MessageSquare, Send, MapPin, School, Clock, Phone, User, Home } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Vehicle } from '../types';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';
import { SchoolAutocompleteInput } from './SchoolAutocompleteInput';
import { saveOrUpdateGlobalSchool } from '../services/schoolsService';
import toast from 'react-hot-toast';

interface RequestVacancyModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
}

export function RequestVacancyModal({ isOpen, onClose, vehicle }: RequestVacancyModalProps) {
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [childName, setChildName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [schoolAddress, setSchoolAddress] = useState('');
  const [studentAddress, setStudentAddress] = useState('');
  const [shift, setShift] = useState<'Manhã' | 'Tarde' | 'Integral'>('Manhã');
  const [entryTime, setEntryTime] = useState('07:00');
  const [exitTime, setExitTime] = useState('12:00');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen || !vehicle) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!parentName.trim()) {
      toast.error('Informe o nome do responsável.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error('Informe um WhatsApp válido com DDD (interfere no contato e avisos).');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      toast.error('Informe um e-mail válido do responsável (interfere no login dos pais).');
      return;
    }

    if (!childName.trim()) {
      toast.error('Informe o nome do aluno/criança.');
      return;
    }

    if (!schoolName.trim()) {
      toast.error('Informe o nome da escola (interfere na rota).');
      return;
    }

    if (!schoolAddress.trim()) {
      toast.error('Informe o endereço da escola (interfere no destino GPS da rota).');
      return;
    }

    if (!studentAddress.trim()) {
      toast.error('Informe o endereço da residência para embarque (interfere no trajeto GPS da rota).');
      return;
    }

    if (!shift) {
      toast.error('Selecione o turno escolar (interfere na separação das rotas).');
      return;
    }

    setLoading(true);

    try {
      const driverId = vehicle.driverId;

      await addDoc(collection(db, 'drivers', driverId, 'leads'), {
        driverId,
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        parentName: parentName.trim(),
        phone: cleanPhone,
        email: email.trim(),
        childName: childName.trim(),
        schoolName: schoolName.trim(),
        school: schoolName.trim(),
        schoolAddress: schoolAddress.trim(),
        studentAddress: studentAddress.trim(),
        address: studentAddress.trim(),
        shift,
        entryTime,
        exitTime,
        notes: notes.trim(),
        date: new Date().toISOString(),
        status: 'Pendente',
        value: vehicle.value || 0
      });

      setIsSubmitted(true);
      toast.success('Solicitação de vaga enviada com sucesso!');

      // Register school in collective database if provided
      if (schoolName && schoolAddress) {
        saveOrUpdateGlobalSchool({
          name: schoolName,
          address: schoolAddress,
          driverId,
        }).catch((err) => console.warn('Could not sync school globally:', err));
      }
    } catch (error) {
      console.error('Erro ao enviar solicitação de vaga:', error);
      toast.error('Ocorreu um erro ao enviar sua solicitação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setIsSubmitted(false);
    setParentName('');
    setPhone('');
    setEmail('');
    setChildName('');
    setSchoolName('');
    setSchoolAddress('');
    setStudentAddress('');
    setShift('Manhã');
    setEntryTime('07:00');
    setExitTime('12:00');
    setNotes('');
    onClose();
  };

  const cleanDriverPhone = (phoneStr?: string) => {
    if (!phoneStr) return '';
    return phoneStr.replace(/\D/g, '');
  };

  const formattedWhatsAppUrl = () => {
    const cleanNumber = phone.replace(/\D/g, '');
    const msg = `Olá! Acabei de enviar uma solicitação de vaga no SchoolVan para o(a) ${childName} para a van ${vehicle.name}.`;
    return `https://wa.me/55${cleanNumber}?text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-[32px] max-w-xl w-full p-6 md:p-8 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
        <button 
          onClick={handleResetAndClose}
          className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        {!isSubmitted ? (
          <div className="space-y-6">
            {/* Modal Header */}
            <div>
              <span className="bg-yellow-100 text-yellow-900 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                Solicitação Sem Necessidade de Cadastro
              </span>
              <h2 className="text-2xl font-black text-gray-900 mt-2">
                Solicitar Vaga na Van
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Preencha as informações necessárias para que o motorista possa avaliar a rota e entrar em contato com você via WhatsApp.
              </p>
            </div>

            {/* Selected Van Card Header */}
            <div className="bg-yellow-50/70 border border-yellow-200/60 p-4 rounded-2xl flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-400 text-gray-900 rounded-xl flex items-center justify-center font-black shrink-0">
                <Bus size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-sm text-gray-900 truncate">
                  {vehicle.uncleName || 'Tio/Tia da Van'} — {vehicle.name}
                </h4>
                <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                  <MapPin size={12} className="text-yellow-600 shrink-0" />
                  <span className="truncate">{vehicle.city} • {vehicle.neighborhood}</span>
                </div>
              </div>
              {vehicle.value && (
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-gray-500 font-bold block">VALOR ESTIMADO</span>
                  <span className="text-sm font-black text-yellow-700">R$ {vehicle.value}/mês</span>
                </div>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Parent Info */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
                  <User size={14} /> Dados do Responsável
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">
                      Nome do Responsável *
                    </label>
                    <input 
                      type="text"
                      required
                      placeholder="Ex: Maria das Dores"
                      value={parentName}
                      onChange={(e) => setParentName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-yellow-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1 flex items-center justify-between">
                      <span>WhatsApp para Contato *</span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 rounded font-bold">Cobrança/Avisos</span>
                    </label>
                    <input 
                      type="tel"
                      required
                      placeholder="(11) 98765-4321"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-yellow-400 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1 flex items-center justify-between">
                    <span>E-mail do Responsável *</span>
                    <span className="text-[10px] text-blue-700 bg-blue-50 px-1 rounded font-bold">Acesso ao App dos Pais</span>
                  </label>
                  <input 
                    type="email"
                    required
                    placeholder="maria@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-yellow-400 outline-none"
                  />
                </div>
              </div>

              {/* Student & School Info */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><School size={14} /> Dados do Aluno & Escola</span>
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold">Interfere na Rota & GPS</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-gray-700 mb-1">
                      Nome da Criança / Aluno *
                    </label>
                    <input 
                      type="text"
                      required
                      placeholder="Ex: Lucas Dores Silva"
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-yellow-400 outline-none"
                    />
                  </div>

                  <div>
                    <SchoolAutocompleteInput
                      label="Escola Onde Estuda"
                      helperBadge="Banco Coletivo"
                      required
                      placeholder="Comece a digitar o nome da escola..."
                      value={schoolName}
                      schoolAddress={schoolAddress}
                      onChange={(val) => setSchoolName(val)}
                      onSelectSchool={(school) => {
                        setSchoolName(school.name);
                        if (school.address) {
                          setSchoolAddress(school.address);
                          toast.success(`Endereço da escola preenchido automaticamente!`, { icon: '🏫' });
                        }
                      }}
                    />
                  </div>
                </div>

                <div>
                  <AddressAutocompleteInput
                    label="Endereço de Residência para Embarque"
                    helperBadge="GPS Casa"
                    required
                    placeholder="Digite rua, número, bairro e cidade (ou CEP)..."
                    value={studentAddress}
                    onChange={(val) => setStudentAddress(val)}
                  />
                </div>

                <div>
                  <AddressAutocompleteInput
                    label="Endereço Completo da Escola"
                    helperBadge="GPS Escola"
                    required
                    isSchool
                    placeholder="Digite o endereço da escola ou CEP..."
                    value={schoolAddress}
                    onChange={(val) => setSchoolAddress(val)}
                  />
                </div>
              </div>

              {/* Shift & Times */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Clock size={14} /> Turno Escolar & Horários *</span>
                  <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold">Filtra Manhã / Tarde</span>
                </h3>

                <div className="grid grid-cols-3 gap-2">
                  {(['Manhã', 'Tarde', 'Integral'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setShift(s);
                        if (s === 'Tarde') {
                          setEntryTime('13:00');
                          setExitTime('18:00');
                        } else {
                          setEntryTime('07:00');
                          setExitTime('12:00');
                        }
                      }}
                      className={`py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                        shift === s 
                          ? 'bg-yellow-400 border-yellow-500 text-gray-950 shadow-sm' 
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {s === 'Manhã' ? '🌅 Manhã' : s === 'Tarde' ? '🌇 Tarde' : '☀️ Integral'}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Horário de Entrada
                    </label>
                    <input 
                      type="time"
                      value={entryTime}
                      onChange={(e) => setEntryTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-yellow-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Horário de Saída
                    </label>
                    <input 
                      type="time"
                      value={exitTime}
                      onChange={(e) => setExitTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-yellow-400 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Observações Adicionais
                  </label>
                  <textarea 
                    rows={2}
                    placeholder="Ex: Criança necessita embarque 15 min antes, tem recomendação especial..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-yellow-400 outline-none resize-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-sm transition-all shadow-xl active:scale-95 cursor-pointer flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
              >
                {loading ? (
                  <span>Enviando Dados...</span>
                ) : (
                  <>
                    <Send size={18} />
                    <span>ENVIAR SOLICITAÇÃO AO MOTORISTA</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* SUCCESS VIEW */
          <div className="text-center py-6 space-y-6">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gray-900">Solicitação Enviada!</h2>
              <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
                Suas informações foram salvas diretamente no painel do motorista da van <strong className="text-gray-900">{vehicle.name}</strong>.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl text-left text-xs space-y-2 max-w-md mx-auto">
              <div className="flex justify-between border-b border-gray-200 pb-1.5">
                <span className="text-gray-500 font-bold">Aluno:</span>
                <span className="font-extrabold text-gray-900">{childName}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-1.5">
                <span className="text-gray-500 font-bold">Escola:</span>
                <span className="font-extrabold text-gray-900">{schoolName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 font-bold">Responsável:</span>
                <span className="font-extrabold text-gray-900">{parentName} ({phone})</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <a 
                href={formattedWhatsAppUrl()}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 bg-green-500 hover:bg-green-600 text-white font-black rounded-2xl text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageSquare size={18} />
                <span>INICIAR CONVERSA NO WHATSAPP AGORA</span>
              </a>

              <button 
                onClick={handleResetAndClose}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl text-xs transition-all cursor-pointer"
              >
                Voltar ao Marketplace
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
