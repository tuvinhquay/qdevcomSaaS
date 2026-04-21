# Firestore Multi-Tenant Architecture

## Goal
Q-DevCom SaaS uses one shared Firestore project, but data is isolated by company (tenant) so each company can only access its own documents.

## Data Model

### `companies/{companyId}`
- `name`: string
- `ownerId`: string (Firebase Auth UID)
- `createdAt`: timestamp

#### `companies/{companyId}/members/{userId}`
- `role`: `owner | admin | manager | staff`
- `email`: string
- `displayName`: string

#### `companies/{companyId}/modules/core`
- `chatEnabled`: boolean
- `productionEnabled`: boolean
- `warehouseEnabled`: boolean

#### Business Subcollections
- `companies/{companyId}/workOrders/{workOrderId}`
- `companies/{companyId}/productionOrders/{productionOrderId}`
- `companies/{companyId}/inventory/{inventoryId}`
- `companies/{companyId}/chats/{chatId}`

### `users/{userId}`
- `email`: string
- `displayName`: string
- `companyId`: string
- `role`: `owner | admin | manager | staff`
- `createdAt`: timestamp

## Why This Structure
- Multi-tenant isolation is enforced by `companyId` in rules.
- `users` keeps a quick lookup for app bootstrap and role checks.
- `members` is the tenant-scoped membership table for team management.
- `modules/core` stores module feature toggles per company.
- Business data is nested under each company to simplify security boundaries.

## Bootstrap Flow (First Login)
1. User signs in with Firebase Auth.
2. App checks `users/{uid}`.
3. If missing:
- Create new `companies/{companyId}`.
- Create `companies/{companyId}/members/{uid}` with role `owner`.
- Create `companies/{companyId}/modules/core` with default enabled modules.
- Create `users/{uid}` profile linked to `companyId`.
4. Save `companyId` to localStorage for fast client reads.

## Access Pattern
All app modules must use `src/core/firestore/*` repositories instead of calling Firestore SDK directly.
