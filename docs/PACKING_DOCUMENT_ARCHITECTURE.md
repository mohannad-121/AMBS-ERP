# Packing document architecture

Phase 7 extends the existing sales delivery engine. Packing and planning never post inventory.

## Source and lifecycle

Preparation copies are authorized, audited PDF previews of DRAFT/PICKED/LOADED deliveries. Planned, verified picked, verified loaded and actually dispatched quantities remain separate. Missing verification is explicit. A preview is not an issued document or dispatch evidence.

Official PACKING_LIST and DELIVERY_ORDER documents require DISPATCHED source status and one posted SalesConsumption record for each dispatched delivery line. Browser input supplies only kind, reason, request key and optional replacement ID. It cannot supply the item list or quantities. Remaining order demand appears separately and is never counted as dispatched.

`packing_documents` stores an immutable JSON snapshot, protected image thumbnails, original PDF bytes, SHA-256, issuer, timestamp, source, revision and predecessor. Downloads verify the hash and return original bytes. Item/customer/image changes cannot rewrite history. `packing_document_events` appends a single VOID or REPLACED terminal event with actor and reason. Reversed source status is displayed separately; the original PDF remains available as historical evidence with a current-status header and printed instruction to consult ERP status. Voiding terminates that document lineage. Use Replace for a corrected active dispatch rather than voiding first. A reversed dispatch cannot issue another official document; correct physical events must establish a new valid source.

References use collision-resistant PL-/DO- plus UUID, following the existing UUID-derived business-reference convention. Failed transactions reserve no sequence numbers. Historical Excel numbers are not imported. Owner approval is required before replacing this convention with a legal or sequential numbering rule.

## Transactions, security and storage

Existing PostgreSQL inventory advisory locking serializes source reads, issuance, replacement and actor-bound idempotency. Same employee/key/body replays the same record. Another actor, operation or body conflicts. Unique delivery/kind/revision and predecessor constraints prevent duplicate revisions. Database triggers prohibit document/history updates and deletions and validate actual dispatch and revision lineage at issue.

Fine permissions distinguish read, company scope, preparation, issue, download and void. Drivers have only current assigned-delivery scope. Authentication, CSRF, Origin validation and BFF cookies remain unchanged. Permission/ownership denials and successful previews, issue/replacement/void and downloads are audited. UUIDs are not authorization.

PDF bytes and bounded thumbnails live in PostgreSQL and are covered by database backups. Original images stay in existing protected storage. No public image URL, private path, environment field or price is returned in the document. The BFF forwards only approved PDF headers. Downloads use a temporary local browser Blob URL and revoke it after consumption; there is no public document hosting.

## Integration

Sales delivery cards, assigned-driver delivery detail and the Packing documents screen provide the same document panel. Item Journey includes authorized read-only document/plan references separately from physical ledger events. Source/master foreign keys use RESTRICT; no historical migration or stock balance is replaced.
