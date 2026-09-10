"""
Tests for the explanation layer's train-impact reporting, the reproducible Neev
evaluation, and the removal of the silent risk fallback.
"""

import csv
import json
from pathlib import Path

import pytest

from optimizer.data_loader import load_dataset
from optimizer.explain import build_decision_trace

DATA_DIR = Path("Arnav_Optimizer_Clean_Dataset")
PLAN = Path("optimized_block_plan.json")


@pytest.fixture(scope="module")
def bundle():
    return load_dataset(DATA_DIR)


@pytest.fixture(scope="module")
def trace(bundle):
    plan = json.loads(PLAN.read_text())
    rec = next(t for t in plan["scheduled_tasks"] if t["task_id"] == "TASK-000005")
    return build_decision_trace(
        "TASK-000005", bundle,
        selected_block_ids=rec["block_ids"],
        selected_team_ids=rec["assigned_teams"],
        selected_date=rec["date"],
        execution_start_minute=rec["start_minute"],
        execution_end_minute=rec["end_minute"],
    )


class TestTrainImpact:
    def test_scheduled_possession_has_no_conflicting_trains(self, trace):
        """C002 prunes any block with a train conflict, so this must be zero."""
        assert trace["train_impact"]["conflicting"] == []

    def test_adjacent_trains_are_outside_the_window_but_within_buffer(self, trace, bundle):
        """Adjacency uses the same +/-60 min window as the C008 objective term."""
        impact = trace["train_impact"]
        assert impact["adjacency_buffer_minutes"] == 60

        start, end = 0, 200
        for entry in impact["adjacent"]:
            train = bundle.trains[entry["train_id"]]
            assert not (train.arrival_minute < end and train.departure_minute > start)
            assert not (train.departure_minute < start - 60 or train.arrival_minute > end + 60)

    def test_impact_matches_the_dataset_for_the_traced_section(self, trace):
        """
        No train on SEC-0004 that day runs near the 00:00-03:20 window; the
        earliest arrives at minute 338. This is why the night slot wins.
        """
        rows = [
            r for r in csv.DictReader(open(DATA_DIR / "trains.csv"))
            if r["section_id"] == "SEC-0004" and r["date"] == "2026-09-07"
        ]
        assert rows, "expected trains on SEC-0004 that day"
        assert min(int(r["arrival_minute"]) for r in rows) > 260
        assert trace["train_impact"]["adjacent"] == []

    def test_conflicting_trains_are_never_counted_as_adjacent(self, trace):
        ids_conflicting = {t["train_id"] for t in trace["train_impact"]["conflicting"]}
        ids_adjacent = {t["train_id"] for t in trace["train_impact"]["adjacent"]}
        assert ids_conflicting.isdisjoint(ids_adjacent)


class TestMissingRiskHandling:
    def test_replan_refuses_to_invent_a_risk_value(self, bundle, tmp_path):
        """
        A plan naming a task absent from the dataset must fail loudly. It used to
        substitute failure_probability_30d=0.5 / risk_level=CRITICAL silently.
        """
        from optimizer.preprocessing import preprocess_possessions
        from optimizer.config import OptimizerConfig
        from optimizer.replan import replan_from_request

        plan = json.loads(PLAN.read_text())
        plan["scheduled_tasks"].append({
            **plan["scheduled_tasks"][0], "task_id": "TASK-DOES-NOT-EXIST",
        })
        bad_plan = tmp_path / "plan.json"
        bad_plan.write_text(json.dumps(plan))

        request = tmp_path / "replan_request.json"
        request.write_text(json.dumps({
            "maintenance_task_id": "TASK-000005",
            "block_ids": ["BLK-009637", "BLK-009638"],
        }))

        with pytest.raises(KeyError, match="TASK-DOES-NOT-EXIST"):
            replan_from_request(
                replan_request_path=request,
                bundle=bundle,
                prep=preprocess_possessions(bundle),
                config=OptimizerConfig(output_dir=tmp_path),
                plan_json_path=bad_plan,
                output_dir=tmp_path,
            )


class TestNeevEvaluation:
    """The published metrics must be reproducible from the shipped predictions."""

    PUBLISHED = {
        "roc_auc": 0.8841, "accuracy": 0.8129, "precision": 0.7919,
        "recall": 0.6934, "f1": 0.7393,
    }

    def test_recomputed_metrics_match_published(self):
        metrics_path = Path("benchmarks/neev_eval_metrics.json")
        if not metrics_path.exists():
            pytest.skip("run scripts/evaluate_neev.py first")

        got = json.loads(metrics_path.read_text())["classification"]
        for name, published in self.PUBLISHED.items():
            assert got[name] == pytest.approx(published, abs=0.001), name

    def test_risk_score_is_probability_times_100(self):
        """The optimizer's priority input must track the model output exactly."""
        metrics_path = Path("benchmarks/neev_eval_metrics.json")
        if not metrics_path.exists():
            pytest.skip("run scripts/evaluate_neev.py first")
        report = json.loads(metrics_path.read_text())
        assert report["internal_consistency"]["risk_score_equals_probability_x100"] is True


class TestPredictionArtifactConsistency:
    """
    Two copies of the Neev handoff exist and serve different purposes:

      NEEV_FINAL_MODULE/output/...      true observation timestamps (evaluation)
      Arnav_Optimizer_Clean_Dataset/... dates rewritten onto the planning horizon

    Every predictive column must agree between them. `observation_date` is the
    only permitted difference, and nothing in the optimizer reads it.
    """

    NEEV = Path("NEEV_FINAL_MODULE/output/neev_predictions_for_optimizer.csv")
    CLEAN = Path("Arnav_Optimizer_Clean_Dataset/neev_predictions_for_optimizer.csv")

    def test_predictions_agree_except_observation_date(self):
        import pandas as pd

        a = pd.read_csv(self.NEEV)
        b = pd.read_csv(self.CLEAN)
        assert list(a.columns) == list(b.columns)
        assert len(a) == len(b)

        differing = [c for c in a.columns if not a[c].equals(b[c])]
        assert differing == ["observation_date"], (
            f"copies diverged on {differing}; only observation_date may differ"
        )

    def test_optimizer_never_decides_on_observation_date(self):
        """
        The field is loaded for completeness but must not influence scheduling,
        which is what makes the two copies interchangeable for the optimizer.
        """
        import subprocess

        hits = subprocess.run(
            ["grep", "-rn", "--include=*.py", "observation_date", "optimizer/", "ritvik/"],
            capture_output=True, text=True,
        ).stdout.strip().splitlines()
        # Only the dataclass field and the row read in data_loader.
        assert len(hits) == 2, f"unexpected observation_date usage:\n" + "\n".join(hits)
        assert all("data_loader.py" in h for h in hits)
