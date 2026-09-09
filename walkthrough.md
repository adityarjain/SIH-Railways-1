# Walkthrough: Railway Maintenance Optimization System — Complete Frontend

The frontend for the **AI-Powered Automatic Block Planning to Maximize Asset Availability for Train Operations on Indian Railways** is built, verified, and running.

```
       +-----------------------------------------------------------------------+
       |                  RAILWAY MAINTENANCE CONTROL SYSTEM                   |
       |                        (Unified Web Application)                      |
       +-----------------------------------------------------------------------+
                                           |
             +-----------------------------+-----------------------------+
             |                             |                             |
             v                             v                             v
+-------------------------+   +-------------------------+   +-------------------------+
| ROLE 1: OPERATIONS      |   | ROLE 2: MAINTENANCE     |   | ROLE 3: GENERAL USER    |
| CONTROL CENTER          |   | PERSONNEL PORTAL        |   | VERIFICATION PORTAL     |
|                         |   |                         |   |                         |
| • Overview (KPIs & Map) |   | • 4 Engineering Depts   |   | • Verify Completed Work |
| • Maintenance Demand    |   | • Dashboard & Work Orders|  | • Approve Work Order    |
| • Automatic Block Plan  |   | • Task Action Modals    |   | • Reject Work Order     |
| • Live Operations       |   | • Asset Health (Neev)   |   | • Report False Closure  |
| • Replanning Audit      |   | • Team Availability     |   +-------------------------+
| • Network Browser       |   | • Completed Work Log    |
| • Analytics Telemetry   |   +-------------------------+
| • Event Simulator       |
+-------------------------+
             |
             +----------------------> [SIH 14-Step Guided Demo Mode]
```

---

## 1. What Was Built

### A. Technology Stack
- **Framework**: React + Vite
- **Styling**: Tailwind CSS with enterprise railway control room design tokens
- **Data Visualizations**: Recharts
- **Iconography**: Lucide React (`lucide-react`)
- **Location**: `frontend/` (repository root)
- **Build Status**: `npm run build` $\rightarrow$ 0 errors; `npm run lint` $\rightarrow$ 0 errors
- **Local Dev Server**: `npm run dev` on `http://localhost:5173/`
- **Navigation**: role-scoped tab state in `src/App.jsx`; tab ids come from
  `NAV_ITEMS_BY_ROLE` in `src/components/layout/Sidebar.jsx` (no router)

---

## 2. Core Screens & Capabilities

### 1. Login Page (`/login`)
- **Title**: Railway Maintenance Optimization System
- **Subtitle**: AI-Powered Automatic Block Planning for Train Operations
- Credentials input with role dropdown.
- **One-Click Quick Switcher**:
  - `[Operations Control]` $\rightarrow$ routes directly to OCC Overview
  - `[Maintenance Portal]` $\rightarrow$ routes directly to Maintenance Dashboard
  - `[General User]` $\rightarrow$ routes directly to Completed Work Verification

### 2. Operations Control Center (Role 1)
- **Overview**:
  - 6 Key Performance Indicators, read from `optimization_metrics.json` (Critical Maintenance: 1,542 scheduled, Pending Demand: 28,402, Planned Blocks: 2,248, Active Conflicts: 0, Teams: 39/39, Network Availability: 94.2%).
  - Interactive Railway Network Corridor Map with section status badges, track electrification, speed limits, and active possession pins.
  - Upcoming Maintenance Windows chronological list.
- **Maintenance Demand**:
  - 13-column compact table: Task ID, Maintenance Type, Department, Asset ID, Corridor, Section, Earliest Date, Deadline, Neev Risk Badge, Priority Score, Duration, Team Size, Status.
  - Multi-filter toolbar (Department, Corridor, Risk Level, Status) with real-time search.
  - **Task Detail Drawer**: Shows maintenance work order specifications and the **Neev AI Predictive Failure Risk Panel** (81.0% CRITICAL, 30-day degradation forecast 71.1, recent fault indicators, and human-readable AI diagnosis).
