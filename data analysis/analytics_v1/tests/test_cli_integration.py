from pathlib import Path

from analytics.cli import build_parser, run_pipeline


FIXTURES = Path(__file__).parent / "fixtures"


def test_cli_json_pipeline_outputs(tmp_path: Path):
    parser = build_parser()
    args = parser.parse_args(
        [
            "run",
            "--source",
            "json",
            "--dataset-root",
            "experiment",
            "--data-json",
            str(FIXTURES / "participants_fixture.json"),
            "--scenario-bundle-json",
            str(FIXTURES / "scenario_bundle_fixture.json"),
            "--stores-json",
            str(FIXTURES / "stores_fixture.json"),
            "--cities-json",
            str(FIXTURES / "cities_fixture.json"),
            "--out-dir",
            str(tmp_path),
            "--bootstrap-b",
            "200",
            "--seed",
            "1",
            "--cohort-col",
            "cohort",
        ]
    )

    metadata = run_pipeline(args)
    assert metadata["input_counts"]["participants"] == 2

    required = [
        "decision_fact.csv",
        "kpi_overall.csv",
        "kpi_by_round.csv",
        "kpi_by_participant.csv",
        "kpi_by_classification.csv",
        "kpi_by_scenario.csv",
        "qa_issues.csv",
        "cohort_comparisons.csv",
        "run_metadata.json",
    ]
    for name in required:
        assert (tmp_path / name).exists()

    decision_header = (tmp_path / "decision_fact.csv").read_text(encoding="utf-8").splitlines()[0]
    for field in ["classification", "phase", "score_ratio_to_best", "percent_regret"]:
        assert field in decision_header
