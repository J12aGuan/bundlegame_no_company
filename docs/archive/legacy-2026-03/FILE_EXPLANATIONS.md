# 📝 Key File Explanations

Quick reference for understanding the most important files in the codebase.

---

## 🔥 Firebase Files

### `src/lib/firebaseConfig.js`
**What it does**: Initializes connection to Firebase
**Key points**:
- Loads credentials from environment variables (`.env`)
- Only initializes in browser (not during server-side rendering)
- Exports `firestore` and `app` for use in other files

**When to edit**: Never (unless switching Firebase projects)

---

### `src/lib/firebaseDB.js`
**What it does**: All database operations (Create, Read, Update, Delete)
**Key functions**:
- `createUser(id, n)` - Creates new user document, assigns condition
- `authenticateUser(id, token)` - Validates user login
- `addAction(id, gamestate, name)` - Logs every button click
- `addOrder(id, gamestate, orderID)` - Logs order selections
- `updateOrder(id, gamestate, orderID)` - Updates order status (delivered, etc.)
- `updateFields(id, gamestate)` - Updates user-level fields (earnings, etc.)
- `retrieveData()` - Downloads ALL experiment data (used by `/downloader` page)

**When to edit**:
- Adding new database collections
- Changing authentication logic
- Modifying data structure

**Security note**: These functions run in the browser. Security is enforced by Firestore rules, not this code.

---

## 🎮 Game Logic Files

### `src/lib/bundle.js`
**What it does**: Core game mechanics
**Key exports**:
- `logAction(action)` - Wrapper for logging actions to Firebase
- `timeStamp` - Current game time (for logging)
- `ordersShown` - Number of order cards to display (configurable)

**Key logic**:
- Order selection handling
- Bundle validation
- Score calculation
- State management

**When to edit**:
- Changing game rules
- Modifying UI behavior
- Adding new game features

---

### `src/lib/tutorial.js`
**What it does**: Tutorial system
**Key features**:
- Step-by-step instructions
- Interactive tooltips
- Progress tracking

**When to edit**:
- Updating tutorial content
- Adding new tutorial steps
- Changing tutorial flow

---

### `src/lib/config.js`
**What it does**: Game constants and configuration
**Key settings**:
- `PENALTY_TIMEOUT` - Seconds of timeout for errors
- Other global game settings

**When to edit**: Changing game-wide constants

---

## 📊 Experiment Data Files

### `src/lib/bundle_experiment_50_rounds_short_times.json`
**What it does**: Main experiment data (82 KB)
**Structure**: Array of 50 round objects
**Each round contains**:
- `round` - Round number (1-50)
- `phase` - Experiment phase ("A", "B", or "C")
- `max_bundle` - Maximum orders that can be bundled
- `orders[]` - Available orders for this round
- `optimal` - Mathematically best bundle choice
- `second_best` - Second-best option

**When to edit**:
- Changing experiment rounds
- Modifying order parameters
- Adjusting experiment phases

**Format**:
```json
{
  "round": 1,
  "phase": "A",
  "max_bundle": 2,
  "orders": [
    {
      "id": "R1_A",
      "store": "Target",
      "city": "Berkeley",
      "earnings": 18,
      "aisles": [1, 2],
      "travel_time_s": 4,
      "recommended": false
    }
  ],
  "optimal": {...},
  "second_best": {...}
}
```

---

### `src/lib/configs/stores1.json`
**What it does**: Store layouts, city distances, item locations
**Structure**:
- `stores[]` - Array of store configurations
- `distances{}` - City-to-city travel times

