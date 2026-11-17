# Stock movement rules

| Kind | Physical effect and permitted route |
| --- | --- |
| RECEIPT | External → USABLE; received quantities establish stock only on posting |
| RETURN | External → QUARANTINE; verification is required before allocation |
| ISSUE | Source → external; ordinary source must be usable; quality authority required for nonusable disposal |
| TRANSFER | USABLE → USABLE; company quantity unchanged |
| ADJUSTMENT_IN / ADJUSTMENT_OUT | Reasoned authorized positive/negative correction, subject to stock and tracking constraints |
| DAMAGE | USABLE → DAMAGED; unavailable after posting |
| QUARANTINE_TRANSFER | Source → QUARANTINE/REJECTED, with quality authority |
| INSPECTION_RELEASE | Nonusable → USABLE, with quality authority |
| REVERSAL | Engine-generated exact compensating effects linked to original |
| COUNT_ADJUSTMENT | Engine-generated physical-count variance |

All quantities are positive line quantities in the item's unit. Source effects are negative, destination effects positive. Both effects of a transfer commit together. Different item/lot/unit identities cannot be substituted. Lines must have a source, destination or both, and source cannot equal destination. Every write has an identified authenticated actor.

Drafts have no physical effect, permit version-checked edits and may be cancelled. Posting requires explicit confirmation and the appropriate permission. Posted/reversed/cancelled history is immutable. Posting supports up to 30 lines in one transaction. Future-dated movements beyond the small clock tolerance are rejected. Retrying an identical post key is idempotent; a different key cannot repost it.

Corrections use linked compensation. Receipt reversal fails if its removal would consume reserved stock or make availability negative; later consumption may require reversing the downstream operation first. Serial duplication and negative known valuation also block reversal. Reversal itself cannot be reversed. Every operation must reconcile to the ledger and active holds.

Location activity/warehouse ownership, item activity, precision, tracking, lot status and availability are enforced by the server. The browser's choices provide assistance and never authorize stock. Preserve historical records and apply reviewed forward migrations for schema corrections.
