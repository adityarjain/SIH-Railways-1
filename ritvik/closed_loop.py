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
        )
