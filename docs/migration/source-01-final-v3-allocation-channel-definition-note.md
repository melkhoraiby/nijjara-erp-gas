# Source 01 Final V3 Allocation Channel Definition Note

This document records the controlled planning interpretation for allocation channels based on the approved baseline rules and the current consolidated workbook context.

## Approved Allocation-Channel Model

The approved allocation-channel model is:

- `Specific Project`
- `Factory Machinery Rental`
- `&Pieces Showroom`
- `Factory`

## Planning Interpretation

- Allocation channels are a controlled business structure, not a free-text transaction attribute.
- Allocation channels are distinct from revenue channels, even where some names overlap.
- Revenue channels describe where revenue is generated.
- Allocation channels describe where expense burden is assigned.

## Why Allocation Channels Must Be Defined Before Expense Transaction Mapping

- The baseline requires every expense to carry an allocation channel.
- The baseline also requires expense-type rules that restrict which allocation channels are valid.
- Without a controlled allocation-channel interpretation, expense rows cannot be validated consistently during mapping preparation.
- Expense reporting, project cost visibility, and factory-overhead visibility all depend on stable allocation-channel meaning.

## Required Expense Fields in Planning

Every expense must have both:

- `From Custody`
- `Allocation Channel`

This is a mandatory planning rule derived from the approved baseline and must remain central in later expense-mapping work.

## Relationship to Expense Types

- Direct expenses may map to:
  - `Specific Project`
  - `Factory Machinery Rental`
  - `&Pieces Showroom`
- Indirect Periodical Expense must map to:
  - `Factory`
- Indirect Non-Periodical Expense must map to:
  - `Factory`
- Asset must map to:
  - `Factory`

## Difference from Revenue Channels

- Revenue channels classify income-generating channels.
- Allocation channels classify cost-assignment channels.
- A project can appear as a revenue-generating channel and also be the target of direct expense allocation, but the business meaning is still different in each case.
- Internal revenue channels such as `Factory Machinery Rental` and `&Pieces Showroom` may overlap by name with allowed direct-expense allocation channels, but this does not make revenue-channel rows interchangeable with allocation-channel structure.

## Current Workbook Context

- `Revenue Channels` exists as an explicit sheet in the consolidated workbook.
- Allocation channels do not currently appear as their own dedicated workbook sheet.
- Allocation-channel interpretation therefore must be controlled from baseline rules plus transaction-field interpretation, rather than assumed from a standalone source sheet.

## Status of This Note

- This is a planning and control document only.
- It is not an import execution rule, staging rule, or schema decision by itself.
- Final transaction-mapping work must respect this interpretation unless a later controlled baseline decision changes it.
