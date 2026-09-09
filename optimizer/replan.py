"""
Automated replanning engine for Arnav's Railway Maintenance Optimizer.
Handles targeted replan requests from Ritvik by blacklisting disrupted track blocks
and re-optimizing affected maintenance tasks via Google OR-Tools CP-SAT.
"""

import json
import time
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional, Any
from ortools.sat.python import cp_model

from optimizer.config import OptimizerConfig
from optimizer.data_loader import DatasetBundle, Task
from optimizer.preprocessing import PreprocessedData
from optimizer.candidate_generation import generate_candidates_for_task, CandidatePlacement
from optimizer.model import MaintenanceCPModel
from optimizer.objective import build_objective
from optimizer.solver import ScheduledTaskRecord, DeferredTaskRecord, OptimizationResult
from optimizer.priority import compute_task_priority
from optimizer.output import write_optimization_outputs


def replan_from_request(
    replan_request_path: Path,
    bundle: DatasetBundle,
    prep: PreprocessedData,
    config: Optional[OptimizerConfig] = None,
    plan_json_path: Optional[Path] = None,
    output_dir: Optional[Path] = None,
) -> OptimizationResult:
    """
    Consumes replan_request.json from Ritvik, blacklists the conflicted blocks/windows,
    and uses CP-SAT to select the next optimal feasible placement for the task.
    Updates optimized_block_plan.json, optimized_block_plan.csv, and metrics.
    """
    start_time = time.time()

    if config is None:
        config = OptimizerConfig()

    if plan_json_path is None:
        plan_json_path = config.output_dir / "optimized_block_plan.json"

    if output_dir is None:
        output_dir = config.output_dir

    if not replan_request_path.exists():
        raise FileNotFoundError(f"Replan request not found at {replan_request_path}")

    with open(replan_request_path, "r", encoding="utf-8") as f:
        replan_data = json.load(f)

    task_id = replan_data["maintenance_task_id"]
    forbidden_blocks = set(replan_data.get("block_ids", []))

    if task_id not in bundle.tasks:
        raise KeyError(f"Task {task_id} not found in authoritative dataset bundle.")

    task = bundle.tasks[task_id]

    # 1. Generate all candidate placements across task window [task_date, deadline]
    cands, _ = generate_candidates_for_task(task, prep, bundle)

    # 2. Exclude the forbidden/conflicted block combinations
    filtered_cands = [c for c in cands if not any(b in forbidden_blocks for b in c.block_ids)]

    if not filtered_cands:
        raise RuntimeError(f"No alternative feasible placements available for task {task_id} after excluding {forbidden_blocks}")

    # 3. Solve for optimal alternative placement using Google OR-Tools CP-SAT
    model_builder = MaintenanceCPModel(config)
    model_builder.build_model(
        tasks={task.task_id: task},
        candidates_by_task={task.task_id: filtered_cands},
        bundle=bundle,
    )
    build_objective(model_builder, config)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = config.solver_time_limit_seconds
    solver.parameters.num_search_workers = config.num_workers
    status_code = solver.Solve(model_builder.model)
    status_name = solver.StatusName(status_code)

    if status_name not in {"OPTIMAL", "FEASIBLE"}:
        raise RuntimeError(f"CP-SAT solver could not find a feasible replan solution (Status: {status_name})")

    # 4. Extract the selected candidate and assigned team
    selected_cand: Optional[CandidatePlacement] = None
    assigned_team_id: Optional[str] = None

    for (tid, cid), x_var in model_builder.x.items():
        if solver.Value(x_var) == 1:
            selected_cand = next(c for c in filtered_cands if c.candidate_id == cid)
            for (t_id, c_id, team_id), y_var in model_builder.y.items():
                if c_id == cid and solver.Value(y_var) == 1:
                    assigned_team_id = team_id
                    break
            break

    if selected_cand is None:
        raise RuntimeError(f"Solver returned {status_name} but no candidate variable was active.")

    if assigned_team_id is None and selected_cand.eligible_teams:
        assigned_team_id = selected_cand.eligible_teams[0]

    # 5. Build updated ScheduledTaskRecord
    prio_score = compute_task_priority(task, config, current_date=selected_cand.date)
    new_record = ScheduledTaskRecord(
        task_id=task.task_id,
        asset_id=task.asset_id,
        department=task.department,
        section_id=task.section_id,
        corridor_id=task.corridor_id,
        date=selected_cand.date,
        execution_start_minute=selected_cand.execution_start_minute,
        execution_end_minute=selected_cand.execution_end_minute,
        duration_minutes=task.required_duration_minutes,
        block_ids=selected_cand.block_ids,
        assigned_team_ids=(assigned_team_id,) if assigned_team_id else (),
        is_bundled=False,
        sharing_type="single",
        bundled_with_task_ids=(),
        is_night=selected_cand.is_night,
        risk_score=task.risk_score,
        risk_level=task.risk_level,
        failure_probability_30d=task.failure_probability_30d,
        priority_score=prio_score,
    )

    # 6. Load existing plan and update
    with open(plan_json_path, "r", encoding="utf-8") as f:
        plan_dict = json.load(f)

    updated_scheduled: Dict[str, ScheduledTaskRecord] = {}
    for item in plan_dict.get("scheduled_tasks", []):
        tid = item["task_id"]
        if tid == task_id:
            updated_scheduled[tid] = new_record
        else:
            t_obj = bundle.tasks.get(tid)
            updated_scheduled[tid] = ScheduledTaskRecord(
                task_id=tid,
                asset_id=item["asset_id"],
                department=item["department"],
                section_id=item["section_id"],
                corridor_id=item.get("corridor_id", ""),
                date=item["date"],
                execution_start_minute=int(item["start_minute"]),
                execution_end_minute=int(item["end_minute"]),
                duration_minutes=int(item["duration_minutes"]),
                block_ids=tuple(item.get("block_ids", [])),
                assigned_team_ids=tuple(item.get("assigned_teams", [])),
                is_bundled=bool(item.get("is_bundled", False)),
                sharing_type="concurrent" if item.get("is_bundled") else "single",
                bundled_with_task_ids=tuple(item.get("bundled_with", [])),
                is_night=bool(item.get("is_night", False)),
                risk_score=float(item.get("risk_score", 0.0)),
                risk_level=t_obj.risk_level if t_obj else "CRITICAL",
                failure_probability_30d=t_obj.failure_probability_30d if t_obj else 0.5,
                priority_score=float(item.get("priority_score", 0.0)),
            )

    # Populate remaining deferred tasks from bundle inventory
    deferred_all: Dict[str, DeferredTaskRecord] = {}
    for tid, t in bundle.tasks.items():
        if tid not in updated_scheduled:
            deferred_all[tid] = DeferredTaskRecord(
                task_id=tid,
                asset_id=t.asset_id,
                department=t.department,
                section_id=t.section_id,
                corridor_id=t.corridor_id,
                task_date=t.task_date,
                deadline=t.deadline,
                risk_score=t.risk_score,
                risk_level=t.risk_level,
                failure_probability_30d=t.failure_probability_30d,
                priority_score=compute_task_priority(t, config),
                required_duration_minutes=t.required_duration_minutes,
                required_team_size=t.required_team_size,
                # A replan only re-solves the disrupted task; it has no visibility
                # into why the base solve deferred the rest, so it must not invent one.
                deferral_reason="deferred_in_base_plan",
            )

    conc_bundles = sum(1 for r in updated_scheduled.values() if r.sharing_type == "concurrent") // 2

    res = OptimizationResult(
        scheduled_tasks=updated_scheduled,
        deferred_tasks=deferred_all,
        solver_status="FEASIBLE",
        wall_time_seconds=time.time() - start_time,
        objective_value=solver.ObjectiveValue(),
        total_tasks_considered=len(bundle.tasks),
        total_scheduled=len(updated_scheduled),
        total_deferred=len(deferred_all),
        total_concurrent_bundles=conc_bundles,
    )

    write_optimization_outputs(res, config, output_dir)
    return res
