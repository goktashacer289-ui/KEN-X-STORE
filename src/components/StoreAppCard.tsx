import React, { useState } from 'react';
import {
  Heart,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  Download,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { StoreItem } from '../types';
import { ItemIcon } from './ItemIcon';
import { formatFileSize } from '../utils/formatters';

interface StoreAppCardProps {
  item: StoreItem;
  userVote?: 'like' | 'dislike';
  isFavorite: boolean;
  onOpenDetail: (item: StoreItem) => void;
  onLaunch: (item: StoreItem) => void;
  onVote: (itemId: string, voteType: 'like' | 'dislike') => void;
  onToggleFavorite: (itemId: string) => void;
}

export const StoreAppCard: React.FC<StoreAppCardProps> = ({
  item,
  userVote,
  isFavorite,
  onOpenDetail,
  onLaunch,
  onVote,
  onToggleFavorite
}) => {
  const [bannerFailed, setBannerFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);

  const isDownload = item.launchMode === 'download';
  const isApk = Boolean(
    item.apkVerified ||
      item.apkFileName ||
      (item.apkUrl || item.appUrl || '').includes('/api/apk/download/') ||
      (item.apkUrl || item.appUrl || '').toLowerCase().endsWith('.apk')
  );
  const totalUsage = (item.opens || 0) + (item.downloads || 0);
  const hasBanner = Boolean(item.banner) && !bannerFailed;
  const hasLogo = Boolean(item.logoUrl) && !logoFailed;

  return (
    <article className="group bg-[#05102b]/90 border border-blue-500/25 hover:border-blue-400/65 rounded-2xl overflow-hidden flex flex-col transition-all duration-200 shadow-[0_10px_30px_rgba(2,6,23,0.65)] hover:shadow-[0_0_26px_rgba(59,130,246,0.28)]">
      {/* Cover Visual Area */}
      <div className="relative h-36 w-full overflow-hidden bg-[#030a1e]">
        <button
          type="button"
          onClick={() => onOpenDetail(item)}
          className="w-full h-full block text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          aria-label={`${item.title} detaylarını aç`}
        >
          {hasBanner ? (
            <img
              src={item.banner}
              alt={`${item.title} kapak görseli`}
              referrerPolicy="no-referrer"
              onError={() => setBannerFailed(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#0a1e52] via-[#051133] to-[#020617] relative flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_25%,rgba(59,130,246,0.28),transparent_55%)]" />
              <div className="opacity-25 text-blue-300">
                <ItemIcon name={item.icon} size={48} className="w-12 h-12" />
              </div>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#05102b] to-transparent pointer-events-none" />
        </button>

        {/* Verified APK badge (top-left) */}
        {item.apkVerified && (
          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-[#020617]/80 backdrop-blur-md border border-emerald-400/45 text-emerald-300 text-[11px] font-bold inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Doğrulanmış APK</span>
          </div>
        )}

        {/* Favorite Toggle Button */}
        <button
          type="button"
          onClick={() => onToggleFavorite(item.id)}
          aria-label={isFavorite ? `${item.title} favorilerden çıkar` : `${item.title} favorilere ekle`}
          aria-pressed={isFavorite}
          className={`absolute top-2.5 right-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl backdrop-blur-md border transition-all ${
            isFavorite
              ? 'bg-rose-500/20 border-rose-400/70 text-rose-300 shadow-[0_0_14px_rgba(244,63,94,0.35)]'
              : 'bg-[#020617]/75 border-blue-500/30 text-slate-300 hover:text-rose-300 hover:border-rose-400/50'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col gap-3">
        <div className="flex items-start gap-3.5">
          <button
            type="button"
            onClick={() => onOpenDetail(item)}
            className="w-12 h-12 rounded-xl shrink-0 bg-[#020718] border border-blue-400/40 shadow-[0_0_14px_rgba(59,130,246,0.22)] overflow-hidden flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            aria-label={`${item.title} detayına git`}
          >
            {hasLogo ? (
              <img
                src={item.logoUrl}
                alt={`${item.title} logosu`}
                referrerPolicy="no-referrer"
                onError={() => setLogoFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <ItemIcon name={item.icon} size={24} className="w-6 h-6 text-blue-300" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={() => onOpenDetail(item)}
              className="text-left w-full focus:outline-none"
            >
              <h3 className="text-base font-bold text-white truncate group-hover:text-blue-200 transition-colors">
                {item.title}
              </h3>
            </button>
            <p className="text-xs text-blue-300/80 font-medium truncate mt-0.5">
              {item.category} · {item.version} · {item.developer}
              {item.fileSizeBytes ? ` · ${formatFileSize(item.fileSizeBytes)}` : ''}
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-300/90 leading-relaxed line-clamp-2 flex-1">
          {item.shortDescription}
        </p>

        {/* Actions & Metrics */}
        <div className="pt-3 border-t border-blue-500/15 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onVote(item.id, 'like')}
              aria-label={`${item.title} beğen`}
              aria-pressed={userVote === 'like'}
              className={`min-h-[44px] px-2.5 rounded-xl inline-flex items-center gap-1.5 text-xs font-semibold tabular-nums transition-colors border ${
                userVote === 'like'
                  ? 'bg-blue-600/25 border-blue-400/70 text-blue-200'
                  : 'bg-transparent border-transparent text-slate-400 hover:text-blue-200 hover:bg-blue-950/50'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>{item.likes}</span>
            </button>

            <button
              type="button"
              onClick={() => onVote(item.id, 'dislike')}
              aria-label={`${item.title} beğenme`}
              aria-pressed={userVote === 'dislike'}
              className={`min-h-[44px] px-2.5 rounded-xl inline-flex items-center gap-1.5 text-xs font-semibold tabular-nums transition-colors border ${
                userVote === 'dislike'
                  ? 'bg-rose-500/20 border-rose-400/60 text-rose-200'
                  : 'bg-transparent border-transparent text-slate-400 hover:text-rose-200 hover:bg-rose-950/30'
              }`}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              <span>{item.dislikes}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenDetail(item)}
              aria-label={`${item.title} incele`}
              className="min-h-[44px] px-2 rounded-xl inline-flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-blue-200 tabular-nums transition-colors"
              title="Toplam kullanım"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-blue-400/80" />
              <span>{totalUsage}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onLaunch(item)}
            className="min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 shrink-0 transition-all shadow-[0_0_16px_rgba(37,99,235,0.5)] hover:shadow-[0_0_22px_rgba(59,130,246,0.8)]"
          >
            {isDownload ? (
              <>
                <Download className="w-4 h-4 shrink-0" />
                <span>{isApk ? 'APK İndir' : 'İndir'}</span>
              </>
            ) : (
              <>
                <ExternalLink className="w-4 h-4 shrink-0" />
                <span>Uygulamayı Aç</span>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
};
