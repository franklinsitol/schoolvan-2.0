import React from 'react';
import { X, CheckCircle2, Home, Bus, School, UserX } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Student, BoardingStatus } from '../types';
import { cn } from '../lib/utils';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isStudentAbsentOnDate } from '../lib/absence';
import toast from 'react-hot-toast';

interface CheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  driverId: string;
}

export function CheckinModal({ isOpen, onClose, students, driverId }: CheckinModalProps) {
  if (!isOpen) return null;

  const handleStatusChange = async (student: Student) => {
    const nextStatus: Record<BoardingStatus, BoardingStatus> = {
      'Casa': 'Van',
      'Van': 'Escola',
      'Escola': 'Casa',
      'A CAMINHO': 'Van',
      'NÃO VAI': 'Casa'
    };

    const newStatus = nextStatus[student.boardingStatus || 'Casa'];

    try {
      await updateDoc(doc(db, `drivers/${driverId}/students`, student.id), {
        boardingStatus: newStatus,
        lastCheck: new Date().toISOString()
      });
      toast.success(`${student.name}: ${newStatus}`);
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden"
      >
        <div className="p-6 bg-gray-900 text-white flex items-center justify-between">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <CheckCircle2 className="text-yellow-400" /> Check-in Rápido
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-2">
          {students.filter(s => s.status === 'Ativo' && !isStudentAbsentOnDate(s)).map((student) => {
            const status = student.boardingStatus || 'Casa';
            const colors: any = {
              'Casa': 'border-red-500 bg-red-50/30',
              'Van': 'border-green-500 bg-green-50/30',
              'Escola': 'border-blue-500 bg-blue-50/30',
              'A CAMINHO': 'border-yellow-500 bg-yellow-50/30',
              'NÃO VAI': 'border-gray-500 bg-gray-50/30'
            };
            const icons: any = {
              'Casa': Home,
              'Van': Bus,
              'Escola': School,
              'A CAMINHO': Bus,
              'NÃO VAI': UserX
            };
            const Icon = icons[status];

            return (
              <button
                key={student.id}
                onClick={() => handleStatusChange(student)}
                className={cn(
                  "w-full flex items-center justify-between p-4 mb-2 rounded-3xl border-l-[6px] transition-all active:scale-95",
                  colors[status]
                )}
              >
                <div className="text-left">
                  <div className="font-bold text-gray-900">{student.name}</div>
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">{status}</div>
                </div>
                <Icon className="text-gray-400" size={28} />
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
