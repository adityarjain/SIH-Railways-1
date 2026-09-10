"""
Tests for the real delay model and the HOLD action.

These cover the two things that previously did not exist: a delay expressed in
minutes derived from physical data, and an operational alternative to rerouting.
"""

from pathlib import Path

import pytest

from ritvik.config import RitvikConfig
from ritvik.data_loader import ScheduledMaintenance, TrainMovement
from ritvik.decision import DecisionEngine
from ritvik.engine import RitvikEngine

DATA_DIR = Path("Arnav_Optimizer_Clean_Dataset")


@pytest.fixture(scope="module")
def engine():
    eng = RitvikEngine(RitvikConfig())
    eng.initialize()
    return eng


def _maint(end_minute: int) -> ScheduledMaintenance:
    return ScheduledMaintenance(
        task_id="TASK-TEST", asset_id="AST-TEST", department="Electrical / TRD",
        corridor_id="COR-001", section_id="SEC-0004", date="2026-09-07",
        start_minute=0, end_minute=end_minute, duration_minutes=end_minute,
        block_ids=["BLK-000001"], assigned_teams=["TEAM-013"],
    )


def _train(arrival: int, speed: float = 80.0) -> TrainMovement:
    return TrainMovement(
        train_id="TRN-TEST", train_type="Passenger", corridor_id="COR-001",
        section_id="SEC-0004", date="2026-09-07", arrival_minute=arrival,
        departure_minute=arrival + 20, priority_class=2, scheduled_speed_kmph=speed,
    )


class TestDelayModel:
    def test_traversal_time_matches_length_over_speed(self, engine):
        """SEC-0004 is 10.7 km with a 110 km/h line speed."""
        train = _train(100, speed=80.0)
        minutes = engine.rerouting_engine._section_traversal_minutes("SEC-0004", train)
        # Train is the binding constraint at 80 km/h: 10.7 / 80 * 60
        assert minutes == pytest.approx(10.7 / 80.0 * 60.0, rel=1e-6)

    def test_line_speed_caps_a_faster_train(self, engine):
        """A train faster than the line speed is limited by the track."""
        fast = _train(100, speed=200.0)
        minutes = engine.rerouting_engine._section_traversal_minutes("SEC-0004", fast)
        assert minutes == pytest.approx(10.7 / 110.0 * 60.0, rel=1e-6)

    def test_unknown_section_is_not_computable(self, engine):
        """Missing physical data yields None, never a substituted default."""
        assert engine.rerouting_engine._section_traversal_minutes("SEC-NOPE", _train(100)) is None

    def test_detour_delay_is_bypass_minus_direct(self, engine):
        train = _train(100)
        path = ["SEC-0004", "SEC-0007", "SEC-0008", "SEC-0010"]
        delay = engine.rerouting_engine.estimate_detour_delay_minutes("SEC-0004", path, train)

        bypass = sum(
            engine.rerouting_engine._section_traversal_minutes(s, train) for s in path
        )
        direct = engine.rerouting_engine._section_traversal_minutes("SEC-0004", train)
        assert delay == max(0, round(bypass - direct))
        assert delay > 0

    def test_reroute_reports_computed_delay(self, engine):
        """The end-to-end decision carries a delay in real minutes."""
        config = engine.config
        config.section_capacities["SEC-0005"] = 0
        config.section_capacities["SEC-0007"] = 8
        evt = next(e for e in engine.events if e.event_id == "EVT-001")

        decision, _, reroutes = engine.evaluate_task("TASK-000005", [evt])

        assert decision.status == "OPERATIONAL_UPDATE"
        action = decision.train_actions[0]
        assert action.action == "REROUTED"
        assert action.delay_estimate_minutes is not None
        assert action.delay_estimate_minutes > 0
        assert "section length" in action.delay_basis
        # Delay must survive serialization -- it used to be dropped from to_dict()
        assert action.to_dict()["delay_estimate_minutes"] == action.delay_estimate_minutes
        assert reroutes[0].to_dict()["delay_minutes"] == action.delay_estimate_minutes


class TestHoldAction:
    def test_hold_accepted_within_limit(self):
        """A short wait for the possession to end is an acceptable alternative."""
        held = DecisionEngine.evaluate_hold(_maint(end_minute=200), _train(180), max_hold_minutes=45)
        assert held == 20

    def test_hold_rejected_beyond_limit(self):
        """A long wait is unacceptable disruption; the maintenance is replanned."""
        assert DecisionEngine.evaluate_hold(_maint(200), _train(110), max_hold_minutes=45) is None

    def test_no_hold_when_train_already_clear(self):
        """A train arriving after the possession ends is not held at all."""
        assert DecisionEngine.evaluate_hold(_maint(200), _train(300), max_hold_minutes=45) is None

    def test_priority_one_train_is_never_held(self):
        """
        priority_class 1 is the highest service class in trains.csv. Holding one
        is refused regardless of how short the wait would be.
        """
        train = _train(180)
        train = TrainMovement(**{**train.__dict__, "priority_class": 1})
        assert DecisionEngine.evaluate_hold(_maint(200), train, max_hold_minutes=120) is None

    def test_lower_priority_train_may_be_held(self):
        train = TrainMovement(**{**_train(180).__dict__, "priority_class": 2})
        assert DecisionEngine.evaluate_hold(_maint(200), train, max_hold_minutes=120) == 20

    def test_engine_refuses_to_hold_the_priority_one_demo_train(self):
        """
        EVT-002 is a priority-1 movement, so even a generous hold window must not
        hold it -- the possession is replanned around it instead.
        """
        config = RitvikConfig(max_acceptable_hold_minutes=120)
        config.section_capacities["SEC-0005"] = 0
        config.section_capacities["SEC-0007"] = 0
        eng = RitvikEngine(config)
        eng.initialize()
        evt = next(e for e in eng.events if e.event_id == "EVT-002")
        assert evt.priority_class == 1

        decision, _, _ = eng.evaluate_task("TASK-000005", [evt])
        assert decision.status == "REPLAN_REQUEST"

    def test_engine_holds_a_lower_priority_train(self):
        """With bypasses saturated and a holdable train, the possession is kept."""
        config = RitvikConfig(max_acceptable_hold_minutes=120)
        config.section_capacities["SEC-0005"] = 0
        config.section_capacities["SEC-0007"] = 0
        eng = RitvikEngine(config)
        eng.initialize()
        evt = next(e for e in eng.events if e.event_id == "EVT-002")
        evt.priority_class = 2  # ordinary service

        decision, _, _ = eng.evaluate_task("TASK-000005", [evt])

        assert decision.status == "OPERATIONAL_UPDATE"
        assert [a.action for a in decision.train_actions] == ["HELD"]
        assert decision.train_actions[0].delay_estimate_minutes == 90

    def test_default_limit_still_escalates_to_replan(self):
        """The shipped default keeps the documented demo outcome."""
        config = RitvikConfig()
        config.section_capacities["SEC-0005"] = 0
        config.section_capacities["SEC-0007"] = 0
        eng = RitvikEngine(config)
        eng.initialize()
        evt = next(e for e in eng.events if e.event_id == "EVT-002")

        decision, _, _ = eng.evaluate_task("TASK-000005", [evt])
        assert decision.status == "REPLAN_REQUEST"
