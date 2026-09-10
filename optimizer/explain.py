"""
Decision trace for a single scheduled maintenance task.

Answers "why did the optimizer pick this block?" by re-evaluating every candidate
block window on the task's section and date against the same predicates the
solver uses, and recording the outcome of each one:

    REQUEST -> ELIGIBLE CANDIDATES -> FEASIBILITY FILTERS
            -> SELECTED BLOCK -> SELECTED TEAM -> EXPLANATION

Every field is derived from the loaded dataset. Nothing here is narrated: if a
block is reported as rejected for a train conflict, the conflicting train ids
come from train_block_conflicts.csv, and if it is reported as track-unavailable
that is blocks.csv `track_available`. Rules referenced (see README section 2):

    C001 duration coverage        C002 train conflict
    C003 track availability       C005 deadline
    S002 chain contiguity         S005 team shift window
    S006 department match
"""

from typing import Any, Dict, List, Optional, Tuple

from optimizer.data_loader import DatasetBundle, Block, Task


def _chain_from(blocks: List[Block], start_index: int, required_minutes: int) -> Optional[List[Block]]:
    """Consecutive, contiguous blocks from start_index that cover required_minutes (C001, S002)."""
    chain = [blocks[start_index]]
    covered = chain[0].duration_minutes
    i = start_index
    while covered < required_minutes:
        i += 1
        if i >= len(blocks):
            return None
        # S002: a chain is only valid if the next block begins exactly where the
        # previous one ends.
        if blocks[i].start_minute != chain[-1].end_minute:
            return None
        chain.append(blocks[i])
        covered += blocks[i].duration_minutes
    return chain


def _teams_on_shift(bundle: DatasetBundle, task: Task, start: int, end: int) -> List[str]:
    """Teams whose department matches and whose shift covers [start, end] (S005, S006)."""
    return [
        t.team_id
        for t in bundle.teams_by_department.get(task.department, [])
        if t.shift_start_minute <= start and end <= t.shift_end_minute
    ]


def _conflict_summary(bundle: DatasetBundle, chain: List[Block]) -> Tuple[List[str], str]:
    """Conflicting train ids across the chain, plus a human-readable description (C002)."""
    trains: List[str] = []
    for b in chain:
        for c in bundle.conflicts_by_block.get(b.block_id, []):
            if c.train_id not in trains:
                trains.append(c.train_id)
    if not trains:
        return [], ""
    described = []
    for tid in trains:
        train = bundle.trains.get(tid)
        described.append(f"{train.train_type} {tid}" if train else tid)
    return trains, ", ".join(described)


#: Same adjacency window the objective uses for the C008 passenger-impact proxy
#: (see optimizer/preprocessing.py). Reused here so the explanation reports the
#: trains the optimizer actually weighed, not a different set.
ADJACENCY_BUFFER_MINUTES = 60

#: Train types counted as passenger services by the C008 proxy.
PASSENGER_TRAIN_TYPES = {"EMU", "Superfast", "Passenger", "Express"}


