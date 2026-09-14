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
        // The "industrial worksheet" (design 2A) type system, now sitewide:
        // Barlow for body/interface text, Barlow Semi Condensed for headings,
        // labels and buttons. JetBrains Mono stays reserved for IDs,
        // timestamps, minutes and counts — never prose.
        sans: ['Barlow', '"Noto Sans Devanagari"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
        display: ['"Barlow Semi Condensed"', '"Noto Sans Devanagari"', 'ui-sans-serif', 'sans-serif'],
        ws: ['Barlow', '"Noto Sans Devanagari"', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        // Control-room chrome: status strips, nav, table headers. Warm ink
        // ramp (design 2A) — the same values the Authority Overview worksheet
        // uses, now the sitewide chrome palette rather than a screen-scoped one.
        rail: {
          950: '#17140F',
          900: '#1F1C17',
          800: '#2A251E',
          700: '#3C372E',
          600: '#52493C',
          500: '#6A6255',
          400: '#8A8171',
          300: '#A79E8C',
        },
        // Work surfaces. Borders carry structure here, not shadows.
        surface: {
          base: '#F3F0E8',
          panel: '#FFFFFF',
          sunken: '#EFEAE0',
        },
        line: {
          DEFAULT: '#D7D0C2',
          strong: '#BBAF98',
          subtle: '#E8E2D6',
        },
        // Semantic only. RED blocked/critical, AMBER conflict/attention,
        // GREEN feasible/complete, BLUE selected/planning, GREY inactive/deferred.
        status: {
          critical: '#B22A22',
          'critical-tint': '#F7E4E1',
          warn: '#96660E',
          'warn-tint': '#F5ECD6',
          ok: '#2E6A4A',
          'ok-tint': '#E1EDE6',
          info: '#1B4C8C',
          'info-tint': '#E5EBF4',
          idle: '#7C7466',
          'idle-tint': '#EFEAE0',
        },
        // Bundling keeps its own hue, matching the day-sheet's bundled-block
        // color so the Gantt legend reads the same everywhere in the app.
        bundle: {
          DEFAULT: '#1C6260',
          tint: '#DFEAE8',
        },
        // "Industrial worksheet" (design 2A) exact anchor values. The Authority
        // Overview worksheet and shared day sheet read these directly; every
        // other screen inherits the same look through the rail/status/surface
        // tokens above, which are now derived from this same palette.
        ws: {
          ink: '#1F1C17',
          body: '#3C372E',
          mid: '#6A6255',
          light: '#7A7263',
          rule: '#D7D0C2',
          hairline: '#E8E2D6',
          tick: '#EFEAE0',
          paper: '#F3F0E8',
          dossier: '#FBF9F4',
          band: '#EAE5D9',
          surface: '#FFFFFF',
          disabled: '#BEB6A7',
          selected: '#EDF1F7',
          critical: '#B22A22',
          warn: '#96660E',
          ok: '#2E6A4A',
          info: '#1B4C8C',
          idle: '#7C7466',
          bundle: '#1C6260',
          barCriticalBg: '#F7E4E1',
          barCriticalBorder: '#E0B8B2',
          barCriticalLabel: '#7E1A14',
          barPlannedBg: '#E5EBF4',
          barPlannedBorder: '#BECDE1',
          barPlannedLabel: '#153C6D',
          barBundledBg: '#DFEAE8',
          barBundledBorder: '#B5CCC9',
          barBundledLabel: '#16504E',
        },
      },
      // Radius by surface class (design 2A): flat everywhere — tables,
      // timelines, panels — except the 2px controls (buttons, inputs, badges).
      borderRadius: {
        none: '0',
        DEFAULT: '2px',
        sm: '2px',
        md: '2px',
        lg: '0',
        xl: '0',
        '2xl': '0',
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
        // Shadows appear on overlays only.
        overlay: '0 12px 32px -8px rgba(11, 18, 32, 0.28)',
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
