# Prompt 4 Summary - Firestore Multi-Tenant Core

## What Was Implemented

### 1. Firestore SaaS Structure
Added architecture doc at `docs/firestore-architecture.md` with tenant-scoped structure:
- `companies/{companyId}`
- `companies/{companyId}/members/{userId}`
- `companies/{companyId}/modules/core`
- `companies/{companyId}/workOrders/*`
- `companies/{companyId}/productionOrders/*`
- `companies/{companyId}/inventory/*`
- `companies/{companyId}/chats/*`
- `users/{userId}`

### 2. Auto Bootstrap Tenant on First Login
Implemented `src/core/bootstrap/bootstrapTenant.ts` and integrated it into `AuthProvider`.

Flow:
1. Check `users/{uid}`.
2. If not found:
- Create `companies/{companyId}` with owner metadata.
- Create `companies/{companyId}/members/{uid}` as `owner`.
- Create `companies/{companyId}/modules/core` with default module flags.
- Create `users/{uid}` profile linked to company.
3. Persist `companyId` into localStorage for fast client access.

### 3. Internal Firestore Data Access Layer
Created `src/core/firestore/`:
- `firestoreClient.ts`
- `companiesRepo.ts`
- `usersRepo.ts`

Available functions:
- `getCurrentCompanyId()`
- `getCurrentUserRole()`
- `getCompanyMembers()`
- `addMember()`
- `updateUserRole()`

This is now the standard access point for future modules to avoid direct Firebase SDK usage in feature code.

### 4. Multi-Tenant Security Rules
Added `firebase/firestore.rules` with:
- Auth required for all reads/writes.
- Company boundary enforcement (`companyId` ownership/membership).
- Owner/Admin full tenant authority.
- Staff/Manager access to module data only when module flag is enabled.
- Per-collection module gating for `chats`, `inventory`, `workOrders`, `productionOrders`.

### 5. Firebase CLI Auto Deploy Setup
Added `firebase.json` and scripts in `package.json`:
- `firebase:login`
- `firebase:init`
- `firebase:deploy`

## How Future Modules Should Use the Data Layer
Feature modules (Chat, Work Orders, Production, Warehouse) should:
1. Read active tenant via `getCurrentCompanyId()`.
2. Read role via `getCurrentUserRole()`.
3. Perform member/user operations through repository functions.
4. Never call Firestore directly inside UI pages/components.

This keeps permissions logic centralized and makes refactors safer.

## Prompt 4 Unlock
With this core in place, the system is ready for:
- Role & permission system expansion
- Real chat module
- Real work-order module
- Real production module
- Real warehouse module
