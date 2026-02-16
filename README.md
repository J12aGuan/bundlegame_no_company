# Bundle Game  

A SvelteKit-based delivery simulation game for researching order bundling decision-making.

## Quick Start

```bash
npm install
npm run dev
```

---

# CONFIGURATION GUIDE

This guide documents configurable parameters for customizing experiments.

---

## 1. ROUND TIME LIMIT

**File**: `src/routes/bundlegame.svelte` (line ~50)

```javascript
const ROUND_TIME_LIMIT = 300; // seconds per round
```

Change this value to adjust how long players have per round.

---

## 2. EXPERIMENT SCENARIOS (Main Configuration)

**File**: `src/lib/bundle_experiment_50_rounds_short_times.json`

This is the **main experiment data** containing 50 rounds across 3 phases.

### Round Structure:
```json
{
  "round": 1,
  "phase": 1,
  "max_bundle": 2,
  "orders": [...],
  "optimal": {...},
  "second_best": {...}
}
```

### Round Parameters:

| Parameter | Description |
|-----------|-------------|
| `round` | Round number (1-50) |
| `phase` | Experiment phase (1, 2, or 3) |
| `max_bundle` | Maximum orders that can be bundled together |
| `orders` | Array of available orders for this round |
| `optimal` | The mathematically optimal bundle choice |
| `second_best` | The second-best bundle choice |

### Order Object Fields:
```json
{
  "id": 1,
  "store": "A",
  "city": "Maplewood",
  "earnings": 15,
  "aisles": [1, 3, 5],
  "travel_time_s": 120,
  "recommended": true
}
```

| Field | Description |
|-------|-------------|
| `id` | Unique order identifier |
| `store` | Store name (must match stores config) |
| `city` | Delivery destination city |
| `earnings` | Dollar amount earned for completing order |
| `aisles` | Array of aisle numbers to visit in store |
| `travel_time_s` | Total travel time in seconds |
| `recommended` | Whether to show recommendation star badge |

---

## 3. STORE CONFIGURATIONS

**File**: `src/lib/configs/stores1.json`

### cellDistance (Aisle Movement Time)
```json
{
  "Store A": {
    "cellDistance": 2000
  }
}
```

`cellDistance` = milliseconds to move between aisles. The countdown timer uses this value.

### City Distance Matrix
```json
{
  "distances": {
    "Maplewood": {
      "Riverdale": 180,
      "Sunnyvale": 240
    }
  }
}
```

Distances are in seconds. Determines delivery travel time between cities.

---

## 4. UI SETTINGS

**File**: `src/lib/bundle.js` (line ~17)

```javascript
const ordersShown = 4; // number of order cards displayed
```

---

## 5. PENALTY TIMEOUT

**File**: `src/lib/config.js`

```javascript
export const PENALTY_TIMEOUT = 30; // seconds
```

---

## 6. MAP COORDINATES

**File**: `src/routes/bundlegame.svelte` (line ~60)

```javascript
const cityCoords = {
  "Maplewood": [40.7312, -74.2673],
  "Riverdale": [40.9176, -73.9144],
  "Sunnyvale": [37.3688, -122.0363]
};
```

These are [latitude, longitude] coordinates for the delivery map.

---

## 7. GLOBAL SETTINGS

**File**: `src/config.json`

```json
{
  "timeLimit": 300,
  "thinkTime": 5,
  "gridSize": 5,
  "tips": true,
  "waiting": false,
  "refresh": false,
  "expire": false,
  "auth": false
}
```

| Parameter | Description |
|-----------|-------------|
| `timeLimit` | Overall time limit |
| `thinkTime` | Delay before starting |
| `gridSize` | Store grid dimensions |
| `tips` | Show tutorial tips |
| `waiting` | Enable waiting period |
| `refresh` | Allow page refresh |
| `expire` | Session expiration |
| `auth` | Require authentication |

---

## Quick Reference Table

| Setting | File | Default |
|---------|------|---------|
| Round timer | `bundlegame.svelte` | 300s |
| Aisle move time | `stores1.json` (cellDistance) | 2000ms |
| City distances | `stores1.json` (distances) | varies |
| Orders shown | `bundle.js` | 4 |
| Penalty timeout | `config.js` | 30s |
| Map coordinates | `bundlegame.svelte` (cityCoords) | - |

