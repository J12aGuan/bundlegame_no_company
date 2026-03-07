from analytics.stats.intervals import bootstrap_ci, wilson_interval


def test_wilson_interval_bounds():
    low, high = wilson_interval(5, 10)
    assert low is not None and high is not None
    assert 0 <= low <= high <= 1


def test_bootstrap_ci_deterministic_seed():
    values = [1.0, 2.0, 2.0, 3.0, 100.0]
    ci1 = bootstrap_ci(values, statistic="median", b=500, seed=7)
    ci2 = bootstrap_ci(values, statistic="median", b=500, seed=7)
    assert ci1 == ci2
