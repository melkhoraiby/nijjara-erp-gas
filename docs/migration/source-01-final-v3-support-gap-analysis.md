# Source 01 Final V3 Support Gap Analysis

This document compares the current support/reference sheet structure in `data/raw/Nijjara-Data_Final-V3.xlsx` against the currently implemented system state.

## Expense Catalog

### Currently implemented

- no final schema table or app module lane exists yet for expense catalog items

### Source fields available but not yet modeled

- `Expense_ID`
- bilingual expense names
- bilingual category labels
- bilingual subcategory labels

### Gap impact

- expense transaction mapping cannot reliably normalize raw expense names without a controlled expense-catalog lane
- category and subcategory interpretation remains weaker until the catalog structure is assigned a target direction

## Material Catalog

### Currently implemented

- no final schema table or app module lane exists yet for material catalog items

### Source fields available but not yet modeled

- `Material_ID`
- bilingual material names
- bilingual category labels
- bilingual subcategory labels

### Gap impact

- later expense mapping may fail to reconcile material-driven purchases consistently without a controlled material-catalog interpretation
- there is no current target lane for material master/reference ownership in schema or app

## System Enums

### Currently implemented

- no final schema table or app module lane exists yet for shared enum definitions

### Source fields available but not yet modeled

- `Enum_ID`
- `Enum_Group`
- `Enum_Key`
- bilingual enum labels
- `Sort_Order`
- `Is_Active`

### Gap impact

- status, type, and code interpretation across masters and transactions remains partly unresolved without enum ownership decisions
- transaction mapping should not assume workbook codes are self-validating until relevant enum groups are reconciled

## Allocation Channels as a Controlled Business Structure

### Currently implemented

- no dedicated allocation-channel table, schema lane, or app module lane exists yet
- no dedicated allocation-channel sheet exists in the current workbook

### Structure available from approved business rules

- `Specific Project`
- `Factory Machinery Rental`
- `&Pieces Showroom`
- `Factory`

### Gap impact

- expense transaction mapping is blocked from becoming reliable until allocation channels are treated as a controlled structure
- direct versus indirect expense routing cannot be validated safely without this interpretation
- expense reporting by allocation channel cannot be planned confidently without a controlled target direction

## Cross-Lane Blocking Gaps

- support/reference entities are present in source but are not yet represented in schema or app-level module structures
- expense transaction mapping remains blocked by:
  - unresolved expense-catalog target direction
  - unresolved material-catalog target direction
  - unresolved enum ownership and controlled usage
  - missing dedicated target direction for allocation-channel structure
- income mapping may also be affected where channel or enum interpretation depends on unresolved support/reference ownership

## Current Conclusion

- the consolidated workbook provides meaningful support/reference structure, but the current implemented system state does not yet model these entities
- support/reference preparation is now a necessary blocker-clearing step before later expense and income transaction mapping can move forward in a controlled way
