"""
Extracts the concurrent bundle pairs from the committed plan.

The planning screen's bundling panel previously rendered a hand-authored example
whose window and block list did not match what the optimizer produced. This
derives the panel's content from `optimized_block_plan.json` instead.

    PYTHONPATH=. python scripts/generate_bundling.py

Writes frontend/src/data/bundling.json.

Reports only facts the plan and the bundling rules contain: which tasks share a
possession, the overlap the rule required and the overlap achieved. It does NOT
compute "minutes of disruption saved" or an efficiency percentage -- the
repository has no counterfactual unbundled plan to measure either against.
"""

import json
from itertools import combinations
from pathlib import Path
from typing import Any, Dict, List

from optimizer.data_loader import load_dataset

DATA_DIR = Path("Arnav_Optimizer_Clean_Dataset")
PLAN = Path("optimized_block_plan.json")
OUT = Path("frontend/src/data/bundling.json")


def main() -> int:
    bundle = load_dataset(DATA_DIR)
    plan = json.loads(PLAN.read_text())
    records = {t["task_id"]: t for t in plan["scheduled_tasks"]}
    sections = bundle.corridors_sections

    seen: set = set()
    pairs: List[Dict[str, Any]] = []

    for task_id, rec in records.items():
        if not rec.get("is_bundled"):
            continue
        for partner_id in rec.get("bundled_with", []):
            key = tuple(sorted((task_id, partner_id)))
            if key in seen or partner_id not in records:
                continue
            seen.add(key)

            a, b = records[key[0]], records[key[1]]
            overlap = min(a["end_minute"], b["end_minute"]) - max(a["start_minute"], b["start_minute"])

            # The rule that permitted this pairing, from bundling_rules.csv.
            rule = bundle.bundling_rules.get((a["department"], b["department"])) or \
                   bundle.bundling_rules.get((b["department"], a["department"]))
            meta = sections.get(a["section_id"])

            pairs.append({
                "section_id": a["section_id"],
                "section_name": meta.section_name if meta else a["section_id"],
                "corridor_id": a["corridor_id"],
                "corridor_name": meta.corridor_name if meta else a["corridor_id"],
                "date": a["date"],
                "shared_block_ids": sorted(set(a["block_ids"]) & set(b["block_ids"])),
                "possession_window": {
                    "start_minute": min(a["start_minute"], b["start_minute"]),
                    "end_minute": max(a["end_minute"], b["end_minute"]),
                },
                "overlap_minutes": overlap,
                "minimum_overlap_required_minutes": rule.minimum_overlap_minutes if rule else None,
                "departments_compatible": rule.compatible if rule else None,
                "tasks": [
                    {
                        "task_id": t["task_id"],
                        "asset_id": t["asset_id"],
                        "department": t["department"],
                        "maintenance_type": t.get("maintenance_type", ""),
                        "start_minute": t["start_minute"],
                        "end_minute": t["end_minute"],
                        "duration_minutes": t["duration_minutes"],
                        "block_ids": t["block_ids"],
                        "assigned_teams": t["assigned_teams"],
                        "risk_score": t["risk_score"],
                    }
                    for t in (a, b)
                ],
            })

    pairs.sort(key=lambda p: (p["date"], p["section_id"]))
    payload = {
        "concurrent_bundle_pairs": pairs,
        "provenance": {
            "scope": "BUNDLING_PAIRS",
            "source": "optimized_block_plan.json (is_bundled / bundled_with) + bundling_rules.csv",
            "generator": "scripts/generate_bundling.py",
            "note": (
                "Pairs sharing one possession window. No saving or efficiency figure "
                "is reported: no unbundled counterfactual plan exists to measure against."
            ),
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=2))

    print(f"wrote {OUT} ({len(pairs)} concurrent bundle pairs)")
    for p in pairs:
        ids = " + ".join(t["task_id"] for t in p["tasks"])
        print(f"  {p['section_id']} {p['date']}: {ids} | overlap {p['overlap_minutes']} min "
              f"(rule min {p['minimum_overlap_required_minutes']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
