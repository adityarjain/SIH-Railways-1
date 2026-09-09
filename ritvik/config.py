"""
Configuration for Ritvik Dynamic Railway Operations Engine.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict


@dataclass
class RitvikConfig:
    data_dir: Path = Path("Arnav_Optimizer_Clean_Dataset")
    plan_json_path: Path = Path("optimized_block_plan.json")
    topology_path: Path = Path("route_topology.json")
    events_path: Path = Path("ritvik_demo_events.json")
    output_decision_path: Path = Path("ritvik_operational_decision.json")
    replan_request_path: Path = Path("replan_request.json")

    # Replanned artifacts are written here rather than over plan_json_path, so a
    # closed-loop run never destroys the baseline plan its own fixtures depend on.
    replan_output_dir: Path = Path("replan_output")

    # Operational capacity model
    default_section_capacity: int = 8
    section_capacities: Dict[str, int] = field(
        default_factory=lambda: {
            "SEC-0001": 8,
            "SEC-0002": 8,
            "SEC-0003": 8,
            "SEC-0004": 8,
            "SEC-0005": 6,
            "SEC-0006": 5,
            "SEC-0007": 6,
            "SEC-0008": 8,
            "SEC-0009": 8,
            "SEC-0010": 8,
            "SEC-0011": 8,
            "SEC-0012": 8,
            "SEC-0013": 8,
            "SEC-0014": 8,
            "SEC-0071": 8,
            "SEC-0072": 8,
            "SEC-0073": 7,
            "SEC-0074": 6,
            "SEC-0075": 7,
            "SEC-0076": 8,
            "SEC-0077": 6,
            "SEC-0078": 8,
        }
    )

    # Search and routing limits
    max_search_depth: int = 6
    reroute_time_penalty_per_hop_minutes: int = 15
    safety_buffer_minutes: int = 0
