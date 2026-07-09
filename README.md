# Al Mohit Gas Station — Operations & Financial Suite

A full-stack, mobile-responsive web application for managing daily gas station operations, logistics, and dual-ledger finances (operating expenses and sales revenue), powered by a smart AI auto-classification pipeline using Gemini's Multimodal Vision OCR.

**Multilingual:** English / Français / العربية (with full RTL support)

---

## Quick Start Guide

### Prerequisites
- **Node.js** (v18.x or later recommended)
- **NPM** (v9.x or later)

### Installation

1. **Install Backend Dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Install Frontend Dependencies:**
   ```bash
   cd ../frontend
   npm install
   ```

---

## Environment Configurations

Create a `.env` file inside the `backend/` folder:

```ini
# Local SQLite database location
DATABASE_URL="file:./dev.db"

# Session JWT secret
JWT_SECRET="gas_station_extremely_secure_jwt_secret_token_987654"

# Google Gemini / Vertex AI credentials (for live vision scanning)
GEMINI_API_KEY="your_api_key_here"

# Express server listening port
PORT=5000
```

---

## Database Setup & Seeding

This app uses **Prisma ORM** with **SQLite**.

```bash
cd backend
npx prisma db push
npm run prisma:seed
```

The clean seed creates:
- Two standard vendors: **Al Mohit** and **Afriquia**
- One administrator account: `admin@gas.com` / `password123`
- **No mock transaction data** — you start with a pristine, empty ledger

---

## Running the Application

### 1. Start the Backend API Server (Port 5000)
```bash
cd backend
npm run dev
```

### 2. Start the Frontend Client (Port 3002)
```bash
cd frontend
npm run dev
```

Open `http://localhost:3002` in your browser.

---

## Credentials

**Administrator** (`admin@gas.com` / `password123`)
- Full platform access: manage staff roster, edit/override ledger entries, resolve low-confidence scan reconciliations, compile/download custom Excel spreadsheets and PDF statements.
- This is the sole login — no worker accounts.

---

## Features

### Multilingual Support (EN / FR / AR)
Switch languages instantly via the sidebar language selector. Arabic activates full RTL layout.

### Smart Receipt Scanning (Scan-to-Data-Entry)
1. Tap **Smart Scan** → capture or upload a receipt image
2. Gemini 2.5 Flash OCR extracts: **vendor**, **amount**, **date**, **confidence**
3. A split-pane verification form appears — review the receipt image alongside pre-populated fields
4. Edit any field (vendor, amount, date, category, notes), then click **Confirm & File** to instantly write to the ledger

### Operating Charges Categories
Track expenses across: Fuel Purchase, Workers Salary, Water & Electricity, Cleaning Products, Rent, Maintenance, and Other.

### Dashboard
- Summary cards (revenue / spend / net profit) with Week / Month / Year views
- Revenue vs. Expense trend chart
- Per-vendor spend breakdown card with progress bars
- Revenue & expense category distribution pies
- Recent transactions table

### Export (PDF & Excel)
- Filter by vendor, category, and date range (week / month / year / custom)
- Excel: Dashboard Summary + Revenue Ledger + Expenses Ledger + **per-vendor sheets**
- PDF: Clean executive statement with tables

---

## Adding a Third Vendor to Gemini Auto-Classification

1. Create the vendor in the database:
   ```bash
   npx prisma studio
   ```

2. Update the prompt in `backend/src/services/gemini.js` inside `scanReceiptWithGemini()`:
   ```javascript
   "vendor": "Al Mohit" | "Afriquia" | "Shell" | "unknown",
   ```

The backend uses normalized matching (case/spacing insensitive), so "Al Mohit", "AL-MOHIT", and "almohit" all match correctly.
