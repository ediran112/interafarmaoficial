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
  Plus,
  Layers,
  Pill,
} from 'lucide-react';

export interface SearchPayload {
  term: string;      // human-readable label ("Warfarina, Aspirina")
  drugs?: string[];  // structured list (chip mode)
}

interface SearchHeroProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  allDrugNames: string[];
  onExecuteSearch: (payload: SearchPayload) => void;
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
const DEBOUNCE_MS = 650;
const MIN_CHARS_AUTO = 3;

const POPULAR_SINGLE: { label: string; term: string }[] = [
  { label: 'Warfarina', term: 'Warfarina' },
  { label: 'Fluoxetina', term: 'Fluoxetina' },
  { label: 'Sinvastatina', term: 'Sinvastatina' },
  { label: 'Dipirona', term: 'Dipirona' },
  { label: 'Omeprazol', term: 'Omeprazol' },
];

const POPULAR_COMBOS: { label: string; drugs: string[] }[] = [
  { label: 'Warfarina + Aspirina', drugs: ['Warfarina', 'Aspirina'] },
  { label: 'Fluoxetina + Tramadol', drugs: ['Fluoxetina', 'Tramadol'] },
  { label: 'Sinvastatina + Amiodarona', drugs: ['Sinvastatina', 'Amiodarona'] },
  { label: 'Omeprazol + Clopidogrel', drugs: ['Omeprazol', 'Clopidogrel'] },
  { label: 'Warfarina + Ibuprofeno + Fluoxetina', drugs: ['Warfarina', 'Ibuprofeno', 'Fluoxetina'] },
];

function loadRecent(): { term: string; drugs?: string[] }[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 6) : [];
  } catch {
    return [];
  }
}

