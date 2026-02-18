# 📁 Project Structure

## Overview

This is a SvelteKit-based behavioral experiment for researching order bundling decisions. The application is hosted on Vercel with Firebase as the backend database.

---

## 🗂️ Root Directory Structure

```
bundlegame_no_company/
├── 📄 Configuration Files
│   ├── package.json              # Node.js dependencies and scripts
│   ├── svelte.config.js          # SvelteKit configuration (static adapter)
│   ├── vite.config.js            # Vite build tool configuration
│   ├── tailwind.config.js        # Tailwind CSS configuration
│   ├── firebase.json             # Firebase deployment config
│   ├── firestore.rules           # Firebase security rules (DEPLOY THIS)
│   ├── .firebaserc               # Firebase project reference
│   └── .env.example              # Environment variables template
│
├── 📚 Documentation
│   ├── README.md                 # Main project documentation
│   ├── PROJECT_STRUCTURE.md      # This file - explains project organization
│   ├── docs/                     # Additional documentation
│   │   ├── security/             # Security guides and rules
│   │   │   ├── SECURITY_SETUP.md        # Complete security setup guide
│   │   │   ├── SECURITY_EXPLAINED.md    # Detailed security explanations
│   │   │   ├── QUICK_FIX.md             # Emergency security fix (5 min)
│   │   │   └── firestore.rules.strict   # Alternative strict security rules
│   │   └── experiment/           # Experiment design documentation
│   │       ├── EXPERIMENT_DESIGN.md     # Experiment methodology
│   │       ├── experiment_reference.csv # Round-by-round reference
│   │       └── experiment_reference_table.html # Visual reference table
│   └── deploy-security.sh        # Automated security deployment script
│
├── 📂 Source Code (src/)
│   ├── app.html                  # HTML template for SvelteKit
│   ├── app.css                   # Global styles
│   ├── config.json               # Game configuration settings
│   ├── tutorialconfig.json       # Tutorial configuration
│   ├── hooks.server.js           # SvelteKit server hooks
│   │
│   ├── lib/                      # Shared libraries and utilities
│   │   ├── 🔥 Firebase
│   │   │   ├── firebaseConfig.js       # Firebase initialization
│   │   │   └── firebaseDB.js           # Database operations (CRUD)
│   │   │
│   │   ├── 🎮 Game Logic
│   │   │   ├── bundle.js               # Core bundling game logic
│   │   │   ├── tutorial.js             # Tutorial system
│   │   │   └── globalError.js          # Error handling
│   │   │
│   │   ├── 📊 Experiment Data
│   │   │   ├── bundle_experiment_50_rounds_short_times.json  # Main experiment scenarios (50 rounds)
│   │   │   ├── config.js               # Experiment constants (timeouts, penalties)
│   │   │   └── emojis.json             # UI emoji mappings
│   │   │
│   │   ├── 🗺️ Configurations
│   │   │   └── configs/
│   │   │       ├── stores1.json        # Store layouts, distances, items
│   │   │       └── ...                 # Other store configurations
│   │   │
│   │   ├── 🛠️ Scripts
│   │   │   └── scripts/
│   │   │       └── ...                 # Utility scripts
│   │   │
│   │   └── 📚 Tutorial Configs
│   │       └── tutorialconfigs/
│   │           └── ...                 # Tutorial scenarios
│   │
│   └── routes/                   # SvelteKit pages (routes)
│       ├── +page.svelte          # Landing page / authentication
│       ├── home.svelte           # Home page (after login)
│       ├── bundlegame.svelte     # Main game interface
│       ├── tutorial/             # Tutorial page
│       │   └── +page.svelte
│       └── downloader/           # Data export page (password protected)
│           └── +page.svelte
│
├── 📁 Data Analysis
│   └── data analysis/            # Jupyter notebooks for analyzing experiment data
│       ├── fow_driving_game_analysis.ipynb
│       ├── new analysis.ipynb
│       ├── data/                 # Raw data files (gitignored)
│       └── *.csv                 # Analysis outputs
│
├── 🖼️ Static Assets
│   └── static/
│       └── images/               # Game images (items, signs, etc.)
│
└── 🔧 Build & Deploy
    ├── build/                    # Production build output (gitignored)
    ├── .svelte-kit/              # SvelteKit cache (gitignored)
    ├── .vercel/                  # Vercel deployment cache (gitignored)
    └── node_modules/             # NPM dependencies (gitignored)
```

---

## 📂 Detailed File Descriptions

### **Root Configuration Files**

