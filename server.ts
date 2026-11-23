import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { getApps, initializeApp as initializeAdminApp } from 'firebase-admin/app';
import { DecodedIdToken, getAuth as getAdminAuth } from 'firebase-admin/auth';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'kenix_store_data.json');
const APK_DIR = path.join(DATA_DIR, 'apks');
const MAX_APK_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB

const ENV_CEO_PIN = process.env.CEO_PIN || '';
const CEO_SESSION_TTL_MS = 1000 * 60 * 60 * 24;
const ceoSessions = new Map<string, { createdAt: number; expiresAt: number }>();
const ceoLoginAttempts = new Map<string, { count: number; resetAt: number }>();

const DEFAULT_ADMIN_EMAILS = ['sungurbey5151@gmail.com', 'goktashacer289@gmail.com'];
const ADMIN_EMAIL_SET = new Set(
  [
    ...DEFAULT_ADMIN_EMAILS,
    ...(process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  ].map((e) => e.toLowerCase())
);

let adminInitialized = false;
function ensureFirebaseAdminAuth() {
  if (!adminInitialized) {
    if (getApps().length === 0) {
      const cfg = readFirebaseConfig();
      if (cfg?.projectId) {
        initializeAdminApp({ projectId: cfg.projectId });
      } else {
        initializeAdminApp();
      }
    }
    adminInitialized = true;
  }
  return getAdminAuth();
}

function hashPasswordScrypt(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyScryptPassword(candidate: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  try {
    const derived = crypto.scryptSync(candidate, salt, 64);
    const storedBuf = Buffer.from(keyHex, 'hex');
    if (derived.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(derived, storedBuf);
  } catch {
    return false;
  }
}

function verifyCeoPassword(db: DatabaseSchema, candidate: string): boolean {
  const clean = String(candidate || '').trim();
  if (!clean) return false;

  if (db.ceoAuth?.passwordHash) {
    if (verifyScryptPassword(clean, db.ceoAuth.passwordHash)) {
      return true;
    }
  }

  if (ENV_CEO_PIN) {
    const hashA = crypto.createHash('sha256').update(clean).digest();
    const hashB = crypto.createHash('sha256').update(ENV_CEO_PIN).digest();
    return crypto.timingSafeEqual(hashA, hashB);
  }

  return false;
}

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.slice(7).trim() || null;
}

function isValidCeoToken(token: string | null): boolean {
  if (!token) return false;
  const session = ceoSessions.get(token);
  if (!session) return false;
  if (session.expiresAt < Date.now()) {
    ceoSessions.delete(token);
    return false;
  }
  return true;
}

async function verifyFirebaseBearerToken(req: Request): Promise<DecodedIdToken | null> {
  const token = getBearerToken(req);
  if (!token || isValidCeoToken(token) || /^[a-f0-9]{64}$/i.test(token)) {
    return null;
  }
  try {
    const adminAuth = ensureFirebaseAdminAuth();
    return await adminAuth.verifyIdToken(token);
  } catch {
    return null;
  }
}

function isDecodedFirebaseAdmin(decoded: DecodedIdToken | null): boolean {
  if (!decoded || decoded.email_verified !== true || !decoded.email) return false;
  return ADMIN_EMAIL_SET.has(decoded.email.toLowerCase());
}

async function isRequestCeoOrAdmin(req: Request): Promise<{ ok: boolean; actor: string }> {
  const token = getBearerToken(req);
  if (isValidCeoToken(token)) {
    return { ok: true, actor: 'CEO' };
  }
  const decoded = await verifyFirebaseBearerToken(req);
  if (isDecodedFirebaseAdmin(decoded)) {
    return { ok: true, actor: decoded?.email || 'Admin' };
  }
  return { ok: false, actor: '' };
}

async function requireCeoAuth(req: Request, res: Response, next: NextFunction) {
  const check = await isRequestCeoOrAdmin(req);
  if (!check.ok) {
    return res.status(401).json({ error: 'Yetkisiz erişim. Sunucu tarafından doğrulanmış yönetici oturumu gereklidir.' });
  }
  (req as Request & { adminActor?: string }).adminActor = check.actor;
  next();
}

async function requireVerifiedFirebaseUser(req: Request, res: Response, next: NextFunction) {
  const decoded = await verifyFirebaseBearerToken(req);
  if (!decoded) {
    return res.status(401).json({ error: 'Bu işlem için geçerli bir kullanıcı oturumu gereklidir.' });
  }
  if (decoded.email_verified !== true) {
    return res.status(403).json({ error: 'İşlem yapabilmek için e-posta adresinizi doğrulamanız gerekir.' });
  }
  (req as Request & { firebaseUser?: DecodedIdToken }).firebaseUser = decoded;
  next();
}

function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isSafeExternalUrlForFetch(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '0.0.0.0' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function isValidAppLocation(url: string): boolean {
  if (!url) return false;
  if (/^\/api\/apk\/download\/[a-zA-Z0-9_-]{1,128}$/.test(url)) return true;
  return isValidHttpUrl(url);
}

function isValidPackageName(pkg: string): boolean {
  return (
    pkg.length >= 3 &&
    pkg.length <= 160 &&
    /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)+$/.test(pkg)
  );
}

function isValidImageSource(src: string): boolean {
  if (!src) return true;
  if (src.startsWith('data:image/')) return true;
  return isValidHttpUrl(src);
}

function ensureApkDir() {
  if (!fs.existsSync(APK_DIR)) {
    fs.mkdirSync(APK_DIR, { recursive: true });
  }
}

function resolveConfinedApkPath(storedName: string): string | null {
  if (!storedName || !/^[a-zA-Z0-9._-]+$/.test(storedName)) return null;
  const resolved = path.resolve(APK_DIR, path.basename(storedName));
  if (!resolved.startsWith(APK_DIR + path.sep)) return null;
  return resolved;
}

interface ApkScanReport {
  passed: boolean;
  isZipValid: boolean;
  hasAndroidManifest: boolean;
  hasClassesDex: boolean;
  hasResourcesArsc: boolean;
  entryCount: number;
  totalUncompressedBytes: number;
  suspiciousFiles: string[];
  summary: string;
}

interface StoredApkRecord {
  apkId: string;
  storedName: string;
  originalFileName: string;
  fileSizeBytes: number;
  sha256: string;
  uploadedByUid: string;
  uploadedByEmail: string;
  quarantined: boolean;
  scanReport: ApkScanReport;
  createdAt: string;
}

interface AppSubmission {
  id: string;
  userId: string;
  userEmail: string;
  developer: string;
  title: string;
  packageName: string;
  category: string;
  version: string;
  shortDescription: string;
  fullDescription: string;
  updateNotes?: string;
  icon: string;
  logoUrl?: string;
  banner: string;
  apkId: string;
  apkUrl: string;
  apkFileName: string;
  fileSizeBytes: number;
  apkSha256: string;
  apkScanPassed: boolean;
  apkScanSummary: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  publishedAppId?: string;
  createdAt: string;
  updatedAt: string;
}

function scanApkBuffer(buf: Buffer): ApkScanReport {
  const fail = (summary: string, partial: Partial<ApkScanReport> = {}): ApkScanReport => ({
    passed: false,
    isZipValid: false,
    hasAndroidManifest: false,
    hasClassesDex: false,
    hasResourcesArsc: false,
    entryCount: 0,
    totalUncompressedBytes: 0,
    suspiciousFiles: [],
    summary,
    ...partial
  });

  if (buf.length < 22 || buf.length > MAX_APK_SIZE_BYTES) {
    return fail('Dosya boyutu geçersiz veya 100 MB sınırını aşıyor.');
  }

  // ZIP Local File Header magic bytes PK\x03\x04
  if (buf[0] !== 0x50 || buf[1] !== 0x4b || buf[2] !== 0x03 || buf[3] !== 0x04) {
    return fail('Geçersiz APK biçimi: ZIP / Android Paket imzası (PK) bulunamadı.');
  }

  // Locate End of Central Directory (EOCD: 0x06054b50) within last 65KB + 22 bytes
  const minSearchStart = Math.max(0, buf.length - 65557);
  let eocdOffset = -1;
  for (let i = buf.length - 22; i >= minSearchStart; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      const commentLen = buf.readUInt16LE(i + 20);
      if (i + 22 + commentLen === buf.length) {
        eocdOffset = i;
        break;
      }
    }
  }

  if (eocdOffset === -1) {
    return fail('Bozuk APK arşivi: Merkezi Dizin Sonu (EOCD) bulunamadı.');
  }

  const totalEntries = buf.readUInt16LE(eocdOffset + 10);
  const centralDirSize = buf.readUInt32LE(eocdOffset + 12);
  const centralDirOffset = buf.readUInt32LE(eocdOffset + 16);

  if (
    totalEntries === 0 ||
    totalEntries > 65000 ||
    centralDirOffset + centralDirSize > eocdOffset
  ) {
    return fail('APK dizin yapısı bozuk veya aşırı dosya girişi içeriyor.');
  }

  let cursor = centralDirOffset;
  let parsedEntries = 0;
  let hasAndroidManifest = false;
  let hasClassesDex = false;
  let hasResourcesArsc = false;
  let totalUncompressedBytes = 0;
  const suspiciousFiles: string[] = [];
  let pathTraversalDetected = false;
  let zipBombDetected = false;

  const SUSPICIOUS_EXT_RE = /\.(exe|bat|cmd|ps1|vbs|vbe|scr|msi|hta|com|pif)$/i;

  while (cursor + 46 <= centralDirOffset + centralDirSize && parsedEntries < totalEntries) {
    const sig = buf.readUInt32LE(cursor);
    if (sig !== 0x02014b50) {
      return fail('APK merkezi dizin kaydı doğrulaması başarısız oldu.');
    }

    const compressedSize = buf.readUInt32LE(cursor + 20);
    const uncompressedSize = buf.readUInt32LE(cursor + 24);
    const fileNameLen = buf.readUInt16LE(cursor + 28);
    const extraFieldLen = buf.readUInt16LE(cursor + 30);
    const fileCommentLen = buf.readUInt16LE(cursor + 32);

    const nameStart = cursor + 46;
    const nameEnd = nameStart + fileNameLen;
    if (nameEnd > centralDirOffset + centralDirSize) {
      return fail('APK dosya adı tablosu okunamadı.');
    }

    const entryName = buf.toString('utf8', nameStart, nameEnd);

    // Zip-Slip path traversal detection
    if (
      entryName.includes('..') ||
      entryName.startsWith('/') ||
      entryName.startsWith('\\') ||
      /^[a-zA-Z]:/.test(entryName)
    ) {
      pathTraversalDetected = true;
    }

    // Zip-Bomb detection
    totalUncompressedBytes += uncompressedSize;
    if (
      uncompressedSize > 250 * 1024 * 1024 ||
      totalUncompressedBytes > 600 * 1024 * 1024 ||
      (compressedSize > 0 && uncompressedSize > 10 * 1024 * 1024 && uncompressedSize / compressedSize > 100)
    ) {
      zipBombDetected = true;
    }

    if (entryName === 'AndroidManifest.xml') {
      hasAndroidManifest = true;
    }
    if (/^classes\d*\.dex$/.test(entryName)) {
      hasClassesDex = true;
    }
    if (entryName === 'resources.arsc') {
      hasResourcesArsc = true;
    }
    if (SUSPICIOUS_EXT_RE.test(entryName)) {
      suspiciousFiles.push(entryName);
    }

    cursor = nameEnd + extraFieldLen + fileCommentLen;
    parsedEntries += 1;
  }

  if (pathTraversalDetected) {
    return fail('Güvenlik Taraması Reddedildi: Arşivde yol geçişi (Zip-Slip) tespit edildi.', {
      isZipValid: true,
      hasAndroidManifest,
      hasClassesDex,
      hasResourcesArsc,
      entryCount: parsedEntries,
      totalUncompressedBytes
    });
  }

  if (zipBombDetected) {
    return fail('Güvenlik Taraması Reddedildi: Aşırı sıkıştırma / Zip-Bomb şüphesi tespit edildi.', {
      isZipValid: true,
      hasAndroidManifest,
      hasClassesDex,
      hasResourcesArsc,
      entryCount: parsedEntries,
      totalUncompressedBytes
    });
  }

  if (suspiciousFiles.length > 0) {
    return fail(
      `Güvenlik Taraması Reddedildi: Zararlı olabilecek çalıştırılabilir dosyalar bulundu (${suspiciousFiles.slice(0, 3).join(', ')}).`,
      {
        isZipValid: true,
        hasAndroidManifest,
        hasClassesDex,
        hasResourcesArsc,
        entryCount: parsedEntries,
        totalUncompressedBytes,
        suspiciousFiles
      }
    );
  }

  if (!hasAndroidManifest) {
    return fail('APK Doğrulama Hatası: AndroidManifest.xml bulunamadı.', {
      isZipValid: true,
      hasAndroidManifest: false,
      hasClassesDex,
      hasResourcesArsc,
      entryCount: parsedEntries,
      totalUncompressedBytes
    });
  }

  if (!hasClassesDex && !hasResourcesArsc) {
    return fail('APK Doğrulama Hatası: classes.dex veya resources.arsc bileşeni eksik.', {
      isZipValid: true,
      hasAndroidManifest: true,
      hasClassesDex,
      hasResourcesArsc,
      entryCount: parsedEntries,
      totalUncompressedBytes
    });
  }

  return {
    passed: true,
    isZipValid: true,
    hasAndroidManifest,
    hasClassesDex,
    hasResourcesArsc,
    entryCount: parsedEntries,
    totalUncompressedBytes,
    suspiciousFiles: [],
    summary: `APK doğrulandı (${parsedEntries} dosya, AndroidManifest.xml${hasClassesDex ? ' + classes.dex' : ''}, temiz tarama).`
  };
}

interface StoreItem {
  id: string;
  title: string;
  type: 'app' | 'game';
  category: string;
  developer: string;
  isOfficialKenix: boolean;
  shortDescription: string;
  fullDescription: string;
  icon: string;
  logoUrl?: string;
  banner: string;
  tags: string[];
  likes: number;
  dislikes: number;
  downloads: number;
  opens?: number;
  rating: number;
  version: string;
  publishedAt: string;
  updatedAt?: string;
  updateNotes?: string;
  demoType: 'playable' | 'installed';
  gameplayUrl?: string;
  appUrl?: string;
  launchMode?: 'link' | 'download';
  isPublished?: boolean;
  publisherUserId?: string;
  featured?: boolean;
  ageRating?: '3+' | '7+' | '12+' | '16+' | '18+';
  versionHistory?: Array<{ version: string; date: string; notes: string }>;
  packageName?: string;
  apkId?: string;
  apkUrl?: string;
  apkFileName?: string;
  fileSizeBytes?: number;
  apkSha256?: string;
  apkVerified?: boolean;
  apkScanSummary?: string;
  submittedBy?: string;
  submissionId?: string;
}

interface GameDraft {
  id: string;
  userId: string;
  title: string;
  category: string;
  type2d3d: '2d' | '3d';
  description: string;
  icon: string;
  banner: string;
  ageRating: '3+' | '7+' | '12+' | '16+' | '18+';
  gameData?: {
    theme?: string;
    musicTrack?: string;
    hasGravity?: boolean;
    weather?: string;
    dayNightCycle?: boolean;
    characterPowers?: string[];
    enemyAiType?: string;
    speed?: number;
    jumpHeight?: number;
    startingHealth?: number;
    lightingPreset?: string;
    mapLayout?: any;
    questData?: any;
  };
  updatedAt: string;
}

interface UserTransaction {
  id: string;
  amount: number;
  type:
    | 'daily'
    | 'publish'
    | 'studio_entry'
    | 'membership'
    | 'sponsor_reward'
    | 'sponsor_revoke'
    | 'download_reward';
  description: string;
  date: string;
  balanceAfter: number;
}

interface UserProfile {
  userId: string;
  username: string;
  kcBalance: number;
  lastDailyRewardDate: string | null;
  studioPlan: 'normal' | 'plus';
  plusExpiry: string | null;
  votes: Record<string, 'like' | 'dislike'>;
  favorites?: string[];
  rewardedDownloads?: string[];
  transactions: UserTransaction[];
}

interface SponsorshipSubmission {
  id: string;
  userId: string;
  username: string;
  appId: string;
  appTitle: string;
  videoUrl: string;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  submittedAt: string;
  reviewedAt?: string;
  notes?: string;
  rewardAmount: number;
}

interface AppUsageEvent {
  id: string;
  itemId: string;
  itemTitle: string;
  userId: string;
  action: 'open' | 'download';
  timestamp: string;
}

interface DatabaseSchema {
  items: StoreItem[];
  users: Record<string, UserProfile>;
  sponsorships: SponsorshipSubmission[];
  itemVotes: Record<string, Record<string, 'like' | 'dislike'>>; // itemId -> userId -> vote
  drafts: GameDraft[];
  usageEvents?: AppUsageEvent[];
  apkFiles?: Record<string, StoredApkRecord>;
  submissions?: AppSubmission[];
  ceoAuth?: {
    passwordHash: string;
    updatedAt: string;
  };
}

const INITIAL_ITEMS: StoreItem[] = [];

function ensureDb(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  ensureApkDir();

  if (!fs.existsSync(DATA_FILE)) {
    const initialDb: DatabaseSchema = {
      items: INITIAL_ITEMS,
      users: {},
      sponsorships: [],
      itemVotes: {},
      drafts: [],
      apkFiles: {},
      submissions: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialDb, null, 2), 'utf-8');
    return initialDb;
  }

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.items) parsed.items = [];
    if (!parsed.users) parsed.users = {};
    if (!parsed.sponsorships) parsed.sponsorships = [];
    if (!parsed.itemVotes) parsed.itemVotes = {};
    if (!parsed.drafts) parsed.drafts = [];
    if (!parsed.usageEvents) parsed.usageEvents = [];
    if (!parsed.apkFiles) parsed.apkFiles = {};
    if (!parsed.submissions) parsed.submissions = [];
    return parsed;
  } catch (err) {
    console.error('Failed reading DB file, recreating default:', err);
    const fallback: DatabaseSchema = {
      items: INITIAL_ITEMS,
      users: {},
      sponsorships: [],
      itemVotes: {},
      drafts: [],
      usageEvents: [],
      apkFiles: {},
      submissions: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

function saveDb(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving DB:', err);
  }
}

function getOrCreateUser(db: DatabaseSchema, userId: string, username?: string): UserProfile {
  if (!db.users[userId]) {
    db.users[userId] = {
      userId,
      username: username || `KenixUser_${userId.slice(-4)}`,
      kcBalance: 120,
      lastDailyRewardDate: null,
      studioPlan: 'normal',
      plusExpiry: null,
      votes: {},
      favorites: [],
      rewardedDownloads: [],
      transactions: [
        {
          id: `tx-init-${Date.now()}`,
          amount: 120,
          type: 'daily',
          description: 'Kenix STORE Hoş Geldin Başlangıç Bakiyesi (+120 KS)',
          date: new Date().toISOString(),
          balanceAfter: 120
        }
      ]
    };
    saveDb(db);
  }

  const user = db.users[userId];
  if (!user.favorites) {
    user.favorites = [];
  }
  if (!user.rewardedDownloads) {
    user.rewardedDownloads = [];
  }
  // Check if PLUS membership expired
  if (user.studioPlan === 'plus' && user.plusExpiry) {
    if (new Date(user.plusExpiry).getTime() < Date.now()) {
      user.studioPlan = 'normal';
      user.plusExpiry = null;
      saveDb(db);
    }
  }

  return user;
}

const FIREBASE_CONFIG_FILE = path.join(__dirname, 'firebase-applet-config.json');

interface FirebaseConfigSubset {
  projectId: string;
  firestoreDatabaseId: string;
}

function readFirebaseConfig(): FirebaseConfigSubset | null {
  try {
    if (!fs.existsSync(FIREBASE_CONFIG_FILE)) return null;
    const raw = JSON.parse(fs.readFileSync(FIREBASE_CONFIG_FILE, 'utf-8'));
    if (raw?.projectId && raw?.firestoreDatabaseId) {
      return { projectId: String(raw.projectId), firestoreDatabaseId: String(raw.firestoreDatabaseId) };
    }
    return null;
  } catch {
    return null;
  }
}

function decodeFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    const arr = Array.isArray(val.arrayValue?.values) ? val.arrayValue.values : [];
    return arr.map(decodeFirestoreValue);
  }
  if ('mapValue' in val) {
    const out: Record<string, any> = {};
    const fields = val.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = decodeFirestoreValue(v);
    }
    return out;
  }
  return undefined;
}

