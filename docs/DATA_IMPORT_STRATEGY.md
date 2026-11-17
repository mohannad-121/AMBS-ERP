# Data import readiness

No real data was imported. `PACKING LIST FORMAT.xlsx` and `PACKING DELIVERY TRACKING.xlsx` were not found in the inspected workspace. Their contents and layout have not been assumed or modified. Odoo access and the original workbooks remain inputs for the Phase 9 migration project.

## Mapping and review

| Source concept | Target | Required review |
| --- | --- | --- |
| Customer / partner rows | customers | Canonical official name, normalized name, contacts/address/country, verified TRN if present; one customer must not be created for each project/LPO |
| Site/project description | projects | Canonical customer UUID, project name/location/contact, source identity |
| Customer-issued LPO | customer_lpos | Issuing customer UUID, customer-consistent project UUID if known, normalized reference, actual date/status |
| Product/material names | items | Immutable ITM code, item type, approved category/unit, independently identified family variant where relevant |
| STD/MAXI/length/colour columns | product_families + item attributes | Business-reviewed definitions and explicit approved combinations; do not infer all combinations |
| Product photographs | item_images + private storage | Rights/approval, actual valid content, format/size, correct item mapping |
| Odoo IDs / workbook row identities | legacy_references | Source-system/version scope and stable source key pointing to one canonical target |

The company must classify its approximately 30 existing customer/project references before importing. Multiple legacy customer rows may map to a single customer UUID while their distinct projects and LPOs retain separate identities. Case/whitespace matching is a candidate signal. Different spellings, shared TRNs, conflicting contacts and genuinely distinct entities require a review queue, not silent merging. Retain every approved source-to-target mapping.

## Idempotent staged process

1. Copy approved sources into a restricted, backed-up staging location outside Git; retain immutable originals, file hashes, export time and source version. Do not edit original workbooks.
2. Assign a stable source-system identifier and source key per source entity. A workbook row number alone is unstable after edits: use an approved business key or a versioned source-manifest key.
3. Build a dry-run command in Phase 9 that parses without business writes, applies the same schemas/normalization/reference rules as the APIs, and reports row counts, duplicate candidates, missing fields, conflicting LPO scope, unknown units, invalid combinations and source errors. Do not treat blank numeric cells as zero without an approved rule.
4. Human reviewers approve canonical customer/project/LPO/item mappings and conflict resolutions. Store the decision manifest with actor, date, reason and source hashes. No fuzzy auto-merge.
5. Import parents before children in bounded transactions. Match `legacy_references(source_system,entity_type,source_key)` before creating a target. This unique key prevents rerun duplication; multiple source keys may reference the same canonical customer. Each reference has a real target FK. Do not invent target UUIDs or reuse names as identifiers.
6. For reruns, compare source fingerprint and approved manifest. Unchanged rows are no-ops; changed rows produce a proposed diff and conflict report before updates. Use separate import-run/checksum/audit tables in Phase 9 rather than overloading existing notes or audit payloads.
7. Reconcile source rows, accepted/rejected/duplicate counts, target totals, relationships and image digests. Every source entity must be mapped or explicitly excluded with a reason. Test rerun idempotence and restore/recovery in a scratch database before production execution.

`legacy_references` is preparatory storage only: no import endpoint or automatic importer is exposed in Phase 3. Item names map through reviewed source mappings to stable item UUIDs and ITM codes; renaming an item does not change its identity. Customer-level LPO number uniqueness and attribute approval rules must be confirmed before historical loading.

## Deferred work

Historical stock, orders, backorders, delivery tracking, accounts and packing formulas require their later schemas and approval processes. Do not import them as generic notes or current stock balances. All Excel templates remain relevant until formally reviewed. Formula quantities, unit conversions, customer overrides and product combinations require company approval.
