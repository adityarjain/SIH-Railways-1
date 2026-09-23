# Design System: Railway Maintenance Operations

**Editorial serif.** The interface is set like a well-made publication: ivory
paper, a high-contrast display serif, fine warm rules for structure, small-caps
labels, and a single burnished-gold accent. Restraint does the work; nothing
moves for show.

Three audiences share it: Authority (planning and approval), Ground Operations
(field execution) and Admin (model and solver verification).

## 1. Principles

- **The serif is the voice.** Playfair Display appears only where it earns its
  place: page titles, section titles, large figures and the wordmark. Every
  other word is set in the interface sans.
- **Rules, not boxes.** Sections are divided by 1px warm rules; cards carry a
  hairline edge and almost no shadow.
- **Editorial frame, working data.** The landing page, page headers and section
  openings get magazine spacing. Timelines, tables and the calendar keep full
  width and working density, framed by the rules and serif headings.
- **One accent, one job.** Gold marks what you can act on and what is current
  (buttons, the current page, the selected option). It never marks status.
- **Nothing bounces, nothing lifts.** Colour and underline transitions only,
  200ms ease-out; `prefers-reduced-motion` disables them.

## 2. Colour (`tailwind.config.js`)

- Ivory page `#FAFAF8` · white cards `#FFFFFF` · warm muted `#F5F3F0`
- Rich black `#1A1A1A` text · warm grey `#6B6B6B` secondary text
- Rules `#E8E4DF` · stronger rule `#D4CFC8`
- **Gold accent:**
  - `accent` `#8F6A08` for button fills (white text ≈ 4.9:1)
  - `status-info` `#8B6508` for gold text
  - `accent-bright` `#B8860B` for rules, rings and underlines only
- **Status** (desaturated to sit in the palette):
  - critical `#A61B1B`
  - warning **rust** `#A4471A`, not amber, so it never reads as the gold accent
  - complete `#2E6B3F` · planned / moderate / active **slate** `#4E6072`
  - inactive `#6B6B6B` · bundled `#2F6B6B`

## 3. Type

- **Playfair Display**: headlines (40–72px on the landing page, 38–52px page
  titles), section titles (21px), display figures (34–54px), wordmark.
- **Source Sans 3**: all interface text; body at 1.75 line-height on reading
  surfaces.
- **IBM Plex Mono**: small caps (`.t-stamp`, `.t-scope`: 10–11px, uppercase,
  0.12–0.15em tracking) and tabular figures.
- **Hindi**: headlines in Noto Serif Devanagari so they stay serif; body in
  Noto Sans Devanagari. Small caps drop uppercase and tracking for Devanagari,
  which has no case and whose conjuncts break when letter-spaced.

`font-display` and `font-ws` deliberately remain the interface sans: they are
used on ~130 small labels and buttons, where an 11px display serif would be
illegible. The serif is applied through `font-serif` only.

## 4. Signature elements (`index.css`, `components/ui/worksheet.jsx`)

- `.t-section-label`: gold small caps between two hairline rules (landing
  masthead).
- **Page header**: gold small-caps section label, serif title, a 48px gold rule,
  then the summary.
- **Section header** (`RegionHeader`): serif title over a hairline rule, meta
  in small caps.
- **Display figures**: `StatFigure`, the landing figures row, and Overview's
  recommended possession window, set in the serif beside a gold rule.
- **Notices** (`AdvisoryNote`): an editorial aside, a 2px coloured rule on the
  left over the muted tint.
- **Segmented controls**, role and language switches: set as a contents line,
  with the selected option underlined in gold.
- **Paper grain**: a faint fractal-noise overlay, fixed and pointer-inert.

## 5. Components

- **Sidebar**: a contents page. Serif wordmark, gold small-caps section labels,
  and a gold rule beside the current page. Below lg it becomes one line of links.
- **Buttons**:
  - Primary: gold fill.
  - Secondary: black outline that warms to gold on hover.
  - Warning: rust outline. Ghost: underlines on hover.
  - All: 6px radius, 44px minimum on the Ground touch targets.
- **Cards**: white, 8px radius, hairline edge (carried by `shadow-soft` /
  `shadow-panel` as a 1px ring), optional 2px gold top rule for the featured
  card.
- **Fields**: white, 1px warm border, gold border and ring on focus.
- **Badges**: small caps on a pale tint, 4px radius.

## 6. Deliberate deviations from the source brief

- **Contrast**: the brief's `#B8860B` gold measures ≈ 3.2:1 both as white-on-gold
  and gold-on-white, below WCAG AA. Buttons use the deeper `#8F6A08`, text uses
  `#8B6508`, and `#B8860B` is kept for non-text marks.
- **No hover lift**: the brief both prescribes and forbids a button lift; the
  restraint reading wins.
- **Warnings are rust**, per the decision that gold and amber must never be
  confused.
- **Whitespace** is editorial on framing surfaces only (see §1).
- Marketing sections in the brief (pricing, testimonials, FAQ) have no
  counterpart in this app and are not used.

## 7. Identity and honesty

Text identity only; no State Emblem or official logo (restricted by the State
Emblem of India (Prohibition of Improper Use) Act, 2005). The footer states the
system is a demonstration prototype on synthetic data. No national flag
colours. Every figure traces to an artifact field, and demo-scenario numbers
are captioned separately from full-run numbers.

Token names such as `shadow-key`, `shadow-pressed` and `ws-*` are stable across
repaints (about 1,350 call sites read them); their values, not their names,
carry the current style.
