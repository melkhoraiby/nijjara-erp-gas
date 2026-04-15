# Import Order

This project follows a dependency-first migration order. Base identities and controlled master data must be established before access identities and before transactions.

## Approved Order

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

## Source Notes

- The sole current migration source for planning is `data/raw/Nijjara-Data_Final-V3.xlsx`.
- All current dependency planning, mapping preparation, and sequencing decisions should reference this workbook only.
- Earlier split-source registrations are superseded for active planning.

## Ordering Notes

- Employees must be imported before Users because user accounts depend on employee identities.
- Partners / BODs must be ready before partner-linked financial records.
- Clients must be stable before project and project-payment migration.
- Projects must be stable before project-linked income and expense interpretation.
- Categories, catalogs, and channels should be stable before expense or income transaction migration starts.
- Custody Accounts should be loaded before any expense, payroll, or transfer movement that references custody.
- Transaction areas must wait until related master entities, catalogs, and support references are mapped and validated.
