import {
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { db } from './firebase';

// A chave publica VAPID e injetada em build via .env / Vercel env (VITE_ prefix).
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';

/** Se o browser suporta Notification + PushManager + SW. */
export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getPushPermission(): PushPermission {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission as PushPermission;
}

/** Converte VAPID key base64url em Uint8Array (formato exigido por pushManager). */
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

/**
 * Pede permissao, cria (ou reutiliza) subscription e persiste no Firestore.
 * Retorna 'granted' | 'denied' | 'unsupported' | 'error'.
 */
export async function subscribeUser(
  userId: string
): Promise<'granted' | 'denied' | 'unsupported' | 'error'> {
  if (!pushSupported()) return 'unsupported';
  if (!VAPID_PUBLIC_KEY) {
    console.warn('VITE_VAPID_PUBLIC_KEY não configurada — notificações desabilitadas.');
    return 'error';
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    await saveSubscription(userId, sub);
    return 'granted';
  } catch (err) {
    console.warn('Erro ao ativar notificações:', err);
    return 'error';
  }
}

async function saveSubscription(userId: string, sub: PushSubscription): Promise<void> {
  const json = sub.toJSON();
  const endpoint = json.endpoint!;
  const keys = json.keys as { p256dh: string; auth: string };

  // Evita duplicar: se ja existe subscription com esse endpoint pra esse usuario, nao insere novamente
  const existingQ = query(
    collection(db, 'push_subscriptions'),
    where('userId', '==', userId),
    where('endpoint', '==', endpoint)
  );
  const existing = await getDocs(existingQ);
  if (!existing.empty) return;

  await addDoc(collection(db, 'push_subscriptions'), {
    userId,
    endpoint,
    keys,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    platform: detectPlatform(),
    createdAt: new Date().toISOString(),
  });
}

/**
 * Cancela subscription local e remove do Firestore.
 */
export async function unsubscribeUser(): Promise<boolean> {
  if (!pushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return true;

    const endpoint = sub.endpoint;
    await sub.unsubscribe();

    // Limpa Firestore
    const q = query(collection(db, 'push_subscriptions'), where('endpoint', '==', endpoint));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
    return true;
  } catch (err) {
    console.warn('Erro ao desativar notificações:', err);
    return false;
  }
}

function detectPlatform(): string {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Windows/.test(ua)) return 'windows';
  if (/Macintosh|Mac OS/.test(ua)) return 'macos';
  if (/Linux/.test(ua)) return 'linux';
  return 'unknown';
}
