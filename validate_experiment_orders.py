#!/usr/bin/env python3
"""
Experiment Order Data Validator & Analyzer

This script validates the experiment_orders.json file and generates
summary statistics for the 20-round experiment design.

Usage:
    python validate_experiment_orders.py
"""

import json
from collections import defaultdict
from pathlib import Path

def load_orders():
    """Load the experiment orders JSON file."""
    json_path = Path(__file__).parent / "src/lib/configs/experiment_orders.json"
    with open(json_path, 'r') as f:
        return json.load(f)

def validate_structure(data):
    """Validate the basic structure of the orders data."""
    print("=" * 60)
    print("VALIDATING ORDER DATA STRUCTURE")
    print("=" * 60)
    
    errors = []
    warnings = []
    
    # Check top-level keys
    required_keys = ['orders', 'metadata']
    for key in required_keys:
        if key not in data:
            errors.append(f"Missing required key: {key}")
    
    # Validate orders
    orders = data.get('orders', [])
    print(f"✓ Total orders found: {len(orders)}")
    
    if len(orders) != 80:
        errors.append(f"Expected 80 orders, found {len(orders)}")
    
    # Check each order has required fields
    required_order_fields = ['id', 'round', 'city', 'store', 'earnings', 
                             'base_time_s', 'aisles', 'travel_time_s', 'recommended']
    
    for i, order in enumerate(orders):
        for field in required_order_fields:
            if field not in order:
                errors.append(f"Order {i} missing field: {field}")
    
    # Validate rounds
    rounds_present = set(order['round'] for order in orders)
    expected_rounds = set(range(1, 21))
    
    if rounds_present != expected_rounds:
        missing = expected_rounds - rounds_present
        extra = rounds_present - expected_rounds
        if missing:
            errors.append(f"Missing rounds: {sorted(missing)}")
        if extra:
            errors.append(f"Extra rounds: {sorted(extra)}")
    else:
        print(f"✓ All rounds 1-20 present")
    
    # Validate orders per round
    orders_per_round = defaultdict(int)
    for order in orders:
        orders_per_round[order['round']] += 1
    
    for round_num, count in orders_per_round.items():
        if count != 4:
            errors.append(f"Round {round_num} has {count} orders (expected 4)")
    
    if all(count == 4 for count in orders_per_round.values()):
        print(f"✓ All rounds have exactly 4 orders")
    
    # Validate city rotation
    city_rotation = []
    for round_num in range(1, 21):
        round_orders = [o for o in orders if o['round'] == round_num]
        if round_orders:
            city_rotation.append(round_orders[0]['city'])
    
    expected_pattern = ['Emeryville', 'Berkeley', 'Oakland', 'Piedmont'] * 5
    if city_rotation == expected_pattern:
        print(f"✓ City rotation correct: E→B→O→P (5 cycles)")
    else:
        errors.append(f"City rotation pattern incorrect")
    
    # Validate recommendations
    rec_orders = [o for o in orders if o['recommended']]
    rec_rounds = set(o['round'] for o in rec_orders)
    expected_rec_rounds = set(range(6, 16))
    
    if rec_rounds == expected_rec_rounds:
        print(f"✓ Recommendations present in rounds 6-15")
    else:
        errors.append(f"Recommendations in wrong rounds")
    
    # Check 2 orders recommended per round in phase B
    rec_per_round = defaultdict(int)
    for order in rec_orders:
        rec_per_round[order['round']] += 1
    
    if all(count == 2 for count in rec_per_round.values()):
        print(f"✓ Exactly 2 orders recommended per round in phase B")
    else:
        for round_num, count in rec_per_round.items():
            if count != 2:
                errors.append(f"Round {round_num} has {count} recommendations (expected 2)")
    
    # Print results
    print()
    if errors:
        print("❌ ERRORS FOUND:")
        for error in errors:
            print(f"  - {error}")
    else:
        print("✅ All validations passed!")
    
    if warnings:
        print("\n⚠️  WARNINGS:")
        for warning in warnings:
            print(f"  - {warning}")
    
    print()
    return len(errors) == 0

def analyze_city_performance(data):
    """Analyze and display city performance statistics."""
    print("=" * 60)
    print("CITY PERFORMANCE ANALYSIS")
    print("=" * 60)
    
    metadata = data['metadata']
    city_stats = metadata['city_stats']
    
    print("\nAverage Optimal Revenue Per Second (RPS):\n")
    
    # Sort cities by RPS
    sorted_cities = sorted(city_stats.items(), 
                          key=lambda x: x[1]['avg_optimal_rps'], 
                          reverse=True)
    
    for rank, (city, stats) in enumerate(sorted_cities, 1):
        emoji = ['🥇', '🥈', '🥉', '  '][rank-1]
        print(f"{emoji} {rank}. {city:12} {stats['avg_optimal_rps']:.3f} $/s  "
              f"(Rounds: {stats['rounds']})")
    
    # Calculate percentage differences
    print("\nPerformance Gaps:")
    best_rps = sorted_cities[0][1]['avg_optimal_rps']
    worst_rps = sorted_cities[-1][1]['avg_optimal_rps']
    
    for city, stats in sorted_cities[1:]:
        diff = ((sorted_cities[0][1]['avg_optimal_rps'] - stats['avg_optimal_rps']) 
                / stats['avg_optimal_rps'] * 100)
        print(f"  Emeryville vs {city}: +{diff:.1f}%")
    
    print()

