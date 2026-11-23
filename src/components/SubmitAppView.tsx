import React, { useState } from 'react';
import {
  UploadCloud,
  FileArchive,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Upload,
  Lock,
  MailCheck
} from 'lucide-react';
import { User } from 'firebase/auth';
import { ApkUploadResult, AppSubmission } from '../types';
import {
  createSubmissionInFirestore,
  getFirebaseIdToken,
  reloadFirebaseUser,
  resendVerificationEmail,
  uploadApkToFirebaseStorage
} from '../firebase';
import { compressImageFileForCloud, computeFileSha256Hex, formatFileSize } from '../utils/formatters';

interface SubmitAppViewProps {
  firebaseUser: User | null;
  onOpenAuth: () => void;
  onSubmitted: (submission: AppSubmission) => void;
}

const CATEGORIES = [
  'Araçlar',
  'Yapay Zeka',
  'Oyun',
  'Verimlilik',
  'İletişim',
  'Eğitim',
  'Medya & Müzik',
  'Diğer'
];

const ICON_OPTIONS = [
  'Layers',
  'Cpu',
  'Zap',
  'Code2',
  'Rocket',
  'Shield',
  'MessageSquareShare',
  'Music2',
  'Gamepad2',
  'Bot',
  'Flame'
];

export const SubmitAppView: React.FC<SubmitAppViewProps> = ({
  firebaseUser,
  onOpenAuth,
  onSubmitted
}) => {
  const [title, setTitle] = useState('');
  const [packageName, setPackageName] = useState('');
  const [category, setCategory] = useState('Araçlar');
  const [developer, setDeveloper] = useState(() => firebaseUser?.displayName || '');
  const [version, setVersion] = useState('v1.0.0');
  const [shortDescription, setShortDescription] = useState('');
  const [fullDescription, setFullDescription] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');
  const [icon, setIcon] = useState('Layers');
  const [logoUrl, setLogoUrl] = useState('');
  const [banner, setBanner] = useState('');

  const [isUploadingApk, setIsUploadingApk] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState<string | null>(null);
  const [clientSha256, setClientSha256] = useState<string | null>(null);
  const [apkResult, setApkResult] = useState<ApkUploadResult | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [verifyFeedback, setVerifyFeedback] = useState<string | null>(null);

  const handleResendVerification = async () => {
    setVerifyFeedback(null);
    try {
      await resendVerificationEmail();
      setVerifyFeedback('Doğrulama e-postası gönderildi. Gelen kutunuzu kontrol edin ve ardından "Durumu Yenile"ye basın.');
    } catch (err) {
      setVerifyFeedback(err instanceof Error ? err.message : 'E-posta gönderilemedi.');
    }
  };

  const handleRefreshVerification = async () => {
    try {
      await reloadFirebaseUser();
      setVerifyFeedback('Hesap durumu güncellendi.');
    } catch {
      // ignore
    }
  };

  const handleApkFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccessMsg(null);
    setApkResult(null);
    setClientSha256(null);

    if (!file.name.toLowerCase().endsWith('.apk')) {
      setError('Yalnızca .apk uzantılı Android uygulama dosyaları yüklenebilir.');
      return;
    }
    if (file.size <= 0 || file.size > 100 * 1024 * 1024) {
      setError('APK dosya boyutu 100 MB sınırını aşamaz ve boş olamaz.');
      return;
    }

    setIsUploadingApk(true);
    setUploadProgressText('SHA-256 özeti hesaplanıyor...');

    try {
      const sha = await computeFileSha256Hex(file);
      if (sha) setClientSha256(sha);

      setUploadProgressText('APK güvenlik taraması ve karantina yüklemesi yapılıyor...');
      const idToken = await getFirebaseIdToken(true);
      if (!idToken) {
        throw new Error('Oturum doğrulaması alınamadı. Lütfen yeniden giriş yapın.');
      }

      const formData = new FormData();
      formData.append('apk', file);

      const res = await fetch('/api/apk/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'APK güvenlik taramasını geçemedi.');
      }

      // Optionally mirror to Firebase Cloud Storage quarantine bucket if Storage rules are active
      let storageUrl: string | undefined;
      if (firebaseUser) {
        const uploadedUrl = await uploadApkToFirebaseStorage(
          file,
          'apks',
          firebaseUser.uid,
          data.apkId
        );
        if (uploadedUrl) storageUrl = uploadedUrl;
      }

      setApkResult({
        apkId: data.apkId,
        apkFileName: data.apkFileName,
        fileSizeBytes: data.fileSizeBytes,
        apkSha256: data.apkSha256,
        scanReport: data.scanReport,
        storageUrl
      });
      setUploadProgressText(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'APK yüklenemedi.');
      setUploadProgressText(null);
    } finally {
      setIsUploadingApk(false);
    }
  };

  const handleImageUpload = async (
    target: 'logoUrl' | 'banner',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const dataUrl = await compressImageFileForCloud(file, target);
      if (target === 'logoUrl') setLogoUrl(dataUrl);
      else setBanner(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Görsel yüklenemedi.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!apkResult) {
      setError('Başvuru göndermeden önce güvenlik taramasından geçmiş bir .apk dosyası yüklemelisiniz.');
      return;
    }

    setIsSubmitting(true);
    try {
      const idToken = await getFirebaseIdToken();
      if (!idToken) {
        throw new Error('Lütfen önce hesabınıza giriş yapın.');
      }

      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({
          title,
          packageName,
          category,
          developer: developer || firebaseUser?.displayName || 'Geliştirici',
          version,
          shortDescription,
          fullDescription: fullDescription || shortDescription,
          updateNotes,
          icon,
          logoUrl,
          banner,
          apkId: apkResult.apkId
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Başvuru gönderilemedi.');
      }

      if (data.submission) {
        await createSubmissionInFirestore(data.submission).catch(() => {});
        onSubmitted(data.submission);
      }

      setSuccessMsg(
        data.message ||
          'Uygulamanız ve taranmış APK paketiniz yönetici onayına gönderildi. Profilinizden durumu takip edebilirsiniz.'
      );
      setTitle('');
      setPackageName('');
      setShortDescription('');
      setFullDescription('');
      setUpdateNotes('');
      setLogoUrl('');
      setBanner('');
      setApkResult(null);
      setClientSha256(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Başvuru sırasında hata oluştu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!firebaseUser) {
    return (
      <div className="max-w-xl mx-auto rounded-3xl bg-[#05102b]/95 border border-blue-500/35 kenix-neon-frame-inner p-7 sm:p-10 text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-950/80 border border-blue-400/45 flex items-center justify-center shadow-[0_0_24px_rgba(59,130,246,0.3)]">
          <Lock className="w-6 h-6 text-blue-300" />
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white">
          Uygulama Göndermek İçin Giriş Yapın
        </h1>
        <p className="text-sm text-slate-300 leading-relaxed">
          KENİX STORE mağazasına Android (.apk) uygulamanızı göndermek, zararlı yazılım taraması yaptırmak
          ve yönetici onay sürecini takip etmek için doğrulanmış bir KENİX hesabıyla oturum açmalısınız.
        </p>
        <button
          type="button"
          onClick={onOpenAuth}
          className="min-h-[46px] px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-[0_0_20px_rgba(37,99,235,0.55)] transition-all"
        >
          Giriş Yap veya Kayıt Ol
        </button>
      </div>
    );
  }

  if (!firebaseUser.emailVerified) {
    return (
      <div className="max-w-xl mx-auto rounded-3xl bg-[#05102b]/95 border border-amber-500/40 p-7 sm:p-10 text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-950/70 border border-amber-400/45 flex items-center justify-center">
          <MailCheck className="w-6 h-6 text-amber-300" />
        </div>
        <h1 className="text-xl font-extrabold text-white">E-posta Doğrulaması Gerekli</h1>
        <p className="text-sm text-slate-300 leading-relaxed">
          APK yükleyebilmek için <span className="text-white font-semibold">{firebaseUser.email}</span> adresine
          gönderilen doğrulama bağlantısına tıklamanız gerekmektedir.
        </p>
        {verifyFeedback && (
          <p className="text-xs text-blue-200 bg-blue-950/50 border border-blue-500/35 rounded-xl px-4 py-2.5">
            {verifyFeedback}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleResendVerification}
            className="min-h-[44px] px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-bold"
          >
            Doğrulama E-postasını Yeniden Gönder
          </button>
          <button
            type="button"
            onClick={handleRefreshVerification}
            className="min-h-[44px] px-5 rounded-xl bg-[#020718] border border-blue-500/35 text-blue-200 text-xs sm:text-sm font-semibold"
          >
            Durumu Yenile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-500/20 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Uygulama Gönder (.APK)
          </h1>
          <p className="text-sm text-slate-300 mt-0.5">
            Android paketiniz yüklenirken otomatik imza, boyut (maks. 100 MB), zararlı içerik taraması ve SHA-256 doğrulamasından geçer.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/35 text-xs font-semibold text-emerald-200 shrink-0">
          <ShieldCheck className="w-4 h-4" />
          <span>Ön Karantina Korumalı</span>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl bg-[#05102b]/95 border border-blue-500/30 p-5 sm:p-8 space-y-6"
      >
        {/* Step 1: Real APK Upload + Security Scanner */}
        <div className="space-y-3">
          <label className="block text-sm font-bold text-blue-200">
            1. Android Uygulama Paketi (.apk, En Fazla 100 MB) *
          </label>
          <label className="flex flex-col items-center justify-center gap-2.5 p-6 rounded-2xl border-2 border-dashed border-blue-500/40 hover:border-blue-400 bg-[#020718]/90 cursor-pointer transition-colors text-center">
            <UploadCloud className="w-8 h-8 text-blue-400" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-white">
                {isUploadingApk ? 'APK İnceleniyor...' : '.APK Dosyası Seçin veya Buraya Dokunun'}
              </p>
              <p className="text-xs text-slate-400">
                AndroidManifest.xml, classes.dex, Zip-Slip / Zip-Bomb ve SHA-256 bütünlük taraması zorunludur.
              </p>
            </div>
            <input
              type="file"
              accept=".apk,application/vnd.android.package-archive"
              disabled={isUploadingApk}
              onChange={handleApkFileChange}
              className="hidden"
            />
          </label>

          {uploadProgressText && (
            <div className="rounded-xl bg-blue-950/60 border border-blue-500/35 px-4 py-3 text-xs font-semibold text-blue-200 flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin shrink-0" />
              <span>{uploadProgressText}</span>
            </div>
          )}

          {apkResult && (
            <div className="rounded-2xl bg-emerald-950/35 border border-emerald-500/45 p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{apkResult.apkFileName}</span>
                </div>
                <span className="text-xs font-mono text-emerald-200">
                  {formatFileSize(apkResult.fileSizeBytes)}
                </span>
              </div>
              <p className="text-xs text-emerald-100/90">{apkResult.scanReport.summary}</p>
              <p className="text-[11px] font-mono text-slate-300 break-all">
                SHA-256: {apkResult.apkSha256}
              </p>
            </div>
          )}

          {!apkResult && clientSha256 && !isUploadingApk && (
            <p className="text-[11px] font-mono text-slate-400 break-all">
              Ön SHA-256: {clientSha256}
            </p>
          )}
        </div>

        {/* Step 2: App Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="sub-title" className="block text-xs font-semibold text-blue-200">
              Uygulama Adı *
            </label>
            <input
              id="sub-title"
              required
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Örn: Kenix Notlar"
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sub-package" className="block text-xs font-semibold text-blue-200">
              Android Paket Adı (Package Name) *
            </label>
            <input
              id="sub-package"
              required
              type="text"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              placeholder="Örn: com.gelistirici.uygulama"
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm font-mono text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sub-category" className="block text-xs font-semibold text-blue-200">
              Kategori *
            </label>
            <select
              id="sub-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm text-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="sub-dev" className="block text-xs font-semibold text-blue-200">
                Geliştirici Adı *
              </label>
              <input
                id="sub-dev"
                required
                type="text"
                value={developer}
                onChange={(e) => setDeveloper(e.target.value)}
                placeholder="Geliştirici"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="sub-ver" className="block text-xs font-semibold text-blue-200">
                Sürüm *
              </label>
              <input
                id="sub-ver"
                required
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1.0.0"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm text-white"
              />
            </div>
          </div>
        </div>

        {/* Logo & Cover */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-blue-200">
              Uygulama Logosu (İsteğe Bağlı)
            </label>
            <div className="flex items-center gap-2">
              <label className="min-h-[44px] px-4 rounded-xl bg-blue-950/70 hover:bg-blue-900/70 border border-blue-500/35 text-xs font-semibold text-blue-200 inline-flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Logo Yükle</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload('logoUrl', e)}
                />
              </label>
              <select
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                aria-label="Varsayılan simge"
                className="min-h-[44px] px-3 rounded-xl bg-[#020718] border border-blue-500/30 text-xs text-slate-200"
              >
                {ICON_OPTIONS.map((ic) => (
                  <option key={ic} value={ic}>
                    {ic}
                  </option>
                ))}
              </select>
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo önizleme"
                  className="w-11 h-11 rounded-xl object-cover border border-blue-400/40"
                />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-blue-200">
              Kapak Görseli (İsteğe Bağlı)
            </label>
            <div className="flex items-center gap-3">
              <label className="min-h-[44px] px-4 rounded-xl bg-blue-950/70 hover:bg-blue-900/70 border border-blue-500/35 text-xs font-semibold text-blue-200 inline-flex items-center gap-2 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>Kapak Görseli Yükle</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageUpload('banner', e)}
                />
              </label>
              {banner && (
                <img
                  src={banner}
                  alt="Kapak önizleme"
                  className="w-20 h-11 rounded-xl object-cover border border-blue-400/40"
                />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="sub-short" className="block text-xs font-semibold text-blue-200">
            Kısa Açıklama *
          </label>
          <input
            id="sub-short"
            required
            type="text"
            maxLength={300}
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            placeholder="Uygulamanın mağaza kartında görünecek özeti"
            className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm text-white"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="sub-full" className="block text-xs font-semibold text-blue-200">
            Detaylı Açıklama *
          </label>
          <textarea
            id="sub-full"
            required
            rows={4}
            maxLength={4000}
            value={fullDescription}
            onChange={(e) => setFullDescription(e.target.value)}
            placeholder="Özellikler, gereksinimler ve kullanım bilgileri..."
            className="w-full p-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm text-white"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="sub-notes" className="block text-xs font-semibold text-blue-200">
            Sürüm Notları (İsteğe Bağlı)
          </label>
          <input
            id="sub-notes"
            type="text"
            maxLength={1000}
            value={updateNotes}
            onChange={(e) => setUpdateNotes(e.target.value)}
            placeholder="Örn: İlk resmi APK sürümü"
            className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm text-white"
          />
        </div>

        {error && (
          <div role="alert" className="rounded-xl bg-rose-950/50 border border-rose-500/40 px-4 py-3 text-xs sm:text-sm font-medium text-rose-200 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div role="status" className="rounded-xl bg-emerald-950/45 border border-emerald-500/40 px-4 py-3 text-xs sm:text-sm font-medium text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || isUploadingApk || !apkResult}
          className="w-full sm:w-auto min-h-[48px] px-7 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-bold inline-flex items-center justify-center gap-2 shadow-[0_0_22px_rgba(37,99,235,0.55)] transition-all"
        >
          <FileArchive className="w-4 h-4" />
          <span>{isSubmitting ? 'Gönderiliyor...' : 'Başvuruyu Yönetici Onayına Gönder'}</span>
        </button>
      </form>
    </div>
  );
};
