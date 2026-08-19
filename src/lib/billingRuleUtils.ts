// ============================================================================
// 🚌 SCHOOLVAN - RÉGUA DE COMUNICAÇÃO E COBRANÇA INTELIGENTE DA T.IA
// ============================================================================

export type BillingStageKey = 
  | 'virada_mes'
  | 'lembrete_preventivo'
  | 'dia_vencimento'
  | 'atraso_leve'
  | 'atraso_critico';

export interface BillingStageConfig {
  key: BillingStageKey;
  stepNumber: number;
  name: string;
  shortLabel: string;
  badgeColor: string;
  daysDescription: string;
  defaultTriggerDays: string;
  description: string;
  tone: 'Amigável / Informativo' | 'Lembrete Suave' | 'Direto / Pagamento Hoje' | 'Atenção / Regularização' | 'Cobrança Administrativa';
  defaultTemplate: string;
}

export const BILLING_STAGES: Record<BillingStageKey, BillingStageConfig> = {
  virada_mes: {
    key: 'virada_mes',
    stepNumber: 1,
    name: '1. Virada do Mês (Abertura da Fatura)',
    shortLabel: 'Abertura Mês',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    daysDescription: 'Disparado entre os dias 01 e 05 de cada mês',
    defaultTriggerDays: 'Dias 01 a 05',
    description: 'Avisa com carinho que o novo mês iniciou e disponibiliza o valor e Pix Copia e Cola antecipadamente.',
    tone: 'Amigável / Informativo',
    defaultTemplate: `Olá, [NOME_RESPONSAVEL]! Tudo bem? 😊

Aqui é a T.IA, assistente virtual da Van do(a) [NOME_TIO]! 🚌✨

Passando no início deste mês para disponibilizar a mensalidade do transporte escolar do(a) [NOME_ALUNO]:

📌 *Valor:* R$ [VALOR]
📅 *Vencimento:* Dia [DIA_VENCIMENTO]

🔑 *Chave Pix / Copia e Cola:*
\`\`\`
[PIX_COPIA_COLA]
\`\`\`

Muito obrigado pela confiança de sempre! Tenha um mês abençoado! 🙏`
  },

  lembrete_preventivo: {
    key: 'lembrete_preventivo',
    stepNumber: 2,
    name: '2. Lembrete Preventivo (Pré-Vencimento)',
    shortLabel: 'Pré-Vencimento',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-200',
    daysDescription: 'Disparado 2 a 3 dias antes do dia de vencimento (ex: Dias 07 a 08)',
    defaultTriggerDays: '2-3 dias antes',
    description: 'Lembrete educado para evitar esquecimentos na correria do dia a dia.',
    tone: 'Lembrete Suave',
    defaultTemplate: `Oi, [NOME_RESPONSAVEL]! Tudo bem com você? 🚌

Lembrete amigável da Van do(a) [NOME_TIO]: a mensalidade do transporte escolar do(a) [NOME_ALUNO] vence em breve (dia [DIA_VENCIMENTO]).

💰 *Valor:* R$ [VALOR]

📲 *Pix Copia e Cola facilitado:*
\`\`\`
[PIX_COPIA_COLA]
\`\`\`

*(Caso já tenha realizado a transferência ou agendamento, por favor desconsidere esta mensagem. Muito obrigado pela parceria!)* 👍`
  },

  dia_vencimento: {
    key: 'dia_vencimento',
    stepNumber: 3,
    name: '3. Dia do Vencimento (Hoje é o dia!)',
    shortLabel: 'Vence Hoje',
    badgeColor: 'bg-yellow-100 text-yellow-900 border-yellow-300',
    daysDescription: 'Disparado no dia exato do vencimento (Dia 10 ou cadastrado)',
    defaultTriggerDays: 'Dia do Vencimento',
    description: 'Cobrança direta e objetiva no dia do vencimento com Pix facilitado.',
    tone: 'Direto / Pagamento Hoje',
    defaultTemplate: `Olá, [NOME_RESPONSAVEL]! Tudo bem? 🚐

Hoje (dia [DIA_VENCIMENTO]) é a data de vencimento da mensalidade do transporte escolar do(a) [NOME_ALUNO].

💵 *Valor:* R$ [VALOR]

🔑 *Código Pix Copia e Cola:*
\`\`\`
[PIX_COPIA_COLA]
\`\`\`

Após o pagamento, se puder nos enviar o comprovante por aqui, a T.IA já atualiza a baixa automática no seu aplicativo. Tenha um excelente dia!`
  },

  atraso_leve: {
    key: 'atraso_leve',
    stepNumber: 4,
    name: '4. Pós-Vencimento (Atraso de 1 a 5 dias)',
    shortLabel: 'Atraso Leve',
    badgeColor: 'bg-orange-100 text-orange-900 border-orange-200',
    daysDescription: 'Disparado entre 1 a 5 dias após o vencimento (ex: Dias 11 a 15)',
    defaultTriggerDays: '1 a 5 dias de atraso',
    description: 'Aviso respeitoso alertando que a mensalidade do mês ainda consta em aberto no sistema.',
    tone: 'Atenção / Regularização',
    defaultTemplate: `Olá, [NOME_RESPONSAVEL], tudo bem?

Consta no sistema da Van do(a) [NOME_TIO] que a mensalidade do(a) [NOME_ALUNO] referente ao dia [DIA_VENCIMENTO] ainda está em aberto no valor de R$ [VALOR].

👉 *Já realizou o pagamento?* Por favor, nos encaminhe o comprovante por aqui para atualizarmos seu cadastro!
👉 *Ainda não pagou?* Segue o código Pix Copia e Cola para agilizar:

\`\`\`
[PIX_COPIA_COLA]
\`\`\`

Qualquer dúvida ou necessidade de alinhamento, estamos sempre à disposição!`
  },

  atraso_critico: {
    key: 'atraso_critico',
    stepNumber: 5,
    name: '5. Cobrança Administrativa (Atraso +7 dias)',
    shortLabel: 'Atraso +7 dias',
    badgeColor: 'bg-red-100 text-red-800 border-red-200',
    daysDescription: 'Disparado após 7 dias de atraso',
    defaultTriggerDays: '+7 dias de atraso',
    description: 'Notificação formal e amigável para regularização do transporte escolar ou combinação de nova data.',
    tone: 'Cobrança Administrativa',
    defaultTemplate: `Prezado(a) [NOME_RESPONSAVEL], tudo bem?

Aqui é da administração da Van do(a) [NOME_TIO]. Identificamos uma pendência na mensalidade do transporte escolar do(a) [NOME_ALUNO] vencida em [DIA_VENCIMENTO] (Valor: R$ [VALOR]).

Para garantirmos a regularidade do transporte e planejamento das rotas, pedimos a gentileza de regularizar a situação:

🔑 *Chave Pix / Copia e Cola:*
\`\`\`
[PIX_COPIA_COLA]
\`\`\`

💬 Caso precise combinar uma data específica para acerto ou tenha ocorrido algum imprevisto, por favor nos responda esta mensagem para alinharmos juntos. Contamos com a sua colaboração!`
  }
};

