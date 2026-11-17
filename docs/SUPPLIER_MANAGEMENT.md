# Supplier management

Phase 5 stores supplier UUIDs and generated SUP codes independently of names. NFKC/case/whitespace normalization supports search and duplicate warnings. A duplicate warning requires an explicit reviewed distinct-supplier confirmation; no automatic merge occurs. Referenced suppliers are never hard-deleted. Activation is separate authority from editing.

The directory and detail pages support official name, multiple supplier classifications, address/country, phone/email, tax reference, payment terms, notes and activation. Contacts have independent identities, optional position/contact details, activation and a controlled main-contact choice. Catalog associations uniquely connect a supplier and item, retaining supplier reference/description, purchase unit, known minimum order, verified lead time, reported availability and verification date. Supplier reports do not establish AMBS stock. Reports without a verification date, or older than 30 calendar days, are marked stale/unverified. This is a documented initial freshness rule, not a claim of live supplier integration.

Supplier detail exposes contacts/catalog and, according to permissions, quotation history, purchase history and outstanding production work. Classification describes recorded capabilities; Operations must verify the actual route/service agreement before ordering. No real supplier, rate, contact, availability or lead time is seeded.

## Quotations and comparison

Quotation headers retain supplier reference, quoted/valid dates, currency, known freight/tax/fee amounts, reported lead time, notes, attachment metadata and a superseded-version link. Lines distinguish stock items from non-stock services and store description, unit, quantity and price. Drafts can be version-checked and edited. Issue makes their commercial history immutable; new price versions create new headers/lines and supersede the earlier issued quote. Historical dates/prices remain available. Cancellation is limited to drafts. Cancelled draft versions retain their history without occupying the single published-successor identity; a new draft can still reference the issued predecessor. A partial unique index and locked issuing enforce one published successor.

Price history can be filtered by supplier/item through the API. The comparison screen requires an explicit item, purchase unit, currency and requested quantity. Ranking is calculated only when supplier/quote are active/effective, validity and price are known, quoted quantity matches exactly, unit/currency agree, minimum-order evidence is compatible, and known single-line landed charges can be included. The landed amount is quantity × quoted unit price + recorded freight + tax amount + fees. A multi-line quote with shared charges is not ranked because no allocation rule has been approved. Missing data, expiry, incompatible units/currencies or unverified quantity bands produce **Not Comparable** with reasons. No FX, automatic unit conversion, reliability score or automatic PO award is invented.

Quoted lead time and supplier-reported availability are displayed as evidence, not a guarantee. Operations makes the purchasing decision. Historical performance scoring is not introduced without an approved method and sufficient genuine observations. A quote does not confirm a supplier obligation or establish physical stock.

Attachment handling is metadata only: approved document name/reference and optional SHA256. No remote URL is fetched and no arbitrary uploaded executable/file is served. Physical document storage integration remains a separate reviewed extension.

## Import preparation

`POST /api/purchasing/import-preview` is a write-free dry run. It reports missing/source-key duplicates, normalized-name candidates and existing source mappings. `purchasing_import_keys` reserves unique source-system/resource/source-key identities for later approved import tooling. No Odoo connection or obsolete supplier-sheet import is performed. Full historical import remains Phase 9 and requires identity review, a reconciliation report and separate authorization.
