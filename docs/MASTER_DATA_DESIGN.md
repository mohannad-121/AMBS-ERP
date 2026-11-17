# Business master data design — Phase 3

## Boundaries

Customers, projects, customer-issued LPO references, product categories, units, families, variant items and approved item images are implemented. No inventory balance, stock movement, purchasing workflow, order, dispatch, driver or packing calculation is implemented. No company data is seeded. Operations owns master-data maintenance; security administration remains separate.

## Entities and integrity

| Table | Identity and relationships |
| --- | --- |
| customers | UUID, immutable unique CUS code, official and normalized names, contact/address/country/TRN, notes, activation, UTC timestamps, creator |
| projects | UUID, PRJ code, required customer FK, site/contact/status, UTC timestamps, creator; `(id,customer_id)` candidate key |
| customer_lpos | UUID, LPO code, issuing customer FK, optional composite `(project_id,customer_id)` FK to projects, number/date/status/reference metadata |
| product_categories | UUID, CAT code, name, optional parent FK, activation, creator/timestamps; database trigger and service checks prevent ancestry cycles |
| units | UUID, UOM code, descriptive name, 0–6 decimal places, activation, creator/timestamps; no conversion factors |
| product_families | UUID, FAM code, description, normalized JSON attribute definitions with approved values, activation, creator/timestamps |
| items | UUID, ITM code, name/type, category and unit FKs, optional family FK, normalized attributes/signature, description/colour/dimensions/design, decimal weight, activation, creator/timestamps |
| item_images | UUID, one current image per item FK, immutable generated storage key, MIME/size/dimensions/SHA-256, creator, UTC replacement timestamp |
| legacy_references | Unique `(source_system,entity_type,source_key)`; exactly one customer/project/LPO/item FK; reserved for later reviewed imports |

Every master code consists of its resource prefix and 32 UUID hex characters. PostgreSQL unique constraints are the final collision guard; generation requires neither row counting nor a shared sequence. Codes are not editable via input schemas. They are stable technical identifiers, not invoice/document numbers. Weight uses `NUMERIC(14,6)`. Future inventory quantities should use reviewed decimal precision, never JavaScript floating point as ledger truth.

Foreign keys use RESTRICT to protect business identities. There are no hard-delete API routes. Archival retains references and never cascades to children. Archived parents cannot be newly assigned; existing associations can be retained and historical records remain viewable. Existing child activation is not automatically changed when a parent is archived. Project status is active/completed/archived; LPO status is active/closed/cancelled. Reactivating an archived project returns it to active.

Project reassignment requires `projects.update`, and is rejected when any linked LPO exists. The composite FK independently prevents mismatched LPO/customer/project relationships, including direct SQL. LPO numbers are normalized and unique within the issuing customer, including closed/cancelled records. Different customers can use the same number. This conservative issuer-wide scope requires business confirmation if an issuer genuinely reuses numbers across projects.

## Customer identity and duplicates

NFKC normalization, case folding and collapsed whitespace create a searchable comparison name. Equal normalized names are not a unique key: distinct legal entities can share a name. The API returns `409 POSSIBLE_DUPLICATE` unless the operator explicitly acknowledges the match and supplies a 10–300-character reason. The form lists matching records for review in another tab and retains entered values. Matching never merges records. Names with genuinely different spellings require human review during import; fuzzy matching is not treated as evidence of identity. TRN, when supplied, must contain exactly 15 digits; the system does not claim to verify a VAT registration with authorities.

## Families and independent variants

A variant is an item with its own UUID and immutable ITM code, linked to a family. Future BOMs, stock and orders reference this item UUID directly. There is no second, duplicative SKU record. Every configured family attribute is required; unknown keys and unapproved values are rejected. Both keys and values normalize consistently. A SHA-256 of canonical sorted attributes is unique within the family. Archival does not release the combination for duplicate creation. A family with no attributes has one default variant.

Family definitions describe approved values, not approved Cartesian combinations. No combination is automatically created. An authorized operator explicitly creates each approved item. Changes to family definitions are rejected if they invalidate any existing item, including archived items. Colour/design/length attributes must agree with corresponding item descriptors. Adding a family to an item, editing attributes and changing references are validated transactionally.

## HTTP contract

