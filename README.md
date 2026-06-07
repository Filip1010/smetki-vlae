# Сметки

Personal utility bill tracker for multiple properties. Automatically imports bills from Gmail, syncs data to Google Sheets, and provides analytics dashboards — all without a backend.

---

## Features

- **Google Sign-In** — authentication via Google OAuth; no separate account needed
- **Gmail import** — scans labeled Gmail threads and parses bill amounts for EVN, Виртус Елиас, Водовод, and А1
- **Google Sheets sync** — real-time bidirectional sync; data persists in your own spreadsheet
- **Multi-property** — switch between Влае and Ресен; each property has its own sheet tab and bill categories
- **Dashboard** — KPI cards, monthly trend chart, category breakdown, year-over-year comparison
- **Analytics** — per-category trend lines, running totals, monthly detail table
- **Bill management** — manual add/edit/delete, paid/unpaid status, filter and search
- **Offline-first** — all data stored in `localStorage`; works without internet after initial load
- **Responsive** — works on desktop, tablet, and mobile

---

## Tech stack

| Layer | Library |
|---|---|
| UI | React 18 + TypeScript |
| Build | Vite 5 |
| Routing | React Router 7 |
| Charts | Recharts 3 |
| PDF parsing | pdfjs-dist 6 |
| Styles | CSS Modules |
| Auth / API | Google Identity Services (GSI) |
| Sync | Google Sheets REST API v4 |
| Mail | Gmail REST API v1 |
| Tests | Vitest 2 |

---

## Prerequisites

- Node.js 18+
- A Google Cloud project with the following APIs enabled:
  - Google Sheets API
  - Gmail API
- An OAuth 2.0 Web Client ID from Google Cloud Console

---

## Google Cloud setup

1. Go to [Google Cloud Console](https://console.cloud.google.com) and create or select a project.
2. Navigate to **APIs & Services → Library** and enable:
   - **Google Sheets API**
   - **Gmail API**
3. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**.
4. Set **Application type** to **Web application**.
5. Under **Authorized JavaScript origins** add:
   - `http://localhost:5173` (local dev)
   - Your production domain (e.g. `https://smetki.vercel.app`)
6. Copy the generated **Client ID**.

---

## Environment variables

Create a `.env` file in the project root:

```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

> The variable must be prefixed with `VITE_` to be exposed to the browser by Vite.

---

## Gmail labels

The importer looks for specific Gmail labels. Create them in Gmail and apply them to bill emails:

| Label | Property | Provider |
|---|---|---|
| `EVN - smetki` | Влае | EVN electricity |
| `Smetki Virtus` | Влае | Виртус Елиас (maintenance) |
| `Vodovod` | Влае | Водовод (water) |
| `A1` | Ресен | А1 (mobile/internet) |

---

## Google Sheets setup

The app writes to a spreadsheet automatically on first connect. You need to:

1. Create a blank Google Spreadsheet.
2. Copy the Spreadsheet ID from its URL:
   `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit`
3. Paste the ID in **Поставки → Google Sheets ID** inside the app.

The app creates two tabs automatically: **Сметки Влае** and **Сметки Ресен**.

---

## Local development

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`.

---

## Build

```bash
npm run build
```

Output goes to `dist/`. Preview the production build:

```bash
npm run preview
```

---

## Deployment

### Vercel

1. Import the repository in [Vercel](https://vercel.com).
2. Set the environment variable `VITE_GOOGLE_CLIENT_ID` in **Project → Settings → Environment Variables**.
3. Add your Vercel domain to **Authorized JavaScript origins** in Google Cloud Console.
4. Deploy — `vercel.json` handles SPA routing automatically.

### Netlify

1. Connect the repository in [Netlify](https://netlify.com).
2. Set `VITE_GOOGLE_CLIENT_ID` in **Site → Environment variables**.
3. Add your Netlify domain to Google Cloud Console.
4. Deploy — `public/_redirects` handles SPA routing automatically.

---

## Project structure

```
src/
  context/          # React contexts (Bills, Settings, GoogleSheets)
  components/       # Layout, BillTable, BillForm, GmailSync, charts
  pages/            # DashboardPage, BillsPage, AnalyticsPage, SettingsPage, LoginPage
  hooks/            # useFetchBills, useFilters, useHouse
  lib/
    gmail.ts        # Gmail REST API client
    parsers/        # Per-provider bill parsers (evn, virtus, vodovod, a1)
    billMerger.ts   # Deduplication and merge logic
  services/
    googleSheets.ts # Sheets read/write, merge, dedup
  data/
    houses.ts       # Property definitions (Влае, Ресен)
  utils/            # Formatters, calculations
  types/            # TypeScript interfaces
```

---

## Data storage

| Key | Contents |
|---|---|
| `smetki-vlae-bills` | Bill records for Влае |
| `smetki-resen-bills` | Bill records for Ресен |
| `gmail-processed-ids` | Processed Gmail message IDs (dedup) |

All data lives in `localStorage`. Google Sheets is a backup/sync layer — the app works without it.

---

## Tests

```bash
npm test
```

Parsers have unit tests covering amount extraction for each provider.

---

## License

Private — personal use only.