function saveRecent(entry: { term: string; drugs?: string[] }) {
  try {
    const cur = loadRecent();
    const filtered = cur.filter((t) => t.term.toLowerCase() !== entry.term.toLowerCase());
    const next = [entry, ...filtered].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {}
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
    .trim();
}

function uniquePush(list: string[], item: string): string[] {
  const t = titleCase(item.trim());
  if (!t) return list;
  if (list.some((x) => x.toLowerCase() === t.toLowerCase())) return list;
  return [...list, t];
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
  const [chips, setChips] = useState<string[]>([]);
  const [recent, setRecent] = useState<{ term: string; drugs?: string[] }[]>([]);
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

  const executeWith = useCallback(
    (drugs: string[], freeText: string) => {
      const t = freeText.trim();
      const list = drugs.filter(Boolean);
      const label = list.length > 0 ? list.join(', ') : t;
      if (!label) return;
      const key = list.length > 0 ? `L:${list.map((x) => x.toLowerCase()).sort().join('|')}` : `T:${t.toLowerCase()}`;
      if (key === lastExecutedRef.current) return;
      lastExecutedRef.current = key;
      const entry = list.length > 0 ? { term: label, drugs: list } : { term: t };
      saveRecent(entry);
      setRecent(loadRecent());
      setIsFocused(false);
      onExecuteSearch({ term: label, drugs: list.length > 0 ? list : undefined });
    },
    [onExecuteSearch]
  );

  // Live debounced search — reacts to typing AND chips changes
  useEffect(() => {
    if (!autoSearch) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const t = searchTerm.trim();
    if (chips.length === 0 && t.length < MIN_CHARS_AUTO) return;
    if (chips.length >= 1 && chips.length < 2 && t.length === 0) return; // wait for 2nd chip or text
    debounceRef.current = setTimeout(() => {
      // If free text has content, treat it as a candidate extra chip only when it looks like a drug (no ? or spaces > 2 words)
      const isLikelyQuestion = /\?/.test(t);
      let effectiveChips = chips;
      if (chips.length > 0 && t && !isLikelyQuestion) {
        effectiveChips = uniquePush(chips, t);
      }
      executeWith(effectiveChips, t);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm, chips, autoSearch, executeWith]);

  // Global "/" shortcut
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

  const addChip = (raw: string) => {
    const val = raw.replace(/[,;]$/g, '').trim();
    if (!val) return;
    setChips((prev) => uniquePush(prev, val));
    setSearchTerm('');
  };

  const removeChip = (name: string) => {
    setChips((prev) => prev.filter((c) => c.toLowerCase() !== name.toLowerCase()));
  };

  const clearAll = () => {
    setChips([]);
    setSearchTerm('');
    lastExecutedRef.current = '';
    inputRef.current?.focus();
  };

  const handleInputChange = (v: string) => {
    // Comma or semicolon auto-adds chip
    if (/[,;]$/.test(v)) {
      addChip(v.slice(0, -1));
    } else {
      setSearchTerm(v);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === 'Tab') && searchTerm.trim() && chips.length > 0 && !e.shiftKey) {
      e.preventDefault();
      addChip(searchTerm);
    } else if (e.key === 'Backspace' && !searchTerm && chips.length > 0) {
      const last = chips[chips.length - 1];
      setChips((prev) => prev.slice(0, -1));
      setSearchTerm(last);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    let finalChips = chips;
    const t = searchTerm.trim();
    if (t) {
      // If user typed something free, treat as chip if we already have chips (matrix mode),
      // otherwise as free text search.
      if (chips.length > 0) {
        finalChips = uniquePush(chips, t);
        setChips(finalChips);
        setSearchTerm('');
      }
    }
    executeWith(finalChips, t);
  };

  const suggestions =
    searchTerm.trim().length >= 2
      ? allDrugNames
          .filter(
            (name) =>
              name.toLowerCase().includes(searchTerm.toLowerCase()) &&
              !chips.some((c) => c.toLowerCase() === name.toLowerCase())
          )
          .slice(0, 6)
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

  const matrixMode = chips.length >= 2;
  const canSearch = chips.length > 0 || searchTerm.trim().length > 0;

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
          Digite um ou mais medicamentos (separe por vírgula) para gerar em tempo real a
          matriz completa de interações, com mecanismo, evidência, monitorização e conduta clínica.
        </p>

        {/* SEARCH BOX WITH CHIPS */}
        <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto">
          <div
            className={`relative flex flex-wrap items-center gap-1.5 bg-white rounded-2xl shadow-md transition-all border-2 p-1.5 pl-3 ${
              isFocused
                ? 'border-lime-500 ring-4 ring-lime-400/30'
                : 'border-slate-200 hover:border-lime-400'
            }`}
          >
            <div className="text-slate-400 shrink-0">
              {isSearchLoading ? (
                <Loader2 className="w-5 h-5 text-lime-600 animate-spin" />
              ) : matrixMode ? (
                <Layers className="w-5 h-5 text-emerald-600" />
              ) : (
                <Search className="w-5 h-5 text-lime-600" />
              )}
            </div>

            {chips.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 pl-3 pr-1.5 py-1 bg-emerald-100 border border-emerald-300 text-emerald-900 text-sm font-bold rounded-full shadow-2xs"
              >
                <Pill className="w-3.5 h-3.5" />
                <span>{c}</span>
                <button
                  type="button"
                  onClick={() => removeChip(c)}
                  className="ml-0.5 p-0.5 rounded-full hover:bg-emerald-200 cursor-pointer"
                  aria-label={`Remover ${c}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}

            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setTimeout(() => setIsFocused(false), 200)}
              placeholder={
                chips.length === 0
                  ? 'Ex.: "Warfarina" — ou "Warfarina, Aspirina, Ibuprofeno"'
                  : 'Adicionar mais um medicamento…'
              }
              className="flex-1 min-w-[140px] py-2.5 px-2 text-slate-900 placeholder-slate-400 text-sm sm:text-base font-semibold rounded-xl focus:outline-none bg-transparent"
              aria-label="Termo de busca de interação medicamentosa"
            />

            {searchTerm && (
              <button
                type="button"
                onClick={() => addChip(searchTerm)}
                className="p-2 rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer shrink-0"
                title="Adicionar como medicamento"
                aria-label="Adicionar medicamento"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}

            {(chips.length > 0 || searchTerm) && (
              <button
                type="button"
                onClick={clearAll}
                className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer shrink-0"
                title="Limpar tudo"
                aria-label="Limpar tudo"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <div className="hidden sm:flex items-center gap-1 px-2 mr-1 text-[10px] font-bold text-slate-400 border border-slate-200 rounded-md py-1 select-none shrink-0">
              <Command className="w-3 h-3" />
              <span>/</span>
            </div>

            <button
              type="submit"
              disabled={!canSearch || isSearchLoading}
              className="px-5 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-950 font-black text-sm flex items-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
            >
              {isSearchLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="hidden sm:inline">Buscando</span>
                </>
              ) : matrixMode ? (
                <>
                  <Layers className="w-4 h-4 stroke-[3]" />
                  <span>Analisar Matriz</span>
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
              <div className="px-4 py-2 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Sugestões do banco de dados</span>
                <span className="text-slate-400 normal-case font-medium">Clique para adicionar</span>
              </div>
              {suggestions.map((name, idx) => (
                <button
                  type="button"
                  key={idx}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addChip(name);
                  }}
                  className="w-full px-4 py-3 flex items-center justify-between text-slate-800 hover:bg-lime-100 hover:text-slate-950 transition-colors text-sm font-bold cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-600" />
                    {name}
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>
          )}
        </form>

        {matrixMode && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 border border-emerald-300 text-emerald-900 text-[11px] font-bold uppercase tracking-wider rounded-full">
            <Layers className="w-3 h-3" />
            Modo matriz — {chips.length} medicamentos, {(chips.length * (chips.length - 1)) / 2} par(es) analisado(s)
          </div>
        )}

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
          <span className="text-slate-500 flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">,</kbd>
            adiciona chip
          </span>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span className="text-slate-500">
            <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">/</kbd>
            foca campo
          </span>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-center gap-2 mb-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
            <span>Combinações populares</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto">
            {POPULAR_COMBOS.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => {
                  setChips(q.drugs);
                  setSearchTerm('');
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  executeWith(q.drugs, '');
                }}
                className="px-3.5 py-1.5 text-xs font-bold rounded-full bg-white border border-slate-200 text-slate-700 hover:border-emerald-400 hover:bg-emerald-50 hover:text-slate-950 shadow-2xs transition-all cursor-pointer"
              >
                {q.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto mt-2">
            {POPULAR_SINGLE.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => {
                  setChips([]);
                  setSearchTerm('');
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  executeWith([q.term], q.term);
                }}
                className="px-3 py-1 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-600 hover:bg-lime-100 hover:text-slate-900 transition-colors cursor-pointer"
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
                  key={r.term}
                  type="button"
                  onClick={() => {
                    if (r.drugs && r.drugs.length > 0) {
                      setChips(r.drugs);
                      setSearchTerm('');
                      if (debounceRef.current) clearTimeout(debounceRef.current);
                      executeWith(r.drugs, '');
                    } else {
                      setChips([]);
                      setSearchTerm(r.term);
                      if (debounceRef.current) clearTimeout(debounceRef.current);
                      executeWith([], r.term);
                    }
                  }}
                  className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  {r.drugs && r.drugs.length > 1 && <Layers className="w-3 h-3 text-emerald-600" />}
                  {r.term}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
