# Tenant foundation — verification plan

**This is a test plan, not evidence of passing tests.** Run against a disposable Supabase project after the migration has been reviewed and applied there. Never test by experimenting on the existing inactive project.

## Fixtures

Create two test businesses (A and B), each with:
- one owner,
- one manager,
- one staff user,
- one non-member user,
- at least one job and status-history row.

Create a separate user with no business memberships and a user who belongs to both businesses.

## Required allow/deny cases

| Actor | Operation | Expected result |
|---|---|---|
| Business A owner | Read A business, jobs and history | Allowed |
| Business A staff | Read A jobs and history | Allowed |
| Business A staff | Update A job status or notes | Allowed |
| Business A staff | Change A job business_id or tracking_code | Denied by column grants |
| Business A staff | Read or update B jobs | No rows / denied |
| Business A manager | Read A business and team memberships | Allowed |
| Business A manager | Add, update or delete memberships | Denied |
| Business A owner | Add a membership in A | Allowed |
| Signed-in user | Call create_business_with_owner with a valid name and unique slug | Creates exactly one business and an owner membership for auth.uid() atomically |
| Signed-in user | Supply another user's UUID to create_business_with_owner | Not possible; RPC accepts no user_id argument |
| Anonymous visitor | Call create_business_with_owner | Denied |
| Non-member of A | Call workspace-scoped create_staff_job for A | Denied; no job created |
| Business A member | Create job for selected A workspace | Allowed; generated tracking code belongs to A |
| Business A owner | Change or delete their own membership | Denied |
| User with no membership | Read jobs or create a job | Denied |
| Anonymous visitor | Select jobs, history, businesses or memberships | Denied |
| Anonymous visitor | Call public tracking lookup with valid business slug and code | Only customer-safe tracking fields |
| Anonymous visitor | Call public tracking lookup with unknown slug or code | No rows |
| Any visitor | Lookup a code duplicated across businesses via legacy one-argument RPC | No rows |
| Multi-business staff user | Call legacy create-job RPC without workspace selection | Explicit error; no job created |

## Data integrity checks

- Every pre-existing job is assigned to the Lavage International tenant.
- Existing tracking codes, vehicle details, customer fields, notes, status, timestamps and history remain unchanged.
- New job creation assigns the selected business and generates a tenant-local tracking code without collisions.
- Status changes still create history records.
- A denied cross-business update leaves the original job unchanged.
- Membership changes cannot leave a business without an owner. **This invariant needs a dedicated database constraint/trigger before production rollout.**

## Application integration checks

- Owner signup handles both immediate-session and email-confirmation-required Supabase Auth settings.
- A new owner can create a business only through the atomic create_business_with_owner RPC.
- Workspace selector shows only memberships returned for the authenticated user.
- Staff job list filters by selected business and RLS independently enforces membership.
- Staff job creation passes the selected business ID; database function rechecks membership and role.
- Directly editing local workspace selection to another tenant ID grants no access.
- The /manage route is not linked from the public/customer navigation and sends noindex metadata.

## Execution

1. Review SQL and verify function signatures against the exact target schema.
2. Apply only to a disposable project or local Supabase database.
3. Implement pgTAP tests under `supabase/tests/` for each protected table.
4. Run the database test suite and Supabase security advisors.
5. Inspect grants, RLS policies, exposed schemas and RPC execute privileges.
6. Verify both the old and business-scoped tracking calls.
7. Verify customer and staff app integration before considering a production migration.

## Known gap

The current proposal blocks an owner from changing or deleting their own membership, but it does not yet enforce the invariant that every business always has at least one owner. Add and test that safeguard before using this schema for real businesses. The application-side owner signup and workspace selector are gated by VITE_TENANT_WORKSPACES_ENABLED; keep it false until this SQL is tested and applied. The new /manage route is not linked from the customer navigation.
