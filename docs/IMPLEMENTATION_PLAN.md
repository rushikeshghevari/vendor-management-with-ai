# Phase 1 — Implementation Plan

Templates used: `department` module (file shape) + `quotation` module (status workflow,
ownership scoping, sequence-based codes) on the backend; `quotations` feature (list/
detail/create/edit screens, navigation) on mobile. See `PHASE1_REQUIREMENT_MODULE.md`
for the "what"; this doc is the "how".

## Files to Create

**Backend** (`Vendor_management_backend/src/modules/requirement/`)
- `requirement.model.ts` — schema + `RequirementItem` subdocument
- `requirement.validation.ts` — zod schemas (create/update/list query)
- `requirement.service.ts` — business logic, ownership scoping, code generation
- `requirement.controller.ts` — HTTP handlers + activity log + notifications
- `requirement.routes.ts` — Express routes + Swagger JSDoc
- `__tests__/requirement.test.ts` — supertest tests
- `Vendor_management_backend/postman/VMS-Requirements.postman_collection.json`

**Mobile** (`Vendor_management_frontend/src/`)
- `features/requirements/types.ts`
- `features/requirements/api/requirementsApi.ts`
- `features/requirements/requirementSchema.ts`
- `features/requirements/screens/{RequirementList,RequirementDetails,CreateRequirement,EditRequirement}Screen.tsx`
- `components/requirements/{RequirementCard,RequirementEmptyState,RequirementSearch,RequirementSkeleton}.tsx`
- `navigation/RequirementsNavigator.tsx`

## Files to Modify (additive changes only — no existing line removed/changed in behavior)

- `src/routes/index.ts` — mount `/requirements`
- `src/constants/status.ts` — append `REQUIREMENT_STATUS`
- `src/modules/activityLog/activityLog.model.ts` — append 3 `ACTIVITY_ACTIONS` values
- `src/modules/notification/notification.model.ts` — append `'requirement'` module +
  `'requirement_submitted'` type
- `src/store/baseApi.ts` — append `'Requirement'` to `tagTypes`
- `src/navigation/types.ts` — add `RequirementsStackParamList`, add `Requirements` to the
  three role tab param lists (Super Admin, HOD, Department User)
- `src/navigation/{SuperAdminNavigator,DepartmentUserNavigator,HodNavigator}.tsx` — register
  `Requirements` tab screen (exact Department User/HOD navigator filenames confirmed at
  implementation time)
- `src/components/layout/DrawerContent.tsx` — add `Requirements` nav entry to 4 role arrays
- `src/navigation/screens/SuperAdminDashboardScreen.tsx` — add requirements stat card
- `src/navigation/screens/DepartmentUserDashboardScreen.tsx` — add status cards + quick action

## Implementation Order

1. Backend model + constants + enum appends (nothing depends on these yet — safe first step)
2. Backend validation → service → controller → routes (bottom-up, each layer testable once
   the one below it exists)
3. Mount route in `routes/index.ts`; confirm `GET /api-docs` shows the new endpoints
4. Backend tests; run full existing backend test suite to confirm zero regressions
5. Mobile: types → api slice → schema → List screen → Details screen → Create/Edit screens
6. Navigation wiring (types → per-role navigators → drawer → dashboards) last, once screens
   exist to point at
7. Full manual walkthrough (see Verification Checklist)

## Verification Checklist

- [ ] `npm run typecheck` passes in both `Vendor_management_backend` and
      `Vendor_management_frontend`
- [ ] Backend lint script passes (script name confirmed at implementation time)
- [ ] `npm test` — full backend suite green, including new `requirement.test.ts`
- [ ] Frontend test suite green (existing tests untouched and passing)
- [ ] `POST /requirements` → `PATCH /:id/submit` manually exercised against the local
      backend as a Department User; confirm `GET /activity-logs` and `GET /notifications`
      show the new entries, and the HOD + Super Admin actually receive the notification
- [ ] Mobile: Requirements tab visible for Super Admin, HOD, Department User, Director;
      not visible for Accounts/Payment/CEO
- [ ] Mobile: full create → add items → save draft → edit → submit flow works end-to-end
      on a real device
- [ ] Spot-check one existing screen per untouched module (Vendors, Quotations, Bills,
      Purchase Orders, Payments) to confirm no visual or functional change

## Rollback Plan

Every backend change is additive (new module + new enum values + one new route-mount
line + one new tagType). To roll back:
1. Remove the `router.use('/requirements', ...)` line from `routes/index.ts` — the API
   surface disappears immediately, nothing else references it.
2. Delete `src/modules/requirement/` and the new Postman collection.
3. Revert the enum appends in `status.ts`, `activityLog.model.ts`, `notification.model.ts`
   (safe to revert — Phase 1 is the only writer of these new values, so no existing data
   references them).
4. On mobile, remove the `Requirements` entries from `navigation/types.ts`, the 3 role
   navigators, `DrawerContent.tsx`, and the two dashboard screens; delete
   `features/requirements/`, `components/requirements/`, and
   `navigation/RequirementsNavigator.tsx`.

No migration is required in either direction — no existing collection or screen is
altered, so rollback is a pure file/line removal with no data cleanup step.
