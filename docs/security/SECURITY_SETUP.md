# 🔒 SECURITY SETUP GUIDE

## IMMEDIATE ACTION REQUIRED

Your Firebase database is currently **publicly accessible**. Follow these steps to secure it.

---

## Step 1: Deploy Firebase Security Rules (CRITICAL)

### Option A: Using Firebase Console (Easiest)

1. **Go to Firebase Console**: https://console.firebase.google.com/project/bundling-63c10/firestore/rules

2. **Replace the current rules** with the contents of `firestore.rules`:
   ```bash
   # Copy the contents of firestore.rules
   cat firestore.rules
   ```

3. **Click "Publish"**

4. **Test your app** - make sure users can still log in and play

### Option B: Using Firebase CLI

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in this project
firebase init firestore

# Deploy the rules
firebase deploy --only firestore:rules
```

---

## Step 2: Regenerate Compromised API Keys

### Firebase API Key

1. **Go to Google Cloud Console**: https://console.cloud.google.com/apis/credentials?project=bundling-63c10

2. **Find the compromised key**: `AIzaSyBATnnW23-8REalVHlcCWW6knyMLHP1ujk`

3. **Click the key → "Regenerate Key"**

4. **Add API Restrictions**:
   - Application restrictions → **HTTP referrers (web sites)**
   - Add these referrers:
     ```
     https://*.vercel.app/*
     http://localhost:*
     https://your-custom-domain.com/*
     ```
   - API restrictions → **Restrict key**
     - Cloud Firestore API ✓
     - Firebase Installations API ✓

5. **Copy the new API key**

6. **Update your `.env` file**:
   ```bash
   VITE_FIREBASE_API_KEY=<NEW_KEY_HERE>
   ```

7. **Update Vercel environment variables**:
   - Go to: https://vercel.com/your-project/settings/environment-variables
   - Update `VITE_FIREBASE_API_KEY` with the new key
   - Redeploy your app

### MapTiler API Key (Recommended)

Your MapTiler key `iMsEUcFHOj2pHKXd7NO0` may also be exposed.

1. **Go to MapTiler**: https://cloud.maptiler.com/account/keys/
2. **Regenerate or restrict** the API key
3. **Update `.env`** and **Vercel**

---

## Step 3: Secure the Data Downloader

### Current Vulnerability

The downloader password is checked client-side only. Anyone can bypass it:
```javascript
// Attacker can run this in browser console:
import { retrieveData } from './lib/firebaseDB.js';
const allData = await retrieveData();
```

### Option 1: Add Server-Side Protection (Recommended)

Create a secure API endpoint using Vercel Serverless Functions:

1. **Create `src/routes/api/download/+server.js`**:
   ```javascript
   import { json } from '@sveltejs/kit';
   import { retrieveData } from '$lib/firebaseDB';
   import { VITE_DOWNLOADER_PASSWORD } from '$env/static/private';

   export async function POST({ request }) {
     const { password } = await request.json();

     if (password !== VITE_DOWNLOADER_PASSWORD) {
       return json({ error: 'Unauthorized' }, { status: 401 });
     }

     const data = await retrieveData();
     return json(data);
   }
   ```

2. **Update the downloader page** to call this API instead

### Option 2: Use Firebase Admin SDK (Most Secure)

- Create a Vercel serverless function with Firebase Admin SDK
- Admin SDK uses service account credentials (server-side only)
- Users never get direct database access

### Option 3: Quick Fix - Change Password

Not secure, but better than nothing:

1. **Generate a strong password**:
   ```bash
   openssl rand -base64 32
   ```

2. **Update `.env`**:
   ```bash
   VITE_DOWNLOADER_PASSWORD=<STRONG_PASSWORD_HERE>
   ```

3. **Update Vercel environment variables**

4. **Share password only with authorized researchers**

---

## Step 4: Review Current Database Access

### Check for Suspicious Activity

1. **Go to Firebase Console**: https://console.firebase.google.com/project/bundling-63c10/usage

2. **Check for**:
   - Unusual spikes in reads/writes
   - Unknown user documents
   - Unexpected data patterns

3. **Review Firestore data**:
   - Go to: https://console.firebase.google.com/project/bundling-63c10/firestore/data
   - Check the `Users/` collection for suspicious entries
   - Look for unknown documents in `Auth/` or `Global/`

---

## Step 5: Set Up Monitoring (Optional but Recommended)

### Firebase Alerts

1. **Go to**: https://console.firebase.google.com/project/bundling-63c10/overview/alerts

2. **Enable alerts for**:
   - Billing threshold exceeded
   - Unusual traffic patterns
   - Security rules violations

### Regular Backups

```bash
# Export Firestore data regularly
firebase firestore:export gs://bundling-63c10.appspot.com/backups/$(date +%Y-%m-%d)
```

---

## Step 6: Security Best Practices Going Forward

### ✅ Do's

- **Keep secrets in `.env`** and Vercel environment variables
- **Never commit** `.env` to git
- **Use API key restrictions** for all Google Cloud keys
- **Regularly rotate** sensitive credentials
- **Monitor Firebase usage** for anomalies
- **Use Firebase security rules** to enforce access control
- **Test security rules** before deploying to production

### ❌ Don'ts

- **Don't hardcode** API keys in source code
- **Don't use weak passwords** (like "bobaboba")
- **Don't leave Firestore open** (`allow read, write: if true`)
- **Don't skip API restrictions** on Google Cloud keys
- **Don't ignore** security alerts from Google

---

## Testing Your Security Rules

### Firestore Rules Simulator

1. **Go to**: https://console.firebase.google.com/project/bundling-63c10/firestore/rules

2. **Click "Rules Playground"**

3. **Test scenarios**:
   ```
   Location: /Users/test123
   Operation: get
   Authenticated: No
   Result: Should be DENIED
   ```

### Manual Testing

```bash
# Start your dev server
npm run dev

# Try to access data without authentication
# Open browser console and try:
import { retrieveData } from './lib/firebaseDB.js';
await retrieveData(); // Should fail with proper rules
```

---

## Emergency: Data Already Compromised?

If you suspect your data has been accessed:

1. **Export all data immediately**:
   - Use the `/downloader` page to save a backup
   - Or use Firebase console export

2. **Delete the compromised Firebase project**:
   - Create a new Firebase project
   - Migrate data to new project
   - Update all credentials

3. **Notify participants** if required by your IRB/ethics board

4. **Document the incident** for your research records

---

## Current Security Status Checklist

- [ ] Deploy Firestore security rules (`firestore.rules`)
- [ ] Regenerate Firebase API key
- [ ] Add API key restrictions in Google Cloud Console
- [ ] Update `.env` with new API key
- [ ] Update Vercel environment variables
- [ ] Regenerate MapTiler API key (optional)
- [ ] Change downloader password to strong password
- [ ] Test that app still works after changes
- [ ] Verify security rules in Firebase console
- [ ] Review existing Firestore data for suspicious activity
- [ ] Set up Firebase usage monitoring
- [ ] Document new credentials in secure location

---

## Questions?

Common issues:

**Q: App doesn't work after deploying rules?**
A: Check Firebase console logs for rule violations. You may need to adjust the rules.

**Q: Should I delete the old API key?**
A: Yes, after confirming the new key works everywhere.

**Q: Can I use `firestore.rules.strict` instead?**
A: Only if you implement Firebase Authentication. The current app uses a custom token system.

**Q: How do I know if my data was accessed?**
A: Check Firebase Console → Usage. Look for unexpected spikes in reads.
