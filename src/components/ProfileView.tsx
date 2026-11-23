import React, { useEffect, useState } from 'react';
import {
  User as UserIcon,
  ShieldCheck,
  LogOut,
  LogIn,
  Clock,
  CheckCircle2,
  XCircle,
  UploadCloud,
  Heart,
  FileText,
  MailCheck,
  Coins
} from 'lucide-react';
import { User } from 'firebase/auth';
import { AppSubmission, UserProfile } from '../types';
import {
  getFirebaseIdToken,
  reloadFirebaseUser,
  resendVerificationEmail,
  signOutFirebase,
  subscribeUserSubmissions
} from '../firebase';
import { formatFileSize, formatShortSha256 } from '../utils/formatters';
import { StoreNavView } from './StoreHeader';

interface ProfileViewProps {
  firebaseUser: User | null;
  storeUser: UserProfile | null;
  isServerAdmin: boolean;
  favoritesCount: number;
  localSubmissions: AppSubmission[];
  onOpenAuth: () => void;
  onNavigate: (view: StoreNavView) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  firebaseUser,
  storeUser,
  isServerAdmin,
  favoritesCount,
  localSubmissions,
  onOpenAuth,
  onNavigate
}) => {
  const [cloudSubmissions, setCloudSubmissions] = useState<AppSubmission[]>([]);
  const [serverSubmissions, setServerSubmissions] = useState<AppSubmission[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUser) {
      setCloudSubmissions([]);
      setServerSubmissions([]);
      return;
    }

    const unsub = subscribeUserSubmissions(firebaseUser.uid, (list) => {
      setCloudSubmissions(list);
    });

    if (firebaseUser.emailVerified) {
      void (async () => {
        const token = await getFirebaseIdToken();
        if (!token) return;
        try {
          const res = await fetch('/api/submissions/mine', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.submissions)) {
              setServerSubmissions(data.submissions);
            }
          }
        } catch {
          // non-fatal
        }
      })();
    }

    return () => unsub();
  }, [firebaseUser, localSubmissions]);

  const mergedSubmissions = React.useMemo(() => {
    const map = new Map<string, AppSubmission>();
    for (const s of serverSubmissions) map.set(s.id, s);
    for (const s of cloudSubmissions) map.set(s.id, s);
    for (const s of localSubmissions) {
      if (!map.has(s.id)) map.set(s.id, s);
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [cloudSubmissions, serverSubmissions, localSubmissions]);

  const handleResend = async () => {
    try {
      await resendVerificationEmail();
      setNotice('Doğrulama e-postası gönderildi.');
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gönderilemedi.');
    }
  };

  const handleReload = async () => {
    await reloadFirebaseUser();
    setNotice('Hesap doğrulama durumu yenilendi.');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* User Identity Card */}
      <section className="rounded-3xl bg-[#05102b]/95 border border-blue-500/35 kenix-neon-frame-inner p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-16 h-16 rounded-2xl bg-[#020718] border border-blue-400/50 flex items-center justify-center shrink-0 overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.3)]">
            {firebaseUser?.photoURL ? (
              <img
                src={firebaseUser.photoURL}
                alt={firebaseUser.displayName || 'Profil'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-8 h-8 text-blue-300" />
            )}
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-white truncate">
                {firebaseUser
                  ? firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'KENİX Üyesi'
                  : storeUser?.username || 'Misafir Kullanıcı'}
              </h1>
              {isServerAdmin && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-[11px] font-bold text-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Yetkili Yönetici</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-300 truncate">
              {firebaseUser ? firebaseUser.email : 'Oturum açılmadı · Yerel mağaza profili aktif'}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-blue-200">
              <span className="inline-flex items-center gap-1 font-semibold">
                <Coins className="w-3.5 h-3.5 text-amber-300" />
                {storeUser?.kcBalance ?? 120} KS Bakiye
              </span>
              <span className="text-slate-500">·</span>
              <span className="inline-flex items-center gap-1 font-semibold">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                {favoritesCount} Favori
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {firebaseUser ? (
            <>
              <button
                type="button"
                onClick={() => onNavigate('submit')}
                className="min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-[0_0_16px_rgba(37,99,235,0.45)]"
              >
                <UploadCloud className="w-4 h-4" />
                <span>APK Gönder</span>
              </button>
              <button
                type="button"
                onClick={() => void signOutFirebase()}
                className="min-h-[44px] px-4 rounded-xl bg-[#020718] border border-rose-500/35 hover:border-rose-400 text-rose-200 text-xs sm:text-sm font-semibold inline-flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Çıkış Yap</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold inline-flex items-center gap-2 shadow-[0_0_18px_rgba(37,99,235,0.5)]"
            >
              <LogIn className="w-4 h-4" />
              <span>Giriş Yap / Kayıt Ol</span>
            </button>
          )}
        </div>
      </section>

      {firebaseUser && !firebaseUser.emailVerified && (
        <div className="rounded-2xl bg-amber-950/35 border border-amber-500/40 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm text-amber-100">
            <MailCheck className="w-5 h-5 text-amber-300 shrink-0" />
            <span>Uygulama göndermek için e-posta adresinizi doğrulayın.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResend}
              className="min-h-[38px] px-3.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold"
            >
              Doğrulama Gönder
            </button>
            <button
              type="button"
              onClick={handleReload}
              className="min-h-[38px] px-3.5 rounded-xl bg-[#020718] border border-blue-500/30 text-blue-200 text-xs font-semibold"
            >
              Yenile
            </button>
          </div>
        </div>
      )}

      {notice && (
        <p className="rounded-xl bg-blue-950/50 border border-blue-500/35 px-4 py-2.5 text-xs font-semibold text-blue-200">
          {notice}
        </p>
      )}

      {/* Submission Status Tracking */}
      <section className="rounded-3xl bg-[#05102b]/90 border border-blue-500/25 p-5 sm:p-7 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold text-white">Uygulama Başvurularım</h2>
          {firebaseUser && (
            <button
              type="button"
              onClick={() => onNavigate('submit')}
              className="text-xs font-semibold text-blue-300 hover:text-blue-200"
            >
              + Yeni Uygulama Gönder
            </button>
          )}
        </div>

        {!firebaseUser ? (
          <p className="text-sm text-slate-400">
            Gönderdiğiniz APK başvurularının onay durumunu görmek için giriş yapın.
          </p>
        ) : mergedSubmissions.length === 0 ? (
          <div className="rounded-2xl bg-[#030a1e] border border-blue-500/20 p-6 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-200">Henüz uygulama başvurunuz yok</p>
            <p className="text-xs text-slate-400">
              Kendi Android (.apk) uygulamanızı güvenle yükleyip mağazada yayınlanmak üzere gönderebilirsiniz.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {mergedSubmissions.map((sub) => (
              <div
                key={sub.id}
                className="rounded-2xl bg-[#030a1e] border border-blue-500/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-white">{sub.title}</h3>
                    <span className="text-xs font-mono text-blue-300/80">{sub.version}</span>
                    {sub.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/40 text-[11px] font-bold text-amber-200">
                        <Clock className="w-3 h-3" />
                        <span>İnceleniyor</span>
                      </span>
                    )}
                    {sub.status === 'approved' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-[11px] font-bold text-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Onaylandı ve Yayında</span>
                      </span>
                    )}
                    {sub.status === 'rejected' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-500/15 border border-rose-400/40 text-[11px] font-bold text-rose-200">
                        <XCircle className="w-3 h-3" />
                        <span>Reddedildi</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 font-mono truncate">
                    {sub.packageName} · {sub.apkFileName} ({formatFileSize(sub.fileSizeBytes)})
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono truncate">
                    SHA-256: {formatShortSha256(sub.apkSha256)}
                  </p>
                  {sub.reviewNotes && (
                    <p className="text-xs text-blue-200/90 pt-1">
                      Yönetici Notu: {sub.reviewNotes}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Actions & Privacy Link */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onNavigate('favorites')}
          className="min-h-[54px] px-5 rounded-2xl bg-[#05102b] border border-blue-500/25 hover:border-blue-400 text-left flex items-center justify-between transition-colors"
        >
          <span className="text-sm font-bold text-white flex items-center gap-2.5">
            <Heart className="w-4 h-4 text-rose-400" />
            <span>Favori Uygulamalarım</span>
          </span>
          <span className="text-xs font-bold text-blue-300">{favoritesCount}</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('privacy')}
          className="min-h-[54px] px-5 rounded-2xl bg-[#05102b] border border-blue-500/25 hover:border-blue-400 text-left flex items-center justify-between transition-colors"
        >
          <span className="text-sm font-bold text-white flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Gizlilik Politikası ve Güvenlik</span>
          </span>
          <span className="text-xs font-semibold text-slate-400">Oku</span>
        </button>
      </div>
    </div>
  );
};
