# City Revenue Performance Analysis

## Average Optimal Revenue Per Second (RPS) by City

| Rank | City | Avg Optimal RPS | # Rounds | Round Numbers | Revenue Range | Time Range | Notes |
|------|------|-----------------|----------|---------------|---------------|------------|-------|
| 🥇 1 | **Emeryville** | **2.419 $/s** | 5 | 1, 5, 9, 13, 17 | $91-$278 | 38s-111s | **HIGHEST VALUE** - Smart users should prioritize |
| 🥈 2 | **Berkeley** | **2.042 $/s** | 5 | 2, 6, 10, 14, 18 | $197-$353 | 98s-168s | Strong secondary choice |
| 🥉 3 | **Oakland** | **1.690 $/s** | 5 | 3, 7, 11, 15, 19 | $179-$354 | 97s-202s | Middle tier performance |
| 4 | **Piedmont** | **1.489 $/s** | 5 | 4, 8, 12, 16, 20 | $110-$303 | 76s-182s | **LOWEST VALUE** - Avoid if possible |

---

## Performance Gaps

### Emeryville vs Others
- **vs Piedmont**: +62.5% higher RPS (most dramatic difference)
- **vs Oakland**: +43.1% higher RPS
- **vs Berkeley**: +18.5% higher RPS

### Strategic Implications
- Players who discover Emeryville's advantage early can maximize earnings
- City-swapping behavior indicates strategic thinking
- Travel time between cities: typically 3-4 seconds (worth it for Emeryville)

---

## Per-City Detailed Breakdown

### 🏙️ Emeryville (Highest Revenue)
| Round | Phase | Optimal Bundle | Earnings | Time | RPS | Notes |
|-------|-------|----------------|----------|------|-----|-------|
| 1 | Baseline | 1 order (R1_A) | $91 | 38s | 2.395 | Fast single order |
| 5 | Baseline | 2 orders (R5_A+R5_B) | $215 | 89.6s | 2.400 | Efficient pair |
| 9 | Assisted | 3 orders (R9_A+R9_B+R9_C) | $278 | 111.2s | **2.500** | **BEST RPS IN GAME!** |
| 13 | Assisted | 1 order (R13_A) | $108 | 45s | 2.400 | Quick high-value |
| 17 | Transfer | 2 orders (R17_A+R17_B) | $258 | 109.7s | 2.353 | Solid bundle |

**Strategy**: Mix of 1-order (2 rounds), 2-order (2 rounds), and 3-order (1 round) optimal solutions

---

### 🏫 Berkeley (High Revenue)
| Round | Phase | Optimal Bundle | Earnings | Time | RPS | Notes |
|-------|-------|----------------|----------|------|-----|-------|
| 2 | Baseline | 2 orders (R2_A+R2_B) | $197 | 98.6s | 1.998 | Good pairing |
| 6 | Assisted | 1 order (R6_A) | $142 | 71s | 2.000 | **rec2_opt1 test** |
| 10 | Assisted | 3 orders (R10_A+R10_B+R10_C) | $322 | 140.8s | 2.287 | Large bundle |
| 14 | Assisted | 2 orders (R14_A+R14_B) | $238 | 109.4s | 2.176 | Premium items |
| 18 | Transfer | 3 orders (R18_A+R18_B+R18_C) | $353 | 168.5s | 2.095 | **Highest earnings** |

**Strategy**: Balanced mix, tests all bundle sizes

---

### 🏘️ Oakland (Medium Revenue)
| Round | Phase | Optimal Bundle | Earnings | Time | RPS | Notes |
|-------|-------|----------------|----------|------|-----|-------|
| 3 | Baseline | 3 orders (R3_A+R3_B+R3_C) | $354 | 202.3s | 1.750 | Time-consuming |
| 7 | Assisted | 2 orders (R7_A+R7_B) | $215 | 129.2s | 1.664 | Aligned rec |
| 11 | Assisted | 1 order (R11_A) | $136 | 80s | 1.700 | **rec2_opt1 test** |
| 15 | Assisted | 3 orders (R15_A+R15_B+R15_C) | $354 | 194s | 1.825 | Last assisted |
| 19 | Transfer | 1 order (R19_A) | $179 | 97s | 1.845 | High-value single |

