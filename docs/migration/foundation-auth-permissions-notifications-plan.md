# Real Foundation Pivot Plan

This note records the controlled pivot away from the temporary delivery-only runtime toward the actual system foundation required by the baseline documents.

## Why The Pivot Was Required

- The BRD requires real login, create-account, and forgot-password flows.
- The BRD requires action-based and scope-based permissions across submodules.
- The BRD requires an actionable notification center tied to source entities.
- A workbook-backed demo runtime alone is not sufficient to satisfy those requirements.

## Foundation Slice Started In This Step

The current implementation slice starts the real foundation with:

- Supabase-backed authentication flows
- `app_users` linked to `auth.users`
- database tables for roles, permissions, role-permission mapping, and user-role mapping
- database table for actionable notifications
- authenticated shell behavior for the current workspace routes
- first real database-backed module lane on `hrm_employees`

## Current Scope Boundaries

- Employees are the first module moving to a real database-backed CRUD path.
- Clients, projects, catalogs, revenue channels, expenses, and income still need final table implementation and migration off the normalized JSON lane.
- Roles and permissions are now modeled in the database foundation, but full page-by-page enforcement still requires later implementation passes.
- Notifications are now structurally modeled, but downstream workflow-trigger generation still needs later controlled implementation.

## BRD-Controlled Requirements Being Preserved

- Arabic-first experience remains the UI direction.
- Login, account request, and forgot-password remain mandatory business flows.
- Search, filtering, and sorting remain mandatory for view pages.
- Notifications must remain linked to source entities and future actions.
- Audit logging remains part of the implementation foundation.