All business URLs are under `/api/master`. Inputs use Pydantic with unknown keys rejected; errors list safe field names/rules without echoing input values. Existing JSON transport, Origin checks, CSRF tokens, revocable sessions and backend permissions apply.

For each resource `customers`, `projects`, `lpos`, `items`, `categories`, `units`, `families`:

| Method and route | Behavior |
| --- | --- |
| GET `/{resource}` | Search, pagination (default 20/max 100), activation, relevant filters, allowlisted sorting |
| GET `/{resource}/{uuid}` | Detail; item detail includes safe image metadata |
| POST `/{resource}` | Validated creation, HTTP 201 |
| PUT `/{resource}/{uuid}` | Full validated business-field replacement; identity/code/creator/activation excluded |
| PATCH `/{resource}/{uuid}/activation` | Archive/reactivate; not used for LPOs, whose status is changed through PUT |
| GET `/customers/duplicates?name=…` | Up to 20 normalized-name candidates |
| PUT `/items/{uuid}/image` | Authenticated JSON upload with `mime_type` and `content_base64` |
| GET `/items/{uuid}/image` | Authenticated approved-file retrieval requiring items.read |

Filters: `page`, `page_size`, `search`, `active`; `sort=name|code|created_at|updated_at`, `direction=asc|desc`. Projects/LPOs accept `customer_id` and status; LPOs accept `project_id`; items accept `category_id`, `family_id`, `item_type`, and an `attribute_key`/`attribute_value` pair. Unrelated filters are rejected. Linked detail sections use these paginated endpoints under their own read permissions. Reference lookup controls use server search and explicitly prompt for refinement beyond 100 matches.

## Authorization and audit consistency

See PERMISSIONS.md for the matrix. Read handlers use the existing session dependency and commit activity timestamps. Business writes inherit the existing advisory transaction lock, so authorization changes and writes serialize safely across workers. Business mutation and its safe audit event commit atomically. Constraint conflicts roll back both. Denials use the existing separate safe audit transaction. Audit metadata contains changed field names, not names, contacts, notes, image bytes, duplicate reasons, passwords or session data. Existing immutable audit viewer exposes business events through action filters.

Project status changes to archived require archive permission even when submitted through PUT. Categories/units/families use separate manage permissions; their definitions are readable by items.read for catalog consumers. No role receives security powers from business access.

## Item image storage

Pillow 13.0.0 is hash-locked for actual decoding/verification. PNG, JPEG and WebP only; signature must match declared MIME and decoded format. Maximum input and re-encoded size: 5 MiB; maximum 16 million pixels; single-frame only. Decoder verification and re-encoding strip untrusted metadata/trailing data. Request streams are bounded before JSON parsing (7,000,000 bytes for image JSON; 16 KiB otherwise), both at the BFF and direct backend.

Files reside in backend `/data/item-images`, attached to the `ambs-erp_ambs_item_images` named Docker volume. Metadata alone resides in PostgreSQL. Generated UUID filenames never include a user-supplied filename. Resolved paths must stay within storage. Retrieval is private, no-store, nosniff, and uses the detected approved MIME. A new file is written and fsynced before database commit. Failed transactions remove their newly written file. Replacement preserves the image UUID and switches current metadata atomically. Previous immutable files remain for concurrent readers and crash-safe recovery. Retention/cleanup of superseded or crash-orphaned files is an explicit future maintenance task; never prune by filename without reconciling metadata and backups.

Back up PostgreSQL and the image volume together, encrypt/off-host according to company policy, and rehearse restores before production. Recreating a container retains the volume. Test services use a separate anonymous image volume and temporary database; they never seed the development database or image volume.

## Future BOM / packing architecture

A later approved design should introduce a versioned rule header referencing parent item UUID, rule kind, version, approval/actor history and effective dates. Its component rows reference component item UUID, exact decimal quantity/unit and a reviewed formula identifier where appropriate. Customer/project overrides reference that approved version, explicit scope, reason, effective dates and approval history. Preserve immutable applied versions for reproducible PDFs and historical orders. Special handling for Windlock, Assembly Aid and Corner Net belongs in approved rules, not invented constants. All supplied STD/MAXI workbook templates must be cataloged and reviewed before deriving rules. No numeric formula, component relationship or conversion is seeded in Phase 3.
