import { Driver, PlanTier } from '../types';
import { playBusHornSound, speakTiaPrompt } from './sound';
import toast from 'react-hot-toast';

export const MAX_STUDENTS_FREE = 25;
export const MAX_VEHICLES_FREE = 1;
export const MAX_VEHICLES_PRO = 1;

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
 * Validates whether a vehicle can be added.
 * If not allowed, sounds the horn, triggers T.IA spoken message, shows toast and opens upgrade modal.
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
