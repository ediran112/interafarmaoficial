// Diagnostic wrapper — catches import-time errors and returns them as JSON
// so we can see the real cause instead of FUNCTION_INVOCATION_FAILED.

let cachedApp: any = null;
let cachedError: any = null;

async function loadApp() {
  if (cachedApp) return cachedApp;
  if (cachedError) throw cachedError;
  try {
    const expressMod = await import('express');
    const openaiMod = await import('openai');
    const googleGenAIMod = await import('@google/genai');
    const dotenvMod = await import('dotenv');
    // Node ESM requires explicit .js extension in specifiers, even when the
    // source is .ts (the runtime resolves to the compiled .js).
    // @ts-ignore — TS complains but Vercel/Node ESM needs the .js suffix.
    const dataMod = await import('./_lib/interactionsData.js');
    // @ts-ignore
    const promptsMod = await import('./_lib/interactionPrompts.js');

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
        dataLoaded: Array.isArray(INITIAL_30_INTERACTIONS),
        dataCount: Array.isArray(INITIAL_30_INTERACTIONS) ? INITIAL_30_INTERACTIONS.length : 0,
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

        return res.json({ results: [], provider: 'local', queryDrugs: drugs, queryText: freeText });
      } catch (error: any) {
        console.error('Search error:', error);
        return res.status(500).json({ error: 'Erro na busca', details: error?.message });
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
        code: err?.code || null,
        message: err?.message || String(err),
        stack: typeof err?.stack === 'string' ? err.stack.split('\n').slice(0, 10) : null,
      })
    );
  }
}
