# KENİX STORE — Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **StoreApp Catalog Integrity (`/apps/{appId}`)**:
   - Only verified admins (`isAdmin()`) may create, edit metadata, publish/unpublish, or delete store applications.
   - Public `get` and `list` queries are restricted to documents where `resource.data.isPublished == true` (or `isAdmin()`), preventing unauthenticated scraping of draft/unpublished apps.
   - `publishedAt` is an immortal field equal to `request.time` on creation and immutable on updates.
2. **User Wallet & Anti-Self-Escalation (`/users/{userId}`)**:
   - Reads and writes are strictly isolated to `isOwner(userId) || isAdmin()`; blanket `isSignedIn()` reads are forbidden.
   - On creation, `kcBalance` must start at exact `120` (welcome balance) and `studioPlan` must be `'normal'`.
   - `kcBalance` CANNOT be arbitrarily inflated by the user:
     - Claiming `+100 KS` (`downloadReward` action) requires an atomic batch creation of a previously non-existent `/users/{userId}/downloadRewards/{appId}` document (`!exists(...) && existsAfter(...)`) and exact `incoming().kcBalance == existing().kcBalance + 100`.
     - Purchasing `PLUS` membership (`purchasePlus` action) requires `existing().kcBalance >= 5000` and exact `incoming().kcBalance == existing().kcBalance - 5000` with `studioPlan == 'plus'`.
3. **Single-Claim Download Rewards (`/users/{userId}/downloadRewards/{appId}`)**:
   - Parent `/users/{userId}` AND target `/apps/{appId}` (with `isPublished == true`) must exist.
   - `rewardAmount` must equal `100` and `verified == true`.
   - Document ID is fixed to `{appId}`, and `allow update, delete: if false;` mathematically prevents receiving >100 KS for the same app.
4. **One-Vote-Per-User (`/apps/{appId}/votes/{userId}`)**:
   - Parent `/apps/{appId}` must exist and have `isPublished == true`.
   - Only verified owner `userId` may create, change, or remove their single vote (`voteType in ['like', 'dislike']`).
5. **Verified Identity & Strict Timestamps**:
   - All authenticated mutations enforce `request.auth != null && request.auth.token.email_verified == true`.
   - All `createdAt` / `updatedAt` timestamps must equal `request.time`.
6. **APK Submissions & Pre-Publish Quarantine (`/submissions/{submissionId}`)**:
   - Verified users may only create a submission with `userId == request.auth.uid`, `status == 'pending'`, `apkScanPassed == true`, valid `apkSha256` (64 hex chars), valid `packageName`, and `fileSizeBytes <= 104857600` (100 MB).
   - Regular users CANNOT update submission status (`approved` / `rejected`), cannot read other users' submissions, and cannot write directly to `/apps/{appId}` or `/admins/{uid}`.
   - Only server-verified admins (`isAdmin()`) may review, approve, reject, or delete submissions and publish approved APKs into `/apps/{appId}`.

## 2. The "Dirty Dozen" Attack Payloads
1. **Identity Spoofing on App Vote**: User `attacker` attempts `create` on `/apps/app1/votes/victim` with `{ userId: "victim", appId: "app1", voteType: "like" }`. Expected: `PERMISSION_DENIED`.
2. **Shadow Field Injection on User Profile**: Verified user updates `/users/u1` adding ghost field `{ isAdmin: true }` or `{ role: "ceo" }`. Expected: `PERMISSION_DENIED`.
3. **Arbitrary KS Balance Inflation**: User updates `/users/u1` setting `kcBalance: 999999` without creating a valid `downloadRewards/{appId}` receipt. Expected: `PERMISSION_DENIED`.
4. **Duplicate 100 KS Download Reward Claim**: User attempts to claim a second `downloadRewards/app1` receipt or overwrite an existing one (`update`/`delete`). Expected: `PERMISSION_DENIED`.
5. **Orphaned Download Reward for Non-Existent / Unpublished App**: User creates `/users/u1/downloadRewards/fake-app` when `/apps/fake-app` does not exist or `isPublished == false`. Expected: `PERMISSION_DENIED`.
6. **Non-Admin App Creation / Tampering**: Normal user creates `/apps/rogue` or updates `appUrl` on `/apps/app1` to a phishing URL. Expected: `PERMISSION_DENIED`.
7. **Unverified Email Admin Spoof**: Token has `email: "sungurbey5151@gmail.com"` with `email_verified: false`. Expected: `PERMISSION_DENIED`.
8. **ID Poisoning / Resource Exhaustion**: Write to `/apps/a...2000chars` or string field exceeding `maxLength`. Expected: `PERMISSION_DENIED`.
9. **Immortal Timestamp Tampering**: Client supplies backdated `createdAt` / `publishedAt` instead of `request.time`. Expected: `PERMISSION_DENIED`.
10. **PII / Profile Cross-User Scraping**: User `u1` executes `get` or `list` on `/users/u2` or `/users`. Expected: `PERMISSION_DENIED`.
11. **Array Overflow Attack**: User writes `favorites` array with `> 100` elements or non-string element `[123]`. Expected: `PERMISSION_DENIED`.
12. **Draft App Scraping**: Unauthenticated user queries `/apps` without filtering/matching `isPublished == true`, or fetches an unpublished `/apps/draft1` doc. Expected: `PERMISSION_DENIED`.
13. **Self-Approved APK Submission Bypass**: Verified user attempts `create` on `/submissions/sub1` with `status: 'approved'` or `update` on `/submissions/sub1` to approve their own APK. Expected: `PERMISSION_DENIED`.
14. **Oversized or Unscanned APK Submission**: Verified user attempts `create` on `/submissions/sub2` with `fileSizeBytes > 104857600` or `apkScanPassed: false`. Expected: `PERMISSION_DENIED`.
