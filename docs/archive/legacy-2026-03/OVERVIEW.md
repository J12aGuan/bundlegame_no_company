# Architecture Overview

High-level overview of the Bundle Game architecture, technology stack, and design decisions.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User's Browser                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │           SvelteKit Application                   │  │
│  │  - Static site (pre-rendered)                     │  │
│  │  - Client-side interactivity                      │  │
│  │  - MapTiler integration                          │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                           │
                           ├─────────────────┐
                           ↓                 ↓
            ┌─────────────────────┐  ┌──────────────────┐
            │   Firebase (Google) │  │  Vercel (Hosting)│
            │  - Firestore (DB)   │  │  - Static files  │
            │  - Authentication   │  │  - Auto-deploy   │
            └─────────────────────┘  └──────────────────┘
```

---

## 📚 Technology Stack

### Frontend
- **SvelteKit** - Web framework (static site generation)
- **Svelte** - Reactive UI components
- **Tailwind CSS** - Utility-first styling
- **Vite** - Build tool and dev server

### Backend / Data
- **Firebase Firestore** - NoSQL database (real-time)
- **Firebase Authentication** - Simple token-based auth
- **MapTiler** - Interactive map tiles

### Deployment
- **Vercel** - Static site hosting with auto-deploy
- **GitHub** - Version control and CI/CD trigger

---

## 🎯 Key Design Decisions

### 1. Static Site Architecture
**Decision**: Build as a static site (SSG) rather than server-side rendered (SSR)

**Rationale**:
- Simpler deployment (no server required)
- Better performance (CDN-served static files)
- Lower cost (Vercel free tier)
- Firebase handles all backend needs

**Trade-off**: No server-side code execution (all logic is client-side)

### 2. Client-Side Firebase Access
**Decision**: Frontend directly connects to Firebase (no backend API)

**Rationale**:
- Simplifies architecture (one less layer)
- Firebase security rules handle authorization
- Real-time updates work out of the box

**Trade-off**: API keys visible in client code (mitigated by Firebase domain restrictions)

### 3. Centralized Configuration
**Decision**: Single `src/lib/centralConfig.json` for all game settings

**Rationale**:
- Easy to find and modify settings
- Version controlled
- Can be edited without code changes

**Trade-off**: Requires rebuild to apply changes (static site)

### 4. File-Based Routing
**Decision**: Use SvelteKit's file-based routing (`src/routes/`)

**Rationale**:
- Convention over configuration
- Clear URL → file mapping
- Automatic code splitting

---

## 📦 Code Organization

```
src/
├── lib/                      # Shared code (imported by pages)
│   ├── Firebase              # Database & auth
│   ├── Game Logic            # Core gameplay (bundle.js)
│   ├── Configuration         # centralConfig.json, configs/
│   └── Utilities             # Helpers, emojis, etc.
│
└── routes/                   # Pages (URL paths)
    ├── +page.svelte          # / (login)
    ├── bundlegame.svelte     # /bundlegame (main game)
    ├── tutorial/             # /tutorial
    └── downloader/           # /downloader
```

**Detailed breakdown**: [CODEMAP.md](CODEMAP.md)

---

## 🔄 Data Flow

### 1. Participant Login
```
User enters ID → Frontend creates/fetches user in Firebase
                 → Assigns condition (0 or 1)
                 → Redirects to game
```

### 2. Gameplay Loop
```
Load round scenario → Display orders on map
                     → User selects orders
                     → Log action to Firebase
                     → Calculate earnings
                     → Update Firebase
                     → Next round
```

### 3. Data Collection
```
Every action → Firebase /Users/{userId}/Actions/
Every order  → Firebase /Users/{userId}/Orders/
Completion   → Updates /Users/{userId}/earnings
```

### 4. Data Export
```
Admin visits /downloader → Enters password
                        → Frontend fetches all user data
                        → Downloads as JSON
