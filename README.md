# Karnataka RTO Agent & Multi-Showroom Document Management System

A multi-showroom RTO documentation, vehicle compliance, and application tracking workspace built with React, TypeScript, Tailwind CSS, **Supabase** (Auth, PostgreSQL + RLS, Realtime, Storage), ExcelJS, and jsPDF.

## Core Architecture

- **Multi-Showroom Management**: Maintain 2–3+ partner showrooms with independent RTO work queues, branch codes, jurisdictions, and deletion safety checks.
- **Centralized Common Client & Vehicle Registry**: One shared client database across all showrooms with automatic duplicate detection (by Mobile, Aadhaar, or PAN) so returning clients across different showrooms are linked cleanly without duplication.
- **Showroom-Wise RTO Work Management**: Supports 13 Karnataka RTO work categories, 8 workflow statuses, date-range filters, and an immutable `rto_application_history` audit trail.
- **Document Vault & Checklists**: Real Supabase Storage uploads (`PDF`, `JPG`, `JPEG`, `PNG` up to 10 MB in the `rto-documents` bucket), in-app preview modal, file replacement, signed URL download, and configurable required document checklists per RTO work category.
- **Exports & Cloud Sync**: Formatted Excel workbooks (`.xlsx`), PDF acknowledgements & compliance reports, VBA macro module (`.bas`), and Google Sheets live sync.

## Local Development

```bash
npm install
npm run dev
```

The dev server listens on port `3000` (`http://localhost:3000`).

## Verification Commands

```bash
npx --yes tsx --test src/utils/pureCalculations.test.ts
npm run lint
npm run build
```

## Supabase Setup (PostgreSQL, Auth & Storage)

1. Create a Supabase project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard and execute the full script in `supabase/schema.sql`. This creates:
   - Tables (`rto_showrooms`, `rto_clients`, `rto_vehicles`, `rto_applications`, `rto_documents`, `rto_application_history`, `rto_archive`, `rto_settings`)
   - Strict Row-Level Security (`auth.uid() = owner_uid`) on every table
   - Private `rto-documents` Storage bucket (10 MB limit, PDF/JPG/PNG) with authenticated folder-level RLS policies
   - Realtime publication on all workspace tables
3. In **Authentication → Providers**, ensure **Email** (and optionally **Google**) is enabled, and add your app URL under **Authentication → URL Configuration → Redirect URLs**.
4. Set environment variables in `.env` (or AI Studio Secrets):
   ```env
   VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-public-key"
   ```

## Deploying to Vercel

1. Connect the repository in Vercel (`vercel.json` handles SPA routing via `/index.html`).
2. Build Command: `npm run build` · Output Directory: `dist`.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel Project Settings → Environment Variables, and add your Vercel URL to Supabase **Authentication → URL Configuration → Redirect URLs**.
