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
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { Student, Vehicle, Finance, Lead } from '../types';
import { playBusHornSound, speakTiaPrompt, speakTioIAPrompt } from '../lib/sound';
import { checkCanAddStudent, checkCanAddVehicle } from '../lib/plans';
import { getReadNotifications, markNotificationAsRead } from '../lib/tioNotifications';
import { db } from '../lib/firebase';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
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
  const { data: finances } = useFirestore<Finance>(profile?.id ? `drivers/${profile.id}/finances` : '');
  const { data: leads } = useFirestore<Lead>(profile?.id ? `drivers/${profile.id}/leads` : '');

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
    parentPhone: string;
    value: number | string;
  }>({
    name: '',
    schoolName: '',
    parentPhone: '',
    value: 350
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Quick contextual prompts matching user exact requests
  const quickQuestions = [
    '🏫 Quem são os alunos de cada escola?',
    '💸 QUAIS alunos eu preciso cobrar esse mês?',
    '💺 Quantos assentos / vagas tenho disponíveis?',
    '🚫 Quem NÃO vai hoje para a escola?',
    '📱 Como mandar cobrança Pix automática no Zap?'
  ];

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
    if (!profile?.id || !quickStudentForm.name.trim()) return;

    const allowed = checkCanAddStudent(profile, students.length, onOpenUpgradeModal);
    if (!allowed) return;

    setSavingStep(true);
    try {
      await addDoc(collection(db, 'drivers', profile.id, 'students'), {
        name: quickStudentForm.name,
        schoolName: quickStudentForm.schoolName,
        parentPhone: quickStudentForm.parentPhone,
        value: Number(quickStudentForm.value),
        status: 'Ativo',
        boardingStatus: 'PENDENTE',
        createdAt: new Date().toISOString()
      });
      playBusHornSound();
      toast.success(`Aluno ${quickStudentForm.name} cadastrado com sucesso!`);
      setQuickStudentForm({
        name: '',
        schoolName: '',
        parentPhone: '',
        value: 350
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
      toast.error('Reconhecimento de voz não suportado pelo seu navegador.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        toast('🎤 Ouvindo você... Pode falar com a T.IA!', { icon: '🤖' });
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
        handleSendMessage(transcript);
      };

      recognition.onerror = (err: any) => {
        console.error('Speech recognition error', err);
        setIsListening(false);
        toast.error('Não consegui ouvir com clareza. Tente novamente ou digite.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
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

  // Send Message Logic with Gemini Context
  const handleSendMessage = async (textToSend?: string) => {
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
    setLoading(true);

    try {
      let directAnswer = '';
      const lower = query.toLowerCase();

      if (lower.includes('escola') || lower.includes('escolas')) {
        const schoolList = Object.entries(studentsBySchool).map(([sch, list]) => 
          `🏫 **${sch}** (${list.length} alunos):\n${list.map(s => `  • ${s.name}${s.parentPhone ? ` (Zap: ${s.parentPhone})` : ''}`).join('\n')}`
        ).join('\n\n');
        
        directAnswer = `Aqui está a distribuição dos seus **${activeStudents.length} alunos** por escola:\n\n${schoolList || 'Nenhum aluno cadastrado ainda.'}`;
      } else if (lower.includes('cobrar') || lower.includes('pendente') || lower.includes('atraso') || lower.includes('deve')) {
        if (overdueFinances.length > 0) {
          const list = overdueFinances.map(f => `• **${f.studentName || 'Aluno'}**: R$ ${f.value.toFixed(2)} (Vencimento: ${f.dueDate || 'Recente'})`).join('\n');
          directAnswer = `💸 **Alunos com Mensalidade Pendente:**\n\n${list}\n\n💡 Você pode clicar no botão de cobrança no módulo Financeiro para enviar a mensagem automática com Chave Pix no WhatsApp dos pais!`;
        } else {
          directAnswer = `🎉 Excelente notícia, Tio! Todos os seus alunos estão com as mensalidades **em dia** no sistema! Total de ${activeStudents.length} alunos ativos gerando receita.`;
        }
      } else if (lower.includes('vaga') || lower.includes('assento') || lower.includes('lugares') || lower.includes('capacidade')) {
        directAnswer = `💺 **Capacidade da sua Frota:**\n\n• **Capacidade Total:** ${totalCapacity} assentos\n• **Alunos Ativos:** ${activeStudents.length} ocupados\n• **Vagas Disponíveis:** **${availableVacancies} lugares livres** para novas contratações!\n\n💡 Cadastre seu link de captação de alunos no Zap para preencher essas vagas.`;
      } else if (lower.includes('falta') || lower.includes('não vai') || lower.includes('ausente') || lower.includes('presença')) {
        if (absentStudents.length > 0) {
          const list = absentStudents.map(s => `• **${s.name}** (${s.schoolName || 'Escola'})`).join('\n');
          directAnswer = `🚫 **Alunos que NÃO vão para a escola hoje (${todayStr}):**\n\n${list}\n\n✅ Os responsáveis já registraram a ausência. Você não precisa passar no endereço deles hoje!`;
        } else {
          directAnswer = `🚍 **Presença de Hoje:** Nenhum responsável avisou ausência até o momento. Todos os **${activeStudents.length} alunos** estão confirmados para a rota de hoje!`;
        }
      } else if (lower.includes('pix') || lower.includes('zap') || lower.includes('whatsapp') || lower.includes('cobrança')) {
        directAnswer = `📱 **Como enviar cobrança Pix no Zap:**\n\n1. Acesse o menu **Financeiro** ou **Alunos**\n2. Clique no botão verde de **WhatsApp / Cobrança Pix** ao lado do aluno\n3. O SchoolVan gera uma mensagem personalizada com sua Chave Pix (**${profile?.pixKey || 'Não cadastrada'}**) e o valor exato da mensalidade para enviar em 1 clique!`;
      }

      if (!directAnswer) {
        const schoolsSummary = Object.entries(studentsBySchool)
          .map(([sch, list]) => `${sch}: ${list.map(s => s.name).join(', ')}`)
          .join('; ');

        const systemContextPrompt = `Você é a "T.IA" (lê-se Tia IA), copiloto inteligente e amigável para motoristas e monitoras de vans escolares no Brasil dentro do app SchoolVan.
Responda sempre em português brasileiro de forma direta, prestativa e calorosa, usando o jargão respeitoso e acolhedor de "Tio/Tia da Van".

DADOS EM TEMPO REAL DO MOTORISTA:
- Nome do Motorista: ${profile?.name || 'Tio'}
- Plano: ${profile?.plan || 'Gratuito'}
- Chave Pix: ${profile?.pixKey || 'Não configurada'}
- Total de Alunos Ativos: ${activeStudents.length}
- Capacidade da Frota: ${totalCapacity} assentos (${availableVacancies} vagas livres)
- Alunos por Escola: ${schoolsSummary || 'Nenhum'}
- Alunos Ausentes Hoje: ${absentStudents.map(s => s.name).join(', ') || 'Nenhum'}
- Faturas em Atraso: ${overdueFinances.length} pendentes
- Solicitações de Vagas (Leads): ${leads.length} pedidos de pais

Pergunta do motorista: "${query}". Responda de forma concisa e útil.`;

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
          directAnswer = data.reply || data.text || 'Entendido, Tio! Estou à disposição para ajudar com sua rota.';
        } else {
          directAnswer = `Tio, consultei seus registros: você tem **${activeStudents.length} alunos cadastrados**, **${availableVacancies} vagas disponíveis** e **${absentStudents.length} ausências registradas hoje**. Se precisar de algo específico sobre escolas, cobranças Pix ou rotas, é só me perguntar!`;
        }
      }

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: directAnswer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiResponse]);
      speakTioIAPrompt(directAnswer);

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
                    <label className="block text-[11px] font-black uppercase text-gray-600 dark:text-gray-300 mb-1">
                      Seu Nome / Nome da Van
                    </label>
                    <input 
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="Ex: Tio Carlos - Van Estrela"
                      className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black uppercase text-gray-600 dark:text-gray-300 mb-1">
                        WhatsApp de Atendimento
                      </label>
                      <input 
                        type="text"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder="(11) 99999-9999"
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-gray-600 dark:text-gray-300 mb-1">
                        Sua Chave Pix Principal
                      </label>
                      <input 
                        type="text"
                        value={profileForm.pixKey}
                        onChange={(e) => setProfileForm(p => ({ ...p, pixKey: e.target.value }))}
                        placeholder="CPF, CNPJ, Celular, E-mail..."
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none"
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
                      <label className="block text-[11px] font-black uppercase text-gray-600 dark:text-gray-300 mb-1">
                        Nome / Identificação da Van
                      </label>
                      <input 
                        type="text"
                        value={vehicleForm.name}
                        onChange={(e) => setVehicleForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="Ex: Van 01 - Zona Sul"
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-gray-600 dark:text-gray-300 mb-1">
                        Placa
                      </label>
                      <input 
                        type="text"
                        value={vehicleForm.plate}
                        onChange={(e) => setVehicleForm(p => ({ ...p, plate: e.target.value.toUpperCase() }))}
                        placeholder="ABC-1234"
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm uppercase font-mono focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-black uppercase text-gray-600 dark:text-gray-300 mb-1">
                        Modelo
                      </label>
                      <input 
                        type="text"
                        value={vehicleForm.model}
                        onChange={(e) => setVehicleForm(p => ({ ...p, model: e.target.value }))}
                        placeholder="Mercedes Sprinter, Fiat Ducato..."
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase text-gray-600 dark:text-gray-300 mb-1">
                        Capacidade de Assentos
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
                        className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm font-bold focus:ring-2 focus:ring-yellow-400 focus:outline-none"
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
                    <span className="px-2.5 py-0.5 bg-yellow-400/20 text-yellow-800 dark:text-yellow-300 text-xs font-black rounded-full">
                      {activeStudents.length} Alunos Cadastrados
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Cadastre os alunos para ter lista de presença, chamada rápida e cobrança automática.
                  </p>
                </div>

                {/* Inline Quick Add Form */}
                <form onSubmit={handleQuickAddStudent} className="bg-gray-50 dark:bg-gray-800/60 p-3.5 rounded-2xl space-y-3 border border-gray-200 dark:border-gray-700">
                  <span className="text-[11px] font-black uppercase text-gray-700 dark:text-gray-300 flex items-center gap-1">
                    <Users size={13} className="text-yellow-500" /> Cadastro Rápido de Aluno
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input 
                      type="text"
                      placeholder="Nome do Aluno"
                      value={quickStudentForm.name}
                      onChange={(e) => setQuickStudentForm(p => ({ ...p, name: e.target.value }))}
                      required
                      className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                    />

                    <input 
                      type="text"
                      placeholder="Escola de Destino"
                      value={quickStudentForm.schoolName}
                      onChange={(e) => setQuickStudentForm(p => ({ ...p, schoolName: e.target.value }))}
                      className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input 
                      type="text"
                      placeholder="WhatsApp do Pai/Mãe"
                      value={quickStudentForm.parentPhone}
                      onChange={(e) => setQuickStudentForm(p => ({ ...p, parentPhone: e.target.value }))}
                      className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                    />

                    <input 
                      type="number"
                      placeholder="Valor Mensalidade (R$)"
                      value={quickStudentForm.value}
                      onChange={(e) => {
                        const val = e.target.value;
                        setQuickStudentForm(p => ({ ...p, value: val === '' ? '' : Number(val) }));
                      }}
                      className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold focus:ring-2 focus:ring-yellow-400 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingStep || !quickStudentForm.name.trim()}
                    className="w-full py-2 bg-gray-950 text-yellow-400 font-bold rounded-xl text-xs shadow hover:bg-gray-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    + Salvar este Aluno na Rota
                  </button>
                </form>

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
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`max-w-[88%] rounded-2xl p-4 text-xs leading-relaxed shadow-sm relative group ${
                    msg.sender === 'user' 
                      ? 'bg-yellow-400 text-gray-950 font-medium rounded-tr-none' 
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700/60 rounded-tl-none whitespace-pre-wrap'
                  }`}>
                    {msg.text}

                    {/* Speech Output Button for AI responses */}
                    {msg.sender === 'ai' && (
                      <button
                        onClick={() => toggleSpeakMessage(msg.id, msg.text)}
                        className="mt-2 text-[10px] text-yellow-600 dark:text-yellow-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                      >
                        {speakingMsgId === msg.id ? (
                          <><VolumeX size={13} className="animate-pulse" /> Parar Voz</>
                        ) : (
                          <><Volume2 size={13} /> Ouvir Resposta em Voz Alta</>
                        )}
                      </button>
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
    </div>
  );
}