// ============================================================================
// 🔢 CRC16-CCITT CALCULATION PARA PADRÃO OFICIAL BR CODE (PIX EMV)
// ============================================================================
function computeCRC16(str: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  const hex = (crc & 0xFFFF).toString(16).toUpperCase();
  return hex.padStart(4, '0');
}

function cleanStringForPix(text: string, maxLen: number): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-zA-Z0-9 ]/g, '') // only alphanumeric and spaces
    .trim()
    .slice(0, maxLen);
}

function formatEMVField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Generates an authentic EMV BR Code (Pix Copia e Cola) standard string
 */
export function generatePixCopiaECola(params: {
  pixKey: string;
  driverName?: string;
  city?: string;
  amount?: number;
  studentName?: string;
  txid?: string;
}): string {
  const { pixKey, driverName = 'SchoolVan Driver', city = 'SAO PAULO', amount, studentName, txid = '***' } = params;

  if (!pixKey || pixKey.trim().length === 0) {
    return 'Chave Pix não cadastrada no perfil do motorista';
  }

  const cleanPixKey = pixKey.trim();
  const cleanMerchant = cleanStringForPix(driverName || 'Motorista Van', 25) || 'MOTORISTA';
  const cleanCity = cleanStringForPix(city || 'SAO PAULO', 15) || 'SAO PAULO';
  const cleanTxid = cleanStringForPix(txid || 'MENSALIDADE', 25) || '***';

  // Format 26 Merchant Account Info
  let merchantAccountInfo = formatEMVField('00', 'br.gov.bcb.pix');
  merchantAccountInfo += formatEMVField('01', cleanPixKey);
  if (studentName) {
    const infoText = cleanStringForPix(`Van ${studentName}`, 20);
    if (infoText) {
      merchantAccountInfo += formatEMVField('02', infoText);
    }
  }

  // Additional Data Field (txid)
  const additionalDataField = formatEMVField('05', cleanTxid);

  let payload = '';
  payload += formatEMVField('00', '01'); // Payload Format Indicator
  payload += formatEMVField('26', merchantAccountInfo); // Pix Key & Info
  payload += formatEMVField('52', '0000'); // Merchant Category Code
  payload += formatEMVField('53', '986'); // Currency Code BRL

  if (amount && amount > 0) {
    const formattedAmount = amount.toFixed(2);
    payload += formatEMVField('54', formattedAmount);
  }

  payload += formatEMVField('58', 'BR'); // Country Code
  payload += formatEMVField('59', cleanMerchant); // Merchant Name
  payload += formatEMVField('60', cleanCity); // Merchant City
  payload += formatEMVField('62', additionalDataField); // Reference Label / Txid
  payload += '6304'; // CRC16 Header

  const checksum = computeCRC16(payload);
  return `${payload}${checksum}`;
}

