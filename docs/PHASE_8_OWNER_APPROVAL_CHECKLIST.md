# Owner review checklist — data onboarding

**Phase 8A only previews data. Nothing on this page approves an import, stock adjustment, merge or deployment. There is no final import button.**

## Before staff review a file

- [ ] Identify the original file revision and the person responsible for it. Keep the original unchanged and private.
- [ ] Select the correct category and worksheet. Confirm the header row(s), especially in the delivery tracker and printed packing forms.
- [ ] Confirm each column mapping and the source date convention. A suggested mapping is not a business decision.
- [ ] Confirm that the result still says **PREVIEW ONLY — NO DATA HAS BEEN IMPORTED** and shows zero imported records/ledger changes.

## Company identities and references

- [ ] Decide which customer spellings represent the same legal customer. Do not merge on a similar name alone.
- [ ] Confirm each project's customer, and each LPO's customer/project. Supply missing names or reference codes.
- [ ] Verify item SKUs against the real catalog, with correct units, categories and item type. Resolve conflicting descriptions.
- [ ] Have the responsible engineer confirm family/variant attributes. Do not invent BOMs, pack counts or consumption ratios.
- [ ] Resolve every unknown/ambiguous ERP reference and possible duplicate. Existing matches are review findings, not permission to overwrite records.

## Historical delivery information

- [ ] Confirm the date column means the intended business date, not a planned date or entry date.
- [ ] Review proposed `DELIVERD` / `DELVERD` → `DELIVERED` labels. Decide the meaning of every other label rather than guessing.
- [ ] Supply or confirm LPO, item, driver, quantity and unit mappings that are not confidently recognized from the tracker.
- [ ] Verify packing numbers, revisions, partial deliveries and supported ERP orders. Identify overlap with deliveries already recorded.
- [ ] Understand that a historical “delivered” label is not proof of signed customer receipt and must never trigger another stock issue.

## Physical stock and employee tracking

- [ ] Keep historical paperwork separate from a current physical count and from posted ERP ledger transactions.
- [ ] Require accountable staff verification before proposing opening balances/adjustments. Any future posting needs separate explicit approval and an audited ledger action.
- [ ] Review Item Journey gaps: reservation closing employee may be unrecorded; transfers use paired signed location effects; company history currently needs a delivery anchor. Do not fill gaps with spreadsheet-created events.
- [ ] Confirm driver assignments and site pins. ORS road distance and travel duration are **estimates**, not actual GPS travel or live driver location. No new GPS collection or live ORS request is authorized here.

## Preview review and future approval

- [ ] Review all invalid rows, duplicates, missing relationships, existing matches and manual-review findings. “Valid” only means the implemented checks passed.
- [ ] Correct formula/error cells in an owner-approved flat source; the system does not execute formulas or trust cached answers.
- [ ] Save the private validation report with the original file hash, worksheet, header/date/mapping choices and reviewer decision.
- [ ] Understand that the preview is held only in browser/request memory. A page refresh requires reselecting the file; nothing is stored as an import batch.
- [ ] Obtain a separate written decision before any future data import, identifying the exact source hash, row scope, identity/duplicate policy and permitted business actions.
- [ ] Keep Phase 7's unresolved picomatch advisory and unmerged dependency PR visible. Development work does not grant security risk acceptance.

Phase 8B may be planned after these decisions. It is not implemented or authorized by this checklist. No original files, validation exports, personal/customer records or credentials belong in Git.
