import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/renderer/**/*.{tsx,ts,html}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#1a1a2e',
          light: '#16213e',
          dark: '#0f0f23',
        },
        accent: {
          DEFAULT: '#f0a030',
          dim: 'rgba(240, 160, 48, 0.2)',
        },
        model: {
          opus: '#e74c3c',
          sonnet: '#3498db',
          haiku: '#2ecc71',
        },
      },
    },
  },
  plugins: [],
}

export default config
