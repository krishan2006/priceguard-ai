# 🛡️ PriceGuard AI
### Autonomous AI Price Monitoring & Alert Agent

> A complete, production-ready AI agent that autonomously monitors product prices, evaluates conditions using Google Gemini reasoning, and sends intelligent alerts — built for college competition demonstration.

---

## 🎯 Project Overview

PriceGuard AI is a **real autonomous AI agent** (not just a CRUD app) that:

- Periodically searches for product prices using DummyJSON or Serper API
- Uses **Google Gemini** for intelligent conditional reasoning
- Implements **anti-duplicate alert logic** with state machine transitions
- Maintains full **price history** with Recharts visualization
- Sends **in-app, browser, and email notifications**
- Features a **Demo Mode** with simulated price progression for competition demos

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 AI Reasoning | Google Gemini evaluates conditions with deterministic fallback |
| 📊 Price Charts | Recharts area charts with target price reference lines |
| 🔔 Smart Alerts | Anti-duplicate state machine: NOT_TRIGGERED → ALERT_SENT → WAITING |
| ⏱️ APScheduler | Autonomous background monitoring every 1-60 minutes |
| 🎮 Demo Mode | Simulated price drop for competition demonstration |
| 📱 Browser Push | Web Notifications API for real browser alerts |
| 📧 Email | Optional SMTP email notifications |
| 🔍 Product Search | DummyJSON API (free, no key) + Serper API (optional) |

---

## 🏗️ Architecture

```
USER REQUEST
      ↓
PRODUCT SEARCH (DummyJSON / Serper)
      ↓
PRICE EXTRACTION & NORMALIZATION
      ↓
CONDITION EVALUATION (Programmatic)
      ↓
AI REASONING (Gemini / Deterministic Fallback)
      ↓
DUPLICATE CHECK (State Machine)
      ↓
DECISION: ALERT / NO_ALERT / PRICE_UNCHANGED / SOURCE_UNAVAILABLE
      ↓
SAVE HISTORY → CREATE NOTIFICATION → SEND ALERT
```

### Alert State Machine

```
NOT_TRIGGERED → (condition met) → ALERT_SENT
ALERT_SENT → (condition still met) → WAITING_FOR_STATE_CHANGE [NO DUPLICATE]
WAITING_FOR_STATE_CHANGE → (condition no longer met) → NOT_TRIGGERED
NOT_TRIGGERED → (condition met again) → ALERT_SENT [NEW ALERT]
```

---

## 🛠️ Tech Stack

### Backend
- **Python 3.10+**
- **FastAPI** — REST API framework
- **SQLAlchemy** — ORM with SQLite
- **APScheduler** — Autonomous background scheduling
- **httpx** — Async HTTP client
- **Pydantic** — Data validation

### Frontend
- **React 18** + **TypeScript**
- **Vite** — Build tool
- **Tailwind CSS** — Dark glassmorphism UI
- **Recharts** — Price history charts
- **Lucide React** — Icons
- **React Router** — Navigation

### AI & Data
- **Google Gemini 1.5 Flash** — AI reasoning (free tier)
- **DummyJSON API** — Free demo product data
- **Serper API** — Real Google search prices (optional)

---

## 🔑 API Keys Setup

### Required for AI Reasoning: Gemini API
1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a free API key
3. Add to `backend/.env`: `GEMINI_API_KEY=your_key_here`

> **Note:** The app works perfectly WITHOUT Gemini using deterministic rule-based reasoning.