---

## Phases Overview

| Phase | Rounds | Description |
|-------|--------|-------------|
| A | 1-15 | Baseline bundling decisions |
| B | 16-35 | With recommendations shown |
| C | 36-50 | Post-recommendation behavior |

---

# HOW TO MODIFY EXPERIMENT PARAMETERS

This section provides **step-by-step instructions** for manually changing all experiment settings.

---

## Changing Order Structures

**File**: `src/lib/bundle_experiment_50_rounds_short_times.json`

Each round contains an `orders` array. To modify orders:

```json
{
  "id": "R1_A",           // Unique ID (format: R{round}_{letter})
  "store": "Target",      // Must match a store in stores1.json
  "city": "Emeryville",   // Delivery destination
  "earnings": 18,         // Dollar amount player earns
  "aisles": [1, 2],       // Which aisles to visit (affects pick time)
  "travel_time_s": 4,     // Delivery travel time in seconds
  "recommended": false    // true = shows star badge (Phase B only)
}
```

**To add a new order**: Copy an existing order object, change the `id`, and modify fields.

**To remove an order**: Delete the order object from the `orders` array.

**To change order sequence**: Reorder the objects in the `orders` array.

---

## Changing Delivery Times

### Method 1: Per-Order Travel Time
**File**: `src/lib/bundle_experiment_50_rounds_short_times.json`

Change `travel_time_s` in each order:
```json
"travel_time_s": 8  // Changed from 4 to 8 seconds
```

### Method 2: City-to-City Distance Matrix
**File**: `src/lib/configs/stores1.json`

```json
"distances": {
  "Emeryville": {
    "destinations": ["Berkeley", "Oakland", "Piedmont"],
    "distances": [4, 2, 7]  // seconds to each destination
  },
  "Berkeley": {
    "destinations": ["Emeryville", "Oakland", "Piedmont"],
    "distances": [4, 5, 4]
  }
}
```

To change: Edit the numbers in the `distances` array (index matches `destinations` array).

---

## Changing Aisle/Shopping Times

### Per-Aisle Time (Experiment Rounds)
**File**: `src/lib/bundle_experiment_50_rounds_short_times.json`

Each round has timing parameters:
```json
{
  "round": 1,
  "store_travel_time_s": 4,   // Time to travel to store
  "base_store_time_s": 2,     // Base overhead in store
  "per_aisle_time_s": 2,      // Time per aisle visited
  ...
}
```

**Time formula**: `total = store_travel + base_store + (unique_aisles × per_aisle) + delivery`

### Cell Distance (Store Navigation Animation)
**File**: `src/lib/configs/stores1.json`

```json
{
  "store": "Target",
  "cellDistance": 3000  // milliseconds per cell movement
}
```

| Value | Speed |
|-------|-------|
| 1000 | Fast (1s per cell) |
| 2000 | Medium (2s per cell) |
| 3000 | Slow (3s per cell) |

---

## Changing Round Sequence

**File**: `src/lib/bundle_experiment_50_rounds_short_times.json`

To reorder rounds:
1. Change the `"round"` number in each object
2. Reorder the objects in the array
3. Update `"phase"` if needed ("A", "B", or "C")

Example - swap rounds 1 and 2:
```json
[
  { "round": 1, "phase": "A", "scenario_id": "A02", ... },  // was round 2
  { "round": 2, "phase": "A", "scenario_id": "A01", ... },  // was round 1
  ...
]
```

---

## Adding New Stores

**File**: `src/lib/configs/stores1.json`

Add to the `stores` array:
```json
{
  "store": "Whole Foods",           // Store name
  "city": "Berkeley",               // City location
  "items": ["apple", "bread", "milk"],  // Available items
  "locations": [                    // Grid layout (row by row)
    ["Entrance", "Apple", ""],
    ["Bread", "Milk", ""],
    ["", "", ""]
  ],
  "cellDistance": 2000,             // ms per cell
  "Entrance": [0, 0]                // [row, col] of entrance
}
```

Then add to distances matrix:
```json
"distances": {
  "Berkeley": {
    "destinations": ["Emeryville", "Oakland", "Piedmont", "NewCity"],
    "distances": [4, 5, 4, 3]
  }
}
```

