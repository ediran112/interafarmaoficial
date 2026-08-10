// Vercel serverless entry — wraps the real Express app in a lazy loader so any
// import-time crash is caught and surfaced as HTTP 500 JSON with the real error
// message (instead of the opaque FUNCTION_INVOCATION_FAILED cold-start crash).

let cachedApp: any = null;
let cachedError: any = null;

async function loadApp() {
  if (cachedApp) return cachedApp;
  if (cachedError) throw cachedError;
  try {
    const [expressMod, openaiMod, googleGenAIMod, dotenvMod, dataMod, promptsMod] = await Promise.all([
      import('express'),
      import('openai'),
      import('@google/genai'),
      import('dotenv'),
      import('../src/data/interactionsData'),
      import('../src/lib/interactionPrompts'),
    ]);

    const express = expressMod.default;
    const OpenAI = openaiMod.default;
    const { GoogleGenAI } = googleGenAIMod;
    const dotenv = dotenvMod.default;
    const { INITIAL_30_INTERACTIONS } = dataMod;
    const {
      normalizeInput,
      buildSearchSystemPrompt,
      buildSearchUserPrompt,
      buildGeminiSearchPrompt,
      normalizeResults,
    } = promptsMod;

    if (!process.env.VERCEL) {
      try {
        dotenv.config({ path: '.env.local', override: true });
        dotenv.config({ override: true });
      } catch {}
    }

    const app = express();
    app.use(express.json());

    function getOpenAIClient(): any {
      const rawKey = process.env.OPENAI_API_KEY || '';
      const apiKey = rawKey.replace(/^["']|["']$/g, '').trim();
      if (!apiKey) return null;
      return new OpenAI({ apiKey });
    }

    function getGeminiClient(): any {
      const rawKey = process.env.GEMINI_API_KEY || '';
      const apiKey = rawKey.replace(/^["']|["']$/g, '').trim();
      if (!apiKey) return null;
      return new GoogleGenAI({ apiKey });
    }

    function searchLocalInteractions(term: string) {
      const normalized = term.trim().toLowerCase();
      if (!normalized) return [];
      const stopWords = new Set([
        'pode','tomar','posso','misturar','junto','com','interacao','interacoes','entre',
        'quais','para','faz','mal','usar','usando','medicamento','remedio','remedios','droga','drogas','tem',
      ]);
      const words = normalized
        .split(/\s+(?:e|ou|e\/ou|\+|\*|\/|,|;|com)\s+|\s*[,;\+\/\?\!]\s*|\s+/)
        .map((w) => w.trim().replace(/[^\w\sà-ú]/gi, ''))
        .filter((w) => w.length >= 3 && !stopWords.has(w));
      const matched = INITIAL_30_INTERACTIONS.filter((item: any) => {
        const normA = item.drugA.toLowerCase();
        const normB = item.drugB.toLowerCase();
        const synA = item.synonymsA?.map((s: string) => s.toLowerCase()) || [];
        const synB = item.synonymsB?.map((s: string) => s.toLowerCase()) || [];
        if (
          normA.includes(normalized) ||
          normB.includes(normalized) ||
          synA.some((s: string) => s.includes(normalized)) ||
          synB.some((s: string) => s.includes(normalized))
        ) return true;
        if (words.length > 0) {
          if (words.every((w) => normA.includes(w) || normB.includes(w) || synA.some((s: string) => s.includes(w)) || synB.some((s: string) => s.includes(w)))) return true;
          if (words.some((w) => normA.includes(w) || normB.includes(w) || synA.some((s: string) => s.includes(w)) || synB.some((s: string) => s.includes(w)))) return true;
        }
        return false;
      }).map((item: any, idx: number) => ({ ...item, id: `local-${Date.now()}-${idx}` }));
      if (matched.length > 0) return matched;
      return [];
    }

    app.get(['/api/health', '/health'], (_req: any, res: any) => {
      res.json({ status: 'ok', app: 'Interafarma Serverless API' });
    });

    app.get(['/api/ai-status', '/ai-status'], (_req: any, res: any) => {
      const rawOpenAI = process.env.OPENAI_API_KEY || '';
      const cleanOpenAI = rawOpenAI.replace(/^["']|["']$/g, '').trim();
      const rawGemini = process.env.GEMINI_API_KEY || '';
      const cleanGemini = rawGemini.replace(/^["']|["']$/g, '').trim();
      res.json({
        openaiConfigured: cleanOpenAI.length > 0,
        openaiKeySnippet: cleanOpenAI.length > 0 ? `${cleanOpenAI.slice(0, 7)}...${cleanOpenAI.slice(-4)}` : null,
        geminiConfigured: cleanGemini.length > 0,
        activeProvider: cleanOpenAI.length > 0 ? 'openai' : cleanGemini.length > 0 ? 'gemini' : 'local',
      });
    });

    app.post(['/api/search-interactions', '/search-interactions'], async (req: any, res: any) => {
      try {
        const { drugs, freeText, isMultiDrug } = normalizeInput(req.body);
        if (!freeText && drugs.length === 0) {
          return res.status(400).json({ error: 'Informe um termo ou lista de medicamentos.' });
        }

        const openai = getOpenAIClient();
        if (openai) {
          try {
            let completion: any;
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
              });
            } catch (miniErr: any) {
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
            const rawResults = Array.isArray(parsed) ? parsed : parsed.results || parsed.interactions || parsed.data || [];
            const results = normalizeResults(rawResults, 'openai');
            if (results.length > 0) {
              return res.json({ results, provider: 'openai', model: usedModel, queryDrugs: drugs, queryText: freeText, matrix: isMultiDrug });
            }
          } catch (openaiErr: any) {
            console.error('OpenAI failed:', openaiErr?.status, openaiErr?.message);
          }
        }

        const ai = getGeminiClient();
        if (ai) {
          try {
            const prompt = buildGeminiSearchPrompt(drugs, freeText);
            let rawText = '';
            try {
              const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
              rawText = response.text?.trim() || '';
            } catch {
              const response = await ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt });
              rawText = response.text?.trim() || '';
            }
            const cleanedText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '').trim();
            const parsed = JSON.parse(cleanedText);
            const rawResults = Array.isArray(parsed) ? parsed : parsed.results || parsed.interactions || parsed.data || [];
            const results = normalizeResults(rawResults, 'gemini');
            if (results.length > 0) {
              return res.json({ results, provider: 'gemini', queryDrugs: drugs, queryText: freeText, matrix: isMultiDrug });
            }
          } catch (geminiErr: any) {
            console.warn('Gemini failed:', geminiErr?.message);
          }
        }

        const localResults = searchLocalInteractions(freeText || drugs.join(' '));
        return res.json({ results: localResults, provider: 'local', queryDrugs: drugs, queryText: freeText });
      } catch (error: any) {
        console.error('Search error:', error);
        return res.status(500).json({ error: 'Erro na busca', details: error?.message });
      }
    });

    app.post(['/api/ai-advice', '/ai-advice'], async (req: any, res: any) => {
      try {
        const { drugs, question } = req.body;
        if (!drugs || !Array.isArray(drugs) || drugs.length === 0) {
          return res.status(400).json({ error: 'Informe ao menos um medicamento.' });
        }
        const openai = getOpenAIClient();
        if (openai) {
          try {
            const completion = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: 'Você é o assistente virtual de Farmacologia da plataforma Interafarma. Responda em Português, texto corrido, objetivo.' },
                { role: 'user', content: `Medicamentos: ${drugs.join(', ')}. ${question ? `Dúvida: "${question}"` : 'Forneça orientações de segurança.'}` },
              ],
              temperature: 0.4,
            });
            const text = completion.choices[0]?.message?.content || 'Não foi possível gerar a orientação.';
            return res.json({
              answer: text,
              provider: 'openai',
              disclaimer: 'Atenção: gerado por IA para fins informativos. Não substitui consulta com profissional.',
              sources: ['Anvisa', 'Micromedex', 'Interafarma DB'],
            });
          } catch (e: any) {
            console.error('OpenAI advice failed:', e?.message);
          }
        }
        return res.status(500).json({ error: 'Nenhum serviço de IA disponível.' });
      } catch (error: any) {
        return res.status(500).json({ error: 'Erro na orientação', details: error?.message });
      }
    });

    cachedApp = app;
    return app;
  } catch (err: any) {
    cachedError = err;
    throw err;
  }
}

export default async function handler(req: any, res: any) {
  try {
    const app = await loadApp();
    return app(req, res);
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'Init or dispatch failed',
        name: err?.name || null,
        message: err?.message || String(err),
        stack: typeof err?.stack === 'string' ? err.stack.split('\n').slice(0, 8) : null,
      })
    );
  }
}
