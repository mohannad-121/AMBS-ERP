# Inventory permissions

Migration 0004_inventory reuses inventory.read and adds 18 permissions, preserving prior permission UUIDs/grants. Multi-role users receive the union; effective permissions come from PostgreSQL on each request.

| Permissions | SUPER_ADMIN | OPERATIONS | SALES | ACCOUNTS | PACKING | MANAGEMENT | DRIVER |
| --- | --- | --- | --- | --- | --- | --- | --- |
| inventory.read | Yes | Yes | Yes | Yes | Yes | Yes | No |
| inventory.costs.read | Yes | Yes | No | Yes | No | Yes | No |
| inventory.receipts.create / post | Yes | Yes | No | No | No | No | No |
| inventory.issues.create / post | Yes | Yes | No | No | No | No | No |
| inventory.transfers.create / post | Yes | Yes | No | No | No | No | No |
| inventory.reservations.create / release / consume | Yes | Yes | No | No | No | No | No |
| inventory.counts.create / post | Yes | Yes | No | No | No | No | No |
| inventory.adjustments.post | Yes | Yes | No | No | No | No | No |
| inventory.locations.manage | Yes | Yes | No | No | No | No | No |
| inventory.thresholds.manage | Yes | Yes | No | No | No | No | No |
| inventory.lots.manage | Yes | Yes | No | No | No | No | No |
| inventory.quality.manage | Yes | Yes | No | No | No | No | No |
| inventory.movements.reverse | Yes | Yes | No | No | No | No | No |

Count posting additionally requires adjustments.post. Consumption additionally requires issues.post. Quality movements additionally require quality.manage; lot blocking requires lots.manage and quality.manage. Draft cancellation/edit uses the movement kind's create authority; adjustments use adjustments.post. All reads require inventory.read, including cost readers. The earlier reserved inventory.adjust permission remains reserved/unassigned.

Inventory authority does not grant security administration. Operations cannot read security audits or manage users without separate existing permissions. API enforcement is independent of navigation/buttons. CSRF, Origin, JSON restrictions, session revocation and audit integrity remain unchanged. Costs are recursively removed from unauthorized detail, balance, trace and overview responses. Configuration assumptions require business sign-off before live use.