```

---

## 🗄️ Database Schema

### Firestore Structure
```
Users/
  {userId}/
    - earnings: number
    - ordersComplete: number
    - configuration: 0 | 1
    - Actions/
        - start: {timestamp, ...}
        - 1_selectOrder: {timestamp, ...}
        - ...
    - Orders/
        - R1_A: {earnings, time, ...}
        - ...

Global/
  - totalusers: number

Auth/
  {token}/
    - userid: string
    - timestamp: number
```

**Full schema**: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md#database-structure)

---

## 🔐 Security Model

### Authentication
- **Simple token-based** - Suitable for research participants
- **No passwords** - Participants use unique IDs
- **Tokens stored in Firestore** - `/Auth/{token}` collection

### Authorization
- **Firestore security rules** enforce access control
- **User isolation** - Users can only access their own data
- **Public counters** - `/Global/totalusers` readable by all

---

## ⚙️ Configuration System

### Runtime Configuration
**File**: `src/lib/centralConfig.json`

Contains:
- Game timers (round limits, think time)
- UI settings (orders shown, grid size)
- Store configurations (layouts, distances)
- Feature flags (auth, tips, etc.)

### Experiment Scenarios
**File**: `src/lib/bundle_experiment_50_rounds_short_times.json`

Contains:
- All 50 rounds
- Order details per round
- Optimal solutions
- AI recommendations

**Config docs**: docs/configuration/

---

## 🚀 Build & Deploy Process

### Development
```bash
npm run dev  → Vite dev server with HMR
             → Connects to Firebase (dev credentials)
             → Hot reload on file changes
```

### Production Build
```bash
npm run build  → SvelteKit builds static site
               → Output to build/
               → Prerendered HTML + optimized JS/CSS
```

### Auto-Deployment
```
git push origin main → GitHub webhook
                    → Vercel detects push
                    → Runs `npm run build`
                    → Deploys to CDN
                    → Updates live site
```

---

## 🎮 Game Logic Flow

### Main Game Component
**File**: `src/routes/bundlegame.svelte` (5000+ lines)

**Responsibilities**:
- Render map and UI
- Handle user interactions
- Manage game state
- Log actions to Firebase
- Calculate earnings

### Core Logic
**File**: `src/lib/bundle.js`

**Responsibilities**:
- Order generation
- Bundling validation
- Route calculations
- Store configuration
- Experiment round management

---

## 📊 Performance Considerations

### Optimizations
- **Static site generation** - Fast initial load
- **Code splitting** - Routes loaded on demand
- **Firebase indexing** - Fast queries
- **MapTiler caching** - Cached map tiles
- **Lazy loading** - Images/components as needed

### Potential Bottlenecks
- **Firebase read/write limits** - 50k/day free tier
- **MapTiler API calls** - 100k/month free tier
- **Large game component** - bundlegame.svelte is large (consider splitting)

---

## 🧪 Testing Strategy

### Current Testing
- **Manual testing** - Dev test all changes locally
- **Production previews** - Vercel preview deployments
- **Firebase emulator** - (Optional) Test rules locally

### Future Improvements
- Add unit tests for `bundle.js` logic
- Add E2E tests for critical flows
- Automated testing in CI/CD

---

## 🔮 Future Considerations

### Scalability
- **Current**: Handles 100s of users easily
- **Limits**: Firebase free tier (50k operations/day)
- **Scaling**: Upgrade to Firebase paid plan if needed

### Feature Expansion
- **Admin dashboard** - UI for config management
- **Real-time analytics** - Live participant tracking
- **A/B testing** - Multiple experiment conditions
- **Export formats** - CSV, Excel, etc.

---

## 📞 Related Documentation

- **Code structure**: [CODEMAP.md](CODEMAP.md)
- **File details**: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
- **Configuration**: docs/configuration/OVERVIEW.md

---

*For questions about architecture, contact Nicholas Chen: nchen06@berkeley.edu*
