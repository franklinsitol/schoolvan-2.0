import React, { useState } from 'react';
import { X, CheckCircle2, Home, Bus, School, UserX, AlertTriangle, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';
import { SchoolVanLogo } from './SchoolVanLogo';
import { motion, AnimatePresence } from 'motion/react';
import { Student, BoardingStatus } from '../types';
import { cn } from '../lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isStudentAbsentOnDate, reintegrateStudentToRoute, getTodayStr } from '../lib/absence';
import { playBusHornSound } from '../lib/sound';
import { showStudentStatusPushNotification, playStudentStatusChime } from '../lib/pushNotifications';
import toast from 'react-hot-toast';

interface CheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  driverId: string;
}

export function CheckinModal({ isOpen, onClose, students, driverId }: CheckinModalProps) {
  const [showAbsentSection, setShowAbsentSection] = useState(false);
  if (!isOpen) return null;

  const todayStr = getTodayStr();

  const activeStudents = students
    .filter(s => s.status === 'Ativo' && !isStudentAbsentOnDate(s, todayStr))
    .sort((a, b) => {
      if (a.routeOrder !== undefined && b.routeOrder !== undefined) {
        return a.routeOrder - b.routeOrder;
      }
      return (a.entryTime || '07:00').localeCompare(b.entryTime || '07:00');
    });

  const absentStudents = students.filter(s => s.status === 'Ativo' && isStudentAbsentOnDate(s, todayStr));

  const handleStatusChange = async (student: Student) => {
    const nextStatus: Record<BoardingStatus, BoardingStatus> = {
      'Casa': 'Van',
      'Van': 'Escola',
      'Escola': 'Casa',
      'A CAMINHO': 'Van',
      'NÃO VAI': 'Casa'
    };

    const newStatus = nextStatus[student.boardingStatus || 'Casa'];

    const statusLabels: Record<BoardingStatus, string> = {
      'Casa': '🏠 Aguardando em Casa',
      'Van': '🚌 Embarcou na Van',
      'Escola': '🏫 Entregue na Escola',
      'A CAMINHO': '🚌 A Caminho da sua casa',
      'NÃO VAI': '🚫 Não vai hoje'
    };

    try {
      await updateDoc(doc(db, `drivers/${driverId}/students`, student.id), {
        boardingStatus: newStatus,
        lastCheck: new Date().toISOString()
      });

      // Trigger local sound & push notification
      showStudentStatusPushNotification({
        studentName: student.name,
        status: newStatus,
        schoolName: student.schoolName,
        studentId: student.id
      });

      toast.success(`${student.name}: ${statusLabels[newStatus]}`);

      // If student just boarded the van (Van), notify the NEXT student that the van is on the way!
      if (newStatus === 'Van') {
        const currentIndex = activeStudents.findIndex(s => s.id === student.id);
        const nextStudent = activeStudents.slice(currentIndex + 1).find(s => !s.boardingStatus || s.boardingStatus === 'Casa');

        if (nextStudent) {
          await updateDoc(doc(db, `drivers/${driverId}/students`, nextStudent.id), {
            boardingStatus: 'A CAMINHO',
            lastCheck: new Date().toISOString()
          });

          showStudentStatusPushNotification({
            studentName: nextStudent.name,
            status: 'A CAMINHO',
            schoolName: nextStudent.schoolName,
            studentId: nextStudent.id
          });

          toast(`🔔 Notificação de proximidade: ${nextStudent.name} é o próximo na rota (A Caminho)!`, {
            icon: '🚐',
            duration: 4000
          });
        }
      }
    } catch (error) {
      toast.error('Erro ao atualizar status do passageiro');
    }
  };

  const handleReintegrate = async (student: Student) => {
    try {
      await reintegrateStudentToRoute(driverId, student.id, student, todayStr);
      playBusHornSound();
      toast.success(`🎉 ${student.name} reintegrado(a) à chamada de hoje!`);
    } catch (err) {
      toast.error('Erro ao reintegrar aluno.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800"
      >
        <div className="p-6 bg-gray-950 text-white flex items-center justify-between border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-yellow-400 text-gray-950 rounded-xl flex items-center justify-center font-bold">
                <SchoolVanLogo size={22} />
              </div>
              <h3 className="text-lg font-black text-white">
                Chamada do Embarque 🚌
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Toque no aluno para avançar onde ele está na rota agora ({activeStudents.length} presentes).
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-4 space-y-2.5 bg-gray-50 dark:bg-gray-950/40">
          {activeStudents.map((student) => {
            const status = student.boardingStatus || 'Casa';
            const colors: Record<string, string> = {
              'Casa': 'border-amber-400 bg-amber-50/50 text-amber-900 dark:bg-amber-950/20 dark:text-amber-300',
              'Van': 'border-emerald-500 bg-emerald-50/60 text-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300',
              'Escola': 'border-blue-500 bg-blue-50/60 text-blue-900 dark:bg-blue-950/20 dark:text-blue-300',
              'A CAMINHO': 'border-yellow-500 bg-yellow-50/60 text-yellow-900',
              'NÃO VAI': 'border-gray-400 bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
            };

            const statusTitles: Record<string, string> = {
              'Casa': '🏠 Aguardando em Casa',
              'Van': '🚌 Embarcou na Van (Em Trânsito)',
              'Escola': '🏫 Entregue na Escola / Destino',
              'A CAMINHO': '🚌 A Caminho da Van',
              'NÃO VAI': '🚫 Faltou Hoje'
            };

            const Icon = status === 'Casa' ? Home : status === 'Van' ? Bus : status === 'Escola' ? School : UserX;

            return (
              <button
                key={student.id}
                onClick={() => handleStatusChange(student)}
                className={cn(
                  "w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all active:scale-[0.98] shadow-sm cursor-pointer",
                  colors[status]
                )}
              >
                <div className="text-left">
                  <div className="font-extrabold text-sm">{student.name}</div>
                  <div className="text-[11px] font-bold opacity-80 mt-0.5 flex items-center gap-1">
                    <span>Escola: {student.schoolName || 'Geral'}</span>
                    <span>•</span>
                    <span>Assento {student.seat || 'S/N'}</span>
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-wider mt-1.5 inline-block px-2 py-0.5 rounded-md bg-white/70 dark:bg-black/30">
                    {statusTitles[status]}
                  </div>
                </div>

                <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow flex items-center justify-center shrink-0">
                  <Icon size={22} className="text-gray-900 dark:text-white" />
                </div>
              </button>
            );
          })}

          {activeStudents.length === 0 && (
            <div className="p-8 text-center text-gray-400 font-bold text-xs">
              Nenhum aluno ativo para o dia de hoje.
            </div>
          )}

          {/* Absent Students section in Checkin */}
          {absentStudents.length > 0 && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-800 space-y-2">
              <button
                onClick={() => setShowAbsentSection(!showAbsentSection)}
                className="w-full flex items-center justify-between p-2.5 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 rounded-xl font-bold text-xs border border-amber-200 dark:border-amber-800/50 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <AlertTriangle size={15} className="text-amber-600" />
                  Alunos Ausentes Hoje ({absentStudents.length})
                </span>
                {showAbsentSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showAbsentSection && (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 px-1">
                    O aluno compareceu de surpresa na van? Clique em reintegrar para adicioná-lo à chamada:
                  </p>
                  {absentStudents.map((st) => (
                    <div
                      key={st.id}
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs"
                    >
                      <div>
                        <div className="font-extrabold text-gray-900 dark:text-gray-100">{st.name}</div>
                        <div className="text-[11px] text-gray-500">{st.schoolName || 'Escola'} • Ausente hoje</div>
                      </div>

                      <button
                        onClick={() => handleReintegrate(st)}
                        className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-300 text-gray-950 font-black rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                      >
                        <UserPlus size={13} />
                        <span>Reintegrar</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
