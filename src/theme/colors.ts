/**
 * NECESSITY — mobile palette aligned with admin-frontend (`admin-frontend/src/index.css` @theme).
 */

export const colors = {
  /** Deep orange — primary actions, links, tab active */
  primary: '#F37732',
  /** Darker orange — pressed states */
  primaryDark: '#D9631C',
  /** Dark grey — secondary filled buttons (white label) */
  secondary: '#454546',
  /** Light orange — highlights, emphasis text, splash accent ring */
  accent: '#F7AE6B',
  accentLight: '#FAD4A8',
  /** Admin near-white */
  background: '#FEFEFE',
  surface: '#FFFFFF',
  /** Warm neutral wells (image placeholders, quantity rows, icon buttons) */
  surfaceMuted: '#F7F3EF',
  /** Admin dark grey — primary text */
  text: '#454546',
  /** Admin medium grey — secondary text */
  textSecondary: '#929293',
  /** Admin light beige — borders, subtle separators */
  border: '#E4D6C6',
  lightBeige: '#E4D6C6',
  error: '#DC2626',
  success: '#059669',
  white: '#FEFEFE',
  black: '#000000',
  tabBarBackground: '#FFFFFF',
  tabBarActive: '#F37732',
  tabBarInactive: '#929293',
} as const;

export type ColorKey = keyof typeof colors;
