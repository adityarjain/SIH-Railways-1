"""
Generates the task inventory and completed-work artifacts the frontend renders.

Both are derived from the canonical dataset and the committed plan, so the
Demand table, Asset Health cards, My Tasks and the verification portal all show
values that trace back to `Arnav_Optimizer_Clean_Dataset/` rather than to
hand-maintained duplicates.

    PYTHONPATH=. python scripts/generate_tasks_inventory.py

Writes:
    frontend/src/data/tasks_inventory.json   task queue (scheduled + pending)
    frontend/src/data/completed_work.json    possessions already handed back

Task ids are stable: selection is a deterministic sort, never a sample.
"""

import csv
import json
from pathlib import Path
from typing import Any, Dict, List

from optimizer.config import OptimizerConfig
from optimizer.data_loader import load_dataset
from optimizer.priority import compute_task_priority

DATA_DIR = Path("Arnav_Optimizer_Clean_Dataset")
PLAN = Path("optimized_block_plan.json")
INVENTORY_OUT = Path("frontend/src/data/tasks_inventory.json")
COMPLETED_OUT = Path("frontend/src/data/completed_work.json")
NETWORK_OUT = Path("frontend/src/data/network_stats.json")
TRAFFIC_OUT = Path("frontend/src/data/section_traffic.json")

#: How many not-yet-scheduled tasks to carry alongside the scheduled ones, so the
#: Demand table has depth without shipping all 30,000 records to the browser.
PENDING_SAMPLE = 110

#: The date the demo presents as "now". Possessions before it are shown as
#: completed work awaiting verification.
SIMULATION_DATE = "2026-09-07"


