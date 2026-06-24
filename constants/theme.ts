import type { TextStyle, ViewStyle } from 'react-native'

export const Colors = {
  primary:       '#ED8323',
  primaryDark:   '#E57757',
  primaryMedium: '#e87a2f',
  primaryLight:  '#FFF4E8',
  accent:        '#00332A',
  accentDark:    '#001a15',
  accentLight:   '#E6F0EF',
  background:    '#F8F9FA',
  surface:       '#FFFFFF',
  text:          '#1A1A2E',
  textSecondary: '#6B7280',
  textLight:     '#9CA3AF',
  border:        '#E5E7EB',
  borderLight:   '#F3F4F6',
  success:       '#10B981',
  error:         '#EF4444',
  star:          '#F59E0B',
  userBubble:    '#ED8323',
  assistantBubble: '#F3F4F6',
  overlay:       'rgba(0,0,0,0.4)',
  glass:         'rgba(255,255,255,0.85)',
  glassDark:     'rgba(0,0,0,0.6)',
  shimmer:       'rgba(255,255,255,0.15)',
}

export const Fonts = {
  regular: 'System',
  medium:  'System',
  bold:    'System',
}

export const Typography = {
  hero:       { fontSize: 32, fontWeight: '800', lineHeight: 38, letterSpacing: -0.5 } as TextStyle,
  h1:        { fontSize: 24, fontWeight: '700', lineHeight: 30, letterSpacing: -0.3 } as TextStyle,
  h2:        { fontSize: 20, fontWeight: '700', lineHeight: 26 } as TextStyle,
  h3:        { fontSize: 17, fontWeight: '600', lineHeight: 22 } as TextStyle,
  body:      { fontSize: 15, fontWeight: '400', lineHeight: 22 } as TextStyle,
  bodyMedium: { fontSize: 15, fontWeight: '500', lineHeight: 22 } as TextStyle,
  caption:   { fontSize: 13, fontWeight: '400', lineHeight: 18 } as TextStyle,
  overline:  { fontSize: 10, fontWeight: '700', lineHeight: 14, letterSpacing: 1.5, textTransform: 'uppercase' } as TextStyle,
  button:    { fontSize: 15, fontWeight: '600', lineHeight: 20 } as TextStyle,
  tabLabel:  { fontSize: 10, fontWeight: '600', lineHeight: 14 } as TextStyle,
}

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  } as ViewStyle,
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  } as ViewStyle,
  glow: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  } as ViewStyle,
}

export const Gradients = {
  cardOverlay:  ['transparent', 'rgba(0,0,0,0.6)'] as const,
  heroOverlay:  ['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.65)'] as const,
  primaryFade:  [Colors.primary, Colors.primaryDark] as const,
  primaryLight: [Colors.primaryLight, '#FFF8F2'] as const,
  warmGlow:     ['rgba(237,131,35,0.0)', 'rgba(237,131,35,0.08)'] as const,
  accentFade:   [Colors.accent, Colors.accentDark] as const,
}

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
  xxxl: 64,
}

export const Radius = {
  sm:   8,
  md:   12,
  lg:   20,
  xl:   28,
  xxl:  32,
  full: 999,
}
