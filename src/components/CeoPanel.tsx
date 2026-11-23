import React, { useCallback, useEffect, useState } from 'react';
import {
  Lock,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  BarChart3,
  Layers,
  Upload,
  Check,
  X,
  KeyRound,
  ExternalLink,
  Cloud,
  FileArchive,
  ClipboardCheck,
  ShieldCheck,
  RefreshCw,
  Download,
  Chrome
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ApkUploadResult, AppSubmission, CeoOverviewResponse, StoreItem } from '../types';
import { ItemIcon } from './ItemIcon';
import {
  auth,
  deleteStoreAppFromFirestore,
  fetchAllAppsForAdminFromFirestore,
  fetchAllSubmissionsForAdminFromFirestore,
  getFirebaseIdToken,
  isFirebaseAdminUser,
  reviewSubmissionInFirestore,
  signInWithGooglePopup,
  syncAllAppsToFirestore,
  syncStoreAppToFirestore
} from '../firebase';
import { compressImageFileForCloud, formatFileSize, formatShortSha256 } from '../utils/formatters';

interface CeoPanelProps {
  token: string | null;
  isServerAdmin: boolean;
  onTokenChange: (token: string | null) => void;
  onStoreChanged: () => void;
}

type CeoTab = 'apps' | 'submissions' | 'form' | 'stats' | 'security';

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

interface AppFormState {
  id: string | null;
  title: string;
  developer: string;
  category: string;
  packageName: string;
  version: string;
  launchMode: 'link' | 'download';
  appUrl: string;
  logoUrl: string;
  banner: string;
  icon: string;
  shortDescription: string;
  fullDescription: string;
  updateNotes: string;
  isPublished: boolean;
  apkId: string;
  apkMeta: ApkUploadResult | null;
}

