/** @type {import('tailwindcss').Config} */
// Editorial serif design system (see DESIGN.md). See DESIGN.md for the rationale behind
// each value; token NAMES are stable across repaints (~1,350 call sites read
// them), so a repaint is a change to this file, not to the components.
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Playfair Display carries headlines, section titles, large figures and
        // the wordmark, nothing else. Its Hindi counterpart is Noto Serif
        // Devanagari, so a Hindi headline stays a serif headline.
        serif: ['"Playfair Display"', '"Noto Serif Devanagari"', 'Georgia', 'serif'],
        // Source Sans 3 carries the interface. `display` and `ws` stay sans on
        // purpose: ~130 small labels and buttons use them.
        sans: ['"Source Sans 3"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        display: ['"Source Sans 3"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        ws: ['"Source Sans 3"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        // IBM Plex Mono: small-caps labels and tabular figures.
        mono: ['"IBM Plex Mono"', '"Noto Sans Devanagari"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Burnished gold, the single accent. DEFAULT is deep enough to carry
        // white text at AA (~4.9:1); `bright` (#B8860B, the brief's gold) is
        // for rules, rings and small-caps accents, never for text on white.
        accent: {
          DEFAULT: '#8F6A08',
          hover: '#7A5A06',
          bright: '#B8860B',
          soft: '#D4A84B',
          ink: '#FFFFFF',
        },
        // Warm neutral ramp. 950..800 are near-black ink; 600..300 are greys.
        rail: {
          950: '#1A1A1A',
          900: '#2A2826',
          800: '#3A3734',
          700: '#4A4643',
          600: '#6B6B6B',
          500: '#6B6B6B',
          400: '#6B6B6B',
          300: '#A8A49C',
        },
        surface: {
          base: '#FAFAF8',
          panel: '#FFFFFF',
          sunken: '#F5F3F0',
        },
        line: {
          DEFAULT: '#E8E4DF',
          strong: '#D4CFC8',
          subtle: '#EFECE7',
        },
        // Status is desaturated so it sits in the palette, and warnings are
        // rust rather than amber so they never read as the gold accent.
        status: {
          critical: '#A61B1B',
          'critical-tint': '#F6E3E1',
          warn: '#A4471A',
          'warn-tint': '#F4E4DA',
          ok: '#2E6B3F',
          'ok-tint': '#E3EEE5',
          info: '#8B6508',
          'info-tint': '#F5EDD9',
          idle: '#6B6B6B',
          'idle-tint': '#F0EDE8',
        },
        bundle: {
          DEFAULT: '#2F6B6B',
          tint: '#E1EDEC',
        },
        ws: {
          ink: '#1A1A1A',
          body: '#333130',
          mid: '#6B6B6B',
          light: '#6B6B6B',
          disabled: '#A8A49C',
          rule: '#E8E4DF',
          hairline: '#EFECE7',
          paper: '#FAFAF8',
          band: '#FAFAF8',
          surface: '#FFFFFF',
          dossier: '#FFFFFF',
          tick: '#F5F3F0',
          selected: '#F5EDD9',
          critical: '#A61B1B',
          warn: '#A4471A',
          ok: '#2E6B3F',
          info: '#8B6508',
          idle: '#6B6B6B',
          bundle: '#2F6B6B',
          // Slate for planned / moderate / active-possession state.
          steel: '#4E6072',
          barCriticalBg: '#F6E3E1',
          barCriticalBorder: '#D9A7A1',
          barCriticalLabel: '#7F1A1A',
          barPlannedBg: '#ECEFF2',
          barPlannedBorder: '#B9C3CD',
          barPlannedLabel: '#33475A',
          barBundledBg: '#E1EDEC',
          barBundledBorder: '#A7C5C2',
          barBundledLabel: '#24504F',
        },
      },
      // Neither sharp nor round: 4px badges, 6px controls, 8px cards.
      borderRadius: {
        none: '0',
        sm: '4px',
        DEFAULT: '6px',
        md: '6px',
        lg: '8px',
        xl: '10px',
        '2xl': '12px',
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
        // Refinement, not depth. The 1px warm ring doubles as the card border,
        // so every card carrying these gets its hairline edge for free.
        soft: '0 0 0 1px #E8E4DF, 0 1px 2px rgba(26, 26, 26, 0.04)',
        panel: '0 0 0 1px #E8E4DF, 0 1px 2px rgba(26, 26, 26, 0.04)',
        lift: '0 0 0 1px #E8E4DF, 0 4px 12px rgba(26, 26, 26, 0.06)',
        key: '0 0 0 1px #E8E4DF, 0 1px 2px rgba(26, 26, 26, 0.05)',
        'key-accent': '0 1px 2px rgba(143, 106, 8, 0.25)',
        pressed: 'inset 0 0 0 1px #D4CFC8',
        recessed: 'inset 0 0 0 1px #E8E4DF',
        overlay: '0 8px 24px rgba(26, 26, 26, 0.08), 0 0 0 1px #E8E4DF',
        focus: '0 0 0 2px #FAFAF8, 0 0 0 4px #B8860B',
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
