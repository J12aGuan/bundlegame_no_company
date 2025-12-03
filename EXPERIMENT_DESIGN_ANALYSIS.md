# Experiment Design Analysis: 20-Round Order Sequence

## Overview
This document provides a comprehensive analysis of the 20-round experimental design for testing human decision-making with and without recommendations.

---

## 1. High-Level Structure

### Round Distribution
- **Total Rounds**: 20
- **Orders per Round**: 4 (per city)
- **Total Orders**: 80 unique orders

### City Rotation Pattern
| Round | City | Type |
|-------|------|------|
| 1, 5, 9, 13, 17 | Emeryville | Highest RPS |
| 2, 6, 10, 14, 18 | Berkeley | High RPS |
| 3, 7, 11, 15, 19 | Oakland | Medium RPS |
| 4, 8, 12, 16, 20 | Piedmont | Lowest RPS |

**Pattern**: E → B → O → P (repeats 5 times)

---

## 2. Experimental Phases

### Phase A: Baseline (Rounds 1-5)
- **No recommendations**
- Tests natural human bundling behavior
- Includes all three optimal scenarios (1-order, 2-order, 3-order)

### Phase B: Assisted (Rounds 6-15)
- **Recommendations active** (⭐ marks recommended orders)
- System always recommends exactly 2 orders
- Tests three alignment conditions:
  - **aligned**: Recommended bundle IS optimal
  - **rec2_opt1**: Recommends 2, but 1 order is optimal (misleading)
  - **rec2_opt3**: Recommends 2, but 3-order bundle is optimal (underrecommending)

### Phase C: Transfer (Rounds 16-20)
- **No recommendations again**
- Tests learning transfer from assisted phase
- Checks if users learned optimal strategies

---

## 3. City Revenue Analysis

### Average Optimal Revenue Per Second (RPS)

| Rank | City | Avg Optimal RPS | Rounds | Strategy |
|------|------|-----------------|--------|----------|
| 1 | **Emeryville** | **2.419 $/s** | 1, 5, 9, 13, 17 | Highest rewards, users should prioritize |
| 2 | **Berkeley** | **2.042 $/s** | 2, 6, 10, 14, 18 | Strong second choice |
| 3 | **Oakland** | **1.690 $/s** | 3, 7, 11, 15, 19 | Medium value |
| 4 | **Piedmont** | **1.489 $/s** | 4, 8, 12, 16, 20 | Lowest value |

### Key Insights:
- **Emeryville** is 62% more profitable than **Piedmont** per second
- **Emeryville** is 43% more profitable than **Oakland**
- Users who discover this can strategically swap cities for maximum earnings
- City-swapping behavior can indicate strategic learning

---

## 4. Optimal Bundle Size Distribution

### Per City Breakdown

| City | 1-Order Optimal | 2-Order Optimal | 3-Order Optimal |
|------|-----------------|-----------------|-----------------|
| Emeryville | 2 rounds (1, 13) | 2 rounds (5, 17) | 1 round (9) |
| Berkeley | 1 round (6) | 2 rounds (2, 14) | 2 rounds (10, 18) |
| Oakland | 2 rounds (11, 19) | 1 round (7) | 2 rounds (3, 15) |
| Piedmont | 1 round (4) | 2 rounds (12, 16) | 2 rounds (8, 20) |

### Across All Phases

| Phase | 1-Order Optimal | 2-Order Optimal | 3-Order Optimal |
|-------|-----------------|-----------------|-----------------|
| Baseline (1-5) | 2 rounds | 2 rounds | 1 round |
| Assisted (6-15) | 3 rounds | 3 rounds | 4 rounds |
| Transfer (16-20) | 1 round | 2 rounds | 2 rounds |
| **Total** | **6 rounds** | **7 rounds** | **7 rounds** |

**Balanced distribution** across all three strategies.

---

## 5. Recommendation Analysis (Phase B: Rounds 6-15)

### Alignment Types

