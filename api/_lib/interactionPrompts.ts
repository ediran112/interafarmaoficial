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

// ============================================================================
// Drug monograph — technical sheet generator (4 sections)
// ============================================================================

const MONOGRAPH_SCHEMA = `SCHEMA JSON OBRIGATÓRIO (retorne SEMPRE {"monograph": { ... }}):
{
  "monograph": {
    "drug": "DCB oficial do medicamento",
    "synonyms": ["nomes comerciais e sinônimos frequentes"],
    "dosage": {
      "therapeuticClass": "Classe terapêutica/farmacológica (ex: 'Antibiótico beta-lactâmico', 'ISRS')",
      "regulatoryClass": "Classificação regulatória Anvisa (ex: 'Receita B1 - Azul', 'Receita Simples - Branca', 'Venda livre', 'C1 - Amarela')",
      "presentations": ["Forma farmacêutica + concentração (ex: 'Comprimido 500 mg', 'Solução IV 1 g/10 mL', 'Suspensão oral 250 mg/5 mL')"],
      "adultStandard": [{"indication": "Indicação clínica principal", "dose": "Dose + via + posologia + duração (ex: '500 mg VO 12/12 h por 7-10 dias')"}],
      "pediatric": "Dose pediátrica em mg/kg + faixa etária (ex: '30-50 mg/kg/dia VO divididos 8/8 h, > 3 meses'). Se contraindicado, escreva 'Contraindicado em < X anos'. Se não aplicável, string vazia.",
      "geriatric": "Ajuste em > 65 anos (ex: 'Reduzir dose 25% se ClCr < 60 mL/min'). Se sem ajuste, escreva 'Sem ajuste específico'.",
      "maxDailyDose": "Dose máxima diária + via (ex: 'Adulto: 4 g/dia VO; Pediátrico: 90 mg/kg/dia')"
    },
    "adjustment": {
      "renal": [
        {"crcl": "ClCr > 50 mL/min", "adjustment": "Conduta exata (ex: 'Sem ajuste')"},
        {"crcl": "ClCr 30-50 mL/min", "adjustment": "Conduta exata (ex: 'Reduzir dose 50%')"},
        {"crcl": "ClCr < 30 mL/min", "adjustment": "Conduta exata (ex: 'Intervalo 24 h ou contraindicado')"}
      ],
      "hepatic": "Condutas por Child-Pugh A/B/C. Ex: 'A: sem ajuste; B: reduzir 50%; C: contraindicado por risco de encefalopatia'.",
      "pregnancy": "Categoria de risco (FDA A/B/C/D/X + Anvisa quando aplicável) + diretriz curta.",
      "lactation": "Compatibilidade (ex: 'L1 seguro') + conduta (ex: 'Amamentação permitida' ou 'Suspender amamentação por 12 h após dose')."
    },
    "pharmacokinetics": {
      "onsetByRoute": [
        {"route": "Oral", "onset": "Tempo até início do efeito"},
        {"route": "IV", "onset": "Imediato / < 5 min"}
      ],
      "halfLife": "t1/2 em horas (ex: '4-6 h'). Se prolongada em nefropata, adicionar em parênteses.",
      "duration": "Duração do efeito clínico útil (ex: '6-8 h por dose')",
      "metabolism": "Via metabólica principal + enzimas específicas (ex: 'Hepático via CYP3A4 (majoritário) e CYP2D6 (minoritário); substrato de glicoproteína-P')",
      "proteinBinding": "Percentual de ligação a proteínas plasmáticas (ex: '95% - alta ligação a albumina')",
      "excretion": "Via + percentuais (ex: 'Renal 70% inalterado; fecal 20%; biliar 10%')"
    },
    "administration": {
      "routes": ["Vias permitidas (ex: 'VO', 'IV', 'IM', 'SC', 'Tópica', 'Inalatória')"],
      "dilution": [
        {"solution": "SF 0,9% ou SG 5%", "volume": "100 mL", "finalConcentration": "1 mg/mL"}
      ],
      "oralCare": "Instruções para VO/SNE: pode partir, triturar, mastigar? Compatível com sonda nasoentérica? Tomar com ou sem alimento?",
      "stability": "Validade do frasco fechado + após diluição/reconstituição + condições de armazenamento (temperatura, luz, refrigeração)."
    }
  }
}`;