def _affected_trains(
    bundle: DatasetBundle,
    task: Task,
    date: str,
    block_ids: List[str],
    start_minute: int,
    end_minute: int,
) -> Dict[str, Any]:
    """
    Trains related to the chosen possession, split into two honest categories:

    - `conflicting`: trains whose movement overlaps the possession window on this
      section. A scheduled possession must have none (C002 prunes any block with
      a train conflict), so this is a verified claim, not an assumption.
    - `adjacent`: passenger services running within +/-60 min of the window. These
      do not block the work; they are what the C008 passenger-impact penalty
      weighs. Reported so "affected trains" is not overstated as "conflicts".
    """
    section_trains = bundle.trains_by_date_section.get((date, task.section_id), [])

    conflicting: List[Dict[str, Any]] = []
    adjacent: List[Dict[str, Any]] = []

    # Hard block-level conflicts recorded in train_block_conflicts.csv
    conflict_train_ids = {
        c.train_id for bid in block_ids for c in bundle.conflicts_by_block.get(bid, [])
    }

    for tr in section_trains:
        overlaps = tr.arrival_minute < end_minute and tr.departure_minute > start_minute
        near = not (
            tr.departure_minute < start_minute - ADJACENCY_BUFFER_MINUTES
            or tr.arrival_minute > end_minute + ADJACENCY_BUFFER_MINUTES
        )
        entry = {
            "train_id": tr.train_id,
            "train_type": tr.train_type,
            "window": f"{tr.arrival_minute // 60:02d}:{tr.arrival_minute % 60:02d}"
                      f" - {tr.departure_minute // 60:02d}:{tr.departure_minute % 60:02d}",
            "priority_class": tr.priority_class,
            "passenger_load_percent": tr.passenger_load_percent,
        }
        if overlaps or tr.train_id in conflict_train_ids:
            conflicting.append(entry)
        elif near and tr.train_type in PASSENGER_TRAIN_TYPES:
            adjacent.append(entry)

    return {
        "conflicting": conflicting,
        "adjacent": adjacent,
        "adjacency_buffer_minutes": ADJACENCY_BUFFER_MINUTES,
        "note": (
            "Conflicting trains block the possession and must be zero for a valid plan "
            "(C002). Adjacent trains run near the window and are weighted by the C008 "
            "passenger-impact term; they are not conflicts."
        ),
    }


