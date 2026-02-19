# Code Map - src/ Organization Guide

Quick reference for navigating the `src/` directory and understanding where different types of code live.

---

## 📍 Quick Navigation

| I need to... | Look in... |
|--------------|-----------|
| Modify Firebase operations | `src/lib/firebaseDB.js` |
| Change game logic | `src/lib/bundle.js` |
| Edit the main game UI | `src/routes/bundlegame.svelte` |
| Modify login page | `src/routes/+page.svelte` |
| Change game settings | `src/lib/centralConfig.json` |
| Edit experiment rounds | `src/lib/bundle_experiment_50_rounds_short_times.json` |
| Modify store layouts | `src/lib/configs/stores1.json` |
| Change tutorial | `src/routes/tutorial/+page.svelte` |
| Update data export | `src/routes/downloader/+page.svelte` |

---

## 🗂️ src/ Directory Structure

```
src/
├── app.html                 # HTML template (rarely touched)
├── app.css                  # Global styles
├── config.json              # Legacy config (kept for compatibility)
├── tutorialconfig.json      # Tutorial configuration
├── hooks.server.js          # SvelteKit server hooks
│
├── lib/                     # 📚 Shared code (libraries)
│   │
│   ├── 🔥 Firebase
│   │   ├── firebaseConfig.js      # Firebase initialization
│   │   └── firebaseDB.js          # All database operations (CRUD)
│   │
│   ├── 🎮 Game Logic
│   │   ├── bundle.js              # Core bundling game logic (most important!)
│   │   ├── tutorial.js            # Tutorial system
│   │   ├── globalError.js         # Error handling
│   │   └── config.js              # Experiment constants (penalties, etc.)
│   │
│   ├── ⚙️ Configuration
│   │   ├── centralConfig.json     # ⭐ Main configuration file
│   │   ├── bundle_experiment_50_rounds_short_times.json  # All 50 rounds
│   │   ├── emojis.json            # Emoji mappings for UI
│   │   └── configs/               # Store configurations
│   │       ├── stores1.json       # Default store layouts & distances
│   │       └── stores2.json       # Alternative configuration
│   │
│   ├── 📚 Tutorial Configs
│   │   └── tutorialconfigs/
│   │       └── ...                # Tutorial scenarios
│   │
│   └── 🛠️ Scripts (rarely used)
│       └── scripts/
│           └── ...
│
└── routes/                  # 📄 Pages (SvelteKit file-based routing)
    ├── +page.svelte         # / (root) → Login page
    ├── home.svelte          # /home → Home page (after login)
    ├── bundlegame.svelte    # /bundlegame → Main game (5000+ lines!)
    ├── tutorial/            # /tutorial
    │   └── +page.svelte     # Tutorial page
    └── downloader/          # /downloader
        └── +page.svelte     # Data export page (password protected)
```

---

## 🔥 Firebase Files

### `src/lib/firebaseConfig.js`
**Purpose**: Initialize Firebase app

**What it does**:
- Reads env vars (`VITE_FIREBASE_*`)
- Initializes Firebase app
- Exports `db` (Firestore) and `auth`

**When to edit**: Rarely (only if changing Firebase setup)

### `src/lib/firebaseDB.js`
**Purpose**: All Firebase database operations

**What it does**:
- `createUser()` - Create new user document
- `updateFields()` - Update user fields
- `addAction()` - Log user actions
- `addOrder()` - Log order completions
- `getCounter()` - Get global counters
- `authenticateUser()` - Handle auth

**When to edit**: Adding new database operations or changing data structure

**Lines of code**: ~300

---

## 🎮 Game Logic Files

### `src/lib/bundle.js` (MOST IMPORTANT)
**Purpose**: Core game logic and state management

**What it does**:
- Order generation and management
- Bundling validation
- Route calculations
- Store configuration loading
- Experiment round management
- Svelte stores for game state

**Key exports**:
- `orders` - Current orders (Svelte store)
- `finishedOrders` - Completed orders
- `earned` - Earnings tracker
- `ordersShown` - Number of orders per round (from config)
- `currentRound` - Current round number
- `getCurrentScenario()` - Get round data

**When to edit**: Changing game mechanics, order logic, or calculations

**Lines of code**: ~1500

### `src/lib/config.js`
**Purpose**: Experiment constants and utilities

**What it does**:
- `PENALTY_TIMEOUT` - Penalty duration (from centralConfig)
- `queueNFixedOrders()` - Get orders for a round
- `storeConfig()` - Get store configuration
- `getDistances()` - Get city distances

**When to edit**: Changing how configs are loaded or adding new constants

**Lines of code**: ~100

### `src/lib/tutorial.js`
**Purpose**: Tutorial system

**What it does**:
- Similar to `bundle.js` but for tutorial mode
- Manages tutorial state and progression

**When to edit**: Modifying tutorial flow

---

## 📄 Page Files (Routes)

### `src/routes/+page.svelte` (Login Page)
**URL**: `/`

**What it does**:
- Participant ID input
- Creates/authenticates user in Firebase
- Redirects to game or home

**Lines of code**: ~200

### `src/routes/bundlegame.svelte` (Main Game)
**URL**: `/bundlegame`

