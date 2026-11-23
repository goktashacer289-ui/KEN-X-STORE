export interface VersionHistoryEntry {
  version: string;
  date: string;
  notes: string;
}

export interface StoreItem {
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
  versionHistory?: VersionHistoryEntry[];
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

export interface ApkScanReport {
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

export interface ApkUploadResult {
  apkId: string;
  apkFileName: string;
  fileSizeBytes: number;
  apkSha256: string;
  scanReport: ApkScanReport;
  storageUrl?: string;
}

export interface AppSubmission {
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

export interface GameDraft {
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
    aiGeneratedStory?: string;
    characterPowers?: string[];
    enemyAiType?: string;
    speed?: number;
    jumpHeight?: number;
  };
  updatedAt: string;
}

export interface UserTransaction {
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

export interface UserProfile {
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

export interface SponsorshipSubmission {
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

export interface AppUsageEvent {
  id: string;
  itemId: string;
  itemTitle: string;
  userId: string;
  action: 'open' | 'download';
  timestamp: string;
}

export interface StoreBootstrapResponse {
  user: UserProfile;
  items: StoreItem[];
  categories: string[];
}

export interface CeoOverviewResponse {
  items: StoreItem[];
  usageEvents: AppUsageEvent[];
  stats: {
    totalApps: number;
    publishedApps: number;
    unpublishedApps: number;
    totalOpens: number;
    totalDownloads: number;
    totalLikes: number;
    totalDislikes: number;
  };
}

export interface BootstrapResponse {
  user: UserProfile;
  items: StoreItem[];
  sponsorships: SponsorshipSubmission[];
  allSponsorships?: SponsorshipSubmission[];
  drafts?: GameDraft[];
  systemStats: {
    totalApps: number;
    totalGames: number;
    officialKenixApps: number;
    communityGames: number;
    totalKCCirculation: number;
  };
}
