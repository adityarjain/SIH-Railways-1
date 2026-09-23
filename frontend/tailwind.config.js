/** @type {import('tailwindcss').Config} */
// Industrial skeuomorphism design system (see DESIGN.md). See DESIGN.md for the rationale behind
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
        // Inter for the interface; JetBrains Mono for stamped labels and every
        // number; Noto Sans Devanagari for Hindi.
        sans: ['Inter', '"Noto Sans Devanagari"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Noto Sans Devanagari"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        display: ['Inter', '"Noto Sans Devanagari"', 'ui-sans-serif', 'sans-serif'],
        ws: ['Inter', '"Noto Sans Devanagari"', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        // Safety orange: buttons, toggles and the active nav key. Never status.
        accent: {
          DEFAULT: '#FF6B1A',
          hover: '#FF7F3A',
          ink: '#2D3436',
        },
        // Charcoal ramp for dark panels (footer, CRT readout) and dark text.
        rail: {
          950: '#1E2427',
          900: '#2D3436',
          800: '#3D4548',
          700: '#4A5568',
          600: '#5A6475',
          500: '#4A5568',
          400: '#5A6475',
          300: '#8A94A6',
        },
        surface: {
          base: '#E0E5EC',
          panel: '#E0E5EC',
          sunken: '#D1D9E6',
        },
        line: {
          DEFAULT: '#C8CFDA',
          strong: '#A3B1C6',
          subtle: '#D1D9E6',
        },
        // Semantic status. `info` is the orange accent's dark, text-safe form.
        status: {
          critical: '#C62828',
          'critical-tint': '#F2D4D6',
          warn: '#7A5A00',
          'warn-tint': '#EFE3B0',
          ok: '#1E7A45',
          'ok-tint': '#CDE6D5',
          info: '#B3400A',
          'info-tint': '#F4DCCB',
          idle: '#5A6475',
          'idle-tint': '#D1D9E6',
        },
        bundle: {
          DEFAULT: '#0B6E6E',
          tint: '#CBE4E3',
        },
        ws: {
          ink: '#2D3436',
          body: '#3A4350',
          mid: '#4A5568',
          light: '#4A5568',
          disabled: '#8A94A6',
          rule: '#C8CFDA',
          hairline: '#D1D9E6',
          paper: '#E0E5EC',
          band: '#E0E5EC',
          surface: '#E0E5EC',
          dossier: '#F0F2F5',
          tick: '#D1D9E6',
          selected: '#F0F2F5',
          critical: '#C62828',
          warn: '#7A5A00',
          ok: '#1E7A45',
          info: '#B3400A',
          idle: '#5A6475',
          bundle: '#0B6E6E',
          // Semantic blue for planned / moderate / active-possession state.
          steel: '#4F6F95',
          // Planned possessions are steel blue so they never read as a control.
          barCriticalBg: '#F2D4D6',
          barCriticalBorder: '#D98A8F',
          barCriticalLabel: '#8E1B1B',
          barPlannedBg: '#D6E0EC',
          barPlannedBorder: '#8FA7C4',
          barPlannedLabel: '#2B4A6F',
          barBundledBg: '#CBE4E3',
          barBundledBorder: '#86BDBB',
          barBundledLabel: '#0B5454',
        },
      },
      // Injection-moulded curves: badges 4px, controls 8px, panels 16px.
      borderRadius: {
        none: '0',
        sm: '4px',
        DEFAULT: '8px',
        md: '8px',
        lg: '16px',
        xl: '24px',
        '2xl': '30px',
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
        // One light source, top-left. Dark falls bottom-right, highlight top-left.
        soft: '6px 6px 12px #BABECC, -6px -6px 12px #FFFFFF',
        panel: '8px 8px 16px #BABECC, -8px -8px 16px #FFFFFF',
        lift: '12px 12px 24px #BABECC, -12px -12px 24px #FFFFFF, inset 1px 1px 0 rgba(255,255,255,0.5)',
        key: '4px 4px 8px #BABECC, -4px -4px 8px #FFFFFF',
        'key-accent': '4px 4px 8px rgba(176, 72, 20, 0.35), -4px -4px 8px rgba(255, 160, 110, 0.35)',
        pressed: 'inset 4px 4px 8px #BABECC, inset -4px -4px 8px #FFFFFF',
        recessed: 'inset 3px 3px 6px #BABECC, inset -3px -3px 6px #FFFFFF',
        overlay: '16px 16px 32px rgba(163, 177, 198, 0.7), -8px -8px 24px rgba(255, 255, 255, 0.6)',
        focus: '0 0 0 2px #E0E5EC, 0 0 0 4px #FF6B1A',
        'led-ok': '0 0 8px 1px rgba(34, 197, 94, 0.8)',
        'led-critical': '0 0 8px 1px rgba(214, 48, 49, 0.8)',
        'led-accent': '0 0 8px 1px rgba(255, 107, 26, 0.8)',
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
