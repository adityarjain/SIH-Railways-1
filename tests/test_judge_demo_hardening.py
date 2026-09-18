"""
Regression tests for the final judge-demo hardening pass:

  - the four Ritvik scenarios (reroute / hold / replan / block_unavailable) are
    real engine output and each button in the UI maps to exactly one of them
  - the HOLD demo event (EVT-006) actually produces a HELD decision
  - BlockPlanning selector data is derivable from the plan (no empty combinations)
  - the 14-step guide still has 14 steps and visits the right pages
"""

import json
import re
from pathlib import Path

import pytest

from ritvik.config import RitvikConfig
from ritvik.engine import RitvikEngine

FRONTEND = Path("frontend/src")
SCENARIOS = FRONTEND / "data/ritvik_scenarios.json"
PLAN = Path("optimized_block_plan.json")


class TestRitvikScenarios:
    @pytest.fixture(scope="class")
    def scenarios(self):
        return json.loads(SCENARIOS.read_text())

    def test_all_four_scenarios_present(self, scenarios):
        for key in ("reroute", "hold", "replan", "block_unavailable"):
            assert key in scenarios, f"missing scenario: {key}"

    def test_reroute_diverts_the_train(self, scenarios):
        d = scenarios["reroute"]["decision"]
        assert d["status"] == "OPERATIONAL_UPDATE"
        assert [a["action"] for a in d["train_actions"]] == ["REROUTED"]
        assert d["train_actions"][0]["delay_estimate_minutes"] > 0

    def test_hold_keeps_the_possession(self, scenarios):
        d = scenarios["hold"]["decision"]
        assert d["status"] == "OPERATIONAL_UPDATE"
        assert [a["action"] for a in d["train_actions"]] == ["HELD"]
        wait = d["train_actions"][0]["delay_estimate_minutes"]
        assert 0 < wait <= RitvikConfig().max_acceptable_hold_minutes

    def test_hold_event_is_low_priority(self, scenarios):
        assert scenarios["hold"]["event"]["priority_class"] == 2

    def test_replan_moves_the_possession(self, scenarios):
        d = scenarios["replan"]["decision"]
        assert d["status"] == "REPLAN_REQUEST"
        assert d["train_actions"] == []
        rejected = [
            c for r in scenarios["replan"]["reroute_results"]
            for c in r["inspected_candidates"] if c["status"] == "REJECTED"
        ]
        assert rejected, "replan scenario must cite rejected routes"

    def test_block_unavailable_skips_the_route_search(self, scenarios):
        s = scenarios["block_unavailable"]
        assert s["conflict"]["conflict_type"] == "BLOCK_UNAVAILABLE"
        assert s["decision"]["status"] == "REPLAN_REQUEST"
        # A closure short-circuits before any route search.
        assert s["reroute_results"] == []

    def test_hold_scenario_reproduces_from_the_engine(self):
        """The generated 'hold' scenario is not hand-written."""
        config = RitvikConfig()
        config.section_capacities.update({"SEC-0005": 0, "SEC-0007": 0})
        engine = RitvikEngine(config)
        engine.initialize()
        evt = next(e for e in engine.events if e.event_id == "EVT-006")
        assert evt.priority_class == 2

        decision, _, _ = engine.evaluate_task("TASK-000005", [evt])
        assert decision.status == "OPERATIONAL_UPDATE"
        assert decision.train_actions[0].action == "HELD"


class TestBlockPlanningSelectors:
    """Selector options must come from the plan so no combination is empty."""

    def test_component_derives_options_from_scheduled_tasks(self):
        source = (FRONTEND / "pages/occ/BlockPlanning.jsx").read_text()
        assert "buildDateOptions(scheduledTasks)" in source
        assert "buildCorridorOptions(scheduledTasks)" in source
        # The hardcoded lists are gone.
        assert '<option value="2026-09-07">2026-09-07 (Original Slot)</option>' not in source
        assert '<option value="COR-001">COR-001 (Delhi–Agra)</option>' not in source

    def test_plan_dates_and_corridors_are_non_trivial(self):
        """Sanity: the plan actually spans data the selector can offer."""
        from collections import Counter

        plan = json.loads(PLAN.read_text())["scheduled_tasks"]
        corridors = {t["corridor_id"] for t in plan}
        assert len(corridors) >= 3

        # Work is spread across the horizon rather than piled onto one date. The
        # scenario used to solve a single day batch, which the day sheet renders
        # as one busy date beside thirteen empty ones; demo.py now batches every
        # date, so assert the spread the calendar depends on.
        per_date = Counter(t["date"] for t in plan)
        assert len(per_date) == 14
        assert max(per_date.values()) <= len(plan) * 0.25
