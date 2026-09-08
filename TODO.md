# TODO

Store dashboard on next-forge, migrated to Supabase + Clerk + Cloudinary.
Priorities first, then the traps worth knowing, then what is already done.

---

## Priority 1 — Production URLs before any real invite

`NEXT_PUBLIC_APP_URL` is still `http://localhost:3000`, and invitation links are
built from it. Right now an invited admin receives a link that only opens on
your machine. Before inviting anyone for real:

- Point `NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_WEB_URL` at the deployed domains.
- Add those domains to the Clerk instance's `allowed_origins` (currently
  `http://localhost:3000` and `http://localhost:3001`).

Cheap to do, and everything invitation-related stays broken for other people
until it is done.

## Priority 2 — Categories admin UI

Products cannot be created without a category, and there is no screen for
categories. Today they must be inserted by hand in Prisma Studio, which makes
the product form unusable on a fresh install.

## Priority 3 — Smaller items

- Uploading an image then abandoning the form leaves an orphan until the
  nightly cron sweeps it. Making uploads transactional (temp folder, promoted
  on save) would close the gap properly.
- `order_items` has no unique constraint on `(order_id, product_id)`, so the
  same product can appear twice in one order.
- `categories` has no `updated_at` column or trigger; `products` and `orders`
  both have one.
- `CLERK_WEBHOOK_SECRET` is empty, so `apps/api/app/webhooks/auth/route.ts` is
  not wired up.
- `SVIX_TOKEN` is empty, so `/webhooks` shows a "not configured" placeholder.
  `webhooks.send()` has no callers yet either.
- Stripe CLI is not installed, so payment webhooks are untested end to end.
  `apps/api` skips webhook forwarding instead of failing.
- No tests cover the admin server actions.
- Once images are consistently served from Cloudinary, switch the storefront
  hero back to `next/image`; it uses a plain `<img>` because an admin can paste
  any hostname and `next/image` only accepts hosts in `remotePatterns`.

## Priority 4 — Decide what happens to `profiles`

The table holds one row keyed to a Supabase `auth.users` id that Clerk will
never match, so it is orphaned. Either drop it along with `is_admin()` and
`is_root()`, or keep it deliberately if a storefront path will one day read
Supabase directly with the anon key. Leaving it undecided is the only real
cost.

---

## Traps worth knowing before you touch anything

**Prisma bypasses row level security.** The connection uses the `postgres`
role, which has `BYPASSRLS`. Every policy in the database is inert on this
path, so authorization lives in application code. Call `requireAdmin()` or
`requireRoot()` from `@repo/auth/roles` in every server action and route
handler that touches store data.

**`is_admin()` is dead.** It resolves `auth.uid()` from a Supabase Auth JWT,
and Clerk never issues one, so any policy depending on it never passes. The
policies that still work are the ones that do not call it:
`public reads categories` and `public reads available products`.

**Customers never sign in.** `clerkMiddleware` in `apps/web/proxy.ts` does not
call `protect()`. Keep it that way. Only `apps/app` requires an account.

**Order status is enforced by a database trigger**, not by the UI:
`pending -> confirmed|cancelled`, `confirmed -> ready|cancelled`,
`ready -> completed|cancelled`. `order_number`, `customer_name`,
`customer_phone` and all three money columns are frozen after creation.

**Never invite from the Clerk Dashboard.** Those invitations carry no role and
point at Clerk's Account Portal. Use /system/users, which flags such
invitations and offers "Fix & resend".

**Do not run `prisma migrate dev`.** The database has tables, policies and
triggers Prisma did not create and cannot see, so it reports drift and offers
to reset. Write SQL migrations by hand and apply with `prisma migrate deploy`.

**Clerk components cannot be hydrated directly.** They attach to the DOM
imperatively, so they render nothing during SSR. Gating on `ClerkLoaded` is not
enough either, because Clerk may already be loaded when React hydrates. Defer
on a `mounted` state instead - see `app/(authenticated)/components/user-menu.tsx`.

## Running the project

- `bun install` - the repo is Bun-based. `bunfig.toml` pins the hoisted linker
  because Next copies `pg` out of `node_modules` and Bun's default isolated
  symlink layout breaks that.
- `bun run dev` - all apps. Prisma Studio is on port 3005.
- `bun run db:pull` in `packages/database` - re-introspects Supabase and strips
  the ~23 Supabase-internal `auth` models. Use instead of `prisma db pull`.
- Arcjet blocks plain `curl`. Pass a browser User-Agent when testing locally.

---

## Done

### ~~Install and dev server~~

React pins bumped to 19.2.8 (`react-dom` peers `react ^19.2.8`), package manager
switched to Bun, `mintlify` declared in `apps/docs`, empty `BETTERSTACK_URL`
removed, `packages/cms` dev task deleted, Prisma config loads `.env` relative to
itself so `prisma studio` works, Stripe CLI made optional.

### ~~Supabase~~

Prisma adapter swapped from Neon to `pg`, `DIRECT_URL` added for migrations,
existing schema introspected rather than pushed, `0_init` baselined so Prisma
never offers to reset. The 23 Supabase-internal `auth` models are stripped by
`bun run db:pull`.

