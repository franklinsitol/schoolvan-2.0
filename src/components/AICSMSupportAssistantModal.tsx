import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  X, 
  Zap, 
  RefreshCw,
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  School, 
  Users, 
  DollarSign, 
  Bus, 
  AlertTriangle, 
  CheckCircle2, 
  PhoneCall, 
  Bell,
  Save,
  ArrowRight,
  ChevronLeft,
  Smartphone,
  ClipboardCheck,
  MapPin,
  Award,
  ShieldCheck,
  Compass,
  MessageSquare,
  UserPlus,
  Phone,
  MessageCircle,
  CreditCard,
  PlusCircle,
  Edit3,
  Calendar,
  Layers,
  Check,
  Search,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { Student, Vehicle, Finance, Lead, TeamMember, InvoiceStatus } from '../types';
import { playBusHornSound, speakTiaPrompt, speakTioIAPrompt } from '../lib/sound';
import { checkCanAddStudent, checkCanAddVehicle, checkCanAddTeamMember } from '../lib/plans';
import { getReadNotifications, markNotificationAsRead } from '../lib/tioNotifications';
import { AddressAutocompleteInput } from './AddressAutocompleteInput';
import { db } from '../lib/firebase';
import { doc, updateDoc, collection, addDoc, setDoc } from 'firebase/firestore';
import { 
  markStudentAbsent, 
  reintegrateStudentToRoute, 
  isStudentAbsentOnDate, 
  formatDateBR, 
  getTodayStr 
} from '../lib/absence';
import { 
  formatBillingMessage, 
  calculateStudentBillingStage 
} from '../lib/billingRuleUtils';
import { BulkStudentUploadModal } from './BulkStudentUploadModal';
import toast from 'react-hot-toast';

export interface ContactCardItem {
  id: string;
  studentName: string;
  schoolName: string;
  parentName: string;
  parentPhone: string;
  value?: number;
  paymentDay?: number;
  isAbsentToday: boolean;
  status: string;
  invoiceStatus?: InvoiceStatus;
}

export interface StudentDraft {
  studentId?: string;
  mode?: 'create' | 'edit';
  name: string;
  schoolName: string;
  schoolAddress?: string;
  shift: string; // 'Manhã' | 'Tarde' | 'Integral'
  studentAddress: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  value: number | string;
  paymentDay: number | string;
  currentAskingField?: 'name' | 'school' | 'shift' | 'address' | 'parent' | 'finance' | 'review';
  isDraftSaved?: boolean;
}

export interface ActionCardData {
  type: 'student_created' | 'student_updated' | 'team_created' | 'team_updated' | 'vehicle_created' | 'vehicle_updated' | 'payment_updated';
  title: string;
  description: string;
  icon?: string;
  success: boolean;
  primaryActionLabel?: string;
  primaryActionUrl?: string;
  details?: Record<string, string | number>;
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  actionCard?: ActionCardData;
  contactCards?: ContactCardItem[];
  studentDraft?: StudentDraft;
}

