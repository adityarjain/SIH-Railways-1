"""
Closed-loop controller orchestrating the interaction between Ritvik and Arnav.
Manages the end-to-end feedback loop:
Initial Plan -> Operational Disruption -> Conflict Detection -> Rerouting Attempt ->
Replan Request -> Arnav CP-SAT Re-optimization -> Plan Update -> Ritvik Re-validation -> Final Approval.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Any

from ritvik.config import RitvikConfig
from ritvik.engine import RitvikEngine
from ritvik.data_loader import OperationalEvent, ScheduledMaintenance
from ritvik.decision import OperationalDecision
from ritvik.conflict_detector import ConflictReport
from ritvik.rerouting import RerouteResult
from ritvik.validator import validate_operational_decision, validate_replan_request_file

from optimizer.data_loader import DatasetBundle, load_dataset
from optimizer.preprocessing import PreprocessedData, preprocess_possessions
from optimizer.config import OptimizerConfig
from optimizer.replan import replan_from_request


@dataclass
class ClosedLoopCycleResult:
    task_id: str
    event: OperationalEvent
    initial_schedule: ScheduledMaintenance
    initial_conflict: ConflictReport
    initial_decision: OperationalDecision
    initial_reroute: Optional[RerouteResult]
    replan_requested: bool
    replan_request_path: Optional[Path]
    replanned_schedule: Optional[ScheduledMaintenance]
    final_conflict: Optional[ConflictReport]
    final_decision: Optional[OperationalDecision]
    cycle_success: bool
    summary: str
    #: Structured record of what the cycle actually did, for the audit UI.
    metadata: Dict[str, Any] = field(default_factory=dict)


class ClosedLoopController:
    """Coordinates dynamic replanning feedback between Ritvik and Arnav."""

    def __init__(
        self,
        ritvik_config: Optional[RitvikConfig] = None,
        arnav_config: Optional[OptimizerConfig] = None,
    ):
        self.ritvik_config = ritvik_config or RitvikConfig()
        self.arnav_config = arnav_config or OptimizerConfig()

        self.ritvik_engine = RitvikEngine(self.ritvik_config)
        self.ritvik_engine.initialize()

        self.bundle: Optional[DatasetBundle] = None
        self.prep: Optional[PreprocessedData] = None

    def initialize_arnav(self):
        """Pre-loads Arnav dataset bundle and preprocessed possessions."""
        if self.bundle is None:
            self.bundle = load_dataset(self.arnav_config.data_dir)
        if self.prep is None:
            self.prep = preprocess_possessions(self.bundle)


    def _build_metadata(
        self,
        task_id: str,
        event: OperationalEvent,
        initial_maint: ScheduledMaintenance,
        initial_conflict: ConflictReport,
        initial_decision: OperationalDecision,
        initial_reroute: Optional[RerouteResult],
        replanned_maint: Optional[ScheduledMaintenance] = None,
        replan_runtime_seconds: Optional[float] = None,
        replan_output_dir: Optional[Path] = None,
    ) -> Dict[str, Any]:
        """
        Describes the cycle in terms of what was actually attempted and chosen,
        so the audit UI never has to infer or narrate it.
        """
        held = [a for a in initial_decision.train_actions if a.action == "HELD"]
        rerouted = [a for a in initial_decision.train_actions if a.action == "REROUTED"]
        inspected = initial_reroute.inspected_candidates if initial_reroute else []
        rerouting_attempted = initial_reroute is not None

        if rerouted:
            action = "REROUTE"
        elif held:
            action = "HOLD"
        elif replanned_maint is not None:
            action = "REPLAN_MAINTENANCE"
        else:
            action = "NONE"

        metadata: Dict[str, Any] = {
            "affected_task_id": task_id,
            "event": {
                "event_id": event.event_id,
                "event_type": event.event_type,
                "train_id": event.train_id,
                "section_id": event.section_id,
                "date": event.date,
                "arrival_minute": event.arrival_minute,
                "departure_minute": event.departure_minute,
            },
            "original_plan": {
                "date": initial_maint.date,
                "start_minute": initial_maint.start_minute,
                "end_minute": initial_maint.end_minute,
                "block_ids": list(initial_maint.block_ids),
                "assigned_teams": list(initial_maint.assigned_teams),
            },
            "affected_trains": [tr.train_id for tr in initial_conflict.conflicting_trains],
            "conflict_type": initial_conflict.conflict_type,
            "overlap_window": list(initial_conflict.overlap_window) if initial_conflict.overlap_window else None,
            # Rerouting is only attempted for train conflicts; a BLOCK_UNAVAILABLE
            # closure short-circuits before any route search.
            "rerouting_attempted": rerouting_attempted,
            "rerouting_candidates_inspected": len(inspected),
            "rerouting_succeeded": bool(initial_reroute and initial_reroute.route_found),
            "rejected_routes": [c for c in inspected if c.get("status") == "REJECTED"],
            # Holding is considered only once rerouting has failed.
            "hold_attempted": rerouting_attempted and not (initial_reroute and initial_reroute.route_found),
            "hold_selected": bool(held),
            "hold_limit_minutes": self.ritvik_config.max_acceptable_hold_minutes,
            "action_taken": action,
            "train_actions": [a.to_dict() for a in initial_decision.train_actions],
            "baseline_plan_untouched": True,
        }

        if replanned_maint is not None:
            total_records = len(self.ritvik_engine.maintenance_plan)
            metadata.update(
                replanned_plan={
                    "date": replanned_maint.date,
                    "start_minute": replanned_maint.start_minute,
                    "end_minute": replanned_maint.end_minute,
                    "block_ids": list(replanned_maint.block_ids),
                    "assigned_teams": list(replanned_maint.assigned_teams),
                },
                selected_crew=list(replanned_maint.assigned_teams),
                replan_runtime_seconds=(
                    round(replan_runtime_seconds, 3) if replan_runtime_seconds is not None else None
                ),
                replan_artifacts_directory=str(replan_output_dir) if replan_output_dir else None,
                unaffected_plan_retention={
                    "tasks_in_plan": total_records,
                    "tasks_re_solved": 1,
                    "tasks_unchanged": max(0, total_records - 1),
                    "retention_percent": 100.0,
                    # Stated as a property of the current scope, not a benchmark.
                    "basis": "by_construction",
                    "caveat": (
                        "The replan scope is a single task; every other record is copied "
                        "unchanged. 100% retention follows from that scope and is not a "
                        "measurement of plan stability under broader re-optimization."
                    ),
                },
            )
        return metadata

    def run_cycle(
        self,
        task_id: str,
        event: OperationalEvent,
        write_outputs: bool = True,
    ) -> ClosedLoopCycleResult:
        """
        Executes the full 6-step closed-loop cycle for an operational disruption.
        """
        self.initialize_arnav()
        assert self.bundle is not None
        assert self.prep is not None

        # Step 1: Ingest current maintenance plan
        self.ritvik_engine.initialize()
        if task_id not in self.ritvik_engine.maintenance_plan:
            raise KeyError(f"Task {task_id} not found in maintenance plan.")
        initial_maint = self.ritvik_engine.maintenance_plan[task_id]

        # Step 2 & 3: Conflict detection and reroute feasibility analysis
        init_res = self.ritvik_engine.process_scenario(task_id, [event], write_outputs=write_outputs)
        initial_decision = init_res["decision"]
        initial_conflict = init_res["conflict_report"]
        initial_reroute = init_res["reroute_results"][0] if init_res["reroute_results"] else None

        # If conflict was resolved via train rerouting or no conflict existed:
        if not initial_decision.replanning_required:
            return ClosedLoopCycleResult(
                task_id=task_id,
                event=event,
                initial_schedule=initial_maint,
                initial_conflict=initial_conflict,
                initial_decision=initial_decision,
                initial_reroute=initial_reroute,
                replan_requested=False,
                replan_request_path=None,
                replanned_schedule=initial_maint,
                final_conflict=initial_conflict,
                final_decision=initial_decision,
                cycle_success=True,
                summary=f"Disruption resolved operationally ({initial_decision.status}); no replanning required.",
                metadata=self._build_metadata(
                    task_id, event, initial_maint, initial_conflict, initial_decision, initial_reroute
                ),
            )

        # Step 4: Replanning required -> replan_request.json generated
        replan_req_path = self.ritvik_config.replan_request_path
        validate_replan_request_file(replan_req_path)

        # Step 5: Arnav re-optimizes maintenance plan using CP-SAT.
        # Reads the baseline plan but writes the revised artifacts to a separate
        # directory: the baseline is a fixture for the tests and demo events, and
        # overwriting it in place silently invalidates every downstream scenario.
        replan_out_dir = self.ritvik_config.replan_output_dir
        opt_res = replan_from_request(
            replan_request_path=replan_req_path,
            bundle=self.bundle,
            prep=self.prep,
            config=self.arnav_config,
            plan_json_path=self.ritvik_config.plan_json_path,
            output_dir=replan_out_dir,
        )

        # Step 6: Ritvik re-loads and re-validates against the revised plan
        self.ritvik_engine.config.plan_json_path = replan_out_dir / self.arnav_config.output_json
        self.ritvik_engine.initialize()
        replanned_maint = self.ritvik_engine.maintenance_plan[task_id]

        # Re-evaluate against the operational state
        final_decision, final_conflict, final_reroutes = self.ritvik_engine.evaluate_task(task_id, [event])

        # Write final confirmed operational decision for Aditya
        if write_outputs:
            from ritvik.output import serialize_operational_decision
            serialize_operational_decision(final_decision, self.ritvik_config.output_decision_path)

        cycle_ok = (final_decision.status == "PLAN_APPROVED" and final_decision.maintenance_plan_valid)

        summary_msg = (
            f"Closed loop completed successfully: {task_id} re-scheduled from "
            f"{initial_maint.date} ({initial_maint.start_minute}-{initial_maint.end_minute} min) to "
            f"{replanned_maint.date} ({replanned_maint.start_minute}-{replanned_maint.end_minute} min). "
            f"Final Status: {final_decision.status}."
        )

        return ClosedLoopCycleResult(
            task_id=task_id,
            event=event,
            initial_schedule=initial_maint,
            initial_conflict=initial_conflict,
            initial_decision=initial_decision,
            initial_reroute=initial_reroute,
            replan_requested=True,
            replan_request_path=replan_req_path,
            replanned_schedule=replanned_maint,
            final_conflict=final_conflict,
            final_decision=final_decision,
            cycle_success=cycle_ok,
            summary=summary_msg,
            metadata=self._build_metadata(
                task_id, event, initial_maint, initial_conflict, initial_decision, initial_reroute,
                replanned_maint=replanned_maint,
                replan_runtime_seconds=opt_res.wall_time_seconds,
                replan_output_dir=replan_out_dir,
            ),
        )