### ~~Admin dashboard~~

CRUD for products, orders (status transitions only offer legal moves), banners
and coupons. Every change is written to `audit_logs`.

### ~~Single tenant~~

Clerk Organizations removed: no `orgId` gate, no organization switcher, user
lookups go through `users.getUserList()`. Liveblocks rooms use a single
`WORKSPACE_ID`.

### ~~Roles and access~~

Role lives in Clerk `publicMetadata.role`. The dashboard rejects anyone without
one. Root is never grantable from the UI - the server actions only ever write
`role: "admin"` or `role: null`, and refuse to touch an account that is already
root. Set root by hand in Clerk (Users -> Public metadata).

### ~~Invitations~~

`/system/users` invites, revokes, grants admin and removes access. Invitations
set `publicMetadata.role` and are sent with `notify: false`, because Clerk's own
email points at the Account Portal - on a development instance the domain's
`development_origin` is empty and cannot be set through the Backend API. The
ticket is lifted out of Clerk's URL and rebuilt as
`<APP_URL>/sign-up?__clerk_ticket=<ticket>`. The link is shown with a copy
button and emailed through Resend.

`RESEND_FROM` accepts both a bare address and `Name <address>`;
`packages/email/keys.ts` validates the address part of either. A bare
`z.email()` there rejects the display-name form and stops the app booting.

### ~~BaseHub removed~~

`packages/cms` deleted. Legal pages live in `site_settings` under
`legal.<slug>`, and the blog was dropped rather than migrated. `apps/web` needs
`DATABASE_URL` and `DIRECT_URL`.

The hero is a full-bleed carousel (`(home)/components/hero-carousel.tsx`) whose
slides are every active, in-window banner ordered by `sort_order` - so the
number of slides is admin-controlled, not hardcoded. Slides cross-fade rather
than translate, so slide count never affects layout. With no banners published
it falls back to the dictionary copy. Headings use Playfair Display, scoped to
`apps/web` because the dashboard has no use for it.

### ~~Storefront catalogue and checkout~~

`/products` (with category filter), `/products/[id]`, and `/cart`. The cart is
localStorage via `apps/web/lib/cart.tsx`, read only after mount so SSR and the
first client render agree.

Checkout is server-side in `apps/web/app/actions/checkout.ts`. The browser only
ever sends product ids and quantities - every price is read from the database,
so a tampered cart cannot change what is charged. `getQuote()` prices the cart
and resolves the coupon; `placeOrder()` re-prices and re-validates before
writing, because a coupon can expire between quote and submit.

Coupon redemption is atomic: `updateMany` only matches while the usage limit
still has room, so two shoppers cannot both take the last redemption. Money is
`Prisma.Decimal` throughout, never float.

Unavailable or deleted products are rejected rather than silently dropped, so
the customer never sees a total that quietly changed.

After the order is written, the customer is handed off to WhatsApp: the server
builds a wa.me link containing the order number, itemised lines, totals and
customer details, and the confirmation screen redirects there after two seconds
with a button as fallback. The order is already saved before any of that, so a
blocked redirect never loses a sale. With no number configured the screen just
shows the order number instead.

The header lost its Sign up button: accounts come from invitations, not open
registration. Its `/blog` link went too - that page died with BaseHub.

### ~~Site settings~~

`/settings` in the dashboard edits everything in `site_settings`: store name,
WhatsApp number, and the privacy/terms pages. All writes happen in one
transaction so a partial save cannot leave the storefront half-updated.

Queries live in `packages/database/settings.ts` because both apps read them.
The store name replaced the hardcoded "next-forge" and "Acme Inc" everywhere,
including page titles - `createMetadata` now takes `applicationName` as a
parameter so `@repo/seo` stays generic, and `apps/web/lib/metadata.ts` supplies
the store name.

Still hardcoded in `packages/seo/metadata.ts`: author, publisher and Twitter
handle all say Vercel.

### ~~Storefront sections~~

The next-forge marketing sections (cases, features, stats, testimonials, CTA)
were deleted along with their dictionary entries in all six locales - leaving
the keys would have shipped dead copy to the browser in the RSC payload, since
the header client component receives the whole dictionary.

FAQ entries moved to a `faqs` table, managed at /faqs in the dashboard. The
heading and CTA still come from the dictionary; only the questions moved. The
storefront section hides itself when nothing is published.

Homepage is now: hero carousel, new arrivals, featured collection, FAQ.

### ~~Cloudinary uploads~~

Product and banner forms upload images instead of taking a pasted URL, via a
signed direct upload authorized by `requireAdmin()`. Image bytes never pass
through the Next.js server and no public upload preset exists. Pasting a URL
still works and is the fallback when Cloudinary is unset.

Orphans are cleaned up on delete and on replace, and a nightly cron at
`apps/api/app/cron/cleanup-images/route.ts` (03:00) sweeps the rest. It fails
closed if either read throws, keeps assets younger than 24 hours, caps at 100
deletions per run, only looks inside `CLOUDINARY_UPLOAD_FOLDER`, and requires
`CRON_SECRET`. Covered by `packages/storage/__tests__/`.
