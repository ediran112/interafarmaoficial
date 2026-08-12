import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  doc, 
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { DrugInteraction, SavedCheck } from '../types';
import { INITIAL_30_INTERACTIONS } from '../data/interactionsData';

const COLLECTION_INTERACTIONS = 'drug_interactions';
const COLLECTION_SAVED_CHECKS = 'saved_checks';

// Utility to normalize string for comparison (accent-insensitive, lowercase)
export function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Seed the 30 initial interactions into Firestore if empty
export async function seedInitialInteractionsIfNeeded(): Promise<DrugInteraction[]> {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_INTERACTIONS));
    if (querySnapshot.empty) {
      console.log('Seeding initial 30 interactions into Firestore...');
      const seededList: DrugInteraction[] = [];
      for (const interaction of INITIAL_30_INTERACTIONS) {
        const docRef = await addDoc(collection(db, COLLECTION_INTERACTIONS), {
          ...interaction,
          createdAt: new Date().toISOString()
        });
        seededList.push({
          id: docRef.id,
          ...interaction
        });
      }
      return seededList;
    } else {
      const list: DrugInteraction[] = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<DrugInteraction, 'id'>) });
      });
      return list;
    }
  } catch (error) {
    console.warn('Firestore fetch failed or offline, using local 30 interactions dataset:', error);
    return INITIAL_30_INTERACTIONS.map((item, index) => ({
      id: `local-${index}`,
      ...item
    }));
  }
}

// Search interactions by search term (drug name or category)
export function searchInteractions(
  interactions: DrugInteraction[], 
  searchTerm: string, 
  severityFilter: string = 'Todos'
): DrugInteraction[] {
  const normSearch = normalizeText(searchTerm);
  
  return interactions.filter((item) => {
    // Severity filter check
    if (severityFilter !== 'Todos' && item.severity !== severityFilter) {
      return false;
    }

    if (!normSearch) return true;

    const normA = normalizeText(item.drugA);
    const normB = normalizeText(item.drugB);
    const normCategory = normalizeText(item.category || '');
    const normMech = normalizeText(item.mechanism || '');
    const normEffect = normalizeText(item.effect || '');
    
    const synA = item.synonymsA?.some(s => normalizeText(s).includes(normSearch)) || false;
    const synB = item.synonymsB?.some(s => normalizeText(s).includes(normSearch)) || false;

    // Direct match
    if (
      normA.includes(normSearch) ||
      normB.includes(normSearch) ||
      normCategory.includes(normSearch) ||
      normMech.includes(normSearch) ||
      normEffect.includes(normSearch) ||
      synA ||
      synB
    ) {
      return true;
    }

    // Smart multi-word search (e.g. "hidroxicloroquina e fluoxetina", "pode tomar dipirona com ibuprofeno?")
    const stopWords = new Set(['pode', 'tomar', 'posso', 'misturar', 'junto', 'com', 'interacao', 'interacoes', 'entre', 'quais', 'para', 'faz', 'mal', 'usar', 'usando', 'medicamento', 'remedio', 'remedios', 'droga', 'drogas']);
    
    const rawWords = normSearch
      .split(/\s+(?:e|ou|e\/ou|\+|\*|\/|,|;|com)\s+|\s*[,;\+\/\?\!]\s*|\s+/)
      .map(w => w.trim().replace(/[^\w\sà-ú]/gi, ''))
      .filter(w => w.length >= 3 && !stopWords.has(w));

    if (rawWords.length > 0) {
      const allWordsMatch = rawWords.every(word => {
        const inA = normA.includes(word) || item.synonymsA?.some(s => normalizeText(s).includes(word));
        const inB = normB.includes(word) || item.synonymsB?.some(s => normalizeText(s).includes(word));
        const inOther = normCategory.includes(word) || normMech.includes(word) || normEffect.includes(word);
        return inA || inB || inOther;
      });

      if (allWordsMatch) return true;

      const anyWordMatches = rawWords.some(word => {
        return (
          normA.includes(word) ||
          normB.includes(word) ||
          item.synonymsA?.some(s => normalizeText(s).includes(word)) ||
          item.synonymsB?.some(s => normalizeText(s).includes(word))
        );
      });

      if (anyWordMatches) return true;
    }

    return false;
  });
}

