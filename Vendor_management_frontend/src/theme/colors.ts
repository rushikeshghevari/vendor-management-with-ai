export interface ThemeColors {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  primary: string;
  danger: string;
  success: string;
}

/**
 * Genericart brand palette, from the official UI reference:
 *   Primary:       #1E88E5
 *   Primary Light: #64B5F6
 *   Dark Text:     #212121
 *   Green:         #43A047
 *   Background:    #F5F7FA
 * Mirrors the `brand`/`primary`/`ink` scales in tailwind.config.js — keep both in sync.
 */
export const colors: { light: ThemeColors; dark: ThemeColors } = {
  light: {
    background: '#ffffff',
    surface: '#f5f7fa',
    text: '#212121',
    textMuted: '#5f5f5f',
    border: '#e2e8f0',
    primary: '#1e88e5',
    danger: '#dc2626',
    success: '#43a047',
  },
  dark: {
    background: '#0f1115',
    surface: '#1c1f26',
    text: '#f5f5f5',
    textMuted: '#a3a3a3',
    border: '#33363f',
    primary: '#64b5f6',
    danger: '#f87171',
    success: '#4ade80',
  },
};

export type ColorScheme = keyof typeof colors;
