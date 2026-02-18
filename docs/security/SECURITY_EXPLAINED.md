# 🔒 Why Your Firebase is Compromised - Explained Simply

## The Current Situation

Your Firebase database is like a **house with the door wide open and the key posted on the internet**.

---

## Vulnerability #1: Exposed API Key + No Security Rules

### What Happened

1. **Your Firebase API key** (`AIzaSyBATnnW23-8REalVHlcCWW6knyMLHP1ujk`) was committed to GitHub
2. **Google's robots found it** and sent you a warning
3. **Your Firestore security rules** are likely set to allow anyone to read/write
4. **Anyone with the key** can access your database

### Visual Explanation

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR CURRENT SETUP                        │
└─────────────────────────────────────────────────────────────┘

    GitHub (Public)
    └─ README.md (old commit)
       └─ Contains: AIzaSyBATnnW23-8REalVHlcCWW6knyMLHP1ujk

    ↓ Google's bots scan GitHub

    ⚠️  ALERT: Public API key detected!


    Anyone on the internet
    └─ Can use your API key
       └─ Direct access to Firebase
          └─ Can read ALL user data
          └─ Can write fake data
          └─ Can delete everything
          └─ Can rack up your bill
```

### Why This is Bad

```javascript
// What an attacker can do from their computer:

// 1. Visit your website
// 2. Open browser console (F12)
// 3. Run this code:

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBATnnW23-8REalVHlcCWW6knyMLHP1ujk", // Found on GitHub
  projectId: "bundling-63c10"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Download ALL your experiment data
const querySnapshot = await getDocs(collection(db, 'Users'));
querySnapshot.forEach((doc) => {
  console.log(doc.data()); // All user data exposed
});

// Or worse - delete everything
// Or insert fake participant data
// Or run up your Firebase bill
```

---

## Vulnerability #2: Client-Side Password Check

### The Problem with `/downloader` Page

Your downloader page checks the password **in the browser**, not on a server:

```javascript
// Current code (INSECURE):
const correctPassword = import.meta.env.VITE_DOWNLOADER_PASSWORD;