function decodeFirestoreAppDoc(docObj: any): StoreItem | null {
  if (!docObj?.fields) return null;
  const f: Record<string, any> = {};
  for (const [k, v] of Object.entries(docObj.fields)) {
    f[k] = decodeFirestoreValue(v);
  }
  const docNameParts = typeof docObj.name === 'string' ? docObj.name.split('/') : [];
  const docId = docNameParts[docNameParts.length - 1] || '';
  const id = typeof f.id === 'string' && f.id ? f.id : docId;
  if (!id || !f.title) return null;

  const appUrl = typeof f.appUrl === 'string' ? f.appUrl : '';
  const launchMode = f.launchMode === 'download' ? 'download' : 'link';
  const version = typeof f.version === 'string' && f.version ? f.version : 'v1.0.0';
  const publishedAt = typeof f.publishedAt === 'string' && f.publishedAt ? f.publishedAt : new Date().toISOString();
  const updatedAt = typeof f.updatedAt === 'string' && f.updatedAt ? f.updatedAt : publishedAt;
  const updateNotes = typeof f.updateNotes === 'string' ? f.updateNotes : '';

  return {
    id,
    title: String(f.title),
    type: f.type === 'game' ? 'game' : 'app',
    category: typeof f.category === 'string' && f.category ? f.category : 'Genel',
    developer: typeof f.developer === 'string' && f.developer ? f.developer : 'KENİX',
    isOfficialKenix: f.isOfficialKenix !== false,
    shortDescription: typeof f.shortDescription === 'string' ? f.shortDescription : '',
    fullDescription: typeof f.fullDescription === 'string' ? f.fullDescription : '',
    icon: typeof f.icon === 'string' && f.icon ? f.icon : 'Layers',
    logoUrl: typeof f.logoUrl === 'string' && f.logoUrl ? f.logoUrl : undefined,
    banner: typeof f.banner === 'string' ? f.banner : '',
    tags: Array.isArray(f.tags) ? f.tags.filter((t): t is string => typeof t === 'string') : [],
    likes: typeof f.likes === 'number' ? f.likes : 0,
    dislikes: typeof f.dislikes === 'number' ? f.dislikes : 0,
    downloads: typeof f.downloads === 'number' ? f.downloads : 0,
    opens: typeof f.opens === 'number' ? f.opens : 0,
    rating: typeof f.rating === 'number' ? f.rating : 0,
    version,
    publishedAt,
    updatedAt,
    updateNotes: updateNotes || undefined,
    demoType: launchMode === 'download' ? 'installed' : 'playable',
    appUrl,
    gameplayUrl: appUrl,
    launchMode,
    isPublished: f.isPublished !== false,
    packageName: typeof f.packageName === 'string' ? f.packageName : undefined,
    apkId: typeof f.apkId === 'string' ? f.apkId : undefined,
    apkUrl: typeof f.apkUrl === 'string' ? f.apkUrl : undefined,
    apkFileName: typeof f.apkFileName === 'string' ? f.apkFileName : undefined,
    fileSizeBytes: typeof f.fileSizeBytes === 'number' ? f.fileSizeBytes : undefined,
    apkSha256: typeof f.apkSha256 === 'string' ? f.apkSha256 : undefined,
    apkVerified: typeof f.apkVerified === 'boolean' ? f.apkVerified : undefined,
    apkScanSummary: typeof f.apkScanSummary === 'string' ? f.apkScanSummary : undefined,
    submittedBy: typeof f.submittedBy === 'string' ? f.submittedBy : undefined,
    submissionId: typeof f.submissionId === 'string' ? f.submissionId : undefined,
    versionHistory: updateNotes ? [{ version, date: updatedAt, notes: updateNotes }] : []
  };
}

function mergeItemIntoDb(db: DatabaseSchema, cloudItem: StoreItem): boolean {
  const idx = db.items.findIndex((i) => i.id === cloudItem.id);
  if (idx === -1) {
    db.items.unshift(cloudItem);
    return true;
  }
  const existing = db.items[idx];
  const existingTs = new Date(existing.updatedAt || existing.publishedAt || 0).getTime();
  const cloudTs = new Date(cloudItem.updatedAt || cloudItem.publishedAt || 0).getTime();
  if (cloudTs > existingTs) {
    db.items[idx] = {
      ...cloudItem,
      likes: Math.max(existing.likes || 0, cloudItem.likes || 0),
      dislikes: Math.max(existing.dislikes || 0, cloudItem.dislikes || 0),
      downloads: Math.max(existing.downloads || 0, cloudItem.downloads || 0),
      opens: Math.max(existing.opens || 0, cloudItem.opens || 0)
    };
    return true;
  }
  return false;
}

