# Business Requirements Document (BRD)

## Nijjara ERP System

## Business Requirements Only

---

## 1. Document Purpose

This document defines the **business requirements** for the Nijjara ERP system. It describes how the system must support the company’s real operating model across finance, HR, projects, approvals, access control, notifications, audit, and reporting.

This document is intentionally focused on the **business side only** and excludes technical architecture, code structure, and implementation details.

---

## 2. Business Objective

The ERP system must serve as the company’s unified operational system for:

- managing employees, owners, partners, clients, projects, and internal entities
- controlling expenses, revenues, custody, payroll, advances, owner funding, and allocations
- managing approvals, requests, transfers, and review paths
- providing live visibility into responsibility, accountability, and business status
- preserving a complete and understandable audit trail
- generating and extracting business reports

The system must reflect actual company practice rather than forcing simplified generic ERP behavior.

---

## 3. Scope of the System

The ERP must cover the following business domains:

- System Administration
- Human Resources
- Finance
- Projects
- Revenues and Collections
- Workflows and Approvals
- Notifications
- Audit Logs
- Reports and Exports

---

## 4. Business Design Principles

### 4.1 All business data must be connected

The system must operate as one connected business environment, not as isolated modules. Data entered in one area must affect related areas when applicable.

Example:

- payroll must come from employee payroll-related records
- those records depend on attendance and defined salary rules
- payroll becomes an expense
- that expense must be tied to a defined custody source
- that affects custody movement and company balance visibility
- that in turn affects allocation and reporting

This same connected-data principle must apply across the entire system.

### 4.2 Business meaning must override accounting shortcuts

The system must preserve real business meaning and never merge different concepts just because they may appear financially similar.

### 4.3 Responsibility must always be visible

For any important transaction, request, approval, or movement, the system must make it clear:

- who created it
- who requested it
- who approved it
- who currently holds responsibility
- what original entity it belongs to

### 4.4 System behavior must follow defined workflows

Every important record type and transaction type must have a defined business path from creation to completion, including approvals, reviews, rejections, and status changes.

---

## 5. Mandatory System Language and Business Display Standards

### 5.1 Language and font

The entire system must be:

- in **Arabic**
- using **Cairo font only**
- consistently Arabic in labels, forms, pages, menus, logs, notifications, and reports

### 5.2 Money display format

All monetary amounts must display in this style:

**100,000 ج.م**

### 5.3 Date display format

Dates must display as:

- Arabic day number
- followed by Arabic month name
- followed by Arabic year number

Example pattern:\
**15 مارس 2026**

### 5.4 Time display format

Time must display as:

**02:08 ص**\
or\
**02:08 م**

### 5.5 Mobile number display format

Mobile numbers must always preserve the leading zero.

Correct example:\
**01000011170**

Incorrect example:\
**1000011170**

### 5.6 Dynamic dropdown and dynamic entity display rules

For any dynamic dropdown, linked field, related entity display, or searchable relationship:

- never show only ID values
- always show the business name of the related entity

Examples:

- employee: show Arabic employee name
- owner/partner: show Arabic name
- client: show Arabic client name
- project: show both Arabic and English project names together
- other entities: show the most business-meaningful visible name

---

## 6. Mandatory View, Search, Filter, and Sort Requirements

Every data view page in the system must support:

### 6.1 Smart search by column

Under the header of each displayed column, there must be a smart search/filter input for that column.

### 6.2 Full-data filtering

Searching and filtering must work on the **full data set**, not only the records currently visible on one page.

### 6.3 Full-data sorting

Sorting by clicking a column header must sort the **entire relevant data set**, not just the current visible page.

### 6.4 Date filtering behavior

Date columns must support:

- start date and end date filtering
- or selecting one exact date

This date logic applies specifically to date fields.

---

## 7. Core Business Entities

The system must support and connect the following core business entities:

- Employees
- Owners / Partners / ESH Parties
- Users
- Clients
- Projects
- Revenue channels
- Expense categories and subcategories
- Custody accounts
- Advances
- Funding entries
- Payroll records
- Attendance records
- Requests
- Approvals
- Notifications
- Audit logs
- Reports

---

## 8. Dependency-Based Business Forms

Some forms must be treated as dependent forms, meaning they can only operate if required base data already exists.

Examples include:

- a **system user** cannot be created unless there is already a valid **employee profile**
- an **attendance record** must relate to an existing **employee**
- an **employee advance request** must relate to an existing **employee**
- a **custody account for an owner** cannot exist unless there is already an existing **owner/partner profile**
- project-related forms cannot operate without an existing project profile
- linked financial records cannot operate without the related base entity

