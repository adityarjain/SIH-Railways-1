"""
Central orchestration engine for Ritvik.
Integrates data loading, conflict detection, capacity analysis, route feasibility search,
decision formulation, and artifact serialization.
"""

from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

from ritvik.config import RitvikConfig
from ritvik.data_loader import (
    ScheduledMaintenance,
    TrainMovement,
    OperationalEvent,
    load_maintenance_plan,
    load_route_topology,
    load_trains_csv,
    load_operational_events,
    load_corridors_sections,
)
from ritvik.conflict_detector import ConflictDetector, ConflictReport
from ritvik.capacity import CapacityEvaluator
from ritvik.rerouting import ReroutingEngine, RerouteResult
from ritvik.decision import DecisionEngine, OperationalDecision
from ritvik.output import serialize_operational_decision, serialize_replan_request


class RitvikEngine:
    """Orchestrates dynamic railway operations analysis, rerouting, and replanning triggers."""

    def __init__(self, config: Optional[RitvikConfig] = None):
        self.config = config or RitvikConfig()
        self.maintenance_plan: Dict[str, ScheduledMaintenance] = {}
        self.topology: Dict[str, List[str]] = {}
        self.existing_trains: List[TrainMovement] = []
        self.events: List[OperationalEvent] = []
        self.corridor_meta: Dict[str, Dict[str, str]] = {}

        self.conflict_detector = ConflictDetector(self.config.safety_buffer_minutes)
        self.capacity_evaluator = CapacityEvaluator(self.config)
        self.rerouting_engine: Optional[ReroutingEngine] = None

    def initialize(self):
        """Loads authoritative maintenance plan, network topology, baseline trains, and metadata."""
        if self.config.plan_json_path.exists():
            self.maintenance_plan = load_maintenance_plan(self.config.plan_json_path)

        trains_csv = self.config.data_dir / "trains.csv"
        if trains_csv.exists():
            self.existing_trains = load_trains_csv(trains_csv)

        sections_csv = self.config.data_dir / "corridors_sections.csv"
        if sections_csv.exists():
            self.corridor_meta = load_corridors_sections(sections_csv)

        # Built after corridor_meta so the rerouting engine can compute detour
        # delay from real section length and line speed.
        if self.config.topology_path.exists():
            self.topology = load_route_topology(self.config.topology_path)
            self.rerouting_engine = ReroutingEngine(
                self.topology, self.capacity_evaluator, self.config, section_meta=self.corridor_meta
            )

        if self.config.events_path.exists():
            self.events = load_operational_events(self.config.events_path)

    def evaluate_task(
        self,
        task_id: str,
        events: Optional[List[OperationalEvent]] = None,
    ) -> Tuple[OperationalDecision, ConflictReport, List[RerouteResult]]:
        """
        Evaluates a specific scheduled maintenance task against given or loaded operational events.
        Performs conflict detection, capacity analysis, and alternative route search when necessary.
        """
        if task_id not in self.maintenance_plan:
            raise KeyError(f"Task {task_id} not found in maintenance plan.")

        maint = self.maintenance_plan[task_id]
        active_events = events if events is not None else self.events

        # 1. Conflict Detection
        conflict_report = self.conflict_detector.detect_conflicts(
            maint=maint,
            trains=self.existing_trains,
            events=active_events,
        )

        reroute_results: List[RerouteResult] = []

        # 2. Rerouting Search (only if conflict is train-based)
        if conflict_report.has_conflict and conflict_report.conflict_type == "NEW_TRAIN_CONFLICT":
            if self.rerouting_engine is not None:
                for tr in conflict_report.conflicting_trains:
                    # Find destination from event if available
                    dest = None
                    for evt in active_events:
                        if evt.train_id == tr.train_id:
                            dest = evt.destination_section_id
                            break

                    res = self.rerouting_engine.search_alternative_route(
                        train=tr,
                        conflict_section=maint.section_id,
                        destination_section=dest,
                        maintenance_plan=self.maintenance_plan,
                        existing_trains=self.existing_trains,
                        events=active_events,
                    )
                    reroute_results.append(res)

        # 3. Decision Formulation
        decision = DecisionEngine.evaluate(
            maint=maint,
            conflict_report=conflict_report,
            reroute_results=reroute_results,
            max_hold_minutes=self.config.max_acceptable_hold_minutes,
        )

        return decision, conflict_report, reroute_results

    def process_scenario(
        self,
        task_id: str,
        events: List[OperationalEvent],
        write_outputs: bool = True,
    ) -> Dict[str, Any]:
        """
        Processes a full operational scenario for a task, returning a detailed summary
        and writing output JSON files (decision + replan request if applicable).
        """
        decision, conflict_report, reroute_results = self.evaluate_task(task_id, events)

        paths: Dict[str, str] = {}
        if write_outputs:
            dec_path = serialize_operational_decision(decision, self.config.output_decision_path)
            paths["decision"] = str(dec_path)
            if decision.replanning_required:
                rep_path = serialize_replan_request(
                    decision, conflict_report, self.config.replan_request_path, reroute_results
                )
                paths["replan_request"] = str(rep_path)

        return {
            "decision": decision,
            "conflict_report": conflict_report,
            "reroute_results": reroute_results,
            "output_paths": paths,
        }
