# Phase 8A data mapping and source review

This is a **preview-only** mapping proposal. No spreadsheet row authorizes creation of an ERP master record, order, delivery, engineering definition or ledger transaction. The original source and proposed normalized values are displayed separately. No imported business model or alternative stock register is introduced.

## Original references actually found

The originals were located in the owner's Downloads directory and read without changing them. They are not copied into the repository or test fixtures. Spreadsheet inspection ran in a network-disabled, read-only container with no database access; only structural/aggregate evidence was retained under ignored `artifacts/phase8a/`. No customer, contact, project, driver or address values are printed in the reports/logs.

| Original | Observed structure | Interpretation and owner decision |
| --- | --- | --- |
| `PACKING LIST FORMAT.xlsx` | 3,035,793 bytes; 14 sheets, including 12 repeated 27-row print-form sheets, another 18-row sheet and a 17-row sheet. The repeated forms contain 16 formula cells each; another sheet contains 14. Images/printer metadata are present. All 14 sheets parsed safely as inert source cells. | A printing/form reference, not an approved flat import table or an engineering BOM. Header detection does not identify a confident table on the repeated forms. Select the intended line-item header explicitly, or prepare an owner-approved flat source. Formula text is shown and invalidates affected data rows; cached results are never trusted. Layout/images are not converted into records. |
| `PACKING DELIVERY TRACKING.xlsx` | 69,422 bytes; four sheets. Main sheet has 813 physical XML rows and 738 nonempty rows. Other sheets have 7/16/17 physical rows. A main-sheet header candidate is on physical row 2; 737 nonempty rows follow it. | These are candidate rows, not approved record counts. Recognized header meanings include packing number, customer, project, date and status. The date's business meaning still needs confirmation. LPO, SKU, driver and quantity are **not automatically mapped** from this candidate; do not invent them or assume they do not exist elsewhere in the workbook. Inspect/map columns explicitly. Supplementary sheets are not automatically joined. |
| `AMBS_EdgeOps.html` | 524,302 bytes; static source contains customer, driver, delivery and LPO concepts. | Read as text only; JavaScript was never executed and client-side prototype data is not authoritative ERP history. |
| `files.zip` | Six members; 1,688,187 expanded bytes, including `AMBS_Production_System.html` and `index.html`. Static source references production, purchase and delivery concepts. | Named HTML members were inspected as bounded inert text, never executed or extracted into the app. No prototype constants, stock balances, BOM ratios, employee identities or example business data were transplanted. ZIP/HTML are not accepted data-upload types. |

The private source review confirmed both `DELIVERD` and `DELVERD` spellings, additional status labels requiring owner interpretation, and incomplete relationship fields. Detailed operational counts remain in private local review evidence and the restricted backup, not in Git. No label is silently treated as a completed ERP dispatch. Table boundaries and meanings must be confirmed before any future import; neither cross-file nor ERP uniqueness is assumed.

## Categories and proposed authoritative targets

Fields below are supported preview mappings. Names or exact ERP codes may identify existing references; multiple matches are an error, never a guessed choice. Unmatched new master names are proposals, while unknown required relationship references are errors. Selected fields also reuse the existing ERP Pydantic input rules; validation does not call the create/update services.

| Preview category | Required source fields | Existing targets and checks |
| --- | --- | --- |
| Customers | name | `Customer`; optional code/email/phone/contact/address/TRN/notes. NFKC/whitespace proposal, duplicate normalized names, bounded spelling hints, existing name/code matches and authoritative email/field/TRN rules. Spelling hints are not exhaustive and never merge identities. |
| Projects | name, customer | `Project` + existing `Customer`; optional code/location/status. Resolve the customer before scoping project matches; duplicate customer/name pairs and unknown/ambiguous relationships are errors. Existing ERP status rules apply. |
| LPO references | name, number, customer | `Lpo` / `customer_lpos`, existing customer and optional project/date. Match numbers within the customer. Preserve the project/customer relationship. A spreadsheet LPO reference is not a purchase order or authority to generate a sales order. |
| Items and variants | SKU, name, unit, category, item_type | `Item`, `Unit`, `Category`, optional `Family`; optional description/colour/dimensions/design. The proposed SKU is compared with authoritative item codes; duplicate SKUs, unknown references, type/field rules, conflicting descriptions and mismatched units are flagged. Codes are not overwritten. Family/variant attributes always require engineering/catalog review; no attributes, pack quantities or BOMs are synthesized. |
| Units | name | `Unit`; optional code and integer decimal precision 0–6. Existing names/codes are matched; no unit conversion is assumed. |
| Categories | name | `Category`; optional code/parent. Unknown parents and self-parent proposals are invalid. No category hierarchy is rewritten. |
| Historical packing/deliveries | packing number, LPO, SKU, driver, delivery date, status, quantity | `PackingDocument`, `Lpo`, `Item`, active `User` with DRIVER role, optional customer/project/unit/`SalesOrder` support. Repeated packing/item identities, conflicting group references, existing packing numbers, unknown drivers, missing dates, ambiguous dates, invalid quantities and unsupported orders are flagged. Known spelling variants propose a historical canonical label only. |
| Physical stock for review | SKU, unit, warehouse, location, quantity | Existing `Item`, `Unit`, `Warehouse`, `Location`; validate relationships, quantity bounds and unit precision. Every row requires physical verification and separate future adjustment/opening-balance approval. **No balance or ledger write.** |