const MONOGRAPH_DIRECTIVES = `DIRETRIZES OBRIGATÓRIAS:
- Termos precisos: evite 'usar com cautela'. Informe o que fazer, valor exato ou percentual.
- Frases curtas, valores diretos, leitura < 5 segundos no ponto de cuidado.
- Sem saudações, preâmbulos, texto fora do JSON.
- Se um dado não existir para o fármaco, retorne string vazia (ou array vazio) — NÃO invente.
- Priorize dados aplicáveis à prática hospitalar/ambulatorial no Brasil.
- Use unidades do SI (mg, g, mL, min, h, mL/min).`;

export function buildMonographSystemPrompt(): string {
  return `Você é um sistema especialista em Farmacologia Clínica, Farmácia Hospitalar e Posologia Médica.
Sua saída alimenta a monografia técnica de medicamentos da plataforma Interafarma, exibida em 4 abas: Posologia & Doses, Ajuste Renal/Hepático, Farmacocinética, Diluição e Administração.

Referencie a literatura primária: Micromedex, Sanford Guide, Anvisa Bulário, FDA Label, DrugBank, Uptodate, Trissel's Handbook (para compatibilidades IV).

${MONOGRAPH_DIRECTIVES}

${MONOGRAPH_SCHEMA}`;
}

export function buildMonographUserPrompt(drug: string): string {
  return `Gere a monografia técnica completa do medicamento: "${drug.trim()}".

Se o fármaco tem múltiplas apresentações relevantes (oral, IV, IM, tópica), inclua as principais em "presentations" e "onsetByRoute". Se for apenas VO, retorne só oral.

Formato: JSON puro conforme schema, começando com {"monograph": ...`;
}

export function normalizeMonograph(raw: any): any {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw.monograph || raw;
  const asStr = (v: any, f = ''): string =>
    typeof v === 'string' && v.trim() ? v.trim() : f;
  const asArr = (v: any): any[] => (Array.isArray(v) ? v : []);
  const asStrArr = (v: any): string[] =>
    asArr(v).filter(Boolean).map((x) => String(x).trim());

  return {
    drug: asStr(source.drug, 'Medicamento'),
    synonyms: asStrArr(source.synonyms),
    dosage: {
      therapeuticClass: asStr(source.dosage?.therapeuticClass),
      regulatoryClass: asStr(source.dosage?.regulatoryClass),
      presentations: asStrArr(source.dosage?.presentations),
      adultStandard: asArr(source.dosage?.adultStandard)
        .map((r: any) => ({
          indication: asStr(r?.indication),
          dose: asStr(r?.dose),
        }))
        .filter((r) => r.indication || r.dose),
      pediatric: asStr(source.dosage?.pediatric),
      geriatric: asStr(source.dosage?.geriatric),
      maxDailyDose: asStr(source.dosage?.maxDailyDose),
    },
    adjustment: {
      renal: asArr(source.adjustment?.renal)
        .map((r: any) => ({
          crcl: asStr(r?.crcl),
          adjustment: asStr(r?.adjustment),
        }))
        .filter((r) => r.crcl || r.adjustment),
      hepatic: asStr(source.adjustment?.hepatic),
      pregnancy: asStr(source.adjustment?.pregnancy),
      lactation: asStr(source.adjustment?.lactation),
    },
    pharmacokinetics: {
      onsetByRoute: asArr(source.pharmacokinetics?.onsetByRoute)
        .map((r: any) => ({
          route: asStr(r?.route),
          onset: asStr(r?.onset),
        }))
        .filter((r) => r.route || r.onset),
      halfLife: asStr(source.pharmacokinetics?.halfLife),
      duration: asStr(source.pharmacokinetics?.duration),
      metabolism: asStr(source.pharmacokinetics?.metabolism),
      proteinBinding: asStr(source.pharmacokinetics?.proteinBinding),
      excretion: asStr(source.pharmacokinetics?.excretion),
    },
    administration: {
      routes: asStrArr(source.administration?.routes),
      dilution: asArr(source.administration?.dilution)
        .map((r: any) => ({
          solution: asStr(r?.solution),
          volume: asStr(r?.volume),
          finalConcentration: asStr(r?.finalConcentration),
        }))
        .filter((r) => r.solution || r.volume || r.finalConcentration),
      oralCare: asStr(source.administration?.oralCare),
      stability: asStr(source.administration?.stability),
    },
  };
}

