# Experiment Design Documentation

## Research Overview

This experiment studies how delivery workers make bundling decisions with and without algorithmic recommendations.

## Experimental Design

### Three-Phase Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         50-ROUND EXPERIMENT                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  PHASE A (R1-15)    │  PHASE B (R16-35)   │  PHASE C (R36-50)               │
│  No Recommendations │  With Recommendations│  No Recommendations            │
│  Baseline Behavior  │  Optimal Shown       │  Post-Recommendation           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase Details

| Phase | Rounds | Orders with `recommended: true` | Research Question |
|-------|--------|--------------------------------|-------------------|
| A | 1-15 | 0 | How do players bundle without guidance? |
| B | 16-35 | 2 per round | Do players follow optimal recommendations? |
| C | 36-50 | 0 | Does learning persist after recommendations removed? |

## Scenario Types

Each round presents 4 orders. The **optimal bundle** varies:

### Type 1: Single High-Value Order (Bundle Size = 1)
- **Efficiency**: 1.8 $/s
- **Total Time**: 10s (4s travel + 2s base + 2×2s for 2 aisles)
- **Earnings**: $18

**Scenario**: Order A has $18 earnings with only 2 aisles. Bundling with low-value orders ($4 each) adds time but proportionally less earnings.

### Type 2: Overlapping Duo (Bundle Size = 2)  
- **Efficiency**: 1.667 $/s
- **Total Time**: 12s (4s travel + 2s base + 3×2s for 3 unique aisles)
- **Earnings**: $20

**Scenario**: Two $10 orders share aisles [1,2] and [1,2,3]. Combined, only 3 unique aisles. Adding a third order hurts efficiency.

### Type 3: Chain Triple (Bundle Size = 3)
- **Efficiency**: 3.071 $/s
- **Total Time**: 14s (4s travel + 2s base + 4×2s for 4 unique aisles)  
- **Earnings**: $43

**Scenario**: Three orders with sequential aisle overlap: [1,2], [2,3], [3,4]. Only 4 unique aisles for $15+$14+$14 earnings.

## Round Distribution

| Rounds | Scenario Type | Optimal Size | Cities (rotating) |
|--------|--------------|--------------|-------------------|
| 1-5 | Single High | 1 | Emeryville → Berkeley → Oakland → Piedmont → Emeryville |
| 6-10 | Overlap Duo | 2 | Berkeley → Oakland → Piedmont → Emeryville → Berkeley |
| 11-15 | Chain Triple | 3 | Oakland → Piedmont → Emeryville → Berkeley → Oakland |
| 16-20 | Mixed | 1-2 | Piedmont → Emeryville → Berkeley → Oakland → Piedmont |
| 21-25 | Mixed | 1-2 | Emeryville → Berkeley → Oakland → Piedmont → Emeryville |
| 26-30 | Mixed | 1-3 | Berkeley → Oakland → Piedmont → Emeryville → Berkeley |
| 31-35 | Chain Triple | 3 | Oakland → Piedmont → Emeryville → Berkeley → Oakland |
| 36-40 | Single High | 1 | Piedmont → Emeryville → Berkeley → Oakland → Piedmont |
| 41-45 | Overlap Duo | 2 | Emeryville → Berkeley → Oakland → Piedmont → Emeryville |
| 46-50 | Chain Triple | 3 | Berkeley → Oakland → Piedmont → Emeryville → Berkeley |

## Time Calculation Formula

```
Total Time = travel_time + base_store_time + (unique_aisles × per_aisle_time)
           = 4s + 2s + (aisles × 2s)
```

**Efficiency** = Total Earnings / Total Time ($/s)

## Store & City Mapping

| Store | City |
|-------|------|
| Target | Emeryville |
| Berkeley Bowl | Berkeley |
| Sprouts Farmers Market | Oakland |
| Safeway | Piedmont |

## Phase B Recommendations

In rounds 16-35, two orders are marked with `"recommended": true`. These form the **optimal bundle** for that round.

**Important**: In some rounds (e.g., 24-29), recommendations mark orders that DON'T form the true optimal. This tests whether players blindly follow recommendations or think critically.

### Recommendation Accuracy by Round

| Rounds | Recommendation Quality |
|--------|----------------------|
| 16-23 | ✅ Optimal (true optimal bundle) |
| 24-29 | ⚠️ Sub-optimal (marked orders form worse bundle) |
| 30-35 | ✅ Optimal (true optimal bundle) |

## Key Metrics to Collect

1. **Bundle Composition**: Which orders did player select?
2. **Match Rate**: Did selection match optimal bundle?
3. **Efficiency Achieved**: Actual $/s vs optimal $/s
4. **Recommendation Compliance** (Phase B): Did player follow marked orders?
5. **Learning Transfer** (Phase C): Does Phase C efficiency improve vs Phase A?

## Data Analysis Questions

1. **Baseline Behavior (Phase A)**
   - Do players naturally gravitate toward larger bundles?
   - How often do they accidentally find optimal bundles?

2. **Recommendation Impact (Phase B)**
   - Compliance rate with recommendations
   - Difference in behavior when recommendations are optimal vs sub-optimal
   
3. **Learning Persistence (Phase C)**
   - Efficiency improvement from Phase A to Phase C
   - Whether players internalize optimal strategies

## File Reference

- **Experiment Data**: `src/lib/bundle_experiment_50_rounds_short_times.json`
- **Core Game Logic**: `src/lib/bundle.js`
- **Quick Reference**: `experiment_reference.csv` (in project root)
- **Visual Reference**: `experiment_reference_table.html` (open in browser)

## JSON Schema

```json
{
  "round": 1,
  "phase": "A",
  "scenario_id": "A01",
  "max_bundle": 3,
  "store_travel_time_s": 4,
  "base_store_time_s": 2,
  "per_aisle_time_s": 2,
  "orders": [
    {
      "id": "R1_A",
      "store": "Target",
      "city": "Emeryville",
      "earnings": 18,
      "aisles": [1, 2],
      "travel_time_s": 4,
      "recommended": false
    }
  ],
  "optimal": {
    "combo": ["R1_A"],
    "bundle_size": 1,
    "efficiency_earnings_per_s": 1.8,
    "total_time_s": 10,
    "total_earnings": 18,
    "num_aisles": 2
  },
  "second_best": {
    "combo": ["R1_A", "R1_C", "R1_D"],
    "bundle_size": 3,
    "efficiency_earnings_per_s": 1.444,
    "total_time_s": 18,
    "total_earnings": 26,
    "num_aisles": 6
  }
}
```
