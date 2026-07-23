// Generates a 10-stop Tailwind-style shade ramp (50-900) from a single brand color,
// then writes it onto the --color-primary-* CSS custom properties Tailwind v4's
// `@theme` block defines in index.css. Every `bg-primary-500`, `text-primary-600`, etc.
// utility class already compiles down to `var(--color-primary-500)`, so overwriting
// these variables re-themes the whole app live without touching component classNames.

// Lightness (%) targets modeled on the app's original indigo scale, so a custom brand
// color keeps a similar look-and-feel across shades. 500 is skipped here — it uses the
// picked color's own lightness exactly, so what the admin sees in the picker is what
// shows up on primary buttons.
const LIGHTNESS_STOPS = { 50: 96.3, 100: 92.7, 200: 85.5, 300: 78.2, 400: 70.8, 600: 53.3, 700: 42.4, 800: 31.8, 900: 21.2 };

const DEFAULT_PRIMARY = '#059669';

function hexToHsl(hex) {
  const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const r = parseInt(m[1].slice(0, 2), 16) / 255;
  const g = parseInt(m[1].slice(2, 4), 16) / 255;
  const b = parseInt(m[1].slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function generatePrimaryShades(baseHex) {
  const hsl = hexToHsl(baseHex);
  if (!hsl) return null;
  const shades = { 500: baseHex };
  for (const [shade, l] of Object.entries(LIGHTNESS_STOPS)) {
    shades[shade] = hslToHex(hsl.h, hsl.s, l);
  }
  return shades;
}

export function applyBrandColor(hex) {
  const shades = generatePrimaryShades(hex || DEFAULT_PRIMARY) || generatePrimaryShades(DEFAULT_PRIMARY);
  const root = document.documentElement.style;
  for (const [shade, color] of Object.entries(shades)) {
    root.setProperty(`--color-primary-${shade}`, color);
  }
}

export function applyFavicon(url) {
  const link = document.querySelector('link[rel="icon"]');
  if (link) link.href = url || '/favicon.svg';
}
