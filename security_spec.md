# Security Specification & Invariants

## 1. Data Invariants
1. **Identity Isolation**: All workspace data resides under `/users/{userId}/...` where `userId == request.auth.uid` and `request.auth.token.email_verified == true`. Storage uploads reside under `users/{userId}/documents/{allPaths=**}` under the same strict ownership check.
2. **Owner Integrity**: Every document in any subcollection under `/users/{userId}` MUST contain `ownerUid == request.auth.uid`, which is immutable on update.
3. **Path Variable Guarding**: All document IDs (`userId`, `showroomId`, `clientId`, `vehicleId`, `applicationId`, `historyId`, `documentId`, `archiveId`, `settingId`) MUST match `^[a-zA-Z0-9_\-]+$` and be `<= 128` chars.
4. **Centralized Clients/Vehicles & Showroom Referential Consistency**:
   - `clients` and `vehicles` form the ONE centralized common registry shared across all partner showrooms (no mandatory `showroomId` lock; optional `createdShowroomId` on `clients` is verified via `existsAfter()` when supplied).
   - Showroom-scoped RTO work records (`applications`, `applicationHistory`, `documents`) MUST specify a valid `showroomId` belonging to `/users/{userId}/showrooms/{showroomId}` via `existsAfter()`.
5. **Temporal Integrity**: `createdAt` on create MUST equal `request.time`, remain immutable on update, and `updatedAt` on both create and update MUST equal `request.time`.
6. **Strict Keys & Size Boundaries**: Every write enforces `keys().hasAll(...)` + `keys().hasOnly(...)` on create and `affectedKeys().hasOnly(...)` on update, with explicit `.size()` bounds and enum checks on every field to prevent resource exhaustion or shadow field injection.
7. **Storage Upload Enforcement**: Uploads to `users/{userId}/documents/...` are capped at `10 * 1024 * 1024` bytes (10 MB) and restricted to `application/pdf`, `image/jpeg`, `image/jpg`, and `image/png`.

## 2. The "Dirty Dozen" Adversarial Payloads (Expected: PERMISSION_DENIED)
1. **Cross-Tenant Read/List**: User B (`uid_b`) queries `/users/uid_a/clients` -> Denied because `request.auth.uid != userId`.
2. **Identity Spoofing on Create**: User A writes to `/users/uid_a/clients/CLI-1001` with `ownerUid: "uid_b"` -> Denied by `incoming().ownerUid == request.auth.uid`.
3. **Unverified Email Write**: Authenticated user with `email_verified: false` tries to create a showroom -> Denied by `request.auth.token.email_verified == true`.
4. **Shadow / Ghost Field Injection**: User A creates a client with an unexpected extra key `isAdmin: true` (or fee fields like `totalFees: 5000`) -> Denied by `keys().hasOnly(...)`.
5. **Client-Forged Timestamp on Create**: User A sets `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time` -> Denied by `incoming().createdAt == request.time`.
6. **Immutable `createdAt` Mutation on Update**: User A tries to change `createdAt` or `ownerUid` on an existing application -> Denied by `incoming().createdAt == existing().createdAt` and `incoming().ownerUid == existing().ownerUid`.
7. **ID Poisoning (1.5KB Document ID)**: User A attempts to write `/users/uid_a/clients/<1500 chars>` -> Denied by `isValidId(clientId)`.
8. **String Exhaustion (5KB Address Field)**: User A submits `address` of length 5000 chars -> Denied by `data.address.size() <= 400`.
9. **Orphaned Application Without Showroom**: User A creates an RTO application referencing non-existent `showroomId: "SHW-999"` -> Denied by `existsAfter(/databases/$(database)/documents/users/$(userId)/showrooms/$(incoming().showroomId))`.
10. **Terminal State Bypass on Completed RTO Application**: User A tries to mutate `workStatus` or `workType` on a `Completed` or `Rejected` application -> Denied by terminal state check (only `remarks` and `updatedAt` may change).
11. **Invalid Enum Value Injection**: User A sets `workStatus: "HackedStatus"` -> Denied by `in ['New', 'Documents Pending', 'Ready to Submit', 'Submitted', 'In Process', 'Completed', 'Rejected', 'On Hold']`.
12. **Blanket Root Write**: Authenticated user attempts to write `/test/connection` or `/admin/flags` -> Denied by default-deny catch-all rule.