**Strategy**: Heavy on large bundles (3 rounds with 3-order optimal)

---

### 🏡 Piedmont (Lowest Revenue)
| Round | Phase | Optimal Bundle | Earnings | Time | RPS | Notes |
|-------|-------|----------------|----------|------|-----|-------|
| 4 | Baseline | 1 order (R4_A) | $110 | 76s | 1.447 | **LOWEST RPS** |
| 8 | Assisted | 3 orders (R8_A+R8_B+R8_C) | $303 | 182.6s | 1.659 | **rec2_opt3 test** |
| 12 | Assisted | 2 orders (R12_A+R12_B) | $217 | 147.2s | 1.474 | Aligned rec |
| 16 | Transfer | 2 orders (R16_A+R16_B) | $216 | 148.7s | 1.453 | Similar to R12 |
| 20 | Transfer | 3 orders (R20_A+R20_B+R20_C) | $259 | 167s | 1.551 | Final round |

**Strategy**: Consistently lower RPS, strategic players should minimize time here

---

## Total Potential Earnings (If Optimal Every Round)

| City | Total Optimal Earnings | Total Optimal Time | Avg RPS | % of Total Revenue |
|------|------------------------|--------------------|---------|--------------------|
| **Emeryville** | **$950** | 393.5s | 2.419 | 24.7% |
| **Berkeley** | **$1,052** | 527.3s | 2.042 | 27.3% |
| **Oakland** | **$1,098** | 702.5s | 1.690 | 28.5% |
| **Piedmont** | **$1,005** | 726.2s | 1.489 | 26.1% |
| **TOTAL** | **$4,105** | 2,349.5s | 1.913 | 100% |

### Key Insights:
- Oakland has highest total earnings BUT lowest efficiency
- Emeryville has lowest total time BUT highest efficiency
- Berkeley offers good balance of high earnings and reasonable time
- Piedmont should be avoided when possible (lowest efficiency)

---

## City-Swapping Strategy

### Optimal City Selection (If Free Choice Each Round)

Assuming players can choose cities freely, the theoretical maximum earnings would be:
- **Always choose Emeryville when possible** (travel cost: +3s)
- Only switch if travel time > efficiency benefit

### Travel Time Economics
- **City-to-city travel**: ~3-4 seconds
- **Break-even point**: If another city offers >2.419 $/s, only stay if time savings > travel cost
- In this design, **Emeryville is always best**, so smart players would never leave

### Design Note
If you want to encourage city diversity, consider:
1. Adding "cooldown" (e.g., can't repeat same city twice in a row)
2. Inventory depletion (orders run out if city overused)
3. City-specific bonuses (multipliers that rotate)
4. Queue times (popular cities have delays)

---

## Expected Player Behaviors

### Type 1: Random Players (Baseline)
- Stick with assigned city rotation
- Don't discover Emeryville advantage
- Average performance: ~1.5-1.7 $/s

### Type 2: Opportunistic Players
- Notice Emeryville is good after 2-3 rounds there
- Try to return more often
- Average performance: ~1.9-2.1 $/s

### Type 3: Strategic Players (Optimal)
- Calculate RPS after first few rounds
- Switch to Emeryville exclusively
- Average performance: ~2.2-2.4 $/s

### Type 4: Explorative Players
- Test all cities thoroughly
- Discover patterns but don't optimize
- Average performance: ~1.7-1.9 $/s

---

## Research Questions This Design Can Answer

1. **Do humans discover efficiency differences between cities?**
   - Track city preferences over time
   - Measure time-to-discovery of Emeryville advantage

2. **How much do recommendations affect city choice?**
   - Do Phase B recommendations keep players in assigned cities?
   - Do players override recommendations to go to better cities?

3. **Is learning transferable across cities?**
   - Do players who learn optimal bundling in Berkeley apply it in Oakland?
   - Does city-specific learning happen, or is it generalized?

4. **How do players balance exploration vs exploitation?**
   - When do players stop exploring and lock into a city?
   - Does recommendation phase delay this discovery?

---

**Generated**: December 2, 2025
**Data Source**: `experiment_orders.json`, `experiment_scenario_table.csv`