| File | Purpose | When to Edit |
|------|---------|--------------|
| `package.json` | Defines project dependencies and npm scripts | When adding/removing packages |
| `svelte.config.js` | Configures SvelteKit (adapter, prerendering) | Rarely - deployment changes only |
| `vite.config.js` | Build tool configuration | Rarely - performance tuning only |
| `tailwind.config.js` | CSS framework configuration | When customizing styles |
| `firebase.json` | Points to firestore.rules for deployment | Only if changing Firebase structure |
| `firestore.rules` | **CRITICAL** - Database security rules | When updating security model |
| `.firebaserc` | Firebase project ID reference | Only if switching Firebase projects |
| `.env` | **SECRET** - API keys and credentials | When rotating keys or setting up new env |
| `.env.example` | Template for .env file | When adding new environment variables |

### **Documentation Files**

| File | Purpose | Audience |
|------|---------|----------|
| `README.md` | Main documentation - setup, configuration, deployment | All users |
| `PROJECT_STRUCTURE.md` | This file - explains code organization | Developers |
| `docs/security/QUICK_FIX.md` | Emergency security deployment (5 min) | Admin (during security incident) |
| `docs/security/SECURITY_SETUP.md` | Complete security hardening guide | Admin (initial setup) |
| `docs/security/SECURITY_EXPLAINED.md` | Deep dive into vulnerabilities | Technical staff |
| `docs/experiment/EXPERIMENT_DESIGN.md` | Experiment methodology and phases | Researchers |
| `deploy-security.sh` | Automated script to deploy security rules | Admin |

### **Source Code - Core Game Files**

| File | Purpose | Contains |
|------|---------|----------|
| `src/lib/bundle.js` | Core game logic | Order selection, bundling mechanics, action logging |
| `src/lib/tutorial.js` | Tutorial system | Step-by-step game instructions |
| `src/lib/config.js` | Game constants | Penalty timeouts, game settings |

### **Source Code - Firebase**

| File | Purpose | Contains |
|------|---------|----------|
| `src/lib/firebaseConfig.js` | Firebase initialization | Connects to Firebase using env vars |
| `src/lib/firebaseDB.js` | Database operations | All Firestore CRUD operations (createUser, addAction, retrieveData, etc.) |

### **Source Code - Experiment Data**

| File | Purpose | Size |
|------|---------|------|
| `src/lib/bundle_experiment_50_rounds_short_times.json` | **Main experiment data** - 50 rounds across 3 phases | 82 KB |
| `src/lib/configs/stores1.json` | Store layouts, city distances, aisle configurations | - |

### **Source Code - Routes (Pages)**

| Route | File | Purpose |
|-------|------|---------|
| `/` | `routes/+page.svelte` | Landing page with authentication |
| `/home` | `routes/home.svelte` | Post-login home screen |
| `/bundlegame` | `routes/bundlegame.svelte` | **Main game interface** - the core experiment |
| `/tutorial` | `routes/tutorial/+page.svelte` | Interactive tutorial |
| `/downloader` | `routes/downloader/+page.svelte` | **Data export** - password protected |

---

## 🎯 Where to Find Things

### "I want to..."

**...change the experiment rounds/orders:**
→ Edit: `src/lib/bundle_experiment_50_rounds_short_times.json`
→ See: [README.md](README.md) section "Changing Order Structures"

**...adjust round timer:**
→ Edit: `src/routes/bundlegame.svelte` (line ~50, `ROUND_TIME_LIMIT`)

**...change store layouts or city distances:**
→ Edit: `src/lib/configs/stores1.json`

**...modify game UI (buttons, styling):**
→ Edit: `src/routes/bundlegame.svelte` (main game page)

**...secure the Firebase database:**
→ See: [docs/security/QUICK_FIX.md](docs/security/QUICK_FIX.md) (5 min fix)
→ Or: [docs/security/SECURITY_SETUP.md](docs/security/SECURITY_SETUP.md) (complete guide)

**...download experiment data:**
→ Visit: `/downloader` page (enter password)
→ Code: `src/routes/downloader/+page.svelte`

**...understand the experiment design:**
→ Read: [docs/experiment/EXPERIMENT_DESIGN.md](docs/experiment/EXPERIMENT_DESIGN.md)

**...analyze collected data:**
→ Use: Jupyter notebooks in `data analysis/`

**...add a new Firebase collection:**
→ Edit: `src/lib/firebaseDB.js` (add CRUD functions)
→ Update: `firestore.rules` (add security rules)

**...change authentication logic:**
→ Edit: `src/lib/firebaseDB.js` (`authenticateUser()` function)

**...update deployment settings:**
→ Edit: `svelte.config.js` (build config)
→ Or: Vercel dashboard (environment variables)

---

## 🔐 Security-Critical Files

