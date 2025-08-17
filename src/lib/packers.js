/*
 * Pixel2CPP - Image Packing Utilities
 * 
 * MIT License
 * Copyright (c) 2025 CodeRandom
 * 
 * This software is provided free of charge for educational and personal use.
 * Commercial use and redistribution must comply with the MIT License terms.
 */

// Image packing utilities and conversions
export function rgbTo565(r, g, b) {
  const R = (r >> 3) & 0x1f;
  const G = (g >> 2) & 0x3f;
  const B = (b >> 3) & 0x1f;
  return (R << 11) | (G << 5) | B; // 0..65535
}

export function hex565(v) {
  return "0x" + v.toString(16).toUpperCase().padStart(4, "0");
}

export function pack1bit(pixels, width, height, orientation = 'horizontal') {
  const bytes = [];
  const I = (x, y) => y * width + x;
  
  if (orientation === 'horizontal') {
    // Original horizontal packing (row by row)
    for (let y = 0; y < height; y++) {
      let bit = 7;
      let cur = 0;
      for (let x = 0; x < width; x++) {
        const p = pixels[I(x, y)];
        const on = (p.r + p.g + p.b) > (255 * 3) / 2; // lighter pixel → 1 (white = on)
        if (on) cur |= 1 << bit;
        bit--;
        if (bit < 0) {
          bytes.push(cur);
          cur = 0;
          bit = 7;
        }
      }
      if (bit !== 7) bytes.push(cur); // flush partial byte per row
    }
  } else if (orientation === 'vertical') {
    // Vertical packing (column by column, 8 vertical pixels per byte)
    for (let x = 0; x < width; x++) {
      for (let yPage = 0; yPage < Math.ceil(height / 8); yPage++) {
        let cur = 0;
        for (let bit = 7; bit >= 0; bit--) {
          const y = yPage * 8 + (7 - bit);
          if (y < height) {
            const p = pixels[I(x, y)];
            const on = (p.r + p.g + p.b) > (255 * 3) / 2; // lighter pixel → 1 (white = on)
            if (on) cur |= 1 << bit;
          }
        }
        bytes.push(cur);
      }
    }
  }
  return bytes;
}

export function pack1bitAlpha(pixels, width, height, orientation = 'horizontal') {
  const bytes = [];
  const I = (x, y) => y * width + x;
  
  if (orientation === 'horizontal') {
    for (let y = 0; y < height; y++) {
      let bit = 7;
      let cur = 0;
      for (let x = 0; x < width; x++) {
        const p = pixels[I(x, y)];
        const hasAlpha = p.a > 127; // alpha threshold (opaque = on)
        if (hasAlpha) cur |= 1 << bit;
        bit--;
        if (bit < 0) {
          bytes.push(cur);
          cur = 0;
          bit = 7;
        }
      }
      if (bit !== 7) bytes.push(cur);
    }
  } else {
    for (let x = 0; x < width; x++) {
      for (let yPage = 0; yPage < Math.ceil(height / 8); yPage++) {
        let cur = 0;
        for (let bit = 7; bit >= 0; bit--) {
          const y = yPage * 8 + (7 - bit);
          if (y < height) {
            const p = pixels[I(x, y)];
            const hasAlpha = p.a > 127; // alpha threshold (opaque = on)
            if (hasAlpha) cur |= 1 << bit;
          }
        }
        bytes.push(cur);
      }
    }
  }
  return bytes;
}

export function packRGB565(pixels, width, height) {
  const out = [];
  const I = (x, y) => y * width + x;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = pixels[I(x, y)];
      out.push(rgbTo565(p.r, p.g, p.b));
    }
  }
  return out;
}

export function packRGB24(pixels, width, height) {
  const out = [];
  const I = (x, y) => y * width + x;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = pixels[I(x, y)];
      out.push(p.r, p.g, p.b);
    }
  }
  return out;
}

export function rgbTo332(r, g, b) {
  const R = (r >> 5) & 0x07;  // 3 bits
  const G = (g >> 5) & 0x07;  // 3 bits  
  const B = (b >> 6) & 0x03;  // 2 bits
  return (R << 5) | (G << 2) | B;
}

export function packRGB332(pixels, width, height) {
  const out = [];
  const I = (x, y) => y * width + x;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = pixels[I(x, y)];
      out.push(rgbTo332(p.r, p.g, p.b));
    }
  }
  return out;
}

export function packGray4(pixels, width, height) {
  const bytes = [];
  const I = (x, y) => y * width + x;
  for (let y = 0; y < height; y++) {
    let nibble = 1; // 0 for high nibble, 1 for low nibble
    let cur = 0;
    for (let x = 0; x < width; x++) {
      const p = pixels[I(x, y)];
      const luma = Math.floor((0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b) / 16);
      const gray4 = Math.min(15, Math.max(0, luma)); // 0-15 range
      
      if (nibble === 1) {
        cur = gray4 << 4; // High nibble
        nibble = 0;
      } else {
        cur |= gray4; // Low nibble
        bytes.push(cur);
        cur = 0;
        nibble = 1;
      }
    }
    if (nibble === 0) bytes.push(cur); // flush partial byte per row
  }
  return bytes;
}



