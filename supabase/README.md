# Supabase setup

Jewelst stores shared business records in separate Supabase tables, with foreign keys between related records and child tables for purchase and order items. Design photos are stored in a private Supabase Storage bucket. It does not upload or import the previous browser-local business data; the new shared workspace starts empty.

## 1. Apply the database setup

1. Open the Supabase project used by Jewelst.
2. Open **SQL Editor**, create a new query, and paste the complete contents of [`migrations/20261010160000_shared_business_backend.sql`](./migrations/20261010160000_shared_business_backend.sql).
3. Run the query and confirm it completes successfully.

The migration creates relational tables for the business records and settings, row-level security policies, a transactional change RPC, a private `design-images` bucket, and authenticated storage policies. Record-specific optional fields are retained in each entity's `data` JSONB column; record identities and relationships (such as category, design, variant, customer, and parent line-item references) are stored in typed relational columns.

If you previously applied the earlier single-row `business_state` migration, back up anything in that table first. This migration drops that legacy table and does not transfer its contents because this setup intentionally starts with empty shared data.

## 2. Configure the app

Set these Vite variables in the local `.env` and in the Vercel project's environment variables:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-publishable-or-anon-key
```

The anon/publishable key is intended for browser applications. Never put a Supabase `service_role` or secret key in a `VITE_` variable. After changing Vercel variables, redeploy so Vite rebuilds the client.

## 3. Access and data sharing

All accounts authenticated in this Supabase project can read and change the same Jewelst business data and design images. Anyone able to create or sign in to an account in this project therefore has access to the shared business workspace. Restrict sign-up in **Authentication → Providers → Email** if accounts should only be created by the business owner.

The browser only receives data after a successful Supabase sign-in. The database uses row-level security and the app's change RPC requires an authenticated session.

Staff invitations and role-based permissions are not connected to Supabase yet. The Staff & Access Control screen is currently a demo; invite accounts through **Authentication → Users** in the Supabase dashboard. Every invited account can access the shared workspace, regardless of the role label shown in the app.

## 4. Operational notes

- The database migration intentionally starts with empty records; browser `localStorage` data is not imported.
- Purchases and customer orders are stored in parent tables with separate item tables. The app rebuilds the same nested item arrays when loading data.
- Receipt name, description, address, contact number, and both footer messages can be customized in **Settings → Receipt Header/Footer** and are saved as business settings.
- Design image files are private. The app requests short-lived signed URLs for display and automatically refreshes them while the page remains open. Transient network, rate-limit, and server errors during image uploads are retried up to three times; access, file, and other non-transient errors are shown immediately. Archiving a design keeps its image so it can be restored; permanent deletion removes its image from Storage first, and leaves the design record in place if that cleanup fails.
- Back up the Supabase project regularly. The web app reports load and save failures in the header and keeps local edits available for retry during the current page session.