**NEVER commit these to git:**
- `.env` - Contains real API keys (already in .gitignore ✅)

**MUST deploy before collecting data:**
- `firestore.rules` - Database security (deploy to Firebase Console)

**Important for security:**
- `src/lib/firebaseConfig.js` - Should ONLY use env vars
- `src/lib/firebaseDB.js` - All database operations (review regularly)
- `src/routes/downloader/+page.svelte` - Password-protected data export

**See**: [docs/security/](docs/security/) for complete security documentation

---

## 🏗️ Build & Deployment

### Development
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:5173)
```

### Production Build
```bash
npm run build        # Build for production
npm run preview      # Preview production build locally
```

### Deployment
- **Platform**: Vercel
- **Auto-deploy**: Every push to `main` branch
- **Build command**: `npm run build`
- **Output**: `build/` directory
- **Node.js**: >= 18.x required

---

## 📊 Database Structure (Firestore)

```
Firestore
├── Global/
│   └── totalusers          # { count: <number> } - Participant counter
│
├── Auth/
│   └── {token}             # { userid, status } - Authentication records
│
└── Users/
    └── {userId}/
        ├── earnings        # Total $ earned
        ├── ordersComplete  # Number of completed orders
        ├── configuration   # Experiment condition (0 or 1)
        ├── createdAt       # Timestamp
        │
        ├── Actions/        # Sub-collection - every button click logged
        │   ├── start
        │   ├── 1_selectOrder
        │   └── ...
        │
        └── Orders/         # Sub-collection - order selections
            ├── R1_A
            ├── R2_B
            └── ...
```

---

## 🧪 Experiment Data Flow

```
User visits site
    ↓
Landing page (authentication)
    ↓
Firebase: createUser() → Assigns condition (0 or 1)
    ↓
Game starts → Load round 1 from bundle_experiment_50_rounds_short_times.json
    ↓
User selects orders → Firebase: addAction(), addOrder()
    ↓
User delivers → Firebase: updateOrder(), updateFields()
    ↓
Next round (repeat 50 times)
    ↓
Game complete
    ↓
Researcher downloads data via /downloader
```

---

## 🧹 What's Gitignored

```
# Build artifacts
build/
.svelte-kit/
node_modules/

# Secrets
.env
.env.*

# IDE files
.DS_Store
.history/
.vscode/ (except settings)

# Data outputs
data analysis/data/*.json
data analysis/*.csv
data analysis/.ipynb_checkpoints/
```

---

## 🚀 Quick Start for New Developers

1. **Clone the repo**:
   ```bash
   git clone https://github.com/nnicholas-c/bundlegame_no_company.git
   cd bundlegame_no_company
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with real credentials (ask admin)
   ```

4. **Run development server**:
   ```bash
   npm run dev
   ```

5. **Visit**: http://localhost:5173

6. **Read this first**:
   - [README.md](README.md) - Main documentation
   - [docs/security/SECURITY_SETUP.md](docs/security/SECURITY_SETUP.md) - Security basics
   - [docs/experiment/EXPERIMENT_DESIGN.md](docs/experiment/EXPERIMENT_DESIGN.md) - Understand the experiment

---

## 🆘 Common Issues

**Issue**: Firebase connection error
→ **Fix**: Check `.env` file has correct credentials

**Issue**: Build fails with Node.js version error
→ **Fix**: Update to Node.js >= 18.x

**Issue**: Security rules prevent database access
→ **Fix**: Verify rules deployed correctly in Firebase Console

**Issue**: Can't download data from /downloader
→ **Fix**: Check password in `.env` matches `VITE_DOWNLOADER_PASSWORD`

**Issue**: Changes not showing in production
→ **Fix**: Ensure code is pushed to `main` branch (triggers Vercel deploy)

---

## 📝 Notes

- This is a **static site** (no server-side code)
- All database access is **client-side** (browser → Firebase directly)
- Security is enforced by **Firestore rules** (server-side)
- API keys are "public" but **restricted** to specific domains
- Data export requires **password** (set in environment variables)

---

## 📞 Maintainer Notes

**Original Developer**: Marcus
**Current Maintainer**: Nicholas Chen (PARKSINCHAISRI@gmail.com)

**Important**:
- Firebase Project: `bundling-63c10`
- GitHub Repo: `nnicholas-c/bundlegame_no_company`
- Vercel Project: (set up separately)

**Before making changes**:
1. Read relevant documentation
2. Test locally first
3. Check Firebase rules won't break
4. Update this file if structure changes

---

## 🔄 Version History

- **v1.0** - Initial commit (Marcus)
- **v2.0** - Security hardening, documentation overhaul (Feb 2026)

---

## 📚 Additional Resources

- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