### Optional: Serper API (Real Prices)
1. Visit [serper.dev](https://serper.dev)
2. Create a free account (100 free searches/month)
3. Add to `backend/.env`: `SERPER_API_KEY=your_key_here`

> **Note:** Without Serper, the app uses DummyJSON demo data — perfect for competition.

### Optional: Email Notifications (SMTP)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your@gmail.com
SMTP_PASSWORD=your_app_password
```

---

## 🚀 Installation & Running

### Prerequisites
- Python 3.10+ → [python.org](https://python.org)
- Node.js 18+ → [nodejs.org](https://nodejs.org)

### Quick Start (Windows)
```bash
# Just double-click start.bat OR:
start.bat
```

### Manual Setup

**Backend:**
```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env
# Edit .env to add your API keys

# Start backend
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend

# Install dependencies
npm install

# Start frontend
npm run dev
```

**Access the app:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## 🎮 Competition Demo Flow (3-5 minutes)

### Step-by-step Judge Presentation

1. **Open Dashboard** → http://localhost:5173
   - Show the dark glassmorphism UI
   - Show "Agent Online" status indicator

2. **Add Monitor** → Click "+ Add Monitor"
   - Search: `iPhone`
   - Select a product from results
   - Condition: `Price Falls Below Target`
   - Target Price: `₹50000` (set above current price)
   - Demo Mode: ON
   - Interval: 1 minute
   - Click **START MONITORING**

3. **Back to Dashboard**
   - Show the monitor card with current price
   - Show alert state: `NOT_TRIGGERED`
   - Show mini price chart

4. **Force a Check**
   - Click **CHECK NOW**
   - Show price found in activity log
   - Show AI reasoning output
   - Show state remains NOT_TRIGGERED (price above target)

5. **Simulate Price Drop**
   - Click **SIMULATE PRICE DROP** button
   - Explain: *"This only changes the simulated data. The autonomous agent will discover the change on the next cycle."*
   - Click **CHECK NOW** immediately
   - Watch the logs update in real-time
   - Show: price found → condition evaluated → AI reasoning → ALERT triggered

6. **Show Alert**
   - Navigate to **Alerts & Notifications**
   - Show the triggered alert card
   - Show: current price, target, change%, AI reason

7. **Anti-Duplicate Demo**
   - Go back to Dashboard, click **CHECK NOW** again
   - Show in logs: "Alert suppressed — duplicate prevention"
   - Show state: `WAITING_FOR_STATE_CHANGE`

8. **Price History**
   - Go to **Agent Activity** page
   - Select the product to see the price graph
   - Show lowest/highest/average price stats
   - Point out red dots marking alert triggers

9. **Explain State Machine**
   - Show the anti-spam logic explanation at the bottom of Activity page

---

## 📁 Project Structure

```
priceguard-ai/
│
├── backend/
│   ├── app/
│   │   ├── main.py              ← FastAPI app + CORS + lifespan
│   │   ├── database.py          ← SQLAlchemy setup
│   │   ├── models.py            ← Database models
│   │   ├── schemas.py           ← Pydantic validation
│   │   ├── scheduler.py         ← APScheduler autonomous jobs
│   │   ├── agent/
│   │   │   ├── agent.py         ← Core agent pipeline (11 tools)
│   │   │   ├── reasoning.py     ← Gemini AI + deterministic fallback
│   │   │   ├── state_manager.py ← Alert state transitions
│   │   │   └── tools/
│   │   │       ├── price_search.py      ← DummyJSON + Serper
│   │   │       ├── price_parser.py      ← Normalization
│   │   │       ├── price_calculator.py  ← Comparisons + duplicate check
│   │   │       └── notification.py      ← In-app + email notifications
│   │   └── routes/
│   │       ├── products.py      ← GET /api/products/search
│   │       ├── monitoring.py    ← CRUD + check/pause/resume
│   │       ├── alerts.py        ← Alerts + notifications
│   │       └── dashboard.py     ← Stats + agent logs + demo
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── types/index.ts       ← TypeScript types
│   │   ├── services/api.ts      ← Axios API layer
│   │   ├── hooks/useMonitoring.ts ← React hooks + polling
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx    ← Main dashboard
│   │   │   ├── AddMonitor.tsx   ← Add monitor form
│   │   │   ├── AlertsPage.tsx   ← Alerts + notifications
│   │   │   └── ActivityLog.tsx  ← Agent log + price charts
│   │   ├── App.tsx              ← Router + sidebar
│   │   └── main.tsx             ← Entry point
│   ├── package.json
│   └── vite.config.ts          ← Proxy to backend
│
├── start.bat                    ← Windows startup script
├── README.md
└── .gitignore
```

---

## 🤖 Why This Is a Real Autonomous AI Agent

This system qualifies as an autonomous AI agent because:

1. **Autonomous Perception** — Independently fetches data from external APIs on a schedule
2. **Tool Use** — 11 distinct tools: `search_product()`, `get_current_price()`, `normalize_price()`, `calculate_discount()`, `compare_price_condition()`, `detect_meaningful_change()`, `check_duplicate_alert()`, `save_price_history()`, `create_notification()`, `send_email_notification()`, `run_monitoring_cycle()`
3. **Reasoning** — Uses Gemini LLM to evaluate context, not just if/else logic
4. **State Management** — Maintains and transitions between agent states
5. **Goal-Directed** — Works toward user-specified goal (target price) autonomously
6. **Self-Correcting** — Falls back to deterministic reasoning if AI fails
7. **Memory** — Maintains price history and previous alert states
8. **Action** — Takes consequential real-world actions (notifications, state updates)

---

## 📸 Screenshots

> Add screenshots here after running the application

- Dashboard with active monitors
- Price history chart with alerts
- AI agent activity log
- Notification center

---

## 📜 License

MIT License — Free for academic and competition use.
