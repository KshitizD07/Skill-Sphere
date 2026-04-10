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
        'bg-base':      '#0b1326',
        'bg-sidebar':   '#131b2e',
        'surface':      '#171f33',
        'surface-mid':  '#222a3d',
        'surface-high': '#2d3449',

        // Primary — electric blue
        'primary':          '#adc6ff',
        'primary-dim':      '#adc6ff',
        'primary-container':'#0f69dc',
        'on-primary':       '#002e6a',
        'primary-inverse':  '#005ac2',

        // Secondary — teal/cyan
        'secondary':          '#6bd8cb',
        'secondary-bright':   '#89f5e7',
        'secondary-container':'#29a195',
        'on-secondary':       '#003732',

        // Tertiary — muted slate
        'tertiary':          '#bec6e0',
        'tertiary-container':'#656d84',
        'on-tertiary':       '#283044',

        // Text
        'text-primary':   '#dae2fd',
        'text-muted':     '#c3c6d7',
        'outline':        '#8d90a0',
        'outline-var':    '#434655',

        // Semantic
        'error':          '#ffb4ab',
        'error-container':'#93000a',
      },
      fontFamily: {
        'manrope':      ['Manrope', 'sans-serif'],
        'space-grotesk':['Space Grotesk', 'sans-serif'],
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