- **Automatic Block Planning (Hero Screen / Centerpiece)**:
  - **24-Hour Horizontal Gantt Timeline**:
    - Ruler with 2-hour major grid markings (`00:00` to `24:00`).
    - Rows for railway sections (`SEC-0001` through `SEC-0010`, `SEC-0072`, `SEC-0073`).
    - Possession bars with semantic colors (Blue = Planned, Purple = Bundled, Red = Critical, Orange = Replanned).
    - Clicking any block opens the **Block Details Drawer**.
  - **"Why did Arnav select this block?" 5-Step Mathematical Decision Trace Modal**:
    - **Step 1 — Neev Risk**: 81.0% CRITICAL, 1,762.25 priority weight.
    - **Step 2 — Requirements**: Rail Grinding, 200 min duration, team size 5, night preference.
    - **Step 3 — Candidate Pruning Table**: Pruning of 9 infeasible blocks (`BLK-009637+38` SELECTED vs `BLK-009639` Rejected [Train conflict], `BLK-009640` Rejected [Track unavailable], `BLK-009645+46` Rejected [Shift mismatch], etc.).
    - **Step 4 — Crew Check**: `TEAM-013` active night shift 00:00 - 08:00 matched with 0 conflicts.
    - **Step 5 — Final Assignment**: *"Best feasible assignment found by the optimizer."*
  - **Smart Bundling Component**: Displays `TASK-016913` (TRD) + `TASK-018159` (Civil) sharing `BLK-000867` on `SEC-0073` with the explanation (*"2 compatible tasks coordinated into 1 possession window"*).
  - **Traffic Context Panel**: Passenger train count, goods traffic congestion index, block availability, and recommended low-pressure window.
  - **Weekly & Monthly Views**: 7-day card strip and workload calendar heatmap.
- **Live Operations (Ritvik)**:
  - Real-time operational validation layer.
  - Displays simulated train conflicts and automated resolutions:
    - **OPERATIONAL UPDATE**: Train rerouted successfully via alternate corridor $\rightarrow$ maintenance plan preserved.
    - **REPLAN REQUEST**: All bypasses saturated $\rightarrow$ automated request sent to Arnav with `[Request Replan]` action.
- **Replanning Page**:
  - 3-column before/after comparison interface:
    1. **Original Plan**: `TASK-000005` on `2026-09-07`, `00:00 - 03:20`, `BLK-009637+38`, `TEAM-013`.
    2. **Disruption**: Emergency train `TRN-SIM-002` colliding during `01:50 - 02:20`.
    3. **Replanned Plan**: `TASK-000005` on `2026-09-08`, `18:00 - 21:20`, `BLK-012046+47`, `TEAM-018`.
    4. **Ritvik Validation Audit**: 4 verified checkmarks $\rightarrow$ **PLAN APPROVED**.
- **Event Simulator**:
  - 5 interactive disturbance triggers: `[New Train]`, `[Block Unavailable]`, `[Train Rerouted]`, `[Capacity Reduction]`, `[Maintenance Emergency]`.
  - Reactive 7-step animated execution log demonstrating the multi-agent closed loop resolving live.
- **Network & Analytics**:
  - Infrastructure browser with technical specs for 200 sections.
  - Recharts diagrams of solver telemetry, risk breakdown, and night window ratio.

### 3. Maintenance Personnel Portal (Role 2)
- Department Switcher: Track / Civil, Electrical / TRD, S&T, Mechanical / Rolling Stock.
- **Dashboard**: Work order backlog, critical assets, active scheduled jobs, team availability.
- **My Tasks**:
  - Task cards showing asset, section, scheduled window, assigned team, and duration.
  - **Action Buttons**: `[Accept]`, `[In Progress]`, `[Completed]`, `[Reschedule...]`, `[Reject...]`.
  - **Mandatory Reason Modal**: Required justification when rejecting or requesting schedule changes (Team unavailable, Equipment unavailable, Safety issue, Duration changed, Emergency maintenance, Other).
- **Asset Health Monitor**: Neev AI failure risk cards, 30-day degradation forecasts, recent fault frequency, and physical wear indicators.
- **Team Availability**: Shift roster (Night, Day, Evening), crew sizes, and active job assignments.
- **Completed Work**: History of certified maintenance completions.

### 4. General User / Verification Portal (Role 3)
- Simple verification interface:
  - Cards showing completed track work, sections, execution dates, and reported clearance times.
  - Action buttons: `[Approve Work]`, `[Reject]`, `[Report False Closure]`.
  - **False Closure Modal**: Explanatory dialog with required comment/evidence field (*"Work was marked completed, but the work was not actually completed or was incorrectly closed"*).

### 5. SIH 14-Step Guided Demo Mode
- Floating top ribbon toggleable via the header button: **"SIH Demo Guide Mode"**.
- Steps through the complete 14-step evaluator walkthrough required by the prompt, automatically switching tabs and roles while presenting guidance text for presenters and evaluators.

---

## 3. Verification & Server Status

- **Vite Development Server**: Active and responding with `HTTP 200 OK` at:
  **`http://localhost:5173/`**
- **Production Build**: Verified with `npm run build` $\rightarrow$ 0 errors.
