import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getDocs,
  getFirestore,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import {
  getDownloadURL,
  getStorage,
  ref as storageRef,
  uploadBytesResumable
} from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';
import { AppSubmission, StoreItem } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export const BOOTSTRAPPED_ADMIN_EMAILS = [
  'sungurbey5151@gmail.com',
  'goktashacer289@gmail.com'
];

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write'
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email
        })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

export function isFirebaseAdminUser(user: User | null): boolean {
  const email = user?.email?.toLowerCase() ?? '';
  return Boolean(
    user &&
      user.emailVerified === true &&
      BOOTSTRAPPED_ADMIN_EMAILS.includes(email)
  );
}

export async function getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  const current = auth.currentUser;
  if (!current) return null;
  try {
    return await current.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}

export function translateFirebaseAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code || '';
  switch (code) {
    case 'auth/operation-not-allowed':
      return 'E-posta/Şifre ile giriş henüz Firebase Console üzerinde etkinleştirilmemiş. Google ile Giriş kullanabilir veya Firebase Authentication sağlayıcılarından Email/Password seçeneğini açabilirsiniz.';
    case 'auth/email-already-in-use':
      return 'Bu e-posta adresi zaten başka bir hesapla kayıtlı.';
    case 'auth/invalid-email':
      return 'Lütfen geçerli bir e-posta adresi giriniz.';
    case 'auth/weak-password':
      return 'Şifre en az 6 karakter uzunluğunda olmalıdır.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
      return 'E-posta adresi veya şifre hatalı.';
    case 'auth/too-many-requests':
      return 'Çok fazla deneme yapıldı. Lütfen biraz bekleyip tekrar deneyin.';
    case 'auth/popup-closed-by-user':
      return 'Google giriş penceresi kapatıldı.';
    default:
      return error instanceof Error ? error.message : 'Kimlik doğrulama işlemi başarısız.';
  }
}

export async function signInWithGooglePopup(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    throw new Error(translateFirebaseAuthError(error));
  }
}

export async function registerWithEmailPassword(
  email: string,
  password: string,
  displayName: string
): Promise<User> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (displayName.trim()) {
      await updateProfile(cred.user, { displayName: displayName.trim().slice(0, 60) });
    }
    try {
      await sendEmailVerification(cred.user);
    } catch {
      // Non-fatal if verification email rate-limited
    }
    return cred.user;
  } catch (error) {
    throw new Error(translateFirebaseAuthError(error));
  }
}

export async function loginWithEmailPassword(email: string, password: string): Promise<User> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return cred.user;
  } catch (error) {
    throw new Error(translateFirebaseAuthError(error));
  }
}

export async function resendVerificationEmail(): Promise<void> {
  if (!auth.currentUser) {
    throw new Error('Aktif bir oturum bulunamadı.');
  }
  try {
    await sendEmailVerification(auth.currentUser);
  } catch (error) {
    throw new Error(translateFirebaseAuthError(error));
  }
}

export async function reloadFirebaseUser(): Promise<User | null> {
  if (!auth.currentUser) return null;
  await auth.currentUser.reload();
  return auth.currentUser;
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

function toIsoString(val: unknown): string {
  if (val instanceof Timestamp) {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string' && val.trim()) {
    return val;
  }
  return new Date().toISOString();
}

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  return cleaned || `id-${Date.now()}`;
}

function isValidPackageName(pkg?: string): boolean {
  if (!pkg) return false;
  return (
    pkg.length >= 3 &&
    pkg.length <= 160 &&
    /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)+$/.test(pkg)
  );
}

function isValidSha256(hash?: string): boolean {
  if (!hash) return false;
  return /^[a-fA-F0-9]{64}$/.test(hash);
}

function isValidApkLocation(url?: string): boolean {
  if (!url) return false;
  return (
    url.length >= 8 &&
    url.length <= 2000 &&
    (/^https?:\/\/.+/.test(url) || /^\/api\/apk\/download\/[a-zA-Z0-9_-]+$/.test(url))
  );
}