**What it does**:
- **EVERYTHING** related to gameplay
- Render interactive map (MapTiler)
- Display orders and UI
- Handle user interactions (clicks, selections)
- Manage game state (picking, moving, delivering)
- Calculate earnings and time
- Log actions to Firebase
- Handle round progression

**Key sections**:
- Map initialization (~50 lines)
- Order display (~200 lines)
- Store navigation (~300 lines)
- Delivery system (~200 lines)
- UI rendering (~1000 lines)

**When to edit**: Changing UI, gameplay flow, or adding features

**Lines of code**: ~5000+ (LARGE FILE - consider splitting in future)

**⚠️ Warning**: This file is complex. Make small, tested changes.

### `src/routes/downloader/+page.svelte` (Data Export)
**URL**: `/downloader`

**What it does**:
- Password protection
- Fetch all user data from Firebase
- Download as JSON
- Display statistics

**When to edit**: Changing export format or adding analytics

**Lines of code**: ~300

### `src/routes/tutorial/+page.svelte` (Tutorial)
**URL**: `/tutorial`

**What it does**:
- Interactive tutorial for participants
- Similar UI to main game but guided

**When to edit**: Changing tutorial content or flow

**Lines of code**: ~2000

---

## ⚙️ Configuration Files

### `src/lib/centralConfig.json` ⭐
**Purpose**: Single source of truth for game settings

**Contains**:
- `game` - Timers, penalties, feature flags
- `stores` - Store layouts, items, walk times
- `distances` - Inter-city travel distances
- `startinglocation` - Starting city

**When to edit**: Changing any game parameters

**See**: [docs/configuration/CENTRALIZED_CONFIG.md](../configuration/CENTRALIZED_CONFIG.md)

### `src/lib/bundle_experiment_50_rounds_short_times.json`
**Purpose**: All 50 experiment rounds

**Contains**: Array of 50 objects, each with:
- `round` - Round number
- `phase` - A, B, or C
- `orders` - Order details
- `optimal` - Optimal solution
- `second_best` - Second best solution

**When to edit**: Modifying experiment design

**See**: [docs/configuration/PARAMETERS.md](../configuration/PARAMETERS.md)

### `src/lib/configs/stores1.json`
**Purpose**: Store layouts and distances

**Contains**:
- Store layouts (3x3 grids)
- Item locations in each store
- Walk times (`cellDistance`)
- City-to-city distances

**When to edit**: Changing store layouts or travel times

---

## 🎨 Styling

### `src/app.css`
**Purpose**: Global CSS styles

**Contains**:
- Tailwind directives
- Custom global styles
- Font imports

**When to edit**: Adding global styles or fonts

### Component Styles
**Where**: In `<style>` blocks within `.svelte` files

**Scoped**: Styles in `.svelte` files are component-scoped by default

---

## 🔄 State Management

### Svelte Stores (in `bundle.js`)
```javascript
export const orders = writable([])           // Current orders
export const finishedOrders = writable([])   // Completed orders
export const earned = writable(0)            // Total earnings
export const game = writable({ inSelect, inStore, ... })  // Game state
export const currentRound = writable(1)      // Current round
```

**Usage in components**:
```svelte
<script>
import { orders, earned } from '$lib/bundle.js';
</script>

<p>Earnings: ${$earned}</p>  <!-- $ prefix to access store value -->
```

---

## 🧩 Key Patterns

### 1. Firebase Operations
```javascript
import { addAction, updateFields } from '$lib/firebaseDB.js';

// Log an action
await addAction(userId, 'selectOrder', { orderId: 'R1_A', ... });

// Update user fields
await updateFields(userId, { earnings: 100 });
```

### 2. Configuration Access
```javascript
import centralConfig from '$lib/centralConfig.json';

const roundTime = centralConfig.game.roundTimeLimit;  // 300
const ordersShown = centralConfig.game.ordersShown;   // 4
```

### 3. Round Management
```javascript
import { getCurrentScenario } from '$lib/bundle.js';

const scenario = getCurrentScenario($currentRound);  // Get current round data
const orders = scenario.orders;                      // Orders for this round
```

---

## 🚀 Common Tasks

### Add a New Page
1. Create `src/routes/newpage/+page.svelte`
2. Add content and logic
3. Link from other pages: `<a href="/newpage">New Page</a>`
4. URL will be `/newpage`

### Add a New Config Option
1. Edit `src/lib/centralConfig.json`
2. Import in relevant file: `import centralConfig from '$lib/centralConfig.json'`
3. Access: `centralConfig.game.yourNewOption`
4. Document in [docs/configuration/](../configuration/)

### Modify Game Logic
1. Find relevant function in `src/lib/bundle.js`
2. Make changes
3. Test thoroughly (affects gameplay!)
4. Update tests if applicable

### Change UI
1. Edit `src/routes/bundlegame.svelte`
2. Use Tailwind classes for styling
3. Test on desktop and mobile
4. Check console for errors

---

## 📚 Related Documentation

- **Full file tree**: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
- **Architecture**: [OVERVIEW.md](OVERVIEW.md)
- **File explanations**: [FILE_EXPLANATIONS.md](FILE_EXPLANATIONS.md)
- **Configuration**: [docs/configuration/OVERVIEW.md](../configuration/OVERVIEW.md)

---

*For questions about code organization, contact Nicholas Chen: PARKSINCHAISRI@gmail.com*
