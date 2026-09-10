"""
Generates the two operational scenarios the Live Operations screen renders.

Both are produced by running Ritvik's real engine, so the conflict, the routes it
inspected, the action it chose and the delay it computed are all engine output.
Previously the UI narrated these in prose because no per-scenario artifact
existed -- only the last demo to run left a decision file behind.

    PYTHONPATH=. python scripts/generate_ritvik_scenarios.py

Writes frontend/src/data/ritvik_scenarios.json with:
    reroute           -- EVT-001, a bypass is available      -> OPERATIONAL_UPDATE (REROUTED)
    hold              -- EVT-006, low-priority train, wait <= limit -> OPERATIONAL_UPDATE (HELD)
    replan            -- EVT-002, all bypasses saturated, priority-1 -> REPLAN_REQUEST
    block_unavailable -- EVT-003, the block itself is closed  -> REPLAN_REQUEST
"""

import json
from pathlib import Path
from typing import Any, Dict

from ritvik.config import RitvikConfig
from ritvik.engine import RitvikEngine

OUT = Path("frontend/src/data/ritvik_scenarios.json")
TASK_ID = "TASK-000005"


def run(event_id: str, capacities: Dict[str, int]) -> Dict[str, Any]:
    config = RitvikConfig()
    config.section_capacities.update(capacities)
    engine = RitvikEngine(config)
    engine.initialize()

    event = next(e for e in engine.events if e.event_id == event_id)
    decision, report, reroutes = engine.evaluate_task(TASK_ID, [event])

    return {
        "event": {
            "event_id": event.event_id,
            "event_type": event.event_type,
            "train_id": event.train_id,
            "train_name": event.train_name,
            "section_id": event.section_id,
            "date": event.date,
            "arrival_minute": event.arrival_minute,
            "departure_minute": event.departure_minute,
            "priority_class": event.priority_class,
        },
        "conflict": {
            "has_conflict": report.has_conflict,
            "conflict_type": report.conflict_type,
            "overlap_window": report.overlap_window,
            "affected_blocks": report.affected_blocks,
            "conflicting_trains": [t.train_id for t in report.conflicting_trains],
            "details": report.details,
        },
        "reroute_results": [r.to_dict() for r in reroutes],
        "decision": decision.to_dict(),
        "details": decision.details,
        "section_capacities_applied": capacities,
    }


def capture_replanned_record() -> Dict[str, Any]:
    """
    Runs the full closed loop and returns the revised TASK-000005 record the
    optimizer produced. The maintenance portal needs the replanned window and
    crew as data; hard-coding them in the UI is what previously made every task
    card show TASK-000005's schedule.
    """
    from ritvik.closed_loop import ClosedLoopController
    from optimizer.config import OptimizerConfig

    config = RitvikConfig()
    config.section_capacities.update({"SEC-0005": 0, "SEC-0007": 0})
    controller = ClosedLoopController(ritvik_config=config, arnav_config=OptimizerConfig())
    controller.initialize_arnav()

    event = next(e for e in controller.ritvik_engine.events if e.event_id == "EVT-002")
    result = controller.run_cycle(TASK_ID, event, write_outputs=True)

    r = result.replanned_schedule
    globals()["_LAST_CYCLE_METADATA"] = result.metadata
    return {
        "task_id": r.task_id,
        "asset_id": r.asset_id,
        "department": r.department,
        "corridor_id": r.corridor_id,
        "section_id": r.section_id,
        "date": r.date,
        "start_minute": r.start_minute,
        "end_minute": r.end_minute,
        "duration_minutes": r.duration_minutes,
        "block_ids": list(r.block_ids),
        "assigned_teams": list(r.assigned_teams),
        "is_night": r.is_night,
        "risk_score": r.risk_score,
        "priority_score": r.priority_score,
    }


def main() -> int:
    scenarios = {
        # A bypass exists: SEC-0007 has headroom, SEC-0005 does not.
        "reroute": run("EVT-001", {"SEC-0005": 0, "SEC-0007": 8}),
        # Rerouting fails but the low-priority train's wait is inside the 45-min
        # hold limit, so the possession is kept and the train is held.
        "hold": run("EVT-006", {"SEC-0005": 0, "SEC-0007": 0}),
        # Every bypass saturated and the train too high-priority to hold:
        # rerouting fails and the possession is replanned.
        "replan": run("EVT-002", {"SEC-0005": 0, "SEC-0007": 0}),
        # The block itself is closed: no train action can help, replan straight away.
        "block_unavailable": run("EVT-003", {}),
    }
    scenarios["replanned_record"] = capture_replanned_record()
    # Truthful, self-describing account of the replan cycle for the audit screen.
    scenarios["replan_metadata"] = globals().get("_LAST_CYCLE_METADATA", {})
    # What the dynamic-allocation layer does and does not evaluate. Exposed so the
    # UI can state limitations instead of implying full coverage.
    topology = json.loads(Path("route_topology.json").read_text())
    adjacency = topology.get("topology", {})
    config = RitvikConfig()
    scenarios["criteria_coverage"] = {
        "delay": {"status": "COMPUTED", "basis": "section_length_km / min(train speed, line speed)"},
        "capacity": {
            "status": "MODELLED",
            "basis": "RitvikConfig.section_capacities",
            "limitation": "Capacities are configured constants, not a dataset column.",
        },
        "train_priority": {
            "status": "APPLIED",
            "basis": "trains.csv priority_class; class 1 is never held",
        },
        "route_availability": {
            "status": "SEARCHED",
            "basis": "route_topology.json adjacency + block closures",
            "limitation": (
                f"Prototype topology: {len(adjacency)} of 200 sections have adjacency data. "
                "Conflicts on sections outside it cannot be rerouted and escalate to replanning."
            ),
        },
        "safety_constraints": {
            "status": "APPLIED",
            "basis": f"safety_buffer_minutes={config.safety_buffer_minutes} widens the possession window before overlap testing",
        },
        "rerouting": {"status": "IMPLEMENTED", "basis": "BFS over all simple paths, four feasibility gates"},
        "holding": {"status": "IMPLEMENTED", "basis": f"wait <= {config.max_acceptable_hold_minutes} min and priority_class != 1"},
        "downstream_impact": {
            "status": "NOT_IMPLEMENTED",
            "limitation": (
                "No knock-on delay propagation. trains.csv records one section occupancy "
                "per train with no onward itinerary, so downstream impact cannot be derived "
                "and is not scored."
            ),
        },
        "sequencing": {
            "status": "NOT_IMPLEMENTED",
            "limitation": "No precedence or platform-ordering model exists.",
        },
    }
    scenarios["provenance"] = {
        "scope": "RITVIK_OPERATIONAL_SCENARIOS",
        "generator": "scripts/generate_ritvik_scenarios.py",
        "note": (
            "Engine output. Section capacities are the demo values stated per "
            "scenario; delay figures are computed from section length and line "
            "speed in corridors_sections.csv."
        ),
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(scenarios, indent=2))

    for name in ("reroute", "hold", "replan", "block_unavailable"):
        s = scenarios[name]
        actions = s["decision"]["train_actions"]
        summary = ", ".join(
            f"{a['train_id']}={a['action']}"
            + (f" +{a['delay_estimate_minutes']}min" if a["delay_estimate_minutes"] is not None else "")
            for a in actions
        ) or "no train actions"
        print(f"{name:18s} {s['decision']['status']:18s} {summary}")
    print(f"wrote {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
