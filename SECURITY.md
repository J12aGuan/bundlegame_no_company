# Security Policy

## 🔐 Security Overview

Bundle Game uses Firebase for backend data storage and authentication. Proper security configuration is **CRITICAL** before collecting real participant data.

---

## 🚨 CRITICAL: Firebase Security Rules

⚠️ **The database is insecure by default and MUST be secured before production use.**

### Quick Fix (5 minutes)

1. Go to: [Firebase Console → Firestore Rules](https://console.firebase.google.com/project/bundling-63c10/firestore/rules)
2. Copy the contents of [`firestore.rules`](firestore.rules) in this repository
3. Paste into the Firebase Console
4. Click **"Publish"**

---

## 🔒 Security Best Practices

### Environment Variables
- **Never commit `.env` files** - They contain sensitive credentials
- **Rotate credentials** if accidentally exposed
- **Use Firebase Auth accounts with `admin: true` custom claims** for admin and downloader access
- **Never put secrets in `VITE_` variables** - `VITE_` values are shipped to the browser
- **Restrict API keys** in Google Cloud Console to authorized domains

### Firebase Security
- **Deploy security rules** before collecting data
- **Review rules regularly** for updates or improvements
- **Test rules** with Firebase emulator before deploying
- **Monitor Firestore usage** for suspicious activity

### Code Security
- **Validate user input** on both client and server
- **Sanitize data** before storing in Firebase
- **Don't trust client-side** validation alone
- **Keep dependencies updated** (`npm audit` regularly)

---

## 🐛 Reporting Security Vulnerabilities

**DO NOT open public issues for security vulnerabilities.**

Instead:
1. **Email directly**: nchen06@berkeley.edu
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if you have one)

We aim to respond within **48 hours** and will work with you to resolve the issue.

---

## 🛡️ Security Checklist

Before deploying to production:

- [ ] Firebase security rules deployed (go to Firebase Console → Firestore Rules and publish `firestore.rules`)
- [ ] `.env` file is in `.gitignore` and not committed
- [ ] API keys restricted in Google Cloud Console
- [ ] Firebase researcher accounts have the `admin: true` custom claim
- [ ] No downloader password or API token uses a `VITE_` variable
- [ ] Environment variables set in Vercel dashboard
- [ ] Security rules tested with Firebase emulator
- [ ] Regular `npm audit` run and issues resolved
- [ ] Dependencies are up to date

---

## 🔐 Current Security Model

### Authentication
- Simple token-based authentication for participants
- Tokens stored in Firebase `Auth/` collection
- No passwords - designed for research participants with unique IDs
- Researcher/admin access uses Firebase Auth plus an `admin: true` custom claim

### Authorization
- Firestore security rules control data access
- Participant data is writable by the game in narrow document shapes but readable/listable only by admin-claimed Firebase users
- Minimal `/result` summaries are public only through an unguessable result-code document ID
- Runtime configuration is public-read so the static game can load
- Research models, snapshots, survey responses, and sync logs require the admin claim
- Global counters are publicly readable and increment-only

### Data Privacy
- Participant IDs should be anonymized
- No personally identifiable information (PII) collected by default
- Data export requires Firebase admin authentication
- Researcher responsible for ethical data handling

---

## ⚙️ Security-Related Configuration

### Firebase
- **Project**: `bundling-63c10`
- **Rules file**: [`firestore.rules`](firestore.rules)
- **Console**: https://console.firebase.google.com/project/bundling-63c10

### Environment Variables (Sensitive)
- `FIREBASE_ADMIN_EMAIL` - Local/server script admin account
- `FIREBASE_ADMIN_PASSWORD` - Local/server script admin password
- `QUALTRICS_API_TOKEN` - Private Qualtrics sync token
- `PUBLICATION_PSEUDONYM_SALT` - Private salt for stable publication pseudonyms

Firebase browser config values use `VITE_FIREBASE_*` because Firebase client apps need them at runtime; they are identifiers, not database authorization. Do not use `VITE_` for downloader passwords, admin passwords, Qualtrics tokens, or service credentials.

**Never commit these** - they're in `.env` (gitignored).

## Migration Note

1. Enable Firebase Email/Password sign-in.
2. Create researcher users in Firebase Auth.
3. Set a custom claim of `admin: true` on approved researcher users with the Firebase Admin SDK or console tooling.
4. Delete `VITE_DOWNLOADER_PASSWORD` from `.env` and hosting provider settings.
5. Publish [`firestore.rules`](firestore.rules) before collecting human-subjects data.

---

## 📞 Security Contact

**Security issues**: nchen06@berkeley.edu
**General questions**: See [README.md](README.md#-contributing)

---

## 📄 Security Updates

We recommend:
- **Weekly**: Check for critical security updates (`npm audit`)
- **Monthly**: Review Firebase security rules
- **Quarterly**: Rotate sensitive credentials
- **Before deployment**: Run full security checklist

---

Thank you for helping keep Bundle Game secure! 🔒