interface AICSMSupportAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUpgradeModal: (reason?: string) => void;
  initialMode?: 'chat' | 'onboarding';
  onOpenStudentModal?: () => void;
  onOpenCheckin?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export function AICSMSupportAssistantModal({ 
  isOpen, 
  onClose,
  onOpenUpgradeModal,
  initialMode = 'chat',
  onOpenStudentModal,
  onOpenCheckin,
  onNavigateTab
}: AICSMSupportAssistantModalProps) {
  const { profile } = useAuth();
  
  // Real-time Database queries for complete context awareness
  const { data: students } = useFirestore<Student>(profile?.id ? `drivers/${profile.id}/students` : '');
  const { data: vehicles } = useFirestore<Vehicle>(profile?.id ? `drivers/${profile.id}/vehicles` : '');
  const { data: finances } = useFirestore<Finance>(profile?.id ? `drivers/${profile.id}/finance` : '');
  const { data: leads } = useFirestore<Lead>(profile?.id ? `drivers/${profile.id}/leads` : '');
  const { data: teamMembers } = useFirestore<TeamMember>(profile?.id ? `drivers/${profile.id}/team` : '');

  const [activeTab, setActiveTab] = useState<'chat' | 'onboarding'>(initialMode);
  const [onboardingStep, setOnboardingStep] = useState(0); // 0 = Welcome & Presentation, 1 = Profile & Pix, 2 = Vehicle, 3 = Students, 4 = Ready
  const [savingStep, setSavingStep] = useState(false);
  const [isSpeakingOnboarding, setIsSpeakingOnboarding] = useState(false);

  // Form states for Onboarding inline completion inside Tio IA
  const [profileForm, setProfileForm] = useState({
    name: profile?.name || '',
    phone: profile?.phone || '',
    pixKey: profile?.pixKey || '',
  });

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

  const [quickStudentForm, setQuickStudentForm] = useState<{
    name: string;
    schoolName: string;
    schoolAddress: string;
    shift: string;
    studentAddress: string;
    parentName: string;
    parentPhone: string;
    parentEmail: string;
    value: number | string;
    paymentDay: number | string;
  }>({
    name: '',
    schoolName: '',
    schoolAddress: '',
    shift: 'Manhã',
    studentAddress: '',
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    value: 350,
    paymentDay: 10
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
        capacity: vehicles[0].capacity !== undefined ? vehicles[0].capacity : 15,
      });
    }
  }, [vehicles]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
    }
  }, [isOpen, initialMode]);

  const [readNotifs, setReadNotifs] = useState<string[]>(getReadNotifications());

  useEffect(() => {
    const handleUpdate = () => setReadNotifs(getReadNotifications());
    window.addEventListener('tioia_notifications_updated', handleUpdate);
    return () => window.removeEventListener('tioia_notifications_updated', handleUpdate);
  }, []);

  const handleMarkAsRead = (notifId: string) => {
    markNotificationAsRead(notifId);
    setReadNotifs(getReadNotifications());
    toast.success('Aviso marcado como lido!');
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: `Olá ${profile?.name ? `Tio(a) ${profile.name}` : 'Tio(a) da Van'}! Sou a **T.IA**, sua copiloto inteligente conectada ao banco de dados do seu SchoolVan. 🚌🤖\n\nEstou com o microfone ativado e acesso em tempo real à sua lista de alunos, faturas, vagas e presença de hoje!\n\n**O que você quer saber?** Pode me perguntar por voz ou texto:`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [activeTemplateStudentId, setActiveTemplateStudentId] = useState<string | null>(null);
  const [activeStudentDraft, setActiveStudentDraft] = useState<StudentDraft | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Quick contextual prompts matching user exact requests
  const defaultQuickQuestions = [
    '➕ Cadastrar novo aluno passo a passo',
    '📊 Importar Alunos em Massa (Excel/CSV)',
    '💸 QUAIS alunos eu preciso cobrar esse mês?',
    '📱 Falar com os pais / Acionar no Zap',
    '👥 Cadastrar monitora Juliana 11977776666',
    '🚐 Cadastrar van Master placa ABC-1234 capacidade 20',
    '🚫 Quem NÃO vai hoje para a escola?',
    '🏫 Quem são os alunos de cada escola?',
    '💺 Quantos assentos / vagas tenho disponíveis?'
  ];

  const draftQuickQuestions = [
    '💾 Salvar Rascunho / Continuar Depois',
    '✅ Concluir Cadastro Agora',
    'Turno Manhã',
    'Turno Tarde',
    'Turno Integral',
    'Vencimento Dia 10',
    '❌ Cancelar Cadastro'
  ];

  const quickQuestions = activeStudentDraft ? draftQuickQuestions : defaultQuickQuestions;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && activeTab === 'chat') {
      scrollToBottom();

      const todayStr = new Date().toISOString().split('T')[0];
      const activeStudents = students.filter(s => s.status !== 'Excluido');
      const absentStudents = activeStudents.filter(s => 
        s.ausenteHoje || 
        s.boardingStatus === 'NÃO VAI' || 
        (s.absenceDates && s.absenceDates.includes(todayStr))
      );

      let alertsText = '';
      if (absentStudents.length > 0) {
        alertsText += `\n\n🚍 **AVISO DE AUSÊNCIA HOJE**: Os responsáveis de **${absentStudents.map(s => s.name).join(', ')}** avisaram que ele(s) **NÃO VÃO** para a escola hoje! Sua rota já está liberada.`;
      }
      if (profile?.invoiceStatus === 'Em Atraso') {
        alertsText += `\n\n💳 **AVISO DE MENSALIDADE**: Tio, sua licença da plataforma venceu. Lembre-se de copiar a chave Pix para manter seus avisos ativos aos pais.`;
      }

      setMessages([
        {
          id: '1',
          sender: 'ai',
          text: `Olá ${profile?.name ? `Tio(a) ${profile.name}` : 'Tio(a) da Van'}! Sou a **T.IA**, sua copiloto inteligente do SchoolVan. 🚌🤖${alertsText}\n\nEstou com o microfone ativado e acesso em tempo real à sua lista de alunos, faturas, vagas e presença de hoje!\n\n**O que você quer saber?** Pode me perguntar por voz ou texto:`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [isOpen, activeTab]);

  // Cleanup speech synthesis and recognition on modal unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  if (!isOpen) return null;

  // Onboarding Step Calculations
  const userPlan = profile?.plan || 'Gratuito';
  const step1Done = Boolean(profile?.name && profile?.phone && profile?.pixKey);
  const step2Done = vehicles.length > 0;
  const step3Done = students.filter(s => s.status !== 'Excluido').length > 0;
  const step4Done = Boolean(step1Done && step2Done && step3Done);

  const completedStepsCount = [step1Done, step2Done, step3Done, step4Done].filter(Boolean).length;
  const onboardingProgress = Math.round((completedStepsCount / 4) * 100);

  // Step explanations in T.IA persona with true warmth & welcoming tone
  const stepNarrations = {
    0: `Fala ${profile?.name ? `Tio(a) ${profile.name.split(' ')[0]}` : 'Tio(a) da Van'}! Seja muito bem-vindo ao SchoolVan! Eu sou a T.IA, sua copiloto 24 horas. Eu sei bem que a rotina do transporte escolar é corrida com trânsito, lista de papel e cobrança no Zap. Por isso cheguei pra ser seu braço direito e tirar esse peso das suas costas. Vamos configurar tudo juntinhos em 2 minutinhos?`,
    1: `Primeiro passo, Tio! Me informe seu WhatsApp de atendimento e sua Chave Pix principal. Assim o SchoolVan gera as mensagens de cobrança com sua Chave Pix prontas para enviar no Zap dos pais com um clique, sem você ter que ficar cobrando manualmente!`,
    2: `Show de bola! Agora vamos cadastrar a sua Van Escolar. Me fale o modelo, a placa e a quantidade de assentos. Com esses dados eu já calculo automaticamente quantas vagas você tem livres para faturar mais!`,
    3: `Excelente! Agora vamos adicionar os primeiros alunos da sua rota escolar. Com eles aqui, você faz a chamada do embarque no celular todo dia e os pais recebem aviso em tempo real quando o filho entra na van!`,
    4: `Parabéns! Sua van está configurada e pronta para rodar com tranquilidade. Conte comigo para tudo! Lembre-se que você pode usar o botão Chamada do Embarque no rodapé todo dia e me chamar no chat a qualquer hora!`
  };

  const handleSpeakOnboardingStep = (stepToSpeak?: number) => {
    const targetStep = stepToSpeak !== undefined ? stepToSpeak : onboardingStep;
    if (isSpeakingOnboarding) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeakingOnboarding(false);
      return;
    }

    const textToSpeak = stepNarrations[targetStep as keyof typeof stepNarrations];
    if (textToSpeak) {
      setIsSpeakingOnboarding(true);
      playBusHornSound();
      speakTioIAPrompt(textToSpeak);
      setTimeout(() => setIsSpeakingOnboarding(false), 16000);
    }
  };

  // Real-time Database Snapshot Builder for Gemini Prompt & Context Engine
  const activeStudents = students.filter(s => s.status !== 'Excluido');
  
  const totalCapacity = vehicles.length > 0 
    ? vehicles.reduce((sum, v) => sum + (v.capacity || 0), 0) 
    : 20;
  const availableVacancies = Math.max(0, totalCapacity - activeStudents.length);

  const studentsBySchool: Record<string, Student[]> = {};
  activeStudents.forEach(s => {
    const school = s.schoolName?.trim() || 'Escola Não Informada';
    if (!studentsBySchool[school]) studentsBySchool[school] = [];
    studentsBySchool[school].push(s);
  });

  const todayStr = new Date().toISOString().split('T')[0];
  const absentStudents = activeStudents.filter(s => 
    s.ausenteHoje || 
    s.boardingStatus === 'NÃO VAI' || 
    (s.absenceDates && s.absenceDates.includes(todayStr))
  );

  const overdueFinances = finances.filter(f => f.status === 'Em Atraso' && f.type === 'Receita');

  // --- Onboarding Handlers inside Tio IA ---
  const handleSaveProfileStep = async () => {
    if (!profile?.id) return;
    setSavingStep(true);
    try {
      await updateDoc(doc(db, 'drivers', profile.id), {
        name: profileForm.name,
        phone: profileForm.phone,
        pixKey: profileForm.pixKey,
      });
      playBusHornSound();
      toast.success('Perfil e Chave Pix salvos com sucesso!');
      setOnboardingStep(2);
      speakTioIAPrompt("Perfil e Pix salvos, Tio! Agora vamos cadastrar sua Van Escolar.");
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar perfil.');
    } finally {
      setSavingStep(false);
    }
  };

  const handleSaveVehicleStep = async () => {
    if (!profile?.id) return;
    
    // Check Vehicle Limits if creating a new vehicle when already having vehicle(s)
    const isAddingNewVehicle = vehicles.length > 0 && !vehicles[0]?.id;
    if (isAddingNewVehicle) {
      const allowed = checkCanAddVehicle(profile, vehicles.length, onOpenUpgradeModal);
      if (!allowed) return;
    }

    setSavingStep(true);
    try {
      const parsedCapacity = Number(vehicleForm.capacity);
      const finalCapacity = isNaN(parsedCapacity) || parsedCapacity < 1 ? 15 : parsedCapacity;

      if (vehicles.length > 0 && vehicles[0]?.id) {
        await updateDoc(doc(db, 'drivers', profile.id, 'vehicles', vehicles[0].id), {
          name: vehicleForm.name || 'Van Principal',
          model: vehicleForm.model,
          plate: vehicleForm.plate,
          capacity: finalCapacity,
        });
      } else {
        await addDoc(collection(db, 'drivers', profile.id, 'vehicles'), {
          name: vehicleForm.name || 'Van Principal',
          model: vehicleForm.model,
          plate: vehicleForm.plate,
          capacity: finalCapacity,
          status: 'Ativo',
          createdAt: new Date().toISOString()
        });
      }
      playBusHornSound();
      toast.success('Van escolar cadastrada com sucesso!');
      setOnboardingStep(3);
      speakTioIAPrompt("Van cadastrada com sucesso, Tio! Agora vamos adicionar os alunos da rota.");
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar veículo.');
    } finally {
      setSavingStep(false);
    }
  };

  const handleQuickAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;

    if (!quickStudentForm.name.trim()) {
      toast.error('Informe o nome completo do aluno.');
      return;
    }

    if (!quickStudentForm.shift) {
      toast.error('Selecione o turno (Manhã/Tarde/Integral) — obrigatório para separar as rotas.');
      return;
    }

    if (!quickStudentForm.studentAddress.trim()) {
      toast.error('Informe o endereço da residência para embarque — obrigatório para trajeto GPS da rota.');
      return;
    }

    if (!quickStudentForm.schoolName.trim()) {
      toast.error('Informe o nome da escola de destino.');
      return;
    }

    if (!quickStudentForm.schoolAddress.trim()) {
      toast.error('Informe o endereço completo da escola — obrigatório para trajeto GPS da rota.');
      return;
    }

    if (!quickStudentForm.parentName.trim()) {
      toast.error('Informe o nome do responsável.');
      return;
    }

    const cleanPhone = quickStudentForm.parentPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      toast.error('Informe um WhatsApp válido do responsável (com DDD) — obrigatório para cobrança e avisos.');
      return;
    }

    if (!quickStudentForm.parentEmail.trim() || !quickStudentForm.parentEmail.includes('@')) {
      toast.error('Informe um e-mail válido do responsável — obrigatório para acesso ao App dos Pais.');
      return;
    }

    const allowed = checkCanAddStudent(profile, students.length, onOpenUpgradeModal);
    if (!allowed) return;

    setSavingStep(true);
    try {
      const parsedValue = Number(quickStudentForm.value);
      const finalValue = isNaN(parsedValue) || parsedValue < 0 ? 350 : parsedValue;
      const parsedDay = Number(quickStudentForm.paymentDay);
      const finalDay = isNaN(parsedDay) || parsedDay < 1 ? 10 : Math.min(31, parsedDay);

      const isTarde = quickStudentForm.shift === 'Tarde';
      const entryTime = isTarde ? '13:00' : '07:00';
      const exitTime = isTarde ? '18:00' : '12:00';

      const docRef = await addDoc(collection(db, 'drivers', profile.id, 'students'), {
        name: quickStudentForm.name.trim(),
        schoolName: quickStudentForm.schoolName.trim(),
        schoolAddress: quickStudentForm.schoolAddress.trim(),
        shift: quickStudentForm.shift,
        grade: quickStudentForm.shift,
        studentAddress: quickStudentForm.studentAddress.trim(),
        parentName: quickStudentForm.parentName.trim(),
        parentPhone: cleanPhone,
        parentEmail: quickStudentForm.parentEmail.trim(),
        tel1: cleanPhone,
        entryTime,
        exitTime,
        value: finalValue,
        paymentDay: finalDay,
        vehicleId: vehicles[0]?.id || '',
        status: 'Ativo',
        boardingStatus: 'Casa',
        createdAt: new Date().toISOString()
      });

      // Create initial finance record
      await setDoc(doc(db, 'drivers', profile.id, 'finance', docRef.id), {
        studentId: docRef.id,
        studentName: quickStudentForm.name.trim(),
        parentPhone: cleanPhone,
        value: finalValue,
        type: 'Receita',
        status: 'Em Dia',
        paymentDay: finalDay,
        dueDate: `${finalDay}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}`,
        createdAt: new Date().toISOString()
      });

      playBusHornSound();
      toast.success(`Aluno ${quickStudentForm.name} cadastrado com sucesso!`);
      setQuickStudentForm({
        name: '',
        schoolName: '',
        schoolAddress: '',
        shift: 'Manhã',
        studentAddress: '',
        parentName: '',
        parentPhone: '',
        parentEmail: '',
        value: 350,
        paymentDay: 10
      });
      speakTioIAPrompt(`Aluno cadastrado! Você já pode adicionar outro aluno ou avançar para o próximo passo.`);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao cadastrar aluno.');
    } finally {
      setSavingStep(false);
    }
  };

  // Voice Recognition (Speech to Text)
  const toggleVoiceRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error('Reconhecimento de voz não é suportado pelo seu navegador atual. Você pode digitar sua mensagem.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }

      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        toast('🎤 Ouvindo você... Fale sua dúvida ou comando!', { icon: '🤖', id: 'tia-listening' });
      };

      recognition.onresult = (event: any) => {
        if (event.results && event.results[0] && event.results[0][0]) {
          const transcript = event.results[0][0].transcript;
          setInputText(transcript);
          setIsListening(false);
          toast.dismiss('tia-listening');
          handleSendMessage(transcript, true); // true indicates input came via audio / voice
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        toast.dismiss('tia-listening');

        const errorType = event?.error || (typeof event === 'string' ? event : '');

        if (errorType === 'no-speech') {
          // Normal timeout if user remained silent, don't show alarming error
          return;
        }

        if (errorType === 'aborted') {
          return;
        }

        if (errorType === 'not-allowed' || errorType === 'service-not-allowed') {
          toast.error('Permissão de microfone bloqueada pelo navegador. Ative o microfone ou digite sua mensagem.', { duration: 4000 });
          return;
        }

        if (errorType === 'audio-capture') {
          toast.error('Nenhum microfone encontrado neste dispositivo.');
          return;
        }

        // Generic fallback without crashing
        console.warn('Speech recognition status:', errorType, event);
        toast.error('Não foi possível captar a voz. Tente falar novamente ou digite.', { duration: 3000 });
      };

      recognition.onend = () => {
        setIsListening(false);
        toast.dismiss('tia-listening');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn('Could not start speech recognition:', err);
      setIsListening(false);
      toast.dismiss('tia-listening');
      toast.error('Não foi possível iniciar o microfone no momento. Digite sua mensagem.');
    }
  };

  // Text to Speech Output with Tio IA Masculine Voice
  const toggleSpeakMessage = (msgId: string, text: string) => {
    if (speakingMsgId === msgId) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setSpeakingMsgId(null);
      return;
    }

    setSpeakingMsgId(msgId);
    speakTioIAPrompt(text);
    setTimeout(() => {
      setSpeakingMsgId(null);
    }, 15000);
  };

  // Helper to format phone for WhatsApp
  const formatPhoneForWA = (rawPhone: string) => {
    const clean = (rawPhone || '').replace(/\D/g, '');
    if (!clean) return '';
    return clean.startsWith('55') ? clean : `55${clean}`;
  };

  // Helper to build WhatsApp message links
  const createWhatsAppUrl = (phone: string, text: string) => {
    const formatted = formatPhoneForWA(phone);
    if (!formatted) return '#';
    return `https://wa.me/${formatted}?text=${encodeURIComponent(text)}`;
  };

  // Save student draft to continue later
  const handleSaveDraftLater = async (draftToSave?: StudentDraft) => {
    const current = draftToSave || activeStudentDraft;
    if (!current || !profile?.id) return;

    const studentName = current.name.trim() || 'Aluno (Rascunho)';
    
    const draftData = {
      name: studentName,
      schoolName: current.schoolName.trim() || 'A definir',
      grade: current.shift || 'Manhã',
      studentAddress: current.studentAddress.trim() || '',
      parentName: current.parentName.trim() || 'Responsável',
      parentPhone: current.parentPhone.trim() || profile.phone || '',
      tel1: current.parentPhone.trim() || profile.phone || '',
      value: Number(current.value) || 350,
      paymentDay: Number(current.paymentDay) || 10,
      vehicleId: vehicles[0]?.id || '',
      status: 'Ativo',
      boardingStatus: 'Casa',
      isDraft: true,
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'drivers', profile.id, 'students'), draftData);
      playBusHornSound();
      toast.success(`Rascunho de ${studentName} salvo com sucesso!`);

      const saveMessage: Message = {
        id: Date.now().toString(),
        sender: 'ai',
        text: `💾 **Rascunho Salvo com Sucesso, Tio!**\n\nGuardei os dados do(a) **${studentName}** com segurança. Você pode continuar o preenchimento a qualquer momento pelo chat ou na lista de alunos!\n\n• **Nome:** ${studentName}\n• **Escola:** ${current.schoolName || 'A definir'} (${current.shift || 'Manhã'})\n• **Endereço:** ${current.studentAddress || 'Pendente'}\n• **Mensalidade:** R$ ${Number(current.value || 350).toFixed(2)}\n• **Responsável:** ${current.parentName || 'Pai/Mãe'} (${current.parentPhone || 'Sem tel'})`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionCard: {
          type: 'student_created',
          title: 'Rascunho do Aluno Salvo!',
          description: `${studentName} foi salvo como rascunho e pode ser continuado a qualquer momento.`,
          success: true,
          details: {
            'Aluno': studentName,
            'Escola': current.schoolName || 'A definir',
            'Mensalidade': `R$ ${Number(current.value || 350).toFixed(2)}`,
            'Status': 'Rascunho Salvo'
          }
        }
      };

      setMessages(prev => [...prev, saveMessage]);
      speakTiaPrompt(`Rascunho de ${studentName} salvo com sucesso!`);
      setActiveStudentDraft(null);
    } catch (error) {
      console.error('Error saving draft', error);
      toast.error('Erro ao salvar rascunho.');
    }
  };

  // Complete student draft (create or edit) and write to Firestore + Finance
  const handleCompleteDraft = async (draftToComplete?: StudentDraft) => {
    const current = draftToComplete || activeStudentDraft;
    if (!current || !profile?.id) return;

    const studentName = current.name.trim();
    if (!studentName) {
      toast.error('Por favor, informe o nome do aluno!');
      return;
    }

    const studentValue = Number(current.value) || 350;
    const paymentDay = Number(current.paymentDay) || 10;
    const schoolName = current.schoolName.trim() || 'Escola Principal';
    const parentName = current.parentName.trim() || 'Responsável';
    const parentPhone = current.parentPhone.trim() || profile.phone || '';

    // If Editing Existing Student
    if (current.studentId && current.mode === 'edit') {
      const updatePayload: Partial<Student> = {
        name: studentName,
        schoolName: schoolName,
        grade: current.shift || 'Manhã',
        studentAddress: current.studentAddress.trim() || '',
        parentName: parentName,
        parentPhone: parentPhone,
        tel1: parentPhone,
        value: studentValue,
        paymentDay: paymentDay
      };

      try {
        await updateDoc(doc(db, 'drivers', profile.id, 'students', current.studentId), updatePayload);

        // Update Finance record
        try {
          await updateDoc(doc(db, 'drivers', profile.id, 'finance', current.studentId), {
            studentName: studentName,
            parentPhone: parentPhone,
            value: studentValue,
            paymentDay: paymentDay,
            dueDate: `${paymentDay}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}`
          });
        } catch {
          // If finance doc didn't exist, ignore or create
        }

        playBusHornSound();
        toast.success(`Cadastro de ${studentName} atualizado com sucesso!`);

        const directAnswer = `🎉 **Prontinho, Tio!** As alterações do aluno **${studentName}** foram salvas no sistema:\n\n• **Escola:** ${schoolName} (${current.shift || 'Manhã'})\n• **Endereço:** ${current.studentAddress || 'Ponto combinado'}\n• **Mensalidade:** R$ ${studentValue.toFixed(2)} (Vencimento todo dia ${paymentDay})\n• **Responsável:** ${parentName} ${parentPhone ? `(Zap: ${parentPhone})` : ''}`;

        const updateMsg: Message = {
          id: Date.now().toString(),
          sender: 'ai',
          text: directAnswer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          actionCard: {
            type: 'student_updated',
            title: 'Cadastro do Aluno Atualizado!',
            description: `Dados de ${studentName} atualizados com sucesso.`,
            success: true,
            details: {
              'Aluno': studentName,
              'Escola': `${schoolName} (${current.shift || 'Manhã'})`,
              'Endereço': current.studentAddress || 'Ponto combinado',
              'Mensalidade': `R$ ${studentValue.toFixed(2)}`,
              'Responsável': `${parentName} (${parentPhone || 'Sem tel'})`
            }
          },
          contactCards: [{
            id: current.studentId,
            studentName: studentName,
            schoolName: schoolName,
            parentName: parentName,
            parentPhone: parentPhone,
            value: studentValue,
            paymentDay: paymentDay,
            isAbsentToday: false,
            status: 'Ativo',
            invoiceStatus: 'Em Dia'
          }]
        };

        setMessages(prev => [...prev, updateMsg]);
        speakTiaPrompt(`Show de bola, Tio! Os dados de ${studentName} foram atualizados com sucesso.`);
        setActiveStudentDraft(null);
      } catch (error) {
        console.error('Error updating student', error);
        toast.error('Erro ao atualizar aluno.');
      }
      return;
    }

    // Creating New Student
    const canAdd = checkCanAddStudent(profile, activeStudents.length, onOpenUpgradeModal);
    if (!canAdd) {
      return;
    }

    const newStudentData = {
      name: studentName,
      schoolName: schoolName,
      grade: current.shift || 'Manhã',
      studentAddress: current.studentAddress.trim() || '',
      parentName: parentName,
      parentPhone: parentPhone,
      tel1: parentPhone,
      value: studentValue,
      paymentDay: paymentDay,
      vehicleId: vehicles[0]?.id || '',
      status: 'Ativo',
      boardingStatus: 'Casa',
      createdAt: new Date().toISOString()
    };

    try {
      const newDocRef = await addDoc(collection(db, 'drivers', profile.id, 'students'), newStudentData);

      // Also create initial invoice in finance
      await setDoc(doc(db, 'drivers', profile.id, 'finance', newDocRef.id), {
        studentId: newDocRef.id,
        studentName: studentName,
        parentPhone: parentPhone,
        value: studentValue,
        type: 'Receita',
        status: 'Em Dia',
        paymentDay: paymentDay,
        dueDate: `${paymentDay}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}`,
        createdAt: new Date().toISOString()
      });

      playBusHornSound();
      toast.success(`Aluno ${studentName} cadastrado com sucesso!`);

      const directAnswer = `🎉 **Show de bola, Tio!** O aluno **${studentName}** foi cadastrado com sucesso na sua lista escolar!\n\n• **Escola:** ${schoolName} (${current.shift || 'Manhã'})\n• **Endereço:** ${current.studentAddress || 'Ponto combinado'}\n• **Mensalidade:** R$ ${studentValue.toFixed(2)} (Vencimento todo dia ${paymentDay})\n• **Responsável:** ${parentName} ${parentPhone ? `(Zap: ${parentPhone})` : ''}\n\nVocê já pode enviar as boas-vindas no WhatsApp com 1 clique abaixo:`;

      const completeMsg: Message = {
        id: Date.now().toString(),
        sender: 'ai',
        text: directAnswer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionCard: {
          type: 'student_created',
          title: 'Aluno Cadastrado com Sucesso!',
          description: `${studentName} agora faz parte da sua rota escolar.`,
          success: true,
          details: {
            'Aluno': studentName,
            'Escola': `${schoolName} (${current.shift || 'Manhã'})`,
            'Endereço': current.studentAddress || 'Ponto combinado',
            'Mensalidade': `R$ ${studentValue.toFixed(2)}`,
            'Responsável': `${parentName} (${parentPhone || 'Sem tel'})`
          }
        },
        contactCards: [{
          id: newDocRef.id,
          studentName: studentName,
          schoolName: schoolName,
          parentName: parentName,
          parentPhone: parentPhone,
          value: studentValue,
          paymentDay: paymentDay,
          isAbsentToday: false,
          status: 'Ativo',
          invoiceStatus: 'Em Dia'
        }]
      };

      setMessages(prev => [...prev, completeMsg]);
      speakTiaPrompt(`Show de bola, Tio! O aluno ${studentName} foi cadastrado com sucesso na sua rota escolar.`);
      setActiveStudentDraft(null);
    } catch (error) {
      console.error('Error completing student draft', error);
      toast.error('Erro ao cadastrar aluno.');
    }
  };

  // Cancel student draft
  const handleCancelDraft = () => {
    setActiveStudentDraft(null);
    const cancelMsg: Message = {
      id: Date.now().toString(),
      sender: 'ai',
      text: 'Sem problemas, Tio! Cancelei o cadastro em andamento. O que mais posso te ajudar?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, cancelMsg]);
    speakTiaPrompt('Cadastro cancelado. O que mais posso te ajudar?');
  };

  // Update in-progress draft fields
  const handleUpdateDraft = (updates: Partial<StudentDraft>) => {
    setActiveStudentDraft(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      setMessages(msgs => msgs.map(m => m.studentDraft ? { ...m, studentDraft: updated } : m));
      return updated;
    });
  };

  // Instant response engine for greetings, thanks, farewells & compliments
  // Responds in 0ms with zero database queries, zero token overhead and zero API calls.
  const getInstantConversationalReply = (rawQuery: string): string | null => {
    const clean = rawQuery
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^\w\s]/g, ' ') // replace symbols/punctuation with spaces
      .replace(/\s+/g, ' ')
      .trim();

    if (!clean) return null;

    // If query contains any keywords of database/operational intent, DO NOT intercept!
    const operationalKeywords = [
      'cadastr', 'adiciona', 'aluno', 'aluna', 'escola', 'colegio', 'valor', 'mensalidade',
      'quanto', 'quem', 'falta', 'ausente', 'nao vai', 'vai hoje', 'pagou', 'pix', 'receber',
      'atrasad', 'devedor', 'devendo', 'contato', 'telefone', 'zap', 'whatsapp', 'pai', 'mae',
      'responsavel', 'rota', 'mapa', 'embarque', 'desembarque', 'van', 'placa', 'monitor',
      'recado', 'aviso', 'atraso', 'pneu', 'transito', 'vaga', 'lugares', 'capacidade',
      'relatorio', 'planilha', 'excel', 'importar', 'editar', 'alterar', 'mudar', 'excluir',
      'remover', 'cancelar', 'contrato', 'recibo', 'declaracao', 'extrato', 'presenca', 'historico'
    ];

    const hasOperationalIntent = operationalKeywords.some(kw => clean.includes(kw));
    if (hasOperationalIntent) {
      return null; // Route to operational database logic
    }

    // Identify driver greeting name/title
    const rawName = profile?.name?.trim() || '';
    const firstName = rawName.split(' ')[0] || '';
    const driverTitle = firstName 
      ? (firstName.toLowerCase().startsWith('tio') || firstName.toLowerCase().startsWith('tia') ? firstName : `Tio ${firstName}`)
      : 'Tio';

    const hour = new Date().getHours();

    // 1. THANKS & GRATITUDE (Agradecimentos)
    const isGratitude = /^(obrigad[oa]|obrigadao|muito obrigad[oa]|valeu|valeu demais|valeu tia|valeu tio|valeu t ia|valeu a ajuda|agradeco|agradecido|obg|vlw|show|show de bola|top|maravilha|perfeito|tmj|tamo junto|gratidao|brigad[oa]|obrigadissim[oa]|era so isso|era isso|ajudou muito|ficou top|ficou show|beleza valeu|valeu valeu|muitissimo obrigad[oa])(\s+(tia|tio|t ia|schoolvan|amiga|demais|show|top))?$/.test(clean) ||
      /^(muito|super|valeu)\s+(obrigad[oa]|grato|grata|valeu|show|top)$/.test(clean);

    if (isGratitude) {
      const thanksOptions = [
        `**Por nada, ${driverTitle}!** Tamo junto! Se precisar de qualquer coisa na rota ou na van, é só me chamar.`,
        `**Show de bola, ${driverTitle}!** Fico muito feliz em ajudar. Uma rota tranquila e produtiva para você! Conte sempre comigo.`,
        `**Imagina, ${driverTitle}!** Prazer em ajudar! Seu dia a dia no volante fica muito mais leve e organizado com a SchoolVan. Bom trabalho!`,
        `**Tamo junto, ${driverTitle}!** Disponha sempre! Se pintar qualquer dúvida no trânsito ou no financeiro, estou por aqui.`
      ];
      return thanksOptions[Math.floor(Math.random() * thanksOptions.length)];
    }

    // 2. FAREWELLS / GOOD WISHES (Despedidas e Votos)
    const isFarewell = /^(tchau|tchau tchau|ate mais|ate logo|ate breve|falou|bom trabalho|boa rota|bom descanso|boa semana|bom fim de semana|bom fds|fica com deus|vai com deus|boa viagem|otimo dia|otima semana|otimo trabalho)(\s+(tia|tio|t ia|pra voce|pra vc))?$/.test(clean);

    if (isFarewell) {
      return `**Até mais, ${driverTitle}!** Tenha uma excelente rota e um dia abençoado com a van! Se precisar de qualquer coisa no caminho, é só dar um toque. Fique com Deus!`;
    }

    // 3. COMPLIMENTS (Elogios)
    const isCompliment = /^(voce e|vc e|voce esta|vc ta)\s+(demais|top|incrivel|maravilhosa|muito boa|10|dez|show|uma maquina)$/.test(clean) ||
      /^(gostei de voce|adorei a tia|melhor app|parabens|voce e fera|vc e fera)$/.test(clean);

    if (isCompliment) {
      return `**Muito obrigada pelo carinho, ${driverTitle}!** O objetivo da T.IA e de toda a SchoolVan é exatamente esse: ser o seu braço direito no volante e cuidar da parte burocrática para você focar em dirigir. Tamo junto!`;
    }

    // 4. GREETINGS (Saudações)
    const isGreeting = /^(oi|oii|oiii|ola|opa|e ai|eai|salve|fala|fala ai|fala aí|fala tio|fala tia|fala t ia|oi tia|oi tio|oi t ia|ola tia|ola tio|ola t ia|boa|beleza|tudo bem|tudo bom|tudo joia|como vai|como voce ta|como vc ta|como voce esta|como esta|bom dia|boa tarde|boa noite|alo|alô|bom dia tia|boa tarde tia|boa noite tia|bom dia tio|boa tarde tio|boa noite tio)(\s+(tia|tio|t ia|tudo bem|tudo bom|tudo joia|beleza|amiga|ai))?$/.test(clean);

    if (isGreeting) {
      if (clean.includes('bom dia')) {
        return `**Bom dia, ${driverTitle}!** Tudo pronto para a rota de hoje. Como posso te ajudar agora? Você pode cadastrar alunos, ver faltas do dia, conferir pagamentos ou enviar avisos no WhatsApp.`;
      }
      if (clean.includes('boa tarde')) {
        return `**Boa tarde, ${driverTitle}!** Rota da tarde a todo vapor! O que você precisa hoje na sua van?`;
      }
      if (clean.includes('boa noite')) {
        return `**Boa noite, ${driverTitle}!** Fechando o expediente? Posso te ajudar a conferir os pagamentos do dia, planejar a rota de amanhã ou deixar recados prontos. O que manda?`;
      }

      const greetingOptions = [
        `**Fala, ${driverTitle}!** Tudo ótimo por aqui! Em que posso te ajudar hoje na sua van?\n\n*(Dica: você pode me pedir para cadastrar alunos, marcar faltas na rota, puxar contatos no WhatsApp ou ver pagamentos!)*`,
        `**Olá, ${driverTitle}!** A T.IA está sempre a postos para facilitar sua rotina no transporte escolar. O que você precisa agora?`,
        `**Opa, ${driverTitle}! Tudo joia?** Diga aí o que você precisa: conferir presença dos alunos, checar mensalidades ou organizar suas rotas?`
      ];
      return greetingOptions[Math.floor(Math.random() * greetingOptions.length)];
    }

    return null;
  };

  // Send Message Logic with Gemini Context & Full Operational Action Engine
  // If isFromVoice is true (user spoke into mic), T.IA speaks back automatically.
  // If typed/clicked via text, T.IA responds in text only, and user can tap "Ouvir Resposta em Voz Alta".
  const handleSendMessage = async (textToSend?: string, isFromVoice: boolean = false) => {
    const query = textToSend || inputText;
    if (!query.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // -----------------------------------------------------------------
    // ⚡ 0. INSTANT ZERO-DATABASE CONVERSATIONAL INTERCEPTOR
    // Handles greetings, thanks, farewells & compliments instantly in 0ms!
    // Does NOT query Firestore collections, does NOT call Gemini API.
    // -----------------------------------------------------------------
    const instantReply = getInstantConversationalReply(query);
    if (instantReply) {
      const instantAiMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: instantReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, instantAiMessage]);
      if (isFromVoice) {
        speakTioIAPrompt(instantReply.replace(/[*#_`]/g, ''));
      }
      scrollToBottom();
      return;
    }

    setLoading(true);

    try {
      let directAnswer = '';
      let actionCard: ActionCardData | undefined = undefined;
      let contactCards: ContactCardItem[] | undefined = undefined;
      let generatedDraft: StudentDraft | undefined = undefined;
      const lower = query.toLowerCase().trim();

      // -------------------------------------------------------------
      // 1. ACTIVE STUDENT DRAFT CONVERSATION FLOW
      // -------------------------------------------------------------
      if (activeStudentDraft && profile?.id) {
        // Option A: Cancel
        if (
          lower.includes('cancelar') || 
          lower.includes('cancela') || 
          lower.includes('deixa pra lá') || 
          lower.includes('não quero mais') ||
          lower.includes('parar')
        ) {
          handleCancelDraft();
          setLoading(false);
          return;
        }

        // Option B: Save Draft & Continue Later
        if (
          lower.includes('salvar rascunho') || 
          lower.includes('salva rascunho') || 
          lower.includes('continuar depois') || 
          lower.includes('continua depois') || 
          lower.includes('salva depois') || 
          lower.includes('salvar depois') || 
          lower.includes('guardar rascunho')
        ) {
          await handleSaveDraftLater(activeStudentDraft);
          setLoading(false);
          return;
        }

        // Option C: Conclude / Finalize Registration
        if (
          lower.includes('concluir') || 
          lower.includes('finalizar') || 
          lower.includes('salvar agora') || 
          lower.includes('cadastrar agora') || 
          lower.includes('pode salvar') || 
          lower.includes('pode cadastrar') ||
          lower.includes('concluir cadastro')
        ) {
          await handleCompleteDraft(activeStudentDraft);
          setLoading(false);
          return;
        }

        // Option D: Conversational Step-by-Step Field Filling
        const updatedDraft: StudentDraft = { ...activeStudentDraft };

        // 1. Check Shift
        if (lower.includes('manhã') || lower.includes('manha') || lower.includes('matutino')) {
          updatedDraft.shift = 'Manhã';
        } else if (lower.includes('tarde') || lower.includes('vespertino')) {
          updatedDraft.shift = 'Tarde';
        } else if (lower.includes('integral')) {
          updatedDraft.shift = 'Integral';
        }

        // 2. Check Phone
        const phoneMatch = query.match(/(\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4})/);
        if (phoneMatch) {
          updatedDraft.parentPhone = phoneMatch[0].replace(/\D/g, '');
        }

        // 3. Check Value
        const valueMatch = query.match(/(?:valor|mensalidade|r\$)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i) || query.match(/(\d+)\s*(?:reais|mensal)/i);
        if (valueMatch) {
          updatedDraft.value = parseFloat(valueMatch[1].replace(',', '.'));
        }

        // 4. Check Payment Day
        const dayMatch = query.match(/(?:dia|vencimento|todo dia)\s*[:=]?\s*(\d{1,2})/i);
        if (dayMatch) {
          const d = parseInt(dayMatch[1], 10);
          if (d >= 1 && d <= 31) updatedDraft.paymentDay = d;
        }

        // 5. Context-based Field Assignment
        const currentField = activeStudentDraft.currentAskingField || 'name';

        if (currentField === 'name' && !updatedDraft.name) {
          const cleanName = query
            .replace(/^(o nome é|o nome do aluno é|o aluno se chama|o aluno é|nome:|é o|é a|chama)\s+/i, '')
            .split(/[,;]|\bescola\b|\bturno\b|\bcolegio\b/i)[0]
            .trim();
          updatedDraft.name = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
        } else if (currentField === 'school' && (!updatedDraft.schoolName || updatedDraft.schoolName === 'A definir')) {
          const cleanSchool = query
            .replace(/^(a escola é|escola|colégio|colegio|estuda no|estuda na|vai para|vai pro)\s+/i, '')
            .split(/[,;]|\bturno\b|\bde manhã\b|\bde tarde\b|\bmãe\b|\bpai\b/i)[0]
            .trim();
          updatedDraft.schoolName = cleanSchool.charAt(0).toUpperCase() + cleanSchool.slice(1);
        } else if (currentField === 'address' && !updatedDraft.studentAddress) {
          if (!lower.includes('pular') && !lower.includes('não sei') && !lower.includes('depois')) {
            const cleanAddr = query
              .replace(/^(mora na|mora no|endereço é|o endereço é|rua|av|avenida)\s+/i, (match) => {
                return (match.toLowerCase().includes('rua') || match.toLowerCase().includes('av')) ? match : '';
              })
              .trim();
            updatedDraft.studentAddress = cleanAddr;
          } else {
            updatedDraft.studentAddress = 'Ponto combinado';
          }
        } else if (currentField === 'parent' && (!updatedDraft.parentName || !updatedDraft.parentPhone)) {
          const parentMatch = query.match(/(?:pai|mãe|mae|responsável|responsavel)\s+([A-Za-zÀ-ÿ]+)/i);
          if (parentMatch) {
            updatedDraft.parentName = parentMatch[1].trim();
          } else if (!updatedDraft.parentName && query.split(' ')[0].length > 2 && !query.includes('11') && !phoneMatch) {
            updatedDraft.parentName = query.split(' ')[0];
          }
        } else if (currentField === 'finance') {
          const numMatch = query.match(/\b\d{2,4}\b/);
          if (numMatch && !valueMatch) {
            const val = parseFloat(numMatch[0]);
            if (val >= 100) updatedDraft.value = val;
          }
        }

        // Determine what is the next missing field
        let nextField: 'name' | 'school' | 'address' | 'parent' | 'finance' | 'review' = 'review';
        if (!updatedDraft.name) {
          nextField = 'name';
          directAnswer = `Com certeza, Tio! Para começar: **qual é o nome completo do aluno?**\n\n*(Você também pode preencher na fichinha abaixo ou salvar como rascunho para continuar depois)*`;
        } else if (!updatedDraft.schoolName || updatedDraft.schoolName === 'A definir') {
          nextField = 'school';
          directAnswer = `Show de bola! Já anotei o nome **${updatedDraft.name}**. 🏫\n\nQual é a **escola de destino** e o **turno** (Manhã, Tarde ou Integral) dele(a)?`;
        } else if (!updatedDraft.studentAddress) {
          nextField = 'address';
          directAnswer = `Perfeito! Escola **${updatedDraft.schoolName} (${updatedDraft.shift || 'Manhã'})** anotada. 📍\n\nQual é o **endereço da casa** (ponto de embarque do ${updatedDraft.name})?\n\n💡 *Se quiser pular, basta dizer "pular" ou "salvar rascunho".*`;
        } else if (!updatedDraft.parentPhone || !updatedDraft.parentName) {
          nextField = 'parent';
          directAnswer = `Ótimo! 👨‍👩‍👧 Quem é o **responsável** (pai ou mãe) e qual o **WhatsApp com DDD** para recados da van?`;
        } else if (!updatedDraft.value || !updatedDraft.paymentDay) {
          nextField = 'finance';
          directAnswer = `Maravilha! 💰 Qual o **valor da mensalidade** (R$) e o **dia de vencimento** (1 a 31)?`;
        } else {
          nextField = 'review';
          directAnswer = `🎉 **Tudo preenchido, Tio!** Confira a fichinha completa do(a) **${updatedDraft.name}** abaixo.\n\nPodemos **concluir o cadastro agora** ou você deseja salvar como rascunho para revisar depois?`;
        }

        updatedDraft.currentAskingField = nextField;
        setActiveStudentDraft(updatedDraft);
        generatedDraft = updatedDraft;
      }

      // -------------------------------------------------------------
      // 2. ACTION: CADASTRAR ALUNO (START STEP-BY-STEP OR COMPLETE)
      // -------------------------------------------------------------
      else if (
        (lower.includes('cadastrar aluno') || 
         lower.includes('cadastra aluno') || 
         lower.includes('adicionar aluno') || 
         lower.includes('adiciona aluno') || 
         lower.includes('novo aluno') ||
         lower.includes('cadastre um aluno') ||
         lower.includes('quero cadastrar') ||
         lower.includes('incluir aluno') ||
         lower.includes('cadastro de aluno')) && 
        profile?.id
      ) {
        // Check student limits for the active plan
        const canAdd = checkCanAddStudent(profile, activeStudents.length, onOpenUpgradeModal);
        if (!canAdd) {
          setLoading(false);
          return;
        }

        // Clean query to parse details if provided
        const cleanQuery = query
          .replace(/^(cadastre|cadastrar|cadastra|adicionar|adiciona|novo|incluir|quero cadastrar)(\s+um|\s+o)?\s+aluno(\s*:)?/i, '')
          .trim();

        let studentName = '';
        let schoolName = '';
        let shift = 'Manhã';
        let parentName = '';
        let parentPhone = '';
        let studentAddress = '';
        let studentValue = 350;
        let paymentDay = 10;

        // Shift detection
        if (lower.includes('manhã') || lower.includes('manha') || lower.includes('matutino')) {
          shift = 'Manhã';
        } else if (lower.includes('tarde') || lower.includes('vespertino')) {
          shift = 'Tarde';
        } else if (lower.includes('integral')) {
          shift = 'Integral';
        }

        // Phone detection
        const phoneMatch = cleanQuery.match(/(\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4})/);
        if (phoneMatch) {
          parentPhone = phoneMatch[0].replace(/\D/g, '');
        }

        // Value detection
        const valueMatch = cleanQuery.match(/(?:valor|mensalidade|r\$)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i) || cleanQuery.match(/(\d+)\s*(?:reais|mensal)/i);
        if (valueMatch) {
          studentValue = parseFloat(valueMatch[1].replace(',', '.'));
        }

        // School detection
        const schoolMatch = cleanQuery.match(/(?:escola|colégio|colegio)\s+([^,;.]+)/i);
        if (schoolMatch) {
          schoolName = schoolMatch[1].trim();
        }

        // Parent detection
        const parentMatch = cleanQuery.match(/(?:pai|mãe|mae|responsável|responsavel)\s+([A-Za-zÀ-ÿ]+)/i);
        if (parentMatch) {
          parentName = parentMatch[1].trim();
        }

        // Name segment extraction
        const namePart = cleanQuery.split(/[,;]|\bescola\b|\bcolegio\b|\bpai\b|\bmãe\b|\btelefone\b|\bzap\b|\bvalor\b|\bturno\b/i)[0].trim();
        if (namePart && namePart.length > 1 && !namePart.toLowerCase().includes('para mim') && !namePart.toLowerCase().includes('um aluno')) {
          studentName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        }

        // Case A: User sent generic command like "cadastre um aluno para mim" or no name
        if (!studentName) {
          const initialDraft: StudentDraft = {
            name: '',
            schoolName: schoolName || '',
            shift: shift,
            studentAddress: '',
            parentName: parentName || '',
            parentPhone: parentPhone || '',
            value: studentValue,
            paymentDay: paymentDay,
            currentAskingField: 'name'
          };

          setActiveStudentDraft(initialDraft);
          generatedDraft = initialDraft;

          directAnswer = `Com certeza, Tio! Vamos cadastrar o aluno juntos passo a passo. 📝✨\n\nPrimeiro: **Qual é o nome completo do aluno?**\n\n*(Você pode ir me respondendo por voz/texto ou preencher os campos na fichinha interativa abaixo. E pode salvar como rascunho para continuar depois quando quiser!)*`;
        } 
        // Case B: Full info already provided in single command
        else if (studentName && schoolName && parentPhone) {
          const newStudentData = {
            name: studentName,
            schoolName: schoolName,
            grade: shift,
            studentAddress: studentAddress || 'Ponto combinado',
            parentName: parentName || 'Responsável',
            parentPhone: parentPhone || profile.phone || '',
            tel1: parentPhone || profile.phone || '',
            value: studentValue,
            paymentDay: paymentDay,
            vehicleId: vehicles[0]?.id || '',
            status: 'Ativo',
            boardingStatus: 'Casa',
            createdAt: new Date().toISOString()
          };

          const newDocRef = await addDoc(collection(db, 'drivers', profile.id, 'students'), newStudentData);

          await setDoc(doc(db, 'drivers', profile.id, 'finance', newDocRef.id), {
            studentId: newDocRef.id,
            studentName: studentName,
            parentPhone: parentPhone || profile.phone || '',
            value: studentValue,
            type: 'Receita',
            status: 'Em Dia',
            paymentDay: paymentDay,
            dueDate: `${paymentDay}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}`,
            createdAt: new Date().toISOString()
          });

          playBusHornSound();
          toast.success(`Aluno ${studentName} cadastrado com sucesso!`);

          directAnswer = `🎉 **Show de bola, Tio!** O aluno **${studentName}** foi cadastrado com sucesso na sua lista escolar!\n\n• **Escola:** ${schoolName} (${shift})\n• **Mensalidade:** R$ ${studentValue.toFixed(2)} (Vencimento todo dia ${paymentDay})\n• **Responsável:** ${parentName || 'Responsável'} ${parentPhone ? `(Zap: ${parentPhone})` : ''}\n\nVocê já pode enviar as boas-vindas no WhatsApp com 1 clique abaixo:`;

          actionCard = {
            type: 'student_created',
            title: 'Aluno Cadastrado com Sucesso!',
            description: `${studentName} agora faz parte da sua van escolar.`,
            success: true,
            details: {
              'Aluno': studentName,
              'Escola': `${schoolName} (${shift})`,
              'Mensalidade': `R$ ${studentValue.toFixed(2)}`,
              'Responsável': `${parentName || 'Responsável'} (${parentPhone || 'Sem tel'})`
            }
          };

          contactCards = [{
            id: newDocRef.id,
            studentName: studentName,
            schoolName: schoolName,
            parentName: parentName || 'Responsável',
            parentPhone: parentPhone || profile.phone || '',
            value: studentValue,
            paymentDay: paymentDay,
            isAbsentToday: false,
            status: 'Ativo',
            invoiceStatus: 'Em Dia'
          }];
        }
        // Case C: Partial info provided (e.g. "cadastrar aluno Sophia" or "cadastrar Pedro na escola Objetivo")
        else {
          let nextField: 'school' | 'parent' | 'address' = 'school';
          if (!schoolName) nextField = 'school';
          else if (!parentPhone) nextField = 'parent';
          else nextField = 'address';

          const partialDraft: StudentDraft = {
            name: studentName,
            schoolName: schoolName || '',
            shift: shift,
            studentAddress: studentAddress,
            parentName: parentName,
            parentPhone: parentPhone,
            value: studentValue,
            paymentDay: paymentDay,
            currentAskingField: nextField
          };

          setActiveStudentDraft(partialDraft);
          generatedDraft = partialDraft;

          directAnswer = `Show de bola, Tio! Já anotei o nome **${studentName}**${schoolName ? ` e a escola **${schoolName}**` : ''}. 🏫\n\nQual é ${!schoolName ? 'a **escola de destino** e o **turno** (Manhã, Tarde ou Integral)' : !parentPhone ? 'o **nome e WhatsApp do responsável** (pai ou mãe)' : 'o **endereço da casa** (ponto de embarque)'} dele(a)?\n\n*(Você pode ir me respondendo por voz ou preencher os campos na ficha abaixo. Pode salvar como rascunho a qualquer momento!)*`;
        }
      }

      // -------------------------------------------------------------
      // 2. ACTION: EDITAR ALUNO (UPDATE STUDENT)
      // -------------------------------------------------------------
      else if (
        (lower.includes('mudar escola') || 
         lower.includes('alterar escola') || 
         lower.includes('mudar valor') || 
         lower.includes('alterar valor') || 
         lower.includes('mudar telefone') || 
         lower.includes('alterar telefone') || 
         lower.includes('mudar endereço') ||
         lower.includes('alterar endereço') ||
         lower.includes('mudar turno') ||
         lower.includes('alterar turno') ||
         lower.includes('editar aluno') ||
         lower.includes('alterar aluno') ||
         lower.includes('editar o aluno') ||
         lower.includes('alterar o aluno') ||
         lower.includes('editar a aluna') ||
         lower.includes('alterar a aluna') ||
         lower.startsWith('editar ') ||
         lower.startsWith('alterar ')) && 
        profile?.id
      ) {
        // Find which student
        const targetStudent = activeStudents.find(s => 
          lower.includes(s.name.toLowerCase()) || 
          (s.name.toLowerCase().split(' ')[0].length > 2 && lower.includes(s.name.toLowerCase().split(' ')[0]))
        );

        if (targetStudent) {
          const updates: Partial<Student> = {};
          const changesSummary: string[] = [];

          // School change
          const schoolMatch = query.match(/(?:escola|colégio|colegio|para a escola|para o colégio)\s+([^,;.]+)/i);
          if (schoolMatch) {
            updates.schoolName = schoolMatch[1].trim();
            changesSummary.push(`Escola alterada para: **${updates.schoolName}**`);
          }

          // Shift change
          if (lower.includes('turno manhã') || lower.includes('de manhã') || lower.includes('turno da manhã')) {
            updates.grade = 'Manhã';
            changesSummary.push(`Turno alterado para: **Manhã**`);
          } else if (lower.includes('turno tarde') || lower.includes('de tarde') || lower.includes('turno da tarde')) {
            updates.grade = 'Tarde';
            changesSummary.push(`Turno alterado para: **Tarde**`);
          } else if (lower.includes('integral')) {
            updates.grade = 'Integral';
            changesSummary.push(`Turno alterado para: **Integral**`);
          }

          // Value change
          const valueMatch = query.match(/(?:valor|mensalidade|para r\$|para)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i);
          if (valueMatch && (lower.includes('valor') || lower.includes('mensalidade') || lower.includes('r$'))) {
            updates.value = parseFloat(valueMatch[1].replace(',', '.'));
            changesSummary.push(`Mensalidade alterada para: **R$ ${updates.value.toFixed(2)}**`);
          }

          // Phone change
          const phoneMatch = query.match(/(\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4})/);
          if (phoneMatch && (lower.includes('telefone') || lower.includes('zap') || lower.includes('contato'))) {
            updates.parentPhone = phoneMatch[0].replace(/\D/g, '');
            changesSummary.push(`Telefone do responsável alterado para: **${updates.parentPhone}**`);
          }

          // Address change
          const addressMatch = query.match(/(?:endereço|endereco|mora na|mora no|rua|av|avenida)\s+([^,;.]+)/i);
          if (addressMatch && (lower.includes('endereço') || lower.includes('endereco') || lower.includes('rua') || lower.includes('avenida'))) {
            updates.studentAddress = addressMatch[1].trim();
            changesSummary.push(`Endereço alterado para: **${updates.studentAddress}**`);
          }

          if (Object.keys(updates).length > 0) {
            await updateDoc(doc(db, 'drivers', profile.id, 'students', targetStudent.id), updates);
            
            // If value changed, update finance
            if (updates.value) {
              try {
                await updateDoc(doc(db, 'drivers', profile.id, 'finance', targetStudent.id), {
                  value: updates.value
                });
              } catch {}
            }

            playBusHornSound();
            toast.success(`Aluno ${targetStudent.name} atualizado!`);

            directAnswer = `✅ **Prontinho, Tio!** Os dados do aluno **${targetStudent.name}** foram atualizados no sistema:\n\n${changesSummary.map(c => `• ${c}`).join('\n')}`;

            actionCard = {
              type: 'student_updated',
              title: 'Cadastro do Aluno Atualizado!',
              description: `Alterações salvas para ${targetStudent.name}.`,
              success: true,
              details: {
                'Aluno': targetStudent.name,
                'Escola Atual': updates.schoolName || targetStudent.schoolName || 'Principal',
                'Mensalidade': updates.value ? `R$ ${updates.value.toFixed(2)}` : `R$ ${(targetStudent.value || 350).toFixed(2)}`
              }
            };

            contactCards = [{
              id: targetStudent.id,
              studentName: targetStudent.name,
              schoolName: updates.schoolName || targetStudent.schoolName || 'Principal',
              parentName: targetStudent.parentName || 'Responsável',
              parentPhone: updates.parentPhone || targetStudent.parentPhone || targetStudent.tel1 || '',
              value: updates.value || targetStudent.value || 350,
              paymentDay: targetStudent.paymentDay || 10,
              isAbsentToday: false,
              status: 'Ativo',
              invoiceStatus: 'Em Dia'
            }];
          } else {
            // Open interactive edit draft populated with student data
            const studentDraftToEdit: StudentDraft = {
              studentId: targetStudent.id,
              mode: 'edit',
              name: targetStudent.name,
              schoolName: targetStudent.schoolName || '',
              shift: targetStudent.grade || 'Manhã',
              studentAddress: targetStudent.studentAddress || '',
              parentName: targetStudent.parentName || '',
              parentPhone: targetStudent.parentPhone || targetStudent.tel1 || '',
              value: targetStudent.value || 350,
              paymentDay: targetStudent.paymentDay || 10,
              currentAskingField: 'review'
            };

            setActiveStudentDraft(studentDraftToEdit);
            generatedDraft = studentDraftToEdit;

            directAnswer = `Tio, abri a **ficha completa do(a) ${targetStudent.name}** abaixo! 📝✨\n\nVocê pode me dizer por voz o que deseja alterar (ex: *"muda a escola para Objetivo"*, *"muda a mensalidade para 450"*) ou editar diretamente nos campos abaixo e clicar em **Salvar Alterações**!`;
          }
        } else {
          directAnswer = `Tio, não encontrei esse aluno na sua lista de ${activeStudents.length} alunos cadastrados. Diga o nome como cadastrado (Ex: "Editar o Pedro" ou "Mudar escola do Lucas para Colégio Objetivo").`;
        }
      }

      // -------------------------------------------------------------
      // 3. ACTION: CADASTRAR MONITOR(A) / EQUIPE (CREATE TEAM MEMBER)
      // -------------------------------------------------------------
      else if (
        (lower.includes('cadastrar monitor') || 
         lower.includes('cadastrar monitora') || 
         lower.includes('nova monitora') || 
         lower.includes('novo monitor') || 
         lower.includes('adicionar monitor') || 
         lower.includes('adicionar monitora') ||
         lower.includes('cadastrar colaborador') ||
         lower.includes('novo colaborador')) && 
        profile?.id
      ) {
        const canAdd = checkCanAddTeamMember(profile, onOpenUpgradeModal);
        if (!canAdd) {
          setLoading(false);
          return;
        }

        let memberName = '';
        let memberPhone = '';
        let memberType: 'Monitor' | 'Motorista' = lower.includes('motorista') ? 'Motorista' : 'Monitor';

        const phoneMatch = query.match(/(\(?\d{2}\)?\s*9?\d{4}[-\s]?\d{4})/);
        if (phoneMatch) {
          memberPhone = phoneMatch[0].replace(/\D/g, '');
        }

        const nameMatch = query.replace(/.*(?:monitora|monitor|colaborador|motorista)\s+/i, '').split(/[,;]|\btelefone\b|\bzap\b/i)[0].trim();
        memberName = nameMatch || 'Novo Monitor';
        memberName = memberName.charAt(0).toUpperCase() + memberName.slice(1);

        const newTeamData = {
          name: memberName,
          phone: memberPhone || profile.phone || '',
          email: `${memberName.toLowerCase().replace(/\s+/g, '')}@schoolvan.com`,
          memberType: memberType,
          role: 'colab',
          ownerId: profile.id,
          status: 'Ativo',
          vehicleId: vehicles[0]?.id || '',
          createdAt: new Date().toISOString()
        };

        const teamDocRef = await addDoc(collection(db, 'drivers', profile.id, 'team'), newTeamData);
        if (newTeamData.email) {
          await setDoc(doc(db, 'collaborator_invites', newTeamData.email.toLowerCase()), {
            ...newTeamData,
            teamMemberDocId: teamDocRef.id,
            ownerDriverName: profile.name || 'Tio da Van'
          }, { merge: true });
        }
        playBusHornSound();
        toast.success(`${memberType} ${memberName} cadastrado(a) com sucesso!`);

        directAnswer = `👥 **Show de bola, Tio!** ${memberType === 'Monitor' ? 'A monitora / O monitor' : 'O motorista colaborador'} **${memberName}** foi adicionado(a) à sua equipe!\n\n• **Função:** ${memberType}\n• **WhatsApp:** ${memberPhone || 'Não informado'}\n• **Van Vinculada:** ${vehicles[0]?.name || 'Van Principal'}\n\nEle(a) já pode acessar o aplicativo de monitoramento para registrar embarques da rota!`;

        actionCard = {
          type: 'team_created',
          title: 'Membro da Equipe Cadastrado!',
          description: `${memberName} adicionado(a) como ${memberType}.`,
          success: true,
          details: {
            'Nome': memberName,
            'Função': memberType,
            'WhatsApp': memberPhone || 'Sem tel',
            'Van': vehicles[0]?.name || 'Van Principal'
          }
        };
      }

      // -------------------------------------------------------------
      // 4. ACTION: CADASTRAR NOVA VAN (CREATE VEHICLE)
      // -------------------------------------------------------------
      else if (
        (lower.includes('cadastrar van') || 
         lower.includes('adicionar van') || 
         lower.includes('nova van') || 
         lower.includes('cadastrar veiculo') || 
         lower.includes('novo veiculo') ||
         lower.includes('adicionar veiculo')) && 
        profile?.id
      ) {
        const canAdd = checkCanAddVehicle(profile, vehicles.length, onOpenUpgradeModal);
        if (!canAdd) {
          setLoading(false);
          return;
        }

        let vanName = `Van ${(vehicles.length + 1).toString().padStart(2, '0')}`;
        let model = 'Mercedes Sprinter';
        let plate = 'ABC-1234';
        let capacity = 15;

        // Extract capacity (e.g. "capacidade 20", "20 lugares", "20 assentos")
        const capMatch = query.match(/(\d+)\s*(?:lugares|assentos|vagas|capacidade)/i) || query.match(/capacidade\s*[:=]?\s*(\d+)/i);
        if (capMatch) {
          capacity = parseInt(capMatch[1], 10);
        }

        // Extract plate (e.g. "placa ABC1234", "placa ABC-1234", "placa BRA2E19")
        const plateMatch = query.match(/placa\s*[:=]?\s*([A-Za-z]{3}[-\s]?\d[A-Za-z0-9]\d{2})/i);
        if (plateMatch) {
          plate = plateMatch[1].toUpperCase().replace(/\s+/g, '-');
        }

        // Extract model
        if (lower.includes('sprinter')) model = 'Mercedes Sprinter';
        else if (lower.includes('master')) model = 'Renault Master';
        else if (lower.includes('ducato')) model = 'Fiat Ducato';
        else if (lower.includes('transit')) model = 'Ford Transit';
        else if (lower.includes('kombi')) model = 'VW Kombi';

        const newVehicleData = {
          name: vanName,
          model: model,
          plate: plate,
          capacity: capacity,
          status: 'Ativo',
          createdAt: new Date().toISOString()
        };

        await addDoc(collection(db, 'drivers', profile.id, 'vehicles'), newVehicleData);
        playBusHornSound();
        toast.success(`Van ${vanName} cadastrada com sucesso!`);

        directAnswer = `🚐 **Sensacional, Tio!** Sua nova van escolar foi cadastrada com sucesso na frota!\n\n• **Identificação:** ${vanName}\n• **Modelo:** ${model}\n• **Placa:** ${plate}\n• **Capacidade:** ${capacity} assentos (${capacity} novas vagas livres)\n\nSua frota agora conta com **${vehicles.length + 1} veículos** operacionais!`;

        actionCard = {
          type: 'vehicle_created',
          title: 'Nova Van Cadastrada na Frota!',
          description: `${vanName} (${model}) adicionada com sucesso.`,
          success: true,
          details: {
            'Veículo': vanName,
            'Modelo': model,
            'Placa': plate,
            'Capacidade': `${capacity} assentos`
          }
        };
      }

      // -------------------------------------------------------------
      // 5. ACTION: REINTEGRAR ALUNO À ROTA / PAI MUDOU DE IDEIA / VAI HOJE
      // -------------------------------------------------------------
      else if (
        (lower.includes('vai hoje') || 
         lower.includes('vai sim') || 
         lower.includes('reintegrar') || 
         lower.includes('voltar para a rota') || 
         lower.includes('voltar pra rota') || 
         lower.includes('colocar na rota') || 
         lower.includes('coloca na rota') || 
         lower.includes('por na rota') || 
         lower.includes('põe na rota') || 
         lower.includes('tirar falta') || 
         lower.includes('tira falta') || 
         lower.includes('remover falta') || 
         lower.includes('cancelar falta') || 
         lower.includes('pai mudou de ideia') || 
         lower.includes('pai ligou') || 
         lower.includes('mãe ligou') || 
         lower.includes('mae ligou') || 
         lower.includes('confirmar presenca') || 
         lower.includes('confirmar presença')) && 
        !lower.includes('não vai') && 
        !lower.includes('nao vai') && 
        profile?.id
      ) {
        const today = getTodayStr();
        // Look in all students including absent ones
        const targetStudent = students.find(s => 
          lower.includes(s.name.toLowerCase()) || 
          (s.name.toLowerCase().split(' ')[0].length > 2 && lower.includes(s.name.toLowerCase().split(' ')[0]))
        );

        if (targetStudent) {
          await reintegrateStudentToRoute(profile.id, targetStudent.id, targetStudent, today);
          playBusHornSound();
          toast.success(`🎉 ${targetStudent.name} reintegrado(a) à rota de hoje!`);

          directAnswer = `🎉 **Prontinho, Tio!** O aluno **${targetStudent.name}** foi **reintegrado à rota de hoje (${formatDateBR(today)})**!\n\n• **Status:** Presente na rota ativa\n• **Endereço:** ${targetStudent.studentAddress || 'Ponto combinado'}\n• **Escola:** ${targetStudent.schoolName || 'Escola'}\n\n✅ O endereço dele já voltou para a lista de paradas e para a navegação do Google Maps GPS. Boa viagem!`;

          actionCard = {
            type: 'student_updated',
            title: 'Aluno Reintegrado à Rota!',
            description: `${targetStudent.name} está de volta à rota de hoje.`,
            success: true,
            details: {
              'Aluno': targetStudent.name,
              'Data': formatDateBR(today),
              'Status': 'Presente na Rota',
              'Escola': targetStudent.schoolName || 'Escola'
            }
          };

          contactCards = [{
            id: targetStudent.id,
            studentName: targetStudent.name,
            schoolName: targetStudent.schoolName || 'Escola Principal',
            parentName: targetStudent.parentName || 'Responsável',
            parentPhone: targetStudent.parentPhone || '',
            value: targetStudent.value,
            paymentDay: targetStudent.paymentDay,
            isAbsentToday: false,
            status: targetStudent.status,
            invoiceStatus: 'Em Dia'
          }];
        } else {
          directAnswer = `Tio, diga qual aluno o responsável avisou que vai participar da rota (Ex: "O pai do Pedro ligou e ele vai hoje" ou "Reintegrar o Enzo na rota").`;
        }
      }

      // -------------------------------------------------------------
      // 6. ACTION: MARCAR FALTA / AGENDAR AUSÊNCIA ESCOLAR
      // -------------------------------------------------------------
      else if (
        (lower.includes('não vai') || 
         lower.includes('nao vai') || 
         lower.includes('vai faltar') || 
         lower.includes('marcar falta') || 
         lower.includes('marcar como ausente') || 
         lower.includes('aviso de falta') || 
         lower.includes('agendar falta') || 
         lower.includes('tirar da rota')) && 
        !lower.includes('quem') && 
        !lower.includes('quais') && 
        profile?.id
      ) {
        const today = getTodayStr();
        let targetDate = today;

        // Check if query specifies "amanhã"
        if (lower.includes('amanhã') || lower.includes('amanha')) {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          targetDate = `${y}-${m}-${day}`;
        } else {
          // Check for date pattern DD/MM or YYYY-MM-DD
          const dateMatchBR = query.match(/(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/);
          if (dateMatchBR) {
            const day = dateMatchBR[1].padStart(2, '0');
            const month = dateMatchBR[2].padStart(2, '0');
            const year = dateMatchBR[3] ? (dateMatchBR[3].length === 2 ? `20${dateMatchBR[3]}` : dateMatchBR[3]) : new Date().getFullYear().toString();
            targetDate = `${year}-${month}-${day}`;
          }
        }

        const targetStudent = students.find(s => 
          lower.includes(s.name.toLowerCase()) || 
          (s.name.toLowerCase().split(' ')[0].length > 2 && lower.includes(s.name.toLowerCase().split(' ')[0]))
        );

        if (targetStudent) {
          const isToday = targetDate === today;
          await markStudentAbsent(
            profile.id, 
            targetStudent.id, 
            targetStudent, 
            targetDate, 
            isToday ? 'Aviso de ausência registrado pelo motorista/T.IA' : 'Falta agendada via T.IA'
          );
          playBusHornSound();
          toast.success(`Aviso de falta de ${targetStudent.name} registrado para ${formatDateBR(targetDate)}!`);

          directAnswer = `🚫 **Aviso de Ausência Registrado, Tio!** O aluno **${targetStudent.name}** foi marcado como ausente **apenas para a data ${formatDateBR(targetDate)}**.\n\n• **Logística:** Ele foi colocado na área **"Alunos Fora da Rota"** e não será incluído no trajeto do GPS desse dia.\n• **Automático:** Nas outras datas, ele continua normalmente na rota!\n• **Flexível:** Se o pai ligar mudando de ideia, você pode arrastá-lo de volta para a rota ou me pedir por voz (*"O ${targetStudent.name} vai hoje"*)!`;

          actionCard = {
            type: 'student_updated',
            title: isToday ? 'Falta de Hoje Registrada' : 'Falta Futura Agendada',
            description: `${targetStudent.name} ficará ausente apenas em ${formatDateBR(targetDate)}.`,
            success: true,
            details: {
              'Aluno': targetStudent.name,
              'Data da Falta': formatDateBR(targetDate),
              'Status': 'Ausente no Dia (Fora da Rota)',
              'Escola': targetStudent.schoolName || 'Escola'
            }
          };

          contactCards = [{
            id: targetStudent.id,
            studentName: targetStudent.name,
            schoolName: targetStudent.schoolName || 'Escola Principal',
            parentName: targetStudent.parentName || 'Responsável',
            parentPhone: targetStudent.parentPhone || '',
            value: targetStudent.value,
            paymentDay: targetStudent.paymentDay,
            isAbsentToday: true,
            status: targetStudent.status,
            invoiceStatus: 'Em Dia'
          }];
        } else {
          directAnswer = `Tio, diga qual aluno não participará da rota (Ex: "O Pedro não vai hoje" ou "Agendar falta da Sophia amanhã").`;
        }
      }

      // -------------------------------------------------------------
      // 7. ACTION: ATUALIZAR STATUS DE PAGAMENTO (UPDATE PAYMENT)
      // -------------------------------------------------------------
      else if (
        (lower.includes('pagou') || 
         lower.includes('marcar como pago') || 
         lower.includes('marcar como paga') || 
         lower.includes('fez o pix') || 
         lower.includes('confirmar pagamento') ||
         lower.includes('marcar em atraso') ||
         lower.includes('deixar pendente') ||
         lower.includes('não pagou')) && 
        profile?.id
      ) {
        // Find matching student
        const targetStudent = activeStudents.find(s => 
          lower.includes(s.name.toLowerCase()) || 
          s.name.toLowerCase().split(' ')[0].length > 2 && lower.includes(s.name.toLowerCase().split(' ')[0])
        );

        if (targetStudent) {
          const isOverdue = lower.includes('em atraso') || lower.includes('não pagou') || lower.includes('pendente') || lower.includes('devendo');
          const newStatus: InvoiceStatus = isOverdue ? 'Em Atraso' : 'Em Dia';

          await setDoc(doc(db, 'drivers', profile.id, 'finance', targetStudent.id), {
            studentId: targetStudent.id,
            studentName: targetStudent.name,
            parentPhone: targetStudent.parentPhone || '',
            value: targetStudent.value || 400,
            type: 'Receita',
            status: newStatus,
            paymentDay: targetStudent.paymentDay || 10,
            updatedAt: new Date().toISOString()
          }, { merge: true });

          playBusHornSound();
          toast.success(`Pagamento de ${targetStudent.name} atualizado para "${newStatus}"!`);

          directAnswer = newStatus === 'Em Dia'
            ? `🎉 **Pagamento Confirmado!** Registrei a mensalidade de **${targetStudent.name}** como **EM DIA (PAGO)** no seu financeiro!\n\n• **Valor:** R$ ${(targetStudent.value || 400).toFixed(2)}\n• **Responsável:** ${targetStudent.parentName || 'Pai/Mãe'} (${targetStudent.parentPhone || 'Zap'})\n\nO recibo já está atualizado no módulo Financeiro.`
            : `⚠️ **Status Atualizado!** A mensalidade de **${targetStudent.name}** foi marcada como **EM ATRASO**.\n\n• **Valor Pendente:** R$ ${(targetStudent.value || 400).toFixed(2)}\n\n💡 Você pode acionar o responsável no WhatsApp abaixo para enviar o lembrete com a Chave Pix em 1 clique!`;

          actionCard = {
            type: 'payment_updated',
            title: newStatus === 'Em Dia' ? 'Pagamento Registrado: Em Dia' : 'Mensalidade Marcada em Atraso',
            description: `Status financeiro de ${targetStudent.name} atualizado.`,
            success: true,
            details: {
              'Aluno': targetStudent.name,
              'Status': newStatus,
              'Valor': `R$ ${(targetStudent.value || 400).toFixed(2)}`,
              'Chave Pix': profile.pixKey || 'Não cadastrada'
            }
          };

          contactCards = [{
            id: targetStudent.id,
            studentName: targetStudent.name,
            schoolName: targetStudent.schoolName || 'Escola Principal',
            parentName: targetStudent.parentName || 'Responsável',
            parentPhone: targetStudent.parentPhone || '',
            value: targetStudent.value,
            paymentDay: targetStudent.paymentDay,
            isAbsentToday: absentStudents.some(a => a.id === targetStudent.id),
            status: targetStudent.status,
            invoiceStatus: newStatus
          }];
        } else {
          directAnswer = `Tio, diga qual aluno realizou o pagamento (Ex: "O Enzo pagou" ou "Confirmar pagamento da Sophia").`;
        }
      }

      // -------------------------------------------------------------
      // 6. ACTION: BUSCAR CONTATOS DOS PAIS & ACIONAR EM 1 CLIQUE
      // -------------------------------------------------------------
      else if (
        lower.includes('contato') || 
        lower.includes('contatos') || 
        lower.includes('telefone') || 
        lower.includes('telefones') || 
        lower.includes('zap') || 
        lower.includes('whatsapp') || 
        lower.includes('falar com') || 
        lower.includes('ligar pra') || 
        lower.includes('ligar para') || 
        lower.includes('acionar') || 
        lower.includes('responsavel') || 
        lower.includes('responsáveis') || 
        lower.includes('pais')
      ) {
        // Filter students based on query or return all
        let matched = activeStudents.filter(s => 
          lower.includes(s.name.toLowerCase()) || 
          (s.schoolName && lower.includes(s.schoolName.toLowerCase())) ||
          (s.parentName && lower.includes(s.parentName.toLowerCase()))
        );

        if (matched.length === 0) {
          matched = activeStudents;
        }

        contactCards = matched.map(s => {
          const isAbsent = absentStudents.some(a => a.id === s.id);
          const fin = finances.find(f => f.studentId === s.id || f.studentName?.toLowerCase() === s.name.toLowerCase());
          return {
            id: s.id,
            studentName: s.name,
            schoolName: s.schoolName || 'Escola Não Informada',
            parentName: s.parentName || 'Responsável',
            parentPhone: s.parentPhone || '',
            value: s.value,
            paymentDay: s.paymentDay,
            isAbsentToday: isAbsent,
            status: s.status,
            invoiceStatus: (fin?.status as InvoiceStatus) || 'Em Dia'
          };
        });

        directAnswer = `📱 Encontrei **${contactCards.length} responsável(is)**! Você pode acionar no WhatsApp com mensagem de chegada/pix em 1 clique ou ligar diretamente:`;
      }

      // -------------------------------------------------------------
      // 7. INFORMATIVE FALLBACKS (Escolas, Vagas, Faltas, Finanças)
      // -------------------------------------------------------------
      else if (lower.includes('escola') || lower.includes('escolas')) {
        const schoolList = Object.entries(studentsBySchool).map(([sch, list]) => 
          `🏫 **${sch}** (${list.length} alunos):\n${list.map(s => `  • ${s.name}${s.parentPhone ? ` (Zap: ${s.parentPhone})` : ''}`).join('\n')}`
        ).join('\n\n');
        
        directAnswer = `Aqui está a distribuição dos seus **${activeStudents.length} alunos** por escola:\n\n${schoolList || 'Nenhum aluno cadastrado ainda.'}`;
      } else if (lower.includes('cobrar') || lower.includes('pendente') || lower.includes('atraso') || lower.includes('deve')) {
        if (overdueFinances.length > 0) {
          const list = overdueFinances.map(f => `• **${f.studentName || 'Aluno'}**: R$ ${f.value.toFixed(2)} (Vencimento: ${f.dueDate || 'Recente'})`).join('\n');
          directAnswer = `💸 **Alunos com Mensalidade Pendente:**\n\n${list}\n\n💡 Você pode clicar no botão de cobrança abaixo para enviar a mensagem automática com Chave Pix no WhatsApp dos pais!`;
          
          contactCards = activeStudents
            .filter(s => overdueFinances.some(f => f.studentId === s.id || f.studentName === s.name))
            .map(s => ({
              id: s.id,
              studentName: s.name,
              schoolName: s.schoolName || 'Escola Principal',
              parentName: s.parentName || 'Responsável',
              parentPhone: s.parentPhone || '',
              value: s.value,
              paymentDay: s.paymentDay,
              isAbsentToday: absentStudents.some(a => a.id === s.id),
              status: s.status,
              invoiceStatus: 'Em Atraso'
            }));
        } else {
          directAnswer = `🎉 Excelente notícia, Tio! Todos os seus alunos estão com as mensalidades **em dia** no sistema! Total de ${activeStudents.length} alunos ativos gerando receita.`;
        }
      } else if (lower.includes('vaga') || lower.includes('assento') || lower.includes('lugares') || lower.includes('capacidade')) {
        directAnswer = `💺 **Capacidade da sua Frota:**\n\n• **Capacidade Total:** ${totalCapacity} assentos\n• **Alunos Ativos:** ${activeStudents.length} ocupados\n• **Vagas Disponíveis:** **${availableVacancies} lugares livres** para novas contratações!\n\n💡 Cadastre seu link de captação de alunos no Zap para preencher essas vagas.`;
      } else if (lower.includes('falta') || lower.includes('não vai') || lower.includes('ausente') || lower.includes('presença')) {
        if (absentStudents.length > 0) {
          const list = absentStudents.map(s => `• **${s.name}** (${s.schoolName || 'Escola'})`).join('\n');
          directAnswer = `🚫 **Alunos que NÃO vão para a escola hoje (${todayStr}):**\n\n${list}\n\n✅ Os responsáveis já registraram a ausência. Você não precisa passar no endereço deles hoje!`;
          contactCards = absentStudents.map(s => ({
            id: s.id,
            studentName: s.name,
            schoolName: s.schoolName || 'Escola Principal',
            parentName: s.parentName || 'Responsável',
            parentPhone: s.parentPhone || '',
            value: s.value,
            paymentDay: s.paymentDay,
            isAbsentToday: true,
            status: s.status,
            invoiceStatus: 'Em Dia'
          }));
        } else {
          directAnswer = `🚍 **Presença de Hoje:** Nenhum responsável avisou ausência até o momento. Todos os **${activeStudents.length} alunos** estão confirmados para a rota de hoje!`;
        }
      }

      // -------------------------------------------------------------
      // 8. GEMINI AI FALLBACK WITH ACTION PARSING
      // -------------------------------------------------------------
      if (!directAnswer) {
        const schoolsSummary = Object.entries(studentsBySchool)
          .map(([sch, list]) => `${sch}: ${list.map(s => s.name).join(', ')}`)
          .join('; ');

        const studentsDetailed = activeStudents
          .slice(0, 30)
          .map(s => `• ${s.name} | Escola: ${s.schoolName || 'Escola'} | Turno: ${s.grade || 'Manhã'} | Resp: ${s.parentName || 'Resp'} | Zap: ${s.parentPhone || s.tel1 || 'Sem zap'} | Mensalidade: R$ ${s.value || 350} (Dia ${s.paymentDay || 10})`)
          .join('\n');

        const overdueDetailed = overdueFinances
          .slice(0, 15)
          .map(f => {
            const st = activeStudents.find(s => s.id === f.studentId || s.name === f.studentName);
            const ph = st?.parentPhone || st?.tel1 || (f as any).parentPhone || 'Sem zap';
            return `• ${f.studentName || 'Aluno'} | Valor: R$ ${f.value || 0} | Zap: ${ph}`;
          })
          .join('\n');

        const systemContextPrompt = `Você é a "T.IA" (lê-se Tia IA), copiloto de IA oficial do SchoolVan.
DADOS REAIS DA OPERAÇÃO DO TIO(A) ${profile?.name || 'Tio da Van'}:
- Motorista: ${profile?.name || 'Tio'} (Plano: ${profile?.plan || 'Básico'})
- Chave Pix do Tio: ${profile?.pixKey || 'Não cadastrada'}
- Total de Alunos: ${activeStudents.length} passageiros
- Vagas livres na van: ${availableVacancies} de ${totalCapacity} assentos
- Ausentes hoje: ${absentStudents.map(s => s.name).join(', ') || 'Nenhum (todos na van)'}
- Inadimplência (${overdueFinances.length} em atraso):
${overdueDetailed || 'Nenhum aluno em atraso'}

LISTA DE ALUNOS CADASTRADOS (USE ESTES DADOS REAIS PARA CONTATOS E AÇÕES):
${studentsDetailed || 'Nenhum aluno cadastrado ainda'}

Pergunta / Instrução: "${query}".`;

        const response = await fetch('/api/ai/csm-assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: query,
            contextPrompt: systemContextPrompt,
            driverId: profile?.id
          })
        });

        if (response.ok) {
          const data = await response.json();
          let replyText = data.reply || data.text || 'Entendido, Tio! Estou à disposição para ajudar com sua rota.';
          
          // Strip action block if model included it in text
          if (replyText.includes('```action')) {
            const actionMatch = replyText.match(/```action\s*([\s\S]*?)\s*```/);
            if (actionMatch) {
              try {
                const parsedAction = JSON.parse(actionMatch[1]);
                if (parsedAction.type === 'SEARCH_CONTACTS') {
                  const targetName = (parsedAction.data?.studentName || '').toLowerCase();
                  contactCards = activeStudents
                    .filter(s => !targetName || s.name.toLowerCase().includes(targetName) || (s.parentName || '').toLowerCase().includes(targetName))
                    .map(s => ({
                      id: s.id,
                      studentName: s.name,
                      schoolName: s.schoolName || 'Escola',
                      parentName: s.parentName || 'Responsável',
                      parentPhone: s.parentPhone || '',
                      value: s.value,
                      paymentDay: s.paymentDay,
                      isAbsentToday: absentStudents.some(a => a.id === s.id),
                      status: s.status
                    }));
                } else if (parsedAction.type === 'OPEN_BULK_UPLOAD') {
                  setIsBulkUploadOpen(true);
                } else if (parsedAction.type === 'START_STUDENT_DRAFT') {
                  const d = parsedAction.data || {};
                  generatedDraft = {
                    name: d.name || '',
                    schoolName: d.schoolName || 'Escola Principal',
                    shift: d.shift || 'Manhã',
                    parentName: d.parentName || '',
                    parentPhone: d.parentPhone || '',
                    studentAddress: d.studentAddress || '',
                    value: d.value || 350,
                    paymentDay: d.paymentDay || 10,
                    currentAskingField: 'review'
                  };
                  setActiveStudentDraft(generatedDraft);
                } else if (parsedAction.type === 'TOGGLE_ROUTE_ABSENCE') {
                  const studentName = (parsedAction.data?.studentName || '').toLowerCase();
                  const targetStudent = activeStudents.find(s => s.name.toLowerCase().includes(studentName));
                  if (targetStudent && profile?.id) {
                    if (parsedAction.data?.action === 'mark_absent') {
                      await markStudentAbsent(profile.id, targetStudent.id, targetStudent, getTodayStr(), 'Aviso pelo assistente');
                      toast.success(`Falta de ${targetStudent.name} registrada para hoje!`);
                    } else {
                      await reintegrateStudentToRoute(profile.id, targetStudent.id, targetStudent, getTodayStr());
                      toast.success(`${targetStudent.name} confirmado na rota de hoje!`);
                    }
                  }
                } else if (parsedAction.type === 'UPDATE_PAYMENT') {
                  const studentName = (parsedAction.data?.studentName || '').toLowerCase();
                  const targetFinance = finances.find(f => f.studentName?.toLowerCase().includes(studentName));
                  if (targetFinance && profile?.id) {
                    const newStatus = parsedAction.data?.status === 'Pago' ? 'Pago' : 'Pendente';
                    await updateDoc(doc(db, `drivers/${profile.id}/finance`, targetFinance.id), {
                      status: newStatus,
                      updatedAt: new Date().toISOString()
                    });
                    toast.success(`Mensalidade de ${targetFinance.studentName} atualizada para ${newStatus}!`);
                  }
                } else if (parsedAction.type === 'SEND_PARENT_MESSAGE') {
                  const phone = (parsedAction.data?.phone || '').replace(/\D/g, '');
                  const text = parsedAction.data?.text || '';
                  if (phone && text) {
                    actionCard = {
                      type: 'student_updated',
                      title: 'Disparo de WhatsApp aos Pais',
                      description: `Recado pronto para envio para ${parsedAction.data?.recipient || 'os Pais'}: "${text.slice(0, 70)}..."`,
                      success: true,
                      primaryActionLabel: 'Abrir no WhatsApp',
                      primaryActionUrl: `https://wa.me/55${phone}?text=${encodeURIComponent(text)}`
                    };
                  }
                }
              } catch (e) {
                console.error('Error parsing AI action JSON', e);
              }
            }
            replyText = replyText.replace(/```action[\s\S]*?```/g, '').trim();
          }

          directAnswer = replyText;
        } else {
          directAnswer = `Tio, consultei seus registros: você tem **${activeStudents.length} alunos cadastrados**, **${availableVacancies} vagas disponíveis** e **${absentStudents.length} ausências registradas hoje**. Se precisar de algo específico sobre escolas, cobranças Pix ou rotas, é só me perguntar!`;
        }
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: directAnswer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionCard: actionCard,
        contactCards: contactCards,
        studentDraft: generatedDraft
      };

      setMessages(prev => [...prev, aiResponse]);
      if (isFromVoice) {
        speakTioIAPrompt(directAnswer.replace(/[*#_`]/g, ''));
      }

    } catch (err) {
      console.error('Error fetching Tio IA reply', err);
      const fallbackMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `Tio, tive uma oscilação na conexão, mas seus dados locais estão seguros: você tem **${activeStudents.length} alunos ativos** e **${availableVacancies} vagas livres**.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col h-[90vh] max-h-[750px] relative"
      >
        {/* Header with T.IA Persona & Mode Switcher */}
        <div className="bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 p-4 text-white flex flex-col gap-3 shrink-0 border-b border-yellow-400/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-yellow-400 text-gray-950 flex items-center justify-center font-black shadow-lg">
                  <Bot size={24} />
                </div>
                <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-gray-900 rounded-full" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white flex items-center gap-1.5">
                    T.IA <span className="text-xs text-yellow-400 font-bold">• Copiloto 24h</span>
                  </h3>
                  <span className="px-2 py-0.5 bg-yellow-400/20 text-yellow-300 text-[10px] font-black rounded-full uppercase">
                    Voz & Banco Real
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Sua Copiloto Inteligente & Onboarding da Van Escolar
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onOpenUpgradeModal()}
                className="px-3 py-1.5 bg-yellow-400 text-gray-950 font-black rounded-xl text-[10px] uppercase hover:bg-yellow-300 transition-all flex items-center gap-1 shadow cursor-pointer"
              >
                <Zap size={12} /> Planos
              </button>
              <button 
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Mode Switcher Bar */}
          <div className="flex items-center gap-2 bg-gray-900/90 p-1 rounded-2xl border border-gray-800">
            <button
              onClick={() => {
                setActiveTab('onboarding');
                if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                setIsSpeakingOnboarding(false);
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'onboarding'
                  ? 'bg-yellow-400 text-gray-950 shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <Compass size={15} />
              <span>Onboarding com a T.IA</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                activeTab === 'onboarding' ? 'bg-gray-950 text-yellow-400' : 'bg-gray-800 text-gray-300'
              }`}>
                {onboardingProgress}%
              </span>
            </button>

            <button
              onClick={() => {
                setActiveTab('chat');
                if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                setIsSpeakingOnboarding(false);
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-yellow-400 text-gray-950 shadow-md'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/60'
              }`}
            >
              <MessageSquare size={15} />
              <span>Chat com a T.IA</span>
            </button>
          </div>
        </div>

        {/* -------------------- TAB 1: ONBOARDING INTEGRADO DIRETO NA T.IA -------------------- */}
        {activeTab === 'onboarding' ? (
          <div className="flex-1 flex flex-col overflow-y-auto bg-gray-50 dark:bg-gray-950/40 p-4 sm:p-5 space-y-4">
            {/* T.IA Speech Card (Shown for steps 1-4) */}
            {onboardingStep > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-950/30 border-2 border-yellow-300 dark:border-yellow-800/60 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-yellow-400 text-gray-950 rounded-xl flex items-center justify-center shrink-0 font-black shadow">
                    <Bot size={22} />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-yellow-800 dark:text-yellow-400 uppercase tracking-wider block">
                      Fala da T.IA • Passo {onboardingStep} de 4
                    </span>
                    <p className="text-xs text-gray-800 dark:text-gray-200 font-semibold leading-relaxed mt-0.5">
                      "{stepNarrations[onboardingStep as keyof typeof stepNarrations]}"
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleSpeakOnboardingStep()}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm ${
                    isSpeakingOnboarding 
                      ? 'bg-amber-500 text-white animate-pulse' 
                      : 'bg-yellow-400 hover:bg-yellow-300 text-gray-950'
                  }`}
                  title="Ouvir explicação da T.IA em voz alta"
                >
                  {isSpeakingOnboarding ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  {isSpeakingOnboarding ? 'Pausar Voz' : 'Ouvir T.IA'}
                </button>
              </div>
            )}

            {/* Step Navigation Pill Tabs */}
            <div className="grid grid-cols-5 gap-1.5 bg-white dark:bg-gray-900 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-800">
              {[
                { id: 0, label: 'Apresentação', done: true },
                { id: 1, label: '1. Pix & Perfil', done: step1Done },
                { id: 2, label: '2. Sua Van', done: step2Done },
                { id: 3, label: '3. Alunos', done: step3Done },
                { id: 4, label: '4. Pronto!', done: step4Done }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    setOnboardingStep(s.id);
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                    setIsSpeakingOnboarding(false);
                  }}
                  className={`py-2 px-1 rounded-xl text-[11px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer truncate ${
                    onboardingStep === s.id
                      ? 'bg-gray-950 text-yellow-400 shadow'
                      : s.done && s.id !== 0
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
                      : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {s.done && s.id !== 0 ? <CheckCircle2 size={12} className="text-emerald-500 shrink-0" /> : null}
                  <span className="truncate">{s.label}</span>
                </button>
              ))}
            </div>

            {/* Step 0: Warm Welcoming & Presentation Screen */}
            {onboardingStep === 0 && (
              <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white p-5 sm:p-6 rounded-3xl shadow-xl border-2 border-yellow-400/50 space-y-5">
                {/* Hero Mascot & Welcome Banner */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-yellow-400/20 pb-4">
                  <div className="relative shrink-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr from-yellow-400 to-amber-300 text-gray-950 rounded-3xl flex items-center justify-center shadow-lg border-2 border-white/20">
                      <Bot size={40} className="text-gray-950 animate-bounce-short" />
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-gray-950 rounded-full flex items-center justify-center text-[9px] font-black text-white">
                      ✓
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 text-[10px] font-black uppercase tracking-wider border border-yellow-400/30">
                      <Sparkles size={11} /> Seu Copiloto Inteligente de Van Escolar
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-white">
                      Fala, {profile?.name ? `Tio(a) ${profile.name.split(' ')[0]}` : 'Tio(a) da Van'}! Seja bem-vindo ao SchoolVan! 🚌💛
                    </h3>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Eu sou a <strong>T.IA</strong> (sua copiloto do transporte escolar). Sei como a rotina da van é puxada: trânsito, lista no papel, cobrança no WhatsApp com vergonha de cobrar e pais avisando falta de última hora.
                    </p>
                  </div>
                </div>

                {/* Empathy speech bubble */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-2">
                  <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">
                    🤝 <em>"Cheguei pra ser o seu braço direito, tirar essa burocracia das suas costas e cuidar da parte chata pra você focar em dirigir com segurança e faturar mais!"</em>
                  </p>
                  <p className="text-xs text-yellow-300 font-bold">
                    👉 Vou te conduzir passo a passo em menos de <strong>2 minutos</strong> para deixar seu Pix, sua Van e seus primeiros Alunos configurados. Vamos juntos?
                  </p>
                </div>

                {/* Value Highlights Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="bg-gray-900/80 p-3 rounded-2xl border border-gray-800 flex items-start gap-2.5">
                    <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0 font-bold">
                      <DollarSign size={16} />
                    </div>
                    <div>
                      <h5 className="font-black text-white text-xs">Cobrança Pix no Zap em 1 Toque</h5>
                      <p className="text-[11px] text-gray-400 mt-0.5">Mensagens automáticas com sua Chave Pix pros pais pagarem sem atraso.</p>
                    </div>
                  </div>

                  <div className="bg-gray-900/80 p-3 rounded-2xl border border-gray-800 flex items-start gap-2.5">
                    <div className="p-2 bg-yellow-500/20 text-yellow-400 rounded-xl shrink-0 font-bold">
                      <ClipboardCheck size={16} />
                    </div>
                    <div>
                      <h5 className="font-black text-white text-xs">Chamada de Embarque Rápida</h5>
                      <p className="text-[11px] text-gray-400 mt-0.5">Faça a chamada dos alunos no celular e avise os pais em tempo real.</p>
                    </div>
                  </div>

                  <div className="bg-gray-900/80 p-3 rounded-2xl border border-gray-800 flex items-start gap-2.5">
                    <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl shrink-0 font-bold">
                      <AlertTriangle size={16} />
                    </div>
                    <div>
                      <h5 className="font-black text-white text-xs">Avisos de Falta Imediatos</h5>
                      <p className="text-[11px] text-gray-400 mt-0.5">Saiba antes de sair se o aluno não vai para a escola hoje.</p>
                    </div>
                  </div>

                  <div className="bg-gray-900/80 p-3 rounded-2xl border border-gray-800 flex items-start gap-2.5">
                    <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl shrink-0 font-bold">
                      <Bot size={16} />
                    </div>
                    <div>
                      <h5 className="font-black text-white text-xs">T.IA Conectada ao seu Banco</h5>
                      <p className="text-[11px] text-gray-400 mt-0.5">Pergunte por voz ou texto sobre vagas, alunos e cobranças a qualquer hora.</p>
                    </div>
                  </div>
                </div>

                {/* Call to Action Button with Audio toggle */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <button
                    onClick={() => handleSpeakOnboardingStep(0)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-2xl text-xs font-bold bg-white/10 hover:bg-white/20 text-yellow-400 transition-all flex items-center justify-center gap-2 cursor-pointer border border-yellow-400/30"
                  >
                    <Volume2 size={16} />
                    <span>{isSpeakingOnboarding ? 'Pausar Áudio' : 'Ouvir as Boas-Vindas da T.IA 🔊'}</span>
                  </button>

                  <button
                    onClick={() => {
                      playBusHornSound();
                      setOnboardingStep(1);
                      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                      setIsSpeakingOnboarding(false);
                      setTimeout(() => {
                        speakTiaPrompt("Primeiro passo, Tio! Me informe seu WhatsApp de atendimento e sua Chave Pix.");
                      }, 500);
                    }}
                    className="w-full sm:w-auto px-6 py-3.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-xs sm:text-sm shadow-xl hover:shadow-yellow-400/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span>Bora lá, T.IA! Vamos Começar</span>
                    <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Profile & Pix */}
            {onboardingStep === 1 && (
              <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4 shadow-sm">
                <div>
                  <h4 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <User size={16} className="text-yellow-500" /> Passo 1: WhatsApp & Chave Pix do Tio
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Esses dados são usados para enviar cobranças no Zap dos pais com sua Chave Pix.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-black uppercase text-gray-700 dark:text-gray-300 mb-1">
                      Seu Nome / Nome da Van *
                    </label>
                    <input 
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Ex: Tio Carlos - Van Estrela"
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-xs sm:text-sm font-semibold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black uppercase text-gray-700 dark:text-gray-300 mb-1">
                        WhatsApp de Atendimento *
                      </label>
                      <input 
                        type="text"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder="(11) 99999-9999"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-xs sm:text-sm font-semibold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-gray-700 dark:text-gray-300 mb-1">
                        Sua Chave Pix Principal *
                      </label>
                      <input 
                        type="text"
                        value={profileForm.pixKey}
                        onChange={(e) => setProfileForm(p => ({ ...p, pixKey: e.target.value }))}
                        placeholder="CPF, CNPJ, Celular, E-mail..."
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-xs sm:text-sm font-semibold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => {
                      setOnboardingStep(0);
                      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                      setIsSpeakingOnboarding(false);
                    }}
                    className="text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft size={15} /> Voltar para Apresentação
                  </button>
                  <button
                    onClick={handleSaveProfileStep}
                    disabled={savingStep || !profileForm.name || !profileForm.pixKey}
                    className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-xs shadow transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    <Save size={15} /> Salvar & Ir para Passo 2 <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Vehicle */}
            {onboardingStep === 2 && (
              <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4 shadow-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                      <Bus size={16} className="text-yellow-500" /> Passo 2: Cadastrar sua Van Escolar
                    </h4>
                    <span className="px-2 py-0.5 bg-yellow-400/20 text-yellow-800 dark:text-yellow-300 text-[10px] font-black rounded-full uppercase">
                      1 Van no Gratuito
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Informe modelo, placa e capacidade de bancos para calcularmos a ocupação da sua rota.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-black uppercase text-gray-700 dark:text-gray-300 mb-1">
                        Nome / Identificação da Van *
                      </label>
                      <input 
                        type="text"
                        value={vehicleForm.name}
                        onChange={(e) => setVehicleForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="Ex: Van 01 - Zona Sul"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-xs sm:text-sm font-semibold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-gray-700 dark:text-gray-300 mb-1">
                        Placa *
                      </label>
                      <input 
                        type="text"
                        value={vehicleForm.plate}
                        onChange={(e) => setVehicleForm(p => ({ ...p, plate: e.target.value.toUpperCase() }))}
                        placeholder="ABC-1234"
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-xs sm:text-sm font-mono font-bold uppercase text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black uppercase text-gray-700 dark:text-gray-300 mb-1">
                        Modelo
                      </label>
                      <input 
                        type="text"
                        value={vehicleForm.model}
                        onChange={(e) => setVehicleForm(p => ({ ...p, model: e.target.value }))}
                        placeholder="Mercedes Sprinter, Fiat Ducato..."
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-xs sm:text-sm font-semibold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-gray-700 dark:text-gray-300 mb-1">
                        Capacidade de Assentos *
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
                        className="w-full px-3.5 py-2.5 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-xs sm:text-sm font-bold text-gray-950 dark:text-white focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => setOnboardingStep(1)}
                    className="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft size={15} /> Voltar
                  </button>
                  <button
                    onClick={handleSaveVehicleStep}
                    disabled={savingStep || !vehicleForm.plate}
                    className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-xs shadow transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    <Save size={15} /> Salvar Van & Ir para Passo 3 <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Students */}
            {onboardingStep === 3 && (
              <div className="bg-white dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4 shadow-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
                      <Users size={16} className="text-yellow-500" /> Passo 3: Adicionar Alunos da Rota
                    </h4>
                    <span className="px-2.5 py-0.5 bg-yellow-400 text-gray-950 text-xs font-black rounded-full shadow-sm">
                      {activeStudents.length} Alunos Cadastrados
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Cadastre os alunos com endereço de embarque, escola e WhatsApp do responsável para chamadas e cobranças.
                  </p>
                </div>

                {/* Inline Full Add Form */}
                <form onSubmit={handleQuickAddStudent} className="bg-gray-50 dark:bg-gray-800/70 p-4 rounded-2xl space-y-3.5 border-2 border-gray-200 dark:border-gray-700">
                  <span className="text-[11px] font-black uppercase text-gray-800 dark:text-gray-200 flex items-center gap-1.5 border-b border-gray-200 dark:border-gray-700 pb-2">
                    <Users size={14} className="text-yellow-500" /> Cadastro Completo de Aluno
                  </span>
                  
                  {/* Nome e Turno */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-black uppercase text-gray-700 dark:text-gray-300 mb-1">
                        Nome Completo do Aluno *
                      </label>
                      <input 
                        type="text"
                        placeholder="Ex: Bernardo Silva"
                        value={quickStudentForm.name}
                        onChange={(e) => setQuickStudentForm(p => ({ ...p, name: e.target.value }))}
                        required
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-xs font-semibold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                        <span>Turno *</span>
                        <span className="text-[9px] text-amber-600 dark:text-yellow-400 font-bold">Filtra Rota</span>
                      </label>
                      <select 
                        value={quickStudentForm.shift}
                        onChange={(e) => setQuickStudentForm(p => ({ ...p, shift: e.target.value }))}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-950 dark:text-white focus:ring-2 focus:ring-yellow-400 focus:outline-none cursor-pointer"
                      >
                        <option value="Manhã">🌅 Manhã</option>
                        <option value="Tarde">🌇 Tarde</option>
                        <option value="Integral">☀️ Integral</option>
                      </select>
                    </div>
                  </div>

                  {/* Endereço da Residência */}
                  <div>
                    <AddressAutocompleteInput
                      label="Endereço de Embarque (Residência)"
                      helperBadge="Trajeto GPS"
                      required
                      placeholder="Digite rua, número, bairro e cidade (ou CEP)..."
                      value={quickStudentForm.studentAddress}
                      onChange={(val) => setQuickStudentForm(p => ({ ...p, studentAddress: val }))}
                    />
                  </div>

                  {/* Escola e Endereço da Escola */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                        <span>Escola de Destino *</span>
                        <span className="text-[9px] text-amber-600 dark:text-yellow-400 font-bold">Destino</span>
                      </label>
                      <input 
                        type="text"
                        placeholder="Ex: Colégio Objetivo"
                        value={quickStudentForm.schoolName}
                        onChange={(e) => setQuickStudentForm(p => ({ ...p, schoolName: e.target.value }))}
                        required
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-xs font-semibold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <AddressAutocompleteInput
                        label="Endereço da Escola"
                        helperBadge="GPS Escola"
                        required
                        isSchool
                        placeholder="Digite endereço da escola ou CEP..."
                        value={quickStudentForm.schoolAddress}
                        onChange={(val) => setQuickStudentForm(p => ({ ...p, schoolAddress: val }))}
                      />
                    </div>
                  </div>

                  {/* Responsável, WhatsApp e E-mail */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-700 dark:text-gray-300 mb-1">
                        Responsável *
                      </label>
                      <input 
                        type="text"
                        placeholder="Ex: Juliana Silva (Mãe)"
                        value={quickStudentForm.parentName}
                        onChange={(e) => setQuickStudentForm(p => ({ ...p, parentName: e.target.value }))}
                        required
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-xs font-semibold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                        <span>WhatsApp *</span>
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">Cobrança Zap</span>
                      </label>
                      <input 
                        type="tel"
                        placeholder="(11) 98888-7777"
                        value={quickStudentForm.parentPhone}
                        onChange={(e) => setQuickStudentForm(p => ({ ...p, parentPhone: e.target.value }))}
                        required
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-xs font-semibold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                        <span>E-mail dos Pais *</span>
                        <span className="text-[9px] text-blue-600 dark:text-blue-400 font-bold">Acesso Pais</span>
                      </label>
                      <input 
                        type="email"
                        placeholder="mae@email.com"
                        value={quickStudentForm.parentEmail}
                        onChange={(e) => setQuickStudentForm(p => ({ ...p, parentEmail: e.target.value }))}
                        required
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-xs font-semibold text-gray-950 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Mensalidade e Vencimento */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-700 dark:text-gray-300 mb-1">
                        Valor Mensalidade (R$) *
                      </label>
                      <input 
                        type="number"
                        placeholder="350.00"
                        value={quickStudentForm.value}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuickStudentForm(p => ({ ...p, value: val === '' ? '' : Number(val) }));
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-950 dark:text-white focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-700 dark:text-gray-300 mb-1">
                        Dia do Vencimento (1 a 31) *
                      </label>
                      <input 
                        type="number"
                        placeholder="10"
                        min={1}
                        max={31}
                        value={quickStudentForm.paymentDay}
                        onChange={(e) => {
                          const val = e.target.value;
                          setQuickStudentForm(p => ({ ...p, paymentDay: val === '' ? '' : Number(val) }));
                        }}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-xs font-bold text-gray-950 dark:text-white focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingStep || !quickStudentForm.name.trim()}
                    className="w-full py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    + Salvar este Aluno na Rota
                  </button>
                </form>

                {/* List of Registered Students */}
                {activeStudents.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <div className="text-[11px] font-black uppercase text-gray-500 dark:text-gray-400 flex items-center justify-between">
                      <span>Alunos Salvos ({activeStudents.length})</span>
                      <span>Mensalidade</span>
                    </div>
                    <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {activeStudents.map((s) => (
                        <div 
                          key={s.id}
                          className="bg-gray-50 dark:bg-gray-800 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2 shadow-sm text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-yellow-400 text-gray-950 flex items-center justify-center font-bold text-xs shrink-0">
                              {s.name.charAt(0)}
                            </div>
                            <div>
                              <span className="font-bold text-gray-900 dark:text-white block">{s.name}</span>
                              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                🏫 {s.schoolName || 'Escola Principal'} • 📱 {s.parentPhone || 'Sem tel'}
                              </span>
                            </div>
                          </div>
                          <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs">
                            R$ {(s.value || 350).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={() => setOnboardingStep(2)}
                    className="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft size={15} /> Voltar
                  </button>
                  <button
                    onClick={() => setOnboardingStep(4)}
                    className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-2xl text-xs shadow transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    Avançar para Conclusão <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Finished */}
            {onboardingStep === 4 && (
              <div className="bg-gradient-to-br from-emerald-600 to-teal-800 text-white p-6 rounded-3xl shadow-xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                    <Award size={28} />
                  </div>
                  <div>
                    <h4 className="text-lg font-black">Tudo Pronto para Rodar, Tio! 🚌🎉</h4>
                    <p className="text-xs opacity-90">
                      Sua operação está 100% configurada. Agora é só rodar com segurança e faturar!
                    </p>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 size={15} className="text-yellow-300" />
                    <span>Chave Pix configurada para cobranças automáticas</span>
                  </div>
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 size={15} className="text-yellow-300" />
                    <span>Van Escolar cadastrada com controle de vagas</span>
                  </div>
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 size={15} className="text-yellow-300" />
                    <span>Chamada do Embarque disponível no rodapé 24h</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenCheckin) onOpenCheckin();
                    }}
                    className="px-4 py-3 bg-white text-emerald-950 font-black rounded-2xl text-xs shadow hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <ClipboardCheck size={16} /> Abrir Chamada do Embarque
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('chat');
                      speakTiaPrompt("Prontinho, Tio! Estamos no chat. O que você gostaria de saber ou consultar hoje?");
                    }}
                    className="px-4 py-3 bg-gray-950 text-yellow-400 font-bold rounded-2xl text-xs hover:bg-gray-900 border border-yellow-400/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <MessageSquare size={16} /> Ir para o Chat da T.IA
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* -------------------- TAB 2: CHAT & PERGUNTAS DA T.IA -------------------- */
          <>
            {/* Real-time DB Quick Stats Bar */}
            <div className="bg-gray-900 text-gray-300 px-4 py-2 text-[11px] font-mono border-b border-gray-800 flex items-center justify-between overflow-x-auto gap-3 shrink-0">
              <span className="flex items-center gap-1 shrink-0 text-yellow-400">
                <Users size={13} /> {activeStudents.length} Alunos
              </span>
              <span className="flex items-center gap-1 shrink-0 text-emerald-400">
                <Bus size={13} /> {availableVacancies} Vagas Livres
              </span>
              <span className="flex items-center gap-1 shrink-0 text-amber-400">
                <AlertTriangle size={13} /> {absentStudents.length} Faltas Hoje
              </span>
            </div>

            {/* Message List */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50 dark:bg-gray-950/40">
              {/* Real-time Active Notification Cards Banner */}
              {(absentStudents.length > 0 || profile?.invoiceStatus === 'Em Atraso' || (leads && leads.length > 0)) && (
                <div className="bg-yellow-400/10 border-2 border-yellow-400/40 p-3.5 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-black text-gray-900 dark:text-yellow-300 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Bell size={14} className="text-yellow-500 animate-bounce" />
                      Central de Avisos da T.IA
                    </span>
                    <span className="text-[10px] bg-yellow-400 text-gray-950 px-2 py-0.5 rounded-full">
                      Em Tempo Real
                    </span>
                  </div>

                  {/* 1. Absence Notif Card */}
                  {absentStudents.length > 0 && (() => {
                    const notifId = `absence-${todayStr}-${absentStudents.map(s => s.id).join('-')}`;
                    const isRead = readNotifs.includes(notifId);
                    if (isRead) return null;
                    const text = absentStudents.length === 1
                      ? `O pai de ${absentStudents[0].name} avisou que ele(a) NÃO VAI para a escola hoje!`
                      : `${absentStudents.length} alunos não vão para a escola hoje: ${absentStudents.map(s => s.name).join(', ')}`;

                    return (
                      <div key={notifId} className="bg-amber-500/20 dark:bg-amber-950/40 border border-amber-500/40 p-3 rounded-xl text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-amber-800 dark:text-amber-300 uppercase text-[10px] flex items-center gap-1">
                            <Bus size={12} /> Falta Confirmada Hoje
                          </span>
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white leading-snug">
                          {text}
                        </p>
                        <div className="flex items-center justify-between pt-1 gap-2">
                          <button
                            onClick={() => {
                              playBusHornSound();
                              speakTiaPrompt(`Aviso da T.IA: ${text}`);
                            }}
                            className="px-2.5 py-1 bg-yellow-400 text-gray-950 font-black rounded-lg text-[10px] flex items-center gap-1 hover:bg-yellow-300 transition-all cursor-pointer"
                          >
                            <Volume2 size={12} /> Ouvir em Voz Alta
                          </button>

                          <button
                            onClick={() => handleMarkAsRead(notifId)}
                            className="px-2.5 py-1 bg-emerald-500 text-white font-black rounded-lg text-[10px] flex items-center gap-1 hover:bg-emerald-600 transition-all cursor-pointer shadow"
                          >
                            <CheckCircle2 size={12} /> Marcar como Lido
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 2. Overdue Invoice Card */}
                  {profile?.invoiceStatus === 'Em Atraso' && (() => {
                    const notifId = `billing-late-${todayStr}`;
                    const isRead = readNotifs.includes(notifId);
                    if (isRead) return null;
                    const text = 'Sua licença do aplicativo venceu. Copie a chave Pix para regularizar e manter seus avisos ativos aos pais.';

                    return (
                      <div key={notifId} className="bg-red-500/20 dark:bg-red-950/40 border border-red-500/40 p-3 rounded-xl text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-red-700 dark:text-red-300 uppercase text-[10px] flex items-center gap-1">
                            <AlertTriangle size={12} /> Cobrança de Licença
                          </span>
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white leading-snug">
                          {text}
                        </p>
                        <div className="flex items-center justify-between pt-1 gap-2">
                          <button
                            onClick={() => {
                              playBusHornSound();
                              speakTiaPrompt(`Aviso de cobrança da T.IA: ${text}`);
                            }}
                            className="px-2.5 py-1 bg-yellow-400 text-gray-950 font-black rounded-lg text-[10px] flex items-center gap-1 hover:bg-yellow-300 transition-all cursor-pointer"
                          >
                            <Volume2 size={12} /> Ouvir Voz
                          </button>

                          <button
                            onClick={() => handleMarkAsRead(notifId)}
                            className="px-2.5 py-1 bg-emerald-500 text-white font-black rounded-lg text-[10px] flex items-center gap-1 hover:bg-emerald-600 transition-all cursor-pointer shadow"
                          >
                            <CheckCircle2 size={12} /> Marcar como Lido
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 3. Leads Card */}
                  {leads && leads.length > 0 && (() => {
                    const notifId = `leads-${leads.length}`;
                    const isRead = readNotifs.includes(notifId);
                    if (isRead) return null;
                    const text = `Você recebeu ${leads.length} pedido(s) de orçamentos de pais interessados na sua van!`;

                    return (
                      <div key={notifId} className="bg-emerald-500/20 dark:bg-emerald-950/40 border border-emerald-500/40 p-3 rounded-xl text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-emerald-700 dark:text-emerald-300 uppercase text-[10px] flex items-center gap-1">
                            <Users size={12} /> Pedidos de Vagas
                          </span>
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white leading-snug">
                          {text}
                        </p>
                        <div className="flex items-center justify-between pt-1 gap-2">
                          <button
                            onClick={() => handleMarkAsRead(notifId)}
                            className="px-2.5 py-1 bg-emerald-500 text-white font-black rounded-lg text-[10px] flex items-center gap-1 hover:bg-emerald-600 transition-all cursor-pointer shadow"
                          >
                            <CheckCircle2 size={12} /> Marcar como Lido
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {messages.map((msg) => (
                <div 
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-2`}
                >
                  <div className={`max-w-[92%] sm:max-w-[88%] rounded-2xl p-4 text-xs leading-relaxed shadow-sm relative group ${
                    msg.sender === 'user' 
                      ? 'bg-yellow-400 text-gray-950 font-medium rounded-tr-none' 
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700/60 rounded-tl-none whitespace-pre-wrap'
                  }`}>
                    {msg.text}

                    {/* Interactive Step-by-Step Student Registration / Edit Draft Card */}
                    {msg.studentDraft && (
                      <div className="mt-3 bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-white dark:to-gray-900 border-2 border-yellow-400/50 rounded-2xl p-3.5 space-y-3 shadow-md text-gray-900 dark:text-white">
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-yellow-400/20">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl bg-yellow-400 text-gray-950 flex items-center justify-center font-black shadow shrink-0">
                              <Edit3 size={15} />
                            </div>
                            <div>
                              <h5 className="font-black text-xs text-yellow-900 dark:text-yellow-300 flex items-center gap-1.5">
                                {msg.studentDraft.mode === 'edit' ? `Editar Aluno: ${msg.studentDraft.name || 'Aluno'}` : 'Ficha de Cadastro Interativa'}
                                <span className="px-1.5 py-0.5 bg-yellow-400/30 text-yellow-900 dark:text-yellow-200 text-[9px] font-black rounded-md uppercase">
                                  {msg.studentDraft.mode === 'edit' ? 'Modo de Edição' : msg.studentDraft.currentAskingField === 'review' ? 'Pronto para Salvar' : 'Em Preenchimento'}
                                </span>
                              </h5>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                {msg.studentDraft.mode === 'edit' 
                                  ? 'Altere por voz/chat ou edite diretamente nos campos abaixo:'
                                  : 'Preencha por voz, chat ou digite diretamente nos campos abaixo:'}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Interactive Form Fields Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                          {/* Student Name */}
                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-[10px] font-black uppercase text-gray-700 dark:text-gray-300 flex items-center gap-1">
                              <Users size={12} className="text-yellow-500" /> Nome Completo do Aluno *
                            </label>
                            <input 
                              type="text"
                              value={msg.studentDraft.name || ''}
                              onChange={(e) => handleUpdateDraft({ name: e.target.value })}
                              placeholder="Ex: Pedro Henrique Silva"
                              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-950 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-yellow-400 outline-none"
                            />
                          </div>

                          {/* School Name */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-700 dark:text-gray-300 flex items-center gap-1">
                              <School size={12} className="text-yellow-500" /> Escola de Destino
                            </label>
                            <input 
                              type="text"
                              value={msg.studentDraft.schoolName || ''}
                              onChange={(e) => handleUpdateDraft({ schoolName: e.target.value })}
                              placeholder="Ex: Colégio Objetivo"
                              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-950 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-yellow-400 outline-none"
                            />
                          </div>

                          {/* Shift */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-700 dark:text-gray-300 flex items-center gap-1">
                              <Calendar size={12} className="text-yellow-500" /> Turno Escolar
                            </label>
                            <select
                              value={msg.studentDraft.shift || 'Manhã'}
                              onChange={(e) => handleUpdateDraft({ shift: e.target.value })}
                              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-950 dark:text-white focus:ring-2 focus:ring-yellow-400 outline-none cursor-pointer"
                            >
                              <option value="Manhã">Manhã</option>
                              <option value="Tarde">Tarde</option>
                              <option value="Integral">Integral</option>
                            </select>
                          </div>

                          {/* Address */}
                          <div className="space-y-1 sm:col-span-2">
                            <label className="text-[10px] font-black uppercase text-gray-700 dark:text-gray-300 flex items-center gap-1">
                              <MapPin size={12} className="text-yellow-500" /> Endereço da Casa (Embarque)
                            </label>
                            <input 
                              type="text"
                              value={msg.studentDraft.studentAddress || ''}
                              onChange={(e) => handleUpdateDraft({ studentAddress: e.target.value })}
                              placeholder="Ex: Rua das Flores, 123 - Centro"
                              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-950 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-yellow-400 outline-none"
                            />
                          </div>

                          {/* Parent Name */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-700 dark:text-gray-300 flex items-center gap-1">
                              <Users size={12} className="text-yellow-500" /> Responsável (Pai/Mãe)
                            </label>
                            <input 
                              type="text"
                              value={msg.studentDraft.parentName || ''}
                              onChange={(e) => handleUpdateDraft({ parentName: e.target.value })}
                              placeholder="Ex: Carlos Eduardo"
                              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-950 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-yellow-400 outline-none"
                            />
                          </div>

                          {/* Parent WhatsApp */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-700 dark:text-gray-300 flex items-center gap-1">
                              <Phone size={12} className="text-yellow-500" /> WhatsApp com DDD
                            </label>
                            <input 
                              type="text"
                              value={msg.studentDraft.parentPhone || ''}
                              onChange={(e) => handleUpdateDraft({ parentPhone: e.target.value })}
                              placeholder="Ex: 11988887777"
                              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-950 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-yellow-400 outline-none"
                            />
                          </div>

                          {/* Monthly Value */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-700 dark:text-gray-300 flex items-center gap-1">
                              <DollarSign size={12} className="text-yellow-500" /> Mensalidade (R$)
                            </label>
                            <input 
                              type="number"
                              value={msg.studentDraft.value || ''}
                              onChange={(e) => handleUpdateDraft({ value: e.target.value })}
                              placeholder="350"
                              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-950 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-yellow-400 outline-none"
                            />
                          </div>

                          {/* Due Date */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-gray-700 dark:text-gray-300 flex items-center gap-1">
                              <Calendar size={12} className="text-yellow-500" /> Dia do Vencimento
                            </label>
                            <select
                              value={msg.studentDraft.paymentDay || 10}
                              onChange={(e) => handleUpdateDraft({ paymentDay: Number(e.target.value) })}
                              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl px-2.5 py-1.5 text-xs font-bold text-gray-950 dark:text-white focus:ring-2 focus:ring-yellow-400 outline-none cursor-pointer"
                            >
                              {[1, 5, 10, 15, 20, 25, 28, 30].map(d => (
                                <option key={d} value={d}>Todo dia {d}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Action Buttons: Save Draft & Complete */}
                        <div className="pt-2 border-t border-yellow-400/20 flex flex-wrap items-center gap-2">
                          {msg.studentDraft.mode !== 'edit' && (
                            <button
                              type="button"
                              onClick={() => handleSaveDraftLater(msg.studentDraft)}
                              className="flex-1 min-w-[140px] px-3 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/50 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60 font-black rounded-xl text-[11px] flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
                            >
                              <Save size={13} />
                              <span>Salvar Rascunho / Continuar Depois</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleCompleteDraft(msg.studentDraft)}
                            disabled={!msg.studentDraft.name?.trim()}
                            className={`flex-1 min-w-[140px] px-3 py-2 font-black rounded-xl text-[11px] flex items-center justify-center gap-1.5 shadow transition-all active:scale-95 ${
                              msg.studentDraft.name?.trim()
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-white cursor-pointer ring-2 ring-emerald-300 dark:ring-emerald-800'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            <CheckCircle2 size={13} />
                            <span>{msg.studentDraft.mode === 'edit' ? 'Salvar Alterações do Aluno' : 'Concluir Cadastro Agora'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleCancelDraft}
                            className="px-2.5 py-2 text-gray-500 hover:text-red-500 text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Operational Action Feedback Card if generated */}
                    {msg.actionCard && (
                      <div className="mt-3 bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 border-2 border-yellow-400/40 rounded-2xl p-3.5 space-y-2 text-gray-900 dark:text-white shadow-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-yellow-400 text-gray-950 flex items-center justify-center font-black shrink-0 shadow">
                            <Check size={16} />
                          </div>
                          <div>
                            <h5 className="font-black text-xs text-yellow-900 dark:text-yellow-300">
                              {msg.actionCard.title}
                            </h5>
                            <p className="text-[11px] text-gray-600 dark:text-gray-400">
                              {msg.actionCard.description}
                            </p>
                          </div>
                        </div>

                        {msg.actionCard.details && (
                          <div className="grid grid-cols-2 gap-2 bg-white/60 dark:bg-gray-900/60 p-2.5 rounded-xl text-[11px] border border-yellow-400/20 mt-1">
                            {Object.entries(msg.actionCard.details).map(([key, val]) => (
                              <div key={key} className="space-y-0.5">
                                <span className="text-[9px] font-black uppercase text-gray-500 block">{key}</span>
                                <span className="font-bold text-gray-900 dark:text-gray-100 truncate block">{val}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Contact Cards with 1-Click WhatsApp & Call Acionamento */}
                    {msg.contactCards && msg.contactCards.length > 0 && (
                      <div className="mt-3 space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700/60">
                        <div className="text-[10px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1">
                          <Phone size={12} className="text-yellow-500" /> Acionamento Rápido de Responsáveis ({msg.contactCards.length})
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {msg.contactCards.map((contact) => {
                            const cleanPhone = (contact.parentPhone || '').replace(/\D/g, '');
                            const isLate = contact.invoiceStatus === 'Em Atraso';
                            
                            // Pre-configured message templates
                            const defaultArrivalMsg = `Olá ${contact.parentName || 'Responsável'}! Aqui é o Tio da Van Escolar. Estamos a 5 minutos do ponto para o embarque do(a) ${contact.studentName}. 🚌💛`;
                            
                            const currentDay = new Date().getDate();
                            const stageKey = calculateStudentBillingStage(contact.paymentDay || 10, contact.invoiceStatus || 'Em Dia', currentDay);
                            const billingFormatted = formatBillingMessage({
                              stageKey,
                              studentName: contact.studentName,
                              parentName: contact.parentName || 'Responsável',
                              driverName: profile?.name || 'Tio da Van',
                              value: contact.value || 350,
                              paymentDay: contact.paymentDay || 10,
                              pixKey: profile?.pixKey || '',
                              driverCity: profile?.city || 'São Paulo'
                            });
                            const defaultPixMsg = billingFormatted.messageText;
                            
                            return (
                              <div 
                                key={contact.id}
                                className="bg-gray-50 dark:bg-gray-900/90 p-3 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2.5 shadow-sm"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-yellow-400 text-gray-950 flex items-center justify-center font-black text-xs shrink-0">
                                      {contact.studentName.charAt(0)}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <h5 className="font-black text-xs text-gray-900 dark:text-white">
                                          {contact.studentName}
                                        </h5>
                                        {contact.isAbsentToday && (
                                          <span className="px-1.5 py-0.2 bg-red-500/20 text-red-700 dark:text-red-300 text-[9px] font-black rounded-md">
                                            Não Vai Hoje
                                          </span>
                                        )}
                                        {isLate && (
                                          <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[9px] font-black rounded-md">
                                            Em Atraso
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-gray-500">
                                        {contact.parentName} • {contact.schoolName}
                                      </p>
                                    </div>
                                  </div>

                                  {contact.value && (
                                    <div className="text-right">
                                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                        R$ {contact.value.toFixed(2)}
                                      </span>
                                      <span className="text-[9px] text-gray-400 block">Dia {contact.paymentDay || 10}</span>
                                    </div>
                                  )}
                                </div>

                                {/* 1-Click Action Buttons */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                                  {/* Button 1: WhatsApp Chegando */}
                                  <a
                                    href={createWhatsAppUrl(contact.parentPhone, defaultArrivalMsg)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-[10px] flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer truncate active:scale-95"
                                    title="Avisar que a van está chegando"
                                  >
                                    <MessageCircle size={13} />
                                    <span>Van Chegando</span>
                                  </a>

                                  {/* Button 2: WhatsApp Cobrança Pix */}
                                  <a
                                    href={createWhatsAppUrl(contact.parentPhone, defaultPixMsg)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-2 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-xl text-[10px] flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer truncate active:scale-95"
                                    title="Enviar lembrete de Pix"
                                  >
                                    <CreditCard size={13} />
                                    <span>Cobrar Pix</span>
                                  </a>

                                  {/* Button 3: Ligar Direto */}
                                  <a
                                    href={cleanPhone ? `tel:${cleanPhone}` : '#'}
                                    className={`col-span-2 sm:col-span-1 px-2.5 py-2 font-bold rounded-xl text-[10px] flex items-center justify-center gap-1.5 transition-all truncate active:scale-95 ${
                                      cleanPhone
                                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow cursor-pointer'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                                    title="Ligar para o responsável"
                                  >
                                    <Phone size={13} />
                                    <span>Ligar</span>
                                  </a>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Speech Output Button for AI responses */}
                    {msg.sender === 'ai' && (
                      <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                        <button
                          onClick={() => toggleSpeakMessage(msg.id, msg.text)}
                          className={`text-[10px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
                            speakingMsgId === msg.id 
                              ? 'bg-yellow-400 text-gray-950 shadow-sm animate-pulse' 
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-yellow-100 dark:hover:bg-yellow-950/40 hover:text-yellow-800 dark:hover:text-yellow-300'
                          }`}
                          title="Clique para ouvir a T.IA narrar esta resposta"
                        >
                          {speakingMsgId === msg.id ? (
                            <><VolumeX size={13} /> <span>Parar Áudio</span></>
                          ) : (
                            <><Volume2 size={13} className="text-yellow-600 dark:text-yellow-400" /> <span>Ouvir em Voz Alta</span></>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-white dark:bg-gray-800 p-3.5 rounded-2xl w-fit shadow-sm border border-gray-100 dark:border-gray-700">
                  <RefreshCw size={15} className="animate-spin text-yellow-500" />
                  <span>Consultando seu banco de dados e preparando resposta...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Question Pills */}
            <div className="p-3 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 space-y-2 shrink-0">
              <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <Sparkles size={12} className="text-yellow-500" /> Perguntas Frequentes do Tio
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    disabled={loading}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-yellow-100 dark:hover:bg-yellow-950/40 text-gray-700 dark:text-gray-300 hover:text-gray-950 text-[11px] font-bold rounded-xl whitespace-nowrap transition-all shrink-0 cursor-pointer border border-gray-200 dark:border-gray-700"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar with Voice Microphone and Controls */}
            <div className="p-3.5 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleVoiceRecognition}
                className={`p-3 rounded-2xl transition-all cursor-pointer flex items-center justify-center shrink-0 shadow ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse ring-4 ring-red-200 dark:ring-red-900/50' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-yellow-400 hover:text-gray-950'
                }`}
                title={isListening ? 'Parar gravação' : 'Falar por comando de voz'}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              </button>

              <input 
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={isListening ? 'Fale agora... ouvindo sua voz...' : 'Pergunte sobre alunos, vagas ou cobranças...'}
                className={`flex-1 px-4 py-3 rounded-2xl text-xs transition-all focus:ring-2 focus:ring-yellow-400 focus:outline-none ${
                  isListening 
                    ? 'bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-200 border border-red-300 font-bold' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-transparent'
                }`}
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim() || loading}
                className="p-3 bg-yellow-400 text-gray-950 hover:bg-yellow-300 font-black rounded-2xl text-xs transition-all disabled:opacity-50 cursor-pointer shadow active:scale-95 shrink-0"
                title="Enviar mensagem"
              >
                <Send size={18} />
              </button>
            </div>
          </>
        )}
      </motion.div>

      {/* 📊 Bulk Student Upload Modal Triggered from AI/Tio IA */}
      <BulkStudentUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        driverId={profile?.id || ''}
        vehicles={vehicles}
        onOpenUpgradeModal={onOpenUpgradeModal}
      />
    </div>
  );
}
