# Сметки Влае — Monthly Bills Management App

A production-ready React + TypeScript single-page application for managing monthly household bills for **Стан Влае — Кузманоски Филип**.

## Features

- **Dashboard** — KPI cards, monthly trend charts, category breakdown pie chart, year-over-year comparison, highest bill callout, unpaid bills alert
- **Bills** — Full CRUD table with sorting, filtering by year/status/search, pagination (15/page), inline status toggle, slide-in detail panel
- **Analytics** — Category trend lines, top-10 expensive months, running total, category % share, monthly comparison table
- **Settings** — Dark/light theme toggle, Macedonian/English month names, CSV export, data reset
- **Persistence** — All data stored in `localStorage` under `smetki-vlae-bills`

## Tech Stack

| Tool | Version |
|------|---------|
| React | 18 |
| TypeScript | 5 (strict mode) |
| Vite | 5 |
| React Router | 7 |
| Recharts | 3 |
| date-fns | 4 |

## Setup

```bash
npm install
npm run dev       # development server
npm run build     # production build (zero TS errors)
npm run preview   # preview production build
```

## Project Structure

```
src/
  components/
    Layout/         # Sidebar + header shell (collapsible, responsive)
    BillTable/      # Data table with toolbar, sort, pagination
    BillForm/       # Add/Edit modal with live total preview
    BillDetail/     # Slide-in detail side panel
    Dashboard/      # Chart cards and KPI tiles
    StatusBadge/    # Paid/Unpaid pill badge
    ConfirmDialog/  # Delete confirmation modal
    ErrorBoundary/  # React error boundary
  context/
    BillsContext.tsx    # Global bills state (CRUD + localStorage)
    SettingsContext.tsx # Theme + language settings
  hooks/
    useBills.ts     # localStorage CRUD logic
    useFilters.ts   # Filter/search/sort/pagination state
  pages/
    DashboardPage.tsx
    BillsPage.tsx
    AnalyticsPage.tsx
    SettingsPage.tsx
  types/
    bill.ts         # TypeScript interfaces
  data/
    seed.ts         # Pre-loaded historical data (Aug 2023 - May 2026)
  utils/
    formatters.ts   # MKD currency, month names, date labels
    calculations.ts # Totals, averages, category breakdowns
```

## Data

Pre-loaded with 34 months of historical data (August 2023 - May 2026) covering:
- **Виртус Елиас** - building/maintenance fee
- **ЕВН** - electricity
- **Водовод** - water
- **Интернет и ТВ** - fixed 1,150 den./month (from October 2023)

Total historical spend: **153,331 den.**
