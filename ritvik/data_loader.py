"""
Data loading and strongly-typed data structures for Ritvik's Operations Engine.
"""

import csv
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Any


@dataclass
class ScheduledMaintenance:
    task_id: str
    asset_id: str
    department: str
    corridor_id: str
    section_id: str
    date: str
    start_minute: int
    end_minute: int
    duration_minutes: int
    block_ids: List[str]
    assigned_teams: List[str]
    is_bundled: bool = False
    bundled_with: List[str] = field(default_factory=list)
    is_night: bool = False
    risk_score: float = 0.0
    priority_score: float = 0.0


@dataclass
class OperationalEvent:
    event_id: str
    event_type: str
    train_id: Optional[str] = None
    train_name: Optional[str] = None
    section_id: Optional[str] = None
    destination_section_id: Optional[str] = None
    block_id: Optional[str] = None
    arrival_minute: Optional[int] = None
    departure_minute: Optional[int] = None
    date: Optional[str] = None
    priority_class: Optional[int] = None
    capacity_delta: Optional[int] = None
    reason: Optional[str] = None
    notes: Optional[str] = None


@dataclass
class TrainMovement:
    train_id: str
    train_type: str
    corridor_id: str
    section_id: str
    date: str
    arrival_minute: int
    departure_minute: int
    priority_class: int = 2
    scheduled_speed_kmph: float = 80.0


def load_maintenance_plan(json_path: Path) -> Dict[str, ScheduledMaintenance]:
    """Loads Arnav's optimized_block_plan.json into strongly-typed ScheduledMaintenance records."""
    if not json_path.exists():
        raise FileNotFoundError(f"Arnav maintenance plan not found at {json_path}")

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    tasks_dict: Dict[str, ScheduledMaintenance] = {}
    for item in data.get("scheduled_tasks", []):
        m = ScheduledMaintenance(
            task_id=item["task_id"],
            asset_id=item["asset_id"],
            department=item["department"],
            corridor_id=item.get("corridor_id", ""),
            section_id=item["section_id"],
            date=item["date"],
            start_minute=int(item["start_minute"]),
            end_minute=int(item["end_minute"]),
            duration_minutes=int(item["duration_minutes"]),
            block_ids=list(item.get("block_ids", [])),
            assigned_teams=list(item.get("assigned_teams", [])),
            is_bundled=bool(item.get("is_bundled", False)),
            bundled_with=list(item.get("bundled_with", [])),
            is_night=bool(item.get("is_night", False)),
            risk_score=float(item.get("risk_score", 0.0)),
            priority_score=float(item.get("priority_score", 0.0)),
        )
        tasks_dict[m.task_id] = m

    return tasks_dict


def load_operational_events(events_path: Path) -> List[OperationalEvent]:
    """Loads synthetic/live operational events."""
    if not events_path.exists():
        return []

    with open(events_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    events: List[OperationalEvent] = []
    for item in data.get("events", []):
        evt = OperationalEvent(
            event_id=item["event_id"],
            event_type=item["event_type"],
            train_id=item.get("train_id"),
            train_name=item.get("train_name"),
            section_id=item.get("section_id"),
            destination_section_id=item.get("destination_section_id"),
            block_id=item.get("block_id"),
            arrival_minute=int(item["arrival_minute"]) if item.get("arrival_minute") is not None else None,
            departure_minute=int(item["departure_minute"]) if item.get("departure_minute") is not None else None,
            date=item.get("date"),
            priority_class=int(item["priority_class"]) if item.get("priority_class") is not None else None,
            capacity_delta=int(item["capacity_delta"]) if item.get("capacity_delta") is not None else None,
            reason=item.get("reason"),
            notes=item.get("notes"),
        )
        events.append(evt)

    return events


def load_route_topology(topology_path: Path) -> Dict[str, List[str]]:
    """Loads the route topology adjacency map."""
    if not topology_path.exists():
        raise FileNotFoundError(f"Topology file not found at {topology_path}")

    with open(topology_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    return data.get("topology", {})


def load_trains_csv(trains_csv_path: Path) -> List[TrainMovement]:
    """Loads baseline trains timetable from clean dataset if present."""
    if not trains_csv_path.exists():
        return []

    trains: List[TrainMovement] = []
    with open(trains_csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            trains.append(
                TrainMovement(
                    train_id=r["train_id"],
                    train_type=r.get("train_type", "Passenger"),
                    corridor_id=r.get("corridor_id", ""),
                    section_id=r["section_id"],
                    date=r["date"],
                    arrival_minute=int(r["arrival_minute"]),
                    departure_minute=int(r["departure_minute"]),
                    priority_class=int(r.get("priority_class", 2)),
                    scheduled_speed_kmph=float(r.get("scheduled_speed_kmph", 80.0)),
                )
            )
    return trains


def load_corridors_sections(csv_path: Path) -> Dict[str, Dict[str, str]]:
    """Loads section and corridor metadata for human-readable descriptions."""
    if not csv_path.exists():
        return {}

    meta: Dict[str, Dict[str, str]] = {}
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            meta[r["section_id"]] = {
                "section_id": r["section_id"],
                "corridor_id": r["corridor_id"],
                "corridor_name": r["corridor_name"],
                "section_name": r["section_name"],
                "region": r.get("region", ""),
                "track_type": r.get("track_type", ""),
                # Physical characteristics. These were previously dropped, which left
                # the rerouting engine with no way to express delay in real minutes.
                "section_length_km": r.get("section_length_km", ""),
                "maximum_speed_kmph": r.get("maximum_speed_kmph", ""),
            }
    return meta