/**
 * Determines which stage in the billing rule a student is currently in today.
 */
export function calculateStudentBillingStage(
  paymentDay: number = 10,
  status: string = 'Em Dia',
  currentDayOfMonth: number = new Date().getDate()
): BillingStageKey {
  // If paid / Em Dia, check if we are in early month (virada) or close to next due date
  if (status === 'Em Dia') {
    if (currentDayOfMonth <= 5) {
      return 'virada_mes';
    }
    if (currentDayOfMonth >= paymentDay - 3 && currentDayOfMonth < paymentDay) {
      return 'lembrete_preventivo';
    }
    if (currentDayOfMonth === paymentDay) {
      return 'dia_vencimento';
    }
    return 'virada_mes';
  }

  // If status is Em Atraso (or pending):
  if (currentDayOfMonth <= 5) {
    return 'virada_mes';
  }
  if (currentDayOfMonth < paymentDay) {
    if (currentDayOfMonth >= paymentDay - 3) {
      return 'lembrete_preventivo';
    }
    return 'virada_mes';
  }
  if (currentDayOfMonth === paymentDay) {
    return 'dia_vencimento';
  }
  if (currentDayOfMonth > paymentDay && currentDayOfMonth <= paymentDay + 6) {
    return 'atraso_leve';
  }
  return 'atraso_critico';
}

export interface BillingMessageParams {
  stageKey: BillingStageKey;
  studentName: string;
  parentName: string;
  driverName: string;
  value: number;
  paymentDay: number;
  pixKey: string;
  driverCity?: string;
  customTemplate?: string;
  paymentMethod?: 'pix' | 'sem_pix' | 'boleto';
}

/**
 * Formats a message for a given student, stage, and driver profile.
 * - 'pix': Uses the driver's registered Pix key with clean WhatsApp formatting.
 * - 'sem_pix' / 'boleto': Clean, polite reminder without fixing payment method, asking to pay as agreed and send proof.
 */
