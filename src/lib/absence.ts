import { Student } from '../types';

export function getTodayStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isStudentAbsentOnDate(student: Student, dateStr?: string): boolean {
  const targetDate = dateStr || getTodayStr();

  // If flagged manually for today
  if (targetDate === getTodayStr() && student.ausenteHoje) {
    return true;
  }

  // If present in absenceDates array
  if (student.absenceDates && Array.isArray(student.absenceDates) && student.absenceDates.includes(targetDate)) {
    return true;
  }

  // If present in scheduledAbsences array
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
