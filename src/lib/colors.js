/*
 * Pixel2CPP - Color Utilities
 * 
 * MIT License
 * Copyright (c) 2025 CodeRandom
 * 
 * This software is provided free of charge for educational and personal use.
 * Commercial use and redistribution must comply with the MIT License terms.
 */

// Color helpers
export const clamp = (n, min = 0, max = 255) => Math.max(min, Math.min(max, n));
export const transparent = () => ({ r: 0, g: 0, b: 0, a: 0 });
export const black = () => ({ r: 0, g: 0, b: 0, a: 255 });
export const white = () => ({ r: 255, g: 255, b: 255, a: 255 });
export const rgbaEq = (a, b) => a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
export const pixelToCss = (p) => `rgba(${p.r},${p.g},${p.b},${(p.a ?? 255) / 255})`;
export const rgbaToHex = (p) => {
  const to2 = (v) => v.toString(16).padStart(2, "0");
  return `#${to2(p.r)}${to2(p.g)}${to2(p.b)}`;
};

export function parseCssColor(css) {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const ctx = c.getContext("2d");
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = Array.from(ctx.getImageData(0, 0, 1, 1).data);
  return { r, g, b, a };
}


