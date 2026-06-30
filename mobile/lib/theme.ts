/**
 * theme.ts — Design system matching web app (Deep Space theme)
 */

export const theme = {
  colors: {
    // Core palette
    background:   '#050508',
    backgroundAlt: '#0a0a12',
    surface:      'rgba(255, 255, 255, 0.03)',
    surfaceHover: 'rgba(255, 255, 255, 0.06)',
    border:       'rgba(255, 255, 255, 0.07)',

    // Brand
    accent: '#4F46E5',      // Indigo
    teal:   '#06B6D4',      // Teal (data)
    profit: '#F59E0B',      // Gold (profit)
    loss:   '#EF4444',      // Red (loss)

    // Semantic (can also refer to profit/loss)
    success: '#10B981',
    warning: '#F59E0B',
    error:   '#EF4444',
    info:    '#06B6D4',

    // Text
    text:      '#FFFFFF',
    textMuted: 'rgba(255, 255, 255, 0.4)',
    textFaint: 'rgba(255, 255, 255, 0.2)',
  },

  fonts: {
    display: 'SpaceGrotesk',   // Space Grotesk — headings
    body:    'Inter',           // Inter — body text
    mono:    'JetBrainsMono',   // JetBrains Mono — numbers/code
  },

  spacing: {
    xs:  4,
    sm:  8,
    md:  12,
    lg:  16,
    xl:  24,
    xxl: 32,
  },

  radius: {
    sm:  8,
    md:  12,
    lg:  16,
    xl:  24,
    full: 9999,
  },

  shadows: {
    accent: {
      shadowColor:   '#4F46E5',
      shadowOffset:  { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius:  12,
      elevation:     8,
    },
    teal: {
      shadowColor:   '#06B6D4',
      shadowOffset:  { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius:  10,
      elevation:     6,
    },
    card: {
      shadowColor:   '#000000',
      shadowOffset:  { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius:  8,
      elevation:     4,
    },
  },

  gradients: {
    accent: ['#4F46E5', '#06B6D4'],
    profit: ['#F59E0B', '#10B981'],
    loss:   ['#EF4444', '#F97316'],
    dark:   ['#050508', '#0a0a18'],
  },
} as const;

export type Theme = typeof theme;
export type ThemeColor = keyof typeof theme.colors;
