// =============================================================================
// PRESENTATION THEMES - Shared Theme Configuration
// =============================================================================

export type ThemeName = 'Modern Tech' | 'Minimalist' | 'Elegant Startup' | 'Corporate Blue' | 'Data Viz';

export interface ThemeConfig {
  name: ThemeName;
  textColor: string;
  overlayColor: string;
  accentColor: string;
  /**
   * Editable (non-image) slide background styling for on-screen viewing.
   * PPTX export uses a separate PPT template system.
   */
  backgroundFrom: string;
  backgroundTo: string;
}

export const THEMES: Record<ThemeName, ThemeConfig> = {
  'Modern Tech': {
    name: 'Modern Tech',
    textColor: '#ffffff',
    overlayColor: 'rgba(0, 0, 0, 0.55)',
    accentColor: '#3b82f6',
    backgroundFrom: '#0b1220',
    backgroundTo: '#111827',
  },
  'Minimalist': {
    name: 'Minimalist',
    textColor: '#1f2937',
    overlayColor: 'rgba(255, 255, 255, 0.75)',
    accentColor: '#eab308',
    backgroundFrom: '#f8fafc',
    backgroundTo: '#f1f5f9',
  },
  'Elegant Startup': {
    name: 'Elegant Startup',
    textColor: '#ffffff',
    overlayColor: 'rgba(0, 0, 0, 0.5)',
    accentColor: '#a855f7',
    backgroundFrom: '#0f172a',
    backgroundTo: '#111827',
  },
  'Corporate Blue': {
    name: 'Corporate Blue',
    textColor: '#1e3a5f',
    overlayColor: 'rgba(255, 255, 255, 0.7)',
    accentColor: '#2563eb',
    backgroundFrom: '#eff6ff',
    backgroundTo: '#dbeafe',
  },
  'Data Viz': {
    name: 'Data Viz',
    textColor: '#ffffff',
    overlayColor: 'rgba(0, 0, 0, 0.6)',
    accentColor: '#10b981',
    backgroundFrom: '#052e2b',
    backgroundTo: '#064e3b',
  },
};

// Get default theme
export const getDefaultTheme = (): ThemeName => 'Modern Tech';

// Get all theme names for UI dropdowns
export const getThemeNames = (): ThemeName[] => Object.keys(THEMES) as ThemeName[];
