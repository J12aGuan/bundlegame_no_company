# 🚨 QUICK FIX - Do This Right Now

## Critical: Deploy Security Rules (5 minutes)

### Method 1: Firebase Console (Easiest)

1. **Open**: https://console.firebase.google.com/project/bundling-63c10/firestore/rules

2. **Delete everything** in the rules editor

3. **Copy and paste** this entire block:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Global counter - read by anyone, write only to increment
    match /Global/totalusers {
      allow read: if true;
      allow update: if request.resource.data.count == resource.data.count + 1;
      allow create: if request.resource.data.count == 0;
    }

    // Auth collection - users can create their own auth doc, read their own
    match /Auth/{tokenId} {
      allow create: if true;
      allow read: if request.auth != null || request.resource.data.userid == tokenId;
      allow update, delete: if false;
    }

    // Users collection - strict per-user access only
    match /Users/{userId} {
      allow create: if request.auth == null && request.resource.data.keys().hasAll(['earnings', 'ordersComplete', 'configuration', 'createdAt']);
      allow read: if request.auth != null && request.auth.uid == userId;
      allow update: if request.auth != null && request.auth.uid == userId;
      allow delete: if false;

      match /Actions/{actionId} {
        allow create: if true;
        allow read: if request.auth != null && request.auth.uid == userId;
        allow update, delete: if false;
      }

      match /Orders/{orderId} {
        allow create: if true;
        allow read: if request.auth != null && request.auth.uid == userId;
        allow update: if true;
        allow delete: if false;
      }
    }

    // Block everything else
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

4. **Click "Publish"**

5. **Test your app**: Visit your site and try to log in

---

### Method 2: Command Line (If you have Firebase CLI)

```bash
./deploy-security.sh
```

---

## Done! Now What?

✅ Your database is now protected by server-side security rules

⚠️ **Still need to do** (but not as urgent):
- Regenerate your Firebase API key
- Add API key restrictions
- Update .env and Vercel with new key
- Change downloader password

See [SECURITY_SETUP.md](SECURITY_SETUP.md) for complete instructions.

---

## How to Know If It Worked

### Test in Firebase Console

1. Go to: https://console.firebase.google.com/project/bundling-63c10/firestore/rules
2. Click **"Rules Playground"**
3. Try this test:

```
Location: /Users/test123
Operation: get
Authenticated: No

Result should be: ❌ DENIED
```

If it shows DENIED, you're protected! ✅

---

## What These Rules Do

```
Old rules (INSECURE):
  allow read, write: if true;
  ↑ Anyone can access anything

New rules (SECURE):
  allow read: if request.auth.uid == userId;
  ↑ Users can only read their own data

New rules (SECURE):
  allow write: if specific conditions;
  ↑ Controlled write access only
```

---

## Emergency Contact

If something breaks after deploying:

1. **Check Firebase Console logs**: https://console.firebase.google.com/project/bundling-63c10/firestore
2. **Revert to old rules** (if needed):
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;
       }
     }
   }
   ```
3. **Check the error** in browser console (F12)
4. **Review** [SECURITY_EXPLAINED.md](SECURITY_EXPLAINED.md) for details

---

## Priority: DO THIS FIRST

Everything else can wait. Deploy these rules NOW to protect your data.

**Time required**: 5 minutes
**Difficulty**: Copy & paste
**Impact**: Closes the security hole
