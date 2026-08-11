import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { INITIAL_30_INTERACTIONS } from './src/data/interactionsData';
import {
  normalizeInput,
  buildSearchSystemPrompt,
  buildSearchUserPrompt,
  buildGeminiSearchPrompt,
  normalizeResults,
  buildMonographSystemPrompt,
  buildMonographUserPrompt,
  normalizeMonograph,
  buildRewriteSystemPrompt,
  buildRewriteUserPrompt,
  normalizeRewrite,
} from './src/lib/interactionPrompts';

dotenv.config({ path: '.env.local', override: true });
dotenv.config({ override: true });

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', app: 'Interafarma Server' });
  });

  app.get('/api/ai-status', (_req, res) => {
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
  app.post('/api/search-interactions', async (req, res) => {
    try {
      const { drugs, freeText, isMultiDrug } = normalizeInput(req.body);
      if (!freeText && drugs.length === 0) {
        return res.status(400).json({ error: 'Informe um termo ou lista de medicamentos.' });
      }

      // 1. Try OpenAI if key is present
      const openai = getOpenAIClient();
      if (openai) {
        try {
          let completion;
          let usedModel = 'gpt-4o-mini';
          const systemMsg = buildSearchSystemPrompt();
          const userMsg = buildSearchUserPrompt(drugs, freeText);

          try {
            completion = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              response_format: { type: 'json_object' },
              messages: [
                { role: 'system', content: systemMsg },
                { role: 'user', content: userMsg },
              ],
              temperature: 0.15,
              max_tokens: 4096,
            });
          } catch (miniErr: any) {
            console.warn('gpt-4o-mini failed in server.ts, fallback to gpt-3.5-turbo:', miniErr.message || miniErr);
            usedModel = 'gpt-3.5-turbo';
            completion = await openai.chat.completions.create({
              model: 'gpt-3.5-turbo',
              response_format: { type: 'json_object' },
              messages: [
                { role: 'system', content: systemMsg },
                { role: 'user', content: userMsg },
              ],
              temperature: 0.2,
            });
          }

          const rawText = completion.choices[0]?.message?.content?.trim() || '{}';
          const parsed = JSON.parse(rawText);
          const rawResults = Array.isArray(parsed) ? parsed : (parsed.results || parsed.interactions || parsed.data || []);
          const results = normalizeResults(rawResults, 'openai');
          if (results.length > 0) {
            return res.json({
              results,
              provider: 'openai',
              model: usedModel,
              queryDrugs: drugs,
              queryText: freeText,
              matrix: isMultiDrug,
            });
          }
        } catch (openaiErr: any) {
          console.error('OpenAI API call failed in server.ts search endpoint:', openaiErr.status || '', openaiErr.message || openaiErr);
        }
      }

      // 2. Try Gemini as fallback AI
      const ai = getGeminiClient();
      if (ai) {
        try {
          const prompt = buildGeminiSearchPrompt(drugs, freeText);
          let rawText = '';
          try {
            const response = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: prompt,
            });
            rawText = response.text?.trim() || '';
          } catch (m25Err) {
            console.warn('gemini-2.5-flash failed in server.ts, trying gemini-2.0-flash:', m25Err);
            const response = await ai.models.generateContent({
              model: 'gemini-2.0-flash',
              contents: prompt,
            });
            rawText = response.text?.trim() || '';
          }
          const cleanedText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
          const parsed = JSON.parse(cleanedText);
          const rawResults = Array.isArray(parsed) ? parsed : (parsed.results || parsed.interactions || parsed.data || []);
          const results = normalizeResults(rawResults, 'gemini');
          if (results.length > 0) {
            return res.json({
              results,
              provider: 'gemini',
              queryDrugs: drugs,
              queryText: freeText,
              matrix: isMultiDrug,
            });
          }
        } catch (geminiErr: any) {
          console.warn('Gemini API call failed:', geminiErr.message || geminiErr);
        }
      }

      // 3. Fallback to local dataset
      const localResults = searchLocalInteractions(freeText || drugs.join(' '));
      return res.json({ results: localResults, provider: 'local', queryDrugs: drugs, queryText: freeText });
    } catch (error: any) {
      console.error('Error in /api/search-interactions:', error);
      const { freeText, drugs } = normalizeInput(req.body);
      const localResults = searchLocalInteractions(freeText || drugs.join(' '));
      return res.json({ results: localResults, provider: 'local', error: error.message });
    }
  });

  // Drug Monograph (technical sheet with 4 sections)
  app.post('/api/drug-monograph', async (req, res) => {
    try {
      const drug = typeof req.body?.drug === 'string' ? req.body.drug.trim() : '';
      if (!drug) {
        return res.status(400).json({ error: 'Informe o nome do medicamento.' });
      }

      const openai = getOpenAIClient();
      if (openai) {
        try {
          let completion;
          let usedModel = 'gpt-4o-mini';
          const systemMsg = buildMonographSystemPrompt();
          const userMsg = buildMonographUserPrompt(drug);
          try {
            completion = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              response_format: { type: 'json_object' },
              messages: [
                { role: 'system', content: systemMsg },
                { role: 'user', content: userMsg },
              ],
              temperature: 0.1,
              max_tokens: 4096,
            });
          } catch (miniErr: any) {
            console.warn('gpt-4o-mini monograph failed, fallback to gpt-3.5-turbo:', miniErr.message);
            usedModel = 'gpt-3.5-turbo';
            completion = await openai.chat.completions.create({
              model: 'gpt-3.5-turbo',
              response_format: { type: 'json_object' },
              messages: [
                { role: 'system', content: systemMsg },
                { role: 'user', content: userMsg },
              ],
              temperature: 0.2,
            });
          }
          const rawText = completion.choices[0]?.message?.content?.trim() || '{}';
          const parsed = JSON.parse(rawText);
          const monograph = normalizeMonograph(parsed);
          if (monograph) {
            return res.json({ monograph, provider: 'openai', model: usedModel, drug });
          }
        } catch (openaiErr: any) {
          console.error('OpenAI monograph error:', openaiErr.status || '', openaiErr.message || openaiErr);
        }
      }

      return res.status(503).json({ error: 'Monografia indisponível no momento.', drug });
    } catch (error: any) {
      console.error('Error in /api/drug-monograph:', error);
      return res.status(500).json({ error: 'Erro ao gerar monografia.', details: error.message });
    }
  });

  // AI Orientação Farmacêutica Endpoint
  // Prescription rewrite — safer alternative when a grave interaction is detected
  app.post('/api/prescription-rewrite', async (req, res) => {
    try {
      const drugs = Array.isArray(req.body?.drugs)
        ? req.body.drugs.filter((d: any) => typeof d === 'string' && d.trim())
        : [];
      const pair = Array.isArray(req.body?.conflictingPair) ? req.body.conflictingPair : [];
      const indication = typeof req.body?.indication === 'string' ? req.body.indication.trim() : '';
      if (drugs.length < 2 || pair.length !== 2) {
        return res.status(400).json({ error: 'Informe pelo menos 2 medicamentos e o par conflitante.' });
      }

      const openai = getOpenAIClient();
      if (openai) {
        try {
          const systemMsg = buildRewriteSystemPrompt();
          const userMsg = buildRewriteUserPrompt(drugs, [String(pair[0]), String(pair[1])], indication);
          let completion;
          try {
            completion = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              response_format: { type: 'json_object' },
              messages: [
                { role: 'system', content: systemMsg },
                { role: 'user', content: userMsg },
              ],
              temperature: 0.15,
              max_tokens: 3000,
            });
          } catch (miniErr: any) {
            console.warn('gpt-4o-mini rewrite failed, fallback to gpt-3.5-turbo:', miniErr.message);
            completion = await openai.chat.completions.create({
              model: 'gpt-3.5-turbo',
              response_format: { type: 'json_object' },
              messages: [
                { role: 'system', content: systemMsg },
                { role: 'user', content: userMsg },
              ],
              temperature: 0.2,
            });
          }
          const rawText = completion.choices[0]?.message?.content?.trim() || '{}';
          const parsed = JSON.parse(rawText);
          const rewrite = normalizeRewrite(parsed);
          if (rewrite) {
            return res.json({ rewrite, provider: 'openai', drugs, conflictingPair: pair });
          }
        } catch (openaiErr: any) {
          console.error('OpenAI rewrite error:', openaiErr.status || '', openaiErr.message);
        }
      }

      return res.status(503).json({ error: 'Serviço temporariamente indisponível.' });
    } catch (error: any) {
      console.error('Error in /api/prescription-rewrite:', error);
      return res.status(500).json({ error: 'Erro ao gerar prescrição alternativa.', details: error.message });
    }
  });

  app.post('/api/ai-advice', async (req, res) => {
    try {
      const drugs = Array.isArray(req.body?.drugs)
        ? req.body.drugs.filter((d: any) => typeof d === 'string' && d.trim())
        : [];
      const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
      if (drugs.length === 0) {
        return res.status(400).json({ error: 'Informe ao menos um medicamento.' });
      }

      const systemMsg = `Você é um farmacologista clínico especialista da plataforma Interafarma.
Gere um parecer orientativo em Português do Brasil sobre os medicamentos informados.

DIRETRIZES OBRIGATÓRIAS:
- Texto corrido em 3-4 parágrafos curtos, cada um com foco distinto.
- Estrutura sugerida:
  1) Perfil de risco da combinação em uma frase inicial forte.
  2) Cuidados práticos e horários de administração.
  3) Sinais de alerta que o paciente/cuidador deve observar.
  4) Quando procurar médico/farmacêutico imediatamente.
- Termos precisos, sem 'usar com cautela' vazio. Cite valores, horários, sintomas específicos.
- Tom acolhedor mas técnico. Sem preâmbulos, sem 'olá', sem despedidas.
- Se houver dúvida específica do usuário, responda-a diretamente antes dos cuidados gerais.
- Máximo 350 palavras.`;

      const userMsg = `Medicamentos em análise: ${drugs.join(', ')}.
${question ? `Dúvida específica do usuário: "${question}"` : 'Forneça orientações gerais de segurança para o uso combinado.'}`;

      const openai = getOpenAIClient();
      if (openai) {
        try {
          let completion;
          try {
            completion = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: systemMsg },
                { role: 'user', content: userMsg },
              ],
              temperature: 0.35,
              max_tokens: 900,
            });
          } catch (mErr: any) {
            console.warn('gpt-4o-mini advice failed, fallback to gpt-3.5-turbo:', mErr.message || mErr);
            completion = await openai.chat.completions.create({
              model: 'gpt-3.5-turbo',
              messages: [
                { role: 'system', content: systemMsg },
                { role: 'user', content: userMsg },
              ],
              temperature: 0.4,
            });
          }
          const text = completion.choices[0]?.message?.content?.trim() || '';
          if (text) {
            return res.json({
              answer: text,
              provider: 'openai',
              disclaimer:
                'Parecer fundamentado em consultas às bases científicas de referência farmacológica (Micromedex, Stockley Drug Interactions, SciELO, PubMed, Anvisa Bulário Eletrônico, FDA Label, DrugBank). Não substitui a consulta direta com um médico ou farmacêutico habilitado.',
              sources: ['Micromedex', 'Stockley Drug Interactions', 'SciELO', 'PubMed', 'Anvisa Bulário Eletrônico', 'FDA Label', 'DrugBank'],
            });
          }
        } catch (openaiErr: any) {
          console.error('OpenAI advice error in server.ts:', openaiErr.status || '', openaiErr.message || openaiErr);
        }
      }

      const ai = getGeminiClient();
      if (ai) {
        try {
          const geminiPrompt = `${systemMsg}\n\n${userMsg}`;
          let responseText = '';
          try {
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: geminiPrompt });
            responseText = response.text || '';
          } catch {
            const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: geminiPrompt });
            responseText = response.text || '';
          }
          if (responseText.trim()) {
            return res.json({
              answer: responseText.trim(),
              provider: 'gemini',
              disclaimer:
                'Parecer fundamentado em consultas às bases científicas de referência farmacológica (Micromedex, Stockley Drug Interactions, SciELO, PubMed, Anvisa Bulário Eletrônico, FDA Label, DrugBank). Não substitui a consulta direta com um médico ou farmacêutico habilitado.',
              sources: ['Micromedex', 'Stockley Drug Interactions', 'SciELO', 'PubMed', 'Anvisa Bulário Eletrônico', 'FDA Label', 'DrugBank'],
            });
          }
        } catch (geminiErr: any) {
          console.warn('Gemini advice error:', geminiErr.message || geminiErr);
        }
      }

      return res.status(503).json({
        error: 'Serviço de orientação temporariamente indisponível. Tente novamente em alguns instantes.',
      });
    } catch (error: any) {
      console.error('Error in /api/ai-advice:', error);
      return res.status(500).json({
        error: 'Erro ao gerar orientação.',
        details: error.message || 'Verifique a chave de API ou tente novamente.',
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Interafarma server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
