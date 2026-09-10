"""
Regression tests for the generated bundling panel, replan metadata, and the
repository's truthful-claims standard.
"""

import json
import re
import subprocess
from pathlib import Path

import pytest

FRONTEND_SRC = Path("frontend/src")
BUNDLING = FRONTEND_SRC / "data/bundling.json"
SCENARIOS = FRONTEND_SRC / "data/ritvik_scenarios.json"
PLAN = Path("optimized_block_plan.json")


class TestGeneratedBundling:
    """The panel must come from the plan, not from a hand-authored example."""

    def test_hardcoded_example_is_gone(self):
        hits = subprocess.run(
            ["grep", "-rn", "SMART_BUNDLING_EXAMPLE", str(FRONTEND_SRC)],
            capture_output=True, text=True,
        ).stdout.strip()
        assert hits == "", f"hand-authored bundling example still referenced:\n{hits}"

    def test_panel_reads_the_generated_artifact(self):
        source = (FRONTEND_SRC / "components/timeline/BundlingView.jsx").read_text()
        assert "data/bundling.json" in source
        assert "simulationData" not in source

    def test_pairs_match_the_committed_plan(self):
        data = json.loads(BUNDLING.read_text())
        pairs = data["concurrent_bundle_pairs"]
        assert len(pairs) == 2

        records = {t["task_id"]: t for t in json.loads(PLAN.read_text())["scheduled_tasks"]}
        for pair in pairs:
            ids = [t["task_id"] for t in pair["tasks"]]
            assert len(ids) == 2
            for tid in ids:
                assert records[tid]["is_bundled"] is True
            # Each is recorded as the other's partner
            assert ids[1] in records[ids[0]]["bundled_with"]
            assert ids[0] in records[ids[1]]["bundled_with"]
            # Every field shown is the plan's own value
            for shown in pair["tasks"]:
                rec = records[shown["task_id"]]
                assert shown["start_minute"] == rec["start_minute"]
                assert shown["end_minute"] == rec["end_minute"]
                assert shown["assigned_teams"] == rec["assigned_teams"]

    def test_overlap_meets_the_rule_it_cites(self):
        for pair in json.loads(BUNDLING.read_text())["concurrent_bundle_pairs"]:
            a, b = pair["tasks"]
            expected = min(a["end_minute"], b["end_minute"]) - max(a["start_minute"], b["start_minute"])
            assert pair["overlap_minutes"] == expected
            if pair["minimum_overlap_required_minutes"] is not None:
                assert pair["overlap_minutes"] >= pair["minimum_overlap_required_minutes"]

    def test_no_invented_savings_metric(self):
        """
        No efficiency or 'minutes saved' figure reaches the screen: there is no
        unbundled counterfactual to measure one against. Comments are stripped
        first, since they legitimately discuss why such figures are absent.
        """
        source = (FRONTEND_SRC / "components/timeline/BundlingView.jsx").read_text()
        code = re.sub(r"/\*.*?\*/", "", source, flags=re.DOTALL)
        code = re.sub(r"^\s*//.*$", "", code, flags=re.MULTILINE)

        # Only the rendered pair data, not the provenance note that documents why
        # such figures are absent.
        pairs = json.dumps(json.loads(BUNDLING.read_text())["concurrent_bundle_pairs"])
        blob = (pairs + code).lower()

        # A quantified benefit is the problem, not the word. The panel is allowed
        # to state that no such figure is claimed.
        quantified = [
            r"\d+\s*(?:min|minutes|hours?)\s+(?:saved|savings)",
            r"(?:saved|savings)[^.]{0,20}\d+\s*(?:min|minutes|hours?)",
            r"\d+\s*%\s*(?:efficiency|improvement|reduction)",
            r"(?:efficiency|improvement|reduction)[^.]{0,20}\d+\s*%",
            r"eliminates\s+\d+",
        ]
        for pattern in quantified:
            assert not re.search(pattern, blob), f"unsupported quantified benefit: {pattern}"


class TestMaintenanceTypePropagation:
    def test_plan_carries_maintenance_type(self):
        for rec in json.loads(PLAN.read_text())["scheduled_tasks"]:
            assert rec.get("maintenance_type"), f"{rec['task_id']} lost maintenance_type"

    def test_csv_header_carries_maintenance_type(self):
        header = Path("optimized_block_plan.csv").read_text().splitlines()[0]
        assert "maintenance_type" in header.split(",")