function mapDocToStoreItem(docId: string, data: Record<string, unknown>): StoreItem {
  const appUrl = typeof data.appUrl === 'string' ? data.appUrl : '';
  const launchMode = data.launchMode === 'download' ? 'download' : 'link';
  const version = typeof data.version === 'string' && data.version ? data.version : 'v1.0.0';
  const publishedAt = toIsoString(data.publishedAt);
  const updatedAt = toIsoString(data.updatedAt || data.publishedAt);
  const updateNotes = typeof data.updateNotes === 'string' ? data.updateNotes : '';

  return {
    id: typeof data.id === 'string' && data.id ? data.id : docId,
    title: typeof data.title === 'string' ? data.title : 'Uygulama',
    type: data.type === 'game' ? 'game' : 'app',
    category: typeof data.category === 'string' ? data.category : 'Genel',
    developer: typeof data.developer === 'string' ? data.developer : 'KENİX',
    isOfficialKenix: Boolean(data.isOfficialKenix),
    shortDescription: typeof data.shortDescription === 'string' ? data.shortDescription : '',
    fullDescription: typeof data.fullDescription === 'string' ? data.fullDescription : '',
    icon: typeof data.icon === 'string' ? data.icon : 'Layers',
    logoUrl: typeof data.logoUrl === 'string' && data.logoUrl ? data.logoUrl : undefined,
    banner: typeof data.banner === 'string' ? data.banner : '',
    tags: Array.isArray(data.tags) ? data.tags.filter((t): t is string => typeof t === 'string') : [],
    likes: typeof data.likes === 'number' ? data.likes : 0,
    dislikes: typeof data.dislikes === 'number' ? data.dislikes : 0,
    downloads: typeof data.downloads === 'number' ? data.downloads : 0,
    opens: typeof data.opens === 'number' ? data.opens : 0,
    rating: typeof data.rating === 'number' ? data.rating : 0,
    version,
    publishedAt,
    updatedAt,
    updateNotes: updateNotes || undefined,
    demoType: launchMode === 'download' ? 'installed' : 'playable',
    appUrl,
    gameplayUrl: appUrl,
    launchMode,
    isPublished: data.isPublished !== false,
    packageName: typeof data.packageName === 'string' ? data.packageName : undefined,
    apkId: typeof data.apkId === 'string' ? data.apkId : undefined,
    apkUrl: typeof data.apkUrl === 'string' ? data.apkUrl : undefined,
    apkFileName: typeof data.apkFileName === 'string' ? data.apkFileName : undefined,
    fileSizeBytes: typeof data.fileSizeBytes === 'number' ? data.fileSizeBytes : undefined,
    apkSha256: typeof data.apkSha256 === 'string' ? data.apkSha256 : undefined,
    apkVerified: typeof data.apkVerified === 'boolean' ? data.apkVerified : undefined,
    apkScanSummary: typeof data.apkScanSummary === 'string' ? data.apkScanSummary : undefined,
    submittedBy: typeof data.submittedBy === 'string' ? data.submittedBy : undefined,
    submissionId: typeof data.submissionId === 'string' ? data.submissionId : undefined,
    versionHistory: updateNotes
      ? [{ version, date: updatedAt, notes: updateNotes }]
      : []
  };
}

