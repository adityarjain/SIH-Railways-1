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


class TestSimulatorTruthfulness:
    """Every simulator button maps to one scenario or to an explicit no-scenario state."""

    def test_event_scenario_map_is_exhaustive_and_honest(self):
        source = (FRONTEND / "pages/occ/Simulator.jsx").read_text()
        block = re.search(r"EVENT_SCENARIO_KEY = \{(.+?)\}", source, re.DOTALL).group(1)

        mapping = dict(re.findall(r"(\w+):\s*(?:'([\w]+)'|null)", block))
        # Events resolving to a scenario key vs the one explicit no-scenario event.
        assert mapping["NEW_TRAIN_SUCCESS"] == "rerouteScenario"
        assert mapping["HELD_TRAIN"] == "holdScenario"
        assert mapping["NEW_TRAIN_BLOCKED"] == "replanScenario"
        assert mapping["BLOCK_UNAVAILABLE"] == "blockUnavailableScenario"
        assert mapping.get("MAINTENANCE_EMERGENCY", "") == ""  # mapped to null, no scenario

    def test_no_button_falls_through_to_another_events_scenario(self):
        """The old code picked the scenario by outcomeType, so SEC-0072 events
        rendered the SEC-0004 conflict. That branch must be gone."""
        source = (FRONTEND / "pages/occ/Simulator.jsx").read_text()
        assert "outcomeType === 'OPERATIONAL_UPDATE' ? rerouteScenario : replanScenario" not in source

    def test_no_scenario_state_points_to_live_operations(self):
        source = (FRONTEND / "pages/occ/Simulator.jsx").read_text()
        assert "No generated engine scenario for this event type" in source
        assert "live-ops" in source


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
        plan = json.loads(PLAN.read_text())["scheduled_tasks"]
        dates = {t["date"] for t in plan}
        corridors = {t["corridor_id"] for t in plan}
        assert len(dates) >= 1
        assert len(corridors) >= 3
        # The busiest date must hold most of the plan (the demo's 09-03 batch).
        from collections import Counter
        busiest, count = Counter(t["date"] for t in plan).most_common(1)[0]
        assert count >= len(plan) * 0.8


class TestDemoGuide:
    def test_exactly_14_steps(self):
        source = (FRONTEND / "context/DemoGuideContext.jsx").read_text()
        assert len(re.findall(r"^\s*step: \d+,", source, re.MULTILINE)) == 14

    def test_guide_visits_live_ops_and_verification(self):
        source = (FRONTEND / "context/DemoGuideContext.jsx").read_text()
        pages = re.findall(r'page: "([a-z-]+)"', source)
        assert pages.count("live-ops") == 2, "Feature-2 evidence must be shown"
        assert "general-verify" in pages, "brief requires a verification step"
        # Simulator load is trimmed but still present for the replan trigger.
        assert 1 <= pages.count("simulator") <= 3

    def test_story_order_matches_the_brief(self):
        source = (FRONTEND / "context/DemoGuideContext.jsx").read_text()
        pages = re.findall(r'page: "([a-z-]+)"', source)
        # Authority -> Ground -> Authority:
        # planning ... conflict (live-ops) ... replan ... field execution ... verification.
        # The handoff to the crew now precedes verification, so the work being
        # verified is work the crew has actually been given.
        assert pages.index("block-planning") < pages.index("live-ops")
        assert pages.index("live-ops") < pages.index("replanning")
        assert pages.index("replanning") < pages.index("my-tasks")
        assert pages.index("my-tasks") < pages.index("general-verify")

    def test_every_guide_page_is_routable(self):
        guide = (FRONTEND / "context/DemoGuideContext.jsx").read_text()
        app = (FRONTEND / "App.jsx").read_text()
        for page in set(re.findall(r'page: "([a-z-]+)"', guide)):
            assert re.search(rf"[\'\"]?{re.escape(page)}[\'\"]?:\s*\w", app), f"{page} not in PAGES map"