| Type | Description | Rounds | Count |
|------|-------------|--------|-------|
| **aligned** | Rec matches optimal (2=2) | 7, 12, 14 | 3 |
| **rec2_opt1** | Rec says 2, optimal is 1 (misleading) | 6, 11, 13 | 3 |
| **rec2_opt3** | Rec says 2, optimal is 3 (under-rec) | 8, 9, 10, 15 | 4 |

### Key Research Questions:
1. **Trust**: Do users follow recommendations even when suboptimal?
2. **Exploration**: Do users test 3-order bundles despite 2-order recommendation?
3. **Learning**: Can users identify when recommendations are wrong?
4. **Transfer**: Does assisted phase improve performance in transfer phase?

---

## 6. Detailed Round-by-Round Breakdown

### Round 1 (Emeryville, Baseline)
- **Optimal**: 1 order (R1_A)
- **Earnings**: $91 in 38s = **2.395 $/s**
- **Why 1 is best**: Other orders span many aisles with poor overlap
- **Recommendation**: None

### Round 2 (Berkeley, Baseline)
- **Optimal**: 2 orders (R2_A + R2_B)
- **Earnings**: $197 in 98.6s = **1.998 $/s**
- **Why 2 is best**: Good aisle overlap (A=1|8, B=3), efficient bundling
- **Recommendation**: None

### Round 3 (Oakland, Baseline)
- **Optimal**: 3 orders (R3_A + R3_B + R3_C)
- **Earnings**: $354 in 202.3s = **1.75 $/s**
- **Why 3 is best**: All three share multiple aisles, maximize bundling efficiency
- **Recommendation**: None

### Round 4 (Piedmont, Baseline)
- **Optimal**: 1 order (R4_A)
- **Earnings**: $110 in 76s = **1.447 $/s**
- **Why 1 is best**: Low overlap, time cost outweighs bundling benefits
- **Recommendation**: None

### Round 5 (Emeryville, Baseline)
- **Optimal**: 2 orders (R5_A + R5_B)
- **Earnings**: $215 in 89.6s = **2.4 $/s**
- **Why 2 is best**: Moderate overlap (A=2|5, B=1|4|6), good efficiency
- **Recommendation**: None

---

### Round 6 (Berkeley, **Assisted - rec2_opt1**)
- **Optimal**: 1 order (R6_A)
- **Earnings**: $142 in 71s = **2.0 $/s**
- **Recommendation**: ⭐R6_A + ⭐R6_B (2 orders)
- **Conflict**: System recommends 2, but 1 is actually better
- **Test**: Will users trust the system or explore alternatives?

### Round 7 (Oakland, **Assisted - aligned**)
- **Optimal**: 2 orders (R7_A + R7_B)
- **Earnings**: $215 in 129.2s = **1.664 $/s**
- **Recommendation**: ⭐R7_A + ⭐R7_B (2 orders)
- **Alignment**: System is correct!
- **Builds trust** in recommendations

### Round 8 (Piedmont, **Assisted - rec2_opt3**)
- **Optimal**: 3 orders (R8_A + R8_B + R8_C)
- **Earnings**: $303 in 182.6s = **1.659 $/s**
- **Recommendation**: ⭐R8_A + ⭐R8_B (only 2 orders)
- **Conflict**: System under-recommends, missing R8_C
- **Test**: Will users explore beyond recommendation?

### Round 9 (Emeryville, **Assisted - rec2_opt3**)
- **Optimal**: 3 orders (R9_A + R9_B + R9_C)
- **Earnings**: $278 in 111.2s = **2.5 $/s** (BEST RPS!)
- **Recommendation**: ⭐R9_A + ⭐R9_B
- **Conflict**: System misses the BEST combo
- **High stakes**: Missing R9_C loses significant RPS

### Round 10 (Berkeley, **Assisted - rec2_opt3**)
- **Optimal**: 3 orders (R10_A + R10_B + R10_C)
- **Earnings**: $322 in 140.8s = **2.287 $/s**
- **Recommendation**: ⭐R10_A + ⭐R10_B
- **Conflict**: Another under-recommendation
- **Pattern**: Users may notice system often under-recommends

