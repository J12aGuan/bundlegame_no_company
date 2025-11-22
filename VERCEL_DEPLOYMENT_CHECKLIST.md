# Vercel Deployment Checklist

## ✅ Steps Completed

- [x] **Step 1**: Confirmed local build works (`npm run build`)
- [x] **Step 2**: Installed Vercel adapter (`@sveltejs/adapter-vercel`)
- [x] **Step 3**: Updated `svelte.config.js` to use Vercel adapter with Node.js 20 runtime
- [x] **Step 4**: Confirmed production build works with Vercel adapter
- [x] **Step 5**: Committed and pushed changes to GitHub

## 🚀 Next Steps - Do These Manually

### Step 6: Connect GitHub to Vercel

1. Go to [vercel.com](https://vercel.com) and log in
2. Click **"Add New..."** → **"Project"**
3. Under "Import Git Repository", choose **`nnicholas-c/bundlegame_no_company`**
4. Vercel should auto-detect **SvelteKit**

### Step 7: Configure Vercel Project Settings

On the configuration screen:

- **Framework Preset**: SvelteKit (should be auto-detected)
- **Build Command**: Leave default (`npm run build`)
- **Install Command**: Leave default (`npm install`)
- **Output Directory**: Leave default (adapter handles it)
- **Node.js Version**: Will use 20.x (configured in svelte.config.js)

### Step 8: Environment Variables

⚠️ **Important**: Your Firebase config is currently hardcoded in `src/lib/firebaseConfig.js`

Since these are **client-side Firebase keys** (safe to be public), **no action needed** for now. Firebase security is handled by Firestore rules, not by hiding these keys.

**If you add any secret keys later** (API keys, database passwords, etc.):
1. In Vercel Dashboard → Settings → Environment Variables
2. Add each variable:
   - **Name**: `PUBLIC_YOUR_VAR_NAME` (for public vars) or `SECRET_KEY` (for secrets)
   - **Value**: Your actual value
   - **Environment**: Production, Preview, Development (as needed)

### Step 9: First Deployment

1. Click **"Deploy"** in Vercel
2. Wait for build to complete (~2-3 minutes)
3. You'll get a URL like: `https://bundlegame-no-company.vercel.app`

### Step 10: Test the Deployed App

Open your Vercel URL and test:

- ✅ Login screen loads
- ✅ Firebase authentication works
- ✅ Order selection screen displays correctly
- ✅ Store picking interface functions
- ✅ 3-bag bundling works
- ✅ Recommendation stars appear (in Phase B rounds)
- ✅ Round progression (1-50 rounds)
- ✅ Timers count correctly
- ✅ Data logs to Firebase

### Step 11: Automatic Deployments

From now on, every push to `main` branch will automatically:
- Trigger a new Vercel deployment
- Build the project
- Deploy the new version

You can see all deployments in the Vercel Dashboard under **"Deployments"** tab.

---

## 📝 Project-Specific Notes

### Your Game Uses:
- ✅ **Framework**: SvelteKit with Svelte 5
- ✅ **Styling**: Tailwind CSS v4
- ✅ **Backend**: Firebase (Firestore) - client-side only
- ✅ **Game State**: Svelte stores (all client-side)
- ✅ **Experiment Config**: JSON files in `src/lib/` (bundled at build time)
- ✅ **No server-side rendering needed** for game logic (all client-side)

### Build Configuration:
```javascript
// svelte.config.js
adapter: adapter({
  runtime: 'nodejs20.x'
})
```

### Firebase Config Location:
`src/lib/firebaseConfig.js` - hardcoded (safe for client-side Firebase)

---

## 🔧 Optional: Vercel CLI (for command-line deployments)

If you prefer using the terminal:

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Link to existing project (first time only)
vercel link

# Deploy to production
vercel --prod
```

---

## 🐛 Troubleshooting

### Build fails on Vercel but works locally:
- Check the build logs in Vercel Dashboard
- Ensure all dependencies are in `package.json` (not just devDependencies)
- Verify Node.js version matches (20.x)

### Firebase doesn't connect:
- Check browser console for CORS errors
- Verify Firebase config keys are correct
- Check Firestore security rules allow reads/writes

### Experiment data not loading:
- JSON files in `src/lib/` should be bundled automatically
- Check browser console for 404 errors
- Verify import paths are correct

---

## ✨ Success!

Once deployed, your URL will be:
- **Production**: `https://bundlegame-no-company.vercel.app`
- **Branch Previews**: `https://bundlegame-no-company-<branch>.vercel.app`

Share the production URL with your experiment participants! 🎉
