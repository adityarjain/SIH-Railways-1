# Design System: Railway Maintenance Operations

Dark control-room interface for a rail maintenance decision-support tool.
Three audiences share it: Authority (planning and approval), Ground Operations
(field execution), Admin (model and solver verification).

Dials: **Variance 4 · Motion 3 · Density 5.** Deliberately below the default
baseline on variance and motion. This is an operations instrument, not a
landing page: a controller scans it under time pressure, so layout stays
predictable and motion only ever confirms an action.

---

## 1. Visual Theme & Atmosphere

A darkened control room at night. The canvas recedes to near-black blue-grey
so the only bright things on screen are the data itself: block windows, risk
figures, train occupancy, solver status. Panels are flat planes lifted from
the canvas by one step of lightness, never by a drop shadow, because on a dark
surface a shadow reads as dirt rather than elevation.

The mood is instrument, not dashboard. Restrained, high-contrast, quiet in the
chrome and loud in the numbers. Nothing decorative competes with a value a
controller has to read correctly at a glance.

Density is mid-scale. Data is dense where density is the point (the day sheet,
the possession register, the candidate table) and generous everywhere else.
Rules divide sections, not rows.

---

## 2. Color Palette & Roles

Cool blue-grey neutrals. One accent. Status hues are load-bearing, defined by
the engine artifacts, so they are treated as data rather than decoration.

**Canvas and surfaces**
- **Deep Canvas** (`#0D1117`) — page background, the darkest plane
- **Section Band** (`#11161D`) — grouping band behind a run of panels
- **Panel Plane** (`#171E27`) — card, panel and table fill
- **Raised Plane** (`#1C242F`) — a panel sitting on another panel
- **Control Track** (`#212934`) — inset track for segmented controls, hover fill
- **Selected Plane** (`#223049`) — active segment, selected row; blue-shifted so selection reads as state, not elevation

**Structure**
- **Structural Rule** (`#263040`) — 1px divider between sections and table headers
- **Hairline** (`#1E2630`) — the faintest divider, used only inside a dense table
- **Strong Rule** (`#38445A`) — input borders and focus-adjacent edges

**Text ramp**
- **Instrument White** (`#E8EDF4`) — primary values, headings, figures
- **Body Grey** (`#C2CBD8`) — prose and descriptions
- **Muted Steel** (`#8B97A8`) — labels, secondary metadata
- **Dim Steel** (`#6B7688`) — provenance, captions, column headers
- **Disabled** (`#4A5361`) — unavailable controls only

**Accent (one)**
- **Signal Blue** (`#4C8DFF`) — selection, active tab, primary action, focus ring

**Status (data, not decoration)**
- **Critical Coral** (`#FF6B5A`) — blocked, critical risk band
- **Caution Amber** (`#E0A030`) — conflict, needs attention
- **Clear Green** (`#3FBF87`) — feasible, complete, solver OK
- **Signal Blue** (`#4C8DFF`) — planned, selected
- **Idle Steel** (`#7A8496`) — inactive, deferred
- **Bundle Teal** (`#2BC4BC`) — concurrent cross-department possession

**Timeline bar fills** — dark tint, luminous label, saturated left rule:
- Planned: fill `#131F33`, edge `#2A4A7A`, label `#7FB0FF`
- Critical: fill `#2A1714`, edge `#6B2E26`, label `#FF8A7A`
- Bundled: fill `#0F2926`, edge `#1E5C57`, label `#4FD6CE`

**Banned:** pure black (`#000000`), purple/violet accents, neon outer glows,
gradient text, any second accent colour.

---

## 3. Typography Rules

- **Interface — Figtree.** Carries headings, labels and body. Emphasis comes
  from weight and colour, never from a second family. Headings track tight
  (`-0.02em`) at 15–32px; hierarchy is weight-driven, not size-driven.
- **Data — JetBrains Mono, tabular figures.** Reserved for IDs, timestamps,
  minute counts, durations and metrics so columns align. Never prose.
- **Devanagari — Noto Sans Devanagari**, with looser leading (1.55). Hindi
  never takes uppercase or letter-tracking: the script has no case and
  tracking breaks conjuncts.
- **Body** sits at 12–13px with relaxed leading, capped near 65 characters.
- **Banned:** Inter, any serif, forced uppercase with letter-tracking as a
  label style, and type scaled up purely to shout.

---

## 4. Component Stylings

- **Buttons.** Filled or tinted, never both filled and outlined. Primary is
  Signal Blue with near-black text (`#0D1117`) for contrast on a luminous
  fill. Secondary is Control Track with Body Grey. Press gives a tactile
  `scale(0.98)`. No glow, ever.
- **Panels.** Panel Plane fill, 10px radius, separated by space. A border only
  where a panel abuts another surface of the same lightness.
- **Pills and badges.** Tinted fill plus luminous text, no outline. A dozen can
  sit on one screen, and outlines turned them into stickers.
- **Segmented controls.** Inset Control Track with the active segment on
  Selected Plane. The role switch, language switch and in-page segmented
  controls all use this one shape so they read as one family.
- **Inputs.** Label above, error below, never a placeholder as a label. Focus
  is a Signal Blue border plus a soft ring, not a colour swap.
- **Tables.** Header row on Section Band with Dim Steel labels. Hairline
  between rows only above roughly eight rows; below that, space is enough.
  Horizontal overflow scrolls, it never squeezes columns.
- **Loading.** Skeletal blocks matching final layout dimensions. No spinners.
- **Empty states.** A composed explanation of why it is empty and what fills
  it, never the words "No data".

---

## 5. Layout Principles

- CSS Grid throughout; no flexbox percentage math.
- Content capped at 1400px and centred; full-bleed only for timelines.
- Every multi-column layout collapses to a single column below 768px, declared
  explicitly in the component rather than assumed.
- No overlapping elements. Each element owns its spatial zone.
- Full-height surfaces use `min-h-[100dvh]`, never `h-screen`.
- Section rhythm comes from space; the page carries far fewer rules than
  values.

---

## 6. Motion & Interaction

Motion is set at 3 deliberately, and the implementation matches the claim:
hover colour transitions, a `scale(0.98)` press, and focus rings. No scroll
hijacking, no pinned sections, no infinite loops, no parallax. In a tool where
a mis-read leads to a wrong possession decision, animation that moves data
while it is being read is a defect.

Anything added later animates `transform` and `opacity` only, and collapses
under `prefers-reduced-motion`.

---

## 7. Anti-Patterns (Banned)

- Pure black, purple/AI-gradient accents, neon or outer-glow shadows
- Gradient text on headings; oversaturated fills
- A second accent colour anywhere
- Inter; any serif; uppercase + letter-tracked micro-labels as a house style
- Ordinal prefixes on section headings (`01`, `02`) as decoration
- A hairline under every row of a short list
- Drop shadows used for elevation on dark surfaces
- Em-dashes in any user-visible string, in both languages. Dataset values are
  exempt: corridor names such as `Delhi–Agra` carry an en-dash from the source
  CSVs, and rewriting them would misreport the data.
- Emojis, custom cursors, scroll cues ("Scroll to explore"), version stamps
- Invented precision: every figure on screen traces to an artifact field, and
  demo-scenario numbers are captioned separately from full-run numbers