### Round 11 (Oakland, **Assisted - rec2_opt1**)
- **Optimal**: 1 order (R11_A)
- **Earnings**: $136 in 80s = **1.7 $/s**
- **Recommendation**: ⭐R11_A + ⭐R11_B
- **Conflict**: System over-recommends
- **High-value single**: R11_A alone is best

### Round 12 (Piedmont, **Assisted - aligned**)
- **Optimal**: 2 orders (R12_A + R12_B)
- **Earnings**: $217 in 147.2s = **1.474 $/s**
- **Recommendation**: ⭐R12_A + ⭐R12_B
- **Alignment**: Correct again!

### Round 13 (Emeryville, **Assisted - rec2_opt1**)
- **Optimal**: 1 order (R13_A)
- **Earnings**: $108 in 45s = **2.4 $/s**
- **Recommendation**: ⭐R13_A + ⭐R13_B
- **Conflict**: System adds unnecessary R13_B
- **Fast single**: R13_A is very efficient alone

### Round 14 (Berkeley, **Assisted - aligned**)
- **Optimal**: 2 orders (R14_A + R14_B)
- **Earnings**: $238 in 109.4s = **2.176 $/s**
- **Recommendation**: ⭐R14_A + ⭐R14_B
- **Alignment**: Correct!

### Round 15 (Oakland, **Assisted - rec2_opt3**)
- **Optimal**: 3 orders (R15_A + R15_B + R15_C)
- **Earnings**: $354 in 194s = **1.825 $/s**
- **Recommendation**: ⭐R15_A + ⭐R15_B
- **Conflict**: Final test of exploration behavior

---

### Round 16 (Piedmont, Transfer)
- **Optimal**: 2 orders (R16_A + R16_B)
- **Earnings**: $216 in 148.7s = **1.453 $/s**
- **Recommendation**: None
- **Test**: Did users learn to identify 2-order scenarios?

### Round 17 (Emeryville, Transfer)
- **Optimal**: 2 orders (R17_A + R17_B)
- **Earnings**: $258 in 109.7s = **2.353 $/s**
- **Recommendation**: None
- **Test**: Performance without system help

### Round 18 (Berkeley, Transfer)
- **Optimal**: 3 orders (R18_A + R18_B + R18_C)
- **Earnings**: $353 in 168.5s = **2.095 $/s**
- **Recommendation**: None
- **Test**: Can users identify large bundles without prompting?

### Round 19 (Oakland, Transfer)
- **Optimal**: 1 order (R19_A)
- **Earnings**: $179 in 97s = **1.845 $/s** (high-value single)
- **Recommendation**: None
- **Test**: Do users recognize when NOT to bundle?

### Round 20 (Piedmont, Transfer)
- **Optimal**: 3 orders (R20_A + R20_B + R20_C)
- **Earnings**: $259 in 167s = **1.551 $/s**
- **Recommendation**: None
- **Final test**: Full 3-order bundle without help

---

## 7. Implementation Notes

### UI Requirements
1. **Star indicator (⭐)** on recommended orders (rounds 6-15)
2. **Clear earnings display** for each order
3. **Bundling interface** allowing 1-3 order selection
4. **City information** showing current location
5. **Round counter** (1-20)
6. **Total earnings tracker**

### Backend Logic Needed
1. **Order loading** from `experiment_orders.json`
2. **Round progression** (automatic city rotation)
3. **Bundle calculation** (time + earnings for selected orders)
4. **Aisle overlap logic** (affects completion time)
5. **Recommendation display** (conditional on phase)
6. **Performance tracking** (RPS calculation)

### Data Logging Requirements
Log for each round:
- Round number
- City
- Phase (baseline/assisted/transfer)
- Orders available (all 4)
- Orders recommended (if any)
- Orders selected by user
- Bundle size chosen
- Time taken
- Earnings achieved
- Optimal bundle (for comparison)
- Optimal RPS
- Actual RPS achieved
- Recommendation type (aligned/rec2_opt1/rec2_opt3)
- Whether user followed recommendation (if applicable)