function buildStoreAppPayload(item: StoreItem, isNew: boolean) {
  const safeId = sanitizeId(item.id);
  const cleanUrl = (item.appUrl || item.gameplayUrl || '').trim().slice(0, 2000);
  const rawLogo = (item.logoUrl || '').trim();
  const rawBanner = (item.banner || '').trim();

  if (rawLogo.startsWith('data:image/') && rawLogo.length > 350000) {
    throw new Error('Logo görseli bulut kaydı için çok büyük. Lütfen daha küçük bir görsel seçin.');
  }
  if (rawBanner.startsWith('data:image/') && rawBanner.length > 450000) {
    throw new Error('Kapak görseli bulut kaydı için çok büyük. Lütfen daha küçük bir görsel seçin.');
  }

  const cleanLogo = rawLogo.slice(0, 350000);
  const cleanBanner = rawBanner.slice(0, 450000);
  const cleanCategory = (item.category || 'Genel').trim().slice(0, 80) || 'Genel';
  const cleanDeveloper = (item.developer || 'KENİX').trim().slice(0, 100) || 'KENİX';
  const cleanTags = (item.tags && item.tags.length > 0 ? item.tags : [cleanCategory])
    .slice(0, 10)
    .map((t) => String(t).slice(0, 60));

  const payload: Record<string, unknown> = {
    id: safeId,
    title: item.title.trim().slice(0, 120),
    type: item.type === 'game' ? 'game' : 'app',
    category: cleanCategory,
    developer: cleanDeveloper,
    isOfficialKenix: Boolean(item.isOfficialKenix),
    shortDescription: (item.shortDescription || `${cleanCategory} · ${cleanDeveloper}`).slice(0, 300),
    fullDescription: (item.fullDescription || item.shortDescription || cleanCategory).slice(0, 4000),
    icon: (item.icon || 'Layers').slice(0, 60),
    banner: cleanBanner,
    tags: cleanTags,
    likes: Math.max(0, Math.floor(item.likes || 0)),
    dislikes: Math.max(0, Math.floor(item.dislikes || 0)),
    downloads: Math.max(0, Math.floor(item.downloads || 0)),
    opens: Math.max(0, Math.floor(item.opens || 0)),
    rating: Math.min(5, Math.max(0, Number(item.rating || 0))),
    version: (item.version || 'v1.0.0').slice(0, 40),
    appUrl: cleanUrl,
    launchMode: item.launchMode === 'download' ? 'download' : 'link',
    isPublished: item.isPublished !== false,
    updatedAt: serverTimestamp()
  };

  if (cleanLogo) {
    payload.logoUrl = cleanLogo;
  }
  if (item.updateNotes) {
    payload.updateNotes = item.updateNotes.slice(0, 1000);
  }
  if (item.packageName && isValidPackageName(item.packageName.trim())) {
    payload.packageName = item.packageName.trim();
  }
  if (item.apkId) {
    payload.apkId = sanitizeId(item.apkId);
  }
  if (item.apkUrl && isValidApkLocation(item.apkUrl.trim())) {
    payload.apkUrl = item.apkUrl.trim().slice(0, 2000);
  }
  if (item.apkFileName) {
    payload.apkFileName = item.apkFileName.trim().slice(0, 200);
  }
  if (typeof item.fileSizeBytes === 'number' && item.fileSizeBytes > 0 && item.fileSizeBytes <= 104857600) {
    payload.fileSizeBytes = Math.floor(item.fileSizeBytes);
  }
  if (item.apkSha256 && isValidSha256(item.apkSha256.trim())) {
    payload.apkSha256 = item.apkSha256.trim().toLowerCase();
  }
  if (typeof item.apkVerified === 'boolean') {
    payload.apkVerified = item.apkVerified;
  }
  if (item.apkScanSummary) {
    payload.apkScanSummary = item.apkScanSummary.slice(0, 500);
  }
  if (item.submittedBy) {
    payload.submittedBy = sanitizeId(item.submittedBy);
  }
  if (item.submissionId) {
    payload.submissionId = sanitizeId(item.submissionId);
  }
  if (isNew) {
    payload.publishedAt = serverTimestamp();
  }

  return { safeId, payload };
}

export function subscribePublishedApps(
  onApps: (apps: StoreItem[]) => void,
  onSyncError?: (err: unknown) => void
): () => void {
  const appsQuery = query(collection(db, 'apps'), where('isPublished', '==', true));
  return onSnapshot(
    appsQuery,
    (snapshot) => {
      const list = snapshot.docs.map((d) => mapDocToStoreItem(d.id, d.data() as Record<string, unknown>));
      onApps(list);
    },
    (error) => {
      if (onSyncError) onSyncError(error);
      handleFirestoreError(error, OperationType.LIST, 'apps');
    }
  );
}

