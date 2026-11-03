# Engineering Knowledge OS

One learning loop connects a problem-first lesson, independent recall prompts and an architecture decision. The Staff Backend Engineer curriculum supplies six collection IDs: dsa, system-design, distributed-internals, production, leadership and mock-interviews. Idempotency belongs to distributed-internals and also appears in the payment-processing case study, a production incident exercise and the mock interview bank. Collections can share content.

## Canonical model

The shipped concept JSON and TypeScript contract illustrate the model. A catalog envelope carries a schema version. Concepts have stable IDs, a content revision, title, collection memberships, source references, ordered lesson stages, typed links, review cards and Atlas applications. Every child has a stable ID. Lessons use plain-text blocks initially. The planned block union adds code with language, diagram with text equivalent, incident, exercise and rubric. A citation can point to a handbook section, chapter anchor or external URL.

A card references a concept and the precise lesson stage it tests. It owns a prompt, expected answer, category and answer revision. An Atlas application references a case study and owns component nodes, directed interactions and selectable fault scenarios with outcomes. Node details can reference lesson stages. Use typed relationships such as requires, mitigates, implemented-by and applied-in. Derive reverse links from forward edges. Enforce unique IDs, valid edge endpoints and acyclic requires edges on publish. Unpublished targets appear as plain labels. Keep review state separate, keyed by learner, card ID and answer revision. Copy edits preserve scheduling. A materially different answer starts a fresh schedule.

## Worked example

A client sends POST /payments for ₹1,200. The response disappears after the ledger commit. Ask the learner to predict the effect of retrying. A blind retry can write twice. A lookup followed by a write can race under concurrency. Have the client generate one opaque key per payment intent and retain it across retries.

Authenticate each attempt. Scope the key to the tenant and operation, and fingerprint canonical business inputs such as amount, currency and order ID. In a Spring service, use a database transaction with a unique constraint on (tenant, operation, key). Claim using an insert with conflict handling. A winner commits the ledger change and recorded result together. A loser reads the committed record, compares the fingerprint and either replays the result or returns a conflict. A rolled-back claim leaves no committed effect. For this design, concurrent retries may wait for the transaction within a bounded deadline.

A provider call crosses the transaction boundary. Persist the intent and outbox atomically, call the provider with a stable provider key, and reconcile an ambiguous result using a provider lookup or verified event before deciding whether to retry. An outbox can redeliver. Design the receiver for duplicates. An unknown provider result without dedupe or lookup requires reconciliation rather than an automatic second charge.

Choose retention from the longest supported retry or redelivery window and account for privacy and storage costs. A retry after expiry can be treated as new unless a separate durable business constraint prevents it. Track replay rate, payload mismatches, duplicate business effects, and unresolved provider outcomes. Correlate logs with internal intent IDs and redact payment details.

Tools include PostgreSQL unique constraints and INSERT ON CONFLICT for local arbitration, Spring transaction management for the local boundary, and the Stripe idempotency contract as an example of provider-specific replay and retention. See https://www.postgresql.org/docs/current/sql-insert.html and https://docs.stripe.com/api/idempotent_requests.

Staff interview follow-up: “The provider committed, the worker died before saving the result, and the key is near expiry. What do you do?” Score the answer on identifying the unknown outcome, using stable identity to reconcile, understanding provider retention, and explaining the operational recovery path.

## Mac and mobile

Mac gets persistent Learn / Review / Atlas navigation, a reading column and room for a side inspector. Mobile uses the same URLs and content order with stacked sections, large controls and no hover dependency. Reveal answers explicitly. Atlas scenarios show an ordered textual flow that works on a small screen and with assistive technology. An installed PWA should reopen the last route. Progress for this slice belongs to the current browser and origin.

## Existing HTML chapters

Import later through a read-only batch command. Inventory chapter files and assets, identify the chapter body using explicit per-export selectors, and parse HTML with a real parser. Map headings, paragraphs, code, tables, diagrams and exercises to typed blocks. Preserve relative asset relationships and original path, anchor, hash and extractor version. Allowlist safe elements and URL schemes, strip scripts and handlers, and flag missing assets or unclear heading mappings. Write staging JSON and a dry-run report. Match reimports by stable source ID and anchor mapping, preserve editorial overlays and require review for changed or removed blocks. Extract candidate concepts, cards and Atlas relationships as drafts. Publish only after human review, schema validation and a broken-link check. No HTML chapter corpus was identified for testing this pipeline.

## Original Idempotency slice acceptance

- One complete Idempotency lesson starts with a prediction before the solution and links to review and Atlas.
- Three independent review prompts reveal their answers on demand. Again schedules 10 minutes, Good advances through 1, 3, 7, 14 and 30 days. A refresh preserves the browser's schedule.
- Payment Atlas exposes nominal, concurrent retry and lost response scenarios. Selecting a component shows its role and selecting a scenario updates the trace.
- The same layout works at 360 px and desktop width with keyboard-accessible controls. After a successful online visit, a production build can reopen and review offline. Installability is checked on target devices over HTTPS or localhost.
- The backend serves the canonical concept and the built PWA on one origin. Accounts, sync, HTML import automation, general graph exploration and a real payment backend are later work.

## System design library expansion

The six-topic catalog builds on the Idempotency slice. Each topic has a stable ID and shareable Learn, Review and Atlas routes. The review schedule remains scoped by concept, card and answer revision. The PWA caches the full catalog through a single endpoint. HTML import and cross-device sync remain future work.
