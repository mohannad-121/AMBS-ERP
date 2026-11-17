# External custody and stock ownership

EXTERNAL is a dedicated location kind with an explicit supplier foreign key and warehouse ownership scope. It is not quarantine, damaged stock, an invented address or a supplier's own warehouse inventory. Locations are registered from verified facts; none are seeded. EXTERNAL requires a supplier and no parent location. Existing internal location kinds remain unchanged. Custodian/warehouse identities cannot be reassigned; register a new location for a genuine ownership change. Nonempty custody or active plans prevent archival.

| Business state | AMBS on-hand | Dispatch available |
| --- | --- | --- |
| Draft PO, planned output, supplier-reported availability | No | No |
| Supplier-owned fabrication/coating progress | No | No |
| Newly acquired stock posted to AMBS external custody | Yes | No |
| AMBS-owned material at an external supplier | Yes | No |
| Owned material transferred from supplier to yard USABLE | Same company total | Yes, subject to activation/lot/holds |
| Newly acquired goods actually received at yard | Increases once | Only usable/unblocked/unreserved quantity |
| Quarantined/damaged/rejected received goods | Yes when accepted as AMBS-owned | No |

Owned external balances use the Phase 4 stock ledger/cache. Purchase receipt and custody transfer kinds are private business integration kinds, excluded from the public arbitrary movement schema. Ordinary available-item selectors exclude EXTERNAL. The inventory API separately exposes external_on_hand; quality totals no longer misclassify external custody as damage/quarantine. On-hand warehouse scope includes its owned off-site stock; the location kind and dispatch availability make that distinction explicit.

Each active owned stage's current custody is a derived claim on the exact item/location/lot. The shared inventory transaction gate serializes claim changes with physical posting. Claims cannot exceed actual unallocated stock; outgoing negative effects cannot leave less stock than remaining claims. Supplier-to-supplier and yard transfer events reduce source claims and add destination claims in the same transaction as their ledger movement. Retries reuse the original key and cannot duplicate quantities. A supplier-owned stage has no AMBS balance row until genuine acquisition.

Owned yard return is a CUSTODY_TRANSFER, not a second PURCHASE_RECEIPT. Newly acquired supplier-owned yard goods use PURCHASE_RECEIPT with a linked PO line. Planned incoming and in-production metrics may refer to the same future goods and must not be added together. Units and ownership are displayed separately; no expected quantity becomes allocatable automatically.

Direct updates through DBeaver, unlinked reversals and hidden negative count corrections are not a custody-reconciliation process. Review the originating production reference and physical evidence before correcting discrepancies. Do not automatically fabricate loss/yield or financial-credit rules.
