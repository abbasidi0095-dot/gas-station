# Al Mohit Gas Station — Full Project Memory

## Project Identity
- **Name**: Al Mohit Gas Station (المحيط = "The Ocean")
- **Domain**: almohit.site (Namecheap → nginx + certbot → localhost:5000)
- **Admin Login**: admin@gas.com / salami2026
- **Backend Service**: systemd `almohit.service`

## Tech Stack
- **Backend**: Node.js, Express, Prisma (SQLite), PDFKit 0.15.2, ExcelJS, Gemini AI
- **Frontend**: React, Vite, Tailwind CSS (darkMode: 'class'), shadcn/ui, GSAP + @gsap/react
- **Deployment**: nginx reverse proxy → localhost:5000, Let's Encrypt SSL

---

## Complete Feature History

### 1. Export System (Excel + PDF)
**Bug fixes:**
- Added `include: { vendor: true }` to Revenue query so "Vendor" column appears
- Per-day subtotals with grand total in both Excel and PDF
- Per-vendor revenue sheets in Excel
- No PDF text truncation: used explicit coordinates instead of flow layout
- Al Mohit rows highlighted red in Excel/PDF
- Horizontal rule instead of underline in PDF
- Clean two-line metrics layout (revenue/expenses side by side)

**Root issue with blank PDF pages:**
- `bufferPages: true` + direct `doc.y = y + 30` + `doc.moveDown(1)` let `doc.y` drift past page boundary
- PDFKit auto-created blank pages at `end()` flush
- **Fix**: removed `bufferPages: true`, use `pageAdded` event for footers, cap `doc.y` with `Math.min(y + 30, doc.page.height - 100)`

### 2. Receipt Scanning (Gemini AI)
- Model: `gemini-3.1-flash-lite` (changed from default)
- 11 API keys with auto-fallback rotation on 429/403 errors (60s cooldown)
- `maxOutputTokens: 8192`
- Prompt strategy: "count first, then extract" for multi-receipt images
- Regex fallback parser (`extractFieldsFromRaw`) when JSON.parse fails
- SCAN endpoint always returns array: `{ message, results: [{ receipt, autoFiled }] }`
- `fuelType` + `date` extracted by Gemini, saved to Receipt/Revenue on confirm

### 3. Branding & Design
- **Logo**: Custom SVG wave-mark — 3 flowing strokes (amber→emerald gradient), abstract ocean/fuel-flow
  - `AlMohitLogo` (square mark) and `AlMohitLogoWide` (wordmark lockup)
  - Both in `frontend/src/components/AlMohitLogo.jsx`
- **Login page**: Split-screen redesign — 60% brand panel (dark atmospheric bg) / 40% glass form card
  - GSAP entrance animations: logo scale, card slide-up, staggered inputs, error shake
  - `useGSAP` hook with `gsap.matchMedia` for reduced-motion support

### 4. Currency
- All `MAD` changed to `MAD / DH` across:
  - LanguageContext (en/fr/ar labels)
  - Dashboard, Financials, Workers, ReceiptScanner, ReviewQueue pages
  - Backend export.js (Excel column headers + numFmts + PDF text)
  - gemini.js prompt text
  - receipts.js default currency

### 5. Dark Mode
- `darkMode: 'class'` in tailwind.config.js
- `ThemeContext.jsx` — persists to localStorage, toggles `dark` class on `<html>`
- Sun/Moon toggle button in sidebar
- All pages covered: Dashboard, Financials, Workers, SoldGas, ReviewQueue, Login, Layout, ExportModal, ReceiptScanner
- UI components: button, carousel, dropzone
- CSS: body bg/color via CSS variables, dark scrollbars, 300ms transition
- **Selects/inputs**: `color-scheme: dark` via CSS (fixes native dropdown rendering), `bg-slate-800` background, `text-white` text

### 6. UI Components
- SoldGas page: shadcn Carousel (embla), 21st.dev Dropzone, progress bar, scroll-snap thumbnails, focus rings
- Mobile: sidebar logo `hidden md:flex` (only on desktop, mobile header already has brand)

### 7. Data
- 723 historical revenue records imported from PDFs (Aug–Oct 2025)
- Total: 330,322.59 MAD
- Schema additions: `fuelType String?` on Revenue and Receipt, `date String?` on Receipt

---

## Key File Reference

### Backend
| File | Purpose |
|------|---------|
| `backend/.env` | GEMINI_MODEL=gemini-3.1-flash-lite |
| `backend/src/server.js` | Express server entry |
| `backend/src/routes/receipts.js` | scan/scan-bulk, default currency MAD / DH |
| `backend/src/services/gemini.js` | Multi-receipt prompt, regex fallback, fuelType+date |
| `backend/src/services/export.js` | Excel + PDF generation, per-vendor sheets |
| `backend/prisma/schema.prisma` | Receipt.fuelType, Revenue.fuelType, Receipt.date |

### Frontend
| File | Purpose |
|------|---------|
| `frontend/src/components/AlMohitLogo.jsx` | Wave-mark SVG logo (mark + wide) |
| `frontend/src/components/Layout.jsx` | Sidebar + mobile nav, theme toggle |
| `frontend/src/components/ExportModal.jsx` | Export filter modal |
| `frontend/src/components/ReceiptScanner.jsx` | Scanner component |
| `frontend/src/context/ThemeContext.jsx` | Dark/light toggle w/ localStorage |
| `frontend/src/context/LanguageContext.jsx` | en/fr/ar with MAD / DH |
| `frontend/src/pages/Login.jsx` | Split-screen, GSAP animations |
| `frontend/src/pages/Dashboard.jsx` | Dashboard with charts |
| `frontend/src/pages/Financials.jsx` | Revenue + expenses ledger |
| `frontend/src/pages/Workers.jsx` | Staff management |
| `frontend/src/pages/SoldGas.jsx` | Sold gas receipt approval carousel |
| `frontend/src/pages/ReviewQueue.jsx` | Receipt review queue |
| `frontend/src/index.css` | Dark scrollbars, color-scheme: dark, GSAP reduced-motion |
| `frontend/tailwind.config.js` | darkMode: 'class' |

### Config
| File | Purpose |
|------|---------|
| `/etc/systemd/system/almohit.service` | systemd service |
| `/etc/nginx/sites-available/almohit.site` | nginx config |

---

## Git
- **Remote**: `origin` → `https://github.com/abbasidi0095-dot/gas-station.git`
- **Branch**: `master`
- **Tag**: `gas1` (at commit ad877e8)
- **Last commit (gas1)**: d0a3365 — save session checkpoint gas1
