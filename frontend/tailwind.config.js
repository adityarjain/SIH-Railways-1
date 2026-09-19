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
        // Chrome ramp. Cool graphite, not the previous warm espresso: the warm
        // beige/brass/espresso family is the single most over-used "premium"
        // palette and it made every dark strip read as a heavy block.
        rail: {
          950: '#14161B',
          900: '#1A1D24',
          800: '#262B35',
          700: '#363D4A',
          600: '#4B5462',
          500: '#626B7B',
          400: '#8A94A6',
          300: '#AEB6C4',
        },
        // Work surfaces. Structure now comes from space and a very light rule,
        // with tinted elevation reserved for things that genuinely float.
        surface: {
          base: '#F7F8FA',
          panel: '#FFFFFF',
          sunken: '#EFF1F5',
        },
        line: {
          DEFAULT: '#E2E6ED',
          strong: '#CBD2DD',
          subtle: '#EDF0F5',
        },
        // Semantic only. RED blocked/critical, AMBER conflict/attention,
        // GREEN feasible/complete, BLUE selected/planning, GREY inactive/deferred.
        status: {
          critical: '#C43D30',
          'critical-tint': '#FBEAE8',
          warn: '#B4791A',
          'warn-tint': '#FBF0DC',
          ok: '#2F7D5B',
          'ok-tint': '#E4F1EB',
          info: '#2C63D8',
          'info-tint': '#E9F0FD',
          idle: '#7A8496',
          'idle-tint': '#EFF1F5',
        },
        // Bundling keeps its own hue, matching the day-sheet's bundled-block
        // color so the Gantt legend reads the same everywhere in the app.
        bundle: {
          DEFAULT: '#17807C',
          tint: '#E2F2F1',
        },
        // The sitewide anchor scale. ~1,350 class usages across 32 files read
        // these names, so the repaint happens here: names are stable, values
        // moved from a warm espresso-on-beige ramp to a cool graphite-on-white
        // one. Text contrast is deliberately a step softer than the old
        // near-black on beige, which is what made long reads tiring.
        ws: {
          ink: '#1A1D24',
          body: '#3B414D',
          mid: '#626B7B',
          light: '#8A94A6',
          rule: '#E2E6ED',
          hairline: '#EDF0F5',
          tick: '#EFF1F5',
          paper: '#F7F8FA',
          dossier: '#FCFCFD',
          band: '#F1F3F7',
          surface: '#FFFFFF',
          disabled: '#B4BCC9',
          selected: '#EAF1FE',
          critical: '#C43D30',
          warn: '#B4791A',
          ok: '#2F7D5B',
          info: '#2C63D8',
          idle: '#7A8496',
          bundle: '#17807C',
          barCriticalBg: '#FBEAE8',
          barCriticalBorder: '#F0C4BE',
          barCriticalLabel: '#8F251C',
          barPlannedBg: '#E9F0FD',
          barPlannedBorder: '#C3D6F7',
          barPlannedLabel: '#1E4BA8',
          barBundledBg: '#E2F2F1',
          barBundledBorder: '#B9DCD9',
          barBundledLabel: '#10605D',
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
        // Tinted to the surface hue, never pure black. These replace the hard
        // 1px box borders that used to fence every panel: one soft edge reads
        // lighter than a drawn line, and stacks better on a near-white page.
        soft: '0 1px 2px rgba(26, 29, 36, 0.04), 0 1px 1px rgba(26, 29, 36, 0.03)',
        panel: '0 1px 3px rgba(26, 29, 36, 0.05), 0 4px 12px -4px rgba(26, 29, 36, 0.06)',
        lift: '0 2px 6px rgba(26, 29, 36, 0.06), 0 10px 24px -8px rgba(26, 29, 36, 0.10)',
        overlay: '0 12px 32px -8px rgba(20, 22, 27, 0.24)',
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
