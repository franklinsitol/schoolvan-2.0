import { Student } from '../types';
import { doc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';

export function getTodayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isStudentAbsentOnDate(student: Student, dateStr?: string): boolean {
  if (!student) return false;
  const today = getTodayStr();
  const targetDate = dateStr || today;

  // 1. If checking today specifically and student was flagged absent today:
  if (targetDate === today) {
    if (student.ausenteHoje) {
      // If ausenteHojeDate is set, only consider absent if it equals today.
      // If ausenteHojeDate is not set, treat as today.
      if (!student.ausenteHojeDate || student.ausenteHojeDate === today) {
        return true;
      }
    }
  }

  // 2. If present in absenceDates array for the targeted date
  if (student.absenceDates && Array.isArray(student.absenceDates) && student.absenceDates.includes(targetDate)) {
    return true;
  }

  // 3. If present in scheduledAbsences array for the targeted date
  if (student.scheduledAbsences && Array.isArray(student.scheduledAbsences)) {
    return student.scheduledAbsences.some(a => a.date === targetDate);
  }

  return false;
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Mark a student as absent for a specific date (defaults to today).
 * The student will be absent ONLY for that date and return on subsequent dates.
 */
export async function markStudentAbsent(
  driverId: string, 
  studentId: string, 
  student: Partial<Student>, 
  targetDate?: string, 
  reason?: string,
  parentEmail?: string
): Promise<void> {
  const today = getTodayStr();
  const dateToMark = targetDate || today;
  const isToday = dateToMark === today;
  const studentRef = doc(db, 'drivers', driverId, 'students', studentId);

  const currentDates = student.absenceDates || [];
  const updatedDates = currentDates.includes(dateToMark) ? currentDates : [...currentDates, dateToMark];

  const currentScheduled = student.scheduledAbsences || [];
  const updatedScheduled = currentScheduled.some(a => a.date === dateToMark)
    ? currentScheduled
    : [
        ...currentScheduled,
        {
          date: dateToMark,
          reason: reason || (isToday ? 'Aviso de falta no dia' : 'Falta programada'),
          createdAt: new Date().toISOString()
        }
      ];

  await updateDoc(studentRef, {
    ...(isToday ? { ausenteHoje: true, ausenteHojeDate: today } : {}),
    absenceDates: updatedDates,
    scheduledAbsences: updatedScheduled,
    lastCheck: new Date().toISOString()
  });

  // Audit log in driver's absences subcollection
  try {
    await addDoc(collection(db, 'drivers', driverId, 'absences'), {
      studentId: studentId,
      studentName: student.name || 'Aluno',
      date: dateToMark,
      reason: reason || (isToday ? 'Aviso de falta no dia' : 'Falta programada'),
      registeredAt: new Date().toISOString(),
      parentEmail: parentEmail || student.parentEmail || ''
    });
  } catch (err) {
    console.warn('Absence audit log warning:', err);
  }
}

/**
 * Reintegrates an absent student back into the route for a specific date (defaults to today).
 * Clears the absence for that date so the student immediately shows on the route.
 */
export async function reintegrateStudentToRoute(
  driverId: string, 
  studentId: string, 
  student: Partial<Student>, 
  targetDate?: string,
  parentEmail?: string
): Promise<void> {
  const today = getTodayStr();
  const dateToRemove = targetDate || today;
  const isToday = dateToRemove === today;
  const studentRef = doc(db, 'drivers', driverId, 'students', studentId);

  const updatedDates = (student.absenceDates || []).filter(d => d !== dateToRemove);
  const updatedScheduled = (student.scheduledAbsences || []).filter(a => a.date !== dateToRemove);

  await updateDoc(studentRef, {
    ...(isToday ? { ausenteHoje: false, ausenteHojeDate: '' } : {}),
    absenceDates: updatedDates,
    scheduledAbsences: updatedScheduled,
    boardingStatus: student.boardingStatus === 'NÃO VAI' ? 'Casa' : (student.boardingStatus || 'Casa'),
    lastCheck: new Date().toISOString()
  });

  // Audit log in driver's absences subcollection
  try {
    await addDoc(collection(db, 'drivers', driverId, 'absences'), {
      studentId: studentId,
      studentName: student.name || 'Aluno',
      date: dateToRemove,
      reason: isToday ? 'Reintegrado à rota / Presença confirmada no dia' : 'Cancelamento de falta agendada',
      registeredAt: new Date().toISOString(),
      parentEmail: parentEmail || student.parentEmail || ''
    });
  } catch (err) {
    console.warn('Reintegrate audit log warning:', err);
  }
}
