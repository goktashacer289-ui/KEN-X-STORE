import React, { useRef, useState } from 'react';
import {
  Crown,
  Check,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { UserProfile } from '../types';

interface PlusMembershipSectionProps {
  userId: string;
  user: UserProfile | null;
  onUserUpdated: (updatedUser: UserProfile) => void;
}

const PLUS_PRICE_KC = 5000;

const PLUS_BENEFITS = [
  "Kenix Studio'ya her girişte 500 KS yerine 0 KS ile sınırsız ücretsiz giriş",
  '2X geliştirme ve derleme kalite motoru erişimi',
  'Oyun taslaklarını buluta kaydetme ve sürüm geçmişi güncelleme desteği',
  '30 gün boyunca tüm gelişmiş Stüdyo araçlarına kesintisiz erişim'
];

function formatExpiry(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

export const PlusMembershipSection: React.FC<PlusMembershipSectionProps> = ({
  userId,
  user,
  onUserUpdated
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const detailsPanelRef = useRef<HTMLDivElement | null>(null);

  const isPlusActive = Boolean(
    user?.studioPlan === 'plus' &&
      user?.plusExpiry &&
      new Date(user.plusExpiry).getTime() > Date.now()
  );
  const formattedExpiry = formatExpiry(user?.plusExpiry);
  const currentBalance = user?.kcBalance ?? 0;

  const handleToggleInspect = () => {
    setIsDetailsOpen((prev) => {
      const next = !prev;
      if (next) {
        window.setTimeout(() => {
          detailsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 60);
      }
      return next;
    });
  };

  const handlePurchasePlus = async () => {
    if (isProcessing) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsProcessing(true);

    try {
      const res = await fetch('/api/studio/membership/buy-plus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      const data = await res.json();

      // Strictly require genuine server verification and confirmed PLUS plan state
      if (!res.ok || data?.success !== true || !data?.user || data.user.studioPlan !== 'plus') {
        throw new Error(
          data?.error || 'Ödeme ve sunucu doğrulaması tamamlanamadığı için PLUS üyelik aktif edilmedi.'
        );
      }

      onUserUpdated(data.user);
      setSuccessMessage(
        data.message || 'PLUS üyeliğiniz sunucu tarafından doğrulandı ve aktif edildi.'
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Sunucu doğrulaması başarısız oldu. Üyelik işlemi gerçekleştirilmedi.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section
      id="plus-membership-section"
      aria-labelledby="plus-membership-heading"
      className="relative z-10 scroll-mt-24 overflow-hidden rounded-3xl bg-[#040d26]/95 border border-blue-500/45 kenix-neon-frame-inner p-6 sm:p-8 lg:p-10 mt-6"
    >
      {/* Subtle Ambient Navy-Neon Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-blue-600/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 inset-x-10 h-px bg-gradient-to-r from-transparent via-blue-400/80 to-transparent"
      />

      <div className="relative z-10 space-y-6">
        {/* Top Summary Row with Real Action Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2.5 text-blue-300">
              <Crown className="w-6 h-6 text-amber-400 shrink-0" />
              <h2
                id="plus-membership-heading"
                className="text-2xl sm:text-3xl font-black tracking-[0.12em] kenix-text-neon-primary"
              >
                PLUS ÜYELİK
              </h2>
            </div>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              KENİX STORE ve Stüdyo ekosistemi için aylık tam erişim paketi. Giriş ücreti ödemeden geliştirme yapın ve gelişmiş avantajlardan yararlanın.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleToggleInspect}
              aria-expanded={isDetailsOpen}
              aria-controls="plus-membership-details"
              className="min-h-[48px] px-6 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm font-extrabold tracking-wide inline-flex items-center justify-center gap-2 shadow-[0_0_22px_rgba(37,99,235,0.55)] transition-all cursor-pointer"
            >
              <Crown className="w-4 h-4 text-amber-300 shrink-0" />
              <span>PLUS ÜYELİĞİ İNCELE</span>
              {isDetailsOpen ? (
                <ChevronUp className="w-4 h-4 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 shrink-0" />
              )}
            </button>
          </div>
        </div>

        {/* Opened PLUS Membership Details & Server-Verified Purchase Panel */}
        {isDetailsOpen && (
          <div
            id="plus-membership-details"
            ref={detailsPanelRef}
            className="pt-6 border-t border-blue-500/25 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* Left: Benefits */}
            <div className="lg:col-span-7 space-y-4">
              <h3 className="text-base sm:text-lg font-bold text-white">
                PLUS Üyelik Avantajları ve Detayları
              </h3>
              <ul className="space-y-3">
                {PLUS_BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3 text-sm text-slate-200">
                    <Check className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: Pricing & Server-Verified Purchase Box */}
            <div className="lg:col-span-5 rounded-2xl bg-[#02081a]/95 border border-blue-500/35 p-5 sm:p-6 space-y-4 shadow-[0_0_28px_rgba(2,6,23,0.75)]">
              <div className="flex items-baseline justify-between gap-3 border-b border-blue-500/20 pb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-300/80">
                    Üyelik Ücreti
                  </p>
                  <p className="text-3xl font-black text-white tabular-nums mt-1">
                    {PLUS_PRICE_KC.toLocaleString('tr-TR')} KS
                  </p>
                </div>
                <p className="text-xs sm:text-sm font-semibold text-blue-200">
                  30 Günlük Erişim
                </p>
              </div>

              <div className="space-y-1.5 text-xs sm:text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Mevcut Bakiyeniz</span>
                  <span className="font-bold text-white tabular-nums">
                    {currentBalance.toLocaleString('tr-TR')} KS
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400">Üyelik Durumu</span>
                  <span
                    className={`font-bold ${
                      isPlusActive ? 'text-emerald-400' : 'text-blue-200'
                    }`}
                  >
                    {isPlusActive
                      ? formattedExpiry
                        ? `PLUS Aktif (${formattedExpiry})`
                        : 'PLUS Aktif'
                      : 'Standart (NORMAL)'}
                  </span>
                </div>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-xl bg-rose-950/50 border border-rose-500/40 px-3.5 py-2.5 text-xs font-medium text-rose-200 flex items-start gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {successMessage && (
                <div
                  role="status"
                  className="rounded-xl bg-emerald-950/45 border border-emerald-500/40 px-3.5 py-2.5 text-xs font-medium text-emerald-200 flex items-start gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </div>
              )}

              <button
                type="button"
                disabled={isProcessing}
                onClick={handlePurchasePlus}
                className="w-full min-h-[48px] px-5 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-[0_0_22px_rgba(37,99,235,0.55)] transition-all cursor-pointer"
              >
                <Crown className="w-4 h-4 text-amber-300 shrink-0" />
                <span>
                  {isProcessing
                    ? 'Sunucu Doğrulaması Yapılıyor...'
                    : isPlusActive
                    ? 'PLUS Süresini Uzat (5.000 KS)'
                    : 'PLUS Üyelik Satın Al (5.000 KS)'}
                </span>
              </button>

              <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5 text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Satın alma işlemi sunucu bakiye doğrulaması ile onaylanır.</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
