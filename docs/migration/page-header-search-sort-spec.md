# Page Header, Smart Search, And Sort Spec

This note records the currently approved visible page headers and the BRD-controlled search and sort behavior for the current workspace routes.

## Global Rule

- Every view page with tabular data must expose column headers for the visible fields.
- Under each displayed column header, there must be a smart search/filter input appropriate to that field.
- Clicking a sortable header must sort the full relevant dataset, not just the visible slice.
- Date columns must support exact-date or start/end-date filtering in later full implementations.

## `/employees`

- Visible headers:
  - Employee Code
  - Arabic Name
  - English Name
  - Email
  - Active Status
  - Created At
- Search types:
  - text for code and names
  - text for email
  - select for active status
  - date for created-at in the later expanded pass

## `/clients`

- Visible headers:
  - Client Code
  - Arabic Name
  - English Name
  - Email
  - Mobile
  - Status
- Search types:
  - text for names and contact fields
  - select for status

## `/projects`

- Visible headers:
  - Project Code
  - Arabic Name
  - Client
  - Budget
  - Project Status
  - Contract Start Date
- Search types:
  - text for code, names, and client
  - numeric for budget
  - select for status
  - date for start date

## `/expenses`

- Visible headers:
  - Date
  - Expense
  - Category
  - Subcategory
  - Project
  - Expense Type
  - Allocation Channel
  - From Custody
  - Amount
- Search types:
  - date for date
  - text for names and references
  - select for expense type and allocation channel
  - numeric for amount

## `/income`

- Visible headers:
  - Date
  - Project
  - Internal Channel
  - Amount
  - Raw Data
- Search types:
  - date for date
  - text for project, channel, and raw data
  - numeric for amount

## `/expense-catalog`

- Visible headers:
  - Expense Code
  - English Name
  - Arabic Name
  - Category
  - Subcategory

## `/material-catalog`

- Visible headers:
  - Material Code
  - English Name
  - Arabic Name
  - Category
  - Subcategory

## `/revenue-channels`

- Visible headers:
  - Channel Code
  - Channel Type
  - Arabic Name
  - English Name
  - Entity / Client
  - Status

## Current Implementation Note

- The first active implementation of real column search and full-data sorting is now starting with `/employees`.
- The same controlled header/search/sort model must be rolled through the remaining list pages in the next implementation passes.
