/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Inter and JetBrains Mono are loaded in index.html. Before this config
      // existed they were downloaded on every page load and rendered by nothing,
      // because `fontFamily` was never declared and font-sans/font-mono fell
      // back to the system stacks.
      fontFamily: {
        // One interface family, not three. Figtree carries body, headings and
        // labels; emphasis comes from weight, never from swapping family.
        // Barlow Semi Condensed was dropped in this repaint: condensed display
        // type is most of what read as "industrial/heavy", and the width it
        // saved is recovered by dropping forced uppercase + letter-tracking.
        // JetBrains Mono stays reserved for IDs, timestamps, minutes and
        // counts. Never prose.
        sans: ['Figtree', '"Noto Sans Devanagari"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        display: ['Figtree', '"Noto Sans Devanagari"', 'ui-sans-serif', 'sans-serif'],
        ws: ['Figtree', '"Noto Sans Devanagari"', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        // Dark control room (see DESIGN.md). Surfaces step UP in lightness as
        // they come forward; a drop shadow reads as dirt on a dark plane, so
        // elevation is carried by lightness alone.
        rail: {
          950: '#0D1117', // deep canvas
          900: '#11161D', // section band
          800: '#171E27', // panel plane
          700: '#1C242F', // raised plane
          600: '#212934', // control track
          500: '#6B7688', // dim steel (text)
          400: '#8B97A8', // muted steel (text)
          300: '#C2CBD8', // body grey (text)
        },
        surface: {
          base: '#0D1117',
          panel: '#171E27',
          sunken: '#212934',
        },
        line: {
          DEFAULT: '#263040',
          strong: '#38445A',
          subtle: '#1E2630',
        },
        // Semantic only. RED blocked/critical, AMBER conflict/attention,
        // GREEN feasible/complete, BLUE selected/planning, GREY inactive/deferred.
        // Luminous on a dark plane, and the tints are dark fills rather than
        // pale washes. Semantics are unchanged: these come from the engine
        // artifacts, so they are data and the legends depend on them.
        status: {
          critical: '#FF6B5A',
          'critical-tint': '#2A1714',
          warn: '#E0A030',
          'warn-tint': '#2A2112',
          ok: '#3FBF87',
          'ok-tint': '#10261D',
          info: '#4C8DFF',
          'info-tint': '#131F33',
          idle: '#7A8496',
          'idle-tint': '#212934',
        },
        // Bundling keeps its own hue, matching the day-sheet's bundled-block
        // color so the Gantt legend reads the same everywhere in the app.
        bundle: {
          DEFAULT: '#2BC4BC',
          tint: '#0F2926',
        },
        // The sitewide anchor scale. ~1,350 class usages across 32 files read
        // these names, so the repaint happens here: names are stable, values
        // moved from a warm espresso-on-beige ramp to a cool graphite-on-white
        // one. Text contrast is deliberately a step softer than the old
        // near-black on beige, which is what made long reads tiring.
        ws: {
          // Text ramp, now light-on-dark.
          ink: '#E8EDF4',
          body: '#C2CBD8',
          mid: '#8B97A8',
          light: '#6B7688',
          disabled: '#4A5361',
          // Structure.
          rule: '#263040',
          hairline: '#1E2630',
          // Surfaces, darkest to lightest as they come forward.
          paper: '#0D1117',
          band: '#11161D',
          surface: '#171E27',
          dossier: '#1C242F',
          tick: '#212934',
          // Blue-shifted, so selection reads as state and not as elevation.
          selected: '#223049',
          critical: '#FF6B5A',
          warn: '#E0A030',
          ok: '#3FBF87',
          info: '#4C8DFF',
          idle: '#7A8496',
          bundle: '#2BC4BC',
          // Timeline bars: dark tint, saturated edge, luminous label.
          barCriticalBg: '#2A1714',
          barCriticalBorder: '#6B2E26',
          barCriticalLabel: '#FF8A7A',
          barPlannedBg: '#131F33',
          barPlannedBorder: '#2A4A7A',
          barPlannedLabel: '#7FB0FF',
          barBundledBg: '#0F2926',
          barBundledBorder: '#1E5C57',
          barBundledLabel: '#4FD6CE',
        },
      },
      // One radius rule, applied everywhere:
      //   data surfaces (timeline bars, heat cells) .. 2px  -> rounded-sm
      //   controls (buttons, inputs, pills, tabs) .... 6px  -> rounded / rounded-md
      //   panels, cards, dialogs .................... 10px  -> rounded-lg
      //   feature surfaces (hero, empty states) ..... 14px  -> rounded-xl
      // Mixing radii without a rule is what reads as broken; this is the rule.
      borderRadius: {
        none: '0',
        DEFAULT: '6px',
        sm: '2px',
        md: '6px',
        lg: '10px',
        xl: '14px',
        '2xl': '18px',
        full: '9999px',
      },
      // Additive only. Tailwind's default scale is left intact deliberately:
      // remapping text-xs/text-sm would silently resize every existing screen.
      // Density comes from the component classes below, not a global remap.
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
      },
      spacing: {
        // Operational row heights.
        'row-dense': '28px',
        'row': '32px',
        // Minimum comfortable touch target for the Ground portal.
        'touch': '44px',
      },
      boxShadow: {
        // On a dark plane a drop shadow reads as dirt, so elevation is carried
        // by surface lightness instead. `soft`/`panel` stay in the scale
        // because ~30 call sites reference them, but resolve to nothing.
        soft: 'none',
        panel: 'none',
        lift: 'none',
        // Overlays still need separation from the page behind them.
        overlay: '0 16px 40px -12px rgba(0, 0, 0, 0.64)',
        none: 'none',
      },
      zIndex: {
        // `z-25` was used by DemoGuideBar but is not on Tailwind's default
        // scale, so it emitted nothing and the bar had no stacking context.
        25: '25',
        header: '30',
        guide: '25',
        overlay: '50',
      },
    },
  },
  plugins: [],
};