const EMPTY_FORM: AppFormState = {
  id: null,
  title: '',
  developer: 'KENİX',
  category: '',
  packageName: '',
  version: 'v1.0.0',
  launchMode: 'link',
  appUrl: '',
  logoUrl: '',
  banner: '',
  icon: 'Layers',
  shortDescription: '',
  fullDescription: '',
  updateNotes: '',
  isPublished: true,
  apkId: '',
  apkMeta: null
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export const CeoPanel: React.FC<CeoPanelProps> = ({
  token,
  isServerAdmin,
  onTokenChange,
  onStoreChanged
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<CeoTab>('apps');
  const [overview, setOverview] = useState<(CeoOverviewResponse & { submissions?: AppSubmission[] }) | null>(null);
  const [submissions, setSubmissions] = useState<AppSubmission[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelNotice, setPanelNotice] = useState<string | null>(null);

  const [form, setForm] = useState<AppFormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingFormApk, setIsUploadingFormApk] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  // APK Version Update Drawer/Modal for an existing app
  const [apkUpdateTarget, setApkUpdateTarget] = useState<StoreItem | null>(null);
  const [apkUpdateVersion, setApkUpdateVersion] = useState('');
  const [apkUpdateNotes, setApkUpdateNotes] = useState('');
  const [apkUpdatePkg, setApkUpdatePkg] = useState('');
  const [apkUpdateResult, setApkUpdateResult] = useState<ApkUploadResult | null>(null);
  const [isUploadingUpdateApk, setIsUploadingUpdateApk] = useState(false);
  const [isSavingApkUpdate, setIsSavingApkUpdate] = useState(false);

  // Review notes per submission
  const [reviewNotesMap, setReviewNotesMap] = useState<Record<string, string>>({});
  const [busySubmissionId, setBusySubmissionId] = useState<string | null>(null);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [isUpdatingPw, setIsUpdatingPw] = useState(false);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(() => auth.currentUser);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      setFirebaseUser(fbUser);
    });
    return () => unsub();
  }, []);

  const hasPanelAccess = Boolean(token) || isServerAdmin;

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    if (token) return token;
    if (isServerAdmin) {
      return await getFirebaseIdToken();
    }
    return null;
  }, [token, isServerAdmin]);

  const fetchOverview = useCallback(async () => {
    const authBearer = await getAuthToken();
    if (!authBearer) return;

    setLoadingOverview(true);
    setPanelError(null);
    try {
      const res = await fetch('/api/ceo/overview', {
        headers: { Authorization: `Bearer ${authBearer}` }
      });
      if (res.status === 401) {
        if (token) onTokenChange(null);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Veriler alınamadı.');
      }

      let mergedItems: StoreItem[] = data.items || [];
      let mergedSubmissions: AppSubmission[] = Array.isArray(data.submissions) ? data.submissions : [];

      if (isFirebaseAdminUser(auth.currentUser)) {
        try {
          const [cloudApps, cloudSubs] = await Promise.all([
            fetchAllAppsForAdminFromFirestore(),
            fetchAllSubmissionsForAdminFromFirestore()
          ]);
          const serverMap = new Map(mergedItems.map((it) => [it.id, it]));
          const cloudMap = new Map(cloudApps.map((it) => [it.id, it]));

          const missingOnServer = cloudApps.filter((c) => {
            const s = serverMap.get(c.id);
            if (!s) return true;
            const cTime = new Date(c.updatedAt || c.publishedAt || 0).getTime();
            const sTime = new Date(s.updatedAt || s.publishedAt || 0).getTime();
            return cTime > sTime;
          });

          if (missingOnServer.length > 0) {
            const syncRes = await fetch('/api/ceo/apps/sync-cloud', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authBearer}`
              },
              body: JSON.stringify({ items: missingOnServer })
            });
            if (syncRes.ok) {
              const syncData = await syncRes.json();
              if (Array.isArray(syncData.items)) {
                mergedItems = syncData.items;
              }
            }
          }

          const missingInCloud = mergedItems.filter((s) => !cloudMap.has(s.id) && (s.appUrl || s.gameplayUrl));
          if (missingInCloud.length > 0) {
            await syncAllAppsToFirestore(missingInCloud);
          }

          const subMap = new Map<string, AppSubmission>();
          for (const s of cloudSubs) subMap.set(s.id, s);
          for (const s of mergedSubmissions) subMap.set(s.id, s);
          mergedSubmissions = Array.from(subMap.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        } catch {
          // Non-fatal: keep server overview if Firestore admin read fails
        }
      }

      const computedStats = {
        totalApps: mergedItems.length,
        publishedApps: mergedItems.filter((i) => i.isPublished !== false).length,
        unpublishedApps: mergedItems.filter((i) => i.isPublished === false).length,
        totalOpens: mergedItems.reduce((sum, i) => sum + (i.opens || 0), 0),
        totalDownloads: mergedItems.reduce((sum, i) => sum + (i.downloads || 0), 0),
        totalLikes: mergedItems.reduce((sum, i) => sum + (i.likes || 0), 0),
        totalDislikes: mergedItems.reduce((sum, i) => sum + (i.dislikes || 0), 0)
      };

      setOverview({
        ...data,
        items: mergedItems,
        submissions: mergedSubmissions,
        stats: computedStats
      });
      setSubmissions(mergedSubmissions);
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : 'Veriler alınamadı.');
    } finally {
      setLoadingOverview(false);
    }
  }, [getAuthToken, token, onTokenChange]);

  useEffect(() => {
    if (hasPanelAccess) {
      void fetchOverview();
    } else {
      setOverview(null);
      setSubmissions([]);
    }
  }, [hasPanelAccess, fetchOverview, firebaseUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setAuthError('Lütfen CEO şifrenizi giriniz.');
      return;
    }
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/ceo/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Giriş başarısız.');
      }
      setPasswordInput('');
      onTokenChange(data.token);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Giriş yapılamadı.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleAdminGoogleSignIn = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const user = await signInWithGooglePopup();
      const idToken = await user.getIdToken(true);
      const res = await fetch('/api/auth/admin-status', {
        headers: { Authorization: `Bearer ${idToken}` }
      });
      const data = await res.json();
      if (!data.isAdmin) {
        throw new Error('Bu Google hesabı sunucu tarafında yetkili yönetici olarak tanımlı değil.');
      }
      onStoreChanged();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Yönetici Google doğrulaması başarısız.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch('/api/ceo/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch {
        // ignore network errors on logout
      }
    }
    onTokenChange(null);
    setForm(EMPTY_FORM);
    setActiveTab('apps');
  };

  const uploadApkToServer = async (file: File): Promise<ApkUploadResult> => {
    const authBearer = await getAuthToken();
    if (!authBearer) {
      throw new Error('APK yüklemek için yönetici oturumu doğrulanamadı.');
    }
    const formData = new FormData();
    formData.append('apk', file);
    const res = await fetch('/api/apk/upload', {
      method: 'POST',
      headers: { Authorization: `Bearer ${authBearer}` },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'APK yüklenemedi.');
    }
    return {
      apkId: data.apkId,
      apkFileName: data.apkFileName,
      fileSizeBytes: data.fileSizeBytes,
      apkSha256: data.apkSha256,
      scanReport: data.scanReport
    };
  };

  const handleFormApkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPanelError(null);
    setIsUploadingFormApk(true);
    try {
      const result = await uploadApkToServer(file);
      setForm((prev) => ({
        ...prev,
        launchMode: 'download',
        apkId: result.apkId,
        apkMeta: result,
        appUrl: prev.id ? `/api/apk/download/${prev.id}` : `/api/apk/download/${result.apkId}`
      }));
      setPanelNotice(`APK doğrulandı: ${result.apkFileName} (${formatFileSize(result.fileSizeBytes)})`);
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : 'APK yüklenemedi.');
    } finally {
      setIsUploadingFormApk(false);
    }
  };

  const handleImageFileUpload = async (
    field: 'logoUrl' | 'banner',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPanelError(null);
    try {
      const compressed = await compressImageFileForCloud(file, field);
      setForm((prev) => ({ ...prev, [field]: compressed }));
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : 'Görsel yüklenirken bir hata oluştu.');
    }
  };

  const handleEditItem = (item: StoreItem) => {
    setPanelError(null);
    setPanelNotice(null);
    setForm({
      id: item.id,
      title: item.title,
      developer: item.developer,
      category: item.category,
      packageName: item.packageName || '',
      version: item.version || 'v1.0.0',
      launchMode: item.launchMode === 'download' ? 'download' : 'link',
      appUrl: item.appUrl || item.gameplayUrl || '',
      logoUrl: item.logoUrl || '',
      banner: item.banner || '',
      icon: item.icon || 'Layers',
      shortDescription: item.shortDescription || '',
      fullDescription: item.fullDescription || '',
      updateNotes: item.updateNotes || '',
      isPublished: item.isPublished !== false,
      apkId: item.apkId || '',
      apkMeta:
        item.apkId && item.apkFileName && item.fileSizeBytes && item.apkSha256
          ? {
              apkId: item.apkId,
              apkFileName: item.apkFileName,
              fileSizeBytes: item.fileSizeBytes,
              apkSha256: item.apkSha256,
              scanReport: {
                passed: Boolean(item.apkVerified),
                isZipValid: true,
                hasAndroidManifest: true,
                hasClassesDex: true,
                hasResourcesArsc: true,
                entryCount: 0,
                totalUncompressedBytes: 0,
                suspiciousFiles: [],
                summary: item.apkScanSummary || 'Doğrulanmış APK'
              }
            }
          : null
    });
    setActiveTab('form');
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const authBearer = await getAuthToken();
    if (!authBearer) return;

    setPanelError(null);
    setPanelNotice(null);
    setIsSaving(true);

    try {
      const isEditing = Boolean(form.id);
      const endpoint = isEditing ? `/api/ceo/apps/${form.id}` : '/api/ceo/apps';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authBearer}`
        },
        body: JSON.stringify({
          title: form.title,
          developer: form.developer,
          category: form.category,
          packageName: form.packageName || undefined,
          version: form.version,
          launchMode: form.launchMode,
          appUrl: form.appUrl,
          apkId: form.apkId || undefined,
          logoUrl: form.logoUrl,
          banner: form.banner,
          icon: form.icon,
          shortDescription: form.shortDescription,
          fullDescription: form.fullDescription || form.shortDescription,
          updateNotes: form.updateNotes,
          isPublished: form.isPublished
        })
      });

      if (res.status === 401) {
        if (token) onTokenChange(null);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Uygulama kaydedilemedi.');
      }

      const isCloudSynced = Boolean(data.item && isFirebaseAdminUser(auth.currentUser));
      if (isCloudSynced) {
        await syncStoreAppToFirestore(data.item);
      }

      setPanelNotice(
        isCloudSynced
          ? isEditing
            ? 'Uygulama güncellendi ve Firebase bulutuna kaydedildi.'
            : 'Yeni uygulama oluşturuldu ve Firebase bulutuna kaydedildi.'
          : isEditing
          ? 'Uygulama sunucuya kaydedildi. Buluta kalıcı kayıt için "Firebase Bağla" butonuna tıklayın.'
          : 'Yeni uygulama sunucuya kaydedildi. Buluta kalıcı kayıt için "Firebase Bağla" butonuna tıklayın.'
      );
      setForm(EMPTY_FORM);
      setActiveTab('apps');
      await fetchOverview();
      onStoreChanged();
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : 'İşlem başarısız.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePublish = async (item: StoreItem) => {
    const authBearer = await getAuthToken();
    if (!authBearer) return;
    setBusyItemId(item.id);
    setPanelError(null);
    setPanelNotice(null);
    try {
      const nextPublished = item.isPublished === false;
      const res = await fetch(`/api/ceo/apps/${encodeURIComponent(item.id)}/publish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authBearer}`
        },
        body: JSON.stringify({ isPublished: nextPublished })
      });

      if (res.status === 401) {
        if (token) onTokenChange(null);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Yayın durumu değiştirilemedi.');
      }

      if (data.item && isFirebaseAdminUser(auth.currentUser)) {
        await syncStoreAppToFirestore(data.item);
      }

      setPanelNotice(
        nextPublished ? `"${item.title}" yayına alındı.` : `"${item.title}" yayından kaldırıldı.`
      );
      await fetchOverview();
      onStoreChanged();
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : 'İşlem başarısız.');
    } finally {
      setBusyItemId(null);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const authBearer = await getAuthToken();
    if (!authBearer) return;
    setBusyItemId(itemId);
    setPanelError(null);
    setPanelNotice(null);
    try {
      const res = await fetch(`/api/ceo/apps/${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authBearer}` }
      });

      if (res.status === 401) {
        if (token) onTokenChange(null);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Uygulama silinemedi.');
      }

      if (isFirebaseAdminUser(auth.currentUser)) {
        await deleteStoreAppFromFirestore(itemId);
      }

      setConfirmDeleteId(null);
      setPanelNotice('Uygulama ve bağlı APK paketi kalıcı olarak silindi.');
      await fetchOverview();
      onStoreChanged();
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : 'Silme işlemi başarısız.');
    } finally {
      setBusyItemId(null);
    }
  };

  const handleUploadUpdateApkFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPanelError(null);
    setIsUploadingUpdateApk(true);
    try {
      const result = await uploadApkToServer(file);
      setApkUpdateResult(result);
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : 'Yeni APK yüklenemedi.');
    } finally {
      setIsUploadingUpdateApk(false);
    }
  };

  const handleSaveApkVersionUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apkUpdateTarget || !apkUpdateResult) return;
    const authBearer = await getAuthToken();
    if (!authBearer) return;

    setIsSavingApkUpdate(true);
    setPanelError(null);
    try {
      const res = await fetch(`/api/ceo/apps/${encodeURIComponent(apkUpdateTarget.id)}/apk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authBearer}`
        },
        body: JSON.stringify({
          apkId: apkUpdateResult.apkId,
          version: apkUpdateVersion,
          updateNotes: apkUpdateNotes,
          packageName: apkUpdatePkg || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'APK sürümü güncellenemedi.');
      }
      if (data.item && isFirebaseAdminUser(auth.currentUser)) {
        await syncStoreAppToFirestore(data.item);
      }
      setPanelNotice(`"${apkUpdateTarget.title}" yeni APK sürümü (${apkUpdateVersion}) ile güncellendi.`);
      setApkUpdateTarget(null);
      setApkUpdateResult(null);
      await fetchOverview();
      onStoreChanged();
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : 'Güncelleme hatası.');
    } finally {
      setIsSavingApkUpdate(false);
    }
  };

  const handleReviewSubmission = async (sub: AppSubmission, action: 'approve' | 'reject') => {
    const authBearer = await getAuthToken();
    if (!authBearer) return;

    setBusySubmissionId(sub.id);
    setPanelError(null);
    setPanelNotice(null);
    const notes = (reviewNotesMap[sub.id] || '').trim();

    try {
      const res = await fetch(`/api/ceo/submissions/${encodeURIComponent(sub.id)}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authBearer}`
        },
        body: JSON.stringify({ action, reviewNotes: notes })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'İnceleme kaydedilemedi.');
      }

      if (isFirebaseAdminUser(auth.currentUser)) {
        if (action === 'approve' && data.item) {
          await syncStoreAppToFirestore(data.item);
        }
        await reviewSubmissionInFirestore(
          sub.id,
          action === 'approve' ? 'approved' : 'rejected',
          data.submission?.reviewNotes || notes || (action === 'approve' ? 'Onaylandı.' : 'Reddedildi.'),
          data.item?.id
        ).catch(() => {});
      }

      setPanelNotice(
        action === 'approve'
          ? `"${sub.title}" onaylandı ve mağazada yayınlandı.`
          : `"${sub.title}" başvurusu reddedildi ve karantina dosyası temizlendi.`
      );
      await fetchOverview();
      onStoreChanged();
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : 'İnceleme tamamlanamadı.');
    } finally {
      setBusySubmissionId(null);
    }
  };

  const handleInspectQuarantinedApk = async (sub: AppSubmission) => {
    const authBearer = await getAuthToken();
    if (!authBearer) return;
    try {
      const res = await fetch(`/api/apk/download/${encodeURIComponent(sub.apkId)}`, {
        headers: { Authorization: `Bearer ${authBearer}` }
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Karantina dosyası indirilemedi.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = sub.apkFileName || `${sub.apkId}.apk`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : 'Dosya indirilemedi.');
    }
  };

  const handleConnectAndSyncFirebase = async () => {
    setPanelError(null);
    setPanelNotice(null);
    setIsSyncingCloud(true);
    try {
      let current = auth.currentUser;
      if (!isFirebaseAdminUser(current)) {
        current = await signInWithGooglePopup();
        setFirebaseUser(current);
      }
      if (!isFirebaseAdminUser(current)) {
        throw new Error('Firebase yazma yetkisi için yetkili yönetici Google hesabı ile giriş yapılmalıdır.');
      }
      const synced = await syncAllAppsToFirestore(overview?.items || []);
      await fetchOverview();
      onStoreChanged();
      setPanelNotice(`Firebase veritabanı bağlandı ve ${synced} uygulama kaydı eşitlendi.`);
    } catch (err) {
      setPanelError(
        err instanceof Error ? err.message : 'Firebase bulut eşitlemesi tamamlanamadı.'
      );
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const authBearer = await getAuthToken();
    if (!authBearer) return;
    setPanelError(null);
    setPanelNotice(null);

    if (newPw.trim().length < 6) {
      setPanelError('Yeni CEO şifresi en az 6 karakter olmalıdır.');
      return;
    }
    if (newPw !== confirmPw) {
      setPanelError('Yeni şifre ve tekrar alanı birbiriyle eşleşmiyor.');
      return;
    }

    setIsUpdatingPw(true);
    try {
      const res = await fetch('/api/ceo/password/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authBearer}`
        },
        body: JSON.stringify({
          currentPassword: currentPw,
          newPassword: newPw.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Şifre güncellenemedi.');
      }

      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setPanelNotice(data.message || 'CEO güvenlik şifresi güncellendi.');
    } catch (err) {
      setPanelError(err instanceof Error ? err.message : 'Şifre güncellenemedi.');
    } finally {
      setIsUpdatingPw(false);
    }
  };

  if (!hasPanelAccess) {
    return (
      <div className="max-w-md mx-auto py-8 sm:py-12">
        <div className="rounded-3xl bg-[#05102b]/95 border border-blue-500/40 kenix-neon-frame-inner p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-950/80 border border-blue-400/50 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.35)]">
              <Lock className="w-6 h-6 text-blue-300" />
            </div>
            <h1 className="text-xl font-extrabold text-white">CEO / Yönetici Girişi</h1>
            <p className="text-sm text-slate-300">
              Uygulama eklemek, APK başvurularını incelemek ve istatistikleri yönetmek için yetkili oturum açın.
            </p>
          </div>

          <button
            type="button"
            disabled={isLoggingIn}
            onClick={handleAdminGoogleSignIn}
            className="w-full min-h-[46px] px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 text-sm font-bold inline-flex items-center justify-center gap-2 transition-colors"
          >
            <Chrome className="w-4 h-4 text-blue-600" />
            <span>Yetkili Yönetici Google Hesabıyla Gir</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-blue-500/20" />
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              veya CEO Şifresi
            </span>
            <div className="h-px flex-1 bg-blue-500/20" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="ceo-password" className="block text-xs font-semibold text-blue-200">
                CEO Güvenlik Şifresi
              </label>
              <input
                id="ceo-password"
                type="password"
                autoComplete="current-password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Şifrenizi giriniz"
                className="w-full min-h-[46px] px-4 rounded-xl bg-[#020718] border border-blue-500/35 focus:border-blue-400 focus:outline-none text-white text-sm placeholder:text-slate-500"
              />
            </div>

            {authError && (
              <p role="alert" className="text-xs font-semibold text-rose-300 bg-rose-950/40 border border-rose-500/35 rounded-xl px-3.5 py-2.5">
                {authError}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full min-h-[46px] rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-bold shadow-[0_0_20px_rgba(37,99,235,0.55)] transition-all"
            >
              {isLoggingIn ? 'Doğrulanıyor...' : 'Şifre ile Giriş Yap'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const items = overview?.items || [];
  const stats = overview?.stats;
  const usageEvents = overview?.usageEvents || [];
  const pendingCount = submissions.filter((s) => s.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* CEO Top Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-blue-500/25">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            CEO Yönetim Paneli
          </h1>
          <p className="text-sm text-slate-300 mt-0.5">
            Mağaza uygulamalarını, APK başvurularını, sürümleri ve indirme istatistiklerini yönetin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            disabled={isSyncingCloud}
            onClick={handleConnectAndSyncFirebase}
            className={`min-h-[44px] px-4 rounded-xl bg-[#05102b] border text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors ${
              isFirebaseAdminUser(firebaseUser)
                ? 'border-emerald-500/45 text-emerald-200 hover:border-emerald-400'
                : 'border-blue-500/35 text-blue-200 hover:border-blue-400'
            }`}
          >
            <Cloud className="w-4 h-4 shrink-0" />
            <span>
              {isSyncingCloud
                ? 'Eşitleniyor...'
                : isFirebaseAdminUser(firebaseUser)
                ? 'Firebase Eşitle'
                : 'Firebase Bağla'}
            </span>
          </button>

          {token && (
            <button
              type="button"
              onClick={handleLogout}
              className="min-h-[44px] px-4 rounded-xl bg-[#05102b] border border-rose-500/35 hover:border-rose-400 text-rose-200 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Çıkış Yap</span>
            </button>
          )}
        </div>
      </div>

      {!isFirebaseAdminUser(firebaseUser) && (
        <div className="rounded-2xl bg-amber-950/35 border border-amber-500/40 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs sm:text-sm text-amber-100">
            Oluşturduğunuz uygulamaların Firebase bulutuna kalıcı olarak kaydedilmesi için yönetici Google hesabınızı bağlayın.
          </p>
          <button
            type="button"
            disabled={isSyncingCloud}
            onClick={handleConnectAndSyncFirebase}
            className="min-h-[40px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors"
          >
            <Cloud className="w-4 h-4" />
            <span>{isSyncingCloud ? 'Bağlanıyor...' : 'Firebase Bağla & Eşitle'}</span>
          </button>
        </div>
      )}

      {/* CEO Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('apps')}
          className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold inline-flex items-center gap-2 border transition-all ${
            activeTab === 'apps'
              ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_16px_rgba(37,99,235,0.45)]'
              : 'bg-[#05102b] text-slate-300 border-blue-500/25 hover:border-blue-400/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Uygulamalar ({items.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('submissions')}
          className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold inline-flex items-center gap-2 border transition-all ${
            activeTab === 'submissions'
              ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_16px_rgba(37,99,235,0.45)]'
              : 'bg-[#05102b] text-slate-300 border-blue-500/25 hover:border-blue-400/60'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" />
          <span>APK Başvuruları ({pendingCount > 0 ? `${pendingCount} Bekliyor` : submissions.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setForm(EMPTY_FORM);
            setPanelError(null);
            setActiveTab('form');
          }}
          className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold inline-flex items-center gap-2 border transition-all ${
            activeTab === 'form'
              ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_16px_rgba(37,99,235,0.45)]'
              : 'bg-[#05102b] text-slate-300 border-blue-500/25 hover:border-blue-400/60'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>{form.id ? 'Uygulamayı Düzenle' : 'UYGULAMA EKLE'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('stats')}
          className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold inline-flex items-center gap-2 border transition-all ${
            activeTab === 'stats'
              ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_16px_rgba(37,99,235,0.45)]'
              : 'bg-[#05102b] text-slate-300 border-blue-500/25 hover:border-blue-400/60'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>İstatistikler</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setPanelError(null);
            setActiveTab('security');
          }}
          className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold inline-flex items-center gap-2 border transition-all ${
            activeTab === 'security'
              ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_16px_rgba(37,99,235,0.45)]'
              : 'bg-[#05102b] text-slate-300 border-blue-500/25 hover:border-blue-400/60'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Güvenlik</span>
        </button>
      </div>

      {panelError && (
        <div role="alert" className="rounded-xl bg-rose-950/50 border border-rose-500/40 px-4 py-3 text-sm font-medium text-rose-200">
          {panelError}
        </div>
      )}

      {panelNotice && (
        <div role="status" className="rounded-xl bg-emerald-950/45 border border-emerald-500/40 px-4 py-3 text-sm font-medium text-emerald-200 flex items-center justify-between gap-3">
          <span>{panelNotice}</span>
          <button
            type="button"
            onClick={() => setPanelNotice(null)}
            aria-label="Bildirimi kapat"
            className="text-emerald-300 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Quick APK Version Update Modal */}
      {apkUpdateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#01040f]/85 backdrop-blur-md">
          <form
            onSubmit={handleSaveApkVersionUpdate}
            className="w-full max-w-lg rounded-3xl bg-[#05102b] border border-blue-500/40 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-white">
                APK Sürümü Güncelle: {apkUpdateTarget.title}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setApkUpdateTarget(null);
                  setApkUpdateResult(null);
                }}
                className="p-2 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-semibold text-blue-200">
                Yeni .APK Paketi Seç (Maks. 100 MB) *
              </label>
              <label className="flex items-center justify-center gap-2 p-4 rounded-xl border border-dashed border-blue-500/40 bg-[#020718] cursor-pointer hover:border-blue-400 text-xs font-semibold text-blue-200">
                <FileArchive className="w-4 h-4" />
                <span>{isUploadingUpdateApk ? 'Taranıyor...' : apkUpdateResult ? apkUpdateResult.apkFileName : '.apk dosyası seç'}</span>
                <input
                  type="file"
                  accept=".apk"
                  disabled={isUploadingUpdateApk}
                  onChange={handleUploadUpdateApkFile}
                  className="hidden"
                />
              </label>
              {apkUpdateResult && (
                <p className="text-[11px] font-mono text-emerald-300">
                  {formatFileSize(apkUpdateResult.fileSizeBytes)} · SHA-256: {formatShortSha256(apkUpdateResult.apkSha256)}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-blue-200">Yeni Sürüm *</label>
                <input
                  required
                  type="text"
                  value={apkUpdateVersion}
                  onChange={(e) => setApkUpdateVersion(e.target.value)}
                  placeholder="v1.1.0"
                  className="w-full min-h-[42px] px-3 rounded-xl bg-[#020718] border border-blue-500/30 text-sm text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-blue-200">Paket Adı</label>
                <input
                  type="text"
                  value={apkUpdatePkg}
                  onChange={(e) => setApkUpdatePkg(e.target.value)}
                  placeholder="com.kenix.app"
                  className="w-full min-h-[42px] px-3 rounded-xl bg-[#020718] border border-blue-500/30 text-sm font-mono text-white"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-blue-200">Güncelleme Notları</label>
              <textarea
                rows={2}
                value={apkUpdateNotes}
                onChange={(e) => setApkUpdateNotes(e.target.value)}
                placeholder="Bu sürümdeki yenilikler..."
                className="w-full p-3 rounded-xl bg-[#020718] border border-blue-500/30 text-sm text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setApkUpdateTarget(null);
                  setApkUpdateResult(null);
                }}
                className="min-h-[42px] px-4 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={!apkUpdateResult || isSavingApkUpdate}
                className="min-h-[42px] px-5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold"
              >
                {isSavingApkUpdate ? 'Güncelleniyor...' : 'Yeni APK Sürümünü Yayınla'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 1: Apps List */}
      {activeTab === 'apps' && (
        <div className="space-y-4">
          {loadingOverview && !overview ? (
            <div className="rounded-2xl bg-[#05102b]/80 border border-blue-500/20 p-8 text-center text-sm text-slate-300">
              Yükleniyor...
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl bg-[#05102b]/80 border border-blue-500/25 p-8 text-center space-y-3">
              <p className="text-base font-semibold text-white">Henüz kayıtlı uygulama yok</p>
              <p className="text-sm text-slate-400">
                İlk gerçek uygulamanızı eklemek için UYGULAMA EKLE sekmesini kullanabilirsiniz.
              </p>
              <button
                type="button"
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setActiveTab('form');
                }}
                className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>UYGULAMA EKLE</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const isPublished = item.isPublished !== false;
                const isBusy = busyItemId === item.id;
                const isConfirmingDelete = confirmDeleteId === item.id;

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl bg-[#05102b]/90 border border-blue-500/25 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-xl shrink-0 bg-[#020718] border border-blue-400/35 overflow-hidden flex items-center justify-center">
                        {item.logoUrl ? (
                          <img
                            src={item.logoUrl}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ItemIcon name={item.icon} size={24} className="w-6 h-6 text-blue-300" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                          <h2 className="text-base font-bold text-white truncate">{item.title}</h2>
                          <span
                            className={`text-xs font-bold ${
                              isPublished ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {isPublished ? 'Yayında' : 'Yayında Değil'}
                          </span>
                          {item.apkVerified && (
                            <span className="text-[11px] font-bold text-emerald-300 inline-flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              APK
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-300 truncate">
                          {item.category} · {item.version} · {item.developer}
                          {item.fileSizeBytes ? ` · ${formatFileSize(item.fileSizeBytes)}` : ''}
                          {item.packageName ? ` · ${item.packageName}` : ''}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-blue-300/80">
                          <span className="truncate max-w-md">
                            {item.appUrl || item.gameplayUrl || 'Bağlantı tanımlanmamış'}
                          </span>
                          {(item.appUrl || item.gameplayUrl) && (
                            <a
                              href={item.appUrl || item.gameplayUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-300 hover:text-white underline font-sans shrink-0"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Kontrol Et</span>
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 tabular-nums">
                          Açılma: {item.opens || 0} · İndirme: {item.downloads || 0} · Beğeni: {item.likes} · Beğenmeme: {item.dislikes}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setApkUpdateTarget(item);
                          setApkUpdateVersion(item.version || 'v1.1.0');
                          setApkUpdateNotes('');
                          setApkUpdatePkg(item.packageName || '');
                          setApkUpdateResult(null);
                        }}
                        className="min-h-[44px] px-3.5 rounded-xl bg-[#030a1e] border border-cyan-500/35 hover:border-cyan-400 text-cyan-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>APK Güncelle</span>
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleTogglePublish(item)}
                        className={`min-h-[44px] px-3.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 border transition-colors ${
                          isPublished
                            ? 'bg-amber-950/40 border-amber-500/35 text-amber-200 hover:border-amber-400'
                            : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200 hover:border-emerald-400'
                        }`}
                      >
                        {isPublished ? (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Yayından Kaldır</span>
                          </>
                        ) : (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Yayına Al</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleEditItem(item)}
                        className="min-h-[44px] px-3.5 rounded-xl bg-[#030a1e] border border-blue-500/30 hover:border-blue-400 text-blue-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Düzenle</span>
                      </button>

                      {isConfirmingDelete ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDeleteItem(item.id)}
                            className="min-h-[44px] px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold inline-flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Silmeyi Onayla</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="min-h-[44px] px-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
                          >
                            İptal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="min-h-[44px] px-3.5 rounded-xl bg-[#030a1e] border border-rose-500/30 hover:border-rose-400 text-rose-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Sil</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: Submissions Review */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          {submissions.length === 0 ? (
            <div className="rounded-2xl bg-[#05102b]/80 border border-blue-500/25 p-8 text-center space-y-2">
              <p className="text-base font-semibold text-white">Henüz kullanıcı APK başvurusu yok</p>
              <p className="text-sm text-slate-400">
                Geliştiriciler "APK Gönder" sayfasından uygulama yüklediğinde güvenlik taraması raporu ile burada listelenir.
              </p>
            </div>
          ) : (
            submissions.map((sub) => {
              const isBusy = busySubmissionId === sub.id;
              return (
                <div
                  key={sub.id}
                  className="rounded-2xl bg-[#05102b]/95 border border-blue-500/30 p-5 space-y-4"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-white">{sub.title}</h3>
                        <span className="text-xs font-mono text-blue-300">{sub.version}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${
                            sub.status === 'pending'
                              ? 'bg-amber-500/15 border-amber-400/40 text-amber-200'
                              : sub.status === 'approved'
                              ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                              : 'bg-rose-500/15 border-rose-400/40 text-rose-200'
                          }`}
                        >
                          {sub.status === 'pending'
                            ? 'Onay Bekliyor'
                            : sub.status === 'approved'
                            ? 'Onaylandı'
                            : 'Reddedildi'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Geliştirici: <span className="text-white font-semibold">{sub.developer}</span> ({sub.userEmail}) · Kategori: {sub.category}
                      </p>
                      <p className="text-xs font-mono text-blue-200/90">
                        Paket: {sub.packageName} · Dosya: {sub.apkFileName} ({formatFileSize(sub.fileSizeBytes)})
                      </p>
                      <p className="text-[11px] font-mono text-slate-400 break-all">
                        SHA-256: {sub.apkSha256}
                      </p>
                      <p className="text-xs text-emerald-300 font-medium">
                        {sub.apkScanSummary}
                      </p>
                      <p className="text-sm text-slate-200 pt-1">{sub.shortDescription}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {sub.status !== 'rejected' && (
                        <button
                          type="button"
                          onClick={() => handleInspectQuarantinedApk(sub)}
                          className="min-h-[42px] px-3.5 rounded-xl bg-[#020718] border border-blue-500/35 hover:border-blue-400 text-blue-200 text-xs font-semibold inline-flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>APK İncele</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {sub.status === 'pending' && (
                    <div className="pt-3 border-t border-blue-500/20 flex flex-col sm:flex-row gap-3">
                      <input
                        type="text"
                        value={reviewNotesMap[sub.id] || ''}
                        onChange={(e) =>
                          setReviewNotesMap((prev) => ({ ...prev, [sub.id]: e.target.value }))
                        }
                        placeholder="İnceleme notu (isteğe bağlı)"
                        className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-[#020718] border border-blue-500/30 text-xs sm:text-sm text-white"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleReviewSubmission(sub, 'approve')}
                          className="min-h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>Onayla ve Yayınla</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleReviewSubmission(sub, 'reject')}
                          className="min-h-[42px] px-4 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <X className="w-4 h-4" />
                          <span>Reddet</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 2: Add / Edit App Form */}
      {activeTab === 'form' && (
        <form
          onSubmit={handleSubmitForm}
          className="rounded-3xl bg-[#05102b]/95 border border-blue-500/30 p-5 sm:p-7 space-y-5"
        >
          <div className="flex items-center justify-between gap-4 pb-3 border-b border-blue-500/20">
            <h2 className="text-lg font-bold text-white">
              {form.id ? 'Uygulamayı Düzenle' : 'UYGULAMA EKLE'}
            </h2>
            {form.id && (
              <button
                type="button"
                onClick={() => {
                  setForm(EMPTY_FORM);
                  setActiveTab('apps');
                }}
                className="text-xs font-semibold text-slate-400 hover:text-white"
              >
                Düzenlemeden Vazgeç
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="app-title" className="block text-xs font-semibold text-blue-200">
                Uygulama Adı *
              </label>
              <input
                id="app-title"
                required
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Örn: Uygulama adı"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="app-category" className="block text-xs font-semibold text-blue-200">
                Kategori *
              </label>
              <input
                id="app-category"
                required
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Örn: Yapay Zeka, Araçlar, Oyun"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="app-developer" className="block text-xs font-semibold text-blue-200">
                Geliştirici
              </label>
              <input
                id="app-developer"
                type="text"
                value={form.developer}
                onChange={(e) => setForm({ ...form, developer: e.target.value })}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="app-pkg" className="block text-xs font-semibold text-blue-200">
                Android Paket Adı (İsteğe Bağlı)
              </label>
              <input
                id="app-pkg"
                type="text"
                value={form.packageName}
                onChange={(e) => setForm({ ...form, packageName: e.target.value })}
                placeholder="Örn: com.kenix.uygulama"
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm font-mono text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 md:col-span-2">
              <div className="space-y-1.5">
                <label htmlFor="app-version" className="block text-xs font-semibold text-blue-200">
                  Sürüm
                </label>
                <input
                  id="app-version"
                  type="text"
                  value={form.version}
                  onChange={(e) => setForm({ ...form, version: e.target.value })}
                  placeholder="v1.0.0"
                  className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="app-launch-mode" className="block text-xs font-semibold text-blue-200">
                  Buton Davranışı
                </label>
                <select
                  id="app-launch-mode"
                  value={form.launchMode}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      launchMode: e.target.value === 'download' ? 'download' : 'link'
                    })
                  }
                  className="w-full min-h-[44px] px-3 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm text-white"
                >
                  <option value="link">Uygulamayı Aç (Bağlantı)</option>
                  <option value="download">APK / Dosya İndir</option>
                </select>
              </div>
            </div>
          </div>

          {/* Direct APK File Upload OR External URL */}
          <div className="rounded-2xl bg-[#020718]/80 border border-blue-500/25 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-blue-200">
                Gerçek .APK Paketi Yükle (İsteğe Bağlı, Maks. 100 MB)
              </label>
              <label className="min-h-[40px] px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer self-start">
                <FileArchive className="w-4 h-4" />
                <span>{isUploadingFormApk ? 'APK Taranıyor...' : '.APK Dosyası Seç'}</span>
                <input
                  type="file"
                  accept=".apk"
                  disabled={isUploadingFormApk}
                  onChange={handleFormApkUpload}
                  className="hidden"
                />
              </label>
            </div>
            {form.apkMeta && (
              <div className="text-xs text-emerald-300 space-y-1">
                <p className="font-semibold">
                  ✓ {form.apkMeta.apkFileName} ({formatFileSize(form.apkMeta.fileSizeBytes)})
                </p>
                <p className="font-mono text-[11px] text-slate-300 break-all">
                  SHA-256: {form.apkMeta.apkSha256}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="app-url" className="block text-xs font-semibold text-blue-200">
              Uygulama Bağlantısı (https://... veya APK yüklendiyse otomatik doldurulur) *
            </label>
            <input
              id="app-url"
              required={!form.apkId}
              type="text"
              value={form.appUrl}
              onChange={(e) => setForm({ ...form, appUrl: e.target.value })}
              placeholder="https://... veya /api/apk/download/..."
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm font-mono text-white"
            />
          </div>

          {/* Logo & Cover Upload / URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="app-logo-url" className="block text-xs font-semibold text-blue-200">
                Uygulama Logosu (URL veya Yükle)
              </label>
              <div className="flex gap-2">
                <input
                  id="app-logo-url"
                  type="text"
                  value={form.logoUrl}
                  onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                  placeholder="https://... veya dosya yükleyin"
                  className="flex-1 min-w-0 min-h-[44px] px-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-xs text-white"
                />
                <label className="min-h-[44px] px-3 rounded-xl bg-blue-950/70 hover:bg-blue-900/70 border border-blue-500/35 text-xs font-semibold text-blue-200 inline-flex items-center gap-1.5 cursor-pointer shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Yükle</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageFileUpload('logoUrl', e)}
                  />
                </label>
              </div>
              {form.logoUrl && (
                <div className="flex items-center gap-3 pt-1">
                  <img
                    src={form.logoUrl}
                    alt="Logo önizleme"
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-xl object-cover border border-blue-400/40 bg-[#020718]"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, logoUrl: '' })}
                    className="text-xs text-rose-300 hover:text-rose-200"
                  >
                    Logoyu Temizle
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <label htmlFor="app-fallback-icon" className="text-xs text-slate-400">
                  Varsayılan Simge:
                </label>
                <select
                  id="app-fallback-icon"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                  className="min-h-[36px] px-2.5 rounded-lg bg-[#020718] border border-blue-500/25 text-xs text-slate-200"
                >
                  {ICON_OPTIONS.map((ic) => (
                    <option key={ic} value={ic}>
                      {ic}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="app-banner-url" className="block text-xs font-semibold text-blue-200">
                Kapak Görseli (URL veya Yükle)
              </label>
              <div className="flex gap-2">
                <input
                  id="app-banner-url"
                  type="text"
                  value={form.banner}
                  onChange={(e) => setForm({ ...form, banner: e.target.value })}
                  placeholder="https://... veya dosya yükleyin"
                  className="flex-1 min-w-0 min-h-[44px] px-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-xs text-white"
                />
                <label className="min-h-[44px] px-3 rounded-xl bg-blue-950/70 hover:bg-blue-900/70 border border-blue-500/35 text-xs font-semibold text-blue-200 inline-flex items-center gap-1.5 cursor-pointer shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Yükle</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageFileUpload('banner', e)}
                  />
                </label>
              </div>
              {form.banner && (
                <div className="flex items-center gap-3 pt-1">
                  <img
                    src={form.banner}
                    alt="Kapak görseli önizleme"
                    referrerPolicy="no-referrer"
                    className="w-20 h-11 rounded-xl object-cover border border-blue-400/40 bg-[#020718]"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, banner: '' })}
                    className="text-xs text-rose-300 hover:text-rose-200"
                  >
                    Kapağı Temizle
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="app-short-desc" className="block text-xs font-semibold text-blue-200">
              Kısa Açıklama
            </label>
            <textarea
              id="app-short-desc"
              rows={2}
              value={form.shortDescription}
              onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
              placeholder="Mağaza kartında görünecek özet açıklama (isteğe bağlı)"
              className="w-full p-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="app-full-desc" className="block text-xs font-semibold text-blue-200">
              Detaylı Açıklama
            </label>
            <textarea
              id="app-full-desc"
              rows={4}
              value={form.fullDescription}
              onChange={(e) => setForm({ ...form, fullDescription: e.target.value })}
              placeholder="Uygulama detay sayfasında gösterilecek açıklama"
              className="w-full p-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="app-update-notes" className="block text-xs font-semibold text-blue-200">
              Güncelleme Notları
            </label>
            <textarea
              id="app-update-notes"
              rows={2}
              value={form.updateNotes}
              onChange={(e) => setForm({ ...form, updateNotes: e.target.value })}
              placeholder="Bu sürümdeki yenilikler ve iyileştirmeler"
              className="w-full p-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm text-white"
            />
          </div>

          <label className="inline-flex items-center gap-2.5 min-h-[44px] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
              className="w-4 h-4 rounded accent-blue-500"
            />
            <span className="text-sm font-medium text-slate-200">
              Mağazada yayında olsun
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="min-h-[46px] px-6 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-bold shadow-[0_0_20px_rgba(37,99,235,0.55)] transition-all"
            >
              {isSaving
                ? 'Yayınlanıyor...'
                : form.id
                ? 'Değişiklikleri Kaydet'
                : form.isPublished
                ? 'YAYINLA'
                : 'Taslak Olarak Kaydet'}
            </button>

            <button
              type="button"
              onClick={() => {
                setForm(EMPTY_FORM);
                setActiveTab('apps');
              }}
              className="min-h-[46px] px-5 rounded-xl bg-[#030a1e] border border-slate-700 text-slate-300 hover:text-white text-sm font-semibold"
            >
              İptal
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: Real Usage Statistics */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="rounded-2xl bg-[#05102b] border border-blue-500/25 p-4">
              <p className="text-xs text-slate-400">Yayındaki Uygulama</p>
              <p className="text-2xl font-extrabold text-white tabular-nums mt-1">
                {stats?.publishedApps ?? 0}
              </p>
            </div>
            <div className="rounded-2xl bg-[#05102b] border border-blue-500/25 p-4">
              <p className="text-xs text-slate-400">Taslak / Kapalı</p>
              <p className="text-2xl font-extrabold text-amber-300 tabular-nums mt-1">
                {stats?.unpublishedApps ?? 0}
              </p>
            </div>
            <div className="rounded-2xl bg-[#05102b] border border-blue-500/25 p-4">
              <p className="text-xs text-slate-400">Toplam Açılma</p>
              <p className="text-2xl font-extrabold text-blue-300 tabular-nums mt-1">
                {stats?.totalOpens ?? 0}
              </p>
            </div>
            <div className="rounded-2xl bg-[#05102b] border border-blue-500/25 p-4">
              <p className="text-xs text-slate-400">Toplam İndirme</p>
              <p className="text-2xl font-extrabold text-cyan-300 tabular-nums mt-1">
                {stats?.totalDownloads ?? 0}
              </p>
            </div>
            <div className="rounded-2xl bg-[#05102b] border border-blue-500/25 p-4">
              <p className="text-xs text-slate-400">Toplam Beğeni</p>
              <p className="text-2xl font-extrabold text-emerald-300 tabular-nums mt-1">
                {stats?.totalLikes ?? 0}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-[#05102b]/90 border border-blue-500/25 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-blue-500/20">
              <h2 className="text-sm font-bold text-white">Son İndirme ve Açma Kayıtları</h2>
            </div>
            {usageEvents.length === 0 ? (
              <p className="p-6 text-sm text-slate-400 text-center">
                Henüz kaydedilmiş kullanıcı açma veya indirme işlemi bulunmuyor.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-[#030a1e] text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Uygulama</th>
                      <th className="px-4 py-3 font-semibold">İşlem</th>
                      <th className="px-4 py-3 font-semibold">Kullanıcı</th>
                      <th className="px-4 py-3 font-semibold">Tarih</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-500/15">
                    {usageEvents.slice(0, 50).map((evt) => (
                      <tr key={evt.id} className="hover:bg-blue-950/25">
                        <td className="px-4 py-3 font-semibold text-white">{evt.itemTitle}</td>
                        <td className="px-4 py-3 text-blue-300">
                          {evt.action === 'download' ? 'İndirildi' : 'Açıldı'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-400">{evt.userId}</td>
                        <td className="px-4 py-3 text-slate-400 tabular-nums">
                          {formatDateTime(evt.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Security / Password Management */}
      {activeTab === 'security' && (
        <form
          onSubmit={handleChangePassword}
          className="max-w-lg rounded-3xl bg-[#05102b]/95 border border-blue-500/30 p-5 sm:p-7 space-y-4"
        >
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-blue-400" />
              <span>CEO Güvenlik Şifresini Güncelle</span>
            </h2>
            <p className="text-xs text-slate-300">
              Yeni şifreniz sunucu tarafında tuzlanmış scrypt özeti olarak güvenle saklanır.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ceo-current-pw" className="block text-xs font-semibold text-blue-200">
              Mevcut Şifre
            </label>
            <input
              id="ceo-current-pw"
              type="password"
              required
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ceo-new-pw" className="block text-xs font-semibold text-blue-200">
              Yeni Şifre (en az 6 karakter)
            </label>
            <input
              id="ceo-new-pw"
              type="password"
              required
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ceo-confirm-pw" className="block text-xs font-semibold text-blue-200">
              Yeni Şifre Tekrar
            </label>
            <input
              id="ceo-confirm-pw"
              type="password"
              required
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#020718] border border-blue-500/30 focus:border-blue-400 focus:outline-none text-sm text-white"
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingPw}
            className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-bold shadow-[0_0_16px_rgba(37,99,235,0.45)] transition-all"
          >
            {isUpdatingPw ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
          </button>
        </form>
      )}
    </div>
  );
};
