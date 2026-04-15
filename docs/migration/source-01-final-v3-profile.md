# Source 01 Final V3 Profile

This document profiles each sheet in `data/raw/Nijjara-Data_Final-V3.xlsx` for migration planning and mapping preparation only.

| Sheet | Classification | Current Status | Ready for Mapping Preparation Now? | Notes |
| --- | --- | --- | --- | --- |
| `Expenses` | Transactions | Registered and active for planning | Yes | Contains expense transaction fields including date, amount, expense, subcategory, category, project, expense type, internal channel, from custody, and notes. |
| `Income` | Transactions | Registered and active for planning | Yes | Contains income transaction fields including date, amount, project, internal channel, and raw data. |
| `Projects` | Master Data | Registered and active for planning | Yes | Appears to be the primary project master sheet with IDs, names, client linkage, budget values, dates, status, active flag, and search text. |
| `Projects_Payments` | Transactions | Registered and active for planning | Yes | Contains payment-level project transaction history and should be treated separately from the project master itself. |
| `Clients` | Master Data | Registered and active for planning | Yes | Appears to be the primary client master sheet with IDs, bilingual names, contact fields, status, and search text. |
| `Employees` | Master Data | Registered and active for planning | Yes | Appears to be the primary employee master sheet with identity, profile, employment, salary-related, and active-status fields. |
| `Partners` | Master Data | Registered and active for planning | Yes | Appears to be the partner / BOD master sheet with bilingual names, contact fields, status, and active flag. |
| `Custody Accounts` | Master Data | Registered and active for planning | Yes | Appears to be the custody master sheet with holder linkage, partner or employee references, currency, treasury flags, and status fields. |
| `Revenue Channels` | Channels / Structure | Registered and active for planning | Yes | Appears to define revenue-channel structures and supporting descriptive fields. |
| `Employees Advances` | Transactions | Registered and active for planning | Yes | Contains employee advance transaction records and should remain distinct from employee master data. |
| `System Enums` | Support / Reference | Registered and active for planning | Yes | Appears to define reusable enum groups and labels but should still be handled carefully during mapping. |
| `Expense Catalog` | Support / Reference | Registered and active for planning | Yes | Active preferred expense catalog sheet within the consolidated workbook. |
| `Material Catalog` | Support / Reference | Registered and active for planning | Yes | Active preferred material catalog sheet within the consolidated workbook. |

## Profiling Notes

- Ready for mapping preparation means documentation, dependency analysis, and field-level mapping preparation can proceed now.
- Ready for mapping preparation does not mean the sheets are approved for import execution.
- This raw workbook is the only active source used for migration planning at this stage.
