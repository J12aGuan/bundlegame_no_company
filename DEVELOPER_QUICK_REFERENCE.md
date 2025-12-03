# Quick Reference: Experiment Order System

## 📁 Files Created

1. **`/src/lib/configs/experiment_orders.json`**
   - Complete order data (80 orders for 20 rounds)
   - Includes metadata and optimal scenarios
   - Ready for production use

2. **`/experiment_scenario_table.csv`**
   - Quick reference for each round's optimal solution
   - Shows recommendation alignment types
   - Great for data analysis

3. **`/experiment_order_details.csv`**
   - All 80 individual order specifications
   - Earnings, time, aisles, recommendations
   - Import into Excel/Google Sheets

4. **`/EXPERIMENT_DESIGN_ANALYSIS.md`**
   - Comprehensive design document
   - Round-by-round breakdown
   - Implementation notes

5. **`/CITY_PERFORMANCE_ANALYSIS.md`**
   - City revenue analysis
   - Strategic insights
   - Research questions

---

## 🎯 Key Design Features

### City RPS Hierarchy (Highest to Lowest)
1. **Emeryville**: 2.419 $/s ⭐
2. **Berkeley**: 2.042 $/s
3. **Oakland**: 1.690 $/s
4. **Piedmont**: 1.489 $/s

### Phases
- **Rounds 1-5**: No recommendations (baseline)
- **Rounds 6-15**: Recommendations with ⭐ (assisted)
- **Rounds 16-20**: No recommendations (transfer)

### Recommendation Types in Phase B
- **aligned** (3 rounds): System is correct
- **rec2_opt1** (3 rounds): System over-recommends
- **rec2_opt3** (4 rounds): System under-recommends

---

## 💻 Implementation Checklist

### Step 1: Load Order Data
```javascript
import experimentOrders from '$lib/configs/experiment_orders.json';

// Get current round's orders
const getRoundOrders = (roundNum) => {
  return experimentOrders.orders.filter(o => o.round === roundNum);
};
```

### Step 2: Display Recommendations (Rounds 6-15)
```javascript
const isRecommendationPhase = (round) => round >= 6 && round <= 15;

// In UI: show ⭐ for orders where recommended === true
```

### Step 3: Calculate Bundle Time
```javascript
// You'll need to implement aisle overlap logic
// Orders sharing aisles take less time to complete together
// Example: R1_A (aisles: 1|5) + R1_B (aisles: 1|3|6)
// Shared aisle: 1 → time savings
```

### Step 4: Track Performance
```javascript
const calculateRPS = (earnings, timeInSeconds) => {
  return earnings / timeInSeconds;
};

// Compare to optimal
const optimalInfo = experimentOrders.metadata.optimal_scenarios[`round_${currentRound}`];
const efficiency = actualRPS / optimalInfo.optimal_rps;
```

### Step 5: Log Data
```javascript
// For each round, log:
{
  round: 1,
  city: "Emeryville",
  phase: "baseline",
  ordersAvailable: ["R1_A", "R1_B", "R1_C", "R1_D"],
  ordersRecommended: [], // or ["R6_A", "R6_B"] in phase B
  ordersSelected: ["R1_A"], // user's choice
  bundleSize: 1,
  timeCompleted: 38.5,
  earningsAchieved: 91,
  actualRPS: 2.36,
  optimalCombo: "R1_A",
  optimalRPS: 2.395,
  efficiency: 0.985,
  followedRecommendation: null // or true/false in phase B
}
```

---

## 🎨 UI Requirements

### Order Card Display
```
┌─────────────────────────────┐
│ ⭐ Order A                   │ ← Star only in rounds 6-15 if recommended
│ Earnings: $142              │
│ Time: ~71s                  │
│ Aisles: 2, 3                │
│ Items: 6 items              │
│                             │
│ [Select] [Details]          │
└─────────────────────────────┘
```

### Round Info Display
```
Round 9 of 20
City: Emeryville
Phase: Assisted (Recommendations Active)

💡 Tip: ⭐ indicates system-recommended orders
```

### Bundle Summary
```
Selected Bundle:
✓ Order A ($142, 71s)
✓ Order B ($81, 45s)

Estimated Total: $223
Estimated Time: ~98s (accounting for aisle overlap)
Expected RPS: ~2.27 $/s

[Confirm Bundle] [Modify Selection]
```

---

## 📊 Analytics Dashboard

### Metrics to Display

**Overall Performance**
- Total earnings: $XXX / $4,105 possible (X%)
- Average RPS: X.XX $/s
- Efficiency vs optimal: XX%

**By Phase**
- Baseline (1-5): RPS, efficiency
- Assisted (6-15): RPS, efficiency, recommendation compliance
- Transfer (16-20): RPS, efficiency

**By City**
- Emeryville: X rounds, $XXX earned, X.XX RPS
- Berkeley: ...
- Oakland: ...
- Piedmont: ...

