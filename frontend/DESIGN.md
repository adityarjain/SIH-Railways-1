# Design System: Railway Maintenance Operations

**Industrial worksheet (direction 2A).** The interface reads like an operational
worksheet: a warm paper ground, ink type, numbered sections that run into a
rule, ruled ledger rows, square corners and no depth. Source: the Claude Design
handoff "Authority Overview Redesign", frame `#2a`, applied app-wide.

Reading order on the Overview: PLAN → DECISION → EVIDENCE → OPERATIONAL CONTEXT.

## 1. Principles

- **Rules, not boxes.** Regions are separated by 1px `rule` lines (grids use
  `gap-px` over a rule-coloured ground). No shadows outside overlays.
- **Square.** 0 radius on regions, tables and timeline bars; 2px on controls.
- **Ink is the only action colour.** Primary buttons, the selected segment,
  the active tab underline and the focus ring. It never marks status.
- **Mono for data only.** JetBrains Mono carries IDs, timestamps, minutes,
  risk values, rule codes and counts; never prose.
- **Colour transitions only.** No entrance animation, no lift.

## 2. Tokens (`tailwind.config.js`)

- Ground: paper `#F3F0E8` · band `#EAE5D9` · surface `#FFFFFF` · dossier
  `#FBF9F4` · tick `#EFEAE0`
- Ink `#1F1C17` · body `#3C372E` · mid `#6A6255` · light `#7A7263` (lightest
  text, 4.8:1 on white) · disabled `#BEB6A7`
- Rules: rule `#D7D0C2` · hairline `#E8E2D6` · selected row `#EDF1F7`
- Status: critical `#B22A22` · warn `#96660E` · ok `#2E6A4A` · info `#1B4C8C`
  · idle `#7C7466` · bundled teal `#1C6260`
- Timeline bars are `[background, border, 3px left rule, label]` per state.

## 3. Type

- **Barlow Semi Condensed** (`font-display`): headings, section labels, nav,
  buttons, verdicts. Section labels 16px/600 caps, 0.1em.
- **Barlow** (`font-sans`, `font-ws`): body and interface text, 13px/1.45.
- **JetBrains Mono** (`font-mono`): data only.
- **Hindi**: Noto Sans Devanagari follows both families. Caps and tracking are
  dropped (global rule in `index.css`), labels step up 1px, rows grow.

## 4. Shell and primitives

- **Shell** (`AppLayout`): ink provenance strip → paper masthead (title, scope
  line, run state, role switch) → horizontal tab nav → page → band footer.
  Pages can replace the scope line with `useMastheadSubtitle`.
- **`RegionHeader`**: `01` number, caps label, hairline rule, mono meta.
- **`FieldRow`**: caps label and mono value over a hairline.
- **`SegmentedControl`**, role and language switches: 1px box, active filled
  ink; unavailable options stay visible and greyed.
- **`AdvisoryNote`**: dossier ground with a 3px semantic rule on the left.
- **Buttons**: primary ink; secondary outline that takes the paper fill and an
  ink edge on hover.

## 5. Retired

The industrial-skeuomorphism helpers (`.bolted`, `.vents`, `.crt`,
`.t-emboss`, `shadow-led-*`) remain as no-ops so old call sites render flat.

## 6. Identity and honesty

Text identity only; no State Emblem or official logo (restricted by the State
Emblem of India (Prohibition of Improper Use) Act, 2005). The footer states the
system is a demonstration prototype on synthetic data. No national flag
colours. Every figure traces to an artifact field, and demo-scenario numbers
are captioned separately from full-run numbers.
