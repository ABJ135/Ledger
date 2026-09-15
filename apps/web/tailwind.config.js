/** @type {import('tailwindcss').Config} */
import sharedPreset from '@repo/config/tailwind-preset.js';

export default {
  presets: [sharedPreset],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
