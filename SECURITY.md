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

**Detailed guide**: [docs/security/QUICK_FIX.md](docs/security/QUICK_FIX.md)

---

## 📚 Security Documentation

| Document | Purpose |
|----------|---------|
| [docs/security/QUICK_FIX.md](docs/security/QUICK_FIX.md) | Emergency 5-minute security fix |
| [docs/security/SECURITY_SETUP.md](docs/security/SECURITY_SETUP.md) | Complete security hardening guide |
| [docs/security/SECURITY_EXPLAINED.md](docs/security/SECURITY_EXPLAINED.md) | Deep dive into security vulnerabilities |

---

## 🔒 Security Best Practices

### Environment Variables
- **Never commit `.env` files** - They contain sensitive credentials
- **Rotate credentials** if accidentally exposed
- **Use strong passwords** for downloader page and admin access
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
1. **Email directly**: PARKSINCHAISRI@gmail.com
2. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if you have one)

We aim to respond within **48 hours** and will work with you to resolve the issue.

---

## 🛡️ Security Checklist

Before deploying to production:

- [ ] Firebase security rules deployed ([docs/security/QUICK_FIX.md](docs/security/QUICK_FIX.md))
- [ ] `.env` file is in `.gitignore` and not committed
- [ ] API keys restricted in Google Cloud Console
- [ ] Downloader page password is strong (`VITE_DOWNLOADER_PASSWORD`)
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

### Authorization
- Firestore security rules control data access
- Users can only read/write their own data
- Global counters accessible to all (by design)
- Admin functions (data export) password-protected

### Data Privacy
- Participant IDs should be anonymized
- No personally identifiable information (PII) collected by default
- Data export page requires password
- Researcher responsible for ethical data handling

---

## ⚙️ Security-Related Configuration

### Firebase
- **Project**: `bundling-63c10`
- **Rules file**: [`firestore.rules`](firestore.rules)
- **Console**: https://console.firebase.google.com/project/bundling-63c10

### Environment Variables (Sensitive)
- `VITE_FIREBASE_API_KEY` - Firebase API key (domain-restricted)
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_DOWNLOADER_PASSWORD` - Data export password

**Never commit these** - they're in `.env` (gitignored).

---

## 📞 Security Contact

**Security issues**: PARKSINCHAISRI@gmail.com
**General questions**: See [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 📄 Security Updates

We recommend:
- **Weekly**: Check for critical security updates (`npm audit`)
- **Monthly**: Review Firebase security rules
- **Quarterly**: Rotate sensitive credentials
- **Before deployment**: Run full security checklist

---

Thank you for helping keep Bundle Game secure! 🔒
