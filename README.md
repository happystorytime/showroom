# Karnataka RTO Agent & Multi-Showroom Document Management System

A multi-showroom RTO documentation, vehicle compliance, and application tracking workspace built with React, TypeScript, Tailwind CSS, Firebase (Auth, Firestore, Storage), ExcelJS, and jsPDF.

## Core Architecture

- **Multi-Showroom Management**: Maintain 2–3+ partner showrooms with independent RTO work queues, branch codes, jurisdictions, and deletion safety checks.
- **Centralized Common Client & Vehicle Registry**: One shared client database across all showrooms with automatic duplicate detection (by Mobile, Aadhaar, or PAN) so returning clients across different showrooms are linked cleanly without duplication.
- **Showroom-Wise RTO Work Management**: Supports 13 Karnataka RTO work categories, 8 workflow statuses, date-range filters, and an immutable `applicationHistory` audit trail.
- **Document Vault & Checklists**: Real Firebase Storage uploads (`PDF`, `JPG`, `JPEG`, `PNG` up to 10 MB), in-app preview modal, file replacement, download, and configurable required document checklists per RTO work category.
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
npx --yes tsx --test firestore.rules.test.ts
npx eslint firestore.rules
npm run lint
npm run build
```

## Firebase Setup (Auth, Firestore & Storage)

1. Configure your Firebase project credentials in `firebase-applet-config.json`.
2. In the **Firebase Console**, enable:
   - **Authentication** → Google Sign-In provider.
   - **Cloud Firestore** → Database matching `firestoreDatabaseId` in `firebase-applet-config.json`.
   - **Firebase Storage** → Activate the storage bucket (`storageBucket` in `firebase-applet-config.json`).
3. Deploy Firestore and Storage security rules:
   ```bash
   firebase deploy --only firestore:rules,storage
   ```
4. If browser downloads or PDF previews on Firebase Storage require cross-origin headers, apply CORS to your bucket using `gsutil cors set cors.json gs://<YOUR_BUCKET>`.

## Deploying to Vercel

1. Connect the repository in Vercel (`vercel.json` handles SPA routing via `/index.html`).
2. Build Command: `npm run build` · Output Directory: `dist`.
3. Add your Vercel deployment domain under **Firebase Console → Authentication → Settings → Authorized domains**.
