import React, { useEffect, useRef, useState } from 'react';
import { X, ExternalLink, Download, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { StoreItem, UserProfile } from '../types';
import { ItemIcon } from './ItemIcon';
import { syncVerifiedDownloadRewardToFirestore, trackAppOpenInFirestore } from '../firebase';
import { formatFileSize, formatShortSha256 } from '../utils/formatters';

interface LaunchAnimationModalProps {
  item: StoreItem;
  userId: string;
  onClose: () => void;
  onTracked: (updatedItem: StoreItem) => void;
  onUserUpdated?: (updatedUser: UserProfile) => void;
}

function getHostname(url: string): string {
  if (url.startsWith('/api/apk/download/')) {
    return 'KENİX Doğrulanmış APK Deposu';
  }
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function getDownloadFilename(url: string, fallbackTitle: string, preferredName?: string): string {
  if (preferredName && preferredName.trim()) {
    return preferredName.trim();
  }
  try {
    const parsed = new URL(url, window.location.origin);
    const segment = parsed.pathname.split('/').filter(Boolean).pop();
    if (segment && segment.includes('.')) return segment;
  } catch {
    // ignore URL parse error
  }
  const safeBase =
    fallbackTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '') || 'kenix-app';
  return `${safeBase}.apk`;
}

export const LaunchAnimationModal: React.FC<LaunchAnimationModalProps> = ({
  item,
  userId,
  onClose,
  onTracked,
  onUserUpdated
}) => {
  const targetUrl = (item.apkUrl || item.appUrl || item.gameplayUrl || '').trim();
  const isDownload = item.launchMode === 'download';

  const [progress, setProgress] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hasError, setHasError] = useState(!targetUrl);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    !targetUrl ? 'Bu uygulama için geçerli bir bağlantı tanımlanmamış.' : null
  );
  const [logoFailed, setLogoFailed] = useState(false);

  const actionAnchorRef = useRef<HTMLAnchorElement | null>(null);
  const trackedRef = useRef(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    if (!targetUrl) {
      setHasError(true);
      setErrorMessage('Bu uygulama için geçerli bir bağlantı tanımlanmamış.');
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;
    let current = 1;

    // Track link-mode open cleanly
    if (!isDownload && !trackedRef.current) {
      trackedRef.current = true;
      fetch(`/api/store/items/${encodeURIComponent(item.id)}/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'open' })
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.item) {
            onTracked(data.item);
          }
        })
        .catch(() => {
          // Non-blocking usage metric call
        });
      void trackAppOpenInFirestore(item.id).catch(() => {});
    }

    const completeVerifiedDownload = async () => {
      if (trackedRef.current) return;
      trackedRef.current = true;

      let clientBytes: number | undefined;
      let blobUrl: string | null = null;
      let clientHttpFailed = false;

      // Step 1: Attempt real client download verification if same-origin (/api/apk/download/...) or CORS permits
      try {
        const controller = new AbortController();
        const fetchTimeout = window.setTimeout(() => controller.abort(), 15000);
        const dlRes = await fetch(targetUrl, { signal: controller.signal });
        window.clearTimeout(fetchTimeout);

        if (!dlRes.ok) {
          clientHttpFailed = true;
        } else {
          const blob = await dlRes.blob();
          if (blob.size > 0) {
            clientBytes = blob.size;
            blobUrl = URL.createObjectURL(blob);
          } else {
            clientHttpFailed = true;
          }
        }
      } catch {
        // Cross-origin servers without CORS headers throw TypeError: verify via backend
      }

      if (cancelled) {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        return;
      }

      if (clientHttpFailed) {
        setHasError(true);
        setErrorMessage('İndirme dosyasına ulaşılamadı veya APK onay süreci tamamlanmamış.');
        return;
      }

      // Step 2: Verify on server and silently award 100 KS (once per app per user)
      try {
        const verifyRes = await fetch(
          `/api/store/items/${encodeURIComponent(item.id)}/verify-download`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, clientBytes })
          }
        );
        const verifyData = await verifyRes.json();

        if (!verifyRes.ok || !verifyData?.verified) {
          if (blobUrl) URL.revokeObjectURL(blobUrl);
          setHasError(true);
          setErrorMessage(
            verifyData?.error || 'İndirme işlemi doğrulanamadı. Lütfen bağlantıyı kontrol edin.'
          );
          return;
        }

        if (verifyData.item) {
          onTracked(verifyData.item);
        }
        // Silent 100 KS update (no alert/popup)
        if (verifyData.user && onUserUpdated) {
          onUserUpdated(verifyData.user);
        }

        // Trigger Firestore atomic 100 KS sync if user is signed in
        void syncVerifiedDownloadRewardToFirestore(item).catch(() => {});

        // Trigger the actual browser / Android WebView file download
        if (blobUrl) {
          const tempLink = document.createElement('a');
          tempLink.href = blobUrl;
          tempLink.download = getDownloadFilename(targetUrl, item.title, item.apkFileName);
          document.body.appendChild(tempLink);
          tempLink.click();
          document.body.removeChild(tempLink);
          window.setTimeout(() => URL.revokeObjectURL(blobUrl!), 8000);
        } else if (actionAnchorRef.current) {
          actionAnchorRef.current.click();
        }

        setIsCompleted(true);
      } catch {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
        setHasError(true);
        setErrorMessage('İndirme doğrulaması sırasında bağlantı hatası oluştu.');
      }
    };

    const checkpoints = [
      16 + Math.floor(Math.random() * 14),
      44 + Math.floor(Math.random() * 18),
      74 + Math.floor(Math.random() * 16)
    ];
    const pauseSet = new Set<number>(checkpoints);
    const speedFactor = 0.8 + Math.random() * 0.55;

    const tick = () => {
      if (cancelled) return;

      if (current >= 100) {
        setProgress(100);
        if (isDownload) {
          void completeVerifiedDownload();
        } else {
          setIsCompleted(true);
          window.setTimeout(() => {
            if (!cancelled && actionAnchorRef.current) {
              actionAnchorRef.current.click();
            }
          }, 120);
        }
        return;
      }

      const nearSlowZone =
        current >= 86 ||
        checkpoints.some((cp) => Math.abs(current - cp) <= 3);

      const step = nearSlowZone ? 1 : 1 + Math.floor(Math.random() * 3);
      current = Math.min(100, current + step);
      setProgress(current);

      let delayMs: number;
      if (pauseSet.has(current)) {
        pauseSet.delete(current);
        delayMs = Math.round((280 + Math.random() * 420) * speedFactor);
      } else if (current >= 88) {
        delayMs = Math.round((65 + Math.random() * 95) * speedFactor);
      } else if (nearSlowZone) {
        delayMs = Math.round((70 + Math.random() * 85) * speedFactor);
      } else {
        delayMs = Math.round((32 + Math.random() * 58) * speedFactor);
      }

      timeoutId = window.setTimeout(tick, delayMs);
    };

    timeoutId = window.setTimeout(tick, 90);

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [item, targetUrl, isDownload, userId, onTracked, onUserUpdated]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="launch-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#01040f]/92 backdrop-blur-md"
    >
      <div className="relative w-full max-w-xl min-h-[84dvh] sm:min-h-[560px] max-h-[94dvh] rounded-3xl kenix-navy-canvas kenix-neon-frame flex flex-col justify-between p-6 sm:p-10 overflow-y-auto">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-56 rounded-full kenix-neon-aura"
        />

        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="absolute top-3.5 right-3.5 z-20 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-300 hover:text-white hover:bg-blue-950/70 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <header className="relative z-10 pt-2 text-center select-none">
          <span className="text-2xl sm:text-3xl font-black tracking-[0.22em] kenix-text-neon-primary">
            KENIX
          </span>
        </header>

        <div className="relative z-10 my-auto py-6 flex flex-col items-center text-center space-y-5">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center">
            <div
              aria-hidden="true"
              className={`absolute inset-0 rounded-full border-2 border-blue-500/30 border-t-blue-400 border-r-cyan-300 shadow-[0_0_24px_rgba(59,130,246,0.6)] ${
                isCompleted || hasError ? '' : 'animate-kenix-orbit'
              }`}
            />
            <div className="relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#02081a] border border-blue-400/40 overflow-hidden flex items-center justify-center">
              {item.logoUrl && !logoFailed ? (
                <img
                  src={item.logoUrl}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  onError={() => setLogoFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ItemIcon name={item.icon} size={30} className="w-7 h-7 text-blue-300" />
              )}
            </div>
          </div>

          <div className="space-y-2 max-w-md w-full px-2">
            <h2
              id="launch-modal-title"
              className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight kenix-text-neon-secondary break-words"
            >
              {item.title}
            </h2>

            {hasError ? (
              <p className="text-sm font-medium text-rose-300 inline-flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage || 'Bu uygulama için geçerli bir bağlantı tanımlanmamış.'}</span>
              </p>
            ) : (
              <p className="text-sm sm:text-base font-medium text-blue-200/95">
                {isDownload ? `${item.title} APK indiriliyor...` : `${item.title} yükleniyor...`}
              </p>
            )}
          </div>

          {!hasError && (
            <div className="w-full max-w-sm space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs sm:text-sm font-bold tabular-nums text-blue-200">
                <span>{isCompleted ? 'Tamamlandı' : 'Hazırlanıyor'}</span>
                <span className="text-base sm:text-lg font-extrabold text-white">
                  %{progress}
                </span>
              </div>

              <div
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={100}
                aria-valuenow={progress}
                className="h-3 w-full rounded-full bg-[#02081a] border border-blue-500/40 overflow-hidden p-0.5"
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-300 transition-[width] duration-150 ease-out shadow-[0_0_14px_rgba(56,189,248,0.85)]"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <p className="text-xs font-mono text-blue-300/70 truncate">
                {getHostname(targetUrl)}
              </p>

              {(item.fileSizeBytes || item.apkSha256) && (
                <p className="text-[11px] font-mono text-emerald-300/90 inline-flex items-center justify-center gap-1.5 flex-wrap">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  {item.fileSizeBytes && <span>{formatFileSize(item.fileSizeBytes)}</span>}
                  {item.apkSha256 && <span>· SHA-256: {formatShortSha256(item.apkSha256)}</span>}
                </p>
              )}
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full max-w-sm">
            {targetUrl && (
              <a
                ref={actionAnchorRef}
                href={targetUrl}
                download={isDownload ? item.apkFileName || true : undefined}
                target={isDownload ? undefined : '_blank'}
                rel={isDownload ? undefined : 'noopener noreferrer'}
                className={`w-full sm:w-auto min-h-[44px] px-5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 transition-all ${
                  isCompleted && !hasError
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.65)]'
                    : 'opacity-0 pointer-events-none absolute'
                }`}
              >
                {isCompleted && !hasError && (
                  <>
                    {isDownload ? (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Doğrudan İndir</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        <span>Uygulamayı Şimdi Aç</span>
                      </>
                    )}
                  </>
                )}
              </a>
            )}

            {(isCompleted || hasError) && (
              <div className="w-full sm:w-auto flex items-center justify-center gap-2">
                {isCompleted && !hasError && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 sm:hidden">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto min-h-[44px] px-5 rounded-xl bg-slate-900/85 hover:bg-slate-800 border border-blue-500/30 text-slate-200 text-sm font-semibold transition-colors"
                >
                  Kapat
                </button>
              </div>
            )}
          </div>
        </div>

        <footer className="relative z-10 pb-1 text-center select-none">
          <span className="text-lg sm:text-xl font-extrabold tracking-[0.34em] kenix-text-neon-secondary">
            STORE
          </span>
        </footer>
      </div>
    </div>
  );
};
