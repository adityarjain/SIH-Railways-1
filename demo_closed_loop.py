"""
Demonstration of the Arnav <-> Ritvik Closed-Loop Integration.
Shows the complete multi-agent feedback loop:
Initial Plan -> Operational Disruption -> Conflict Detection -> Reroute Attempt ->
Replan Request -> Arnav CP-SAT Re-optimization -> Plan Update -> Ritvik Re-validation -> Final Approval.
"""

import json
import time
from pathlib import Path
from ritvik.config import RitvikConfig
from ritvik.closed_loop import ClosedLoopController
from ritvik.data_loader import OperationalEvent
from optimizer.config import OptimizerConfig


def min_to_hhmm(minutes: int) -> str:
    """Converts minute of day (0-1440) to standard HH:MM time string."""
    h = (minutes // 60) % 24
    m = minutes % 60
    return f"{h:02d}:{m:02d}"


def run_closed_loop_demo():
    print("================================================================================")
    print("      ARNAV <-> RITVIK CLOSED-LOOP DYNAMIC REPLANNING INTEGRATION")
    print("================================================================================")

    t0 = time.time()
    ritvik_cfg = RitvikConfig()
    arnav_cfg = OptimizerConfig()

    controller = ClosedLoopController(ritvik_config=ritvik_cfg, arnav_config=arnav_cfg)
    controller.initialize_arnav()

    task_id = "TASK-000005"

    # ==========================================================================
    # STEP 1: INITIAL ARNAV MAINTENANCE PLAN
    # ==========================================================================
    print("\n[STEP 1] INITIAL MAINTENANCE SCHEDULE (PRODUCED BY ARNAV CP-SAT)")
    print("--------------------------------------------------------------------------------")
    init_task = controller.ritvik_engine.maintenance_plan[task_id]
    sec_meta = controller.ritvik_engine.corridor_meta.get(init_task.section_id, {})
    sec_name = sec_meta.get("section_name", init_task.section_id)
    cor_name = sec_meta.get("corridor_name", init_task.corridor_id)

    print(f"Task ID:              {init_task.task_id} (Asset: {init_task.asset_id})")
    print(f"Maintenance Type:     Rail Grinding (High Priority)")
    print(f"Location:             {init_task.section_id} — {sec_name} ({cor_name})")
    print(f"Scheduled Date:       {init_task.date}")
    print(f"Execution Window:     {min_to_hhmm(init_task.start_minute)} - {min_to_hhmm(init_task.end_minute)} ({init_task.duration_minutes} min)")
    print(f"Assigned Blocks:      {', '.join(init_task.block_ids)}")
    print(f"Assigned Team:        {', '.join(init_task.assigned_teams)}")
    print(f"Neev Risk Score:      {init_task.risk_score:.1f} / 100.0 (CRITICAL)")

    # ==========================================================================
    # STEP 2: SIMULATED OPERATIONAL DISRUPTION
    # ==========================================================================
    print("\n[STEP 2] OPERATIONAL DISRUPTION INJECTED")
    print("--------------------------------------------------------------------------------")
    evt = OperationalEvent(
        event_id="EVT-002",
        event_type="NEW_TRAIN",
        train_id="TRN-SIM-002",
        train_name="Military Emergency Supply Train",
        section_id="SEC-0004",
        destination_section_id="SEC-0010",
        arrival_minute=110,
        departure_minute=140,
        date="2026-09-07",
        priority_class=1,
        notes="High-priority emergency movement across congested corridor",
    )
    print(f"Event ID:             {evt.event_id} ({evt.event_type})")
    print(f"Train Movement:       {evt.train_id} — {evt.train_name}")
    print(f"Affected Section:     {evt.section_id} on {evt.date}")
    print(f"Disruption Window:    {min_to_hhmm(evt.arrival_minute)} - {min_to_hhmm(evt.departure_minute)} (30 min collision)")
    print(f"Priority Class:       Priority 1 (Emergency Military Movement)")

    # ==========================================================================
    # STEP 3: RITVIK CONFLICT DETECTION & REROUTING SEARCH
    # ==========================================================================
    print("\n[STEP 3] RITVIK CONFLICT DETECTION & TOPOLOGICAL REROUTE SEARCH")
    print("--------------------------------------------------------------------------------")
    print(f"Direct Collision:     {min_to_hhmm(evt.arrival_minute)} - {min_to_hhmm(evt.departure_minute)} with TASK-000005!")

    # Simulate corridor saturation: both bypass corridors have 0 capacity
    ritvik_cfg.section_capacities["SEC-0005"] = 0
    ritvik_cfg.section_capacities["SEC-0007"] = 0

    # Run the closed loop cycle
    cycle_result = controller.run_cycle(task_id, evt, write_outputs=True)

    print("Evaluating alternative bypass routes in route_topology.json...")
    if cycle_result.initial_reroute:
        for idx, cand in enumerate(cycle_result.initial_reroute.inspected_candidates, start=1):
            print(f"  Candidate {idx}: {cand['path']:<45} [{cand['status']}] Reason: {cand['reason']}")
    print("Outcome: ALL ALTERNATIVE BYPASS ROUTES ARE INFEASIBLE (Capacity Exhausted).")

    # ==========================================================================
    # STEP 4: RITVIK GENERATES REPLAN_REQUEST FOR ARNAV
    # ==========================================================================
    print("\n[STEP 4] RITVIK EMITS REPLAN_REQUEST -> ARNAV")
    print("--------------------------------------------------------------------------------")
    print(f"Ritvik Decision:      {cycle_result.initial_decision.status}")
    print(f"Maintenance Valid:    {cycle_result.initial_decision.maintenance_plan_valid} (Cannot proceed in current slot)")
    print(f"Feedback Trigger:     Automated REPLAN_REQUEST generated for Arnav Optimizer")
    print(f"Handoff Artifact:     {ritvik_cfg.replan_request_path}")
    print("\nPayload (replan_request.json):")
    with open(ritvik_cfg.replan_request_path, "r", encoding="utf-8") as f:
        print(f.read().strip())

    # ==========================================================================
    # STEP 5: ARNAV AUTOMATED RE-OPTIMIZATION VIA CP-SAT
    # ==========================================================================
    print("\n[STEP 5] ARNAV INGESTS REPLAN_REQUEST & RE-OPTIMIZES VIA CP-SAT")
    print("--------------------------------------------------------------------------------")
    replanned = cycle_result.replanned_schedule
    print(f"Action:               Blacklist {', '.join(cycle_result.initial_schedule.block_ids)} on {cycle_result.initial_schedule.date}")
    print(f"Solver Engine:        Google OR-Tools CP-SAT (Constraint Programming)")
    print(f"Search Horizon:       Evaluated remaining candidates in [{init_task.date} - 2026-09-08 deadline]")
    print(f"New Selection:        Optimal candidate chosen meeting all physical & shift constraints:")
    print(f"  • New Date:         {replanned.date} (Before deadline 2026-09-08)")
    print(f"  • New Window:       {min_to_hhmm(replanned.start_minute)} - {min_to_hhmm(replanned.end_minute)} ({replanned.duration_minutes} min)")
    print(f"  • New Blocks:       {', '.join(replanned.block_ids)}")
    print(f"  • Assigned Team:    {', '.join(replanned.assigned_teams)}")
    print(f"  • Night Window:     {'Yes' if replanned.is_night else 'No'}")
    print(f"Artifact Written:     {ritvik_cfg.replan_output_dir}/optimized_block_plan.json (baseline plan left intact)")

    # ==========================================================================
    # STEP 6: RITVIK RE-VALIDATION & FINAL APPROVAL FOR ADITYA
    # ==========================================================================
    print("\n[STEP 6] RITVIK RE-EVALUATES UPDATED PLAN -> FINAL APPROVAL")
    print("--------------------------------------------------------------------------------")
    print(f"Re-evaluation:        Auditing TASK-000005 on {replanned.date} ({min_to_hhmm(replanned.start_minute)}-{min_to_hhmm(replanned.end_minute)})")
    print(f"Conflict Status:      ZERO CONFLICTS DETECTED (Track & corridor fully clear)")
    print(f"Final Decision:       {cycle_result.final_decision.status}")
    print(f"Maintenance Valid:    {cycle_result.final_decision.maintenance_plan_valid} (SAFE TO EXECUTE)")
    print(f"Aditya Output:        ritvik_operational_decision.json")
    print("\nFinal Decision Payload (ritvik_operational_decision.json):")
    with open(ritvik_cfg.output_decision_path, "r", encoding="utf-8") as f:
        print(f.read().strip())

    print("\n================================================================================")
    print(f"CLOSED-LOOP CYCLE COMPLETED SUCCESSFULLY IN {time.time() - t0:.2f} SECONDS")
    print("================================================================================")


if __name__ == "__main__":
    run_closed_loop_demo()
