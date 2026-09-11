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
        sans: ['Inter', '"Noto Sans Devanagari"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        // Control-room chrome: status strips, nav, table headers.
        rail: {
          950: '#0B1220',
          900: '#111A2B',
          800: '#1B2740',
          700: '#27354F',
          600: '#3A4A66',
          500: '#55678A',
          400: '#8494B0',
          300: '#B4C0D2',
        },
        // Work surfaces. Borders carry structure here, not shadows.
        surface: {
          base: '#F7F8FA',
          panel: '#FFFFFF',
          sunken: '#EEF1F5',
        },
        line: {
          DEFAULT: '#D8DEE7',
          strong: '#B8C2D0',
          subtle: '#E7EBF1',
        },
        // Semantic only. RED blocked/critical, AMBER conflict/attention,
        // GREEN feasible/complete, BLUE selected/planning, GREY inactive/deferred.
        status: {
          critical: '#C2303B',
          'critical-tint': '#FCEEEF',
          warn: '#B7791F',
          'warn-tint': '#FDF5E7',
          ok: '#2F7D5B',
          'ok-tint': '#EDF6F1',
          info: '#2563EB',
          'info-tint': '#EDF2FE',
          idle: '#6B7684',
          'idle-tint': '#F1F3F6',
        },
        // Bundling keeps its own hue so the Gantt legend stays truthful.
        bundle: {
          DEFAULT: '#6D4AA8',
          tint: '#F2EDFA',
        },
      },
      // Radius by surface class, not by habit: flat tables and timeline bars,
      // 2px controls, 4px panels.
      borderRadius: {
        none: '0',
        DEFAULT: '2px',
        sm: '2px',
        md: '3px',
        lg: '4px',
        xl: '4px',
        '2xl': '4px',
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
