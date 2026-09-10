"""
Main CLI entry point for Arnav's Railway Maintenance Optimizer.
Usage:
    python -m optimizer.main [--data-dir DIR] [--output-dir DIR] [--days N] [--validate]
"""

import argparse
from pathlib import Path
import sys

from optimizer.config import OptimizerConfig
from optimizer.data_loader import load_dataset
from optimizer.validation import validate_input_dataset
from optimizer.preprocessing import preprocess_possessions
from optimizer.solver import solve_maintenance_plan
from optimizer.output import write_optimization_outputs
from optimizer.validator import validate_schedule


def main() -> int:
    parser = argparse.ArgumentParser(description="Arnav Railway Maintenance Optimization Engine")
    parser.add_argument(
        "--data-dir",
        type=str,
        default="Arnav_Optimizer_Clean_Dataset",
        help="Path to authoritative clean dataset directory",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=".",
        help="Directory to output generated plan and metrics",
    )
    parser.add_argument(
        "--max-days",
        type=int,
        default=None,
        help="Optional limit on number of days to solve (default: all 14 days)",
    )
    parser.add_argument(
        "--max-tasks",
        type=int,
        default=None,
        help="Optional limit on number of tasks to consider for fast smoke testing",
    )
    parser.add_argument(
        "--time-limit",
        type=float,
        default=60.0,
        help="CP-SAT time limit in seconds per batch (default: 60.0)",
    )
    parser.add_argument(
        "--validate",
        action="store_true",
        default=True,
        help="Perform independent post-solve validation",
    )

    args = parser.parse_args()

    data_dir = Path(args.data_dir)
    output_dir = Path(args.output_dir)

    print("============================================================")
    print("ARNAV RAILWAY MAINTENANCE OPTIMIZATION ENGINE")
    print("============================================================")
    print(f"Data directory   : {data_dir.resolve()}")
    print(f"Output directory : {output_dir.resolve()}")

    config = OptimizerConfig(
        data_dir=data_dir,
        output_dir=output_dir,
        solver_time_limit_seconds=args.time_limit,
    )

    # 1. Load Data
    print("\n[Step 1/5] Loading authoritative datasets...")
    bundle = load_dataset(data_dir)
    print(f"  Loaded {len(bundle.tasks)} tasks, {len(bundle.blocks)} blocks, {len(bundle.teams)} teams")
    print(f"  Loaded {len(bundle.conflicts)} train-block conflicts, {len(bundle.bundling_rules)} bundling rules")

    # 2. Pre-solve Validation
    print("\n[Step 2/5] Running pre-solve referential & domain integrity validation...")
    val_report = validate_input_dataset(bundle, strict=True)
    print(f"  Validation Status: {val_report['status']} (Checked {val_report['tasks_checked']} tasks, {val_report['blocks_checked']} blocks)")

    # 3. Preprocessing
    print("\n[Step 3/5] Preprocessing candidate multi-block possessions and conflict pruning...")
    prep = preprocess_possessions(bundle)
    print(f"  Generated {len(prep.all_possessions)} valid conflict-free possessions")

    # Filter tasks if requested
    tasks_to_solve = bundle.tasks
    if args.max_tasks is not None:
        tasks_to_solve = dict(list(bundle.tasks.items())[:args.max_tasks])
        print(f"  Limiting solve to first {len(tasks_to_solve)} tasks for fast testing")

    # 4. Solve
    print("\n[Step 4/5] Executing CP-SAT optimization engine with global team non-overlap...")
    result = solve_maintenance_plan(bundle, prep, config, tasks_to_solve=tasks_to_solve)

    # 5. Output Serialization
    print("\n[Step 5/5] Serializing outputs and operational metrics...")
    paths = write_optimization_outputs(result, config, output_dir)
    print(f"  Generated Plan CSV    : {paths['csv']}")
    print(f"  Generated Plan JSON   : {paths['json']}")
    print(f"  Generated Deferred CSV: {paths['deferred']}")
    print(f"  Generated Metrics JSON: {paths['metrics']}")

    # 6. Independent Post-Solve Validation
    if args.validate:
        print("\n============================================================")
        print("INDEPENDENT POST-SOLVE VALIDATION")
        print("============================================================")
        val_res = validate_schedule(paths["csv"], paths["deferred"], bundle)
        if val_res.is_valid:
            print("  STATUS: PASS - All modelled constraints and invariants verified; zero violations.")
            for check in val_res.checks_passed:
                print(f"    - {check}")
        else:
            print(f"  STATUS: FAIL - Found {len(val_res.violations)} violations:")
            for v in val_res.violations[:10]:
                print(f"    ! {v}")
            return 1

    print("\n============================================================")
    print("OPTIMIZATION COMPLETE")
    print(f"  Total Tasks Considered: {result.total_tasks_considered}")
    print(f"  Scheduled Tasks       : {result.total_scheduled} ({100.0 * result.total_scheduled / max(1, result.total_tasks_considered):.1f}%)")
    print(f"  Deferred Tasks        : {result.total_deferred}")
    print(f"  Concurrent Bundles    : {result.total_concurrent_bundles} pairs")
    print(f"  Serial Shared Blocks  : {result.total_serial_shared} pairs")
    print(f"  Runtime               : {result.wall_time_seconds:.2f} seconds")
    print("============================================================")

    return 0


if __name__ == "__main__":
    sys.exit(main())
