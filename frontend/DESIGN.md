# Design System: Railway Maintenance Operations

**Industrial skeuomorphism.** The interface is a physical control panel: a
matte plastic chassis, modules bolted onto it, keys that press in, LEDs that
report real state, and one CRT readout for the number a controller acts on.
References: Braun control surfaces, Teenage Engineering, spacecraft panels.

Three audiences share it: Authority (planning and approval), Ground Operations
(field execution) and Admin (model and solver verification).

## 1. Physics

- **One light source, top-left at 45°.** Highlights fall top-left, shadows
  bottom-right, on every element.
- **Elevation:**
  - −1, recessed: fields, switch tracks, notices, and the CRT glass.
  - 0, chassis: the page.
  - +1, panels: modules bolted to the chassis.
  - +2, keys: buttons, selected switch segments, calendar days.
- **Press:** keys drop 1–2px and their shadow inverts into the surface
  (150ms, spring easing `cubic-bezier(0.175, 0.885, 0.32, 1.275)`).

## 2. Tokens (`tailwind.config.js`)

**Colour**
- Chassis `#E0E5EC` · raised panel `#F0F2F5` · recessed `#D1D9E6`
- Ink `#2D3436` · labels `#4A5568` (AA) · disabled `#8A94A6`
- Shadow pair `#BABECC` / `#FFFFFF` · rules `#C8CFDA` / `#A3B1C6`
- **Safety orange `#FF6B1A`**: buttons, toggles and the active nav key only.
  Labels on it are charcoal `#2D3436`, not white: white on orange fails WCAG AA.
  Its dark form `#B3400A` is used for accent text and icons.
- **Critical red `#C62828`**: critical risk and conflicts only. Controls and
  alarms never share a colour.
- Steel blue `#4F6F95` (`ws-steel`): planned, moderate and active-possession
  state, so no status ever reads as a control.
- Charcoal plates `#2D3436` / `#1E2427` for the footer and CRT bezels, with
  text `#A8B2D1`.
- LEDs: green `#22C55E` (ok), red `#D63031` (critical), orange (active key).

**Shadows:** `soft` / `panel` / `lift` (raised), `key` / `key-accent` (keys),
`pressed` / `recessed` (inset), `led-ok` / `led-critical` / `led-accent`
(glow), `focus` (orange ring).

**Radius:** badges 4px · controls 8px · panels 16px · feature surfaces 24px.

## 3. Type

- **Inter** for the interface. Page titles are 800 weight, tight tracking,
  with a one-pixel white emboss (`.t-emboss`).
- **JetBrains Mono** for stamped labels (`.t-stamp`: 11px, bold, uppercase,
  tracked), badges, switch legends and every number.
- **Noto Sans Devanagari** for Hindi; stamps drop uppercase and tracking in
  Hindi, because the script has no case and tracking breaks conjuncts.

## 4. Manufacturing details (`index.css`)

- `.bolted`: four screw heads 12px in from the corners. Used on the large
  modules only (sidebar, day sheet, Ground's next task, landing control
  panel), where padding keeps content clear of the screws.
- `.vents` / `<Vents />`: three recessed slots, top-right of bolted modules.
- `.led`: status light; colour and glow always reflect real state (solver
  status, selected key, notice tone), never decoration.
- `.crt` / `.crt-glow`: charcoal glass, scanlines, phosphor-orange digits.
  Used for Overview's recommended possession window and the landing readout.
- Body noise: fractal-noise overlay for the matte plastic surface; fixed and
  pointer-inert.

## 5. Components

- **Sidebar:** a bolted key bank. The current page is a pressed key with a lit
  orange LED; others raise on hover. Below lg it becomes a recessed strip.
- **Top bar:** chassis, government name, a solver LED from the artifact, the
  role and language switches.
- **Buttons:** physical keys, uppercase legends. Primary orange; secondary,
  warning and danger are chassis keys with coloured legends.
- **Segmented controls:** recessed track; the selected key stands proud.
- **Fields:** recessed wells, mono text, orange ring on focus.
- **Notices:** recessed windows with an LED beside a stamped title.
- **Footer:** charcoal plate with the non-official disclaimer.

## 6. Deliberate deviations from the source spec

- Charcoal, not white, labels on orange (contrast).
- Safety orange `#FF6B1A` instead of red `#FF4757` for controls, because red
  already means critical risk in this app.
- No card hover-lift and no slide-up entrance animations: on a dense ops
  screen thirty moving cards are noise. Keys still press physically, and
  `prefers-reduced-motion` disables all transitions.
- Marketing-page devices in the spec (pricing tags, push-pinned testimonials,
  hero device mockup) have no counterpart here and are not used; the landing
  readout plays the device role with real data.

## 7. Identity and honesty

Text identity only; no State Emblem or official logo (restricted by the State
Emblem of India (Prohibition of Improper Use) Act, 2005). The footer states the
system is a demonstration prototype on synthetic data. No national flag
colours. Every figure traces to an artifact field, and demo-scenario numbers
are captioned separately from full-run numbers.