This dependency model must be enforced across the system so business data remains structured and valid.

---

## 9. Business Modules

### 9.1 System Administration

Covers users, roles, action permissions, approval authority, workflow visibility, and cross-system configuration from a business control perspective.

### 9.2 Human Resources

Covers employee profiles, attendance, leave, overtime, excuses, violations, payroll-linked items, requests, and employee financial records.

### 9.3 Finance

Covers expenses, revenue, collections, custody, payroll expenses, advances, owner funding, allocations, and financial reporting.

### 9.4 Projects

Covers project setup, project budgets, project timelines, project revenue tracking, project direct expenses, project-related allocations, and project status monitoring.

### 9.5 Notifications and Audit

Covers real-time actions, responsibility alerts, traceability, and access to source records.

### 9.6 Reports and Exports

Covers extraction, downloading, review, and business analysis reporting.

---

## 10. Revenue Channel Model

Revenue channels must be clearly defined and classified into two main groups.

### 10.1 External Revenue Channels

These are all **projects**.

Each project represents an external revenue channel and must support revenue planning, changes, collections, and cost linkage.

### 10.2 Internal Revenue Channels

There are two internal revenue channels:

#### A) Factory Machinery Rental

This channel represents income from renting factory machinery for use by others, including:

- short time usage such as half an hour, one hour, two hours, or other durations
- private external jobs by labor using factory machinery
- complete strangers or outside customers requesting machine use for a task or job

This is a valid internal revenue channel and must be tracked as such.

#### B) &Pieces Showroom

This is the showroom channel for selling furniture and wood artifacts produced by the factory, whether:

- online
- physical showroom
- or both

This is the second internal revenue channel.

---

## 11. Allocation Channel Model

Every expense in the system must have a defined **Allocation Channel**.

The allocation channel replaces the idea that only direct expenses are linked to a project.

### 11.1 Allocation channel requirement

Every expense must have:

- a defined **From Custody**
- a defined **Allocation Channel**

### 11.2 Allocation channel rules by expense type

#### Direct Expenses

Direct expenses can be allocated to:

- a specific **project**
- the **Factory Machinery Rental** internal revenue channel
- the **&Pieces Showroom** internal revenue channel

#### Indirect Periodical Expenses

Must be allocated under:

- **Factory**

#### Indirect Non-Periodical Expenses

Must be allocated under:

- **Factory**

#### Assets

Must be allocated under:

- **Factory**

---

## 12. Expense Classification Model

Expenses must be defined from the start as exactly **four types**:

1. **Direct Expense**
2. **Indirect Periodical Expense**
3. **Indirect Non-Periodical Expense**
4. **Asset**

This structure must be used consistently throughout the system.

### 12.1 Direct Expense

A direct expense is an expense directly linked to a specific revenue-generating channel, meaning:

- a project
- Factory Machinery Rental
- or &Pieces Showroom

### 12.2 Indirect Periodical Expense

A recurring or period-based expense that supports operations generally and is allocated under Factory.

Examples may include:

- rent
- recurring administrative costs
- recurring subscriptions
- recurring service costs

### 12.3 Indirect Non-Periodical Expense

A non-recurring operating expense that supports general operations and is allocated under Factory.

Examples may include:

- one-time repairs
- one-time operating purchases
- non-recurring support costs

### 12.4 Asset

An expense representing an asset purchase or capitalized operational item that belongs under Factory as allocation channel.

Examples may include:

- tools
- machinery
- furniture used by the business
- equipment with continuing operational use

---

## 13. Mandatory Expense Record Rules

Every expense record must include, at minimum:

- expense type
- date
- amount
- category
- subcategory
- from custody
- allocation channel
- payee or beneficiary where relevant
- related entity where relevant
- notes/reference
- entered by
- workflow status

### 13.1 From Custody is mandatory

Every expense must identify the custody source from which the expense was paid.

### 13.2 Allocation Channel is mandatory

Every expense must identify the allocation channel to which the expense belongs.

### 13.3 Direct expenses are not limited to projects

A direct expense can belong to:

- a project
- Factory Machinery Rental
- &Pieces Showroom

---

## 14. Custody Management Requirements

### 14.1 Meaning of custody

Custody is operational money held under the responsibility of a defined person or entity for business use.

### 14.2 Custody holders

Custody may be held by:

- employee
- accountant
- owner
- partner
- another authorized business holder

### 14.3 Custody-linked spending

Whenever an expense is recorded, it must identify the custody source from which the expense was paid.

### 14.4 Custody visibility

The system must show:

