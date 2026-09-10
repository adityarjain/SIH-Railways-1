"""
Regenerates decision_trace.json from the committed plan and the clean dataset.

The "Why did Arnav select this block?" screen renders this artifact. Running
this script is the only way the trace should ever change: it is computed from
train_block_conflicts.csv, blocks.csv and teams.csv rather than written by hand,
so each rejection reason cites the row that actually caused it.

    PYTHONPATH=. python scripts/generate_decision_trace.py [TASK_ID]
"""

import json
import sys
from pathlib import Path

from optimizer.data_loader import load_dataset
from optimizer.explain import build_decision_trace

TASK_ID = sys.argv[1] if len(sys.argv) > 1 else "TASK-000005"
PLAN = Path("optimized_block_plan.json")
OUT = Path("decision_trace.json")
FRONTEND_COPY = Path("frontend/src/data/decision_trace.json")


def main() -> int:
    bundle = load_dataset(Path("Arnav_Optimizer_Clean_Dataset"))
    plan = json.loads(PLAN.read_text())

    record = next((t for t in plan["scheduled_tasks"] if t["task_id"] == TASK_ID), None)
    if record is None:
        print(f"{TASK_ID} is not in {PLAN}; nothing to explain.")
        return 1

    trace = build_decision_trace(
        TASK_ID,
        bundle,
        selected_block_ids=record["block_ids"],
        selected_team_ids=record["assigned_teams"],
        selected_date=record["date"],
        execution_start_minute=record["start_minute"],
        execution_end_minute=record["end_minute"],
    )
    trace["provenance"] = {
        "scope": "DECISION_TRACE",
        "description": (
            "Per-candidate evaluation of every block window on the task's section "
            "and date, recomputed from the dataset. Not a narrative."
        ),
        "generator": "scripts/generate_decision_trace.py (optimizer/explain.py)",
        "plan_artifact": str(PLAN),
        "dataset": "Arnav_Optimizer_Clean_Dataset",
        "sources": [
            "blocks.csv (track_available, block windows)",
            "train_block_conflicts.csv (conflicting train ids)",
            "trains.csv (train types)",
            "teams.csv (department, shift windows, crew size)",
            "maintenance_tasks.csv (duration, deadline, crew requirement)",
        ],
    }

    payload = json.dumps(trace, indent=2)
    OUT.write_text(payload)
    print(f"wrote {OUT}")
    if FRONTEND_COPY.parent.is_dir():
        FRONTEND_COPY.write_text(payload)
        print(f"wrote {FRONTEND_COPY}")

    s = trace["candidate_summary"]
    print(f"  {s['block_windows_considered']} windows | {s['rejected']} rejected "
          f"{s['rejected_by_rule']} | {s['feasible']} feasible")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