export async function fetchAllAppsForAdminFromFirestore(): Promise<StoreItem[]> {
  if (!isFirebaseAdminUser(auth.currentUser)) return [];
  try {
    const snap = await getDocs(collection(db, 'apps'));
    return snap.docs.map((d) => mapDocToStoreItem(d.id, d.data() as Record<string, unknown>));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'apps');
  }
}

export async function syncStoreAppToFirestore(item: StoreItem): Promise<void> {
  if (!isFirebaseAdminUser(auth.currentUser)) return;
  const safeId = sanitizeId(item.id);
  const ref = doc(db, 'apps', safeId);
  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      const { payload } = buildStoreAppPayload(item, true);
      await setDoc(ref, payload);
    } else {
      const prevData = existing.data();
      const { payload } = buildStoreAppPayload(item, false);
      payload.publishedAt = prevData.publishedAt;
      payload.likes = Math.max(Number(prevData.likes || 0), Number(payload.likes || 0));
      payload.dislikes = Math.max(Number(prevData.dislikes || 0), Number(payload.dislikes || 0));
      payload.downloads = Math.max(Number(prevData.downloads || 0), Number(payload.downloads || 0));
      payload.opens = Math.max(Number(prevData.opens || 0), Number(payload.opens || 0));
      await setDoc(ref, payload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `apps/${safeId}`);
  }
}

export async function deleteStoreAppFromFirestore(itemId: string): Promise<void> {
  if (!isFirebaseAdminUser(auth.currentUser)) return;
  const safeId = sanitizeId(itemId);
  try {
    await deleteDoc(doc(db, 'apps', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `apps/${safeId}`);
  }
}

export async function syncAllAppsToFirestore(items: StoreItem[]): Promise<number> {
  if (!isFirebaseAdminUser(auth.currentUser)) return 0;
  let count = 0;
  for (const item of items) {
    if (item.appUrl || item.gameplayUrl) {
      await syncStoreAppToFirestore(item);
      count += 1;
    }
  }
  return count;
}

function mapDocToSubmission(docId: string, data: Record<string, unknown>): AppSubmission {
  return {
    id: typeof data.id === 'string' && data.id ? data.id : docId,
    userId: typeof data.userId === 'string' ? data.userId : '',
    userEmail: typeof data.userEmail === 'string' ? data.userEmail : '',
    developer: typeof data.developer === 'string' ? data.developer : 'Geliştirici',
    title: typeof data.title === 'string' ? data.title : 'Başvuru',
    packageName: typeof data.packageName === 'string' ? data.packageName : '',
    category: typeof data.category === 'string' ? data.category : 'Araçlar',
    version: typeof data.version === 'string' ? data.version : 'v1.0.0',
    shortDescription: typeof data.shortDescription === 'string' ? data.shortDescription : '',
    fullDescription: typeof data.fullDescription === 'string' ? data.fullDescription : '',
    updateNotes: typeof data.updateNotes === 'string' ? data.updateNotes : undefined,
    icon: typeof data.icon === 'string' ? data.icon : 'Layers',
    logoUrl: typeof data.logoUrl === 'string' ? data.logoUrl : undefined,
    banner: typeof data.banner === 'string' ? data.banner : '',
    apkId: typeof data.apkId === 'string' ? data.apkId : '',
    apkUrl: typeof data.apkUrl === 'string' ? data.apkUrl : '',
    apkFileName: typeof data.apkFileName === 'string' ? data.apkFileName : '',
    fileSizeBytes: typeof data.fileSizeBytes === 'number' ? data.fileSizeBytes : 0,
    apkSha256: typeof data.apkSha256 === 'string' ? data.apkSha256 : '',
    apkScanPassed: Boolean(data.apkScanPassed),
    apkScanSummary: typeof data.apkScanSummary === 'string' ? data.apkScanSummary : '',
    status:
      data.status === 'approved' || data.status === 'rejected' ? data.status : 'pending',
    reviewNotes: typeof data.reviewNotes === 'string' ? data.reviewNotes : undefined,
    reviewedBy: typeof data.reviewedBy === 'string' ? data.reviewedBy : undefined,
    reviewedAt: data.reviewedAt ? toIsoString(data.reviewedAt) : undefined,
    publishedAppId: typeof data.publishedAppId === 'string' ? data.publishedAppId : undefined,
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt || data.createdAt)
  };
}

