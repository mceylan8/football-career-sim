import type { CSSProperties } from 'react';
import type { Club } from '../types/club';
import { colorsFor } from './crestUtil';

/** Colours of the fast-mode screen, derived from the club's two colours. */
export interface ClubTheme {
  /** Page background: the main colour, almost black. */
  bg: string;
  /** Boxes on the background: bg tinted a little towards the accent. */
  panel: string;
  /** The brighter club colour, readable on bg. */
  accent: string;
  /** Text on the accent (dark or light, whichever reads better). */
  onAccent: string;
}

type RGB = [number, number, number];

const DARK: RGB = [11, 10, 20];
const INK = '#12102b';

function hslToRgb(h: number, s: number, l: number): RGB {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}

/** "#AF1F36" or "hsl(120 70% 45%)" (the fallback colours of crestUtil). */
function parse(c: string): RGB {
  const hsl = c.match(/hsl\((\d+)\s+(\d+)%\s+(\d+)%\)/);
  if (hsl) return hslToRgb(+hsl[1], +hsl[2] / 100, +hsl[3] / 100);
  const h = c.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
}

const hex = (c: RGB) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * t) as RGB;

/** WCAG relative luminance and contrast ratio. */
function lum(c: RGB): number {
  const [r, g, b] = c.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: RGB, b: RGB): number {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** 0 for black/white/grey, up to 1 for a pure colour. */
function sat(c: RGB): number {
  const mx = Math.max(...c);
  const mn = Math.min(...c);
  return mx === 0 ? 0 : (mx - mn) / mx;
}

/**
 * bg     = the darker club colour when the main one is very light (Dortmund yellow), else the main one,
 *          mixed 84 % towards near-black
 * accent = the club colour that stands out more on bg (grey/black/white only if nothing else),
 *          lightened until it reaches 3:1 on bg (enough for big type and buttons)
 * Example 1. FC Nürnberg (#AF1F36 / #000000): bg dark wine, accent a lighter red.
 */
export function clubTheme(club: Club | null): ClubTheme {
  const [p, s] = club ? colorsFor(club).map(parse) : [parse('#e63946'), parse('#ffd23f')];
  const base = lum(p) > 0.4 && lum(s) < lum(p) ? s : p;
  const bg = mix(base, DARK, 0.84);
  const colourful = [p, s].filter((c) => sat(c) >= 0.2);
  // Both colourful (Galatasaray red/gold): the one that stands out more on bg.
  let accent = colourful.length
    ? colourful.reduce((a, c) => (contrast(c, bg) > contrast(a, bg) ? c : a))
    : lum(p) >= lum(s) ? p : s;
  for (let i = 0; i < 12 && contrast(accent, bg) < 3; i++) accent = mix(accent, [255, 255, 255], 0.12);
  const panel = mix(bg, accent, 0.14);
  const ink = parse(INK);
  const onAccent = contrast(accent, ink) >= contrast(accent, [255, 255, 255]) ? INK : '#ffffff';
  return { bg: hex(bg), panel: hex(panel), accent: hex(accent), onAccent };
}

/** The theme as CSS variables for a screen root (--c-bg, --c-panel, --c-accent, --c-on). */
export function themeVars(t: ClubTheme): CSSProperties {
  return {
    '--c-bg': t.bg,
    '--c-panel': t.panel,
    '--c-accent': t.accent,
    '--c-on': t.onAccent,
  } as CSSProperties;
}
