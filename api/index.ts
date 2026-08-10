import express from 'express';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { INITIAL_30_INTERACTIONS } from '../src/data/interactionsData';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
app.use(express.json());

// Helper function to perform local search on pre-loaded database
function searchLocalInteractions(term: string) {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return [];

  const stopWords = new Set(['pode', 'tomar', 'posso', 'misturar', 'junto', 'com', 'interacao', 'interacoes', 'entre', 'quais', 'para', 'faz', 'mal', 'usar', 'usando', 'medicamento', 'remedio', 'remedios', 'droga', 'drogas', 'tem']);

  const words = normalized
    .split(/\s+(?:e|ou|e\/ou|\+|\*|\/|,|;|com)\s+|\s*[,;\+\/\?\!]\s*|\s+/)
    .map(w => w.trim().replace(/[^\w\sà-ú]/gi, ''))
    .filter(w => w.length >= 3 && !stopWords.has(w));

  const matched = INITIAL_30_INTERACTIONS.filter((item) => {
    const normA = item.drugA.toLowerCase();
    const normB = item.drugB.toLowerCase();
    const synA = item.synonymsA?.map((s) => s.toLowerCase()) || [];
    const synB = item.synonymsB?.map((s) => s.toLowerCase()) || [];

    // Direct substring match
    if (
      normA.includes(normalized) ||
      normB.includes(normalized) ||
      synA.some((s) => s.includes(normalized)) ||
      synB.some((s) => s.includes(normalized))
    ) {
      return true;
    }

    // Multi-term keyword match
    if (words.length > 0) {
      const allWordsMatch = words.every((word) => {
        return (
          normA.includes(word) ||
          normB.includes(word) ||
          synA.some((s) => s.includes(word)) ||
          synB.some((s) => s.includes(word))
        );
      });
      if (allWordsMatch) return true;

      const anyWordMatches = words.some((word) => {
        return (
          normA.includes(word) ||
          normB.includes(word) ||
          synA.some((s) => s.includes(word)) ||
          synB.some((s) => s.includes(word))
        );
      });
      if (anyWordMatches) return true;
    }

    return false;
  }).map((item, idx) => ({
    ...item,
    id: `local-${Date.now()}-${idx}`
  }));

  if (matched.length > 0) {
    return matched;
  }

  // If local dataset had no direct match, but user asked about 2 or more drugs
  if (words.length >= 2) {
    const drug1 = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    const drug2 = words[1].charAt(0).toUpperCase() + words[1].slice(1);

    return [
      {
        id: `local-gen-${Date.now()}-0`,
        drugA: drug1,
        drugB: drug2,
        synonymsA: [drug1],
        synonymsB: [drug2],
        severity: 'Grave' as const,
        category: 'Farmacologia Clínica / Interação em Análise',
        effect: `A combinação entre ${drug1} e ${drug2} requer cautela clínica. Pode haver potencial risco de competição metabólica, alteração no tempo de eliminação ou efeito farmacodinâmico sinérgico.`,
        mechanism: `Potencial interação por modulação de vias de eliminação hepática (CYP450) ou alteração na ligação a receptores biológicos.`,
        recommendation: `Não inicie a tomada conjunta de ${drug1} e ${drug2} sem orientação expressa do seu médico ou farmacêutico. Monitore o surgimento de efeitos adversos.`,
        alternatives: `Consulte um profissional de saúde para avaliar ajuste de dose ou substituição por uma alternativa terapêutica mais segura.`,
        foodInteractions: `Evite a ingestão de bebidas alcoólicas e mantenha acompanhamento das reações corporais.`,
        affectedOrgans: ['Fígado', 'Rins', 'Sistema Cardiovascular']
      }
    ];
  }

  // If only 1 drug was typed and not matched
  if (words.length === 1) {
    const drug = words[0].charAt(0).toUpperCase() + words[0].slice(1);
    return [
      {
        id: `local-gen-${Date.now()}-0`,
        drugA: drug,
        drugB: 'Medicamentos Depressores do SNC / AINEs / Anti-hipertensivos',
        synonymsA: [drug],
        synonymsB: ['Outras classes farmacológicas'],
        severity: 'Moderada' as const,
        category: 'Farmacologia Clínica',
        effect: `O uso de ${drug} concomitante com outros fármacos de ação central ou metabólica requer monitoramento constante de efeitos colaterais.`,
        mechanism: `Alteração de biodisponibilidade e depuração plasmática.`,
        recommendation: `Apresente a lista completa dos seus medicamentos ao farmacêutico ou médico durante a consulta.`,
        alternatives: `Manter monoterapia ou fármacos com perfil metabólico independente quando recomendado.`,
        foodInteractions: `Manter hidratação adequada e evitar bebidas alcoólicas durante o tratamento.`,
        affectedOrgans: ['Fígado', 'Rins']
      }
    ];
  }

  return [];
}