export async function uploadApkToFirebaseStorage(
  file: File,
  folderPrefix: 'apks' | 'approved-apks',
  ownerOrAppId: string,
  subId?: string,
  onProgress?: (pct: number) => void
): Promise<string | null> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const objectPath =
    folderPrefix === 'apks'
      ? `apks/${sanitizeId(ownerOrAppId)}/${sanitizeId(subId || `sub_${Date.now()}`)}/${safeName}`
      : `approved-apks/${sanitizeId(ownerOrAppId)}/${safeName}`;

  try {
    const targetRef = storageRef(storage, objectPath);
    const task = uploadBytesResumable(targetRef, file, {
      contentType: 'application/vnd.android.package-archive'
    });

    await new Promise<void>((resolve, reject) => {
      task.on(
        'state_changed',
        (snap) => {
          if (onProgress && snap.totalBytes > 0) {
            onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
          }
        },
        (err) => reject(err),
        () => resolve()
      );
    });

    return await getDownloadURL(task.snapshot.ref);
  } catch {
    // Cloud Storage rules may not yet be deployed in Firebase Console; server storage remains active.
    return null;
  }
}

export async function createSubmissionInFirestore(submission: AppSubmission): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;

  const safeId = sanitizeId(submission.id);
  const safeUid = sanitizeId(user.uid);
  const ref = doc(db, 'submissions', safeId);

  const payload: Record<string, unknown> = {
    id: safeId,
    userId: safeUid,
    userEmail: (user.email || submission.userEmail || 'user@kenix.local').slice(0, 160),
    developer: submission.developer.trim().slice(0, 100),
    title: submission.title.trim().slice(0, 120),
    packageName: submission.packageName.trim(),
    category: submission.category.trim().slice(0, 80),
    version: submission.version.trim().slice(0, 40),
    shortDescription: submission.shortDescription.trim().slice(0, 300),
    fullDescription: submission.fullDescription.trim().slice(0, 4000),
    icon: (submission.icon || 'Layers').slice(0, 60),
    banner: (submission.banner || '').slice(0, 450000),
    apkId: sanitizeId(submission.apkId),
    apkUrl: submission.apkUrl.slice(0, 2000),
    apkFileName: submission.apkFileName.slice(0, 200),
    fileSizeBytes: Math.floor(submission.fileSizeBytes),
    apkSha256: submission.apkSha256.toLowerCase(),
    apkScanPassed: true,
    apkScanSummary: submission.apkScanSummary.slice(0, 500),
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  if (submission.logoUrl && submission.logoUrl.length <= 350000) {
    payload.logoUrl = submission.logoUrl;
  }
  if (submission.updateNotes) {
    payload.updateNotes = submission.updateNotes.slice(0, 1000);
  }

  try {
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `submissions/${safeId}`);
  }
}

export function subscribeUserSubmissions(
  uid: string,
  onSubmissions: (list: AppSubmission[]) => void
): () => void {
  const safeUid = sanitizeId(uid);
  const q = query(collection(db, 'submissions'), where('userId', '==', safeUid));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => mapDocToSubmission(d.id, d.data() as Record<string, unknown>))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onSubmissions(items);
    },
    () => {
      // Non-fatal fallback to /api/submissions/mine
    }
  );
}

