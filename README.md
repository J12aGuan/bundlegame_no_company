# Bundle Game

> Order bundling behavioral experiment using SvelteKit, Firebase, and interactive maps.

**Quick Links**: [Setup](#-quick-setup) • [Documentation](docs/README.md) • [Security](#-security-critical) • [Contributing](#-contributing)

---

## 🎯 What Is This?

An interactive web experiment where participants make delivery order bundling decisions across 50 rounds:
- **Phase A (Rounds 1-15)**: Baseline behavior
- **Phase B (Rounds 16-35)**: With AI recommendations
- **Phase C (Rounds 36-50)**: Post-recommendation behavior

**Live Demo**: Deployed on Vercel
**Tech Stack**: SvelteKit • Firebase • MapTiler • Tailwind CSS

---

## 🚀 Quick Setup

```bash
# 1. Clone and install
git clone https://github.com/nnicholas-c/bundlegame_no_company.git
cd bundlegame_no_company
npm install

# 2. Configure environment
cp .env.example .env
# Fill in Firebase credentials (contact Nicholas)

# 3. Run locally
npm run dev
# Visit http://localhost:5173
```

**Need detailed setup?** See [docs/setup/QUICKSTART.md](docs/setup/QUICKSTART.md)

---

## 🔐 SECURITY CRITICAL

⚠️ **Before collecting real data, deploy Firebase security rules!**

**Quick Fix (5 minutes)**:
1. Go to: [Firebase Console → Firestore Rules](https://console.firebase.google.com/project/bundling-63c10/firestore/rules)
2. Copy contents of [`firestore.rules`](firestore.rules)
3. Paste and click **"Publish"**

**Full security guide**: [SECURITY.md](SECURITY.md)

---

## 📚 Documentation

**New here?** Start with [docs/README.md](docs/README.md) - the documentation hub.

| Topic | Link |
|-------|------|
| **Getting Started** | [Setup Guide](docs/setup/QUICKSTART.md) |
| **Code Structure** | [Current Architecture](docs/current/ARCHITECTURE.md) |
| **Configuration** | [Current Config & Datasets](docs/current/CONFIG_AND_DATASETS.md) |
| **Experiment Design** | [Experiment Guide](docs/experiment/EXPERIMENT_DESIGN.md) |

---

## 🗂️ Repository Structure

```
bundlegame_no_company/
├── src/
│   ├── lib/                    # Shared libraries (Firebase, game logic)
│   │   ├── firebaseDB.js       # Database operations
│   │   ├── bundle.js           # Main game runtime state
│   │   └── tutorial.js         # Tutorial runtime state
│   ├── routes/                 # SvelteKit pages
│   │   ├── +page.svelte        # Login page
│   │   ├── bundlegame.svelte   # Main game
│   │   ├── admin/masterdata    # Config + dataset admin UI
│   │   └── downloader/         # Data export (password-protected)
│
├── docs/current/               # ✅ Authoritative architecture/config docs
├── docs/archive/               # Archived legacy docs
├── data analysis/analytics_v1/ # Analytics pipeline (v1)
├── firestore.rules             # 🔐 Database security rules
└── package.json
```

**Current architecture doc**: [docs/current/ARCHITECTURE.md](docs/current/ARCHITECTURE.md)

---

## ⚙️ Configuration

Runtime configuration is stored in Firestore MasterData (not local static JSON):
- `MasterData/centralConfig`
- `MasterData/tutorialConfig`
- grouped scenario datasets in `MasterData/datasets`

**Config & dataset operations**: [docs/current/CONFIG_AND_DATASETS.md](docs/current/CONFIG_AND_DATASETS.md)

| Setting | Source |
|---------|--------|
| Round timer / penalties | `centralConfig.game` |
| Active main scenario set | `centralConfig.scenario_set` |
| Active tutorial scenario set | `tutorialConfig.scenario_set` |
| Scenario rounds / orders / optimal bundles | grouped dataset entry (`scenarios`, `orders`, `optimal`) |

---

## 🚀 Deployment

Auto-deploys to Vercel on push to `main`:

```bash
git add .
git commit -m "Your changes"
git push origin main
# Vercel auto-builds and deploys
```

**Environment variables must be set in Vercel dashboard** (same as `.env`).

---

## 🤝 Contributing

### Branch Naming
```bash
git checkout -b feature/your-feature-name   # new features
git checkout -b fix/bug-description         # bug fixes
git checkout -b docs/what-you-changed       # documentation
```

### Commit Messages
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `refactor:` code refactoring
- `chore:` maintenance

### Before Submitting a PR
- [ ] `npm run dev` runs without errors
- [ ] `npm run build` succeeds
- [ ] No new console errors or warnings
- [ ] Firebase operations still work

### Adding Environment Variables
1. Add to `.env.example` with a comment
2. Update [docs/setup/ENVIRONMENT.md](docs/setup/ENVIRONMENT.md)
3. Note in PR that Vercel env vars need updating

---

## 📊 Data Export

1. Visit `/downloader` on deployed site
2. Enter password (from `.env`)
3. Download JSON with all participant data

**Analysis**: notebooks and pipeline in [`data analysis/`](data%20analysis/)

---

## 📞 Contacts

- **Maintainer**: Nicholas Chen ([nchen06@berkeley.edu](mailto:nchen06@berkeley.edu))
- **Firebase Project**: `bundling-63c10`
- **GitHub**: [nnicholas-c/bundlegame_no_company](https://github.com/nnicholas-c/bundlegame_no_company)
