# Source 01 Final V3 Master Gap Analysis

This document compares the current master-sheet source structure in `data/raw/Nijjara-Data_Final-V3.xlsx` against the currently implemented system state.

## Employees vs existing `hrm_employees`

### Currently implemented

- `hrm_employees` currently models:
  - `employee_code`
  - `arabic_full_name`
  - `english_full_name`
  - `email`
  - `mobile_number`
  - `is_active`
  - audit timestamps

### Source fields available but not yet modeled

- `Date_Of_Birth`
- `Gender`
- `National_ID_Number`
- `Marital_Status`
- `Military_Status`
- `Alt_Mobile`
- `Address_AR`
- `Emergency_Contact_Name`
- `Emergency_Contact_Relation`
- `Emergency_Contact_Mobile`
- `Job_Title_AR`
- `Department_Name_AR`
- `Hire_Date`
- `Contract_Type`
- `Basic_Salary`
- `Allowances`
- `Deductions`
- `Status`

### Gap impact

- employee master import can only map a narrow foundation subset into the current implemented table
- later attendance, payroll, and HR workflows will likely need additional employee-profile structures before full source coverage is possible

## Partners

### Currently implemented

- no final schema table or app module lane exists yet for partner master data

### Source fields available but not yet represented

- partner identity, bilingual names, contact fields, status, search text, and active flag

### Gap impact

- partner-linked financial lanes cannot move into executable import planning until a target schema direction exists

## Clients

### Currently implemented

- no final schema table or app module lane exists yet for client master data

### Source fields available but not yet represented

- client identity, bilingual names, combined display name, contact fields, status, and search text

### Gap impact

- project import depends on client mapping, so client schema direction is a blocking dependency for later project and transaction import planning

## Projects

### Currently implemented

- no final schema table or app module lane exists yet for project master data

### Source fields available but not yet represented

- project identity
- bilingual names and combined display field
- client linkage
- budget and received / remaining values
- contractual and actual date fields
- project status and active flag
- search text

### Gap impact

- project-linked income, expenses, and payment-history interpretation cannot become executable until project schema direction exists
- summary fields in `Projects` must later be reconciled against payment-history rows in `Projects_Payments`

## Custody Accounts

### Currently implemented

- no final schema table or app module lane exists yet for custody accounts

### Source fields available but not yet represented

- custody account identity
- account name
- employee and partner linkage fields
- holder field
- currency
- status and active flag
- treasury flags
- allow-expense-use flag

### Gap impact

- expense and payroll transaction import planning is blocked until custody-account target modeling exists
- holder resolution remains a dependency on employee and partner master stability

## Revenue Channels

### Currently implemented

- no final schema table or app module lane exists yet for revenue-channel structures

### Source fields available but not yet represented

- revenue-channel identity
- channel type
- bilingual names
- entity/client reference field
- descriptions
- status and active flag
- search text

### Gap impact

- income and some expense interpretation depends on stable revenue-channel modeling
- external versus internal channel behavior must be reconciled with the baseline business model before transaction import planning advances

## Cross-Entity Blocking Dependencies

- users remain blocked by employee readiness
- projects remain blocked by client readiness
- custody accounts remain blocked by employee and partner readiness
- expenses remain blocked by projects, custody accounts, catalogs, and expense-type interpretation
- income remains blocked by projects and revenue-channel interpretation
- employee advances remain blocked by employee readiness and custody-holder interpretation

## Current Conclusion

- the source workbook provides a richer master-data structure than the current implemented schema
- only the employee lane has a currently implemented final table, and even that table covers only a subset of the source fields
- partners, clients, projects, custody accounts, and revenue channels are present in source but not yet represented in final schema or app-level module structures
- these gaps are the main blockers that must be addressed before later transaction import planning can move toward execution