export function formatBillingMessage(params: BillingMessageParams): {
  messageText: string;
  pixString: string;
  paymentMethod: 'pix' | 'sem_pix' | 'boleto';
} {
  const {
    stageKey,
    studentName,
    parentName,
    driverName,
    value,
    paymentDay,
    pixKey,
    customTemplate,
    paymentMethod = 'pix'
  } = params;

  const stageConfig = BILLING_STAGES[stageKey];
  const formattedValue = value.toFixed(2).replace('.', ',');

  let pixStringToUse = '';
  if (paymentMethod === 'pix') {
    pixStringToUse = pixKey && pixKey.trim().length > 0 
      ? pixKey.trim() 
      : '(Chave Pix não cadastrada no Perfil do Motorista)';
  }

  let template = customTemplate || stageConfig.defaultTemplate;

  if (paymentMethod === 'sem_pix' || paymentMethod === 'boleto') {
    // Remove specific Pix blocks and replace with generic polite note
    template = template
      .replace(/🔑 \*Chave Pix \/ Copia e Cola:\*[\s\S]*?```[\s\S]*?```/g, '📄 *Pagamento:* Conforme combinado')
      .replace(/📲 \*Pix Copia e Cola facilitado:\*[\s\S]*?```[\s\S]*?```/g, '📄 *Pagamento:* Conforme combinado')
      .replace(/🔑 \*Código Pix Copia e Cola:\*[\s\S]*?```[\s\S]*?```/g, '📄 *Pagamento:* Conforme combinado')
      .replace(/👉 \*Ainda não pagou\?\* Segue o código Pix Copia e Cola para agilizar:[\s\S]*?```[\s\S]*?```/g, '👉 *Pagamento:* Conforme o combinado.')
      .replace(/\[PIX_COPIA_COLA\]/g, '')
      .replace(/\[CHAVE_PIX\]/g, '');
  } else {
    template = template
      .replace(/\[PIX_COPIA_COLA\]/g, pixStringToUse)
      .replace(/\[CHAVE_PIX\]/g, pixStringToUse);
  }

  let messageText = template
    .replace(/\[NOME_RESPONSAVEL\]/g, parentName || 'Responsável')
    .replace(/\[NOME_ALUNO\]/g, studentName || 'Aluno')
    .replace(/\[NOME_TIO\]/g, driverName || 'Tio(a) da Van')
    .replace(/\[VALOR\]/g, formattedValue)
    .replace(/\[DIA_VENCIMENTO\]/g, String(paymentDay || 10));

  if (paymentMethod === 'pix') {
    if (!messageText.includes('comprovante') && !messageText.includes('Chave Pix')) {
      messageText += `\n\n📌 *Chave Pix do Motorista:* ${pixStringToUse}\n*(Favor nos enviar o comprovante por aqui após a transferência!)*`;
    }
  } else {
    if (!messageText.includes('comprovante')) {
      messageText += `\n\n📌 *Aviso:* Favor efetuar o pagamento da mensalidade conforme o combinado e nos enviar o comprovante por aqui para darmos baixa no sistema!`;
    }
  }

  return {
    messageText,
    pixString: pixStringToUse,
    paymentMethod
  };
}

// ============================================================================
// 👑 RÉGUA DE COBRANÇA DA T.IA PARA OS MOTORISTAS (ASSINATURA SAAS)
// ============================================================================

export type DriverSaaSStageKey = 
  | 'abertura_mes'
  | 'pre_vencimento'
  | 'vence_hoje'
  | 'atraso_leve'
  | 'atraso_critico';

export interface DriverSaaSStageConfig {
  key: DriverSaaSStageKey;
  stepNumber: number;
  name: string;
  shortLabel: string;
  triggerDescription: string;
  template: string;
}