def main() -> int:
    bundle = load_dataset(DATA_DIR)
    config = OptimizerConfig()
    plan = json.loads(PLAN.read_text())
    scheduled = {t["task_id"]: t for t in plan["scheduled_tasks"]}

    def record(task_id: str, status: str) -> Dict[str, Any]:
        task = bundle.tasks[task_id]
        neev = bundle.neev_predictions.get(task.asset_id)
        row: Dict[str, Any] = {
            "task_id": task.task_id,
            "asset_id": task.asset_id,
            "asset_type": neev.asset_type if neev else "",
            "maintenance_type": task.maintenance_type,
            "department": task.department,
            "corridor_id": task.corridor_id,
            "section_id": task.section_id,
            "task_date": task.task_date,
            "deadline": task.deadline,
            "required_duration_minutes": task.required_duration_minutes,
            "required_team_size": task.required_team_size,
            "can_bundle": task.can_bundle,
            "preferred_start_minute": task.preferred_start_minute,
            # The optimizer's own composite priority (Neev risk + urgency), not the
            # raw priority_score column, so the UI ranks tasks the way the solver does.
            "priority_score": round(compute_task_priority(task, config), 1),
            "risk_score": task.risk_score,
            "risk_level": task.risk_level,
            "failure_probability_30d": task.failure_probability_30d,
            "forecast_30d_degradation": task.forecast_30d_degradation,
            "status": status,
        }
        # Scheduling facts come from the plan, so no screen has to invent a window.
        if task_id in scheduled:
            s = scheduled[task_id]
            row.update(
                scheduled_date=s["date"],
                start_minute=s["start_minute"],
                end_minute=s["end_minute"],
                block_ids=s["block_ids"],
                assigned_teams=s["assigned_teams"],
                is_night=s.get("is_night", False),
                is_bundled=s.get("is_bundled", False),
            )
        return row

    inventory: List[Dict[str, Any]] = [record(tid, "Scheduled") for tid in sorted(scheduled)]

    pending_ids = sorted(tid for tid in bundle.tasks if tid not in scheduled)[:PENDING_SAMPLE]
    inventory.extend(record(tid, "Pending") for tid in pending_ids)
    inventory.sort(key=lambda r: r["task_id"])

    INVENTORY_OUT.parent.mkdir(parents=True, exist_ok=True)
    INVENTORY_OUT.write_text(json.dumps(inventory, indent=2))

    # Completed work: possessions whose scheduled date is before the simulation
    # date have been handed back and are what the verification portal reviews.
    completed = [
        {
            "task_id": r["task_id"],
            "asset_id": r["asset_id"],
            "maintenance_type": r["maintenance_type"],
            "department": r["department"],
            "corridor_id": r["corridor_id"],
            "section_id": r["section_id"],
            "execution_date": r["scheduled_date"],
            "block_ids": r["block_ids"],
            "assigned_teams": r["assigned_teams"],
            "start_minute": r["start_minute"],
            "end_minute": r["end_minute"],
            "duration_minutes": r["end_minute"] - r["start_minute"],
            "risk_score": r["risk_score"],
            "risk_level": r["risk_level"],
        }
        for r in inventory
        if r["status"] == "Scheduled" and r.get("scheduled_date", "") < SIMULATION_DATE
    ]
    completed.sort(key=lambda r: (r["execution_date"], r["task_id"]))
    COMPLETED_OUT.write_text(json.dumps(completed, indent=2))

    # Network availability, counted from blocks.csv. The Overview previously
    # showed a "94.2%" availability index that no artifact contained.
    blocks = list(bundle.blocks.values())
    available = sum(1 for b in blocks if b.track_available)
    sections = {b.section_id for b in blocks}
    network = {
        "total_block_windows": len(blocks),
        "track_available_block_windows": available,
        "track_availability_percent": round(100.0 * available / max(1, len(blocks)), 1),
        "sections": len(sections),
        "corridors": len({b.corridor_id for b in blocks}),
        "horizon_days": len({b.date for b in blocks}),
        "provenance": {
            "scope": "NETWORK_AVAILABILITY",
            "source": "Arnav_Optimizer_Clean_Dataset/blocks.csv (track_available column)",
            "generator": "scripts/generate_tasks_inventory.py",
        },
    }
    NETWORK_OUT.write_text(json.dumps(network, indent=2))
    print(f"wrote {NETWORK_OUT} (track availability "
          f"{network['track_availability_percent']}% of {network['total_block_windows']:,} windows)")

    # Per-section operational traffic for the simulation date, counted from
    # trains.csv / goods_forecast.csv / blocks.csv. The planning screen's traffic
    # panel previously showed fixed figures (18 trains, congestion 1.15, 8 slots)
    # that varied with nothing.
    PASSENGER_TYPES = {"EMU", "Superfast", "Passenger", "Express"}
    # Physical characteristics are in the CSV but not on the optimizer dataclass.
    section_physical: Dict[str, Dict[str, float]] = {}
    with open(DATA_DIR / "corridors_sections.csv", newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            section_physical[row["section_id"]] = {
                "section_length_km": float(row["section_length_km"]),
                "maximum_speed_kmph": float(row["maximum_speed_kmph"]),
            }
    traffic: Dict[str, Any] = {}
    for section_id in sorted(sections):
        day_trains = bundle.trains_by_date_section.get((SIMULATION_DATE, section_id), [])
        passenger = [t for t in day_trains if t.train_type in PASSENGER_TYPES]
        freight = [t for t in day_trains if t.train_type not in PASSENGER_TYPES]
        day_blocks = bundle.blocks_by_date_section.get((SIMULATION_DATE, section_id), [])
        meta = bundle.corridors_sections.get(section_id)
        gf = bundle.goods_forecast.get((SIMULATION_DATE, meta.corridor_id)) if meta else None
        phys = section_physical.get(section_id, {})
        traffic[section_id] = {
            "date": SIMULATION_DATE,
            "passenger_trains": len(passenger),
            "freight_trains": len(freight),
            "total_trains": len(day_trains),
            "peak_passenger_load_percent": round(
                max((t.passenger_load_percent for t in passenger), default=0.0), 1
            ),
            "freight_demand_index": round(gf.freight_demand_index, 2) if gf else None,
            "expected_freight_trains": gf.expected_freight_trains if gf else None,
            "available_block_windows": sum(1 for b in day_blocks if b.track_available),
            "total_block_windows": len(day_blocks),
            "max_simultaneous_tasks": max((b.max_simultaneous_tasks for b in day_blocks), default=0),
            "section_length_km": phys.get("section_length_km"),
            "maximum_speed_kmph": phys.get("maximum_speed_kmph"),
            # Busiest hour by passenger arrivals, or null when the section is quiet.
            "busiest_hour": (
                max(
                    {t.arrival_minute // 60 for t in passenger},
                    key=lambda h: sum(1 for t in passenger if t.arrival_minute // 60 == h),
                )
                if passenger else None
            ),
        }
    TRAFFIC_OUT.write_text(json.dumps(traffic, indent=2))
    print(f"wrote {TRAFFIC_OUT} ({len(traffic)} sections on {SIMULATION_DATE})")

    counts: Dict[str, int] = {}
    for r in inventory:
        counts[r["status"]] = counts.get(r["status"], 0) + 1
    print(f"wrote {INVENTORY_OUT} ({len(inventory)} tasks: {counts})")
    print(f"wrote {COMPLETED_OUT} ({len(completed)} possessions before {SIMULATION_DATE})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
