import { useCallback, useEffect, useState } from 'react';

/**
 * Evento nativo `beforeinstallprompt` do PWA (Chrome/Edge/Android/Samsung).
 * Safari (iOS/macOS) NÃO dispara — precisa de instrução manual.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
}

export type PWAPlatform = 'installable' | 'ios' | 'installed' | 'unsupported';

const DISMISSED_KEY = 'interafarma:install-dismissed';
const PROMPTED_KEY = 'interafarma:install-prompted';

/**
 * Registra o service worker (uma vez na inicialização do app).
 * Silenciosa em desenvolvimento e ambientes sem suporte.
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        // Verifica atualizações a cada 60 min
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      })
      .catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
  });
}

/**
 * Retorna se o app já está rodando como PWA instalado (standalone mode).
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari iOS coloca navigator.standalone quando app foi adicionado à home
    (window.navigator as any).standalone === true
  );
}

/**
 * Detecta se é iOS/iPadOS via user agent.
 * Necessário porque Safari não suporta beforeinstallprompt.
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent.toLowerCase();
  return (
    /iphone|ipad|ipod/.test(ua) ||
    // iPad OS moderno se identifica como Mac; distinguir via touchpoints
    (/mac/.test(ua) && 'ontouchend' in document)
  );
}

/**
 * Hook principal — expõe estado e função de instalação.
 * Compatível com Chrome/Edge/Firefox/Samsung Browser + iOS Safari.
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [platform, setPlatform] = useState<PWAPlatform>('unsupported');
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    // Detecta se já está instalado
    const standalone = isStandalone();
    setIsInstalled(standalone);

    if (standalone) {
      setPlatform('installed');
      return;
    }

    if (isIOS()) {
      setPlatform('ios');
    } else {
      setPlatform('unsupported'); // ainda sem prompt; muda quando beforeinstallprompt dispara
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPlatform('installable');
    };

    const installedHandler = () => {
      setIsInstalled(true);
      setPlatform('installed');
      setDeferredPrompt(null);
      try {
        localStorage.setItem(PROMPTED_KEY, 'true');
      } catch {}
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!deferredPrompt) return 'unavailable';
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      try {
        localStorage.setItem(PROMPTED_KEY, 'true');
        if (outcome === 'dismissed') {
          localStorage.setItem(DISMISSED_KEY, new Date().toISOString());
        }
      } catch {}
      return outcome;
    } catch {
      return 'unavailable';
    }
  }, [deferredPrompt]);

  const markPrompted = useCallback((dismissed: boolean = false) => {
    try {
      localStorage.setItem(PROMPTED_KEY, 'true');
      if (dismissed) {
        localStorage.setItem(DISMISSED_KEY, new Date().toISOString());
      }
    } catch {}
  }, []);

  const wasPreviouslyPrompted = (): boolean => {
    try {
      return localStorage.getItem(PROMPTED_KEY) === 'true';
    } catch {
      return false;
    }
  };

  return {
    platform,
    isInstalled,
    canInstallNatively: !!deferredPrompt,
    install,
    markPrompted,
    wasPreviouslyPrompted,
  };
}
