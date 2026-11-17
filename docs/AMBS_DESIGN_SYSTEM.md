# AMBS design system — Phase 6C

AMBS is an operational workspace: red establishes the brand, charcoal anchors navigation and amber marks selection. Data stays on opaque white surfaces. There are no stock photographs, fake charts, notification counters or inactive search controls.

## Source of truth

`frontend/app/tokens.css` owns the palette, type scale, spacing scale, radii, shadows, glass, focus, motion and stacking layers. `globals.css` retains the established component contracts; `premium.css` applies the shared presentation. All hexadecimal colors live in tokens. Existing `--green` references are compatibility aliases for the brand; success has independent semantic tokens.

| Token | Value / purpose |
| --- | --- |
| brand | #CC0605, primary actions and identity |
| amber | #F7A600, selection accents with dark surrounding text |
| charcoal | #161B24, navigation and strong contrast |
| surface | #FFFFFF, operational tables and forms |
| paper | #F4F5F7, workspace background |
| success / warning / danger | Independent text and background pairs; never inferred solely from brand red |
| typography | Locally served Inter 400/500/600; controlled responsive headings |
| radii | 8px controls, 14px panels, 20px dialogs |
| motion | 180ms interaction, 260ms entrance; 1,400ms numeric easing |

## Components and behavior

- `Icon`: local, consistently sized SVG paths; decorative icons are hidden from assistive technology. No icon or motion dependency was added.
- `StatusBadge`: retains the original database value, presents underscores as spaces, and pairs an icon with a readable text label. Unknown statuses receive neutral treatment rather than an invented meaning.
- `CountUp`: decimal strings and BigInt fixed-point interpolation; precision never passes through floating-point conversion. A hidden final-size slot reserves layout space; screen readers receive the true value once. IntersectionObserver runs the animation once per mounted value. Explicit refresh remounts the new snapshot and animates it once. Scrolling does not restart it. Reduced motion shows final values without counting.
- Tables: opaque surfaces, compact readable rows, subtle hover, labeled status, numeric alignment, contained scrolling and complete references. A 640px minimum table width (960px for routing history) prevents mobile data from collapsing into vertical character fragments. The positioned scroll container also contains absolute screen-reader labels, preventing them from extending the page width behind an open dialog. No operational columns are removed on small screens. Sort and pagination remain the existing supported API operations.
- Forms: persistent labels, native required/invalid feedback, existing API field errors, visible busy/disabled states and existing confirmations. Password handling is unchanged.
- Dialogs: native modal focus containment, Escape handling, focus restoration, sticky headings and contained long forms. Critical operations keep their existing confirmations and idempotency behavior.

## Responsive and accessibility guidance

CountUp covers the main operational dashboard and the existing inventory, purchasing and production headline count cards. Detailed table quantities, timestamps, IDs and financial breakdowns remain static. An unavailable source field is labeled Unavailable rather than guessed as zero.

Desktop sidebar can collapse to icons with accessible link titles. Below 901px it becomes a drawer with initial focus, Tab containment, inert background and Escape/return focus. Keyboard users have a skip link and visible focus. Controls retain a minimum 44px touch height. Long identifiers wrap; large decimal quantities wrap without losing digits. Dense tables scroll inside their container.

Blur is limited to navigation-adjacent top bars and dialog overlays. Tables do not use blur. Reduced-motion CSS disables decorative transitions and skeleton animation; JavaScript also stops numeric animation. No animation delays submission or hides errors.

Verify changes at 1920, 1440, 1366, 1024, 768, 390 and 360px, with keyboard focus, enlarged text and reduced motion. This is an engineering accessibility baseline, not a third-party WCAG certification.
