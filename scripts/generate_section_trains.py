"""
Projects real train occupancy rows into the artifact the Authority Gantt reads.

The frontend previously had no per-train timing data at all: `section_traffic.json`
carries aggregate counts, and the scenario files carry only the handful of
simulated movements. So the timeline could draw maintenance possessions but had
nothing truthful to draw trains against.

This is a straight projection of `trains.csv`, not a model:

  * every emitted record maps 1:1 to a source row,
  * `arrival_minute` / `departure_minute` are copied verbatim,
  * rows missing either timing field are dropped, never imputed,
  * ordering is deterministic, so re-running produces a byte-identical file.

Scope is restricted to the (section_id, date) pairs the frontend can actually
select — the pairs present in the committed plan, plus the sections the
replanning scenarios operate on — so the browser is not shipped 12,000 rows it
will never render.

    PYTHONPATH=. python scripts/generate_section_trains.py

Writes:
    frontend/src/data/section_trains.json
"""

import csv
import json
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

DATA_DIR = Path("Arnav_Optimizer_Clean_Dataset")
TRAINS_CSV = DATA_DIR / "trains.csv"
PLAN = Path("optimized_block_plan.json")
SCENARIOS = Path("frontend/src/data/ritvik_scenarios.json")
OUT = Path("frontend/src/data/section_trains.json")

#: Copied verbatim from the source row. Nothing here is derived.
CARRIED_FIELDS = (
    "train_id",
    "train_type",
    "corridor_id",
    "priority_class",
    "passenger_load_percent",
    "scheduled_speed_kmph",
)


def _int(value: str):
    """Parse an integer field, returning None when it is absent or malformed."""
    if value is None:
        return None
    value = value.strip()
    if value == "":
        return None
    try:
        return int(float(value))
    except ValueError:
        return None


def _float(value: str):
    if value is None:
        return None
    value = value.strip()
    if value == "":
        return None
    try:
        return float(value)
    except ValueError:
        return None


def plan_scope() -> Tuple[Set[Tuple[str, str]], Set[str], Set[str]]:
    """
    The (section, date) pairs the Gantt can select, plus the sections and dates
    those pairs span. Scenario sections are included on every plan date so a
    conflict scenario always has train context to render against.
    """
    plan = json.loads(PLAN.read_text())
    pairs: Set[Tuple[str, str]] = set()
    sections: Set[str] = set()
    dates: Set[str] = set()

    for task in plan["scheduled_tasks"]:
        section = task["section_id"]
        date = task["date"]
        pairs.add((section, date))
        sections.add(section)
        dates.add(date)

    scenario_sections: Set[str] = set()
    if SCENARIOS.exists():
        scenarios = json.loads(SCENARIOS.read_text())
        for key in ("reroute", "hold", "replan", "block_unavailable"):
            block = scenarios.get(key) or {}
            event = block.get("event") or {}
            for field in ("section_id", "destination_section_id"):
                if event.get(field):
                    scenario_sections.add(event[field])
            for candidate in block.get("reroute_results") or []:
                for step in candidate.get("path") or []:
                    scenario_sections.add(step)
        replanned = scenarios.get("replanned_record") or {}
        if replanned.get("section_id"):
            scenario_sections.add(replanned["section_id"])
            if replanned.get("date"):
                dates.add(replanned["date"])

    # Scenario sections join the scope on every plan date.
    for section in scenario_sections:
        sections.add(section)
        for date in list(dates):
            pairs.add((section, date))

    return pairs, sections, dates


def main() -> int:
    pairs, _sections, _dates = plan_scope()

    kept: Dict[str, Dict[str, List[Dict[str, Any]]]] = defaultdict(lambda: defaultdict(list))
    source_rows = 0
    in_scope = 0
    dropped_missing_timing = 0
    seen: Set[Tuple[str, str, str, int, int]] = set()

    with TRAINS_CSV.open(newline="") as handle:
        for row in csv.DictReader(handle):
            source_rows += 1
            section = (row.get("section_id") or "").strip()
            date = (row.get("date") or "").strip()
            if (section, date) not in pairs:
                continue
            in_scope += 1

            arrival = _int(row.get("arrival_minute"))
            departure = _int(row.get("departure_minute"))
            if arrival is None or departure is None:
                # No usable interval: drop the row rather than invent one.
                dropped_missing_timing += 1
                continue

            train_id = (row.get("train_id") or "").strip()
            key = (train_id, section, date, arrival, departure)
            if key in seen:
                continue
            seen.add(key)

            record: Dict[str, Any] = {
                "train_id": train_id,
                "section_id": section,
                "date": date,
                "arrival_minute": arrival,
                "departure_minute": departure,
            }
            for field in CARRIED_FIELDS:
                if field in ("train_id",):
                    continue
                raw = row.get(field)
                if raw is None or raw.strip() == "":
                    continue
                if field in ("priority_class",):
                    parsed = _int(raw)
                elif field in ("passenger_load_percent", "scheduled_speed_kmph"):
                    parsed = _float(raw)
                else:
                    parsed = raw.strip()
                if parsed is not None:
                    record[field] = parsed

            kept[section][date].append(record)

    # Deterministic ordering: section, date, then arrival and train id.
    payload: Dict[str, Any] = {}
    total = 0
    for section in sorted(kept):
        by_date: Dict[str, Any] = {}
        for date in sorted(kept[section]):
            rows = sorted(
                kept[section][date],
                key=lambda r: (r["arrival_minute"], r["departure_minute"], r["train_id"]),
            )
            by_date[date] = rows
            total += len(rows)
        payload[section] = by_date

    out = {
        "_description": (
            "Per-section train occupancy projected verbatim from "
            "Arnav_Optimizer_Clean_Dataset/trains.csv. Arrival and departure minutes are "
            "source values; no timing is synthesized. Rows lacking either timing field are "
            "dropped rather than imputed."
        ),
        "provenance": {
            "scope": "GANTT_TRAIN_PROJECTION",
            "source": "Arnav_Optimizer_Clean_Dataset/trains.csv",
            "generator": "scripts/generate_section_trains.py",
            "command": "PYTHONPATH=. python scripts/generate_section_trains.py",
            "filter": (
                "(section_id, date) pairs present in optimized_block_plan.json, plus the "
                "sections referenced by the replanning scenarios on every plan date"
            ),
            "source_rows": source_rows,
            "rows_in_scope": in_scope,
            "rows_dropped_missing_timing": dropped_missing_timing,
            "records_emitted": total,
            "sections": len(payload),
        },
        "sections": payload,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=2) + "\n")

    print(f"source rows            : {source_rows}")
    print(f"rows in plan scope     : {in_scope}")
    print(f"dropped (no timing)    : {dropped_missing_timing}")
    print(f"records emitted        : {total}")
    print(f"sections covered       : {len(payload)}")
    print(f"wrote {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
