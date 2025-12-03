# 📊 20-Round Experiment Order System - Complete Package

## ✅ What Has Been Created

### 1. Core Data Files

#### `/src/lib/configs/experiment_orders.json` (PRODUCTION READY)
- **80 unique orders** across 20 rounds
- **Complete order specifications**: earnings, time, aisles, items, recommendations
- **Metadata structure**: optimal scenarios, city statistics, phase definitions
- **Validated**: All data structure checks passed ✓

#### `/experiment_scenario_table.csv`
- Quick reference table for all 20 rounds
- Shows optimal solutions, earnings, time, RPS
- Indicates recommendation alignment types
- Import into Excel/Google Sheets for analysis

#### `/experiment_order_details.csv`
- All 80 individual order specifications
- Use for data analysis, visualization, documentation

---

## 📚 Documentation Files

### 1. `/EXPERIMENT_DESIGN_ANALYSIS.md`
**Comprehensive research design document including:**
- Round-by-round detailed breakdown
- Experimental phases explanation
- Hypothesis testing framework
- Implementation requirements
- Expected results and research questions

### 2. `/CITY_PERFORMANCE_ANALYSIS.md`
**City revenue analysis including:**
- RPS hierarchy (Emeryville → Berkeley → Oakland → Piedmont)
- Performance gaps between cities
- Strategic implications for players
- City-swapping economics
- Expected player behavior types

### 3. `/DEVELOPER_QUICK_REFERENCE.md`
**Implementation guide including:**
- Code snippets for order loading
- UI requirements (star indicators, bundle interface)
- Data logging specifications
- Testing scenarios
- Analytics dashboard requirements

---

## 🛠️ Validation Tools

### `/validate_experiment_orders.py`
**Python validation script that checks:**
- Data structure integrity
- City rotation pattern
- Recommendation placement
- Bundle size distribution
- Earnings and time distributions

**Run it:** `python3 validate_experiment_orders.py`

**Validation Results: ✅ ALL TESTS PASSED**

---

## 📊 Key Experiment Metrics

### City Performance (Optimal RPS)
| Rank | City | Avg RPS | vs Emeryville |
|------|------|---------|---------------|
| 🥇 | **Emeryville** | **2.419 $/s** | — |
| 🥈 | Berkeley | 2.042 $/s | -18.5% |
| 🥉 | Oakland | 1.690 $/s | -43.1% |
| 4 | Piedmont | 1.489 $/s | -62.5% |

### Experimental Phases
- **Rounds 1-5 (Baseline)**: No recommendations, natural behavior
- **Rounds 6-15 (Assisted)**: ⭐ System recommends 2 orders per round
- **Rounds 16-20 (Transfer)**: No recommendations, test learning

### Recommendation Alignment (Rounds 6-15)
- **3 rounds aligned**: System correct (rec=2, optimal=2)
- **3 rounds rec2_opt1**: System over-recommends (rec=2, optimal=1)
- **4 rounds rec2_opt3**: System under-recommends (rec=2, optimal=3)

### Bundle Size Distribution
- **6 rounds**: 1-order optimal (30%)
- **7 rounds**: 2-order optimal (35%)
- **7 rounds**: 3-order optimal (35%)

### Best Performance
- **Highest RPS**: Round 9 (Emeryville, 3-order bundle) = 2.500 $/s
- **Lowest RPS**: Round 4 (Piedmont, 1-order) = 1.447 $/s

---

## 🎯 Implementation Checklist

### Phase 1: Data Integration
- [ ] Import `experiment_orders.json` into game code
- [ ] Create `getRoundOrders(roundNum)` function
- [ ] Add round counter state (1-20)
- [ ] Test order loading for each round

### Phase 2: UI Updates
- [ ] Display ⭐ star indicator on recommended orders (rounds 6-15)
- [ ] Show round counter "Round X of 20"
- [ ] Display phase label (Baseline/Assisted/Transfer)
- [ ] Update order cards with earnings, time, aisles
- [ ] Add bundle selection interface (1-3 orders)

### Phase 3: Game Logic
- [ ] Implement aisle overlap calculation for bundle time
- [ ] Calculate actual RPS after round completion
- [ ] Auto-advance to next round after delivery
- [ ] Handle game completion after round 20

### Phase 4: Analytics & Logging
- [ ] Log each round's data to Firebase/Firestore:
  - Orders available, recommended, selected
  - Time taken, earnings achieved
  - Actual vs optimal RPS
  - Recommendation compliance (if applicable)
