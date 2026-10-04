/** Public assets live under the app's base path (/tools/quiz/ inside the church platform). */
const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

export const brand = {
  churchName: 'Bull Bay New Testament Church of God',
  shortName: 'BBNTCOG',
  productName: 'Quiz Night',
  fullTitle: 'Bull Bay New Testament Church of God Quiz Night',
  abbreviatedTitle: 'BBNTCOG QUIZ NIGHT',
  tagline: 'Faith • Fellowship • Competition',

  logo: asset('branding/logo/bbntcog-logo.png'),
  icon: asset('branding/logo/bbntcog-icon.png'),

  backgrounds: {
    game: asset('branding/backgrounds/bbntcog-dark-game-bg.png'),
    light: asset('branding/backgrounds/bbntcog-light-bg.png'),
    hero: asset('branding/backgrounds/bbntcog-quiz-night-hero.png'),
  },

  colors: {
    blue: '#0033A0',
    blueLight: '#1E5FD6',
    navy: '#031B4E',
    deep: '#020F2F',
    green: '#00BF3E',
    greenDark: '#075F2B',
    cyan: '#00B5E2',
    red: '#E62323',
    gold: '#D4AF37',
    goldLight: '#F1D373',
    white: '#FFFFFF',
  },

  teamColorPalette: [
    { id: 'blue', label: 'Royal Blue', value: '#0033A0' },
    { id: 'green', label: 'Green', value: '#00BF3E' },
    { id: 'gold', label: 'Gold', value: '#D4AF37' },
    { id: 'cyan', label: 'Cyan', value: '#00B5E2' },
    { id: 'red', label: 'Red', value: '#E62323' },
    { id: 'purple', label: 'Purple', value: '#7C3AED' },
    { id: 'orange', label: 'Orange', value: '#EA7A17' },
  ],
} as const;

export type BrandTeamColor = (typeof brand.teamColorPalette)[number];
