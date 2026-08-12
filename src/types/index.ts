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

  // Enriched clinical fields (optional; populated by clinical backend)
  evidenceLevel?: EvidenceLevel;   // A = ensaio robusto, B = estudos, C = relatos, D = teórico
  onset?: string;                  // Janela temporal da interação
  epidemiology?: string;           // RR/OR/NNT/incidência com IC95%
  riskStratification?: string;     // Alto vs baixo risco por perfil de paciente
  monitoring?: string;             // Parâmetros mensuráveis com valor de corte
  rescueProtocol?: string;         // Conduta imediata + antídoto se evento adverso
  doseAdjustment?: string;         // Ajuste posológico numérico
  contraindications?: string;      // Absolutas vs relativas
  specialPopulations?: string;     // Idosos, gestantes, hepatopatas, nefropatas
  clinicalManagement?: string;     // Passos práticos SEQUENCIAIS
  references?: string[];           // Fontes reais + diretrizes com ano
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

// ============================================================================
// Drug monograph — technical sheet with 4 clinical sections
// ============================================================================

export interface DosageSection {
  therapeuticClass: string;
  regulatoryClass: string;
  presentations: string[];
  adultStandard: { indication: string; dose: string }[];
  pediatric?: string;
  geriatric?: string;
  maxDailyDose: string;
}

export interface RenalAdjustmentRow {
  crcl: string;
  adjustment: string;
}

export interface AdjustmentSection {
  renal: RenalAdjustmentRow[];
  hepatic: string;
  pregnancy: string;
  lactation: string;
}

export interface OnsetByRoute {
  route: string;
  onset: string;
}

export interface PharmacokineticsSection {
  onsetByRoute: OnsetByRoute[];
  halfLife: string;
  duration: string;
  metabolism: string;
  proteinBinding: string;
  excretion: string;
}

export interface DilutionRow {
  solution: string;
  volume: string;
  finalConcentration: string;
}

export interface AdministrationSection {
  routes: string[];
  dilution: DilutionRow[];
  oralCare: string;
  stability: string;
}

export interface DrugMonograph {
  drug: string;
  synonyms?: string[];
  dosage: DosageSection;
  adjustment: AdjustmentSection;
  pharmacokinetics: PharmacokineticsSection;
  administration: AdministrationSection;
}

// ============================================================================
// Prescription rewrite — safer alternative for grave interactions
// ============================================================================

export interface PrescriptionItem {
  drug: string;
  dose: string;
  schedule: string;      // ex: "08:00 e 20:00", "1x/dia às 22:00"
  indication: string;
  isReplacement?: boolean;
  originalDrug?: string; // if replaced, the drug it replaces
}

export interface Substitution {
  removed: string;
  added: string;
  therapeuticClass: string;
  reason: string; // pharmacological justification
}

export interface ScheduleSlot {
  time: string;    // "08:00"
  drugs: string[]; // ex: ["Losartana 50mg", "Sinvastatina 20mg"]
}

export interface PrescriptionRewrite {
  original: PrescriptionItem[];
  suggested: PrescriptionItem[];
  substitutions: Substitution[];
  schedule: ScheduleSlot[];
  reasoning: string;
  warnings: string[];
}
