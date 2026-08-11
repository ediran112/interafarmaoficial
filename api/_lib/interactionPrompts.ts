// Shared clinical prompt builders and result normalization used by both
// the local dev server (server.ts) and the Vercel serverless (api/index.ts).

export type SearchInput =
  | { searchTerm: string; drugs?: undefined }
  | { drugs: string[]; searchTerm?: undefined }
  | { searchTerm: string; drugs: string[] };

export function normalizeInput(body: any): {
  drugs: string[];
  freeText: string;
  isMultiDrug: boolean;
} {
  const raw = typeof body === 'object' && body ? body : {};
  const drugsArr: string[] = Array.isArray(raw.drugs)
    ? raw.drugs.map((d: any) => String(d).trim()).filter(Boolean)
    : [];
  const term: string = typeof raw.searchTerm === 'string' ? raw.searchTerm.trim() : '';
  const drugs = drugsArr.length > 0 ? drugsArr : [];
  const freeText = term || drugs.join(', ');
  return { drugs, freeText, isMultiDrug: drugs.length >= 2 };
}

const SEVERITY_SCALE = `Escala de severidade:
- "Grave": risco de dano relevante, hospitalização, morte ou falha terapêutica crítica. Contraindicação relativa ou absoluta na maioria dos cenários.
- "Moderada": risco clínico relevante que exige monitorização, ajuste posológico ou espaçamento entre doses.
- "Leve": interação de baixo impacto, geralmente sem consequência clínica significativa.`;

const EVIDENCE_SCALE = `Escala de nível de evidência (evidenceLevel):
- "A": ensaios clínicos controlados robustos ou meta-análises.
- "B": estudos observacionais consistentes ou vários relatos concordantes.
- "C": relatos de caso isolados ou pequenas séries.
- "D": interação teórica com base em farmacocinética/farmacodinâmica.`;

const CLINICAL_SCHEMA = `Cada item de "results" DEVE seguir EXATAMENTE este schema (todos os campos em Português do Brasil):
{
  "drugA": "Denominação Comum Brasileira (DCB) do fármaco A",
  "drugB": "Denominação Comum Brasileira (DCB) do fármaco B",
  "synonymsA": ["nomes comerciais e sinônimos frequentes de A"],
  "synonymsB": ["nomes comerciais e sinônimos frequentes de B"],
  "severity": "Grave" | "Moderada" | "Leve",
  "evidenceLevel": "A" | "B" | "C" | "D",
  "category": "Especialidade médica principal (ex: Cardiologia, Psiquiatria, Anticoagulação, Antibioticoterapia)",
  "effect": "Efeito clínico e desfecho esperado, em linguagem clínica objetiva.",
  "mechanism": "Mecanismo farmacocinético/farmacodinâmico (ex: inibição de CYP3A4, competição por ligação a albumina, prolongamento aditivo do QT).",
  "onset": "Tempo de início esperado da interação (ex: 'Imediato', 'Rápido (< 24 h)', 'Retardado (dias a semanas)').",
  "recommendation": "Conduta recomendada, direta e acionável.",
  "clinicalManagement": "Passos práticos de manejo (o que suspender, substituir, escalonar; horários; espaçamento entre doses).",
  "monitoring": "Parâmetros clínicos/laboratoriais a monitorar (ex: INR, K+, ECG, função renal, glicemia, sinais de sangramento).",
  "doseAdjustment": "Ajuste posológico recomendado, quando aplicável.",
  "contraindications": "Contraindicações absolutas ou relativas relevantes.",
  "specialPopulations": "Considerações em idosos, gestantes/lactantes, hepatopatas, nefropatas, pediatria.",
  "alternatives": "Alternativas terapêuticas com menor risco de interação.",
  "foodInteractions": "Interações com alimentos, bebidas alcoólicas, sucos e suplementos relevantes.",
  "affectedOrgans": ["Órgãos/sistemas mais afetados"],
  "references": ["Fontes citadas (ex: 'Micromedex', 'Stockley Drug Interactions', 'Anvisa - Bulário Eletrônico', 'FDA Label')"]
}

REGRAS DE FORMATAÇÃO:
- Retorne SEMPRE um objeto JSON com a propriedade "results" contendo o array.
- Nunca use marcadores de código fora do JSON.
- Não invente nomes de referências: se não houver base sólida, retorne "references": [].
- Não coloque disclaimers dentro dos campos — o front-end já os exibe.`;