export async function fetchAllSubmissionsForAdminFromFirestore(): Promise<AppSubmission[]> {
  if (!isFirebaseAdminUser(auth.currentUser)) return [];
  try {
    const snap = await getDocs(collection(db, 'submissions'));
    return snap.docs
      .map((d) => mapDocToSubmission(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'submissions');
  }
}

export async function reviewSubmissionInFirestore(
  submissionId: string,
  status: 'approved' | 'rejected',
  reviewNotes: string,
  publishedAppId?: string
): Promise<void> {
  if (!isFirebaseAdminUser(auth.currentUser)) return;
  const safeId = sanitizeId(submissionId);
  const ref = doc(db, 'submissions', safeId);
  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) return;
    const updates: Record<string, unknown> = {
      status,
      reviewNotes: reviewNotes.slice(0, 500),
      reviewedBy: (auth.currentUser?.email || 'admin').slice(0, 160),
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    if (publishedAppId) {
      updates.publishedAppId = sanitizeId(publishedAppId);
    }
    await updateDoc(ref, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `submissions/${safeId}`);
  }
}

export async function ensureFirestoreUserDoc(user: User): Promise<number> {
  if (!user.emailVerified) return 120;
  const uid = sanitizeId(user.uid);
  const userRef = doc(db, 'users', uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const username = (user.displayName || user.email?.split('@')[0] || 'KenixUser').slice(0, 80);
      await setDoc(userRef, {
        userId: uid,
        username,
        kcBalance: 120,
        studioPlan: 'normal',
        plusExpiry: null,
        favorites: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return 120;
    }
    const data = snap.data();
    return typeof data.kcBalance === 'number' ? data.kcBalance : 120;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}

export async function syncVerifiedDownloadRewardToFirestore(item: StoreItem): Promise<boolean> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return false;

  const uid = sanitizeId(user.uid);
  const appId = sanitizeId(item.id);

  try {
    const appRef = doc(db, 'apps', appId);
    const appSnap = await getDoc(appRef);
    if (!appSnap.exists() || appSnap.data().isPublished !== true) {
      return false;
    }

    await ensureFirestoreUserDoc(user);

    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    const currentBalance = typeof userSnap.data()?.kcBalance === 'number' ? userSnap.data()!.kcBalance : 120;

    const rewardRef = doc(db, 'users', uid, 'downloadRewards', appId);
    const rewardSnap = await getDoc(rewardRef);
    if (rewardSnap.exists()) {
      await updateDoc(appRef, { downloads: increment(1) });
      return false;
    }

    const txId = sanitizeId(`tx-dl-${appId}-${Date.now()}`);
    const txRef = doc(db, 'users', uid, 'transactions', txId);

    const batch = writeBatch(db);
    batch.set(rewardRef, {
      appId,
      userId: uid,
      rewardAmount: 100,
      verified: true,
      createdAt: serverTimestamp()
    });
    batch.update(userRef, {
      kcBalance: currentBalance + 100,
      lastRewardedAppId: appId,
      updatedAt: serverTimestamp()
    });
    batch.set(txRef, {
      id: txId,
      userId: uid,
      amount: 100,
      type: 'download_reward',
      description: `${item.title.slice(0, 120)} Doğrulanmış İndirme Ödülü (+100 KS)`,
      balanceAfter: currentBalance + 100,
      createdAt: serverTimestamp()
    });
    batch.update(appRef, { downloads: increment(1) });

    await batch.commit();
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}/downloadRewards/${appId}`);
  }
}

export async function trackAppOpenInFirestore(appIdRaw: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const appId = sanitizeId(appIdRaw);
  try {
    const appRef = doc(db, 'apps', appId);
    const snap = await getDoc(appRef);
    if (!snap.exists() || snap.data().isPublished !== true) return;
    await updateDoc(appRef, { opens: increment(1) });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `apps/${appId}`);
  }
}