**Learning Indicators**
- Optimal bundle found: X/20 rounds
- Recommendation compliance: X/10 rounds
- Exploration rate: X% (tried non-recommended bundles)
- City preference: Most time in [City]

---

## 🧪 Testing Scenarios

### Test 1: Baseline Phase (Round 1)
- **Expected**: 4 orders shown, no ⭐
- **Optimal**: Select R1_A only
- **Result**: $91, 38s, 2.395 RPS

### Test 2: Recommendation Phase - Aligned (Round 7)
- **Expected**: R7_A and R7_B have ⭐
- **Optimal**: Select both R7_A + R7_B
- **Result**: $215, 129.2s, 1.664 RPS

### Test 3: Recommendation Phase - Misleading (Round 6)
- **Expected**: R6_A and R6_B have ⭐
- **Optimal**: Select ONLY R6_A (ignore R6_B)
- **Result**: $142, 71s, 2.0 RPS
- **Test**: Does user follow stars or explore?

### Test 4: Recommendation Phase - Under-rec (Round 9)
- **Expected**: R9_A and R9_B have ⭐
- **Optimal**: Select R9_A + R9_B + R9_C (all 3!)
- **Result**: $278, 111.2s, 2.5 RPS (BEST!)
- **Test**: Does user add 3rd order?

### Test 5: Transfer Phase (Round 17)
- **Expected**: No ⭐, back to self-directed
- **Optimal**: R17_A + R17_B
- **Result**: $258, 109.7s, 2.353 RPS
- **Test**: Did user learn optimal strategies?

---

## 🚀 Deployment Steps

1. **Replace order generation logic** in `home.svelte`:
   - Remove random order creation
   - Load from `experiment_orders.json` based on round number
   
2. **Add round counter** (1-20):
   - Store in `$currentRound` or similar
   - Increment after each completion
   
3. **Implement star system**:
   - Check `order.recommended === true`
   - Display ⭐ in UI
   - Only active in rounds 6-15

4. **Update bundling logic**:
   - Calculate time based on aisle overlap
   - More shared aisles = less time penalty
   
5. **Add analytics logging**:
   - Firebase/Firestore for each round completion
   - Include all metrics listed above

6. **Create end-game summary**:
   - Show performance breakdown
   - Compare to optimal solutions
   - Highlight learning patterns

---

## 🔍 Data Analysis Queries

### Query 1: Recommendation Compliance
```javascript
// What % of users followed recommendations?
const complianceRate = rounds.filter(r => 
  r.phase === 'assisted' && r.followedRecommendation
).length / 10;
```

### Query 2: Optimal Discovery
```javascript
// How many rounds did user find optimal solution?
const optimalRounds = rounds.filter(r => 
  r.ordersSelected.sort().join('+') === r.optimalCombo
).length;
```

### Query 3: Learning Transfer
```javascript
// Did performance improve from baseline to transfer?
const baselineAvgRPS = mean(rounds.filter(r => r.phase === 'baseline').map(r => r.actualRPS));
const transferAvgRPS = mean(rounds.filter(r => r.phase === 'transfer').map(r => r.actualRPS));
const improvement = (transferAvgRPS - baselineAvgRPS) / baselineAvgRPS;
```

### Query 4: City Preference
```javascript
// Which city did user spend most time in?
const cityTimes = groupBy(rounds, 'city').map(city => ({
  city: city.name,
  totalTime: sum(city.rounds.map(r => r.timeCompleted))
}));
```

---

## ⚠️ Important Notes

1. **Aisle Overlap Logic**: You'll need to implement how shared aisles reduce time. Suggested formula:
   ```
   totalTime = sum(order.base_time_s) - (sharedAisles * timeReduction)
   ```

2. **Travel Time**: Add `travel_time_s` when entering store or switching cities

3. **Recommendation Stars**: Only show in rounds 6-15, and ONLY on orders where `recommended === true`

4. **Round Completion**: Auto-advance to next round after delivery/skip

5. **Game End**: After round 20, show comprehensive results screen

---

## 📈 Expected Results

### Hypothesis Testing

**H1: Recommendation Effect**
- Phase B should have higher RPS than Phase A
- But not optimal due to misalignments

**H2: Trust vs Exploration**
- Early rounds: high compliance (70-80%)
- Later rounds: decreased trust (40-60%)
- Curious users explore more

**H3: Learning Transfer**
- Phase C should show improvement vs Phase A
- Users who explored in Phase B do better in Phase C

**H4: City Discovery**
- <30% of users will discover Emeryville advantage
- Strategic users will want to stay there

---

## 🎓 Research Contributions

This design enables studying:
1. Human-AI collaboration under uncertainty
2. Trust calibration with imperfect recommenders
3. Learning transfer in optimization tasks
4. Exploration vs exploitation strategies
5. Strategic city selection behavior

---

**Quick Start**: Import `experiment_orders.json` → Display orders for currentRound → Show ⭐ for recommended → Calculate bundle time → Log performance → Advance to next round

**Questions?** See `EXPERIMENT_DESIGN_ANALYSIS.md` for detailed breakdown.
