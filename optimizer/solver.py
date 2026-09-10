"""
Solver orchestration module for Arnav's Railway Maintenance Optimizer.
Coordinates CP-SAT solves with exact global team non-overlap (S007), flexible task timing offsets,
concurrent vs serial possession sharing, and rolling-horizon execution.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Set, Tuple, Optional
import time

from ortools.sat.python import cp_model
from optimizer.data_loader import Task, DatasetBundle
from optimizer.preprocessing import PreprocessedData
from optimizer.candidate_generation import (
    CandidatePlacement,
    CandidateGenerationResult,
    generate_candidates_for_task,
)
from optimizer.model import MaintenanceCPModel
from optimizer.objective import build_objective
from optimizer.config import OptimizerConfig
from optimizer.priority import compute_task_priority


@dataclass
class ScheduledTaskRecord:
    task_id: str
    asset_id: str
    department: str
    maintenance_type: str
    section_id: str
    corridor_id: str
    date: str
    execution_start_minute: int
    execution_end_minute: int
    duration_minutes: int
    block_ids: Tuple[str, ...]
    assigned_team_ids: Tuple[str, ...]
    is_bundled: bool
    sharing_type: str  # 'single', 'concurrent', 'serial'
    bundled_with_task_ids: Tuple[str, ...]
    is_night: bool
    risk_score: float
    risk_level: str
    failure_probability_30d: float
    priority_score: float


@dataclass
class DeferredTaskRecord:
    task_id: str
    asset_id: str
    department: str
    section_id: str
    corridor_id: str
    task_date: str
    deadline: str
    risk_score: float
    risk_level: str
    failure_probability_30d: float
    priority_score: float
    required_duration_minutes: int
    required_team_size: int
    deferral_reason: str


@dataclass
class OptimizationResult:
    scheduled_tasks: Dict[str, ScheduledTaskRecord] = field(default_factory=dict)
    deferred_tasks: Dict[str, DeferredTaskRecord] = field(default_factory=dict)
    solver_status: str = "UNKNOWN"
    wall_time_seconds: float = 0.0
    objective_value: float = 0.0
    total_tasks_considered: int = 0
    total_scheduled: int = 0
    total_deferred: int = 0
    total_concurrent_bundles: int = 0
    total_serial_shared: int = 0
    total_batch_excluded: int = 0


def solve_day_batch(
    active_tasks: Dict[str, Task],
    date_str: str,
    prep: PreprocessedData,
    bundle: DatasetBundle,
    config: OptimizerConfig,
) -> Tuple[Dict[str, ScheduledTaskRecord], Dict[str, str], float, str]:
    """
    Solves optimization for active tasks on a specific date.
    Enforces exact block capacities, bundling rules, flexible task timing offsets,
    and global team non-overlap.
    Returns (scheduled_records, deferred_reasons, obj_value, status).
    """
    # 1. Generate candidate possessions strictly on date_str with timing offsets
    candidates_by_task: Dict[str, List[CandidatePlacement]] = {}
    eligible_tasks: Dict[str, Task] = {}

    for tid, task in active_tasks.items():
        if task.task_date <= date_str <= task.deadline:
            daily_possessions = prep.possessions_by_date_section.get((date_str, task.section_id), [])
            cands: List[CandidatePlacement] = []
            dur = task.required_duration_minutes
            dept_teams = bundle.teams_by_department.get(task.department, [])

            min_blocks = 1 if dur <= 120 else (2 if dur <= 240 else 3)
            max_blocks = min_blocks

            for poss in daily_possessions:
                if len(poss.block_ids) != min_blocks:
                    continue

                slack = poss.end_minute - poss.start_minute - dur
                if slack < 0:
                    continue

                offsets = {0}
                if slack > 0:
                    offsets.add(slack)
                    pref = task.preferred_start_minute
                    if poss.start_minute <= pref <= poss.end_minute - dur:
                        offsets.add(pref - poss.start_minute)
                    if slack >= 60:
                        offsets.add(30)
                        offsets.add(60)

                for offset in sorted(offsets):
                    exec_start = poss.start_minute + offset
                    exec_end = exec_start + dur
                    if exec_end > poss.end_minute:
                        continue

                    # Team shift feasibility (C004, S005)
                    eligible_teams = [
                        team.team_id for team in dept_teams
                        if team.shift_start_minute <= exec_start and exec_end <= team.shift_end_minute
                    ]
                    if not eligible_teams:
                        continue

                    cands.append(
                        CandidatePlacement(
                            candidate_id=f"CAND-{tid}-{poss.possession_id}-O{offset}",
                            task_id=tid,
                            possession_id=poss.possession_id,
                            date=date_str,
                            section_id=task.section_id,
                            corridor_id=task.corridor_id,
                            block_ids=poss.block_ids,
                            execution_start_minute=exec_start,
                            execution_end_minute=exec_end,
                            possession_start_minute=poss.start_minute,
                            possession_end_minute=poss.end_minute,
                            timing_offset_minutes=offset,
                            eligible_teams=tuple(eligible_teams),
                            is_night=poss.night_preference,
                            freight_demand_index=poss.freight_demand_index,
                            passenger_impact=poss.passenger_impact,
                        )
                    )

            if cands:
                candidates_by_task[tid] = cands
                eligible_tasks[tid] = task

    if not eligible_tasks:
        reasons = {}
        for tid, task in active_tasks.items():
            daily_poss = prep.possessions_by_date_section.get((date_str, task.section_id), [])
            if not daily_poss:
                reasons[tid] = "no_feasible_track_block"
            else:
                reasons[tid] = "no_qualifying_team_shift"
        return {}, reasons, 0.0, "NO_ELIGIBLE_TASKS"

    # 2. Build CP-SAT model
    cp = MaintenanceCPModel(config)
    cp.build_model(eligible_tasks, candidates_by_task, bundle)
    build_objective(cp, config)

    # 3. Solve with CP-SAT
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = config.solver_time_limit_seconds
    solver.parameters.num_workers = config.num_workers
    solver.parameters.log_search_progress = config.log_search_progress

    status = solver.Solve(cp.model)
    status_name = solver.StatusName(status)

    scheduled: Dict[str, ScheduledTaskRecord] = {}
    deferred_reasons: Dict[str, str] = {}

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        # Extract scheduled placements
        block_to_scheduled_tasks: Dict[str, List[str]] = {}

        for (tid, cand_id), x_var in cp.x.items():
            if solver.Value(x_var) == 1:
                cand = cp.cand_map[(tid, cand_id)]
                task = cp.task_map[tid]

                # Find assigned team(s)
                assigned_teams: List[str] = []
                for team_id in cand.eligible_teams:
                    y_key = (tid, cand_id, team_id)
                    if y_key in cp.y and solver.Value(cp.y[y_key]) == 1:
                        assigned_teams.append(team_id)

                rec = ScheduledTaskRecord(
                    task_id=tid,
                    asset_id=task.asset_id,
                    department=task.department,
                    maintenance_type=task.maintenance_type,
                    section_id=task.section_id,
                    corridor_id=task.corridor_id,
                    date=date_str,
                    execution_start_minute=cand.execution_start_minute,
                    execution_end_minute=cand.execution_end_minute,
                    duration_minutes=task.required_duration_minutes,
                    block_ids=cand.block_ids,
                    assigned_team_ids=tuple(assigned_teams),
                    is_bundled=False,
                    sharing_type="single",
                    bundled_with_task_ids=(),
                    is_night=cand.is_night,
                    risk_score=task.risk_score,
                    risk_level=task.risk_level,
                    failure_probability_30d=task.failure_probability_30d,
                    priority_score=compute_task_priority(task, config, current_date=date_str),
                )
                scheduled[tid] = rec

                for bid in cand.block_ids:
                    block_to_scheduled_tasks.setdefault(bid, []).append(tid)

        # Classify sharing type (concurrent bundle vs serial possession sharing)
        for bid, task_ids in block_to_scheduled_tasks.items():
            if len(task_ids) > 1:
                for i, tid1 in enumerate(task_ids):
                    r1 = scheduled[tid1]
                    s1, e1 = r1.execution_start_minute, r1.execution_end_minute
                    is_conc = False
                    is_ser = False
                    others = tuple(sorted([other for other in task_ids if other != tid1]))

                    for j, tid2 in enumerate(task_ids):
                        if i == j:
                            continue
                        r2 = scheduled[tid2]
                        s2, e2 = r2.execution_start_minute, r2.execution_end_minute
                        overlap = max(0, min(e1, e2) - max(s1, s2))
                        if overlap >= config.default_min_overlap_minutes:
                            is_conc = True
                        elif overlap == 0:
                            is_ser = True

                    stype = "concurrent" if is_conc else ("serial" if is_ser else "single")
                    is_b = (stype == "concurrent")

                    scheduled[tid1] = ScheduledTaskRecord(
                        task_id=r1.task_id,
                        asset_id=r1.asset_id,
                        department=r1.department,
                        maintenance_type=r1.maintenance_type,
                        section_id=r1.section_id,
                        corridor_id=r1.corridor_id,
                        date=r1.date,
                        execution_start_minute=r1.execution_start_minute,
                        execution_end_minute=r1.execution_end_minute,
                        duration_minutes=r1.duration_minutes,
                        block_ids=r1.block_ids,
                        assigned_team_ids=r1.assigned_team_ids,
                        is_bundled=is_b,
                        sharing_type=stype,
                        bundled_with_task_ids=others,
                        is_night=r1.is_night,
                        risk_score=r1.risk_score,
                        risk_level=r1.risk_level,
                        failure_probability_30d=r1.failure_probability_30d,
                        priority_score=r1.priority_score,
                    )

        # Track scheduled teams usage: team_id -> list of (start, end)
        scheduled_team_intervals: Dict[str, List[Tuple[int, int]]] = {}
        for rec in scheduled.values():
            for tm in rec.assigned_team_ids:
                scheduled_team_intervals.setdefault(tm, []).append((rec.execution_start_minute, rec.execution_end_minute))

        # Determine evidence-based deferred reasons for active tasks not scheduled today
        for tid, task in active_tasks.items():
            if tid in scheduled:
                continue

            cands = candidates_by_task.get(tid, [])
            if not cands:
                daily_poss = prep.possessions_by_date_section.get((date_str, task.section_id), [])
                if not daily_poss:
                    deferred_reasons[tid] = "no_feasible_track_block"
                else:
                    deferred_reasons[tid] = "no_qualifying_team_shift"
            else:
                # Check if all candidate blocks were at capacity
                all_blocks_full = True
                for c in cands:
                    for bid in c.block_ids:
                        cur_occ = len(block_to_scheduled_tasks.get(bid, []))
                        if cur_occ < bundle.blocks[bid].max_simultaneous_tasks:
                            all_blocks_full = False
                            break
                    if not all_blocks_full:
                        break

                if all_blocks_full:
                    deferred_reasons[tid] = "block_capacity_exhausted"
                else:
                    # Check if all candidate teams were busy during candidate execution windows
                    all_teams_busy = True
                    for c in cands:
                        for tm in c.eligible_teams:
                            team_busy = False
                            for (t_s, t_e) in scheduled_team_intervals.get(tm, []):
                                if not (c.execution_end_minute <= t_s or c.execution_start_minute >= t_e):
                                    team_busy = True
                                    break
                            if not team_busy:
                                all_teams_busy = False
                                break
                        if not all_teams_busy:
                            break

                    if all_teams_busy:
                        deferred_reasons[tid] = "team_capacity_exhausted"
                    else:
                        deferred_reasons[tid] = "solver_objective_outranked"

    return scheduled, deferred_reasons, solver.ObjectiveValue() if status in (cp_model.OPTIMAL, cp_model.FEASIBLE) else 0.0, status_name


def solve_maintenance_plan(
    bundle: DatasetBundle,
    prep: PreprocessedData,
    config: OptimizerConfig,
    tasks_to_solve: Optional[Dict[str, Task]] = None,
) -> OptimizationResult:
    """
    Executes the global maintenance optimization plan across the entire planning horizon.
    Solves day-by-day while coordinating global resources and rolling over deferred tasks.
    """
    start_time = time.time()
    tasks = tasks_to_solve if tasks_to_solve is not None else bundle.tasks

    # Collect sorted dates in planning horizon
    all_dates = sorted(list(set(b.date for b in bundle.blocks.values())))

    pending_tasks: Dict[str, Task] = dict(tasks)
    scheduled_all: Dict[str, ScheduledTaskRecord] = {}
    deferred_all: Dict[str, DeferredTaskRecord] = {}

    total_obj = 0.0
    status_summary = "FEASIBLE"
    concurrent_bundle_count = 0
    serial_shared_count = 0
    total_batch_excluded = 0

    print(f"Starting Railway Maintenance Optimizer...", flush=True)
    print(f"Total tasks: {len(tasks)}, Planning horizon: {len(all_dates)} days ({all_dates[0]} to {all_dates[-1]})", flush=True)

    for day_idx, cur_date in enumerate(all_dates):
        # Identify active tasks eligible for today: task_date <= cur_date <= deadline
        active_today = {
            tid: t for tid, t in pending_tasks.items()
            if t.task_date <= cur_date <= t.deadline
        }

        if not active_today:
            continue

        # Rank active tasks by dynamic composite priority (C011: Neev risk + dynamic urgency relative to cur_date)
        sorted_active = sorted(
            active_today.values(),
            key=lambda t: compute_task_priority(t, config, current_date=cur_date),
            reverse=True,
        )

        # Prioritize top candidates up to configured daily candidate pool
        batch_limit = config.max_daily_candidate_pool
        batch_tasks = {t.task_id: t for t in sorted_active[:batch_limit]}
        excluded_today = {t.task_id: t for t in sorted_active[batch_limit:]}
        total_batch_excluded += len(excluded_today)

        scheduled_today, day_deferred_reasons, obj_val, status = solve_day_batch(
            batch_tasks, cur_date, prep, bundle, config
        )
        total_obj += obj_val

        # Update scheduled tasks
        for tid, rec in scheduled_today.items():
            scheduled_all[tid] = rec
            if rec.sharing_type == "concurrent":
                concurrent_bundle_count += 1
            elif rec.sharing_type == "serial":
                serial_shared_count += 1
            if tid in pending_tasks:
                del pending_tasks[tid]

        # For tasks eligible today that were not scheduled:
        # If today reached their deadline, they can no longer be scheduled -> permanently defer
        for tid, task in active_today.items():
            if tid not in scheduled_today:
                if cur_date >= task.deadline:
                    if tid in excluded_today:
                        reason = "batch_limit_excluded_on_deadline"
                    else:
                        reason = day_deferred_reasons.get(tid, "solver_objective_outranked")

                    deferred_all[tid] = DeferredTaskRecord(
                        task_id=tid,
                        asset_id=task.asset_id,
                        department=task.department,
                        section_id=task.section_id,
                        corridor_id=task.corridor_id,
                        task_date=task.task_date,
                        deadline=task.deadline,
                        risk_score=task.risk_score,
                        risk_level=task.risk_level,
                        failure_probability_30d=task.failure_probability_30d,
                        priority_score=compute_task_priority(task, config, current_date=cur_date),
                        required_duration_minutes=task.required_duration_minutes,
                        required_team_size=task.required_team_size,
                        deferral_reason=reason,
                    )
                    if tid in pending_tasks:
                        del pending_tasks[tid]

        print(
            f"  Day {day_idx + 1:2d} ({cur_date}): Scheduled {len(scheduled_today):4d} tasks, "
            f"Cumulative Scheduled: {len(scheduled_all):5d}, "
            f"Batch Excluded Today: {len(excluded_today):4d}",
            flush=True,
        )

    # Any remaining pending tasks that never reached an active window in the horizon:
    for tid, task in pending_tasks.items():
        deferred_all[tid] = DeferredTaskRecord(
            task_id=tid,
            asset_id=task.asset_id,
            department=task.department,
            section_id=task.section_id,
            corridor_id=task.corridor_id,
            task_date=task.task_date,
            deadline=task.deadline,
            risk_score=task.risk_score,
            risk_level=task.risk_level,
            failure_probability_30d=task.failure_probability_30d,
            priority_score=compute_task_priority(task, config),
            required_duration_minutes=task.required_duration_minutes,
            required_team_size=task.required_team_size,
            deferral_reason="no_candidate_window_within_horizon",
        )

    wall_time = time.time() - start_time

    return OptimizationResult(
        scheduled_tasks=scheduled_all,
        deferred_tasks=deferred_all,
        solver_status=status_summary,
        wall_time_seconds=wall_time,
        objective_value=total_obj,
        total_tasks_considered=len(tasks),
        total_scheduled=len(scheduled_all),
        total_deferred=len(deferred_all),
        total_concurrent_bundles=concurrent_bundle_count // 2,
        total_serial_shared=serial_shared_count // 2,
        total_batch_excluded=total_batch_excluded,
    )
