# Bundle Game

> Order bundling behavioral experiment using SvelteKit, Firebase, and interactive maps.

**Quick Links**: [Setup](#-quick-setup) • [Documentation](docs/README.md) • [Security](#-security-critical) • [Contributing](CONTRIBUTING.md)

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

**Full security guide**: [SECURITY.md](SECURITY.md) • [docs/security/SECURITY_SETUP.md](docs/security/SECURITY_SETUP.md)

---

## 📚 Documentation

**New here?** Start with [docs/README.md](docs/README.md) - the documentation hub.

| Topic | Link |
|-------|------|
| **Getting Started** | [Setup Guide](docs/setup/QUICKSTART.md) |
| **Code Structure** | [Architecture Overview](docs/architecture/OVERVIEW.md) |
| **Configuration** | [Config Guide](docs/configuration/OVERVIEW.md) |
| **Security** | [Security Setup](docs/security/SECURITY_SETUP.md) |
| **Experiment Design** | [Experiment Guide](docs/experiment/EXPERIMENT_DESIGN.md) |

---

## 🗂️ Repository Structure

```
bundlegame_no_company/
├── src/
│   ├── lib/                    # Shared libraries (Firebase, game logic)
│   │   ├── centralConfig.json  # ⭐ Main configuration file
│   │   ├── firebaseDB.js       # Database operations
│   │   └── bundle.js           # Core game logic
│   └── routes/                 # SvelteKit pages
│       ├── +page.svelte        # Login page
│       ├── bundlegame.svelte   # Main game
│       └── downloader/         # Data export (password-protected)
│
├── docs/                       # 📚 All documentation
├── firestore.rules             # 🔐 Database security rules
└── package.json
```

**Detailed structure**: [docs/architecture/PROJECT_STRUCTURE.md](docs/architecture/PROJECT_STRUCTURE.md)

---

## ⚙️ Configuration

All settings centralized in [`src/lib/centralConfig.json`](src/lib/centralConfig.json):

| Setting | Default | Docs |
|---------|---------|------|
| Round timer | 300s | [Config Guide](docs/configuration/CENTRALIZED_CONFIG.md) |
| Orders per round | 4 | [Config Guide](docs/configuration/CENTRALIZED_CONFIG.md) |
| Store layouts | 4 stores | [Parameters](docs/configuration/PARAMETERS.md) |
| Experiment rounds | 50 rounds | [Experiment Design](docs/experiment/EXPERIMENT_DESIGN.md) |

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

See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Development workflow
- Code style guidelines
- Pull request process
- Testing requirements

---

## 📊 Data Export

1. Visit `/downloader` on deployed site
2. Enter password (from `.env`)
3. Download JSON with all participant data

**Analysis**: Jupyter notebooks in [`data analysis/`](data%20analysis/)

---

## 📞 Contacts

- **Maintainer**: Nicholas Chen ([PARKSINCHAISRI@gmail.com](mailto:PARKSINCHAISRI@gmail.com))
- **Firebase Project**: `bundling-63c10`
- **GitHub**: [nnicholas-c/bundlegame_no_company](https://github.com/nnicholas-c/bundlegame_no_company)

---

## 📄 License

[Add your license here]
