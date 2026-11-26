/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#050608',
        graphite: '#0b0e12',
        carbon: '#11151b',
        steel: '#1a2029',
        line: '#252d38',
        muted: '#7d8896',
        chalk: '#e4e9ef',
        cyan: '#3ddbd9',
        blue: '#3b82f6',
        violet: '#8b7cf6',
        amber: '#e5a94c',
        danger: '#e25656',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(61, 219, 217, 0.14)',
        panel: '0 18px 50px rgba(0, 0, 0, 0.45)',
      },
      keyframes: {
        pulseSoft: { '0%,100%': { opacity: '0.45' }, '50%': { opacity: '1' } },
        scan: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100%)' } },
      },
      animation: {
        'pulse-soft': 'pulseSoft 2.8s ease-in-out infinite',
        scan: 'scan 6s linear infinite',
      },
    },
  },
  plugins: [],
};
