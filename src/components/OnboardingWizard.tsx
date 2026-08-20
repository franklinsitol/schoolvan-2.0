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
  School,
  Clock,
  DollarSign,
  Calendar,
  Phone,
  Trash2,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { Student, Vehicle } from '../types';
import { db } from '../lib/firebase';
import { doc, updateDoc, collection, addDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { speakTiaPrompt, playBusHornSound } from '../lib/sound';
import { checkCanAddStudent, checkCanAddVehicle } from '../lib/plans';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';
import { SchoolAutocompleteInput } from './SchoolAutocompleteInput';
import { saveOrUpdateGlobalSchool } from '../services/schoolsService';
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
  const { data: students } = useFirestore<Student>(profile?.id ? `drivers/${profile.id}/students` : '');
  const { data: vehicles } = useFirestore<Vehicle>(profile?.id ? `drivers/${profile.id}/vehicles` : '');

  const [activeStep, setActiveStep] = useState(1);
  const [savingStep, setSavingStep] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Form states for inline Profile completion
  const [profileForm, setProfileForm] = useState({
    name: profile?.name || '',
    phone: profile?.phone || '',
    pixKey: profile?.pixKey || '',
    city: profile?.city || '',
  });

  // Form states for inline Vehicle completion
  const [vehicleForm, setVehicleForm] = useState<{
    name: string;
    model: string;
    plate: string;
    capacity: number | string;
  }>({
    name: vehicles[0]?.name || 'Van Principal 01',
    model: vehicles[0]?.model || 'Mercedes Sprinter',
    plate: vehicles[0]?.plate || '',
    capacity: vehicles[0]?.capacity !== undefined ? vehicles[0].capacity : 15,
  });

  // Form states for Full Student Registration inside Onboarding
  const [studentForm, setStudentForm] = useState({
    name: '',
    schoolName: '',
    schoolAddress: '',
    shift: 'Manhã', // Manhã | Tarde | Integral
    studentAddress: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    value: 350,
    paymentDay: 10,
  });

  const [showAddStudentCard, setShowAddStudentCard] = useState(false);

  useEffect(() => {
    if (profile) {
      setProfileForm({
        name: profile.name || '',
        phone: profile.phone || '',
        pixKey: profile.pixKey || '',
        city: profile.city || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (vehicles && vehicles.length > 0) {
      setVehicleForm({
        name: vehicles[0].name || 'Van Principal 01',
        model: vehicles[0].model || 'Mercedes Sprinter',
        plate: vehicles[0].plate || '',
        capacity: vehicles[0].capacity !== undefined ? vehicles[0].capacity : 15,
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

  const activeStudents = students.filter(s => s.status !== 'Excluido');

  // Calculate completion items
  const step1Done = Boolean(profile.name && profile.phone && profile.pixKey);
  const step2Done = vehicles.length > 0;
  const step3Done = activeStudents.length > 0;
  const step4Done = activeStudents.some(s => s.schoolName || s.studentAddress);
  const step5Done = Boolean(profile.phone && profile.pixKey);

  const completedStepsCount = [step1Done, step2Done, step3Done, step4Done, step5Done].filter(Boolean).length;
  const progressPercent = Math.round((completedStepsCount / 5) * 100);

  // Speech Prompts per Step in T.IA persona
  const stepExplanations = {
    1: `Fala ${profile.name ? `Tio(a) ${profile.name.split(' ')[0]}` : 'Tio(a)'}! Sou a T.IA, sua assistente da van. O primeiro passo é cadastrar seu WhatsApp e sua Chave Pix. É através deles que o SchoolVan gera suas cobranças com QR Code Pix para você mandar no Zap dos pais com um clique!`,
    2: `Show de bola! Agora vamos cadastrar sua Van Escolar. No Plano Gratuito você tem uma van inclusa com todos os recursos liberados. Informe o modelo, placa e capacidade de bancos para calcularmos as vagas livres na sua rota!`,
    3: `Excelente, parceiro(a)! O terceiro passo é adicionar os alunos da sua rota com dados completos: nome, escola, turno, endereço de embarque e WhatsApp do responsável. Assim a chamada de embarque e os avisos aos pais funcionam 100%!`,
    4: `No módulo de Rotas e GPS, o sistema organiza os endereços dos alunos e escolas na melhor sequência para você não ficar dando voltas e economizar combustível no dia a dia. Você pode abrir a rota direto no Google Maps ou Waze!`,
    5: `Parabéns, parceiro(a)! Seu SchoolVan está configurado e pronto para rodar. Lembre-se que você pode usar o botão Chamada do Embarque no rodapé a qualquer hora para fazer a presença em um clique. Se tiver qualquer dúvida, é só me chamar no chat da T.IA!`
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
      speakTiaPrompt(textToSpeak);
      setTimeout(() => setIsSpeaking(false), 14000);
    }
  };

  const steps = [
    {
      id: 1,
      title: 'Perfil & Chave Pix',
      description: 'Contato e chave Pix para cobrança.',
      icon: User,
      isDone: step1Done,
    },
    {
      id: 2,
      title: 'Sua Van Escolar',
      description: 'Modelo, placa e capacidade de vagas.',
      icon: Bus,
      isDone: step2Done,
    },
    {
      id: 3,
      title: 'Alunos da Rota',
      description: 'Cadastro completo de alunos e responsáveis.',
      icon: Users,
      isDone: step3Done,
    },
    {
      id: 4,
      title: 'Rotas & GPS',
      description: 'Sequenciamento inteligente de paradas.',
      icon: MapPin,
      isDone: step4Done,
    },
    {
      id: 5,
      title: 'PWA & Embarque',
      description: 'Chamada rápida e conclusão do app.',
      icon: Smartphone,
      isDone: step5Done,
    }
  ];

  // 1. SAVE PROFILE & PIX
  const handleSaveProfileStep = async () => {
    setSavingStep(true);
    try {
      await updateDoc(doc(db, 'drivers', profile.id), {
        name: profileForm.name.trim(),
        phone: profileForm.phone.trim(),
        pixKey: profileForm.pixKey.trim(),
        city: profileForm.city.trim(),
        updatedAt: new Date().toISOString(),
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

  // 2. SAVE VEHICLE
  const handleSaveVehicleStep = async () => {
    setSavingStep(true);
    try {
      const parsedCapacity = Number(vehicleForm.capacity);
      const finalCapacity = isNaN(parsedCapacity) || parsedCapacity < 1 ? 15 : parsedCapacity;

      if (vehicles.length > 0 && vehicles[0]?.id) {
        await updateDoc(doc(db, 'drivers', profile.id, 'vehicles', vehicles[0].id), {
          name: vehicleForm.name || 'Van Principal',
          model: vehicleForm.model || 'Mercedes Sprinter',
          plate: vehicleForm.plate.toUpperCase(),
          capacity: finalCapacity,
          status: 'Ativo',
          updatedAt: new Date().toISOString(),
        });
      } else {
        await addDoc(collection(db, 'drivers', profile.id, 'vehicles'), {
          name: vehicleForm.name || 'Van Principal',
          model: vehicleForm.model || 'Mercedes Sprinter',
          plate: vehicleForm.plate.toUpperCase(),
          capacity: finalCapacity,
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

  // 3. SAVE STUDENT (FULL COMPLETE REGISTRATION)
  const handleSaveStudentStep = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Strict mandatory field validations
    if (!studentForm.name.trim()) {
      toast.error('Informe o nome completo do aluno.');
      return;
    }

    if (!studentForm.shift) {
      toast.error('Selecione o turno (Manhã/Tarde/Integral) — obrigatório para separar as rotas.');
      return;
    }

    if (!studentForm.studentAddress.trim()) {
      toast.error('Informe o endereço da residência para embarque — obrigatório para cálculo da rota e GPS.');
      return;
    }

    if (!studentForm.schoolName.trim()) {
      toast.error('Informe o nome da escola — obrigatório para a rota de destino.');
      return;
    }

    if (!studentForm.schoolAddress.trim()) {
      toast.error('Informe o endereço da escola — obrigatório para o trajeto da rota até a escola.');
      return;
    }

    if (!studentForm.parentName.trim()) {
      toast.error('Informe o nome do responsável.');
      return;
    }

    const cleanPhone = studentForm.parentPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error('Informe um WhatsApp válido do responsável (com DDD) — obrigatório para cobrança e avisos via Zap.');
      return;
    }

    if (!studentForm.parentEmail.trim() || !studentForm.parentEmail.includes('@')) {
      toast.error('Informe um e-mail válido do responsável — obrigatório para acesso ao App dos Pais.');
      return;
    }

    const canAdd = checkCanAddStudent(profile, activeStudents.length, onOpenUpgradeModal);
    if (!canAdd) return;

    setSavingStep(true);
    try {
      const parsedValue = Number(studentForm.value);
      const finalValue = isNaN(parsedValue) || parsedValue < 0 ? 350 : parsedValue;
      const parsedDay = Number(studentForm.paymentDay);
      const finalDay = isNaN(parsedDay) || parsedDay < 1 ? 10 : Math.min(31, parsedDay);

      const isTarde = studentForm.shift === 'Tarde';
      const entryTime = isTarde ? '13:00' : '07:00';
      const exitTime = isTarde ? '18:00' : '12:00';

      const newStudentData = {
        name: studentForm.name.trim(),
        schoolName: studentForm.schoolName.trim(),
        schoolAddress: studentForm.schoolAddress.trim(),
        shift: studentForm.shift,
        grade: studentForm.shift,
        studentAddress: studentForm.studentAddress.trim(),
        parentName: studentForm.parentName.trim(),
        parentPhone: cleanPhone,
        parentEmail: studentForm.parentEmail.trim(),
        tel1: cleanPhone,
        entryTime,
        exitTime,
        value: finalValue,
        paymentDay: finalDay,
        vehicleId: vehicles[0]?.id || '',
        status: 'Ativo',
        boardingStatus: 'Casa',
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, 'drivers', profile.id, 'students'), newStudentData);

      // Create initial finance record
      await setDoc(doc(db, 'drivers', profile.id, 'finance', docRef.id), {
        studentId: docRef.id,
        studentName: studentForm.name.trim(),
        parentPhone: cleanPhone,
        value: finalValue,
        type: 'Receita',
        status: 'Em Dia',
        paymentDay: finalDay,
        dueDate: `${finalDay}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}`,
        createdAt: new Date().toISOString()
      });

      // Automatically register/update this school in the global collective schools database
      if (studentForm.schoolName && studentForm.schoolAddress) {
        saveOrUpdateGlobalSchool({
          name: studentForm.schoolName,
          address: studentForm.schoolAddress,
          driverId: profile.id,
          driverName: profile.name,
        }).catch((err) => console.warn('Could not sync school globally:', err));
      }

      playBusHornSound();
      toast.success(`Aluno ${studentForm.name} cadastrado com sucesso!`);

      // Reset form
      setStudentForm({
        name: '',
        schoolName: '',
        schoolAddress: '',
        shift: 'Manhã',
        studentAddress: '',
        parentName: '',
        parentPhone: '',
        parentEmail: '',
        value: 350,
        paymentDay: 10,
      });
      setShowAddStudentCard(false);

    } catch (e) {
      console.error('Error saving student', e);
      toast.error('Erro ao cadastrar aluno.');
    } finally {
      setSavingStep(false);
    }
  };

  // Helper to remove student directly if made mistake
  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (!window.confirm(`Tem certeza que deseja remover ${studentName}?`)) return;
    try {
      await deleteDoc(doc(db, 'drivers', profile.id, 'students', studentId));
      toast.success(`Aluno ${studentName} removido.`);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao excluir aluno.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-900 w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800 my-auto relative flex flex-col max-h-[94vh]"
      >
        {/* Header Banner with T.IA Persona */}
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
              Copiloto T.IA • Onboarding Guiado
            </div>
            <span className="text-xs font-bold bg-white/30 px-2.5 py-0.5 rounded-full text-gray-950">
              Passo {activeStep} de 5
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2 text-gray-950">
            Configuração do SchoolVan 🚌💛
          </h2>
          <p className="text-xs sm:text-sm font-medium text-gray-900 mt-1 max-w-xl">
            Olá, <strong>{profile.name || 'Tio(a) da Van'}</strong>! Vou te guiar para deixar seu perfil, van escolar e alunos 100% cadastrados.
          </p>

          {/* Progress Bar */}
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-black text-gray-950">
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
        <div className="grid grid-cols-5 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/80 p-2 gap-1 overflow-x-auto shrink-0">
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
                className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-white dark:bg-gray-800 text-yellow-700 dark:text-yellow-400 shadow-md border-2 border-yellow-400' 
                    : step.isDone
                    ? 'text-emerald-600 dark:text-emerald-400 hover:bg-white/50 dark:hover:bg-gray-800/50'
                    : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
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
        <div className="p-5 sm:p-7 space-y-5 overflow-y-auto flex-1 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          {/* Tio IA Speech Card */}
          <div className="bg-yellow-50 dark:bg-yellow-950/30 border-2 border-yellow-300 dark:border-yellow-500/40 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-yellow-400 text-gray-950 rounded-xl flex items-center justify-center shrink-0 font-black shadow-inner">
                <Bot size={22} />
              </div>
              <div>
                <span className="text-[10px] font-black text-yellow-900 dark:text-yellow-300 uppercase tracking-wider block">
                  Fala da T.IA • Dica do Passo {activeStep}
                </span>
                <p className="text-xs text-gray-900 dark:text-gray-200 font-semibold leading-relaxed mt-0.5">
                  "{stepExplanations[activeStep as keyof typeof stepExplanations]}"
                </p>
              </div>
            </div>

            <button
              onClick={handleSpeakCurrentStep}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm ${
                isSpeaking 
                  ? 'bg-amber-500 text-white animate-pulse' 
                  : 'bg-yellow-400 hover:bg-yellow-300 text-gray-950'
              }`}
              title="Ouvir explicação da T.IA em voz alta"
            >
              {isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}
              {isSpeaking ? 'Pausar Voz' : 'Ouvir T.IA'}
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
                    <div className="w-10 h-10 bg-yellow-400 text-gray-950 rounded-2xl flex items-center justify-center shrink-0 font-black text-lg shadow-sm">
                      1
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-950 dark:text-white">
                        Passo 1: Seu Perfil & Chave Pix Principal
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        O SchoolVan usa seu WhatsApp para suporte e sua Chave Pix para gerar cobranças automáticas com 1 clique aos pais.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/80 p-5 rounded-3xl space-y-4 border-2 border-gray-200 dark:border-gray-700 shadow-sm">
                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-gray-800 dark:text-gray-200 mb-1.5">
                        Seu Nome Completo ou Nome da Van *
                      </label>
                      <input 
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="Ex: Tio Carlos - Van Escolar Estrela"
                        className="w-full px-4 py-3 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-2xl text-sm font-semibold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-500 focus:outline-none shadow-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-gray-800 dark:text-gray-200 mb-1.5">
                          WhatsApp de Atendimento *
                        </label>
                        <input 
                          type="text"
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                          placeholder="(11) 99999-9999"
                          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-2xl text-sm font-semibold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-500 focus:outline-none shadow-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-gray-800 dark:text-gray-200 mb-1.5">
                          Sua Chave Pix Principal *
                        </label>
                        <input 
                          type="text"
                          value={profileForm.pixKey}
                          onChange={(e) => setProfileForm(p => ({ ...p, pixKey: e.target.value }))}
                          placeholder="CPF, CNPJ, Celular, E-mail..."
                          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-2xl text-sm font-semibold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-500 focus:outline-none shadow-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase tracking-wider text-gray-800 dark:text-gray-200 mb-1.5">
                        Cidade / Bairros de Atuação (Opcional)
                      </label>
                      <input 
                        type="text"
                        value={profileForm.city}
                        onChange={(e) => setProfileForm(p => ({ ...p, city: e.target.value }))}
                        placeholder="Ex: São Paulo - Zona Sul (Moema, Vila Mariana, Campo Belo)"
                        className="w-full px-4 py-3 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-2xl text-sm font-semibold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-500 focus:outline-none shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                      {step1Done ? '✅ Dados configurados no sistema!' : '⚠️ Preencha Nome e Pix'}
                    </span>
                    <button
                      onClick={handleSaveProfileStep}
                      disabled={savingStep || !profileForm.name || !profileForm.pixKey}
                      className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      <Save size={16} />
                      Salvar & Avançar para Van <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: VEÍCULO & FROTA */}
              {activeStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-yellow-400 text-gray-950 rounded-2xl flex items-center justify-center shrink-0 font-black text-lg shadow-sm">
                      2
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-gray-950 dark:text-white">
                          Passo 2: Sua Van Escolar
                        </h3>
                        <span className="px-2.5 py-0.5 bg-yellow-400/20 text-yellow-900 dark:text-yellow-300 text-[10px] font-black rounded-full uppercase">
                          1 Van no Plano Gratuito
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        Informe o modelo, placa e capacidade de bancos para calcularmos a ocupação e as vagas livres da rota.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/80 p-5 rounded-3xl space-y-4 border-2 border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-black uppercase tracking-wider text-gray-800 dark:text-gray-200 mb-1.5">
                          Nome ou Identificação da Van *
                        </label>
                        <input 
                          type="text"
                          value={vehicleForm.name}
                          onChange={(e) => setVehicleForm(p => ({ ...p, name: e.target.value }))}
                          placeholder="Ex: Van 01 - Manhã & Tarde"
                          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-2xl text-sm font-semibold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-500 focus:outline-none shadow-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-gray-800 dark:text-gray-200 mb-1.5">
                          Placa do Veículo *
                        </label>
                        <input 
                          type="text"
                          value={vehicleForm.plate}
                          onChange={(e) => setVehicleForm(p => ({ ...p, plate: e.target.value.toUpperCase() }))}
                          placeholder="ABC-1234 / BRA2E19"
                          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-2xl text-sm font-mono font-bold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 uppercase focus:ring-2 focus:ring-yellow-400 focus:border-yellow-500 focus:outline-none shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-gray-800 dark:text-gray-200 mb-1.5">
                          Modelo / Fabricante
                        </label>
                        <input 
                          type="text"
                          value={vehicleForm.model}
                          onChange={(e) => setVehicleForm(p => ({ ...p, model: e.target.value }))}
                          placeholder="Ex: Mercedes Sprinter 415, Renault Master..."
                          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-2xl text-sm font-semibold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-500 focus:outline-none shadow-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-gray-800 dark:text-gray-200 mb-1.5">
                          Capacidade de Assentos para Alunos *
                        </label>
                        <input 
                          type="number"
                          placeholder="15"
                          value={vehicleForm.capacity}
                          onChange={(e) => {
                            const val = e.target.value;
                            setVehicleForm(p => ({ ...p, capacity: val === '' ? '' : Number(val) }));
                          }}
                          min={1}
                          max={60}
                          className="w-full px-4 py-3 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-2xl text-sm font-bold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-500 focus:outline-none shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setActiveStep(1)}
                      className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft size={16} /> Voltar para Perfil
                    </button>
                    <button
                      onClick={handleSaveVehicleStep}
                      disabled={savingStep || !vehicleForm.name || !vehicleForm.plate}
                      className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                      <Save size={16} />
                      Salvar Van & Avançar para Alunos <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: CADASTRO COMPLETO DE ALUNOS */}
              {activeStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-yellow-400 text-gray-950 rounded-2xl flex items-center justify-center shrink-0 font-black text-lg shadow-sm">
                        3
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black text-gray-950 dark:text-white">
                            Passo 3: Alunos da Sua Rota
                          </h3>
                          <span className="px-2.5 py-0.5 bg-yellow-400 text-gray-950 text-xs font-black rounded-full shadow-sm">
                            {activeStudents.length} Alunos Cadastrados
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          Cadastre os alunos com endereço de embarque, escola e WhatsApp do responsável para chamadas e avisos.
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowAddStudentCard(!showAddStudentCard)}
                      className="px-4 py-2.5 bg-gray-950 dark:bg-yellow-400 text-yellow-400 dark:text-gray-950 font-black rounded-2xl text-xs shadow hover:opacity-90 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      {showAddStudentCard ? <X size={15} /> : <Plus size={15} />}
                      <span>{showAddStudentCard ? 'Fechar Formulário' : '+ Novo Aluno'}</span>
                    </button>
                  </div>

                  {/* Form for Full Student Registration */}
                  {(showAddStudentCard || activeStudents.length === 0) && (
                    <form onSubmit={handleSaveStudentStep} className="bg-yellow-50/70 dark:bg-gray-800/90 border-2 border-yellow-400/60 p-5 rounded-3xl space-y-4 shadow-md">
                      <div className="flex items-center justify-between border-b border-yellow-400/30 pb-2">
                        <span className="text-xs font-black uppercase tracking-wider text-yellow-900 dark:text-yellow-400 flex items-center gap-1.5">
                          <Users size={15} /> Formulário Completo de Cadastro de Aluno
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold">
                          Campos com * são obrigatórios
                        </span>
                      </div>

                      {/* Line 1: Nome do Aluno e Série/Turno */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-black uppercase text-gray-800 dark:text-gray-200 mb-1">
                            Nome Completo do Aluno *
                          </label>
                          <input 
                            type="text"
                            placeholder="Ex: Enzo Gabriel da Silva"
                            value={studentForm.name}
                            onChange={(e) => setStudentForm(p => ({ ...p, name: e.target.value }))}
                            required
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-xs sm:text-sm font-semibold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase text-gray-800 dark:text-gray-200 mb-1 flex items-center justify-between">
                            <span>Turno Escolar *</span>
                            <span className="text-[10px] text-amber-700 dark:text-yellow-400 font-bold">Filtra Rota</span>
                          </label>
                          <select
                            value={studentForm.shift}
                            onChange={(e) => setStudentForm(p => ({ ...p, shift: e.target.value }))}
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-xs sm:text-sm font-bold text-gray-950 dark:text-white focus:ring-2 focus:ring-yellow-400 focus:outline-none cursor-pointer"
                          >
                            <option value="Manhã">🌅 Manhã</option>
                            <option value="Tarde">🌇 Tarde</option>
                            <option value="Integral">☀️ Integral</option>
                          </select>
                        </div>
                      </div>

                      {/* Line 2: Endereço do Aluno & Nome da Escola & Endereço da Escola */}
                      <div className="space-y-3">
                        <div>
                          <AddressAutocompleteInput
                            label="Endereço de Residência (Embarque)"
                            helperBadge="Interfere no GPS"
                            required
                            placeholder="Digite rua, número, bairro e cidade (ou CEP)..."
                            value={studentForm.studentAddress}
                            onChange={(val) => setStudentForm(p => ({ ...p, studentAddress: val }))}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <SchoolAutocompleteInput
                              label="Nome da Escola"
                              helperBadge="Banco Coletivo"
                              required
                              placeholder="Digite o nome da escola..."
                              value={studentForm.schoolName}
                              schoolAddress={studentForm.schoolAddress}
                              onChange={(val) => setStudentForm(p => ({ ...p, schoolName: val }))}
                              onSelectSchool={(school) => {
                                setStudentForm(p => ({
                                  ...p,
                                  schoolName: school.name,
                                  schoolAddress: school.address || p.schoolAddress,
                                }));
                                if (school.address) {
                                  toast.success(`Endereço da escola preenchido automaticamente!`, { icon: '🏫' });
                                }
                              }}
                            />
                          </div>

                          <div>
                            <AddressAutocompleteInput
                              label="Endereço Completo da Escola"
                              helperBadge="GPS Escola"
                              required
                              isSchool
                              placeholder="Digite o endereço da escola ou CEP..."
                              value={studentForm.schoolAddress}
                              onChange={(val) => setStudentForm(p => ({ ...p, schoolAddress: val }))}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Line 3: Responsável, WhatsApp e E-mail */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-black uppercase text-gray-800 dark:text-gray-200 mb-1">
                            Nome do Responsável *
                          </label>
                          <input 
                            type="text"
                            placeholder="Ex: Carlos Eduardo (Pai)"
                            value={studentForm.parentName}
                            onChange={(e) => setStudentForm(p => ({ ...p, parentName: e.target.value }))}
                            required
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-xs sm:text-sm font-semibold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase text-gray-800 dark:text-gray-200 mb-1 flex items-center justify-between">
                            <span>WhatsApp do Responsável *</span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Cobrança Zap</span>
                          </label>
                          <input 
                            type="tel"
                            placeholder="(11) 98888-7777"
                            value={studentForm.parentPhone}
                            onChange={(e) => setStudentForm(p => ({ ...p, parentPhone: e.target.value }))}
                            required
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-xs sm:text-sm font-semibold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase text-gray-800 dark:text-gray-200 mb-1 flex items-center justify-between">
                            <span>E-mail do Responsável *</span>
                            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">Acesso Pais</span>
                          </label>
                          <input 
                            type="email"
                            placeholder="carlos@email.com"
                            value={studentForm.parentEmail}
                            onChange={(e) => setStudentForm(p => ({ ...p, parentEmail: e.target.value }))}
                            required
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-xs sm:text-sm font-semibold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Line 4: Financeiro (Valor & Dia de Vencimento) */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-black uppercase text-gray-800 dark:text-gray-200 mb-1">
                            Valor da Mensalidade (R$) *
                          </label>
                          <input 
                            type="number"
                            placeholder="350.00"
                            value={studentForm.value}
                            onChange={(e) => setStudentForm(p => ({ ...p, value: Number(e.target.value) }))}
                            min={0}
                            required
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-xs sm:text-sm font-bold text-gray-950 dark:text-white focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-black uppercase text-gray-800 dark:text-gray-200 mb-1">
                            Dia do Vencimento (1 a 31) *
                          </label>
                          <input 
                            type="number"
                            placeholder="10"
                            value={studentForm.paymentDay}
                            onChange={(e) => setStudentForm(p => ({ ...p, paymentDay: Number(e.target.value) }))}
                            min={1}
                            max={31}
                            required
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-xs sm:text-sm font-bold text-gray-950 dark:text-white focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        {activeStudents.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowAddStudentCard(false)}
                            className="px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white cursor-pointer"
                          >
                            Cancelar
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={savingStep || !studentForm.name.trim()}
                          className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                        >
                          <Save size={16} /> Salvar Aluno na Rota
                        </button>
                      </div>
                    </form>
                  )}

                  {/* List of Registered Students */}
                  {activeStudents.length > 0 ? (
                    <div className="space-y-2.5 pt-1">
                      <div className="text-xs font-black uppercase text-gray-500 dark:text-gray-400 flex items-center justify-between">
                        <span>Alunos já cadastrados ({activeStudents.length})</span>
                        <span>Mensalidade / Vencimento</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                        {activeStudents.map((s) => (
                          <div 
                            key={s.id}
                            className="bg-gray-50 dark:bg-gray-800 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 shadow-sm"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-yellow-400 text-gray-950 flex items-center justify-center font-black text-sm shrink-0">
                                {s.name.charAt(0)}
                              </div>
                              <div>
                                <h5 className="font-bold text-xs sm:text-sm text-gray-950 dark:text-white">
                                  {s.name}
                                </h5>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                  🏫 {s.schoolName || 'Escola Principal'} • 📱 {s.parentPhone || s.parentName || 'Sem tel'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block">
                                  R$ {(s.value || 350).toFixed(2)}
                                </span>
                                <span className="text-[10px] text-gray-400">Dia {s.paymentDay || 10}</span>
                              </div>
                              <button
                                onClick={() => handleDeleteStudent(s.id, s.name)}
                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                                title="Excluir aluno"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                      <p className="text-xs text-gray-500 font-semibold">
                        Nenhum aluno cadastrado ainda. Preencha o formulário acima para adicionar o primeiro aluno!
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={() => setActiveStep(2)}
                      className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft size={16} /> Voltar para Van
                    </button>
                    <button
                      onClick={() => setActiveStep(4)}
                      className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      Avançar para Rotas & GPS <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: ROTAS & SEQUENCIAMENTO GPS */}
              {activeStep === 4 && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-yellow-400 text-gray-950 rounded-2xl flex items-center justify-center shrink-0 font-black text-lg shadow-sm">
                      4
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-950 dark:text-white">
                        Passo 4: Sequenciamento de Rotas & GPS
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        O SchoolVan traça automaticamente a melhor sequência de paradas para economizar tempo e combustível.
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50/80 dark:bg-blue-950/30 border-2 border-blue-200 dark:border-blue-700/50 p-5 rounded-3xl space-y-4 text-center">
                    <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md">
                      <MapPin size={28} />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-gray-950 dark:text-white">
                        Navegação Integrada com Google Maps & Waze
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 max-w-md mx-auto leading-relaxed">
                        Ao iniciar a rota, o SchoolVan abre os endereços dos {activeStudents.length} alunos na ordem exata de parada direto no seu celular.
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateTab('routes');
                        }}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl text-xs sm:text-sm shadow-md transition-all inline-flex items-center gap-2 cursor-pointer active:scale-95"
                      >
                        <MapPin size={16} /> Abrir Módulo Completo de Rotas & GPS
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setActiveStep(3)}
                      className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft size={16} /> Voltar para Alunos
                    </button>
                    <button
                      onClick={() => setActiveStep(5)}
                      className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      Avançar para Conclusão <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 5: PWA, EMBARQUE & FINALIZAÇÃO */}
              {activeStep === 5 && (
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-yellow-400 text-gray-950 rounded-2xl flex items-center justify-center shrink-0 font-black text-lg shadow-sm">
                      5
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-gray-950 dark:text-white">
                        Passo 5: Tudo Pronto para Rodar! 🚌🎉
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                        Seu SchoolVan está 100% configurado. Acesse a Chamada do Embarque no rodapé a qualquer hora.
                      </p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-6 rounded-3xl shadow-xl space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                        <Smartphone size={26} />
                      </div>
                      <div>
                        <h4 className="text-base sm:text-lg font-black">Operação Pronta & Conectada!</h4>
                        <p className="text-xs opacity-90">
                          Cobrança Pix, Van Escolar e Alunos estão salvos no seu banco de dados em tempo real.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={() => {
                          onClose();
                          if (onOpenCheckin) onOpenCheckin();
                        }}
                        className="px-4 py-3 bg-white text-emerald-950 font-black rounded-2xl text-xs shadow hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        <ClipboardCheck size={16} /> Testar Chamada do Embarque
                      </button>

                      <button
                        onClick={() => {
                          onClose();
                          if (onOpenTioIA) onOpenTioIA();
                        }}
                        className="px-4 py-3 bg-black/30 text-yellow-300 font-black rounded-2xl text-xs hover:bg-black/45 border border-yellow-400/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                      >
                        <MessageSquare size={16} /> Conversar com a T.IA
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setActiveStep(4)}
                      className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-950 dark:hover:text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <ChevronLeft size={16} /> Voltar para Rotas
                    </button>
                    <button
                      onClick={() => {
                        playBusHornSound();
                        speakTiaPrompt("Parabéns, parceiro(a)! Seu SchoolVan está configurado e pronto para rodar. Vamos faturar e cuidar da criançada!");
                        onClose();
                      }}
                      className="px-7 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-sm shadow-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                    >
                      <Award size={18} /> Concluir e Ir para o App
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Quick Support / Chat with T.IA button at bottom */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-semibold">
              <ShieldCheck size={15} className="text-emerald-500" />
              <span>Suporte & Dúvidas 100% integrados</span>
            </div>

            <button
              onClick={() => {
                onClose();
                if (onOpenTioIA) onOpenTioIA();
              }}
              className="text-xs font-bold text-yellow-700 dark:text-yellow-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Bot size={14} /> Dúvida? Chamar T.IA
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
