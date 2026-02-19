# Bundle Game - Internal Project

Order bundling behavioral experiment (50 rounds, Firebase backend, SvelteKit frontend).

---

## 🚀 Local Setup

```bash
# Clone repo (if not already)
git clone [repo-url]
cd bundlegame_no_company

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Contact Nicholas for Firebase credentials and fill in .env

# Run locally
npm run dev
# Visit http://localhost:5173
```

**Ask Nicholas for**:
- Firebase credentials (all `VITE_FIREBASE_*` variables)
- MapTiler API key (`VITE_MAPTILER_API_KEY`)
- Downloader password (`VITE_DOWNLOADER_PASSWORD`)

---

## 🔐 **CRITICAL: Firebase Security**

⚠️ **Must be deployed before collecting real data**

1. Go to: https://console.firebase.google.com/project/bundling-63c10/firestore/rules
2. Copy contents of [firestore.rules](firestore.rules)
3. Paste and **Publish**

See [docs/security/QUICK_FIX.md](docs/security/QUICK_FIX.md) if needed.

---

## 📁 Key Files

```
src/
├── lib/
│   ├── firebaseConfig.js              # Firebase setup
│   ├── firebaseDB.js                  # Database operations
│   ├── bundle.js                      # Game logic
│   ├── bundle_experiment_50_rounds_short_times.json  # All 50 rounds
│   └── configs/stores1.json           # Store layouts & distances
└── routes/
    ├── +page.svelte                   # Login page
    ├── bundlegame.svelte              # Main game
    └── downloader/                    # Data export (password-protected)
```

Full file guide: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

---

## ⚙️ Quick Config Reference

| What | File | Location |
|------|------|----------|
| Round timer | [bundlegame.svelte](src/routes/bundlegame.svelte) | `ROUND_TIME_LIMIT` (~line 50) |
| Orders shown | [bundle.js](src/lib/bundle.js) | `ordersShown` (~line 17) |
| Store layouts | [stores1.json](src/lib/configs/stores1.json) | `stores` array |
| Experiment data | [bundle_experiment_50_rounds_short_times.json](src/lib/bundle_experiment_50_rounds_short_times.json) | Full file |

---

## 🗂️ Database Structure

```
Users/{userId}/
├── earnings, ordersComplete, configuration
├── Actions/          # Every button click
└── Orders/           # Round results

Global/totalusers
Auth/{token}
```

---

## 📊 Export Data

1. Visit: `/downloader` on deployed site
2. Enter password (from `.env`)
3. Download JSON with all user data

---

## 🚀 Deployment

Auto-deploys to Vercel on push to `main`:
```bash
git add .
git commit -m "description"
git push origin main
# Vercel auto-builds and deploys
```

**Environment variables must be set in Vercel dashboard** (same as `.env`).

---

## 🔧 Development

```bash
npm run dev       # Local dev server
npm run build     # Build for production
npm run preview   # Test production build locally
```

**Workflow**: Edit → Test locally → Commit → Push → Auto-deploy

---

## 📞 Contacts

- **Nicholas Chen**: PARKSINCHAISRI@gmail.com
- **Firebase Project**: `bundling-63c10`
- **Docs**: See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for detailed code guide
