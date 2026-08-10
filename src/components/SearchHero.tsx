import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search,
  X,
  Sparkles,
  ChevronRight,
  Clock,
  Zap,
  Loader2,
  Command,
  Flame,
} from 'lucide-react';

interface SearchHeroProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  allDrugNames: string[];
  onExecuteSearch: (drugName: string) => void;
  isSearchLoading?: boolean;
  aiStatus?: {
    openaiConfigured: boolean;
    geminiConfigured: boolean;
    activeProvider: string;
    openaiKeySnippet: string | null;
  } | null;
}

const RECENT_KEY = 'interafarma:recent-searches';
const AUTO_KEY = 'interafarma:auto-search';
const DEBOUNCE_MS = 550;
const MIN_CHARS_AUTO = 3;

const POPULAR_QUERIES: { label: string; term: string }[] = [
  { label: 'Warfarina + Aspirina', term: 'Warfarina e Aspirina' },
  { label: 'Fluoxetina + Tramadol', term: 'Fluoxetina e Tramadol' },
  { label: 'Sinvastatina + Amiodarona', term: 'Sinvastatina e Amiodarona' },
  { label: 'Dipirona + Ibuprofeno', term: 'Dipirona e Ibuprofeno' },
  { label: 'Omeprazol + Clopidogrel', term: 'Omeprazol e Clopidogrel' },
];

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
  } catch {
    return [];
  }
}