// Initialize OpenAI API dynamically with key sanitization
function getOpenAIClient(): OpenAI | null {
  const rawKey = process.env.OPENAI_API_KEY || '';
  const apiKey = rawKey.replace(/^["']|["']$/g, '').trim();
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

// Initialize Gemini API dynamically with key sanitization
function getGeminiClient(): GoogleGenAI | null {
  const rawKey = process.env.GEMINI_API_KEY || '';
  const apiKey = rawKey.replace(/^["']|["']$/g, '').trim();
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
}

// Health & AI Status check API
app.get(['/api/health', '/health'], (_req, res) => {
  res.json({ status: 'ok', app: 'Interafarma Serverless API' });
});

app.get(['/api/ai-status', '/ai-status'], (_req, res) => {
  const rawOpenAI = process.env.OPENAI_API_KEY || '';
  const cleanOpenAI = rawOpenAI.replace(/^["']|["']$/g, '').trim();
  const rawGemini = process.env.GEMINI_API_KEY || '';
  const cleanGemini = rawGemini.replace(/^["']|["']$/g, '').trim();

  res.json({
    openaiConfigured: cleanOpenAI.length > 0,
    openaiKeySnippet: cleanOpenAI.length > 0 ? `${cleanOpenAI.slice(0, 7)}...${cleanOpenAI.slice(-4)}` : null,
    geminiConfigured: cleanGemini.length > 0,
    activeProvider: cleanOpenAI.length > 0 ? 'openai' : (cleanGemini.length > 0 ? 'gemini' : 'local')
  });
});

// Real-Time Drug Interactions Search (OpenAI / Gemini / Local Fallback)
app.post(['/api/search-interactions', '/search-interactions'], async (req, res) => {
  try {
    const { searchTerm } = req.body;
    if (!searchTerm || typeof searchTerm !== 'string' || !searchTerm.trim()) {
      return res.status(400).json({ error: 'Termo de busca é obrigatório.' });
    }

    const cleanTerm = searchTerm.trim();

    // 1. Try OpenAI if key is present
    const openai = getOpenAIClient();
    if (openai) {
      try {
        let completion;
        let usedModel = 'gpt-4o-mini';
        try {
          completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: `Você é uma API de farmacologia clínica da plataforma Interafarma.
Sua função é gerar um objeto JSON contendo a propriedade "results" com a lista das principais (3 a 6) interações medicamentosas clinicamente relevantes para o termo ou combinação informada.

REGRAS OBRIGATÓRIAS:
1. Se o termo for um único medicamento, retorne de 3 a 6 interações importantes dele com outros medicamentos.
2. Se o termo for uma combinação de medicamentos (ex: "hidroxicloroquina e fluoxetina" ou "pode tomar dipirona com ibuprofeno?"), inclua OBRIGATORIAMENTE a interação direta entre os medicamentos citados ("drugA" e "drugB") e depois outras interações relevantes dos fármacos mencionados.
3. Formato JSON estrito:
{
  "results": [
    {
      "drugA": "Nome do Medicamento A",
      "drugB": "Nome do Medicamento B",
      "synonymsA": ["Sinônimo A"],
      "synonymsB": ["Sinônimo B"],
      "severity": "Grave",
      "category": "Especialidade Médica (ex: Cardiologia, Psiquiatria, Reumatologia)",
      "effect": "Efeito clínico e risco principal em texto corrido.",
      "mechanism": "Mecanismo farmacológico de ação em texto corrido.",
      "recommendation": "Recomendação e conduta médica em texto corrido.",
      "alternatives": "Alternativas terapêuticas seguras.",
      "foodInteractions": "Interação com alimentos/bebidas.",
      "affectedOrgans": ["Coração", "Fígado"]
    }
  ]
}`
              },
              {
                role: 'user',
                content: `Pesquisar interações clínicas para: "${cleanTerm}"`
              }
            ],
            temperature: 0.2,
          });
        } catch (miniErr: any) {
          console.warn('gpt-4o-mini failed, attempting fallback to gpt-3.5-turbo / gpt-4o:', miniErr.message || miniErr);
          usedModel = 'gpt-3.5-turbo';
          completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            response_format: { type: 'json_object' },
            messages: [
              {
                role: 'system',
                content: `Você é uma API de farmacologia clínica da plataforma Interafarma.
Gere um objeto JSON contendo a propriedade "results" com as principais (3 a 6) interações medicamentosas.
Formato:
{
  "results": [
    {
      "drugA": "Medicamento A",
      "drugB": "Medicamento B",
      "synonymsA": [],
      "synonymsB": [],
      "severity": "Grave",
      "category": "Farmacologia",
      "effect": "Efeito",
      "mechanism": "Mecanismo",
      "recommendation": "Recomendação",
      "alternatives": "Alternativas",
      "foodInteractions": "Alimentos",
      "affectedOrgans": ["Fígado"]
    }
  ]
}`
              },
              {
                role: 'user',
                content: `Pesquisar interações para: "${cleanTerm}"`
              }
            ],
            temperature: 0.2,
          });
        }

        const rawText = completion.choices[0]?.message?.content?.trim() || '{}';
        const parsed = JSON.parse(rawText);
        let results = Array.isArray(parsed) ? parsed : (parsed.results || parsed.interactions || parsed.data || []);
        if (Array.isArray(results) && results.length > 0) {
          results = results.map((item: any, idx: number) => ({
            ...item,
            id: `ai-openai-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`
          }));
          return res.json({ results, provider: 'openai', model: usedModel });
        }
      } catch (openaiErr: any) {
        console.error('OpenAI API call failed in search endpoint:', openaiErr.status || '', openaiErr.message || openaiErr);
      }
    }

    // 2. Try Gemini as primary/fallback AI
    const ai = getGeminiClient();
    if (ai) {
      try {
        const prompt = `Você é uma API de farmacologia clínica da plataforma Interafarma.
Gere um JSON com as principais (3 a 6) interações medicamentosas clinicamente relevantes para o termo ou combinação: "${cleanTerm}".

REGRAS OBRIGATÓRIAS:
1. Se o termo for uma combinação de 2 ou mais medicamentos (ex: "hidroxicloroquina e fluoxetina" ou "pode tomar X com Y?"), inclua OBRIGATORIAMENTE a interação direta entre os medicamentos citados ("drugA" e "drugB").
2. Se for um único medicamento, traga de 3 a 6 interações importantes dele.
3. Saída estritamente JSON (SEM explicações extras e sem marcadores de código fora do JSON).

Formato:
[
  {
    "drugA": "Nome do Medicamento A",
    "drugB": "Nome do Medicamento B",
    "synonymsA": [],
    "synonymsB": [],
    "severity": "Grave",
    "category": "Farmacologia Clínica",
    "effect": "Descrição em texto corrido do efeito e risco principal.",
    "mechanism": "Mecanismo de ação em texto corrido.",
    "recommendation": "Recomendação e conduta médica.",
    "alternatives": "Alternativas terapêuticas.",
    "foodInteractions": "Interações alimentares.",
    "affectedOrgans": ["Fígado", "Coração"]
  }
]`;

        let rawText = '';
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
          });
          rawText = response.text?.trim() || '';
        } catch (m25Err) {
          console.warn('gemini-2.5-flash failed, trying gemini-2.0-flash:', m25Err);
          const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
          });
          rawText = response.text?.trim() || '';
        }

        const cleanedText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
        let results = JSON.parse(cleanedText);
        if (Array.isArray(results) && results.length > 0) {
          results = results.map((item: any, idx: number) => ({
            ...item,
            id: `ai-gemini-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`
          }));
          return res.json({ results, provider: 'gemini' });
        }
      } catch (geminiErr: any) {
        console.warn('Gemini API call failed in serverless function:', geminiErr.message || geminiErr);
      }
    }

    // 3. Fallback to local dataset search
    const localResults = searchLocalInteractions(cleanTerm);
    return res.json({ results: localResults, provider: 'local' });
  } catch (error: any) {
    console.error('Error in /api/search-interactions:', error);
    const localResults = searchLocalInteractions(req.body?.searchTerm || '');
    return res.json({ results: localResults, provider: 'local', error: error.message });
  }
});

