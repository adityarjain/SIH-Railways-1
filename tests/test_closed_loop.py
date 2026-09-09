"""
Unit and integration tests for the Arnav <-> Ritvik closed-loop integration.
"""

import json
from pathlib import Path
from ritvik.config import RitvikConfig
from ritvik.closed_loop import ClosedLoopController
from ritvik.data_loader import OperationalEvent
from ritvik.validator import validate_replan_request_file, validate_operational_decision

from optimizer.data_loader import load_dataset
from optimizer.preprocessing import preprocess_possessions
from optimizer.config import OptimizerConfig
from optimizer.replan import replan_from_request


def test_replan_from_request_direct(tmp_path):
    # Setup test copies of plan files
    workspace = Path(".")
    test_plan_path = tmp_path / "optimized_block_plan.json"
    with open(workspace / "optimized_block_plan.json", "r", encoding="utf-8") as f:
        test_plan_path.write_text(f.read(), encoding="utf-8")

    test_replan_req_path = tmp_path / "replan_request.json"
    req_data = {
        "event": "REPLAN_REQUEST",
        "reason": "NEW_TRAIN_CONFLICT",
        "maintenance_task_id": "TASK-000005",
        "section_id": "SEC-0004",
        "block_ids": ["BLK-009637", "BLK-009638"],
        "affected_window": {"start": "01:50", "end": "02:20"},
        "conflicting_trains": ["TRN-SIM-002"],
        "rerouting_attempted": True,
        "alternative_route_available": False,
        "action_required": "REPLAN_MAINTENANCE_BLOCK",
    }
    with open(test_replan_req_path, "w", encoding="utf-8") as f:
        json.dump(req_data, f, indent=2)

    bundle = load_dataset(workspace / "Arnav_Optimizer_Clean_Dataset")
    prep = preprocess_possessions(bundle)
    arnav_cfg = OptimizerConfig(output_dir=tmp_path)

    opt_res = replan_from_request(
        replan_request_path=test_replan_req_path,
        bundle=bundle,
        prep=prep,
        config=arnav_cfg,
        plan_json_path=test_plan_path,
        output_dir=tmp_path,
    )

    assert "TASK-000005" in opt_res.scheduled_tasks
    replanned_rec = opt_res.scheduled_tasks["TASK-000005"]

    # Must NOT use the forbidden blocks
    assert "BLK-009637" not in replanned_rec.block_ids
    assert "BLK-009638" not in replanned_rec.block_ids

    # Date must respect deadline (<= 2026-09-08)
    assert replanned_rec.date in {"2026-09-07", "2026-09-08"}
    assert replanned_rec.duration_minutes == 200


def test_closed_loop_full_cycle(tmp_path):
    workspace = Path(".")

    # Copy current plan to test directory
    test_plan_path = tmp_path / "optimized_block_plan.json"
    with open(workspace / "optimized_block_plan.json", "r", encoding="utf-8") as f:
        test_plan_path.write_text(f.read(), encoding="utf-8")

    ritvik_cfg = RitvikConfig(
        plan_json_path=test_plan_path,
        output_decision_path=tmp_path / "ritvik_operational_decision.json",
        replan_request_path=tmp_path / "replan_request.json",
        replan_output_dir=tmp_path / "replan_output",
    )
    # Saturate bypass corridors so rerouting is impossible
    ritvik_cfg.section_capacities["SEC-0005"] = 0
    ritvik_cfg.section_capacities["SEC-0007"] = 0

    arnav_cfg = OptimizerConfig(output_dir=tmp_path)

    controller = ClosedLoopController(ritvik_config=ritvik_cfg, arnav_config=arnav_cfg)

    # Disruption event EVT-002 conflicting with TASK-000005
    evt = OperationalEvent(
        event_id="EVT-002",
        event_type="NEW_TRAIN",
        train_id="TRN-SIM-002",
        section_id="SEC-0004",
        destination_section_id="SEC-0010",
        arrival_minute=110,
        departure_minute=140,
        date="2026-09-07",
        priority_class=1,
    )

    result = controller.run_cycle("TASK-000005", evt, write_outputs=True)

    assert result.cycle_success is True
    assert result.replan_requested is True
    assert result.initial_decision.status == "REPLAN_REQUEST"
    assert result.final_decision.status == "PLAN_APPROVED"
    assert result.final_decision.maintenance_plan_valid is True

    # The revised plan is written as a new artifact and avoids the blocked track
    replanned_path = ritvik_cfg.replan_output_dir / arnav_cfg.output_json
    with open(replanned_path, "r", encoding="utf-8") as f:
        updated_data = json.load(f)

    updated_task = next(t for t in updated_data["scheduled_tasks"] if t["task_id"] == "TASK-000005")
    assert "BLK-009637" not in updated_task["block_ids"]
    assert "BLK-009638" not in updated_task["block_ids"]

    # The baseline plan must survive the cycle untouched: it is the fixture the
    # demo events and every other scenario test are pinned to.
    with open(test_plan_path, "r", encoding="utf-8") as f:
        baseline_task = next(
            t for t in json.load(f)["scheduled_tasks"] if t["task_id"] == "TASK-000005"
        )
    assert baseline_task["block_ids"] == ["BLK-009637", "BLK-009638"]
    assert baseline_task["date"] == "2026-09-07"
