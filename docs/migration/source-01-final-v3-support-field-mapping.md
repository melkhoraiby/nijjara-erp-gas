# Source 01 Final V3 Support Field Mapping Preparation

This document records the support/reference field-level mapping preparation pass for the sole raw source workbook `data/raw/Nijjara-Data_Final-V3.xlsx`.

## `Expense Catalog`

- Source sheet name: `Expense Catalog`
- Likely target entity: Expense Catalog Items, with supporting linkage to Expense Categories and Expense Subcategories
- Likely target table or target lane: no final table exists yet; likely a future finance expense-catalog master lane plus related expense-category and expense-subcategory reference lanes
- Source primary key candidate: `Expense_ID`
- Source columns to map now:
  - `Expense_ID`
  - `Expense_Name_EN`
  - `Expense_Name_AR`
  - `Sub Category_EN`
  - `Category_EN`
  - `SubCategory_AR`
  - `Category_AR`
- Source columns to defer:
  - none identified from the current sheet header; any derived search fields or generated helper values would be deferred rather than sourced from this sheet
- Target columns already existing:
  - none in current schema or app implementation
- Target columns not yet modeled:
  - expense catalog item identity
  - bilingual catalog item names
  - bilingual subcategory labels
  - bilingual category labels
  - any normalized foreign-key linkage from catalog item to category and subcategory masters
- Normalization rules:
  - preserve `Expense_ID` as the current source-side business key candidate
  - normalize `Sub Category_EN` and `SubCategory_AR` into one canonical subcategory mapping lane while preserving source spelling differences
  - normalize `Category_EN` and `Category_AR` into one canonical category mapping lane
  - treat bilingual labels as separate canonical business fields rather than merged display strings
  - do not assume the sheet alone proves final category/subcategory master keys; reconciliation is still required
- Dependency notes:
  - expense-catalog interpretation must stabilize before expense transaction mapping can proceed confidently
  - category and subcategory normalization must align with the approved four expense types and allocation-channel model from the baseline
- Open questions:
  - should the expense catalog become its own final master table, or should it remain a controlled supporting catalog under category/subcategory masters?
  - are category and subcategory labels in this sheet authoritative master labels or duplicated convenience fields?
  - will `Expense_ID` remain a long-term business key, or is it only a migration-source identifier?

## `Material Catalog`

- Source sheet name: `Material Catalog`
- Likely target entity: Material Catalog Items
- Likely target table or target lane: no final table exists yet; likely a future materials master or material-catalog reference lane
- Source primary key candidate: `Material_ID`
- Source columns to map now:
  - `Material_ID`
  - `Material_Name_EN`
  - `Material_Name_AR`
  - `Sub Category_EN`
  - `Category_EN`
  - `SubCategory_AR`
  - `Category_AR`
- Source columns to defer:
  - none identified from the current sheet header; any future generated classifications, search helpers, or inventory-specific fields are outside this source pass
- Target columns already existing:
  - none in current schema or app implementation
- Target columns not yet modeled:
  - material identity
  - bilingual material names
  - bilingual category and subcategory linkage labels
  - any future foreign-key linkage from materials to the expense-support structure
- Normalization rules:
  - preserve `Material_ID` as the source-side business key candidate
  - treat bilingual material names as separate canonical fields
  - normalize category and subcategory labels against the active expense-support structure before any downstream use
  - do not assume every row represents a strictly atomic purchasable material without later business review
- Dependency notes:
  - material-catalog interpretation depends on stable category/subcategory normalization from the support/reference lane
  - later expense transaction mapping may rely on material entries where raw expense text refers to materials instead of formal expense names
- Open questions:
  - should material records live in finance-support only, or in a later dedicated materials or inventory lane?
  - do rows like `Adhesives & Sealants` represent a material family, a reusable catalog header, or an actual selectable item?
  - should materials map directly to expense subcategories, or remain a separate supporting catalog linked by reference only?

## `System Enums`

- Source sheet name: `System Enums`
- Likely target entity: Controlled Enum Definitions
- Likely target table or target lane: no final table exists yet; likely a future shared system-enums reference lane
- Source primary key candidate: `Enum_ID`
- Source columns to map now:
  - `Enum_ID`
  - `Enum_Group`
  - `Enum_Key`
  - `Enum_Label_AR`
  - `Enum_Label_EN`
  - `Sort_Order`
  - `Is_Active`
- Source columns to defer:
  - none identified from the current sheet header; group-level ownership decisions are deferred even though the fields themselves are visible now
- Target columns already existing:
  - none in current schema or app implementation
- Target columns not yet modeled:
  - enum identity
  - enum group ownership
  - bilingual enum labels
  - explicit sort order
  - active-state control for enum rows
- Normalization rules:
  - preserve `Enum_ID` as the source-side identifier during mapping preparation
  - normalize `Enum_Group` and `Enum_Key` as separate controlled dimensions
  - preserve `Sort_Order` as an ordered numeric field and avoid converting it into display-only text
  - map `Is_Active` as a boolean-like control field
  - do not auto-promote every enum row into final schema usage without target-entity ownership review
- Dependency notes:
  - enum interpretation may influence statuses, module codes, type codes, and other controlled labels across master and transaction lanes
  - transaction mapping should wait until the relevant enum groups are clearly assigned to business ownership and target usage
- Open questions:
  - which enum groups are true final-system controlled values versus source-only migration helpers?
  - should system enums be stored in one shared table, or split by business ownership later?
  - are module codes like `SYS` and `HRM` meant only for system configuration or also for business-facing reporting labels?