export const DRIVER_SAAS_STAGES_CORA: Record<DriverSaaSStageKey, DriverSaaSStageConfig> = {
  abertura_mes: {
    key: 'abertura_mes',
    stepNumber: 1,
    name: 'Etapa 1: Abertura Mês (Dias 01 a 05)',
    shortLabel: 'Abertura Mês',
    triggerDescription: 'Dias 01 a 05 de cada mês',
    template: `Olá, [NOME_MOTORISTA]! Tudo bem? 🚌✨\n\nAqui é a T.IA do SchoolVan! Informamos que a fatura do seu plano [NOME_PLANO] referente a este mês já está disponível (Vencimento todo dia 10).\n\n📌 *Valor:* R$ [VALOR]\n📅 *Vencimento:* 10/[MES_ATUAL]/[ANO_ATUAL]\n\n🔑 *Pix Copia e Cola / QR Code Cora:*\n\`\`\`\n[PIX_COPIA_COLA]\n\`\`\`\n\nA baixa é automática assim que efetuar o pagamento! Tenha um ótimo mês de rotas! 🙏`
  },
  pre_vencimento: {
    key: 'pre_vencimento',
    stepNumber: 2,
    name: 'Etapa 2: Pré-Vencimento (2-3 dias antes)',
    shortLabel: 'Pré-Vencimento',
    triggerDescription: 'Dias 07 e 08 (2-3 dias antes do dia 10)',
    template: `Oi, [NOME_MOTORISTA]! Lembrete amigável da T.IA: a mensalidade do seu plano [NOME_PLANO] no SchoolVan vence em breve (dia 10/[MES_ATUAL]).\n\n💰 *Valor:* R$ [VALOR]\n\n📲 *Pix Copia e Cola:*\n\`\`\`\n[PIX_COPIA_COLA]\n\`\`\`\n\n(Caso já tenha efetuado o pagamento, desconsidere esta mensagem. Muito obrigado pela parceria!) 👍`
  },
  vence_hoje: {
    key: 'vence_hoje',
    stepNumber: 3,
    name: 'Etapa 3: Vence Hoje (Dia do Vencimento)',
    shortLabel: 'Vence Hoje',
    triggerDescription: 'Dia 10 do mês',
    template: `Olá, [NOME_MOTORISTA]! 🚐\n\nHoje é o dia de vencimento da assinatura do seu plano [NOME_PLANO] no SchoolVan.\n\n💵 *Valor:* R$ [VALOR]\n🔑 *Pix Copia e Cola Cora:*\n\`\`\`\n[PIX_COPIA_COLA]\n\`\`\`\n\nAssim que o pagamento for processado, o sistema atualiza automaticamente seu status no painel.`
  },
  atraso_leve: {
    key: 'atraso_leve',
    stepNumber: 4,
    name: 'Etapa 4: Atraso Leve (1 a 5 dias de atraso)',
    shortLabel: 'Atraso Leve',
    triggerDescription: 'Dias 11 a 15 (1 a 5 dias de atraso)',
    template: `Olá, [NOME_MOTORISTA], tudo bem?\n\nConsta no sistema do SchoolVan que a fatura do plano [NOME_PLANO] (vencimento dia 10/[MES_ATUAL]) no valor de R$ [VALOR] ainda não foi identificada.\n\nPara manter o acesso sem interrupções à sua rota, gestão e aplicativo dos pais, utilize o Pix abaixo:\n\n\`\`\`\n[PIX_COPIA_COLA]\n\`\`\`\n\nSe já realizou a transferência, por favor nos avise por aqui!`
  },
  atraso_critico: {
    key: 'atraso_critico',
    stepNumber: 5,
    name: 'Etapa 5: Atraso +7 dias (+7 dias de atraso)',
    shortLabel: 'Atraso +7 dias',
    triggerDescription: 'A partir do dia 17 (+7 dias de atraso)',
    template: `Atenção, [NOME_MOTORISTA]! ⚠️\n\nA fatura do seu plano [NOME_PLANO] está com mais de 7 dias de atraso. Os recursos de comunicação e marketplace poderão ser temporariamente suspensos.\n\nRegularize agora mesmo para manter seu sistema ativo:\n\n💵 *Valor:* R$ [VALOR]\n🔑 *Pix Copia e Cola:*\n\`\`\`\n[PIX_COPIA_COLA]\n\`\`\`\n\nCaso precise de ajuda com o pagamento, fale com nosso suporte imediatamente!`
  }
};

export const DRIVER_SAAS_STAGES_MANUAL: Record<'abertura_mes' | 'atraso_leve', DriverSaaSStageConfig> = {
  abertura_mes: {
    key: 'abertura_mes',
    stepNumber: 1,
    name: '1. Abertura do Mês (Dia 01)',
    shortLabel: 'Abertura Mês',
    triggerDescription: 'Dia 01 de cada mês (Status: Pendente de Pagamento)',
    template: `Olá, [NOME_MOTORISTA]! Tudo bem? 🚌✨\n\nAqui é a T.IA do SchoolVan! Informamos que a mensalidade do seu plano [NOME_PLANO] referente a este mês já está disponível (Vencimento todo dia 10).\n\n📌 *Valor:* R$ [VALOR]\n📅 *Vencimento:* 10/[MES_ATUAL]/[ANO_ATUAL]\n\n🔑 *Chave Pix Oficial SchoolVan:*\n\`\`\`\n[PIX_COPIA_COLA]\n\`\`\`\n\nApós o pagamento, envie o comprovante no app ou por aqui para o Super Admin validar e atualizar seu status para "Em Dia"! 🙏`
  },
  atraso_leve: {
    key: 'atraso_leve',
    stepNumber: 2,
    name: '2. Atraso Leve (Após Análise do Super Admin no Dia 11)',
    shortLabel: 'Atraso Leve (Dia 11)',
    triggerDescription: 'Dia 11 a 15 (após validação manual do Super Admin)',
    template: `Olá, [NOME_MOTORISTA], tudo bem?\n\nConsta no sistema do SchoolVan que a fatura do plano [NOME_PLANO] (vencimento dia 10/[MES_ATUAL]) no valor de R$ [VALOR] ainda consta como pendente de conferência.\n\nCaso já tenha pago, por favor envie o comprovante por aqui para o Super Admin atualizar seu status. Se ainda não pagou, segue a chave Pix:\n\n\`\`\`\n[PIX_COPIA_COLA]\n\`\`\`\n\nMuito obrigado!`
  }
};
