export type SeverityLevel = 'Grave' | 'Moderada' | 'Leve';

export interface DrugInteraction {
  id: string;
  drugA: string;
  drugB: string;
  synonymsA?: string[];
  synonymsB?: string[];
  severity: SeverityLevel;
  category: string; // ex: Cardiologia, Psiquiatria, Infectologia, Endocrinologia, Neurologia, Geral
  mechanism: string;
  effect: string;
  recommendation: string;
  alternatives: string;
  foodInteractions?: string;
  riskScore: number; // 1 a 10
  affectedOrgans?: string[];
  createdAt?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  role?: 'patient' | 'pharmacist' | 'doctor';
  createdAt: string;
}

export interface SavedCheck {
  id?: string;
  userId: string;
  drugs: string[];
  foundInteractionsCount: number;
  maxSeverity: SeverityLevel | 'Nenhuma';
  notes?: string;
  createdAt: string;
}

export interface AIAdviceResponse {
  answer: string;
  disclaimer: string;
  sources?: string[];
}