def analyze_phases(data):
    """Analyze phase distribution."""
    print("=" * 60)
    print("PHASE ANALYSIS")
    print("=" * 60)
    
    metadata = data['metadata']
    phases = metadata['phases']
    
    for phase_name, phase_info in phases.items():
        rounds = phase_info['rounds']
        has_rec = phase_info['has_recommendation']
        
        print(f"\n{phase_name.upper()} Phase:")
        print(f"  Rounds: {rounds[0]}-{rounds[-1]} ({len(rounds)} rounds)")
        print(f"  Recommendations: {'✓ Active' if has_rec else '✗ None'}")
    
    print()

def analyze_recommendation_alignment(data):
    """Analyze recommendation alignment types."""
    print("=" * 60)
    print("RECOMMENDATION ALIGNMENT ANALYSIS")
    print("=" * 60)
    
    metadata = data['metadata']
    optimal_scenarios = metadata['optimal_scenarios']
    
    alignment_counts = defaultdict(int)
    alignment_rounds = defaultdict(list)
    
    for round_key, scenario in optimal_scenarios.items():
        rec_type = scenario.get('type')
        round_num = int(round_key.split('_')[1])
        
        if 'rec2' in rec_type or 'aligned' in rec_type:
            alignment_counts[rec_type] += 1
            alignment_rounds[rec_type].append(round_num)
    
    print("\nRecommendation Alignment Types (Phase B: Rounds 6-15):\n")
    
    type_descriptions = {
        'aligned': 'System correct (rec=2, opt=2)',
        'rec2_opt1': 'Over-recommends (rec=2, opt=1)',
        'rec2_opt3': 'Under-recommends (rec=2, opt=3)'
    }
    
    for rec_type in ['aligned', 'rec2_opt1', 'rec2_opt3']:
        if rec_type in alignment_counts:
            count = alignment_counts[rec_type]
            rounds = alignment_rounds[rec_type]
            desc = type_descriptions.get(rec_type, '')
            print(f"  {rec_type:12} {count} rounds  {desc}")
            print(f"               Rounds: {rounds}")
            print()
    
    total = sum(alignment_counts.values())
    print(f"Total Phase B rounds: {total}")
    print()

def analyze_optimal_bundles(data):
    """Analyze optimal bundle size distribution."""
    print("=" * 60)
    print("OPTIMAL BUNDLE SIZE DISTRIBUTION")
    print("=" * 60)
    
    metadata = data['metadata']
    optimal_scenarios = metadata['optimal_scenarios']
    
    bundle_counts = defaultdict(int)
    bundle_by_phase = defaultdict(lambda: defaultdict(int))
    bundle_by_city = defaultdict(lambda: defaultdict(int))
    
    phase_ranges = {
        'Baseline': range(1, 6),
        'Assisted': range(6, 16),
        'Transfer': range(16, 21)
    }
    
    orders = data['orders']
    city_by_round = {}
    for order in orders:
        if order['id'].endswith('_A'):  # First order of each round
            city_by_round[order['round']] = order['city']
    
    for round_key, scenario in optimal_scenarios.items():
        round_num = int(round_key.split('_')[1])
        bundle_size = scenario['optimal_bundle_size']
        city = city_by_round.get(round_num, 'Unknown')
        
        bundle_counts[bundle_size] += 1
        bundle_by_city[city][bundle_size] += 1
        
        for phase_name, phase_range in phase_ranges.items():
            if round_num in phase_range:
                bundle_by_phase[phase_name][bundle_size] += 1
    
    print("\nOverall Distribution:\n")
    for size in [1, 2, 3]:
        count = bundle_counts[size]
        pct = (count / 20) * 100
        bar = '█' * (count * 2)
        print(f"  {size}-order optimal: {count:2} rounds ({pct:4.1f}%) {bar}")
    
    print("\n\nBy Phase:\n")
    for phase_name in ['Baseline', 'Assisted', 'Transfer']:
        counts = bundle_by_phase[phase_name]
        print(f"  {phase_name:10} 1-order:{counts[1]}  2-order:{counts[2]}  3-order:{counts[3]}")
    
    print("\n\nBy City:\n")
    for city in ['Emeryville', 'Berkeley', 'Oakland', 'Piedmont']:
        counts = bundle_by_city[city]
        print(f"  {city:12} 1-order:{counts[1]}  2-order:{counts[2]}  3-order:{counts[3]}")
    
    print()

