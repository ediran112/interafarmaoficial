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

const CLINICAL_DIRECTIVES = `DIRETRIZES CLÍNICAS OBRIGATÓRIAS (não negociáveis):

1. ALTERNATIVAS COM NOME + JUSTIFICATIVA FARMACOLÓGICA
   NUNCA escreva sugestões genéricas em "alternatives" (não use "consulte médico",
   "considere outra classe", "discuta com o prescritor" etc). SEMPRE cite de 1 a 3
   PRINCÍPIOS ATIVOS específicos e explique EM UMA FRASE por que cada um é seguro
   (ex: metabolicamente independente do CYP3A4, não afeta agregação plaquetária,
   depuração renal alternativa, não prolonga QT). Formato ideal:
   "Paracetamol (não afeta COX-1, sem risco gastrolesivo); Codeína (analgésico opioide
   fraco, metabolismo por CYP2D6 independente)."

2. VIA DE ADMINISTRAÇÃO ESPECIFICADA
   Se a gravidade/manejo variarem por via (Oral, IV, IM, SC, tópico, inalatório),
   ESPECIFIQUE EXPLICITAMENTE em "contraindications" e "doseAdjustment". Ex:
   "Contraindicado por via IV (risco de arritmia); via oral requer apenas monitorização
   de INR." — não deixe implícito.

3. MONITORIZAÇÃO MENSURÁVEL
   "monitoring" deve conter APENAS parâmetros mensuráveis com valor de referência,
   frequência ou antídoto/reversor quando aplicável. Ex:
   "INR a cada 3 dias (alvo 2-3); K+ sérico se > 5,0 mEq/L suspender; ECG com QTc
   < 450 ms; sinais de sangramento (hematúria, melena); antídoto: vitamina K 10 mg IV."
   Termos abstratos ("acompanhar", "observar", "avaliar clinicamente") são PROIBIDOS.

4. TEXTO CURTO, ACIONÁVEL, LEITURA < 5 SEGUNDOS
   Cada campo textual deve ser lido em menos de 5 segundos por um profissional
   ocupado. Frases diretas, verbos no imperativo/infinitivo, sem preâmbulos
   ("é importante notar que…", "vale ressaltar…"). Máximo 2 frases por campo,
   exceto "clinicalManagement" que pode ter até 3.`;

const CLINICAL_SCHEMA = `Cada item de "results" DEVE seguir EXATAMENTE este schema (Português do Brasil):
{
  "drugA": "Denominação Comum Brasileira (DCB) do fármaco A",
  "drugB": "Denominação Comum Brasileira (DCB) do fármaco B",
  "synonymsA": ["nomes comerciais frequentes de A"],
  "synonymsB": ["nomes comerciais frequentes de B"],
  "severity": "Grave" | "Moderada" | "Leve",
  "evidenceLevel": "A" | "B" | "C" | "D",
  "category": "Especialidade médica principal (ex: Cardiologia, Psiquiatria, Anticoagulação)",
  "effect": "Desfecho clínico esperado em UMA frase objetiva (< 5s de leitura).",
  "mechanism": "Mecanismo PK/PD específico em UMA frase (ex: 'inibição competitiva de CYP2C9', 'antagonismo em receptor 5-HT2A').",
  "onset": "'Imediato' | 'Rápido (< 24 h)' | 'Retardado (2-7 dias)' | 'Tardio (> 1 semana)'.",
  "recommendation": "Conduta em UMA frase imperativa (ex: 'Substituir A por Y' / 'Manter com monitorização').",
  "clinicalManagement": "Passos práticos SEQUENCIAIS: o que suspender/substituir/escalonar; horários; espaçamento (máx. 3 frases).",
  "monitoring": "APENAS parâmetros mensuráveis: exame, valor de corte, frequência e antídoto quando aplicável. Termos abstratos são proibidos.",
  "doseAdjustment": "Ajuste posológico numérico E POR VIA (ex: 'Oral: reduzir 50%'; 'IV: contraindicado'). Se não aplicável, escreva 'Não requer ajuste'.",
  "contraindications": "Contraindicações POR VIA quando relevante. Absoluta vs relativa deve ficar clara.",
  "specialPopulations": "Ajustes específicos em idosos (> 65a), gestantes/lactantes, hepatopatas (Child-Pugh), nefropatas (ClCr), pediatria.",
  "alternatives": "1 a 3 princípios ativos NOMEADOS com justificativa farmacológica em UMA frase cada (formato descrito nas Diretrizes).",
  "foodInteractions": "Alimentos/álcool/sucos/suplementos com impacto mensurável. Se irrelevante, string vazia.",
  "affectedOrgans": ["Órgãos/sistemas mais afetados, específicos (ex: 'Miocárdio', 'Túbulo renal proximal')"],
  "references": ["Fontes reais (Micromedex, Stockley, Anvisa, FDA Label, DrugBank). Se sem base, array vazio — não invente."]
}

REGRAS DE FORMATAÇÃO:
- Retorne SEMPRE {"results": [...]} — nunca array na raiz.
- Sem markdown, sem crase tripla, sem texto fora do JSON.
- Sem disclaimers dentro dos campos.
- Textos em Português do Brasil, técnicos mas legíveis.`;

export function buildSearchSystemPrompt(): string {
  return `Você é um farmacologista clínico especializado atuando como motor de análise
da plataforma Interafarma. Sua resposta é consumida por profissionais de saúde
(médicos, farmacêuticos, enfermeiros) e por pacientes informados no Brasil.

Referencie a literatura primária: Micromedex, Stockley Drug Interactions, Anvisa
Bulário Eletrônico, FDA Label, DrugBank. Não invente dados.

${CLINICAL_DIRECTIVES}

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
      recommendation: asStr(it.recommendation, ''),
      clinicalManagement: asStr(it.clinicalManagement, ''),
      monitoring: asStr(it.monitoring, ''),
      doseAdjustment: asStr(it.doseAdjustment, ''),
      contraindications: asStr(it.contraindications, ''),
      specialPopulations: asStr(it.specialPopulations, ''),
      alternatives: asStr(it.alternatives, ''),
      foodInteractions: asStr(it.foodInteractions, ''),
      affectedOrgans: asArray(it.affectedOrgans),
      references: asArray(it.references),
    }));
}