// Check specific interaction between two or more drugs
export function findInteractionsForDrugList(
  interactions: DrugInteraction[], 
  drugList: string[]
): DrugInteraction[] {
  if (drugList.length < 2) return [];

  const normList = drugList.map(d => normalizeText(d));

  return interactions.filter((item) => {
    const itemA = normalizeText(item.drugA);
    const itemB = normalizeText(item.drugB);

    // Check if both drugA and drugB (or their synonyms) match items in the user's drugList
    const matchesA = normList.some(userDrug => 
      itemA.includes(userDrug) || userDrug.includes(itemA) ||
      (item.synonymsA && item.synonymsA.some(syn => normalizeText(syn).includes(userDrug)))
    );

    const matchesB = normList.some(userDrug => 
      itemB.includes(userDrug) || userDrug.includes(itemB) ||
      (item.synonymsB && item.synonymsB.some(syn => normalizeText(syn).includes(userDrug)))
    );

    return matchesA && matchesB;
  });
}

// Extract unique drug names from database for autocomplete suggestions
export function getAllUniqueDrugNames(interactions: DrugInteraction[]): string[] {
  const namesSet = new Set<string>();
  interactions.forEach(item => {
    namesSet.add(item.drugA);
    namesSet.add(item.drugB);
    item.synonymsA?.forEach(s => namesSet.add(s));
    item.synonymsB?.forEach(s => namesSet.add(s));
  });
  return Array.from(namesSet).sort();
}

// Save a check to user's saved checks collection
export async function saveUserCheck(
  userId: string,
  drugs: string[],
  foundInteractionsCount: number,
  maxSeverity: SavedCheck['maxSeverity'],
  notes: string = ''
): Promise<SavedCheck> {
  const newCheck: Omit<SavedCheck, 'id'> = {
    userId,
    drugs,
    foundInteractionsCount,
    maxSeverity,
    notes,
    createdAt: new Date().toISOString()
  };

  try {
    const docRef = await addDoc(collection(db, COLLECTION_SAVED_CHECKS), newCheck);
    return { id: docRef.id, ...newCheck };
  } catch (err) {
    console.error('Error saving check:', err);
    return { id: `local-saved-${Date.now()}`, ...newCheck };
  }
}

/**
 * Save a search result to the user history with full breakdown.
 * Called automatically after every successful search when the user is logged in.
 * Returns null if save failed (fires silently — never blocks the UI).
 */
export async function saveSearchToHistory(params: {
  userId: string;
  drugs: string[];
  queryText: string;
  interactions: DrugInteraction[];
  provider?: string;
  notes?: string;
}): Promise<SavedCheck | null> {
  const { userId, drugs, queryText, interactions, provider = 'openai', notes = '' } = params;

  const countsBySeverity = { grave: 0, moderada: 0, leve: 0 };
  interactions.forEach((it) => {
    if (it.severity === 'Grave') countsBySeverity.grave++;
    else if (it.severity === 'Moderada') countsBySeverity.moderada++;
    else if (it.severity === 'Leve') countsBySeverity.leve++;
  });

  const maxSeverity: SavedCheck['maxSeverity'] =
    countsBySeverity.grave > 0
      ? 'Grave'
      : countsBySeverity.moderada > 0
      ? 'Moderada'
      : countsBySeverity.leve > 0
      ? 'Leve'
      : 'Nenhuma';

  const newCheck: Omit<SavedCheck, 'id'> = {
    userId,
    drugs: drugs.length > 0 ? drugs : [queryText],
    queryText,
    foundInteractionsCount: interactions.length,
    countsBySeverity,
    maxSeverity,
    provider,
    notes,
    createdAt: new Date().toISOString(),
  };

  try {
    const docRef = await addDoc(collection(db, COLLECTION_SAVED_CHECKS), newCheck);
    return { id: docRef.id, ...newCheck };
  } catch (err) {
    console.warn('Auto-save falhou (usuario nao autenticado ou regras Firestore):', err);
    return null;
  }
}

// Fetch user saved checks
export async function getUserSavedChecks(userId: string): Promise<SavedCheck[]> {
  try {
    const q = query(collection(db, COLLECTION_SAVED_CHECKS), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const results: SavedCheck[] = [];
    querySnapshot.forEach((docSnap) => {
      results.push({ id: docSnap.id, ...(docSnap.data() as Omit<SavedCheck, 'id'>) });
    });
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('Error fetching user saved checks:', err);
    return [];
  }
}

// Delete a user saved check
export async function deleteSavedCheck(checkId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_SAVED_CHECKS, checkId));
  } catch (err) {
    console.error('Error deleting saved check:', err);
  }
}
