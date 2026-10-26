/**
 * TERRAVOX Design System Tokens
 *
 * Coherent, scientific design system for the open California Environmental Intelligence Platform:
 * - Deep forest-green surfaces with restrained green and cyan accents
 * - High information density without clutter
 * - High contrast, accessible sizing, and consistent visual hierarchy
 * - Strict semantic status distinctions (LIVE, CACHED, STALE, STATIC, UNAVAILABLE)
 * - Calibrated NFDRS (National Fire Danger Rating System) class color scales
 */

export const tokens = {
  colors: {
    // Canvas & structural backgrounds (Obsidian / Deep Forest)
    bg: '#070e0a',              // Main page background
    bgSecondary: '#09120d',     // Subtle contrast background
    surface: '#0c1812',         // Standard card surface
    surfaceHover: '#102219',    // Interactive surface hover
    surfaceMuted: '#0e1c15',    // Recessed / secondary surface
    surfaceElevated: '#13281e', // Elevated cards / modals

    // Hairlines and borders
    border: '#14261c',          // Hairline structural border
    borderMuted: '#102017',     // Faint interior divider
    borderStrong: '#1d3d2c',    // Active / hovered border
    borderFocus: '#22c55e',     // Accessible focus ring

    // Typography
    text: '#f0fdf4',            // High-contrast primary text
    textSecondary: '#cbd5d1',   // Standard body / label text
    textMuted: '#8b9f94',       // Supporting metadata / units
    textFaint: '#5b6f64',       // Timestamps / subtle footnotes
    textInverse: '#070f0b',     // Text on bright accents

    // Brand & Accents
    primary: '#22c55e',         // Signal emerald (CAL FIRE / active good)
    primaryHover: '#16a34a',
    primaryMuted: '#142c1e',
    accentCyan: '#06b6d4',      // Environmental telemetry / atmospheric
    accentCyanMuted: '#0e2b33',
    accentLime: '#84cc16',      // Vegetation canopy / Sentinel-2 NDVI
    accentLimeMuted: '#1e330e',

    // Calibrated NFDRS Hazard Classes (Class I to V)
    nfdrs: {
      classI: { color: '#22c55e', bg: 'rgba(34, 197, 94, 0.14)', border: 'rgba(34, 197, 94, 0.35)', label: 'Class I Low' },
      classII: { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.14)', border: 'rgba(56, 189, 248, 0.35)', label: 'Class II Moderate' },
      classIII: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.14)', border: 'rgba(245, 158, 11, 0.35)', label: 'Class III High' },
      classIV: { color: '#f97316', bg: 'rgba(249, 115, 22, 0.14)', border: 'rgba(249, 115, 22, 0.35)', label: 'Class IV Very High' },
      classV: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.16)', border: 'rgba(239, 68, 68, 0.40)', label: 'Class V Extreme' },
    },

    // Semantic Data Pipeline Status
    status: {
      LIVE: { color: '#4ade80', bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.35)', dot: '#22c55e' },
      CACHED: { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.35)', dot: '#f59e0b' },
      STALE: { color: '#fb923c', bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.35)', dot: '#f97316' },
      STATIC: { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)', border: 'rgba(56, 189, 248, 0.35)', dot: '#38bdf8' },
      UNAVAILABLE: { color: '#f87171', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.35)', dot: '#ef4444' },
      CONFIGURATION_REQUIRED: { color: '#f87171', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.35)', dot: '#ef4444' },
    },

    // Categorical Indicators
    historical: { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.10)', border: 'rgba(148, 163, 184, 0.25)' },
    community: { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.10)', border: 'rgba(56, 189, 248, 0.25)' },
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '32px'
  },

  radius: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
    full: '9999px'
  },

  shadows: {
    subtle: '0 1px 3px rgba(0, 0, 0, 0.35)',
    card: '0 4px 16px rgba(0, 0, 0, 0.40)',
    elevated: '0 12px 32px rgba(0, 0, 0, 0.55)',
    modal: '0 20px 48px rgba(0, 0, 0, 0.75)'
  },

  typography: {
    fontDisplay: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontBody: "'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontMono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
  },

  layout: {
    sidebarWidth: 256,
    headerHeight: 56,
    maxContentWidth: 1600,
  }
} as const

export type NFDRSClassKey = keyof typeof tokens.colors.nfdrs
export type SourceStatusKey = keyof typeof tokens.colors.status
