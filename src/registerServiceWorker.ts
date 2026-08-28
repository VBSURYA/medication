// PWA Service Worker Registration & Install Prompt Manager

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

type InstallPromptListener = (event: BeforeInstallPromptEvent | null) => void;
const listeners = new Set<InstallPromptListener>();
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let isAppInstalled = false;

// Register Service Worker
export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });
    });

    // Check if running in standalone mode (already installed)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      isAppInstalled = true;
    }

    // Capture install prompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      notifyListeners();
    });

    // Track app installation completion
    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      isAppInstalled = true;
      notifyListeners();
      console.log('[PWA] App successfully installed to device!');
    });
  }
}

function notifyListeners() {
  listeners.forEach((listener) => listener(deferredPrompt));
}

export function subscribeInstallPrompt(listener: InstallPromptListener) {
  listeners.add(listener);
  // Send initial state
  listener(deferredPrompt);
  return () => {
    listeners.delete(listener);
  };
}

export function getDeferredPrompt() {
  return deferredPrompt;
}

export function getIsInstalled() {
  return isAppInstalled;
}

export async function promptInstallApp(): Promise<'accepted' | 'dismissed' | 'manual'> {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      deferredPrompt = null;
      notifyListeners();
    }
    return outcome;
  }
  return 'manual';
}