---

## 8. Analysis Metrics

### Primary Metrics
1. **RPS Efficiency**: Actual RPS / Optimal RPS
2. **Recommendation Compliance**: % rounds user followed recommendations
3. **Exploration Rate**: % rounds user tried non-recommended bundles
4. **Learning Transfer**: Performance improvement from Phase A → C

### Secondary Metrics
1. **City Preference**: Time spent in each city
2. **Bundle Size Preference**: Distribution of 1/2/3 order selections
3. **Trust Decay**: Compliance rate over time in Phase B
4. **Optimal Discovery**: % rounds user found optimal solution

### Advanced Analysis
1. **Aligned vs Misaligned**: Performance difference when rec is correct/wrong
2. **Over-trust**: Following rec2_opt1 recommendations
3. **Under-exploration**: Missing rec2_opt3 opportunities
4. **Strategic Learning**: City-swapping patterns

---

## 9. Expected Results

### Hypotheses

**H1: Recommendation Effect**
- Users will achieve higher RPS in Phase B vs Phase A
- But not optimal due to misleading recommendations

**H2: Trust Patterns**
- Initial high compliance with recommendations
- Trust decreases as users notice misalignment
- Some users may over-trust throughout

**H3: Exploration Deficit**
- Most users won't try 3-order bundles in rec2_opt3 scenarios
- System under-recommendations will hurt performance

**H4: Learning Transfer**
- Users who explored in Phase B will perform better in Phase C
- Users who blindly followed recommendations will struggle in Phase C

**H5: City Discovery**
- Few users will discover Emeryville's superiority early
- Strategic users will stay in Emeryville after discovery

---

## 10. Files Created

### `/src/lib/configs/experiment_orders.json`
Complete order data structure with:
- All 80 orders (20 rounds × 4 orders)
- Earnings, time, aisles, travel time for each
- Recommendation flags for Phase B
- Metadata with optimal scenarios
- City statistics

### Usage:
```javascript
import experimentOrders from '$lib/configs/experiment_orders.json';

// Get orders for current round
const currentRoundOrders = experimentOrders.orders.filter(
  order => order.round === currentRound
);

// Check if recommendation phase
const currentRound = 8;
const isRecommendationPhase = currentRound >= 6 && currentRound <= 15;

// Get recommended orders
const recommendedOrders = currentRoundOrders.filter(
  order => order.recommended
);

// Get optimal scenario for analytics
const optimalInfo = experimentOrders.metadata.optimal_scenarios[`round_${currentRound}`];
console.log(`Optimal: ${optimalInfo.optimal_combo} with RPS ${optimalInfo.optimal_rps}`);
```

---

## 11. Next Steps for Implementation

1. **Modify home.svelte**:
   - Load orders from `experiment_orders.json` instead of random generation
   - Display ⭐ for recommended orders in Phase B
   - Show round counter (1-20)
   - Add city-swapping option with travel time

2. **Update bundlegame.svelte**:
   - Calculate bundle time based on aisle overlap
   - Track actual RPS vs optimal RPS
   - Log recommendation compliance

3. **Create analytics dashboard**:
   - Show participant's RPS per round
   - Compare to optimal solution
   - Visualize trust patterns
   - Highlight learning trajectory

4. **Add config toggle**:
   - Enable/disable recommendation system
   - For A/B testing between full-rec vs no-rec groups

---

## 12. Success Criteria

### For Participants:
- Completing all 20 rounds
- Earning > 50% of optimal total
- Demonstrating strategy evolution

### For Researchers:
- Clean data for all metrics
- Statistically significant patterns
- Insights into human-AI collaboration
- Generalizeable findings

---

**Document Version**: 1.0
**Last Updated**: December 2, 2025
**Data Source**: `experiment_orders.json`
