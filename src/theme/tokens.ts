// ============================================================
// SOURCE: Design System Tokens — Nextflow Pro
// ============================================================

export const tokens = {
  colors: {
    brand: {
      50:  '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    accent: {
      cyan:    '#06b6d4',
      emerald: '#10b981',
      violet:  '#8b5cf6',
      amber:   '#f59e0b',
      rose:    '#f43f5e',
    },
    dark: {
      bg:        '#0a0f1e',
      surface:   '#0d1526',
      card:      '#111827',
      border:    '#1e2d3d',
      elevated:  '#162032',
      muted:     '#1a2535',
      hover:     '#1f2f42',
    },
    light: {
      bg:        '#f0f4f8',
      surface:   '#ffffff',
      card:      '#ffffff',
      border:    '#e2e8f0',
      elevated:  '#f8fafc',
      muted:     '#f1f5f9',
      hover:     '#e2e8f0',
    },
  },
  radius: {
    sm:  '6px',
    md:  '10px',
    lg:  '14px',
    xl:  '20px',
    '2xl': '24px',
    full: '9999px',
  },
  shadow: {
    sm:   '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
    md:   '0 4px 16px rgba(0,0,0,0.15)',
    lg:   '0 10px 40px rgba(0,0,0,0.25)',
    glow: '0 0 30px rgba(59,130,246,0.35)',
    card: '0 2px 8px rgba(0,0,0,0.08), 0 0 1px rgba(0,0,0,0.04)',
  },
};

export type Theme = 'dark' | 'light';