// ============================================================================
// Prescription rewrite — generate safer alternative when a grave interaction is
// detected. Substitutes the conflicting drug for one in the same therapeutic
// class with a distinct metabolic pathway, keeps others intact and reflows
// the schedule.
// ============================================================================

const REWRITE_SCHEMA = `SCHEMA JSON OBRIGATÓRIO (retorne SEMPRE {"rewrite": { ... }}):
{
  "rewrite": {
    "original": [
      {"drug": "DCB", "dose": "Dose e via (ex: '5 mg VO')", "schedule": "Horários (ex: '22:00')", "indication": "Indicação clínica em UMA frase"}
    ],
    "suggested": [
      {"drug": "DCB", "dose": "Dose e via", "schedule": "Horários", "indication": "Indicação", "isReplacement": true, "originalDrug": "DCB que foi substituído"},
      {"drug": "DCB (mantido)", "dose": "...", "schedule": "...", "indication": "...", "isReplacement": false}
    ],
    "substitutions": [
      {"removed": "DCB do fármaco removido", "added": "DCB do fármaco substituto", "therapeuticClass": "Classe compartilhada (ex: 'Benzodiazepínico')", "reason": "Justificativa farmacológica em UMA frase (ex: 'sofre glicuronidação por UGT, sem interferência do CYP3A4 inibido pelo Ritonavir')"}
    ],
    "schedule": [
      {"time": "08:00", "drugs": ["Nome fármaco + dose", "Outro fármaco + dose"]},
      {"time": "12:00", "drugs": ["..."]},
      {"time": "20:00", "drugs": ["..."]}
    ],
    "reasoning": "Resumo em 1-2 frases da lógica da recomposição — o que foi trocado e por quê.",
    "warnings": ["Considerações residuais relevantes (ex: 'Lorazepam ainda pode causar sedação aditiva com opioides — monitorar SpO2')"]
  }
}`;

const REWRITE_DIRECTIVES = `DIRETRIZES OBRIGATÓRIAS:

1. SUBSTITUIR APENAS UM DO PAR CONFLITANTE
   Escolha o fármaco do par que tem MAIS alternativas terapêuticas equivalentes.
   Mantenha o outro. Os fármacos externos ao par permanecem TODOS intactos.

2. ALTERNATIVA NOMEADA + JUSTIFICATIVA FARMACOLÓGICA
   Substitua por um princípio ativo NOMEADO da MESMA CLASSE terapêutica que:
   a) Trate a mesma indicação clínica.
   b) NÃO tenha interação grave com nenhum outro fármaco da lista.
   c) Tenha via metabólica DISTINTA daquela envolvida no conflito.
   Justifique em UMA frase (ex: "metabolismo por UGT independente do CYP3A4 inibido pelo Ritonavir").

3. AJUSTE DE HORÁRIOS
   No cronograma sugerido, considere:
   - Espaçamento entre fármacos com quelação (bifosfonatos, tetraciclinas, fluoroquinolonas + cálcio/ferro): mínimo 2 h.
   - Jejum obrigatório: separe do café da manhã por 30-60 min.
   - Fármacos que causam sonolência agrupados à noite.
   - Antibióticos em intervalos regulares (8/8h, 12/12h).
   - Diuréticos preferencialmente pela manhã.
   Use horários específicos: "08:00", "12:00", "20:00" — não "manhã" ou "noite".

4. SE NÃO HOUVER ALTERNATIVA SEGURA
   Retorne "substitutions": [] e explique em "reasoning" o motivo (ex: "todas as alternativas testadas mantêm interação grave com os fármacos da lista — recomenda-se avaliação médica presencial").

5. TEXTOS CURTOS E ACIONÁVEIS
   Cada campo deve ser lido em < 5s. Frases diretas, verbos no imperativo/infinitivo.`;

