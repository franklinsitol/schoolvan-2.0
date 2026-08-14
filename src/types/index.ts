export type BoardingStatus = 'Casa' | 'Van' | 'Escola' | 'A CAMINHO' | 'NÃO VAI';
export type InvoiceStatus = 'Em Dia' | 'Em Atraso' | 'Aguardando Pagamento' | 'Pendente';
export type AccountStatus = 'Ativo' | 'Bloqueado' | 'AvisoPagamento';
export type Role = 'admin' | 'superadmin' | 'colab' | 'parent';
export type PlanTier = 'Gratuito' | 'Pro' | 'Frota';

export interface Driver {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  cpfCnpj?: string;
  pixKey?: string;
  birthDate?: string;
  plan?: PlanTier;
  status: AccountStatus;
  pricePerStudent?: number;
  customMonthlyFee?: number;
  invoiceStatus?: InvoiceStatus;
  hiddenInMarketplace?: boolean;
  termsAccepted?: string;
  lastBilledMonth?: string;
  role?: Role;
  paymentPromiseUntil?: string; // Grace period extension date
  customStudentLimit?: number;
  trialEndsAt?: string;
  discountType?: 'temporary' | 'permanent' | 'none';
  discountPercent?: number;
  discountUntil?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  paymentProofUrl?: string;
  paymentProofNotes?: string;
  paymentProofSubmittedAt?: string;
}

export interface TeamMember {
  id: string;
  ownerId?: string;
  name: string;
  email: string;
  phone?: string;
  vehicleId?: string;
  canEdit?: boolean;
  role: Role;
  memberType?: 'Motorista' | 'Monitor';
  plan?: PlanTier;
  invoiceStatus?: InvoiceStatus;
  paymentPromiseUntil?: string;
  pixKey?: string;
  city?: string;
  cpfCnpj?: string;
  termsAccepted?: string;
}

export interface Vehicle {
  id: string;
  driverId: string;
  name: string;
  model?: string;
  plate?: string;
  capacity: number;
  about?: string;
  iconType?: string;
  uncleName?: string;
  state?: string;
  city?: string;
  neighborhood?: string;
  garageAddress?: string;
  value?: number;
}

export interface Student {
  id: string;
  driverId: string;
  name: string;
  parentName: string;
  parentEmail: string;
  studentAddress?: string;
  schoolAddress?: string;
  value?: number;
  status: 'Ativo' | 'Excluido';
  entryTime?: string;
  exitTime?: string;
  paymentDay?: number;
  vehicleId?: string;
  seat?: number;
  boardingStatus: BoardingStatus;
  schoolName?: string;
  lastCheck?: string;
  parentPhone?: string;
  parentAccess?: boolean;
  grade?: string;
  prof1?: string;
  prof2?: string;
  resp1?: string;
  resp2?: string;
  tel1?: string;
  tel2?: string;
  tel3?: string;
  nextAlert?: string;
  ausenteHoje?: boolean;
  absenceDates?: string[];
  scheduledAbsences?: {
    date: string;
    reason?: string;
    createdAt: string;
  }[];
}

export interface Finance {
  id: string;
  driverId: string;
  studentId: string;
  studentName: string;
  value: number;
  dueDate: string;
  status: InvoiceStatus;
  ref?: string;
  type: 'Receita' | 'Despesa';
}

export interface Lead {
  id: string;
  driverId: string;
  vehicleId?: string;
  vehicleName?: string;
  parentName: string;
  phone: string;
  email?: string;
  childName: string;
  school?: string;
  schoolName?: string;
  schoolAddress?: string;
  address?: string;
  studentAddress?: string;
  shift?: string;
  entryTime?: string;
  exitTime?: string;
  notes?: string;
  date: string;
  status: 'Pendente' | 'Em Contato' | 'Convertido' | 'Recusado' | 'Aprovado';
  value?: number;
}

export interface Absence {
  id: string;
  studentId: string;
  date: string;
  reason?: string;
  registeredAt: string;
}

export interface Ticket {
  id: string;
  dateTime: string;
  profile: string;
  subject: string;
  name: string;
  contact: string;
  message: string;
  status: 'Aberto' | 'Em Andamento' | 'Fechado';
}

export interface AdminConfig {
  pixAdmin?: string;
  defaultPrice?: number;
  proPrice?: number;
  frotaPrice?: number;
  freeStudentLimit?: number;
  proStudentLimit?: number;
  graceDaysAllowed?: number;
  trialDaysAllowed?: number;
  supportEmails?: string;
  onboardTitle?: string;
  onboardMsg?: string;
  popupActive?: boolean;
  popupMsg?: string;
  termsText?: string;
  lgpdText?: string;
  masterPass?: string;
}

export interface SubscriptionInvoice {
  id: string;
  driverId: string;
  monthRef: string;
  dueDate: string;
  paidAt?: string;
  amount: number;
  status: 'Pago' | 'Em Aberto' | 'Em Processamento' | 'Pendente';
  plan: 'Pro' | 'Frota';
  vehiclesCount: number;
  method: 'Pix';
  txid?: string;
  notes?: string;
  receiptUrl?: string;
}

