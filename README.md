# Bundle Game - Order Bundling Decision Experiment

A SvelteKit-based behavioral experiment for researching order bundling decision-making in delivery services.

**Live Demo**: [Deployed on Vercel](#)
**Documentation**: See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for complete codebase organization

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Firebase credentials

# Run development server
npm run dev
```

Visit: http://localhost:5173

---

## 📋 What This Is

An interactive web-based game where participants make delivery order bundling decisions across 50 rounds:
- **Phase A (Rounds 1-15)**: Baseline bundling behavior
- **Phase B (Rounds 16-35)**: With AI recommendations
- **Phase C (Rounds 36-50)**: Post-recommendation behavior

**Key Features**:
- Real-time Firebase data logging
- Interactive map with delivery routes
- Configurable experiment parameters
- Automated data export
- Tutorial system for onboarding

---

## 🔐 **SECURITY ALERT**

⚠️ **Before collecting data, deploy Firebase security rules!**

**Quick Fix (5 minutes)**:
1. Go to: https://console.firebase.google.com/project/bundling-63c10/firestore/rules
2. Copy contents of `firestore.rules`
3. Paste and click **"Publish"**

**Complete Guide**: [docs/security/QUICK_FIX.md](docs/security/QUICK_FIX.md)

---

## 📁 Project Organization

```
bundlegame_no_company/
├── src/                          # Source code
│   ├── lib/                      # Shared libraries
│   │   ├── firebaseConfig.js     # Firebase initialization
│   │   ├── firebaseDB.js         # Database operations
│   │   ├── bundle.js             # Game logic
│   │   ├── bundle_experiment_50_rounds_short_times.json  # Experiment data
│   │   └── configs/stores1.json  # Store layouts & distances
│   └── routes/                   # Pages
│       ├── +page.svelte          # Login page
│       ├── bundlegame.svelte     # Main game
│       └── downloader/           # Data export
│
├── docs/                         # Documentation
│   ├── security/                 # Security guides
│   │   ├── QUICK_FIX.md          # Emergency security fix
│   │   ├── SECURITY_SETUP.md     # Complete setup guide
│   │   └── SECURITY_EXPLAINED.md # Detailed explanations
│   └── experiment/               # Experiment docs
│       ├── EXPERIMENT_DESIGN.md  # Methodology
│       └── experiment_reference.csv
│
├── data analysis/                # Jupyter notebooks for analysis
├── firestore.rules               # Database security rules
├── firebase.json                 # Firebase config
└── PROJECT_STRUCTURE.md          # Complete file guide
```

**See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for detailed explanations of every file.**

---

## ⚙️ Configuration

### 🎮 Experiment Parameters

All configurable via JSON/JavaScript files - **no database changes needed**.

| What to Change | File | Line/Section |
|----------------|------|--------------|
| Round timer | `src/routes/bundlegame.svelte` | ~50 (`ROUND_TIME_LIMIT`) |
| Orders per round | `src/lib/bundle.js` | ~17 (`ordersShown`) |
| Store layouts | `src/lib/configs/stores1.json` | `stores` array |
| City distances | `src/lib/configs/stores1.json` | `distances` object |
| Aisle walk time | `src/lib/configs/stores1.json` | `cellDistance` (ms) |
| Experiment rounds | `src/lib/bundle_experiment_50_rounds_short_times.json` | Full file |
| Penalty timeout | `src/lib/config.js` | `PENALTY_TIMEOUT` |

**Detailed Guide**: See the original [README.md](README.md) (now renamed to README_FULL.md) for step-by-step modification instructions.

---

## 🗂️ Database Structure (Firebase Firestore)

```
Users/{userId}/
├── earnings           # Total $ earned
├── ordersComplete     # Number of orders completed
├── configuration      # Condition assignment (0 or 1)
├── Actions/           # Every button click logged
│   ├── start
│   ├── 1_selectOrder
│   └── ...
└── Orders/            # Order selections & deliveries
    ├── R1_A
    └── ...

Global/totalusers      # Participant counter
Auth/{token}           # Authentication records
```

---

## 📊 Data Export

### Download Experiment Data

1. **Visit**: `https://your-app.vercel.app/downloader`
2. **Enter password** (set in `.env`)
3. **Click "Download JSON"**

Downloaded file includes:
- All user data
- Every action/click logged
- Order selections and completions
- Timestamps for everything

**Password**: Set `VITE_DOWNLOADER_PASSWORD` in `.env` and Vercel environment variables

---

## 🚀 Deployment

### Automatic Deployment (Vercel)

Every push to `main` branch auto-deploys:
1. Vercel detects push
2. Runs `npm run build`
3. Deploys static files from `build/`

**Environment Variables** (set in Vercel dashboard):
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_MAPTILER_API_KEY=...
VITE_DOWNLOADER_PASSWORD=...
```

### Manual Build

```bash
npm run build         # Build for production
npm run preview       # Preview locally
```

**Requirements**:
- Node.js >= 18.x
- Firebase project set up
- Vercel account connected to GitHub

---

## 🔧 Development Workflow

1. **Make changes** in `src/`
2. **Test locally**: `npm run dev`
3. **Commit**: `git add . && git commit -m "..."`
4. **Push**: `git push origin main`
5. **Auto-deploy**: Vercel builds and deploys automatically

---

## 🆘 Common Tasks

### "I want to add a new round"
1. Open: `src/lib/bundle_experiment_50_rounds_short_times.json`
2. Copy an existing round object
3. Modify: `round`, `orders`, `optimal`, `second_best`
4. Save and redeploy

### "I want to change the map coordinates"
1. Open: `src/routes/bundlegame.svelte`
2. Find: `cityCoords` object (~line 60)
3. Update: `[latitude, longitude]` values
4. Save and redeploy

### "I want to secure my Firebase database"
→ See: [docs/security/QUICK_FIX.md](docs/security/QUICK_FIX.md)

### "I want to regenerate exposed API keys"
→ See: [docs/security/SECURITY_SETUP.md](docs/security/SECURITY_SETUP.md)

### "I want to understand the code structure"
→ See: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

---

## 📚 Documentation Index

| Document | Purpose | Audience |
|----------|---------|----------|
| **README.md** (this file) | Quick start & overview | Everyone |
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | Complete file/folder guide | Developers |
| [README_FULL.md](README_FULL.md) | Detailed configuration guide | Researchers customizing experiments |
| [docs/security/QUICK_FIX.md](docs/security/QUICK_FIX.md) | Emergency security fix | Admins (security incident) |
| [docs/security/SECURITY_SETUP.md](docs/security/SECURITY_SETUP.md) | Complete security hardening | Admins (initial setup) |
| [docs/security/SECURITY_EXPLAINED.md](docs/security/SECURITY_EXPLAINED.md) | Deep dive into vulnerabilities | Technical staff |
| [docs/experiment/EXPERIMENT_DESIGN.md](docs/experiment/EXPERIMENT_DESIGN.md) | Experiment methodology | Researchers |

---

## ⚠️ Important Notes

### Security
- **Never commit `.env`** to git (already in .gitignore ✅)
- **Deploy `firestore.rules`** before collecting data
- **Restrict API keys** in Google Cloud Console
- **Use strong passwords** for `/downloader` page

### Architecture
- This is a **static site** (no server-side code)
- All database access is **client → Firebase** (direct)
- Security enforced by **Firestore rules** (server-side)
- API keys are in client code but **domain-restricted**

### Data Collection
- Every button click is logged to Firebase
- Data persists across sessions
- Download via `/downloader` page
- Analysis notebooks in `data analysis/`

---

## 🤝 Contributing

1. **Read**: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) to understand codebase
2. **Make changes**: Work in a feature branch
3. **Test locally**: `npm run dev`
4. **Commit**: Descriptive commit messages
5. **Push**: Create pull request to `main`

---

## 📞 Support

**Maintainer**: Nicholas Chen (PARKSINCHAISRI@gmail.com)
**Original Developer**: Marcus
**Firebase Project**: `bundling-63c10`
**GitHub**: `nnicholas-c/bundlegame_no_company`

For issues or questions:
1. Check [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) first
2. Review relevant docs in `docs/`
3. Contact maintainer

---

## 📄 License

[Add your license here]

---

## 🙏 Acknowledgments

- **SvelteKit** - Web framework
- **Firebase** - Backend database
- **Vercel** - Hosting platform
- **MapTiler** - Interactive maps
- **Tailwind CSS** - Styling