function saveRecent(term: string) {
  try {
    const cur = loadRecent();
    const filtered = cur.filter((t) => t.toLowerCase() !== term.toLowerCase());
    const next = [term, ...filtered].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

export const SearchHero: React.FC<SearchHeroProps> = ({
  searchTerm,
  setSearchTerm,
  allDrugNames,
  onExecuteSearch,
  isSearchLoading = false,
  aiStatus,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [autoSearch, setAutoSearch] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTO_KEY) !== 'false';
    } catch {
      return true;
    }
  });
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastExecutedRef = useRef<string>('');

  useEffect(() => {
    setRecent(loadRecent());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(AUTO_KEY, autoSearch ? 'true' : 'false');
    } catch {}
  }, [autoSearch]);

  const runSearch = useCallback(
    (term: string) => {
      const t = term.trim();
      if (!t || t === lastExecutedRef.current) return;
      lastExecutedRef.current = t;
      saveRecent(t);
      setRecent(loadRecent());
      setIsFocused(false);
      onExecuteSearch(t);
    },
    [onExecuteSearch]
  );

  useEffect(() => {
    if (!autoSearch) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const t = searchTerm.trim();
    if (t.length < MIN_CHARS_AUTO) return;
    if (t === lastExecutedRef.current) return;
    debounceRef.current = setTimeout(() => {
      runSearch(t);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm, autoSearch, runSearch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const suggestions =
    searchTerm.trim().length >= 2
      ? allDrugNames
          .filter((name) => name.toLowerCase().includes(searchTerm.toLowerCase()))
          .slice(0, 8)
      : [];

  const providerLabel = aiStatus?.openaiConfigured
    ? 'IA em Tempo Real • OpenAI ChatGPT'
    : aiStatus?.geminiConfigured
    ? 'IA em Tempo Real • Google Gemini'
    : 'Base Farmacológica Oficial Interafarma';

  const providerAccent = aiStatus?.openaiConfigured
    ? 'from-emerald-100 to-lime-100 border-emerald-300 text-emerald-900'
    : aiStatus?.geminiConfigured
    ? 'from-sky-100 to-indigo-100 border-sky-300 text-sky-900'
    : 'from-lime-100 to-lime-100 border-lime-300 text-lime-900';

  const showAiActive = !!(aiStatus?.openaiConfigured || aiStatus?.geminiConfigured);

  return (
    <section className="relative overflow-hidden bg-slate-50 text-slate-900 pt-10 pb-10 px-4 sm:px-6 border-b border-slate-200">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-lime-300/25 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-10 right-10 w-72 h-72 bg-emerald-200/25 blur-2xl rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r ${providerAccent} border text-xs font-bold uppercase tracking-wider mb-4 shadow-2xs`}
        >
          <span className="relative flex h-2.5 w-2.5">
            {showAiActive && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                showAiActive ? 'bg-emerald-500' : 'bg-lime-500'
              }`}
            />
          </span>
          <Sparkles className="w-3.5 h-3.5" />
          <span>{providerLabel}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 mb-3">
          Pesquisa de{' '}
          <span className="bg-lime-400 text-slate-950 px-3 py-0.5 rounded-xl inline-block mt-1 sm:mt-0">
            Interações Medicamentosas
          </span>
        </h1>

        <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto mb-6 leading-relaxed font-medium">
          Digite um ou mais medicamentos para consultar em tempo real riscos clínicos,
          mecanismos de ação e recomendações de segurança.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (debounceRef.current) clearTimeout(debounceRef.current);
            runSearch(searchTerm);
          }}
          className="relative max-w-2xl mx-auto"
        >
          <div
            className={`relative flex items-center bg-white rounded-2xl shadow-md transition-all border-2 p-1.5 ${
              isFocused
                ? 'border-lime-500 ring-4 ring-lime-400/30'
                : 'border-slate-200 hover:border-lime-400'
            }`}
          >
            <div className="pl-3.5 text-slate-400">
              {isSearchLoading ? (
                <Loader2 className="w-5 h-5 text-lime-600 animate-spin" />
              ) : (
                <Search className="w-5 h-5 text-lime-600" />
              )}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              placeholder='Ex.: "Warfarina", "Fluoxetina e Tramadol", "posso tomar Dipirona com Ibuprofeno?"'
              className="w-full py-3 pl-3 pr-2 text-slate-900 placeholder-slate-400 text-sm sm:text-base font-semibold rounded-xl focus:outline-none"
              aria-label="Termo de busca de interação medicamentosa"
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  lastExecutedRef.current = '';
                  inputRef.current?.focus();
                }}
                className="px-2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                title="Limpar busca"
                aria-label="Limpar busca"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="hidden sm:flex items-center gap-1 px-2 mr-1 text-[10px] font-bold text-slate-400 border border-slate-200 rounded-md py-1 select-none">
              <Command className="w-3 h-3" />
              <span>/</span>
            </div>

            <button
              type="submit"
              disabled={!searchTerm.trim() || isSearchLoading}
              className="px-5 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-950 font-black text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
            >
              {isSearchLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Buscando</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 stroke-[3]" />
                  <span>Pesquisar</span>
                </>
              )}
            </button>
          </div>

          {isFocused && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 text-left overflow-hidden divide-y divide-slate-100">
              <div className="px-4 py-2 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Sugestões do banco de dados
              </div>
              {suggestions.map((name, idx) => (
                <button
                  type="button"
                  key={idx}
                  onMouseDown={() => {
                    setSearchTerm(name);
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    runSearch(name);
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between text-slate-800 hover:bg-lime-100 hover:text-slate-950 transition-colors text-sm font-bold cursor-pointer"
                >
                  <span>{name}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>
          )}
        </form>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-4 text-xs text-slate-500 font-semibold">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <span className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={autoSearch}
                onChange={(e) => setAutoSearch(e.target.checked)}
                className="sr-only peer"
              />
              <span className="w-9 h-5 bg-slate-300 rounded-full peer-checked:bg-lime-500 transition-colors" />
              <span className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
            </span>
            <span className="flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-lime-600" />
              Busca automática em tempo real
            </span>
          </label>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span className="text-slate-500">
            Pressione <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">/</kbd> para focar
          </span>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-center gap-2 mb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span>Consultas populares</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto">
            {POPULAR_QUERIES.map((q) => (
              <button
                key={q.term}
                type="button"
                onClick={() => {
                  setSearchTerm(q.term);
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  runSearch(q.term);
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded-full bg-white border border-slate-200 text-slate-700 hover:border-lime-400 hover:bg-lime-50 hover:text-slate-950 shadow-2xs transition-all cursor-pointer"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {recent.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-center gap-2 mb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" />
              <span>Buscas recentes</span>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem(RECENT_KEY);
                  } catch {}
                  setRecent([]);
                }}
                className="ml-2 text-[10px] text-slate-400 hover:text-rose-500 underline underline-offset-2 cursor-pointer"
              >
                limpar
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto">
              {recent.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setSearchTerm(r);
                    if (debounceRef.current) clearTimeout(debounceRef.current);
                    runSearch(r);
                  }}
                  className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
