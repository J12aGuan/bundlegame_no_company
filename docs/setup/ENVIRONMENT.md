# Environment Variables Setup

Detailed guide to setting up environment variables for local development and production.

---

## 🔐 Overview

Bundle Game requires environment variables for:
- **Firebase** - Database and authentication
- **MapTiler** - Interactive maps
- **Downloader** - Password-protected data export

These are stored in `.env` locally and in Vercel for production.

---

## 📝 Quick Setup

### 1. Create Local .env File

```bash
# Copy the example file
cp .env.example .env
```

### 2. Fill in Values

**Contact Nicholas Chen** (nchen06@berkeley.edu) for credentials.

Your `.env` should look like this:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyC...
VITE_FIREBASE_AUTH_DOMAIN=bundling-63c10.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=bundling-63c10
VITE_FIREBASE_STORAGE_BUCKET=bundling-63c10.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
VITE_FIREBASE_MEASUREMENT_ID=G-ABCDEFGH

# MapTiler API Key
VITE_MAPTILER_API_KEY=your_maptiler_key_here

# Downloader Page Password
VITE_DOWNLOADER_PASSWORD=your_secure_password_here
```

### 3. Verify

```bash
# Start dev server
npm run dev

# If you see Firebase errors, credentials are wrong
# If map doesn't load, MapTiler key is wrong
```

---

## 🔑 Environment Variables Reference

### Firebase Variables

| Variable | Purpose | Where to Find |
|----------|---------|---------------|
| `VITE_FIREBASE_API_KEY` | Firebase API key | Firebase Console → Project Settings |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain | Firebase Console → Project Settings |
| `VITE_FIREBASE_PROJECT_ID` | Project identifier | Firebase Console → Project Settings |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket | Firebase Console → Project Settings |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging ID | Firebase Console → Project Settings |
| `VITE_FIREBASE_APP_ID` | App ID | Firebase Console → Project Settings |
| `VITE_FIREBASE_MEASUREMENT_ID` | Analytics ID | Firebase Console → Project Settings |

**Firebase Console**: https://console.firebase.google.com/project/bundling-63c10/settings/general

### MapTiler Variable

| Variable | Purpose | Where to Get |
|----------|---------|--------------|
| `VITE_MAPTILER_API_KEY` | Map tile rendering | https://cloud.maptiler.com/account/keys/ |

**Steps to get MapTiler key**:
1. Go to https://cloud.maptiler.com/
2. Sign in (or create account)
3. Go to Account → Keys
4. Copy your API key

**Free tier**: 100,000 requests/month (sufficient for development)

### Downloader Variable

| Variable | Purpose | Usage |
|----------|---------|-------|
| `VITE_DOWNLOADER_PASSWORD` | Protect data export | Used at `/downloader` page |

**Set a strong password**:
- Minimum 12 characters
- Mix of letters, numbers, symbols
- Don't share publicly

---

## 🔒 Security Best Practices

### DO ✅
- Keep `.env` file local only
- Use strong passwords
- Rotate credentials if exposed
- Use different passwords for dev/prod
- Restrict Firebase API keys to specific domains

### DON'T ❌
- **Never commit `.env`** - It's in `.gitignore` for a reason
- Don't share credentials in Slack/email (use password manager)
- Don't use simple passwords like "password123"
- Don't reuse passwords across projects
- Don't commit credentials in code comments

---

## 🚀 Production Setup (Vercel)

### 1. Access Vercel Dashboard

Go to: https://vercel.com/dashboard

### 2. Navigate to Environment Variables

```
Your Project → Settings → Environment Variables
```

### 3. Add Each Variable

For each variable in `.env`:
1. Click "Add New"
2. Enter name (e.g., `VITE_FIREBASE_API_KEY`)
3. Enter value
4. Select environment: **Production, Preview, Development** (all)
5. Click "Save"

**Important**: Add ALL variables, even if values are the same as dev.

### 4. Redeploy

After adding env vars:
```bash
# Trigger a new deployment
git commit --allow-empty -m "Trigger redeploy"
git push origin main
```

Or use Vercel dashboard: Deployments → Re-deploy

---

## 🛠️ Troubleshooting

### Firebase Not Connecting

**Symptoms**: "Firebase: Error (auth/...)" in console

**Solutions**:
1. Check all Firebase variables are in `.env`
2. Verify no typos in variable names
3. Ensure no extra spaces in values
4. Restart dev server (`Ctrl+C`, then `npm run dev`)
5. Check Firebase project is active

**Verify**:
```bash
# Check if variables are loaded
node -e "console.log(process.env.VITE_FIREBASE_API_KEY)"
```

### Map Not Loading

**Symptoms**: Map tiles not rendering, blank map area

**Solutions**:
1. Check `VITE_MAPTILER_API_KEY` is in `.env`
2. Verify key is valid at https://cloud.maptiler.com/account/keys/
3. Check you haven't exceeded free tier limits (100k/month)
4. Restart dev server

**Verify**:
```javascript
// In browser console
console.log(import.meta.env.VITE_MAPTILER_API_KEY)
```

### Downloader Password Not Working

**Symptoms**: Can't access `/downloader` page

**Solutions**:
1. Check `VITE_DOWNLOADER_PASSWORD` is in `.env`
2. Verify no typos when entering password
3. Password is case-sensitive
4. Restart dev server

### Changes Not Reflecting

**Problem**: Updated `.env` but changes don't show

**Solution**:
```bash
# Always restart dev server after .env changes
Ctrl+C
npm run dev
```

### Production Variables Not Working

**Problem**: Works locally but not on Vercel

**Solutions**:
1. Check all variables are added in Vercel dashboard
2. Verify spelling matches exactly (including `VITE_` prefix)
3. Redeploy after adding variables
4. Check deployment logs for errors

---

## 🔄 Rotating Credentials

If credentials are exposed:

### Firebase
1. Go to Firebase Console → Project Settings
2. Regenerate API keys
3. Update restrictions (domain whitelist)
4. Update `.env` and Vercel env vars
5. Redeploy

### MapTiler
1. Go to https://cloud.maptiler.com/account/keys/
2. Delete old key
3. Create new key
4. Update `.env` and Vercel env vars
5. Redeploy

### Downloader Password
1. Choose new strong password
2. Update `.env` and Vercel env vars
3. Redeploy
4. Inform team members

---

## 📋 Environment Variables Checklist

### For Local Development

- [ ] `.env` file created (from `.env.example`)
- [ ] All Firebase variables filled in
- [ ] MapTiler API key added
- [ ] Downloader password set
- [ ] Dev server runs without errors
- [ ] Login page works
- [ ] Map loads correctly
- [ ] `/downloader` page accessible with password

### For Production (Vercel)

- [ ] All variables added in Vercel dashboard
- [ ] Variables set for all environments (Production, Preview, Development)
- [ ] No typos in variable names or values
- [ ] Redeployed after adding variables
- [ ] Tested production site
- [ ] Firebase security rules deployed
- [ ] API keys restricted to production domain

---

## 🧪 Testing Environment Setup

### Test Script

Create `test-env.js`:

```javascript
// Check if all required env vars are present
const required = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_MEASUREMENT_ID',
  'VITE_MAPTILER_API_KEY',
  'VITE_DOWNLOADER_PASSWORD'
];

let missing = [];
required.forEach(key => {
  if (!process.env[key]) {
    missing.push(key);
  }
});

if (missing.length === 0) {
  console.log('✓ All environment variables present');
} else {
  console.log('✗ Missing environment variables:');
  missing.forEach(key => console.log(`  - ${key}`));
  process.exit(1);
}
```

Run:
```bash
node test-env.js
```

---

## 📚 Related Documentation

- **Quick setup**: [QUICKSTART.md](QUICKSTART.md)
- **Security guide**: [../../SECURITY.md](../../SECURITY.md)

---

## 📞 Need Credentials?

**Contact**: Nicholas Chen
**Email**: nchen06@berkeley.edu

Please include:
- What you need credentials for (dev, prod, both)
- Your GitHub username
- Brief description of your role on the project

---

*Never commit credentials! Use `.env` for local, Vercel dashboard for production.*
