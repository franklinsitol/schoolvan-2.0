import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
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
  Zap, 
  Award,
  Volume2,
  VolumeX,
  Bot,
  MessageSquare,
  ClipboardCheck,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { Student, Vehicle } from '../types';
import { db } from '../lib/firebase';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { speakTioIAPrompt, playBusHornSound } from '../lib/sound';
import toast from 'react-hot-toast';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenStudentModal: () => void;
  onOpenVehicleModal: () => void;
  onNavigateTab: (tab: string) => void;
  onOpenTioIA?: () => void;
  onOpenCheckin?: () => void;
  onOpenUpgradeModal?: (reason: string) => void;
}

export function OnboardingWizard({ 
  isOpen, 
  onClose, 
  onOpenStudentModal, 
  onOpenVehicleModal, 
  onNavigateTab,
  onOpenTioIA,
  onOpenCheckin,
  onOpenUpgradeModal
}: OnboardingWizardProps) {
  const { profile } = useAuth();
  const { data: students } = useFirestore<Student>(`drivers/${profile?.id}/students`);
  const { data: vehicles } = useFirestore<Vehicle>(`drivers/${profile?.id}/vehicles`);

  const [activeStep, setActiveStep] = useState(1);
  const [savingStep, setSavingStep] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Form states for inline completion
  const [profileForm, setProfileForm] = useState({
    name: profile?.name || '',
    phone: profile?.phone || '',
    pixKey: profile?.pixKey || '',
  });

  const [vehicleForm, setVehicleForm] = useState({
    name: vehicles[0]?.name || 'Van Principal 01',
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
        name: vehicles[0].name || 'Van Principal 01',
        model: vehicles[0].model || 'Mercedes Sprinter',
        plate: vehicles[0].plate || '',
        capacity: vehicles[0].capacity || 15,
      });
    }
  }, [vehicles]);

  // Clean up speech synthesis on unmount or step change
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [activeStep, isOpen]);

  if (!isOpen || !profile) return null;

  // Calculate completion items
  const step1Done = Boolean(profile.name && profile.phone && profile.pixKey);
  const step2Done = vehicles.length > 0;
  const step3Done = students.filter(s => s.status !== 'Excluido').length > 0;
  const step4Done = students.some(s => s.schoolName || s.studentAddress);
  const step5Done = Boolean(profile.phone && profile.pixKey);

  const completedStepsCount = [step1Done, step2Done, step3Done, step4Done, step5Done].filter(Boolean).length;
  const progressPercent = Math.round((completedStepsCount / 5) * 100);

  // Speech Prompts per Step in Tio IA persona
  const stepExplanations = {
    1: `Fala ${profile.name ? `Tio ${profile.name.split(' ')[0]}` : 'Tio'}! Sou o Tio IA, seu assistente da van. O primeiro passo é cadastrar seu WhatsApp e sua Chave Pix. É através deles que o SchoolVan vai gerar suas cobranças com QR Code Pix para você mandar no Zap dos pais com um clique!`,
    2: `Show de bola! Agora vamos cadastrar sua Van Escolar. No Plano Gratuito você tem uma van inclusa com todos os recursos liberados. Informe o modelo, placa e capacidade de bancos para calcularmos as vagas disponíveis na sua rota!`,
    3: `Excelente, Tio! O terceiro passo é adicionar os primeiros alunos da sua rota. Com o nome do aluno, escola e telefone do responsável, você faz a chamada do embarque em tempo real e avisa os pais quando o filho embarcar na van!`,
    4: `No módulo de Rotas e GPS, o sistema organiza os endereços dos alunos e escolas na melhor sequência para você não ficar dando voltas e economizar combustível no dia a dia. Você pode abrir a rota direto no Google Maps!`,
    5: `Parabéns, Tio! Seu SchoolVan está configurado e pronto para rodar. Lembre-se que você pode usar o botão Chamada do Embarque no rodapé a qualquer hora para fazer a presença em um clique. Se tiver qualquer dúvida, é só me chamar no chat do Tio IA!`
  };

  const handleSpeakCurrentStep = () => {
    if (isSpeaking) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
      return;
    }

    const textToSpeak = stepExplanations[activeStep as keyof typeof stepExplanations];
    if (textToSpeak) {
      setIsSpeaking(true);
      speakTioIAPrompt(textToSpeak);
      // Auto toggle off after estimate
      setTimeout(() => setIsSpeaking(false), 14000);
    }
  };

  const steps = [
    {
      id: 1,
      title: 'Perfil & Chave Pix',
      description: 'Configure contato e chave Pix para receber na hora dos pais.',
      icon: User,
      isDone: step1Done,
    },
    {
      id: 2,
      title: 'Sua Van Escolar',
      description: 'Cadastre modelo, placa e capacidade da sua van.',
      icon: Bus,
      isDone: step2Done,
    },
    {
      id: 3,
      title: 'Alunos da Rota',
      description: 'Adicione alunos para lista de presença e embarque.',
      icon: Users,
      isDone: step3Done,
    },
    {
      id: 4,
      title: 'Rotas & GPS',
      description: 'Sequenciamento inteligente de paradas para economizar tempo.',
      icon: MapPin,
      isDone: step4Done,
    },
    {
      id: 5,
      title: 'PWA & Embarque',
      description: 'Aplicativo instalado e chamada rápida com 1 clique.',
      icon: Smartphone,
      isDone: step5Done,
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
      playBusHornSound();
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
          name: vehicleForm.name || 'Van Principal',
          model: vehicleForm.model,
          plate: vehicleForm.plate,
          capacity: Number(vehicleForm.capacity),
        });
      } else {
        await addDoc(collection(db, 'drivers', profile.id, 'vehicles'), {
          name: vehicleForm.name || 'Van Principal',
          model: vehicleForm.model,
          plate: vehicleForm.plate,
          capacity: Number(vehicleForm.capacity),
          status: 'Ativo',
          createdAt: new Date().toISOString()
        });
      }
      playBusHornSound();
      toast.success('Van escolar cadastrada com sucesso!');
      setActiveStep(3);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar veículo.');
    } finally {
      setSavingStep(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 my-auto relative flex flex-col max-h-[92vh]"
      >
        {/* Header Banner with Tio IA Persona */}
        <div className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 p-6 sm:p-7 text-gray-950 relative shrink-0">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 text-gray-950 rounded-full transition-all cursor-pointer"
            title="Fechar Assistente"
          >
            <X size={20} />
          </button>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <div className="px-3 py-1 bg-gray-950 text-yellow-400 text-xs font-black rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-md">
              <Bot size={15} className="animate-bounce" />
              Copiloto Tio IA • Onboarding Inteligente
            </div>
            <span className="text-xs font-bold bg-white/30 px-2.5 py-0.5 rounded-full text-gray-950">
              Passo {activeStep} de 5
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            Onboarding Guiado com o Tio IA 🚌🤖
          </h2>
          <p className="text-xs sm:text-sm font-medium text-gray-900 mt-1 max-w-xl">
            Olá, <strong>{profile.name || 'Tio da Van'}</strong>! Vou te guiar passo a passo para deixar sua operação redonda em menos de 3 minutos.
          </p>

          {/* Progress Bar */}
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-black">
              <span>Progresso da Configuração</span>
              <span>{progressPercent}% Concluído</span>
            </div>
            <div className="w-full bg-black/15 h-2.5 rounded-full overflow-hidden p-0.5">
              <motion.div 
                className="bg-gray-950 h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </div>
        </div>

        {/* Step Indicator Tabs */}
        <div className="grid grid-cols-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/60 p-2 gap-1 overflow-x-auto shrink-0">
          {steps.map((step) => {
            const StepIcon = step.icon;
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                onClick={() => {
                  setActiveStep(step.id);
                  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                  setIsSpeaking(false);
                }}
                className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-white dark:bg-gray-800 text-yellow-600 dark:text-yellow-400 shadow-md border border-yellow-400/30' 
                    : step.isDone
                    ? 'text-emerald-600 dark:text-emerald-400 hover:bg-white/50'
                    : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-1">
                  {step.isDone ? (
                    <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                  ) : (
                    <StepIcon size={15} className="shrink-0" />
                  )}
                  <span className="font-black text-[11px]">P{step.id}</span>
                </div>
                <span className="text-[10px] truncate max-w-full hidden md:inline">{step.title}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Main Content */}
        <div className="p-5 sm:p-7 space-y-5 overflow-y-auto flex-1">
          {/* Tio IA Speech Card */}
          <div className="bg-yellow-50 dark:bg-yellow-950/30 border-2 border-yellow-300 dark:border-yellow-800/60 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-yellow-400 text-gray-950 rounded-xl flex items-center justify-center shrink-0 font-black shadow-inner">
                <Bot size={22} />
              </div>
              <div>
                <span className="text-[10px] font-black text-yellow-800 dark:text-yellow-400 uppercase tracking-wider block">
                  Fala do Tio IA • Dica do Passo {activeStep}
                </span>
                <p className="text-xs text-gray-800 dark:text-gray-200 font-semibold leading-relaxed mt-0.5">
                  "{stepExplanations[activeStep as keyof typeof stepExplanations]}"
                </p>
              </div>
            </div>

            <button
              onClick={handleSpeakCurrentStep}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm ${
                isSpeaking 
                  ? 'bg-amber-500 text-white animate-pulse' 
                  : 'bg-yellow-400 hover:bg-yellow-300 text-gray-950'
              }`}
              title="Ouvir explicação do Tio IA em voz alta"
            >
              {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
              {isSpeaking ? 'Pausar Voz' : 'Ouvir Tio IA'}
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {/* STEP 1: PERFIL & PIX */}
              {activeStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-xl flex items-center justify-center shrink-0 font-black text-lg">
                      1
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white">
                        Passo 1: Chave Pix & Contato do Tio
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        O SchoolVan usa sua chave Pix para gerar as mensagens de cobrança automáticas e QR Codes com 1 clique.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 p-4 sm:p-5 rounded-2xl space-y-3.5 border border-gray-100 dark:border-gray-800">
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                        Seu Nome Completo ou Nome da Van
                      </label>
                      <input 
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="Ex: Tio Carlos - Van Escolar Estrela"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                          WhatsApp de Atendimento
                        </label>
                        <input 
                          type="text"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                          placeholder="(11) 99999-9999"
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                          Sua Chave Pix Principal
                        </label>
                        <input 
                          type="text"
                          value={profileForm.pixKey}
                          onChange={(e) => setProfileForm(p => ({ ...p, pixKey: e.target.value }))}
                          placeholder="CPF, CNPJ, Celular, E-mail ou Chave Aleatória"
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-gray-400 font-semibold">
                      {step1Done ? '✅ Dados configurados!' : '⚠️ Preencha Nome e Pix'}
                    </span>
                    <button
                      onClick={handleSaveProfileStep}
                      disabled={savingStep || !profileForm.name || !profileForm.pixKey}
                      className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      <Save size={16} />
                      Salvar & Avançar <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: VEÍCULO & PLANO */}
              {activeStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-xl flex items-center justify-center shrink-0 font-black text-lg">
                      2
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-gray-900 dark:text-white">
                          Passo 2: Sua Van Escolar
                        </h3>
                        <span className="px-2.5 py-0.5 bg-yellow-400/20 text-yellow-800 dark:text-yellow-300 text-[10px] font-black rounded-full uppercase">
                          1 Van no Plano Gratuito
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Informe o modelo, placa e capacidade de bancos para calcularmos a ocupação e as vagas livres.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 p-4 sm:p-5 rounded-2xl space-y-3.5 border border-gray-100 dark:border-gray-800">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                          Nome ou Identificação da Van
                        </label>
                        <input 
                          type="text"
                          value={vehicleForm.name}
                          onChange={(e) => setVehicleForm(p => ({ ...p, name: e.target.value }))}
                          placeholder="Ex: Van 01 - Zona Sul"
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                          Placa do Veículo
                        </label>
                        <input 
                          type="text"
                          value={vehicleForm.plate}
                          onChange={(e) => setVehicleForm(p => ({ ...p, plate: e.target.value.toUpperCase() }))}
                          placeholder="ABC-1234 / BRA2E19"
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none uppercase font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                          Modelo / Fabricante
                        </label>
                        <input 
                          type="text"
                          value={vehicleForm.model}
                          onChange={(e) => setVehicleForm(p => ({ ...p, model: e.target.value }))}
                          placeholder="Ex: Mercedes Sprinter 415, Fiat Ducato..."
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                          Capacidade de Assentos para Alunos
                        </label>
                        <input 
                          type="number"
                          value={vehicleForm.capacity}
                          onChange={(e) => setVehicleForm(p => ({ ...p, capacity: Number(e.target.value) }))}
                          min={1}
                          max={60}
                          className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setActiveStep(1)}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft size={16} /> Voltar
                    </button>
                    <button
                      onClick={handleSaveVehicleStep}
                      disabled={savingStep || !vehicleForm.plate}
                      className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      <Save size={16} />
                      Salvar Van & Avançar <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: ALUNOS */}
              {activeStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-xl flex items-center justify-center shrink-0 font-black text-lg">
                      3
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white">
                        Passo 3: Adicionar os Alunos da Sua Rota
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Você já possui <strong className="text-yellow-600 dark:text-yellow-400">{students.length} alunos</strong> cadastrados na lista de presença e financeiro.
                      </p>
                    </div>
                  </div>

                  <div className="bg-yellow-50/70 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/40 p-5 rounded-2xl space-y-3 text-center">
                    <div className="w-14 h-14 bg-yellow-400 text-gray-950 rounded-2xl flex items-center justify-center mx-auto shadow-md">
                      <Users size={28} />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-gray-900 dark:text-white">
                        Cadastre seus Alunos e Escolas
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 max-w-md mx-auto">
                        Com o nome do aluno, telefone do responsável e escola de destino, você faz o embarque diário e envia lembretes no Zap dos pais.
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => {
                          onClose();
                          onOpenStudentModal();
                        }}
                        className="px-6 py-2.5 bg-gray-950 text-yellow-400 font-black rounded-2xl text-xs sm:text-sm shadow-xl hover:bg-gray-800 transition-all inline-flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        <Users size={16} /> + Cadastrar Aluno Agora
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setActiveStep(2)}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft size={16} /> Voltar
                    </button>
                    <button
                      onClick={() => setActiveStep(4)}
                      className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      Próximo Passo <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: ROTAS & GPS */}
              {activeStep === 4 && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-xl flex items-center justify-center shrink-0 font-black text-lg">
                      4
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white">
                        Passo 4: Sequenciamento de Rotas & GPS
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        O SchoolVan traça automaticamente a melhor sequência de paradas no Google Maps para economizar combustível.
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 p-5 rounded-2xl space-y-3 text-center">
                    <div className="w-14 h-14 bg-blue-500 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                      <MapPin size={28} />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-gray-900 dark:text-white">
                        Organize sua Rota no Mapa
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 max-w-md mx-auto">
                        Ordene as casas dos alunos e escolas por horário de início da aula e abra no Google Maps ou Waze direto pelo celular.
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateTab('routes');
                        }}
                        className="px-6 py-2.5 bg-blue-600 text-white font-black rounded-2xl text-xs sm:text-sm shadow-md hover:bg-blue-700 transition-all inline-flex items-center gap-2 cursor-pointer active:scale-95"
                      >
                        <MapPin size={16} /> Abrir Módulo de Rotas & GPS
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setActiveStep(3)}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft size={16} /> Voltar
                    </button>
                    <button
                      onClick={() => setActiveStep(5)}
                      className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      Próximo Passo <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5: PWA, EMBARQUE & FINALIZAÇÃO */}
              {activeStep === 5 && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded-xl flex items-center justify-center shrink-0 font-black text-lg">
                      5
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-900 dark:text-white">
                        Passo 5: PWA Nativo & Chamada do Embarque
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Seu SchoolVan está 100% pronto! Acesse o app no celular e use a Chamada do Embarque no rodapé a qualquer hora.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-500 to-teal-700 text-white p-5 rounded-3xl shadow-xl space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                        <Smartphone size={24} />
                      </div>
                      <div>
                        <h4 className="text-base font-black">Tudo Pronto para Rodar, Tio! 🚌🎉</h4>
                        <p className="text-xs opacity-90">
                          Sua frota está configurada. Você pode fazer a chamada do embarque no rodapé ou chamar o Tio IA para tirar dúvidas.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                      <button
                        onClick={() => {
                          onClose();
                          if (onOpenCheckin) onOpenCheckin();
                        }}
                        className="px-4 py-2.5 bg-white text-emerald-950 font-black rounded-2xl text-xs shadow hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        <ClipboardCheck size={16} /> Testar Chamada do Embarque
                      </button>

                      <button
                        onClick={() => {
                          onClose();
                          if (onOpenTioIA) onOpenTioIA();
                        }}
                        className="px-4 py-2.5 bg-black/25 text-white font-bold rounded-2xl text-xs hover:bg-black/35 border border-white/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        <MessageSquare size={16} /> Conversar com o Tio IA
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setActiveStep(4)}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft size={16} /> Voltar
                    </button>
                    <button
                      onClick={() => {
                        playBusHornSound();
                        speakTioIAPrompt("Parabéns, Tio! Seu SchoolVan está configurado e pronto para rodar. Vamos faturar e cuidar da criançada!");
                        onClose();
                      }}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs sm:text-sm shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Award size={18} /> Concluir e Ir para o App
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Quick Support / Chat with Tio IA button at bottom */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>Suporte & Dúvidas 100% integrados</span>
            </div>

            <button
              onClick={() => {
                onClose();
                if (onOpenTioIA) onOpenTioIA();
              }}
              className="text-xs font-bold text-yellow-600 dark:text-yellow-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Bot size={14} /> Dúvida? Chamar Tio IA
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
