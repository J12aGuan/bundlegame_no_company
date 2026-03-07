"""Central constants for analytics v1."""

from dataclasses import dataclass


CONFIDENCE_LEVEL = 0.95
WILSON_Z_95 = 1.959963984540054
DEFAULT_BOOTSTRAP_B = 2000
DEFAULT_RANDOM_SEED = 42
NEAR_OPTIMAL_THRESHOLD = 0.95
LOCAL_TRAVEL_BUNDLE_SAVE_RATE = 0.25
SECONDS_PER_UNIQUE_ITEM_DEFAULT = 3.0


@dataclass(frozen=True)
class RunConfig:
    dataset_root: str
    source: str
    out_dir: str
    bootstrap_b: int = DEFAULT_BOOTSTRAP_B
    seed: int = DEFAULT_RANDOM_SEED
    cohort_col: str | None = None