- [ ] Create end-game summary screen
- [ ] Display performance vs optimal solutions

### Phase 5: Testing
- [ ] Test all 20 rounds load correctly
- [ ] Verify stars appear only in rounds 6-15
- [ ] Test bundle time calculations
- [ ] Verify data logging works
- [ ] Test game completion flow

---

## 💡 Key Design Features

### 1. Revenue Hierarchy
**Emeryville is 62.5% more profitable than Piedmont**
- Strategic players will discover this
- Tests player exploration vs exploitation
- City-swapping behavior indicates learning

### 2. Recommendation Alignment Tests
**System is sometimes wrong on purpose:**
- **Over-recommending (rec2_opt1)**: Tests trust in AI
- **Under-recommending (rec2_opt3)**: Tests exploration beyond recommendations
- **Aligned**: Builds trust with correct recommendations

### 3. Three-Phase Learning Curve
1. **Baseline**: Establish natural behavior
2. **Assisted**: Provide (imperfect) guidance
3. **Transfer**: Test if learning sticks without help

### 4. Balanced Bundle Distribution
- Equal mix of 1, 2, and 3-order optimal scenarios
- Tests different optimization strategies
- Prevents pattern recognition gaming

---

## 📈 Research Questions This Enables

### Primary Questions
1. **Do humans trust imperfect AI recommendations?**
   - Measure compliance rate in Phase B
   - Track trust decay over time

2. **Can humans learn optimal bundling strategies?**
   - Compare Phase A vs Phase C performance
   - Look for efficiency improvements

3. **Do recommendations help or hurt learning?**
   - Compare assisted vs non-assisted groups
   - Measure Phase C performance differences

### Secondary Questions
4. **Do humans discover city efficiency differences?**
   - Track city preferences over time
   - Measure Emeryville discovery rate

5. **How do humans handle recommendation misalignment?**
   - Behavior in rec2_opt1 scenarios (over-trust)
   - Behavior in rec2_opt3 scenarios (under-exploration)

---

## 🚀 Quick Start Guide

### For Developers

1. **Load the data:**
```javascript
import experimentOrders from '$lib/configs/experiment_orders.json';

const currentRound = 1; // Track round number (1-20)
const roundOrders = experimentOrders.orders.filter(
  o => o.round === currentRound
);
```

2. **Show recommendations:**
```javascript
const isRecommendationPhase = currentRound >= 6 && currentRound <= 15;

// In UI: display ⭐ for orders where:
order.recommended === true && isRecommendationPhase
```

3. **Calculate performance:**
```javascript
const actualRPS = earnings / timeSeconds;
const optimalInfo = experimentOrders.metadata.optimal_scenarios[`round_${currentRound}`];
const efficiency = actualRPS / optimalInfo.optimal_rps;
```

### For Researchers

1. **Review design:** Read `EXPERIMENT_DESIGN_ANALYSIS.md`
2. **Check city stats:** Read `CITY_PERFORMANCE_ANALYSIS.md`
3. **Plan analysis:** Use CSV files for data structure planning
4. **Validate data:** Run `python3 validate_experiment_orders.py`

---

## 📊 Sample Data Structure

### Example Round 9 (Best RPS, rec2_opt3 test)

**Orders Available:**
- ⭐ R9_A: $97, 46s, aisles 1|2|5
- ⭐ R9_B: $95, 46s, aisles 2|4
- R9_C: $86, 41s, aisles 3|6|7
- R9_D: $78, 46s, aisles 5|7

**System Recommends:** R9_A + R9_B (2 orders)

**Actually Optimal:** R9_A + R9_B + R9_C (3 orders!)
- Earnings: $278
- Time: ~111s (with overlap)
- RPS: **2.500 $/s** (highest in game)

**Research Test:** Will users add R9_C despite no star?

---

## ⚠️ Important Implementation Notes

### Aisle Overlap Logic
You need to implement time savings for shared aisles:
```javascript
// Example logic (you'll need to refine this)
const calculateBundleTime = (orders) => {
  const baseTime = sum(orders.map(o => o.base_time_s));
  const allAisles = orders.flatMap(o => o.aisles.split('|'));
  const uniqueAisles = new Set(allAisles).size;
  const sharedAisles = allAisles.length - uniqueAisles;
  const timeSavings = sharedAisles * 5; // 5s saved per shared aisle
  return Math.max(baseTime - timeSavings, baseTime * 0.6); // Min 60% of base time
};
```