if (inputPassword === correctPassword) {
  const data = await retrieveData(); // Direct database access
}
```

### Why This Doesn't Work

```
┌─────────────────────────────────────────────────────────────┐
│                   CURRENT DOWNLOADER                         │
└─────────────────────────────────────────────────────────────┘

    User visits /downloader
    ↓
    Browser loads page
    ↓
    JavaScript checks password (in browser!)
    ↓
    If correct: calls retrieveData()
    ↓
    Direct Firebase access (no server involved)


    🚨 PROBLEM: Attacker can bypass the password check

    Attacker opens browser console:
    > import { retrieveData } from './lib/firebaseDB.js';
    > const allData = await retrieveData();
    > console.log(allData); // Got everything!

    The password check means NOTHING because:
    - It runs in the browser (attacker's computer)
    - The database is open to direct access
    - No server to enforce the password
```

---

## Vulnerability #3: No Server-Side Authentication

### Your Token System Runs in the Browser

Your app has a clever token authentication system:

```javascript
// User enters ID: "participant123"
// Your code generates token: "A1B2-C3D4-E5F6-G7H8"
// If tokens match → authenticated
```

**BUT** this check only happens in the browser!

### The Problem

```
┌─────────────────────────────────────────────────────────────┐
│              AUTHENTICATION FLOW (CURRENT)                   │
└─────────────────────────────────────────────────────────────┘

    User Browser                    Firebase
    ─────────────                   ────────

    Enter ID + Token
         ↓
    authenticateUser() ←─── Runs in browser (can be bypassed)
         ↓
    if valid: allow
         ↓
    addAction(), addOrder() ──────→ Firestore (accepts anything!)


    🚨 PROBLEM: Firebase doesn't check authentication

    Attacker can skip the UI entirely:

    import { addAction } from './lib/firebaseDB.js';
    await addAction('fake-user-123', fakeData, 'fake-action');

    ✓ Accepted! Because Firestore rules allow everything.
```

---

## How The Attack Works (Step by Step)

### Scenario: Malicious Researcher Wants Your Data

```
Step 1: Find your API key on GitHub
└─ Search: "AIzaSy" site:github.com
   └─ Find: bundlegame_no_company/README.md
      └─ Extract API key

Step 2: Visit your deployed website
└─ https://your-app.vercel.app
   └─ Open browser DevTools (F12)

Step 3: Extract Firebase config from source code
└─ Look at Network tab or source files
   └─ Get: projectId, authDomain, etc.

Step 4: Write attack script
└─ Use Firebase SDK with your credentials
   └─ Query /Users collection
   └─ Download all experiment data

Step 5: (Optional) Cause damage
└─ Insert fake participant data
   └─ Delete real data
   └─ Run expensive queries to increase your bill
```

**Time required**: ~15 minutes for someone with basic JavaScript knowledge

---

## The Fix: Multiple Layers of Security

### Layer 1: Firebase Security Rules ✅ CRITICAL

**What they do**: Server-side enforcement (can't be bypassed)

```
Before (INSECURE):
    allow read, write: if true;
    ↑ Anyone can do anything

After (SECURE):
    allow read: if request.auth.uid == userId;
    allow write: if request.auth.uid == userId;
    ↑ Can only access your own data
```

### Layer 2: API Key Restrictions ✅ REQUIRED

**What they do**: Limit where the API key works

```
Before:
    API Key works from: anywhere on the internet

After:
    API Key works from:
    - https://*.vercel.app/*  (your app)
    - http://localhost:*      (local dev)

    Blocked:
    - Attacker's computer
    - Random websites
    - Command-line scripts
```

### Layer 3: Regenerate Compromised Key ✅ REQUIRED

**Why**: The old key is burned (public knowledge)

```
Old key (COMPROMISED):
    AIzaSyBATnnW23-8REalVHlcCWW6knyMLHP1ujk
    ↑ On GitHub, in Google's records, maybe shared

New key (PRIVATE):
    AIzaSyC_NEW_KEY_HERE_1234567890
    ↑ Only in .env (not committed)
    ↑ Only in Vercel env vars (encrypted)
```

### Layer 4: Secure Data Download

**Option A**: Server-side password check
```
Before:
    Browser → Firebase (direct access)

After:
    Browser → Vercel Function → Check password → Firebase
              ↑ Can't be bypassed
```

**Option B**: Firebase Admin SDK (most secure)
```
    Browser → Vercel Function (uses Admin SDK)
              ↑ Admin credentials never sent to browser
              ↑ Full database access (server-side only)
```

---

## Why This Wasn't Caught Earlier

### Common Misconception

> "If I put the API key in .env, it's secure, right?"

**NO** - because:

1. **Vite/SvelteKit bundles .env into JavaScript**
   ```
   VITE_FIREBASE_API_KEY in .env
   ↓ Build time
   Becomes: const apiKey = "AIzaSy..."
   ↓ Shipped to browser
   Visible in bundled JavaScript
   ```

2. **Firebase API keys are MEANT to be public** (sort of)
   - They're included in client-side code
   - Security comes from **Firestore rules**, not the API key
   - An API key without restrictions is like a house key that opens ANY house

### The Missing Piece

You protected the key from Git ✓
But forgot to protect the database ✗

```
Good: .env in .gitignore
Bad:  Firestore rules allow everything
```

---

## Real-World Impact

### What Could Happen (or may have already happened)

**Data Breach:**
- Attacker downloads all participant responses
- Publishes on data breach sites
- Your IRB gets notified
- Research ethics violation

**Research Integrity:**
- Attacker inserts fake participant data
- Your analysis includes poisoned data
- Published results are invalid
- Retraction required

**Financial:**
- Attacker runs expensive queries in a loop
- Your Firebase bill goes from $0 to $1000+
- Google charges your credit card

**Reputation:**
- News: "University Leaves Research Data Exposed"
- Participants lose trust
- Difficulty recruiting for future studies

---

## How to Check if You've Been Compromised

### 1. Check Firebase Usage Metrics

Go to: https://console.firebase.google.com/project/bundling-63c10/usage

Look for:
- **Unexpected spikes** in document reads/writes
- **High usage** on days when no participants were active
- **Large numbers** of reads around the time Google sent the alert

### 2. Review Firestore Data

Go to: https://console.firebase.google.com/project/bundling-63c10/firestore

Check:
- **Users collection**: Any IDs you don't recognize?
- **Timestamps**: Bulk of data created at unusual times?
- **Auth collection**: Tokens that look suspicious?

### 3. Check Git History

```bash
# When was the key first committed?
git log -S "AIzaSyBATnnW23-8REalVHlcCWW6knyMLHP1ujk" --all

# How long was it public?
git log --all --oneline | head -20
```

### 4. Google's Timeline

- **Email sent**: February 16, 2026
- **Key found at**: specific commit hash
- **Exposure window**: From commit date until you fix it

---

## Action Plan (Priority Order)

### 🚨 DO IMMEDIATELY (TODAY)

1. **Deploy Firebase security rules**
   - Copy contents of `firestore.rules`
   - Paste into Firebase Console → Firestore → Rules
   - Click "Publish"
   - **Time**: 5 minutes

2. **Check for data breach**
   - Review Firebase usage metrics
   - Look for suspicious activity
   - **Time**: 10 minutes

### ⚡ DO SOON (THIS WEEK)

3. **Regenerate API key**
   - Google Cloud Console → Credentials
   - Regenerate the compromised key
   - Add HTTP referrer restrictions
   - **Time**: 15 minutes

4. **Update credentials**
   - Update `.env` with new key
   - Update Vercel environment variables
   - Test that app still works
   - **Time**: 10 minutes

5. **Secure the downloader**
   - Change password to strong passphrase
   - (Or implement server-side check)
   - **Time**: 5-30 minutes

### 📋 DO LATER (THIS MONTH)

6. **Document the incident**
   - When was key exposed
   - What data was at risk
   - What actions were taken
   - **Time**: 30 minutes

7. **Review IRB requirements**
   - Check if incident reporting required
   - Update data security plan
   - **Time**: varies

---

## Prevention Checklist for Future Projects

- [ ] Set up Firebase security rules BEFORE collecting data
- [ ] Test security rules in Firebase console simulator
- [ ] Use API key restrictions from day one
- [ ] Never commit `.env` files (add to .gitignore immediately)
- [ ] Use separate Firebase projects for dev/production
- [ ] Set up billing alerts in Google Cloud
- [ ] Monitor Firebase usage weekly during data collection
- [ ] Use Firebase Admin SDK for data exports (not client-side)
- [ ] Implement proper authentication (Firebase Auth or similar)
- [ ] Regular security audits of your codebase

---

## Learn More

- [Firebase Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
- [Firebase Security Checklist](https://firebase.google.com/support/guides/security-checklist)

---

## Summary: The Core Problem

```
Your API key is public
        +
Your database has no access control
        =
Anyone can read/write/delete your data
```

**Solution**: Deploy `firestore.rules` NOW. Everything else can wait, but this can't.
