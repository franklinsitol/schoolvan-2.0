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
  // Asaas Subaccount Integration
  asaasAccountId?: string;
  asaasApiKey?: string;
  asaasWalletId?: string;
  asaasStatus?: 'pending' | 'active' | 'disabled';
  // Professional Accreditation & Verification (Pro / Frota)
  verificationStatus?: 'nao_enviado' | 'em_analise' | 'verificado' | 'rejeitado' | 'pending' | 'verified' | 'unverified' | 'rejected';
  isVerified?: boolean;
  verificationSubmittedAt?: string;
  verificationApprovedAt?: string;
  verificationNotes?: string;
  verificationDocs?: {
    cnhEarFile?: string;
    cnhEarValidUntil?: string;
    schoolCourseFile?: string;
    schoolCourseValidUntil?: string;
    municipalLicenseFile?: string;
    municipalLicenseNumber?: string;
  };
  cnhCategory?: string;
  cnhNumber?: string;
  cnhValidUntil?: string;
  cnhEar?: boolean;
  schoolCourseNumber?: string;
  schoolCourseValidUntil?: string;
  municipalLicenseNumber?: string;
  municipalLicenseValidUntil?: string;
  documentFiles?: Array<{
    type: 'cnh' | 'course' | 'alvara' | 'other';
    name: string;
    date: string;
  }>;
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
  renavam?: string;
  capacity: number;
  about?: string;
  iconType?: string;
  uncleName?: string;
  state?: string;
  city?: string;
  neighborhood?: string;
  garageAddress?: string;
  value?: number;
  // Inspection & Regulation fields (CTB Art. 136)
  lastInspectionDate?: string;
  nextInspectionDate?: string;
  tacografoValidUntil?: string;
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
  shift?: 'Manhã' | 'Tarde' | 'Integral' | string;
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
  ausenteHojeDate?: string;
  absenceDates?: string[];
  scheduledAbsences?: {
    date: string;
    reason?: string;
    createdAt: string;
  }[];
  routeOrder?: number;
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
  asaasPaymentId?: string;
  asaasInvoiceUrl?: string;
  asaasBankSlipUrl?: string;
  asaasPixQrCode?: string;
  asaasPixCopiaECola?: string;
  paymentMethod?: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'MANUAL';
  splitFeeApplied?: number;
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
  // Asaas Gateway Configuration
  asaasApiKey?: string;
  asaasEnvironment?: 'sandbox' | 'production';
  asaasWebhookSecret?: string;
  asaasPlatformSplitFee?: number; // Ex: 1.50 (R$ 1,50 por cobrança)
  asaasSplitType?: 'FIXED' | 'PERCENTAGE';
  asaasAutoSync?: boolean;
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

export interface RouteIncident {
  id?: string;
  driverId: string;
  driverName?: string;
  vehicleName?: string;
  incidentType: 'pneu' | 'transito' | 'chuva' | 'emergencia' | 'custom' | string;
  title: string;
  message: string;
  estimatedDelay?: string;
  status: 'active' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
  resolvedMessage?: string;
  targetStudentEmails?: string[];
  acknowledgedByParentEmails?: string[];
}

