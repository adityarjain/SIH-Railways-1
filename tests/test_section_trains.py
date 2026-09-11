"""
Guards the train projection that the Authority Gantt renders.

The value of the train lane rests entirely on the claim that every bar is a real
`trains.csv` row. These tests assert that claim directly: source fidelity,
determinism, scope correctness, and that missing timings are dropped rather than
imputed.
"""

import csv
import json
import subprocess
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
TRAINS_CSV = REPO / "Arnav_Optimizer_Clean_Dataset" / "trains.csv"
PLAN = REPO / "optimized_block_plan.json"
ARTIFACT = REPO / "frontend" / "src" / "data" / "section_trains.json"
GENERATOR = REPO / "scripts" / "generate_section_trains.py"


@pytest.fixture(scope="module")
def artifact():
    assert ARTIFACT.exists(), f"{ARTIFACT} is missing; run the generator"
    return json.loads(ARTIFACT.read_text())


@pytest.fixture(scope="module")
def source_rows():
    with TRAINS_CSV.open(newline="") as handle:
        return list(csv.DictReader(handle))


@pytest.fixture(scope="module")
def source_index(source_rows):
    """(train_id, section_id, date) -> set of (arrival, departure) in the source."""
    index = {}
    for row in source_rows:
        key = (row["train_id"], row["section_id"], row["date"])
        index.setdefault(key, set()).add(
            (int(float(row["arrival_minute"])), int(float(row["departure_minute"])))
        )
    return index


def emitted(artifact):
    for section, by_date in artifact["sections"].items():
        for date, rows in by_date.items():
            for row in rows:
                yield section, date, row


class TestSourceFidelity:
    def test_every_projected_train_maps_to_a_real_source_row(self, artifact, source_index):
        for section, date, row in emitted(artifact):
            key = (row["train_id"], section, date)
            assert key in source_index, f"{key} does not exist in trains.csv"

    def test_arrival_and_departure_are_source_values_not_derived(self, artifact, source_index):
        for section, date, row in emitted(artifact):
            key = (row["train_id"], section, date)
            interval = (row["arrival_minute"], row["departure_minute"])
            assert interval in source_index[key], (
                f"{key} timing {interval} is not a source interval — a value was invented"
            )

    def test_record_fields_match_the_source_row(self, artifact, source_rows):
        by_key = {
            (r["train_id"], r["section_id"], r["date"]): r for r in source_rows
        }
        for section, date, row in emitted(artifact):
            src = by_key[(row["train_id"], section, date)]
            if "train_type" in row:
                assert row["train_type"] == src["train_type"].strip()
            if "corridor_id" in row:
                assert row["corridor_id"] == src["corridor_id"].strip()
            if "priority_class" in row:
                assert row["priority_class"] == int(float(src["priority_class"]))

    def test_section_and_date_on_each_record_match_their_container(self, artifact):
        for section, date, row in emitted(artifact):
            assert row["section_id"] == section
            assert row["date"] == date


class TestScope:
    def test_scope_is_restricted_to_selectable_dates(self, artifact):
        """
        Every projected date must be one the Gantt can actually select: a date in
        the committed plan, or the replanned date, since TASK-000005 moves to
        2026-09-08 and the post-replan timeline still needs train context there.
        """
        plan = json.loads(PLAN.read_text())
        selectable = {t["date"] for t in plan["scheduled_tasks"]}

        scenarios = json.loads(
            (REPO / "frontend" / "src" / "data" / "ritvik_scenarios.json").read_text()
        )
        replanned = scenarios.get("replanned_record") or {}
        if replanned.get("date"):
            selectable.add(replanned["date"])

        for section, date, _row in emitted(artifact):
            assert date in selectable, (
                f"{section} {date} is not a date the Gantt can select"
            )

    def test_plan_section_date_pairs_with_source_trains_are_covered(self, artifact, source_rows):
        """A pair the Gantt can select, and that has trains, must not be silently empty."""
        plan = json.loads(PLAN.read_text())
        pairs = {(t["section_id"], t["date"]) for t in plan["scheduled_tasks"]}
        source_pairs = {(r["section_id"], r["date"]) for r in source_rows}

        for section, date in sorted(pairs & source_pairs):
            rows = artifact["sections"].get(section, {}).get(date)
            assert rows, f"{section} {date} has trains in the source but none projected"

    def test_no_unintended_duplicate_records(self, artifact):
        seen = set()
        for section, date, row in emitted(artifact):
            key = (row["train_id"], section, date, row["arrival_minute"], row["departure_minute"])
            assert key not in seen, f"duplicate projected record: {key}"
            seen.add(key)


class TestTimingSafety:
    def test_no_record_is_missing_a_timing_value(self, artifact):
        for _section, _date, row in emitted(artifact):
            assert isinstance(row["arrival_minute"], int)
            assert isinstance(row["departure_minute"], int)

    def test_intervals_are_within_a_day_and_non_negative(self, artifact):
        for section, date, row in emitted(artifact):
            assert 0 <= row["arrival_minute"] <= 1440, f"{row['train_id']} {section} {date}"
            assert 0 <= row["departure_minute"] <= 1440, f"{row['train_id']} {section} {date}"

    def test_dropped_row_count_is_reported(self, artifact):
        prov = artifact["provenance"]
        assert "rows_dropped_missing_timing" in prov
        assert prov["records_emitted"] + prov["rows_dropped_missing_timing"] == prov["rows_in_scope"]


class TestOrderingAndDeterminism:
    def test_rows_are_sorted_by_arrival_then_departure_then_id(self, artifact):
        for section, by_date in artifact["sections"].items():
            for date, rows in by_date.items():
                keys = [(r["arrival_minute"], r["departure_minute"], r["train_id"]) for r in rows]
                assert keys == sorted(keys), f"{section} {date} is not deterministically ordered"

    def test_sections_and_dates_are_sorted(self, artifact):
        sections = list(artifact["sections"].keys())
        assert sections == sorted(sections)
        for _section, by_date in artifact["sections"].items():
            dates = list(by_date.keys())
            assert dates == sorted(dates)

    def test_regeneration_is_byte_identical(self, tmp_path):
        """The artifact is committed, so a re-run must not produce a spurious diff."""
        before = ARTIFACT.read_bytes()
        result = subprocess.run(
            [sys.executable, str(GENERATOR)],
            cwd=REPO,
            capture_output=True,
            env={"PYTHONPATH": str(REPO), "PATH": ""},
        )
        assert result.returncode == 0, result.stderr.decode()
        after = ARTIFACT.read_bytes()
        assert before == after, "generator is not deterministic across runs"


class TestProvenance:
    def test_provenance_names_its_source_and_command(self, artifact):
        prov = artifact["provenance"]
        assert prov["source"].endswith("trains.csv")
        assert prov["generator"] == "scripts/generate_section_trains.py"
        assert "generate_section_trains" in prov["command"]

    def test_counts_are_internally_consistent(self, artifact):
        prov = artifact["provenance"]
        actual = sum(
            len(rows) for by_date in artifact["sections"].values() for rows in by_date.values()
        )
        assert actual == prov["records_emitted"]
        assert prov["sections"] == len(artifact["sections"])
