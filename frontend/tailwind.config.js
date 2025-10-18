module.exports = {
  purge: ['./public/**/*.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: false,
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#B8E1F9',
          DEFAULT: '#4FA3D8',
          dark: '#3278A3'
        },
        neutral: {
          light: '#F4F6F8',
          DEFAULT: '#E2E8F0',
          dark: '#94A3B8'
        }
      }
    }
  },
  variants: {
    extend: {}
  },
  plugins: []
};