---

## Adding New Cities

1. **Add to stores1.json distances**:
```json
"NewCity": {
  "destinations": ["Emeryville", "Berkeley", "Oakland"],
  "distances": [5, 3, 4]
}
```

2. **Add to bundlegame.svelte cityCoords** (line ~60):
```javascript
const cityCoords = {
  "Emeryville": [37.8313, -122.2852],
  "NewCity": [37.8500, -122.2600]  // Add coordinates
};
```

3. **Update all existing cities' destinations** to include NewCity.

---

## Changing Recommendation Badges

**File**: `src/lib/bundle_experiment_50_rounds_short_times.json`

Set `recommended: true` on orders you want to highlight:
```json
{
  "id": "R16_A",
  "recommended": true   // Shows star badge
},
{
  "id": "R16_B", 
  "recommended": true   // Shows star badge
},
{
  "id": "R16_C",
  "recommended": false  // No badge
}
```

**Note**: Badges are only visible during Phase B rounds.

---

## Changing Max Bundle Size

**File**: `src/lib/bundle_experiment_50_rounds_short_times.json`

Per-round setting:
```json
{
  "round": 5,
  "max_bundle": 2  // Players can only select up to 2 orders
}
```

---

## Changing Round Duration

**File**: `src/routes/bundlegame.svelte` (line ~50)

```javascript
const ROUND_TIME_LIMIT = 300;  // Change to desired seconds
```

| Value | Duration |
|-------|----------|
| 180 | 3 minutes |
| 300 | 5 minutes |
| 600 | 10 minutes |

---

## Changing Number of Orders Shown

**File**: `src/lib/bundle.js` (line ~17)

```javascript
const ordersShown = 4;  // Change to show more/fewer orders
```

---

## Complete Parameter Reference

| Parameter | File | Location | Type | Example |
|-----------|------|----------|------|---------|
| Round duration | `bundlegame.svelte` | line ~50 | seconds | `300` |
| Orders per round | `bundle.js` | line ~17 | number | `4` |
| Aisle walk time | `stores1.json` | `cellDistance` | milliseconds | `2000` |
| Delivery times | `stores1.json` | `distances` | seconds | `[4, 2, 7]` |
| Per-aisle time | experiment JSON | `per_aisle_time_s` | seconds | `2` |
| Store travel time | experiment JSON | `store_travel_time_s` | seconds | `4` |
| Base store time | experiment JSON | `base_store_time_s` | seconds | `2` |
| Order earnings | experiment JSON | `orders[].earnings` | dollars | `18` |
| Order aisles | experiment JSON | `orders[].aisles` | array | `[1, 2, 3]` |
| Max bundle size | experiment JSON | `max_bundle` | number | `3` |
| Recommendation badge | experiment JSON | `orders[].recommended` | boolean | `true` |
| Map coordinates | `bundlegame.svelte` | `cityCoords` | [lat, lng] | `[37.8, -122.2]` |
| Penalty timeout | `config.js` | export | seconds | `30` |

---

## Deployment

Auto-deploys to Vercel on push to main branch.

**Node.js Requirement**: >= 18.x

```bash
npm run build    # Build for production
npm run preview  # Preview production build locally
```

---

# VERCEL & FIREBASE TUTORIAL

A guide on how Vercel and Firebase are set up and used in this project.

---

## Part 1: Vercel (Hosting & Deployment)

### What Vercel Does in This Project

Vercel hosts the built SvelteKit app as a **static site**. Every push to the `main` branch triggers an automatic rebuild and deploy.

### How It Works

1. **SvelteKit is configured for static output** via `@sveltejs/adapter-static`:

   **File**: `svelte.config.js`
   ```javascript
   import adapter from '@sveltejs/adapter-static';

   const config = {
     kit: {
       adapter: adapter(),
       prerender: {
         entries: ['*']   // Pre-renders ALL routes to static HTML
       }
     }
   };
   ```

   This means at build time, SvelteKit generates plain HTML/CSS/JS files — no server needed.

2. **Build command**: `vite build` (runs via `npm run build`)

3. **Output**: Goes into a `build/` folder, which Vercel serves.

### Setting Up Vercel (Step-by-Step)

