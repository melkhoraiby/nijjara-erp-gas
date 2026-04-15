# Source 01 Final V3 Mapping Scope

This document defines the current migration-planning scope using `data/raw/Nijjara-Data_Final-V3.xlsx` only.

## Current Pass Note

- Field-level mapping preparation is now actively being prepared for base masters and channels from the sole raw source workbook.
- Support/reference field-level mapping is now also actively being prepared from the same sole raw source workbook.
- Transaction sheets remain outside the current field-level pass, even though they remain in the broader consolidated migration scope.

## Base Identities / Masters

Included sheets:

- `Employees`
- `Partners`
- `Clients`
- `Projects`
- `Custody Accounts`

### Likely Mapping Lane

- employee master lane
- partner / BOD master lane
- client master lane
- project master lane
- custody-account master lane

### Dependencies

- `Projects` depends on stable client linkage.
- `Custody Accounts` may depend on employee and partner identity resolution.
- later user-account planning still depends on employee readiness, even though user import is not part of this reset.

### Normalization Concerns

- confirm authoritative business keys versus workbook-only identifiers
- preserve leading zeros in mobile values and other business strings
- normalize status and active flags into controlled values
- reconcile bilingual display fields where both Arabic and English variants are present
- clarify whether salary-related employee fields stay in the employee master lane or split later into payroll-linked structures

### Deferred / Open Issues

- final row-level duplicate reconciliation is still open where the workbook may contain overlapping business identities
- custody holder modeling needs careful review to separate employee, partner, and holder references cleanly
- project date semantics and amount semantics still need controlled mapping decisions

## Channels / Structure

Included sheets:

- `Revenue Channels`

### Likely Mapping Lane

- controlled revenue-channel structure lane

### Dependencies

- may depend on `Projects` for external revenue-channel references
- may depend on internal-channel interpretation from the approved business model

### Normalization Concerns

- reconcile channel-type values against the approved internal and external channel model
- determine whether entity references point to projects, clients, or mixed business references
- normalize descriptive fields versus controlled identifiers

### Deferred / Open Issues

- allocation-channel structure is not presented as a dedicated sheet and still requires controlled interpretation from the workbook and baseline rules

## Transactions

Included sheets:

- `Expenses`
- `Income`
- `Projects_Payments`
- `Employees Advances`

### Likely Mapping Lane

- expense transaction lane
- income / collection-related transaction lane
- project payment history lane
- employee advance transaction lane

### Dependencies

- `Expenses` depends on expense classification, project references, internal-channel logic, and custody references
- `Income` depends on project references and internal-channel logic
- `Projects_Payments` depends on stable project and client references
- `Employees Advances` depends on stable employee identities and holder references

### Normalization Concerns

- normalize dates, monetary values, and optional text notes
- separate master-reference text from stable IDs where the workbook stores both
- reconcile `Expense_Type` and internal-channel fields against the approved business models
- ensure payment-history rows do not overwrite project-master amounts without controlled rules
- clarify whether `Income` should later separate collections from broader revenue rows

### Deferred / Open Issues

- no transaction import planning should move into execution until the master and catalog lanes are fully mapped
- `Expenses` and `Income` may still require controlled interpretation of free-text or raw fields before any import approach is chosen
- `Projects_Payments` may overlap with summary amounts already stored in `Projects` and will need reconciliation rules

## Support / Reference

Included sheets:

- `System Enums`
- `Expense Catalog`
- `Material Catalog`

### Likely Mapping Lane

- enum and support-reference lane
- active preferred expense catalog lane
- active preferred material catalog lane

### Dependencies

- `Expense Catalog` may support expense and reporting classification decisions
- `Material Catalog` may depend on future expense or material-classification reconciliation
- `System Enums` may support status, type, and controlled-label mapping across multiple entities

### Normalization Concerns

- determine which enum groups belong in final controlled reference structures and which remain source-only helpers
- reconcile expense and material catalog rows against transaction references
- clarify whether catalog sheets use names only or implicit keys that must later be generated or normalized

### Deferred / Open Issues

- `System Enums` should not be imported blindly until target ownership is confirmed
- `Expense Catalog` and `Material Catalog` are active preferred catalog sources, but field-level reconciliation rules still need controlled definition before import planning
