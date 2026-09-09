"""Is throughput bound by max_daily_candidate_pool, or by real crew/track capacity?
Solves the same 3 days at different pool sizes and compares."""
import sys, time
from optimizer.config import OptimizerConfig
from optimizer.data_loader import load_dataset
from optimizer.preprocessing import preprocess_possessions
from optimizer.solver import solve_maintenance_plan
from pathlib import Path

bundle = load_dataset(Path("Arnav_Optimizer_Clean_Dataset"))
prep = preprocess_possessions(bundle)

# Restrict to the first 3 dates so each trial is comparable and quick.
dates = sorted({b.date for b in bundle.blocks.values()})[:3]
keep = {bid: b for bid, b in bundle.blocks.items() if b.date in dates}
bundle.blocks = keep
tasks = {t: k for t, k in bundle.tasks.items() if k.task_date <= dates[-1]}
print(f"dates={dates}  tasks in window={len(tasks)}\n")

for pool in (700, 2000, 5000):
    cfg = OptimizerConfig(max_daily_candidate_pool=pool, solver_time_limit_seconds=15.0)
    t0 = time.time()
    res = solve_maintenance_plan(bundle, prep, cfg, tasks_to_solve=tasks)
    print(f"pool={pool:5d}  scheduled={res.total_scheduled:5d}  "
          f"batch_excluded={res.total_batch_excluded:6d}  {time.time()-t0:6.1f}s")
