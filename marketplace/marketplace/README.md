# Marketplace – multi-vendor, multi-sale starter

Node.js + Express + PostgreSQL backend, static HTML/JS frontend (no build step).
Sale formats: fixed price, auctions, flash sales, bulk tiers, coupons.

## Setup
1. Install Node 18+ and PostgreSQL 14+.
2. `createdb marketplace && psql marketplace -f database/schema.sql`
3. `cd backend && cp .env.example .env` (edit DATABASE_URL, JWT_SECRET)
4. `npm install && npm start`
5. Open http://localhost:3000 (frontend is served by the backend).
6. Create an admin: register normally, then
   `psql marketplace -c "update users set role='admin' where email='you@example.com'"`

## Main flows
- Buyer: register, browse/filter, add to cart, checkout (orders split per seller), confirm delivery (releases escrow).
- Seller: register as seller, create store, add products (fixed/auction/flash/bulk), ship orders, view sales.
- Admin: approve sellers and products, set commission, view reports.
- Auction: bid > current price + increment; `closeAuctions` job closes ended auctions.

## Deploy
- Render/Railway/Fly: set `DATABASE_URL`, `JWT_SECRET`, `PORT`; start command `npm start`; run schema.sql once.
- Put the app behind HTTPS and a CDN; store uploaded images in S3-compatible storage.

## Supabase product catalog and client accounts
The static Cameroon catalog and the buyer/seller/admin account portal use Supabase separately from the original Express/PostgreSQL checkout API.

1. Create a Supabase project.
2. Run `database/supabase_marketplace.sql` in that project's SQL Editor. It creates catalog/profile tables, seeds illustrative Cameroon product listings with integer XAF prices, and enables row-level security.
3. Copy the Supabase project URL and public anon/publishable key into `frontend/supabase-config.js`. The anon key is intended for browser use; never use a `service_role` key in frontend code.
4. Serve the `frontend/` folder over HTTP(S), then open `services.html` to browse products or `admin.html` to register and sign in.
5. To grant administrator access, register and confirm the account, then run this in the Supabase SQL Editor using that account's exact email:
   `update public.marketplace_profiles set role = 'admin' where id = (select id from auth.users where email = 'admin@example.com');`

Public registration only creates buyer or seller profiles. Sellers submit products for review; the RLS policies only allow administrators to approve/reject listings. Buyers can browse and create accounts. The seeded products are illustrative previews, not verified offers or live inventory. Supabase login does not authenticate the legacy Express checkout API; that backend still uses its own users table and JWT until it is migrated separately.

### Orders, payment instructions, email, and delivery tracking
1. Re-run the updated SQL file to create the order, seller payout-method, and shipment tables and checkout RPC.
2. Deploy the `track-order` Edge Function with JWT verification disabled as configured in `supabase/config.toml`. Tracking is public only by a randomly generated, 128-bit tracking code; the endpoint returns shipment progress and seller-shared location, not buyer contact/address data.
3. Deploy `order-notification` with normal JWT verification. Configure Edge Function secrets outside the repository: `RESEND_API_KEY`, `ORDER_EMAIL_FROM`, `COMPANY_EMAIL`, and `SITE_URL`. Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions. Never place the service-role key in the browser or source files.
4. Sellers enter their own MTN Mobile Money, Orange Money, and/or bank payout details in their account. Buyers choose a payment method and provide only their delivery/contact details. Seller payout data is private; an authenticated database RPC copies the selected instructions into the order after validating the listing and stock.
5. Orders are manual direct transfers, not an integrated mobile-money/bank gateway. An order is marked payment-pending until its seller verifies the transfer and explicitly confirms receipt. Only then is the receipt email sent. Configure and deploy a real payment provider/webhook before treating checkout as automatic payment.
6. Sellers may post shipment status and an optional GPS point from their account. The buyer's tracking page shows the most recently shared point on a map; it is not continuous GPS surveillance or independently verified carrier tracking. The seller must have browser location permission and use the site over HTTPS to share GPS.

Pages: `frontend/services.html` (products), `frontend/checkout.html`, `frontend/payment-received.html`, `frontend/track.html`, and `frontend/admin.html` (buyer/seller/admin account).

## TODO for production
Real payment provider (Stripe / mobile money webhooks), email/SMS/push, real-time chat
(Socket.IO; `messages` table is ready), 2FA for sellers, i18n/currency conversion, tests, rate limiting.
