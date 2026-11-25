# Lowf — Book & beyond

Vietnamese digital library, ambient audio, reading tools, VNPAY commerce and an owner content studio. Next.js API routes and admin, a lightweight Vanilla JS public reader, Neon Auth/Postgres and private Vercel Blob.

## Run

Use Node 24. Run `npm ci`, link the Vercel project, and pull development environment variables into `.env.local`. Required names: `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (at least 32 random characters), `BLOB_READ_WRITE_TOKEN`, `LOWF_OWNER_EMAIL`. Never commit their values. In proxy-only workspaces prefix Node commands with `NODE_USE_ENV_PROXY=1`.

Initialize the idempotent schemas with `npx tsx scripts/db-init.ts`, `npx tsx scripts/reader-init.ts` and `npx tsx scripts/commerce-init.ts`. Then run `npm run dev`. These migrations do not invent payment credentials or paid orders. Set the deployed application's exact origin in Neon Auth's trusted origins before testing sign-in.

Run `npm run typecheck` and `npm run build`. The prebuild step creates an authenticated owner-only source ZIP, excluding environment files, uploaded assets, database records and credentials. The source archive is not a full data backup.

## Ownership and editing

Create and verify an account using `LOWF_OWNER_EMAIL`. The configured Neon branch uses email OTP: `/?auth=verify` accepts verification codes, and `/?auth=reset-code` accepts password-reset codes and a new password. Existing codes can be entered without requesting replacements. Verification and reset go through Neon; the app never sets email verification flags itself. No default password or first-user admin assignment exists. The `/admin` interface and every admin API require that same verified owner identity.

The owner studio manages books, uploaded covers/PDFs, music, YouTube or uploaded videos, plans, draft/published appearance, payment configuration and fulfillment. Content and appearance changes do not require a deployment. New custom features require source changes and a new deployment. Owner handbook: `/huong-dan.html`.

Published free files use short-lived signed URLs. Draft and member files require access; a paid ebook purchase grants access only after a verified production payment notification. Private Blob uploads use scoped paths, validated type/size and authenticated completion.

## Reader and catalog

Books, media, design versions, progress, annotations and saved vocabulary live in Postgres/Blob. Annotations and vocabulary are scoped to the authenticated reader. Personal PDFs remain in that browser's IndexedDB; saved excerpts/notes are synchronized to the reader's account. Clearing browser data removes local PDF files.

Text and selectable PDFs support highlights, notes and translations. PDF page images need OCR before text selection or speech; page drawing and manual word lookup remain available. Speech uses voices installed or provided by the browser/device, so male/female choices and supported languages vary. No external premium speech service is implied.

Translation sends the selected word or short excerpt (at most 500 characters and 500 UTF-8 bytes) to MyMemory. Single English words first use a bundled MIT-licensed US English IPA dictionary (CMU/ipa-dict, pinned provenance and license in `lib/reader/data`), then DictionaryAPI for missing entries. Missing pronunciation is reported rather than fabricated. Provider availability and quotas apply; this is not automatic whole-book translation.

The 8 Vietnamese sample books are original illustrative content, not commercial editions. Eight full English classics were imported from pinned Standard Ebooks sources with provenance in `public/BOOK-CREDITS.txt`; check the applicable copyright jurisdiction. The 8 piano recordings have attribution in `public/MUSIC-CREDITS.txt`. The `seed-music` and `import-foreign-books` scripts are operations imports referencing external local manifests; normal builds do not run them.

Old mock accounts, XP and memberships are never trusted. Community messages require verified email. Reading seconds are bounded by server heartbeat timing and one active session per account.

## VNPAY

In `/admin?tab=payments`, enter merchant credentials directly. HashSecret is write-only, encrypted at rest with a domain-separated key derived from the auth cookie secret. Keep that root secret backed up securely; replacing it without migrating ciphertext makes existing payment secrets unreadable.

Sandbox permits only an authenticated owner test order of 10,000 VND. It never grants paid books or membership and does not open customer checkout. Configure the displayed IPN and return URLs with VNPAY. A browser return is never proof of payment: only a valid, merchant-bound, amount-checked HMAC notification can confirm an order. Atomic database transitions prevent duplicate notifications from extending membership twice.

Production checkout requires production merchant credentials, enabled sale items/plans and `VERCEL_ENV=production`. Prices, shipping fee and order snapshots are computed on the server. Book purchases and membership terms are granted once from a verified IPN. Membership purchases are fixed terms, not automatic recurring charges. Refunds are handled with the merchant's payment provider; the current admin manages fulfillment but does not initiate refunds or manually mark an order paid.

This deployment no longer depends on Shopify or WordPress for commerce or design editing. An optional read-only editorial feed may use the existing WordPress public API; no WordPress hosting upgrade or new WordPress changes are required.

## Tests and deployment

`node --test tests/commerce-vnpay.test.mjs tests/commerce-database.test.mjs tests/backend-assets.test.mjs` checks payment signatures, actual SQL transitions in an isolated PGlite database and private asset handling. Reader tests run with `node --import tsx --test tests/reader-storage.test.ts tests/reader-translation.test.ts tests/reader-pronunciation.test.ts`. These unit/integration tests do not send real payments.

`BASE_URL=http://localhost:3000 node tests/http-qa.mjs` checks public access and origin protection. The opt-in `tests/auth-flow.mjs` requires Playwright and real development services; it creates a reserved-domain temporary account and deletes that exact account and its app data afterward.

The linked project is `lowf-library`. Deploy with the Vercel CLI after configuring environment variables. The public origin is `https://lowf-library.vercel.app`; changing it also requires updating `APP_ORIGIN` in `lib/commerce/config.ts`, merchant callback URLs and auth trusted origins. Deployments build the Next.js server and static reader together. A Git remote/automatic CI is not included unless separately configured.

## Preview and private owner workspace

Stable Preview: `https://lowf-library-preview.vercel.app`. Production: `https://lowf-library.vercel.app`. Vercel authentication protects Preview; sign into the Vercel account that owns the project, then sign into Lowf using the existing verified owner account. Lowf authentication is shared, while catalog edits, reading records, orders and media in Preview use separate application storage. Preview is seeded only with published publisher content and copied media; customer records and payment credentials are not copied.

On Vercel Preview, the app requires `LOWF_PREVIEW_DATABASE_URL`, `LOWF_PREVIEW_READ_WRITE_TOKEN` and `LOWF_PREVIEW_AUTH_COOKIE_SECRET`; it fails closed if any is missing rather than choosing production storage. The Preview PostgreSQL role cannot read production content. The exact stable Preview origin is registered with Neon Auth. Other random preview URLs are not automatically trusted auth origins.

The owner Studio displays the current environment. Publishing content/design inside Preview changes only Preview. Use the production Studio to apply approved content changes. Code releases use a reviewed commit: deploy Preview, test; then stage a production build with `vercel deploy --prod --skip-domain`, test it and promote that production deployment. Do not assume Preview database writes or media are copied when promoting code.

Within either Studio, **Xem bản nháp trên website** saves design settings and opens `/?designPreview=1`. Only the verified owner can request those draft settings; guests see the published design. **Xuất bản** makes the selected design visible within the current environment.

The `/admin` page is gated on the server, and every admin API also checks the verified owner. Guest pages do not render management links. The handbook moved out of public files to a protected `/huong-dan.html` route. Preview does not initiate VNPAY checkout because protected callback URLs cannot reliably receive gateway IPNs; merchant sandbox and production setup remain in production Studio.