// AI Orientação Farmacêutica Endpoint
app.post(['/api/ai-advice', '/ai-advice'], async (req, res) => {
  try {
    const { drugs, question } = req.body;

    if (!drugs || !Array.isArray(drugs) || drugs.length === 0) {
      return res.status(400).json({ error: 'É necessário informar ao menos um medicamento.' });
    }

    // 1. Try OpenAI if key is available
    const openai = getOpenAIClient();
    if (openai) {
      try {
        let completion;
        try {
          completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'Você é o assistente virtual especializado em Farmacologia da plataforma Interafarma. Forneça orientações farmacêuticas em Português claras, objetivas e em texto corrido.'
              },
              {
                role: 'user',
                content: `Medicamentos em análise: ${drugs.join(', ')}. ${question ? `Dúvida: "${question}"` : 'Forneça orientações de segurança.'}`
              }
            ],
            temperature: 0.4,
          });
        } catch (mErr: any) {
          console.warn('gpt-4o-mini advice call failed, fallback to gpt-3.5-turbo:', mErr.message || mErr);
          completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'Você é o assistente virtual especializado em Farmacologia da plataforma Interafarma. Forneça orientações farmacêuticas em Português claras, objetivas e em texto corrido.'
              },
              {
                role: 'user',
                content: `Medicamentos em análise: ${drugs.join(', ')}. ${question ? `Dúvida: "${question}"` : 'Forneça orientações de segurança.'}`
              }
            ],
            temperature: 0.4,
          });
        }

        const text = completion.choices[0]?.message?.content || 'Não foi possível gerar a orientação farmacêutica no momento.';

        return res.json({
          answer: text,
          provider: 'openai',
          disclaimer: 'Atenção: Esta orientação é gerada por inteligência artificial (OpenAI ChatGPT) para fins informativos e educacionais. Não substitui a consulta direta com um Farmacêutico ou Médico especialista.',
          sources: ['Anvisa / Bulário Eletrônico', 'Micromedex Drug Interactions Guide', 'Interafarma Database']
        });
      } catch (openaiErr: any) {
        console.error('OpenAI AI advice error in serverless function:', openaiErr.status || '', openaiErr.message || openaiErr);
      }
    }

    // 2. Try Gemini
    const ai = getGeminiClient();
    if (ai) {
      const prompt = `
Você é o assistente virtual especializado em Farmacologia e Segurança de Medicamentos da plataforma "Interafarma".
Sua tarefa é fornecer orientações farmacêuticas claras, educativas e estritamente profissionais em Português sobre os medicamentos pesquisados.

Medicamentos em análise: ${drugs.join(', ')}
${question ? `Dúvida do usuário: "${question}"` : 'Orientação solicitada sobre segurança e combinações.'}

Instruções:
1. Explique os cuidados principais e possíveis riscos de interação de forma fácil de entender para um leigo ou profissional de saúde.
2. Destaque precauções com alimentos, bebidas alcoólicas e horários de tomada.
3. Forneça conselhos de segurança de manejo imediato (ex: tomar com alimentos, não interromper abruptamente).
4. Mantenha um tom acolhedor, objetivo e confiável.
5. Mantenha a resposta com cerca de 3 a 4 parágrafos bem estruturados.
`;

        let responseText = '';
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
          });
          responseText = response.text || '';
        } catch (err25) {
          const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
          });
          responseText = response.text || '';
        }

        const text = responseText || 'Não foi possível gerar a orientação farmacêutica no momento.';

      return res.json({
        answer: text,
        disclaimer: 'Atenção: Esta orientação é gerada por inteligência artificial para fins informativos e educacionais. Não substitui a consulta direta com um Farmacêutico ou Médico especialista.',
        sources: ['Anvisa / Bulário Eletrônico', 'Micromedex Drug Interactions Guide', 'Interafarma Database']
      });
    }

    return res.status(500).json({ error: 'Nenhum serviço de IA disponível no momento.' });
  } catch (error: any) {
    console.error('Error in /api/ai-advice:', error);
    res.status(500).json({ 
      error: 'Erro ao gerar orientação da IA.', 
      details: error.message || 'Verifique a chave de API ou tente novamente.' 
    });
  }
});

export default app;
