# Developer Setup Guide

Quick guide to get the project running locally.

---

## Prerequisites

- Node.js >= 18.x installed
- Git access to this repository
- Firebase credentials from Nicholas

---

## Step-by-Step Setup

### 1. Clone and Install

```bash
# Clone the repo (if you haven't already)
git clone [repo-url]
cd bundlegame_no_company

# Install dependencies
npm install
```

### 2. Set Up Environment Variables

```bash
# Copy the example file
cp .env.example .env
```

**Contact Nicholas for credentials** and fill in your `.env` file:
- All Firebase variables (7 total)
- MapTiler API key
- Downloader password

Your `.env` should look like:
```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=bundling-63c10.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=bundling-63c10
# ... etc
```

### 3. Run Locally

```bash
npm run dev
```

Visit http://localhost:5173 - you should see the login page.

### 4. Test It Works

1. Enter any participant ID
2. Click "Start"
3. Game should load with map and orders

If you see Firebase errors, double-check your `.env` file.

---

## Common Issues

**"Firebase: Error (auth/...)"**
→ Check Firebase credentials in `.env`

**"Map not loading"**
→ Check `VITE_MAPTILER_API_KEY` in `.env`

**"Cannot find module"**
→ Run `npm install` again

**Changes not showing up**
→ Restart dev server (`Ctrl+C` then `npm run dev`)

---

## Making Changes

```bash
# Make your changes in src/

# Test locally
npm run dev

# Commit and push
git add .
git commit -m "Your change description"
git push origin main

# Auto-deploys to Vercel
```

---

## Key Files to Know

| File | What It Does |
|------|--------------|
| `src/routes/+page.svelte` | Login page |
| `src/routes/bundlegame.svelte` | Main game (5000+ lines) |
| `src/lib/bundle.js` | Game logic & calculations |
| `src/lib/firebaseDB.js` | Database operations |
| `src/lib/bundle_experiment_50_rounds_short_times.json` | All 50 rounds data |
| `src/lib/configs/stores1.json` | Store layouts & city distances |

**Full guide**: See [../architecture/PROJECT_STRUCTURE.md](../architecture/PROJECT_STRUCTURE.md)

**Environment details**: See [ENVIRONMENT.md](ENVIRONMENT.md)

---

## Need Help?

1. Check [../../README.md](../../README.md) for quick reference
2. Check [../architecture/PROJECT_STRUCTURE.md](../architecture/PROJECT_STRUCTURE.md) for code details
3. Contact Nicholas: nchen06@berkeley.edu
