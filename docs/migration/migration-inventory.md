# Migration Inventory

## Active Migration Source

| Source ID | Source Name | Source Type | Status | Notes |
| --- | --- | --- | --- | --- |
| Source 01 | `data/raw/Nijjara-Data_Final-V3.xlsx` | Excel workbook | Sole active source of truth | Consolidated workbook covering masters, channels / structure, transactions, and support/reference data for current migration planning. |

## Source-of-Truth Statement

- The previous multi-source migration model is no longer active.
- `data/raw/Nijjara-Data_Final-V3.xlsx` is the only active registered migration source used for migration planning at this stage.
- Earlier source-specific migration assumptions are superseded for active planning.

## Current Active Mapping Scope

- All active migration-planning work now references `data/raw/Nijjara-Data_Final-V3.xlsx` only.
- Active planning covers:
  - base masters: `Employees`, `Partners`, `Clients`, `Projects`, `Custody Accounts`
  - channels / structure: `Revenue Channels`
  - transactions: `Expenses`, `Income`, `Projects_Payments`, `Employees Advances`
  - support / reference: `System Enums`, `Expense Catalog`, `Material Catalog`

## Migration Status

| Area | Current Status | Notes |
| --- | --- | --- |
| Source registration | Completed | `data/raw/Nijjara-Data_Final-V3.xlsx` registered as the sole active source of truth. |
| Documentation reset | Completed | Migration-planning docs were reset around the single-workbook model. |
| Base-master field mapping | Completed at preparation level | Employees, partners, clients, projects, custody accounts, and revenue channels have completed the first preparation pass. |
| Support/reference field mapping | Active | Expense Catalog, Material Catalog, and System Enums are the current active preparation pass. |
| Mapping preparation | Active | Field-level mapping preparation can proceed from this workbook only. |
| Import execution | Deferred | No import, staging, or final-table activity is included in this step. |

## Dependency Order

1. Employees
2. Partners / BODs
3. Clients
4. Projects
5. Revenue Channels
6. Allocation Channels
7. Expense Categories
8. Expense Subcategories
9. Custody Accounts
10. Users
11. Expenses
12. Collections / Revenue
13. Employee Advances
14. Partner Advances / Funding
15. Payroll-related records

## Unresolved Issues

- allocation-channel sourcing is still not represented as its own explicit sheet and needs controlled interpretation from workbook fields plus baseline rules
- project summary values and project payment history must be reconciled carefully before transaction import planning becomes executable
- `System Enums` remains a support/reference source and should not be treated as auto-importable without target ownership review
- catalog sheets are active preferred catalog sources, but field-level reconciliation is still required before execution planning
- transaction mapping remains deferred until support/reference interpretation is stable enough to support controlled downstream mapping

## Notes

- This inventory governs active migration planning only.
- No prior source document should be treated as current active guidance over this workbook.
- No schema, import, staging, or cleanup work is authorized by this inventory reset.