- custody owner name
- custody transaction history
- linked expenses paid from custody
- related transfers
- related settlements where applicable

### 14.5 Custody as a core financial responsibility area

Custody is one of the most sensitive business areas and must remain fully visible across finance, payroll, expenses, transfers, and reporting.

---

## 15. Payroll and Financial Data Connectivity

Payroll must not be entered as an isolated manual expense. It must come from connected business data.

Payroll as an expense must be generated from:

- employee payroll data
- attendance records
- salary rules
- deductions
- bonuses
- violations
- performance-related impacts
- overtime
- general bonuses
- material damage penalties
- attitude or other approved deduction/bonus rules

Then payroll expense must connect to:

- the custody source from which it is paid
- the company’s current business balance visibility
- related reporting and allocation visibility

This same connected-data principle must apply in other business areas too.

---

## 16. Advances and Owner Financial Handling

### 16.1 Employee advances

Employee advances must be treated as employee-related financial records and remain separate from custody.

### 16.2 Owner advances

Owner advances must be separately identifiable and must not be merged with employee advances or custody.

### 16.3 Owner funding

Owner money injected into the business must be clearly classified according to its business meaning.

Examples include:

- temporary funding
- permanent capital increase
- owner advance
- owner custody

These meanings are not interchangeable.

---

## 17. Project Revenue and Budget Management

Projects are external revenue channels and must support a full revenue lifecycle.

### 17.1 Mandatory fields at project creation

Creating a new project profile must require:

- project budget
- project start date
- agreed number of delivery days

### 17.2 Budget importance

The project budget is essential because it defines the revenue expectation and payment structure.

The system must track:

- original project budget
- number of agreed payments
- total received payments
- pending payments

### 17.3 Budget change process

Project budget does not remain fixed in all cases. Therefore, the system must support a formal process such as:

- job change order
- budget amendment process
- approved revenue change workflow

This process must record:

- increase or decrease in budget
- reason for change
- date of change
- impact on number of payments
- updated received vs pending amounts

### 17.4 Project time frame calculation

The project start date and agreed delivery days must be used to calculate the estimated project completion date.

### 17.5 Business days only

The agreed number of delivery days in the contract must be treated as **business days only**.

The estimated project end date must automatically consider:

- Friday as non-working day
- Saturday as non-working day
- public holidays as non-working days

This is necessary for proper project time tracking and delivery planning.

---

## 18. Roles, Permissions, and Scope Model

Roles and permissions must be easy to define, easy to manage, and applicable across all submodules.

### 18.1 Action types

The system must support action-level permissions including at minimum:

- Add
- Edit
- Delete
- View
- Request
- Transfer
- Review
- Approve
- Decline
- Reject

### 18.2 Permission mapping

These actions must be connectable to all submodules in the system.

### 18.3 Scope definition

Each action must allow scope definition such as:

- **All system data**
- **Data created by user**
- **Data related to user**

### 18.4 Related-to-user scope

Data related to user may include, depending on context:

- the employee’s own records
- requests submitted by or assigned to the user
- records tied to the user’s employee profile
- records tied to the user’s department or responsibility path where defined by business policy

### 18.5 Business requirement

Permissions must not be broad and vague. They must be precisely controllable by:

- action type
- submodule
- scope

---

## 19. Login, New Account, and Forgot Password Requirements

The login screen must include the full business flow for:

- Login
- Create New Account
- Forgot Password

### 19.1 Create New Account flow

This flow must be fully defined and controlled.

Business expectations include:

- user requests account creation
- system checks required linked base data
- account creation must only proceed if the required related person/entity record already exists where applicable
- account request may require approval depending on policy
- account status must remain trackable

### 19.2 Forgot Password flow

This process must also be fully defined, trackable, and controlled, including:

- request submission
- identity validation according to policy
- reset approval or reset handling according to policy
- full traceability of the action

---

## 20. Workflow Requirements

### 20.1 Workflow is mandatory

Workflows must be defined for every major data entry and transaction path.

### 20.2 Workflow path requirement

For every important entity or process, the system must define the path from:

- creation
- review
- approval/decline/reject
- execution
- completion
- closure if applicable

### 20.3 Workflow examples

Workflows should exist where relevant for:

- new account requests
- forgot password handling
- expense approval
- advances
- payroll approval
- project changes
- budget changes
- custody transfers
- HR requests
- owner-related financial actions
- report approvals where applicable

---

## 21. Notification Center Requirements

The notification center must be a **true actionable notification center**.

### 21.1 Instant visibility

Notifications should be displayed instantly when they occur or become relevant.

