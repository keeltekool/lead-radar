/**
 * LEAD RADAR Brand Constants
 * Midnight Teal palette + DM Sans + JetBrains Mono
 */

export const BRAND = {
  name: 'LeadRadar',
  tagline: 'AI-powered lead generation',
} as const;

export const COLORS = {
  teal: {
    50:  '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488',
    700: '#0F766E',
    800: '#115E59',
    900: '#134E4A',
    950: '#0F2B2E',
  },
  semantic: {
    success:   '#16A34A',
    successBg: '#ECFDF5',
    warning:   '#D97706',
    warningBg: '#FEF3C7',
    error:     '#DC2626',
    errorBg:   '#FEF2F2',
    info:      '#2563EB',
    infoBg:    '#EFF6FF',
  },
  leadScore: {
    hot:    { color: '#14B8A6', bg: '#CCFBF1', label: 'Hot Lead',  range: '70-100' },
    warm:   { color: '#D97706', bg: '#FEF3C7', label: 'Warm',      range: '40-69' },
    cold:   { color: '#64748B', bg: '#F1F5F9', label: 'Cold',      range: '0-39' },
  },
} as const;

export const FONTS = {
  body: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
} as const;

export const WEAKNESS_TYPES = {
  slow_site: 'Slow site',
  no_ssl: 'No SSL',
  few_reviews: 'Few reviews',
  incomplete_profile: 'Incomplete profile',
  no_mobile: 'Not mobile friendly',
  outdated_content: 'Outdated content',
  no_social: 'No social media',
  bad_seo: 'Poor SEO',
} as const;
