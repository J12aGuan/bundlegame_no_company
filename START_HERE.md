# 👋 START HERE

Welcome to the Bundle Game codebase! This guide will help you navigate the project.

---

## 🚨 First Time Here? Do This:

### 1. **SECURITY CRITICAL** - Deploy Firebase Rules
If you haven't already, secure your database RIGHT NOW:

→ **Go to**: [docs/security/QUICK_FIX.md](docs/security/QUICK_FIX.md) (5 minutes)

---

### 2. Read the Right Documentation

Choose based on what you need:

| I want to... | Read this... |
|--------------|-------------|
| **Get started quickly** | [README.md](README.md) |
| **Understand code organization** | [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) |
| **Understand specific files** | [docs/FILE_EXPLANATIONS.md](docs/FILE_EXPLANATIONS.md) |
| **Change experiment parameters** | [README_FULL.md](README_FULL.md) |
| **Secure the database** | [docs/security/SECURITY_SETUP.md](docs/security/SECURITY_SETUP.md) |
| **Understand security issues** | [docs/security/SECURITY_EXPLAINED.md](docs/security/SECURITY_EXPLAINED.md) |
| **Design new experiments** | [docs/experiment/EXPERIMENT_DESIGN.md](docs/experiment/EXPERIMENT_DESIGN.md) |

---

## 📚 Documentation Structure

```
📄 README.md                          Quick start & overview
📄 PROJECT_STRUCTURE.md               Complete folder/file organization
📄 README_FULL.md                     Detailed configuration guide
📄 START_HERE.md (this file)          Navigation guide

📁 docs/
├── 📁 security/
│   ├── QUICK_FIX.md                  5-minute emergency security fix
│   ├── SECURITY_SETUP.md             Complete security hardening
│   ├── SECURITY_EXPLAINED.md         Deep dive into vulnerabilities
│   └── firestore.rules.strict        Alternative strict security rules
│
├── 📁 experiment/
│   ├── EXPERIMENT_DESIGN.md          Experiment methodology
│   ├── experiment_reference.csv      Round reference table
│   └── experiment_reference_table.html
│
└── FILE_EXPLANATIONS.md              What each file does
```

---

## 🎯 Common Tasks → Quick Links

### Development
```bash
npm install       # First time setup
npm run dev       # Start dev server
npm run build     # Build for production
```
→ Details: [README.md](README.md#quick-start)

---

### Change Experiment Rounds
**File**: `src/lib/bundle_experiment_50_rounds_short_times.json`
→ Guide: [README_FULL.md](README_FULL.md#changing-order-structures)

---

### Change Round Timer
**File**: `src/routes/bundlegame.svelte` (line ~50)
```javascript
const ROUND_TIME_LIMIT = 300; // Change this
```
→ Guide: [README_FULL.md](README_FULL.md#changing-round-duration)

---

### Change Store Layouts or City Distances
**File**: `src/lib/configs/stores1.json`
→ Guide: [README_FULL.md](README_FULL.md#changing-delivery-times)

---

### Secure Firebase Database
**Immediate**: [docs/security/QUICK_FIX.md](docs/security/QUICK_FIX.md) (5 min)
**Complete**: [docs/security/SECURITY_SETUP.md](docs/security/SECURITY_SETUP.md) (30 min)

---

### Download Experiment Data
**URL**: `/downloader` page (enter password)
**Password**: Set in `.env` as `VITE_DOWNLOADER_PASSWORD`

---

### Understand Code Structure
**Full guide**: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
**File-by-file**: [docs/FILE_EXPLANATIONS.md](docs/FILE_EXPLANATIONS.md)

---

## 🔑 Key Files at a Glance

| File | What It Does |
|------|-------------|
| `src/routes/bundlegame.svelte` | Main game interface (UI + logic) |
| `src/lib/bundle_experiment_50_rounds_short_times.json` | All 50 experiment rounds |
| `src/lib/firebaseDB.js` | Database operations (logging, retrieval) |
| `src/lib/configs/stores1.json` | Store layouts + city distances |
| `firestore.rules` | **CRITICAL** - Database security (must deploy!) |

→ Detailed explanations: [docs/FILE_EXPLANATIONS.md](docs/FILE_EXPLANATIONS.md)

---

## 🚀 Quick Start Workflow

### For Developers
1. Read: [README.md](README.md)
2. Review: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
3. Set up: `cp .env.example .env` (ask for credentials)
4. Run: `npm install && npm run dev`

### For Researchers Customizing Experiments
1. Read: [README_FULL.md](README_FULL.md)
2. Edit: `src/lib/bundle_experiment_50_rounds_short_times.json`
3. Test: `npm run dev`
4. Deploy: `git push origin main`

### For Admins Securing the System
1. **URGENT**: [docs/security/QUICK_FIX.md](docs/security/QUICK_FIX.md)
2. **Complete**: [docs/security/SECURITY_SETUP.md](docs/security/SECURITY_SETUP.md)
3. **Understand**: [docs/security/SECURITY_EXPLAINED.md](docs/security/SECURITY_EXPLAINED.md)

---

## ⚠️ Critical Reminders

### Security
- ✅ Deploy `firestore.rules` BEFORE collecting data
- ✅ Never commit `.env` to git
- ✅ Restrict API keys in Google Cloud Console
- ✅ Use strong password for `/downloader` page

### Development
- ✅ Test locally before pushing to `main`
- ✅ Push to `main` auto-deploys to Vercel
- ✅ Update docs when changing structure

### Data Collection
- ✅ Every action is logged to Firebase
- ✅ Download via `/downloader` page
- ✅ Analyze with notebooks in `data analysis/`

---

## 🆘 Stuck? Try This:

1. **Check documentation index above** → find relevant guide
2. **Search** [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for keywords
3. **Look up file** in [docs/FILE_EXPLANATIONS.md](docs/FILE_EXPLANATIONS.md)
4. **Contact maintainer**: Nicholas Chen (PARKSINCHAISRI@gmail.com)

---

## 📞 Quick Reference

- **Firebase Console**: https://console.firebase.google.com/project/bundling-63c10
- **Vercel Dashboard**: (your deployment URL)
- **GitHub Repo**: https://github.com/nnicholas-c/bundlegame_no_company
- **Local Dev**: http://localhost:5173 (after `npm run dev`)

---

**Ready to start? → Pick a guide above and dive in!** 🚀