export function buildRewriteSystemPrompt(): string {
  return `Você é um farmacologista clínico especializado em prescrição racional e reconciliação medicamentosa da plataforma Interafarma.

Sua tarefa: dado uma lista de medicamentos em uso e um PAR que apresenta interação GRAVE, gere uma prescrição alternativa segura e um cronograma integrado.

${REWRITE_DIRECTIVES}

${REWRITE_SCHEMA}`;
}

export function buildRewriteUserPrompt(
  drugs: string[],
  conflictingPair: [string, string],
  indication?: string
): string {
  return `Prescrição atual (todos os fármacos em uso pelo paciente):
${drugs.map((d) => `- ${d}`).join('\n')}

Par com interação GRAVE identificada:
- ${conflictingPair[0]}  ×  ${conflictingPair[1]}
${indication ? `\nContexto clínico informado: "${indication}"` : ''}

Gere:
1. "original" reproduzindo a lista atual com dose padrão adulto, horário sugerido e indicação provável de cada fármaco.
2. "suggested" com a substituição de UM dos fármacos do par conflitante por uma alternativa segura, mantendo os demais.
3. "substitutions" descrevendo a troca com justificativa farmacológica.
4. "schedule" com o cronograma integrado 24h da prescrição sugerida.
5. "reasoning" sumarizando a decisão em 1-2 frases.
6. "warnings" com precauções residuais quando aplicável.

Formato: JSON puro conforme schema, começando com {"rewrite": ...`;
}

export function normalizeRewrite(raw: any): any {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw.rewrite || raw;
  const asStr = (v: any, f = ''): string =>
    typeof v === 'string' && v.trim() ? v.trim() : f;
  const asArr = (v: any): any[] => (Array.isArray(v) ? v : []);
  const asStrArr = (v: any): string[] =>
    asArr(v).filter(Boolean).map((x) => String(x).trim());

  const normalizeItem = (it: any) => ({
    drug: asStr(it?.drug),
    dose: asStr(it?.dose),
    schedule: asStr(it?.schedule),
    indication: asStr(it?.indication),
    isReplacement: Boolean(it?.isReplacement),
    originalDrug: asStr(it?.originalDrug),
  });

  const original = asArr(source.original).map(normalizeItem).filter((x) => x.drug);
  const suggested = asArr(source.suggested).map(normalizeItem).filter((x) => x.drug);

  const substitutions = asArr(source.substitutions)
    .map((s: any) => ({
      removed: asStr(s?.removed),
      added: asStr(s?.added),
      therapeuticClass: asStr(s?.therapeuticClass || s?.class),
      reason: asStr(s?.reason),
    }))
    .filter((s) => s.removed || s.added);

  const schedule = asArr(source.schedule)
    .map((s: any) => ({
      time: asStr(s?.time),
      drugs: asStrArr(s?.drugs),
    }))
    .filter((s) => s.time && s.drugs.length > 0)
    .sort((a, b) => a.time.localeCompare(b.time));

  return {
    original,
    suggested,
    substitutions,
    schedule,
    reasoning: asStr(source.reasoning),
    warnings: asStrArr(source.warnings),
  };
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