class TestReplanMetadata:
    """The audit record must describe what actually happened."""

    @pytest.fixture(scope="class")
    def meta(self):
        return json.loads(SCENARIOS.read_text())["replan_metadata"]

    def test_records_the_full_cycle(self, meta):
        for key in (
            "affected_task_id", "original_plan", "affected_trains", "action_taken",
            "rerouting_attempted", "hold_attempted", "hold_selected", "selected_crew",
            "replanned_plan", "replan_runtime_seconds", "unaffected_plan_retention",
        ):
            assert key in meta, f"missing {key}"

    def test_action_and_attempts_are_consistent(self, meta):
        assert meta["action_taken"] == "REPLAN_MAINTENANCE"
        assert meta["rerouting_attempted"] is True
        assert meta["rerouting_succeeded"] is False
        assert meta["rejected_routes"], "replan must cite the routes it rejected"
        # Holding was considered and declined, so it must not be reported as used
        assert meta["hold_attempted"] is True
        assert meta["hold_selected"] is False

    def test_runtime_is_measured_not_asserted(self, meta):
        rt = meta["replan_runtime_seconds"]
        assert isinstance(rt, (int, float)) and rt > 0

    def test_retention_is_labelled_by_construction(self, meta):
        r = meta["unaffected_plan_retention"]
        assert r["basis"] == "by_construction"
        assert r["tasks_re_solved"] == 1
        assert r["tasks_unchanged"] == r["tasks_in_plan"] - 1
        assert "not a measurement" in r["caveat"].lower()

    def test_replanned_crew_is_deterministic(self, meta):
        assert meta["selected_crew"] == ["TEAM-015"]


class TestFeatureTwoCoverage:
    """Criteria the brief asks for are either implemented or declared missing."""

    @pytest.fixture(scope="class")
    def coverage(self):
        return json.loads(SCENARIOS.read_text())["criteria_coverage"]

    def test_all_criteria_declared(self, coverage):
        for c in (
            "delay", "capacity", "train_priority", "route_availability",
            "safety_constraints", "rerouting", "holding", "downstream_impact", "sequencing",
        ):
            assert c in coverage

    def test_unimplemented_criteria_state_the_limitation(self, coverage):
        for name, c in coverage.items():
            if c["status"] == "NOT_IMPLEMENTED":
                assert c.get("limitation"), f"{name} claims nothing and explains nothing"
                assert "basis" not in c, f"{name} must not claim a basis it lacks"

    def test_downstream_impact_is_not_scored(self, coverage):
        assert coverage["downstream_impact"]["status"] == "NOT_IMPLEMENTED"

    def test_topology_limitation_is_stated(self, coverage):
        limitation = coverage["route_availability"]["limitation"]
        assert "22 of 200" in limitation


class TestTruthfulClaims:
    """Claims removed in earlier passes must not reappear."""

    BANNED = [
        r"Mathematically Proven",
        r"[Pp]roves optimality",
        r"\+75\s*m(in)?\b",
        r"3 alarms in 7d",
        r"Quality Index",
        r"94\.2%",
        r"solved 30,000 tasks",
        r"in real time",
    ]

    def test_no_banned_claims_in_frontend(self):
        blob = "\n".join(
            p.read_text() for p in FRONTEND_SRC.rglob("*.jsx")
        ) + "\n".join(p.read_text() for p in FRONTEND_SRC.rglob("*.js"))
        for pattern in self.BANNED:
            assert not re.search(pattern, blob), f"unsupported claim returned: {pattern}"

    def test_no_equipment_allocation_claim(self):
        """No dataset carries an equipment or machine id, so none is allocated."""
        for csv_path in Path("Arnav_Optimizer_Clean_Dataset").glob("*.csv"):
            header = csv_path.read_text().splitlines()[0].lower()
            assert "equipment_id" not in header and "machine_id" not in header

    def test_review_document_is_deleted(self):
        assert not Path("ARNAV_OPTIMIZER_REVIEW.md").exists()
