import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Download, 
  X, 
  CheckCircle2, 
  Share, 
  PlusSquare, 
  Volume2, 
  WifiOff, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { 
  subscribeInstallPrompt, 
  promptInstallApp, 
  getIsInstalled,
  BeforeInstallPromptEvent 
} from '../registerServiceWorker.ts';

interface PwaInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PwaInstallModal: React.FC<PwaInstallModalProps> = ({ isOpen, onClose }) => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);

  useEffect(() => {
    // Check if device is iOS (Safari doesn't support beforeinstallprompt)
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isIosDevice);
      setIsInstalled(getIsInstalled());
    }

    const unsubscribe = subscribeInstallPrompt((prompt) => {
      setInstallPrompt(prompt);
      setIsInstalled(getIsInstalled());
    });

    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    const outcome = await promptInstallApp();
    if (outcome === 'accepted') {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  return (
    <div
      id="pwa-install-modal-overlay"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-modal-title"
    >
      <div
        id="pwa-install-card"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header with App Branding */}
        <div className="bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 text-white p-5 relative">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-teal-700/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 rounded-2xl bg-white p-2 shadow-md shrink-0 flex items-center justify-center">
              <img
                src="/icons/icon-192.png"
                alt="MedSchedule Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-teal-300 bg-teal-900/60 px-2 py-0.5 rounded-full border border-teal-500/30">
                <Sparkles className="w-2.5 h-2.5" /> Mobile Progressive Web App
              </span>
              <h3 id="pwa-modal-title" className="text-lg font-bold text-white leading-tight mt-0.5">
                Install MedSchedule
              </h3>
              <p className="text-xs text-teal-100/90">
                For patient phone home screen & loud alarm alerts
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {installSuccess ? (
            <div className="text-center py-6 space-y-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-900">App Installed Successfully!</h4>
              <p className="text-xs text-slate-600">
                MedSchedule is now on your phone's home screen.
              </p>
            </div>
          ) : isInstalled ? (
            <div className="text-center py-4 space-y-2">
              <div className="w-12 h-12 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center mx-auto">
                <Smartphone className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Already Installed on this Device</h4>
              <p className="text-xs text-slate-600">
                MedSchedule is running as a standalone installed application on your device.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Got It
              </button>
            </div>
          ) : (
            <>
              {/* Key Benefits for Patient */}
              <div className="grid grid-cols-1 gap-2.5">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-teal-50/70 border border-teal-100">
                  <div className="p-1.5 rounded-lg bg-teal-100 text-teal-800 shrink-0">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-teal-950">Loud Patient Alarms</h5>
                    <p className="text-[11px] text-teal-800 leading-snug">
                      High-volume medical audio chimes and phone vibration so you never miss a dose.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="p-1.5 rounded-lg bg-slate-200 text-slate-800 shrink-0">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">1-Tap Home Screen Launch</h5>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Opens like a real phone app without browser address bars or cluttered tabs.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="p-1.5 rounded-lg bg-slate-200 text-slate-800 shrink-0">
                    <WifiOff className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Offline Ready</h5>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Check your medicine timings and meal instructions even without internet.
                    </p>
                  </div>
                </div>
              </div>

              {/* Install Action Area */}
              {isIOS ? (
                /* iOS Safari instructions */
                <div className="mt-4 p-3.5 bg-indigo-50/80 rounded-xl border border-indigo-200 text-xs space-y-2">
                  <p className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <span>How to Install on iPhone / iPad (Safari):</span>
                  </p>
                  <ol className="space-y-1.5 text-[11px] text-indigo-900 list-decimal list-inside pl-1">
                    <li>
                      Tap the <Share className="w-3.5 h-3.5 inline mx-1 text-indigo-700" />{' '}
                      <strong>Share</strong> button at the bottom of Safari.
                    </li>
                    <li>
                      Scroll down and select{' '}
                      <span className="font-semibold text-indigo-950 inline-flex items-center gap-0.5">
                        <PlusSquare className="w-3.5 h-3.5 inline" /> Add to Home Screen
                      </span>
                      .
                    </li>
                    <li>
                      Tap <strong>Add</strong> in the top-right corner.
                    </li>
                  </ol>
                </div>
              ) : (
                /* Android / Chrome 1-tap install */
                <div className="pt-2 space-y-2">
                  <button
                    id="btn-confirm-pwa-install"
                    type="button"
                    onClick={handleInstallClick}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 active:scale-98 text-white text-sm font-bold shadow-md transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install App on this Phone / Device</span>
                  </button>

                  {!installPrompt && (
                    <p className="text-[11px] text-slate-500 text-center">
                      If prompted by browser, click <strong>"Install"</strong> or use browser menu{' '}
                      <span className="font-medium">⋮ &gt; "Install app"</span> /{' '}
                      <span className="font-medium">"Add to Home screen"</span>.
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          <div className="pt-1 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
