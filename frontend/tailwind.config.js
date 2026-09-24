/** @type {import('tailwindcss').Config} */
// Industrial worksheet design system, direction 2A (see DESIGN.md for the
// rationale behind each value); token NAMES are stable across repaints (~1,350 call sites read
// them), so a repaint is a change to this file, not to the components.
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Barlow for body and interface text; Barlow Semi Condensed for
        // operational headings, section labels, buttons and nav; JetBrains Mono
        // for IDs, timestamps, minutes, risk values, rule codes and counts only.
        sans: ['Barlow', '"Noto Sans Devanagari"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        ws: ['Barlow', '"Noto Sans Devanagari"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Barlow Semi Condensed"', '"Noto Sans Devanagari"', 'ui-sans-serif', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Noto Sans Devanagari"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        // Ink is the one action colour: primary buttons, the selected
        // segment, focus rings. Never status.
        accent: {
          DEFAULT: '#1F1C17',
          hover: '#3C372E',
          ink: '#FFFFFF',
        },
        // Warm ink ramp: 950..800 near-black, 600..300 greys.
        rail: {
          950: '#1F1C17',
          900: '#2A261F',
          800: '#3C372E',
          700: '#4A4338',
          600: '#6A6255',
          500: '#6A6255',
          400: '#7A7263',
          300: '#BEB6A7',
        },
        surface: {
          base: '#F3F0E8',
          panel: '#FFFFFF',
          sunken: '#EFEAE0',
        },
        line: {
          DEFAULT: '#D7D0C2',
          strong: '#B9B0A0',
          subtle: '#E8E2D6',
        },
        status: {
          critical: '#B22A22',
          'critical-tint': '#F7E4E1',
          warn: '#96660E',
          'warn-tint': '#F4EBD8',
          ok: '#2E6A4A',
          'ok-tint': '#E2EDE6',
          info: '#1B4C8C',
          'info-tint': '#E5EBF4',
          idle: '#7C7466',
          'idle-tint': '#EFEAE0',
        },
        bundle: {
          DEFAULT: '#1C6260',
          tint: '#DFEAE8',
        },
        ws: {
          ink: '#1F1C17',
          body: '#3C372E',
          mid: '#6A6255',
          // Lightest text allowed: 4.8:1 on white.
          light: '#7A7263',
          disabled: '#BEB6A7',
          rule: '#D7D0C2',
          hairline: '#E8E2D6',
          paper: '#F3F0E8',
          band: '#EAE5D9',
          surface: '#FFFFFF',
          dossier: '#FBF9F4',
          tick: '#EFEAE0',
          selected: '#EDF1F7',
          critical: '#B22A22',
          warn: '#96660E',
          ok: '#2E6A4A',
          info: '#1B4C8C',
          idle: '#7C7466',
          bundle: '#1C6260',
          steel: '#1B4C8C',
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
      // Square worksheet: 0 on regions, tables and bars; 2px on controls.
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '2px',
        md: '2px',
        lg: '0',
        xl: '0',
        '2xl': '0',
        full: '9999px',
      },
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
        // No depth outside overlays. The panel "shadows" are a 1px rule ring,
        // so every region keeps its edge without a border utility.
        soft: '0 0 0 1px #D7D0C2',
        panel: '0 0 0 1px #D7D0C2',
        lift: '0 0 0 1px #D7D0C2',
        key: '0 0 0 1px #D7D0C2',
        'key-accent': 'none',
        pressed: 'inset 0 0 0 1px #1F1C17',
        recessed: 'inset 0 0 0 1px #D7D0C2',
        overlay: '0 12px 32px rgba(31, 28, 23, 0.18), 0 0 0 1px #D7D0C2',
        focus: '0 0 0 1px #FFFFFF, 0 0 0 3px #1F1C17',
        'led-ok': 'none',
        'led-critical': 'none',
        'led-accent': 'none',
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
