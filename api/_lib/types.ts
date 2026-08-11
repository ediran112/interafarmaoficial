export type SeverityLevel = 'Grave' | 'Moderada' | 'Leve';

export type EvidenceLevel = 'A' | 'B' | 'C' | 'D';

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
  riskScore?: number; // 1 a 10
  affectedOrgans?: string[];
  createdAt?: string;

  // Enriched clinical fields (optional; populated by AI backend)
  evidenceLevel?: EvidenceLevel;   // A = ensaio robusto, B = estudos, C = relatos, D = teórico
  onset?: string;                  // Ex: "Rápido (< 24 h)" | "Retardado (dias a semanas)"
  monitoring?: string;             // Parâmetros clínicos/laboratoriais a monitorar
  doseAdjustment?: string;         // Recomendação de ajuste posológico
  contraindications?: string;      // Contraindicações absolutas/relativas
  specialPopulations?: string;     // Idosos, gestantes, hepatopatas, nefropatas
  clinicalManagement?: string;     // Passos práticos de manejo
  references?: string[];           // Fontes citadas (Micromedex, DrugBank, Anvisa, etc.)
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
