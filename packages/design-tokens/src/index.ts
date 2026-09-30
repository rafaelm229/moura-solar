/**
 * Moura Solar Design Tokens — SPEC-003 v0.2
 * Operational Dark Language Tokens
 */

export const colors = {
  background: {
    base: '#090B0A',
  },
  surface: {
    default: '#111412',
    card: '#161A17',
    elevated: '#1C211D',
  },
  border: {
    default: '#29302B',
    subtle: '#1E2420',
  },
  brand: {
    solar: '#FFD400',
    solarHover: '#E6BE00',
    solarPressed: '#C9A800',
    solarMuted: '#3A3200',
    green: '#26D866',
    institutional: '#087443',
  },
  status: {
    info: '#3B82F6',
    success: '#26D866',
    warning: '#FF9F1C',
    danger: '#FF4D57',
  },
  statusBg: {
    info: 'rgba(59, 130, 246, 0.12)',
    success: 'rgba(38, 216, 102, 0.12)',
    warning: 'rgba(255, 159, 28, 0.12)',
    danger: 'rgba(255, 77, 87, 0.12)',
    solar: 'rgba(255, 212, 0, 0.12)',
  },
  statusBorder: {
    info: 'rgba(59, 130, 246, 0.3)',
    success: 'rgba(38, 216, 102, 0.3)',
    warning: 'rgba(255, 159, 28, 0.3)',
    danger: 'rgba(255, 77, 87, 0.3)',
    solar: 'rgba(255, 212, 0, 0.3)',
  },
  text: {
    primary: '#F5F7F5',
    secondary: '#9BA49E',
    disabled: '#626A65',
    onSolar: '#090B0A',
  },
} as const;

export const typography = {
  family: {
    sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  },
  size: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

export const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

export const radii = {
  sm: '6px',
  md: '8px',
  lg: '10px',
  xl: '16px',
  sheet: '20px',
  full: '9999px',
} as const;

export const controls = {
  compact: '36px',
  default: '44px',
  field: '48px',
} as const;

export const shadows = {
  menu: '0 8px 24px rgba(0, 0, 0, 0.4)',
  cardHover: '0 8px 32px rgba(0, 0, 0, 0.4)',
  glowSolar: '0 0 16px rgba(255, 212, 0, 0.35)',
} as const;

export const motion = {
  feedback: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
  drawer: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
  easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

/**
 * Parses a 6-character hex color code into [r, g, b] in 0..255
 */
export function hexToRgb(hex: string): [number, number, number] {
  const sanitized = hex.replace('#', '').trim();
  if (sanitized.length !== 6) {
    throw new Error(`Invalid hex color: ${hex}. Expected 6 hex characters.`);
  }
  const r = parseInt(sanitized.slice(0, 2), 16);
  const g = parseInt(sanitized.slice(2, 4), 16);
  const b = parseInt(sanitized.slice(4, 6), 16);
  return [r, g, b];
}

/**
 * Calculates relative luminance according to WCAG 2.1 / 2.2 standard definition.
 * https://www.w3.org/WAI/GL/wiki/Relative_luminance
 */
export function getRelativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const sRGB = channel / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  }) as [number, number, number];

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculates WCAG contrast ratio between two hex colors.
 * Returns a value between 1 and 21.
 */
export function getContrastRatio(fgHex: string, bgHex: string): number {
  const lum1 = getRelativeLuminance(fgHex);
  const lum2 = getRelativeLuminance(bgHex);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Checks if color pair satisfies WCAG 2.2 Level AA:
 * - 4.5:1 for standard text (< 18pt or < 14pt bold)
 * - 3.0:1 for large text (>= 18pt or >= 14pt bold) or UI components
 */
export function checkWcagAA(fgHex: string, bgHex: string, isLargeText = false): boolean {
  const ratio = getContrastRatio(fgHex, bgHex);
  const threshold = isLargeText ? 3.0 : 4.5;
  return ratio >= threshold;
}
