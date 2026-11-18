# BOM versioning and approval

A `bom_versions` record defines one existing finished/assembly item, its variant identity through the item master, output quantity/unit, effective dates, engineering reference, preparer, reason and revision lineage. `bom_components` contains existing item/unit identities, positive quantities and optional explicitly entered percentage allowance. No real AMBS ratios, allowances, conversions or sample BOM records are seeded.

Lifecycle: DRAFT -> PENDING_APPROVAL -> APPROVED -> SUPERSEDED/ARCHIVED. Drafts may also be archived. Submitted definitions cannot be edited; a changed definition requires a new draft revision. A draft edit uses an optimistic version number. Approval requires bom.approve, explicit specification confirmation and an auditable reason. Only SUPER_ADMIN and MANAGEMENT receive this permission by default; Operations may prepare and submit definitions.

Approval rejects future/expired effective dates, inactive items/units, mismatched units, empty/duplicate/self components and quantities inconsistent with unit precision. Activation supersedes the previous approved version in the same serialized transaction. A partial unique index permits only one APPROVED version per item. Date applicability is rechecked when calculating a plan. A future definition stays pending until separately approved on or after its effective date.

The existing master-data identity guard also rejects changes to item unit/family/variant identity and unit precision once referenced by a submitted or historical BOM, including component items. Normal descriptive name corrections remain possible; issued documents and material snapshots keep their original content.

PostgreSQL triggers protect submitted content, revision identity and approval evidence and prevent historical deletion. Component insert/update/delete requires a DRAFT parent. Old approved specifications remain attached to historical material snapshots even when later superseded or archived. Permissions and audit events supply the approval actor and reason; approval is never inferred from an owner spreadsheet example.

BOMs are single-level quantity-per-output definitions. A component that itself has a BOM is treated as a stocked subassembly; it is not recursively expanded. Therefore no nested dependency graph or recursive cycles are supported. A finished item cannot directly include itself. Specialized kit consumption and engineering expressions are outside this phase.
