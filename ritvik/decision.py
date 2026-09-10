"""
Decision engine for Ritvik.
Synthesizes conflict reports and rerouting feasibility results into one of three
canonical operational decisions: PLAN_APPROVED, OPERATIONAL_UPDATE, or REPLAN_REQUEST.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any

from ritvik.conflict_detector import ConflictReport
from ritvik.rerouting import RerouteResult
from ritvik.data_loader import ScheduledMaintenance, TrainMovement


@dataclass
class TrainAction:
    train_id: str
    action: str  # "REROUTED" | "HELD"
    new_route: List[str]
    # Minutes of added delay. None means the dataset did not carry the section
    # length/speed needed to compute it -- reported as such rather than as 0.
    delay_estimate_minutes: Optional[int] = None
    delay_basis: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "train_id": self.train_id,
            "action": self.action,
            "new_route": self.new_route,
            "delay_estimate_minutes": self.delay_estimate_minutes,
            "delay_basis": self.delay_basis,
        }


@dataclass
class OperationalDecision:
    status: str  # "PLAN_APPROVED", "OPERATIONAL_UPDATE", "REPLAN_REQUEST"
    maintenance_plan_valid: bool
    maintenance_task_id: str
    section_id: str
    date: str
    block_ids: List[str]
    train_actions: List[TrainAction] = field(default_factory=list)
    replanning_required: bool = False
    replan_reason: Optional[str] = None
    replan_request_file: Optional[str] = None
    details: str = ""

    def to_dict(self) -> Dict[str, Any]:
        d: Dict[str, Any] = {
            "status": self.status,
            "maintenance_plan_valid": self.maintenance_plan_valid,
            "maintenance_task_id": self.maintenance_task_id,
            "block_ids": self.block_ids,
            "train_actions": [ta.to_dict() for ta in self.train_actions],
            "replanning_required": self.replanning_required,
        }
        if self.replanning_required and self.replan_request_file:
            d["replan_request_file"] = self.replan_request_file
        return d


class DecisionEngine:
    """Applies railway operational rules to formulate final dispatch and replanning decisions."""

    #: priority_class 1 is the highest-priority service in trains.csv. Holding one
    #: is treated as unacceptable regardless of duration; the possession is
    #: replanned around it instead.
    NEVER_HOLD_PRIORITY_CLASS = 1

    @staticmethod
    def evaluate_hold(
        maint: ScheduledMaintenance,
        train: TrainMovement,
        max_hold_minutes: int,
    ) -> Optional[int]:
        """
        Minutes the train would wait for the possession to be handed back, if
        holding is an acceptable alternative to rerouting.

        A held train is released when the block is returned, so the wait is
        (possession end - train arrival). Returns None when holding does not
        apply (train already clear of the window), when the train is too
        high-priority to hold, or when the wait exceeds the acceptable
        operational limit -- in which case the maintenance must be replanned.
        """
        if train.priority_class == DecisionEngine.NEVER_HOLD_PRIORITY_CLASS:
            return None

        hold_minutes = maint.end_minute - train.arrival_minute
        if hold_minutes <= 0:
            return None
        if hold_minutes > max_hold_minutes:
            return None
        return int(hold_minutes)

    @staticmethod
    def evaluate(
        maint: ScheduledMaintenance,
        conflict_report: ConflictReport,
        reroute_results: List[RerouteResult],
        max_hold_minutes: int = 0,
    ) -> OperationalDecision:
        """
        Formulates operational decision based on the core cases:
        - CASE 1: No conflict -> PLAN_APPROVED
        - CASE 2: Conflict resolved by train rerouting -> OPERATIONAL_UPDATE (plan valid)
        - CASE 2b: Rerouting infeasible but trains can be held within the
          acceptable window -> OPERATIONAL_UPDATE (plan valid)
        - CASE 3: Conflict exists, neither rerouting nor holding works -> REPLAN_REQUEST
        - CASE 4: Block itself unavailable -> REPLAN_REQUEST (plan invalid)
        """
        # CASE 1: No conflict detected
        if not conflict_report.has_conflict:
            return OperationalDecision(
                status="PLAN_APPROVED",
                maintenance_plan_valid=True,
                maintenance_task_id=maint.task_id,
                section_id=maint.section_id,
                date=maint.date,
                block_ids=maint.block_ids,
                train_actions=[],
                replanning_required=False,
                details="Maintenance possession is safe to execute; zero conflicting train movements.",
            )

        # CASE 4: Block itself became unavailable
        if conflict_report.conflict_type == "BLOCK_UNAVAILABLE":
            return OperationalDecision(
                status="REPLAN_REQUEST",
                maintenance_plan_valid=False,
                maintenance_task_id=maint.task_id,
                section_id=maint.section_id,
                date=maint.date,
                block_ids=conflict_report.affected_blocks or maint.block_ids,
                train_actions=[],
                replanning_required=True,
                replan_reason="BLOCK_UNAVAILABLE",
                replan_request_file="replan_request.json",
                details=f"Track block physical closure: {conflict_report.details}",
            )

        # CASE 2 & 3: Train movement conflicts (NEW_TRAIN_CONFLICT / TRAIN_CONFLICT)
        if not reroute_results:
            return OperationalDecision(
                status="REPLAN_REQUEST",
                maintenance_plan_valid=False,
                maintenance_task_id=maint.task_id,
                section_id=maint.section_id,
                date=maint.date,
                block_ids=maint.block_ids,
                train_actions=[],
                replanning_required=True,
                replan_reason="NEW_TRAIN_CONFLICT",
                replan_request_file="replan_request.json",
                details="Conflicting train detected and no rerouting attempts were feasible.",
            )

        actions: List[TrainAction] = []
        unresolved: List[str] = []
        unresolved_reasons: List[str] = []
        trains_by_id = {t.train_id: t for t in conflict_report.conflicting_trains}

        for r in reroute_results:
            if r.route_found and r.alternative_route is not None:
                actions.append(
                    TrainAction(
                        train_id=r.train_id,
                        action="REROUTED",
                        new_route=r.alternative_route,
                        delay_estimate_minutes=r.delay_minutes,
                        delay_basis=(
                            "Detour time from section length and line speed"
                            if r.delay_minutes is not None
                            else "Not computable: section length/speed unavailable"
                        ),
                    )
                )
                continue

            # Rerouting failed. Before escalating to a replan, check whether the
            # train can simply wait for the possession to be handed back.
            train = trains_by_id.get(r.train_id)
            hold_minutes = (
                DecisionEngine.evaluate_hold(maint, train, max_hold_minutes)
                if train is not None
                else None
            )
            if hold_minutes is not None:
                actions.append(
                    TrainAction(
                        train_id=r.train_id,
                        action="HELD",
                        new_route=[maint.section_id],
                        delay_estimate_minutes=hold_minutes,
                        delay_basis=(
                            f"Held until possession ends at minute {maint.end_minute} "
                            f"(limit {max_hold_minutes} min)"
                        ),
                    )
                )
            else:
                unresolved.append(r.train_id)
                unresolved_reasons.append(r.reason)

        if not unresolved:
            # CASE 2 / 2b: every conflicting train has a feasible operational action
            rerouted = [a.train_id for a in actions if a.action == "REROUTED"]
            held = [a.train_id for a in actions if a.action == "HELD"]
            parts = []
            if rerouted:
                parts.append(f"rerouted {', '.join(rerouted)}")
            if held:
                parts.append(f"held {', '.join(held)}")
            return OperationalDecision(
                status="OPERATIONAL_UPDATE",
                maintenance_plan_valid=True,
                maintenance_task_id=maint.task_id,
                section_id=maint.section_id,
                date=maint.date,
                block_ids=maint.block_ids,
                train_actions=actions,
                replanning_required=False,
                details=f"Conflict resolved operationally: {'; '.join(parts)}.",
            )

        # CASE 3: at least one train can be neither rerouted nor acceptably held
        return OperationalDecision(
            status="REPLAN_REQUEST",
            maintenance_plan_valid=False,
            maintenance_task_id=maint.task_id,
            section_id=maint.section_id,
            date=maint.date,
            block_ids=maint.block_ids,
            train_actions=[],
            replanning_required=True,
            replan_reason="NEW_TRAIN_CONFLICT",
            replan_request_file="replan_request.json",
            details=(
                f"No feasible operational action for {', '.join(unresolved)} "
                f"(rerouting: {'; '.join(unresolved_reasons)}; "
                f"holding exceeds the {max_hold_minutes} min limit)."
            ),
        )
