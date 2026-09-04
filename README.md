# 🏎️ CarX Street // Cyberpunk Control Hub

A high-octane, gamer-themed web interface for CarX Street profile management and boosting, featuring:
- **Cyberpunk HUD**: Neon glow effects, scanlines, glassmorphism, interactive particle grid, and sci-fi Web Audio synthesizer.
- **Access Key System**: Seamlessly integrated with `keys_db.json` (supporting One-Time, 1-Day, 30-Day, Lifetime, and Master keys like `MINGFU` / `DADDYMINGFU`).
- **Account Modes**:
  - **Login & Edit Mode**: Connects directly to CarX Online servers and syncs your live garage/profile.
  - **Blueprint Register Mode**: Creates a brand new account and pre-injects the maximum blueprint data.
- **Boost Arsenal**:
  - **God Mode Overdrive**: Single-click all-in-one boost (Maps, Max Currency, Street Pass, Elite flags).
  - **Currency Overclock**: Preset Max (50M Silver, 9,999 Gold, 999k XP), Medium, or custom values.
  - **World Map & Real Estate**: Unlocks all 6 regions and all 50+ luxury apartments with unlocked car slots.
  - **Vehicle Implanter**: Splicing full vehicle rosters, random 10, batch 50, or custom vehicle counts.
  - **Street Pass Override**: Verifies purchase bypass with CarX servers, maxes BP points to 1,000,000, and enables permanent premium timers.
- **Admin Key Manager**: Built-in visual portal to generate keys, inspect active licenses, revoke access, and clear claimed keys.

---

## 🚀 How to Run Locally

1. Open your terminal in the `web` folder:
   ```bash
   cd web
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the app:
   ```bash
   python app.py
   ```
   Or with uvicorn:
   ```bash
   uvicorn app:app --host 0.0.0.0 --port 8000 --reload
   ```
4. Open your browser at `http://localhost:8000`.

---

## 🌐 How to Host on Render (Free & Fast)

### Option 1: Automatic Blueprint (Easiest)
1. Push your repository to **GitHub** or **GitLab**.
2. Go to your [Render Dashboard](https://dashboard.render.com).
3. Click **New +** -> **Blueprint**.
4. Connect your repo. Render will automatically detect `render.yaml` and configure everything with zero effort!

### Option 2: Manual Web Service
1. Click **New +** -> **Web Service**.
2. Connect your GitHub repository.
3. In the setup settings:
   - **Root Directory**: `web` (or leave blank if repository root is the web folder)
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app:app --host 0.0.0.0 --port $PORT`
4. Click **Deploy Web Service**!
Render will automatically assign you a live HTTPS link (e.g., `https://carx-cyber-hub.onrender.com`).

---

## 🔒 Database Safety
- All license keys and user records are stored in `keys_db.json`.
- The database uses atomic writes and automatic `.bak` backups before modifying records.
- Existing database keys and users are **never overwritten or wiped**.