**Key fields**:
- `cellDistance` - Milliseconds to move between aisles (affects animation speed)
- `locations[][]` - Grid layout of store (what's in each cell)
- `distances{}` - Travel time in seconds between cities

**When to edit**:
- Adding new stores
- Changing city distances
- Modifying store layouts
- Adjusting aisle walk times

---

## 🌐 Route Files (Pages)

### `src/routes/+page.svelte`
**What it does**: Landing page with authentication
**Flow**:
1. User enters ID and token
2. Calls `authenticateUser()`
3. If valid → creates user → redirects to `/home`

**When to edit**: Changing login UI or authentication flow

---

### `src/routes/home.svelte`
**What it does**: Post-login home screen
**Features**:
- Game instructions
- Start button → redirects to `/bundlegame`

**When to edit**: Changing pre-game instructions

---

### `src/routes/bundlegame.svelte`
**What it does**: **Main game interface** - the core experiment
**Key components**:
- Order cards display
- Bundle selection
- Timer
- Map with delivery routes
- Store navigation
- Score tracking

**Key variables**:
- `ROUND_TIME_LIMIT` (~line 50) - Seconds per round
- `cityCoords` (~line 60) - Map coordinates for cities
- `currentRound` - Which round is active
- `selectedOrders` - Currently selected bundle

**When to edit**:
- Changing game UI
- Modifying round timer
- Updating map display
- Adding new features to game

**Warning**: This is a large file (~500+ lines). Be careful with state management.

---

### `src/routes/downloader/+page.svelte`
**What it does**: Password-protected data export page
**Flow**:
1. User enters password
2. If correct → calls `retrieveData()`
3. Downloads JSON file with all experiment data

**Security issue**: Password check is client-side (can be bypassed!)
**Fix**: Implement server-side authentication to replace the client-side password check

**When to edit**:
- Changing download format
- Adding data filtering
- Implementing server-side auth

---

## ⚙️ Configuration Files

### `svelte.config.js`
**What it does**: SvelteKit configuration
**Key settings**:
- `adapter: adapter-static` - Builds as static site
- `prerender: { entries: ['*'] }` - Pre-renders all pages

**When to edit**: Rarely - only for deployment changes

---

### `vite.config.js`
**What it does**: Build tool configuration
**When to edit**: Performance tuning or build optimizations

---

### `tailwind.config.js`
**What it does**: CSS framework configuration
**When to edit**: Customizing colors, fonts, or styling

---

### `package.json`
**What it does**: Dependencies and npm scripts
**Key scripts**:
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

**When to edit**: Adding/removing npm packages

---

## 🔐 Security Files

### `firestore.rules`
**What it does**: **CRITICAL** - Database security rules (server-side enforcement)
**Current rules**:
- Users can create their own documents
- Users can only read/update their own data
- Global counter can be incremented by anyone
- Auth collection allows user creation

**When to edit**:
- Changing access control
- Adding new collections
- Tightening security

**How to deploy**:
1. Firebase Console → Firestore → Rules
2. Copy contents of this file
3. Click "Publish"

**Or**:
```bash
./deploy-security.sh
```

---

### `firebase.json`
**What it does**: Points to `firestore.rules` for deployment
**When to edit**: Only if renaming rules file

---

### `.firebaserc`
**What it does**: Specifies Firebase project ID
**Content**: `bundling-63c10`
**When to edit**: Only if switching Firebase projects

---

## 📄 Documentation Files

### `README.md`
**What it does**: Quick start guide and overview
**Audience**: Everyone (first-time users, developers, researchers)

---

### `PROJECT_STRUCTURE.md`
**What it does**: Complete file/folder organization guide
**Audience**: Developers working with the codebase

---

### `README_FULL.md` (formerly README.md)
**What it does**: Detailed configuration guide with step-by-step instructions
**Audience**: Researchers customizing experiment parameters

---

### `docs/experiment/EXPERIMENT_DESIGN.md`
**What it does**: Experiment methodology and research design
**Audience**: Researchers, IRB reviewers

---

## 🛠️ Utility Files

### `deploy-security.sh`
**What it does**: Automated script to deploy Firestore security rules
**Usage**: `./deploy-security.sh`
**When to use**: After updating `firestore.rules`

---

### `.env.example`
**What it does**: Template for environment variables
**Usage**: `cp .env.example .env` then fill in real values

---

### `.gitignore`
**What it does**: Tells git which files to ignore
**Key exclusions**:
- `.env` - Secrets
- `node_modules/` - Dependencies
- `build/` - Build artifacts
- `.history/` - IDE history

---

## 📊 Data Analysis Files

### `data analysis/fow_driving_game_analysis.ipynb`
**What it does**: Jupyter notebook for analyzing experiment results
**Usage**:
1. Download data from `/downloader` page
2. Place in `data analysis/data/`
3. Run notebook

---

## 🎨 Static Assets

### `static/images/`
**What it does**: Game images (items, signs, etc.)
**Contents**:
- `apple.jpg`, `coconut.jpg`, etc. - Store items
- `stop.jpg`, `yield.jpg`, `yellow.jpg` - Traffic signs

---

## 🚫 Files to Ignore

These are auto-generated or temporary:
- `build/` - Production build output
- `.svelte-kit/` - SvelteKit cache
- `node_modules/` - npm dependencies
- `.vercel/` - Vercel deployment cache
- `.history/` - VS Code local history

**Do not edit these directly.**

---

## 🔑 Key Takeaways

**Most important files**:
1. `src/routes/bundlegame.svelte` - Main game UI
2. `src/lib/bundle_experiment_50_rounds_short_times.json` - Experiment data
3. `src/lib/firebaseDB.js` - Database operations
4. `firestore.rules` - Security rules (MUST deploy!)

**Most frequently edited**:
- Experiment rounds: `bundle_experiment_50_rounds_short_times.json`
- Store config: `src/lib/configs/stores1.json`
- Game UI: `src/routes/bundlegame.svelte`

**Never edit**:
- `firebaseConfig.js` (unless switching projects)
- Build outputs (`build/`, `.svelte-kit/`)
- `node_modules/`

**Always deploy**:
- `firestore.rules` to Firebase Console before collecting data!
