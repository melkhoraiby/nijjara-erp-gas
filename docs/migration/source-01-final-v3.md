# Source 01 - Final V3 Consolidated Workbook

## Source Identification

- Source ID: `Source 01`
- Source Name: `Nijjara-Data_Final-V3.xlsx`
- Source Type: Excel workbook
- Source Path: `data/raw/Nijjara-Data_Final-V3.xlsx`

## Workbook Sheets

- `Expenses`
- `Income`
- `Projects`
- `Projects_Payments`
- `Clients`
- `Employees`
- `Partners`
- `Custody Accounts`
- `Revenue Channels`
- `Employees Advances`
- `System Enums`
- `Expense Catalog`
- `Material Catalog`

## Workbook Classification

This workbook is a consolidated migration source that contains:

- master data
- channels / structure
- transactions
- support / reference data

## Source-of-Truth Status

- `data/raw/Nijjara-Data_Final-V3.xlsx` is the sole active migration source of truth for current migration planning.
- This workbook replaces the previously split source model for active migration work.
- Earlier source-stacking assumptions are not active guidance anymore.

## Active Planning Notes

- Master records, channel definitions, transaction sheets, and support sheets are now documented from this raw workbook only.
- `Expense Catalog` and `Material Catalog` are the active preferred catalog sheets inside this consolidated source.
- No import, staging, schema, or application-code work is part of this documentation reset.
