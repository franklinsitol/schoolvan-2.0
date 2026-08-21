import React, { useState } from 'react';
import { X, MessageSquare, Copy, Check, ExternalLink, Send, ShieldCheck, Sparkles, User, School, MapPin } from 'lucide-react';
import { Student } from '../types';
import toast from 'react-hot-toast';

interface AskParentUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  driverName?: string;
  driverPhone?: string;
  driverId: string;
}

export const AskParentUpdateModal: React.FC<AskParentUpdateModalProps> = ({
  isOpen,
  onClose,
  student,
  driverName = 'Tio(a) da Van',
  driverPhone = '',
  driverId
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [customNote, setCustomNote] = useState('');
  const [updateReason, setUpdateReason] = useState<'geral' | 'endereco' | 'horario' | 'inicio_ano'>('geral');

  if (!isOpen || !student) return null;

  // Build the direct update URL
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://schoolvan.app';
  const parentEmailParam = student.parentEmail ? `&email=${encodeURIComponent(student.parentEmail)}` : '';
  const updateUrl = `${origin}/?updateStudent=${student.id}&driver=${driverId}${parentEmailParam}`;

  // WhatsApp target phone
  const rawPhone = student.parentPhone || student.tel1 || student.tel2 || '';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const formattedPhone = cleanPhone.length >= 10 && !cleanPhone.startsWith('55') ? `55${cleanPhone}` : cleanPhone;

  const parentGreeting = student.parentName ? student.parentName.split(' ')[0] : 'Responsável';
  const studentFirstName = student.name ? student.name.split(' ')[0] : 'o aluno';

  let reasonIntro = `Para mantermos as informações de *${student.name}* sempre precisas e seguras no transporte escolar (endereço residencial, escola, telefones de contato/emergência e cuidados especiais)`;

  if (updateReason === 'endereco') {
    reasonIntro = `Estamos atualizando a rota de transporte escolar de *${student.name}* e precisamos que você confirme ou atualize o endereço da residência para mantermos o trajeto e o GPS corretos`;
  } else if (updateReason === 'horario') {
    reasonIntro = `Estamos alinhando os horários de entrada, saída e o turno escolar de *${student.name}* para a van escolar`;
  } else if (updateReason === 'inicio_ano') {
    reasonIntro = `Com o início do novo período escolar, estamos fazendo a revisão cadastral completa de *${student.name}* (série, escola, turno e telefones)`;
  }

  const customNoteBlock = customNote.trim() ? `\n\n📌 *Recado do Tio da Van:* ${customNote.trim()}` : '';

  const whatsappMessage = `🚐 *SchoolVan - Atualização Cadastral do Aluno*

Olá, *${parentGreeting}*! Tudo bem? Aqui é o *${driverName}* da Van Escolar.

${reasonIntro}, por favor acesse o link seguro abaixo para revisar ou preencher o cadastro:${customNoteBlock}

👉 *Acesse para atualizar:*
${updateUrl}

Leva apenas 1 minutinho e nos ajuda a garantir o melhor atendimento e segurança no transporte de ${studentFirstName}! 🚌✨

Muito obrigado! 🙏`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(updateUrl);
      setCopiedLink(true);
      toast.success('Link de atualização copiado para a área de transferência!');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      toast.error('Erro ao copiar link.');
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      setCopiedMsg(true);
      toast.success('Mensagem completa copiada!');
      setTimeout(() => setCopiedMsg(false), 2500);
    } catch {
      toast.error('Erro ao copiar mensagem.');
    }
  };

  const handleOpenWhatsApp = () => {
    const encodedText = encodeURIComponent(whatsappMessage);
    const waUrl = formattedPhone 
      ? `https://wa.me/${formattedPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;
    
    window.open(waUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-gray-950/60 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white w-full max-w-xl rounded-[32px] sm:rounded-[36px] shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-hidden animate-scale-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-900 via-teal-950 to-gray-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-400 text-emerald-950 flex items-center justify-center font-black shadow-md shrink-0">
              <MessageSquare size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg sm:text-xl text-white">
                  Pedir Atualização ao Responsável
                </h3>
              </div>
              <p className="text-xs text-emerald-200 font-medium">
                Envie um link direto no WhatsApp para os pais revisarem ou preencherem o cadastro
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 shrink-0"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Target Student Info Card */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/80 flex items-center justify-between gap-3">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase bg-yellow-400 text-gray-950 px-2 py-0.5 rounded-full">
                  Passageiro
                </span>
                <h4 className="font-black text-gray-900 text-sm truncate">{student.name}</h4>
              </div>
              <p className="text-xs text-gray-500 truncate">
                Responsável: <strong className="text-gray-700">{student.parentName || 'Não informado'}</strong>
                {student.parentPhone && ` • Tel: ${student.parentPhone}`}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <span className="text-[11px] font-bold text-gray-500 bg-white px-2.5 py-1 rounded-xl border border-gray-200">
                {student.schoolName || 'Escola'}
              </span>
            </div>
          </div>

          {/* Reason Selector */}
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-emerald-600" />
              <span>Motivo da Solicitação</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'geral', label: 'Geral / Completo' },
                { id: 'endereco', label: 'Endereço / Rota' },
                { id: 'horario', label: 'Turno & Horário' },
                { id: 'inicio_ano', label: 'Novo Semestre' }
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setUpdateReason(item.id as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                    updateReason === item.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Driver Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
              <span>Recado ou Instrução Opcional (anexado à mensagem):</span>
              <span className="text-[10px] text-gray-400 font-normal">Opcional</span>
            </label>
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Ex: Favor confirmar o número do novo apartamento e contato da vovó..."
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-gray-700 uppercase tracking-wider">
                Prévia da Mensagem (WhatsApp)
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
              >
                {copiedMsg ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                <span>{copiedMsg ? 'Mensagem copiada!' : 'Copiar texto'}</span>
              </button>
            </div>

            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-xs text-emerald-950 font-mono whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto">
              {whatsappMessage}
            </div>
          </div>

          {/* Direct Link Box */}
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-2xl flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                Link de Atualização Rápida:
              </span>
              <p className="text-xs text-gray-700 font-mono truncate select-all">{updateUrl}</p>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                copiedLink 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-white hover:bg-gray-200 text-gray-800 border border-gray-200'
              }`}
            >
              {copiedLink ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedLink ? 'Copiado!' : 'Copiar Link'}</span>
            </button>
          </div>
        </div>

        {/* Modal Footer with Primary Action */}
        <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5 text-center sm:text-left">
            <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
            <span>O pai pode preencher pelo celular mesmo sem senha e os dados são salvos na hora.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-2xl bg-white hover:bg-gray-100 text-gray-700 font-bold text-xs border border-gray-200 transition-all cursor-pointer flex-1 sm:flex-initial"
            >
              Voltar
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 flex-1 sm:flex-initial"
            >
              <Send size={15} />
              <span>Enviar no WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