async function fetchPublishedAppsFromFirestoreRest(): Promise<StoreItem[]> {
  const cfg = readFirebaseConfig();
  if (!cfg) return [];
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/databases/${encodeURIComponent(cfg.firestoreDatabaseId)}/documents:runQuery`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'apps' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'isPublished' },
              op: 'EQUAL',
              value: { booleanValue: true }
            }
          }
        }
      }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const rows = (await res.json()) as any[];
    if (!Array.isArray(rows)) return [];
    const results: StoreItem[] = [];
    for (const row of rows) {
      if (row?.document) {
        const parsed = decodeFirestoreAppDoc(row.document);
        if (parsed) results.push(parsed);
      }
    }
    return results;
  } catch {
    return [];
  }
}

async function fetchSinglePublishedAppFromFirestoreRest(itemId: string): Promise<StoreItem | null> {
  const cfg = readFirebaseConfig();
  if (!cfg || !/^[a-zA-Z0-9_-]{1,128}$/.test(itemId)) return null;
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(cfg.projectId)}/databases/${encodeURIComponent(cfg.firestoreDatabaseId)}/documents/apps/${encodeURIComponent(itemId)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const docObj = await res.json();
    const parsed = decodeFirestoreAppDoc(docObj);
    if (!parsed || parsed.isPublished === false) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function hydratePublishedAppsFromFirestore(db: DatabaseSchema): Promise<boolean> {
  const cloudApps = await fetchPublishedAppsFromFirestoreRest();
  if (cloudApps.length === 0) return false;
  let changed = false;
  for (const cloudApp of cloudApps) {
    if (mergeItemIntoDb(db, cloudApp)) {
      changed = true;
    }
  }
  if (changed) {
    saveDb(db);
  }
  return changed;
}

async function ensurePublishedItemInDb(db: DatabaseSchema, itemId: string): Promise<StoreItem | undefined> {
  const existing = db.items.find((i) => i.id === itemId && i.isPublished !== false);
  if (existing) return existing;
  const cloudItem = await fetchSinglePublishedAppFromFirestoreRest(itemId);
  if (!cloudItem) return undefined;
  mergeItemIntoDb(db, cloudItem);
  saveDb(db);
  return db.items.find((i) => i.id === itemId && i.isPublished !== false);
}

async function startServer() {
  const initialDb = ensureDb();
  await hydratePublishedAppsFromFirestore(initialDb);

  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // API Router
  const apiRouter = express.Router();

  // GET /api/bootstrap
  apiRouter.get('/bootstrap', (req: Request, res: Response) => {
    const db = ensureDb();
    const userId = (req.query.userId as string) || 'guest_default';
    const username = (req.query.username as string) || undefined;
    const user = getOrCreateUser(db, userId, username);

    // Sync itemVotes into user.votes
    const userVotes: Record<string, 'like' | 'dislike'> = {};
    for (const [itemId, voteMap] of Object.entries(db.itemVotes)) {
      if (voteMap[userId]) {
        userVotes[itemId] = voteMap[userId];
      }
    }
    user.votes = userVotes;

    // Filter sponsorships for this user
    const userSponsorships = db.sponsorships.filter((s) => s.userId === userId);

    const totalApps = db.items.filter((i) => i.type === 'app').length;
    const totalGames = db.items.filter((i) => i.type === 'game').length;
    const officialKenixApps = db.items.filter((i) => i.isOfficialKenix).length;
    const communityGames = db.items.filter((i) => !i.isOfficialKenix).length;
    const totalKCCirculation = Object.values(db.users).reduce((acc, u) => acc + (u.kcBalance || 0), 0);

    const userDrafts = (db.drafts || []).filter((d) => d.userId === userId);

    res.json({
      user,
      items: db.items,
      sponsorships: userSponsorships,
      drafts: userDrafts,
      systemStats: {
        totalApps,
        totalGames,
        officialKenixApps,
        communityGames,
        totalKCCirculation
      }
    });
  });

  // POST /api/user/daily-reward
  apiRouter.post('/user/daily-reward', (req: Request, res: Response) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId gerekli' });
    }

    const db = ensureDb();
    const user = getOrCreateUser(db, userId);

    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    if (user.lastDailyRewardDate === todayStr) {
      return res.status(400).json({
        error: 'Bugünkü 20 KS ödülünüzü zaten aldınız. Lütfen yarın tekrar deneyin!',
        alreadyClaimed: true
      });
    }

    const REWARD = 20;
    user.kcBalance += REWARD;
    user.lastDailyRewardDate = todayStr;

    const tx: UserTransaction = {
      id: `tx-daily-${Date.now()}`,
      amount: REWARD,
      type: 'daily',
      description: 'Günlük Giriş Ödülü (+20 KS)',
      date: new Date().toISOString(),
      balanceAfter: user.kcBalance
    };
    user.transactions.unshift(tx);

    saveDb(db);

    res.json({
      success: true,
      reward: REWARD,
      newBalance: user.kcBalance,
      user
    });
  });

  // POST /api/items/vote (Like / Dislike)
  apiRouter.post('/items/vote', async (req: Request, res: Response) => {
    const { itemId, userId, voteType } = req.body;
    if (!itemId || !userId || !['like', 'dislike'].includes(voteType)) {
      return res.status(400).json({ error: 'itemId, userId ve geçerli voteType (like/dislike) zorunludur' });
    }

    const db = ensureDb();
    const item = await ensurePublishedItemInDb(db, String(itemId));
    if (!item) {
      return res.status(404).json({ error: 'Uygulama/Oyun bulunamadı veya yayında değil' });
    }

    if (!db.itemVotes[itemId]) {
      db.itemVotes[itemId] = {};
    }

    const currentVote = db.itemVotes[itemId][userId];
    const user = getOrCreateUser(db, userId);

    if (currentVote === voteType) {
      // Toggle off (remove vote)
      delete db.itemVotes[itemId][userId];
      delete user.votes[itemId];
      if (voteType === 'like') {
        item.likes = Math.max(0, item.likes - 1);
      } else {
        item.dislikes = Math.max(0, item.dislikes - 1);
      }
    } else {
      // If changing vote from other type
      if (currentVote === 'like') {
        item.likes = Math.max(0, item.likes - 1);
      } else if (currentVote === 'dislike') {
        item.dislikes = Math.max(0, item.dislikes - 1);
      }

      // Apply new vote
      db.itemVotes[itemId][userId] = voteType;
      user.votes[itemId] = voteType;

      if (voteType === 'like') {
        item.likes += 1;
      } else {
        item.dislikes += 1;
      }
    }

    saveDb(db);

    res.json({
      success: true,
      item,
      userVote: db.itemVotes[itemId][userId] || null
    });
  });

  // POST /api/games/publish (50 KC)
  apiRouter.post('/games/publish', (req: Request, res: Response) => {
    const { userId, title, category, description, icon, banner, gameplayUrl, developerName, ageRating } = req.body;

    if (!userId || !title || !description) {
      return res.status(400).json({ error: 'Oyun adı, açıklama ve kullanıcı kimliği zorunludur.' });
    }

    const trimmedTitle = title.trim();
    const trimmedDesc = description.trim();

    if (trimmedTitle.length < 2) {
      return res.status(400).json({ error: 'Oyun adı en az 2 karakter olmalıdır.' });
    }

    if (trimmedDesc.length < 10) {
      return res.status(400).json({ error: 'Oyun açıklaması en az 10 karakter olmalıdır.' });
    }

    const db = ensureDb();
    const user = getOrCreateUser(db, userId);

    const PUBLISH_FEE = 50;

    // Strict server-side balance check (NO double charge, no deduction on failure)
    if (user.kcBalance < PUBLISH_FEE) {
      return res.status(400).json({
        error: `Yetersiz bakiye! Kenix Studio üzerinden oyun yayınlamak için ${PUBLISH_FEE} KS gereklidir. Mevcut bakiyeniz: ${user.kcBalance} KS. Günlük ödül veya sponsorluk ile KS kazanabilirsiniz.`
      });
    }

    // Deduct atomically
    user.kcBalance -= PUBLISH_FEE;

    const newGameId = `game-user-${Date.now()}`;
    const validAgeRating = ['3+', '7+', '12+', '16+', '18+'].includes(ageRating) ? ageRating : '7+';

    const newGame: StoreItem = {
      id: newGameId,
      title: trimmedTitle,
      type: 'game',
      category: category || 'Bağımsız & Arcade',
      developer: developerName?.trim() || user.username,
      isOfficialKenix: false,
      shortDescription: trimmedDesc.slice(0, 130),
      fullDescription: trimmedDesc,
      icon: icon || 'Gamepad2',
      banner: banner || '',
      tags: ['Kenix Studio Oyunu', 'Kullanıcı Yapımı', 'Yeni'],
      likes: 1, // Author automatic first upvote
      dislikes: 0,
      downloads: 1,
      rating: 5.0,
      version: 'v1.0.0',
      publishedAt: new Date().toISOString(),
      demoType: 'playable',
      gameplayUrl: gameplayUrl || '',
      publisherUserId: userId,
      ageRating: validAgeRating,
      versionHistory: [
        {
          version: 'v1.0.0',
          date: new Date().toISOString(),
          notes: 'Kenix STORE ilk sürüm yayını.'
        }
      ]
    };

    // Auto-record creator upvote
    if (!db.itemVotes[newGameId]) db.itemVotes[newGameId] = {};
    db.itemVotes[newGameId][userId] = 'like';
    user.votes[newGameId] = 'like';

    const tx: UserTransaction = {
      id: `tx-pub-${Date.now()}`,
      amount: -PUBLISH_FEE,
      type: 'publish',
      description: `Kenix Studio Oyun Yayınlama Ücreti: "${trimmedTitle}" (-${PUBLISH_FEE} KS)`,
      date: new Date().toISOString(),
      balanceAfter: user.kcBalance
    };
    user.transactions.unshift(tx);

    db.items.unshift(newGame);
    saveDb(db);

    res.json({
      success: true,
      message: `Tebrikler! "${trimmedTitle}" oyunu başarıyla yayınlandı ve Kenix STORE mağaza vitrinine eklendi.`,
      game: newGame,
      newBalance: user.kcBalance,
      user
    });
  });

  // POST /api/studio/drafts/save (Feature 72 - PLUS only)
  apiRouter.post('/studio/drafts/save', (req: Request, res: Response) => {
    const { userId, draftId, title, category, type2d3d, description, icon, banner, ageRating, gameData } = req.body;

    if (!userId || !title) {
      return res.status(400).json({ error: 'Kullanıcı kimliği ve taslak adı zorunludur.' });
    }

    const db = ensureDb();
    const user = getOrCreateUser(db, userId);

    // Enforce PLUS membership check on server
    const isPlusActive = user.studioPlan === 'plus' && user.plusExpiry && new Date(user.plusExpiry).getTime() > Date.now();
    if (!isPlusActive) {
      return res.status(403).json({
        error: 'Oyun taslaklarını buluta kaydetme özelliği Kenix Studio PLUS üyelik gerektirir. (Özellik 72)'
      });
    }

    if (!db.drafts) db.drafts = [];

    let targetDraft: GameDraft;
    const existingIndex = draftId ? db.drafts.findIndex((d) => d.id === draftId) : -1;

    if (existingIndex >= 0) {
      // Security check: cannot overwrite another user's draft
      if (db.drafts[existingIndex].userId !== userId) {
        return res.status(403).json({ error: 'Başka bir kullanıcının taslağını düzenleyemezsiniz!' });
      }

      targetDraft = {
        ...db.drafts[existingIndex],
        title: title.trim(),
        category: category || 'Aksiyon & Macera',
        type2d3d: type2d3d || '2d',
        description: description || '',
        icon: icon || 'Gamepad2',
        banner: banner || '',
        ageRating: ageRating || '7+',
        gameData: gameData || db.drafts[existingIndex].gameData,
        updatedAt: new Date().toISOString()
      };
      db.drafts[existingIndex] = targetDraft;
    } else {
      targetDraft = {
        id: `draft-${Date.now()}`,
        userId,
        title: title.trim(),
        category: category || 'Aksiyon & Macera',
        type2d3d: type2d3d || '2d',
        description: description || '',
        icon: icon || 'Gamepad2',
        banner: banner || '',
        ageRating: ageRating || '7+',
        gameData: gameData || {},
        updatedAt: new Date().toISOString()
      };
      db.drafts.unshift(targetDraft);
    }

    saveDb(db);

    const userDrafts = db.drafts.filter((d) => d.userId === userId);
    res.json({
      success: true,
      message: `"${title}" taslağı güvenle buluta kaydedildi.`,
      draft: targetDraft,
      drafts: userDrafts
    });
  });

  // GET /api/studio/drafts
  apiRouter.get('/studio/drafts', (req: Request, res: Response) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId gerekli' });

    const db = ensureDb();
    const userDrafts = (db.drafts || []).filter((d) => d.userId === userId);
    res.json({ drafts: userDrafts });
  });

  // DELETE /api/studio/drafts/:id
  apiRouter.delete('/studio/drafts/:id', (req: Request, res: Response) => {
    const draftId = req.params.id;
    const userId = (req.query.userId as string) || (req.body && req.body.userId);

    if (!userId || !draftId) {
      return res.status(400).json({ error: 'userId ve draftId gerekli' });
    }

    const db = ensureDb();
    if (!db.drafts) db.drafts = [];

    const draftIndex = db.drafts.findIndex((d) => d.id === draftId);
    if (draftIndex === -1) {
      return res.status(404).json({ error: 'Taslak bulunamadı.' });
    }

    // Security check: isolate user data
    if (db.drafts[draftIndex].userId !== userId) {
      return res.status(403).json({ error: 'Bu taslağı silme yetkiniz yok.' });
    }

    db.drafts.splice(draftIndex, 1);
    saveDb(db);

    const userDrafts = db.drafts.filter((d) => d.userId === userId);
    res.json({ success: true, message: 'Taslak silindi.', drafts: userDrafts });
  });

  // POST /api/studio/games/update (Features 73 & 74 - PLUS only)
  apiRouter.post('/studio/games/update', (req: Request, res: Response) => {
    const { userId, gameId, title, description, icon, banner, notes, ageRating } = req.body;

    if (!userId || !gameId) {
      return res.status(400).json({ error: 'userId ve gameId zorunludur.' });
    }

    const db = ensureDb();
    const user = getOrCreateUser(db, userId);

    // Enforce PLUS membership check
    const isPlusActive = user.studioPlan === 'plus' && user.plusExpiry && new Date(user.plusExpiry).getTime() > Date.now();
    if (!isPlusActive) {
      return res.status(403).json({
        error: 'Oyunu güncelleme ve sürüm geçmişi yönetimi Kenix Studio PLUS üyelik gerektirir. (Özellik 73 & 74)'
      });
    }

    const game = db.items.find((i) => i.id === gameId);
    if (!game) {
      return res.status(404).json({ error: 'Oyun bulunamadı.' });
    }

    // User data isolation: ensure publisher matches
    if (game.publisherUserId !== userId) {
      return res.status(403).json({ error: 'Yalnızca kendi yayınladığınız oyunları güncelleyebilirsiniz!' });
    }

    // Parse version e.g. v1.0.0 -> v1.1.0
    const currentVersion = game.version || 'v1.0.0';
    const match = currentVersion.match(/v(\d+)\.(\d+)\.?(\d+)?/);
    let nextVersion = 'v1.1.0';
    if (match) {
      const major = match[1];
      const minor = parseInt(match[2] || '0', 10) + 1;
      nextVersion = `v${major}.${minor}.0`;
    }

    if (title && title.trim()) game.title = title.trim();
    if (description && description.trim()) {
      game.shortDescription = description.trim().slice(0, 130);
      game.fullDescription = description.trim();
    }
    if (icon) game.icon = icon;
    if (banner) game.banner = banner;
    if (ageRating) game.ageRating = ageRating;
    game.version = nextVersion;

    if (!game.versionHistory) game.versionHistory = [];
    game.versionHistory.unshift({
      version: nextVersion,
      date: new Date().toISOString(),
      notes: notes || 'Oyun içeriği ve motor iyileştirmeleri güncellendi.'
    });

    saveDb(db);

    res.json({
      success: true,
      message: `"${game.title}" oyunu ${nextVersion} sürümüne başarıyla güncellendi.`,
      game
    });
  });

  // POST /api/studio/procedural/map (Feature 63 - Algorithmic Procedural Map Engine)
  apiRouter.post('/studio/procedural/map', (req: Request, res: Response) => {
    const { genre, theme } = req.body;
    // Real algorithmic procedural maze & platform level generation
    const width = 16;
    const height = 10;
    const grid: number[][] = [];

    // 0: Air, 1: Solid block, 2: Coin/Gem, 3: Hazard, 4: Exit Flag, 5: Player Spawn
    for (let y = 0; y < height; y++) {
      grid[y] = [];
      for (let x = 0; x < width; x++) {
        if (y === height - 1) {
          grid[y][x] = 1; // Floor
        } else if (x === 0 || x === width - 1) {
          grid[y][x] = 1; // Walls
        } else if (y === height - 2 && x === 1) {
          grid[y][x] = 5; // Spawn
        } else if (y === height - 2 && x === width - 2) {
          grid[y][x] = 4; // Exit
        } else if (y % 2 === 1 && x > 2 && x < width - 2 && (x + y) % 3 === 0) {
          grid[y][x] = 1; // Platform
        } else if (y > 2 && (x * 7 + y * 3) % 11 === 0) {
          grid[y][x] = 2; // Coin
        } else if (y === height - 2 && x % 4 === 0) {
          grid[y][x] = 3; // Hazard
        } else {
          grid[y][x] = 0; // Empty air
        }
      }
    }

    res.json({
      success: true,
      mapData: {
        width,
        height,
        grid,
        biome: theme || '',
        generatedAt: new Date().toISOString()
      }
    });
  });

  // POST /api/studio/procedural/quest (Feature 64 - Quest Generation Engine)
  apiRouter.post('/studio/procedural/quest', (req: Request, res: Response) => {
    const { category, title } = req.body;
    const questPool = [
      {
        questTitle: 'Siber Çekirdekleri Kurtar',
        objective: 'Haritadaki 5 adet enerji parçasını toplayıp ana reaktöre teslim et.',
        reward: '150 Deneyim Puanı & Efsanevi Anahtar',
        dialogue: 'Sistem arızası kritik seviyede! Çekirdekler olmadan bariyerler çökecek.'
      },
      {
        questTitle: 'Gölge Bekçisini Mağlup Et',
        objective: 'Tapınağın derinliklerindeki bossu zayıf noktasından vurarak etkisiz hale getir.',
        reward: 'Özel Muhafız Kalkanı',
        dialogue: 'Yıllardır bu koridorları kimse geçemedi. Bakalım senin kılıcın ne kadar keskin?'
      },
      {
        questTitle: 'Zaman Kapsülünü Etkinleştir',
        objective: 'Süre dolmadan önce 3 farklı kontrol panelini sırayla aktive et.',
        reward: 'Zaman Hızlandırma Kristali',
        dialogue: 'Geri sayım başladı! Her saniyenin hayati önemi var.'
      }
    ];

    const selectedQuest = questPool[Math.floor(Math.random() * questPool.length)];
    res.json({
      success: true,
      quest: selectedQuest
    });
  });

  // POST /api/sponsorship/submit
  apiRouter.post('/sponsorship/submit', (req: Request, res: Response) => {
    const { userId, appId, videoUrl } = req.body;

    if (!userId || !appId || !videoUrl) {
      return res.status(400).json({ error: 'Uygulama seçimi ve video bağlantısı zorunludur.' });
    }

    const trimmedUrl = videoUrl.trim();
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return res.status(400).json({ error: 'Geçerli bir video linki (https://...) giriniz.' });
    }

    const db = ensureDb();
    const appItem = db.items.find((i) => i.id === appId);
    if (!appItem) {
      return res.status(404).json({ error: 'Seçilen uygulama bulunamadı.' });
    }

    if (!appItem.isOfficialKenix) {
      return res.status(400).json({ error: 'Sponsorluk ödülü yalnızca KenixAI tarafından geliştirilen resmi uygulamalar için geçerlidir.' });
    }

    // Check duplicate video URL across ANY past or current submission
    const duplicate = db.sponsorships.find((s) => s.videoUrl.toLowerCase() === trimmedUrl.toLowerCase());
    if (duplicate) {
      return res.status(400).json({
        error: 'Bu video bağlantısı sistemde zaten kayıtlı! Aynı video ile tekrar KS kazanılamaz.'
      });
    }

    const user = getOrCreateUser(db, userId);

    const submission: SponsorshipSubmission = {
      id: `sp-${Date.now()}`,
      userId,
      username: user.username,
      appId,
      appTitle: appItem.title,
      videoUrl: trimmedUrl,
      status: 'pending', // Awaiting admin review! No KS given yet!
      submittedAt: new Date().toISOString(),
      rewardAmount: 50
    };

    db.sponsorships.unshift(submission);
    saveDb(db);

    res.json({
      success: true,
      message: 'Tanıtım videonuz başarıyla inceleme kuyruğuna alındı. Video kontrol edilip onaylandığında hesabınıza 50 KS yatırılacaktır.',
      submission
    });
  });

  // POST /api/studio/enter
  apiRouter.post('/studio/enter', (req: Request, res: Response) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId gerekli' });
    }

    const db = ensureDb();
    const user = getOrCreateUser(db, userId);

    const isPlusActive = user.studioPlan === 'plus' && user.plusExpiry && new Date(user.plusExpiry).getTime() > Date.now();

    if (isPlusActive) {
      return res.json({
        success: true,
        isPlus: true,
        fee: 0,
        qualityMultiplier: 2,
        remainingDays: Math.ceil((new Date(user.plusExpiry!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        message: 'Kenix Studio PLUS üyeniz aktif! Giriş ücretsizdir. 2X oyun geliştirme kalitesi devrede.',
        user
      });
    }

    // Normal plan: 500 KS required per entry
    const ENTRY_FEE = 500;
    if (user.kcBalance < ENTRY_FEE) {
      return res.status(400).json({
        error: `Yetersiz bakiye! Normal üyelik ile Studio'ya giriş ücreti ${ENTRY_FEE} KS'dir. Mevcut bakiyeniz: ${user.kcBalance} KS. Dilerseniz 5.000 KS karşılığı PLUS üyelik alıp sınırsız ücretsiz giriş yapabilirsiniz.`
      });
    }

    // Deduct 500 KS atomically
    user.kcBalance -= ENTRY_FEE;
    const tx: UserTransaction = {
      id: `tx-entry-${Date.now()}`,
      amount: -ENTRY_FEE,
      type: 'studio_entry',
      description: `Kenix Studio Standart Giriş Ücreti (-${ENTRY_FEE} KS)`,
      date: new Date().toISOString(),
      balanceAfter: user.kcBalance
    };
    user.transactions.unshift(tx);

    saveDb(db);

    res.json({
      success: true,
      isPlus: false,
      fee: ENTRY_FEE,
      qualityMultiplier: 1,
      message: `500 KS tahsil edildi. Kenix Studio çalışma ortamına hoş geldiniz.`,
      newBalance: user.kcBalance,
      user
    });
  });

  // POST /api/studio/membership/buy-plus
  apiRouter.post('/studio/membership/buy-plus', (req: Request, res: Response) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: 'userId gerekli' });
    }

    const db = ensureDb();
    const user = getOrCreateUser(db, userId);

    const PLUS_FEE = 5000;
    if (user.kcBalance < PLUS_FEE) {
      return res.status(400).json({
        error: `Yetersiz bakiye! 1 Aylık Kenix Studio PLUS üyeliği ${PLUS_FEE} KS'dir. Mevcut bakiyeniz: ${user.kcBalance} KS.`
      });
    }

    // Deduct 5000 KS
    user.kcBalance -= PLUS_FEE;
    user.studioPlan = 'plus';

    // Extend if already active, or set from now
    const now = Date.now();
    const currentExpiry = user.plusExpiry ? new Date(user.plusExpiry).getTime() : 0;
    const baseTime = currentExpiry > now ? currentExpiry : now;
    const newExpiryDate = new Date(baseTime + 30 * 24 * 60 * 60 * 1000); // +30 days

    user.plusExpiry = newExpiryDate.toISOString();

    const tx: UserTransaction = {
      id: `tx-plus-${Date.now()}`,
      amount: -PLUS_FEE,
      type: 'membership',
      description: `Kenix Studio PLUS 30 Günlük Üyelik Satın Alımı (-${PLUS_FEE} KS)`,
      date: new Date().toISOString(),
      balanceAfter: user.kcBalance
    };
    user.transactions.unshift(tx);

    saveDb(db);

    res.json({
      success: true,
      message: 'Tebrikler! Kenix Studio PLUS üyeliğiniz aktif edildi. Artık girişlerde 500 KS ödemeyeceksiniz ve 2X geliştirme kalitesi kazandınız.',
      plusExpiry: user.plusExpiry,
      user
    });
  });

  // POST /api/admin/verify-pin
  apiRouter.post('/admin/verify-pin', (req: Request, res: Response) => {
    const { pin } = req.body;
    const db = ensureDb();
    if (verifyCeoPassword(db, String(pin || ''))) {
      return res.json({
        success: true,
        allSponsorships: db.sponsorships,
        allItems: db.items
      });
    }
    return res.status(401).json({ error: 'Hatalı Yönetici PIN Kodu!' });
  });

  // POST /api/admin/sponsorship/review
  apiRouter.post('/admin/sponsorship/review', (req: Request, res: Response) => {
    const { pin, submissionId, action, notes } = req.body;
    const db = ensureDb();
    if (!verifyCeoPassword(db, String(pin || ''))) {
      return res.status(401).json({ error: 'Yetkisiz erişim.' });
    }
    const sub = db.sponsorships.find((s) => s.id === submissionId);
    if (!sub) {
      return res.status(404).json({ error: 'Sponsorluk başvurusu bulunamadı.' });
    }

    const targetUser = db.users[sub.userId];

    if (action === 'approve') {
      if (sub.status === 'approved') {
        return res.status(400).json({ error: 'Bu başvuru zaten onaylanmış.' });
      }

      sub.status = 'approved';
      sub.reviewedAt = new Date().toISOString();
      sub.notes = notes || 'Resmi onay verildi.';

      if (targetUser) {
        targetUser.kcBalance += sub.rewardAmount;
        const tx: UserTransaction = {
          id: `tx-sp-approved-${Date.now()}`,
          amount: sub.rewardAmount,
          type: 'sponsor_reward',
          description: `Tanıtım Videosu Onay Ödülü: "${sub.appTitle}" (+${sub.rewardAmount} KS)`,
          date: new Date().toISOString(),
          balanceAfter: targetUser.kcBalance
        };
        targetUser.transactions.unshift(tx);
      }
    } else if (action === 'reject') {
      sub.status = 'rejected';
      sub.reviewedAt = new Date().toISOString();
      sub.notes = notes || 'Video şartları karşılamıyor.';
    } else if (action === 'revoke') {
      if (sub.status !== 'approved') {
        return res.status(400).json({ error: 'Yalnızca önceden onaylanmış videolardan KS geri alınabilir.' });
      }

      sub.status = 'revoked';
      sub.reviewedAt = new Date().toISOString();
      sub.notes = notes || 'Doğrulama kontrolünde video silinmiş veya geçersiz bulundu. 50 KS geri alındı.';

      if (targetUser) {
        // Take back 50 KS
        targetUser.kcBalance = Math.max(0, targetUser.kcBalance - sub.rewardAmount);
        const tx: UserTransaction = {
          id: `tx-sp-revoked-${Date.now()}`,
          amount: -sub.rewardAmount,
          type: 'sponsor_revoke',
          description: `Silinen/İhlal Edilen Tanıtım Videosu KS Kesintisi: "${sub.appTitle}" (-${sub.rewardAmount} KS)`,
          date: new Date().toISOString(),
          balanceAfter: targetUser.kcBalance
        };
        targetUser.transactions.unshift(tx);
      }
    }

    saveDb(db);

    res.json({
      success: true,
      submission: sub,
      allSponsorships: db.sponsorships
    });
  });

  // POST /api/admin/apps/add
  apiRouter.post('/admin/apps/add', (req: Request, res: Response) => {
    const { pin, title, type, category, shortDescription, fullDescription, icon, banner, tags } = req.body;
    const db = ensureDb();
    if (!verifyCeoPassword(db, String(pin || ''))) {
      return res.status(401).json({ error: 'Yetkisiz erişim.' });
    }

    if (!title || !shortDescription) {
      return res.status(400).json({ error: 'Uygulama başlığı ve açıklaması zorunludur.' });
    }
    const newApp: StoreItem = {
      id: `kenix-app-${Date.now()}`,
      title: title.trim(),
      type: type || 'app',
      category: category || 'KenixAI Ekosistem',
      developer: 'KenixAI Official',
      isOfficialKenix: true,
      shortDescription: shortDescription.trim(),
      fullDescription: fullDescription ? fullDescription.trim() : shortDescription.trim(),
      icon: icon || 'Sparkles',
      banner: banner || '',
      tags: tags && Array.isArray(tags) ? tags : ['Kenix Resmi', 'Yapay Zeka'],
      likes: 0,
      dislikes: 0,
      downloads: 10,
      rating: 5.0,
      version: 'v1.0.0',
      publishedAt: new Date().toISOString(),
      demoType: 'installed',
      featured: true
    };

    db.items.unshift(newApp);
    saveDb(db);

    res.json({
      success: true,
      item: newApp,
      items: db.items
    });
  });

  // GET /api/store/bootstrap (Public store: only published items)
  apiRouter.get('/store/bootstrap', (req: Request, res: Response) => {
    const db = ensureDb();
    const userId = (req.query.userId as string) || 'guest_default';
    const username = (req.query.username as string) || undefined;
    const user = getOrCreateUser(db, userId, username);

    const userVotes: Record<string, 'like' | 'dislike'> = {};
    for (const [itemId, voteMap] of Object.entries(db.itemVotes)) {
      if (voteMap[userId]) {
        userVotes[itemId] = voteMap[userId];
      }
    }
    user.votes = userVotes;

    const publishedItems = db.items.filter((i) => i.isPublished !== false);
    const categories = Array.from(
      new Set(publishedItems.map((i) => i.category).filter(Boolean))
    );

    res.json({
      user,
      items: publishedItems,
      categories
    });
  });

  // POST /api/user/favorites/toggle
  apiRouter.post('/user/favorites/toggle', async (req: Request, res: Response) => {
    const { userId, itemId } = req.body;
    if (!userId || !itemId) {
      return res.status(400).json({ error: 'userId ve itemId zorunludur.' });
    }

    const db = ensureDb();
    const item = await ensurePublishedItemInDb(db, String(itemId));
    if (!item) {
      return res.status(404).json({ error: 'Uygulama bulunamadı.' });
    }

    const user = getOrCreateUser(db, userId);
    if (!user.favorites) user.favorites = [];

    const idx = user.favorites.indexOf(itemId);
    let isFavorite = false;
    if (idx >= 0) {
      user.favorites.splice(idx, 1);
      isFavorite = false;
    } else {
      user.favorites.unshift(itemId);
      isFavorite = true;
    }

    saveDb(db);
    res.json({ success: true, isFavorite, favorites: user.favorites });
  });

  // POST /api/store/items/:id/track (Real open / download statistics)
  apiRouter.post('/store/items/:id/track', async (req: Request, res: Response) => {
    const itemId = req.params.id;
    const { userId, action } = req.body;
    if (!userId || !['open', 'download'].includes(action)) {
      return res.status(400).json({ error: 'userId ve geçerli action (open/download) zorunludur.' });
    }

    const db = ensureDb();
    const item = await ensurePublishedItemInDb(db, itemId);
    if (!item) {
      return res.status(404).json({ error: 'Yayında olan uygulama bulunamadı.' });
    }

    if (action === 'download') {
      item.downloads = (item.downloads || 0) + 1;
    } else {
      item.opens = (item.opens || 0) + 1;
    }

    if (!db.usageEvents) db.usageEvents = [];
    db.usageEvents.unshift({
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      itemId: item.id,
      itemTitle: item.title,
      userId,
      action,
      timestamp: new Date().toISOString()
    });
    if (db.usageEvents.length > 500) {
      db.usageEvents = db.usageEvents.slice(0, 500);
    }

    saveDb(db);
    res.json({ success: true, item });
  });

  // POST /api/store/items/:id/verify-download (Verified real download + silent one-time 100 KS reward)
  apiRouter.post('/store/items/:id/verify-download', async (req: Request, res: Response) => {
    const itemId = req.params.id;
    const { userId, clientBytes } = req.body;
    if (!userId || !String(userId).trim()) {
      return res.status(400).json({ error: 'userId zorunludur.', verified: false });
    }

    const db = ensureDb();
    const item = await ensurePublishedItemInDb(db, itemId);
    if (!item) {
      return res.status(404).json({ error: 'Yayında olan uygulama bulunamadı.', verified: false });
    }

    const targetUrl = String(item.apkUrl || item.appUrl || item.gameplayUrl || '').trim();
    if (!targetUrl || !isValidAppLocation(targetUrl)) {
      return res.status(400).json({ error: 'Geçerli bir indirme bağlantısı bulunamadı.', verified: false });
    }

    let verified = false;

    if (targetUrl.startsWith('/api/apk/download/')) {
      // Internal verified APK package verification on disk
      const apkRec = item.apkId ? db.apkFiles?.[item.apkId] : undefined;
      const diskPath = apkRec ? resolveConfinedApkPath(apkRec.storedName) : null;
      if (apkRec && !apkRec.quarantined && diskPath && fs.existsSync(diskPath)) {
        const fileBuf = fs.readFileSync(diskPath);
        const actualSha = crypto.createHash('sha256').update(fileBuf).digest('hex');
        verified = actualSha === apkRec.sha256;
      }
    } else if (typeof clientBytes === 'number' && Number.isFinite(clientBytes) && clientBytes > 0) {
      verified = true;
    } else if (isSafeExternalUrlForFetch(targetUrl)) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      try {
        let headRes = await fetch(targetUrl, {
          method: 'HEAD',
          redirect: 'follow',
          signal: controller.signal
        });
        if (headRes.status === 405 || headRes.status === 501 || !headRes.ok) {
          headRes = await fetch(targetUrl, {
            method: 'GET',
            headers: { Range: 'bytes=0-511' },
            redirect: 'follow',
            signal: controller.signal
          });
        }
        verified = headRes.status >= 200 && headRes.status < 400;
      } catch {
        verified = false;
      } finally {
        clearTimeout(timeout);
      }
    }

    if (!verified) {
      return res.status(422).json({
        error: 'İndirme dosyası veya bağlantısı sunucu tarafından doğrulanamadı.',
        verified: false
      });
    }

    item.downloads = (item.downloads || 0) + 1;

    if (!db.usageEvents) db.usageEvents = [];
    db.usageEvents.unshift({
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      itemId: item.id,
      itemTitle: item.title,
      userId: String(userId),
      action: 'download',
      timestamp: new Date().toISOString()
    });
    if (db.usageEvents.length > 500) {
      db.usageEvents = db.usageEvents.slice(0, 500);
    }

    const user = getOrCreateUser(db, String(userId));
    if (!user.rewardedDownloads) {
      user.rewardedDownloads = [];
    }

    const DOWNLOAD_KS_REWARD = 100;
    let rewardAwarded = false;
    let rewardAmount = 0;

    if (!user.rewardedDownloads.includes(item.id)) {
      user.rewardedDownloads.push(item.id);
      user.kcBalance += DOWNLOAD_KS_REWARD;
      rewardAwarded = true;
      rewardAmount = DOWNLOAD_KS_REWARD;

      const tx: UserTransaction = {
        id: `tx-dl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        amount: DOWNLOAD_KS_REWARD,
        type: 'download_reward',
        description: `"${item.title}" Doğrulanmış İndirme Ödülü (+100 KS)`,
        date: new Date().toISOString(),
        balanceAfter: user.kcBalance
      };
      user.transactions.unshift(tx);
    }

    saveDb(db);
    res.json({
      success: true,
      verified: true,
      rewardAwarded,
      rewardAmount,
      item,
      user
    });
  });

  const apkUpload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        ensureApkDir();
        cb(null, APK_DIR);
      },
      filename: (_req, _file, cb) => {
        cb(null, `apk_${Date.now()}_${crypto.randomBytes(8).toString('hex')}.apk`);
      }
    }),
    limits: {
      fileSize: MAX_APK_SIZE_BYTES,
      files: 1
    },
    fileFilter: (_req, file, cb) => {
      if (!file.originalname || !file.originalname.toLowerCase().endsWith('.apk')) {
        return cb(new Error('Yalnızca .apk uzantılı Android uygulama paketleri yüklenebilir.'));
      }
      cb(null, true);
    }
  });

  // GET /api/auth/admin-status (Server-side Firebase ID Token admin check)
  apiRouter.get('/auth/admin-status', async (req: Request, res: Response) => {
    const token = getBearerToken(req);
    if (isValidCeoToken(token)) {
      return res.json({ isAdmin: true, mode: 'ceo', emailVerified: true, email: null });
    }
    const decoded = await verifyFirebaseBearerToken(req);
    const isAdmin = isDecodedFirebaseAdmin(decoded);
    return res.json({
      isAdmin,
      mode: isAdmin ? 'firebase_admin' : decoded ? 'user' : 'guest',
      emailVerified: Boolean(decoded?.email_verified),
      email: decoded?.email || null
    });
  });

  // POST /api/apk/upload (Authenticated verified user or CEO/Admin: uploads, scans, hashes APK into quarantine)
  apiRouter.post('/apk/upload', async (req: Request, res: Response, next: NextFunction) => {
    const ceoCheck = await isRequestCeoOrAdmin(req);
    if (ceoCheck.ok) {
      (req as Request & { uploadActorUid?: string; uploadActorEmail?: string; isAdminUpload?: boolean }).uploadActorUid = 'ceo_admin';
      (req as Request & { uploadActorUid?: string; uploadActorEmail?: string; isAdminUpload?: boolean }).uploadActorEmail = ceoCheck.actor;
      (req as Request & { uploadActorUid?: string; uploadActorEmail?: string; isAdminUpload?: boolean }).isAdminUpload = true;
      return next();
    }
    const decoded = await verifyFirebaseBearerToken(req);
    if (!decoded) {
      return res.status(401).json({ error: 'APK yüklemek için giriş yapmanız gerekmektedir.' });
    }
    if (decoded.email_verified !== true) {
      return res.status(403).json({ error: 'APK yükleyebilmek için e-posta adresinizi doğrulamanız gerekmektedir.' });
    }
    (req as Request & { uploadActorUid?: string; uploadActorEmail?: string; isAdminUpload?: boolean }).uploadActorUid = decoded.uid;
    (req as Request & { uploadActorUid?: string; uploadActorEmail?: string; isAdminUpload?: boolean }).uploadActorEmail = decoded.email || '';
    (req as Request & { uploadActorUid?: string; uploadActorEmail?: string; isAdminUpload?: boolean }).isAdminUpload = false;
    next();
  }, (req: Request, res: Response) => {
    apkUpload.single('apk')(req, res, (uploadErr: unknown) => {
      if (uploadErr) {
        const msg =
          uploadErr instanceof multer.MulterError && uploadErr.code === 'LIMIT_FILE_SIZE'
            ? 'APK dosya boyutu 100 MB sınırını aşıyor.'
            : uploadErr instanceof Error
            ? uploadErr.message
            : 'APK yükleme hatası.';
        return res.status(400).json({ error: msg });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'Lütfen bir .apk dosyası seçiniz.' });
      }

      const storedPath = resolveConfinedApkPath(file.filename);
      if (!storedPath || !fs.existsSync(storedPath)) {
        return res.status(500).json({ error: 'APK dosyası güvenli dizine yazılamadı.' });
      }

      try {
        const buf = fs.readFileSync(storedPath);
        const scanReport = scanApkBuffer(buf);

        if (!scanReport.passed) {
          fs.unlinkSync(storedPath);
          return res.status(422).json({
            error: scanReport.summary,
            scanReport
          });
        }

        const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
        const apkId = `apk-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
        const safeOriginal = path
          .basename(file.originalname)
          .replace(/[^a-zA-Z0-9._-]/g, '_')
          .slice(0, 160);

        const actorReq = req as Request & {
          uploadActorUid?: string;
          uploadActorEmail?: string;
          isAdminUpload?: boolean;
        };

        const record: StoredApkRecord = {
          apkId,
          storedName: file.filename,
          originalFileName: safeOriginal || `${apkId}.apk`,
          fileSizeBytes: buf.length,
          sha256,
          uploadedByUid: actorReq.uploadActorUid || 'unknown',
          uploadedByEmail: actorReq.uploadActorEmail || '',
          quarantined: !actorReq.isAdminUpload,
          scanReport,
          createdAt: new Date().toISOString()
        };

        const db = ensureDb();
        if (!db.apkFiles) db.apkFiles = {};
        db.apkFiles[apkId] = record;
        saveDb(db);

        return res.status(201).json({
          success: true,
          apkId,
          apkFileName: record.originalFileName,
          fileSizeBytes: record.fileSizeBytes,
          apkSha256: record.sha256,
          scanReport
        });
      } catch (err) {
        if (fs.existsSync(storedPath)) {
          fs.unlinkSync(storedPath);
        }
        return res.status(500).json({
          error: err instanceof Error ? err.message : 'APK güvenlik taraması tamamlanamadı.'
        });
      }
    });
  });

  // GET /api/apk/download/:targetId (Serves ONLY approved published APKs or Admin-inspected quarantined APKs)
  apiRouter.get('/apk/download/:targetId', async (req: Request, res: Response) => {
    const targetId = String(req.params.targetId || '').trim();
    if (!/^[a-zA-Z0-9_-]{1,128}$/.test(targetId)) {
      return res.status(400).json({ error: 'Geçersiz APK kimliği.' });
    }

    const db = ensureDb();
    const publishedApp = db.items.find(
      (it) => it.isPublished !== false && (it.id === targetId || it.apkId === targetId)
    );

    const apkIdToServe = publishedApp?.apkId || targetId;
    const apkRecord = db.apkFiles?.[apkIdToServe];

    if (!apkRecord) {
      return res.status(404).json({ error: 'APK paketi bulunamadı.' });
    }

    if (!publishedApp || apkRecord.quarantined) {
      const adminCheck = await isRequestCeoOrAdmin(req);
      if (!adminCheck.ok) {
        return res.status(403).json({
          error: 'Bu APK henüz yönetici onayından geçmediği için indirilemez.'
        });
      }
    }

    const diskPath = resolveConfinedApkPath(apkRecord.storedName);
    if (!diskPath || !fs.existsSync(diskPath)) {
      return res.status(404).json({ error: 'APK dosyası depolama alanında bulunamadı.' });
    }

    try {
      const buf = fs.readFileSync(diskPath);
      const currentSha = crypto.createHash('sha256').update(buf).digest('hex');
      if (currentSha !== apkRecord.sha256) {
        return res.status(500).json({ error: 'APK bütünlük doğrulaması (SHA-256) başarısız oldu!' });
      }

      const downloadName = (apkRecord.originalFileName || `${apkIdToServe}.apk`).replace(
        /[^a-zA-Z0-9._-]/g,
        '_'
      );

      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.setHeader('Content-Disposition', `attachment; filename="${downloadName}"`);
      res.setHeader('Content-Length', String(buf.length));
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-APK-SHA256', apkRecord.sha256);
      return res.send(buf);
    } catch {
      return res.status(500).json({ error: 'APK dosyası okunurken hata oluştu.' });
    }
  });

  // POST /api/submissions (Verified user submits an APK for admin approval)
  apiRouter.post('/submissions', requireVerifiedFirebaseUser, (req: Request, res: Response) => {
    const firebaseUser = (req as Request & { firebaseUser: DecodedIdToken }).firebaseUser;
    const {
      title,
      packageName,
      category,
      developer,
      version,
      shortDescription,
      fullDescription,
      updateNotes,
      icon,
      logoUrl,
      banner,
      apkId
    } = req.body || {};

    const cleanTitle = String(title || '').trim();
    const cleanPkg = String(packageName || '').trim();
    const cleanCat = String(category || '').trim();
    const cleanDev = String(developer || firebaseUser.name || firebaseUser.email?.split('@')[0] || 'Geliştirici').trim();
    const cleanVer = String(version || 'v1.0.0').trim();
    const cleanShort = String(shortDescription || '').trim();
    const cleanFull = String(fullDescription || cleanShort).trim();
    const cleanApkId = String(apkId || '').trim();
    const cleanLogo = String(logoUrl || '').trim();
    const cleanBanner = String(banner || '').trim();

    if (cleanTitle.length < 2 || cleanTitle.length > 120) {
      return res.status(400).json({ error: 'Uygulama adı 2-120 karakter arasında olmalıdır.' });
    }
    if (!isValidPackageName(cleanPkg)) {
      return res.status(400).json({ error: 'Geçerli bir Android Paket Adı giriniz (Örn: com.firma.uygulama).' });
    }
    if (!cleanCat || cleanCat.length > 80) {
      return res.status(400).json({ error: 'Kategori zorunludur.' });
    }
    if (cleanShort.length < 5 || cleanShort.length > 300) {
      return res.status(400).json({ error: 'Kısa açıklama 5-300 karakter arasında olmalıdır.' });
    }
    if (cleanFull.length < 5 || cleanFull.length > 4000) {
      return res.status(400).json({ error: 'Detaylı açıklama 5-4000 karakter arasında olmalıdır.' });
    }
    if (!isValidImageSource(cleanLogo) || !isValidImageSource(cleanBanner)) {
      return res.status(400).json({ error: 'Logo veya kapak görseli geçersiz.' });
    }

    const db = ensureDb();
    const apkRecord = db.apkFiles?.[cleanApkId];
    if (!apkRecord || !apkRecord.scanReport?.passed) {
      return res.status(400).json({ error: 'Güvenlik taramasından geçmiş geçerli bir APK dosyası yüklemelisiniz.' });
    }
    if (apkRecord.uploadedByUid !== firebaseUser.uid && !isDecodedFirebaseAdmin(firebaseUser)) {
      return res.status(403).json({ error: 'Başka bir kullanıcıya ait APK paketi ile başvuru yapılamaz.' });
    }

    const submissionId = `sub-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();
    const submission: AppSubmission = {
      id: submissionId,
      userId: firebaseUser.uid,
      userEmail: firebaseUser.email || '',
      developer: cleanDev.slice(0, 100),
      title: cleanTitle,
      packageName: cleanPkg,
      category: cleanCat,
      version: cleanVer.slice(0, 40),
      shortDescription: cleanShort,
      fullDescription: cleanFull,
      updateNotes: updateNotes ? String(updateNotes).trim().slice(0, 1000) : undefined,
      icon: String(icon || 'Layers').trim().slice(0, 60) || 'Layers',
      logoUrl: cleanLogo || undefined,
      banner: cleanBanner,
      apkId: apkRecord.apkId,
      apkUrl: `/api/apk/download/${apkRecord.apkId}`,
      apkFileName: apkRecord.originalFileName,
      fileSizeBytes: apkRecord.fileSizeBytes,
      apkSha256: apkRecord.sha256,
      apkScanPassed: true,
      apkScanSummary: apkRecord.scanReport.summary,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };

    if (!db.submissions) db.submissions = [];
    db.submissions.unshift(submission);
    saveDb(db);

    res.status(201).json({
      success: true,
      message: 'Uygulamanız ve taranmış APK paketiniz yönetici onay kuyruğuna alındı.',
      submission
    });
  });

  // GET /api/submissions/mine (Verified user sees only their own submissions)
  apiRouter.get('/submissions/mine', requireVerifiedFirebaseUser, (req: Request, res: Response) => {
    const firebaseUser = (req as Request & { firebaseUser: DecodedIdToken }).firebaseUser;
    const db = ensureDb();
    const mine = (db.submissions || []).filter((s) => s.userId === firebaseUser.uid);
    res.json({ submissions: mine });
  });

  // POST /api/ceo/login
  apiRouter.post('/ceo/login', (req: Request, res: Response) => {
    const clientIp = req.ip || 'unknown';
    const now = Date.now();
    const attempt = ceoLoginAttempts.get(clientIp);
    if (attempt && attempt.resetAt > now && attempt.count >= 10) {
      return res.status(429).json({
        error: 'Çok fazla başarısız giriş denemesi yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.'
      });
    }

    const { password } = req.body;
    const db = ensureDb();
    if (!password || !verifyCeoPassword(db, String(password))) {
      const nextCount = attempt && attempt.resetAt > now ? attempt.count + 1 : 1;
      ceoLoginAttempts.set(clientIp, {
        count: nextCount,
        resetAt: attempt && attempt.resetAt > now ? attempt.resetAt : now + 10 * 60 * 1000
      });
      return res.status(401).json({ error: 'Hatalı CEO güvenlik şifresi.' });
    }

    ceoLoginAttempts.delete(clientIp);
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = now + CEO_SESSION_TTL_MS;
    ceoSessions.set(token, { createdAt: now, expiresAt });

    res.json({ success: true, token, expiresAt });
  });

  // POST /api/ceo/password/change (Protected)
  apiRouter.post('/ceo/password/change', requireCeoAuth, (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const cleanNew = String(newPassword || '').trim();
    if (cleanNew.length < 6) {
      return res.status(400).json({ error: 'Yeni CEO şifresi en az 6 karakter olmalıdır.' });
    }

    const db = ensureDb();
    if (!verifyCeoPassword(db, String(currentPassword || ''))) {
      return res.status(401).json({ error: 'Mevcut şifreniz doğrulanamadı.' });
    }

    db.ceoAuth = {
      passwordHash: hashPasswordScrypt(cleanNew),
      updatedAt: new Date().toISOString()
    };
    saveDb(db);

    res.json({ success: true, message: 'CEO güvenlik şifresi başarıyla güncellendi.' });
  });

  // POST /api/ceo/logout
  apiRouter.post('/ceo/logout', (req: Request, res: Response) => {
    const token = getBearerToken(req);
    if (token) ceoSessions.delete(token);
    res.json({ success: true });
  });

  // GET /api/ceo/session
  apiRouter.get('/ceo/session', async (req: Request, res: Response) => {
    const check = await isRequestCeoOrAdmin(req);
    if (!check.ok) {
      return res.status(401).json({ authenticated: false });
    }
    res.json({ authenticated: true, actor: check.actor });
  });

  // GET /api/ceo/overview (Protected)
  apiRouter.get('/ceo/overview', requireCeoAuth, (_req: Request, res: Response) => {
    const db = ensureDb();
    const items = db.items;
    const usageEvents = db.usageEvents || [];
    const submissions = db.submissions || [];

    const stats = {
      totalApps: items.length,
      publishedApps: items.filter((i) => i.isPublished !== false).length,
      unpublishedApps: items.filter((i) => i.isPublished === false).length,
      totalOpens: items.reduce((sum, i) => sum + (i.opens || 0), 0),
      totalDownloads: items.reduce((sum, i) => sum + (i.downloads || 0), 0),
      totalLikes: items.reduce((sum, i) => sum + (i.likes || 0), 0),
      totalDislikes: items.reduce((sum, i) => sum + (i.dislikes || 0), 0)
    };

    res.json({ items, usageEvents, submissions, stats });
  });

  // GET /api/ceo/submissions (Protected)
  apiRouter.get('/ceo/submissions', requireCeoAuth, (_req: Request, res: Response) => {
    const db = ensureDb();
    res.json({ submissions: db.submissions || [] });
  });

  // POST /api/ceo/submissions/:id/review (Protected: approve & publish or reject APK submission)
  apiRouter.post('/ceo/submissions/:id/review', requireCeoAuth, (req: Request, res: Response) => {
    const submissionId = String(req.params.id || '');
    const { action, reviewNotes } = req.body || {};
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Geçerli bir inceleme işlemi (approve/reject) seçiniz.' });
    }

    const db = ensureDb();
    const submissions = db.submissions || [];
    const sub = submissions.find((s) => s.id === submissionId);
    if (!sub) {
      return res.status(404).json({ error: 'Başvuru bulunamadı.' });
    }

    const actor = (req as Request & { adminActor?: string }).adminActor || 'Admin';
    const now = new Date().toISOString();

    if (action === 'reject') {
      sub.status = 'rejected';
      sub.reviewNotes = String(reviewNotes || 'Yönetici incelemesi sonucunda reddedildi.').trim().slice(0, 500);
      sub.reviewedBy = actor;
      sub.reviewedAt = now;
      sub.updatedAt = now;

      // Remove quarantined APK file cleanly when rejected
      const apkRec = db.apkFiles?.[sub.apkId];
      if (apkRec && apkRec.quarantined) {
        const diskPath = resolveConfinedApkPath(apkRec.storedName);
        if (diskPath && fs.existsSync(diskPath)) {
          fs.unlinkSync(diskPath);
        }
        delete db.apkFiles![sub.apkId];
      }

      saveDb(db);
      return res.json({ success: true, submission: sub });
    }

    // Approve & Publish
    const apkRec = db.apkFiles?.[sub.apkId];
    const diskPath = apkRec ? resolveConfinedApkPath(apkRec.storedName) : null;
    if (!apkRec || !diskPath || !fs.existsSync(diskPath)) {
      return res.status(404).json({ error: 'Başvuruya ait APK paketi depolama alanında bulunamadı.' });
    }

    const buf = fs.readFileSync(diskPath);
    const actualSha = crypto.createHash('sha256').update(buf).digest('hex');
    if (actualSha !== sub.apkSha256) {
      return res.status(422).json({ error: 'APK bütünlük özeti (SHA-256) eşleşmediği için yayınlanamıyor!' });
    }

    apkRec.quarantined = false;

    const existingApp = db.items.find(
      (i) => (sub.publishedAppId && i.id === sub.publishedAppId) || (sub.packageName && i.packageName === sub.packageName)
    );
    const targetAppId = existingApp ? existingApp.id : `kenix-app-${Date.now()}`;
    const downloadUrl = `/api/apk/download/${targetAppId}`;

    let publishedItem: StoreItem;
    if (existingApp) {
      existingApp.title = sub.title;
      existingApp.category = sub.category;
      existingApp.developer = sub.developer;
      existingApp.shortDescription = sub.shortDescription;
      existingApp.fullDescription = sub.fullDescription;
      existingApp.icon = sub.icon;
      existingApp.logoUrl = sub.logoUrl;
      existingApp.banner = sub.banner;
      existingApp.version = sub.version;
      existingApp.updateNotes = sub.updateNotes || 'Yeni APK sürümü yayınlandı.';
      existingApp.updatedAt = now;
      existingApp.launchMode = 'download';
      existingApp.demoType = 'installed';
      existingApp.appUrl = downloadUrl;
      existingApp.gameplayUrl = downloadUrl;
      existingApp.isPublished = true;
      existingApp.packageName = sub.packageName;
      existingApp.apkId = sub.apkId;
      existingApp.apkUrl = downloadUrl;
      existingApp.apkFileName = sub.apkFileName;
      existingApp.fileSizeBytes = sub.fileSizeBytes;
      existingApp.apkSha256 = sub.apkSha256;
      existingApp.apkVerified = true;
      existingApp.apkScanSummary = sub.apkScanSummary;
      existingApp.submittedBy = sub.userId;
      existingApp.submissionId = sub.id;
      if (!existingApp.versionHistory) existingApp.versionHistory = [];
      existingApp.versionHistory.unshift({
        version: sub.version,
        date: now,
        notes: sub.updateNotes || 'APK sürümü güncellendi ve onaylandı.'
      });
      publishedItem = existingApp;
    } else {
      publishedItem = {
        id: targetAppId,
        title: sub.title,
        type: 'app',
        category: sub.category,
        developer: sub.developer,
        isOfficialKenix: false,
        shortDescription: sub.shortDescription,
        fullDescription: sub.fullDescription,
        icon: sub.icon || 'Layers',
        logoUrl: sub.logoUrl,
        banner: sub.banner || '',
        tags: [sub.category, 'Doğrulanmış APK'],
        likes: 0,
        dislikes: 0,
        downloads: 0,
        opens: 0,
        rating: 0,
        version: sub.version,
        publishedAt: now,
        updatedAt: now,
        updateNotes: sub.updateNotes || 'İlk doğrulanmış APK sürümü yayına alındı.',
        demoType: 'installed',
        appUrl: downloadUrl,
        gameplayUrl: downloadUrl,
        launchMode: 'download',
        isPublished: true,
        packageName: sub.packageName,
        apkId: sub.apkId,
        apkUrl: downloadUrl,
        apkFileName: sub.apkFileName,
        fileSizeBytes: sub.fileSizeBytes,
        apkSha256: sub.apkSha256,
        apkVerified: true,
        apkScanSummary: sub.apkScanSummary,
        submittedBy: sub.userId,
        submissionId: sub.id,
        versionHistory: [
          {
            version: sub.version,
            date: now,
            notes: sub.updateNotes || 'İlk doğrulanmış APK sürümü yayına alındı.'
          }
        ]
      };
      db.items.unshift(publishedItem);
    }

    sub.status = 'approved';
    sub.reviewNotes = String(reviewNotes || 'APK güvenlik taramasından geçti ve mağazada yayınlandı.').trim().slice(0, 500);
    sub.reviewedBy = actor;
    sub.reviewedAt = now;
    sub.updatedAt = now;
    sub.publishedAppId = publishedItem.id;

    saveDb(db);
    return res.json({ success: true, submission: sub, item: publishedItem });
  });

  // POST /api/ceo/apps/:id/apk (Protected: update APK binary & version on an existing store app)
  apiRouter.post('/ceo/apps/:id/apk', requireCeoAuth, (req: Request, res: Response) => {
    const itemId = String(req.params.id || '');
    const { apkId, version, updateNotes, packageName } = req.body || {};

    const db = ensureDb();
    const item = db.items.find((i) => i.id === itemId);
    if (!item) {
      return res.status(404).json({ error: 'Uygulama bulunamadı.' });
    }

    const apkRec = db.apkFiles?.[String(apkId || '')];
    const diskPath = apkRec ? resolveConfinedApkPath(apkRec.storedName) : null;
    if (!apkRec || !apkRec.scanReport?.passed || !diskPath || !fs.existsSync(diskPath)) {
      return res.status(400).json({ error: 'Geçerli ve güvenlik taramasından geçmiş bir APK paketi bulunamadı.' });
    }

    apkRec.quarantined = false;
    const now = new Date().toISOString();
    const nextVersion = String(version || '').trim() || item.version || 'v1.0.1';
    const nextNotes = String(updateNotes || '').trim() || `APK paketi ${nextVersion} sürümüne güncellendi.`;
    const downloadUrl = `/api/apk/download/${item.id}`;

    if (packageName && isValidPackageName(String(packageName).trim())) {
      item.packageName = String(packageName).trim();
    }
    item.version = nextVersion;
    item.updateNotes = nextNotes;
    item.updatedAt = now;
    item.launchMode = 'download';
    item.demoType = 'installed';
    item.appUrl = downloadUrl;
    item.gameplayUrl = downloadUrl;
    item.apkId = apkRec.apkId;
    item.apkUrl = downloadUrl;
    item.apkFileName = apkRec.originalFileName;
    item.fileSizeBytes = apkRec.fileSizeBytes;
    item.apkSha256 = apkRec.sha256;
    item.apkVerified = true;
    item.apkScanSummary = apkRec.scanReport.summary;
    if (!item.versionHistory) item.versionHistory = [];
    item.versionHistory.unshift({
      version: nextVersion,
      date: now,
      notes: nextNotes
    });

    saveDb(db);
    res.json({ success: true, item });
  });

  // POST /api/ceo/apps/sync-cloud (Protected: hydrate server store from Firestore apps)
  apiRouter.post('/ceo/apps/sync-cloud', requireCeoAuth, (req: Request, res: Response) => {
    const incomingItems = Array.isArray(req.body?.items) ? req.body.items : [];
    const db = ensureDb();
    let changed = false;

    for (const raw of incomingItems) {
      if (!raw || typeof raw !== 'object' || !raw.id || !raw.title) continue;
      const safeId = String(raw.id).replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
      const cleanUrl = String(raw.appUrl || raw.gameplayUrl || '').trim();
      if (!safeId || !isValidAppLocation(cleanUrl)) continue;

      const normalized: StoreItem = {
        id: safeId,
        title: String(raw.title).trim(),
        type: raw.type === 'game' ? 'game' : 'app',
        category: String(raw.category || 'Genel').trim() || 'Genel',
        developer: String(raw.developer || 'KENİX').trim() || 'KENİX',
        isOfficialKenix: raw.isOfficialKenix !== false,
        shortDescription: String(raw.shortDescription || '').trim(),
        fullDescription: String(raw.fullDescription || '').trim(),
        icon: String(raw.icon || 'Layers').trim() || 'Layers',
        logoUrl: typeof raw.logoUrl === 'string' && raw.logoUrl ? raw.logoUrl : undefined,
        banner: typeof raw.banner === 'string' ? raw.banner : '',
        tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [String(raw.category || 'Genel')],
        likes: Math.max(0, Number(raw.likes || 0)),
        dislikes: Math.max(0, Number(raw.dislikes || 0)),
        downloads: Math.max(0, Number(raw.downloads || 0)),
        opens: Math.max(0, Number(raw.opens || 0)),
        rating: Math.min(5, Math.max(0, Number(raw.rating || 0))),
        version: String(raw.version || 'v1.0.0').trim() || 'v1.0.0',
        publishedAt: typeof raw.publishedAt === 'string' && raw.publishedAt ? raw.publishedAt : new Date().toISOString(),
        updatedAt: typeof raw.updatedAt === 'string' && raw.updatedAt ? raw.updatedAt : new Date().toISOString(),
        updateNotes: typeof raw.updateNotes === 'string' && raw.updateNotes ? raw.updateNotes : undefined,
        demoType: raw.launchMode === 'download' ? 'installed' : 'playable',
        appUrl: cleanUrl,
        gameplayUrl: cleanUrl,
        launchMode: raw.launchMode === 'download' ? 'download' : 'link',
        isPublished: raw.isPublished !== false,
        featured: Boolean(raw.featured),
        packageName: typeof raw.packageName === 'string' ? raw.packageName : undefined,
        apkId: typeof raw.apkId === 'string' ? raw.apkId : undefined,
        apkUrl: typeof raw.apkUrl === 'string' ? raw.apkUrl : undefined,
        apkFileName: typeof raw.apkFileName === 'string' ? raw.apkFileName : undefined,
        fileSizeBytes: typeof raw.fileSizeBytes === 'number' ? raw.fileSizeBytes : undefined,
        apkSha256: typeof raw.apkSha256 === 'string' ? raw.apkSha256 : undefined,
        apkVerified: typeof raw.apkVerified === 'boolean' ? raw.apkVerified : undefined,
        apkScanSummary: typeof raw.apkScanSummary === 'string' ? raw.apkScanSummary : undefined,
        submittedBy: typeof raw.submittedBy === 'string' ? raw.submittedBy : undefined,
        submissionId: typeof raw.submissionId === 'string' ? raw.submissionId : undefined,
        versionHistory: Array.isArray(raw.versionHistory) ? raw.versionHistory : []
      };

      if (mergeItemIntoDb(db, normalized)) {
        changed = true;
      }
    }

    if (changed) {
      saveDb(db);
    }

    res.json({ success: true, items: db.items });
  });

  // POST /api/ceo/apps (Protected)
  apiRouter.post('/ceo/apps', requireCeoAuth, (req: Request, res: Response) => {
    const {
      title,
      category,
      developer,
      shortDescription,
      fullDescription,
      appUrl,
      launchMode,
      logoUrl,
      banner,
      icon,
      version,
      updateNotes,
      isPublished,
      packageName,
      apkId
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Uygulama adı zorunludur.' });
    }
    if (!category || !String(category).trim()) {
      return res.status(400).json({ error: 'Kategori zorunludur.' });
    }

    const db = ensureDb();
    const newItemId = `kenix-app-${Date.now()}`;

    let resolvedUrl = String(appUrl || '').trim();
    let effectiveLaunchMode: 'link' | 'download' = launchMode === 'download' ? 'download' : 'link';
    let apkMeta: Partial<StoreItem> = {};

    const cleanApkId = String(apkId || '').trim();
    if (cleanApkId) {
      const apkRec = db.apkFiles?.[cleanApkId];
      if (!apkRec || !apkRec.scanReport?.passed) {
        return res.status(400).json({ error: 'Belirtilen APK paketi bulunamadı veya güvenlik taramasını geçemedi.' });
      }
      apkRec.quarantined = false;
      resolvedUrl = `/api/apk/download/${newItemId}`;
      effectiveLaunchMode = 'download';
      apkMeta = {
        apkId: apkRec.apkId,
        apkUrl: resolvedUrl,
        apkFileName: apkRec.originalFileName,
        fileSizeBytes: apkRec.fileSizeBytes,
        apkSha256: apkRec.sha256,
        apkVerified: true,
        apkScanSummary: apkRec.scanReport.summary
      };
    } else if (!resolvedUrl || !isValidAppLocation(resolvedUrl)) {
      return res.status(400).json({
        error: 'Geçerli bir uygulama bağlantısı (https://...) giriniz veya doğrulanmış bir .apk dosyası yükleyiniz.'
      });
    }

    const cleanPackageName = String(packageName || '').trim();
    if (cleanPackageName && !isValidPackageName(cleanPackageName)) {
      return res.status(400).json({ error: 'Geçersiz Android paket adı (Örn: com.kenix.uygulama).' });
    }

    const cleanLogo = String(logoUrl || '').trim();
    const cleanBanner = String(banner || '').trim();
    if (!isValidImageSource(cleanLogo) || !isValidImageSource(cleanBanner)) {
      return res.status(400).json({ error: 'Logo ve kapak görseli geçerli bir URL veya görsel dosyası olmalıdır.' });
    }

    const now = new Date().toISOString();
    const cleanCategory = String(category).trim();
    const cleanDeveloper = String(developer || 'KENİX').trim() || 'KENİX';
    const rawFullDesc = String(fullDescription || '').trim();
    const cleanShortDesc =
      String(shortDescription || '').trim() ||
      (rawFullDesc ? rawFullDesc.slice(0, 140) : `${cleanCategory} · ${cleanDeveloper}`);
    const cleanFullDesc = rawFullDesc || cleanShortDesc;
    const cleanVersion = String(version || 'v1.0.0').trim() || 'v1.0.0';
    const cleanUpdateNotes = String(updateNotes || '').trim() || 'İlk sürüm yayına alındı.';

    const newItem: StoreItem = {
      id: newItemId,
      title: String(title).trim(),
      type: 'app',
      category: cleanCategory,
      developer: cleanDeveloper,
      isOfficialKenix: true,
      shortDescription: cleanShortDesc,
      fullDescription: cleanFullDesc,
      icon: String(icon || 'Layers').trim() || 'Layers',
      logoUrl: cleanLogo || undefined,
      banner: cleanBanner,
      tags: [String(category).trim()],
      likes: 0,
      dislikes: 0,
      downloads: 0,
      opens: 0,
      rating: 0,
      version: cleanVersion,
      publishedAt: now,
      updatedAt: now,
      updateNotes: cleanUpdateNotes,
      demoType: effectiveLaunchMode === 'download' ? 'installed' : 'playable',
      appUrl: resolvedUrl,
      gameplayUrl: resolvedUrl,
      launchMode: effectiveLaunchMode,
      isPublished: isPublished !== false,
      featured: false,
      packageName: cleanPackageName || undefined,
      ...apkMeta,
      versionHistory: [
        {
          version: cleanVersion,
          date: now,
          notes: cleanUpdateNotes
        }
      ]
    };

    db.items.unshift(newItem);
    saveDb(db);

    res.status(201).json({ success: true, item: newItem });
  });

  // PUT /api/ceo/apps/:id (Protected)
  apiRouter.put('/ceo/apps/:id', requireCeoAuth, (req: Request, res: Response) => {
    const itemId = req.params.id;
    const db = ensureDb();
    const item = db.items.find((i) => i.id === itemId);
    if (!item) {
      return res.status(404).json({ error: 'Uygulama bulunamadı.' });
    }

    const {
      title,
      category,
      developer,
      shortDescription,
      fullDescription,
      appUrl,
      launchMode,
      logoUrl,
      banner,
      icon,
      version,
      updateNotes,
      isPublished,
      packageName,
      apkId
    } = req.body;

    if (title !== undefined && !String(title).trim()) {
      return res.status(400).json({ error: 'Uygulama adı boş olamaz.' });
    }
    if (category !== undefined && !String(category).trim()) {
      return res.status(400).json({ error: 'Kategori boş olamaz.' });
    }

    const cleanApkId = String(apkId || '').trim();
    if (cleanApkId && cleanApkId !== item.apkId) {
      const apkRec = db.apkFiles?.[cleanApkId];
      if (!apkRec || !apkRec.scanReport?.passed) {
        return res.status(400).json({ error: 'Yüklenen yeni APK paketi bulunamadı veya güvenlik taramasından geçemedi.' });
      }
      apkRec.quarantined = false;
      const dlUrl = `/api/apk/download/${item.id}`;
      item.apkId = apkRec.apkId;
      item.apkUrl = dlUrl;
      item.appUrl = dlUrl;
      item.gameplayUrl = dlUrl;
      item.launchMode = 'download';
      item.demoType = 'installed';
      item.apkFileName = apkRec.originalFileName;
      item.fileSizeBytes = apkRec.fileSizeBytes;
      item.apkSha256 = apkRec.sha256;
      item.apkVerified = true;
      item.apkScanSummary = apkRec.scanReport.summary;
    } else if (appUrl !== undefined) {
      const cleanUrl = String(appUrl).trim();
      if (!cleanUrl || !isValidAppLocation(cleanUrl)) {
        return res.status(400).json({ error: 'Geçerli bir uygulama bağlantısı (https:// veya /api/apk/download/...) giriniz.' });
      }
      item.appUrl = cleanUrl;
      item.gameplayUrl = cleanUrl;
    }

    if (packageName !== undefined) {
      const cleanPkg = String(packageName).trim();
      if (cleanPkg && !isValidPackageName(cleanPkg)) {
        return res.status(400).json({ error: 'Geçersiz Android paket adı (Örn: com.kenix.uygulama).' });
      }
      item.packageName = cleanPkg || undefined;
    }

    if (logoUrl !== undefined) {
      const cleanLogo = String(logoUrl).trim();
      if (!isValidImageSource(cleanLogo)) {
        return res.status(400).json({ error: 'Geçersiz logo görseli.' });
      }
      item.logoUrl = cleanLogo || undefined;
    }

    if (banner !== undefined) {
      const cleanBanner = String(banner).trim();
      if (!isValidImageSource(cleanBanner)) {
        return res.status(400).json({ error: 'Geçersiz kapak görseli.' });
      }
      item.banner = cleanBanner;
    }

    if (title !== undefined) item.title = String(title).trim();
    if (category !== undefined) item.category = String(category).trim();
    if (developer !== undefined) item.developer = String(developer).trim() || item.developer;
    if (shortDescription !== undefined) {
      item.shortDescription = String(shortDescription).trim() || `${item.category} · ${item.developer}`;
    }
    if (fullDescription !== undefined) {
      item.fullDescription = String(fullDescription).trim() || item.shortDescription;
    }
    if (icon !== undefined) item.icon = String(icon).trim() || item.icon;
    if (launchMode !== undefined && !cleanApkId) {
      item.launchMode = launchMode === 'download' ? 'download' : 'link';
      item.demoType = item.launchMode === 'download' ? 'installed' : 'playable';
    }
    if (isPublished !== undefined) {
      item.isPublished = Boolean(isPublished);
    }

    const now = new Date().toISOString();
    const nextVersion = version !== undefined ? String(version).trim() : item.version;
    const nextNotes = updateNotes !== undefined ? String(updateNotes).trim() : item.updateNotes;
    const versionChanged = nextVersion && nextVersion !== item.version;
    const notesChanged = nextNotes && nextNotes !== item.updateNotes;

    if (versionChanged || notesChanged) {
      item.version = nextVersion || item.version;
      item.updateNotes = nextNotes || item.updateNotes;
      item.updatedAt = now;
      if (!item.versionHistory) item.versionHistory = [];
      item.versionHistory.unshift({
        version: item.version,
        date: now,
        notes: item.updateNotes || 'Uygulama güncellendi.'
      });
    } else {
      item.updatedAt = now;
    }

    saveDb(db);
    res.json({ success: true, item });
  });

  // PATCH /api/ceo/apps/:id/publish (Protected)
  apiRouter.patch('/ceo/apps/:id/publish', requireCeoAuth, (req: Request, res: Response) => {
    const itemId = req.params.id;
    const { isPublished } = req.body;
    const db = ensureDb();
    const item = db.items.find((i) => i.id === itemId);
    if (!item) {
      return res.status(404).json({ error: 'Uygulama bulunamadı.' });
    }

    if (Boolean(isPublished) && !isValidAppLocation(item.appUrl || item.gameplayUrl || '')) {
      return res.status(400).json({
        error: 'Yayına almak için önce bu uygulamaya geçerli bir bağlantı veya doğrulanmış APK tanımlamalısınız.'
      });
    }

    item.isPublished = Boolean(isPublished);
    item.updatedAt = new Date().toISOString();
    saveDb(db);

    res.json({ success: true, item });
  });

  // DELETE /api/ceo/apps/:id (Protected)
  apiRouter.delete('/ceo/apps/:id', requireCeoAuth, (req: Request, res: Response) => {
    const itemId = req.params.id;
    const db = ensureDb();
    const index = db.items.findIndex((i) => i.id === itemId);
    if (index === -1) {
      return res.status(404).json({ error: 'Uygulama bulunamadı.' });
    }

    const removed = db.items[index];
    if (removed.apkId && db.apkFiles?.[removed.apkId]) {
      const apkRec = db.apkFiles[removed.apkId];
      const diskPath = resolveConfinedApkPath(apkRec.storedName);
      if (diskPath && fs.existsSync(diskPath)) {
        fs.unlinkSync(diskPath);
      }
      delete db.apkFiles[removed.apkId];
    }

    db.items.splice(index, 1);
    delete db.itemVotes[itemId];
    for (const user of Object.values(db.users)) {
      if (user.votes) delete user.votes[itemId];
      if (user.favorites) {
        user.favorites = user.favorites.filter((fid) => fid !== itemId);
      }
    }
    if (db.usageEvents) {
      db.usageEvents = db.usageEvents.filter((e) => e.itemId !== itemId);
    }

    saveDb(db);
    res.json({ success: true });
  });

  app.use('/api', apiRouter);

  // Vite middleware in dev or static files in prod
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Kenix STORE Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Kenix STORE] Server failed to start:', err);
});
