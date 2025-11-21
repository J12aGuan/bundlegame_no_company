# 50-Round Experiment Developer Reference

This directory contains developer-only reference tools for the 50-round bundling experiment. **These are not visible to users** and should be used for experiment design validation and data analysis.

## 📊 Reference Files

### 1. `experiment_reference_table.html`
**Beautiful interactive visual table for experiment overview**

**How to use:**
```bash
# From project root
open experiment_reference_table.html
# or on Linux: xdg-open experiment_reference_table.html
```

**Features:**
- ✨ Color-coded phases (A: Baseline, B: Recommendations, C: Post-Rec)
- 🎯 Optimal strategy for each round (1, 2, or 3 orders)
- ⭐ Shows which orders have recommendation stars
- 📈 Displays earnings, time, and efficiency metrics
- ⚖️ Alignment indicators (Aligned vs Misaligned scenarios)
- 🎨 Modern UI with badges, hover effects, and organized sections
- 🖨️ Print-friendly layout

**What you see:**
- **Phase A (Rounds 1-15):** Baseline behavior without recommendations
- **Phase B (Rounds 16-35):** System shows stars on 2 orders per round
  - Aligned: Stars match optimal choice
  - Misaligned: Stars suggest wrong bundle size
- **Phase C (Rounds 36-50):** Post-recommendation, tests lasting effects

### 2. `experiment_reference.csv`
**Quick data file for analysis in Excel, Google Sheets, or Python**

**Columns:**
- `Round` - Round number (1-50)
- `Phase` - A, B, or C
- `Scenario_ID` - Unique ID (e.g., A01, B16, C36)
- `Store` - Store name (Target, Berkeley Bowl, etc.)
- `City` - City name
- `Optimal_Bundle_Size` - 1, 2, or 3 orders
- `Optimal_Combo` - Order IDs (e.g., "R1_A+R1_B")
- `Optimal_Earnings` - Total $ for optimal choice
- `Optimal_Time_s` - Time in seconds
- `Optimal_Efficiency` - $/second
- `Has_Recommendations` - Yes/No
- `Recommended_Orders` - Which orders have stars
- `Alignment` - Aligned, Rec2_Opt1, Rec2_Opt3, or N/A
- `Second_Best_Size` - Bundle size of 2nd best option
- `Second_Best_Efficiency` - $/second of 2nd best

**Analysis examples:**

```python
# Python/Pandas
import pandas as pd
df = pd.read_csv('experiment_reference.csv')

# Compare phases
df.groupby('Phase')['Optimal_Bundle_Size'].value_counts()

# Alignment analysis
phase_b = df[df['Phase'] == 'B']
phase_b['Alignment'].value_counts()

# Efficiency by bundle size
df.groupby('Optimal_Bundle_Size')['Optimal_Efficiency'].mean()
```

```r
# R
library(dplyr)
df <- read.csv('experiment_reference.csv')

# Phase comparison
df %>% group_by(Phase, Optimal_Bundle_Size) %>% summarise(count = n())

# Recommendation effectiveness
df %>% filter(Phase == 'B') %>% group_by(Alignment) %>% summarise(avg_eff = mean(Optimal_Efficiency))
```

## 🎯 Experiment Structure Quick Reference

### Phase A: Baseline (Rounds 1-15)
**No recommendations** - Establish baseline bundling behavior

| Rounds | Archetype | Optimal | Test Purpose |
|--------|-----------|---------|--------------|
| 1-5 | opt1 | 1 order | Single order best, bundling hurts efficiency |
| 6-10 | opt2 | 2 orders | Pair bundling optimal |
| 11-15 | opt3 | 3 orders | Triple bundle wins big |

### Phase B: Recommendations (Rounds 16-35)
**Stars on 2 orders** - Test recommendation influence

| Rounds | Alignment | Optimal | Test Purpose |
|--------|-----------|---------|--------------|
| 16-23 | ✅ Aligned | 2 orders | Rec matches optimal - should reinforce |
| 24-29 | ⚠️ Rec2→Opt1 | 1 order | Rec says 2, but 1 is better - over-bundling? |
| 30-35 | ⚠️ Rec2→Opt3 | 3 orders | Rec says 2, but 3 is better - exploration? |

### Phase C: Post-Recommendation (Rounds 36-50)
**No recommendations** - Test lasting behavioral effects

| Rounds | Archetype | Optimal | Compare to |
|--------|-----------|---------|------------|
| 36-40 | opt1 | 1 order | Phase A R1-5 |
| 41-45 | opt2 | 2 orders | Phase A R6-10 |
| 46-50 | opt3 | 3 orders | Phase A R11-15 |

## 📈 Key Metrics

### Efficiency Benchmarks
- **Single order (opt1):** ~1.8 $/s
- **2-order bundle (opt2):** ~1.67 $/s
- **3-order bundle (opt3):** ~3.07 $/s

### Time Model
- Travel to store: 4s
- Base overhead: 2s
- Per aisle: 2s
- **Formula:** `Time = 4 + 2 + (2 × num_aisles)`

## 🔍 What to Look For in User Data

### Expected Patterns:
1. **Phase A:** Learning phase - users figure out bundling
2. **Phase B Aligned:** High compliance with recommendations
3. **Phase B Misaligned:** Test if users blindly follow or optimize
4. **Phase C:** Check if Phase B changed baseline behavior

### Analysis Questions:
- Do users follow recommendations even when suboptimal?
- Does recommendation exposure create lasting behavior change?
- How quickly do users discover optimal strategies?
- Is there a difference between opt1, opt2, opt3 learning curves?

## 🚨 Important Notes

1. **These files are developer-only** - Do NOT share with participants
2. The optimal strategies assume the timing model: 4s travel + 2s overhead + 2s per aisle
3. If you change `cellDistance` in store configs, efficiency numbers will scale but optimal choices stay the same
4. Recommendation stars are purely visual - they don't change game mechanics

## 🛠️ Troubleshooting

**HTML table not loading?**
- Make sure you open it from the project root directory
- Check browser console for file path errors
- Verify `src/lib/bundle_experiment_50_rounds_short_times.json` exists

**Need to regenerate CSV?**
The CSV was generated from the JSON file. If you update the JSON, you can regenerate using the experiment data structure.

---

**Questions?** Check the main experiment JSON file at:
`src/lib/bundle_experiment_50_rounds_short_times.json`
