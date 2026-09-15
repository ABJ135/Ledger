// Part B Design System Palette - Deep Teal & Warm Ivory

export const Colors = {
  light: {
    background: '#FAFAF8',
    surface: '#FFFFFF',
    surfaceRaised: '#F1F0EC',
    primary: '#0B4F4A',
    primaryHover: '#083D39',
    primarySoft: 'rgba(11, 79, 74, 0.08)',
    incomePositive: '#1F8A70',
    expenseAlert: '#C1543C',
    warning: '#B8862E',
    textPrimary: '#1C1B19',
    textSecondary: '#6B6862',
    border: '#E7E4DD',
  },
  dark: {
    background: '#12130F',
    surface: '#1C1D18',
    surfaceRaised: '#262720',
    primary: '#3ECFB2',
    primaryHover: '#5EDCC3',
    primarySoft: 'rgba(62, 207, 178, 0.12)',
    incomePositive: '#4FBE9E',
    expenseAlert: '#E8785F',
    warning: '#E0AC55',
    textPrimary: '#F3F1EC',
    textSecondary: '#A6A398',
    border: '#33352C',
  },
};

export type ThemeMode = 'light' | 'dark';
export type ThemeColors = typeof Colors.light;
