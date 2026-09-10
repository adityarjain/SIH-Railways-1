"""
Conflict detection engine for Ritvik.
Evaluates time-interval overlaps between maintenance possessions and train movements,
as well as dynamic track availability closures.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Tuple

from ritvik.data_loader import ScheduledMaintenance, TrainMovement, OperationalEvent


@dataclass
class ConflictReport:
    has_conflict: bool
    conflict_type: str  # "NONE", "NEW_TRAIN_CONFLICT", "BLOCK_UNAVAILABLE", "CAPACITY_EXHAUSTED"
    maintenance_task: ScheduledMaintenance
    conflicting_trains: List[TrainMovement] = field(default_factory=list)
    conflicting_events: List[OperationalEvent] = field(default_factory=list)
    affected_blocks: List[str] = field(default_factory=list)
    overlap_window: Optional[Tuple[int, int]] = None
    details: str = "No conflict detected"


class ConflictDetector:
    """Evaluates time overlaps and physical track state against maintenance plans."""

    def __init__(self, safety_buffer_minutes: int = 0):
        # Widens the possession window on both sides before testing for overlap,
        # so a train passing immediately either side of a possession is treated as
        # a conflict. Configured by RitvikConfig.safety_buffer_minutes, which was
        # previously defined but never applied.
        self.safety_buffer_minutes = max(0, safety_buffer_minutes)

    @staticmethod
    def check_time_overlap(
        start_1: int, end_1: int, start_2: int, end_2: int
    ) -> Tuple[bool, Optional[Tuple[int, int]]]:
        """
        Determines whether two time intervals strictly overlap.
        Overlap condition: start_2 < end_1 and end_2 > start_1
        """
        if start_2 < end_1 and end_2 > start_1:
            overlap_start = max(start_1, start_2)
            overlap_end = min(end_1, end_2)
            return True, (overlap_start, overlap_end)
        return False, None

    def detect_conflicts(
        self,
        maint: ScheduledMaintenance,
        trains: List[TrainMovement],
        events: List[OperationalEvent],
    ) -> ConflictReport:
        """
        Scans all operational events and active trains for collisions with the maintenance window.
        """
        # 1. Check physical block availability events
        for evt in events:
            if evt.event_type == "BLOCK_UNAVAILABLE":
                if evt.date == maint.date:
                    if (evt.block_id and evt.block_id in maint.block_ids) or (
                        evt.section_id and evt.section_id == maint.section_id
                    ):
                        return ConflictReport(
                            has_conflict=True,
                            conflict_type="BLOCK_UNAVAILABLE",
                            maintenance_task=maint,
                            conflicting_events=[evt],
                            affected_blocks=[evt.block_id] if evt.block_id else maint.block_ids,
                            details=f"Block closure on {evt.block_id or maint.section_id}: {evt.reason or 'Track unavailable'}",
                        )

        conflicting_trains: List[TrainMovement] = []
        conflicting_events: List[OperationalEvent] = []
        earliest_overlap = float("inf")
        latest_overlap = float("-inf")

        # 2. Check operational train events (e.g. NEW_TRAIN, TRAIN_REROUTED)
        for evt in events:
            if evt.event_type in {"NEW_TRAIN", "TRAIN_REROUTED"}:
                if (
                    evt.date == maint.date
                    and evt.section_id == maint.section_id
                    and evt.arrival_minute is not None
                    and evt.departure_minute is not None
                ):
                    overlaps, window = self.check_time_overlap(
                        maint.start_minute - self.safety_buffer_minutes,
                        maint.end_minute + self.safety_buffer_minutes,
                        evt.arrival_minute,
                        evt.departure_minute,
                    )
                    if overlaps and window:
                        conflicting_events.append(evt)
                        earliest_overlap = min(earliest_overlap, window[0])
                        latest_overlap = max(latest_overlap, window[1])
                        # Also synthesize as a train movement for uniform tracking
                        conflicting_trains.append(
                            TrainMovement(
                                train_id=evt.train_id or f"TRN-EVT-{evt.event_id}",
                                train_type=evt.train_name or "Special Movement",
                                corridor_id=maint.corridor_id,
                                section_id=evt.section_id,
                                date=evt.date,
                                arrival_minute=evt.arrival_minute,
                                departure_minute=evt.departure_minute,
                                priority_class=evt.priority_class or 2,
                            )
                        )

        # 3. Check existing timetable trains (only if not already caught by event)
        seen_train_ids = {t.train_id for t in conflicting_trains}
        for tr in trains:
            if tr.train_id in seen_train_ids:
                continue
            if tr.date == maint.date and tr.section_id == maint.section_id:
                overlaps, window = self.check_time_overlap(
                    maint.start_minute - self.safety_buffer_minutes,
                    maint.end_minute + self.safety_buffer_minutes,
                    tr.arrival_minute,
                    tr.departure_minute,
                )
                if overlaps and window:
                    conflicting_trains.append(tr)
                    earliest_overlap = min(earliest_overlap, window[0])
                    latest_overlap = max(latest_overlap, window[1])

        if conflicting_trains or conflicting_events:
            overlap_win = (int(earliest_overlap), int(latest_overlap))
            train_names = [t.train_id for t in conflicting_trains]
            return ConflictReport(
                has_conflict=True,
                conflict_type="NEW_TRAIN_CONFLICT",
                maintenance_task=maint,
                conflicting_trains=conflicting_trains,
                conflicting_events=conflicting_events,
                affected_blocks=maint.block_ids,
                overlap_window=overlap_win,
                details=f"Train movement conflict with {', '.join(train_names)} during window {overlap_win[0]}-{overlap_win[1]} min",
            )

        return ConflictReport(
            has_conflict=False,
            conflict_type="NONE",
            maintenance_task=maint,
            details="Maintenance window is completely conflict-free",
        )
