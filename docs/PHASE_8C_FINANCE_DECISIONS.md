# Phase 8C finance decisions requiring owner approval

Status: **assessment only; no accounting implementation or approved financial policy**.
Operational reporting does not establish invoices, payments, receivables, payables,
revenue, profit or asset valuation. Existing PO currency/commitments, indicative
inventory costs and recorded production costs do not authorize accounting entries.
No real financial records were seeded or inferred.

| Decision | Owner/accountant approval needed before implementation |
| --- | --- |
| Accounting boundary | Legal entities, branches, books, chart of accounts, accounting basis, ERP versus external accountant responsibilities, opening-balance authority |
| Roles and approvals | Separate preparer/approver/payment authority, amount thresholds, segregation of duties, period-close overrides, access to customer/supplier financial details |
| Invoice sources | Whether invoices arise from an approved order, actual dispatch, accepted receipt, milestones or manual approval; partial deliveries, reversals, credit/debit notes and duplicate prevention |
| Numbering | Legal invoice sequences per entity/period, immutable issued identifiers, voids/gaps, numbering date and historical identifiers |
| Receivables | Customer legal identity, payment terms, credit limits, aging due-date basis, disputed balances, deposits/advances and retention |
| Payables | Supplier invoice verification, PO/receipt matching, partial invoices, freight/services, disputed quantities, accruals and supplier credits |
| Payments and settlements | Authoritative bank/cash sources, approvals, allocations across invoices, partial/overpayments, fees, refunds, write-offs, bank reconciliation and reversal controls |
| Currencies | Functional/reporting currencies, permitted transaction currencies, exchange-rate source/date/precision, rounding, realized/unrealized FX treatment |
| Reporting periods | Fiscal calendar, Dubai/business timezone cutoff, period locking/reopening, comparative periods and approved opening balances |
| Taxes | Jurisdiction, registration/entity, applicable VAT/tax rules and effective dates, tax-inclusive/exclusive prices, rounding, exemptions and credit-note obligations; accountant review required |
| Costing and valuation | Approved costing method, opening stock cost evidence, freight/tax/processing allocation, supplier-owned custody exclusion, waste/scrap, returns/reversals, work in progress, negative/missing cost handling |
| Revenue and expenses | Recognition triggers, delivery versus customer acceptance, services/milestones, accruals/prepayments, manufacturing cost recognition and approved journals |
| Historical migration | Approved sources, cutoff and period, source IDs, duplicate handling, reconciled trial balance and subledgers, independently approved historical rates/costs; no invented documents |
| Reconciliation and audit | Inventory-to-GL, AR/AP-to-control accounts, bank matching, immutable posted journals, documented corrections, retention, access review, signed approvals and recovery requirements |

Required evidence before financial development: signed requirements and examples,
approved permissions, sample invoice/credit-note lifecycles, reconciled opening
balances, tax/accounting review and a synthetic acceptance dataset. Approval of
operational reports alone is not acceptance of these policies or of the remaining
security exception. None of these decisions blocks the approved read-only Phase
8C operational reporting work. Stop the dependent financial operation until its
specific policy is approved; do not substitute assumptions.