export function buildSearchSystemPrompt(): string {
  return `Você é o motor de análise de interações medicamentosas da plataforma clínica Interafarma.
Sua resposta é consumida por uma interface para profissionais de saúde (médicos, farmacêuticos, enfermeiros) e para pacientes informados no Brasil.
Priorize precisão farmacológica, linguagem clínica objetiva e conformidade com a literatura de referência (Micromedex, Stockley, Anvisa, FDA Label, DrugBank).

${SEVERITY_SCALE}

${EVIDENCE_SCALE}

${CLINICAL_SCHEMA}`;
}

export function buildSearchUserPrompt(drugs: string[], freeText: string): string {
  const isMulti = drugs.length >= 2;

  if (isMulti) {
    const pairs: string[] = [];
    for (let i = 0; i < drugs.length; i++) {
      for (let j = i + 1; j < drugs.length; j++) {
        pairs.push(`- ${drugs[i]}  ×  ${drugs[j]}`);
      }
    }
    return `Analise a lista de medicamentos abaixo e gere a MATRIZ COMPLETA de interações par-a-par entre eles (uma linha para CADA par distinto).
Se houver pares clinicamente irrelevantes, ainda assim liste-os com severity "Leve" e explique brevemente por que a interação é pouco significativa (não omita pares).

Medicamentos:
${drugs.map((d) => `- ${d}`).join('\n')}

Pares a avaliar OBRIGATORIAMENTE (${pairs.length} par(es)):
${pairs.join('\n')}

Depois dos pares acima, você PODE (opcional) adicionar até 3 interações extras de alta relevância clínica envolvendo QUALQUER um dos medicamentos listados com fármacos externos comuns (ex: se um dos fármacos é anticoagulante, cite AINEs).

Formato de saída: {"results": [ ... ]} conforme schema.`;
  }

  const single = drugs[0] || freeText;
  return `Analise o(s) termo(s) abaixo e retorne de 4 a 8 interações medicamentosas clinicamente mais relevantes para ele.

Consulta: "${single}"

Priorize:
1. Interações Graves e Moderadas primeiro.
2. Combinações mais frequentes na prática ambulatorial brasileira.
3. Inclua pelo menos uma interação com alimentos/álcool se relevante.

Se o termo for uma pergunta ("posso tomar X com Y?"), extraia os fármacos citados e inclua OBRIGATORIAMENTE a interação direta entre eles como PRIMEIRO item do array, antes das demais.

Formato de saída: {"results": [ ... ]} conforme schema.`;
}

export function buildGeminiSearchPrompt(drugs: string[], freeText: string): string {
  return `${buildSearchSystemPrompt()}

${buildSearchUserPrompt(drugs, freeText)}

Responda com JSON puro (sem markdown, sem crase tripla).`;
}

// Normalize AI results to guarantee shape stability (fill missing fields, coerce arrays, etc.)
export function normalizeResults(rawResults: any[], provider: string): any[] {
  const t = Date.now();
  const asArray = (v: any): string[] =>
    Array.isArray(v) ? v.filter(Boolean).map((x) => String(x)) : v ? [String(v)] : [];
  const asStr = (v: any, fallback = ''): string =>
    typeof v === 'string' && v.trim() ? v.trim() : fallback;

  return rawResults
    .filter((it) => it && (it.drugA || it.drugB))
    .map((it: any, idx: number) => ({
      id: it.id || `ai-${provider}-${t}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      drugA: asStr(it.drugA, 'Medicamento A'),
      drugB: asStr(it.drugB, 'Medicamento B'),
      synonymsA: asArray(it.synonymsA),
      synonymsB: asArray(it.synonymsB),
      severity: (['Grave', 'Moderada', 'Leve'].includes(it.severity) ? it.severity : 'Moderada'),
      evidenceLevel: (['A', 'B', 'C', 'D'].includes(it.evidenceLevel) ? it.evidenceLevel : undefined),
      category: asStr(it.category, 'Farmacologia Clínica'),
      effect: asStr(it.effect, 'Efeito clínico em avaliação.'),
      mechanism: asStr(it.mechanism, 'Mecanismo farmacológico não especificado.'),
      onset: asStr(it.onset, ''),
      recommendation: asStr(it.recommendation, 'Consulte médico ou farmacêutico antes de combinar.'),
      clinicalManagement: asStr(it.clinicalManagement, ''),
      monitoring: asStr(it.monitoring, ''),
      doseAdjustment: asStr(it.doseAdjustment, ''),
      contraindications: asStr(it.contraindications, ''),
      specialPopulations: asStr(it.specialPopulations, ''),
      alternatives: asStr(it.alternatives, 'Discuta alternativas com o prescritor.'),
      foodInteractions: asStr(it.foodInteractions, ''),
      affectedOrgans: asArray(it.affectedOrgans),
      references: asArray(it.references),
    }));
}
