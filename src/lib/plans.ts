import { Driver, PlanTier } from '../types';
import { playBusHornSound, speakTiaPrompt } from './sound';
import toast from 'react-hot-toast';

export const MAX_STUDENTS_FREE = 25;
export const MAX_VEHICLES_FREE = 1;
export const MAX_VEHICLES_PRO = 1;
export const FROTA_INCLUDED_VEHICLES = 3;
export const EXTRA_VEHICLE_PRICE = 79.90;
export const PLAN_PRO_PRICE = 79;
export const PLAN_FROTA_BASE_PRICE = 149;
export const BILLING_DUE_DAY = 10; // Vencimento unificado todo dia 10

export function getPlanTier(profile?: Partial<Driver> | null): PlanTier {
  if (!profile || !profile.plan) return 'Gratuito';
  const planLower = String(profile.plan).toLowerCase().trim();
  if (planLower.includes('frota') || planLower.includes('empresa') || planLower.includes('ilimitado')) {
    return 'Frota';
  }
  if (planLower.includes('pro') || planLower.includes('pró')) {
    return 'Pro';
  }
  return 'Gratuito';
}

export function isFreePlan(profile?: Partial<Driver> | null): boolean {
  return getPlanTier(profile) === 'Gratuito';
}

export function isProPlan(profile?: Partial<Driver> | null): boolean {
  return getPlanTier(profile) === 'Pro';
}

export function isFrotaPlan(profile?: Partial<Driver> | null): boolean {
  return getPlanTier(profile) === 'Frota';
}

/**
 * Calculates monthly subscription value based on plan, vehicle count and custom overrides
 */
export function calculateMonthlyFee(
  profile?: Partial<Driver> | null, 
  vehicleCount: number = 1
): number {
  if (!profile) return 0;
  if ('customMonthlyFee' in profile && typeof profile.customMonthlyFee === 'number') {
    return profile.customMonthlyFee;
  }
  const tier = getPlanTier(profile);
  if (tier === 'Gratuito') return 0;
  if (tier === 'Pro') return PLAN_PRO_PRICE;
  
  // Frota: R$ 149 (base com até 3 vans) + R$ 79,90 por van adicional (4ª em diante)
  const extraVans = Math.max(0, vehicleCount - FROTA_INCLUDED_VEHICLES);
  return PLAN_FROTA_BASE_PRICE + (extraVans * EXTRA_VEHICLE_PRICE);
}

/**
 * Validates whether a vehicle can be added.
 * If not allowed or needs confirmation for extra vehicle, triggers T.IA spoken message and modal.
 */
export function checkCanAddVehicle(
  profile: Partial<Driver> | null | undefined,
  currentVehicleCount: number,
  onOpenUpgradeModal?: (reason: string) => void
): boolean {
  const plan = getPlanTier(profile);

  if (plan === 'Gratuito' && currentVehicleCount >= MAX_VEHICLES_FREE) {
    playBusHornSound();
    speakTiaPrompt(
      "Tio, no Plano Gratuito você pode ter 1 van cadastrada. Para adicionar mais vans e expandir sua frota, faça o upgrade para o Plano Frota!"
    );
    toast.error('O Plano Gratuito permite apenas 1 van. Faça o upgrade para o Plano Frota!');
    if (onOpenUpgradeModal) {
      onOpenUpgradeModal('multi_vehicle');
    }
    return false;
  }

  if (plan === 'Pro' && currentVehicleCount >= MAX_VEHICLES_PRO) {
    playBusHornSound();
    speakTiaPrompt(
      "Tio, o Plano Pro inclui 1 van completa! Para cadastrar mais veículos e gerenciar toda a sua frota em um só lugar, faça o upgrade para o Plano Frota!"
    );
    toast.error('O Plano Pro inclui 1 van. Faça o upgrade para o Plano Frota para cadastrar mais veículos!');
    if (onOpenUpgradeModal) {
      onOpenUpgradeModal('multi_vehicle_pro');
    }
    return false;
  }

  // Se já está no Frota e tem 3 ou mais vans (vai adicionar a 4ª van em diante)
  if (plan === 'Frota' && currentVehicleCount >= FROTA_INCLUDED_VEHICLES) {
    const nextVanNumber = currentVehicleCount + 1;
    playBusHornSound();
    speakTiaPrompt(
      `Tio, você está adicionando sua ${nextVanNumber}ª van! Seu Plano Frota inclui 3 vans completas. A partir da 4ª van, o valor adicional é de R$ 79,90 por mês por van extra. A van é liberada na hora e a cobrança proporcional virá unificada na sua fatura com vencimento no dia 10!`
    );
    if (onOpenUpgradeModal) {
      onOpenUpgradeModal('extra_vehicle');
    }
    return false;
  }

  return true;
}

/**
 * Validates whether a student can be added.
 * If over limit in Free plan, sounds the horn, triggers T.IA spoken message, shows toast and opens upgrade modal.
 */
export function checkCanAddStudent(
  profile: Partial<Driver> | null | undefined,
  currentStudentCount: number,
  onOpenUpgradeModal?: (reason: string) => void
): boolean {
  const plan = getPlanTier(profile);

  if (plan === 'Gratuito' && currentStudentCount >= MAX_STUDENTS_FREE) {
    playBusHornSound();
    speakTiaPrompt(
      "Tio, você atingiu o limite de 25 alunos no Plano Gratuito! Com essa quantidade, sua van já é um sucesso! Faça o upgrade para o Plano Pro para cadastrar alunos ilimitados e ter cobranças automáticas no Zap!"
    );
    toast.error('Você atingiu o limite de 25 alunos do Plano Gratuito! Faça o upgrade para o Plano Pro para cadastrar alunos ilimitados.');
    if (onOpenUpgradeModal) {
      onOpenUpgradeModal('limit_students');
    }
    return false;
  }

  return true;
}

/**
 * Validates whether a team member / collaborator can be added.
 * Free plan does not allow team members.
 */
export function checkCanAddTeamMember(
  profile: Partial<Driver> | null | undefined,
  onOpenUpgradeModal?: (reason: string) => void
): boolean {
  const plan = getPlanTier(profile);

  if (plan === 'Gratuito') {
    playBusHornSound();
    speakTiaPrompt(
      "Tio, no Plano Gratuito o cadastro de equipe não está liberado. Para cadastrar monitores e motoristas colaboradores com controle no celular, faça o upgrade para o Plano Pro!"
    );
    toast.error('O Plano Gratuito não permite cadastrar colaboradores. Faça o upgrade para o Plano Pro!');
    if (onOpenUpgradeModal) {
      onOpenUpgradeModal('team_monitors');
    }
    return false;
  }

  return true;
}
