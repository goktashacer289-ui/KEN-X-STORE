import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  Download,
  ThumbsUp,
  ThumbsDown,
  Heart,
  Clock,
  Globe,
  ShieldCheck,
  Copy,
  Check,
  Package
} from 'lucide-react';
import { StoreItem } from '../types';
import { ItemIcon } from './ItemIcon';
import { formatFileSize } from '../utils/formatters';

interface AppDetailViewProps {
  item: StoreItem;
  userVote?: 'like' | 'dislike';
  isFavorite: boolean;
  onBack: () => void;
  onLaunch: (item: StoreItem) => void;
  onVote: (itemId: string, voteType: 'like' | 'dislike') => void;
  onToggleFavorite: (itemId: string) => void;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function getHostname(url?: string): string {
  if (!url) return '';
  if (url.startsWith('/api/apk/download/')) return 'KENİX Doğrulanmış APK Deposu';
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export const AppDetailView: React.FC<AppDetailViewProps> = ({
  item,
  userVote,
  isFavorite,
  onBack,
  onLaunch,
  onVote,
  onToggleFavorite
}) => {
  const [bannerFailed, setBannerFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [copiedSha, setCopiedSha] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBack();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onBack]);

  const isDownload = item.launchMode === 'download';
  const targetUrl = item.apkUrl || item.appUrl || item.gameplayUrl || '';
  const isApk = Boolean(
    item.apkVerified ||
      item.apkFileName ||
      targetUrl.includes('/api/apk/download/') ||
      targetUrl.toLowerCase().endsWith('.apk')
  );
  const history = item.versionHistory || [];

  const handleCopySha = async () => {
    if (!item.apkSha256) return;
    try {
      await navigator.clipboard.writeText(item.apkSha256);
      setCopiedSha(true);
      window.setTimeout(() => setCopiedSha(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[44px] px-3.5 rounded-xl bg-[#05102b] border border-blue-500/30 hover:border-blue-400/70 text-slate-200 hover:text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-blue-400" />
          <span>Mağazaya Dön</span>
        </button>

        {targetUrl && (
          <span className="text-xs font-mono text-blue-300/80 inline-flex items-center gap-1.5 truncate">
            <Globe className="w-3.5 h-3.5 shrink-0" />
            {getHostname(targetUrl)}
          </span>
        )}
      </div>

      {/* Detail Hero Card */}
      <article className="rounded-3xl overflow-hidden bg-[#05102b]/95 border border-blue-500/30 shadow-[0_18px_45px_rgba(2,6,23,0.75)]">
        {/* Banner */}
        <div className="relative h-48 sm:h-64 w-full bg-[#030a1e] overflow-hidden">
          {item.banner && !bannerFailed ? (
            <img
              src={item.banner}
              alt={`${item.title} kapak`}
              referrerPolicy="no-referrer"
              onError={() => setBannerFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#0b2461] via-[#061238] to-[#020617] flex items-center justify-center relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_30%,rgba(59,130,246,0.32),transparent_55%)]" />
              <div className="opacity-20 text-blue-300">
                <ItemIcon name={item.icon} size={72} className="w-18 h-18" />
              </div>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#05102b] to-transparent" />
        </div>

        <div className="p-5 sm:p-8 -mt-12 relative z-10 space-y-6">
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shrink-0 bg-[#020718] border-2 border-blue-400/50 shadow-[0_0_24px_rgba(59,130,246,0.35)] overflow-hidden flex items-center justify-center">
                {item.logoUrl && !logoFailed ? (
                  <img
                    src={item.logoUrl}
                    alt={`${item.title} logosu`}
                    referrerPolicy="no-referrer"
                    onError={() => setLogoFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ItemIcon name={item.icon} size={34} className="w-8 h-8 text-blue-300" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {item.title}
                  </h1>
                  {item.apkVerified && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-400/45 text-xs font-bold text-emerald-300">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Güvenlik Onaylı APK</span>
                    </span>
                  )}
                </div>
                <p className="text-sm text-blue-300/90 font-medium mt-1">
                  {item.developer} · {item.category} · {item.version}
                  {item.fileSizeBytes ? ` · ${formatFileSize(item.fileSizeBytes)}` : ''}
                </p>
                <p className="text-xs text-slate-400 mt-1 tabular-nums">
                  Yayın: {formatDate(item.publishedAt)} · Açılma: {item.opens || 0} · İndirme: {item.downloads || 0}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onLaunch(item)}
              className="w-full sm:w-auto min-h-[48px] px-6 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-sm sm:text-base font-bold inline-flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(37,99,235,0.65)] transition-all shrink-0"
            >
              {isDownload ? (
                <>
                  <Download className="w-5 h-5" />
                  <span>{isApk ? 'APK İndir' : 'Uygulamayı İndir'}</span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-5 h-5" />
                  <span>Uygulamayı Aç</span>
                </>
              )}
            </button>
          </div>

          {/* Interactive Actions */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-blue-500/20">
            <button
              type="button"
              onClick={() => onVote(item.id, 'like')}
              aria-pressed={userVote === 'like'}
              className={`min-h-[44px] px-4 rounded-xl inline-flex items-center gap-2 text-sm font-semibold tabular-nums border transition-all ${
                userVote === 'like'
                  ? 'bg-blue-600/25 border-blue-400 text-blue-100'
                  : 'bg-[#030a1e] border-blue-500/25 text-slate-300 hover:border-blue-400/60 hover:text-white'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span>Beğen ({item.likes})</span>
            </button>

            <button
              type="button"
              onClick={() => onVote(item.id, 'dislike')}
              aria-pressed={userVote === 'dislike'}
              className={`min-h-[44px] px-4 rounded-xl inline-flex items-center gap-2 text-sm font-semibold tabular-nums border transition-all ${
                userVote === 'dislike'
                  ? 'bg-rose-500/20 border-rose-400 text-rose-100'
                  : 'bg-[#030a1e] border-blue-500/25 text-slate-300 hover:border-rose-400/60 hover:text-white'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              <span>Beğenme ({item.dislikes})</span>
            </button>

            <button
              type="button"
              onClick={() => onToggleFavorite(item.id)}
              aria-pressed={isFavorite}
              className={`min-h-[44px] px-4 rounded-xl inline-flex items-center gap-2 text-sm font-semibold border transition-all ${
                isFavorite
                  ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                  : 'bg-[#030a1e] border-blue-500/25 text-slate-300 hover:border-rose-400/60 hover:text-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              <span>{isFavorite ? 'Favorilerde' : 'Favorilere Ekle'}</span>
            </button>
          </div>

          {/* Description & Package / Security Info Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
            <div className="lg:col-span-2 space-y-5">
              <div className="space-y-2.5">
                <h2 className="text-base font-bold text-blue-200 tracking-wide">
                  Uygulama Hakkında
                </h2>
                <p className="text-sm sm:text-base text-slate-200/95 leading-relaxed whitespace-pre-line">
                  {item.fullDescription || item.shortDescription}
                </p>
              </div>

              {(item.packageName || item.apkSha256 || item.fileSizeBytes) && (
                <div className="rounded-2xl bg-[#030a1e]/95 border border-blue-500/25 p-4 sm:p-5 space-y-3">
                  <div className="flex items-center gap-2 text-blue-200 font-bold text-sm">
                    <Package className="w-4 h-4 text-blue-400" />
                    <span>Android APK Paket & Güvenlik Bilgileri</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {item.packageName && (
                      <div>
                        <span className="text-slate-400 block">Paket Adı</span>
                        <span className="font-mono text-slate-100">{item.packageName}</span>
                      </div>
                    )}
                    {item.fileSizeBytes && (
                      <div>
                        <span className="text-slate-400 block">Dosya Boyutu</span>
                        <span className="font-mono text-slate-100">{formatFileSize(item.fileSizeBytes)}</span>
                      </div>
                    )}
                    {item.apkFileName && (
                      <div>
                        <span className="text-slate-400 block">Dosya Adı</span>
                        <span className="font-mono text-slate-100 break-all">{item.apkFileName}</span>
                      </div>
                    )}
                    {item.apkScanSummary && (
                      <div>
                        <span className="text-slate-400 block">Güvenlik Taraması</span>
                        <span className="text-emerald-300 font-medium">{item.apkScanSummary}</span>
                      </div>
                    )}
                  </div>
                  {item.apkSha256 && (
                    <div className="pt-2 border-t border-blue-500/15 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-400">SHA-256 Bütünlük Özeti</span>
                        <button
                          type="button"
                          onClick={handleCopySha}
                          className="text-xs font-semibold text-blue-300 hover:text-blue-200 inline-flex items-center gap-1"
                        >
                          {copiedSha ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedSha ? 'Kopyalandı' : 'Kopyala'}</span>
                        </button>
                      </div>
                      <p className="text-[11px] font-mono text-slate-300 break-all select-all">
                        {item.apkSha256}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <aside className="rounded-2xl bg-[#030a1e]/90 border border-blue-500/25 p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 text-blue-200 font-bold text-sm">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Güncelleme Bilgileri</span>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-slate-400">
                  Mevcut Sürüm: <span className="text-slate-100 font-semibold">{item.version}</span>
                </p>
                <p className="text-xs text-slate-400">
                  Son Güncelleme:{' '}
                  <span className="text-slate-100 font-semibold">
                    {formatDate(item.updatedAt || item.publishedAt)}
                  </span>
                </p>
                {item.updateNotes && (
                  <p className="text-sm text-slate-200 pt-2 leading-relaxed">
                    {item.updateNotes}
                  </p>
                )}
              </div>

              {history.length > 0 && (
                <div className="pt-3 border-t border-blue-500/20 space-y-3">
                  <p className="text-xs font-semibold text-blue-300/90 uppercase tracking-wider">
                    Sürüm Geçmişi
                  </p>
                  <ul className="space-y-3">
                    {history.map((entry, index) => (
                      <li
                        key={`${entry.version}-${index}`}
                        className="pl-3 border-l-2 border-blue-500/45 space-y-0.5"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-slate-100">{entry.version}</span>
                          <span className="text-slate-400 tabular-nums">{formatDate(entry.date)}</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{entry.notes}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>
        </div>
      </article>
    </div>
  );
};