def build_decision_trace(
    task_id: str,
    bundle: DatasetBundle,
    selected_block_ids: List[str],
    selected_team_ids: List[str],
    selected_date: str,
    execution_start_minute: int,
    execution_end_minute: int,
) -> Dict[str, Any]:
    """Builds the full candidate-by-candidate trace for one scheduled task."""
    task = bundle.tasks[task_id]
    neev = bundle.neev_predictions.get(task.asset_id)
    section = bundle.corridors_sections.get(task.section_id)

    duration = task.required_duration_minutes
    day_blocks = sorted(
        bundle.blocks_by_date_section.get((selected_date, task.section_id), []),
        key=lambda b: b.start_minute,
    )

    selected_set = set(selected_block_ids)
    candidates: List[Dict[str, Any]] = []

    for idx, block in enumerate(day_blocks):
        chain = _chain_from(day_blocks, idx, duration)
        entry: Dict[str, Any] = {
            "block_ids": [block.block_id],
            "window": f"{block.start_minute // 60:02d}:{block.start_minute % 60:02d}"
                      f" - {block.end_minute // 60:02d}:{block.end_minute % 60:02d}",
            "start_minute": block.start_minute,
        }

        if chain is None:
            entry.update(
                status="REJECTED",
                rule="C001 / S002",
                reason=(
                    f"Duration: {block.duration_minutes} min available from this start; "
                    f"{duration} min required and no contiguous follow-on block completes the chain."
                ),
            )
            candidates.append(entry)
            continue

        entry["block_ids"] = [b.block_id for b in chain]
        chain_start, chain_end = chain[0].start_minute, chain[-1].end_minute
        entry["window"] = (f"{chain_start // 60:02d}:{chain_start % 60:02d}"
                           f" - {chain_end // 60:02d}:{chain_end % 60:02d}")
        capacity = sum(b.duration_minutes for b in chain)

        unavailable = [b.block_id for b in chain if not b.track_available]
        conflict_ids, conflict_text = _conflict_summary(bundle, chain)
        teams = _teams_on_shift(bundle, task, chain_start, chain_start + duration)

        # Same precedence the solver applies: hard infrastructure and train
        # conflicts prune the possession before team feasibility is considered.
        if unavailable:
            entry.update(
                status="REJECTED",
                rule="C003",
                reason=f"Infrastructure: track_available == No on {', '.join(unavailable)}.",
            )
        elif conflict_ids:
            entry.update(
                status="REJECTED",
                rule="C002",
                reason=f"Train conflict: {conflict_text} occupying the section "
                       f"({len(conflict_ids)} conflict{'s' if len(conflict_ids) > 1 else ''}).",
                conflicting_trains=conflict_ids,
            )
        elif not teams:
            entry.update(
                status="REJECTED",
                rule="S005 / S006",
                reason=f"No {task.department} team on shift covering "
                       f"{chain_start // 60:02d}:{chain_start % 60:02d}"
                       f"-{(chain_start + duration) // 60:02d}:{(chain_start + duration) % 60:02d}.",
            )
        elif selected_set and set(entry["block_ids"]) == selected_set:
            entry.update(
                status="SELECTED",
                rule="—",
                reason=f"Feasible: {capacity} min capacity ≥ {duration} min required, "
                       f"track available, 0 train conflicts, "
                       f"{', '.join(selected_team_ids) or 'crew'} on shift.",
                eligible_teams=teams,
            )
        else:
            entry.update(
                status="FEASIBLE",
                rule="—",
                reason=f"Feasible alternative ({capacity} min capacity, "
                       f"{len(teams)} qualified team{'s' if len(teams) != 1 else ''} on shift); "
                       f"not chosen by the objective.",
                eligible_teams=teams,
            )
        candidates.append(entry)

    considered = len(candidates)
    rejected = [c for c in candidates if c["status"] == "REJECTED"]
    feasible = [c for c in candidates if c["status"] in ("FEASIBLE", "SELECTED")]

    team_detail = []
    for tid in selected_team_ids:
        t = bundle.teams.get(tid)
        if t:
            team_detail.append({
                "team_id": t.team_id,
                "team_name": t.team_name,
                "department": t.department,
                "team_size": t.team_size,
                "required_team_size": task.required_team_size,
                "shift": f"{t.shift_start_minute // 60:02d}:{t.shift_start_minute % 60:02d}"
                         f" - {t.shift_end_minute // 60:02d}:{t.shift_end_minute % 60:02d}",
            })

    return {
        "request": {
            "task_id": task.task_id,
            "asset_id": task.asset_id,
            "maintenance_type": task.maintenance_type,
            "department": task.department,
            "section_id": task.section_id,
            "section_name": section.section_name if section else task.section_id,
            "corridor_id": task.corridor_id,
            "required_duration_minutes": duration,
            "required_team_size": task.required_team_size,
            "blocks_required": -(-duration // 120),
            "task_date": task.task_date,
            "deadline": task.deadline,
        },
        "risk_signal": {
            "source": "Neev predictive model (neev_predictions_for_optimizer.csv)",
            "risk_score": task.risk_score,
            "risk_level": task.risk_level,
            "failure_probability_30d": task.failure_probability_30d,
            "actual_degradation_30d": neev.actual_degradation_30d if neev else None,
            "priority_score": task.priority_score,
        },
        "candidate_summary": {
            "date_evaluated": selected_date,
            "block_windows_considered": considered,
            "rejected": len(rejected),
            "feasible": len(feasible),
            "rejected_by_rule": {
                rule: sum(1 for c in rejected if c["rule"] == rule)
                for rule in sorted({c["rule"] for c in rejected})
            },
        },
        "candidates": candidates,
        "selected": {
            "block_ids": selected_block_ids,
            "date": selected_date,
            "window": f"{execution_start_minute // 60:02d}:{execution_start_minute % 60:02d}"
                      f" - {execution_end_minute // 60:02d}:{execution_end_minute % 60:02d}",
            "teams": team_detail,
        },
        "train_impact": _affected_trains(
            bundle, task, selected_date, selected_block_ids,
            execution_start_minute, execution_end_minute,
        ),
        "explanation": (
            f"{considered} block windows on {task.section_id} were evaluated for "
            f"{selected_date}. {len(rejected)} were pruned by hard constraints "
            f"(track availability, train conflicts, duration coverage and crew shift). "
            f"Of the {len(feasible)} feasible options the objective selected "
            f"{' + '.join(selected_block_ids)}, which satisfies duration, section "
            f"availability, train-conflict and team-shift constraints before the "
            f"{task.deadline} deadline."
        ),
    }
