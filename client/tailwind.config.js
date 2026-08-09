/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds — Warm Paper & Ivory ("THE JOURNAL" Editorial Theme)
        'bg-base':      '#F5F2EB', // Warm Paper Cream
        'bg-sidebar':   '#EAE6DC', // Soft Paper Sidebar
        'surface':      '#FFFFFF', // Pure White Card
        'surface-mid':  '#FAF7F0', // Soft Ivory Surface
        'surface-high': '#F0EDE4', // Paper Accent Surface

        // Primary — Editorial Ochre Gold & Deep Contrast
        'primary':          '#C29F5D', // Matte Ochre Gold
        'primary-dim':      '#A88243',
        'primary-container':'#E8DFCC',
        'on-primary':       '#FFFFFF',
        'primary-inverse':  '#1A1A1A',

        // Secondary — Deep Charcoal Accent
        'secondary':          '#1A1A1A',
        'secondary-bright':   '#2C2C2C',
        'secondary-container':'#E4E1D9',
        'on-secondary':       '#FFFFFF',

        // Tertiary — Warm Neutral Gray
        'tertiary':          '#5A5550',
        'tertiary-container':'#D8D5CD',
        'on-tertiary':       '#1A1A1A',

        // Text & Grid Lines
        'text-primary':   '#111111', // Deep Charcoal
        'text-muted':     '#3A3633', // High-contrast Dark Charcoal for muted text
        'outline':        '#5C5752', // Legible Medium-Dark Charcoal for outline text
        'outline-var':    '#D5D1C8', // Hairline Border Subtler

        // Semantic
        'error':          '#D93838',
        'error-container':'#FDE8E8',
      },
      fontFamily: {
        'outfit': ['Outfit', 'sans-serif'],
        'syne':   ['Playfair Display', 'Georgia', 'serif'],
        'serif':  ['Playfair Display', 'Georgia', 'serif'],
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