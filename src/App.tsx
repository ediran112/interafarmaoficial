import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { DrugInteraction, SavedCheck, UserProfile, DrugMonograph as DrugMonographType } from './types';
import {
  seedInitialInteractionsIfNeeded,
  searchInteractions,
  getAllUniqueDrugNames,
  saveUserCheck,
  saveSearchToHistory,
  getUserSavedChecks,
  deleteSavedCheck,
} from './services/interactionService';
import { Navbar } from './components/Navbar';
import { SearchHero } from './components/SearchHero';
import { InteractionCard } from './components/InteractionCard';
import { CombinationChecker } from './components/CombinationChecker';
import { AuthModal } from './components/AuthModal';
import { AIAdvisorModal } from './components/AIAdvisorModal';
import { SavedChecks } from './components/SavedChecks';
import { SafetyGuide } from './components/SafetyGuide';
import { DrugMonograph } from './components/DrugMonograph';
import { PrescriptionRewriteModal } from './components/PrescriptionRewriteModal';
import { ClinicalDisclaimer } from './components/ClinicalDisclaimer';
import { PolypharmacySummary, type SeverityFilter } from './components/PolypharmacySummary';
import { LoadingOverlay } from './components/LoadingOverlay';
import { InstallAppModal } from './components/InstallAppModal';
import { useInstallPrompt } from './lib/pwa';
import { Pill, AlertCircle, RefreshCw, Search, Zap, Printer, Copy, Check, BookmarkCheck } from 'lucide-react';