### 21.2 Actionable notifications

If a notification requires an action, the user must be able to take that action directly from the notification center.

Examples:

- approve
- decline
- reject
- review
- open pending request
- respond to transfer

### 21.3 Source entity linkage

Any action taken from a notification must remain directly linked to the original main entity from which the notification came.

### 21.4 Navigation behavior

If a notification does not require direct action, clicking it must take the user directly to the original main entity page.

---

## 22. Audit Log Requirements

Audit logs must capture all important system activity and must be understandable when displayed.

### 22.1 Audit content

Audit must capture, at minimum:

- who performed the action
- what action was performed
- when it was performed
- on which entity or record
- the result/status
- the original main page or source entity context where applicable

### 22.2 Understandable display

Displayed audit logs must be understandable to business users and management, not only technical staff.

### 22.3 Source page navigation

Clicking the details of any audit log must direct the user to the original main page or main entity related to that logged action.

---

## 23. Reports and Report Extraction

Report extraction and downloading is a major system feature.

### 23.1 Reporting requirement

The system must support extracting and downloading reports across the main business areas.

### 23.2 Business report areas

Reports should include, at minimum:

- expenses by type
- expenses by allocation channel
- expenses by custody source
- payroll reports
- custody reports
- advance reports
- owner funding reports
- project budget and payment reports
- project change order reports
- revenue channel reports
- collections reports
- workflow reports
- approval aging reports
- audit reports
- notification/action history reports

### 23.3 Report usability

Reports must be easy to read, easy to export, and based on business-meaningful names rather than internal IDs.

---

## 24. Revenue and Expense Linkage Requirements

The system must make it possible to analyze and trace the relationship between:

- revenue channels
- expense types
- allocation channels
- custody sources
- projects
- Factory Machinery Rental
- &Pieces Showroom
- Factory overheads

This is necessary so management can understand:

- which channels generate income
- which channels consume cost
- how operational support costs relate to the wider business

---

## 25. Data Entry Path and Lifecycle Visibility

For every major business record, the ERP must define:

- where it starts
- what it depends on
- who can create it
- what approvals it needs
- what data it affects
- when it becomes final
- how it appears in reports
- how it appears in audit
- how it appears in notifications

This applies to all major entities, especially:

- expenses
- custody transactions
- payroll
- advances
- owner funding
- project budgets
- project changes
- account requests
- password reset requests
- approvals
- transfers

---

## 26. Business Reporting and Monitoring Expectations

Management must be able to monitor the business through the ERP with visibility into:

- current and historical expenses by the 4 expense types
- allocation channel exposure
- revenue by external and internal channels
- project budget movement over time
- project received vs pending payments
- payroll impact
- custody-linked spending
- owner and employee financial transactions
- workflow bottlenecks
- approval delays
- actionable notifications
- audit-backed accountability

---

## 27. Key Business Rules Summary

The following rules are critical and must remain central in the system:

1. The system is fully Arabic and uses Cairo font everywhere.
2. Every expense must have both:
   - From Custody
   - Allocation Channel
3. Expenses are exactly 4 types:
   - Direct
   - Indirect Periodical
   - Indirect Non-Periodical
   - Asset
4. Direct expenses can belong to:
   - a project
   - Factory Machinery Rental
   - &Pieces Showroom
5. Indirect Periodical, Indirect Non-Periodical, and Assets must be under Factory as allocation channel.
6. Roles and permissions must be action-based and scope-based across all submodules.
7. Every view page must support column-based smart search and full-data sorting/filtering.
8. Dynamic displays must show business names, not raw IDs.
9. Some forms are dependent and cannot exist without required base records.
10. All system data must be connected across modules.
11. The login screen must support full Create New Account and Forgot Password processes.
12. The notification center must be actionable and linked to source entities.
13. Audit logs must be understandable and link back to the original action source.
14. Report extraction and downloading is a major feature.
15. Every major process must have a defined workflow path.
16. Project creation must require budget, start date, and agreed delivery days.
17. Project budget changes must be tracked through a formal change process.
18. Estimated project end date must be calculated based on business days only, excluding Fridays, Saturdays, and public holidays.

---

## 28. Final Business Conclusion

The Nijjara ERP system must function as a deeply connected business operating system, not a loose collection of screens.

Its most important business characteristics are:

- real operational control
- strict financial meaning
- connected data flow
- full traceability
- actionable approvals and notifications
- strong visibility of responsibility
- business-relevant reporting
- proper handling of projects, factory operations, and internal revenue channels

This document forms a business baseline for defining modules, workflows, forms, reports, and approval paths across the ERP.