1. **Go to [vercel.com](https://vercel.com)** and sign in with your GitHub account.

2. **Import your GitHub repo**:
   - Click "Add New Project"
   - Select the `bundlegame_no_company` repository

3. **Configure build settings** (Vercel usually auto-detects SvelteKit):
   - **Framework Preset**: SvelteKit
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`

4. **Set Node.js version**: In Project Settings → General → Node.js Version, set to **18.x** or higher.

5. **Deploy**: Click "Deploy". Vercel builds and gives you a live URL.

6. **Auto-deploy**: Every `git push origin main` now triggers a new deployment automatically.

### Key Vercel Behaviors

| Behavior | Details |
|----------|---------|
| Auto-deploy | Every push to `main` triggers rebuild |
| Preview deploys | Pull requests get their own preview URL |
| Build command | `npm run build` |
| Output | Static files from `build/` |
| Node.js | >= 18.x required (set in `package.json` engines) |

### Vercel Troubleshooting

- **Build fails with Node version error**: Ensure `package.json` has `"engines": { "node": ">=18.x" }` and Vercel project settings match.
- **404 on routes**: The `adapter-static` with `entries: ['*']` pre-renders all routes. If you add a new route, it's automatically included.
- **Environment variables**: If needed, add them in Vercel → Project Settings → Environment Variables (not currently used since Firebase config is in the code).

---

## Part 2: Firebase (Database & Auth)

### What Firebase Does in This Project

Firebase **Firestore** is the real-time database that stores all experiment data:
- User sessions
- Every button click and action
- Order selections and completions
- Game state at each round

### Firebase Project Details

**File**: `src/lib/firebaseConfig.js`

```javascript
const firebaseConfig = {
  apiKey: "REDACTED_API_KEY",
  authDomain: "REDACTED_PROJECT_ID.firebaseapp.com",
  projectId: "REDACTED_PROJECT_ID",
  storageBucket: "REDACTED_PROJECT_ID.appspot.com",
  messagingSenderId: "REDACTED_SENDER_ID",
  appId: "1:REDACTED_SENDER_ID:web:c76c1f46364a8a072fb655",
  measurementId: "REDACTED_MEASUREMENT_ID"
};
```

This connects the app to the Firebase project named **REDACTED_PROJECT_ID**.

### Firebase Initialization Pattern

Firebase only initializes in the browser (not during server-side rendering):

```javascript
import { browser } from '$app/environment';

if (browser && !getApps().length) {
  app = initializeApp(firebaseConfig);
  firestore = getFirestore(app);
}
```

This is important because SvelteKit pre-renders pages at build time, and Firebase can only run in a browser.

### Firestore Database Structure

```
Firestore
├── Global/
│   └── totalusers              # { count: <number> }
│
├── Auth/
│   └── {token}                 # { userid, status }
│
└── Users/
    └── {userId}/
        ├── earnings            # Total earnings
        ├── ordersComplete      # Count of completed orders
        ├── configuration       # Which condition (0 or 1)
        ├── createdAt           # Timestamp
        │
        ├── Actions/            # Sub-collection
        │   ├── start           # Game start event
        │   ├── 1_buttonID      # Action #1
        │   ├── 2_buttonID      # Action #2
        │   └── ...             # Every click logged
        │
        └── Orders/             # Sub-collection
            ├── R1_A            # Order data + state
            ├── R2_B            # Order data + state
            └── ...
```

### What Gets Logged to Firebase

**File**: `src/lib/firebaseDB.js` — all database functions

| Function | What It Does | When It's Called |
|----------|-------------|-----------------|
| `incrementCounter()` | Increments global user count | New user starts game |
| `getCounter()` | Gets current user count | Assigning condition number |
| `createUser(id, n)` | Creates user doc + start action | Login/game start |
| `authenticateUser(id, token)` | Validates user token | Login screen |
| `addAction(id, gamestate, name)` | Logs a player action | Every button click |
| `addOrder(id, gamestate, orderID)` | Logs an order selection | Player selects order |
| `updateOrder(id, gamestate, orderID)` | Updates order state | Order delivered/completed |
| `updateFields(id, gamestate)` | Updates user-level fields | Earnings/orders change |
| `retrieveData()` | Downloads ALL user data | Data export page |

### How User Authentication Works

1. Player enters an **ID** and **token** on the login screen
2. `authenticateUser()` generates an expected token from the ID using a seeded hash
3. If tokens match → user is authenticated
4. A new user document is created in Firestore with `createUser()`
5. The global counter determines which **condition** (0 or 1) the user gets

```
ID → hashSeed() → seededRandom() → generateToken() → compare with input
```

### How Actions Are Logged

Every button click during the game triggers `logAction()`:

**File**: `src/lib/bundle.js`
```javascript
export const logAction = (action) => {
    // action = { buttonID, buttonContent }
    addAction(id, action, actionCounter + "_" + action.buttonID)
}
```

This creates a document in `Users/{id}/Actions/` with:
- Button ID and content
- Timestamp
- Current game state

### How to Download Experiment Data

1. Navigate to `/downloader` on your deployed site
2. Enter password: (set in `src/routes/downloader/+page.svelte`)
3. Click "Download JSON"
4. This calls `retrieveData()` which fetches ALL users with their Orders and Actions sub-collections

The downloaded JSON structure:
```json
[
  {
    "id": "user123",
    "earnings": 150,
    "ordersComplete": 12,
    "configuration": 0,
    "orders": [
      { "id": "R1_A", "earnings": 18, "store": "Target", ... }
    ],
    "actions": [
      { "id": "1_selectOrder", "buttonContent": "Select", ... }
    ]
  }
]
```

### Setting Up a New Firebase Project (Step-by-Step)

If you need to create a fresh Firebase backend:

1. **Go to [console.firebase.google.com](https://console.firebase.google.com)**

2. **Create a new project**:
   - Click "Add project"
   - Name it (e.g., "bundlegame-experiment")
   - Disable Google Analytics if not needed

3. **Add a web app**:
   - Click the web icon `</>`
   - Register app name
   - Copy the `firebaseConfig` object

4. **Replace the config** in `src/lib/firebaseConfig.js`:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_NEW_API_KEY",
     authDomain: "YOUR_PROJECT.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT.appspot.com",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

5. **Enable Firestore**:
   - In Firebase console → Build → Firestore Database
   - Click "Create database"
   - Choose **production mode** or **test mode**
   - Select a region (e.g., `us-central1`)

6. **Set Firestore security rules**:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if true;  // Open for development
       }
     }
   }
   ```
   ⚠️ For production, restrict rules to authenticated users.

7. **Initialize the Global counter**:
   - In Firestore console, create collection `Global`
   - Add document with ID `totalusers`
   - Add field `count` (number) = `0`

8. **Deploy**: Push to GitHub → Vercel auto-deploys with the new Firebase config.

### Firebase Firestore Rules (Production)

For a real experiment, use stricter rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /Users/{userId} {
      allow create: if true;
      allow read, update: if true;
      match /Actions/{actionId} {
        allow create: if true;
        allow read: if true;
      }
      match /Orders/{orderId} {
        allow create, update: if true;
        allow read: if true;
      }
    }
    match /Global/{docId} {
      allow read, update: if true;
    }
    match /Auth/{tokenId} {
      allow read, create: if true;
    }
  }
}
```

---

## Part 3: How Vercel + Firebase Work Together

```
┌─────────────┐     git push      ┌──────────────┐
│  Developer   │ ───────────────► │   GitHub      │
│  (VS Code)   │                  │   Repository  │
└─────────────┘                   └──────┬───────┘
                                         │ webhook
                                         ▼
                                  ┌──────────────┐
                                  │   Vercel      │
                                  │   (builds &   │
                                  │   hosts site) │
                                  └──────┬───────┘
                                         │ serves
                                         ▼
┌─────────────┐   loads page     ┌──────────────┐
│  Player's    │ ◄────────────── │  Static HTML  │
│  Browser     │                 │  /CSS/JS      │
└──────┬──────┘                  └──────────────┘
       │
       │ reads/writes directly
       ▼
┌──────────────┐
│  Firebase     │
│  Firestore    │
│  (database)   │
└──────────────┘
```

**Key point**: Vercel only serves static files. All database communication happens **directly from the player's browser to Firebase** — there is no backend server.

This means:
- **Vercel** = hosting (free tier handles this easily)
- **Firebase** = database + auth (free Spark plan works for small experiments)
- **No server code** — everything runs client-side
