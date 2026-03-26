/**
 * NECESSITY B2B Ecommerce Platform
 * Government-grade color palette
 */

export const colors = {
  primary: '#163E6D',
  primaryDark: '#0F2A4A',
  secondary: '#214E84',
  accent: '#F59E0B',
  accentLight: '#FBBF24',
  background: '#F4F7FB',
  surface: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  error: '#DC2626',
  success: '#059669',
  white: '#FFFFFF',
  black: '#000000',
  /** Bottom tab bar – white bar, dark blue active, dark gray inactive */
  tabBarBackground: '#FFFFFF',
  tabBarActive: '#0A346E',
  tabBarInactive: '#333333',
} as const;

export type ColorKey = keyof typeof colors;
