# Tenant foundation — review notes

**Status:** proposal only. No SQL has been run against Supabase.

## What this adds

- A businesses tenant table and business_memberships table.
- Roles: owner, manager, and staff.
- A business_id foreign key on existing and future jobs.
- Existing jobs are backfilled to the Lavage International business without deleting or changing their customer, service, status, or history data.
- Tracking-code uniqueness becomes tenant-scoped.
- The existing one-argument customer lookup remains compatible but returns no result if a code becomes ambiguous across businesses. A two-argument lookup accepts business slug plus tracking code.
- RLS policies scope jobs and status history to the caller's business membership.
- All legacy policies on tenant tables are dropped before new policies are created. PostgreSQL permissive policies are OR-combined, so leaving a broad old policy would defeat the new restrictions.
- Existing job-creation RPC arguments are retained. Until the staff app has a workspace selector, job creation requires exactly one active business membership.

## Activation dependency

The migration deliberately does not guess which Supabase Auth user owns Lavage International. After the target project is active and its Auth users are inspected, the intended owner UUID must be verified and inserted as the first owner membership. Until this bootstrap is done, staff access is intentionally denied by the new policies.

Do not grant every existing Auth user staff access merely to avoid the bootstrap step.

## Compatibility and remaining app work

1. Update the customer tracker to call public_job_lookup with business slug and tracking code. The old one-argument RPC remains for existing single-business links and fails closed on ambiguous codes.
2. Add a business workspace selector before supporting staff who belong to multiple businesses.
3. Add owner-controlled invitations and membership management. This proposal permits membership changes by an existing owner only; manager invitations are not enabled yet.
4. Move staff operations to the separate management hostname and enforce server-side session and role checks. Hiding a link is not an authorization boundary.
5. Review Storage policies separately before adding vehicle photographs. Do not expose uploaded images through public buckets by default.
6. Confirm Data API exposure for the new public tables. Supabase's October 30, 2026 change means newly created public tables may not be exposed to the Data API by default; table grants and API exposure are separate controls.

## Security review checklist

- [ ] No broad USING (true) or WITH CHECK (true) policy remains on tenant tables.
- [ ] Anonymous users cannot directly select jobs, history, businesses, or memberships.
- [ ] Public lookup returns only tracking code, vehicle, plate, service, status, timestamps, and public status history.
- [ ] A member of Business A cannot read or update Business B jobs.
- [ ] Staff cannot add or remove memberships or change their own role.
- [ ] A user with no membership cannot create jobs.
- [ ] A user with multiple business memberships is blocked from legacy single-workspace job creation until a workspace is selected.
- [ ] The intended owner bootstrap is verified before applying the migration.
- [ ] SQL is tested on a disposable Supabase project or local database before production.

## Current limitations

This is a tenant and security foundation, not a complete SaaS launch. It does not create billing, invitations, owner signup, custom domains, vehicle-photo storage policies, subscriptions, or production infrastructure. No migration has been applied and no deployment has been made.
