import { useEffect, useState, useCallback } from 'react';
import { X, Smartphone, Laptop, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSiteSettings, getSetting } from '@/hooks/useSiteSettings';

/* ── Types ────────────────────────────────────────────────────────────── */

type Platform = 'android' | 'ios' | 'desktop' | null;
type DismissCause = 'installed' | 'dismissed' | 'later';

/* ── Constants ────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'cherubscove_pwa_dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/* ── Helpers ──────────────────────────────────────────────────────────── */

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return null;

  // Already in standalone PWA mode — don't prompt
  if (window.matchMedia('(display-mode: standalone)').matches) return null;
  if ((window.navigator as any).standalone === true) return null;

  const ua = navigator.userAgent.toLowerCase();

  // Android
  if (/android/.test(ua)) return 'android';
  // iOS (iPhone, iPad, iPod)
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  // Desktop
  return 'desktop';
}

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const { expiresAt } = JSON.parse(raw);
    return Date.now() < expiresAt;
  } catch {
    return false;
  }
}

function markDismissed(cause: DismissCause) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ cause, expiresAt: Date.now() + DISMISS_DURATION_MS }),
    );
  } catch { /* noop */ }
}

/* ── Component ────────────────────────────────────────────────────────── */

export default function PwaInstallPopup() {
  const settings = useSiteSettings();
  const [platform, setPlatform] = useState<Platform>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [animOut, setAnimOut] = useState(false);

  // ── Check if popup should be shown ────────────────────────────────────

  const shouldShow = useCallback(() => {
    const enabled = getSetting(settings, 'pwa_popup_enabled', 'true');
    if (enabled !== 'true') return false;
    if (isDismissed()) return false;
    return true;
  }, [settings]);

  // ── Close popup with animation ────────────────────────────────────────

  const closePopup = useCallback(() => {
    setAnimOut(true);
    setTimeout(() => {
      setShow(false);
      setAnimOut(false);
    }, 300);
  }, []);

  // ── Detect platform & listen for beforeinstallprompt ──────────────────

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);
    if (!p) return;
    if (!shouldShow()) return;

    // Listen for the native install prompt (Chrome/Edge Android & Desktop)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show our custom popup when the browser fires the prompt
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS doesn't support beforeinstallprompt — show instructions after a delay
    if (p === 'ios') {
      const timer = setTimeout(() => {
        if (shouldShow() && !deferredPrompt) {
          setShow(true);
        }
      }, 4000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    // Desktop without beforeinstallprompt (Firefox, Safari, etc.) — show after delay
    if (p === 'desktop') {
      const timer = setTimeout(() => {
        if (shouldShow() && !deferredPrompt) {
          setShow(true);
        }
      }, 6000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [shouldShow, deferredPrompt]);

  // ── Listen for app installed ──────────────────────────────────────────

  useEffect(() => {
    const handler = () => {
      markDismissed('installed');
      closePopup();
    };
    window.addEventListener('appinstalled', handler);
    return () => window.removeEventListener('appinstalled', handler);
    // closePopup is stable (no deps), so safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handle "Install" click (native prompt) ────────────────────────────

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') {
        markDismissed('installed');
        closePopup();
      }
      setDeferredPrompt(null);
    }
  }, [deferredPrompt, closePopup]);

  // ── Handle dismiss ────────────────────────────────────────────────────

  const handleDismiss = useCallback(() => {
    markDismissed('dismissed');
    closePopup();
  }, [closePopup]);

  const handleLater = useCallback(() => {
    markDismissed('later');
    closePopup();
  }, [closePopup]);

  // ── Don't render if we shouldn't show ─────────────────────────────────

  if (!show) return null;

  // ── Dynamic values from admin settings ─────────────────────────────────

  const appName = getSetting(settings, 'pwa_short_name', 'Cherubs Cove');
  const popupTitle = getSetting(settings, 'pwa_popup_title', `Install ${appName}`);
  const popupDesc = getSetting(
    settings,
    'pwa_popup_description',
    'Install our app for a faster, offline-ready experience.',
  );

  const isMobile = platform === 'android' || platform === 'ios';

  return (
    <div
      className={`fixed inset-x-0 z-[9999] flex items-end justify-center px-4 pb-4 sm:pb-6 pointer-events-none ${
        platform === 'desktop' ? 'bottom-6' : 'bottom-0'
      }`}
    >
      <div
        className={`pointer-events-auto w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-900/95 p-5 shadow-2xl shadow-black/60 backdrop-blur-xl transition-all duration-300 ${
          animOut
            ? 'translate-y-8 opacity-0 scale-95'
            : 'translate-y-0 opacity-100 scale-100'
        }`}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#E8620A] to-orange-600 text-white shadow-lg">
              {isMobile ? <Smartphone size={22} /> : <Laptop size={22} />}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100 leading-tight">
                {popupTitle}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {platform === 'android' && 'Android'}
                {platform === 'ios' && 'iOS'}
                {platform === 'desktop' && 'Desktop'}
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 rounded-full p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Description ─────────────────────────────────────────────── */}
        <p className="text-sm text-slate-300 mb-4 leading-relaxed">
          {isMobile
            ? getSetting(
                settings,
                'pwa_popup_mobile_message',
                popupDesc,
              )
            : getSetting(
                settings,
                'pwa_popup_desktop_message',
                popupDesc,
              )}
        </p>

        {/* ── iOS Instructions (no native prompt) ─────────────────────── */}
        {platform === 'ios' && (
          <div className="mb-4 rounded-xl bg-slate-800/70 p-4 text-sm text-slate-300 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-[11px] font-bold text-slate-300">
                1
              </span>
              <span>
                Tap <span className="inline-flex items-center gap-1 rounded bg-slate-700 px-1.5 py-0.5 text-xs font-medium text-slate-200"><Share2 size={12} /> Share</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-[11px] font-bold text-slate-300">
                2
              </span>
              <span>
                Scroll down & tap <span className="inline-flex items-center gap-1 rounded bg-slate-700 px-1.5 py-0.5 text-xs font-medium text-slate-200"><Download size={12} /> Add to Home Screen</span>
              </span>
            </div>
          </div>
        )}

        {/* ── Desktop instructions (no native prompt) ─────────────────── */}
        {platform === 'desktop' && !deferredPrompt && (
          <div className="mb-4 rounded-xl bg-slate-800/70 p-4 text-sm text-slate-300 space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-[11px] font-bold text-slate-300">
                1
              </span>
              <span>
                Click the <span className="inline-flex items-center gap-1 rounded bg-slate-700 px-1.5 py-0.5 text-xs font-medium text-slate-200"><Download size={12} /> install</span> icon in the address bar
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-[11px] font-bold text-slate-300">
                2
              </span>
              <span>Or use Chrome / Edge for the best experience</span>
            </div>
          </div>
        )}

        {/* ── Actions ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          {(deferredPrompt || platform === 'android') && (
            <Button
              onClick={handleInstall}
              className="flex-1 bg-[#E8620A] hover:bg-[#cf5709] text-white font-medium"
            >
              <Download size={16} className="mr-1.5" />
              Install App
            </Button>
          )}
          <Button
            onClick={handleLater}
            variant="outline"
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            Maybe Later
          </Button>
        </div>
      </div>
    </div>
  );
}