export default function App() {
  const [interactions, setInteractions] = useState<DrugInteraction[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchExecutedTerm, setSearchExecutedTerm] = useState('');
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [lastResponseMs, setLastResponseMs] = useState<number | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Monograph state — only fetched when the query is a single drug
  const [monograph, setMonograph] = useState<DrugMonographType | null>(null);
  const [isMonographLoading, setIsMonographLoading] = useState(false);
  const monographAbortRef = useRef<AbortController | null>(null);
  const [monographTab, setMonographTab] = useState<'interactions' | 'monograph'>('monograph');

  // Current prescription context — the list of drugs the user is looking at
  // (chips in matrix mode, or single drug otherwise). Used by the rewrite modal.
  const [currentDrugList, setCurrentDrugList] = useState<string[]>([]);

  // Prescription rewrite modal
  const [rewritePair, setRewritePair] = useState<[string, string] | null>(null);
  const [isRewriteOpen, setIsRewriteOpen] = useState(false);
  const handleSuggestRewrite = (drugA: string, drugB: string) => {
    if (!currentUserRef.current) {
      setPendingAction({ kind: 'rewrite', drugA, drugB });
      setAuthGateMessage(
        'Cadastre-se ou entre para gerar prescrição alternativa segura.'
      );
      setIsAuthModalOpen(true);
      return;
    }
    setRewritePair([drugA, drugB]);
    setIsRewriteOpen(true);
  };

  // Print / Save as PDF — user hits print, chooses "Save as PDF" in the dialog
  const handlePrint = () => {
    // Give the browser a tick to apply @media print styles before invoking dialog
    setTimeout(() => window.print(), 50);
  };

  // Copy summary to clipboard — WhatsApp-friendly format for sharing with team
  const [copiedSummary, setCopiedSummary] = useState(false);
  const handleCopySummary = async () => {
    const now = new Date();
    const ts = now.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const counts = { Grave: 0, Moderada: 0, Leve: 0 };
    filteredInteractions.forEach((it) => {
      if (it.severity in counts) counts[it.severity as 'Grave' | 'Moderada' | 'Leve']++;
    });

    const sevIcon = (s: string) =>
      s === 'Grave' ? '🔴' : s === 'Moderada' ? '🟠' : '🔵';

    const lines: string[] = [];
    lines.push('📋 *Análise Interafarma*');
    lines.push(`🗓 ${ts}`);
    lines.push('');
    lines.push(`*Consulta:* ${searchExecutedTerm}`);
    if (currentDrugList.length >= 2) {
      const totalPairs = (currentDrugList.length * (currentDrugList.length - 1)) / 2;
      lines.push(
        `*Análise:* ${currentDrugList.length} medicamentos · ${totalPairs} pares`
      );
      lines.push(
        `*Distribuição:* ${counts.Grave} Grave${counts.Grave !== 1 ? 's' : ''} · ${counts.Moderada} Moderada${counts.Moderada !== 1 ? 's' : ''} · ${counts.Leve} Leve${counts.Leve !== 1 ? 's' : ''}`
      );
    }
    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━');
    lines.push('');

    filteredInteractions.forEach((it, i) => {
      lines.push(`${sevIcon(it.severity)} *${it.severity.toUpperCase()}* — ${it.drugA} × ${it.drugB}`);
      if (it.effect) lines.push(`_Efeito:_ ${it.effect}`);
      if (it.mechanism) lines.push(`_Mecanismo:_ ${it.mechanism}`);
      if (it.recommendation) lines.push(`_Conduta:_ ${it.recommendation}`);
      if (it.monitoring) lines.push(`_Monitorização:_ ${it.monitoring}`);
      if (i < filteredInteractions.length - 1) lines.push('');
    });

    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━');
    lines.push('');
    lines.push('⚠ Ferramenta de apoio à decisão clínica. Não substitui julgamento profissional habilitado.');
    lines.push('');
    lines.push('Fontes: Micromedex · Stockley · SciELO · PubMed · Anvisa · FDA');
    lines.push('interafarmaoficial.vercel.app');

    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
    } catch (err) {
      console.warn('Falha ao copiar para área de transferência:', err);
    }
  };

  const fetchMonograph = async (drug: string) => {
    if (monographAbortRef.current) monographAbortRef.current.abort();
    const controller = new AbortController();
    monographAbortRef.current = controller;
    setMonograph(null);
    setIsMonographLoading(true);
    try {
      const res = await fetch('/api/drug-monograph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drug }),
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.monograph) setMonograph(data.monograph);
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') console.warn('Monograph fetch failed:', err);
    } finally {
      if (monographAbortRef.current === controller) {
        setIsMonographLoading(false);
        monographAbortRef.current = null;
      }
    }
  };

  // Heuristic: query is a single drug when either drugs.length === 1
  // OR the free text has no separators, no question marks, and <= 3 words
  const shouldFetchMonograph = (drugs: string[] | undefined, term: string): string | null => {
    if (drugs && drugs.length === 1) return drugs[0];
    if (drugs && drugs.length > 1) return null;
    const t = term.trim();
    if (!t) return null;
    if (/[,;?]/.test(t)) return null;
    if (t.split(/\s+/).length > 3) return null;
    return t;
  };

  // Trigger search with loading and real-time backend AI query
  const handleExecuteSearch = async (payload: { term: string; drugs?: string[] }) => {
    // Auth gate: usuários não cadastrados veem o modal de cadastro antes de consultar
    if (!currentUserRef.current) {
      setPendingSearch(payload);
      setAuthGateMessage(
        'Cadastre-se ou entre para consultar as interações medicamentosas em tempo real.'
      );
      setIsAuthModalOpen(true);
      return;
    }

    const term = payload.term;
    const drugs = payload.drugs && payload.drugs.length > 0 ? payload.drugs : undefined;

    // Cancel any in-flight request from a previous keystroke
    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    const controller = new AbortController();
    searchAbortRef.current = controller;

    setSearchExecutedTerm(term);
    setIsSearchLoading(true);
    setSeverityFilter('all'); // reset filter on new query

    // Remember the current query as the prescription context for the rewrite modal
    setCurrentDrugList(drugs && drugs.length > 0 ? drugs : term ? [term] : []);

    // Fire monograph fetch in parallel when the query looks like a single drug
    const monoDrug = shouldFetchMonograph(drugs, term);
    if (monoDrug) {
      setMonographTab('monograph');
      fetchMonograph(monoDrug);
    } else {
      if (monographAbortRef.current) monographAbortRef.current.abort();
      setMonograph(null);
      setIsMonographLoading(false);
      setMonographTab('interactions');
    }

    const startTime = Date.now();

    try {
      const response = await fetch('/api/search-interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(drugs ? { drugs, searchTerm: term } : { searchTerm: term }),
        signal: controller.signal,
      });

      if (response.ok) {
        const data = await response.json();
        setLastResponseMs(Date.now() - startTime);
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
          const incoming: DrugInteraction[] = data.results.map((item: any, idx: number) => ({
            id: item.id || `ai-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            ...item,
          }));
          setInteractions((prev) => {
            const existingIds = new Set(prev.map((it) => it.id));
            const newItems = incoming.filter((it) => !existingIds.has(it.id));
            return [...newItems, ...prev];
          });

          // Auto-save no historico quando ha usuario logado real (nao guest demo)
          const user = currentUserRef.current;
          if (user && !user.uid.startsWith('demo-')) {
            saveSearchToHistory({
              userId: user.uid,
              drugs: drugs || [],
              queryText: term,
              interactions: incoming,
              provider: data.provider,
            })
              .then((saved) => {
                if (saved) {
                  setSavedChecks((prev) => [saved, ...prev]);
                  flashToast('Consulta salva no histórico');
                }
              })
              .catch(() => {}); // silencioso — nao bloqueia UX
          }
        }
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') return; // superseded by newer keystroke
      console.warn('Real-time AI search fallback to local dataset:', error);
    } finally {
      if (searchAbortRef.current === controller) {
        setIsSearchLoading(false);
        searchAbortRef.current = null;
      }
    }
  };
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'search' | 'checker' | 'guide' | 'saved'>('search');
  
  // Auth state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const currentUserRef = useRef<UserProfile | null>(null);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authGateMessage, setAuthGateMessage] = useState<string | undefined>(undefined);

  // Pending action to execute after user logs in (auth gate)
  const [pendingSearch, setPendingSearch] = useState<{ term: string; drugs?: string[] } | null>(
    null
  );
  const [pendingAction, setPendingAction] = useState<{
    kind: 'rewrite' | 'advice';
    drugA: string;
    drugB: string;
  } | null>(null);

  // Saved checks
  const [savedChecks, setSavedChecks] = useState<SavedCheck[]>([]);

  // Toast: feedback discreto quando algo é salvo/copiado etc.
  const [toast, setToast] = useState<string | null>(null);
  const flashToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // PWA install prompt
  const {
    platform: installPlatform,
    isInstalled,
    canInstallNatively,
    wasPreviouslyPrompted,
  } = useInstallPrompt();
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const showInstallButton =
    !isInstalled && (installPlatform === 'installable' || installPlatform === 'ios');

  // AI Modal state
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiInitialDrugA, setAiInitialDrugA] = useState('');
  const [aiInitialDrugB, setAiInitialDrugB] = useState('');

  // 1. Load initial 30 interactions from Firestore/Local
  useEffect(() => {
    async function loadInteractions() {
      setLoadingData(true);
      try {
        const data = await seedInitialInteractionsIfNeeded();
        setInteractions(data);
      } catch (err) {
        console.error('Failed loading interactions:', err);
      } finally {
        setLoadingData(false);
      }
    }
    loadInteractions();
  }, []);

  // 2. Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const profile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'Usuário',
          createdAt: new Date().toISOString()
        };
        setCurrentUser(profile);
        // Load user's saved checks from Firestore
        const checks = await getUserSavedChecks(user.uid);
        setSavedChecks(checks);
      } else {
        // If not logged in with Firebase, retain guest if any, else null
        if (currentUser?.uid.startsWith('demo-')) {
          // keep demo user
        } else {
          setCurrentUser(null);
          setSavedChecks([]);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Load saved checks when user changes
  useEffect(() => {
    if (currentUser && !currentUser.uid.startsWith('demo-')) {
      getUserSavedChecks(currentUser.uid).then(setSavedChecks);
    }
  }, [currentUser]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
    setCurrentUser(null);
    setSavedChecks([]);
  };

  // Filtered interactions for search tab based on executed search
  const allSearchResults = searchInteractions(interactions, searchExecutedTerm, 'Todos');
  const filteredInteractions =
    severityFilter === 'all'
      ? allSearchResults
      : allSearchResults.filter((it) => it.severity === severityFilter);
  const allDrugNames = getAllUniqueDrugNames(interactions);

  // Handle saving a check from CombinationChecker
  const handleSaveCheck = async (drugs: string[], interactionsCount: number, maxSeverity: any) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    const newSaved = await saveUserCheck(
      currentUser.uid,
      drugs,
      interactionsCount,
      maxSeverity,
      `Consulta em ${new Date().toLocaleDateString('pt-BR')}`
    );

    setSavedChecks([newSaved, ...savedChecks]);
  };

  // Handle deleting a check
  const handleDeleteCheck = async (id: string) => {
    await deleteSavedCheck(id);
    setSavedChecks(savedChecks.filter(c => c.id !== id));
  };

  // Handle opening AI Advisor (gated by auth)
  const handleOpenAI = (drugA: string = '', drugB: string = '') => {
    if (!currentUserRef.current) {
      setPendingAction({ kind: 'advice', drugA, drugB });
      setAuthGateMessage(
        'Cadastre-se ou entre para obter orientação farmacêutica personalizada.'
      );
      setIsAuthModalOpen(true);
      return;
    }
    setAiInitialDrugA(drugA);
    setAiInitialDrugB(drugB);
    setIsAIModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-lime-300 selection:text-slate-950">
      
      {/* NAVBAR */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onOpenAIModal={() => handleOpenAI()}
        onOpenInstall={() => setIsInstallModalOpen(true)}
        showInstallButton={showInstallButton}
        savedCount={savedChecks.length}
      />

      {/* AVISO CLINICO PERMANENTE */}
      <ClinicalDisclaimer />

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 pb-16">
        
        {/* TAB 1: BUSCA DE INTERAÇÕES (CENTER SEARCH HERO + CARDS) */}
        {activeTab === 'search' && (
          <div>
            <SearchHero
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              allDrugNames={allDrugNames}
              onExecuteSearch={handleExecuteSearch}
              isSearchLoading={isSearchLoading}
            />

            {/* Top-level toggle Monografia / Interações (only when we have a monograph context) */}
            {searchExecutedTerm && (isMonographLoading || monograph) && (
              <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-6 sm:mt-8">
                <div
                  role="tablist"
                  aria-label="Modo de visualização"
                  className="inline-flex items-center bg-white border border-slate-200 rounded-full p-1 shadow-2xs"
                >
                  <button
                    role="tab"
                    aria-selected={monographTab === 'monograph'}
                    type="button"
                    onClick={() => setMonographTab('monograph')}
                    className={`h-9 px-4 rounded-full text-[12.5px] font-semibold transition-colors cursor-pointer ${
                      monographTab === 'monograph'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Monografia
                  </button>
                  <button
                    role="tab"
                    aria-selected={monographTab === 'interactions'}
                    type="button"
                    onClick={() => setMonographTab('interactions')}
                    className={`h-9 px-4 rounded-full text-[12.5px] font-semibold transition-colors cursor-pointer ${
                      monographTab === 'interactions'
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Interações
                  </button>
                </div>
              </div>
            )}

            {/* CARDS LIST CONTAINER / REAL-TIME LOADING */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-6 sm:mt-6">
              {/* Monograph panel */}
              {searchExecutedTerm && monographTab === 'monograph' && (isMonographLoading || monograph) && (
                <>
                  {isMonographLoading && !monograph ? (
                    <DrugMonograph
                      loading
                      monograph={{
                        drug: '',
                        dosage: {
                          therapeuticClass: '',
                          regulatoryClass: '',
                          presentations: [],
                          adultStandard: [],
                          maxDailyDose: '',
                        },
                        adjustment: { renal: [], hepatic: '', pregnancy: '', lactation: '' },
                        pharmacokinetics: {
                          onsetByRoute: [],
                          halfLife: '',
                          duration: '',
                          metabolism: '',
                          proteinBinding: '',
                          excretion: '',
                        },
                        administration: { routes: [], dilution: [], oralCare: '', stability: '' },
                      }}
                    />
                  ) : monograph ? (
                    <DrugMonograph monograph={monograph} />
                  ) : null}
                </>
              )}

              {/* Interactions panel — shown when the toggle is 'interactions' OR when there's no monograph context */}
              {(!searchExecutedTerm || monographTab === 'interactions' || (!isMonographLoading && !monograph)) && (
                <>
              {loadingData ? (
                <div className="py-16 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 text-lime-600 animate-spin mx-auto mb-3" />
                  <p className="text-sm font-medium">Carregando banco de interações...</p>
                </div>
              ) : isSearchLoading ? (
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center justify-between px-1 text-[12px] text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-lime-600 animate-spin" />
                      Consultando{' '}
                      <span className="font-serif text-slate-900 italic">
                        "{searchExecutedTerm}"
                      </span>
                    </span>
                  </div>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 overflow-hidden relative"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse shrink-0" />
                        <div className="flex-1 space-y-2.5 min-w-0">
                          <div className="h-4 w-2/3 rounded-md bg-slate-200 animate-pulse" />
                          <div className="h-3 w-1/3 rounded-md bg-slate-100 animate-pulse" />
                          <div className="pt-2 space-y-1.5">
                            <div className="h-3 w-full rounded-md bg-slate-100 animate-pulse" />
                            <div className="h-3 w-11/12 rounded-md bg-slate-100 animate-pulse" />
                            <div className="h-3 w-9/12 rounded-md bg-slate-100 animate-pulse" />
                          </div>
                        </div>
                      </div>
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-lime-400 to-transparent animate-[pulse_1.4s_ease-in-out_infinite]" />
                    </div>
                  ))}
                </div>
              ) : !searchExecutedTerm ? (
                <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-slate-200 max-w-xl mx-auto my-8">
                  <div className="w-12 h-12 bg-lime-50 text-lime-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-lime-100">
                    <Search className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 mb-2">
                    Pronto para consultar
                  </h3>
                  <p className="text-[14px] text-slate-600 leading-relaxed max-w-sm mx-auto">
                    Digite um medicamento no campo acima. As interações aparecem em
                    tempo real conforme você escreve.
                  </p>
                </div>
              ) : filteredInteractions.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 sm:p-10 text-center border border-slate-200 max-w-xl mx-auto my-8">
                  <AlertCircle className="w-9 h-9 text-amber-500 mx-auto mb-3" />
                  <h3 className="font-serif text-xl font-semibold text-slate-900">
                    Nada encontrado para{' '}
                    <span className="italic">"{searchExecutedTerm}"</span>
                  </h3>
                  <p className="text-[13px] text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                    Verifique a grafia ou tente Warfarina, Sinvastatina, Ibuprofeno,
                    Fluoxetina, Aspirina.
                  </p>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSearchExecutedTerm('');
                    }}
                    className="mt-4 h-10 px-5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[13px] rounded-full transition-colors cursor-pointer"
                  >
                    Limpar consulta
                  </button>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {/* Cabeçalho de impressão — visível apenas em PDF */}
                  <div className="hidden print:block mb-6 pb-4 border-b-2 border-slate-900">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-lime-400 flex items-center justify-center">
                          <Pill className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <div>
                          <div className="font-serif text-xl font-semibold text-slate-900">
                            Interafarma
                          </div>
                          <div className="text-[10px] uppercase tracking-[0.14em] text-slate-600">
                            Análise de interações medicamentosas
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-[10px] text-slate-600">
                        <div>
                          <strong>Data/hora:</strong>{' '}
                          {new Date().toLocaleString('pt-BR')}
                        </div>
                        <div>interafarmaoficial.vercel.app</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-slate-800 mt-2">
                      <div>
                        <span className="text-slate-500 uppercase tracking-[0.1em] text-[9px] font-semibold block">
                          Consulta
                        </span>
                        <span className="font-serif italic">{searchExecutedTerm}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase tracking-[0.1em] text-[9px] font-semibold block">
                          Interações identificadas
                        </span>
                        <span className="font-mono">
                          {filteredInteractions.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[12px] text-slate-500 print:hidden">
                    <span className="inline-flex items-center gap-1.5">
                      <span>Resultado para</span>
                      <span className="font-serif italic text-slate-900">
                        "{searchExecutedTerm}"
                      </span>
                      {lastResponseMs !== null && (
                        <span className="inline-flex items-center gap-1 text-slate-400 font-mono text-[11px] ml-1">
                          <Zap className="w-3 h-3 text-lime-600" />
                          {(lastResponseMs / 1000).toFixed(2)}s
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopySummary}
                        title="Copiar resumo para WhatsApp/email"
                        aria-label="Copiar resumo para área de transferência"
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white border border-slate-300 hover:border-slate-500 hover:bg-slate-50 text-slate-700 hover:text-slate-950 text-[12px] font-semibold transition-colors cursor-pointer"
                      >
                        {copiedSummary ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar resumo</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handlePrint}
                        title="Imprimir ou salvar como PDF"
                        aria-label="Imprimir ou salvar como PDF"
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white border border-slate-300 hover:border-slate-500 hover:bg-slate-50 text-slate-700 hover:text-slate-950 text-[12px] font-semibold transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>PDF</span>
                      </button>
                      <span className="font-mono text-[11px] text-slate-400 ml-1">
                        {filteredInteractions.length}
                      </span>
                    </div>
                  </div>

                  {currentDrugList.length >= 2 && (
                    <PolypharmacySummary
                      drugs={currentDrugList}
                      interactions={allSearchResults}
                      activeFilter={severityFilter}
                      onFilterChange={setSeverityFilter}
                    />
                  )}

                  {filteredInteractions.map((item) => (
                    <InteractionCard
                      key={item.id}
                      interaction={item}
                      onAskAIAdvice={handleOpenAI}
                      onSuggestRewrite={handleSuggestRewrite}
                      onSaveInteraction={(interactionItem) => {
                        handleSaveCheck(
                          [interactionItem.drugA, interactionItem.drugB],
                          1,
                          interactionItem.severity
                        );
                      }}
                    />
                  ))}
                </div>
              )}
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: VERIFICADOR MULTI-DROGAS */}
        {activeTab === 'checker' && (
          <CombinationChecker
            allInteractions={interactions}
            allDrugNames={allDrugNames}
            onSaveCheck={handleSaveCheck}
            onAskAIAdvice={handleOpenAI}
          />
        )}

        {/* TAB 3: GUIA DE SEGURANÇA */}
        {activeTab === 'guide' && <SafetyGuide />}

        {/* HISTORICO DO USUARIO */}
        {activeTab === 'saved' && (
          <SavedChecks
            currentUser={currentUser}
            savedChecks={savedChecks}
            onDeleteCheck={handleDeleteCheck}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onLoadCheckDrugs={(drugs) => {
              // Reabrir consulta: volta pra aba de busca e re-executa
              setActiveTab('search');
              const label = drugs.join(', ');
              handleExecuteSearch({ term: label, drugs });
            }}
          />
        )}

        {/* Rodapé exclusivo do PDF — aparece só na impressão */}
        <div className="hidden print:block mt-8 pt-3 border-t border-slate-400 text-[9px] text-slate-700 leading-relaxed">
          <p className="mb-1">
            <strong>Aviso clínico:</strong> Ferramenta de apoio à decisão clínica com fins
            educacionais. Não substitui o julgamento clínico do profissional habilitado nem
            constitui dispositivo médico registrado. Toda decisão terapêutica deve considerar
            o quadro clínico completo do paciente.
          </p>
          <p>
            <strong>Fontes consultadas:</strong> Micromedex · Stockley Drug Interactions ·
            SciELO · PubMed · Anvisa Bulário Eletrônico · FDA Label · DrugBank
          </p>
          <p className="mt-1 font-mono">
            Documento gerado em {new Date().toLocaleString('pt-BR')} ·
            interafarmaoficial.vercel.app
          </p>
        </div>
      </main>

      <footer className="bg-slate-950 text-slate-300 border-t border-slate-800 mt-auto pb-safe print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-lime-400 text-slate-950 flex items-center justify-center">
                <Pill className="w-4.5 h-4.5 stroke-[2.5]" />
              </div>
              <div>
                <span className="block font-serif text-lg font-semibold tracking-tight text-white">
                  Interafarma
                </span>
                <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                  Interações medicamentosas
                </span>
              </div>
            </div>

            <p className="max-w-md text-[12px] leading-relaxed text-slate-400">
              <span className="text-slate-200 font-semibold">Aviso clínico.</span>{' '}
              As informações desta plataforma têm fins educacionais e de apoio à
              decisão clínica. Não substituem avaliação e prescrição por médico ou
              farmacêutico habilitado.
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-800 text-[11px] text-slate-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <span>© {new Date().getFullYear()} Interafarma. Todos os direitos reservados.</span>
            <span className="font-mono text-slate-600">v1.0</span>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthGateMessage(undefined);
          setPendingSearch(null);
          setPendingAction(null);
        }}
        gateMessage={authGateMessage}
        onAuthSuccess={(user) => {
          setCurrentUser(user);
          currentUserRef.current = user; // sync ref imediatamente
          setAuthGateMessage(undefined);

          // Executar acao pendente que causou o gate
          const search = pendingSearch;
          const action = pendingAction;
          setPendingSearch(null);
          setPendingAction(null);

          setTimeout(() => {
            if (search) {
              handleExecuteSearch(search);
            } else if (action) {
              if (action.kind === 'rewrite') {
                setRewritePair([action.drugA, action.drugB]);
                setIsRewriteOpen(true);
              } else if (action.kind === 'advice') {
                setAiInitialDrugA(action.drugA);
                setAiInitialDrugB(action.drugB);
                setIsAIModalOpen(true);
              }
            }
          }, 250);

          // Convida a instalar o PWA — uma vez por usuario, apos login,
          // se dispositivo suporta e ainda nao pediu.
          if (
            !isInstalled &&
            !wasPreviouslyPrompted() &&
            (canInstallNatively || installPlatform === 'ios')
          ) {
            setTimeout(() => setIsInstallModalOpen(true), 1200);
          }
        }}
      />

      <AIAdvisorModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        initialDrugA={aiInitialDrugA}
        initialDrugB={aiInitialDrugB}
        allDrugNames={allDrugNames}
      />

      <PrescriptionRewriteModal
        isOpen={isRewriteOpen}
        onClose={() => setIsRewriteOpen(false)}
        drugs={
          currentDrugList.length >= 2
            ? currentDrugList
            : rewritePair
            ? [rewritePair[0], rewritePair[1]]
            : []
        }
        conflictingPair={rewritePair}
      />

      {/* Loading overlay animado — profissional, centralizado, com etapas */}
      <LoadingOverlay
        isOpen={isSearchLoading}
        drugs={currentDrugList.length > 0 ? currentDrugList : searchExecutedTerm ? [searchExecutedTerm] : []}
        mode="interactions"
      />

      {/* Popup de instalacao do PWA */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* Toast discreto */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 print:hidden animate-[fadeIn_0.2s_ease]">
          <div className="bg-slate-900 text-white text-[13px] font-semibold px-4 py-2.5 rounded-full shadow-lg inline-flex items-center gap-2">
            <BookmarkCheck className="w-4 h-4 text-lime-400" />
            {toast}
          </div>
        </div>
      )}

    </div>
  );
}
