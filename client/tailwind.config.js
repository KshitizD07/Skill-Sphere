/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        'bg-base':      '#121110', // Dark Earth Carbon
        'bg-sidebar':   '#161513',
        'surface':      '#1a1918', // Textured Charcoal Clay
        'surface-mid':  '#23211f',
        'surface-high': '#2c2a27',

        // Primary — Glowing Bronze Amber
        'primary':          '#f59e0b',
        'primary-dim':      '#d97706',
        'primary-container':'#b45309',
        'on-primary':       '#fffbeb',
        'primary-inverse':  '#fbbf24',

        // Secondary — Muted Copper
        'secondary':          '#ca8a04',
        'secondary-bright':   '#eab308',
        'secondary-container':'#854d0e',
        'on-secondary':       '#fefce8',

        // Tertiary — Muted Bone/Slate
        'tertiary':          '#d6d3d1',
        'tertiary-container':'#78716c',
        'on-tertiary':       '#292524',

        // Text
        'text-primary':   '#f5f5f4', // Warm bone
        'text-muted':     '#a8a29e',
        'outline':        '#57534e',
        'outline-var':    '#44403c',

        // Semantic
        'error':          '#f87171',
        'error-container':'#7f1d1d',
      },
      fontFamily: {
        'outfit': ['Outfit', 'sans-serif'],
        'syne':   ['Syne', 'sans-serif'],
      },
      borderRadius: {
        'xs':  '2px',
        'sm':  '4px',
        'md':  '8px',
        'full':'9999px',
      },
      letterSpacing: {
        'ui':     '0.12em',
        'tight':  '-0.03em',
        'tighter':'-0.04em',
      },
    },
  },
  plugins: [],
}