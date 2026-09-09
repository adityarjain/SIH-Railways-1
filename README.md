# Arnav Railway Maintenance Optimization Engine
### Smart India Hackathon (SIH) — Railway Maintenance Planning & Optimization

[![Netlify Status](https://api.netlify.com/api/v1/badges/2bee516d-7668-469e-bef7-3a4f9ce7fca2/deploy-status)](https://app.netlify.com/projects/railway-maintenance-sih-2026/deploys)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-railway--maintenance--sih--2026.netlify.app-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://railway-maintenance-sih-2026.netlify.app)

> 🌐 **Live Demo Website:** [https://railway-maintenance-sih-2026.netlify.app](https://railway-maintenance-sih-2026.netlify.app)

---

## 1. Overview & Architecture

The **Arnav Railway Maintenance Optimization Engine** converts predicted failure risks from Neev's machine learning module, railway operational constraints, track block possessions, train movements, and global maintenance teams into a mathematically optimal, conflict-free maintenance schedule.

```
+-------------------------------------------------------------+
|                     NEEV PREDICTIVE ML                      |
| CatBoost Classifier (Failure Risk) + HistGradientRegressor  |
+-------------------------------------------------------------+
                              |
                              v [neev_predictions_for_optimizer.csv]
+-------------------------------------------------------------+
|             ARNAV OR-TOOLS CP-SAT OPTIMIZATION             |
|   Multi-Block Chaining + Bundling + Global Team Scheduler    |
+-------------------------------------------------------------+
         |                      |                      |
         v                      v                      v
optimized_block_plan.csv  deferred_tasks.csv   optimization_metrics.json
         |
         v
+-------------------------------------------------------------+
|               INDEPENDENT POST-SOLVE VALIDATOR              |
|        Validates 100% of Hard, Soft & Structural Rules       |
+-------------------------------------------------------------+
         |
         +----------------------------------+
         |                                  |
         v                                  v
+------------------------+      +------------------------+
|  RITVIK DYNAMIC REPLAN |      |  ADITYA BACKEND / UI   |
|   Disruption Re-solver |      | REST API / Dashboard   |
+------------------------+      +------------------------+
```

---

## 2. Explicit Constraint Mapping & Documentation

Every rule in the optimizer is explicitly mapped back to `constraints.csv` or derived structural formulation rules:

### Explicit Hard Constraints (`constraints.csv`)
| ID | Name | Description | Formulation & Enforcement |
| :--- | :--- | :--- | :--- |
| **C001** | Duration | Block duration must cover every assigned task | Consecutive 120-min block chaining: 1 block ($\le 120$m), 2 blocks ($121-240$m), 3 blocks ($241-360$m). |
| **C002** | Train Conflict | Blocked section cannot be occupied by a train during the block | Preprocessing prunes blocks with active train-block occupancy conflicts. |
| **C003** | Infrastructure | Track must be available | Filtered strictly on `track_available == 'Yes'`. |
| **C004** | Team Availability | Assigned team must be available for the full task | Team shift covers task interval, department matches, and assigned size $\ge \text{required\_team\_size}$. |
| **C005** | Deadline | Task must be completed before its deadline | Candidate possession date $\le \text{deadline}$. |
| **C006** | Bundling | Incompatible departments cannot be bundled | Pairwise conflicts added to CP-SAT model if departments are incompatible per `bundling_rules.csv`. |
| **C007** | Capacity | Maximum simultaneous task capacity cannot be exceeded | $\sum x_{t, c} \le \text{max\_simultaneous\_tasks}$ for every block possession. |

### Explicit Soft Constraints (`constraints.csv`)
| ID | Name | Description | Objective Penalty / Reward |
| :--- | :--- | :--- | :--- |
| **C008** | Passenger Impact | Prefer low passenger-load periods | Penalizes placements with high passenger impact scores. |
| **C009** | Congestion | Prefer lower predicted congestion | Penalizes placements during high freight demand index periods. |
| **C010** | Operational Preference | Prefer night maintenance where practical | Reward bonus for scheduling in blocks with `night_preference == 'Yes'`. |
| **C011** | Maintenance Priority | Prioritize critical/high-risk assets | Objective heavily weights tasks by canonical Neev `risk_score` (0–100). |
| **C012** | Bundling Efficiency | Prefer bundling compatible tasks | Reward bonus when compatible tasks share a block possession. |

### Derived Structural / Model Formulation Constraints
| ID | Name | Description | Formulation & Enforcement |
| :--- | :--- | :--- | :--- |
| **S001** | Single Placement | At most one placement per task | $\sum_c x_{t, c} + u_t = 1$ (Task is placed once or deferred). |
| **S002** | Contiguity | Multi-block possessions must be contiguous | Chained blocks must share the same section, date, and contiguous intervals ($start_{k+1} = end_k$). |
| **S003** | Earliest Start | Task cannot be scheduled before task date | Candidate possession date $\ge \text{task\_date}$. |
| **S004** | Section Match | Candidate blocks must match task section | Candidate generation strictly matches `task.section_id == block.section_id`. |
| **S005** | Shift Window | Task interval within assigned team's shift | $shift\_start \le task\_start < task\_end \le shift\_end$. |
| **S006** | Skill Match | Assigned team department matches task | $team.department == task.department$. |
| **S007** | Global Team Non-Overlap | No team scheduled on overlapping tasks network-wide | Enforced via CP-SAT `AddNoOverlap` on active team intervals. |
| **S008** | Bundling Overlap | Concurrent tasks must overlap by $\ge 30$ min | Overlap duration $\ge \text{minimum\_overlap\_minutes}$ (30 min). |
| **S009** | Bundling Duration | Combined span $\le$ max allowed | Span $\le \text{max\_combined\_duration\_minutes}$ (240, 300, or 360 min). |
| **S010** | Bundling Eligibility | Tasks with `can_bundle == 'No'` cannot bundle | Bundling forbidden if either task has `can_bundle == False`. |
| **S011** | Serial Sharing | Non-overlapping tasks in possession must fit | Tasks in same possession with 0 min overlap must have $dur_1 + dur_2 \le shared\_capacity$ and compatible departments. |

---

## 3. Directory Layout

```text
optimizer/
├── __init__.py               # Package metadata
├── config.py                 # OptimizerConfig and Constraint Registry
├── data_loader.py            # Strongly-typed ingestion of clean dataset
├── validation.py             # Pre-solve referential integrity & bounds checks
├── preprocessing.py          # Possession chaining and train conflict pruning
├── priority.py               # Neev canonical risk + urgency priority calculator
├── candidate_generation.py   # Structurally feasible possession generator
├── bundling.py               # Bundling compatibility & overlap evaluator
├── model.py                  # Google OR-Tools CP-SAT model builder
├── objective.py              # Objective function (penalties, rewards, weights)
├── solver.py                 # Orchestrator with global team non-overlap coordination
├── output.py                 # Output serialization (CSV, JSON, Metrics)
├── validator.py              # Independent post-solve verification harness
└── main.py                   # CLI entry point

tests/
├── test_data_loader.py       # Data loading & schema tests
├── test_priority.py          # Neev risk priority tests
├── test_candidate_generation.py # Multi-block chaining tests
├── test_bundling.py          # Bundling rules & overlap tests
├── test_solver.py            # CP-SAT day batch solve tests
└── test_post_solve_validator.py # Independent validation tests
```

---

## 4. Setup & Running

### Environment Setup
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### Running the Test Suite
```bash
PYTHONPATH=. .venv/bin/pytest tests/ -v
```

### Running the Arnav Smart Blocking Demo
```bash
PYTHONPATH=. .venv/bin/python demo.py
```

### Running the Ritvik Dynamic Operations & Replanning Demo
```bash
PYTHONPATH=. .venv/bin/python demo_ritvik.py
```

### Running the Arnav ↔ Ritvik Closed-Loop Integration Demo
```bash
PYTHONPATH=. .venv/bin/python demo_closed_loop.py
```

### Running the Full Dataset Optimizer
```bash
PYTHONPATH=. .venv/bin/python -m optimizer.main --data-dir Arnav_Optimizer_Clean_Dataset --output-dir .
```

---

## 5. Measured Performance

Full-dataset run (`Arnav_Optimizer_Clean_Dataset`: 30,000 tasks, 33,600 blocks,
14-day horizon), reproduced with the command in §4:

| Metric | Value |
| :--- | :--- |
| Tasks scheduled | **1,598 / 30,000 (5.3%)** |
| Critical-risk tasks scheduled | **1,542** (29.6% of all critical-risk demand) |
| Independent post-solve validation | **PASS — 22/22 checks** |
| Block possessions utilised | 2,248 |
| Maintenance teams utilised | 39 / 39 |
| Concurrent bundles | 42 pairs |
| Solver wall time | 868 s |

The optimizer spends its capacity where it matters: 96% of the scheduled work is
critical-risk (Neev score ≥ 80). Only 1,367 deferrals are genuine resource
exhaustion (`team_capacity_exhausted`, `no_qualifying_team_shift`,
`block_capacity_exhausted`); the other 27,034 are
`batch_limit_excluded_on_deadline` — the task reached its deadline while
outside the daily CP-SAT batch of `OptimizerConfig.max_daily_candidate_pool`
(700).

That knob is **not** free throughput, and raising it is counter-productive.
Measured over an identical 3-day window (6,429 eligible tasks, 15 s solver
limit per day):

| `max_daily_candidate_pool` | Tasks scheduled | Wall time |
| :--- | :--- | :--- |
| 700 | 424 | 51 s |
| 2,000 | 452 | 60 s |
| 5,000 | **136** | 95 s |

Past roughly 2,000 the per-day model grows faster than the solver can search
it, so CP-SAT hits its time limit on a poor incumbent and *fewer* tasks get
scheduled. Real headroom would come from a longer per-day solver budget or
decomposing the day batch by corridor — not from widening the pool.

> **Note on artifacts.** `optimization_metrics.json` must come from
> `optimizer.main`. A targeted replan re-solves a single task and cannot report
> base-solve deferral reasons, so its metrics are not a substitute. Replanning
> writes to `replan_output/` and never overwrites the baseline plan.

---

## 6. Downstream Integration Boundary

- **Ritvik (Dynamic Operations & Replanning Engine):**
  - Consumes `optimized_block_plan.json` from Arnav.
  - Monitors operational events and train timetable movements.
  - Performs time-interval collision detection and section capacity headroom analysis.
  - Executes graph search over `route_topology.json` to reroute conflicting trains.
  - Generates `ritvik_operational_decision.json` for Aditya (`PLAN_APPROVED` or `OPERATIONAL_UPDATE`).
  - Generates `replan_request.json` back to Arnav when disruptions cannot be resolved operationally.

- **Aditya (Backend & REST API) — not yet implemented:**
  Can expose endpoints:
  - `POST /optimize`: calls Arnav's optimizer and returns `optimized_block_plan.json`
  - `POST /ritvik/evaluate`: calls Ritvik's operations engine and returns `ritvik_operational_decision.json`
  - `GET /metrics`: serves `optimization_metrics.json`
  - `GET /deferred`: serves `deferred_tasks.csv`
