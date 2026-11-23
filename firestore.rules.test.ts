/**
 * Phase 0 Dirty Dozen Security Specification Tests for KENİX STORE Firestore Rules.
 * Documents adversarial payloads verified against DRAFT_firestore.rules / firestore.rules.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  auth: { uid: string; email?: string; email_verified?: boolean } | null;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_PAYLOADS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on App Vote',
    operation: 'create',
    path: '/apps/app_1/votes/victim_uid',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    payload: {
      appId: 'app_1',
      userId: 'victim_uid',
      voteType: 'like'
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 2,
    name: 'Shadow Field Injection on User Profile',
    operation: 'update',
    path: '/users/user_1',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      userId: 'user_1',
      username: 'User1',
      kcBalance: 120,
      studioPlan: 'normal',
      favorites: [],
      isAdmin: true
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 3,
    name: 'Arbitrary KS Balance Inflation without DownloadReward Batch',
    operation: 'update',
    path: '/users/user_1',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      kcBalance: 999999,
      lastRewardedAppId: 'non_existent_reward'
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 4,
    name: 'Duplicate 100 KS Reward Overwrite Attempt',
    operation: 'update',
    path: '/users/user_1/downloadRewards/app_1',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      appId: 'app_1',
      userId: 'user_1',
      rewardAmount: 100,
      verified: true
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 5,
    name: 'Orphaned Download Reward on Non-Existent App',
    operation: 'create',
    path: '/users/user_1/downloadRewards/fake_app',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      appId: 'fake_app',
      userId: 'user_1',
      rewardAmount: 100,
      verified: true
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 6,
    name: 'Non-Admin StoreApp URL Hijack Attempt',
    operation: 'update',
    path: '/apps/app_1',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      appUrl: 'https://evil-phishing.example.com'
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 7,
    name: 'Unverified Email Admin Spoof',
    operation: 'create',
    path: '/apps/app_spoof',
    auth: { uid: 'spoof_uid', email: 'sungurbey5151@gmail.com', email_verified: false },
    payload: {
      id: 'app_spoof',
      title: 'Spoofed App',
      appUrl: 'https://example.com',
      isPublished: true
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 8,
    name: 'Document ID Poisoning Exceeding 128 Characters',
    operation: 'create',
    path: `/apps/${'a'.repeat(200)}`,
    auth: { uid: 'admin_uid', email: 'sungurbey5151@gmail.com', email_verified: true },
    payload: {
      id: 'a'.repeat(200),
      title: 'Oversized ID App'
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 9,
    name: 'Immortal Timestamp Backdating Attempt',
    operation: 'create',
    path: '/users/user_1/transactions/tx_1',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      id: 'tx_1',
      userId: 'user_1',
      amount: 100,
      type: 'download_reward',
      description: 'Backdated',
      balanceAfter: 220,
      createdAt: '2020-01-01T00:00:00.000Z'
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 10,
    name: 'Cross-User Profile Scraping',
    operation: 'get',
    path: '/users/victim_uid',
    auth: { uid: 'attacker_uid', email: 'attacker@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 11,
    name: 'Array Overflow & Type Poisoning on Favorites',
    operation: 'update',
    path: '/users/user_1',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      favorites: [12345]
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 12,
    name: 'Unpublished Draft App Read by Visitor',
    operation: 'get',
    path: '/apps/unpublished_draft_1',
    auth: null,
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 13,
    name: 'Self-Approved APK Submission Bypass',
    operation: 'create',
    path: '/submissions/sub_evil_1',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      id: 'sub_evil_1',
      userId: 'user_1',
      status: 'approved',
      apkScanPassed: true
    },
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 14,
    name: 'Non-Admin APK Submission Approval Attempt',
    operation: 'update',
    path: '/submissions/sub_1',
    auth: { uid: 'user_1', email: 'user1@example.com', email_verified: true },
    payload: {
      status: 'approved'
    },
    expected: 'PERMISSION_DENIED'
  }
];