The existing supplier JSON `purchasing/import-preview` remains untouched. It is a supplier-specific preview over `PurchasingImportKey`; it is not a second inventory registry and is not used to bypass this file-validation workflow. Existing `LegacyReference` and supplier import mappings remain unchanged and unpopulated by Phase 8A.

## Header, date and quantity policy

* Header candidates consider the first 20 nonempty rows, with one-row and adjacent two-row headings. XLSX physical row addresses and CSV logical record numbers (including quoted multiline cells) are retained with stable column letters. Repeated/merged/form-style headings are not blindly flattened or joined. Suggestions are heuristic; the operator confirms the candidate and mapping. Ambiguity is displayed. One source column cannot map to several ERP fields.
* XLSX data uses inert inline/shared strings, numeric text and recognized date styles. Original serial values remain visible; the proposed ISO date uses the workbook's 1900/1904 date convention. The fictitious 1900 leap-day serial is rejected. Formula text is preserved with an error; cached formula values are ignored.
* CSV accepts strict UTF-8 (with or without BOM) or BOM-marked UTF-16, with comma/semicolon/tab/pipe delimiters. There is no lossy encoding fallback. CSV fields beginning with formula-like prefixes are inert, not evaluated.
* ISO `YYYY-MM-DD` is the default textual date convention. Ambiguous slash dates require explicit DMY or MDY selection. Two-digit years are not inferred. Dates outside 1900–2100 require a corrected/approved source.
* Quantities use Decimal, maximum six decimals and existing unit precision; negatives/non-finite/oversized values are invalid. Historical delivery quantity must be positive; a proposed physical count may be zero. Source order quantity is **not authority**. Cumulative candidate quantities for a matched ERP order/item are compared against authoritative `SalesLine.quantity`, without creating deliveries or consuming reservations.
* Existing dispatch history and source history can overlap. Phase 8A does not reconcile that overlap into new ledger effects or certify future import idempotency. Historical references are never treated as additional fulfilled demand automatically.

## Data classes that must remain separate

1. Historical reference material: evidence of a source label or document, not proof of signed receipt or a fresh stock issue.
2. Current verified physical stock: a proposed observation requiring accountable human verification, not an automatic opening balance.
3. Actual ERP transactions: posted receipts/transfers/issues/reversals, reservations, sales consumption and production/custody events already governed by the existing services and immutable ledger.

Never automatically import stock increases/decreases, opening balances, historical delivered statuses as dispatches, production consumption, engineering BOMs, route/GPS observations, administrator identities or credentials. Future import requires an explicit owner-approved transaction and duplicate/legacy-reference policy.

## Owner inputs still required

Confirm the authoritative workbook revision and sheet/table boundary; correct/date header meanings; customer spellings and project/customer ownership; LPO references; canonical SKU/unit/category/family definitions and descriptions; status legend for all unrecognized labels; actual driver accounts; historical document-number/revision rules; order/quantity/unit support and overlap with existing deliveries. Engineering definitions remain a separate approval. No genuine variant/BOM can be inferred from these spreadsheets or prototypes.

Exported CSV reports include the source hash, worksheet/header/date/mapping selection, summary, original/proposed values and row-level issues. Formula/control-prefix protection deliberately escapes the **report's cells**, not the uploaded source. Reports contain authorized source data; keep them private and outside Git.