### Travel Time
- Add `travel_time_s` when entering store
- Add city-to-city travel if implementing city swapping
- Emeryville: 3s, Berkeley: 3s, Oakland: 4s, Piedmont: 4s

### Recommendation Display
- **Only show ⭐ in rounds 6-15**
- **Exactly 2 orders per round have `recommended: true`**
- Make stars visually prominent (yellow/gold color)

---

## 📁 File Summary

| File | Purpose | Status |
|------|---------|--------|
| `experiment_orders.json` | Production data | ✅ Ready |
| `experiment_scenario_table.csv` | Round summaries | ✅ Ready |
| `experiment_order_details.csv` | Order specifications | ✅ Ready |
| `EXPERIMENT_DESIGN_ANALYSIS.md` | Research design doc | ✅ Complete |
| `CITY_PERFORMANCE_ANALYSIS.md` | City revenue analysis | ✅ Complete |
| `DEVELOPER_QUICK_REFERENCE.md` | Implementation guide | ✅ Complete |
| `validate_experiment_orders.py` | Validation script | ✅ Working |
| `COMPLETE_PACKAGE_SUMMARY.md` | This file | ✅ Complete |

---

## 🎓 Expected Outcomes

### Hypothesis 1: Recommendation Effect
- **Prediction**: Phase B RPS will be higher than Phase A
- **But**: Not optimal due to misalignments
- **Measure**: Average RPS in each phase

### Hypothesis 2: Trust Calibration
- **Prediction**: High initial compliance, decreasing over time
- **Why**: Users notice misalignments
- **Measure**: Compliance rate by round in Phase B

### Hypothesis 3: Learning Transfer
- **Prediction**: Phase C > Phase A (if learning occurred)
- **But**: Only for users who explored in Phase B
- **Measure**: Performance improvement A → C

### Hypothesis 4: Exploration Deficit
- **Prediction**: Most users won't try 3-order bundles in rec2_opt3
- **Why**: Trust in system recommendations
- **Measure**: Bundle size choices in rounds 8, 9, 10, 15

### Hypothesis 5: City Discovery
- **Prediction**: Few users will discover Emeryville advantage
- **Why**: No explicit comparison provided
- **Measure**: City preference changes over time

---

## 🔬 Analysis Pipeline

### Data Collection (Per Round)
```javascript
{
  participant_id: "P001",
  round: 9,
  city: "Emeryville",
  phase: "assisted",
  orders_available: ["R9_A", "R9_B", "R9_C", "R9_D"],
  orders_recommended: ["R9_A", "R9_B"],
  orders_selected: ["R9_A", "R9_B"],
  bundle_size: 2,
  time_seconds: 95.3,
  earnings: 192,
  actual_rps: 2.014,
  optimal_combo: "R9_A+R9_B+R9_C",
  optimal_rps: 2.500,
  efficiency: 0.806,
  followed_recommendation: true,
  recommendation_type: "rec2_opt3"
}
```

### Aggregate Metrics
- Average efficiency by phase
- Recommendation compliance rate
- Optimal solution discovery rate
- City preference patterns
- Bundle size distributions
- Learning trajectory slopes

---

## 🏆 Success Metrics

### For Participants
- ✅ Complete all 20 rounds
- ✅ Earn > 50% of optimal total
- ✅ Show strategy evolution over time

### For Experiment
- ✅ Clean data collection for all metrics
- ✅ Statistically significant patterns emerge
- ✅ Clear insights into human-AI collaboration
- ✅ Publishable findings

---

## 📞 Next Actions

1. **Review all documentation** (you're doing this now!)
2. **Run validation script** to verify data integrity
3. **Begin implementation** following DEVELOPER_QUICK_REFERENCE.md
4. **Test thoroughly** with all 20 rounds
5. **Deploy** and start collecting data!

---

**Package Created**: December 2, 2025
**Validation Status**: ✅ All tests passed
**Ready for Implementation**: ✅ Yes

**Questions?** See individual documentation files for detailed information.

---

## 🙏 Acknowledgment

This experimental design balances:
- **Ecological validity** (realistic grocery shopping scenario)
- **Experimental control** (structured phases, controlled variations)
- **Research rigor** (balanced conditions, multiple measures)
- **Practical implementation** (realistic time/earnings, implementable in game)

Good luck with your experiment! 🎉
