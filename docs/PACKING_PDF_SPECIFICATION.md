# Packing PDF specification

Server-side ReportLab 4.5.1 renders A4 documents using bundled embedded Vera fonts, red #CC0605, amber #F7A600, charcoal and white. No remote resources or executable template expressions are used. User text is XML-escaped before Paragraph rendering.

The header identifies AMBS, document kind, reference, revision, preparation/issue timestamp and employee. Metadata includes customer, project, contact, LPO, order, delivery, warehouse, destination, assigned driver, actual dispatch time and preparation actor where recorded. Unknown values say Not recorded. Times are labeled UTC.

Official rows show item identity, snapshot description, variant, unit, actual dispatched quantity, lot/serial reference when established, and picture. Draft rows show planned/picked/loaded/dispatched independently and are labeled DRAFT - PREPARATION COPY - NOT DISPATCHED. Actual dispatch is zero until posting. A separately labeled remaining-demand section is reference only.

LongTable repeats table headings and keeps critical rows together. Margins are 36pt horizontally, 54pt top and 52pt bottom, with document reference and page number in the footer. Long text wraps. Receiver and driver signature/date areas are blank; arrival does not imply customer acceptance. There are no VAT, invoice, pricing or fabricated signature fields.

Images are loaded only from validated protected storage keys after hash verification. Symlinks, files over 5 MiB, multi-frame images and images over 16 million pixels are rejected. A decoded, metadata-free proportional PNG thumbnail of at most 160x120 pixels is saved in the issued snapshot; the PDF fits it within 60x58pt. Missing/corrupt images have an explicit Picture unavailable state. No user filename or arbitrary URL is accepted.

Limits: 200 delivery rows, 4 MB encoded snapshot thumbnails and 10 MiB final PDF; BFF and backend bound request bodies. Rendering is in memory, so no confidential PDF temporary files need cleanup. Oversized workloads fail rather than truncate quantities. Downloads use application/pdf, a server-generated safe attachment filename, private no-store behavior, nosniff and integrity/source/document status headers.

Representative normal, missing-image, preparation and multi-page synthetic documents are extracted with pypdf and rendered for visual review in ignored artifacts/phase7. Owner workbook layout matching, Arabic shaping/bilingual legal stationery, signature capture and any specialized packaging or numbering rules require separate owner-approved specifications. No missing reference worksheet is claimed to have been reproduced.
