# Session Checkpoint: gas1

## Domain & Infrastructure
- Domain `almohit.site` at Namecheap → nginx + certbot → `localhost:5000`.
- SSL via Let's Encrypt, auto-renews.
- Backend runs as systemd service (`almohit.service`).
- Admin login: `admin@gas.com` / `salami2026`.
- "Al Mohit" = المحيط = "The Ocean" in Arabic.

## Tech Stack
- **Backend**: Node.js, Express, Prisma (SQLite), PDFKit 0.15.2, ExcelJS, Gemini AI
- **Frontend**: React, Vite, Tailwind CSS (darkMode: 'class'), shadcn/ui, GSAP + @gsap/react
- **Deployment**: nginx reverse proxy, systemd service

## Gemini AI
- Model: `gemini-3.1-flash-lite`, 11 API keys with auto-fallback rotation (429/403, 60s cooldown)
- maxOutputTokens: 8192
- Prompt: "count first, then extract" strategy for multi-receipt
- Regex fallback parser when JSON.parse fails
- SCAN endpoint returns `{ message, results: [{ receipt, autoFiled }] }` (array always)
- Schema: `fuelType String?` on Revenue and Receipt; `date String?` on Receipt

## Data
- 723 historical revenue records imported from PDFs (Aug–Oct 2025), total 330,322.59 MAD
- Currency labels: `MAD / DH` throughout (changed from `MAD`)

## Key Files
- `/home/ubuntu/gas/backend/.env`: `GEMINI_MODEL=gemini-3.1-flash-lite`
- `/home/ubuntu/gas/backend/src/services/gemini.js`: multi-receipt prompt, regex fallback, fuelType + date
- `/home/ubuntu/gas/backend/src/routes/receipts.js`: scan/scan-bulk, default currency
- `/home/ubuntu/gas/backend/src/services/export.js`: Excel/PDF generation, per-vendor sheets
- `/home/ubuntu/gas/backend/prisma/schema.prisma`: Receipt.fuelType, Revenue.fuelType, Receipt.date
- `/home/ubuntu/gas/frontend/src/components/AlMohitLogo.jsx`: wave-mark SVG (3 flowing strokes, amber→emerald)
- `/home/ubuntu/gas/frontend/src/pages/Login.jsx`: split-screen, GSAP animations
- `/home/ubuntu/gas/frontend/src/context/ThemeContext.jsx`: dark/light toggle w/ localStorage
- `/home/ubuntu/gas/frontend/src/context/LanguageContext.jsx`: en/fr/ar with `MAD / DH`

## UI State
- Dark mode implemented across all pages (Dashboard, Financials, Workers, SoldGas, ReviewQueue, Login, Layout, ExportModal, ReceiptScanner, ui/*)
- Dark mode selects: `color-scheme: dark`, `bg-slate-800`, `text-white`
- Login: split-screen (60% brand panel / 40% glass form card), GSAP entrance animations
- SoldGas: shadcn Carousel (embla), 21st.dev Dropzone, progress bar

## PDF Export
- No `bufferPages: true` (was causing blank trailing pages)
- `pageAdded` event for page numbering (saves/restores doc.y)
- doc.y capped with `Math.min(y + 30, doc.page.height - 100)` at section ends

## Git
- Last commit: `ad877e8` - fix PDF blank trailing pages
- Tag: `gas1`
- Remote: `origin` → `https://github.com/abbasidi0095-dot/gas-station.git`
