import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  Circle, 
  ChevronRight, 
  ChevronLeft, 
  User, 
  Bus, 
  Users, 
  MapPin, 
  Smartphone, 
  X, 
  ArrowRight, 
  Save, 
  Check, 
  Zap, 
  ShieldCheck, 
  Award,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { Student, Vehicle } from '../types';
import { db } from '../lib/firebase';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStudentModal: () => void;
  onOpenVehicleModal: () => void;
  onNavigateTab: (tab: string) => void;
}

export function OnboardingWizard({ 
  isOpen, 
  onClose, 
  onOpenStudentModal, 
  onOpenVehicleModal, 
  onNavigateTab 
}: OnboardingWizardProps) {
  const { profile } = useAuth();
  const { data: students } = useFirestore<Student>(`drivers/${profile?.id}/students`);
  const { data: vehicles } = useFirestore<Vehicle>(`drivers/${profile?.id}/vehicles`);

  const [activeStep, setActiveStep] = useState(1);
  const [savingStep, setSavingStep] = useState(false);

  // Form states for inline completion
  const [profileForm, setProfileForm] = useState({
    name: profile?.name || '',
    phone: profile?.phone || '',
    pixKey: profile?.pixKey || '',
  });

  const [vehicleForm, setVehicleForm] = useState({
    model: vehicles[0]?.model || 'Mercedes Sprinter',
    plate: vehicles[0]?.plate || '',
    capacity: vehicles[0]?.capacity || 15,
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name || '',
        phone: profile.phone || '',
        pixKey: profile.pixKey || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (vehicles && vehicles.length > 0) {
      setVehicleForm({
        model: vehicles[0].model || 'Mercedes Sprinter',
        plate: vehicles[0].plate || '',
        capacity: vehicles[0].capacity || 15,
      });
    }
  }, [vehicles]);

  if (!isOpen || !profile) return null;

  // Calculate completion items
  const step1Done = Boolean(profile.name && profile.phone && profile.pixKey);
  const step2Done = vehicles.length > 0;
  const step3Done = students.filter(s => s.status !== 'Excluido').length > 0;
  const step4Done = students.some(s => s.schoolName || s.studentAddress);
  const step5Done = Boolean(profile.phone && profile.pixKey);

  const completedStepsCount = [step1Done, step2Done, step3Done, step4Done, step5Done].filter(Boolean).length;
  const progressPercent = Math.round((completedStepsCount / 5) * 100);

  const steps = [
    {
      id: 1,
      title: 'Perfil & Chave Pix',
      description: 'Configure seus dados de contato e chave Pix para receber dos pais.',
      icon: User,
      isDone: step1Done,
      badge: step1Done ? 'Concluído' : 'Pendente'
    },
    {
      id: 2,
      title: 'Sua Van Escolar',
      description: 'Cadastre o modelo, placa e capacidade do seu veículo de transporte.',
      icon: Bus,
      isDone: step2Done,
      badge: step2Done ? 'Concluído' : 'Pendente'
    },
    {
      id: 3,
      title: 'Cadastro de Alunos',
      description: 'Adicione os primeiros alunos para gerenciar presença e embarque.',
      icon: Users,
      isDone: step3Done,
      badge: step3Done ? 'Concluído' : 'Pendente'
    },
    {
      id: 4,
      title: 'Rotas & Escolas',
      description: 'Organize os pontos de parada no GPS e atribua escolas aos alunos.',
      icon: MapPin,
      isDone: step4Done,
      badge: step4Done ? 'Concluído' : 'Pendente'
    },
    {
      id: 5,
      title: 'PWA & Lembretes WhatsApp',
      description: 'Aprenda a enviar cobranças com 1 clique e notificar os pais no celular.',
      icon: Smartphone,
      isDone: step5Done,
      badge: step5Done ? 'Concluído' : 'Pendente'
    }
  ];

  const handleSaveProfileStep = async () => {
    setSavingStep(true);
    try {
      await updateDoc(doc(db, 'drivers', profile.id), {
        name: profileForm.name,
        phone: profileForm.phone,
        pixKey: profileForm.pixKey,
      });
      toast.success('Perfil e Chave Pix salvos com sucesso!');
      setActiveStep(2);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar perfil.');
    } finally {
      setSavingStep(false);
    }
  };

  const handleSaveVehicleStep = async () => {
    setSavingStep(true);
    try {
      if (vehicles.length > 0) {
        await updateDoc(doc(db, 'drivers', profile.id, 'vehicles', vehicles[0].id), {
          model: vehicleForm.model,
          plate: vehicleForm.plate,
          capacity: Number(vehicleForm.capacity),
        });
      } else {
        await addDoc(collection(db, 'drivers', profile.id, 'vehicles'), {
          model: vehicleForm.model,
          plate: vehicleForm.plate,
          capacity: Number(vehicleForm.capacity),
          status: 'Ativo',
          createdAt: new Date().toISOString()
        });
      }
      toast.success('Veículo cadastrado com sucesso!');
      setActiveStep(3);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar veículo.');
    } finally {
      setSavingStep(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 my-auto"
      >
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 p-6 sm:p-8 text-gray-950 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 text-gray-950 rounded-full transition-all"
            title="Fechar Assistente"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="px-3 py-1 bg-gray-950 text-yellow-400 text-xs font-black rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-md">
              <Sparkles size={14} className="animate-spin-slow" />
              CSM Digital • Guia do Motorista
            </div>
            <span className="text-xs font-bold opacity-80">Passo {activeStep} de 5</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            Bem-vindo ao SchoolVan, {profile.name || 'Motorista'}! 🚌
          </h2>
          <p className="text-sm font-medium text-gray-900 mt-1 max-w-xl">
            Preparamos este assistente passo a passo para você configurar sua frota, automatizar cobranças Pix e avisar os pais em menos de 3 minutos.
          </p>

          {/* Progress Bar */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-xs font-black">
              <span>Progresso da Configuração</span>
              <span>{progressPercent}% Concluído</span>
            </div>
            <div className="w-full bg-black/10 h-3 rounded-full overflow-hidden p-0.5">
              <motion.div 
                className="bg-gray-950 h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>

        {/* Step Tabs Indicator */}
        <div className="grid grid-cols-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/50 p-2 gap-1 overflow-x-auto">
          {steps.map((step) => {
            const StepIcon = step.icon;
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStep(step.id)}
                className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-white dark:bg-gray-800 text-yellow-600 dark:text-yellow-400 shadow-md border border-yellow-400/30' 
                    : step.isDone
                    ? 'text-emerald-600 dark:text-emerald-400 hover:bg-white/50'
                    : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-1 mb-1">
                  {step.isDone ? (
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  ) : (
                    <StepIcon size={16} className="shrink-0" />
                  )}
                  <span className="hidden sm:inline font-black">P{step.id}</span>
                </div>
                <span className="text-[10px] truncate max-w-full hidden md:inline">{step.title}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content View for Active Step */}
        <div className="p-6 sm:p-8 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* STEP 1: PERFIL & PIX */}
              {activeStep === 1 && (
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-2xl flex items-center justify-center shrink-0 font-bold text-xl">
                      1
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white">
                        Passo 1: Chave Pix & Contato do Motorista
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Sua chave Pix é usada para gerar mensagens e QR Codes pré-preenchidos de cobrança aos pais via WhatsApp.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-2xl space-y-4 border border-gray-100 dark:border-gray-800">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                        Seu Nome Completo ou Nome da Frota
                      </label>
                      <input 
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="Ex: Tio Fulano - Transporte Escolar"
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                          WhatsApp de Atendimento
                        </label>
                        <input 
                          type="text"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                          placeholder="(11) 99999-9999"
                          className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                          Sua Chave Pix Principal
                        </label>
                        <input 
                          type="text"
                          value={profileForm.pixKey}
                          onChange={(e) => setProfileForm(p => ({ ...p, pixKey: e.target.value }))}
                          placeholder="CPF, E-mail, Celular ou Aleatória"
                          className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-gray-400">
                      {step1Done ? '✅ Configurado com sucesso!' : '⚠️ Preencha para avançar'}
                    </span>
                    <button
                      onClick={handleSaveProfileStep}
                      disabled={savingStep || !profileForm.name || !profileForm.pixKey}
                      className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold rounded-2xl text-sm shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Save size={18} />
                      Salvar & Avançar <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: VEÍCULO */}
              {activeStep === 2 && (
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-2xl flex items-center justify-center shrink-0 font-bold text-xl">
                      2
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white">
                        Passo 2: Cadastro do Veículo (Van Escolar)
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Informe o modelo da sua van, placa e capacidade de bancos para calcular o preenchimento de lotação.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-2xl space-y-4 border border-gray-100 dark:border-gray-800">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                          Modelo da Van
                        </label>
                        <input 
                          type="text"
                          value={vehicleForm.model}
                          onChange={(e) => setVehicleForm(p => ({ ...p, model: e.target.value }))}
                          placeholder="Ex: Mercedes-Benz Sprinter 415"
                          className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                          Placa
                        </label>
                        <input 
                          type="text"
                          value={vehicleForm.plate}
                          onChange={(e) => setVehicleForm(p => ({ ...p, plate: e.target.value.toUpperCase() }))}
                          placeholder="ABC-1234 / BRA2E19"
                          className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none uppercase font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                        Capacidade de Lugares (Assentos para Alunos)
                      </label>
                      <input 
                        type="number"
                        value={vehicleForm.capacity}
                        onChange={(e) => setVehicleForm(p => ({ ...p, capacity: Number(e.target.value) }))}
                        min={1}
                        max={60}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setActiveStep(1)}
                      className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 font-bold text-xs flex items-center gap-1"
                    >
                      <ChevronLeft size={16} /> Voltar
                    </button>
                    <button
                      onClick={handleSaveVehicleStep}
                      disabled={savingStep || !vehicleForm.model || !vehicleForm.plate}
                      className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold rounded-2xl text-sm shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Save size={18} />
                      Salvar Veículo & Avançar <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: ALUNOS */}
              {activeStep === 3 && (
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-2xl flex items-center justify-center shrink-0 font-bold text-xl">
                      3
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white">
                        Passo 3: Adicionar os Alunos da Sua Rota
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Você já possui <strong className="text-yellow-600 dark:text-yellow-400">{students.length} alunos</strong> cadastrados na sua lista de presença e financeiro.
                      </p>
                    </div>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800/50 p-6 rounded-2xl space-y-4 text-center">
                    <div className="w-16 h-16 bg-yellow-400 text-gray-950 rounded-3xl flex items-center justify-center mx-auto shadow-md">
                      <Users size={32} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-gray-900 dark:text-white">
                        Cadastre o Primeiro Aluno em Segundos
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 max-w-md mx-auto">
                        Defina o nome do aluno, telefone do pai/mãe para WhatsApp, escola de destino e endereço da casa.
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                      <button
                        onClick={() => {
                          onClose();
                          onOpenStudentModal();
                        }}
                        className="w-full sm:w-auto px-6 py-3 bg-gray-950 text-yellow-400 font-bold rounded-2xl text-sm shadow-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Users size={18} /> + Cadastrar Aluno Agora
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setActiveStep(2)}
                      className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 font-bold text-xs flex items-center gap-1"
                    >
                      <ChevronLeft size={16} /> Voltar
                    </button>
                    <button
                      onClick={() => setActiveStep(4)}
                      className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold rounded-2xl text-sm shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                    >
                      Próximo Passo <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: ROTAS & MAPA */}
              {activeStep === 4 && (
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-2xl flex items-center justify-center shrink-0 font-bold text-xl">
                      4
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white">
                        Passo 4: Sequenciamento de Rotas & GPS
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        O SchoolVan traça automaticamente a melhor sequência de paradas no Google Maps para economizar combustível.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl space-y-4 border border-gray-100 dark:border-gray-800 text-center">
                    <div className="w-16 h-16 bg-blue-500 text-white rounded-3xl flex items-center justify-center mx-auto shadow-md">
                      <MapPin size={32} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-gray-900 dark:text-white">
                        Visualize a Rota no Mapa
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 max-w-md mx-auto">
                        Ordene as casas dos alunos e escolas por horário de início da aula. Abra a rota diretamente no Google Maps.
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        onClose();
                        onNavigateTab('routes');
                      }}
                      className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl text-sm shadow-lg hover:bg-blue-700 transition-all inline-flex items-center gap-2 cursor-pointer"
                    >
                      <MapPin size={18} /> Ir para o Módulo de Rotas & GPS
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setActiveStep(3)}
                      className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 font-bold text-xs flex items-center gap-1"
                    >
                      <ChevronLeft size={16} /> Voltar
                    </button>
                    <button
                      onClick={() => setActiveStep(5)}
                      className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-bold rounded-2xl text-sm shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                    >
                      Próximo Passo <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5: PWA & WHATSAPP */}
              {activeStep === 5 && (
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-2xl flex items-center justify-center shrink-0 font-bold text-xl">
                      5
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-gray-900 dark:text-white">
                        Passo 5: PWA Nativo & Comunicação com os Pais
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        O SchoolVan é um PWA nativo que pode ser instalado no seu celular e no celular dos pais como um aplicativo nativo.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-6 rounded-3xl shadow-xl space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                        <Smartphone size={28} />
                      </div>
                      <div>
                        <h4 className="text-lg font-black">Tudo Pronto para Operar! 🎉</h4>
                        <p className="text-xs opacity-90">
                          Sua frota está {progressPercent}% configurada. Instale o app na tela inicial e comece a enviar mensagens no WhatsApp dos pais.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateTab('finance');
                        }}
                        className="px-4 py-3 bg-white text-emerald-900 font-bold rounded-2xl text-xs shadow hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                      >
                        <Zap size={16} /> Ver Cobranças Pix WhatsApp
                      </button>
                      <button
                        onClick={() => {
                          onClose();
                        }}
                        className="px-4 py-3 bg-black/20 text-white font-bold rounded-2xl text-xs hover:bg-black/30 border border-white/20 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={16} /> Concluir Tour & Começar
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setActiveStep(4)}
                      className="px-4 py-2.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 font-bold text-xs flex items-center gap-1"
                    >
                      <ChevronLeft size={16} /> Voltar
                    </button>
                    <button
                      onClick={onClose}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-sm shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Award size={18} /> Finalizar Onboarding
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