def analyze_earnings_distribution(data):
    """Analyze earnings distribution."""
    print("=" * 60)
    print("EARNINGS & TIME ANALYSIS")
    print("=" * 60)
    
    orders = data['orders']
    
    # Overall stats
    total_earnings = sum(o['earnings'] for o in orders)
    avg_earnings = total_earnings / len(orders)
    min_earnings = min(o['earnings'] for o in orders)
    max_earnings = max(o['earnings'] for o in orders)
    
    total_time = sum(o['base_time_s'] for o in orders)
    avg_time = total_time / len(orders)
    min_time = min(o['base_time_s'] for o in orders)
    max_time = max(o['base_time_s'] for o in orders)
    
    print(f"\nEarnings per Order:")
    print(f"  Average: ${avg_earnings:.2f}")
    print(f"  Range: ${min_earnings} - ${max_earnings}")
    print(f"  Total (all 80 orders): ${total_earnings}")
    
    print(f"\nTime per Order:")
    print(f"  Average: {avg_time:.1f}s")
    print(f"  Range: {min_time}s - {max_time}s")
    print(f"  Total (all 80 orders): {total_time}s ({total_time/60:.1f} min)")
    
    # By city
    print("\n\nBy City:\n")
    cities = ['Emeryville', 'Berkeley', 'Oakland', 'Piedmont']
    
    for city in cities:
        city_orders = [o for o in orders if o['city'] == city]
        city_earnings = sum(o['earnings'] for o in city_orders)
        city_time = sum(o['base_time_s'] for o in city_orders)
        
        print(f"  {city:12} {len(city_orders)} orders, "
              f"${city_earnings:4} total, "
              f"{city_time:5.1f}s avg time")
    
    print()

def generate_summary_table(data):
    """Generate a summary table of key metrics."""
    print("=" * 60)
    print("EXPERIMENT SUMMARY")
    print("=" * 60)
    
    metadata = data['metadata']
    
    print(f"\n📊 Experiment Configuration:")
    print(f"  Total Rounds: {metadata['total_rounds']}")
    print(f"  Orders per Round: {metadata['orders_per_round']}")
    print(f"  Total Orders: {len(data['orders'])}")
    print(f"  Cities: {', '.join(metadata['city_rotation'])}")
    
    print(f"\n🎯 Optimal Performance Targets:")
    
    optimal_scenarios = metadata['optimal_scenarios']
    
    # Calculate totals from scenario data
    total_optimal_rps = sum(s['optimal_rps'] for s in optimal_scenarios.values())
    avg_rps = total_optimal_rps / len(optimal_scenarios)
    
    print(f"  Average Optimal RPS across all rounds: {avg_rps:.3f} $/s")
    
    print(f"\n✨ Best Single Round:")
    best_round = max(optimal_scenarios.items(), 
                    key=lambda x: x[1]['optimal_rps'])
    print(f"  Round {best_round[0].split('_')[1]}: "
          f"{best_round[1]['optimal_combo']} "
          f"with {best_round[1]['optimal_rps']:.3f} $/s "
          f"(Bundle size: {best_round[1]['optimal_bundle_size']})")
    
    print()

def main():
    """Main validation and analysis function."""
    print("\n" + "=" * 60)
    print("EXPERIMENT ORDER DATA VALIDATOR & ANALYZER")
    print("=" * 60 + "\n")
    
    try:
        data = load_orders()
        print("✓ Successfully loaded experiment_orders.json\n")
    except FileNotFoundError:
        print("❌ Error: experiment_orders.json not found")
        print("   Expected location: src/lib/configs/experiment_orders.json")
        return
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON format - {e}")
        return
    
    # Run all analyses
    is_valid = validate_structure(data)
    
    if is_valid:
        analyze_city_performance(data)
        analyze_phases(data)
        analyze_recommendation_alignment(data)
        analyze_optimal_bundles(data)
        analyze_earnings_distribution(data)
        generate_summary_table(data)
        
        print("=" * 60)
        print("✅ VALIDATION COMPLETE - DATA IS READY FOR USE")
        print("=" * 60)
        print("\nNext steps:")
        print("  1. Import experiment_orders.json in your game code")
        print("  2. Implement star (⭐) indicators for recommended orders")
        print("  3. Add round counter (1-20)")
        print("  4. Implement performance tracking")
        print("\nSee DEVELOPER_QUICK_REFERENCE.md for implementation guide.")
        print()
    else:
        print("=" * 60)
        print("❌ VALIDATION FAILED - PLEASE FIX ERRORS ABOVE")
        print("=" * 60)
        print()

if __name__ == "__main__":
    main()
