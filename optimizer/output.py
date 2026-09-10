"""
Output serialization module for Arnav's Railway Maintenance Optimizer.
Generates:
- optimized_block_plan.csv
- optimized_block_plan.json
- deferred_tasks.csv
- optimization_metrics.json
"""

from collections import Counter
from pathlib import Path
from typing import Dict, List, Any
import csv
import json

from optimizer.solver import OptimizationResult, ScheduledTaskRecord, DeferredTaskRecord
from optimizer.config import OptimizerConfig


def write_optimization_outputs(
    result: OptimizationResult,
    config: OptimizerConfig,
    output_dir: Path,
) -> Dict[str, Path]:
    """Writes all output files to the designated output directory."""
    output_dir.mkdir(parents=True, exist_ok=True)

    csv_path = output_dir / config.output_csv
    json_path = output_dir / config.output_json
    def_path = output_dir / config.output_deferred
    metrics_path = output_dir / config.output_metrics

    # 1. Write optimized_block_plan.csv
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "task_id",
            "asset_id",
            "department",
            "maintenance_type",
            "corridor_id",
            "section_id",
            "date",
            "start_minute",
            "end_minute",
            "duration_minutes",
            "block_ids",
            "assigned_teams",
            "is_bundled",
            "sharing_type",
            "bundled_with_task_ids",
            "is_night",
            "risk_score",
            "risk_level",
            "failure_probability_30d",
            "priority_score",
        ])
        for rec in result.scheduled_tasks.values():
            writer.writerow([
                rec.task_id,
                rec.asset_id,
                rec.department,
                rec.maintenance_type,
                rec.corridor_id,
                rec.section_id,
                rec.date,
                rec.execution_start_minute,
                rec.execution_end_minute,
                rec.duration_minutes,
                ";".join(rec.block_ids),
                ";".join(rec.assigned_team_ids),
                "Yes" if rec.is_bundled else "No",
                rec.sharing_type,
                ";".join(rec.bundled_with_task_ids) if rec.bundled_with_task_ids else "None",
                "Yes" if rec.is_night else "No",
                f"{rec.risk_score:.2f}",
                rec.risk_level,
                f"{rec.failure_probability_30d:.4f}",
                f"{rec.priority_score:.2f}",
            ])

    # 2. Write deferred_tasks.csv
    with open(def_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "task_id",
            "asset_id",
            "department",
            "corridor_id",
            "section_id",
            "task_date",
            "deadline",
            "risk_score",
            "risk_level",
            "failure_probability_30d",
            "priority_score",
            "required_duration_minutes",
            "required_team_size",
            "deferral_reason",
        ])
        for def_rec in result.deferred_tasks.values():
            writer.writerow([
                def_rec.task_id,
                def_rec.asset_id,
                def_rec.department,
                def_rec.corridor_id,
                def_rec.section_id,
                def_rec.task_date,
                def_rec.deadline,
                f"{def_rec.risk_score:.2f}",
                def_rec.risk_level,
                f"{def_rec.failure_probability_30d:.4f}",
                f"{def_rec.priority_score:.2f}",
                def_rec.required_duration_minutes,
                def_rec.required_team_size,
                def_rec.deferral_reason,
            ])

    # 3. Compute Metrics Breakdown
    # Tasks a scenario demo never evaluated are carried in deferred_tasks purely
    # so the inventory check stays complete. Counting them as deferred would
    # report unexamined work as a scheduling failure and sink the success rate,
    # so the risk breakdown covers evaluated tasks only. A full solve has no
    # such records and is unaffected.
    NOT_EVALUATED = {"not_in_demo_subset"}
    evaluated_deferred = [
        r for r in result.deferred_tasks.values() if r.deferral_reason not in NOT_EVALUATED
    ]

    sched_risks = [r.risk_score for r in result.scheduled_tasks.values()]
    def_risks = [r.risk_score for r in evaluated_deferred]

    critical_sched = sum(1 for r in sched_risks if r > 80.0)
    critical_def = sum(1 for r in def_risks if r > 80.0)
    high_sched = sum(1 for r in sched_risks if 60.0 < r <= 80.0)
    high_def = sum(1 for r in def_risks if 60.0 < r <= 80.0)
    moderate_sched = sum(1 for r in sched_risks if 30.0 < r <= 60.0)
    low_sched = sum(1 for r in sched_risks if r <= 30.0)

    # Unique blocks used
    all_used_blocks = set()
    for r in result.scheduled_tasks.values():
        all_used_blocks.update(r.block_ids)

    # Bundled tasks
    bundled_tasks_count = sum(1 for r in result.scheduled_tasks.values() if r.is_bundled)
    concurrent_count = sum(1 for r in result.scheduled_tasks.values() if r.sharing_type == "concurrent")
    serial_count = sum(1 for r in result.scheduled_tasks.values() if r.sharing_type == "serial")

    # Deferral reasons breakdown
    defer_counts = Counter(r.deferral_reason for r in result.deferred_tasks.values())

    # Team utilization hours
    team_minutes: Dict[str, int] = {}
    for r in result.scheduled_tasks.values():
        dur = r.duration_minutes
        for tm in r.assigned_team_ids:
            team_minutes[tm] = team_minutes.get(tm, 0) + dur

    metrics_data = {
        "summary": {
            "total_tasks_considered": result.total_tasks_considered,
            "total_scheduled": result.total_scheduled,
            "total_deferred": result.total_deferred,
            "scheduled_percentage": round(100.0 * result.total_scheduled / max(1, result.total_tasks_considered), 2),
            "solver_status": result.solver_status,
            "runtime_seconds": round(result.wall_time_seconds, 2),
            "objective_value": round(result.objective_value, 2),
        },
        "risk_breakdown": {
            "critical_risk_scheduled": critical_sched,
            "critical_risk_deferred": critical_def,
            "critical_scheduled_rate": round(100.0 * critical_sched / max(1, critical_sched + critical_def), 2),
            "high_risk_scheduled": high_sched,
            "high_risk_deferred": high_def,
            "moderate_risk_scheduled": moderate_sched,
            "low_risk_scheduled": low_sched,
        },
        "operational_metrics": {
            "unique_blocks_utilized": len(all_used_blocks),
            "bundled_tasks_count": bundled_tasks_count,
            "concurrent_bundles_count": result.total_concurrent_bundles,
            "serial_shared_possessions_count": result.total_serial_shared,
            "total_batch_excluded_instances": result.total_batch_excluded,
            "night_maintenance_tasks": sum(1 for r in result.scheduled_tasks.values() if r.is_night),
            "teams_utilized": len(team_minutes),
            "total_team_maintenance_hours": round(sum(team_minutes.values()) / 60.0, 1),
        },
        "deferral_reasons": dict(defer_counts),
    }

    # Write optimization_metrics.json
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics_data, f, indent=2)

    # 4. Write structured optimized_block_plan.json
    plan_json_data = {
        "metadata": {
            "generated_by": "Arnav Railway Maintenance Optimizer",
            "version": "1.0.0",
            "summary": metrics_data["summary"],
            "operational_metrics": metrics_data["operational_metrics"],
        },
        "scheduled_tasks": [
            {
                "task_id": r.task_id,
                "asset_id": r.asset_id,
                "department": r.department,
                "maintenance_type": r.maintenance_type,
                "corridor_id": r.corridor_id,
                "section_id": r.section_id,
                "date": r.date,
                "start_minute": r.execution_start_minute,
                "end_minute": r.execution_end_minute,
                "duration_minutes": r.duration_minutes,
                "block_ids": list(r.block_ids),
                "assigned_teams": list(r.assigned_team_ids),
                "is_bundled": r.is_bundled,
                "sharing_type": r.sharing_type,
                "bundled_with": list(r.bundled_with_task_ids),
                "is_night": r.is_night,
                "risk_score": r.risk_score,
                "priority_score": r.priority_score,
            }
            for r in result.scheduled_tasks.values()
        ],
    }

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(plan_json_data, f, indent=2)

    return {
        "csv": csv_path,
        "json": json_path,
        "deferred": def_path,
        "metrics": metrics_path,
    }
